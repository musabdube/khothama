import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { formatCategoryPath } from "@/lib/categories"

type SalesByProduct = {
  unitsSold: number
  revenue: number
}

type CategoryStat = {
  id: string | null
  name: string
  views: number
  unitsSold: number
  revenue: number
  productCount: number
}

const UNCATEGORIZED_KEY = "uncategorized"
const UNCATEGORIZED_NAME = "Uncategorized"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const [products, orderItems] = await Promise.all([
      prisma.product.findMany({
        select: {
          id: true,
          name: true,
          popularity: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              parentId: true,
              parent: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  parentId: true,
                },
              },
            },
          },
        },
      }),
      prisma.orderItem.findMany({
        where: {
          order: {
            status: {
              notIn: ["CANCELLED", "REFUNDED"],
            },
          },
        },
        select: {
          productId: true,
          quantity: true,
          total: true,
          product: {
            select: {
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  parentId: true,
                  parent: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                      parentId: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ])

    const salesByProduct = new Map<string, SalesByProduct>()
    const categoryStats = new Map<string, CategoryStat>()

    for (const product of products) {
      const categoryKey = product.category?.id || UNCATEGORIZED_KEY
      const existing =
        categoryStats.get(categoryKey) ||
        {
          id: product.category?.id || null,
          name: formatCategoryPath(product.category) || UNCATEGORIZED_NAME,
          views: 0,
          unitsSold: 0,
          revenue: 0,
          productCount: 0,
        }

      existing.views += product.popularity
      existing.productCount += 1

      categoryStats.set(categoryKey, existing)
    }

    for (const item of orderItems) {
      const productSales = salesByProduct.get(item.productId) || { unitsSold: 0, revenue: 0 }
      productSales.unitsSold += item.quantity
      productSales.revenue += item.total
      salesByProduct.set(item.productId, productSales)

      const categoryKey = item.product.category?.id || UNCATEGORIZED_KEY
      const existingCategory =
        categoryStats.get(categoryKey) ||
        {
          id: item.product.category?.id || null,
          name: formatCategoryPath(item.product.category) || UNCATEGORIZED_NAME,
          views: 0,
          unitsSold: 0,
          revenue: 0,
          productCount: 0,
        }

      existingCategory.unitsSold += item.quantity
      existingCategory.revenue += item.total
      categoryStats.set(categoryKey, existingCategory)
    }

    const topProducts = products
      .map((product) => {
        const sales = salesByProduct.get(product.id) || { unitsSold: 0, revenue: 0 }

        return {
          id: product.id,
          name: product.name,
          views: product.popularity,
          unitsSold: sales.unitsSold,
          revenue: sales.revenue,
          categoryName: formatCategoryPath(product.category) || UNCATEGORIZED_NAME,
        }
      })
      .sort((a, b) => {
        if (b.views !== a.views) return b.views - a.views
        if (b.unitsSold !== a.unitsSold) return b.unitsSold - a.unitsSold
        return b.revenue - a.revenue
      })
      .slice(0, 10)

    const popularCategories = Array.from(categoryStats.values())
      .sort((a, b) => {
        if (b.unitsSold !== a.unitsSold) return b.unitsSold - a.unitsSold
        if (b.views !== a.views) return b.views - a.views
        return b.revenue - a.revenue
      })
      .slice(0, 8)

    const totalViews = products.reduce((sum, product) => sum + product.popularity, 0)
    const totalUnitsSold = Array.from(salesByProduct.values()).reduce((sum, item) => sum + item.unitsSold, 0)
    const totalRevenue = Array.from(salesByProduct.values()).reduce((sum, item) => sum + item.revenue, 0)

    return NextResponse.json({
      overview: {
        totalViews,
        totalUnitsSold,
        totalRevenue,
      },
      topProducts,
      popularCategories,
    })
  } catch (error) {
    console.error("ADMIN_ANALYTICS_GET_ERROR", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}