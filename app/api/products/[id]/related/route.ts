import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

const APPROVAL_PREFIX = "approval:"
const CONDITION_PREFIX = "condition:"

function getTagValue(tags: string[], prefix: string) {
  const tag = tags.find((item) => item.startsWith(prefix))
  return tag ? tag.slice(prefix.length) : null
}

function getApprovalStatus(tags: string[]) {
  const value = getTagValue(tags, APPROVAL_PREFIX)?.toUpperCase()
  if (value === "APPROVED" || value === "REJECTED") return value
  return "PENDING"
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get the current product to find its category
    const current = await prisma.product.findUnique({
      where: { id },
      select: { categoryId: true },
    })

    if (!current) {
      return NextResponse.json([])
    }

    // Find published + approved products in the same category, excluding this one
    const where = {
      id: { not: id },
      status: "PUBLISHED" as const,
      ...(current.categoryId ? { categoryId: current.categoryId } : {}),
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 12,
      select: {
        id: true,
        name: true,
        price: true,
        tags: true,
        images: {
          select: { url: true, sortOrder: true },
          orderBy: { sortOrder: "asc" },
          take: 1,
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    })

    // Filter to only approved products
    const approved = products
      .filter((p) => getApprovalStatus(p.tags) === "APPROVED")
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        condition: getTagValue(p.tags, CONDITION_PREFIX),
        imageUrl: p.images[0]?.url ?? null,
        category: p.category,
      }))

    return NextResponse.json(approved)
  } catch (error) {
    console.error("RELATED_PRODUCTS_GET_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
