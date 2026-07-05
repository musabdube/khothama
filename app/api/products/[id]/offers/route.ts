import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"

const APPROVED_TAG = "approval:approved"

function isApprovedPublishedProduct(product: { status: string; tags: string[] }) {
  return product.status === "PUBLISHED" && product.tags.includes(APPROVED_TAG)
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

    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        sellerId: true,
      },
    })

    if (!product) {
      return new NextResponse("Product not found", { status: 404 })
    }

    const isAdmin = session.user.role === "ADMIN"
    const isSeller = product.sellerId === session.user.id

    const offers = await prisma.productOffer.findMany({
      where: {
        productId: id,
        ...(isAdmin || isSeller ? {} : { buyerId: session.user.id }),
      },
      orderBy: { createdAt: "desc" },
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      take: 200,
    })

    return NextResponse.json(offers)
  } catch (error) {
    console.error("PRODUCT_OFFERS_GET_ERROR", error)
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
    const body = await request.json()

    const offeredPrice = Number(body?.offeredPrice)
    const note = typeof body?.note === "string" ? body.note.trim() : ""

    if (!Number.isFinite(offeredPrice) || offeredPrice <= 0) {
      return new NextResponse("Offer amount must be greater than 0", { status: 400 })
    }

    if (note.length > 1000) {
      return new NextResponse("Offer note is too long", { status: 400 })
    }

    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        sellerId: true,
        status: true,
        tags: true,
      },
    })

    if (!product) {
      return new NextResponse("Product not found", { status: 404 })
    }

    if (!isApprovedPublishedProduct(product)) {
      return new NextResponse("You can only offer on approved published products", { status: 400 })
    }

    if (!product.sellerId) {
      return new NextResponse("Seller is unavailable", { status: 400 })
    }

    if (product.sellerId === session.user.id) {
      return new NextResponse("You cannot make an offer on your own product", { status: 400 })
    }

    const existingPending = await prisma.productOffer.findFirst({
      where: {
        productId: id,
        buyerId: session.user.id,
        status: "PENDING",
      },
      select: { id: true },
    })

    if (existingPending) {
      return new NextResponse("You already have a pending offer for this product", { status: 409 })
    }

    const offer = await prisma.productOffer.create({
      data: {
        productId: id,
        buyerId: session.user.id,
        sellerId: product.sellerId,
        offeredPrice,
        note: note || null,
      },
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    await createNotification({
      recipientId: product.sellerId,
      type: "OFFER_RECEIVED",
      title: "New offer received",
      message: `${offer.buyer.name || offer.buyer.email} offered $${offer.offeredPrice.toFixed(2)} on ${product.name}.`,
      link: "/products",
    })

    return NextResponse.json(offer)
  } catch (error) {
    console.error("PRODUCT_OFFERS_POST_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
