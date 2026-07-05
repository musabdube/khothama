import InfoPageShell from "@/components/InfoPageShell"

const privacySections = [
  {
    title: "What we collect",
    body:
      "Khothama stores account details, listing information, order records, conversations, wishlist data and operational metadata needed to run the marketplace experience.",
  },
  {
    title: "How we use data",
    body:
      "We use data to authenticate users, show products, support messaging, process orders, power notifications, moderate content and improve usability across the platform.",
  },
  {
    title: "How data is shared",
    body:
      "Relevant information is shared between buyers, sellers and administrators only where required to make the marketplace function, support communication or enforce platform policies.",
  },
  {
    title: "Retention and access",
    body:
      "Operational records may be retained for security, moderation and support purposes. Access should be limited to the users involved and authorized administrators.",
  },
]

export default function PrivacyPolicyPage() {
  return (
    <InfoPageShell
      eyebrow="Privacy"
      title="Privacy Policy"
      description="This page explains, at a product level, how information is used inside Khothama. It is intended to be readable by normal users while still covering the important operational behavior of the platform."
      highlights={[
        { label: "Data types", value: "Accounts, listings, orders, messages" },
        { label: "Purpose", value: "Operate, secure and improve the marketplace" },
        { label: "Updated", value: "March 2026" },
      ]}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {privacySections.map((section) => (
          <div key={section.title} className="rounded-[28px] border border-gray-200 bg-white p-6">
            <h2 className="text-2xl font-semibold text-gray-950">{section.title}</h2>
            <p className="mt-4 text-sm leading-7 text-gray-600">{section.body}</p>
          </div>
        ))}
      </div>

      <div className="rounded-[28px] border border-gray-200 bg-white p-6">
        <h2 className="text-2xl font-semibold text-gray-950">Implementation note</h2>
        <p className="mt-4 text-sm leading-7 text-gray-600">
          This privacy page reflects the current product structure in the repository. For a production release, you should align the final policy wording with your actual deployment, retention practices, hosting setup and any applicable legal requirements.
        </p>
      </div>
    </InfoPageShell>
  )
}