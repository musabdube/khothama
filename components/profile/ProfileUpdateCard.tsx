"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import ImageUpload from "@/components/ImageUpload"

type ProfileUpdateCardProps = {
  currentAvatar?: string | null
}

export default function ProfileUpdateCard({ currentAvatar }: ProfileUpdateCardProps) {
  const { data: session, update } = useSession()
  const [avatarUrl, setAvatarUrl] = useState<string>("")
  const [lastSavedUrl, setLastSavedUrl] = useState<string>("")
  const [initialized, setInitialized] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    if (!initialized) {
      const initial = currentAvatar ?? session?.user?.image ?? ""
      setAvatarUrl(initial)
      setLastSavedUrl(initial)
      setInitialized(true)
    }
  }, [currentAvatar, session?.user?.image, initialized])

  async function saveAvatar(nextAvatar: string) {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/profile/avatar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: nextAvatar }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Failed to update profile picture" })
      } else {
        setLastSavedUrl(nextAvatar)
        await update({ user: { image: nextAvatar || null } })
        setMessage({ type: "success", text: "Profile picture updated!" })
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
      <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-4 sm:mb-6">Profile Update</h2>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
        {/* Avatar upload – circle shape, upload to avatars folder */}
        <ImageUpload
          value={avatarUrl || null}
          onChange={(nextUrl) => {
            setAvatarUrl(nextUrl)
            if (nextUrl !== lastSavedUrl) {
              void saveAvatar(nextUrl)
            }
          }}
          folder="avatars"
          label="Change Profile Picture"
          shape="circle"
        />

        <div className="space-y-2 sm:space-y-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => void saveAvatar(avatarUrl)}
            disabled={saving}
            className="w-full sm:w-auto block bg-black text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50"
          >
            {saving ? "Saving…" : "Update Profile"}
          </button>

          {message && (
            <p className={`text-xs ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
              {message.text}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
