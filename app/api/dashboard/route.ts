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

    const userId = session.user.id

    const [
      totalOrders,
      pendingOrders,
      deliveredOrders,
      totalOffers,
      pendingOffers,
      acceptedOffers,
      wishlistCount,
      productRequestCount,
      unreadMessages,
      listedProducts,
      recentOrders,
      recentOffers,
      recentRequests,
    ] = await Promise.all([
      // Orders placed by this user
      prisma.order.count({ where: { userId } }),
      prisma.order.count({ where: { userId, status: "PENDING" } }),
      prisma.order.count({ where: { userId, status: "DELIVERED" } }),

      // Offers made by this user as buyer
      prisma.productOffer.count({ where: { buyerId: userId } }),
      prisma.productOffer.count({ where: { buyerId: userId, status: "PENDING" } }),
      prisma.productOffer.count({ where: { buyerId: userId, status: "ACCEPTED" } }),

      // Wishlist
      prisma.wishlistItem.count({ where: { userId } }),

      // Product requests
      prisma.productRequest.count({ where: { userId } }),

      // Unread messages
      prisma.conversation.count({
        where: {
          OR: [{ buyerId: userId }, { sellerId: userId }],
          messages: {
            some: {
              senderId: { not: userId },
              readAt: null,
            },
          },
        },
      }),

      // Products listed by this user as seller
      prisma.product.count({ where: { sellerId: userId } }),

      // Recent orders (last 5)
      prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          createdAt: true,
          items: {
            take: 1,
            select: {
              product: {
                select: {
                  name: true,
                  images: {
                    take: 1,
                    orderBy: { sortOrder: "asc" },
                    select: { url: true },
                  },
                },
              },
            },
          },
        },
      }),

      // Recent offers (last 5)
      prisma.productOffer.findMany({
        where: { buyerId: userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          offeredPrice: true,
          status: true,
          createdAt: true,
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              images: {
                take: 1,
                orderBy: { sortOrder: "asc" },
                select: { url: true },
              },
            },
          },
        },
      }),

      // Recent product requests (last 5)
      prisma.productRequest.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          category: true,
          budget: true,
          createdAt: true,
        },
      }),
    ])

    return NextResponse.json({
      stats: {
        orders: { total: totalOrders, pending: pendingOrders, delivered: deliveredOrders },
        offers: { total: totalOffers, pending: pendingOffers, accepted: acceptedOffers },
        wishlist: wishlistCount,
        productRequests: productRequestCount,
        unreadMessages,
        listedProducts,
      },
      recentOrders,
      recentOffers,
      recentRequests,
    })
  } catch {
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
