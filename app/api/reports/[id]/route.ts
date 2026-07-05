import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function PUT(
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

    const status = body?.status === "DISMISSED" ? "DISMISSED" : body?.status === "REVIEWED" ? "REVIEWED" : null
    const adminNote = typeof body?.adminNote === "string" ? body.adminNote.trim() : ""

    if (!status) {
      return new NextResponse("Invalid status", { status: 400 })
    }

    if (adminNote.length > 1000) {
      return new NextResponse("Admin note is too long", { status: 400 })
    }

    const existing = await prisma.productReport.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existing) {
      return new NextResponse("Report not found", { status: 404 })
    }

    const updated = await prisma.productReport.update({
      where: { id },
      data: {
        status,
        adminNote: adminNote || null,
        reviewedAt: new Date(),
      },
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
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("REPORT_UPDATE_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
