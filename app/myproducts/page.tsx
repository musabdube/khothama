"use client"

import { useEffect, useMemo, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { Plus, Pencil, Trash2, Search, Check, X, Zap, ChevronDown, Pause, Play, Eye, Package, Tag, Truck, MapPin, Star } from "lucide-react"

type ProductRow = {
  id: string
  name: string
  description: string
  price: number
  popularity: number
  sku: string
  categoryId: string
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
  }
  colors: string[]
  sizes: string[]
  shades: string[]
  material: string | null
  brand: string | null
  brandRef?: {
    id: string
    name: string
    slug: string
  } | null
  condition?: string | null
  availabilityScope?: "LOCAL" | "ALL_ZIMBABWE" | null
  city?: string | null
  town?: string | null
  province?: string | null
  region?: string | null
  deliveryMethod?: string | null
  deliveryMethods?: string[]
  imageUrls?: string[]
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "OUT_OF_STOCK"
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED"
  pendingPublish: boolean
  updatedAt: string
  seller?: { name: string | null; email: string }
}

type ProductPromoCodeRow = {
  id: string
  code: string
  type: "PERCENTAGE" | "FIXED_USD"
  value: number
  isActive: boolean
  startsAt: string
  endsAt: string | null
  maxUses: number | null
  usedCount: number
}

type ProductOfferRow = {
  id: string
  offeredPrice: number
  note: string | null
  status: "PENDING" | "ACCEPTED" | "REJECTED"
  createdAt: string
  buyer: {
    id: string
    name: string | null
    email: string
  }
}

type PromoFormState = {
  productId: string
  code: string
  type: "PERCENTAGE" | "FIXED_USD"
  value: string
  endsAt: string
}



const initialPromoFormState: PromoFormState = {
  productId: "",
  code: "",
  type: "PERCENTAGE",
  value: "",
  endsAt: "",
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function ProductsPageContent() {
  const { data: session, status: sessionStatus } = useSession()
  const searchParams = useSearchParams()
  const categoryFilter = (searchParams.get("category") || "").trim().toLowerCase()
  const queryFilter = (searchParams.get("q") || "").trim()
  const isAdmin = session?.user?.role === "ADMIN"

  const [products, setProducts] = useState<ProductRow[]>([])
  const [search, setSearch] = useState("")
  const [searchDraft, setSearchDraft] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [promoForm, setPromoForm] = useState<PromoFormState>(initialPromoFormState)
  const [promoCodes, setPromoCodes] = useState<ProductPromoCodeRow[]>([])
  const [promoMessage, setPromoMessage] = useState("")
  const [isSavingPromo, setIsSavingPromo] = useState(false)
  const [isLoadingPromoCodes, setIsLoadingPromoCodes] = useState(false)
  const [offers, setOffers] = useState<ProductOfferRow[]>([])
  const [offersMessage, setOffersMessage] = useState("")
  const [isLoadingOffers, setIsLoadingOffers] = useState(false)
  const [offerActionId, setOfferActionId] = useState<string | null>(null)
  const [boostingProductId, setBoostingProductId] = useState<string | null>(null)
  const [changingVisibilityId, setChangingVisibilityId] = useState<string | null>(null)
  const [viewProduct, setViewProduct] = useState<ProductRow | null>(null)

  const pageTitle = useMemo(() => {
    if (isAdmin) return "Products Management"
    return "My Products"
  }, [isAdmin])

  const categoryFilterLabel = useMemo(() => {
    if (!categoryFilter) return ""
    return categoryFilter
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  }, [categoryFilter])


  const fetchProducts = async (query?: string, category?: string) => {
    setIsLoading(true)
    setError("")

    try {
      const params = new URLSearchParams()

      if (query?.trim()) {
        params.set("q", query.trim())
      }

      if (category?.trim()) {
        params.set("category", category.trim().toLowerCase())
      }

      const queryString = params.toString()
      const url = queryString ? `/api/products?${queryString}` : "/api/products"
      const response = await fetch(url)
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to load products")
      }

      const data = await response.json()
      setProducts(data)
    } catch (fetchError: unknown) {
      setError(getErrorMessage(fetchError, "Failed to load products"))
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPromoCodes = async (productId: string) => {
    if (!productId) {
      setPromoCodes([])
      return
    }

    setIsLoadingPromoCodes(true)
    setPromoMessage("")

    try {
      const response = await fetch(`/api/products/${productId}/promocodes`)
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to load promo codes")
      }

      const data: ProductPromoCodeRow[] = await response.json()
      setPromoCodes(data)
    } catch (promoError: unknown) {
      if (promoError instanceof Error) {
        setPromoMessage(promoError.message)
      } else {
        setPromoMessage("Failed to load promo codes")
      }
      setPromoCodes([])
    } finally {
      setIsLoadingPromoCodes(false)
    }
  }

  const fetchOffers = async (productId: string) => {
    if (!productId) {
      setOffers([])
      return
    }

    setIsLoadingOffers(true)
    setOffersMessage("")

    try {
      const response = await fetch(`/api/products/${productId}/offers`)
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to load offers")
      }

      const data: ProductOfferRow[] = await response.json()
      setOffers(data)
    } catch (offerError: unknown) {
      if (offerError instanceof Error) {
        setOffersMessage(offerError.message)
      } else {
        setOffersMessage("Failed to load offers")
      }
      setOffers([])
    } finally {
      setIsLoadingOffers(false)
    }
  }

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      setSearch(queryFilter)
      setSearchDraft(queryFilter)
      fetchProducts(queryFilter, categoryFilter)
    }

    if (sessionStatus === "unauthenticated") {
      setIsLoading(false)
    }
  }, [sessionStatus, categoryFilter, queryFilter])

  useEffect(() => {
    if (!promoForm.productId && products.length > 0) {
      setPromoForm((previous) => ({
        ...previous,
        productId: products[0].id,
      }))
    }
  }, [products, promoForm.productId])

  useEffect(() => {
    if (promoForm.productId) {
      fetchPromoCodes(promoForm.productId)
      fetchOffers(promoForm.productId)
    } else {
      setPromoCodes([])
      setOffers([])
    }
  }, [promoForm.productId])

  const handleDelete = async (id: string) => {
    setError("")

    try {
      const response = await fetch(`/api/products/${id}`, { method: "DELETE" })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to delete product")
      }

      await fetchProducts(search, categoryFilter)
    } catch (deleteError: unknown) {
      setError(getErrorMessage(deleteError, "Failed to delete product"))
    }
  }

  const handleVisibilityChange = async (product: ProductRow, action: "pause" | "resume") => {
    setChangingVisibilityId(product.id)
    setError("")

    try {
      const response = await fetch(`/api/products/${product.id}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `Failed to ${action} product`)
      }

      await fetchProducts(search, categoryFilter)
    } catch (visibilityError: unknown) {
      setError(getErrorMessage(visibilityError, `Failed to ${action} product`))
    } finally {
      setChangingVisibilityId(null)
    }
  }

  const handleApproval = async (id: string, decision: "APPROVED" | "REJECTED") => {
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

      await fetchProducts(search, categoryFilter)
    } catch (approvalError: unknown) {
      setError(getErrorMessage(approvalError, "Failed to update approval"))
    }
  }

  const handleBoost = async (id: string) => {
    if (!isAdmin) return

    setBoostingProductId(id)
    setError("")

    try {
      const response = await fetch(`/api/products/${id}/boost`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 50 }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to boost product")
      }

      await fetchProducts(search, categoryFilter)
    } catch (boostError: unknown) {
      setError(getErrorMessage(boostError, "Failed to boost product"))
    } finally {
      setBoostingProductId(null)
    }
  }

  const handleAddPromoCode = async () => {
    const productId = promoForm.productId
    const value = Number(promoForm.value)

    if (!productId) {
      setPromoMessage("Select a product first")
      return
    }

    if (!promoForm.code.trim()) {
      setPromoMessage("Promo code is required")
      return
    }

    if (!Number.isFinite(value) || value <= 0) {
      setPromoMessage("Promo value must be greater than 0")
      return
    }

    setIsSavingPromo(true)
    setPromoMessage("")

    try {
      const response = await fetch(`/api/products/${productId}/promocodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: promoForm.code,
          type: promoForm.type,
          value,
          endsAt: promoForm.endsAt || null,
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to add promo code")
      }

      setPromoForm((previous) => ({
        ...previous,
        code: "",
        value: "",
        endsAt: "",
      }))
      setPromoMessage("Promo code added")
      await fetchPromoCodes(productId)
    } catch (promoError: unknown) {
      if (promoError instanceof Error) {
        setPromoMessage(promoError.message)
      } else {
        setPromoMessage("Failed to add promo code")
      }
    } finally {
      setIsSavingPromo(false)
    }
  }

  const handleOfferDecision = async (
    offerId: string,
    decision: "ACCEPTED" | "REJECTED"
  ) => {
    const productId = promoForm.productId

    if (!productId) {
      setOffersMessage("Select a product first")
      return
    }

    setOfferActionId(offerId)
    setOffersMessage("")

    try {
      const response = await fetch(`/api/products/${productId}/offers/${offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to update offer")
      }

      await fetchOffers(productId)
    } catch (offerError: unknown) {
      if (offerError instanceof Error) {
        setOffersMessage(offerError.message)
      } else {
        setOffersMessage("Failed to update offer")
      }
    } finally {
      setOfferActionId(null)
    }
  }

  const statusBadgeClass = (statusValue: string) => {
    if (statusValue === "PUBLISHED") return "bg-green-100 text-green-700"
    if (statusValue === "ARCHIVED") return "bg-gray-200 text-gray-700"
    if (statusValue === "OUT_OF_STOCK") return "bg-orange-100 text-orange-700"
    return "bg-yellow-100 text-yellow-700"
  }

  const approvalBadgeClass = (approvalValue: string) => {
    if (approvalValue === "APPROVED") return "bg-emerald-100 text-emerald-700"
    if (approvalValue === "REJECTED") return "bg-red-100 text-red-700"
    return "bg-blue-100 text-blue-700"
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
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            Please login to manage products.
          </div>
        </section>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <section className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">
        {/* Page title */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">{pageTitle}</h1>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
        )}

        {/* Search & Filter bar */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Search &amp; Filter</h2>
            <div className="flex gap-2">
              <button className="px-4 py-2 border border-gray-300 rounded-xl text-sm inline-flex items-center gap-1 hover:bg-gray-50 transition">
                Filters <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <Link
                href="/create-product"
                className="px-4 py-2 bg-black text-white rounded-xl text-sm inline-flex items-center gap-1.5 hover:bg-gray-800 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add New Product
              </Link>
            </div>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              setSearch(searchDraft)
              fetchProducts(searchDraft, categoryFilter)
            }}
            className="relative"
          >
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search Products..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black text-sm"
            />
          </form>
          {categoryFilter && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-blue-100 text-blue-700">
                Category: {categoryFilterLabel}
              </span>
              <Link href="/myproducts" className="text-sm text-gray-700 hover:text-black underline">Clear</Link>
            </div>
          )}
        </div>

        {/* Product List */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col mb-4">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Product List</h2>
            {products.length > 0 && (
              <span className="text-sm text-gray-500">{products.length} {products.length === 1 ? "product" : "products"}</span>
            )}
          </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left bg-gray-50">
                    <th className="px-4 py-3 font-medium text-gray-700">Product</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Views</th>
                    {isAdmin && <th className="px-4 py-3 font-medium text-gray-700">Seller</th>}
                    <th className="px-4 py-3 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={isAdmin ? 5 : 4} className="px-4 py-8 text-gray-500 text-center">Loading products...</td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 5 : 4} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <img src="/NoItems.png" alt="No items" className="w-48 max-w-full opacity-80" />
                          <span className="text-gray-500 text-sm">No products found.</span>
                          <Link
                            href="/create-product"
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-black text-white rounded-xl text-sm hover:bg-gray-800 transition"
                          >
                            <Plus className="w-4 h-4" />
                            Create your first product
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr key={product.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setViewProduct(product)}
                            className="flex items-center gap-3 text-left w-full group"
                          >
                            <div className="h-10 w-10 rounded-xl border border-gray-200 bg-gray-100 overflow-hidden shrink-0">
                              {product.imageUrls?.[0] ? (
                                <img src={product.imageUrls[0]} alt={product.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-gray-400 text-sm font-semibold">
                                  {product.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium line-clamp-1 group-hover:text-indigo-600 transition">{product.name}</div>
                              <div className="text-xs text-gray-500">${product.price.toFixed(2)}</div>
                            </div>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${statusBadgeClass(product.status)}`}>
                            {product.status === "PUBLISHED"
                              ? "Active"
                              : product.status === "OUT_OF_STOCK"
                              ? "Unavailable"
                              : product.status.replaceAll("_", " ")}
                          </span>
                          {product.pendingPublish && (
                            <div className="mt-1 text-[10px] text-amber-600">Pending approval</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{product.popularity}</td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-xs text-gray-600">
                            <div>{product.seller?.name || "-"}</div>
                            <div>{product.seller?.email || "-"}</div>
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setViewProduct(product)}
                              title="View"
                              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition text-gray-600"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <Link
                              href={`/create-product?edit=${product.id}`}
                              title="Edit"
                              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition text-gray-600"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              onClick={() => handleDelete(product.id)}
                              title="Delete"
                              className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition text-red-500"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            {(isAdmin || product.approvalStatus === "APPROVED") && (
                              product.status === "PUBLISHED" ? (
                                <button
                                  onClick={() => handleVisibilityChange(product, "pause")}
                                  disabled={changingVisibilityId === product.id}
                                  title="Pause product"
                                  className="p-1.5 rounded-lg border border-amber-200 hover:bg-amber-50 transition text-amber-600 disabled:opacity-50"
                                >
                                  <Pause className="w-3.5 h-3.5" />
                                </button>
                              ) : product.status === "OUT_OF_STOCK" ? (
                                <button
                                  onClick={() => handleVisibilityChange(product, "resume")}
                                  disabled={changingVisibilityId === product.id}
                                  title="Resume product"
                                  className="p-1.5 rounded-lg border border-green-200 hover:bg-green-50 transition text-green-600 disabled:opacity-50"
                                >
                                  <Play className="w-3.5 h-3.5" />
                                </button>
                              ) : null
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => handleBoost(product.id)}
                                disabled={boostingProductId === product.id}
                                title="Boost"
                                className="p-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition text-indigo-600 disabled:opacity-50"
                              >
                                <Zap className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {isAdmin && product.approvalStatus === "PENDING" && (
                              <>
                                <button onClick={() => handleApproval(product.id, "APPROVED")} title="Approve" className="p-1.5 rounded-lg border border-green-200 hover:bg-green-50 transition text-green-600">
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleApproval(product.id, "REJECTED")} title="Reject" className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition text-red-500">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        {/* Promo Codes + Offers */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Promo Codes</h2>
            {products.length === 0 ? (
              <div className="text-sm text-gray-600">Create a product first to add promo codes.</div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                  <select value={promoForm.productId} onChange={(event) => setPromoForm((prev) => ({ ...prev, productId: event.target.value }))} className="col-span-2 md:col-span-1 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black bg-white text-sm">
                    {products.map((product) => (<option key={product.id} value={product.id}>{product.name}</option>))}
                  </select>
                  <input value={promoForm.code} onChange={(event) => setPromoForm((prev) => ({ ...prev, code: event.target.value }))} placeholder="Code" className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black text-sm" />
                  <select value={promoForm.type} onChange={(event) => setPromoForm((prev) => ({ ...prev, type: event.target.value as "PERCENTAGE" | "FIXED_USD" }))} className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black bg-white text-sm">
                    <option value="PERCENTAGE">% Off</option>
                    <option value="FIXED_USD">$ Off</option>
                  </select>
                  <input type="number" min="0" step="0.01" value={promoForm.value} onChange={(event) => setPromoForm((prev) => ({ ...prev, value: event.target.value }))} placeholder={promoForm.type === "PERCENTAGE" ? "%" : "USD"} className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black text-sm" />
                  <input type="date" value={promoForm.endsAt} onChange={(event) => setPromoForm((prev) => ({ ...prev, endsAt: event.target.value }))} className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black text-sm" />
                  <button onClick={handleAddPromoCode} disabled={isSavingPromo} className="px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition disabled:opacity-50 text-sm">{isSavingPromo ? "Adding..." : "Add"}</button>
                </div>
                {promoMessage && <div className="text-sm text-gray-700 mb-2">{promoMessage}</div>}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700">Active codes</div>
                  {isLoadingPromoCodes ? (
                    <div className="p-3 text-sm text-gray-500">Loading...</div>
                  ) : promoCodes.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500">No promo codes yet.</div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {promoCodes.map((promoCode) => (
                        <div key={promoCode.id} className="px-3 py-2 text-sm flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{promoCode.code}</span>
                          <span className="text-gray-600">{promoCode.type === "PERCENTAGE" ? `${promoCode.value}% off` : `$${promoCode.value.toFixed(2)} off`}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${promoCode.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"}`}>{promoCode.isActive ? "Active" : "Inactive"}</span>
                          {promoCode.endsAt && <span className="text-xs text-gray-500">Until {new Date(promoCode.endsAt).toLocaleDateString()}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Received Offers</h2>
            <div className="mb-3">
              <select value={promoForm.productId} onChange={(event) => setPromoForm((prev) => ({ ...prev, productId: event.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black bg-white text-sm">
                {products.map((product) => (<option key={product.id} value={product.id}>{product.name}</option>))}
              </select>
            </div>
            {offersMessage && <div className="text-sm text-red-600 mb-2">{offersMessage}</div>}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700">Offers</div>
              {isLoadingOffers ? (
                <div className="p-3 text-sm text-gray-500">Loading offers...</div>
              ) : offers.length === 0 ? (
                <div className="p-3 text-sm text-gray-500">No offers yet.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {offers.map((offer) => (
                    <div key={offer.id} className="px-3 py-2 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">${offer.offeredPrice.toFixed(2)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          offer.status === "ACCEPTED" ? "bg-green-100 text-green-700" :
                          offer.status === "REJECTED" ? "bg-red-100 text-red-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>{offer.status}</span>
                        <span className="text-xs text-gray-500">{new Date(offer.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">From: {offer.buyer.name || offer.buyer.email}</div>
                      {offer.note && <div className="text-xs text-gray-700 mt-0.5">{offer.note}</div>}
                      {offer.status === "PENDING" && (
                        <div className="mt-1.5 flex gap-2">
                          <button onClick={() => handleOfferDecision(offer.id, "ACCEPTED")} disabled={offerActionId === offer.id} className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 text-xs">{offerActionId === offer.id ? "Saving..." : "Accept"}</button>
                          <button onClick={() => handleOfferDecision(offer.id, "REJECTED")} disabled={offerActionId === offer.id} className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 text-xs">Reject</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* ── Product Detail Modal ── */}
      {viewProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setViewProduct(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10 rounded-t-2xl">
              <h2 className="font-semibold text-gray-900 text-lg truncate pr-4">{viewProduct.name}</h2>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/create-product?edit=${viewProduct.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-xl text-xs font-medium hover:bg-gray-800 transition"
                  onClick={() => setViewProduct(null)}
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </Link>
                <button
                  onClick={() => setViewProduct(null)}
                  className="p-1.5 rounded-xl hover:bg-gray-100 transition text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col gap-6">
              {/* Images */}
              {viewProduct.imageUrls && viewProduct.imageUrls.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {viewProduct.imageUrls.map((url, i) => (
                    <div key={i} className="shrink-0 w-32 h-32 rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                      <img src={url} alt={`${viewProduct.name} photo ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {/* Status badges */}
              <div className="flex flex-wrap gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${statusBadgeClass(viewProduct.status)}`}>
                  {viewProduct.status === "PUBLISHED" ? "Active" : viewProduct.status === "OUT_OF_STOCK" ? "Unavailable" : viewProduct.status.replaceAll("_", " ")}
                </span>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${approvalBadgeClass(viewProduct.approvalStatus)}`}>
                  {viewProduct.approvalStatus}
                </span>
                {viewProduct.pendingPublish && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Pending approval</span>
                )}
              </div>

              {/* Price / Stock / SKU / Views */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Price", value: `$${viewProduct.price.toFixed(2)}` },
                  { label: "SKU", value: viewProduct.sku },
                  { label: "Views", value: viewProduct.popularity.toString() },
                  { label: "Condition", value: viewProduct.condition || "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="text-xs text-gray-500 mb-0.5">{label}</div>
                    <div className="font-semibold text-gray-900 text-sm">{value}</div>
                  </div>
                ))}
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  <Package className="w-3.5 h-3.5" />
                  Description
                </div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{viewProduct.description || "—"}</p>
              </div>

              {/* Category & Brand */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    <Tag className="w-3.5 h-3.5" />
                    Category
                  </div>
                  <div className="text-sm text-gray-800">
                    {viewProduct.category
                      ? viewProduct.category.parent
                        ? `${viewProduct.category.parent.name} / ${viewProduct.category.name}`
                        : viewProduct.category.name
                      : "—"}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    <Star className="w-3.5 h-3.5" />
                    Brand
                  </div>
                  <div className="text-sm text-gray-800">{viewProduct.brandRef?.name || viewProduct.brand || "—"}</div>
                </div>
              </div>

              {/* Delivery */}
              {viewProduct.deliveryMethods && viewProduct.deliveryMethods.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    <Truck className="w-3.5 h-3.5" />
                    Delivery Methods
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {viewProduct.deliveryMethods.map((method) => (
                      <span key={method} className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs">
                        {method.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Location */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  <MapPin className="w-3.5 h-3.5" />
                  Availability
                </div>
                {viewProduct.availabilityScope === "ALL_ZIMBABWE" ? (
                  <span className="text-sm text-gray-800">All over Zimbabwe</span>
                ) : (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
                    {viewProduct.city && <span>City: {viewProduct.city}</span>}
                    {viewProduct.town && <span>Town: {viewProduct.town}</span>}
                    {viewProduct.province && <span>Province: {viewProduct.province}</span>}
                    {viewProduct.region && <span>Region: {viewProduct.region}</span>}
                    {!viewProduct.city && !viewProduct.town && !viewProduct.province && !viewProduct.region && <span className="text-gray-400">Not specified</span>}
                  </div>
                )}
              </div>

              {/* Variants (sizes / colors / shades) */}
              {(viewProduct.sizes?.length > 0 || viewProduct.colors?.length > 0 || viewProduct.shades?.length > 0 || viewProduct.material) && (
                <div className="grid grid-cols-2 gap-4">
                  {viewProduct.sizes?.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Sizes</div>
                      <div className="text-sm text-gray-800">{viewProduct.sizes.join(", ")}</div>
                    </div>
                  )}
                  {viewProduct.colors?.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Colors</div>
                      <div className="text-sm text-gray-800">{viewProduct.colors.join(", ")}</div>
                    </div>
                  )}
                  {viewProduct.shades?.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Shades</div>
                      <div className="text-sm text-gray-800">{viewProduct.shades.join(", ")}</div>
                    </div>
                  )}
                  {viewProduct.material && (
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Material</div>
                      <div className="text-sm text-gray-800">{viewProduct.material}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Admin seller info */}
              {isAdmin && viewProduct.seller && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Seller</div>
                  <div className="text-sm text-gray-800">{viewProduct.seller.name || "—"}</div>
                  <div className="text-xs text-gray-500">{viewProduct.seller.email}</div>
                </div>
              )}

              {/* View public listing link */}
              {viewProduct.status === "PUBLISHED" && viewProduct.approvalStatus === "APPROVED" && (
                <Link
                  href={`/product/${viewProduct.id}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline"
                  onClick={() => setViewProduct(null)}
                >
                  <Eye className="w-4 h-4" />
                  View public listing
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default function ProductsPage() {
  return (
    <Suspense>
      <ProductsPageContent />
    </Suspense>
  )
}
