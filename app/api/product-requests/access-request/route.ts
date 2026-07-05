import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

// GET: Get the current user's access request status
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const accessRequest = await prisma.accessRequest.findUnique({
      where: { userId: session.user.id },
      select: { id: true, status: true, createdAt: true },
    })

    return NextResponse.json({ accessRequest })
  } catch {
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

// POST: Submit a new access request
export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (session.user.role === "ADMIN") {
      return NextResponse.json({ error: "Admins already have access" }, { status: 400 })
    }

    // Check if an active or pending request already exists
    const existing = await prisma.accessRequest.findUnique({
      where: { userId: session.user.id },
    })

    if (existing?.status === "PENDING") {
      return NextResponse.json({ error: "You already have a pending request" }, { status: 409 })
    }

    // Upsert: create new or reset a previously rejected request
    const accessRequest = await prisma.accessRequest.upsert({
      where: { userId: session.user.id },
      update: { status: "PENDING" },
      create: { userId: session.user.id, status: "PENDING" },
      select: { id: true, status: true, createdAt: true },
    })

    return NextResponse.json({ accessRequest }, { status: 201 })
  } catch {
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
