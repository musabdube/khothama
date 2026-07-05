import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

const db = prisma as typeof prisma & {
  supportMessage: any
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { id } = await params

    if (id.startsWith("support:")) {
      const supportMessageId = id.slice("support:".length)
      if (!supportMessageId) {
        return new NextResponse("Notification not found", { status: 404 })
      }

      const supportMessage = await db.supportMessage.findUnique({
        where: { id: supportMessageId },
        select: {
          id: true,
          senderId: true,
          readAt: true,
          conversation: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      })

      if (!supportMessage) {
        return new NextResponse("Notification not found", { status: 404 })
      }

      const isAdmin = session.user.role === "ADMIN"
      const isConversationUser = supportMessage.conversation?.userId === session.user.id

      if (!isAdmin && !isConversationUser) {
        return new NextResponse("Forbidden", { status: 403 })
      }

      if (supportMessage.senderId === session.user.id) {
        return NextResponse.json({ success: true })
      }

      if (!supportMessage.readAt) {
        await db.supportMessage.update({
          where: { id: supportMessageId },
          data: {
            readAt: new Date(),
          },
        })
      }

      return NextResponse.json({ success: true })
    }

    const notification = await prisma.notification.findUnique({
      where: { id },
      select: { id: true, recipientId: true },
    })

    if (!notification) {
      return new NextResponse("Notification not found", { status: 404 })
    }

    if (notification.recipientId !== session.user.id) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    await prisma.notification.update({
      where: { id },
      data: {
        readAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("NOTIFICATION_PATCH_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { id } = await params

    if (id.startsWith("support:")) {
      const supportMessageId = id.slice("support:".length)
      if (!supportMessageId) {
        return new NextResponse("Notification not found", { status: 404 })
      }

      const supportMessage = await db.supportMessage.findUnique({
        where: { id: supportMessageId },
        select: {
          id: true,
          senderId: true,
          readAt: true,
          conversation: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      })

      if (!supportMessage) {
        return new NextResponse("Notification not found", { status: 404 })
      }

      const isAdmin = session.user.role === "ADMIN"
      const isConversationUser = supportMessage.conversation?.userId === session.user.id

      if (!isAdmin && !isConversationUser) {
        return new NextResponse("Forbidden", { status: 403 })
      }

      if (!supportMessage.readAt) {
        await db.supportMessage.update({
          where: { id: supportMessageId },
          data: {
            readAt: new Date(),
          },
        })
      }

      return NextResponse.json({ success: true })
    }

    const notification = await prisma.notification.findUnique({
      where: { id },
      select: { id: true, recipientId: true },
    })

    if (!notification) {
      return new NextResponse("Notification not found", { status: 404 })
    }

    if (notification.recipientId !== session.user.id) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    await prisma.notification.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("NOTIFICATION_DELETE_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
