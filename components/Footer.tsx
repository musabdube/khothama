import Link from "next/link"

export default function Footer() {
  return (
    <footer className="bg-black text-white py-6 sm:py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
        <div>
          <h4 className="font-semibold text-sm sm:text-base mb-4">Khothama</h4>
          <p className="text-gray-400 text-xs sm:text-sm">
            A modern platform to buy and sell products easily.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-sm sm:text-base mb-4">Company</h4>
          <ul className="space-y-2 text-gray-400 text-xs sm:text-sm">
            <li>
              <Link href="/about" className="hover:text-white transition">About</Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-white transition">Contact</Link>
            </li>
            <li>
              <Link href="/myshop" className="hover:text-white transition">My Shop</Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-sm sm:text-base mb-4">Support</h4>
          <ul className="space-y-2 text-gray-400 text-xs sm:text-sm">
            <li>
              <Link href="/help-center" className="hover:text-white transition">Help Center</Link>
            </li>
            <li>
              <Link href="/privacy-policy" className="hover:text-white transition">Privacy Policy</Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-white transition">Terms</Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="text-center text-gray-500 text-xs sm:text-sm mt-6 sm:mt-10">
        © 2026 Khothama. All rights reserved.
      </div>
    </footer>
  )
}
