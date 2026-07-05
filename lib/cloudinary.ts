import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export default cloudinary

export type CloudinaryUploadResult = {
  public_id: string
  secure_url: string
  width: number
  height: number
  format: string
  resource_type: string
}

/**
 * Upload a file buffer or base64 string to Cloudinary.
 * @param source  - file buffer or base64 data URI
 * @param folder  - destination folder in Cloudinary (e.g. "products", "avatars")
 * @param publicId - optional deterministic public_id
 */
export async function uploadToCloudinary(
  source: Buffer | string,
  folder: string,
  publicId?: string
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const options: Parameters<typeof cloudinary.uploader.upload>[1] = {
      folder,
      resource_type: "image",
      ...(publicId ? { public_id: publicId } : {}),
    }

    // upload_stream accepts a Buffer; upload() accepts a base64 data URI or path
    if (Buffer.isBuffer(source)) {
      const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
        if (error || !result) return reject(error ?? new Error("Upload failed"))
        resolve(result as CloudinaryUploadResult)
      })
      stream.end(source)
    } else {
      cloudinary.uploader.upload(source, options, (error, result) => {
        if (error || !result) return reject(error ?? new Error("Upload failed"))
        resolve(result as CloudinaryUploadResult)
      })
    }
  })
}

/**
 * Delete an image from Cloudinary by its public_id.
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId)
}
