import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 })
  }

  const { offerId, rating, comment } = body as {
    offerId?: unknown
    rating?: unknown
    comment?: unknown
  }

  if (typeof offerId !== "string" || !offerId.trim()) {
    return new NextResponse("offerId is required", { status: 400 })
  }

  const ratingValue = Number(rating)
  if (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5) {
    return new NextResponse("rating must be an integer between 1 and 5", { status: 400 })
  }

  const commentValue =
    typeof comment === "string" && comment.trim() ? comment.trim() : null

  // Load the offer and verify it was accepted and the current user was involved
  const offer = await prisma.productOffer.findUnique({
    where: { id: offerId.trim() },
    include: { rating: true },
  })

  if (!offer) {
    return new NextResponse("Offer not found", { status: 404 })
  }

  if (offer.status !== "ACCEPTED") {
    return new NextResponse("Can only rate after an offer is accepted", { status: 422 })
  }

  const userId = session.user.id
  if (offer.buyerId !== userId && offer.sellerId !== userId) {
    return new NextResponse("You are not part of this offer", { status: 403 })
  }

  if (offer.rating) {
    return new NextResponse("You have already rated this transaction", { status: 409 })
  }

  // The rater rates the counterpart
  const ratedId = offer.buyerId === userId ? offer.sellerId : offer.buyerId

  const newRating = await prisma.userRating.create({
    data: {
      raterId: userId,
      ratedId,
      offerId: offer.id,
      rating: ratingValue,
      comment: commentValue,
    },
  })

  return NextResponse.json(newRating, { status: 201 })
}
