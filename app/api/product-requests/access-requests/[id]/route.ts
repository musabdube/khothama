import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

// POST: Approve or reject an access request (admin only)
// Body: { action: "approve" | "reject", durationHours?: number }
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { action, durationHours = 720 } = body

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 })
    }

    const accessRequest = await prisma.accessRequest.findUnique({ where: { id } })
    if (!accessRequest) {
      return NextResponse.json({ error: "Access request not found" }, { status: 404 })
    }

    if (action === "approve") {
      const hours = Number(durationHours)
      if (!hours || hours < 1 || hours > 8760) {
        return NextResponse.json({ error: "durationHours must be between 1 and 8760" }, { status: 400 })
      }

      const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000)

      // Grant access and mark request as approved in parallel
      await Promise.all([
        prisma.requestPageAccess.upsert({
          where: { userId: accessRequest.userId },
          update: { expiresAt, grantedAt: new Date() },
          create: { userId: accessRequest.userId, expiresAt },
        }),
        prisma.accessRequest.update({
          where: { id },
          data: { status: "APPROVED" },
        }),
      ])
    } else {
      await prisma.accessRequest.update({
        where: { id },
        data: { status: "REJECTED" },
      })
    }

    return NextResponse.json({ success: true })
  } catch {
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
