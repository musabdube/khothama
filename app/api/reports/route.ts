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
    const requestedStatus = searchParams.get("status")

    const statusFilter =
      requestedStatus === "PENDING" ||
      requestedStatus === "REVIEWED" ||
      requestedStatus === "DISMISSED"
        ? requestedStatus
        : undefined

    const reports = await prisma.productReport.findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        reporter: {
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
            sku: true,
            status: true,
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                parentId: true,
                parent: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    parentId: true,
                  },
                },
              },
            },
            seller: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      take: 200,
    })

    return NextResponse.json(reports)
  } catch (error) {
    console.error("REPORTS_GET_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
