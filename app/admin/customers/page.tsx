"use client"

import { Fragment, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import AdminSidebar from "@/components/admin/AdminSidebar"

type CustomerTag = {
  id: string
  name: string
  color: string | null
}

type CustomerRow = {
  id: string
  name: string | null
  email: string
  status: "ACTIVE" | "BANNED" | "PENDING"
  createdAt: string
  tags: CustomerTag[]
  _count: {
    orders: number
    reviews: number
    wishlist: number
    productReports: number
    sellerProducts: number
  }
}

type CustomerHistory = {
  customer: {
    id: string
    name: string | null
    email: string
    createdAt: string
    _count: {
      orders: number
      reviews: number
      wishlist: number
      productReports: number
      sellerProducts: number
    }
  }
  orders: Array<{
    id: string
    orderNumber: string
    status: string
    total: number
    createdAt: string
  }>
  reviews: Array<{
    id: string
    rating: number
    status: string
    createdAt: string
    product: {
      id: string
      name: string
    }
  }>
  wishlist: Array<{
    id: string
    createdAt: string
    product: {
      id: string
      name: string
      price: number
    }
  }>
  reports: Array<{
    id: string
    reason: string
    status: string
    createdAt: string
    product: {
      id: string
      name: string
    }
  }>
}

export default function AdminCustomersPage() {
  const { data: session, status: sessionStatus } = useSession()

  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [searchDraft, setSearchDraft] = useState("")
  const [search, setSearch] = useState("")
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({})
  const [historyByCustomerId, setHistoryByCustomerId] = useState<Record<string, CustomerHistory>>({})
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingStatus, setIsSavingStatus] = useState<string | null>(null)
  const [isSavingTag, setIsSavingTag] = useState<string | null>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState<string | null>(null)
  const [error, setError] = useState("")

  const fetchCustomers = async (query?: string) => {
    setIsLoading(true)
    setError("")

    try {
      const url = query ? `/api/customers?q=${encodeURIComponent(query)}` : "/api/customers"
      const response = await fetch(url)
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to load customers")
      }

      const data: CustomerRow[] = await response.json()
      setCustomers(data)
    } catch (fetchError: unknown) {
      if (fetchError instanceof Error) {
        setError(fetchError.message)
      } else {
        setError("Failed to load customers")
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchCustomers(search)
    }

    if (sessionStatus === "unauthenticated") {
      setIsLoading(false)
    }
  }, [sessionStatus])

  const updateCustomerStatus = async (customerId: string, nextStatus: "ACTIVE" | "BANNED") => {
    setIsSavingStatus(customerId)
    setError("")

    try {
      const response = await fetch(`/api/customers/${customerId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to update customer status")
      }

      await fetchCustomers(search)
    } catch (statusError: unknown) {
      if (statusError instanceof Error) {
        setError(statusError.message)
      } else {
        setError("Failed to update customer status")
      }
    } finally {
      setIsSavingStatus(null)
    }
  }

  const addTag = async (customerId: string) => {
    const tagName = (tagInputs[customerId] || "").trim()
    if (!tagName) return

    setIsSavingTag(customerId)
    setError("")

    try {
      const response = await fetch(`/api/customers/${customerId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagName }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to add tag")
      }

      setTagInputs((previous) => ({ ...previous, [customerId]: "" }))
      await fetchCustomers(search)
    } catch (tagError: unknown) {
      if (tagError instanceof Error) {
        setError(tagError.message)
      } else {
        setError("Failed to add tag")
      }
    } finally {
      setIsSavingTag(null)
    }
  }

  const removeTag = async (customerId: string, tagId: string) => {
    setIsSavingTag(customerId)
    setError("")

    try {
      const response = await fetch(`/api/customers/${customerId}/tags`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to remove tag")
      }

      await fetchCustomers(search)
    } catch (tagError: unknown) {
      if (tagError instanceof Error) {
        setError(tagError.message)
      } else {
        setError("Failed to remove tag")
      }
    } finally {
      setIsSavingTag(null)
    }
  }

  const toggleHistory = async (customerId: string) => {
    if (expandedHistoryId === customerId) {
      setExpandedHistoryId(null)
      return
    }

    setExpandedHistoryId(customerId)

    if (historyByCustomerId[customerId]) {
      return
    }

    setIsLoadingHistory(customerId)
    setError("")

    try {
      const response = await fetch(`/api/customers/${customerId}/history`)
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to load customer history")
      }

      const data: CustomerHistory = await response.json()
      setHistoryByCustomerId((previous) => ({ ...previous, [customerId]: data }))
    } catch (historyError: unknown) {
      if (historyError instanceof Error) {
        setError(historyError.message)
      } else {
        setError("Failed to load customer history")
      }
    } finally {
      setIsLoadingHistory(null)
    }
  }

  if (sessionStatus === "loading") {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col">
        <Header adminDashboardMode />
        <section className="max-w-7xl mx-auto px-6 py-12">Loading...</section>
        <Footer />
      </main>
    )
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col">
        <Header adminDashboardMode />
        <section className="max-w-7xl mx-auto px-6 py-12">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">Please login as admin.</div>
        </section>
        <Footer />
      </main>
    )
  }

  if (session.user.role !== "ADMIN") {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col">
        <Header adminDashboardMode />
        <section className="max-w-7xl mx-auto px-6 py-12">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">Access denied. Admins only.</div>
        </section>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <Header adminDashboardMode />

      <section className="max-w-7xl mx-auto px-6 py-10 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-6">
          <AdminSidebar active="customers" />

          <div>
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Customer Management</h1>
            <p className="text-gray-600">View customers, assign tags, ban/unban, and inspect activity history.</p>
          </div>

          <form
            className="flex w-full md:w-auto gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              setSearch(searchDraft)
              fetchCustomers(searchDraft)
            }}
          >
            <input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search customer name or email"
              className="w-full md:w-80 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
            />
            <button className="px-4 py-2.5 bg-black text-white rounded-xl hover:bg-gray-800 transition">Search</button>
          </form>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left bg-gray-50">
                  <th className="p-4 font-semibold">Customer</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Tags</th>
                  <th className="p-4 font-semibold">History Summary</th>
                  <th className="p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-gray-500">
                      Loading customers...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-gray-500">
                      No customers found.
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => {
                    const history = historyByCustomerId[customer.id]
                    const isHistoryExpanded = expandedHistoryId === customer.id
                    const isThisHistoryLoading = isLoadingHistory === customer.id

                    return (
                      <Fragment key={customer.id}>
                        <tr className="border-b border-gray-100 align-top">
                          <td className="p-4">
                            <div className="font-semibold">{customer.name || "-"}</div>
                            <div className="text-xs text-gray-500">{customer.email}</div>
                            <div className="text-xs text-gray-500">Joined: {new Date(customer.createdAt).toLocaleDateString()}</div>
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                customer.status === "BANNED"
                                  ? "bg-red-100 text-red-700"
                                  : customer.status === "PENDING"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {customer.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-2 mb-2">
                              {customer.tags.length === 0 ? (
                                <span className="text-xs text-gray-500">No tags</span>
                              ) : (
                                customer.tags.map((tag) => (
                                  <button
                                    key={tag.id}
                                    onClick={() => removeTag(customer.id, tag.id)}
                                    disabled={isSavingTag === customer.id}
                                    className="px-2 py-1 rounded-full text-xs border border-gray-300 hover:bg-gray-100 transition disabled:opacity-50"
                                  >
                                    {tag.name} ×
                                  </button>
                                ))
                              )}
                            </div>

                            <div className="flex gap-2">
                              <input
                                value={tagInputs[customer.id] || ""}
                                onChange={(event) =>
                                  setTagInputs((previous) => ({
                                    ...previous,
                                    [customer.id]: event.target.value,
                                  }))
                                }
                                placeholder="Add tag"
                                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                              />
                              <button
                                onClick={() => addTag(customer.id)}
                                disabled={isSavingTag === customer.id}
                                className="px-3 py-1.5 bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
                              >
                                Add
                              </button>
                            </div>
                          </td>
                          <td className="p-4 text-xs text-gray-600">
                            <div>Orders: {customer._count.orders}</div>
                            <div>Reviews: {customer._count.reviews}</div>
                            <div>Wishlist: {customer._count.wishlist}</div>
                            <div>Reports: {customer._count.productReports}</div>
                            <div>Selling: {customer._count.sellerProducts}</div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() =>
                                  updateCustomerStatus(customer.id, customer.status === "BANNED" ? "ACTIVE" : "BANNED")
                                }
                                disabled={isSavingStatus === customer.id}
                                className={`px-3 py-1.5 rounded-lg text-white transition disabled:opacity-50 ${
                                  customer.status === "BANNED" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                                }`}
                              >
                                {isSavingStatus === customer.id
                                  ? "Saving..."
                                  : customer.status === "BANNED"
                                  ? "Unban"
                                  : "Ban"}
                              </button>

                              <button
                                onClick={() => toggleHistory(customer.id)}
                                className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                              >
                                {isHistoryExpanded ? "Hide History" : "View History"}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {isHistoryExpanded && (
                          <tr className="border-b border-gray-100 bg-gray-50">
                            <td colSpan={5} className="p-4">
                              {isThisHistoryLoading ? (
                                <div className="text-sm text-gray-500">Loading history...</div>
                              ) : !history ? (
                                <div className="text-sm text-gray-500">No history loaded.</div>
                              ) : (
                                <div className="grid lg:grid-cols-2 gap-4 text-sm">
                                  <div className="bg-white rounded-xl border border-gray-200 p-3">
                                    <div className="font-semibold mb-2">Recent Orders</div>
                                    {history.orders.length === 0 ? (
                                      <div className="text-gray-500">No orders yet.</div>
                                    ) : (
                                      history.orders.map((order) => (
                                        <div key={order.id} className="py-1 border-b border-gray-100 last:border-b-0">
                                          #{order.orderNumber} • {order.status} • ${order.total.toFixed(2)}
                                        </div>
                                      ))
                                    )}
                                  </div>

                                  <div className="bg-white rounded-xl border border-gray-200 p-3">
                                    <div className="font-semibold mb-2">Recent Reviews</div>
                                    {history.reviews.length === 0 ? (
                                      <div className="text-gray-500">No reviews yet.</div>
                                    ) : (
                                      history.reviews.map((review) => (
                                        <div key={review.id} className="py-1 border-b border-gray-100 last:border-b-0">
                                          {review.product.name} • {review.rating}/5 • {review.status}
                                        </div>
                                      ))
                                    )}
                                  </div>

                                  <div className="bg-white rounded-xl border border-gray-200 p-3">
                                    <div className="font-semibold mb-2">Recent Wishlist Items</div>
                                    {history.wishlist.length === 0 ? (
                                      <div className="text-gray-500">No wishlist items yet.</div>
                                    ) : (
                                      history.wishlist.map((item) => (
                                        <div key={item.id} className="py-1 border-b border-gray-100 last:border-b-0">
                                          {item.product.name} • ${item.product.price.toFixed(2)}
                                        </div>
                                      ))
                                    )}
                                  </div>

                                  <div className="bg-white rounded-xl border border-gray-200 p-3">
                                    <div className="font-semibold mb-2">Recent Reports</div>
                                    {history.reports.length === 0 ? (
                                      <div className="text-gray-500">No reports submitted.</div>
                                    ) : (
                                      history.reports.map((report) => (
                                        <div key={report.id} className="py-1 border-b border-gray-100 last:border-b-0">
                                          {report.product.name} • {report.reason} • {report.status}
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
