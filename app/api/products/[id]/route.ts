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
const APPROVED_TAG = "approval:approved"

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

function setTag(tags: string[], prefix: string, value: string) {
  const filtered = tags.filter((tag) => !tag.startsWith(prefix))
  return [...filtered, `${prefix}${value}`]
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

  return undefined
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    const product = await prisma.product.findUnique({
      where: { id },
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
        promoCodes: {
          where: {
            isActive: true,
            startsAt: { lte: new Date() },
            OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
          },
          select: {
            id: true,
            code: true,
            type: true,
            value: true,
            endsAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        images: {
          select: { url: true, sortOrder: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    })

    if (!product) {
      return new NextResponse("Product not found", { status: 404 })
    }

    const approvalStatus = getApprovalStatus(product.tags)
    const pendingPublish = getPendingPublish(product.tags)
    const isPublishedForPublic =
      product.status === "PUBLISHED" && (approvalStatus === "APPROVED" || product.tags.includes(APPROVED_TAG))
    const isOwner = Boolean(session?.user?.id && product.sellerId === session.user.id)
    const isAdmin = session?.user?.role === "ADMIN"

    if (!isPublishedForPublic && !isOwner && !isAdmin) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    let currentPopularity = product.popularity
    if (isPublishedForPublic && !isOwner && !isAdmin) {
      const viewedProduct = await prisma.product.update({
        where: { id: product.id },
        data: {
          popularity: {
            increment: 1,
          },
        },
        select: {
          popularity: true,
        },
      })

      currentPopularity = viewedProduct.popularity
    }

    const imageUrls = [
      ...product.images.map((image) => image.url),
      ...(product.image ? [product.image] : []),
    ].filter(Boolean)

    const deliveryMethods = getStoredDeliveryMethods(product.tags)

    return NextResponse.json({
      ...product,
      popularity: currentPopularity,
      approvalStatus,
      pendingPublish,
      condition: getTagValue(product.tags, CONDITION_PREFIX),
      availabilityScope: getTagValue(product.tags, AVAILABILITY_SCOPE_PREFIX) || "LOCAL",
      city: getTagValue(product.tags, CITY_PREFIX),
      town: getTagValue(product.tags, TOWN_PREFIX),
      province: getTagValue(product.tags, PROVINCE_PREFIX),
      region: getTagValue(product.tags, REGION_PREFIX),
      deliveryMethod: deliveryMethods[0] || null,
      deliveryMethods,
      imageUrls: [...new Set(imageUrls)],
    })
  } catch (error) {
    console.error("PRODUCT_GET_BY_ID_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const isAdmin = session.user.role === "ADMIN"

    const existingProduct = await prisma.product.findUnique({ where: { id } })
    if (!existingProduct) {
      return new NextResponse("Product not found", { status: 404 })
    }

    const ownsProduct = existingProduct.sellerId === session.user.id
    if (!isAdmin && !ownsProduct) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const data: Record<string, unknown> = {}

    if (body.name !== undefined) data.name = body.name
    if (body.description !== undefined) data.description = body.description
    if (body.price !== undefined) {
      const parsedPrice = Number(body.price)
      if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
        return new NextResponse("Invalid price", { status: 400 })
      }
      data.price = parsedPrice
    }
    if (body.salePrice !== undefined) {
      const parsedSalePrice = Number(body.salePrice)
      if (Number.isNaN(parsedSalePrice) || parsedSalePrice < 0) {
        return new NextResponse("Invalid sale price", { status: 400 })
      }
      data.salePrice = parsedSalePrice
    }
    if (body.stock !== undefined) {
      const parsedStock = Number(body.stock)
      if (Number.isNaN(parsedStock) || parsedStock < 0) {
        return new NextResponse("Invalid stock", { status: 400 })
      }
      data.stock = parsedStock
    }
    if (body.sku !== undefined) data.sku = body.sku
    if (body.colors !== undefined) data.colors = Array.isArray(body.colors) ? body.colors : []
    if (body.sizes !== undefined) data.sizes = Array.isArray(body.sizes) ? body.sizes : []
    if (body.shades !== undefined) data.shades = Array.isArray(body.shades) ? body.shades : []
    if (body.material !== undefined) data.material = body.material || null

    if (body.brandId !== undefined || body.brand !== undefined) {
      const resolvedBrand = await resolveBrand(body.brandId, body.brand)
      data.brandId = resolvedBrand?.id || null
      data.brand =
        resolvedBrand?.name ||
        (typeof body.brand === "string" ? body.brand.trim() || null : null)
    }

    if (body.categoryId !== undefined || body.categoryName !== undefined) {
      const resolvedCategoryId = await resolveCategoryId(body.categoryId, body.categoryName)
      if (resolvedCategoryId) {
        data.categoryId = resolvedCategoryId
      }
    }

    const requestedStatus = body.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT"
    const imageUrls = body.imageUrls !== undefined ? parseImageUrls(body.imageUrls) : null
    const wasPendingPublish = getPendingPublish(existingProduct.tags)

    let tags = Array.isArray(existingProduct.tags) ? [...existingProduct.tags] : []

    if (isAdmin) {
      data.status = requestedStatus
      tags = setTag(tags, APPROVAL_PREFIX, "approved")
      tags = setTag(tags, PENDING_PUBLISH_PREFIX, "false")
    } else {
      data.status = "DRAFT"
      tags = setTag(tags, APPROVAL_PREFIX, "pending")
      tags = setTag(tags, PENDING_PUBLISH_PREFIX, requestedStatus === "PUBLISHED" ? "true" : "false")
    }

    if (body.condition !== undefined) {
      tags = setTag(tags, CONDITION_PREFIX, (body.condition || "GOOD").toString().toUpperCase())
    }

    if (body.city !== undefined) {
      tags = setTag(tags, CITY_PREFIX, (body.city || "").toString().trim())
    }

    if (body.town !== undefined) {
      tags = setTag(tags, TOWN_PREFIX, (body.town || "").toString().trim())
    }

    if (body.province !== undefined) {
      tags = setTag(tags, PROVINCE_PREFIX, (body.province || "").toString().trim())
    }

    if (body.region !== undefined) {
      tags = setTag(tags, REGION_PREFIX, (body.region || "").toString().trim())
    }

    if (
      body.availabilityScope !== undefined ||
      body.allInZimbabwe !== undefined
    ) {
      const availabilityScope = getAvailabilityScope(body as Record<string, unknown>)
      tags = setTag(tags, AVAILABILITY_SCOPE_PREFIX, availabilityScope)

      if (availabilityScope === "ALL_ZIMBABWE") {
        tags = setTag(tags, CITY_PREFIX, "")
        tags = setTag(tags, TOWN_PREFIX, "")
        tags = setTag(tags, PROVINCE_PREFIX, "")
        tags = setTag(tags, REGION_PREFIX, "")
      }
    }

    if (body.deliveryMethod !== undefined || body.deliveryMethods !== undefined) {
      tags = setTag(tags, DELIVERY_PREFIX, getDeliveryMethods(body as Record<string, unknown>).join(","))
    }

    data.tags = tags

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        ...data,
        ...(imageUrls
          ? {
              images: {
                deleteMany: {},
                create: imageUrls.map((url, index) => ({
                  url,
                  isPrimary: index === 0,
                  sortOrder: index,
                })),
              },
            }
          : {}),
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

    const isNowPendingPublish = getPendingPublish(updatedProduct.tags)
    if (!isAdmin && !wasPendingPublish && isNowPendingPublish) {
      await createAdminNotification({
        type: "ADMIN_NEW_PRODUCT",
        title: "Product pending approval",
        message: `${session.user.email} submitted ${updatedProduct.name} for publishing.`,
        link: "/admin/dashboard",
      })
    }

    const deliveryMethods = getStoredDeliveryMethods(updatedProduct.tags)

    return NextResponse.json({
      ...updatedProduct,
      approvalStatus: getApprovalStatus(updatedProduct.tags),
      pendingPublish: getPendingPublish(updatedProduct.tags),
      condition: getTagValue(updatedProduct.tags, CONDITION_PREFIX),
      availabilityScope: getTagValue(updatedProduct.tags, AVAILABILITY_SCOPE_PREFIX) || "LOCAL",
      city: getTagValue(updatedProduct.tags, CITY_PREFIX),
      town: getTagValue(updatedProduct.tags, TOWN_PREFIX),
      province: getTagValue(updatedProduct.tags, PROVINCE_PREFIX),
      region: getTagValue(updatedProduct.tags, REGION_PREFIX),
      deliveryMethod: deliveryMethods[0] || null,
      deliveryMethods,
      imageUrls: updatedProduct.images.map((image) => image.url),
    })
  } catch (error) {
    console.error("PRODUCT_UPDATE_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { id } = await params
    const isAdmin = session.user.role === "ADMIN"

    const existingProduct = await prisma.product.findUnique({ where: { id } })
    if (!existingProduct) {
      return new NextResponse("Product not found", { status: 404 })
    }

    const ownsProduct = existingProduct.sellerId === session.user.id
    if (!isAdmin && !ownsProduct) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    await prisma.product.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("PRODUCT_DELETE_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
