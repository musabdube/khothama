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

    const unreadCount = await prisma.message.count({
      where: {
        readAt: null,
        senderId: { not: session.user.id },
        conversation: {
          OR: [{ buyerId: session.user.id }, { sellerId: session.user.id }],
        },
      },
    })

    return NextResponse.json({ unreadCount })
  } catch (error) {
    console.error("MESSAGES_UNREAD_GET_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}