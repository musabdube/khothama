"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowRight,
  Loader2,
  MessageCircle,
  Send,
  ShoppingBag,
  Trash2,
} from "lucide-react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import ImageUpload from "@/components/ImageUpload"

type ProductRequest = {
  id: string
  name: string
  description: string
  image: string | null
  category: string | null
  budget: string | null
  createdAt: string
}

export default function RequestProductPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [requests, setRequests] = useState<ProductRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [image, setImage] = useState("")
  const [category, setCategory] = useState("")
  const [budget, setBudget] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/product-requests")
      if (res.ok) {
        const data = await res.json()
        setRequests(data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      fetchRequests()
    }
  }, [status])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setSubmitting(true)

    try {
      const res = await fetch("/api/product-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, image, category, budget }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error || "Failed to submit request")
        return
      }

      setSuccess("Product request submitted successfully!")
      setName("")
      setDescription("")
      setImage("")
      setCategory("")
      setBudget("")
      fetchRequests()
    } catch {
      setError("Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this request?")) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/product-requests/${id}`, { method: "DELETE" })
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== id))
      }
    } catch {
      // ignore
    } finally {
      setDeletingId(null)
    }
  }

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Request a Product</h1>
          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
            <Link
              href="/request-messages"
              className="inline-flex items-center gap-1.5 text-sm text-gray-700 hover:text-black font-medium"
            >
              <MessageCircle className="h-4 w-4" />
              View Request Messages
            </Link>
            <Link
              href="/requested-products"
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
            >
              <ShoppingBag className="h-4 w-4" />
              Browse Requested Products
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <p className="text-gray-700 mb-6">
          Can&apos;t find what you&apos;re looking for? Submit a request and other users may be able to help.
        </p>

        {/* Submit Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 mb-10"
        >
          <h2 className="text-lg font-semibold text-gray-900">New Request</h2>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="e.g. iPhone 15 Pro Max"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Describe the product you're looking for, condition, specs, etc."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="e.g. Electronics"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Budget
              </label>
              <input
                type="text"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="e.g. $500 - $800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference Image
              </label>
              <ImageUpload
                value={image || null}
                onChange={setImage}
                folder="requests"
                label="Upload request image"
              />
              <p className="mt-2 text-xs text-gray-500">
                Upload to Cloudinary or paste an image URL in the field above.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 bg-black text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit Request
              </>
            )}
          </button>
        </form>

        {/* My Requests */}
        <h2 className="text-lg font-semibold mb-4">My Requests</h2>

        {loading ? (
          <p className="text-gray-700 text-sm">Loading...</p>
        ) : requests.length === 0 ? (
          <p className="text-gray-700 text-sm">You haven&apos;t submitted any requests yet.</p>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-xl border border-gray-200 p-5 flex gap-4"
              >
                {req.image && (
                  <Image
                    src={req.image}
                    alt={req.name}
                    width={80}
                    height={80}
                    className="w-20 h-20 rounded-lg object-cover shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base text-gray-900">{req.name}</h3>
                  <p className="text-gray-700 text-sm mt-1 line-clamp-2">{req.description}</p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-700">
                    {req.category && <span>Category: {req.category}</span>}
                    {req.budget && <span>Budget: {req.budget}</span>}
                    <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-3">
                    <Link
                      href={`/request-messages?requestId=${req.id}`}
                      className="inline-flex items-center gap-1.5 text-sm text-gray-700 hover:text-black font-medium"
                    >
                      <MessageCircle className="h-4 w-4" />
                      View conversations
                    </Link>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(req.id)}
                  disabled={deletingId === req.id}
                  className="inline-flex items-center gap-1.5 text-red-600 text-sm hover:underline shrink-0 self-start"
                >
                  {deletingId === req.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
