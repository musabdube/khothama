import Link from "next/link"
import Image from "next/image"

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
      <Image
        src="/404.png"
        alt="Page not found"
        width={400}
        height={400}
        className="max-w-full"
        priority
      />

      <h1 className="text-3xl font-bold mt-6 mb-2">Page Not Found</h1>
      <p className="text-gray-500 mb-8">
        Sorry, the page you're looking for doesn't exist or has been moved.
      </p>

      <Link
        href="/"
        className="inline-flex items-center gap-2 bg-black text-white px-8 py-3.5 rounded-2xl text-sm font-semibold hover:bg-gray-800 active:scale-95 transition"
      >
        Return to Home
      </Link>
    </main>
  )
}
