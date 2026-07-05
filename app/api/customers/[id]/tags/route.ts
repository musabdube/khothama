import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

async function ensureAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { error: new NextResponse("Unauthorized", { status: 401 }) }
  }

  if (session.user.role !== "ADMIN") {
    return { error: new NextResponse("Forbidden", { status: 403 }) }
  }

  return { session }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await ensureAdmin()
    if (auth.error) return auth.error

    const { id } = await params
    const body = await request.json()
    const tagName = typeof body?.tagName === "string" ? body.tagName.trim() : ""

    if (!tagName) {
      return new NextResponse("Tag name is required", { status: 400 })
    }

    const customer = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    })

    if (!customer || customer.role !== "USER") {
      return new NextResponse("Customer not found", { status: 404 })
    }

    const existingTag = await prisma.userTag.findFirst({
      where: { name: { equals: tagName, mode: "insensitive" } },
      select: { id: true, name: true },
    })

    await prisma.user.update({
      where: { id },
      data: {
        tags: existingTag
          ? {
              connect: { id: existingTag.id },
            }
          : {
              create: { name: tagName },
            },
      },
    })

    const updatedTags = await prisma.user.findUnique({
      where: { id },
      select: {
        tags: {
          select: {
            id: true,
            name: true,
            color: true,
          },
          orderBy: { name: "asc" },
        },
      },
    })

    return NextResponse.json(updatedTags?.tags || [])
  } catch (error) {
    console.error("CUSTOMER_TAG_POST_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await ensureAdmin()
    if (auth.error) return auth.error

    const { id } = await params
    const body = await request.json()
    const tagId = typeof body?.tagId === "string" ? body.tagId.trim() : ""

    if (!tagId) {
      return new NextResponse("Tag id is required", { status: 400 })
    }

    const customer = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    })

    if (!customer || customer.role !== "USER") {
      return new NextResponse("Customer not found", { status: 404 })
    }

    await prisma.user.update({
      where: { id },
      data: {
        tags: {
          disconnect: { id: tagId },
        },
      },
    })

    const updatedTags = await prisma.user.findUnique({
      where: { id },
      select: {
        tags: {
          select: {
            id: true,
            name: true,
            color: true,
          },
          orderBy: { name: "asc" },
        },
      },
    })

    return NextResponse.json(updatedTags?.tags || [])
  } catch (error) {
    console.error("CUSTOMER_TAG_DELETE_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
