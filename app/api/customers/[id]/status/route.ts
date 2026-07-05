import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function PATCH(
  request: Request,
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
    const body = await request.json()
    const nextStatus = body?.status === "BANNED" ? "BANNED" : body?.status === "ACTIVE" ? "ACTIVE" : null

    if (!nextStatus) {
      return new NextResponse("Invalid status", { status: 400 })
    }

    const customer = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
      },
    })

    if (!customer || customer.role !== "USER") {
      return new NextResponse("Customer not found", { status: 404 })
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { status: nextStatus },
      select: {
        id: true,
        status: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("CUSTOMER_STATUS_PATCH_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
