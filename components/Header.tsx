"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import {
  User,
  LogOut,
  Heart,
  MessageCircle,
  LogIn,
  Store,
  HandCoins,
  Search,
  Package,
  ShoppingBag,
  ClipboardList,
  LayoutGrid,
} from "lucide-react"
import NotificationBell from "@/components/NotificationBell"

type UnreadMessagesPayload = {
  unreadCount: number
}

const MESSAGE_BADGE_POLL_INTERVAL_MS = 5000

type HeaderProps = {
  adminDashboardMode?: boolean
}

export default function Header({ adminDashboardMode: _adminDashboardMode }: HeaderProps) {
  const { data: session, status } = useSession()
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)

  useEffect(() => {
    if (status !== "authenticated") {
      setUnreadMessageCount(0)
      return
    }

    let isActive = true

    const loadUnreadMessages = async () => {
      if (document.visibilityState !== "visible") {
        return
      }

      try {
        const response = await fetch("/api/messages/unread", { cache: "no-store" })
        if (!response.ok) {
          return
        }

        const payload: UnreadMessagesPayload = await response.json()
        if (isActive) {
          setUnreadMessageCount(payload.unreadCount)
        }
      } catch {
        // Keep the header usable even if unread polling fails.
      }
    }

    void loadUnreadMessages()

    const interval = window.setInterval(() => {
      void loadUnreadMessages()
    }, MESSAGE_BADGE_POLL_INTERVAL_MS)

    return () => {
      isActive = false
      window.clearInterval(interval)
    }
  }, [status])

  return (
    <header className="sticky top-0 z-1000 isolate bg-white border-b border-gray-200" style={{ zIndex: 1000 }}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image
            src="/khothama.png"
            alt="Khothama"
            width={210}
            height={60}
            className="h-15 w-auto object-contain"
            priority
          />
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {session && (
            <Link href="/myshop" className="inline-flex items-center gap-1.5 text-gray-600 hover:text-black">
              <Store className="w-4 h-4" />
              <span>My Shop</span>
            </Link>
          )}
          {session && (
            <Link href="/offers" className="inline-flex items-center gap-1.5 text-gray-600 hover:text-black">
              <HandCoins className="w-4 h-4" />
              <span>My Offers</span>
            </Link>
          )}
          {session && (
            <Link href="/request-product" className="inline-flex items-center gap-1.5 text-gray-600 hover:text-black">
              <Search className="w-4 h-4" />
              <span>Request Product</span>
            </Link>
          )}
          <Link href="/wishlist" className="inline-flex items-center gap-1.5 text-gray-600 hover:text-black">
            <Heart className="w-4 h-4" />
            <span>Wishlist</span>
          </Link>
          <Link href="/messages" className="relative inline-flex items-center gap-1.5 text-gray-600 hover:text-black">
            <MessageCircle className="w-4 h-4" />
            <span>Messages</span>
            {unreadMessageCount > 0 && (
              <span className="absolute -top-2 -right-3 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[10px] font-semibold flex items-center justify-center">
                {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
              </span>
            )}
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {status === "loading" ? (
            <div className="text-gray-400 text-xs sm:text-sm">Loading...</div>
          ) : session ? (
            <>
              <NotificationBell />
              <details className="relative z-1100" style={{ zIndex: 1100 }}>
                <summary className="list-none inline-flex items-center gap-1 sm:gap-2 bg-black text-white px-2 sm:px-3 py-1.5 rounded-xl hover:bg-gray-800 transition cursor-pointer text-xs sm:text-sm [&::-webkit-details-marker]:hidden">
                  <span className="hidden sm:inline max-w-25 truncate">{session.user?.name?.split(" ")[0] ?? "Profile"}</span>
                  {session.user?.image ? (
                    <Image
                      src={session.user.image}
                      alt={session.user.name ?? "Profile"}
                      width={28}
                      height={28}
                      className="w-7 h-7 rounded-full object-cover ring-2 ring-white"
                    />
                  ) : (
                    <span className="w-7 h-7 rounded-full bg-gray-600 flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </span>
                  )}
                </summary>

                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl py-1 z-1200" style={{ zIndex: 1200 }}>
                  {session.user?.name && (
                    <div className="px-4 py-2.5 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-900 truncate">{session.user.name}</p>
                      <p className="text-xs text-gray-400 truncate">{session.user.email}</p>
                    </div>
                  )}
                  <Link
                    href="/dashboard"
                    className="inline-flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100"
                  >
                    <LayoutGrid className="w-4 h-4 text-gray-500" />
                    Dashboard
                  </Link>
                  <Link
                    href="/myshop"
                    className="inline-flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Store className="w-4 h-4 text-gray-500" />
                    My Shop
                  </Link>
                  <Link
                    href="/products"
                    className="inline-flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Package className="w-4 h-4 text-gray-500" />
                    Products
                  </Link>
                  <Link
                    href="/orders"
                    className="inline-flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <ShoppingBag className="w-4 h-4 text-gray-500" />
                    Orders
                  </Link>
                  <Link
                    href="/offers"
                    className="inline-flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <HandCoins className="w-4 h-4 text-gray-500" />
                    My Offers
                  </Link>
                  <Link
                    href="/request-product"
                    className="inline-flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <ClipboardList className="w-4 h-4 text-gray-500" />
                    Request Product
                  </Link>
                  <Link
                    href="/profile"
                    className="inline-flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <User className="w-4 h-4 text-gray-500" />
                    Profile
                  </Link>
                  <div className="border-t border-gray-100 mt-1">
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="w-full inline-flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </details>
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 bg-black text-white px-5 py-2 rounded-xl hover:bg-gray-800 transition"
            >
              <LogIn className="w-4 h-4" />
              <span>Login / Sign in</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
