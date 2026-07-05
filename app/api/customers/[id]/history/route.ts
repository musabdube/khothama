import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const { id } = await params

    const customer = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        name: true,
        email: true,
        createdAt: true,
        _count: {
          select: {
            orders: true,
            reviews: true,
            wishlist: true,
            productReports: true,
            sellerProducts: true,
          },
        },
      },
    })

    if (!customer || customer.role !== "USER") {
      return new NextResponse("Customer not found", { status: 404 })
    }

    const [orders, reviews, wishlist, reports] = await Promise.all([
      prisma.order.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          createdAt: true,
        },
      }),
      prisma.review.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          rating: true,
          status: true,
          createdAt: true,
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.wishlistItem.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          createdAt: true,
          product: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
        },
      }),
      prisma.productReport.findMany({
        where: { reporterId: id },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          reason: true,
          status: true,
          createdAt: true,
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
      customer,
      orders,
      reviews,
      wishlist,
      reports,
    })
  } catch (error) {
    console.error("CUSTOMER_HISTORY_GET_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
