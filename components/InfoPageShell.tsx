import Header from "@/components/Header"
import Footer from "@/components/Footer"

type Highlight = {
  label: string
  value: string
}

type InfoPageShellProps = {
  eyebrow: string
  title: string
  description: string
  highlights: Highlight[]
  children: React.ReactNode
}

export default function InfoPageShell({ eyebrow, title, description, highlights, children }: InfoPageShellProps) {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <section className="max-w-7xl mx-auto w-full px-6 py-8 flex-1">
        <div className="mb-6 rounded-[30px] border border-gray-200 bg-[linear-gradient(135deg,#ffffff,#eef6ff)] p-6 shadow-sm">
          <div className="inline-flex rounded-full border border-sky-100 bg-white/90 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-sky-700">
            {eyebrow}
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-gray-950">{title}</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">{description}</p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {highlights.map((highlight) => (
              <div key={highlight.label} className="rounded-2xl border border-gray-200 bg-white/80 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-gray-400">{highlight.label}</div>
                <div className="mt-1 text-lg font-semibold text-gray-950">{highlight.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4">{children}</div>
      </section>

      <Footer />
    </main>
  )
}