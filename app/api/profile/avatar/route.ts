import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { avatar?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const avatar = typeof body.avatar === "string" ? body.avatar.trim() : null

  // If a non-empty URL is provided, do a basic URL format check
  if (avatar) {
    try {
      new URL(avatar)
    } catch {
      return NextResponse.json({ error: "Invalid avatar URL" }, { status: 400 })
    }
  }

  const updated = await prisma.user.update({
    where: { email: session.user.email },
    data: { avatar: avatar || null, image: avatar || null },
    select: { id: true, avatar: true, image: true },
  })

  return NextResponse.json({ avatar: updated.avatar, image: updated.image })
}
