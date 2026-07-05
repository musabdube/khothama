import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { productId } = await params

    await prisma.wishlistItem.deleteMany({
      where: {
        userId: session.user.id,
        productId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("WISHLIST_DELETE_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
