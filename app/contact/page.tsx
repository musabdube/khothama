"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { CircleHelp, LifeBuoy, MessageCircle, ShieldCheck } from "lucide-react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"

type ContactConversationItem = {
  id: string
  user: {
    id: string
    name: string | null
    email: string
  }
  admin: {
    id: string
    name: string | null
    email: string
  } | null
  lastMessageAt: string
  lastMessage: {
    id: string
    content: string
    senderId: string
    createdAt: string
  } | null
}

type ContactConversationDetail = {
  id: string
  userId: string
  adminId: string | null
  user: {
    id: string
    name: string | null
    email: string
  }
  admin: {
    id: string
    name: string | null
    email: string
  } | null
  messages: Array<{
    id: string
    content: string
    senderId: string
    createdAt: string
    readAt: string | null
    sender: {
      id: string
      name: string | null
      email: string
    }
  }>
}

export default function ContactPage() {
  const { data: session, status: sessionStatus } = useSession()
  const searchParams = useSearchParams()
  const requestedConversationId = searchParams.get("cid")
  const [mounted, setMounted] = useState(false)

  const [conversations, setConversations] = useState<ContactConversationItem[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)

  // Mark as mounted to avoid hydration mismatches with Date.now()
  useEffect(() => {
    setMounted(true)
  }, [])
  const [selectedConversation, setSelectedConversation] = useState<ContactConversationDetail | null>(null)
  const [messageText, setMessageText] = useState("")
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [isLoadingConversation, setIsLoadingConversation] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState("")

  const isAdmin = session?.user?.role === "ADMIN"

  const fetchConversations = useCallback(async () => {
    setError("")

    try {
      const response = await fetch("/api/contact-chat")
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to load conversations")
      }

      const data: ContactConversationItem[] = await response.json()
      setConversations(data)

      if (requestedConversationId && data.some((conversation) => conversation.id === requestedConversationId)) {
        setSelectedConversationId(requestedConversationId)
        return
      }

      if (data.length === 0) {
        setSelectedConversationId(null)
        return
      }

      setSelectedConversationId((previous) => {
        if (previous && data.some((conversation) => conversation.id === previous)) {
          return previous
        }

        return data[0].id
      })
    } catch (fetchError: unknown) {
      if (fetchError instanceof Error) {
        setError(fetchError.message)
      } else {
        setError("Failed to load conversations")
      }
    } finally {
      setIsLoadingList(false)
    }
  }, [requestedConversationId])

  const fetchConversationDetails = useCallback(async (conversationId: string) => {
    setIsLoadingConversation(true)
    setError("")

    try {
      const response = await fetch(`/api/contact-chat/${conversationId}`)
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to load conversation")
      }

      const data: ContactConversationDetail = await response.json()
      setSelectedConversation(data)
    } catch (fetchError: unknown) {
      if (fetchError instanceof Error) {
        setError(fetchError.message)
      } else {
        setError("Failed to load conversation")
      }
    } finally {
      setIsLoadingConversation(false)
    }
  }, [])

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      setIsLoadingList(true)
      fetchConversations()
    }

    if (sessionStatus === "unauthenticated") {
      setIsLoadingList(false)
    }
  }, [sessionStatus, fetchConversations])

  useEffect(() => {
    if (selectedConversationId) {
      fetchConversationDetails(selectedConversationId)
    } else {
      setSelectedConversation(null)
    }
  }, [selectedConversationId, fetchConversationDetails])

  useEffect(() => {
    if (sessionStatus !== "authenticated") {
      return
    }

    const interval = setInterval(() => {
      fetchConversations()
      if (selectedConversationId) {
        fetchConversationDetails(selectedConversationId)
      }
    }, 7000)

    return () => clearInterval(interval)
  }, [sessionStatus, selectedConversationId, fetchConversations, fetchConversationDetails])

  const conversationTitle = useMemo(() => {
    if (!selectedConversation) {
      return "Support"
    }

    if (isAdmin) {
      return selectedConversation.user.name || selectedConversation.user.email
    }

    return selectedConversation.admin?.name || selectedConversation.admin?.email || "Khothama Support"
  }, [selectedConversation, isAdmin])

  const sendMessage = async () => {
    const content = messageText.trim()
    if (!content) return

    setIsSending(true)
    setError("")

    try {
      let response: Response

      if (isAdmin) {
        if (!selectedConversationId) {
          throw new Error("Select a conversation first")
        }

        response = await fetch(`/api/contact-chat/${selectedConversationId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        })
      } else {
        response = await fetch("/api/contact-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        })
      }

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to send message")
      }

      const payload = await response.json()
      const conversationId = typeof payload?.conversationId === "string" ? payload.conversationId : selectedConversationId

      setMessageText("")

      if (conversationId) {
        setSelectedConversationId(conversationId)
        await Promise.all([fetchConversations(), fetchConversationDetails(conversationId)])
      } else {
        await fetchConversations()
      }
    } catch (sendError: unknown) {
      if (sendError instanceof Error) {
        setError(sendError.message)
      } else {
        setError("Failed to send message")
      }
    } finally {
      setIsSending(false)
    }
  }

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
        <section className="max-w-7xl mx-auto w-full px-6 py-8 flex-1">
          <div className="mb-6 rounded-[30px] border border-gray-200 bg-[linear-gradient(135deg,#ffffff,#eef6ff)] p-6 shadow-sm">
            <div className="inline-flex rounded-full border border-sky-100 bg-white/90 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-sky-700">
              Support
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-gray-950">Contact Khothama</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
              Reach the support team for account, listing, moderation or platform questions. Live support chat requires login so we can keep the conversation tied to your account.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/login" className="inline-flex items-center rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800">
                Login to Chat
              </Link>
              <Link href="/help-center" className="inline-flex items-center rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
                Open Help Center
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[28px] border border-gray-200 bg-white p-6">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                <LifeBuoy className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-xl font-semibold text-gray-950">Account support</h2>
              <p className="mt-3 text-sm leading-7 text-gray-600">Get help with login issues, account questions and general access problems.</p>
            </div>
            <div className="rounded-[28px] border border-gray-200 bg-white p-6">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-xl font-semibold text-gray-950">Safety and moderation</h2>
              <p className="mt-3 text-sm leading-7 text-gray-600">Ask about reports, suspicious activity, moderation decisions or listing restrictions.</p>
            </div>
            <div className="rounded-[28px] border border-gray-200 bg-white p-6">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                <CircleHelp className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-xl font-semibold text-gray-950">Product guidance</h2>
              <p className="mt-3 text-sm leading-7 text-gray-600">Need help listing a product, updating a shop or understanding a marketplace flow? Start here.</p>
            </div>
          </div>
        </section>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <section className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">
        <div className="mb-6 rounded-[30px] border border-gray-200 bg-[linear-gradient(135deg,#ffffff,#eef6ff)] p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-sky-100 bg-white/90 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-sky-700">
                Support
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-gray-950">Contact Khothama</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
                {isAdmin
                  ? "Review and respond to customer support conversations from one support workspace."
                  : "Start or continue a direct support conversation with the Khothama admin team."}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-white/80 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-gray-400">Channel</div>
                <div className="mt-1 text-lg font-semibold text-gray-950">Live support chat</div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white/80 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-gray-400">Audience</div>
                <div className="mt-1 text-lg font-semibold text-gray-950">Buyers, sellers and admins</div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white/80 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-gray-400">Also useful</div>
                <div className="mt-1 text-lg font-semibold text-gray-950">Help Center</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-[28px] border border-gray-200 bg-white p-5">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
              <MessageCircle className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-950">Real conversations</h2>
            <p className="mt-2 text-sm leading-7 text-gray-600">Support stays inside the platform so account context and message history remain together.</p>
          </div>
          <div className="rounded-[28px] border border-gray-200 bg-white p-5">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-950">Guided support</h2>
            <p className="mt-2 text-sm leading-7 text-gray-600">Ask about account access, product publishing, moderation, orders or general platform use.</p>
          </div>
          <div className="rounded-[28px] border border-gray-200 bg-white p-5">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
              <CircleHelp className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-950">Need quick answers?</h2>
            <p className="mt-2 text-sm leading-7 text-gray-600">Check the help center first for common steps, then open chat if you still need support.</p>
            <Link href="/help-center" className="mt-3 inline-flex text-sm font-medium text-gray-900 hover:text-black">
              Open Help Center
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
        )}

        <div className="bg-white rounded-[30px] border border-gray-200 overflow-hidden grid lg:grid-cols-[340px,1fr] min-h-140 shadow-sm">
          <div className="border-r border-gray-200 bg-gray-50/70">
            <div className="p-5 border-b border-gray-200 font-semibold text-gray-950">
              {isAdmin ? "Support Conversations" : "Your Support Chat"}
            </div>

            {isLoadingList ? (
              <div className="p-5 text-sm text-gray-500">Loading conversations...</div>
            ) : conversations.length === 0 ? (
              <div className="p-5 text-sm text-gray-500">
                {isAdmin ? "No conversations yet." : "No messages yet. Send a message to start."}
              </div>
            ) : (
              <div className="max-h-130 overflow-auto">
                {conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedConversationId(conversation.id)}
                    className={`w-full text-left p-4 border-b border-gray-100 transition ${
                      selectedConversationId === conversation.id ? "bg-white" : "hover:bg-white/80"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm mb-1 line-clamp-1">
                          {isAdmin ? conversation.user.name || conversation.user.email : "Khothama Support"}
                        </div>
                        <div className="text-xs text-gray-600 line-clamp-1">
                          {isAdmin
                            ? conversation.user.email
                            : conversation.admin?.name || conversation.admin?.email || "Awaiting admin reply"}
                        </div>
                      </div>
                      <div className="text-[11px] text-gray-400 whitespace-nowrap">
                        {mounted && new Date(conversation.lastMessageAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 line-clamp-1">
                      {conversation.lastMessage?.content || "No messages yet"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col">
            {!selectedConversationId && !isAdmin ? (
              <div className="p-6 text-sm text-gray-500">Send a message below to start your support chat.</div>
            ) : !selectedConversationId ? (
              <div className="p-6 text-sm text-gray-500">Select a conversation to reply.</div>
            ) : isLoadingConversation ? (
              <div className="p-6 text-sm text-gray-500">Loading messages...</div>
            ) : !selectedConversation ? (
              <div className="p-6 text-sm text-gray-500">Conversation not found.</div>
            ) : (
              <>
                <div className="p-5 border-b border-gray-200 bg-white">
                  <div className="font-semibold text-gray-950">{conversationTitle}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {isAdmin ? "Customer support conversation" : "Admin support conversation"}
                  </div>
                </div>

                <div className="flex-1 p-5 space-y-3 overflow-auto max-h-105 bg-[linear-gradient(180deg,#f8fbff,#f9fafb)]">
                  {selectedConversation.messages.length === 0 ? (
                    <div className="text-sm text-gray-500">No messages yet.</div>
                  ) : (
                    selectedConversation.messages.map((message) => {
                      const isMine = message.senderId === session.user?.id

                      return (
                        <div
                          key={message.id}
                          className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                            isMine
                              ? "ml-auto bg-black text-white"
                              : "mr-auto bg-white border border-gray-200 text-gray-800"
                          }`}
                        >
                          <div>{message.content}</div>
                          <div className={`mt-1 text-[10px] ${isMine ? "text-gray-300" : "text-gray-500"}`}>
                            {mounted && new Date(message.createdAt).toLocaleString()}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </>
            )}

            <div className="p-4 border-t border-gray-200 flex gap-2 bg-white">
              <input
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                placeholder={isAdmin ? "Reply to customer..." : "Type your support message..."}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    sendMessage()
                  }
                }}
              />
              <button
                onClick={sendMessage}
                disabled={isSending || !messageText.trim() || (isAdmin && !selectedConversationId)}
                className="px-4 py-2.5 bg-black text-white rounded-xl hover:bg-gray-800 transition disabled:opacity-50"
              >
                {isSending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
