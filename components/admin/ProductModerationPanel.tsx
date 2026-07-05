"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { CheckCircle2, Eye, Trash2, XCircle } from "lucide-react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import AdminSidebar, { type AdminSidebarKey } from "@/components/admin/AdminSidebar"

type ProductModerationRow = {
  id: string
  name: string
  sku: string
  price: number
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "OUT_OF_STOCK"
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED"
  pendingPublish: boolean
  updatedAt: string
  seller?: {
    name: string | null
    email: string
  }
}

type ReportRow = {
  id: string
  product: {
    id: string
  }
}

type StatusTab = "DRAFT" | "PUBLISHED" | "ARCHIVED" | "OUT_OF_STOCK" | "FLAGGED"

const statusTabs: Array<{ value: StatusTab; label: string }> = [
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
  { value: "ARCHIVED", label: "Archived" },
  { value: "OUT_OF_STOCK", label: "Out of Stock" },
  { value: "FLAGGED", label: "Flagged" },
]

type ProductModerationPanelProps = {
  activeSidebar: AdminSidebarKey
  title: string
  description: string
}

export default function ProductModerationPanel({
  activeSidebar,
  title,
  description,
}: ProductModerationPanelProps) {
  const { data: session, status: sessionStatus } = useSession()
  const [mounted, setMounted] = useState(false)

  const [activeTab, setActiveTab] = useState<StatusTab>("DRAFT")
  const [products, setProducts] = useState<ProductModerationRow[]>([])
  const [flaggedCountByProduct, setFlaggedCountByProduct] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [error, setError] = useState("")

  // Mark as mounted to avoid hydration mismatches with Date.now()
  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchModerationData = async () => {
    setIsLoading(true)
    setError("")

    try {
      const [productsResponse, reportsResponse] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/reports?status=PENDING"),
      ])

      if (!productsResponse.ok) {
        const text = await productsResponse.text()
        throw new Error(text || "Failed to load products")
      }

      if (!reportsResponse.ok) {
        const text = await reportsResponse.text()
        throw new Error(text || "Failed to load flagged reports")
      }

      const productsData: ProductModerationRow[] = await productsResponse.json()
      const reportsData: ReportRow[] = await reportsResponse.json()

      const flaggedMap = reportsData.reduce<Record<string, number>>((accumulator, report) => {
        const productId = report.product.id
        accumulator[productId] = (accumulator[productId] || 0) + 1
        return accumulator
      }, {})

      setProducts(productsData)
      setFlaggedCountByProduct(flaggedMap)
    } catch (fetchError: unknown) {
      if (fetchError instanceof Error) {
        setError(fetchError.message)
      } else {
        setError("Failed to load moderation data")
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchModerationData()
    }

    if (sessionStatus === "unauthenticated") {
      setIsLoading(false)
    }
  }, [sessionStatus])

  const filteredProducts = useMemo(() => {
    if (activeTab === "FLAGGED") {
      return products.filter((product) => (flaggedCountByProduct[product.id] || 0) > 0)
    }

    return products.filter((product) => product.status === activeTab)
  }, [activeTab, products, flaggedCountByProduct])

  const tabCount = (tab: StatusTab) => {
    if (tab === "FLAGGED") {
      return products.filter((product) => (flaggedCountByProduct[product.id] || 0) > 0).length
    }

    return products.filter((product) => product.status === tab).length
  }

  const handleDecision = async (id: string, decision: "APPROVED" | "REJECTED") => {
    setIsSaving(id)
    setError("")

    try {
      const response = await fetch(`/api/products/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to update moderation status")
      }

      await fetchModerationData()
    } catch (decisionError: unknown) {
      if (decisionError instanceof Error) {
        setError(decisionError.message)
      } else {
        setError("Failed to update moderation status")
      }
    } finally {
      setIsSaving(null)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    const shouldDelete = window.confirm(`Delete product "${name}"? This action cannot be undone.`)
    if (!shouldDelete) return

    setIsDeleting(id)
    setError("")

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to delete product")
      }

      await fetchModerationData()
    } catch (deleteError: unknown) {
      if (deleteError instanceof Error) {
        setError(deleteError.message)
      } else {
        setError("Failed to delete product")
      }
    } finally {
      setIsDeleting(null)
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
          <AdminSidebar active={activeSidebar} />

          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">{title}</h1>
              <p className="text-gray-600">{description}</p>
            </div>

            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-3 items-center">
              {statusTabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm ${
                    activeTab === tab.value ? "bg-black text-white" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {tab.label} ({tabCount(tab.value)})
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left bg-gray-50">
                      <th className="p-4 font-semibold">Product</th>
                      <th className="p-4 font-semibold">Seller</th>
                      <th className="p-4 font-semibold">Price</th>
                      <th className="p-4 font-semibold">Approval</th>
                      <th className="p-4 font-semibold">Flagged</th>
                      <th className="p-4 font-semibold">Updated</th>
                      <th className="p-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-gray-500">
                          Loading moderation data...
                        </td>
                      </tr>
                    ) : filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-gray-500">
                          No products found in this tab.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((product) => {
                        const flaggedCount = flaggedCountByProduct[product.id] || 0

                        return (
                          <tr key={product.id} className="border-b border-gray-100 last:border-b-0 align-top">
                            <td className="p-4">
                              <div className="font-semibold">{product.name}</div>
                              <div className="text-xs text-gray-500">SKU: {product.sku}</div>
                              <div className="text-xs text-gray-500">ID: {product.id}</div>
                            </td>
                            <td className="p-4">
                              <div>{product.seller?.name || "-"}</div>
                              <div className="text-xs text-gray-500">{product.seller?.email || "-"}</div>
                            </td>
                            <td className="p-4">${product.price.toFixed(2)}</td>
                            <td className="p-4">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  product.approvalStatus === "APPROVED"
                                    ? "bg-green-100 text-green-700"
                                    : product.approvalStatus === "REJECTED"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                {product.approvalStatus}
                              </span>
                            </td>
                            <td className="p-4">
                              {flaggedCount > 0 ? (
                                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                  {flaggedCount} report{flaggedCount > 1 ? "s" : ""}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500">None</span>
                              )}
                            </td>
                            <td className="p-4 text-gray-600">{mounted && new Date(product.updatedAt).toLocaleDateString()}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-1">
                                <Link
                                  href={`/product/${product.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="View product"
                                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
                                >
                                  <Eye className="w-4 h-4" />
                                </Link>
                                <button
                                  onClick={() => handleDelete(product.id, product.name)}
                                  disabled={isDeleting === product.id}
                                  title="Delete product"
                                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition disabled:opacity-40"
                                >
                                  {isDeleting === product.id
                                    ? <span className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                    : <Trash2 className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => handleDecision(product.id, "APPROVED")}
                                  disabled={isSaving === product.id || isDeleting === product.id || product.approvalStatus === "APPROVED"}
                                  title="Approve product"
                                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-40"
                                >
                                  {isSaving === product.id
                                    ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    : <CheckCircle2 className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => handleDecision(product.id, "REJECTED")}
                                  disabled={isSaving === product.id || isDeleting === product.id || product.approvalStatus === "REJECTED"}
                                  title="Reject product"
                                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-40"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
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
