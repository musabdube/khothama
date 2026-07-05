import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

// Returns all product requests, but only if the user is admin or has valid access
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const isAdmin = session.user.role === "ADMIN"

    if (!isAdmin) {
      const access = await prisma.requestPageAccess.findUnique({
        where: { userId: session.user.id },
      })

      if (!access || access.expiresAt < new Date()) {
        return NextResponse.json({ hasAccess: false, requests: [] }, { status: 403 })
      }
    }

    const requests = await prisma.productRequest.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ hasAccess: true, requests })
  } catch {
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
