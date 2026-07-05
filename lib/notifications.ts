import prisma from "@/lib/prisma"

export type AppNotificationType =
  | "OFFER_RECEIVED"
  | "ORDER_RECEIVED"
  | "ADMIN_NEW_PRODUCT"
  | "ADMIN_FLAGGED_PRODUCT"

type NotificationInput = {
  recipientId: string | null | undefined
  type: AppNotificationType
  title: string
  message: string
  link?: string | null
}

type AdminNotificationInput = {
  type: AppNotificationType
  title: string
  message: string
  link?: string | null
}

export async function createNotification(input: NotificationInput) {
  const recipientId = input.recipientId?.trim()
  if (!recipientId) return

  try {
    await prisma.notification.create({
      data: {
        recipientId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link || null,
      },
    })
  } catch (error) {
    console.error("NOTIFICATION_CREATE_ERROR", error)
  }
}

export async function createAdminNotification(input: AdminNotificationInput) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    })

    if (admins.length === 0) return

    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        recipientId: admin.id,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link || null,
      })),
    })
  } catch (error) {
    console.error("ADMIN_NOTIFICATION_CREATE_ERROR", error)
  }
}
