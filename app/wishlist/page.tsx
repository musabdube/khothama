"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Loader2, Trash2 } from "lucide-react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"

type WishlistRow = {
  id: string
  createdAt: string
  product: {
    id: string
    name: string
    price: number
    sku: string
    imageUrl: string
    badges: string[]
  }
}

export default function WishlistPage() {
  const { data: session, status: sessionStatus } = useSession()
  const [items, setItems] = useState<WishlistRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRemoving, setIsRemoving] = useState<string | null>(null)
  const [error, setError] = useState("")

  const fetchWishlist = useCallback(async () => {
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/wishlist")
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to load wishlist")
      }

      const data: WishlistRow[] = await response.json()
      setItems(data)
    } catch (fetchError: unknown) {
      if (fetchError instanceof Error) {
        setError(fetchError.message)
      } else {
        setError("Failed to load wishlist")
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchWishlist()
    }

    if (sessionStatus === "unauthenticated") {
      setIsLoading(false)
    }
  }, [sessionStatus, fetchWishlist])

  const removeItem = async (productId: string) => {
    setIsRemoving(productId)
    setError("")

    try {
      const response = await fetch(`/api/wishlist/${productId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to remove item")
      }

      setItems((previous) => previous.filter((item) => item.product.id !== productId))
    } catch (removeError: unknown) {
      if (removeError instanceof Error) {
        setError(removeError.message)
      } else {
        setError("Failed to remove item")
      }
    } finally {
      setIsRemoving(null)
    }
  }

  if (sessionStatus === "loading") {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <section className="max-w-7xl mx-auto px-6 py-12">Loading...</section>
        <Footer />
      </main>
    )
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <section className="max-w-7xl mx-auto px-6 py-12">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">Please login to view wishlist.</div>
        </section>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Wishlist</h1>
          <p className="text-gray-700">Saved products you want to view later.</p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-gray-800 font-medium">Loading wishlist...</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <img src="/NoItems.png" alt="No items" className="mb-4 w-104 max-w-full opacity-80" />
            <p className="text-gray-700 text-sm">Your wishlist is empty.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {items.map((item) => {
              const firstBadge = item.product.badges[0] ?? null

              function badgeStyle(badge: string) {
                const lower = badge.toLowerCase()
                if (lower === "sale") return "bg-red-500 text-white"
                if (lower === "new") return "bg-green-500 text-white"
                if (lower === "coming soon") return "bg-purple-500 text-white"
                if (lower === "top seller") return "bg-amber-500 text-white"
                if (lower === "verified seller") return "bg-blue-500 text-white"
                return "bg-gray-800 text-white"
              }

              return (
                <div key={item.id} className="flex flex-col">
                  {/* Image area */}
                  <Link href={`/product/${item.product.id}`} className="block relative rounded-2xl overflow-hidden bg-gray-100 aspect-square group">
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />

                    {/* Badge pill */}
                    {firstBadge && (
                      <span className={`absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-semibold ${badgeStyle(firstBadge)}`}>
                        {firstBadge}
                      </span>
                    )}

                    {/* Remove button */}
                    <button
                      onClick={(e) => { e.preventDefault(); removeItem(item.product.id) }}
                      disabled={isRemoving === item.product.id}
                      aria-label={`Remove ${item.product.name} from wishlist`}
                      title="Remove from wishlist"
                      className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white shadow flex items-center justify-center hover:scale-110 transition disabled:opacity-60"
                    >
                      {isRemoving === item.product.id
                        ? <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                        : <Trash2 className="w-4 h-4 text-red-500" />}
                    </button>
                  </Link>

                  {/* Text area */}
                  <div className="pt-3 flex flex-col gap-0.5">
                    <Link href={`/product/${item.product.id}`}>
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 leading-snug line-clamp-2 hover:underline">
                        {item.product.name}
                      </h3>
                    </Link>
                    <span className="text-sm sm:text-base font-bold text-gray-950">
                      ${item.product.price.toFixed(2)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <Footer />
    </main>
  )
}
