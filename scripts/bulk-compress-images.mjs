/**
 * Bulk compress all inventory images in Supabase.
 * Settings: max 2400px, JPEG Q88, mozjpeg — ~50% size reduction
 *
 * Covers:
 *   - products.image_url  (431 rows)
 *   - product_images.url  (339 rows)
 *
 * Usage:
 *   node scripts/bulk-compress-images.mjs          # dry run (no changes)
 *   node scripts/bulk-compress-images.mjs --run    # live run
 */

import sharp from "sharp"
import { createClient } from "@supabase/supabase-js"
import https from "https"
import http from "http"

const DRY_RUN = !process.argv.includes("--run")
const MAX_DIM = 2400
const QUALITY = 88
const SUPABASE_URL = "https://xplnyaxkusvuajtmorss.supabase.co"
const SERVICE_KEY = "REDACTED_JWT"
const BUCKET = "product-images"

const sb = createClient(SUPABASE_URL, SERVICE_KEY)

function download(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http
    const chunks = []
    lib.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`))
      res.on("data", c => chunks.push(c))
      res.on("end", () => resolve(Buffer.concat(chunks)))
      res.on("error", reject)
    }).on("error", reject)
  })
}

function formatSize(b) {
  if (b < 1024) return `${b}B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)}KB`
  return `${(b / (1024 * 1024)).toFixed(2)}MB`
}

// Extract storage path from public URL
function extractPath(url) {
  const marker = `/object/public/${BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return url.slice(idx + marker.length)
}

async function processImage(url) {
  if (!url || !url.startsWith("http")) return null

  const originalBuf = await download(url)
  const meta = await sharp(originalBuf).metadata()

  // Skip non-image or already small
  if (!["jpeg", "jpg", "png", "webp"].includes(meta.format)) return null
  if (originalBuf.length < 100 * 1024) return { skipped: true, reason: "already small" }

  // Skip if already at or below target dimensions
  if (meta.width <= MAX_DIM && meta.height <= MAX_DIM && originalBuf.length < 550 * 1024) {
    return { skipped: true, reason: "already optimised" }
  }

  const compressedBuf = await sharp(originalBuf)
    .resize(MAX_DIM, MAX_DIM, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: QUALITY, mozjpeg: true, progressive: true })
    .toBuffer()

  // Only proceed if we actually saved space
  if (compressedBuf.length >= originalBuf.length) {
    return { skipped: true, reason: "no saving" }
  }

  const storagePath = extractPath(url)
  if (!storagePath) return { skipped: true, reason: "external URL" }

  const saving = originalBuf.length - compressedBuf.length
  const pct = ((saving / originalBuf.length) * 100).toFixed(1)

  if (!DRY_RUN) {
    // Re-upload (overwrite) in-place with same path
    const { error: upErr } = await sb.storage
      .from(BUCKET)
      .upload(storagePath, compressedBuf, {
        contentType: "image/jpeg",
        upsert: true,
      })
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`)
  }

  return {
    skipped: false,
    originalSize: originalBuf.length,
    compressedSize: compressedBuf.length,
    saving,
    pct,
  }
}

async function fetchAll(table, column) {
  const rows = []
  let page = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await sb
      .from(table)
      .select(`id, ${column}`)
      .not(column, "is", null)
      .neq(column, "")
      .range(page * PAGE, (page + 1) * PAGE - 1)
    if (error) throw new Error(error.message)
    if (!data?.length) break
    rows.push(...data)
    if (data.length < PAGE) break
    page++
  }
  return rows
}

async function main() {
  console.log(DRY_RUN ? "🔍 DRY RUN — no changes will be made\n" : "🚀 LIVE RUN — compressing and overwriting images\n")
  console.log(`Settings: max ${MAX_DIM}px, JPEG Q${QUALITY}, mozjpeg\n`)

  const [productRows, imageRows] = await Promise.all([
    fetchAll("products", "image_url"),
    fetchAll("product_images", "url"),
  ])

  const tasks = [
    ...productRows.map(r => ({ table: "products", id: r.id, url: r.image_url, col: "image_url" })),
    ...imageRows.map(r => ({ table: "product_images", id: r.id, url: r.url, col: "url" })),
  ]

  console.log(`📋 Total images to process: ${tasks.length}`)
  console.log(`   • products.image_url : ${productRows.length}`)
  console.log(`   • product_images.url : ${imageRows.length}\n`)

  let done = 0, skipped = 0, errors = 0
  let totalOriginal = 0, totalCompressed = 0

  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i]
    const progress = `[${String(i + 1).padStart(4)}/${tasks.length}]`

    try {
      const result = await processImage(t.url)
      if (!result) { skipped++; continue }

      if (result.skipped) {
        skipped++
        if (i < 5 || i % 50 === 0) console.log(`${progress} SKIP  ${result.reason}  ${t.url.split("/").pop()}`)
        continue
      }

      totalOriginal += result.originalSize
      totalCompressed += result.compressedSize
      done++

      console.log(
        `${progress} ✓  ${formatSize(result.originalSize)} → ${formatSize(result.compressedSize)} (-${result.pct}%)  ${t.url.split("/").pop()?.slice(0, 50)}`
      )
    } catch (err) {
      errors++
      console.error(`${progress} ✗  ERROR: ${err.message}  ${t.url?.slice(0, 60)}`)
    }
  }

  const totalSaving = totalOriginal - totalCompressed
  const totalPct = totalOriginal > 0 ? ((totalSaving / totalOriginal) * 100).toFixed(1) : 0

  console.log("\n" + "━".repeat(60))
  console.log("📊 SUMMARY")
  console.log("━".repeat(60))
  console.log(`Compressed : ${done} images`)
  console.log(`Skipped    : ${skipped} (already small / external)`)
  console.log(`Errors     : ${errors}`)
  console.log(`Before     : ${formatSize(totalOriginal)}`)
  console.log(`After      : ${formatSize(totalCompressed)}`)
  console.log(`Saved      : ${formatSize(totalSaving)} (${totalPct}%)`)
  console.log("━".repeat(60))

  if (DRY_RUN) {
    console.log("\n✅ Dry run complete. Run with --run to apply changes:")
    console.log("   node scripts/bulk-compress-images.mjs --run")
  } else {
    console.log("\n✅ All done! Images updated in Supabase storage.")
  }
}

main().catch(e => { console.error("❌ Fatal:", e.message); process.exit(1) })
