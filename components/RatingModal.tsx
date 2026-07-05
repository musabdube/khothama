"use client"

import { useState } from "react"
import { Star } from "lucide-react"

type Props = {
  offerId: string
  sellerName: string
  onSuccess: () => void
  onClose: () => void
}

export default function RatingModal({ offerId, sellerName, onSuccess, onClose }: Props) {
  const [hovered, setHovered] = useState(0)
  const [selected, setSelected] = useState(0)
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async () => {
    if (selected === 0) {
      setError("Please select a star rating.")
      return
    }
    setIsSubmitting(true)
    setError("")
    try {
      const response = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId, rating: selected, comment: comment.trim() || null }),
      })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to submit rating")
      }
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit rating")
    } finally {
      setIsSubmitting(false)
    }
  }

  const labels: Record<number, string> = {
    1: "Poor",
    2: "Fair",
    3: "Good",
    4: "Very Good",
    5: "Excellent",
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Rate your experience</h2>
        <p className="text-sm text-gray-600 mb-5">
          How was your deal with <span className="font-medium text-gray-900">{sellerName}</span>?
        </p>

        {/* Stars */}
        <div className="flex items-center gap-2 mb-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setSelected(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="focus:outline-none transition-transform active:scale-90"
              aria-label={`Rate ${star} stars`}
            >
              <Star
                className={`w-9 h-9 transition-colors ${
                  star <= (hovered || selected)
                    ? "fill-amber-400 text-amber-400"
                    : "fill-gray-200 text-gray-200"
                }`}
              />
            </button>
          ))}
        </div>

        {(hovered || selected) > 0 && (
          <p className="text-sm font-medium text-amber-600 mb-4">
            {labels[hovered || selected]}
          </p>
        )}

        {/* Comment */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Leave an optional comment…"
          rows={3}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none mb-4"
        />

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || selected === 0}
            className="px-5 py-2 rounded-xl bg-black text-white text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50"
          >
            {isSubmitting ? "Submitting…" : "Submit rating"}
          </button>
        </div>
      </div>
    </div>
  )
}
