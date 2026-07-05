import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

const db = prisma as typeof prisma & {
  supportConversation: any
  supportMessage: any
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const isAdmin = session.user.role === "ADMIN"

    const conversations = await db.supportConversation.findMany({
      where: isAdmin
        ? undefined
        : { userId: session.user.id },
      orderBy: { lastMessageAt: "desc" },
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
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      take: 250,
    })

    const payload = conversations.map((conversation: any) => ({
      id: conversation.id,
      user: conversation.user,
      admin: conversation.admin,
      lastMessageAt: conversation.lastMessageAt,
      lastMessage: conversation.messages[0] || null,
    }))

    return NextResponse.json(payload)
  } catch (error) {
    console.error("CONTACT_CHAT_LIST_GET_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await request.json()
    const content = typeof body?.content === "string" ? body.content.trim() : ""
    const conversationId = typeof body?.conversationId === "string" ? body.conversationId.trim() : ""

    if (!content) {
      return new NextResponse("Message is required", { status: 400 })
    }

    if (content.length > 2000) {
      return new NextResponse("Message is too long", { status: 400 })
    }

    if (session.user.role === "ADMIN") {
      if (!conversationId) {
        return new NextResponse("Conversation id is required", { status: 400 })
      }

      const conversation = await db.supportConversation.findUnique({
        where: { id: conversationId },
        select: { id: true, adminId: true },
      })

      if (!conversation) {
        return new NextResponse("Conversation not found", { status: 404 })
      }

      const message = await db.supportMessage.create({
        data: {
          conversationId,
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
        where: { id: conversationId },
        data: {
          lastMessageAt: message.createdAt,
          adminId: conversation.adminId || session.user.id,
        },
      })

      return NextResponse.json({ conversationId, message })
    }

    const conversation = await db.supportConversation.upsert({
      where: { userId: session.user.id },
      update: { lastMessageAt: new Date() },
      create: {
        userId: session.user.id,
        lastMessageAt: new Date(),
      },
      select: { id: true },
    })

    const message = await db.supportMessage.create({
      data: {
        conversationId: conversation.id,
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
      where: { id: conversation.id },
      data: { lastMessageAt: message.createdAt },
    })

    return NextResponse.json({ conversationId: conversation.id, message })
  } catch (error) {
    console.error("CONTACT_CHAT_POST_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
