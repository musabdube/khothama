import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

async function getAuthorizedConversation(conversationId: string, userId: string) {
  return prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ buyerId: userId }, { sellerId: userId }],
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          price: true,
          images: {
            select: { url: true, sortOrder: true },
            orderBy: { sortOrder: "asc" },
            take: 1,
          },
        },
      },
      buyer: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          image: true,
        },
      },
      seller: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          image: true,
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
              avatar: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
        take: 300,
      },
    },
  })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { id } = await params
    const authorizedConversation = await prisma.conversation.findFirst({
      where: {
        id,
        OR: [{ buyerId: session.user.id }, { sellerId: session.user.id }],
      },
      select: { id: true },
    })

    if (!authorizedConversation) {
      return new NextResponse("Conversation not found", { status: 404 })
    }

    await prisma.message.updateMany({
      where: {
        conversationId: id,
        senderId: { not: session.user.id },
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    })

    const conversation = await getAuthorizedConversation(id, session.user.id)

    if (!conversation) {
      return new NextResponse("Conversation not found", { status: 404 })
    }

    return NextResponse.json(conversation)
  } catch (error) {
    console.error("MESSAGE_CONVERSATION_GET_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { id } = await params
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        OR: [{ buyerId: session.user.id }, { sellerId: session.user.id }],
      },
      select: {
        id: true,
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

    const message = await prisma.message.create({
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

    await prisma.conversation.update({
      where: { id },
      data: { lastMessageAt: message.createdAt },
    })

    return NextResponse.json(message)
  } catch (error) {
    console.error("MESSAGE_CONVERSATION_POST_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
