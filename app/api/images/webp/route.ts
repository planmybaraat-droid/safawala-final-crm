import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { promises as fs } from "fs"
import sharp from "sharp"

export const runtime = "nodejs"

const MAX_IMAGE_BYTES = 12 * 1024 * 1024
const MAX_CACHE_ITEMS = 160

const webpCache = new Map<string, Uint8Array>()

function getCachedImage(key: string) {
  const cached = webpCache.get(key)
  if (!cached) return null
  webpCache.delete(key)
  webpCache.set(key, cached)
  return cached
}

function setCachedImage(key: string, value: Uint8Array) {
  webpCache.set(key, value)
  if (webpCache.size > MAX_CACHE_ITEMS) {
    const oldestKey = webpCache.keys().next().value
    if (oldestKey) webpCache.delete(oldestKey)
  }
}

function webpResponse(data: Uint8Array) {
  return new NextResponse(new Blob([data as BlobPart], { type: "image/webp" }), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}

function clampNumber(value: string | null, min: number, max: number, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.round(parsed)))
}

async function readLocalPublicImage(src: string) {
  const publicRoot = path.join(process.cwd(), "public")
  const cleanSrc = src.split("?")[0].replace(/^\/+/, "")
  const filePath = path.resolve(publicRoot, cleanSrc)

  if (!filePath.startsWith(publicRoot)) {
    throw new Error("Invalid local image path")
  }

  return fs.readFile(filePath)
}

async function readRemoteImage(src: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(src, {
      signal: controller.signal,
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    })

    if (!response.ok) {
      throw new Error(`Image request failed: ${response.status}`)
    }

    const contentType = response.headers.get("content-type") || ""
    if (!contentType.startsWith("image/")) {
      throw new Error("Remote URL is not an image")
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      throw new Error("Image is too large to optimize")
    }

    return buffer
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const src = searchParams.get("src") || ""
    const width = clampNumber(searchParams.get("w"), 64, 1600, 900)
    const quality = clampNumber(searchParams.get("q"), 45, 92, 76)
    const cacheKey = `${src}|w=${width}|q=${quality}`

    if (!src || src.startsWith("data:") || src.startsWith("blob:")) {
      return NextResponse.json({ error: "Unsupported image source" }, { status: 400 })
    }

    if (src.includes("/api/images/webp")) {
      return NextResponse.json({ error: "Recursive image optimization is not allowed" }, { status: 400 })
    }

    const isLocalPublicImage = src.startsWith("/") && !src.startsWith("//")
    const isRemoteImage = src.startsWith("http://") || src.startsWith("https://")

    if (!isLocalPublicImage && !isRemoteImage) {
      return NextResponse.json({ error: "Only local public or http/https image URLs are allowed" }, { status: 400 })
    }

    const cached = getCachedImage(cacheKey)
    if (cached) {
      return webpResponse(cached)
    }

    const input = isLocalPublicImage ? await readLocalPublicImage(src) : await readRemoteImage(src)

    const outputBuffer = await sharp(input, { failOn: "none", animated: false })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality, effort: 4 })
      .toBuffer()
    const output = new Uint8Array(outputBuffer)
    setCachedImage(cacheKey, output)

    return webpResponse(output)
  } catch (error) {
    console.warn("[Image WebP] Optimization failed:", error)
    return NextResponse.json({ error: "Image optimization failed" }, { status: 422 })
  }
}
