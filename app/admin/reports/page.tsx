"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import AdminSidebar from "@/components/admin/AdminSidebar"

type ReportRow = {
  id: string
  reason: string
  details: string | null
  status: "PENDING" | "REVIEWED" | "DISMISSED"
  adminNote: string | null
  createdAt: string
  reviewedAt: string | null
  reporter: {
    id: string
    name: string | null
    email: string
  }
  product: {
    id: string
    name: string
    sku: string
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "OUT_OF_STOCK"
    seller?: {
      id: string
      name: string | null
      email: string
    } | null
  }
}

type StatusFilter = "ALL" | "PENDING" | "REVIEWED" | "DISMISSED"

export default function AdminReportsPage() {
  const { data: session, status: sessionStatus } = useSession()
  const [mounted, setMounted] = useState(false)

  const [reports, setReports] = useState<ReportRow[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("PENDING")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState<string | null>(null)
  const [error, setError] = useState("")

  // Mark as mounted to avoid hydration mismatches with Date.now()
  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchReports = async (filter: StatusFilter) => {
    setIsLoading(true)
    setError("")

    try {
      const query = filter === "ALL" ? "" : `?status=${filter}`
      const response = await fetch(`/api/reports${query}`)

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to load reports")
      }

      const data: ReportRow[] = await response.json()
      setReports(data)
    } catch (fetchError: any) {
      setError(fetchError.message || "Failed to load reports")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchReports(statusFilter)
    }

    if (sessionStatus === "unauthenticated") {
      setIsLoading(false)
    }
  }, [sessionStatus, statusFilter])

  const handleDecision = async (id: string, nextStatus: "REVIEWED" | "DISMISSED") => {
    setIsSaving(id)
    setError("")

    try {
      const response = await fetch(`/api/reports/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to update report")
      }

      await fetchReports(statusFilter)
    } catch (decisionError: any) {
      setError(decisionError.message || "Failed to update report")
    } finally {
      setIsSaving(null)
    }
  }

  const counts = useMemo(
    () => ({
      pending: reports.filter((report) => report.status === "PENDING").length,
      reviewed: reports.filter((report) => report.status === "REVIEWED").length,
      dismissed: reports.filter((report) => report.status === "DISMISSED").length,
    }),
    [reports]
  )

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
          <AdminSidebar active="reports" />

          <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Reported Ads Review</h1>
          <p className="text-gray-600">Review user reports and take moderation action.</p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-3 items-center">
          <button
            onClick={() => setStatusFilter("PENDING")}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              statusFilter === "PENDING" ? "bg-black text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            Pending ({counts.pending})
          </button>
          <button
            onClick={() => setStatusFilter("REVIEWED")}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              statusFilter === "REVIEWED" ? "bg-black text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            Reviewed ({counts.reviewed})
          </button>
          <button
            onClick={() => setStatusFilter("DISMISSED")}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              statusFilter === "DISMISSED" ? "bg-black text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            Dismissed ({counts.dismissed})
          </button>
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              statusFilter === "ALL" ? "bg-black text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            All
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left bg-gray-50">
                  <th className="p-4 font-semibold">Product</th>
                  <th className="p-4 font-semibold">Reporter</th>
                  <th className="p-4 font-semibold">Reason</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Created</th>
                  <th className="p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-gray-500">
                      Loading reports...
                    </td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-gray-500">
                      No reports found for this filter.
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => (
                    <tr key={report.id} className="border-b border-gray-100 last:border-b-0 align-top">
                      <td className="p-4">
                        <div className="font-semibold">{report.product.name}</div>
                        <div className="text-xs text-gray-500">SKU: {report.product.sku}</div>
                        <div className="text-xs text-gray-500">Seller: {report.product.seller?.email || "-"}</div>
                        <Link
                          href={`/product/${report.product.id}`}
                          className="inline-block mt-2 text-xs text-blue-700 hover:underline"
                        >
                          Open ad
                        </Link>
                      </td>
                      <td className="p-4">
                        <div>{report.reporter.name || "-"}</div>
                        <div className="text-xs text-gray-500">{report.reporter.email}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{report.reason}</div>
                        {report.details && <div className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{report.details}</div>}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            report.status === "PENDING"
                              ? "bg-yellow-100 text-yellow-700"
                              : report.status === "REVIEWED"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {report.status}
                        </span>
                      </td>
                      <td className="p-4 text-gray-600">{mounted && new Date(report.createdAt).toLocaleDateString()}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleDecision(report.id, "REVIEWED")}
                            disabled={report.status !== "PENDING" || isSaving === report.id}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                          >
                            {isSaving === report.id ? "Saving..." : "Review"}
                          </button>
                          <button
                            onClick={() => handleDecision(report.id, "DISMISSED")}
                            disabled={report.status !== "PENDING" || isSaving === report.id}
                            className="px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50"
                          >
                            Dismiss
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
