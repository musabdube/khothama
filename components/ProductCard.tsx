"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Heart } from "lucide-react"

interface ProductCardProps {
  title: string
  price: string
  originalPrice?: string
  image: string
  id: string
  category?: string
  badges?: string[]
}

function badgeStyle(badge: string) {
  const lower = badge.toLowerCase()
  if (lower === "sale") return "bg-red-500 text-white"
  if (lower === "new") return "bg-green-500 text-white"
  if (lower === "coming soon") return "bg-purple-500 text-white"
  if (lower === "top seller") return "bg-amber-500 text-white"
  if (lower === "verified seller") return "bg-blue-500 text-white"
  return "bg-gray-800 text-white"
}

export default function ProductCard({ title, price, originalPrice, image, id, category, badges = [] }: ProductCardProps) {
  const { data: session } = useSession()
  const [isSaving, setIsSaving] = useState(false)
  const [isInWishlist, setIsInWishlist] = useState(false)
  const [message, setMessage] = useState("")

  const isSale = badges.some((b) => b.toLowerCase() === "sale")
  const firstBadge = badges[0] ?? null

  useEffect(() => {
    const checkWishlistState = async () => {
      if (!session) {
        setIsInWishlist(false)
        return
      }

      try {
        const response = await fetch(`/api/wishlist?productId=${encodeURIComponent(id)}`)
        if (!response.ok) return

        const data = await response.json()
        setIsInWishlist(Boolean(data?.inWishlist))
      } catch {
        setIsInWishlist(false)
      }
    }

    checkWishlistState()
  }, [session, id])

  const handleToggleWishlist = async () => {
    setMessage("")

    if (!session) {
      setMessage("Please login first")
      return
    }

    setIsSaving(true)

    try {
      const response = isInWishlist
        ? await fetch(`/api/wishlist/${id}`, { method: "DELETE" })
        : await fetch("/api/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId: id }),
          })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to update wishlist")
      }

      const nextState = !isInWishlist
      setIsInWishlist(nextState)
      setMessage(nextState ? "Added to wishlist" : "Removed from wishlist")
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Failed to update wishlist")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col">
      {/* Image area */}
      <Link href={`/product/${id}`} className="block relative rounded-2xl overflow-hidden bg-gray-100 aspect-square group">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
        />

        {/* Badge pill */}
        {firstBadge && (
          <span className={`absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-semibold ${badgeStyle(firstBadge)}`}>
            {firstBadge}
          </span>
        )}

        {/* Wishlist button */}
        <button
          onClick={(e) => { e.preventDefault(); void handleToggleWishlist() }}
          disabled={isSaving}
          className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white shadow flex items-center justify-center hover:scale-110 transition disabled:opacity-60"
          aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart className={`w-4 h-4 ${isInWishlist ? "fill-current text-red-500" : "text-gray-500"}`} />
        </button>
      </Link>

      {/* Text area */}
      <div className="pt-3 flex flex-col gap-0.5">
        {category && (
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">{category}</p>
        )}
        <Link href={`/product/${id}`}>
          <h3 className="text-sm sm:text-base font-semibold text-gray-900 leading-snug line-clamp-2 hover:underline">
            {title}
          </h3>
        </Link>
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className={`text-sm sm:text-base font-bold ${isSale ? "text-red-500" : "text-gray-950"}`}>
            {price}
          </span>
          {originalPrice && (
            <span className="text-sm text-gray-400 line-through">{originalPrice}</span>
          )}
        </div>
        {message && <p className="text-xs text-gray-500 mt-1">{message}</p>}
      </div>
    </div>
  )
}
