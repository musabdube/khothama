"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Eye,
  Flag,
  PlusSquare,
  Shapes,
  ShoppingCart,
  ShieldAlert,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
  XCircle,
} from "lucide-react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import AdminSidebar from "@/components/admin/AdminSidebar"
import { formatCategoryPath } from "@/lib/categories"

type ProductApprovalRow = {
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
  reason: string
  status: "PENDING" | "REVIEWED" | "DISMISSED"
  createdAt: string
  product: {
    id: string
    name: string
    sku: string
    category?: {
      id: string
      name: string
      slug: string
      parentId: string | null
      parent?: {
        id: string
        name: string
        slug: string
        parentId: string | null
      } | null
    } | null
  }
}

type ReportSeverity = "LOW" | "MEDIUM" | "HIGH"
type DateRangeFilter = "ALL" | "LAST_7_DAYS" | "LAST_30_DAYS" | "LAST_90_DAYS"

type AnalyticsOverview = {
  totalViews: number
  totalUnitsSold: number
  totalRevenue: number
}

type AnalyticsTopProduct = {
  id: string
  name: string
  views: number
  unitsSold: number
  revenue: number
  categoryName: string
}

type AnalyticsCategory = {
  id: string | null
  name: string
  views: number
  unitsSold: number
  revenue: number
  productCount: number
}

type AnalyticsPayload = {
  overview: AnalyticsOverview
  topProducts: AnalyticsTopProduct[]
  popularCategories: AnalyticsCategory[]
}

type ReportFilterState = {
  category: string
  severity: "ALL" | ReportSeverity
  dateRange: DateRangeFilter
}

const initialReportFilters: ReportFilterState = {
  category: "ALL",
  severity: "ALL",
  dateRange: "ALL",
}

const initialAnalyticsOverview: AnalyticsOverview = {
  totalViews: 0,
  totalUnitsSold: 0,
  totalRevenue: 0,
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function getSeverityFromReason(reason: string): ReportSeverity {
  const normalized = reason.toLowerCase()

  if (/fraud|scam|prohibited|illegal|counterfeit|dangerous/.test(normalized)) {
    return "HIGH"
  }

  if (/offensive|misleading|harassment|hate|abuse|violence/.test(normalized)) {
    return "MEDIUM"
  }

  return "LOW"
}

function isInDateRange(createdAt: string, range: DateRangeFilter) {
  if (range === "ALL") return true

  const createdAtTime = new Date(createdAt).getTime()
  if (!Number.isFinite(createdAtTime)) return false

  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000

  if (range === "LAST_7_DAYS") return now - createdAtTime <= 7 * dayMs
  if (range === "LAST_30_DAYS") return now - createdAtTime <= 30 * dayMs
  if (range === "LAST_90_DAYS") return now - createdAtTime <= 90 * dayMs

  return true
}

export default function AdminDashboardPage() {
  const { data: session, status: sessionStatus } = useSession()
  const [mounted, setMounted] = useState(false)
  const [products, setProducts] = useState<ProductApprovalRow[]>([])
  const [reports, setReports] = useState<ReportRow[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  const [isLoadingReports, setIsLoadingReports] = useState(true)
  const [isSaving, setIsSaving] = useState<string | null>(null)
  const [isDeletingProduct, setIsDeletingProduct] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [draftFilters, setDraftFilters] = useState<ReportFilterState>(initialReportFilters)
  const [appliedFilters, setAppliedFilters] = useState<ReportFilterState>(initialReportFilters)
  const [analyticsOverview, setAnalyticsOverview] = useState<AnalyticsOverview>(initialAnalyticsOverview)
  const [topProductsAnalytics, setTopProductsAnalytics] = useState<AnalyticsTopProduct[]>([])
  const [popularCategoriesAnalytics, setPopularCategoriesAnalytics] = useState<AnalyticsCategory[]>([])
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true)

  // Mark as mounted to avoid hydration mismatches with Date.now()
  useEffect(() => {
    setMounted(true)
  }, [])

  const pendingRequests = useMemo(
    () => products.filter((product) => product.pendingPublish && product.approvalStatus === "PENDING"),
    [products]
  )

  const reportSummary = useMemo(() => {
    const pendingReports = reports.filter((report) => report.status === "PENDING")
    const reviewedReports = reports.filter((report) => report.status === "REVIEWED")
    const dismissedReports = reports.filter((report) => report.status === "DISMISSED")
    const flaggedListings = new Set(pendingReports.map((report) => report.product.id)).size

    return {
      pending: pendingReports.length,
      reviewed: reviewedReports.length,
      dismissed: dismissedReports.length,
      flaggedListings,
    }
  }, [reports])

  const categoryOptions = useMemo(() => {
    const categories = reports
      .map((report) => formatCategoryPath(report.product.category) || "Uncategorized")
      .filter(Boolean)

    return Array.from(new Set(categories)).sort((a, b) => a.localeCompare(b))
  }, [reports])

  const filteredReports = useMemo(() => {
    // Only filter with date-based logic after hydration to avoid mismatch
    if (!mounted) {
      return []
    }

    return reports.filter((report) => {
      const categoryName = formatCategoryPath(report.product.category) || "Uncategorized"
      const severity = getSeverityFromReason(report.reason)

      if (appliedFilters.category !== "ALL" && categoryName !== appliedFilters.category) {
        return false
      }

      if (appliedFilters.severity !== "ALL" && severity !== appliedFilters.severity) {
        return false
      }

      if (!isInDateRange(report.createdAt, appliedFilters.dateRange)) {
        return false
      }

      return true
    })
  }, [reports, appliedFilters, mounted])

  const fetchPendingProducts = async () => {
    setIsLoadingProducts(true)
    setError("")

    try {
      const response = await fetch("/api/products")
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to load products")
      }

      const data = await response.json()
      setProducts(data)
    } catch (fetchError: unknown) {
      setError(getErrorMessage(fetchError, "Failed to load products"))
    } finally {
      setIsLoadingProducts(false)
    }
  }

  const fetchReports = async () => {
    setIsLoadingReports(true)
    setError("")

    try {
      const response = await fetch("/api/reports")
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to load reports")
      }

      const data: ReportRow[] = await response.json()
      setReports(data)
    } catch (fetchError: unknown) {
      setError(getErrorMessage(fetchError, "Failed to load reports"))
    } finally {
      setIsLoadingReports(false)
    }
  }

  const fetchAnalytics = async () => {
    setIsLoadingAnalytics(true)

    try {
      const response = await fetch("/api/admin/analytics")
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to load analytics")
      }

      const data: AnalyticsPayload = await response.json()
      setAnalyticsOverview(data.overview || initialAnalyticsOverview)
      setTopProductsAnalytics(data.topProducts || [])
      setPopularCategoriesAnalytics(data.popularCategories || [])
    } catch (analyticsError: unknown) {
      setError((previous) => previous || getErrorMessage(analyticsError, "Failed to load analytics"))
    } finally {
      setIsLoadingAnalytics(false)
    }
  }

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchPendingProducts()
      fetchReports()
      fetchAnalytics()
    }

    if (sessionStatus === "unauthenticated") {
      setIsLoadingProducts(false)
      setIsLoadingReports(false)
      setIsLoadingAnalytics(false)
    }
  }, [sessionStatus])

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
        throw new Error(text || "Failed to update approval")
      }

      await fetchPendingProducts()
    } catch (decisionError: unknown) {
      setError(getErrorMessage(decisionError, "Failed to update approval"))
    } finally {
      setIsSaving(null)
    }
  }

  const handleDeleteProduct = async (id: string, name: string) => {
    const shouldDelete = window.confirm(`Delete product "${name}"? This action cannot be undone.`)
    if (!shouldDelete) return

    setIsDeletingProduct(id)
    setError("")

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to delete product")
      }

      await fetchPendingProducts()
    } catch (deleteError: unknown) {
      setError(getErrorMessage(deleteError, "Failed to delete product"))
    } finally {
      setIsDeletingProduct(null)
    }
  }

  const applyReportFilters = () => {
    setAppliedFilters(draftFilters)
  }

  const severityBadgeClass = (severity: ReportSeverity) => {
    if (severity === "HIGH") return "bg-red-100 text-red-700"
    if (severity === "MEDIUM") return "bg-yellow-100 text-yellow-700"
    return "bg-gray-200 text-gray-700"
  }

  const reportStatusBadgeClass = (status: ReportRow["status"]) => {
    if (status === "REVIEWED") return "bg-green-100 text-green-700"
    if (status === "DISMISSED") return "bg-gray-200 text-gray-700"
    return "bg-yellow-100 text-yellow-700"
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

      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-6">
          <AdminSidebar active="dashboard" />

          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
              <p className="text-gray-600">Monitor reports quickly and approve products before publishing.</p>
            </div>

            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-yellow-700">Pending Reports</span>
                  <AlertTriangle className="w-5 h-5 text-yellow-700" />
                </div>
                <div className="text-2xl font-bold text-yellow-800">{reportSummary.pending}</div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-700">Reviewed</span>
                  <CheckCircle2 className="w-5 h-5 text-green-700" />
                </div>
                <div className="text-2xl font-bold text-green-800">{reportSummary.reviewed}</div>
              </div>

              <div className="bg-gray-100 border border-gray-300 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Dismissed</span>
                  <XCircle className="w-5 h-5 text-gray-700" />
                </div>
                <div className="text-2xl font-bold text-gray-800">{reportSummary.dismissed}</div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-red-700">Flagged Listings</span>
                  <Flag className="w-5 h-5 text-red-700" />
                </div>
                <div className="text-2xl font-bold text-red-800">{reportSummary.flaggedListings}</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-gray-700" />
                <h2 className="text-lg font-semibold">Product Analytics</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-blue-700 font-medium">Total Product Views</span>
                    <Eye className="w-4 h-4 text-blue-700" />
                  </div>
                  <div className="text-2xl font-bold text-blue-800">{analyticsOverview.totalViews}</div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-emerald-700 font-medium">Total Units Sold</span>
                    <ShoppingCart className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div className="text-2xl font-bold text-emerald-800">{analyticsOverview.totalUnitsSold}</div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-purple-700 font-medium">Total Revenue</span>
                    <TrendingUp className="w-4 h-4 text-purple-700" />
                  </div>
                  <div className="text-2xl font-bold text-purple-800">${analyticsOverview.totalRevenue.toFixed(2)}</div>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-sm font-semibold">Top Products</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-left bg-gray-50">
                          <th className="px-4 py-2 font-semibold">Product</th>
                          <th className="px-4 py-2 font-semibold">Views</th>
                          <th className="px-4 py-2 font-semibold">Sold</th>
                          <th className="px-4 py-2 font-semibold">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoadingAnalytics ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-3 text-gray-500">Loading analytics...</td>
                          </tr>
                        ) : topProductsAnalytics.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-3 text-gray-500">No product analytics yet.</td>
                          </tr>
                        ) : (
                          topProductsAnalytics.slice(0, 6).map((product) => (
                            <tr key={product.id} className="border-b border-gray-100 last:border-b-0">
                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-800">{product.name}</div>
                                <div className="text-xs text-gray-500">{product.categoryName}</div>
                              </td>
                              <td className="px-4 py-3">{product.views}</td>
                              <td className="px-4 py-3">{product.unitsSold}</td>
                              <td className="px-4 py-3">${product.revenue.toFixed(2)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-sm font-semibold">Popular Categories</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-left bg-gray-50">
                          <th className="px-4 py-2 font-semibold">Category</th>
                          <th className="px-4 py-2 font-semibold">Views</th>
                          <th className="px-4 py-2 font-semibold">Sold</th>
                          <th className="px-4 py-2 font-semibold">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoadingAnalytics ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-3 text-gray-500">Loading analytics...</td>
                          </tr>
                        ) : popularCategoriesAnalytics.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-3 text-gray-500">No category analytics yet.</td>
                          </tr>
                        ) : (
                          popularCategoriesAnalytics.slice(0, 6).map((category) => (
                            <tr key={category.id || category.name} className="border-b border-gray-100 last:border-b-0">
                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-800">{category.name}</div>
                                <div className="text-xs text-gray-500">Products: {category.productCount}</div>
                              </td>
                              <td className="px-4 py-3">{category.views}</td>
                              <td className="px-4 py-3">{category.unitsSold}</td>
                              <td className="px-4 py-3">${category.revenue.toFixed(2)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <SlidersHorizontal className="w-5 h-5 text-gray-700" />
                <h2 className="text-lg font-semibold">Filter Reports</h2>
              </div>

              <div className="grid md:grid-cols-4 gap-3">
                <select
                  value={draftFilters.category}
                  onChange={(event) =>
                    setDraftFilters((previous) => ({
                      ...previous,
                      category: event.target.value,
                    }))
                  }
                  className="px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black bg-white"
                >
                  <option value="ALL">All Categories</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>

                <select
                  value={draftFilters.severity}
                  onChange={(event) =>
                    setDraftFilters((previous) => ({
                      ...previous,
                      severity: event.target.value as ReportFilterState["severity"],
                    }))
                  }
                  className="px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black bg-white"
                >
                  <option value="ALL">All Severity</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>

                <select
                  value={draftFilters.dateRange}
                  onChange={(event) =>
                    setDraftFilters((previous) => ({
                      ...previous,
                      dateRange: event.target.value as DateRangeFilter,
                    }))
                  }
                  className="px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black bg-white"
                >
                  <option value="ALL">All Dates</option>
                  <option value="LAST_7_DAYS">Last 7 days</option>
                  <option value="LAST_30_DAYS">Last 30 days</option>
                  <option value="LAST_90_DAYS">Last 90 days</option>
                </select>

                <button
                  onClick={applyReportFilters}
                  className="px-4 py-2.5 bg-black text-white rounded-xl hover:bg-gray-800 transition"
                >
                  Apply Filters
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
              <h2 className="text-lg font-semibold mb-4">Quick Shortcuts</h2>
              <div className="grid md:grid-cols-3 gap-3">
                <Link
                  href="/products"
                  className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-300 hover:bg-gray-100 transition"
                >
                  <PlusSquare className="w-5 h-5 text-gray-700" />
                  <span className="font-medium text-gray-800">Add New Listing</span>
                </Link>

                <Link
                  href="/admin/reports?status=PENDING"
                  className="flex items-center gap-2 px-4 py-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 transition"
                >
                  <ShieldAlert className="w-5 h-5 text-red-700" />
                  <span className="font-medium text-red-800">View Flagged Items</span>
                </Link>

                <Link
                  href="/admin/categories"
                  className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-300 hover:bg-gray-100 transition"
                >
                  <Shapes className="w-5 h-5 text-gray-700" />
                  <span className="font-medium text-gray-800">Manage Categories</span>
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold">Filtered Reports</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left bg-gray-50">
                      <th className="p-4 font-semibold">Listing</th>
                      <th className="p-4 font-semibold">Category</th>
                      <th className="p-4 font-semibold">Severity</th>
                      <th className="p-4 font-semibold">Status</th>
                      <th className="p-4 font-semibold">Date</th>
                      <th className="p-4 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingReports ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-gray-500">
                          Loading reports...
                        </td>
                      </tr>
                    ) : filteredReports.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-gray-500">
                          No reports found for the selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredReports.map((report) => {
                        const severity = getSeverityFromReason(report.reason)

                        return (
                          <tr key={report.id} className="border-b border-gray-100 last:border-b-0 align-top">
                            <td className="p-4">
                              <div className="font-semibold">{report.product.name}</div>
                              <div className="text-xs text-gray-500">SKU: {report.product.sku}</div>
                              <div className="text-xs text-gray-600 mt-1">{report.reason}</div>
                            </td>
                            <td className="p-4 text-gray-700">{formatCategoryPath(report.product.category) || "Uncategorized"}</td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${severityBadgeClass(severity)}`}>
                                {severity}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${reportStatusBadgeClass(report.status)}`}>
                                {report.status}
                              </span>
                            </td>
                            <td className="p-4 text-gray-600">{mounted && new Date(report.createdAt).toLocaleDateString()}</td>
                            <td className="p-4">
                              <Link
                                href="/admin/reports"
                                className="inline-flex px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                              >
                                Open
                              </Link>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold">Pending Publish Requests</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left bg-gray-50">
                      <th className="p-4 font-semibold">Product</th>
                      <th className="p-4 font-semibold">Seller</th>
                      <th className="p-4 font-semibold">Price</th>
                      <th className="p-4 font-semibold">Current Status</th>
                      <th className="p-4 font-semibold">Requested At</th>
                      <th className="p-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingProducts ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-gray-500">
                          Loading pending requests...
                        </td>
                      </tr>
                    ) : pendingRequests.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-gray-500">
                          No pending publish requests.
                        </td>
                      </tr>
                    ) : (
                      pendingRequests.map((product) => (
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
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                              {product.status}
                            </span>
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
                                onClick={() => handleDeleteProduct(product.id, product.name)}
                                disabled={isDeletingProduct === product.id}
                                title="Delete product"
                                className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition disabled:opacity-40"
                              >
                                {isDeletingProduct === product.id
                                  ? <span className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                  : <Trash2 className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => handleDecision(product.id, "APPROVED")}
                                disabled={isSaving === product.id || isDeletingProduct === product.id}
                                title="Approve product"
                                className="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-40"
                              >
                                {isSaving === product.id
                                  ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  : <CheckCircle2 className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => handleDecision(product.id, "REJECTED")}
                                disabled={isSaving === product.id || isDeletingProduct === product.id}
                                title="Reject product"
                                className="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-40"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
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
