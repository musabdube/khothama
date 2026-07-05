"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { ChevronRight, Heart, Tag, Shield, Truck, Share2, Check } from "lucide-react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { formatCategoryPath } from "@/lib/categories"

type ProductDetails = {
  id: string
  name: string
  description: string
  price: number
  sku: string
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "OUT_OF_STOCK"
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED"
  imageUrls: string[]
  brand: string | null
  material: string | null
  condition: string | null
  availabilityScope: "LOCAL" | "ALL_ZIMBABWE" | null
  region: string | null
  town: string | null
  city: string | null
  province: string | null
  deliveryMethod: string | null
  deliveryMethods?: string[]
  promoCodes: Array<{
    id: string
    code: string
    type: "PERCENTAGE" | "FIXED_USD"
    value: number
    endsAt: string | null
  }>
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
  seller?: { id: string; name: string | null; email: string }
}

type ProductOfferStatus = "PENDING" | "ACCEPTED" | "REJECTED"

type ProductOffer = {
  id: string
  offeredPrice: number
  note: string | null
  status: ProductOfferStatus
  sellerNote: string | null
  createdAt: string
  respondedAt: string | null
}

const REPORT_REASONS = [
  "Fraud or scam",
  "Wrong category",
  "Prohibited item",
  "Offensive content",
  "Misleading information",
  "Other",
]

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function formatDeliveryMethod(value: string) {
  if (value === "PUBLIC_MEETUP") return "Public meetup"
  if (value === "DOOR_PICKUP") return "Door pickup"
  if (value === "DOOR_TO_DOOR_DROPOFF") return "Door-to-door drop off"
  if (value === "PICKUP_FROM_SELLER") return "Pickup from seller"
  return value
}

function formatDeliveryMethods(values?: string[] | string | null) {
  const normalized = (Array.isArray(values) ? values : [values])
    .flatMap((item) => (typeof item === "string" ? item.split(",") : []))
    .map((item) => item.trim())
    .filter(Boolean)

  if (normalized.length === 0) {
    return "-"
  }

  return normalized.map((value) => formatDeliveryMethod(value)).join(", ")
}

function offerStatusClass(status: ProductOfferStatus) {
  if (status === "ACCEPTED") return "bg-emerald-100 text-emerald-700"
  if (status === "REJECTED") return "bg-red-100 text-red-700"
  return "bg-amber-100 text-amber-700"
}

export default function ProductDetailsPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { data: session } = useSession()

  const productId = useMemo(() => {
    const value = params?.id
    return typeof value === "string" ? value : ""
  }, [params])

  const [product, setProduct] = useState<ProductDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const [reason, setReason] = useState(REPORT_REASONS[0])
  const [details, setDetails] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reportMessage, setReportMessage] = useState("")
  const [offerPrice, setOfferPrice] = useState("")
  const [offerNote, setOfferNote] = useState("")
  const [isSendingOffer, setIsSendingOffer] = useState(false)
  const [offerMessage, setOfferMessage] = useState("")
  const [offers, setOffers] = useState<ProductOffer[]>([])
  const [isLoadingOffers, setIsLoadingOffers] = useState(false)
  const [quantity, setQuantity] = useState("1")
  const [promoCode, setPromoCode] = useState("")
  const [isBuying, setIsBuying] = useState(false)
  const [buyMessage, setBuyMessage] = useState("")
  const [isSavingWishlist, setIsSavingWishlist] = useState(false)
  const [isInWishlist, setIsInWishlist] = useState(false)
  const [wishlistMessage, setWishlistMessage] = useState("")
  const [messageText, setMessageText] = useState("")
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [messageStatus, setMessageStatus] = useState("")
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [sellerRating, setSellerRating] = useState<{ average: number | null; total: number } | null>(null)
  const [shareCopied, setShareCopied] = useState(false)

  type RelatedProduct = {
    id: string
    name: string
    price: number
    imageUrl: string | null
    category: { id: string; name: string; slug: string } | null
  }
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([])
  const relatedScrollRef = useRef<HTMLDivElement>(null)
  const [canScrollRelatedLeft, setCanScrollRelatedLeft] = useState(false)
  const [canScrollRelatedRight, setCanScrollRelatedRight] = useState(false)

  const availabilityLabel = useMemo(() => {
    if (!product) return "-"
    if (product.availabilityScope === "ALL_ZIMBABWE") return "All in Zimbabwe"

    const parts = [product.city, product.town, product.province, product.region]
      .map((value) => value?.trim())
      .filter(Boolean)

    return parts.length > 0 ? parts.join(", ") : "-"
  }, [product])

  // Fetch related products when the main product loads
  useEffect(() => {
    if (!productId) return
    fetch(`/api/products/${productId}/related`)
      .then((r) => r.ok ? r.json() : [])
      .then((data: RelatedProduct[]) => setRelatedProducts(data))
      .catch(() => setRelatedProducts([]))
  }, [productId])

  // Fetch seller rating when seller is known
  useEffect(() => {
    const sellerId = product?.seller?.id
    if (!sellerId) return
    fetch(`/api/ratings/${sellerId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: { average: number | null; total: number } | null) => setSellerRating(data))
      .catch(() => {})
  }, [product?.seller?.id])

  const updateRelatedScroll = () => {
    const el = relatedScrollRef.current
    if (!el) return
    setCanScrollRelatedLeft(el.scrollLeft > 4)
    setCanScrollRelatedRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    updateRelatedScroll()
    const el = relatedScrollRef.current
    if (!el) return
    el.addEventListener("scroll", updateRelatedScroll, { passive: true })
    const ro = new ResizeObserver(updateRelatedScroll)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", updateRelatedScroll)
      ro.disconnect()
    }
  }, [relatedProducts])

  const scrollRelated = (dir: "left" | "right") => {
    relatedScrollRef.current?.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" })
  }

  const fetchProduct = async () => {
    if (!productId) {
      setError("Invalid product id")
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/products/${productId}`)
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to load product")
      }

      const data: ProductDetails = await response.json()
      setProduct(data)
    } catch (fetchError: unknown) {
      setError(getErrorMessage(fetchError, "Failed to load product"))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProduct()
  }, [productId])

  useEffect(() => {
    const checkWishlistState = async () => {
      if (!session?.user?.id || !productId) {
        setIsInWishlist(false)
        return
      }

      try {
        const response = await fetch(`/api/wishlist?productId=${encodeURIComponent(productId)}`)
        if (!response.ok) return

        const data: { inWishlist?: boolean } = await response.json()
        setIsInWishlist(Boolean(data?.inWishlist))
      } catch {
        setIsInWishlist(false)
      }
    }

    checkWishlistState()
  }, [productId, session?.user?.id])

  useEffect(() => {
    const fetchOffers = async () => {
      if (!productId || !session?.user?.id || session.user.id === product?.seller?.id) {
        setOffers([])
        return
      }

      setIsLoadingOffers(true)

      try {
        const response = await fetch(`/api/products/${productId}/offers`)
        if (!response.ok) {
          const text = await response.text()
          throw new Error(text || "Failed to load offers")
        }

        const data: ProductOffer[] = await response.json()
        setOffers(data)
      } catch {
        setOffers([])
      } finally {
        setIsLoadingOffers(false)
      }
    }

    fetchOffers()
  }, [productId, product?.seller?.id, session?.user?.id])

  const handleReport = async () => {
    if (!productId) return

    setIsSubmitting(true)
    setReportMessage("")

    try {
      const response = await fetch(`/api/products/${productId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to submit report")
      }

      setDetails("")
      setReason(REPORT_REASONS[0])
      setReportMessage("Report submitted. Admin will review this ad.")
    } catch (submitError: unknown) {
      setReportMessage(getErrorMessage(submitError, "Failed to submit report"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendMessage = async () => {
    if (!productId) return

    const content = messageText.trim()
    if (!content) {
      setMessageStatus("Please type a message")
      return
    }

    setIsSendingMessage(true)
    setMessageStatus("")

    try {
      const response = await fetch("/api/messages/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, content }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to send message")
      }

      const data: { conversationId: string } = await response.json()
      setMessageText("")
      router.push(`/messages/${data.conversationId}`)
    } catch (sendError: unknown) {
      if (sendError instanceof Error) {
        setMessageStatus(sendError.message)
      } else {
        setMessageStatus("Failed to send message")
      }
    } finally {
      setIsSendingMessage(false)
    }
  }

  const handleMakeOffer = async () => {
    if (!productId) return

    const amount = Number(offerPrice)
    if (!Number.isFinite(amount) || amount <= 0) {
      setOfferMessage("Offer amount must be greater than 0")
      return
    }

    setIsSendingOffer(true)
    setOfferMessage("")

    try {
      const response = await fetch(`/api/products/${productId}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offeredPrice: amount, note: offerNote }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to submit offer")
      }

      setOfferPrice("")
      setOfferNote("")
      setOfferMessage("Offer sent to seller")

      const offersResponse = await fetch(`/api/products/${productId}/offers`)
      if (offersResponse.ok) {
        const offersData: ProductOffer[] = await offersResponse.json()
        setOffers(offersData)
      }
    } catch (offerError: unknown) {
      if (offerError instanceof Error) {
        setOfferMessage(offerError.message)
      } else {
        setOfferMessage("Failed to submit offer")
      }
    } finally {
      setIsSendingOffer(false)
    }
  }

  const handleBuyNow = async () => {
    if (!productId || !product) return

    const parsedQuantity = Number(quantity)
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setBuyMessage("Quantity must be a positive whole number")
      return
    }

    setIsBuying(true)
    setBuyMessage("")

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId, quantity: parsedQuantity }],
          promoCode: promoCode.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to place order")
      }

      const data: { orderNumber: string } = await response.json()
      setBuyMessage(`Order placed successfully (${data.orderNumber})`)
      router.push("/orders")
    } catch (buyError: unknown) {
      if (buyError instanceof Error) {
        setBuyMessage(buyError.message)
      } else {
        setBuyMessage("Failed to place order")
      }
    } finally {
      setIsBuying(false)
    }
  }

  const handleToggleWishlist = async () => {
    if (!productId) return

    setIsSavingWishlist(true)
    setWishlistMessage("")

    try {
      const response = isInWishlist
        ? await fetch(`/api/wishlist/${productId}`, { method: "DELETE" })
        : await fetch("/api/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId }),
          })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to update wishlist")
      }

      const nextState = !isInWishlist
      setIsInWishlist(nextState)
      setWishlistMessage(nextState ? "Added to wishlist" : "Removed from wishlist")
    } catch (wishlistError: unknown) {
      if (wishlistError instanceof Error) {
        setWishlistMessage(wishlistError.message)
      } else {
        setWishlistMessage("Failed to update wishlist")
      }
    } finally {
      setIsSavingWishlist(false)
    }
  }

  const mainImageUrl = product
    ? (product.imageUrls[selectedImageIndex] ?? product.imageUrls[0] ?? null)
    : null

  const handleShare = async () => {
    const url = window.location.href
    const title = product?.name ?? "Check out this product"
    const text = `${title} — $${product?.price?.toFixed(2) ?? ""}`
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url })
      } catch {
        // user cancelled — do nothing
      }
    } else {
      await navigator.clipboard.writeText(url)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    }
  }

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Header />

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 flex-1">
        {isLoading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-gray-500">Loading product...</div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-red-700">{error}</div>
        ) : !product ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-gray-500">Product not found.</div>
        ) : (
          <>
            {/* Breadcrumb */}
            <nav className="mb-6 flex items-center gap-1.5 text-sm text-gray-500 flex-wrap">
              <Link href="/" className="hover:text-gray-900 transition">Home</Link>
              {product.category?.parent && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                  <Link href={`/categories/${product.category.parent.slug}`} className="hover:text-gray-900 transition">
                    {product.category.parent.name}
                  </Link>
                </>
              )}
              {product.category && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                  <Link href={`/categories/${product.category.slug}`} className="hover:text-gray-900 transition">
                    {product.category.name}
                  </Link>
                </>
              )}
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              <span className="text-gray-800 font-medium truncate max-w-45 sm:max-w-xs">{product.name}</span>
            </nav>

            {/* Main two-column layout */}
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">

              {/* ── Gallery ── */}
              <div className="flex gap-3">
                {/* Thumbnail strip */}
                {product.imageUrls.length > 1 && (
                  <div className="flex flex-col gap-2 w-16 sm:w-20 shrink-0">
                    {product.imageUrls.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedImageIndex(i)}
                        className={`w-full aspect-square rounded-xl overflow-hidden border-2 transition focus:outline-none ${
                          selectedImageIndex === i
                            ? "border-gray-900"
                            : "border-gray-200 hover:border-gray-400"
                        }`}
                      >
                        <img src={url} alt={`View ${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Main image */}
                <button
                  type="button"
                  className="flex-1 min-w-0 aspect-square rounded-2xl overflow-hidden bg-gray-100 focus:outline-none focus:ring-2 focus:ring-black"
                  onClick={() => mainImageUrl ? setPreviewImageUrl(mainImageUrl) : undefined}
                >
                  {mainImageUrl ? (
                    <img src={mainImageUrl} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No image</div>
                  )}
                </button>
              </div>

              {/* ── Product Details ── */}
              <div className="flex flex-col gap-4">

                {/* Status badge */}
                {product.status === "OUT_OF_STOCK" ? (
                  <span className="inline-block w-fit rounded-full bg-red-100 text-red-700 px-3 py-1 text-xs font-semibold">Out of Stock</span>
                ) : product.approvalStatus === "PENDING" ? (
                  <span className="inline-block w-fit rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-semibold">Pending Review</span>
                ) : product.approvalStatus === "REJECTED" ? (
                  <span className="inline-block w-fit rounded-full bg-red-100 text-red-700 px-3 py-1 text-xs font-semibold">Rejected</span>
                ) : product.status === "DRAFT" ? (
                  <span className="inline-block w-fit rounded-full bg-gray-100 text-gray-600 px-3 py-1 text-xs font-semibold">Draft</span>
                ) : product.status === "PUBLISHED" && product.approvalStatus === "APPROVED" ? (
                  <span className="inline-block w-fit rounded-full bg-green-100 text-green-700 px-3 py-1 text-xs font-semibold">In Stock</span>
                ) : null}

                {/* Title */}
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-950 leading-tight">{product.name}</h1>

                {/* Vendor / Category */}
                <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                  {product.seller && (
                    <>
                      <span>Vendor: <Link href={`/seller/${product.seller.id}`} className="font-medium text-gray-900 hover:underline hover:text-indigo-600 transition">{product.seller.name || product.seller.email}</Link></span>
                      {sellerRating && sellerRating.total > 0 && (
                        <span className="inline-flex items-center gap-1 text-amber-500 font-medium">
                          <svg className="w-4 h-4 fill-amber-400" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.966a1 1 0 00.95.69h4.172c.969 0 1.371 1.24.588 1.81l-3.374 2.453a1 1 0 00-.364 1.118l1.286 3.966c.3.921-.755 1.688-1.54 1.118L10 15.347l-3.955 2.701c-.784.57-1.838-.197-1.539-1.118l1.286-3.966a1 1 0 00-.364-1.118L2.054 9.393c-.783-.57-.38-1.81.588-1.81h4.172a1 1 0 00.95-.69L9.049 2.927z"/></svg>
                          {sellerRating.average?.toFixed(1)} <span className="text-gray-500 font-normal">({sellerRating.total})</span>
                        </span>
                      )}
                      {product.category && <span className="text-gray-300 select-none">|</span>}
                    </>
                  )}
                  {product.category && (
                    <span>
                      Type:{" "}
                      <Link href={`/categories/${product.category.slug}`} className="font-medium text-indigo-600 hover:underline">
                        {product.category.name}
                      </Link>
                    </span>
                  )}
                </div>

                {/* Price */}
                <p className="text-4xl font-bold text-gray-950 tracking-tight">${product.price.toFixed(2)}</p>

                {/* Feature checkmarks */}
                {(product.brand || product.condition || product.deliveryMethod || product.deliveryMethods?.length) ? (
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-gray-800">
                    {product.brand && (
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-4 h-4 text-gray-500 shrink-0" />{product.brand}
                      </span>
                    )}
                    {product.condition && (
                      <span className="flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-gray-500 shrink-0" />{product.condition}
                      </span>
                    )}
                    {(product.deliveryMethods?.length || product.deliveryMethod) && (
                      <span className="flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-gray-500 shrink-0" />
                        {formatDeliveryMethods(product.deliveryMethods?.length ? product.deliveryMethods : product.deliveryMethod)}
                      </span>
                    )}
                  </div>
                ) : null}

                {/* Description */}
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{product.description}</p>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm border-t border-gray-100 pt-4">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">SKU</div>
                    <div className="font-medium text-gray-900 mt-0.5">{product.sku}</div>
                  </div>
                  {product.material && (
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Material</div>
                      <div className="font-medium text-gray-900 mt-0.5">{product.material}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Location</div>
                    <div className="font-medium text-gray-900 mt-0.5">{availabilityLabel}</div>
                  </div>
                  {product.category && (
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Category</div>
                      <div className="font-medium text-gray-900 mt-0.5">{formatCategoryPath(product.category)}</div>
                    </div>
                  )}
                </div>

                {/* Promo codes */}
                {product.promoCodes.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Promo codes</div>
                    <div className="flex flex-wrap gap-1.5">
                      {product.promoCodes.map((pc) => (
                        <span key={pc.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-gray-300 bg-gray-50 text-xs">
                          <span className="font-semibold text-gray-900">{pc.code}</span>
                          <span className="text-gray-600">{pc.type === "PERCENTAGE" ? `-${pc.value}%` : `-$${pc.value.toFixed(2)}`}</span>
                          {pc.endsAt && <span className="text-gray-400">· {new Date(pc.endsAt).toLocaleDateString()}</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Actions ── */}
                <div className="border-t border-gray-100 pt-5 flex flex-col gap-4">
                  {!session ? (
                    <p className="text-sm text-gray-600">
                      <Link href="/login" className="font-medium text-black hover:underline">Login</Link> to buy or contact the seller.
                    </p>
                  ) : session.user.id === product.seller?.id ? (
                    <p className="text-sm text-gray-600">This is your own listing.</p>
                  ) : (
                    <>
                      {/* Quantity + promo */}
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          placeholder="Qty"
                          className="w-20 px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                        />
                        <input
                          type="text"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value)}
                          placeholder="Promo code (optional)"
                          className="flex-1 px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                        />
                      </div>

                      {/* Buy + Wishlist */}
                      <div className="flex flex-wrap gap-2 items-center">
                        <button
                          onClick={handleBuyNow}
                          disabled={isBuying}
                          className="px-6 py-2.5 bg-black text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition disabled:opacity-60"
                        >
                          {isBuying ? "Placing order…" : "Buy Now"}
                        </button>
                        <button
                          onClick={handleToggleWishlist}
                          disabled={isSavingWishlist}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-gray-300 text-sm rounded-xl hover:bg-gray-50 transition disabled:opacity-60"
                        >
                          <Heart className={`w-4 h-4 ${isInWishlist ? "fill-current text-red-500" : "text-gray-600"}`} />
                          {isInWishlist ? "Saved" : "Save"}
                        </button>
                        <button
                          onClick={handleShare}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-gray-300 text-sm rounded-xl hover:bg-gray-50 transition"
                        >
                          {shareCopied ? (
                            <><Check className="w-4 h-4 text-green-600" /> Copied!</>
                          ) : (
                            <><Share2 className="w-4 h-4 text-gray-600" /> Share</>
                          )}
                        </button>
                        {buyMessage && <span className="text-sm text-gray-700">{buyMessage}</span>}
                        {wishlistMessage && <span className="text-sm text-gray-700">{wishlistMessage}</span>}
                      </div>

                      {/* Message seller */}
                      <div className="flex flex-col gap-2">
                        <textarea
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          placeholder="Ask about availability, condition, pickup…"
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl min-h-20 focus:outline-none focus:ring-2 focus:ring-black resize-none"
                        />
                        <div className="flex items-center gap-3">
                          <button
                            onClick={handleSendMessage}
                            disabled={isSendingMessage}
                            className="px-4 py-2.5 border border-gray-300 text-sm rounded-xl hover:bg-gray-50 transition disabled:opacity-60"
                          >
                            {isSendingMessage ? "Sending…" : "Message Seller"}
                          </button>
                          {messageStatus && <span className="text-sm text-gray-700">{messageStatus}</span>}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ── Secondary sections ── */}
            <div className="mt-10 grid gap-5 lg:grid-cols-2">

              {/* Make an offer */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="text-base font-semibold text-gray-950 mb-4">Make an offer</h2>
                {!session ? (
                  <p className="text-sm text-gray-600">Please <Link href="/login" className="font-medium text-black hover:underline">login</Link> to send an offer.</p>
                ) : session.user.id === product.seller?.id ? (
                  <p className="text-sm text-gray-600">This is your own product.</p>
                ) : (
                  <>
                    <div className="flex flex-col gap-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={offerPrice}
                        onChange={(e) => setOfferPrice(e.target.value)}
                        placeholder="Offer amount (USD)"
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                      />
                      <textarea
                        value={offerNote}
                        onChange={(e) => setOfferNote(e.target.value)}
                        placeholder="Optional note"
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl min-h-20 focus:outline-none focus:ring-2 focus:ring-black resize-none"
                      />
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <button
                        onClick={handleMakeOffer}
                        disabled={isSendingOffer}
                        className="px-4 py-2.5 bg-black text-white text-sm rounded-xl hover:bg-gray-800 transition disabled:opacity-60"
                      >
                        {isSendingOffer ? "Sending…" : "Send offer"}
                      </button>
                      {offerMessage && <span className="text-sm text-gray-700">{offerMessage}</span>}
                    </div>
                  </>
                )}
              </div>

              {/* Your offers */}
              {session && session.user.id !== product.seller?.id && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6">
                  <h2 className="text-base font-semibold text-gray-950 mb-4">Your offers</h2>
                  {isLoadingOffers ? (
                    <p className="text-sm text-gray-500">Loading…</p>
                  ) : offers.length === 0 ? (
                    <p className="text-sm text-gray-600">No offers yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {offers.map((offer) => (
                        <div key={offer.id} className="rounded-xl border border-gray-200 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-base font-semibold text-gray-950">${offer.offeredPrice.toFixed(2)}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{new Date(offer.createdAt).toLocaleString()}</div>
                            </div>
                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${offerStatusClass(offer.status)}`}>
                              {offer.status}
                            </span>
                          </div>
                          {offer.note && <p className="mt-2 text-sm text-gray-700">Your note: {offer.note}</p>}
                          {offer.respondedAt && (
                            <p className="mt-2 text-sm text-gray-700">Seller responded {new Date(offer.respondedAt).toLocaleString()}</p>
                          )}
                          {offer.sellerNote && (
                            <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">Seller note: {offer.sellerNote}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Report this ad */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="text-base font-semibold text-gray-950 mb-4">Report this ad</h2>
                {!session ? (
                  <p className="text-sm text-gray-600">Please <Link href="/login" className="font-medium text-black hover:underline">login</Link> to report this ad.</p>
                ) : (
                  <>
                    <div className="flex flex-col gap-3">
                      <select
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                      >
                        {REPORT_REASONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      <textarea
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                        placeholder="Optional details"
                        className="px-3 py-2.5 text-sm border border-gray-300 rounded-xl min-h-20 focus:outline-none focus:ring-2 focus:ring-black resize-none"
                      />
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <button
                        onClick={handleReport}
                        disabled={isSubmitting}
                        className="px-4 py-2.5 bg-black text-white text-sm rounded-xl hover:bg-gray-800 transition disabled:opacity-60"
                      >
                        {isSubmitting ? "Submitting…" : "Submit report"}
                      </button>
                      {reportMessage && <span className="text-sm text-gray-700">{reportMessage}</span>}
                    </div>
                  </>
                )}
              </div>

            </div>

            {/* ── Perfect Match With ── */}
            {relatedProducts.length > 0 && (
              <div className="mt-10">
                <h2 className="text-xl font-bold text-gray-950 mb-5">Perfect Match With</h2>
                <div className="relative">
                  {canScrollRelatedLeft && (
                    <button
                      onClick={() => scrollRelated("left")}
                      className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 h-9 w-9 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-700 hover:bg-gray-50 transition"
                      aria-label="Scroll left"
                    >
                      <ChevronRight className="w-5 h-5 rotate-180" />
                    </button>
                  )}

                  <div
                    ref={relatedScrollRef}
                    className="flex gap-4 overflow-x-auto pb-2"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                  >
                    {relatedProducts.map((rp) => (
                      <div key={rp.id} className="shrink-0 w-44 sm:w-52 flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden">
                        <div className="aspect-square bg-gray-100 overflow-hidden">
                          {rp.imageUrl ? (
                            <img src={rp.imageUrl} alt={rp.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No image</div>
                          )}
                        </div>
                        <div className="p-3 flex flex-col gap-1.5 flex-1">
                          <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight">{rp.name}</p>
                          <p className="text-sm font-bold text-gray-950">${rp.price.toFixed(2)}</p>
                          <Link
                            href={`/product/${rp.id}`}
                            className="mt-auto block text-center bg-gray-950 text-white text-sm font-semibold rounded-xl px-4 py-2 hover:bg-gray-800 transition"
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>

                  {canScrollRelatedRight && (
                    <button
                      onClick={() => scrollRelated("right")}
                      className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 h-9 w-9 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-700 hover:bg-gray-50 transition"
                      aria-label="Scroll right"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Image lightbox */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 p-4 md:p-8 flex items-center justify-center"
          onClick={() => setPreviewImageUrl(null)}
        >
          <button
            type="button"
            aria-label="Close image preview"
            onClick={() => setPreviewImageUrl(null)}
            className="absolute top-4 right-4 text-white text-sm px-3 py-1.5 border border-white/60 rounded-lg hover:bg-white/10 transition"
          >
            Close
          </button>
          <img
            src={previewImageUrl}
            alt="Product preview"
            className="max-h-[90vh] max-w-[95vw] object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <Footer />
    </main>
  )
}
