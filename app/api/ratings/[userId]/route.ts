import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params

  const ratings = await prisma.userRating.findMany({
    where: { ratedId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      rater: {
        select: { id: true, name: true, email: true, avatar: true, image: true },
      },
      offer: {
        select: {
          product: { select: { id: true, name: true } },
        },
      },
    },
  })

  const total = ratings.length
  const average =
    total === 0
      ? null
      : Math.round((ratings.reduce((sum, r) => sum + r.rating, 0) / total) * 10) / 10

  return NextResponse.json({ average, total, ratings })
}
