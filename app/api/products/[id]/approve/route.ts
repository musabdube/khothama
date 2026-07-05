import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"

const APPROVAL_PREFIX = "approval:"
const PENDING_PUBLISH_PREFIX = "pendingPublish:"

function setTag(tags: string[], prefix: string, value: string) {
  const filtered = tags.filter((tag) => !tag.startsWith(prefix))
  return [...filtered, `${prefix}${value}`]
}

function getApprovalStatus(tags: string[]) {
  const approvalTag = tags.find((tag) => tag.startsWith(APPROVAL_PREFIX))
  const value = approvalTag?.slice(APPROVAL_PREFIX.length)?.toUpperCase()

  if (value === "APPROVED" || value === "REJECTED") {
    return value
  }

  return "PENDING"
}

function getPendingPublish(tags: string[]) {
  const tag = tags.find((item) => item.startsWith(PENDING_PUBLISH_PREFIX))
  return tag?.slice(PENDING_PUBLISH_PREFIX.length) === "true"
}

export async function POST(
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
    const decision = body?.decision === "REJECTED" ? "REJECTED" : "APPROVED"

    const existingProduct = await prisma.product.findUnique({ where: { id } })
    if (!existingProduct) {
      return new NextResponse("Product not found", { status: 404 })
    }

    const previousApprovalStatus = getApprovalStatus(existingProduct.tags)

    let tags = Array.isArray(existingProduct.tags) ? [...existingProduct.tags] : []
    tags = setTag(tags, APPROVAL_PREFIX, decision.toLowerCase())

    const shouldPublish = decision === "APPROVED" && getPendingPublish(existingProduct.tags)

    tags = setTag(tags, PENDING_PUBLISH_PREFIX, "false")

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        tags,
        status: shouldPublish ? "PUBLISHED" : decision === "REJECTED" ? "DRAFT" : existingProduct.status,
      },
      include: {
        seller: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, name: true } },
      },
    })

    if (existingProduct.sellerId && previousApprovalStatus !== decision) {
      await createNotification({
        recipientId: existingProduct.sellerId,
        type: "ADMIN_NEW_PRODUCT",
        title: decision === "APPROVED" ? "Product approved" : "Product rejected",
        message:
          decision === "APPROVED"
            ? `${updatedProduct.name} was approved and is now ready for buyers.`
            : `${updatedProduct.name} was rejected by admin review. Update the listing and resubmit it.`,
        link: "/products",
      })
    }

    return NextResponse.json({
      ...updatedProduct,
      approvalStatus: getApprovalStatus(updatedProduct.tags),
      pendingPublish: getPendingPublish(updatedProduct.tags),
    })
  } catch (error) {
    console.error("PRODUCT_APPROVAL_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
