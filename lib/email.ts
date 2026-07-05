import nodemailer from "nodemailer"

function createTransport() {
  const host = process.env.EMAIL_SERVER_HOST
  const port = Number(process.env.EMAIL_SERVER_PORT ?? 587)
  const user = process.env.EMAIL_SERVER_USER
  const pass = process.env.EMAIL_SERVER_PASS

  if (!host || !user || !pass) {
    // Dev fallback — logs to console instead of sending
    return null
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const from = process.env.EMAIL_FROM ?? "Khothama <no-reply@khothama.com>"
  const transport = createTransport()

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:12px;border:1px solid #e5e7eb">
      <h2 style="margin:0 0 8px;font-size:22px;color:#111827">Reset your password</h2>
      <p style="margin:0 0 24px;color:#374151;font-size:15px">
        We received a request to reset your Khothama account password.
        Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.
      </p>
      <a href="${resetUrl}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:15px;font-weight:600">
        Reset Password
      </a>
      <p style="margin:24px 0 0;color:#6b7280;font-size:13px">
        If you didn't request this, you can safely ignore this email — your password won't change.
      </p>
      <p style="margin:8px 0 0;color:#9ca3af;font-size:12px">
        Link: <a href="${resetUrl}" style="color:#6b7280">${resetUrl}</a>
      </p>
    </div>
  `

  if (!transport) {
    // Dev mode — print to console
    console.log("\n[DEV] Password reset link for", to, "→", resetUrl, "\n")
    return
  }

  await transport.sendMail({ from, to, subject: "Reset your Khothama password", html })
}
