"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Archive, Box, Check, ChevronRight, MessageCircle, Package, ShoppingBag, Store, X } from "lucide-react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"

type ShopData = {
  stats: {
    totalProducts: number
    publishedProducts: number
    draftProducts: number
    totalOrders: number
    pendingOrders: number
    pendingOffers: number
    totalRevenue: number
  }
  recentProducts: Array<{
    id: string
    name: string
    price: number
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "OUT_OF_STOCK"
    popularity: number
    updatedAt: string
    imageUrl: string | null
  }>
  recentOrders: Array<{
    id: string
    orderNumber: string
    createdAt: string
    sellerTotal: number
    customer: {
      id: string
      name: string | null
      email: string
    }
    items: Array<{
      id: string
      quantity: number
      status: "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED"
      total: number
      product: {
        id: string
        name: string
      }
    }>
  }>
  recentOffers: Array<{
    id: string
    productId: string
    offeredPrice: number
    note: string | null
    status: "PENDING" | "ACCEPTED" | "REJECTED"
    createdAt: string
    respondedAt: string | null
    buyer: {
      id: string
      name: string | null
      email: string
    }
    product: {
      id: string
      name: string
    }
  }>
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value)
}

function statusBadgeClass(status: ShopData["recentOrders"][number]["items"][number]["status"]) {
  if (status === "DELIVERED") return "bg-emerald-100 text-emerald-700"
  if (status === "SHIPPED") return "bg-blue-100 text-blue-700"
  if (status === "PROCESSING" || status === "CONFIRMED") return "bg-indigo-100 text-indigo-700"
  if (status === "CANCELLED" || status === "REFUNDED") return "bg-red-100 text-red-700"
  return "bg-amber-100 text-amber-700"
}

function productStatusClass(status: ShopData["recentProducts"][number]["status"]) {
  if (status === "PUBLISHED") return "bg-emerald-100 text-emerald-700"
  if (status === "OUT_OF_STOCK") return "bg-orange-100 text-orange-700"
  if (status === "ARCHIVED") return "bg-gray-200 text-gray-700"
  return "bg-slate-100 text-slate-700"
}

export default function MyShopPage() {
  const { data: session, status: sessionStatus } = useSession()
  const [shopData, setShopData] = useState<ShopData | null>(null)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [offerActionId, setOfferActionId] = useState<string | null>(null)
  const [offersMessage, setOffersMessage] = useState("")

  const loadShop = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true)
    }
    setError("")

    try {
      const response = await fetch("/api/my-shop", { cache: "no-store" })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to load shop")
      }

      const payload: ShopData = await response.json()
      setShopData(payload)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load shop")
    } finally {
      if (showLoading) {
        setIsLoading(false)
      }
    }
  }, [])

  const handleOfferDecision = async (offerId: string, productId: string, decision: "ACCEPTED" | "REJECTED") => {
    setOfferActionId(offerId)
    setOffersMessage("")

    try {
      const response = await fetch(`/api/products/${productId}/offers/${offerId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          decision,
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to update offer")
      }

      setOffersMessage(decision === "ACCEPTED" ? "Offer accepted." : "Offer rejected.")
      await loadShop(false)
    } catch (decisionError) {
      setOffersMessage(decisionError instanceof Error ? decisionError.message : "Failed to update offer")
    } finally {
      setOfferActionId(null)
    }
  }

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      void loadShop()
      return
    }

    if (sessionStatus === "unauthenticated") {
      setIsLoading(false)
    }
  }, [loadShop, sessionStatus])

  if (sessionStatus === "loading") {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <section className="max-w-7xl mx-auto w-full px-6 py-12">Loading...</section>
        <Footer />
      </main>
    )
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <section className="max-w-7xl mx-auto w-full px-6 py-12">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">Please login to open your shop.</div>
        </section>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <section className="max-w-7xl mx-auto w-full px-6 py-8 flex-1">
        <div className="mb-6 rounded-[28px] border border-sky-100 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(239,246,255,0.96))] p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-sky-700 border border-sky-100 mb-3">
                <Store className="h-3.5 w-3.5" />
                Seller Workspace
              </div>
              <h1 className="text-3xl font-semibold text-gray-950">My Shop</h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-700">
                Track your products, latest customer orders, offers and shop activity from one place.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/myproducts" className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition">
                <Package className="h-4 w-4" />
                Manage Products
              </Link>
              <Link href="/messages" className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                <MessageCircle className="h-4 w-4" />
                Open Messages
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-gray-600">Products</div>
            <div className="mt-3 text-3xl font-semibold text-gray-950">{shopData?.stats.totalProducts ?? 0}</div>
            <div className="mt-2 text-sm text-gray-700">{shopData?.stats.publishedProducts ?? 0} live, {shopData?.stats.draftProducts ?? 0} drafts</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-gray-600">Orders</div>
            <div className="mt-3 text-3xl font-semibold text-gray-950">{shopData?.stats.totalOrders ?? 0}</div>
            <div className="mt-2 text-sm text-gray-700">{shopData?.stats.pendingOrders ?? 0} active orders to monitor</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-gray-600">Revenue</div>
            <div className="mt-3 text-3xl font-semibold text-gray-950">{formatCurrency(shopData?.stats.totalRevenue ?? 0)}</div>
            <div className="mt-2 text-sm text-gray-700">Based on your non-cancelled order items</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-gray-600">Pending Offers</div>
            <div className="mt-3 text-3xl font-semibold text-gray-950">{shopData?.stats.pendingOffers ?? 0}</div>
            <div className="mt-2 text-sm text-gray-700">Offers waiting for your response</div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h2 className="font-semibold text-gray-950">Recent Products</h2>
                <p className="text-sm text-gray-700">Your latest inventory updates</p>
              </div>
              <Link href="/myproducts" className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-black">
                View all
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {isLoading ? (
              <div className="p-5 text-sm text-gray-700">Loading products...</div>
            ) : !shopData || shopData.recentProducts.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                  <Archive className="h-5 w-5" />
                </div>
                <h3 className="font-medium text-gray-900">No products yet</h3>
                <p className="mt-1 text-sm text-gray-600">Create your first product to start selling.</p>
                <Link href="/create-product" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition">
                  <Package className="h-4 w-4" />
                  Add Product
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {shopData.recentProducts.map((product) => (
                  <div key={product.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-600">
                          {product.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-medium text-gray-950">{product.name}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${productStatusClass(product.status)}`}>
                          {product.status.replaceAll("_", " ")}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-gray-700">
                        {formatCurrency(product.price)} · {product.popularity} views · Updated {new Date(product.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h2 className="font-semibold text-gray-950">Recent Shop Orders</h2>
                <p className="text-sm text-gray-700">Orders that include your products</p>
              </div>
              <Link href="/orders" className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-black">
                Personal orders
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {isLoading ? (
              <div className="p-5 text-sm text-gray-700">Loading orders...</div>
            ) : !shopData || shopData.recentOrders.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <h3 className="font-medium text-gray-900">No shop orders yet</h3>
                <p className="mt-1 text-sm text-gray-600">Customer orders will show up here once your products are purchased.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {shopData.recentOrders.map((order) => (
                  <div key={order.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-gray-950">{order.orderNumber}</h3>
                        </div>
                        <div className="mt-1 text-sm text-gray-700">
                          {order.customer.name || order.customer.email} · {new Date(order.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-950">{formatCurrency(order.sellerTotal)}</div>
                        <div className="text-xs text-gray-600">Your share</div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                          <span>{item.product.name} x{item.quantity}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadgeClass(item.status)}`}>
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div>
              <h2 className="font-semibold text-gray-950">Offers</h2>
              <p className="text-sm text-gray-700">Review and decide buyer offers</p>
            </div>
            <Link href="/myproducts" className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-black">
              Manage all
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {offersMessage && (
            <div className="mx-5 mt-4 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
              {offersMessage}
            </div>
          )}

          {isLoading ? (
            <div className="p-5 text-sm text-gray-700">Loading offers...</div>
          ) : !shopData || shopData.recentOffers.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">No offers yet.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {shopData.recentOffers.map((offer) => (
                <div key={offer.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-gray-950">{offer.product.name}</h3>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            offer.status === "ACCEPTED"
                              ? "bg-emerald-100 text-emerald-700"
                              : offer.status === "REJECTED"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {offer.status}
                        </span>
                      </div>

                      <div className="mt-1 text-sm text-gray-500">
                        {offer.buyer.name || offer.buyer.email} · {new Date(offer.createdAt).toLocaleString()}
                      </div>

                      {offer.note && <div className="mt-2 text-sm text-gray-700">“{offer.note}”</div>}
                    </div>

                    <div className="text-right">
                      <div className="text-base font-semibold text-gray-950">{formatCurrency(offer.offeredPrice)}</div>
                      <div className="text-xs text-gray-500">Offer amount</div>
                    </div>
                  </div>

                  {offer.status === "PENDING" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => handleOfferDecision(offer.id, offer.productId, "ACCEPTED")}
                        disabled={offerActionId === offer.id}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" />
                        {offerActionId === offer.id ? "Saving..." : "Approve"}
                      </button>
                      <button
                        onClick={() => handleOfferDecision(offer.id, offer.productId, "REJECTED")}
                        disabled={offerActionId === offer.id}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 transition disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 text-xs text-gray-500">
                      {offer.respondedAt
                        ? `Responded on ${new Date(offer.respondedAt).toLocaleString()}`
                        : "Offer decision saved"}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Link href="/myproducts" className="rounded-2xl border border-gray-200 bg-white p-5 hover:border-gray-300 hover:shadow-sm transition">
            <div className="flex items-center justify-between">
              <Package className="h-5 w-5 text-gray-700" />
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
            <h3 className="mt-4 font-semibold text-gray-950">Products</h3>
            <p className="mt-1 text-sm text-gray-500">Create, edit, boost and manage stock.</p>
          </Link>
          <Link href="/messages" className="rounded-2xl border border-gray-200 bg-white p-5 hover:border-gray-300 hover:shadow-sm transition">
            <div className="flex items-center justify-between">
              <MessageCircle className="h-5 w-5 text-gray-700" />
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
            <h3 className="mt-4 font-semibold text-gray-950">Messages</h3>
            <p className="mt-1 text-sm text-gray-500">Reply to buyers and keep conversations moving.</p>
          </Link>
          <Link href="/orders" className="rounded-2xl border border-gray-200 bg-white p-5 hover:border-gray-300 hover:shadow-sm transition">
            <div className="flex items-center justify-between">
              <Box className="h-5 w-5 text-gray-700" />
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
            <h3 className="mt-4 font-semibold text-gray-950">Orders</h3>
            <p className="mt-1 text-sm text-gray-500">Open the full orders page for your own purchases.</p>
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  )
}