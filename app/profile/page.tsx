"use client"

import * as Tabs from "@radix-ui/react-tabs"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import ProfileUpdateCard from "@/components/profile/ProfileUpdateCard"
import PersonalInformationForm from "@/components/profile/PersonalInformationForm"
import ProfileSettingsPanel from "@/components/profile/ProfileSettingsPanel"

const tabTriggerClassName =
  "px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-300 transition data-[state=active]:bg-black data-[state=active]:text-white"

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-700">Manage your account, personal details, and preferences.</p>
        </div>

        <Tabs.Root defaultValue="personal" className="w-full">
          <Tabs.List className="flex flex-wrap gap-3 mb-6">
            <Tabs.Trigger value="personal" className={tabTriggerClassName}>
              Personal
            </Tabs.Trigger>
            <Tabs.Trigger value="settings" className={tabTriggerClassName}>
              Settings
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="personal">
            <ProfileUpdateCard />
            <PersonalInformationForm />
          </Tabs.Content>

          <Tabs.Content value="settings">
            <ProfileSettingsPanel />
          </Tabs.Content>
        </Tabs.Root>
      </section>

      <Footer />
    </main>
  )
}
