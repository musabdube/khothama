import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const isAdmin = session.user.role === "ADMIN"

    // Admin sees all requests; regular users only see their own
    const requests = await prisma.productRequest.findMany({
      where: isAdmin ? undefined : { userId: session.user.id },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(requests)
  } catch {
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await request.json()
    const { name, description, image, category, budget } = body

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 })
    }
    if (!description || typeof description !== "string" || !description.trim()) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 })
    }

    const productRequest = await prisma.productRequest.create({
      data: {
        name: name.trim(),
        description: description.trim(),
        image: typeof image === "string" && image.trim() ? image.trim() : null,
        category: typeof category === "string" && category.trim() ? category.trim() : null,
        budget: typeof budget === "string" && budget.trim() ? budget.trim() : null,
        userId: session.user.id,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    })

    return NextResponse.json(productRequest, { status: 201 })
  } catch {
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
