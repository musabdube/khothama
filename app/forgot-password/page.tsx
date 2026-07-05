"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2, Mail, CheckCircle } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Something went wrong")
      }

      setSent(true)
    } catch (err: any) {
      setError(err.message ?? "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 sm:p-8">
        {sent ? (
          <div className="text-center py-4">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-14 w-14 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your inbox</h1>
            <p className="text-gray-700 text-sm leading-relaxed">
              If an account exists for <span className="font-semibold text-gray-900">{email}</span>,
              you&apos;ll receive a password reset link shortly. The link expires in 1 hour.
            </p>
            <p className="mt-3 text-xs text-gray-500">
              Didn&apos;t get it? Check your spam folder or{" "}
              <button
                onClick={() => { setSent(false); setEmail("") }}
                className="text-gray-700 font-medium hover:underline"
              >
                try again
              </button>
              .
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block text-sm text-gray-700 hover:text-black font-medium"
            >
              ← Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-7">
              <div className="flex justify-center mb-4">
                <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <Mail className="h-6 w-6 text-gray-700" />
                </div>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Forgot password?</h1>
              <p className="text-gray-700 text-sm">
                Enter your email and we&apos;ll send you a reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm font-medium border border-red-200">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="your@email.com"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-black text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLoading ? "Sending…" : "Send reset link"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/login" className="text-sm text-gray-700 hover:text-black font-medium">
                ← Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
