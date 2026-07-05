"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Loader2, MessageCircle, Send, Clock, XCircle } from "lucide-react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"

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

type AccessRequest = {
  id: string
  status: "PENDING" | "APPROVED" | "REJECTED"
  createdAt: string
} | null

export default function RequestedProductsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [requests, setRequests] = useState<ProductRequest[]>([])
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [startingConversationId, setStartingConversationId] = useState<string | null>(null)
  const [accessRequest, setAccessRequest] = useState<AccessRequest>(null)
  const [sendingRequest, setSendingRequest] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    if (status !== "authenticated") return

    const fetchData = async () => {
      try {
        const [browseRes, requestRes] = await Promise.all([
          fetch("/api/product-requests/browse"),
          fetch("/api/product-requests/access-request"),
        ])

        if (browseRes.status === 403) {
          setHasAccess(false)
          if (requestRes.ok) {
            const reqData = await requestRes.json()
            setAccessRequest(reqData.accessRequest)
          }
          return
        }
        if (!browseRes.ok) return

        const data = await browseRes.json()
        setHasAccess(data.hasAccess)
        setRequests(data.requests || [])
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [status])

  const handleSendRequest = async () => {
    setSendingRequest(true)
    try {
      const res = await fetch("/api/product-requests/access-request", { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        setAccessRequest(data.accessRequest)
      }
    } catch {
      // ignore
    } finally {
      setSendingRequest(false)
    }
  }

  const startConversation = async (productRequestId: string) => {
    setStartingConversationId(productRequestId)

    try {
      const response = await fetch("/api/request-messages/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productRequestId }),
      })

      if (!response.ok) {
        return
      }

      const data = await response.json()
      router.push(`/request-messages/${data.conversationId}`)
    } finally {
      setStartingConversationId((current) => (current === productRequestId ? null : current))
    }
  }

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  const isAdmin = session?.user?.role === "ADMIN"
  const currentUserId = session?.user?.id

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Requested Products</h1>

        {loading ? (
          <p className="text-gray-700">Loading...</p>
        ) : hasAccess === false && !isAdmin ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <div className="text-5xl mb-4">🔒</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Required</h2>
            <p className="text-gray-700 mb-4">
              You don&apos;t have access to view requested products.
              An admin needs to grant you access before you can see this page.
            </p>

            {accessRequest?.status === "PENDING" ? (
              <div className="inline-flex items-center gap-2 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-xl px-5 py-3 text-sm font-medium">
                <Clock className="h-4 w-4" />
                Request sent — waiting for admin approval
              </div>
            ) : accessRequest?.status === "REJECTED" ? (
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-xl px-5 py-3 text-sm font-medium">
                  <XCircle className="h-4 w-4" />
                  Your previous request was rejected
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => void handleSendRequest()}
                    disabled={sendingRequest}
                    className="inline-flex items-center gap-2 bg-black text-white rounded-xl px-5 py-3 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                  >
                    {sendingRequest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {sendingRequest ? "Sending..." : "Send New Request"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void handleSendRequest()}
                disabled={sendingRequest}
                className="inline-flex items-center gap-2 bg-black text-white rounded-xl px-5 py-3 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {sendingRequest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sendingRequest ? "Sending..." : "Send Request to Admin"}
              </button>
            )}
          </div>
        ) : requests.length === 0 ? (
          <p className="text-gray-700">No product requests yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                {req.image && (
                  <img
                    src={req.image}
                    alt={req.name}
                    className="w-full h-40 object-cover"
                  />
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-base text-gray-900">{req.name}</h3>
                  <p className="text-gray-700 text-sm mt-1 line-clamp-3">
                    {req.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {req.category && (
                      <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                        {req.category}
                      </span>
                    )}
                    {req.budget && (
                      <span className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full">
                        {req.budget}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-700">
                      {(req.user.name || req.user.email)[0].toUpperCase()}
                    </div>
                    <span className="text-xs text-gray-700">
                      {req.user.name || req.user.email}
                    </span>
                    <span className="text-xs text-gray-600 ml-auto">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {currentUserId && req.user.id !== currentUserId && (
                    <button
                      type="button"
                      onClick={() => void startConversation(req.id)}
                      disabled={startingConversationId === req.id}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-black px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                    >
                      {startingConversationId === req.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MessageCircle className="h-4 w-4" />
                      )}
                      {startingConversationId === req.id ? "Opening..." : "Message user"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
