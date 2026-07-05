"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"
import { ImageIcon, X, ArrowLeft } from "lucide-react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import {
  type CategoryOption,
  findCategoryById,
  getRootCategories,
  getSubcategories,
} from "@/lib/categories"

const MAX_PHOTOS = 6
const EMPTY_IMAGE_SLOTS = Array<string>(MAX_PHOTOS).fill("")

const DELIVERY_OPTIONS = [
  { value: "PUBLIC_MEETUP", label: "Public Meetup" },
  { value: "DOOR_PICKUP", label: "Door Pickup" },
  { value: "DOOR_TO_DOOR_DROPOFF", label: "Door-to-Door Dropoff" },
  { value: "PICKUP_FROM_SELLER", label: "Pickup from Seller" },
]

type BrandOption = { id: string; name: string }

type FormState = {
  name: string
  description: string
  price: string
  sku: string
  stock: string
  condition: string
  brand: string
  brandId: string
  categoryId: string
  categoryName: string
  parentCategoryId: string
  subcategoryId: string
  deliveryMethods: string[]
  availabilityScope: "LOCAL" | "ALL_ZIMBABWE"
  region: string
  province: string
  town: string
  city: string
  sizes: string
  colors: string
  shades: string
  material: string
}

const initialFormState: FormState = {
  name: "",
  description: "",
  price: "",
  sku: "",
  stock: "0",
  condition: "NEW",
  brand: "",
  brandId: "",
  categoryId: "",
  categoryName: "",
  parentCategoryId: "",
  subcategoryId: "",
  deliveryMethods: ["PUBLIC_MEETUP"],
  availabilityScope: "LOCAL",
  region: "",
  province: "",
  town: "",
  city: "",
  sizes: "",
  colors: "",
  shades: "",
  material: "",
}

const parseCsv = (value: string) =>
  value.split(",").map((s) => s.trim()).filter(Boolean)

export default function CreateProductPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get("edit")
  const isEdit = Boolean(editId)

  const { data: session, status } = useSession()
  const [form, setForm] = useState<FormState>(initialFormState)
  const [imageSlots, setImageSlots] = useState<string[]>([...EMPTY_IMAGE_SLOTS])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const photoInputRef = useRef<HTMLInputElement | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingEdit, setIsLoadingEdit] = useState(isEdit)
  const [error, setError] = useState("")
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [brands, setBrands] = useState<BrandOption[]>([])

  const rootCategories = useMemo(() => getRootCategories(categories), [categories])
  const selectedRootCategory = useMemo(
    () => (form.parentCategoryId ? findCategoryById(categories, form.parentCategoryId) : null),
    [categories, form.parentCategoryId],
  )
  const availableSubcategories = useMemo(
    () => (form.parentCategoryId ? getSubcategories(categories, form.parentCategoryId) : []),
    [categories, form.parentCategoryId],
  )
  const selectedCategoryName = useMemo(() => {
    const finalId = form.subcategoryId || form.parentCategoryId
    return finalId ? (findCategoryById(categories, finalId)?.name ?? "") : ""
  }, [categories, form.subcategoryId, form.parentCategoryId])
  const isShoesCategory = useMemo(
    () => selectedCategoryName.toLowerCase().includes("shoe"),
    [selectedCategoryName],
  )
  const isGlassesCategory = useMemo(
    () =>
      selectedCategoryName.toLowerCase().includes("glass") ||
      selectedCategoryName.toLowerCase().includes("spectacle") ||
      selectedCategoryName.toLowerCase().includes("sunglass"),
    [selectedCategoryName],
  )
  const isAllZimbabwe = form.availabilityScope === "ALL_ZIMBABWE"

  useEffect(() => {
    const load = async () => {
      const [catRes, brandRes] = await Promise.all([fetch("/api/categories"), fetch("/api/brands")])
      if (catRes.ok) setCategories(await catRes.json())
      if (brandRes.ok) setBrands(await brandRes.json())
    }
    void load()
  }, [])

  useEffect(() => {
    if (!editId) return
    const loadProduct = async () => {
      setIsLoadingEdit(true)
      try {
        const res = await fetch(`/api/products/${editId}`)
        if (!res.ok) { setError("Product not found"); return }
        const product = await res.json()
        const parentCategoryId = product.category?.parentId
          ? product.category.parentId
          : product.category?.id || ""
        const subcategoryId = product.category?.parentId ? product.category.id : ""
        setForm({
          name: product.name || "",
          description: product.description || "",
          price: product.price?.toString() || "",
          sku: product.sku || "",
          stock: product.stock?.toString() || "0",
          condition: product.condition || "GOOD",
          brand: product.brand || product.brandRef?.name || "",
          brandId: product.brandRef?.id || product.brandId || "",
          categoryId: product.categoryId || "",
          categoryName: product.category?.name || "",
          parentCategoryId,
          subcategoryId,
          deliveryMethods: product.deliveryMethods?.length ? product.deliveryMethods : ["PUBLIC_MEETUP"],
          availabilityScope: product.availabilityScope === "ALL_ZIMBABWE" ? "ALL_ZIMBABWE" : "LOCAL",
          region: product.region || "",
          province: product.province || "",
          town: product.town || "",
          city: product.city || "",
          sizes: (product.sizes || []).join(", "),
          colors: (product.colors || []).join(", "),
          shades: (product.shades || []).join(", "),
          material: product.material || "",
        })
        if (product.imageUrls?.length) {
          const slots = [...EMPTY_IMAGE_SLOTS]
          ;(product.imageUrls as string[]).forEach((url, i) => { if (i < slots.length) slots[i] = url })
          setImageSlots(slots)
        }
      } catch {
        setError("Failed to load product")
      } finally {
        setIsLoadingEdit(false)
      }
    }
    void loadProduct()
  }, [editId])

  const handleFormChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const toggleDeliveryMethod = (value: string) => {
    setForm((prev) => ({
      ...prev,
      deliveryMethods: prev.deliveryMethods.includes(value)
        ? prev.deliveryMethods.filter((m) => m !== value)
        : [...prev.deliveryMethods, value],
    }))
  }

  const handlePhotoFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploadingPhotos(true)
    const remaining = EMPTY_IMAGE_SLOTS.length - imageSlots.filter(Boolean).length
    const toUpload = Array.from(files).slice(0, remaining)
    const uploaded: string[] = []
    for (const file of toUpload) {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("folder", "products")
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd })
        const data = await res.json()
        if (res.ok && data.url) uploaded.push(data.url)
      } catch { /* skip */ }
    }
    if (uploaded.length > 0) {
      setImageSlots((prev) => {
        const next = [...prev]
        let insertAt = 0
        for (const url of uploaded) {
          while (insertAt < next.length && next[insertAt]) insertAt++
          if (insertAt < next.length) next[insertAt] = url
        }
        return next
      })
    }
    setUploadingPhotos(false)
  }

  const handleSubmit = async (statusValue: "DRAFT" | "PUBLISHED") => {
    if (!form.name || !form.description || !form.price || !form.sku) {
      setError("Please fill in name, description, price, and SKU")
      return
    }
    setIsSubmitting(true)
    setError("")
    try {
      const body = {
        name: form.name,
        description: form.description,
        price: Number(form.price),
        sku: form.sku,
        stock: Number(form.stock || "0"),
        condition: form.condition,
        brandId: form.brandId || undefined,
        brand: form.brand || undefined,
        categoryId: form.subcategoryId || form.parentCategoryId || undefined,
        categoryName: form.categoryName || undefined,
        deliveryMethods: form.deliveryMethods,
        availabilityScope: form.availabilityScope,
        region: isAllZimbabwe ? "" : form.region,
        province: isAllZimbabwe ? "" : form.province,
        town: isAllZimbabwe ? "" : form.town,
        city: isAllZimbabwe ? "" : form.city,
        sizes: parseCsv(form.sizes),
        colors: parseCsv(form.colors),
        shades: parseCsv(form.shades),
        material: form.material || undefined,
        imageUrls: imageSlots.map((u) => u.trim()).filter(Boolean),
        status: statusValue,
      }
      const url = isEdit ? `/api/products/${editId}` : "/api/products"
      const method = isEdit ? "PUT" : "POST"
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `Failed to ${isEdit ? "update" : "create"} product`)
      }
      router.push("/myproducts")
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <section className="max-w-3xl mx-auto w-full px-6 py-10 flex-1">Loading...</section>
        <Footer />
      </main>
    )
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <section className="max-w-3xl mx-auto w-full px-6 py-10 flex-1">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h1 className="text-xl font-semibold text-gray-950">Login required</h1>
            <p className="mt-2 text-sm text-gray-600">Please login to create a product listing.</p>
            <Link href="/login" className="mt-4 inline-flex items-center rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition">
              Go to Login
            </Link>
          </div>
        </section>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <section className="max-w-3xl mx-auto w-full px-6 py-8 flex-1">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-950">{isEdit ? "Edit Product" : "Create Product"}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {isEdit ? "Update your product listing." : "Add a new product to your store."}
            </p>
          </div>
          <Link
            href="/myproducts"
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            My Products
          </Link>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {isLoadingEdit ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Loading product...</div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex flex-col gap-3">

              {/* Photos */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-2 block">
                  Product Photos <span className="text-gray-400 font-normal">(up to {EMPTY_IMAGE_SLOTS.length})</span>
                </label>
                {imageSlots.some(Boolean) && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {imageSlots.map((slot, index) =>
                      slot ? (
                        <div key={index} className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 shrink-0">
                          <Image src={slot} alt={`Photo ${index + 1}`} fill className="object-cover" sizes="64px" />
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...imageSlots]
                              next[index] = ""
                              setImageSlots(next)
                            }}
                            className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-black text-white rounded-full w-4 h-4 flex items-center justify-center"
                            title="Remove"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : null
                    )}
                  </div>
                )}
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={(e) => { void handlePhotoFiles(e.target.files); e.target.value = "" }}
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadingPhotos || imageSlots.filter(Boolean).length >= EMPTY_IMAGE_SLOTS.length}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-xl text-sm text-gray-600 hover:border-gray-500 hover:text-gray-900 transition disabled:opacity-50"
                >
                  {uploadingPhotos ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" /></svg>
                      Uploading…
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4" />
                      Add Photos
                    </>
                  )}
                </button>
              </div>

              {/* Name */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Product Name</label>
                <input
                  value={form.name}
                  onChange={(e) => handleFormChange("name", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black text-sm"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => handleFormChange("description", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl min-h-20 focus:outline-none focus:ring-2 focus:ring-black text-sm resize-none"
                />
              </div>

              {/* Price + Stock */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => handleFormChange("price", e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Stock</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.stock}
                    onChange={(e) => handleFormChange("stock", e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black text-sm"
                  />
                </div>
              </div>

              {/* SKU */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">SKU</label>
                <input
                  value={form.sku}
                  onChange={(e) => handleFormChange("sku", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black text-sm"
                />
              </div>

              {/* Category + Brand */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Category</label>
                  <select
                    value={form.parentCategoryId}
                    onChange={(e) => {
                      const nextId = e.target.value
                      const selectedCat = nextId ? findCategoryById(categories, nextId) : null
                      handleFormChange("parentCategoryId", nextId)
                      handleFormChange("subcategoryId", "")
                      handleFormChange("categoryId", nextId)
                      handleFormChange("categoryName", selectedCat?.name || "")
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black bg-white text-sm"
                  >
                    <option value="">Category</option>
                    {rootCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Brand</label>
                  <select
                    value={form.brandId}
                    onChange={(e) => {
                      const nextBrandId = e.target.value
                      const selectedBrand = brands.find((b) => b.id === nextBrandId)
                      handleFormChange("brandId", nextBrandId)
                      handleFormChange("brand", selectedBrand?.name || "")
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black bg-white text-sm"
                  >
                    <option value="">Brand</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subcategory */}
              {selectedRootCategory && availableSubcategories.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Subcategory</label>
                  <select
                    value={form.subcategoryId}
                    onChange={(e) => {
                      const nextSubId = e.target.value
                      const selectedSub = nextSubId ? findCategoryById(categories, nextSubId) : null
                      handleFormChange("subcategoryId", nextSubId)
                      handleFormChange("categoryId", nextSubId || form.parentCategoryId)
                      handleFormChange("categoryName", selectedSub?.name || selectedRootCategory?.name || "")
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black bg-white text-sm"
                  >
                    <option value="">Subcategory (optional)</option>
                    {availableSubcategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Condition + Delivery */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Condition</label>
                  <select
                    value={form.condition}
                    onChange={(e) => handleFormChange("condition", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black bg-white text-sm"
                  >
                    <option value="NEW">New</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Delivery Methods</label>
                  <div className="flex flex-col gap-1.5 border border-gray-300 rounded-xl p-3">
                    {DELIVERY_OPTIONS.map((opt) => (
                      <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.deliveryMethods.includes(opt.value)}
                          onChange={() => toggleDeliveryMethod(opt.value)}
                          className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Availability */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Availability</label>
                <select
                  value={form.availabilityScope}
                  onChange={(e) => handleFormChange("availabilityScope", e.target.value as "LOCAL" | "ALL_ZIMBABWE")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black bg-white text-sm"
                >
                  <option value="LOCAL">Specific area</option>
                  <option value="ALL_ZIMBABWE">All over Zimbabwe</option>
                </select>
              </div>

              {/* Location fields (conditional) */}
              {!isAllZimbabwe && (
                <div className="grid grid-cols-2 gap-3">
                  <input value={form.region} onChange={(e) => handleFormChange("region", e.target.value)} placeholder="Region" className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black text-sm" />
                  <input value={form.province} onChange={(e) => handleFormChange("province", e.target.value)} placeholder="Province" className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black text-sm" />
                  <input value={form.town} onChange={(e) => handleFormChange("town", e.target.value)} placeholder="Town" className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black text-sm" />
                  <input value={form.city} onChange={(e) => handleFormChange("city", e.target.value)} placeholder="City" className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black text-sm" />
                </div>
              )}

              {/* Shoes-specific */}
              {isShoesCategory && (
                <div className="grid grid-cols-2 gap-3">
                  <input value={form.sizes} onChange={(e) => handleFormChange("sizes", e.target.value)} placeholder="Shoe sizes (e.g. 6, 7, 8)" className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black text-sm" />
                  <input value={form.colors} onChange={(e) => handleFormChange("colors", e.target.value)} placeholder="Colors (e.g. Black, White)" className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black text-sm" />
                </div>
              )}

              {/* Glasses-specific */}
              {isGlassesCategory && (
                <div className="grid grid-cols-2 gap-3">
                  <input value={form.shades} onChange={(e) => handleFormChange("shades", e.target.value)} placeholder="Shades (e.g. Light, Dark)" className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black text-sm" />
                  <input value={form.colors} onChange={(e) => handleFormChange("colors", e.target.value)} placeholder="Frame colors" className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black text-sm" />
                </div>
              )}

              {/* Material (shoes/glasses) */}
              {(isShoesCategory || isGlassesCategory) && (
                <input value={form.material} onChange={(e) => handleFormChange("material", e.target.value)} placeholder="Material" className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black text-sm" />
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => handleSubmit("PUBLISHED")}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-black text-white rounded-xl hover:bg-gray-800 transition disabled:opacity-50 text-sm font-medium"
                >
                  {isSubmitting ? "Saving..." : isEdit ? "Update Product" : "Save & Publish"}
                </button>
                <Link
                  href="/myproducts"
                  className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-100 transition text-sm text-center"
                >
                  Cancel
                </Link>
              </div>
              {!isEdit && (
                <button
                  type="button"
                  onClick={() => handleSubmit("DRAFT")}
                  disabled={isSubmitting}
                  className="w-full py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition disabled:opacity-50 text-sm text-gray-600"
                >
                  Save as Draft
                </button>
              )}

            </div>
          </div>
        )}
      </section>

      <Footer />
    </main>
  )
}
