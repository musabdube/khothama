"use client"

import { useRef, useState } from "react"

type ImageUploadProps = {
  /** Current image URL (Cloudinary or external) */
  value?: string | null
  /** Called with the final URL whenever it changes */
  onChange: (url: string) => void
  /** Cloudinary folder to upload into. Defaults to "products" */
  folder?: "products" | "avatars" | "categories" | "brands" | "requests"
  /** Label shown on the upload button */
  label?: string
  /** Optional shape override */
  shape?: "square" | "circle"
}

type UploadState = "idle" | "uploading" | "error"

export default function ImageUpload({
  value,
  onChange,
  folder = "products",
  label = "Upload Image",
  shape = "square",
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [urlInput, setUrlInput] = useState("")
  const [state, setState] = useState<UploadState>("idle")
  const [errorMsg, setErrorMsg] = useState("")

  const preview = value || null
  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-xl"

  async function handleFile(file: File) {
    setState("uploading")
    setErrorMsg("")

    const form = new FormData()
    form.append("file", file)
    form.append("folder", folder)

    try {
      const res = await fetch("/api/upload", { method: "POST", body: form })
      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error ?? "Upload failed")
        setState("error")
        return
      }

      onChange(data.url)
      setState("idle")
    } catch {
      setErrorMsg("Network error. Please try again.")
      setState("error")
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // reset so same file can be re-selected
    e.target.value = ""
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  function handleUrlSubmit() {
    const trimmed = urlInput.trim()
    if (!trimmed) return
    try {
      new URL(trimmed) // basic validation
      onChange(trimmed)
      setUrlInput("")
      setErrorMsg("")
    } catch {
      setErrorMsg("Please enter a valid URL")
    }
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Preview */}
      <div
        className={`relative bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer transition hover:border-gray-400 ${shapeClass}`}
        style={{ width: shape === "circle" ? 96 : "100%", height: shape === "circle" ? 96 : 180 }}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        title="Click or drag & drop to upload"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Preview"
            className={`absolute inset-0 w-full h-full object-cover ${shapeClass}`}
          />
        ) : (
          <span className="text-xs text-gray-400 select-none px-2 text-center">
            {state === "uploading" ? "Uploading…" : "Click or drag & drop"}
          </span>
        )}

        {state === "uploading" && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <svg className="animate-spin h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
            </svg>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileInput}
      />

      {/* Or use a URL */}
      <div className="flex gap-2 w-full">
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
          placeholder="Or paste an image URL…"
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black placeholder-gray-400"
        />
        <button
          type="button"
          onClick={handleUrlSubmit}
          className="px-3 py-2 text-sm bg-black text-white rounded-xl hover:bg-gray-800 transition whitespace-nowrap"
        >
          Use URL
        </button>
      </div>

      {/* Upload from device button */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={state === "uploading"}
        className="w-full py-2 text-sm border border-gray-300 rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
      >
        {state === "uploading" ? "Uploading…" : label}
      </button>

      {/* Error */}
      {state === "error" && errorMsg && (
        <p className="text-xs text-red-600">{errorMsg}</p>
      )}

      {/* Clear */}
      {preview && state !== "uploading" && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="text-xs text-gray-400 hover:text-red-500 transition self-start"
        >
          Remove image
        </button>
      )}
    </div>
  )
}
