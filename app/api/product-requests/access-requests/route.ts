import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

// GET: List all access requests (admin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const accessRequests = await prisma.accessRequest.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(accessRequests)
  } catch {
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
