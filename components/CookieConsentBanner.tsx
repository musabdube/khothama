"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

const CONSENT_KEY = "khothama_cookie_consent"

type ConsentState = "accepted" | "declined" | null

export default function CookieConsentBanner() {
  const [consent, setConsent] = useState<ConsentState>("accepted") // start hidden to avoid flash

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY) as ConsentState | null
    setConsent(stored)
  }, [])

  function handleAccept() {
    localStorage.setItem(CONSENT_KEY, "accepted")
    setConsent("accepted")
  }

  function handleDecline() {
    localStorage.setItem(CONSENT_KEY, "declined")
    setConsent("declined")
  }

  // Only show the banner when consent has not been given yet
  if (consent !== null) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie and terms acceptance"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 shadow-xl backdrop-blur-sm"
    >
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Text */}
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">
              We use cookies &amp; require your agreement to our terms
            </p>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              By continuing to use Khothama you accept our{" "}
              <Link
                href="/privacy-policy"
                className="font-medium text-sky-600 underline-offset-2 hover:underline"
              >
                Privacy Policy
              </Link>
              {" "}and{" "}
              <Link
                href="/terms"
                className="font-medium text-sky-600 underline-offset-2 hover:underline"
              >
                Terms of Use
              </Link>
              . We use essential cookies to keep you signed in, remember
              preferences and keep the marketplace running securely. No
              personal data is sold to third parties.
            </p>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              onClick={handleDecline}
              className="rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-sky-500"
            >
              Decline non-essential
            </button>
            <button
              onClick={handleAccept}
              className="rounded-full bg-sky-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-sky-500"
            >
              Accept all &amp; continue
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
