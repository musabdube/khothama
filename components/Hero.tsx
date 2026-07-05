"use client"

import Link from "next/link"
import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"

type HeroProps = {
  brands?: string[]
  locations?: string[]
  categories?: string[]
}

export default function Hero({ brands = [], locations = [], categories = [] }: HeroProps) {
  const [query, setQuery] = useState("")
  const [brand, setBrand] = useState("all")
  const [location, setLocation] = useState("all")
  const [category, setCategory] = useState("all")
  const router = useRouter()

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set("q", query.trim())
    if (brand !== "all") params.set("brand", brand)
    if (location !== "all") params.set("location", location)
    if (category !== "all") params.set("category", category)
    router.push(`/products${params.size > 0 ? `?${params.toString()}` : ""}`)
  }

  const hasFilters = brands.length > 0 || locations.length > 0 || categories.length > 0

  return (
    <>
      <section className="bg-white pt-8 pb-20">
        <div className="max-w-5xl mx-auto text-center px-6">
          <p className="text-gray-700 mb-6 text-sm sm:text-base">
            Discover thousands of products near you.
          </p>

          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3">
            {/* Search bar row */}
            <div className="flex items-center bg-gray-100 rounded-2xl p-2 shadow-sm">
              <input
                type="text"
                placeholder="Search products..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 min-w-0 bg-transparent px-4 py-3 outline-none text-gray-900 placeholder-gray-500 text-sm"
              />
              <button
                type="submit"
                className="bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition shrink-0 ml-1 text-sm font-medium"
              >
                Search
              </button>
            </div>

            {/* Filter dropdowns row */}
            {hasFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {brands.length > 0 && (
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full bg-gray-100 border-0 rounded-xl px-4 py-3 text-sm text-gray-700 outline-none cursor-pointer"
                  >
                    <option value="all">All brands</option>
                    {brands.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                )}
                {locations.length > 0 && (
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-gray-100 border-0 rounded-xl px-4 py-3 text-sm text-gray-700 outline-none cursor-pointer"
                  >
                    <option value="all">All locations</option>
                    {locations.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                )}
                {categories.length > 0 && (
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-gray-100 border-0 rounded-xl px-4 py-3 text-sm text-gray-700 outline-none cursor-pointer"
                  >
                    <option value="all">All categories</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              </div>
            )}
          </form>
        </div>
      </section>

      <Link
        href="/create-product"
        className="fixed bottom-8 right-8 z-50 inline-flex items-center gap-2 bg-black text-white px-5 py-3.5 rounded-2xl shadow-lg text-sm font-semibold hover:bg-gray-800 active:scale-95 transition"
      >
        Sell an Item
      </Link>
    </>
  )
}
