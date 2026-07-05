"use client"

import Link from "next/link"
import { useState } from "react"

type SettingsState = {
  emailNotifications: boolean
  orderUpdates: boolean
  messageAlerts: boolean
  marketingEmails: boolean
  profileVisibility: "public" | "private"
  language: "en" | "fr" | "sw"
  twoFactorAuth: boolean
}

const initialState: SettingsState = {
  emailNotifications: true,
  orderUpdates: true,
  messageAlerts: true,
  marketingEmails: false,
  profileVisibility: "public",
  language: "en",
  twoFactorAuth: false,
}

type ToggleRowProps = {
  title: string
  description: string
  checked: boolean
  onChange: () => void
}

function ToggleRow({ title, description, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 rounded-xl sm:rounded-2xl border border-gray-200 p-3 sm:p-4">
      <div className="min-w-0">
        <h3 className="text-xs sm:text-sm font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-xs sm:text-sm text-gray-700">{description}</p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative h-7 w-12 shrink-0 rounded-full border transition ${
          checked ? "border-black bg-black" : "border-gray-300 bg-gray-200"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  )
}

export default function ProfileSettingsPanel() {
  const [settings, setSettings] = useState<SettingsState>(initialState)

  const toggleSetting = (key: keyof Pick<
    SettingsState,
    "emailNotifications" | "orderUpdates" | "messageAlerts" | "marketingEmails" | "twoFactorAuth"
  >) => {
    setSettings((previous) => ({ ...previous, [key]: !previous[key] }))
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
  }

  return (
    <section className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base sm:text-xl font-semibold text-gray-900">Settings</h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Choose how Khothama contacts you and how your account behaves.
          </p>
        </div>

        <div className="rounded-xl sm:rounded-2xl border border-sky-100 bg-sky-50 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-sky-900 whitespace-nowrap">
          Changes here currently update the interface only.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 sm:mt-8 space-y-6 sm:space-y-8">
        <div>
          <div className="mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Notifications</h3>
            <p className="text-xs sm:text-sm text-gray-600">Control the alerts you want to receive.</p>
          </div>

          <div className="grid gap-3 sm:gap-4">
            <ToggleRow
              title="Email notifications"
              description="Receive important account activity summaries by email."
              checked={settings.emailNotifications}
              onChange={() => toggleSetting("emailNotifications")}
            />
            <ToggleRow
              title="Order updates"
              description="Get notified when your orders are confirmed, shipped or completed."
              checked={settings.orderUpdates}
              onChange={() => toggleSetting("orderUpdates")}
            />
            <ToggleRow
              title="Message alerts"
              description="Show alerts for new direct messages and support replies."
              checked={settings.messageAlerts}
              onChange={() => toggleSetting("messageAlerts")}
            />
            <ToggleRow
              title="Marketing emails"
              description="Receive occasional product tips, offers and marketplace news."
              checked={settings.marketingEmails}
              onChange={() => toggleSetting("marketingEmails")}
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900">Profile preferences</h3>
            <p className="mt-1 text-sm text-gray-600">
              Decide how visible your profile should be inside the marketplace.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="profileVisibility" className="block text-sm font-medium mb-2">
                  Profile visibility
                </label>
                <select
                  id="profileVisibility"
                  value={settings.profileVisibility}
                  onChange={(event) =>
                    setSettings((previous) => ({
                      ...previous,
                      profileVisibility: event.target.value as SettingsState["profileVisibility"],
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>

              <div>
                <label htmlFor="language" className="block text-sm font-medium mb-2">
                  Language
                </label>
                <select
                  id="language"
                  value={settings.language}
                  onChange={(event) =>
                    setSettings((previous) => ({
                      ...previous,
                      language: event.target.value as SettingsState["language"],
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="en">English</option>
                  <option value="fr">French</option>
                  <option value="sw">Swahili</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900">Security</h3>
            <p className="mt-1 text-sm text-gray-600">
              Keep your account protected with stronger sign-in controls.
            </p>

            <div className="mt-5 space-y-4">
              <ToggleRow
                title="Two-factor authentication"
                description="Add an extra verification step when signing in."
                checked={settings.twoFactorAuth}
                onChange={() => toggleSetting("twoFactorAuth")}
              />

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-900">Privacy and policy</p>
                <p className="mt-1 text-sm text-gray-600">
                  Review how your information is handled across the platform.
                </p>
                <Link
                  href="/privacy-policy"
                  className="mt-3 inline-flex rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-gray-100"
                >
                  View Privacy Policy
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">Your current choices are stored locally in this screen for now.</p>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-black px-6 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            Save Settings
          </button>
        </div>
      </form>
    </section>
  )
}