"use client"

import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { Send } from "lucide-react"

type ConversationDetail = {
  id: string
  buyerId: string
  sellerId: string
  product: {
    id: string
    name: string
    price: number
    images: Array<{
      url: string
      sortOrder: number
    }>
  }
  buyer: {
    id: string
    name: string | null
    email: string
    avatar: string | null
    image: string | null
  }
  seller: {
    id: string
    name: string | null
    email: string
    avatar: string | null
    image: string | null
  }
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
      avatar: string | null
      image: string | null
    }
  }>
}

const ACTIVE_CONVERSATION_POLL_INTERVAL_MS = 3000

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

function extractOrderNumber(content: string) {
  const match = content.match(/\bORD-\d{8}-[A-Z0-9]+\b/i)
  return match?.[0].toUpperCase() ?? null
}

export default function MessageConversationPage() {
  const { data: session, status: sessionStatus } = useSession()
  const params = useParams<{ id: string }>()
  const conversationId = typeof params?.id === "string" ? params.id : ""

  const [conversation, setConversation] = useState<ConversationDetail | null>(null)
  const [messageText, setMessageText] = useState("")
  const [isLoadingConversation, setIsLoadingConversation] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState("")

  const fetchConversationDetails = useCallback(async (options?: { silent?: boolean }) => {
    if (!conversationId) {
      setIsLoadingConversation(false)
      setError("Conversation not found")
      return
    }

    const silent = options?.silent ?? false

    if (!silent) {
      setIsLoadingConversation(true)
      setError("")
    }

    try {
      const response = await fetch(`/api/messages/${conversationId}`, { cache: "no-store" })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to load conversation")
      }

      const data: ConversationDetail = await response.json()
      setConversation(data)
    } catch (fetchError: unknown) {
      if (fetchError instanceof Error) {
        setError(fetchError.message)
      } else {
        setError("Failed to load conversation")
      }
    } finally {
      if (!silent) {
        setIsLoadingConversation(false)
      }
    }
  }, [conversationId])

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      void fetchConversationDetails()
      return
    }

    if (sessionStatus === "unauthenticated") {
      setIsLoadingConversation(false)
    }
  }, [sessionStatus, fetchConversationDetails])

  useEffect(() => {
    if (sessionStatus !== "authenticated" || !conversationId) return

    const interval = window.setInterval(() => {
      void fetchConversationDetails({ silent: true })
    }, ACTIVE_CONVERSATION_POLL_INTERVAL_MS)

    return () => {
      window.clearInterval(interval)
    }
  }, [sessionStatus, conversationId, fetchConversationDetails])

  const counterpartLabel = useMemo(() => {
    if (!conversation || !session?.user?.id) return ""

    const isBuyer = conversation.buyerId === session.user.id
    const counterpart = isBuyer ? conversation.seller : conversation.buyer

    return counterpart.name || counterpart.email
  }, [conversation, session?.user?.id])

  const counterpartPhoto = useMemo(() => {
    if (!conversation || !session?.user?.id) return null
    const isBuyer = conversation.buyerId === session.user.id
    const counterpart = isBuyer ? conversation.seller : conversation.buyer
    return counterpart.avatar ?? counterpart.image ?? null
  }, [conversation, session?.user?.id])

  const sendMessage = async () => {
    if (!conversationId) return

    const content = messageText.trim()
    if (!content) return

    setIsSending(true)
    setError("")

    try {
      const response = await fetch(`/api/messages/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to send message")
      }

      setMessageText("")
      await fetchConversationDetails()
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
        <div className="mb-4">
          <Link href="/messages" className="text-sm text-gray-700 hover:text-black underline">
            Back to messages list
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden min-h-140">
          {isLoadingConversation ? (
            <div className="p-6 text-sm text-gray-500">Loading messages...</div>
          ) : !conversation ? (
            <div className="p-6 text-sm text-gray-500">Conversation not found.</div>
          ) : (
            <div className="flex flex-col h-full min-h-140">
              <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-700 overflow-hidden shrink-0">
                    {counterpartPhoto ? (
                      <Image src={counterpartPhoto} alt={counterpartLabel.charAt(0)} fill className="object-cover" sizes="40px" />
                    ) : (
                      counterpartLabel.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-2xl leading-tight text-gray-900">{counterpartLabel}</div>
                    <div className="text-sm text-gray-600">{conversation.product.name}</div>
                  </div>
                </div>

              </div>

              {/* Product ribbon */}
              <Link
                href={`/product/${conversation.product.id}`}
                className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50 hover:bg-gray-100 transition group"
              >
                <div className="h-12 w-12 shrink-0 rounded-xl overflow-hidden border border-gray-200 bg-white">
                  {conversation.product.images[0]?.url ? (
                    <img
                      src={conversation.product.images[0].url}
                      alt={conversation.product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-gray-400 text-lg font-semibold">
                      {conversation.product.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-widest text-gray-400 mb-0.5">About this product</p>
                  <p className="text-sm font-semibold text-gray-900 truncate group-hover:underline">{conversation.product.name}</p>
                </div>
                <p className="text-sm font-bold text-gray-950 shrink-0">${conversation.product.price.toFixed(2)}</p>
              </Link>

              <div className="flex-1 p-4 sm:p-5 space-y-4 overflow-auto max-h-120 bg-gray-50/70">
                {conversation.messages.length === 0 ? (
                  <div className="h-full min-h-80 flex flex-col items-center justify-center text-center">
                    <img src="/noMessages.png" alt="No messages" className="w-52 max-w-full opacity-90 mb-3" />
                    <div className="text-sm text-gray-500">No messages yet. Send the first message.</div>
                  </div>
                ) : (
                  conversation.messages.map((message) => {
                    const isMine = message.senderId === session.user?.id
                    const orderNumber = extractOrderNumber(message.content)

                    return (
                      <div key={message.id} className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}>
                        {!isMine && (
                          <div className="relative h-8 w-8 rounded-full border border-gray-300 bg-white flex items-center justify-center text-xs font-semibold text-gray-700 shrink-0 overflow-hidden">
                            {(message.sender.avatar ?? message.sender.image) ? (
                              <Image src={(message.sender.avatar ?? message.sender.image)!} alt={(message.sender.name || message.sender.email).charAt(0)} fill className="object-cover" sizes="32px" />
                            ) : (
                              (message.sender.name || message.sender.email).charAt(0).toUpperCase()
                            )}
                          </div>
                        )}

                        <div
                          className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm ${
                            isMine
                              ? "bg-gray-900 text-white"
                              : "bg-white border border-gray-200 text-gray-800"
                          }`}
                        >
                          {orderNumber ? (
                            <Link
                              href={`/orders?q=${encodeURIComponent(orderNumber)}`}
                              className={`underline underline-offset-3 ${isMine ? "decoration-gray-400 hover:decoration-white" : "decoration-gray-400 hover:decoration-gray-900"}`}
                              title={`Open order ${orderNumber}`}
                            >
                              {message.content}
                            </Link>
                          ) : (
                            <div>{message.content}</div>
                          )}
                        </div>

                        <div className="text-[11px] text-gray-500 whitespace-nowrap">
                          {formatMessageTime(message.createdAt)}
                        </div>

                        {isMine && (
                          <div className="relative h-8 w-8 rounded-full border border-gray-300 bg-white flex items-center justify-center text-xs font-semibold text-gray-700 shrink-0 overflow-hidden">
                            {session.user?.image ? (
                              <Image src={session.user.image} alt={(session.user?.name || session.user?.email || "Y").charAt(0)} fill className="object-cover" sizes="32px" />
                            ) : (
                              (session.user?.name || session.user?.email || "Y").charAt(0).toUpperCase()
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              <div className="p-3 border-t border-gray-200 bg-white flex items-center gap-2">
                <input
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault()
                      void sendMessage()
                    }
                  }}
                />
                <button
                  onClick={() => void sendMessage()}
                  disabled={isSending || !messageText.trim()}
                  className="h-11 w-11 rounded-xl bg-black text-white inline-flex items-center justify-center hover:bg-gray-800 transition disabled:opacity-50"
                >
                  {isSending ? <span className="text-xs">...</span> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  )
}