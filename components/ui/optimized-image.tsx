"use client"

import { useEffect, useMemo, useState, type ImgHTMLAttributes } from "react"

type OptimizedImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  src: string
  webpWidth?: number
  webpQuality?: number
}

function canOptimizeImage(src: string) {
  if (!src) return false
  const lowerSrc = src.toLowerCase().split("?")[0]
  if (src.startsWith("data:")) return false
  if (src.startsWith("blob:")) return false
  if (src.toLowerCase().includes("/api/images/webp")) return false
  if (lowerSrc.endsWith(".webp")) return false
  if (lowerSrc.endsWith(".svg")) return false
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
  const webpSrc = useMemo(
    () => (canOptimizeImage(src) ? getWebpUrl(src, webpWidth, webpQuality) : src),
    [src, webpWidth, webpQuality],
  )
  const [activeSrc, setActiveSrc] = useState(webpSrc)

  useEffect(() => {
    setActiveSrc(webpSrc)
  }, [webpSrc])

  const handleError: ImgHTMLAttributes<HTMLImageElement>["onError"] = (event) => {
    if (activeSrc !== src) {
      setActiveSrc(src)
      return
    }
    onError?.(event)
  }

  return (
    <img
      src={activeSrc}
      alt={alt}
      loading={loading}
      decoding={decoding}
      onError={handleError}
      {...props}
    />
  )
}