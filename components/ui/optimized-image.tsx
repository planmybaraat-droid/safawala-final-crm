"use client"

import type { ImgHTMLAttributes } from "react"

type OptimizedImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  src: string
  webpWidth?: number
  webpQuality?: number
}

function canOptimizeImage(src: string) {
  if (!src) return false
  if (src.startsWith("data:")) return false
  if (src.startsWith("blob:")) return false
  if (src.toLowerCase().includes("/api/images/webp")) return false
  if (src.toLowerCase().split("?")[0]?.endsWith(".webp")) return false
  return src.startsWith("/") || src.startsWith("http://") || src.startsWith("https://")
}

function getWebpUrl(src: string, width?: number, quality?: number) {
  const params = new URLSearchParams({ src })
  if (width) params.set("w", String(width))
  if (quality) params.set("q", String(quality))
  return `/api/images/webp?${params.toString()}`
}

export function OptimizedImage({
  src,
  alt,
  webpWidth,
  webpQuality,
  onError,
  loading = "lazy",
  decoding = "async",
  ...props
}: OptimizedImageProps) {
  const optimized = canOptimizeImage(src)
  const webpSrc = optimized ? getWebpUrl(src, webpWidth, webpQuality) : undefined

  const handleError: ImgHTMLAttributes<HTMLImageElement>["onError"] = (event) => {
    const image = event.currentTarget
    if (optimized && image.dataset.originalFallback !== "true") {
      image.dataset.originalFallback = "true"
      image.src = src
      return
    }
    onError?.(event)
  }

  if (!optimized) {
    return <img src={src} alt={alt} loading={loading} decoding={decoding} onError={onError} {...props} />
  }

  return (
    <picture style={{ display: "contents" }}>
      <source srcSet={webpSrc} type="image/webp" />
      <img src={src} alt={alt} loading={loading} decoding={decoding} onError={handleError} {...props} />
    </picture>
  )
}
