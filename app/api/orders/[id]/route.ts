import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

const ALLOWED_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const

function getAggregateOrderStatus(statuses: readonly string[]) {
  if (statuses.length === 0) return "PENDING"
  if (statuses.every((status) => status === "REFUNDED")) return "REFUNDED"
  if (statuses.every((status) => status === "CANCELLED")) return "CANCELLED"
  if (statuses.every((status) => status === "DELIVERED")) return "DELIVERED"
  if (statuses.some((status) => status === "SHIPPED")) return "SHIPPED"
  if (statuses.some((status) => status === "PROCESSING")) return "PROCESSING"
  if (statuses.some((status) => status === "CONFIRMED")) return "CONFIRMED"
  return "PENDING"
}

function toReadableStatus(status: string) {
  if (status === "CONFIRMED") return "Order accepted"
  if (status === "PROCESSING") return "Processing for delivery"
  if (status === "SHIPPED") return "Shipped"
  if (status === "DELIVERED") return "Delivered"
  if (status === "CANCELLED") return "Cancelled"
  if (status === "REFUNDED") return "Refunded"
  return "Pending"
}

export async function PATCH(
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
    const itemId = typeof body?.itemId === "string" ? body.itemId.trim() : ""

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                sellerId: true,
              },
            },
          },
        },
      },
    })
    if (!order) {
      return new NextResponse("Order not found", { status: 404 })
    }

    if (!itemId) {
      return new NextResponse("Order item id is required", { status: 400 })
    }

    const targetItem = order.items.find((item) => item.id === itemId)
    if (!targetItem) {
      return new NextResponse("Order item not found", { status: 404 })
    }

    if (targetItem.product.sellerId !== session.user.id) {
      return new NextResponse("Only the product owner can update this item", { status: 403 })
    }

    if (!ALLOWED_STATUSES.includes(body?.status)) {
      return new NextResponse("Invalid order status", { status: 400 })
    }

    const nextStatus = body.status
    const nextTrackingNumber = body?.trackingNumber === undefined ? targetItem.trackingNumber : body.trackingNumber || null
    const nextEstimatedDelivery =
      body?.estimatedDelivery === undefined
        ? targetItem.estimatedDelivery
        : body.estimatedDelivery
        ? new Date(body.estimatedDelivery)
        : null
    const nextStatuses = order.items.map((item) => (item.id === itemId ? nextStatus : item.status))
    const aggregateStatus = getAggregateOrderStatus(nextStatuses)
    const note = typeof body?.notes === "string" ? body.notes.trim() : ""

    const updatedOrder = await prisma.$transaction(async (transaction) => {
      await transaction.orderItem.update({
        where: { id: itemId },
        data: {
          status: nextStatus,
          trackingNumber: nextTrackingNumber,
          estimatedDelivery: nextEstimatedDelivery,
        },
      })

      return transaction.order.update({
        where: { id },
        data: {
          status: aggregateStatus,
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
    })

    if (nextStatus !== targetItem.status) {
      const statusLabel = toReadableStatus(nextStatus)
      const trackingSuffix = nextTrackingNumber ? ` Tracking number: ${nextTrackingNumber}.` : ""
      const estimatedDeliverySuffix = nextEstimatedDelivery
        ? ` Estimated delivery: ${new Date(nextEstimatedDelivery).toLocaleDateString()}.`
        : ""
      const noteSuffix = note ? ` Note: ${note}.` : ""
      const updatedItem = updatedOrder.items.find((item) => item.id === itemId)
      const productName = updatedItem?.product.name ?? targetItem.product.id
      const content = `Order ${updatedOrder.orderNumber} update for ${productName}: ${statusLabel}.${trackingSuffix}${estimatedDeliverySuffix}${noteSuffix}`

      const conversation = await prisma.conversation.upsert({
        where: {
          productId_buyerId_sellerId: {
            productId: targetItem.product.id,
            buyerId: updatedOrder.userId,
            sellerId: session.user.id,
          },
        },
        update: {
          lastMessageAt: new Date(),
        },
        create: {
          productId: targetItem.product.id,
          buyerId: updatedOrder.userId,
          sellerId: session.user.id,
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
          createdAt: true,
        },
      })

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: message.createdAt,
        },
      })
    }

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error("ORDER_PATCH_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
