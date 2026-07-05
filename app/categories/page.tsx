import Link from "next/link"
import { ChevronRight, Home, Layers3, Search, Shapes, Sparkles } from "lucide-react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

type CategoriesPageProps = {
  searchParams?: Promise<{
    q?: string
    focus?: string
  }>
}

async function getCategories() {
  try {
    return await prisma.category.findMany({
      where: {
        isActive: true,
        parentId: null,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        description: true,
        _count: {
          select: {
            children: true,
            products: true,
          },
        },
        children: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            slug: true,
            _count: {
              select: {
                products: true,
              },
            },
          },
        },
      },
      take: 60,
    })
  } catch (error) {
    console.error("CATEGORIES_PAGE_LOAD_ERROR", error)
    return []
  }
}

function matchesQuery(value: string, query: string) {
  return value.toLowerCase().includes(query)
}

export default async function CategoriesPage({ searchParams }: CategoriesPageProps) {
  const categories = await getCategories()
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const query = decodeURIComponent(resolvedSearchParams?.q || "").trim().toLowerCase()
  const focus = decodeURIComponent(resolvedSearchParams?.focus || "").trim().toLowerCase()

  const filteredCategories = categories.filter((category) => {
    const matchesFocus = !focus || category.slug.toLowerCase() === focus
    const matchesText =
      !query ||
      matchesQuery(category.name, query) ||
      matchesQuery(category.description || "", query) ||
      category.children.some((child) => matchesQuery(child.name, query))

    return matchesFocus && matchesText
  })

  const featuredCategory =
    filteredCategories[0] || categories.find((category) => category.slug.toLowerCase() === focus) || categories[0]

  const totalSubcategories = categories.reduce((sum, category) => sum + category.children.length, 0)
  const categoriesWithImages = categories.filter((category) => Boolean(category.image)).length
  const quickCategories = categories.slice(0, 4)
  const browseCategories = filteredCategories.length > 0 ? filteredCategories : categories

  return (
    <main className="bg-gray-50 min-h-screen flex flex-col">
      <Header />

      <section className="max-w-7xl mx-auto w-full px-6 py-8 flex-1">
        <div className="mb-4 flex flex-col gap-4 rounded-[28px] border border-gray-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Link href="/" className="inline-flex items-center gap-1.5 hover:text-black">
              <Home className="h-4 w-4" />
              <span>Home</span>
            </Link>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <span className="font-medium text-gray-900">Categories</span>
          </div>

          <form className="relative w-full sm:max-w-md" action="/categories">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search categories or subcategories..."
              className="w-full rounded-xl border border-gray-300 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-black focus:bg-white"
            />
            {focus && <input type="hidden" name="focus" value={focus} />}
          </form>
        </div>

        {categories.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-sm text-gray-600">No categories found.</div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[260px,1fr]">
            <aside className="rounded-[28px] border border-gray-200 bg-white p-5 h-fit lg:sticky lg:top-24">
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-gray-950">Filter by</h2>
                <p className="mt-1 text-sm text-gray-500">Browse by your main categories.</p>
              </div>

              <div className="space-y-3 border-b border-gray-200 pb-5">
                <div className="rounded-2xl bg-sky-50 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-sky-600">Total Categories</div>
                  <div className="mt-1 text-2xl font-semibold text-gray-950">{categories.length}</div>
                </div>
                <div className="rounded-2xl bg-gray-50 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-gray-500">Subcategories</div>
                  <div className="mt-1 text-2xl font-semibold text-gray-950">{totalSubcategories}</div>
                </div>
                <div className="rounded-2xl bg-gray-50 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-gray-500">With Images</div>
                  <div className="mt-1 text-2xl font-semibold text-gray-950">{categoriesWithImages}</div>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {categories.map((category) => {
                  const isActive = focus === category.slug.toLowerCase()

                  return (
                    <Link
                      key={category.id}
                      href={
                        query
                          ? `/categories?focus=${encodeURIComponent(category.slug)}&q=${encodeURIComponent(query)}`
                          : `/categories?focus=${encodeURIComponent(category.slug)}`
                      }
                      className={`flex items-center justify-between rounded-2xl border px-3 py-3 text-sm transition ${
                        isActive
                          ? "border-black bg-black text-white"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <span className="font-medium">{category.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${isActive ? "bg-white/15 text-white" : "bg-gray-100 text-gray-500"}`}>
                        {category.children.length}
                      </span>
                    </Link>
                  )
                })}
              </div>

              {(focus || query) && (
                <Link
                  href="/categories"
                  className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
                >
                  Clear Filters
                </Link>
              )}
            </aside>

            <div className="space-y-5">
              {featuredCategory && (
                <div className="overflow-hidden rounded-[30px] border border-gray-200 bg-white">
                  <div className="grid gap-4 p-6 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
                    <div>
                      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                        <Sparkles className="h-3.5 w-3.5" />
                        Featured Category
                      </div>
                      <h1 className="text-3xl font-semibold tracking-tight text-gray-950">{featuredCategory.name}</h1>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
                        {featuredCategory.description || `Explore ${featuredCategory.name} and related subcategories available on Khothama.`}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {featuredCategory.children.slice(0, 5).map((child) => (
                          <Link
                            key={child.id}
                            href={`/categories/${child.slug}`}
                            className="inline-flex items-center rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-black hover:text-black"
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <Link
                          href={`/categories/${featuredCategory.slug}`}
                          className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
                        >
                          View Category
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                        <div className="inline-flex items-center rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600">
                          {featuredCategory.children.length} subcategories
                        </div>
                      </div>
                    </div>

                    <div className="relative min-h-56 overflow-hidden rounded-[28px] border border-sky-100 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.24),transparent_55%),linear-gradient(135deg,#f8fbff,#eef6ff)]">
                      {featuredCategory.image ? (
                        <img src={featuredCategory.image} alt={featuredCategory.name} className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="flex h-28 w-28 items-center justify-center rounded-4xl border border-white/80 bg-white/70 text-4xl font-semibold text-gray-700 shadow-sm">
                            {featuredCategory.name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {quickCategories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/categories/${category.slug}`}
                    className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 transition hover:border-gray-300 hover:bg-gray-50"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-gray-700">
                      <Layers3 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-gray-950">{category.name}</div>
                      <div className="text-xs text-gray-500">{category.children.length} sections</div>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="rounded-[28px] border border-gray-200 bg-white p-5">
                <div className="mb-5 flex flex-col gap-2 border-b border-gray-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-950">Browse Categories</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {browseCategories.length} result{browseCategories.length === 1 ? "" : "s"}
                      {query ? ` for "${query}"` : ""}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-600">
                    <Shapes className="h-4 w-4" />
                    Using your live categories
                  </div>
                </div>

                {browseCategories.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 px-5 py-10 text-center text-sm text-gray-500">
                    No categories matched your search.
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {browseCategories.map((category) => {
                      const totalItems = category._count.products + category.children.reduce((sum, child) => sum + child._count.products, 0)

                      return (
                        <div key={category.id} className="overflow-hidden rounded-[26px] border border-gray-200 bg-gray-50/70 transition hover:border-gray-300 hover:bg-white">
                          <div className="relative h-44 overflow-hidden border-b border-gray-200 bg-[linear-gradient(135deg,#f7fbff,#eef5ff)]">
                            {category.image ? (
                              <img src={category.image} alt={category.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-5xl font-semibold text-gray-400">
                                {category.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>

                          <div className="p-5">
                            <div className="mb-2 flex items-start justify-between gap-3">
                              <h3 className="text-xl font-semibold text-gray-950">{category.name}</h3>
                              <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                                {totalItems} items
                              </span>
                            </div>

                            <p className="min-h-12 text-sm leading-6 text-gray-600">
                              {category.description || `Explore ${category.name} with ${category.children.length} related sections.`}
                            </p>

                            {category.children.length > 0 && (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {category.children.slice(0, 4).map((child) => (
                                  <Link
                                    key={child.id}
                                    href={`/categories/${child.slug}`}
                                    className="inline-flex items-center rounded-full border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700 transition hover:border-black hover:text-black"
                                  >
                                    {child.name}
                                  </Link>
                                ))}
                              </div>
                            )}

                            <div className="mt-5 flex items-center justify-between text-sm">
                              <div className="text-gray-500">{category.children.length} subcategories</div>
                              <Link href={`/categories/${category.slug}`} className="inline-flex items-center gap-1 font-medium text-gray-900 hover:text-black">
                                View Details
                                <ChevronRight className="h-4 w-4" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-[28px] border border-gray-200 bg-white p-5">
                <h2 className="text-2xl font-semibold text-gray-950">Browse by Category</h2>
                <p className="mt-1 text-sm text-gray-500">Quick access to the main sections people explore most.</p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {categories.slice(0, 8).map((category) => (
                    <Link
                      key={category.id}
                      href={`/categories/${category.slug}`}
                      className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 transition hover:border-gray-300 hover:bg-white"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white border border-gray-200">
                        {category.image ? (
                          <img src={category.image} alt={category.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-sm font-semibold text-gray-600">{category.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-gray-950">{category.name}</div>
                        <div className="text-xs text-gray-500">{category.children.length} linked sections</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <Footer />
    </main>
  )
}