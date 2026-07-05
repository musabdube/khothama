import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"

type CreateOrderItemInput = {
  productId: string
  quantity: number
}

function buildOrderNumber() {
  const now = new Date()
  const datePart = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(
    now.getUTCDate()
  ).padStart(2, "0")}`
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `ORD-${datePart}-${randomPart}`
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await request.json()
    const rawItems = Array.isArray(body?.items) ? body.items : []

    if (rawItems.length === 0) {
      return new NextResponse("At least one item is required", { status: 400 })
    }

    const mergedItems = new Map<string, number>()
    for (const rawItem of rawItems) {
      const item = rawItem as Partial<CreateOrderItemInput>
      const productId = typeof item.productId === "string" ? item.productId.trim() : ""
      const quantity = Number(item.quantity)

      if (!productId) {
        return new NextResponse("Each item must include productId", { status: 400 })
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        return new NextResponse("Each item quantity must be a positive integer", { status: 400 })
      }

      mergedItems.set(productId, (mergedItems.get(productId) || 0) + quantity)
    }

    const itemEntries = Array.from(mergedItems.entries())
    const productIds = itemEntries.map(([productId]) => productId)

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        price: true,
        status: true,
        sellerId: true,
      },
    })

    if (products.length !== productIds.length) {
      return new NextResponse("One or more products were not found", { status: 400 })
    }

    const productById = new Map(products.map((product) => [product.id, product]))

    const orderItems = itemEntries.map(([productId, quantity]) => {
      const product = productById.get(productId)
      if (!product) {
        throw new Error("Invalid product")
      }

      if (product.status !== "PUBLISHED") {
        throw new Error(`Product ${product.name} is not available for ordering`)
      }

      if (!product.sellerId) {
        throw new Error(`Product ${product.name} has no seller`)
      }

      return {
        product,
        productId,
        quantity,
        price: product.price,
        total: product.price * quantity,
      }
    })

    const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0)
    const promoCodeInput = typeof body?.promoCode === "string" ? body.promoCode.trim() : ""
    let discount = 0
    let appliedPromoCode: {
      id: string
      code: string
      type: "PERCENTAGE" | "FIXED_USD"
      value: number
      productId: string
    } | null = null

    if (promoCodeInput) {
      const now = new Date()
      const promoCode = await prisma.productPromoCode.findFirst({
        where: {
          code: {
            equals: promoCodeInput,
            mode: "insensitive",
          },
          productId: { in: productIds },
          isActive: true,
          startsAt: { lte: now },
          OR: [{ endsAt: null }, { endsAt: { gte: now } }],
        },
        select: {
          id: true,
          code: true,
          type: true,
          value: true,
          maxUses: true,
          usedCount: true,
          productId: true,
        },
      })

      if (!promoCode) {
        return new NextResponse("Promo code is invalid or expired", { status: 400 })
      }

      if (promoCode.maxUses !== null && promoCode.usedCount >= promoCode.maxUses) {
        return new NextResponse("Promo code usage limit reached", { status: 400 })
      }

      const eligibleSubtotal = orderItems
        .filter((item) => item.productId === promoCode.productId)
        .reduce((sum, item) => sum + item.total, 0)

      if (eligibleSubtotal <= 0) {
        return new NextResponse("Promo code does not apply to selected products", { status: 400 })
      }

      const rawDiscount =
        promoCode.type === "PERCENTAGE" ? eligibleSubtotal * (promoCode.value / 100) : promoCode.value

      discount = Math.max(0, Math.min(rawDiscount, eligibleSubtotal))
      appliedPromoCode = {
        id: promoCode.id,
        code: promoCode.code,
        type: promoCode.type,
        value: promoCode.value,
        productId: promoCode.productId,
      }
    }

    const tax = 0
    const shipping = 0
    const total = subtotal + tax + shipping - discount

    let order = null as Awaited<ReturnType<typeof prisma.order.create>> | null

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        order = await prisma.order.create({
          data: {
            orderNumber: buildOrderNumber(),
            status: "PENDING",
            subtotal,
            tax,
            shipping,
            discount,
            total,
            userId: session.user.id,
            notes: typeof body?.notes === "string" ? body.notes.trim() || null : null,
            items: {
              create: orderItems.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                status: "PENDING",
                price: item.price,
                total: item.total,
              })),
            },
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    sellerId: true,
                  },
                },
              },
            },
          },
        })

        break
      } catch (createError: any) {
        if (createError?.code === "P2002" && attempt < 4) {
          continue
        }
        throw createError
      }
    }

    if (!order) {
      throw new Error("Failed to create order")
    }

    if (appliedPromoCode) {
      await prisma.productPromoCode.update({
        where: { id: appliedPromoCode.id },
        data: {
          usedCount: {
            increment: 1,
          },
        },
      })
    }

    const itemsBySeller = new Map<string, string[]>()
    for (const item of orderItems) {
      const sellerId = item.product.sellerId
      if (!sellerId || sellerId === session.user.id) continue

      const existing = itemsBySeller.get(sellerId) || []
      existing.push(item.product.name)
      itemsBySeller.set(sellerId, existing)
    }

    await Promise.all(
      Array.from(itemsBySeller.entries()).map(([sellerId, names]) => {
        const distinctNames = Array.from(new Set(names))
        const firstName = distinctNames[0]
        const moreCount = Math.max(0, distinctNames.length - 1)

        return createNotification({
          recipientId: sellerId,
          type: "ORDER_RECEIVED",
          title: "New order received",
          message:
            moreCount > 0
              ? `Order ${order?.orderNumber} includes ${firstName} and ${moreCount} more product(s).`
              : `Order ${order?.orderNumber} includes your product ${firstName}.`,
          link: "/orders",
        })
      })
    )

    return NextResponse.json(
      {
        ...order,
        appliedPromoCode: appliedPromoCode
          ? {
              code: appliedPromoCode.code,
              type: appliedPromoCode.type,
              value: appliedPromoCode.value,
            }
          : null,
      },
      { status: 201 }
    )
  } catch (error: any) {
    if (error instanceof Error && error.message) {
      if (error.message.startsWith("Product ")) {
        return new NextResponse(error.message, { status: 400 })
      }
    }

    console.error("ORDERS_POST_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")?.trim()
    const isAdmin = session.user.role === "ADMIN"

    let where: any = isAdmin
      ? {}
      : {
          OR: [{ userId: session.user.id }, { items: { some: { product: { sellerId: session.user.id } } } }],
        }

    if (query) {
      const queryFilter: any[] = [{ orderNumber: { contains: query, mode: "insensitive" } }]

      if (isAdmin) {
        queryFilter.push(
          { user: { name: { contains: query, mode: "insensitive" } } },
          { user: { email: { contains: query, mode: "insensitive" } } }
        )
        where.OR = queryFilter
      } else {
        where = {
          AND: [where, { OR: queryFilter }],
        }
      }
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sellerId: true,
              },
            },
          },
        },
        deliveryMethod: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      take: 100,
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error("ORDERS_GET_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
