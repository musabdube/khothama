import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { createAdminNotification } from "@/lib/notifications"

const APPROVAL_PREFIX = "approval:"
const PENDING_PUBLISH_PREFIX = "pendingPublish:"
const CONDITION_PREFIX = "condition:"
const CITY_PREFIX = "city:"
const TOWN_PREFIX = "town:"
const PROVINCE_PREFIX = "province:"
const REGION_PREFIX = "region:"
const AVAILABILITY_SCOPE_PREFIX = "availabilityScope:"
const DELIVERY_PREFIX = "delivery:"

const ALLOWED_DELIVERY_METHODS = new Set([
  "PUBLIC_MEETUP",
  "DOOR_PICKUP",
  "DOOR_TO_DOOR_DROPOFF",
  "PICKUP_FROM_SELLER",
])

function parseDeliveryMethods(value: unknown) {
  const normalized = (Array.isArray(value) ? value : [value])
    .flatMap((item) => (typeof item === "string" ? item.split(",") : []))
    .map((item) => item.trim().toUpperCase())
    .filter((item) => ALLOWED_DELIVERY_METHODS.has(item))

  return [...new Set(normalized)]
}

function getStoredDeliveryMethods(tags: string[]) {
  const storedValue = getTagValue(tags, DELIVERY_PREFIX)
  const deliveryMethods = parseDeliveryMethods(storedValue)
  return deliveryMethods.length > 0 ? deliveryMethods : ["PUBLIC_MEETUP"]
}

function getDeliveryMethods(body: Record<string, unknown>) {
  const deliveryMethods = parseDeliveryMethods(body.deliveryMethods ?? body.deliveryMethod)
  return deliveryMethods.length > 0 ? deliveryMethods : ["PUBLIC_MEETUP"]
}

function getApprovalStatus(tags: string[]) {
  const approvalTag = tags.find((tag) => tag.startsWith(APPROVAL_PREFIX))
  const value = approvalTag?.slice(APPROVAL_PREFIX.length)?.toUpperCase()

  if (value === "APPROVED" || value === "REJECTED") {
    return value
  }

  return "PENDING"
}

function getPendingPublish(tags: string[]) {
  const tag = tags.find((item) => item.startsWith(PENDING_PUBLISH_PREFIX))
  return tag?.slice(PENDING_PUBLISH_PREFIX.length) === "true"
}

function setTag(tags: string[], prefix: string, value: string) {
  const filtered = tags.filter((tag) => !tag.startsWith(prefix))
  return [...filtered, `${prefix}${value}`]
}

function getTagValue(tags: string[], prefix: string) {
  const tag = tags.find((item) => item.startsWith(prefix))
  return tag ? tag.slice(prefix.length) : null
}

function getAvailabilityScope(body: Record<string, unknown>) {
  if (body.allInZimbabwe === true) {
    return "ALL_ZIMBABWE"
  }

  const requestedScope = (body.availabilityScope || "").toString().trim().toUpperCase()
  if (requestedScope === "ALL_ZIMBABWE") {
    return "ALL_ZIMBABWE"
  }

  return "LOCAL"
}

function parseImageUrls(imageUrls: unknown) {
  if (!Array.isArray(imageUrls)) return []

  const cleaned = imageUrls
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)

  return [...new Set(cleaned)]
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

async function resolveBrand(brandId?: string, brandName?: string) {
  const normalizedBrandId = typeof brandId === "string" ? brandId.trim() : ""
  if (normalizedBrandId) {
    const existingBrand = await prisma.brand.findUnique({
      where: { id: normalizedBrandId },
      select: {
        id: true,
        name: true,
      },
    })

    if (existingBrand) {
      return existingBrand
    }
  }

  const normalizedBrandName = typeof brandName === "string" ? brandName.trim() : ""
  if (!normalizedBrandName) {
    return null
  }

  const brandSlug = slugify(normalizedBrandName)
  const existingBrandBySlug = await prisma.brand.findUnique({
    where: { slug: brandSlug },
    select: {
      id: true,
      name: true,
    },
  })

  if (existingBrandBySlug) {
    return existingBrandBySlug
  }

  const createdBrand = await prisma.brand.create({
    data: {
      name: normalizedBrandName,
      slug: brandSlug || `brand-${Date.now()}`,
    },
    select: {
      id: true,
      name: true,
    },
  })

  return createdBrand
}

async function resolveCategoryFilter(slug?: string | null) {
  const normalizedSlug = slug?.trim().toLowerCase()
  if (!normalizedSlug) {
    return undefined
  }

  const category = await prisma.category.findUnique({
    where: { slug: normalizedSlug },
    select: {
      id: true,
      parentId: true,
    },
  })

  if (!category) {
    return {
      category: {
        slug: "__missing_category__",
      },
    }
  }

  if (category.parentId) {
    return {
      categoryId: category.id,
    }
  }

  return {
    OR: [
      { categoryId: category.id },
      {
        category: {
          parentId: category.id,
        },
      },
    ],
  }
}

async function resolveCategoryId(categoryId?: string, categoryName?: string) {
  if (categoryId) {
    const existing = await prisma.category.findUnique({ where: { id: categoryId } })
    if (existing) return existing.id
  }

  if (categoryName?.trim()) {
    const trimmedCategoryName = categoryName.trim()
    const categorySlug = slugify(trimmedCategoryName)

    const existingBySlug = await prisma.category.findUnique({ where: { slug: categorySlug } })
    if (existingBySlug) return existingBySlug.id

    const createdCategory = await prisma.category.create({
      data: {
        name: trimmedCategoryName,
        slug: categorySlug || `category-${Date.now()}`,
      },
    })

    return createdCategory.id
  }

  const firstCategory = await prisma.category.findFirst({ orderBy: { createdAt: "asc" } })
  if (firstCategory) return firstCategory.id

  const fallback = await prisma.category.create({
    data: {
      name: "General",
      slug: `general-${Date.now()}`,
      description: "Auto-generated category",
    },
  })

  return fallback.id
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")?.trim()
    const category = searchParams.get("category")?.trim().toLowerCase()
    const isAdmin = session.user.role === "ADMIN"
    const filters: Record<string, unknown>[] = []

    if (query) {
      filters.push({
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { sku: { contains: query, mode: "insensitive" } },
          { slug: { contains: query, mode: "insensitive" } },
        ],
      })
    }

    const categoryFilter = await resolveCategoryFilter(category)
    if (categoryFilter) {
      filters.push(categoryFilter)
    }

    if (!isAdmin) {
      filters.push({ sellerId: session.user.id })
    }

    const products = await prisma.product.findMany({
      where: filters.length > 0 ? { AND: filters } : undefined,
      orderBy: { updatedAt: "desc" },
      include: {
        seller: { select: { id: true, name: true, email: true } },
        brandRef: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            parentId: true,
            parent: {
              select: {
                id: true,
                name: true,
                slug: true,
                parentId: true,
              },
            },
          },
        },
        images: {
          select: { url: true, sortOrder: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      take: 100,
    })

    const payload = products.map((product) => {
      const deliveryMethods = getStoredDeliveryMethods(product.tags)

      return {
        ...product,
        approvalStatus: getApprovalStatus(product.tags),
        pendingPublish: getPendingPublish(product.tags),
        condition: getTagValue(product.tags, CONDITION_PREFIX),
        availabilityScope: getTagValue(product.tags, AVAILABILITY_SCOPE_PREFIX) || "LOCAL",
        city: getTagValue(product.tags, CITY_PREFIX),
        town: getTagValue(product.tags, TOWN_PREFIX),
        province: getTagValue(product.tags, PROVINCE_PREFIX),
        region: getTagValue(product.tags, REGION_PREFIX),
        deliveryMethod: deliveryMethods[0] || null,
        deliveryMethods,
        imageUrls: product.images.map((image) => image.url),
      }
    })

    return NextResponse.json(payload)
  } catch (error) {
    console.error("PRODUCTS_GET_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await request.json()

    if (!body?.name || !body?.description || !body?.sku || body?.price === undefined) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    const price = Number(body.price)
    if (Number.isNaN(price) || price < 0) {
      return new NextResponse("Invalid price", { status: 400 })
    }

    const stock = body.stock !== undefined ? Number(body.stock) : 0
    if (Number.isNaN(stock) || stock < 0) {
      return new NextResponse("Invalid stock", { status: 400 })
    }

    const isAdmin = session.user.role === "ADMIN"
    const requestedStatus = body.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT"
    const finalStatus = isAdmin ? requestedStatus : "DRAFT"
    const categoryId = await resolveCategoryId(body.categoryId, body.categoryName)
    const resolvedBrand = await resolveBrand(body.brandId, body.brand)

    let tags: string[] = Array.isArray(body.tags)
      ? body.tags.filter((value: unknown) => typeof value === "string")
      : []

    if (isAdmin) {
      tags = setTag(tags, APPROVAL_PREFIX, "approved")
      tags = setTag(tags, PENDING_PUBLISH_PREFIX, "false")
    } else {
      tags = setTag(tags, APPROVAL_PREFIX, "pending")
      tags = setTag(tags, PENDING_PUBLISH_PREFIX, requestedStatus === "PUBLISHED" ? "true" : "false")
    }

    const availabilityScope = getAvailabilityScope(body as Record<string, unknown>)

    tags = setTag(tags, CONDITION_PREFIX, (body.condition || "GOOD").toString().toUpperCase())
    tags = setTag(tags, AVAILABILITY_SCOPE_PREFIX, availabilityScope)
    tags = setTag(tags, CITY_PREFIX, availabilityScope === "ALL_ZIMBABWE" ? "" : (body.city || "").toString().trim())
    tags = setTag(tags, TOWN_PREFIX, availabilityScope === "ALL_ZIMBABWE" ? "" : (body.town || "").toString().trim())
    tags = setTag(tags, PROVINCE_PREFIX, availabilityScope === "ALL_ZIMBABWE" ? "" : (body.province || "").toString().trim())
    tags = setTag(tags, REGION_PREFIX, availabilityScope === "ALL_ZIMBABWE" ? "" : (body.region || "").toString().trim())
    tags = setTag(tags, DELIVERY_PREFIX, getDeliveryMethods(body as Record<string, unknown>).join(","))

    const imageUrls = parseImageUrls(body.imageUrls)

    const baseSlug = slugify(body.name)
    const slug = `${baseSlug || "product"}-${Math.random().toString(36).slice(2, 8)}`

    const product = await prisma.product.create({
      data: {
        name: body.name,
        description: body.description,
        price,
        sku: body.sku,
        slug,
        status: finalStatus,
        stock,
        categoryId,
        brandId: resolvedBrand?.id || null,
        sellerId: session.user.id,
        salePrice: body.salePrice !== undefined ? Number(body.salePrice) : null,
        weight: body.weight !== undefined ? Number(body.weight) : null,
        dimensions: body.dimensions ?? null,
        brand: resolvedBrand?.name || (typeof body.brand === "string" ? body.brand.trim() || null : null),
        material: body.material ?? null,
        fabric: body.fabric ?? null,
        skinType: Array.isArray(body.skinType) ? body.skinType : [],
        colors: Array.isArray(body.colors) ? body.colors : [],
        sizes: Array.isArray(body.sizes) ? body.sizes : [],
        shades: Array.isArray(body.shades) ? body.shades : [],
        ingredients: Array.isArray(body.ingredients) ? body.ingredients : [],
        usageTips: Array.isArray(body.usageTips) ? body.usageTips : [],
        tags,
        images: imageUrls.length
          ? {
              create: imageUrls.map((url, index) => ({
                url,
                isPrimary: index === 0,
                sortOrder: index,
              })),
            }
          : undefined,
      },
      include: {
        seller: { select: { id: true, name: true, email: true } },
        brandRef: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            parentId: true,
            parent: {
              select: {
                id: true,
                name: true,
                slug: true,
                parentId: true,
              },
            },
          },
        },
        images: {
          select: { url: true, sortOrder: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    })

    if (!isAdmin && getPendingPublish(product.tags)) {
      await createAdminNotification({
        type: "ADMIN_NEW_PRODUCT",
        title: "New product pending approval",
        message: `${session.user.email} submitted ${product.name} for publishing.`,
        link: "/admin/dashboard",
      })
    }

    const deliveryMethods = getStoredDeliveryMethods(product.tags)

    return NextResponse.json({
      ...product,
      approvalStatus: getApprovalStatus(product.tags),
      pendingPublish: getPendingPublish(product.tags),
      condition: getTagValue(product.tags, CONDITION_PREFIX),
      availabilityScope: getTagValue(product.tags, AVAILABILITY_SCOPE_PREFIX) || "LOCAL",
      city: getTagValue(product.tags, CITY_PREFIX),
      town: getTagValue(product.tags, TOWN_PREFIX),
      province: getTagValue(product.tags, PROVINCE_PREFIX),
      region: getTagValue(product.tags, REGION_PREFIX),
      deliveryMethod: deliveryMethods[0] || null,
      deliveryMethods,
      imageUrls: product.images.map((image) => image.url),
    })
  } catch (error) {
    console.error("PRODUCTS_POST_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
