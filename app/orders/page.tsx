"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"

type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED"

type OrderRow = {
  id: string
  orderNumber: string
  status: OrderStatus
  total: number
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
  }
  items: Array<{
    id: string
    quantity: number
    status: OrderStatus
    trackingNumber: string | null
    estimatedDelivery: string | null
    product: {
      id: string
      name: string
      sellerId: string | null
    }
  }>
}

const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
]

export default function OrdersPage() {
  const { data: session, status: sessionStatus } = useSession()
  const searchParams = useSearchParams()
  const queryFromUrl = (searchParams.get("q") ?? "").trim()

  const [orders, setOrders] = useState<OrderRow[]>([])
  const [searchDraft, setSearchDraft] = useState("")
  const [search, setSearch] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [pendingStatusById, setPendingStatusById] = useState<Record<string, OrderStatus>>({})
  const [pendingTrackingById, setPendingTrackingById] = useState<Record<string, string>>({})
  const [pendingEstimatedDeliveryById, setPendingEstimatedDeliveryById] = useState<Record<string, string>>({})
  const [savingItemId, setSavingItemId] = useState<string | null>(null)

  const fetchOrders = async (query?: string) => {
    setIsLoading(true)
    setError("")

    try {
      const url = query ? `/api/orders?q=${encodeURIComponent(query)}` : "/api/orders"
      const response = await fetch(url)
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to load orders")
      }

      const data: OrderRow[] = await response.json()
      setOrders(data)

      setPendingStatusById((previous) => {
        const next = { ...previous }
        for (const order of data) {
          for (const item of order.items) {
            if (!next[item.id]) {
              next[item.id] = item.status
            }
          }
        }
        return next
      })

      setPendingTrackingById((previous) => {
        const next = { ...previous }
        for (const order of data) {
          for (const item of order.items) {
            if (next[item.id] === undefined) {
              next[item.id] = item.trackingNumber || ""
            }
          }
        }
        return next
      })

      setPendingEstimatedDeliveryById((previous) => {
        const next = { ...previous }
        for (const order of data) {
          for (const item of order.items) {
            if (next[item.id] === undefined) {
              next[item.id] = item.estimatedDelivery ? item.estimatedDelivery.slice(0, 10) : ""
            }
          }
        }
        return next
      })
    } catch (fetchError: any) {
      setError(fetchError.message || "Failed to load orders")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      setSearchDraft(queryFromUrl)
      setSearch(queryFromUrl)
      void fetchOrders(queryFromUrl)
    }

    if (sessionStatus === "unauthenticated") {
      setIsLoading(false)
    }
  }, [sessionStatus, queryFromUrl])

  const updateOrderItem = async (orderId: string, itemId: string) => {
    setSavingItemId(itemId)
    setError("")

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId,
          status: pendingStatusById[itemId],
          trackingNumber: pendingTrackingById[itemId] || null,
          estimatedDelivery: pendingEstimatedDeliveryById[itemId] || null,
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to update order")
      }

      await fetchOrders(search)
    } catch (updateError: any) {
      setError(updateError.message || "Failed to update order")
    } finally {
      setSavingItemId(null)
    }
  }

  const statusBadgeClass = (statusValue: OrderStatus) => {
    if (statusValue === "DELIVERED") return "bg-emerald-100 text-emerald-700"
    if (statusValue === "SHIPPED") return "bg-blue-100 text-blue-700"
    if (statusValue === "PROCESSING" || statusValue === "CONFIRMED") return "bg-indigo-100 text-indigo-700"
    if (statusValue === "CANCELLED" || statusValue === "REFUNDED") return "bg-red-100 text-red-700"
    return "bg-yellow-100 text-yellow-700"
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
          <div className="bg-white rounded-2xl p-6 border border-gray-200">Please login to view orders.</div>
        </section>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Orders</h1>
            <p className="text-gray-700">
              Order list with ID number, customer, product, total, status, date and delivery actions.
            </p>
          </div>

          <form
            className="flex w-full md:w-auto gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              setSearch(searchDraft)
              fetchOrders(searchDraft)
            }}
          >
            <input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search by order ID"
              className="w-full md:w-80 px-4 py-2.5 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
            />
            <button className="px-4 py-2.5 bg-black text-white rounded-xl hover:bg-gray-800 transition">
              Search
            </button>
          </form>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left bg-gray-50">
                  <th className="p-4 font-semibold">ID Number</th>
                  <th className="p-4 font-semibold">Customer</th>
                  <th className="p-4 font-semibold">Items</th>
                  <th className="p-4 font-semibold">Total</th>
                  <th className="p-4 font-semibold">Date</th>
                  <th className="p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-gray-700 font-medium">
                      Loading orders...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-gray-700">
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    return (
                      <tr key={order.id} className="border-b border-gray-100 last:border-b-0 align-top">
                        <td className="p-4">
                          <div className="font-semibold text-gray-900">{order.orderNumber}</div>
                          <div className="text-xs text-gray-600">{order.id}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-gray-900">{order.user.name || "-"}</div>
                          <div className="text-xs text-gray-600">{order.user.email}</div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-2 min-w-52">
                            {order.items.map((item) => (
                              <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2">
                                <div className="min-w-0">
                                  <div className="truncate font-medium text-gray-900">{item.product.name}</div>
                                  <div className="text-xs text-gray-600">Qty {item.quantity}</div>
                                  {(item.trackingNumber || item.estimatedDelivery) && (
                                    <div className="mt-1 text-xs text-gray-600">
                                      {item.trackingNumber ? `Tracking: ${item.trackingNumber}` : ""}
                                      {item.trackingNumber && item.estimatedDelivery ? " · " : ""}
                                      {item.estimatedDelivery
                                        ? `ETA: ${new Date(item.estimatedDelivery).toLocaleDateString()}`
                                        : ""}
                                    </div>
                                  )}
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadgeClass(item.status)}`}>
                                  {item.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-gray-900">${order.total.toFixed(2)}</td>
                        <td className="p-4 text-gray-700">{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td className="p-4">
                          {(() => {
                            const ownItems = order.items.filter((item) => item.product.sellerId === session.user.id)

                            return ownItems.length > 0 ? (
                              <div className="space-y-2 min-w-56">
                                {ownItems.map((item) => (
                                  <div key={item.id} className="rounded-xl border border-gray-200 p-3 space-y-2">
                                    <div className="text-sm font-medium text-gray-900">{item.product.name}</div>
                                    <select
                                      value={pendingStatusById[item.id] || item.status}
                                      onChange={(event) =>
                                        setPendingStatusById((previous) => ({
                                          ...previous,
                                          [item.id]: event.target.value as OrderStatus,
                                        }))
                                      }
                                      className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                                    >
                                      {ORDER_STATUSES.map((statusValue) => (
                                        <option key={statusValue} value={statusValue}>
                                          {statusValue}
                                        </option>
                                      ))}
                                    </select>

                                    <input
                                      value={pendingTrackingById[item.id] ?? ""}
                                      onChange={(event) =>
                                        setPendingTrackingById((previous) => ({
                                          ...previous,
                                          [item.id]: event.target.value,
                                        }))
                                      }
                                      placeholder="Tracking number"
                                      className="w-full px-3 py-2 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                                    />

                                    <input
                                      type="date"
                                      value={pendingEstimatedDeliveryById[item.id] ?? ""}
                                      onChange={(event) =>
                                        setPendingEstimatedDeliveryById((previous) => ({
                                          ...previous,
                                          [item.id]: event.target.value,
                                        }))
                                      }
                                      className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                                    />

                                    <button
                                      onClick={() => updateOrderItem(order.id, item.id)}
                                      disabled={savingItemId === item.id}
                                      className="px-3 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
                                    >
                                      {savingItemId === item.id ? "Saving..." : "Update item status"}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-600 text-xs">View only</span>
                            )
                          })()}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
