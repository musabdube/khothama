"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token") ?? ""

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  if (!token) {
    return (
      <div className="text-center py-4">
        <p className="text-red-700 font-medium">Invalid or missing reset token.</p>
        <Link href="/forgot-password" className="mt-4 inline-block text-sm text-gray-700 hover:text-black font-medium">
          Request a new link →
        </Link>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }
    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? "Something went wrong")
      }

      setSuccess(true)
      setTimeout(() => router.push("/login"), 2500)
    } catch (err: any) {
      setError(err.message ?? "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="flex justify-center mb-4">
          <ShieldCheck className="h-14 w-14 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Password updated!</h2>
        <p className="text-gray-700 text-sm">Your password has been changed. Redirecting you to sign in…</p>
        <Link href="/login" className="mt-5 inline-block text-sm text-gray-700 hover:text-black font-medium">
          Sign in now →
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="text-center mb-7">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Set new password</h1>
        <p className="text-gray-700 text-sm">Choose a strong password for your account.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm font-medium border border-red-200">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-2">
            New password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 pr-11 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Min. 6 characters"
              minLength={6}
              required
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-gray-900 mb-2">
            Confirm password
          </label>
          <div className="relative">
            <input
              id="confirm"
              type={showConfirm ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-4 py-3 pr-11 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Repeat your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-black text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLoading ? "Updating…" : "Update password"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link href="/login" className="text-sm text-gray-700 hover:text-black font-medium">
          ← Back to sign in
        </Link>
      </div>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 sm:p-8">
        <Suspense fallback={
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  )
}
