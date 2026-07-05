import { PrismaClient } from "@/app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
	throw new Error("Missing DATABASE_URL environment variable")
}

if (
	databaseUrl.includes("<DB_USER>") ||
	databaseUrl.includes("<DB_PASSWORD>")
) {
	throw new Error("DATABASE_URL still contains placeholder credentials")
}

const adapter = new PrismaPg(new Pool({ connectionString: databaseUrl }))

const globalForPrisma = global as unknown as { prisma: PrismaClient }

const existingClient = globalForPrisma.prisma as PrismaClient | undefined
const orderItemFields =
  ((existingClient as any)?._runtimeDataModel?.models?.OrderItem?.fields as Array<{ name?: string }> | undefined) || []
const hasExpectedOrderItemFields = ["status", "trackingNumber", "estimatedDelivery"].every((fieldName) =>
  orderItemFields.some((field) => field?.name === fieldName)
)
const hasExpectedDelegates =
	existingClient &&
	typeof (existingClient as any).product !== "undefined" &&
	typeof (existingClient as any).brand !== "undefined" &&
	typeof (existingClient as any).order !== "undefined" &&
	typeof (existingClient as any).orderItem !== "undefined" &&
	typeof (existingClient as any).category !== "undefined" &&
	typeof (existingClient as any).conversation !== "undefined" &&
	typeof (existingClient as any).message !== "undefined" &&
	typeof (existingClient as any).productOffer !== "undefined" &&
	typeof (existingClient as any).productPromoCode !== "undefined" &&
	typeof (existingClient as any).notification !== "undefined" &&
	typeof (existingClient as any).supportConversation !== "undefined" &&
	typeof (existingClient as any).supportMessage !== "undefined" &&
	typeof (existingClient as any).productRequestConversation !== "undefined" &&
	typeof (existingClient as any).productRequestMessage !== "undefined" &&
	typeof (existingClient as any).accessRequest !== "undefined" &&
	hasExpectedOrderItemFields

if (existingClient && !hasExpectedDelegates) {
	void existingClient.$disconnect().catch(() => undefined)
}

const prisma = hasExpectedDelegates ? existingClient : new PrismaClient({ adapter })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export default prisma
