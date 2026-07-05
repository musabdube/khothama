import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

// DELETE: Revoke access for a user (admin only)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const { id } = await params

    const grant = await prisma.requestPageAccess.findUnique({ where: { id } })
    if (!grant) {
      return new NextResponse("Not Found", { status: 404 })
    }

    await prisma.requestPageAccess.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch {
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
