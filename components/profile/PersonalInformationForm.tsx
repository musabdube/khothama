"use client"

import { useState } from "react"

type PersonalInfo = {
  fullName: string
  lastName: string
  email: string
  phoneNumber: string
  dateOfBirth: string
  gender: string
}

const initialState: PersonalInfo = {
  fullName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  dateOfBirth: "",
  gender: "",
}

export default function PersonalInformationForm() {
  const [formData, setFormData] = useState<PersonalInfo>(initialState)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
  }

  return (
    <section className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mt-4 sm:mt-6">
      <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Personal Information</h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
        <div>
          <label htmlFor="fullName" className="block text-xs sm:text-sm font-medium text-gray-900 mb-2">
            Full Name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            value={formData.fullName}
            onChange={handleChange}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm text-gray-900 placeholder-gray-600 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
            placeholder="John"
          />
        </div>

        <div>
          <label htmlFor="lastName" className="block text-xs sm:text-sm font-medium text-gray-900 mb-2">
            Last Name
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            value={formData.lastName}
            onChange={handleChange}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm text-gray-900 placeholder-gray-600 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
            placeholder="Doe"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-900 mb-2">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm text-gray-900 placeholder-gray-600 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
            placeholder="john@example.com"
          />
        </div>

        <div>
          <label htmlFor="phoneNumber" className="block text-xs sm:text-sm font-medium text-gray-900 mb-2">
            Phone Number
          </label>
          <input
            id="phoneNumber"
            name="phoneNumber"
            type="tel"
            value={formData.phoneNumber}
            onChange={handleChange}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm text-gray-900 placeholder-gray-600 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
            placeholder="+27 00 000 0000"
          />
        </div>

        <div>
          <label htmlFor="dateOfBirth" className="block text-xs sm:text-sm font-medium text-gray-900 mb-2">
            Date of Birth
          </label>
          <input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            value={formData.dateOfBirth}
            onChange={handleChange}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm text-gray-900 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label htmlFor="gender" className="block text-xs sm:text-sm font-medium text-gray-900 mb-2">
            Gender
          </label>
          <select
            id="gender"
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm text-gray-900 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black bg-white"
          >
            <option value="">Select gender</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
            <option value="prefer-not-to-say">Prefer not to say</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            className="w-full sm:w-auto bg-black text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-medium hover:bg-gray-800 transition"
          >
            Save Personal Information
          </button>
        </div>
      </form>
    </section>
  )
}
