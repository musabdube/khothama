import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { createAdminNotification } from "@/lib/notifications"

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

    const reason = typeof body?.reason === "string" ? body.reason.trim() : ""
    const details = typeof body?.details === "string" ? body.details.trim() : ""

    if (!reason) {
      return new NextResponse("Reason is required", { status: 400 })
    }

    if (reason.length > 120) {
      return new NextResponse("Reason is too long", { status: 400 })
    }

    if (details.length > 1000) {
      return new NextResponse("Details is too long", { status: 400 })
    }

    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true, sellerId: true },
    })

    if (!product) {
      return new NextResponse("Product not found", { status: 404 })
    }

    if (product.sellerId === session.user.id) {
      return new NextResponse("You cannot report your own product", { status: 400 })
    }

    const existingPending = await prisma.productReport.findFirst({
      where: {
        productId: id,
        reporterId: session.user.id,
        status: "PENDING",
      },
      select: { id: true },
    })

    if (existingPending) {
      return new NextResponse("You already submitted a pending report for this product", { status: 409 })
    }

    const report = await prisma.productReport.create({
      data: {
        productId: id,
        reporterId: session.user.id,
        reason,
        details: details || null,
      },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        reporter: { select: { id: true, name: true, email: true } },
      },
    })

    await createAdminNotification({
      type: "ADMIN_FLAGGED_PRODUCT",
      title: "Product flagged",
      message: `${report.reporter.name || report.reporter.email} flagged ${product.name} for review.`,
      link: "/admin/reports",
    })

    return NextResponse.json(report)
  } catch (error) {
    console.error("PRODUCT_REPORT_POST_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
