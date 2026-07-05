import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

const db = prisma as typeof prisma & {
  supportMessage: any
}

function buildSupportNotificationTitle(isAdmin: boolean, senderName: string) {
  if (isAdmin) {
    return `New support message from ${senderName}`
  }

  return "New reply from Khothama Support"
}

function truncateMessage(content: string) {
  const trimmed = content.trim()
  if (trimmed.length <= 140) return trimmed
  return `${trimmed.slice(0, 137)}...`
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const isAdmin = session.user.role === "ADMIN"

    const [notifications, unreadCount, unreadSupportMessages] = await Promise.all([
      prisma.notification.findMany({
        where: { recipientId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.notification.count({
        where: {
          recipientId: session.user.id,
          readAt: null,
        },
      }),
      db.supportMessage.findMany({
        where: {
          readAt: null,
          senderId: {
            not: session.user.id,
          },
          conversation: isAdmin
            ? undefined
            : {
                userId: session.user.id,
              },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          conversation: {
            select: {
              id: true,
            },
          },
        },
      }),
    ])

    const supportNotifications = unreadSupportMessages.map((message: any) => ({
      id: `support:${message.id}`,
      type: "SUPPORT_CHAT",
      title: buildSupportNotificationTitle(isAdmin, message.sender?.name || message.sender?.email || "User"),
      message: truncateMessage(message.content),
      link: `/contact?cid=${message.conversationId || message.conversation?.id}`,
      readAt: null,
      createdAt: message.createdAt,
    }))

    const mergedNotifications = [...notifications, ...supportNotifications]
      .sort((left: any, right: any) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 30)

    return NextResponse.json({
      notifications: mergedNotifications,
      unreadCount: unreadCount + unreadSupportMessages.length,
    })
  } catch (error) {
    console.error("NOTIFICATIONS_GET_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function PATCH() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const isAdmin = session.user.role === "ADMIN"

    await Promise.all([
      prisma.notification.updateMany({
        where: {
          recipientId: session.user.id,
          readAt: null,
        },
        data: {
          readAt: new Date(),
        },
      }),
      db.supportMessage.updateMany({
        where: {
          readAt: null,
          senderId: {
            not: session.user.id,
          },
          conversation: isAdmin
            ? undefined
            : {
                userId: session.user.id,
              },
        },
        data: {
          readAt: new Date(),
        },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("NOTIFICATIONS_PATCH_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
