"use client"

import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { ChevronRight, Search } from "lucide-react"

type ConversationListItem = {
  id: string
  product: {
    id: string
    name: string
    price: number
    imageUrl: string
  }
  counterpart: {
    id: string
    name: string | null
    email: string
    avatar: string | null
    image: string | null
  }
  lastMessageAt: string
  lastMessage: {
    id: string
    content: string
    senderId: string
    createdAt: string
  } | null
  unreadCount: number
}

const CONVERSATIONS_POLL_INTERVAL_MS = 5000

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

export default function MessagesPage() {
  const { data: session, status: sessionStatus } = useSession()
  const searchParams = useSearchParams()
  const requestedConversationId = searchParams.get("cid")

  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [error, setError] = useState("")
  const [searchDraft, setSearchDraft] = useState("")
  const [search, setSearch] = useState("")

  const fetchConversations = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false

    if (!silent) {
      setIsLoadingList(true)
      setError("")
    }

    try {
      const response = await fetch("/api/messages", { cache: "no-store" })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to load conversations")
      }

      const data: ConversationListItem[] = await response.json()
      setConversations(data)
    } catch (fetchError: unknown) {
      if (fetchError instanceof Error) {
        setError(fetchError.message)
      } else {
        setError("Failed to load conversations")
      }
    } finally {
      if (!silent) {
        setIsLoadingList(false)
      }
    }
  }, [])

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchConversations()
    }

    if (sessionStatus === "unauthenticated") {
      setIsLoadingList(false)
    }
  }, [sessionStatus, fetchConversations])

  useEffect(() => {
    if (sessionStatus !== "authenticated") return

    const interval = window.setInterval(() => {
      void fetchConversations({ silent: true })
    }, CONVERSATIONS_POLL_INTERVAL_MS)

    return () => {
      window.clearInterval(interval)
    }
  }, [sessionStatus, fetchConversations])

  useEffect(() => {
    const handleFocus = () => {
      if (sessionStatus !== "authenticated") return

      void fetchConversations({ silent: true })
    }

    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [sessionStatus, fetchConversations])

  useEffect(() => {
    if (!requestedConversationId || conversations.length === 0) return

    const match = conversations.find((conversation) => conversation.id === requestedConversationId)
    if (!match) return

    window.location.href = `/messages/${match.id}`
  }, [requestedConversationId, conversations])

  const visibleConversations = conversations.filter((conversation) => {
    const needle = search.trim().toLowerCase()
    if (!needle) return true

    return (
      conversation.product.name.toLowerCase().includes(needle) ||
      (conversation.counterpart.name || "").toLowerCase().includes(needle) ||
      conversation.counterpart.email.toLowerCase().includes(needle) ||
      (conversation.lastMessage?.content || "").toLowerCase().includes(needle)
    )
  })

  if (sessionStatus === "loading") {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <section className="max-w-7xl mx-auto px-6 py-12">Loading...</section>
        <Footer />
      </main>
    )
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <section className="max-w-7xl mx-auto px-6 py-12">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">Please login to access messages.</div>
        </section>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <section className="max-w-7xl mx-auto px-6 py-10 flex-1 w-full">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Messages</h1>
            <p className="text-gray-600">Open a conversation to view individual messages.</p>
          </div>

          <form
            className="flex w-full sm:w-auto gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              setSearch(searchDraft)
            }}
          >
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Search conversations"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <button className="px-4 py-2.5 bg-black text-white rounded-xl hover:bg-gray-800 transition">Search</button>
          </form>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden min-h-140">
          <div className="p-4 border-b border-gray-200 font-semibold text-xl">Conversations</div>

          {isLoadingList ? (
            <div className="p-4 text-sm text-gray-500">Loading conversations...</div>
          ) : visibleConversations.length === 0 ? (
            <div className="h-full min-h-96 p-6 flex flex-col items-center justify-center text-center">
              <img src="/noMessages.png" alt="No messages" className="w-52 max-w-full opacity-90 mb-3" />
              <div className="text-sm text-gray-600">No conversations found.</div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {visibleConversations.map((conversation) => (
                <Link
                  key={conversation.id}
                  href={`/messages/${conversation.id}`}
                  className="block p-4 hover:bg-gray-50 transition"
                >
                  <div className="mb-2 flex items-center gap-3">
                    <div className="relative h-10 w-10 rounded-full border border-gray-300 bg-white flex items-center justify-center text-sm font-semibold text-gray-700 overflow-hidden shrink-0">
                      {(conversation.counterpart.avatar ?? conversation.counterpart.image) ? (
                        <Image
                          src={(conversation.counterpart.avatar ?? conversation.counterpart.image)!}
                          alt={(conversation.counterpart.name || conversation.counterpart.email).charAt(0)}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      ) : (
                        (conversation.counterpart.name || conversation.counterpart.email).charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm line-clamp-1">
                        {conversation.counterpart.name || conversation.counterpart.email}
                      </div>
                      <div className="text-xs text-gray-600 line-clamp-1">{conversation.product.name}</div>
                    </div>
                    <div className="text-[11px] text-gray-500 whitespace-nowrap">
                      {conversation.lastMessage ? formatMessageTime(conversation.lastMessage.createdAt) : ""}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className={`text-xs line-clamp-1 ${conversation.unreadCount > 0 ? "text-gray-900 font-medium" : "text-gray-500"}`}>
                      {conversation.lastMessage?.content || "No messages yet"}
                    </div>

                    <div className="flex items-center gap-2">
                      {conversation.unreadCount > 0 && (
                        <span className="shrink-0 min-w-5 h-5 px-1 rounded-full bg-black text-white text-[10px] font-semibold flex items-center justify-center">
                          {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  )
}
