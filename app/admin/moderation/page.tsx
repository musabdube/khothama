import ProductModerationPanel from "@/components/admin/ProductModerationPanel"

export default function AdminModerationPage() {
  return (
    <ProductModerationPanel
      activeSidebar="moderation"
      title="Admin Moderation"
      description="View products, approve/reject submissions, and track flagged items."
    />
  )
}
