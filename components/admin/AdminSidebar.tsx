import Link from "next/link"
import { MessageCircle, LayoutDashboard, Gavel, Package, Users, Shapes, ShieldAlert, ClipboardList } from "lucide-react"

export type AdminSidebarKey = "dashboard" | "moderation" | "products" | "customers" | "categories" | "reports" | "product-requests"

type AdminSidebarProps = {
  active: AdminSidebarKey
}

type AdminNavItem = {
  key: AdminSidebarKey
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const adminItems: AdminNavItem[] = [
  { key: "dashboard", href: "/admin/dashboard", label: "Admin Dashboard", icon: LayoutDashboard },
  { key: "moderation", href: "/admin/moderation", label: "Admin Moderation", icon: Gavel },
  { key: "products", href: "/admin/products", label: "Admin Products", icon: Package },
  { key: "customers", href: "/admin/customers", label: "Admin Customers", icon: Users },
  { key: "categories", href: "/admin/categories", label: "Admin Categories", icon: Shapes },
  { key: "reports", href: "/admin/reports", label: "Admin Reports", icon: ShieldAlert },
  { key: "product-requests", href: "/admin/product-requests", label: "Product Requests", icon: ClipboardList },
]

export default function AdminSidebar({ active }: AdminSidebarProps) {
  return (
    <aside className="bg-white rounded-2xl border border-gray-200 p-4 h-fit">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">Admin Menu</h2>
      <nav className="space-y-1">
        <Link
          href="/messages"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Messages</span>
        </Link>

        {adminItems.map((item) => {
          const Icon = item.icon
          const isActive = active === item.key

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                isActive ? "bg-black text-white" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
