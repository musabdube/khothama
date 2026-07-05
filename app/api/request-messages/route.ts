import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get("requestId")?.trim() || ""
    const userId = session.user.id

    const conversations = await prisma.productRequestConversation.findMany({
      where: {
        OR: [{ requesterId: userId }, { responderId: userId }],
        ...(requestId ? { productRequestId: requestId } : {}),
      },
      orderBy: { lastMessageAt: "desc" },
      include: {
        productRequest: {
          select: {
            id: true,
            name: true,
            category: true,
            budget: true,
            image: true,
          },
        },
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            image: true,
          },
        },
        responder: {
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
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      take: 200,
    })

    const conversationIds = conversations.map((conversation) => conversation.id)
    const unreadMessages = conversationIds.length > 0
      ? await prisma.productRequestMessage.findMany({
          where: {
            conversationId: { in: conversationIds },
            senderId: { not: userId },
            readAt: null,
          },
          select: { conversationId: true },
        })
      : []

    const unreadCountByConversation = unreadMessages.reduce<Record<string, number>>((accumulator, message) => {
      accumulator[message.conversationId] = (accumulator[message.conversationId] || 0) + 1
      return accumulator
    }, {})

    const payload = conversations.map((conversation) => {
      const isRequester = conversation.requesterId === userId
      const counterpart = isRequester ? conversation.responder : conversation.requester

      return {
        id: conversation.id,
        productRequest: conversation.productRequest,
        counterpart,
        requesterId: conversation.requesterId,
        responderId: conversation.responderId,
        lastMessageAt: conversation.lastMessageAt,
        lastMessage: conversation.messages[0] || null,
        unreadCount: unreadCountByConversation[conversation.id] || 0,
      }
    })

    return NextResponse.json(payload)
  } catch (error) {
    console.error("REQUEST_MESSAGES_LIST_GET_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
