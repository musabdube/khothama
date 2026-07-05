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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const existingCategory = await prisma.category.findUnique({ where: { id } })
    if (!existingCategory) {
      return new NextResponse("Category not found", { status: 404 })
    }

    const nextParentId = body?.parentId !== undefined ? normalizeParentId(body.parentId) : existingCategory.parentId

    if (nextParentId === id) {
      return new NextResponse("A category cannot be its own parent", { status: 400 })
    }

    if (nextParentId) {
      const parentCategory = await prisma.category.findUnique({
        where: { id: nextParentId },
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

    const nextName = body?.name?.trim() || existingCategory.name
    const requestedSlug = body?.slug?.trim()
    const nextSlug = requestedSlug
      ? slugify(requestedSlug)
      : body?.name?.trim()
      ? slugify(body.name)
      : existingCategory.slug

    const slugCollision = await prisma.category.findFirst({
      where: {
        slug: nextSlug,
        id: { not: id },
      },
    })

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: nextName,
        slug: slugCollision ? `${nextSlug}-${Date.now()}` : nextSlug,
        description: body?.description !== undefined ? body.description?.trim() || null : existingCategory.description,
        image: body?.image !== undefined ? body.image?.trim() || null : existingCategory.image,
        parentId: nextParentId,
        isActive: body?.isActive !== undefined ? Boolean(body.isActive) : existingCategory.isActive,
        sortOrder:
          body?.sortOrder !== undefined && Number.isFinite(Number(body.sortOrder))
            ? Number(body.sortOrder)
            : existingCategory.sortOrder,
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
    console.error("CATEGORIES_PUT_ERROR", error)
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

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const { id } = await params

    const existingCategory = await prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: {
            children: true,
            products: true,
          },
        },
      },
    })
    if (!existingCategory) {
      return new NextResponse("Category not found", { status: 404 })
    }

    if (existingCategory._count.children > 0) {
      return new NextResponse("Delete subcategories first", { status: 400 })
    }

    if (existingCategory._count.products > 0) {
      return new NextResponse("This category still has products assigned", { status: 400 })
    }

    await prisma.category.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("CATEGORIES_DELETE_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
