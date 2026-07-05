import ProductModerationPanel from "@/components/admin/ProductModerationPanel"

export default function AdminProductsPage() {
  return (
    <ProductModerationPanel
      activeSidebar="products"
      title="Admin Products"
      description="Moderate product listings, handle approvals, and review flagged items."
    />
  )
}
