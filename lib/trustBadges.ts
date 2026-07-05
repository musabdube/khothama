type TrustBadgeInput = {
  tags: string[]
  brand: string | null
  sellerVerified: boolean
  sellerPublishedCount: number
  averageRating: number | null
  popularity: number
}

function normalizeTag(tag: string) {
  return tag.trim().toLowerCase().replace(/\s+/g, "_")
}

export function buildTrustBadges(input: TrustBadgeInput) {
  const badges: string[] = []
  const normalizedTags = new Set(input.tags.map(normalizeTag))

  const hasTag = (...values: string[]) => values.some((value) => normalizedTags.has(normalizeTag(value)))

  if (input.sellerVerified) badges.push("Verified seller")
  if (input.sellerPublishedCount >= 3) badges.push("Top seller")
  if (input.averageRating !== null && input.averageRating >= 4) badges.push(`Rated ${input.averageRating.toFixed(1)}★`)
  if (hasTag("delivery:DOOR_TO_DOOR_DROPOFF", "delivery:DOOR_PICKUP")) badges.push("Fast delivery")
  if (hasTag("authentic", "original", "genuine")) badges.push("Authentic")
  if (input.brand) badges.push("Brand")
  if (hasTag("quality_checked", "quality-checked", "qc")) badges.push("Quality checked")
  if (hasTag("ecofriendly", "eco-friendly", "eco_friendly")) badges.push("Ecofriendly")
  if (hasTag("fresh")) badges.push("Fresh")
  if (input.popularity >= 50) badges.push("Top performer")

  return badges.slice(0, 6)
}