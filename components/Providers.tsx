"use client"

import { SessionProvider } from "next-auth/react"
import CookieConsentBanner from "@/components/CookieConsentBanner"

interface ProvidersProps {
  children: React.ReactNode
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      {children}
      <CookieConsentBanner />
    </SessionProvider>
  )
}
