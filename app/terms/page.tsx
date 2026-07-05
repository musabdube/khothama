import InfoPageShell from "@/components/InfoPageShell"

const sections = [
  {
    title: "Using the platform",
    items: [
      "You are responsible for the accuracy of the content, pricing and availability details you publish.",
      "You must not list prohibited, fraudulent or misleading products.",
      "You must use the messaging and ordering tools in good faith and not to harass or mislead other users.",
    ],
  },
  {
    title: "Seller responsibilities",
    items: [
      "Sellers should keep stock, delivery options and location details up to date.",
      "Sellers should respond to buyers within a reasonable time where possible.",
      "Promotions, discounts and offers should reflect genuine, honored pricing decisions.",
    ],
  },
  {
    title: "Enforcement and moderation",
    items: [
      "Khothama may review, restrict or remove content that violates platform rules or creates safety risk.",
      "Admin approvals, reports and moderation tools exist to protect marketplace quality and trust.",
      "Repeat abuse may result in listing removal, account limitation or suspension.",
    ],
  },
]

export default function TermsPage() {
  return (
    <InfoPageShell
      eyebrow="Legal"
      title="Terms of Use"
      description="These terms describe the general rules for using Khothama. They are written to set expectations for buyers, sellers and administrators using the marketplace."
      highlights={[
        { label: "Applies to", value: "All marketplace users" },
        { label: "Covers", value: "Listings, accounts, messaging and orders" },
        { label: "Updated", value: "March 2026" },
      ]}
    >
      {sections.map((section) => (
        <div key={section.title} className="rounded-[28px] border border-gray-200 bg-white p-6">
          <h2 className="text-2xl font-semibold text-gray-950">{section.title}</h2>
          <div className="mt-4 space-y-3 text-sm leading-7 text-gray-600">
            {section.items.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </div>
      ))}

      <div className="rounded-[28px] border border-gray-200 bg-white p-6">
        <h2 className="text-2xl font-semibold text-gray-950">Important note</h2>
        <p className="mt-4 text-sm leading-7 text-gray-600">
          These terms are a product-facing summary for the current platform experience. If you need a fully reviewed legal version for production deployment, it should be finalized with a qualified legal professional in your operating jurisdiction.
        </p>
      </div>
    </InfoPageShell>
  )
}