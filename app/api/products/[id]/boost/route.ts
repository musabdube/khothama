import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

const DEFAULT_BOOST_AMOUNT = 25
const MIN_BOOST_AMOUNT = 1
const MAX_BOOST_AMOUNT = 5000

function normalizeBoostAmount(value: unknown) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return DEFAULT_BOOST_AMOUNT
  }

  const integerValue = Math.trunc(parsed)
  return Math.min(MAX_BOOST_AMOUNT, Math.max(MIN_BOOST_AMOUNT, integerValue))
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

    let requestBody: any = null
    try {
      requestBody = await request.json()
    } catch {
      requestBody = null
    }

    const boostBy = normalizeBoostAmount(requestBody?.amount)

    const product = await prisma.product.update({
      where: { id },
      data: {
        popularity: {
          increment: boostBy,
        },
      },
      select: {
        id: true,
        name: true,
        popularity: true,
      },
    })

    return NextResponse.json({
      ...product,
      boostedBy: boostBy,
    })
  } catch (error: any) {
    if (error?.code === "P2025") {
      return new NextResponse("Product not found", { status: 404 })
    }

    console.error("PRODUCT_BOOST_POST_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}