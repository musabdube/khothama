import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const userId = session.user.id

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      orderBy: { lastMessageAt: "desc" },
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
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      take: 200,
    })

    const conversationIds = conversations.map((conversation) => conversation.id)
    const unreadMessages =
      conversationIds.length > 0
        ? await prisma.message.findMany({
            where: {
              conversationId: { in: conversationIds },
              senderId: { not: userId },
              readAt: null,
            },
            select: {
              conversationId: true,
            },
          })
        : []

    const unreadCountByConversation = unreadMessages.reduce<Record<string, number>>((accumulator, message) => {
      accumulator[message.conversationId] = (accumulator[message.conversationId] || 0) + 1
      return accumulator
    }, {})

    const payload = conversations.map((conversation) => {
      const isBuyer = conversation.buyerId === userId
      const counterpart = isBuyer ? conversation.seller : conversation.buyer

      return {
        id: conversation.id,
        product: {
          id: conversation.product.id,
          name: conversation.product.name,
          price: conversation.product.price,
          imageUrl: conversation.product.images[0]?.url || "/window.svg",
        },
        counterpart,
        lastMessageAt: conversation.lastMessageAt,
        lastMessage: conversation.messages[0] || null,
        unreadCount: unreadCountByConversation[conversation.id] || 0,
      }
    })

    return NextResponse.json(payload)
  } catch (error) {
    console.error("MESSAGES_LIST_GET_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
