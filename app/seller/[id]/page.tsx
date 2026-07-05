"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Star, Store, CalendarDays, Package } from "lucide-react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"

type SellerProfile = {
  seller: {
    id: string
    name: string | null
    email: string
    avatar: string | null
    memberSince: string
  }
  products: Array<{
    id: string
    name: string
    price: number
    imageUrl: string | null
    category: { id: string; name: string; slug: string } | null
  }>
  ratings: {
    average: number | null
    total: number
    reviews: Array<{
      id: string
      rating: number
      comment: string | null
      createdAt: string
      rater: {
        id: string
        name: string | null
        email: string
        avatar: string | null
      }
      product: { id: string; name: string } | null
    }>
  }
}

function StarRating({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-4 h-4 ${star <= value ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}`}
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.966a1 1 0 00.95.69h4.172c.969 0 1.371 1.24.588 1.81l-3.374 2.453a1 1 0 00-.364 1.118l1.286 3.966c.3.921-.755 1.688-1.54 1.118L10 15.347l-3.955 2.701c-.784.57-1.838-.197-1.539-1.118l1.286-3.966a1 1 0 00-.364-1.118L2.054 9.393c-.783-.57-.38-1.81.588-1.81h4.172a1 1 0 00.95-.69L9.049 2.927z" />
        </svg>
      ))}
    </span>
  )
}

export default function SellerProfilePage() {
  const params = useParams<{ id: string }>()
  const sellerId = typeof params?.id === "string" ? params.id : ""

  const [data, setData] = useState<SellerProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!sellerId) return
    setIsLoading(true)
    fetch(`/api/seller/${sellerId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Seller not found")
        return r.json() as Promise<SellerProfile>
      })
      .then((d) => setData(d))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load seller"))
      .finally(() => setIsLoading(false))
  }, [sellerId])

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Header />

      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 flex-1">
        {isLoading ? (
          <div className="text-gray-500 py-12 text-center">Loading seller profile...</div>
        ) : error ? (
          <div className="text-red-600 py-12 text-center">{error}</div>
        ) : !data ? null : (
          <>
            {/* Seller header */}
            <div className="flex items-center gap-5 mb-8 pb-8 border-b border-gray-100">
              {data.seller.avatar ? (
                <img
                  src={data.seller.avatar}
                  alt={data.seller.name ?? "Seller"}
                  className="w-20 h-20 rounded-full object-cover border border-gray-200 shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <Store className="w-9 h-9 text-gray-400" />
                </div>
              )}

              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-950 leading-tight truncate">
                  {data.seller.name ?? data.seller.email}
                </h1>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-gray-500">
                  {data.ratings.total > 0 && (
                    <span className="flex items-center gap-1.5">
                      <StarRating value={Math.round(data.ratings.average ?? 0)} />
                      <span className="font-semibold text-gray-800">{data.ratings.average?.toFixed(1)}</span>
                      <span>({data.ratings.total} {data.ratings.total === 1 ? "review" : "reviews"})</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Package className="w-4 h-4" />
                    {data.products.length} {data.products.length === 1 ? "listing" : "listings"}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-4 h-4" />
                    Member since {new Date(data.seller.memberSince).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>
            </div>

            {/* Products */}
            <section className="mb-12">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Listings
                <span className="ml-2 text-sm font-normal text-gray-400">({data.products.length})</span>
              </h2>

              {data.products.length === 0 ? (
                <p className="text-gray-500 text-sm">No active listings.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {data.products.map((product) => (
                    <Link
                      key={product.id}
                      href={`/product/${product.id}`}
                      className="group rounded-2xl border border-gray-100 bg-white overflow-hidden hover:shadow-md transition"
                    >
                      <div className="aspect-square bg-gray-50 overflow-hidden">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No image</div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">{product.name}</p>
                        {product.category && (
                          <p className="text-xs text-gray-400 mt-0.5">{product.category.name}</p>
                        )}
                        <p className="text-sm font-bold text-gray-950 mt-1">${product.price.toFixed(2)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Ratings & Reviews */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Ratings &amp; Reviews
                {data.ratings.total > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-400">({data.ratings.total})</span>
                )}
              </h2>

              {data.ratings.total === 0 ? (
                <p className="text-gray-500 text-sm">No reviews yet.</p>
              ) : (
                <>
                  {/* Summary bar */}
                  <div className="flex items-center gap-4 mb-6 p-4 rounded-2xl bg-gray-50 w-fit">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gray-950">{data.ratings.average?.toFixed(1)}</div>
                      <StarRating value={Math.round(data.ratings.average ?? 0)} />
                      <div className="text-xs text-gray-400 mt-0.5">{data.ratings.total} {data.ratings.total === 1 ? "review" : "reviews"}</div>
                    </div>
                  </div>

                  {/* Review list */}
                  <div className="flex flex-col gap-4">
                    {data.ratings.reviews.map((review) => (
                      <div key={review.id} className="rounded-2xl border border-gray-100 p-4">
                        <div className="flex items-start gap-3">
                          {review.rater.avatar ? (
                            <img
                              src={review.rater.avatar}
                              alt={review.rater.name ?? "User"}
                              className="w-9 h-9 rounded-full object-cover shrink-0 border border-gray-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-gray-400 text-sm font-semibold">
                              {(review.rater.name ?? review.rater.email)[0].toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span className="text-sm font-medium text-gray-900">
                                {review.rater.name ?? review.rater.email}
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(review.createdAt).toLocaleDateString("en-US", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                            <StarRating value={review.rating} />
                            {review.product && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                Re:{" "}
                                <Link href={`/product/${review.product.id}`} className="hover:underline text-indigo-600">
                                  {review.product.name}
                                </Link>
                              </p>
                            )}
                            {review.comment && (
                              <p className="text-sm text-gray-700 mt-1.5 leading-relaxed">{review.comment}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </div>

      <Footer />
    </main>
  )
}
