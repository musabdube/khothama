"use client"

import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { ChevronRight, Search } from "lucide-react"

type RequestConversationListItem = {
  id: string
  productRequest: {
    id: string
    name: string
    category: string | null
    budget: string | null
    image: string | null
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

const REQUEST_CONVERSATIONS_POLL_INTERVAL_MS = 5000

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

export default function RequestMessagesPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestId = searchParams.get("requestId") ?? ""

  const [conversations, setConversations] = useState<RequestConversationListItem[]>([])
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
      const query = requestId ? `?requestId=${encodeURIComponent(requestId)}` : ""
      const response = await fetch(`/api/request-messages${query}`, { cache: "no-store" })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to load request conversations")
      }

      const data: RequestConversationListItem[] = await response.json()
      setConversations(data)
    } catch (fetchError: unknown) {
      if (fetchError instanceof Error) {
        setError(fetchError.message)
      } else {
        setError("Failed to load request conversations")
      }
    } finally {
      if (!silent) {
        setIsLoadingList(false)
      }
    }
  }, [requestId])

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      void fetchConversations()
      return
    }

    if (sessionStatus === "unauthenticated") {
      setIsLoadingList(false)
    }
  }, [sessionStatus, fetchConversations])

  useEffect(() => {
    if (sessionStatus !== "authenticated") return

    const interval = window.setInterval(() => {
      void fetchConversations({ silent: true })
    }, REQUEST_CONVERSATIONS_POLL_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [sessionStatus, fetchConversations])

  useEffect(() => {
    if (!requestId || isLoadingList) return
    if (conversations.length !== 1) return

    router.replace(`/request-messages/${conversations[0].id}`)
  }, [requestId, isLoadingList, conversations, router])

  const visibleConversations = conversations.filter((conversation) => {
    const needle = search.trim().toLowerCase()
    if (!needle) return true

    return (
      conversation.productRequest.name.toLowerCase().includes(needle) ||
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
          <div className="bg-white rounded-2xl border border-gray-200 p-6">Please login to access request messages.</div>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Request Messages</h1>
            <p className="text-gray-700">Conversations for requested products you posted or responded to.</p>
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
                placeholder="Search request conversations"
                className="w-full pl-9 pr-4 py-2.5 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <button className="px-4 py-2.5 bg-black text-white rounded-xl hover:bg-gray-800 transition">Search</button>
          </form>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden min-h-140">
          <div className="p-4 border-b border-gray-200 font-semibold text-xl text-gray-900">Conversations</div>

          {isLoadingList ? (
            <div className="p-4 text-sm text-gray-700">Loading conversations...</div>
          ) : visibleConversations.length === 0 ? (
            <div className="h-full min-h-96 p-6 flex flex-col items-center justify-center text-center">
              <img src="/noMessages.png" alt="No request messages" className="w-52 max-w-full opacity-90 mb-3" />
              <div className="text-sm text-gray-700">No request conversations found.</div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {visibleConversations.map((conversation) => (
                <Link
                  key={conversation.id}
                  href={`/request-messages/${conversation.id}`}
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
                      <div className="font-semibold text-sm line-clamp-1 text-gray-900">
                        {conversation.counterpart.name || conversation.counterpart.email}
                      </div>
                      <div className="text-xs text-gray-600 line-clamp-1">{conversation.productRequest.name}</div>
                    </div>
                    <div className="text-[11px] text-gray-500 whitespace-nowrap">
                      {conversation.lastMessage ? formatMessageTime(conversation.lastMessage.createdAt) : ""}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className={`text-xs line-clamp-1 ${conversation.unreadCount > 0 ? "text-gray-900 font-medium" : "text-gray-600"}`}>
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
