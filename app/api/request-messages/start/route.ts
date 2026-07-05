import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await request.json()
    const productRequestId = typeof body?.productRequestId === "string" ? body.productRequestId.trim() : ""

    if (!productRequestId) {
      return new NextResponse("Product request id is required", { status: 400 })
    }

    const productRequest = await prisma.productRequest.findUnique({
      where: { id: productRequestId },
      select: {
        id: true,
        userId: true,
      },
    })

    if (!productRequest) {
      return new NextResponse("Product request not found", { status: 404 })
    }

    if (productRequest.userId === session.user.id) {
      return new NextResponse("You cannot message your own request", { status: 400 })
    }

    const isAdmin = session.user.role === "ADMIN"
    if (!isAdmin) {
      const access = await prisma.requestPageAccess.findUnique({
        where: { userId: session.user.id },
        select: { expiresAt: true },
      })

      if (!access || access.expiresAt < new Date()) {
        return new NextResponse("Forbidden", { status: 403 })
      }
    }

    const conversation = await prisma.productRequestConversation.upsert({
      where: {
        productRequestId_requesterId_responderId: {
          productRequestId,
          requesterId: productRequest.userId,
          responderId: session.user.id,
        },
      },
      update: {},
      create: {
        productRequestId,
        requesterId: productRequest.userId,
        responderId: session.user.id,
      },
      select: { id: true },
    })

    return NextResponse.json({ conversationId: conversation.id })
  } catch (error) {
    console.error("REQUEST_MESSAGE_START_POST_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
