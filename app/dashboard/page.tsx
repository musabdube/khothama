"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import Header from "@/components/Header"
import {
  ShoppingBag,
  HandCoins,
  Heart,
  ClipboardList,
  MessageCircle,
  Package,
  Store,
  Search,
  ChevronRight,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  LayoutGrid,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED"

type OfferStatus = "PENDING" | "ACCEPTED" | "REJECTED"

type RecentOrder = {
  id: string
  orderNumber: string
  status: OrderStatus
  total: number
  createdAt: string
  items: {
    product: {
      name: string
      images: { url: string }[]
    }
  }[]
}

type RecentOffer = {
  id: string
  offeredPrice: number
  status: OfferStatus
  createdAt: string
  product: {
    id: string
    name: string
    price: number
    images: { url: string }[]
  }
}

type RecentRequest = {
  id: string
  name: string
  category: string | null
  budget: string | null
  createdAt: string
}

type DashboardData = {
  stats: {
    orders: { total: number; pending: number; delivered: number }
    offers: { total: number; pending: number; accepted: number }
    wishlist: number
    productRequests: number
    unreadMessages: number
    listedProducts: number
  }
  recentOrders: RecentOrder[]
  recentOffers: RecentOffer[]
  recentRequests: RecentRequest[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PROCESSING: "bg-purple-100 text-purple-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  REFUNDED: "bg-gray-100 text-gray-600",
}

const OFFER_STATUS_STYLES: Record<OfferStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  ACCEPTED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function OfferStatusIcon({ status }: { status: OfferStatus }) {
  if (status === "ACCEPTED") return <CheckCircle className="w-3.5 h-3.5" />
  if (status === "REJECTED") return <XCircle className="w-3.5 h-3.5" />
  return <Clock className="w-3.5 h-3.5" />
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

type StatCardProps = {
  label: string
  value: number
  sub?: string
  icon: React.ReactNode
  href: string
  accent: string
  badge?: number
}

function StatCard({ label, value, sub, icon, href, accent, badge }: StatCardProps) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition p-5 overflow-hidden"
    >
      <div className={`absolute inset-x-0 top-0 h-1 ${accent} rounded-t-2xl`} />
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl ${accent.replace("bg-", "bg-").replace("-600", "-100")} bg-opacity-20`}>
          <span className={accent.replace("bg-", "text-")}>{icon}</span>
        </div>
        {typeof badge === "number" && badge > 0 && (
          <span className="text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <ChevronRight className="absolute right-4 bottom-4 w-4 h-4 text-gray-300 group-hover:text-gray-500 transition" />
    </Link>
  )
}

// ─── Quick Action ─────────────────────────────────────────────────────────────

type QuickActionProps = {
  label: string
  icon: React.ReactNode
  href: string
  description: string
}

function QuickAction({ label, icon, href, description }: QuickActionProps) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:border-gray-300 transition p-4"
    >
      <div className="shrink-0 w-10 h-10 rounded-xl bg-gray-50 group-hover:bg-black group-hover:text-white flex items-center justify-center text-gray-600 transition">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-400 truncate">{description}</p>
      </div>
      <ChevronRight className="ml-auto shrink-0 w-4 h-4 text-gray-300 group-hover:text-gray-600 transition" />
    </Link>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, href, linkLabel }: { title: string; href: string; linkLabel: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <Link href={href} className="text-xs text-gray-500 hover:text-black inline-flex items-center gap-1">
        {linkLabel} <ChevronRight className="w-3 h-3" />
      </Link>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-2xl" />
        ))}
      </div>
      <div className="h-48 bg-gray-100 rounded-2xl mb-4" />
      <div className="h-48 bg-gray-100 rounded-2xl" />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login")
    }
  }, [status, router])

  useEffect(() => {
    if (status !== "authenticated") return
    void (async () => {
      try {
        const res = await fetch("/api/dashboard", { cache: "no-store" })
        if (res.ok) {
          const json = (await res.json()) as DashboardData
          setData(json)
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [status])

  if (status === "loading" || loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Skeleton />
      </main>
    )
  }

  if (!session || !data) return null

  const { stats, recentOrders, recentOffers, recentRequests } = data
  const firstName = session.user?.name?.split(" ")[0] ?? "there"

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">

      {/* ── Welcome ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {session.user?.image ? (
          <Image
            src={session.user.image}
            alt={session.user.name ?? "Avatar"}
            width={56}
            height={56}
            className="w-14 h-14 rounded-full object-cover ring-2 ring-gray-200"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-gray-900 flex items-center justify-center text-white text-xl font-bold">
            {firstName[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {firstName}!</h1>
          <p className="text-sm text-gray-500">{session.user?.email}</p>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> Overview
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            label="Orders"
            value={stats.orders.total}
            sub={`${stats.orders.pending} pending`}
            icon={<ShoppingBag className="w-5 h-5" />}
            href="/orders"
            accent="bg-blue-600"
            badge={stats.orders.pending}
          />
          <StatCard
            label="My Offers"
            value={stats.offers.total}
            sub={`${stats.offers.pending} pending`}
            icon={<HandCoins className="w-5 h-5" />}
            href="/offers"
            accent="bg-amber-500"
            badge={stats.offers.pending}
          />
          <StatCard
            label="Wishlist"
            value={stats.wishlist}
            icon={<Heart className="w-5 h-5" />}
            href="/wishlist"
            accent="bg-pink-500"
          />
          <StatCard
            label="Requests"
            value={stats.productRequests}
            icon={<ClipboardList className="w-5 h-5" />}
            href="/requested-products"
            accent="bg-violet-600"
          />
          <StatCard
            label="Messages"
            value={stats.unreadMessages}
            sub="unread conversations"
            icon={<MessageCircle className="w-5 h-5" />}
            href="/messages"
            accent="bg-teal-600"
            badge={stats.unreadMessages}
          />
          <StatCard
            label="Listed Products"
            value={stats.listedProducts}
            icon={<Package className="w-5 h-5" />}
            href="/myproducts"
            accent="bg-gray-800"
          />
        </div>
      </section>

      {/* ── Quick Actions ── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
          <LayoutGrid className="w-4 h-4" /> Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <QuickAction
            label="My Shop"
            icon={<Store className="w-5 h-5" />}
            href="/myshop"
            description="Manage your seller shop"
          />
          <QuickAction
            label="Browse Products"
            icon={<Package className="w-5 h-5" />}
            href="/products"
            description="Explore all listed products"
          />
          <QuickAction
            label="Request a Product"
            icon={<Search className="w-5 h-5" />}
            href="/request-product"
            description="Can't find it? Request it"
          />
          <QuickAction
            label="My Wishlist"
            icon={<Heart className="w-5 h-5" />}
            href="/wishlist"
            description="Items you've saved"
          />
          <QuickAction
            label="My Offers"
            icon={<HandCoins className="w-5 h-5" />}
            href="/offers"
            description="Track offers you've made"
          />
          <QuickAction
            label="Messages"
            icon={<MessageCircle className="w-5 h-5" />}
            href="/messages"
            description="Chat with buyers & sellers"
          />
        </div>
      </section>

      {/* ── Three column activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Orders */}
        <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <SectionHeader title="Recent Orders" href="/orders" linkLabel="View all" />
          {recentOrders.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No orders yet.</p>
          ) : (
            <ul className="space-y-3">
              {recentOrders.map((order) => {
                const img = order.items[0]?.product.images[0]?.url
                const productName = order.items[0]?.product.name ?? "Order"
                return (
                  <li key={order.id}>
                    <Link
                      href={`/orders`}
                      className="flex items-center gap-3 hover:bg-gray-50 rounded-xl p-2 -mx-2 transition"
                    >
                      {img ? (
                        <Image
                          src={img}
                          alt={productName}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center">
                          <ShoppingBag className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-800 truncate">{productName}</p>
                        <p className="text-xs text-gray-400">{order.orderNumber}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ORDER_STATUS_STYLES[order.status]}`}
                        >
                          {order.status}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">M {order.total.toFixed(2)}</p>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Recent Offers */}
        <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <SectionHeader title="Recent Offers" href="/offers" linkLabel="View all" />
          {recentOffers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No offers made yet.</p>
          ) : (
            <ul className="space-y-3">
              {recentOffers.map((offer) => {
                const img = offer.product.images[0]?.url
                return (
                  <li key={offer.id}>
                    <Link
                      href={`/product/${offer.product.id}`}
                      className="flex items-center gap-3 hover:bg-gray-50 rounded-xl p-2 -mx-2 transition"
                    >
                      {img ? (
                        <Image
                          src={img}
                          alt={offer.product.name}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center">
                          <HandCoins className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-800 truncate">{offer.product.name}</p>
                        <p className="text-xs text-gray-400">
                          Offered: M {offer.offeredPrice.toFixed(2)}{" "}
                          <span className="line-through text-gray-300">M {offer.product.price.toFixed(2)}</span>
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${OFFER_STATUS_STYLES[offer.status]}`}
                      >
                        <OfferStatusIcon status={offer.status} />
                        {offer.status}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Recent Product Requests */}
        <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <SectionHeader title="My Requests" href="/requested-products" linkLabel="View all" />
          {recentRequests.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2">
              <p className="text-sm text-gray-400 text-center">No product requests yet.</p>
              <Link
                href="/request-product"
                className="text-xs font-medium text-black underline underline-offset-2"
              >
                Request a product
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {recentRequests.map((req) => (
                <li key={req.id}>
                  <div className="flex items-start gap-3 hover:bg-gray-50 rounded-xl p-2 -mx-2 transition">
                    <div className="w-10 h-10 rounded-lg bg-violet-50 shrink-0 flex items-center justify-center">
                      <ClipboardList className="w-4 h-4 text-violet-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-800 truncate">{req.name}</p>
                      <div className="flex gap-2 mt-0.5 flex-wrap">
                        {req.category && (
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                            {req.category}
                          </span>
                        )}
                        {req.budget && (
                          <span className="text-[10px] bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full">
                            Budget: {req.budget}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">{formatDate(req.createdAt)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

      </div>
      </main>
    </>
  )
}
