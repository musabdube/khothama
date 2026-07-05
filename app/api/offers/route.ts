import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { buildTrustBadges } from "@/lib/trustBadges"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")?.trim()

    const offers = await prisma.productOffer.findMany({
      where: {
        buyerId: session.user.id,
        ...(query
          ? {
              OR: [
                { product: { name: { contains: query, mode: "insensitive" } } },
                { seller: { name: { contains: query, mode: "insensitive" } } },
                { seller: { email: { contains: query, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            brand: true,
            popularity: true,
            tags: true,
            images: {
              select: {
                url: true,
                sortOrder: true,
              },
              orderBy: { sortOrder: "asc" },
              take: 1,
            },
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            emailVerified: true,
          },
        },
        rating: { select: { id: true } },
      },
      take: 200,
    })

    const productIds = offers.map((offer) => offer.product.id)
    const sellerIds = Array.from(new Set(offers.map((offer) => offer.seller.id)))

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
                has: "approval:approved",
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
      offers.map((offer) => ({
        id: offer.id,
        offeredPrice: offer.offeredPrice,
        note: offer.note,
        status: offer.status,
        sellerNote: offer.sellerNote,
        createdAt: offer.createdAt,
        updatedAt: offer.updatedAt,
        respondedAt: offer.respondedAt,
        product: {
          id: offer.product.id,
          name: offer.product.name,
          price: offer.product.price,
          imageUrl: offer.product.images[0]?.url || null,
          badges: buildTrustBadges({
            tags: offer.product.tags,
            brand: offer.product.brand,
            sellerVerified: Boolean(offer.seller.emailVerified),
            sellerPublishedCount: sellerCountMap.get(offer.seller.id) || 0,
            averageRating: ratingMap.get(offer.product.id) ?? null,
            popularity: offer.product.popularity,
          }),
        },
        seller: offer.seller,
        hasRated: Boolean(offer.rating),
      }))
    )
  } catch (error) {
    console.error("OFFERS_GET_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}