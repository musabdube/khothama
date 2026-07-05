import Link from "next/link"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import prisma from "@/lib/prisma"
import { Search } from "lucide-react"

export const dynamic = "force-dynamic"

type ProductsPageProps = {
  searchParams?: Promise<{
    q?: string
  }>
}

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

  return locationParts.length > 0 ? locationParts.join(", ") : "Location not specified"
}

async function getPublishedProducts(query: string) {
  try {
    const products = await prisma.product.findMany({
      where: {
        status: "PUBLISHED",
        tags: {
          has: "approval:approved",
        },
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { sku: { contains: query, mode: "insensitive" } },
                { slug: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
                { category: { name: { contains: query, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      orderBy: [{ popularity: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        name: true,
        price: true,
        popularity: true,
        tags: true,
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
        images: {
          select: {
            url: true,
            sortOrder: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
          take: 1,
        },
      },
      take: 120,
    })

    return products
  } catch (error) {
    console.error("PRODUCTS_BROWSE_LOAD_ERROR", error)
    return []
  }
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const query = decodeURIComponent(resolvedSearchParams?.q || "").trim()
  const products = await getPublishedProducts(query)

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <section className="max-w-7xl mx-auto w-full px-6 py-8 flex-1">
        <div className="mb-6 rounded-3xl border border-gray-200 bg-white p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-950">Browse Products</h1>
              <p className="mt-1 text-sm text-gray-600">Find approved listings from sellers across the marketplace.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href="/myproducts" className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                My Products
              </Link>
              <Link href="/create-product" className="inline-flex items-center rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition">
                Create Product
              </Link>
            </div>
          </div>

          <form action="/products" className="relative mt-4">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search by name, sku, category..."
              className="w-full rounded-xl border border-gray-300 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-black focus:bg-white"
            />
          </form>
        </div>

        {products.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <h2 className="font-semibold text-gray-900">No products found</h2>
            <p className="mt-2 text-sm text-gray-600">
              {query ? `No approved products match "${query}".` : "No approved products are available right now."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/product/${product.id}`}
                className="group rounded-2xl border border-gray-200 bg-white overflow-hidden hover:border-gray-300 hover:shadow-sm transition"
              >
                <div className="aspect-square overflow-hidden bg-gray-100">
                  {product.images[0]?.url ? (
                    <img
                      src={product.images[0].url}
                      alt={product.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-sm font-semibold text-gray-500">
                      {product.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="line-clamp-1 font-semibold text-gray-950">{product.name}</div>
                  <div className="mt-1 text-sm text-gray-600">{product.category?.name || "General"}</div>
                  <div className="mt-2 text-sm text-gray-600">{getProductLocation(product.tags)}</div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-base font-semibold text-gray-950">${product.price.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">{product.popularity} views</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </main>
  )
}
