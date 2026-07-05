import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

function normalizeParentId(value: unknown) {
  if (typeof value !== "string") return null

  const trimmed = value.trim()
  return trimmed || null
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get("includeInactive") === "true"

    if (includeInactive && session?.user?.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const categories = await prisma.category.findMany({
      where: includeInactive ? undefined : { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        parentId: true,
        sortOrder: true,
        isActive: true,
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
            parentId: true,
          },
        },
        children: {
          where: includeInactive ? undefined : { isActive: true },
          select: {
            id: true,
            name: true,
            slug: true,
            parentId: true,
            isActive: true,
            sortOrder: true,
          },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error("CATEGORIES_GET_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const body = await request.json()
    const name = body?.name?.trim()
    const parentId = normalizeParentId(body?.parentId)

    if (!name) {
      return new NextResponse("Category name is required", { status: 400 })
    }

    if (parentId) {
      const parentCategory = await prisma.category.findUnique({
        where: { id: parentId },
        select: {
          id: true,
          parentId: true,
        },
      })

      if (!parentCategory) {
        return new NextResponse("Parent category not found", { status: 404 })
      }

      if (parentCategory.parentId) {
        return new NextResponse("Only one level of subcategories is supported", { status: 400 })
      }
    }

    const requestedSlug = body?.slug?.trim()
    const baseSlug = requestedSlug ? slugify(requestedSlug) : slugify(name)
    const finalSlug = baseSlug || `category-${Date.now()}`

    const existingCategory = await prisma.category.findUnique({ where: { slug: finalSlug } })

    const category = await prisma.category.create({
      data: {
        name,
        slug: existingCategory ? `${finalSlug}-${Date.now()}` : finalSlug,
        description: body?.description?.trim() || null,
        image: body?.image?.trim() || null,
        parentId,
        isActive: body?.isActive ?? true,
        sortOrder: Number.isFinite(Number(body?.sortOrder)) ? Number(body.sortOrder) : 0,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        parentId: true,
        sortOrder: true,
        isActive: true,
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
            parentId: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
            parentId: true,
            isActive: true,
            sortOrder: true,
          },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
      },
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error("CATEGORIES_POST_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
