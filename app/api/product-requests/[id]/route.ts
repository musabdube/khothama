import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { id } = await params

    const productRequest = await prisma.productRequest.findUnique({
      where: { id },
    })

    if (!productRequest) {
      return new NextResponse("Not Found", { status: 404 })
    }

    // Only the owner or admin can delete
    if (productRequest.userId !== session.user.id && session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 })
    }

    await prisma.productRequest.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch {
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
