import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import prisma from "@/lib/prisma"
import { sendPasswordResetEmail } from "@/lib/email"

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const normalised = email.trim().toLowerCase()

    // Always return success to avoid user enumeration
    const user = await prisma.user.findUnique({ where: { email: normalised } })

    if (user) {
      // Generate a secure random token
      const rawToken = crypto.randomBytes(32).toString("hex")
      const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex")
      const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: hashedToken,
          passwordResetExpiry: expiry,
        },
      })

      const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
      const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`

      await sendPasswordResetEmail(normalised, resetUrl)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[forgot-password]", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
