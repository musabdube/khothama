import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; offerId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { id: productId, offerId } = await params
    const body = await request.json()

    const decision =
      body?.decision === "ACCEPTED"
        ? "ACCEPTED"
        : body?.decision === "REJECTED"
        ? "REJECTED"
        : null

    if (!decision) {
      return new NextResponse("Invalid decision", { status: 400 })
    }

    const sellerNote = typeof body?.sellerNote === "string" ? body.sellerNote.trim() : ""

    if (sellerNote.length > 1000) {
      return new NextResponse("Seller note is too long", { status: 400 })
    }

    const existingOffer = await prisma.productOffer.findFirst({
      where: {
        id: offerId,
        productId,
      },
      select: {
        id: true,
        status: true,
        sellerId: true,
      },
    })

    if (!existingOffer) {
      return new NextResponse("Offer not found", { status: 404 })
    }

    const isAdmin = session.user.role === "ADMIN"
    const isSeller = existingOffer.sellerId === session.user.id

    if (!isAdmin && !isSeller) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    if (existingOffer.status !== "PENDING") {
      return new NextResponse("Offer already processed", { status: 409 })
    }

    const updatedOffer = await prisma.productOffer.update({
      where: { id: existingOffer.id },
      data: {
        status: decision,
        sellerNote: sellerNote || null,
        respondedAt: new Date(),
      },
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(updatedOffer)
  } catch (error) {
    console.error("PRODUCT_OFFER_DECISION_PATCH_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
