import Link from "next/link"
import { CircleHelp, MessageCircle, Package, ShieldCheck } from "lucide-react"
import InfoPageShell from "@/components/InfoPageShell"

const faqs = [
  {
    question: "How do I list a product?",
    answer:
      "Open My Shop or Products, add your product information, images, category, availability and delivery options, then save it as a draft or publish it for review.",
  },
  {
    question: "How do buyers contact a seller?",
    answer:
      "Each product page supports direct messaging. Buyers can start a conversation from the product page and continue it from the messages area.",
  },
  {
    question: "How do offers and promo codes work?",
    answer:
      "Sellers can review offers on their product management page and respond to pending offers. Promo codes can be created per product to support discounts.",
  },
  {
    question: "What if I need admin support?",
    answer:
      "Use the contact page to open a support conversation with the Khothama admin team. Existing conversations remain available in the same support view.",
  },
]

export default function HelpCenterPage() {
  return (
    <InfoPageShell
      eyebrow="Support"
      title="Help Center"
      description="This is the fastest place to understand how Khothama works, how sellers manage listings, and where to go when you need support."
      highlights={[
        { label: "Topics", value: "Listings, messages, orders, support" },
        { label: "Best for", value: "Quick answers and next steps" },
        { label: "Need more help", value: "Open a support chat from Contact" },
      ]}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[28px] border border-gray-200 bg-white p-6">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
            <Package className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-gray-950">Selling on Khothama</h2>
          <p className="mt-3 text-sm leading-7 text-gray-600">
            Use Products to create listings, manage pricing and stock, attach delivery preferences, and keep your shop organized.
          </p>
        </div>

        <div className="rounded-[28px] border border-gray-200 bg-white p-6">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
            <MessageCircle className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-gray-950">Talking to buyers</h2>
          <p className="mt-3 text-sm leading-7 text-gray-600">
            Conversations are tied to products, so replies stay contextual. Keep availability, pricing and delivery details clear in messages.
          </p>
        </div>

        <div className="rounded-[28px] border border-gray-200 bg-white p-6">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-gray-950">Account and trust</h2>
          <p className="mt-3 text-sm leading-7 text-gray-600">
            Respect marketplace rules, keep listings accurate, and use the report and moderation flows when content looks suspicious or misleading.
          </p>
        </div>
      </div>

      <div className="rounded-[28px] border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100 text-gray-700">
            <CircleHelp className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-gray-950">Frequently asked questions</h2>
            <p className="mt-1 text-sm text-gray-500">Short answers to the common platform questions.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {faqs.map((faq) => (
            <div key={faq.question} className="rounded-2xl border border-gray-200 bg-gray-50/70 p-5">
              <h3 className="text-lg font-semibold text-gray-950">{faq.question}</h3>
              <p className="mt-2 text-sm leading-7 text-gray-600">{faq.answer}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/contact" className="inline-flex items-center rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800">
            Contact Support
          </Link>
          <Link href="/myshop" className="inline-flex items-center rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
            Go to My Shop
          </Link>
        </div>
      </div>
    </InfoPageShell>
  )
}