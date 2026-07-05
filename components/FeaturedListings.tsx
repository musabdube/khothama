"use client"

import Image from "next/image"
import ProductCard from "./ProductCard"

type Product = {
  id: string
  title: string
  price: string
  originalPrice?: string
  image: string
  brand: string
  location: string
  category: string
  badges: string[]
}

type FeaturedListingsProps = {
  products: Product[]
}

export default function FeaturedListings({ products }: FeaturedListingsProps) {
  return (
    <section className="py-8 sm:py-12 md:py-16 px-3 sm:px-4 md:px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-2xl md:text-3xl font-semibold text-gray-900">Featured Listings</h2>
        </div>

        {products.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Image src="/NoItems.png" alt="No items" width={440} height={440} className="mb-4 opacity-80" />
            <p className="text-gray-500 text-sm">No featured products yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-8">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                title={product.title}
                price={product.price}
                originalPrice={product.originalPrice}
                image={product.image}
                category={product.category}
                badges={product.badges}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

