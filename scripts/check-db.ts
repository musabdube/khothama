import prisma from "../lib/prisma"

async function main() {
  const [products, orders] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
  ])

  console.log("OK products=", products, "orders=", orders)
}

main()
  .catch((error) => {
    console.error("CHECK_DB_ERROR", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
