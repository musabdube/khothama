"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { getRootCategories, type CategoryOption } from "@/lib/categories"

type Category = CategoryOption

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch("/api/categories")
        if (!response.ok) return
        const data = await response.json()
        setCategories(data)
      } finally {
        setIsLoading(false)
      }
    }
    loadCategories()
  }, [])

  const rootCategories = useMemo(() => getRootCategories(categories), [categories])

  const fallbackCategories = [
    { id: "fallback-1", name: "Auto", slug: "auto", image: null },
    { id: "fallback-2", name: "Real Estate", slug: "real-estate", image: null },
    { id: "fallback-3", name: "Jobs", slug: "jobs", image: null },
    { id: "fallback-4", name: "Electronics", slug: "electronics", image: null },
    { id: "fallback-5", name: "Fashion", slug: "fashion", image: null },
    { id: "fallback-6", name: "Home & Garden", slug: "home-garden", image: null },
    { id: "fallback-7", name: "Furniture", slug: "furniture", image: null },
    { id: "fallback-8", name: "Sports", slug: "sports", image: null },
  ]

  const displayCategories = rootCategories.length > 0 ? rootCategories : fallbackCategories

  const updateScrollButtons = () => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    updateScrollButtons()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener("scroll", updateScrollButtons, { passive: true })
    const ro = new ResizeObserver(updateScrollButtons)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", updateScrollButtons)
      ro.disconnect()
    }
  }, [displayCategories])

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: direction === "left" ? -280 : 280, behavior: "smooth" })
  }

  return (
    <section className="py-6 sm:py-8 px-3 sm:px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="relative">
          {/* Left scroll button */}
          {canScrollLeft && (
            <button
              onClick={() => scroll("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 h-9 w-9 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-700 hover:bg-gray-50 transition"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Scrollable row */}
          <div
            ref={scrollRef}
            className="flex gap-5 sm:gap-7 overflow-x-auto scroll-smooth"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 shrink-0">
                    <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-gray-100 animate-pulse" />
                    <div className="h-3 w-14 rounded bg-gray-100 animate-pulse" />
                  </div>
                ))
              : displayCategories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/categories/${encodeURIComponent(category.slug)}`}
                    className="group flex flex-col items-center gap-2 shrink-0"
                  >
                    <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center transition group-hover:border-gray-400 group-hover:shadow-sm">
                      {category.image ? (
                        <img
                          src={category.image}
                          alt={category.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-lg sm:text-xl font-semibold text-gray-600">
                          {category.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-gray-800 text-center leading-tight max-w-18 sm:max-w-20 line-clamp-2">
                      {category.name}
                    </span>
                  </Link>
                ))}
          </div>

          {/* Right scroll button */}
          {canScrollRight && (
            <button
              onClick={() => scroll("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 h-9 w-9 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-700 hover:bg-gray-50 transition"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
