import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { v4 as uuidv4 } from "uuid"

// Initialize S3 Client for Cloudflare R2
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "",
  },
})

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || ""
const PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL || ""

/**
 * Uploads a file buffer to Cloudflare R2
 * @param buffer - File data
 * @param fileName - Original file name or target key
 * @param contentType - MIME type (e.g. image/jpeg, application/pdf)
 * @param folder - Optional folder prefix (e.g. "deliveries", "inventory")
 * @returns Object containing publicUrl and key
 */
export async function uploadToR2(buffer: Buffer | Uint8Array, fileName: string, contentType: string, folder: string = "uploads") {
  if (!BUCKET_NAME) throw new Error("R2 Bucket name not configured")

  // Generate unique file name
  const extension = fileName.split('.').pop()
  const uniqueId = uuidv4()
  const key = `${folder}/${uniqueId}.${extension}`

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  })

  await s3Client.send(command)

  return {
    key,
    publicUrl: `${PUBLIC_URL}/${key}`
  }
}

/**
 * Deletes a file from Cloudflare R2
 * @param key - The file path/key inside the bucket
 */
export async function deleteFromR2(key: string) {
  if (!BUCKET_NAME) throw new Error("R2 Bucket name not configured")

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  await s3Client.send(command)
  return true
}

/**
 * Gets the public URL for a file in R2
 * @param key - The file path/key inside the bucket
 */
export function getR2PublicUrl(key: string) {
  return `${PUBLIC_URL}/${key}`
}
