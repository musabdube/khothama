"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import AdminSidebar from "@/components/admin/AdminSidebar"
import { formatCategoryPath, getRootCategories } from "@/lib/categories"
import { Eye, Pencil, Trash2 } from "lucide-react"
import ImageUpload from "@/components/ImageUpload"

type CategoryRow = {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  parentId: string | null
  sortOrder: number
  isActive: boolean
  parent?: {
    id: string
    name: string
    slug: string
    parentId: string | null
  } | null
}

type FormState = {
  name: string
  slug: string
  description: string
  image: string
  parentId: string
  sortOrder: string
  isActive: boolean
}

const initialFormState: FormState = {
  name: "",
  slug: "",
  description: "",
  image: "",
  parentId: "",
  sortOrder: "0",
  isActive: true,
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export default function AdminCategoriesPage() {
  const { data: session, status: sessionStatus } = useSession()
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [form, setForm] = useState<FormState>(initialFormState)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  const loadCategories = async () => {
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/categories?includeInactive=true")
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to load categories")
      }

      const data: CategoryRow[] = await response.json()
      setCategories(data)
    } catch (fetchError: unknown) {
      setError(getErrorMessage(fetchError, "Failed to load categories"))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      loadCategories()
    }

    if (sessionStatus === "unauthenticated") {
      setIsLoading(false)
    }
  }, [sessionStatus])

  const resetForm = () => {
    setForm(initialFormState)
    setEditingId(null)
  }

  const handleChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  const handleEdit = (category: CategoryRow) => {
    setEditingId(category.id)
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      image: category.image || "",
      parentId: category.parentId || "",
      sortOrder: String(category.sortOrder),
      isActive: category.isActive,
    })
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError("Category name is required")
      return
    }

    setIsSaving(true)
    setError("")

    try {
      const payload = {
        name: form.name,
        slug: form.slug,
        description: form.description,
        image: form.image,
        parentId: form.parentId || null,
        sortOrder: Number(form.sortOrder || "0"),
        isActive: form.isActive,
      }

      const response = await fetch(editingId ? `/api/categories/${editingId}` : "/api/categories", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to save category")
      }

      resetForm()
      await loadCategories()
    } catch (saveError: unknown) {
      setError(getErrorMessage(saveError, "Failed to save category"))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setError("")

    try {
      const response = await fetch(`/api/categories/${id}`, { method: "DELETE" })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to delete category")
      }

      if (editingId === id) {
        resetForm()
      }

      await loadCategories()
    } catch (deleteError: unknown) {
      setError(getErrorMessage(deleteError, "Failed to delete category"))
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

  const rootCategories = getRootCategories(categories).filter((category) => category.id !== editingId)

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <Header adminDashboardMode />

      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-6">
          <AdminSidebar active="categories" />

          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Admin Categories</h1>
              <p className="text-gray-600">Create root categories and one level of subcategories.</p>
            </div>

            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{editingId ? "Edit Category" : "Add Category"}</h2>

              <div className="grid md:grid-cols-2 gap-4">
                <input
                  value={form.name}
                  onChange={(event) => handleChange("name", event.target.value)}
                  placeholder="Category name"
                  className="px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                />
                <input
                  value={form.slug}
                  onChange={(event) => handleChange("slug", event.target.value)}
                  placeholder="Slug (optional)"
                  className="px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                />
                <select
                  value={form.parentId}
                  onChange={(event) => handleChange("parentId", event.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black bg-white"
                >
                  <option value="">Root category</option>
                  {rootCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <div className="md:col-span-2">
                  <ImageUpload
                    value={form.image}
                    onChange={(url) => handleChange("image", url)}
                    folder="categories"
                    label="Upload Category Image"
                  />
                </div>
                <textarea
                  value={form.description}
                  onChange={(event) => handleChange("description", event.target.value)}
                  placeholder="Description"
                  className="md:col-span-2 px-4 py-2.5 border border-gray-300 rounded-xl min-h-24 focus:outline-none focus:ring-2 focus:ring-black"
                />
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) => handleChange("sortOrder", event.target.value)}
                  placeholder="Sort order"
                  className="px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                />
                <label className="inline-flex items-center gap-2 px-2">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) => handleChange("isActive", event.target.checked)}
                  />
                  <span className="text-sm">Active category</span>
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className="px-4 py-2.5 bg-black text-white rounded-xl hover:bg-gray-800 transition disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : editingId ? "Update Category" : "Create Category"}
                </button>
                {editingId && (
                  <button
                    onClick={resetForm}
                    className="px-4 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-100 transition"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left bg-gray-50">
                      <th className="p-4 font-semibold">Category</th>
                      <th className="p-4 font-semibold">Type</th>
                      <th className="p-4 font-semibold">Picture</th>
                      <th className="p-4 font-semibold">Slug</th>
                      <th className="p-4 font-semibold">Order</th>
                      <th className="p-4 font-semibold">Status</th>
                      <th className="p-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-gray-500">
                          Loading categories...
                        </td>
                      </tr>
                    ) : categories.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-gray-500">
                          No categories found.
                        </td>
                      </tr>
                    ) : (
                      categories.map((category) => (
                        <tr key={category.id} className="border-b border-gray-100 last:border-b-0 align-top">
                          <td className="p-4">
                            <div className="font-semibold">{category.name}</div>
                            <div className="text-xs text-gray-500">{formatCategoryPath(category) || category.name}</div>
                            <div className="text-xs text-gray-500">{category.description || "No description"}</div>
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                category.parentId ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-700"
                              }`}
                            >
                              {category.parentId ? "Subcategory" : "Root"}
                            </span>
                            <div className="mt-2 text-xs text-gray-500">
                              {category.parent ? `Parent: ${category.parent.name}` : "Top-level category"}
                            </div>
                          </td>
                          <td className="p-4">
                            {category.image ? (
                              <img src={category.image} alt={category.name} className="h-14 w-14 rounded-lg object-cover border border-gray-200" />
                            ) : (
                              <div className="h-14 w-14 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 flex items-center justify-center text-xs">
                                No image
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-gray-600">{category.slug}</td>
                          <td className="p-4 text-gray-600">{category.sortOrder}</td>
                          <td className="p-4">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                category.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"
                              }`}
                            >
                              {category.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1">
                              <Link
                                href={`/categories/${category.slug}`}
                                title="View"
                                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                              <button
                                onClick={() => handleEdit(category)}
                                title="Edit"
                                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(category.id)}
                                title="Delete"
                                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
                              >
                                <Trash2 className="w-4 h-4" />
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
