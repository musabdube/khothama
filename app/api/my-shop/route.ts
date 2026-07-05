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

    const sellerId = session.user.id

    const [
      totalProducts,
      publishedProducts,
      draftProducts,
      totalOrders,
      pendingOrders,
      pendingOffers,
      revenueAggregate,
      recentProducts,
      recentOrders,
      recentOffers,
    ] = await Promise.all([
      prisma.product.count({ where: { sellerId } }),
      prisma.product.count({ where: { sellerId, status: "PUBLISHED" } }),
      prisma.product.count({ where: { sellerId, status: "DRAFT" } }),
      prisma.order.count({
        where: {
          items: {
            some: {
              product: {
                sellerId,
              },
            },
          },
        },
      }),
      prisma.order.count({
        where: {
          items: {
            some: {
              status: {
                in: ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED"],
              },
              product: {
                sellerId,
              },
            },
          },
        },
      }),
      prisma.productOffer.count({
        where: {
          sellerId,
          status: "PENDING",
        },
      }),
      prisma.orderItem.aggregate({
        where: {
          status: {
            notIn: ["CANCELLED", "REFUNDED"],
          },
          product: {
            sellerId,
          },
        },
        _sum: {
          total: true,
        },
      }),
      prisma.product.findMany({
        where: { sellerId },
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: {
          id: true,
          name: true,
          price: true,
          status: true,
          popularity: true,
          updatedAt: true,
          images: {
            orderBy: [
              { isPrimary: "desc" },
              { sortOrder: "asc" },
            ],
            take: 1,
            select: {
              url: true,
            },
          },
        },
      }),
      prisma.order.findMany({
        where: {
          items: {
            some: {
              product: {
                sellerId,
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
            where: {
              product: {
                sellerId,
              },
            },
            select: {
              id: true,
              quantity: true,
              status: true,
              total: true,
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.productOffer.findMany({
        where: {
          sellerId,
        },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          productId: true,
          offeredPrice: true,
          note: true,
          status: true,
          createdAt: true,
          respondedAt: true,
          buyer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ])

    return NextResponse.json({
      stats: {
        totalProducts,
        publishedProducts,
        draftProducts,
        totalOrders,
        pendingOrders,
        pendingOffers,
        totalRevenue: revenueAggregate._sum.total || 0,
      },
      recentProducts: recentProducts.map((product) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        status: product.status,
        popularity: product.popularity,
        updatedAt: product.updatedAt,
        imageUrl: product.images[0]?.url || null,
      })),
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        customer: order.user,
        sellerTotal: order.items.reduce((sum, item) => sum + item.total, 0),
        items: order.items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          status: item.status,
          total: item.total,
          product: item.product,
        })),
      })),
      recentOffers: recentOffers.map((offer) => ({
        id: offer.id,
        productId: offer.productId,
        offeredPrice: offer.offeredPrice,
        note: offer.note,
        status: offer.status,
        createdAt: offer.createdAt,
        respondedAt: offer.respondedAt,
        buyer: offer.buyer,
        product: offer.product,
      })),
    })
  } catch (error) {
    console.error("MY_SHOP_GET_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}