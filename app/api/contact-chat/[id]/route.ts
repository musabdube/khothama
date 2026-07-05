import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

const db = prisma as typeof prisma & {
  supportConversation: any
  supportMessage: any
}

async function getAuthorizedConversation(conversationId: string, userId: string, role: "USER" | "ADMIN") {
  return db.supportConversation.findFirst({
    where:
      role === "ADMIN"
        ? { id: conversationId }
        : {
            id: conversationId,
            userId,
          },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      admin: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      messages: {
        select: {
          id: true,
          content: true,
          senderId: true,
          createdAt: true,
          readAt: true,
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
        take: 400,
      },
    },
  })
}

async function markConversationMessagesRead(conversationId: string, viewerId: string) {
  await db.supportMessage.updateMany({
    where: {
      conversationId,
      senderId: {
        not: viewerId,
      },
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.role) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { id } = await params
    const baseConversation = await getAuthorizedConversation(id, session.user.id, session.user.role)

    if (!baseConversation) {
      return new NextResponse("Conversation not found", { status: 404 })
    }

    if (session.user.role === "ADMIN" && !baseConversation.adminId) {
      await db.supportConversation.update({
        where: { id },
        data: {
          adminId: session.user.id,
        },
      })
    }

    await markConversationMessagesRead(id, session.user.id)

    const conversation = await getAuthorizedConversation(id, session.user.id, session.user.role)

    if (!conversation) {
      return new NextResponse("Conversation not found", { status: 404 })
    }

    return NextResponse.json(conversation)
  } catch (error) {
    console.error("CONTACT_CHAT_CONVERSATION_GET_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.role) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { id } = await params
    const conversation = await db.supportConversation.findFirst({
      where:
        session.user.role === "ADMIN"
          ? { id }
          : {
              id,
              userId: session.user.id,
            },
      select: {
        id: true,
        adminId: true,
      },
    })

    if (!conversation) {
      return new NextResponse("Conversation not found", { status: 404 })
    }

    const body = await request.json()
    const content = typeof body?.content === "string" ? body.content.trim() : ""

    if (!content) {
      return new NextResponse("Message is required", { status: 400 })
    }

    if (content.length > 2000) {
      return new NextResponse("Message is too long", { status: 400 })
    }

    const message = await db.supportMessage.create({
      data: {
        conversationId: id,
        senderId: session.user.id,
        content,
      },
      select: {
        id: true,
        content: true,
        senderId: true,
        createdAt: true,
      },
    })

    await db.supportConversation.update({
      where: { id },
      data: {
        lastMessageAt: message.createdAt,
        adminId:
          session.user.role === "ADMIN"
            ? conversation.adminId || session.user.id
            : conversation.adminId,
      },
    })

    return NextResponse.json({
      conversationId: id,
      message,
    })
  } catch (error) {
    console.error("CONTACT_CHAT_CONVERSATION_POST_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
