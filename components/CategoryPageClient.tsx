"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ChevronRight,
  Grid3X3,
  Home,
  List,
  Minus,
  Search,
  SlidersHorizontal,
} from "lucide-react"
import ProductCard from "@/components/ProductCard"

type Product = {
  id: string
  name: string
  price: number
  status: string
  brand: string | null
  description: string
  imageUrl: string
  category: string
}

type Section = { id: string; name: string; slug: string }

type Props = {
  title: string
  description: string | null
  image: string | null
  products: Product[]
  filterSections: Section[]
  slug: string
  currentSort: string
  currentQuery: string
  currentSection: string
  maxProductPrice: number
}

export default function CategoryPageClient({
  title,
  description,
  image,
  products,
  filterSections,
  slug,
  currentSort,
  currentQuery,
  currentSection,
  maxProductPrice,
}: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [priceMin, setPriceMin] = useState(0)
  const [priceMax, setPriceMax] = useState(maxProductPrice)
  const [showInStock, setShowInStock] = useState(false)
  const [showOutOfStock, setShowOutOfStock] = useState(false)

  const inStockCount = useMemo(
    () => products.filter((p) => p.status === "PUBLISHED").length,
    [products]
  )
  const outOfStockCount = useMemo(
    () => products.filter((p) => p.status === "OUT_OF_STOCK").length,
    [products]
  )

  const visibleProducts = useMemo(() => {
    return products.filter((p) => {
      if (showInStock && !showOutOfStock && p.status !== "PUBLISHED") return false
      if (!showInStock && showOutOfStock && p.status !== "OUT_OF_STOCK") return false
      if (p.price < priceMin) return false
      if (maxProductPrice > 0 && p.price > priceMax) return false
      return true
    })
  }, [products, showInStock, showOutOfStock, priceMin, priceMax, maxProductPrice])

  const maxP = Math.max(maxProductPrice, 1)

  return (
    <>
      {/* ── Hero ── */}
      <div className="relative h-64 sm:h-80 w-full overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-linear-to-br from-gray-700 to-gray-900" />
        )}
        <div className="absolute inset-0 bg-black/50" />

        {/* Breadcrumb */}
        <nav className="absolute top-5 left-6 flex items-center gap-2 text-sm text-white/75">
          <Link href="/" className="hover:text-white flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            Home
          </Link>
          <span>|</span>
          <Link href="/categories" className="hover:text-white">
            Collection
          </Link>
          <span>|</span>
          <span className="text-white font-medium">{title}</span>
        </nav>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-3 max-w-2xl text-sm sm:text-base text-white/80 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filter
          </button>

          <span className="text-sm text-gray-500 shrink-0">
            {visibleProducts.length} product{visibleProducts.length !== 1 ? "s" : ""}
          </span>

          <div className="flex-1" />

          {/* Sort */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-sm text-gray-600 shrink-0">Sort by:</span>
            <form action={`/categories/${slug}`} method="get">
              {currentQuery && <input type="hidden" name="q" value={currentQuery} />}
              {currentSection && (
                <input type="hidden" name="section" value={currentSection} />
              )}
              <select
                name="sort"
                defaultValue={currentSort}
                onChange={(e) =>
                  (e.target.closest("form") as HTMLFormElement | null)?.submit()
                }
                className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-black"
              >
                <option value="featured">Best selling</option>
                <option value="newest">Newest</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name">Name</option>
              </select>
            </form>
          </div>

          {/* View toggle */}
          <div className="flex items-center rounded-full border border-gray-200 p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-full transition ${
                viewMode === "grid"
                  ? "bg-gray-950 text-white"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
              aria-label="Grid view"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-full transition ${
                viewMode === "list"
                  ? "bg-gray-950 text-white"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 flex gap-6 flex-1 items-start">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-64 shrink-0 sticky top-16 rounded-2xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-100">
            {/* Search */}
            <form action={`/categories/${slug}`} method="get" className="p-4">
              {currentSection && (
                <input type="hidden" name="section" value={currentSection} />
              )}
              {currentSort && currentSort !== "featured" && (
                <input type="hidden" name="sort" value={currentSort} />
              )}
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 focus-within:border-black transition">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="search"
                  name="q"
                  defaultValue={currentQuery}
                  placeholder={`Search ${title.toLowerCase()}…`}
                  className="w-full text-sm outline-none bg-transparent"
                />
              </div>
            </form>

            {/* Availability */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-950">Availability</h3>
                <Minus className="w-4 h-4 text-gray-400" />
              </div>
              <label className="flex items-center justify-between text-sm text-gray-700 cursor-pointer py-1.5">
                <span className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={showInStock}
                    onChange={(e) => setShowInStock(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 accent-black"
                  />
                  In stock
                </span>
                <span className="text-gray-400 text-xs">{inStockCount}</span>
              </label>
              <label className="flex items-center justify-between text-sm text-gray-700 cursor-pointer py-1.5">
                <span className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={showOutOfStock}
                    onChange={(e) => setShowOutOfStock(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 accent-black"
                  />
                  Out of stock
                </span>
                <span className="text-gray-400 text-xs">{outOfStockCount}</span>
              </label>
            </div>

            {/* Price */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-950">Price</h3>
                <Minus className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-xs text-gray-500 mb-4">
                The highest price is ${maxProductPrice.toFixed(2)}
              </p>
              {/* Visual range bar */}
              <div className="relative h-1.5 bg-gray-200 rounded-full mb-5">
                <div
                  className="absolute h-full bg-gray-950 rounded-full"
                  style={{
                    left: `${(priceMin / maxP) * 100}%`,
                    right: `${100 - (priceMax / maxP) * 100}%`,
                  }}
                />
                <div
                  className="absolute w-3.5 h-3.5 bg-gray-950 rounded-full top-1/2 -translate-y-1/2 -translate-x-1/2 border-2 border-white shadow"
                  style={{ left: `${(priceMin / maxP) * 100}%` }}
                />
                <div
                  className="absolute w-3.5 h-3.5 bg-gray-950 rounded-full top-1/2 -translate-y-1/2 translate-x-1/2 border-2 border-white shadow"
                  style={{ right: `${100 - (priceMax / maxP) * 100}%` }}
                />
              </div>
              {/* Min / Max inputs */}
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-1 border border-gray-200 rounded-xl px-2.5 py-1.5 bg-gray-50">
                  <span className="text-xs text-gray-400">$</span>
                  <input
                    type="number"
                    value={priceMin}
                    min={0}
                    max={priceMax - 1}
                    onChange={(e) =>
                      setPriceMin(
                        Math.min(Math.max(0, Number(e.target.value)), priceMax - 1)
                      )
                    }
                    className="w-full text-sm outline-none bg-transparent"
                  />
                </div>
                <div className="flex-1 flex items-center gap-1 border border-gray-200 rounded-xl px-2.5 py-1.5 bg-gray-50">
                  <span className="text-xs text-gray-400">$</span>
                  <input
                    type="number"
                    value={priceMax}
                    min={priceMin + 1}
                    max={maxProductPrice}
                    onChange={(e) =>
                      setPriceMax(
                        Math.max(
                          Math.min(maxProductPrice, Number(e.target.value)),
                          priceMin + 1
                        )
                      )
                    }
                    className="w-full text-sm outline-none bg-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Sub-category sections */}
            {filterSections.length > 0 && (
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-950">Category</h3>
                  <Minus className="w-4 h-4 text-gray-400" />
                </div>
                <div className="space-y-1">
                  {filterSections.map((child) => {
                    const href = currentQuery
                      ? `/categories/${slug}?section=${child.slug}&q=${encodeURIComponent(currentQuery)}&sort=${currentSort}`
                      : `/categories/${slug}?section=${child.slug}&sort=${currentSort}`
                    const isActive = currentSection === child.slug.toLowerCase()
                    return (
                      <Link
                        key={child.id}
                        href={href}
                        className={`flex items-center justify-between text-sm rounded-xl px-3 py-2 transition ${
                          isActive
                            ? "bg-gray-950 text-white"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {child.name}
                        <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {(currentQuery || currentSection || currentSort !== "featured") && (
              <div className="p-4">
                <Link
                  href={`/categories/${slug}`}
                  className="block w-full text-center rounded-xl bg-black text-white text-sm font-medium px-4 py-2.5 hover:bg-gray-800 transition"
                >
                  Clear Filters
                </Link>
              </div>
            )}
          </aside>
        )}

        {/* ── Products ── */}
        <div className="flex-1 min-w-0">
          {visibleProducts.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center">
              <img
                src="/NoItems.png"
                alt="No items"
                className="mb-4 w-80 max-w-full opacity-80"
              />
              <p className="text-gray-500 text-sm">No products found.</p>
            </div>
          ) : viewMode === "grid" ? (
            <div
              className={`grid gap-5 ${
                sidebarOpen
                  ? "grid-cols-2 xl:grid-cols-3"
                  : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4"
              }`}
            >
              {visibleProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  title={product.name}
                  price={`$${product.price.toFixed(2)}`}
                  image={product.imageUrl}
                  category={product.category}
                  badges={[]}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {visibleProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/product/${product.id}`}
                  className="flex gap-4 items-center rounded-2xl border border-gray-200 bg-white p-4 hover:border-gray-300 hover:shadow-sm transition"
                >
                  <div className="w-24 h-24 shrink-0 rounded-xl bg-gray-100 overflow-hidden">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl font-semibold">
                        {product.name[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {product.category && (
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">
                        {product.category}
                      </p>
                    )}
                    <p className="font-semibold text-gray-900 line-clamp-1">
                      {product.name}
                    </p>
                    <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">
                      {product.description}
                    </p>
                    <p className="mt-2 font-bold text-gray-950">
                      ${product.price.toFixed(2)}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
