import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

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

    const brands = await prisma.brand.findMany({
      where: includeInactive ? undefined : { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        sortOrder: true,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: 200,
    })

    return NextResponse.json(brands)
  } catch (error) {
    console.error("BRANDS_GET_ERROR", error)
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

    if (!name) {
      return new NextResponse("Brand name is required", { status: 400 })
    }

    const requestedSlug = body?.slug?.trim()
    const baseSlug = requestedSlug ? slugify(requestedSlug) : slugify(name)
    const finalSlug = baseSlug || `brand-${Date.now()}`

    const existingBrand = await prisma.brand.findUnique({ where: { slug: finalSlug } })

    const brand = await prisma.brand.create({
      data: {
        name,
        slug: existingBrand ? `${finalSlug}-${Date.now()}` : finalSlug,
        isActive: body?.isActive ?? true,
        sortOrder: Number.isFinite(Number(body?.sortOrder)) ? Number(body.sortOrder) : 0,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        sortOrder: true,
      },
    })

    return NextResponse.json(brand)
  } catch (error) {
    console.error("BRANDS_POST_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
