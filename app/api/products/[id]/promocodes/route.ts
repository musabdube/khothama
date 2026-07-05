import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

function normalizeCode(rawCode: string) {
  return rawCode.trim().toUpperCase().replace(/\s+/g, "")
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

    if (!isAdmin && !isSeller) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const promoCodes = await prisma.productPromoCode.findMany({
      where: {
        productId: id,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    return NextResponse.json(promoCodes)
  } catch (error) {
    console.error("PRODUCT_PROMOCODES_GET_ERROR", error)
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

    const rawCode = typeof body?.code === "string" ? body.code : ""
    const type = body?.type === "FIXED_USD" ? "FIXED_USD" : body?.type === "PERCENTAGE" ? "PERCENTAGE" : null
    const value = Number(body?.value)
    const isActive = body?.isActive !== undefined ? Boolean(body.isActive) : true
    const startsAtRaw = body?.startsAt
    const endsAtRaw = body?.endsAt
    const maxUsesRaw = body?.maxUses

    const code = normalizeCode(rawCode)

    if (!code) {
      return new NextResponse("Promo code is required", { status: 400 })
    }

    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) {
      return new NextResponse("Promo code must be 3-40 chars and use letters, numbers, _ or -", { status: 400 })
    }

    if (!type) {
      return new NextResponse("Promo type is required", { status: 400 })
    }

    if (!Number.isFinite(value) || value <= 0) {
      return new NextResponse("Promo value must be greater than 0", { status: 400 })
    }

    if (type === "PERCENTAGE" && value > 100) {
      return new NextResponse("Percentage promo cannot exceed 100", { status: 400 })
    }

    const startsAt = startsAtRaw ? new Date(startsAtRaw) : new Date()
    const endsAt = endsAtRaw ? new Date(endsAtRaw) : null

    if (Number.isNaN(startsAt.getTime())) {
      return new NextResponse("Invalid startsAt date", { status: 400 })
    }

    if (endsAt && Number.isNaN(endsAt.getTime())) {
      return new NextResponse("Invalid endsAt date", { status: 400 })
    }

    if (endsAt && endsAt <= startsAt) {
      return new NextResponse("endsAt must be after startsAt", { status: 400 })
    }

    const maxUses =
      maxUsesRaw === null || maxUsesRaw === undefined || maxUsesRaw === ""
        ? null
        : Math.trunc(Number(maxUsesRaw))

    if (maxUses !== null && (!Number.isFinite(maxUses) || maxUses <= 0)) {
      return new NextResponse("maxUses must be a positive number", { status: 400 })
    }

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

    if (!isAdmin && !isSeller) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const promoCode = await prisma.productPromoCode.create({
      data: {
        productId: id,
        sellerId: product.sellerId || session.user.id,
        code,
        type,
        value,
        isActive,
        startsAt,
        endsAt,
        maxUses,
      },
    })

    return NextResponse.json(promoCode)
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return new NextResponse("Promo code already exists for this product", { status: 409 })
    }

    console.error("PRODUCT_PROMOCODES_POST_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
