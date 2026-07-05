import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

const APPROVAL_PREFIX = "approval:"

function getApprovalStatus(tags: string[]) {
  const approvalTag = tags.find((tag) => tag.startsWith(APPROVAL_PREFIX))
  const value = approvalTag?.slice(APPROVAL_PREFIX.length)?.toUpperCase()

  if (value === "APPROVED" || value === "REJECTED") {
    return value
  }

  return "PENDING"
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
    const action = typeof body?.action === "string" ? body.action.trim().toLowerCase() : ""

    if (action !== "pause" && action !== "resume") {
      return new NextResponse("Invalid visibility action", { status: 400 })
    }

    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        sellerId: true,
        status: true,
        tags: true,
      },
    })

    if (!product) {
      return new NextResponse("Product not found", { status: 404 })
    }

    const isAdmin = session.user.role === "ADMIN"
    const ownsProduct = product.sellerId === session.user.id

    if (!isAdmin && !ownsProduct) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    if (action === "pause") {
      const updatedProduct = await prisma.product.update({
        where: { id },
        data: {
          status: "OUT_OF_STOCK",
        },
        select: {
          id: true,
          status: true,
        },
      })

      return NextResponse.json(updatedProduct)
    }

    const approvalStatus = getApprovalStatus(product.tags)
    if (approvalStatus !== "APPROVED") {
      return new NextResponse("Only approved products can be resumed for public listing", { status: 400 })
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        status: "PUBLISHED",
      },
      select: {
        id: true,
        status: true,
      },
    })

    return NextResponse.json(updatedProduct)
  } catch (error) {
    console.error("PRODUCT_VISIBILITY_PATCH_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}