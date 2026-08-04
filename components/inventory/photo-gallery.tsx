"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ImageIcon, X, Star } from "lucide-react"
import { toast } from "sonner"

interface ProductImage {
  id?: string
  url: string
  is_main: boolean
  order: number
}

interface PhotoGalleryProps {
  images: ProductImage[]
  onImagesChange: (images: ProductImage[]) => void
  onUpload: (files: File[]) => Promise<{ urls: string[] }>
  disabled?: boolean
}

export function PhotoGallery({ images, onImagesChange, onUpload, disabled }: PhotoGalleryProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"))
    if (files.length > 0) {
      handleFilesSelect(files)
    }
  }

  const handleFilesSelect = async (files: File[]) => {
    if (images.length + files.length > 10) {
      toast.error("Maximum 10 images allowed")
      return
    }

    setUploading(true)
    try {
      const { urls } = await onUpload(files)
      const newImages = urls.map((url, idx) => ({
        url,
        is_main: images.length === 0 && idx === 0,
        order: images.length + idx,
      }))
      onImagesChange([...images, ...newImages])
      toast.success(`${files.length} image${files.length > 1 ? "s" : ""} added`)
    } catch (error) {
      console.error("Upload error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to upload images")
    } finally {
      setUploading(false)
    }
  }

  const setMainImage = (index: number) => {
    const updated = images.map((img, i) => ({
      ...img,
      is_main: i === index,
    }))
    onImagesChange(updated)
  }

  const removeImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index)
    if (images[index].is_main && updated.length > 0) {
      updated[0].is_main = true
    }
    onImagesChange(updated)
  }

  const moveImage = (fromIndex: number, toIndex: number) => {
    const updated = [...images]
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(toIndex, 0, moved)
    updated.forEach((img, idx) => {
      img.order = idx
    })
    onImagesChange(updated)
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
        } ${uploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled && !uploading) {
            const input = document.createElement("input")
            input.type = "file"
            input.multiple = true
            input.accept = "image/*"
            input.onchange = (e) => {
              const files = Array.from((e.target as HTMLInputElement).files || [])
              handleFilesSelect(files)
            }
            input.click()
          }
        }}
      >
        <div className="flex flex-col items-center gap-2">
          <ImageIcon className="w-8 h-8 text-muted-foreground" />
          <div>
            <p className="font-medium text-sm">Click to upload or drag and drop</p>
            <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB (max 10 images)</p>
          </div>
        </div>
      </div>

      {/* Images Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {images.map((img, idx) => (
            <div key={idx} className="relative group">
              <div className="relative w-full aspect-square rounded-lg border overflow-hidden bg-muted">
                <img
                  src={img.url}
                  alt={`Product image ${idx + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = "none"
                    target.parentElement!.innerHTML =
                      '<div class="w-full h-full flex items-center justify-center"><svg class="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>'
                  }}
                />
              </div>

              {/* Overlay */}
              <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-black/50 h-8 w-8 p-0"
                  onClick={() => setMainImage(idx)}
                  title="Set as primary image"
                >
                  <Star className={`w-4 h-4 ${img.is_main ? "fill-yellow-400 text-yellow-400" : "text-white"}`} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-black/50 h-8 w-8 p-0"
                  onClick={() => removeImage(idx)}
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Main Badge */}
              {img.is_main && (
                <Badge className="absolute top-2 left-2 bg-blue-600">Primary</Badge>
              )}

              {/* Order Number */}
              <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs font-semibold px-2 py-1 rounded">
                {idx + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        {images.length} / 10 images
        {images.length > 0 && images[0]?.is_main ? (
          <span className="text-blue-600 ml-2">Primary image selected</span>
        ) : null}
      </p>
    </div>
  )
}
