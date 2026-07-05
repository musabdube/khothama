import Header from "@/components/Header"
import Footer from "@/components/Footer"
import CategoryPageClient from "@/components/CategoryPageClient"
import prisma from "@/lib/prisma"
import { formatCategoryPath } from "@/lib/categories"

export const dynamic = "force-dynamic"

type CategoryPageProps = {
  params: Promise<{ slug: string }>
  searchParams?: Promise<{
    q?: string
    sort?: string
    section?: string
  }>
}

function formatSlugLabel(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

async function getCategoryData(slug: string) {
  try {
    const category = await prisma.category.findFirst({
      where: {
        slug,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        parentId: true,
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
            parentId: true,
            children: {
              where: { isActive: true },
              orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        children: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            slug: true,
            image: true,
          },
        },
      },
    })

    const categoryIds = category
      ? category.parentId
        ? [category.id]
        : [category.id, ...category.children.map((child) => child.id)]
      : []

    const products = await prisma.product.findMany({
      where: {
        status: { in: ["PUBLISHED", "OUT_OF_STOCK"] },
        tags: {
          has: "approval:approved",
        },
        ...(categoryIds.length > 0
          ? {
              categoryId: {
                in: categoryIds,
              },
            }
          : {
              category: {
                slug,
              },
            }),
      },
      orderBy: [{ popularity: "desc" }, { updatedAt: "desc" }],
      include: {
        images: {
          select: { url: true, sortOrder: true },
          orderBy: { sortOrder: "asc" },
          take: 1,
        },
        category: {
          select: { name: true },
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      take: 80,
    })

    return {
      category,
      products,
    }
  } catch (error) {
    console.error("CATEGORY_PRODUCTS_PAGE_LOAD_ERROR", error)
    return {
      category: null,
      products: [],
    }
  }
}

function sortProducts<T extends { popularity: number; updatedAt: Date; price: number; name: string }>(
  products: T[],
  sort: string
) {
  const nextProducts = [...products]

  if (sort === "price-asc") {
    nextProducts.sort((left, right) => left.price - right.price)
    return nextProducts
  }

  if (sort === "price-desc") {
    nextProducts.sort((left, right) => right.price - left.price)
    return nextProducts
  }

  if (sort === "name") {
    nextProducts.sort((left, right) => left.name.localeCompare(right.name))
    return nextProducts
  }

  if (sort === "newest") {
    nextProducts.sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
    return nextProducts
  }

  nextProducts.sort((left, right) => {
    if (right.popularity !== left.popularity) {
      return right.popularity - left.popularity
    }

    return right.updatedAt.getTime() - left.updatedAt.getTime()
  })

  return nextProducts
}

function matchesQuery(value: string, query: string) {
  return value.toLowerCase().includes(query)
}

export default async function CategoryProductsPage({ params, searchParams }: CategoryPageProps) {
  const resolvedParams = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const slug = decodeURIComponent(resolvedParams.slug || "").trim().toLowerCase()
  const query = decodeURIComponent(resolvedSearchParams?.q || "").trim().toLowerCase()
  const sort = decodeURIComponent(resolvedSearchParams?.sort || "featured").trim().toLowerCase()
  const section = decodeURIComponent(resolvedSearchParams?.section || "").trim().toLowerCase()
  const { category, products } = await getCategoryData(slug)

  const title = category?.name || formatSlugLabel(slug) || "Category"
  const categoryPath = formatCategoryPath(category) || title
  const filterSections = category?.children?.length
    ? category.children
    : category?.parent?.children?.length
    ? category.parent.children.filter((child) => child.slug !== category.slug)
    : []

  const filteredProducts = products.filter((product) => {
    const matchesSection = !section || product.categoryId === category?.children?.find((child) => child.slug.toLowerCase() === section)?.id
    const matchesText =
      !query ||
      matchesQuery(product.name, query) ||
      matchesQuery(product.description, query) ||
      matchesQuery(product.brand || "", query)

    return matchesSection && matchesText
  })

  const visibleProducts = sortProducts(filteredProducts, sort)
  const maxProductPrice =
    visibleProducts.length > 0 ? Math.max(...visibleProducts.map((p) => p.price)) : 0

  const processedProducts = visibleProducts.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    status: p.status,
    brand: p.brand,
    description: p.description,
    imageUrl: p.images[0]?.url || "",
    category: p.category?.name || title,
  }))

  return (
    <main className="bg-gray-50 min-h-screen flex flex-col">
      <Header />
      <CategoryPageClient
        title={title}
        description={category?.description ?? null}
        image={category?.image ?? null}
        products={processedProducts}
        filterSections={filterSections}
        slug={slug}
        currentSort={sort}
        currentQuery={query}
        currentSection={section}
        maxProductPrice={maxProductPrice}
      />
      <Footer />
    </main>
  )
}
