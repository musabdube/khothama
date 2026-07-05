"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import AdminSidebar from "@/components/admin/AdminSidebar"

type RequestUser = {
  id: string
  name: string | null
  email: string
  image: string | null
}

type ProductRequest = {
  id: string
  name: string
  description: string
  image: string | null
  category: string | null
  budget: string | null
  createdAt: string
  user: RequestUser
}

type AccessGrant = {
  id: string
  expiresAt: string
  grantedAt: string
  user: RequestUser
}

type SearchUser = {
  id: string
  name: string | null
  email: string
}

type AccessRequest = {
  id: string
  status: "PENDING" | "APPROVED" | "REJECTED"
  createdAt: string
  user: RequestUser
}

export default function AdminProductRequestsPage() {
  const { data: session, status } = useSession()
  const [mounted, setMounted] = useState(false)

  const [requests, setRequests] = useState<ProductRequest[]>([])
  const [grants, setGrants] = useState<AccessGrant[]>([])
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([])
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [loadingGrants, setLoadingGrants] = useState(true)
  const [loadingAccessRequests, setLoadingAccessRequests] = useState(true)

  // Mark as mounted to avoid hydration mismatches with Date.now()
  useEffect(() => {
    setMounted(true)
  }, [])

  // Grant form
  const [searchEmail, setSearchEmail] = useState("")
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [durationHours, setDurationHours] = useState("24")
  const [granting, setGranting] = useState(false)
  const [grantError, setGrantError] = useState("")
  const [grantSuccess, setGrantSuccess] = useState("")

  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null)
  const [processingAccessRequestId, setProcessingAccessRequestId] = useState<string | null>(null)

  const isAdmin = session?.user?.role === "ADMIN"

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/product-requests")
      if (res.ok) setRequests(await res.json())
    } catch {
      // ignore
    } finally {
      setLoadingRequests(false)
    }
  }

  const fetchGrants = async () => {
    try {
      const res = await fetch("/api/product-requests/access")
      if (res.ok) setGrants(await res.json())
    } catch {
      // ignore
    } finally {
      setLoadingGrants(false)
    }
  }

  const fetchAccessRequests = async () => {
    try {
      const res = await fetch("/api/product-requests/access-requests")
      if (res.ok) setAccessRequests(await res.json())
    } catch {
      // ignore
    } finally {
      setLoadingAccessRequests(false)
    }
  }

  useEffect(() => {
    if (status === "authenticated" && isAdmin) {
      fetchRequests()
      fetchGrants()
      fetchAccessRequests()
    }
  }, [status, isAdmin])

  const handleSearchUsers = async () => {
    if (!searchEmail.trim()) return
    setSearching(true)
    setSearchResults([])
    try {
      const res = await fetch(`/api/customers?q=${encodeURIComponent(searchEmail.trim())}`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(Array.isArray(data) ? data.slice(0, 10) : [])
      }
    } catch {
      // ignore
    } finally {
      setSearching(false)
    }
  }

  const handleGrantAccess = async () => {
    if (!selectedUserId) {
      setGrantError("Select a user first")
      return
    }
    setGrantError("")
    setGrantSuccess("")
    setGranting(true)

    try {
      const res = await fetch("/api/product-requests/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, durationHours: Number(durationHours) }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setGrantError(data?.error || "Failed to grant access")
        return
      }

      const newGrant = await res.json() as AccessGrant
      // Update the grants list immediately from the response (upsert: replace existing or prepend)
      setGrants((prev) => {
        const idx = prev.findIndex((g) => g.user.id === newGrant.user.id)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = newGrant
          return updated
        }
        return [newGrant, ...prev]
      })
      setGrantSuccess("Access granted successfully!")
      setSearchResults([])
      // Keep selectedUserId + searchEmail so admin can re-grant the same user immediately
    } catch {
      setGrantError("Something went wrong")
    } finally {
      setGranting(false)
    }
  }

  const handleRevoke = async (grantId: string) => {
    if (!window.confirm("Revoke access for this user?")) return
    setRevokingId(grantId)
    try {
      const res = await fetch(`/api/product-requests/access/${grantId}`, { method: "DELETE" })
      if (res.ok) {
        // Pre-fill the grant form with the revoked user so admin can immediately re-grant
        const revokedGrant = grants.find((g) => g.id === grantId)
        if (revokedGrant) {
          setSelectedUserId(revokedGrant.user.id)
          setSearchEmail(revokedGrant.user.email)
          setGrantError("")
          setGrantSuccess("")
        }
        setGrants((prev) => prev.filter((g) => g.id !== grantId))
      }
    } catch {
      // ignore
    } finally {
      setRevokingId(null)
    }
  }

  const handleDeleteRequest = async (requestId: string) => {
    if (!window.confirm("Delete this product request?")) return
    setDeletingRequestId(requestId)
    try {
      const res = await fetch(`/api/product-requests/${requestId}`, { method: "DELETE" })
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId))
      }
    } catch {
      // ignore
    } finally {
      setDeletingRequestId(null)
    }
  }

  const handleAccessRequestAction = async (
    id: string,
    action: "approve" | "reject",
    durationHours = 720
  ) => {
    setProcessingAccessRequestId(id)
    try {
      const res = await fetch(`/api/product-requests/access-requests/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, durationHours }),
      })
      if (res.ok) {
        setAccessRequests((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, status: action === "approve" ? "APPROVED" : "REJECTED" } : r
          )
        )
        if (action === "approve") fetchGrants()
      }
    } catch {
      // ignore
    } finally {
      setProcessingAccessRequestId(null)
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600 font-semibold">Access denied</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header adminDashboardMode />
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-10 flex gap-8">
        <AdminSidebar active="product-requests" />

        <div className="flex-1 space-y-8">
          {/* Pending Access Requests from Users */}
          <section className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-1">
              Access Requests from Users
              {accessRequests.filter((r) => r.status === "PENDING").length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold">
                  {accessRequests.filter((r) => r.status === "PENDING").length}
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Users who requested access to browse the requested products page.
            </p>

            {loadingAccessRequests ? (
              <p className="text-gray-500 text-sm">Loading...</p>
            ) : accessRequests.length === 0 ? (
              <p className="text-gray-500 text-sm">No access requests yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="pb-2 font-medium">User</th>
                      <th className="pb-2 font-medium">Email</th>
                      <th className="pb-2 font-medium">Requested At</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {accessRequests.map((req) => (
                      <tr key={req.id}>
                        <td className="py-3 font-medium">{req.user.name || "—"}</td>
                        <td className="py-3 text-gray-600">{req.user.email}</td>
                        <td className="py-3 text-gray-600">
                          {mounted && new Date(req.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              req.status === "PENDING"
                                ? "bg-yellow-50 text-yellow-700"
                                : req.status === "APPROVED"
                                ? "bg-green-50 text-green-700"
                                : "bg-red-50 text-red-600"
                            }`}
                          >
                            {req.status.charAt(0) + req.status.slice(1).toLowerCase()}
                          </span>
                        </td>
                        <td className="py-3">
                          {req.status === "PENDING" && (
                            <div className="flex gap-3">
                              <button
                                onClick={() =>
                                  void handleAccessRequestAction(req.id, "approve")
                                }
                                disabled={processingAccessRequestId === req.id}
                                className="text-green-600 text-xs font-medium hover:underline disabled:opacity-50"
                              >
                                {processingAccessRequestId === req.id ? "..." : "Approve"}
                              </button>
                              <button
                                onClick={() =>
                                  void handleAccessRequestAction(req.id, "reject")
                                }
                                disabled={processingAccessRequestId === req.id}
                                className="text-red-600 text-xs font-medium hover:underline disabled:opacity-50"
                              >
                                {processingAccessRequestId === req.id ? "..." : "Reject"}
                              </button>
                            </div>
                          )}
                          {req.status !== "PENDING" && (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Grant Access Section */}
          <section className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Grant Access to Requested Products Page</h2>
            <p className="text-sm text-gray-500 mb-4">
              Search for a user and grant them temporary access to browse all product requests.
            </p>

            {grantError && <p className="text-red-600 text-sm mb-2">{grantError}</p>}
            {grantSuccess && <p className="text-green-600 text-sm mb-2">{grantSuccess}</p>}

            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-48">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search User by Email</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchUsers()}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="user@email.com"
                  />
                  <button
                    onClick={handleSearchUsers}
                    disabled={searching}
                    className="bg-gray-100 px-4 py-2 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50"
                  >
                    {searching ? "..." : "Search"}
                  </button>
                </div>

                {searchResults.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                    {searchResults.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          setSelectedUserId(u.id)
                          setSearchEmail(u.email)
                          setSearchResults([])
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                          selectedUserId === u.id ? "bg-blue-50" : ""
                        }`}
                      >
                        <span className="font-medium">{u.name || "No name"}</span>
                        <span className="text-gray-500 ml-2">{u.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                <select
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="1">1 hour</option>
                  <option value="6">6 hours</option>
                  <option value="12">12 hours</option>
                  <option value="24">24 hours (1 day)</option>
                  <option value="72">72 hours (3 days)</option>
                  <option value="168">168 hours (1 week)</option>
                  <option value="720">720 hours (1 month)</option>
                </select>
              </div>

              <button
                onClick={handleGrantAccess}
                disabled={granting || !selectedUserId}
                className="bg-black text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {granting ? "Granting..." : "Grant Access"}
              </button>
            </div>
          </section>

          {/* Active Access Grants */}
          <section className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">
              Active Access Grants ({mounted && grants.filter((g) => new Date(g.expiresAt) > new Date()).length})
            </h2>

            {loadingGrants ? (
              <p className="text-gray-500 text-sm">Loading...</p>
            ) : grants.length === 0 ? (
              <p className="text-gray-500 text-sm">No access grants yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="pb-2 font-medium">User</th>
                      <th className="pb-2 font-medium">Email</th>
                      <th className="pb-2 font-medium">Granted At</th>
                      <th className="pb-2 font-medium">Expires At</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {grants.map((grant) => {
                      const expired = mounted && new Date(grant.expiresAt) < new Date()
                      return (
                        <tr key={grant.id}>
                          <td className="py-3">{grant.user.name || "—"}</td>
                          <td className="py-3 text-gray-600">{grant.user.email}</td>
                          <td className="py-3 text-gray-600">
                            {mounted && new Date(grant.grantedAt).toLocaleString()}
                          </td>
                          <td className="py-3 text-gray-600">
                            {mounted && new Date(grant.expiresAt).toLocaleString()}
                          </td>
                          <td className="py-3">
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                expired
                                  ? "bg-red-50 text-red-600"
                                  : "bg-green-50 text-green-600"
                              }`}
                            >
                              {expired ? "Expired" : "Active"}
                            </span>
                          </td>
                          <td className="py-3">
                            <button
                              onClick={() => handleRevoke(grant.id)}
                              disabled={revokingId === grant.id}
                              className="text-red-600 text-xs hover:underline disabled:opacity-50"
                            >
                              {revokingId === grant.id ? "Revoking..." : "Revoke"}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* All Product Requests */}
          <section className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">
              All Product Requests ({requests.length})
            </h2>

            {loadingRequests ? (
              <p className="text-gray-500 text-sm">Loading...</p>
            ) : requests.length === 0 ? (
              <p className="text-gray-500 text-sm">No product requests yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="pb-2 font-medium">Product</th>
                      <th className="pb-2 font-medium">Description</th>
                      <th className="pb-2 font-medium">Category</th>
                      <th className="pb-2 font-medium">Budget</th>
                      <th className="pb-2 font-medium">Requested By</th>
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {requests.map((req) => (
                      <tr key={req.id}>
                        <td className="py-3 font-medium">{req.name}</td>
                        <td className="py-3 text-gray-600 max-w-48 truncate">{req.description}</td>
                        <td className="py-3 text-gray-600">{req.category || "—"}</td>
                        <td className="py-3 text-gray-600">{req.budget || "—"}</td>
                        <td className="py-3 text-gray-600">
                          {req.user.name || req.user.email}
                        </td>
                        <td className="py-3 text-gray-600">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3">
                          <button
                            onClick={() => handleDeleteRequest(req.id)}
                            disabled={deletingRequestId === req.id}
                            className="text-red-600 text-xs hover:underline disabled:opacity-50"
                          >
                            {deletingRequestId === req.id ? "Deleting..." : "Delete"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
      <Footer />
    </div>
  )
}
