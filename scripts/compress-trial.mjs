/**
 * Trial script: compress ONE inventory image and show before/after stats.
 * Run: node scripts/compress-trial.mjs
 *
 * Strategy:
 *  - JPEG/JPG → re-encode at quality 85 (visually lossless, ~30-60% smaller)
 *  - PNG       → WebP lossless (identical pixels, ~25-40% smaller)
 *  - We NEVER re-upload in trial mode — just save locally to compare
 */

import sharp from "sharp"
import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"
import https from "https"

const SUPABASE_URL = "https://xplnyaxkusvuajtmorss.supabase.co"
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "REDACTED_JWT"

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

function download(url) {
  return new Promise((resolve, reject) => {
    const chunks = []
    https.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${url}`))
      res.on("data", (c) => chunks.push(c))
      res.on("end", () => resolve(Buffer.concat(chunks)))
      res.on("error", reject)
    }).on("error", reject)
  })
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

async function main() {
  console.log("🔍 Fetching one inventory image from database...\n")

  // Pick the first product that has an image_url
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, image_url")
    .not("image_url", "is", null)
    .neq("image_url", "")
    .limit(10)

  if (error) throw new Error(`DB error: ${error.message}`)
  if (!products?.length) throw new Error("No products with images found")

  // Pick the first one with a real http URL
  const product = products.find(p => p.image_url?.startsWith("http"))
  if (!product) throw new Error("No products with http image URLs found")

  console.log(`📦 Product: ${product.name}`)
  console.log(`🔗 URL: ${product.image_url}\n`)

  // Download original
  console.log("⬇️  Downloading original image...")
  const originalBuffer = await download(product.image_url)
  const originalSize = originalBuffer.length

  // Detect format
  const meta = await sharp(originalBuffer).metadata()
  const format = meta.format
  const width = meta.width
  const height = meta.height

  console.log(`📐 Dimensions: ${width}×${height}px`)
  console.log(`📄 Format: ${format?.toUpperCase()}`)
  console.log(`📦 Original size: ${formatSize(originalSize)}\n`)

  // Save original for visual comparison
  const outDir = path.join(process.cwd(), "scripts", "trial-output")
  fs.mkdirSync(outDir, { recursive: true })

  const origExt = format === "png" ? "png" : "jpg"
  const origPath = path.join(outDir, `original.${origExt}`)
  fs.writeFileSync(origPath, originalBuffer)
  console.log(`💾 Original saved → ${origPath}`)

  const MAX_DIM = 1200

  // --- Option A: compress-only (no resize) ---
  let compressOnly
  if (format === "png") {
    compressOnly = await sharp(originalBuffer).webp({ lossless: true, effort: 6 }).toBuffer()
  } else {
    compressOnly = await sharp(originalBuffer)
      .jpeg({ quality: 85, mozjpeg: true, progressive: true })
      .toBuffer()
  }
  const compressOnlyPath = path.join(outDir, `compress-only.${format === "png" ? "webp" : "jpg"}`)
  fs.writeFileSync(compressOnlyPath, compressOnly)

  // --- Option B: resize to max 1200px + compress (recommended for phone photos) ---
  const needsResize = (width > MAX_DIM || height > MAX_DIM)
  let resizeCompress
  if (format === "png") {
    resizeCompress = await sharp(originalBuffer)
      .resize(MAX_DIM, MAX_DIM, { fit: "inside", withoutEnlargement: true })
      .webp({ lossless: true, effort: 6 })
      .toBuffer()
  } else {
    resizeCompress = await sharp(originalBuffer)
      .resize(MAX_DIM, MAX_DIM, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true, progressive: true })
      .toBuffer()
  }
  const resizedMeta = await sharp(resizeCompress).metadata()
  const resizeCompressPath = path.join(outDir, `resize-compress.${format === "png" ? "webp" : "jpg"}`)
  fs.writeFileSync(resizeCompressPath, resizeCompress)

  const pctA = (((originalSize - compressOnly.length) / originalSize) * 100).toFixed(1)
  const pctB = (((originalSize - resizeCompress.length) / originalSize) * 100).toFixed(1)

  console.log("\n" + "━".repeat(55))
  console.log("📊 COMPARISON RESULTS")
  console.log("━".repeat(55))
  console.log(`Original  : ${formatSize(originalSize)}  (${width}×${height}px)`)
  console.log("─".repeat(55))
  console.log(`Option A  : Compress-only (no resize)`)
  console.log(`           → ${formatSize(compressOnly.length)}  (${pctA}% ${Number(pctA)>=0?"saved":"larger"})`)
  console.log(`           → ${compressOnlyPath}`)
  console.log("─".repeat(55))
  console.log(`Option B  : Resize to max ${MAX_DIM}px + compress  ← RECOMMENDED`)
  console.log(`           → ${formatSize(resizeCompress.length)}  (${pctB}% saved)  ${resizedMeta.width}×${resizedMeta.height}px`)
  console.log(`           → ${resizeCompressPath}`)
  console.log("━".repeat(55))

  if (!needsResize) {
    console.log("\nℹ️  Image is already ≤1200px — resize+compress = compress-only for this one.")
  }

  console.log("\n🖼️  Open files to compare visually:")
  console.log(`   Original           : ${origPath}`)
  console.log(`   Option A (no resize): ${compressOnlyPath}`)
  console.log(`   Option B (resized)  : ${resizeCompressPath}`)
  console.log("\n✅ If Option B looks good, run the bulk script to update all inventory images.")
}

main().catch((e) => { console.error("❌", e.message); process.exit(1) })
