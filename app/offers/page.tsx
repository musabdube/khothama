"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import RatingModal from "@/components/RatingModal"

type OfferStatus = "PENDING" | "ACCEPTED" | "REJECTED"

type OfferRow = {
  id: string
  offeredPrice: number
  note: string | null
  status: OfferStatus
  sellerNote: string | null
  createdAt: string
  updatedAt: string
  respondedAt: string | null
  hasRated: boolean
  product: {
    id: string
    name: string
    price: number
    imageUrl: string | null
    badges: string[]
  }
  seller: {
    id: string
    name: string | null
    email: string
  }
}

function statusBadgeClass(status: OfferStatus) {
  if (status === "ACCEPTED") return "bg-emerald-100 text-emerald-700"
  if (status === "REJECTED") return "bg-red-100 text-red-700"
  return "bg-amber-100 text-amber-700"
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value)
}

export default function OffersPage() {
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const [offers, setOffers] = useState<OfferRow[]>([])
  const [searchDraft, setSearchDraft] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"ALL" | OfferStatus>("ALL")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [messagingOfferId, setMessagingOfferId] = useState<string | null>(null)
  const [ratingOfferId, setRatingOfferId] = useState<string | null>(null)

  const stats = useMemo(() => {
    return {
      total: offers.length,
      pending: offers.filter((offer) => offer.status === "PENDING").length,
      accepted: offers.filter((offer) => offer.status === "ACCEPTED").length,
      rejected: offers.filter((offer) => offer.status === "REJECTED").length,
    }
  }, [offers])

  const filteredOffers = useMemo(() => {
    if (statusFilter === "ALL") return offers
    return offers.filter((offer) => offer.status === statusFilter)
  }, [offers, statusFilter])

  const fetchOffers = async (query?: string) => {
    setIsLoading(true)
    setError("")

    try {
      const url = query ? `/api/offers?q=${encodeURIComponent(query)}` : "/api/offers"
      const response = await fetch(url)
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to load offers")
      }

      const data: OfferRow[] = await response.json()
      setOffers(data)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load offers")
    } finally {
      setIsLoading(false)
    }
  }

  const handleMessageSeller = async (offer: OfferRow) => {
    setMessagingOfferId(offer.id)
    setError("")

    try {
      const response = await fetch("/api/messages/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: offer.product.id,
          content: `Hi, I'm following up on my offer of ${formatCurrency(offer.offeredPrice)} for ${offer.product.name}.`,
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to start conversation")
      }

      const data: { conversationId: string } = await response.json()
      router.push(`/messages/${data.conversationId}`)
    } catch (messageError) {
      setError(messageError instanceof Error ? messageError.message : "Failed to message seller")
    } finally {
      setMessagingOfferId(null)
    }
  }

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      void fetchOffers(search)
      return
    }

    if (sessionStatus === "unauthenticated") {
      setIsLoading(false)
    }
  }, [search, sessionStatus])

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
          <div className="bg-white rounded-2xl border border-gray-200 p-6">Please login to view your offers.</div>
        </section>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <section className="max-w-7xl mx-auto w-full px-6 py-10 flex-1">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Offers</h1>
            <p className="text-gray-600">Track every offer you have sent across all products in one place.</p>
          </div>

          <form
            className="flex w-full md:w-auto gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              setSearch(searchDraft)
            }}
          >
            <input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search product or seller"
              className="w-full md:w-80 px-4 py-2.5 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
            />
            <button className="px-4 py-2.5 bg-black text-white rounded-xl hover:bg-gray-800 transition">Search</button>
          </form>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-gray-600">Total Offers</div>
            <div className="mt-3 text-3xl font-semibold text-gray-950">{stats.total}</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-gray-600">Pending</div>
            <div className="mt-3 text-3xl font-semibold text-amber-700">{stats.pending}</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-gray-600">Accepted</div>
            <div className="mt-3 text-3xl font-semibold text-emerald-700">{stats.accepted}</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-gray-600">Rejected</div>
            <div className="mt-3 text-3xl font-semibold text-red-700">{stats.rejected}</div>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {[
            { label: "All", value: "ALL" as const },
            { label: "Pending", value: "PENDING" as const },
            { label: "Accepted", value: "ACCEPTED" as const },
            { label: "Rejected", value: "REJECTED" as const },
          ].map((filterOption) => {
            const isActive = statusFilter === filterOption.value

            return (
              <button
                key={filterOption.value}
                type="button"
                onClick={() => setStatusFilter(filterOption.value)}
                className={`rounded-full px-4 py-2 text-sm font-medium border transition ${
                  isActive
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {filterOption.label}
              </button>
            )
          })}
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-6 text-sm text-gray-500">Loading offers...</div>
          ) : filteredOffers.length === 0 ? (
            <div className="p-8 text-center">
              <h2 className="font-semibold text-gray-900">No offers found</h2>
              <p className="mt-2 text-sm text-gray-500">Your offers will appear here after you send them on product pages.</p>
              <Link href="/products" className="mt-4 inline-flex items-center rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition">
                Browse products
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredOffers.map((offer) => (
                <div key={offer.id} className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex gap-4 min-w-0">
                      <Link href={`/product/${offer.product.id}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
                        {offer.product.imageUrl ? (
                          <img src={offer.product.imageUrl} alt={offer.product.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-500">
                            {offer.product.name.charAt(0).toUpperCase()}
                          </div>
                        )}

                        {offer.product.badges.length > 0 && (
                          <div className="absolute inset-x-1 top-1 flex flex-wrap gap-1 pointer-events-none">
                            {offer.product.badges.slice(0, 3).map((badge) => (
                              <span
                                key={badge}
                                className="inline-flex items-center rounded-full bg-white/90 border border-gray-200 px-1.5 py-0.5 text-[9px] font-semibold text-gray-700"
                              >
                                {badge}
                              </span>
                            ))}
                          </div>
                        )}
                      </Link>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/product/${offer.product.id}`} className="font-semibold text-gray-950 hover:text-black truncate">
                            {offer.product.name}
                          </Link>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusBadgeClass(offer.status)}`}>
                            {offer.status}
                          </span>
                        </div>

                        <div className="mt-1 text-sm text-gray-700">
                          Seller: {offer.seller.name || offer.seller.email}
                        </div>
                        <div className="mt-1 text-sm font-medium text-gray-900">
                          Product price {formatCurrency(offer.product.price)} · Your offer {formatCurrency(offer.offeredPrice)}
                        </div>
                        <div className="mt-1 text-xs text-gray-600">
                          Sent {new Date(offer.createdAt).toLocaleString()}
                          {offer.respondedAt ? ` · Responded ${new Date(offer.respondedAt).toLocaleString()}` : ""}
                        </div>

                        {offer.note && <div className="mt-3 text-sm text-gray-700">Your note: {offer.note}</div>}
                        {offer.sellerNote && (
                          <div className="mt-2 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-700">
                            Seller note: {offer.sellerNote}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {offer.status === "ACCEPTED" && !offer.hasRated && (
                        <button
                          type="button"
                          onClick={() => setRatingOfferId(offer.id)}
                          className="inline-flex items-center rounded-xl border border-amber-400 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 transition"
                        >
                          Rate seller
                        </button>
                      )}
                      {offer.status === "ACCEPTED" && offer.hasRated && (
                        <span className="inline-flex items-center rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-500">
                          Rated ✓
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleMessageSeller(offer)}
                        disabled={messagingOfferId === offer.id}
                        className="inline-flex items-center rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition disabled:opacity-60"
                      >
                        {messagingOfferId === offer.id ? "Opening chat..." : "Message seller"}
                      </button>
                      <Link href={`/product/${offer.product.id}`} className="inline-flex items-center rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                        View product
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />

      {ratingOfferId && (() => {
        const offer = offers.find((o) => o.id === ratingOfferId)
        if (!offer) return null
        return (
          <RatingModal
            offerId={offer.id}
            sellerName={offer.seller.name || offer.seller.email}
            onSuccess={() => {
              setRatingOfferId(null)
              void fetchOffers(search)
            }}
            onClose={() => setRatingOfferId(null)}
          />
        )
      })()}
    </main>
  )
}