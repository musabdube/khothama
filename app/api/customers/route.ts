import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")?.trim()

    const customers = await prisma.user.findMany({
      where: {
        role: "USER",
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        tags: {
          select: {
            id: true,
            name: true,
            color: true,
          },
          orderBy: { name: "asc" },
        },
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
      take: 300,
    })

    return NextResponse.json(customers)
  } catch (error) {
    console.error("CUSTOMERS_GET_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
