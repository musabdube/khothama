import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

// GET: List all access grants (admin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const grants = await prisma.requestPageAccess.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { grantedAt: "desc" },
    })

    return NextResponse.json(grants)
  } catch {
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

// POST: Grant access to a user (admin only)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const body = await request.json()
    const { userId, durationHours } = body

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    const hours = Number(durationHours)
    if (!hours || hours < 1 || hours > 8760) {
      return NextResponse.json({ error: "durationHours must be between 1 and 8760 (1 year)" }, { status: 400 })
    }

    // Check user exists and is not admin
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    if (user.role === "ADMIN") {
      return NextResponse.json({ error: "Admins already have access" }, { status: 400 })
    }

    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000)

    const grant = await prisma.requestPageAccess.upsert({
      where: { userId },
      update: { expiresAt, grantedAt: new Date() },
      create: { userId, expiresAt },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    })

    return NextResponse.json(grant, { status: 201 })
  } catch {
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
