"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { Bell, X } from "lucide-react"

type NotificationRow = {
  id: string
  type: "OFFER_RECEIVED" | "ORDER_RECEIVED" | "ADMIN_NEW_PRODUCT" | "ADMIN_FLAGGED_PRODUCT" | "SUPPORT_CHAT"
  title: string
  message: string
  link: string | null
  readAt: string | null
  createdAt: string
}

type NotificationsPayload = {
  notifications: NotificationRow[]
  unreadCount: number
}

function formatCreatedAt(value: string) {
  const createdDate = new Date(value)
  const now = Date.now()
  const diffMs = now - createdDate.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 1) return "Just now"
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  return createdDate.toLocaleDateString()
}

export default function NotificationBell() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const hasUnread = unreadCount > 0

  const loadNotifications = async () => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/notifications")
      if (!response.ok) {
        return
      }

      const payload: NotificationsPayload = await response.json()
      setNotifications(payload.notifications)
      setUnreadCount(payload.unreadCount)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()

    const interval = window.setInterval(() => {
      loadNotifications()
    }, 30000)

    return () => {
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [isOpen])

  const unreadNotificationIds = useMemo(
    () => notifications.filter((item) => !item.readAt).map((item) => item.id),
    [notifications]
  )

  const markAllAsRead = async () => {
    if (unreadNotificationIds.length === 0) return

    await fetch("/api/notifications", { method: "PATCH" })

    setNotifications((previous) => previous.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })))
    setUnreadCount(0)
  }

  const markAsRead = async (notificationId: string) => {
    await fetch(`/api/notifications/${notificationId}`, { method: "PATCH" })

    setNotifications((previous) =>
      previous.map((item) => (item.id === notificationId ? { ...item, readAt: item.readAt || new Date().toISOString() } : item))
    )
    setUnreadCount((previous) => Math.max(0, previous - 1))
  }

  const deleteNotification = async (notification: NotificationRow) => {
    setDeletingId(notification.id)

    try {
      const response = await fetch(`/api/notifications/${notification.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        return
      }

      setNotifications((previous) => previous.filter((item) => item.id !== notification.id))
      if (!notification.readAt) {
        setUnreadCount((previous) => Math.max(0, previous - 1))
      }
    } finally {
      setDeletingId((current) => (current === notification.id ? null : current))
    }
  }

  return (
    <div ref={containerRef} className="relative z-1100" style={{ zIndex: 1100 }}>
      <button
        onClick={async () => {
          const nextOpen = !isOpen
          setIsOpen(nextOpen)
          if (nextOpen) {
            await loadNotifications()
          }
        }}
        className="relative inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-300 hover:bg-gray-100 transition"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-700" />
        {hasUnread && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[10px] font-semibold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="fixed top-17 left-2 right-2 sm:absolute sm:top-full sm:right-0 sm:left-auto sm:mt-2 sm:w-88 sm:max-w-[90vw] bg-white border border-gray-200 rounded-2xl shadow-sm z-1200 overflow-hidden"
          style={{ zIndex: 1200 }}
        >
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div className="font-semibold">Notifications</div>
            <button
              onClick={markAllAsRead}
              disabled={unreadNotificationIds.length === 0}
              className="text-xs text-gray-600 hover:text-black disabled:text-gray-400"
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-6 text-sm text-gray-500">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-6 text-sm text-gray-500">No notifications yet.</div>
            ) : (
              notifications.map((notification) => {
                if (notification.link) {
                  return (
                    <div key={notification.id} className="border-b border-gray-100 last:border-b-0">
                      <div className="px-4 py-3 hover:bg-gray-50 transition">
                        <div className="flex items-start justify-between gap-3">
                          <Link
                            href={notification.link}
                            onClick={() => {
                              setIsOpen(false)
                              if (!notification.readAt) {
                                void markAsRead(notification.id)
                              }
                            }}
                            className="min-w-0 flex-1 cursor-pointer"
                          >
                            <div className="text-sm font-medium text-gray-900">{notification.title}</div>
                            <div className="text-sm text-gray-600 mt-0.5">{notification.message}</div>
                            <div className="text-xs text-gray-500 mt-1">{formatCreatedAt(notification.createdAt)}</div>
                          </Link>
                          <div className="flex items-start gap-2 shrink-0">
                            {!notification.readAt && <span className="mt-1 w-2 h-2 rounded-full bg-blue-600" />}
                            <button
                              type="button"
                              disabled={deletingId === notification.id}
                              onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                void deleteNotification(notification)
                              }}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                              aria-label="Delete notification"
                              title="Delete notification"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                }

                return (
                  <div key={notification.id} className="border-b border-gray-100 last:border-b-0">
                    <div className="px-4 py-3 hover:bg-gray-50 transition">
                      <div className="flex items-start justify-between gap-3">
                        <button
                          onClick={() => {
                            if (!notification.readAt) {
                              void markAsRead(notification.id)
                            }
                          }}
                          className="min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <div className="text-sm font-medium text-gray-900">{notification.title}</div>
                          <div className="text-sm text-gray-600 mt-0.5">{notification.message}</div>
                          <div className="text-xs text-gray-500 mt-1">{formatCreatedAt(notification.createdAt)}</div>
                        </button>
                        <div className="flex items-start gap-2 shrink-0">
                          {!notification.readAt && <span className="mt-1 w-2 h-2 rounded-full bg-blue-600" />}
                          <button
                            type="button"
                            disabled={deletingId === notification.id}
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              void deleteNotification(notification)
                            }}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                            aria-label="Delete notification"
                            title="Delete notification"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
