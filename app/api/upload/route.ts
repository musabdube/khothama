import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { uploadToCloudinary } from "@/lib/cloudinary"

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

const ALLOWED_FOLDERS = new Set(["products", "avatars", "categories", "brands", "requests"])

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const file = formData.get("file")
  const folder = (formData.get("folder") as string | null) ?? "products"

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Unsupported file type. Allowed: JPEG, PNG, WEBP, GIF" }, { status: 400 })
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File too large. Maximum size is 10 MB" }, { status: 400 })
  }

  // Sanitize folder to prevent path traversal
  const safeFolder = ALLOWED_FOLDERS.has(folder) ? `khothama/${folder}` : "khothama/products"

  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    const result = await uploadToCloudinary(buffer, safeFolder)
    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    })
  } catch (error) {
    console.error("[upload] Cloudinary error:", error)
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 })
  }
}
