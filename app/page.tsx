import Header from "@/components/Header"
import Hero from "@/components/Hero"
import Categories from "@/components/Categories"
import FeaturedListings from "@/components/FeaturedListings"
import Footer from "@/components/Footer"
import prisma from "@/lib/prisma"
import { buildTrustBadges } from "@/lib/trustBadges"

export const dynamic = "force-dynamic"

const CITY_PREFIX = "city:"
const TOWN_PREFIX = "town:"
const PROVINCE_PREFIX = "province:"
const REGION_PREFIX = "region:"
const AVAILABILITY_SCOPE_PREFIX = "availabilityScope:"

function getTagValue(tags: string[], prefix: string) {
  const tag = tags.find((item) => item.startsWith(prefix))
  return tag ? tag.slice(prefix.length) : null
}

function getProductLocation(tags: string[]) {
  const availabilityScope = getTagValue(tags, AVAILABILITY_SCOPE_PREFIX)
  if (availabilityScope === "ALL_ZIMBABWE") {
    return "All Zimbabwe"
  }

  const locationParts = [
    getTagValue(tags, CITY_PREFIX),
    getTagValue(tags, TOWN_PREFIX),
    getTagValue(tags, PROVINCE_PREFIX),
    getTagValue(tags, REGION_PREFIX),
  ]
    .map((value) => value?.trim())
    .filter(Boolean)

  return locationParts.length > 0 ? locationParts.join(", ") : "Not specified"
}

async function getApprovedFeaturedProducts() {
  try {
    const products = await prisma.product.findMany({
      where: {
        status: "PUBLISHED",
        tags: {
          has: "approval:approved",
        },
      },
      orderBy: [{ popularity: "desc" }, { updatedAt: "desc" }],
      include: {
        category: {
          select: {
            name: true,
          },
        },
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
      take: 8,
    })

    const productIds = products.map((product) => product.id)
    const sellerIds = Array.from(
      new Set(products.map((product) => product.seller?.id).filter((sellerId): sellerId is string => Boolean(sellerId)))
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

    return products.map((product) => ({
      id: product.id,
      title: product.name,
      price: `$${product.price.toFixed(2)}`,
      image: product.images[0]?.url || "/window.svg",
      brand: product.brand || "Unbranded",
      location: getProductLocation(product.tags),
      category: product.category?.name || "General",
      badges: buildTrustBadges({
        tags: product.tags,
        brand: product.brand,
        sellerVerified: Boolean(product.seller?.emailVerified),
        sellerPublishedCount: product.seller?.id ? sellerCountMap.get(product.seller.id) || 0 : 0,
        averageRating: ratingMap.get(product.id) ?? null,
        popularity: product.popularity,
      }),
    }))
  } catch (error) {
    console.error("HOME_PRODUCTS_LOAD_ERROR", error)
    return []
  }
}

export default async function HomePage() {
  const featuredProducts = await getApprovedFeaturedProducts()

  const brands = Array.from(new Set(featuredProducts.map((p) => p.brand))).sort()
  const locations = Array.from(new Set(featuredProducts.map((p) => p.location))).sort()
  const categories = Array.from(new Set(featuredProducts.map((p) => p.category))).sort()

  return (
    <main className="bg-gray-50 min-h-screen flex flex-col">
      <Header />
      <Hero brands={brands} locations={locations} categories={categories} />
      <Categories />
      <FeaturedListings products={featuredProducts} />
      <Footer />
    </main>
  )
}