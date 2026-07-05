import { Compass, ShieldCheck, Store, Users } from "lucide-react"
import InfoPageShell from "@/components/InfoPageShell"

const pillars = [
  {
    title: "Built for Zimbabwean commerce",
    description:
      "Khothama is designed around real local buying and selling patterns, from city-based availability to direct seller messaging and flexible pickup options.",
    icon: Store,
  },
  {
    title: "Clearer trust signals",
    description:
      "We surface product approvals, reports, shop activity and conversation flows so buyers and sellers can make decisions with more context.",
    icon: ShieldCheck,
  },
  {
    title: "Simple seller tools",
    description:
      "Product management, shop insights, offers, promo codes and orders are all structured to help small sellers run without unnecessary overhead.",
    icon: Compass,
  },
]

export default function AboutPage() {
  return (
    <InfoPageShell
      eyebrow="Company"
      title="About Khothama"
      description="Khothama is a marketplace focused on making local commerce easier to manage, easier to browse, and easier to trust. We build around the practical needs of buyers and independent sellers, not around unnecessary complexity."
      highlights={[
        { label: "Focus", value: "Local buying and selling" },
        { label: "Audience", value: "Buyers, shops and independent sellers" },
        { label: "Approach", value: "Practical tools with clear workflows" },
      ]}
    >
      <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="rounded-[28px] border border-gray-200 bg-white p-6">
          <h2 className="text-2xl font-semibold text-gray-950">What we are building</h2>
          <p className="mt-3 text-sm leading-7 text-gray-600">
            We want Khothama to feel reliable for everyday transactions. That means category discovery that is easier to understand, product pages that answer practical questions quickly, and seller tools that help shops stay organized without needing a separate back office.
          </p>
          <p className="mt-3 text-sm leading-7 text-gray-600">
            Our product direction favors clarity over noise: cleaner management pages, simpler navigation, better messaging, and more useful metadata around availability, delivery and seller responsiveness.
          </p>
        </div>

        <div className="rounded-[28px] border border-gray-200 bg-white p-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
            <Users className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-gray-950">Who it serves</h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-gray-600">
            <li>Buyers who want to browse categories faster and contact sellers directly.</li>
            <li>Sellers who need one place to manage products, offers, promo codes and shop activity.</li>
            <li>Admins who need moderation and approval workflows without cluttering the public experience.</li>
          </ul>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {pillars.map((pillar) => {
          const Icon = pillar.icon

          return (
            <div key={pillar.title} className="rounded-[28px] border border-gray-200 bg-white p-6">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100 text-gray-700">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-gray-950">{pillar.title}</h3>
              <p className="mt-3 text-sm leading-7 text-gray-600">{pillar.description}</p>
            </div>
          )
        })}
      </div>
    </InfoPageShell>
  )
}