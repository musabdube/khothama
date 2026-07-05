import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { buildTrustBadges } from "@/lib/trustBadges"

const APPROVED_TAG = "approval:approved"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get("productId")?.trim()

    if (productId) {
      const existing = await prisma.wishlistItem.findFirst({
        where: {
          userId: session.user.id,
          productId,
          product: {
            status: "PUBLISHED",
            tags: {
              has: APPROVED_TAG,
            },
          },
        },
        select: { id: true },
      })

      return NextResponse.json({ inWishlist: Boolean(existing) })
    }

    const wishlistItems = await prisma.wishlistItem.findMany({
      where: {
        userId: session.user.id,
        product: {
          status: "PUBLISHED",
          tags: {
            has: APPROVED_TAG,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            sku: true,
            brand: true,
            popularity: true,
            tags: true,
            seller: {
              select: {
                id: true,
                emailVerified: true,
              },
            },
            images: {
              select: { url: true, sortOrder: true },
              orderBy: { sortOrder: "asc" },
              take: 1,
            },
          },
        },
      },
    })

    const productIds = wishlistItems.map((item) => item.product.id)
    const sellerIds = Array.from(
      new Set(
        wishlistItems
          .map((item) => item.product.seller?.id)
          .filter((sellerId): sellerId is string => Boolean(sellerId))
      )
    )

    const [ratingsByProduct, sellerPublishedCounts] = await Promise.all([
      productIds.length > 0
        ? prisma.review.groupBy({
            by: ["productId"],
            where: {
              productId: { in: productIds },
              status: "APPROVED",
            },
            _avg: {
              rating: true,
            },
          })
        : Promise.resolve([]),
      sellerIds.length > 0
        ? prisma.product.groupBy({
            by: ["sellerId"],
            where: {
              sellerId: { in: sellerIds },
              status: "PUBLISHED",
              tags: {
                has: APPROVED_TAG,
              },
            },
            _count: {
              _all: true,
            },
          })
        : Promise.resolve([]),
    ])

    const ratingMap = new Map(ratingsByProduct.map((item) => [item.productId, item._avg.rating]))
    const sellerCountMap = new Map(
      sellerPublishedCounts
        .filter((item) => item.sellerId)
        .map((item) => [item.sellerId as string, item._count._all])
    )

    return NextResponse.json(
      wishlistItems.map((item) => ({
        id: item.id,
        createdAt: item.createdAt,
        product: {
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          sku: item.product.sku,
          imageUrl: item.product.images[0]?.url || "/window.svg",
          badges: buildTrustBadges({
            tags: item.product.tags,
            brand: item.product.brand,
            sellerVerified: Boolean(item.product.seller?.emailVerified),
            sellerPublishedCount: item.product.seller?.id ? sellerCountMap.get(item.product.seller.id) || 0 : 0,
            averageRating: ratingMap.get(item.product.id) ?? null,
            popularity: item.product.popularity,
          }),
        },
      }))
    )
  } catch (error) {
    console.error("WISHLIST_GET_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await request.json()
    const productId = typeof body?.productId === "string" ? body.productId.trim() : ""

    if (!productId) {
      return new NextResponse("Product id is required", { status: 400 })
    }

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        status: "PUBLISHED",
        tags: {
          has: APPROVED_TAG,
        },
      },
      select: { id: true },
    })

    if (!product) {
      return new NextResponse("Product not found", { status: 404 })
    }

    const wishlistItem = await prisma.wishlistItem.upsert({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId,
        },
      },
      update: {},
      create: {
        userId: session.user.id,
        productId,
      },
    })

    return NextResponse.json(wishlistItem)
  } catch (error) {
    console.error("WISHLIST_POST_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
