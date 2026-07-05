import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

const APPROVAL_TAG = "approval:approved"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await request.json()
    const productId = typeof body?.productId === "string" ? body.productId.trim() : ""
    const content = typeof body?.content === "string" ? body.content.trim() : ""

    if (!productId) {
      return new NextResponse("Product id is required", { status: 400 })
    }

    if (!content) {
      return new NextResponse("Message is required", { status: 400 })
    }

    if (content.length > 2000) {
      return new NextResponse("Message is too long", { status: 400 })
    }

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        status: "PUBLISHED",
        tags: { has: APPROVAL_TAG },
      },
      select: {
        id: true,
        sellerId: true,
      },
    })

    if (!product) {
      return new NextResponse("Product not found", { status: 404 })
    }

    if (!product.sellerId) {
      return new NextResponse("Seller is unavailable", { status: 400 })
    }

    if (product.sellerId === session.user.id) {
      return new NextResponse("You cannot message yourself", { status: 400 })
    }

    const conversation = await prisma.conversation.upsert({
      where: {
        productId_buyerId_sellerId: {
          productId,
          buyerId: session.user.id,
          sellerId: product.sellerId,
        },
      },
      update: {
        lastMessageAt: new Date(),
      },
      create: {
        productId,
        buyerId: session.user.id,
        sellerId: product.sellerId,
        lastMessageAt: new Date(),
      },
      select: {
        id: true,
      },
    })

    const message = await prisma.message.create({
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

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: message.createdAt },
    })

    return NextResponse.json({
      conversationId: conversation.id,
      message,
    })
  } catch (error) {
    console.error("MESSAGE_START_POST_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
