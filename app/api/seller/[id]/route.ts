import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const seller = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      image: true,
      createdAt: true,
    },
  })

  if (!seller) {
    return new NextResponse("Seller not found", { status: 404 })
  }

  const products = await prisma.product.findMany({
    where: {
      sellerId: id,
      status: "PUBLISHED",
      tags: { has: "approval:approved" },
    },
    orderBy: { popularity: "desc" },
    select: {
      id: true,
      name: true,
      price: true,
      images: {
        select: { url: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
        take: 1,
      },
      category: {
        select: { id: true, name: true, slug: true },
      },
    },
  })

  const ratings = await prisma.userRating.findMany({
    where: { ratedId: id },
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

  const ratingTotal = ratings.length
  const ratingAverage =
    ratingTotal === 0
      ? null
      : Math.round((ratings.reduce((sum, r) => sum + r.rating, 0) / ratingTotal) * 10) / 10

  const mappedProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    imageUrl: p.images[0]?.url ?? null,
    category: p.category,
  }))

  return NextResponse.json({
    seller: {
      id: seller.id,
      name: seller.name,
      email: seller.email,
      avatar: seller.avatar ?? seller.image ?? null,
      memberSince: seller.createdAt,
    },
    products: mappedProducts,
    ratings: {
      average: ratingAverage,
      total: ratingTotal,
      reviews: ratings.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        rater: {
          id: r.rater.id,
          name: r.rater.name,
          email: r.rater.email,
          avatar: r.rater.avatar ?? r.rater.image ?? null,
        },
        product: r.offer?.product ?? null,
      })),
    },
  })
}
