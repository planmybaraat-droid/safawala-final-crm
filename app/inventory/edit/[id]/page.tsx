"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, Package, Camera, Upload, ImageIcon, X } from "lucide-react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { generateBarcodesForProduct, getNextSequenceNumber } from "@/lib/barcode-utils"
import { ProductVariationManager } from "@/components/inventory/product-variation-manager"

interface ProductFormData {
  name: string
  description: string
  category: string
  subcategory?: string
  brand: string
  size: string
  color: string
  material: string
  price: number
  regular_price: number
  rental_price: number
  cost_price: number
  security_deposit: number
  stock_total: number
  reorder_level: number
  stock_available: number
  image_url?: string
}

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string

  const [loading, setLoading] = useState(false)
  const [loadingProduct, setLoadingProduct] = useState(true)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imagePreview, setImagePreview] = useState<string>("")
  const [productImages, setProductImages] = useState<{ id: string; url: string; isMain: boolean; order: number }[]>([])
  const [originalStockTotal, setOriginalStockTotal] = useState(0)
  const [productCode, setProductCode] = useState("")
  const [franchiseId, setFranchiseId] = useState("")
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    description: "",
    category: "",
    subcategory: "",
    brand: "",
    size: "",
    color: "",
    material: "",
    price: 0,
    regular_price: 0,
    rental_price: 0,
    cost_price: 0,
    security_deposit: 0,
    stock_total: 1,
    reorder_level: 5,
    stock_available: 1,
    image_url: "",
  })

  const [dbCategories, setDbCategories] = useState<any[]>([])
  const [subcategories, setSubcategories] = useState<any[]>([])
  const [selectedMainCategory, setSelectedMainCategory] = useState("")

  useEffect(() => {
    fetchCategories()
    fetchProduct()
  }, [productId])

  const fetchProduct = async () => {
    try {
      setLoadingProduct(true)
      
      // Get current user's franchise
      const userRes = await fetch("/api/auth/user")
      if (!userRes.ok) throw new Error("Failed to get user info")
      const user = await userRes.json()

      let query = supabase.from("products").select("*").eq("id", productId)
      
      // Only filter by franchise for non-super-admins
      if (user.role !== "super_admin" && user.franchise_id) {
        query = query.eq("franchise_id", user.franchise_id)
      }

      const { data, error } = await query.single()

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error("Product not found or you don't have permission to edit it")
        }
        throw error
      }

      if (data) {
        // Normalize category/subcategory fields: some rows use category_id/subcategory_id,
        // older rows may use category/subcategory legacy text. Prefer UUID ids when present.
        const categoryValue = data.category_id || data.category || data.category_legacy_text || ""
        const subcategoryValue = data.subcategory_id || data.subcategory || ""

        // Store original stock total and product info for barcode generation
        setOriginalStockTotal(data.stock_total || 0)
        setProductCode(data.product_code || "")
        setFranchiseId(user.franchise_id)

        setFormData({
          name: data.name || "",
          description: data.description || "",
          category: categoryValue || "",
          subcategory: subcategoryValue || "",
          brand: data.brand || "",
          size: data.size || "",
          color: data.color || "",
          material: data.material || "",
          price: data.price || 0,
          regular_price: data.regular_price || 0,
          rental_price: data.rental_price || 0,
          cost_price: data.cost_price || 0,
          security_deposit: data.security_deposit || 0,
          stock_total: data.stock_total || 1,
          reorder_level: data.reorder_level || 5,
          stock_available: data.stock_total || 1,
          image_url: data.image_url || "",
        })

        if (data.image_url) {
          setImagePreview(data.image_url)
        }

        // Try to load any persisted gallery images for this product (best-effort).
        fetchProductImages()

        // Select the main category in the UI (Select expects the category id when using dbCategories)
        setSelectedMainCategory(categoryValue)

        if (isValidUUID(categoryValue)) {
          fetchSubcategories(categoryValue)
        }
      }
    } catch (error) {
      console.error("Error fetching product:", error)
      toast.error("Failed to load product")
      router.push("/inventory")
    } finally {
      setLoadingProduct(false)
    }
  }

  const fetchProductImages = async () => {
    try {
      const { data: images, error } = await supabase
        .from("product_images")
        .select("id, url, is_main, order")
        .eq("product_id", productId)
        .order("order", { ascending: true })

      if (!error && images && images.length > 0) {
        let mapped = images.map((img: any) => ({ id: String(img.id), url: img.url, isMain: !!img.is_main, order: img.order || 0 }))
        // Ensure one image is main; if none marked, set the first as main
        if (!mapped.some((m: any) => m.isMain)) {
          mapped = mapped.map((m: any, i: number) => ({ ...m, isMain: i === 0 }))
        }
        setProductImages(mapped)
        // If no preview set, pick the main image
        if (!imagePreview && mapped.length > 0) {
          const main = mapped.find((m: any) => m.isMain) || mapped[0]
          setImagePreview(main.url)
        }
      } else {
        // If there are no persisted images but product has image_url, show that as the only image
        // (this is already handled by imagePreview)
      }
    } catch (err) {
      // Table might not exist or permission denied; ignore silently to avoid breaking edit page
      console.debug("No persisted product_images found or error reading gallery:", err)
    }
  }

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      const data = await response.json()
      setImagePreview(data.url)
      setFormData((prev) => ({ ...prev, image_url: data.url }))
      // add uploaded image to gallery state (temporary id for new images)
      setProductImages((prev) => [
        ...prev,
        { id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, url: data.url, isMain: prev.length === 0, order: prev.length },
      ])
      toast.success("Image uploaded successfully!")
    } catch (error) {
      console.error("Error uploading image:", error)
      toast.error("Failed to upload image")
    } finally {
      setUploadingImage(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB")
        return
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file")
        return
      }
      handleImageUpload(file)
    })
  }

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageUpload(file)
    }
  }

  // Mark a specific URL as the main image, update preview and formData
  const setMainImage = (url: string) => {
    setImagePreview(url)
    setProductImages((prev) => prev.map((p) => ({ ...p, isMain: p.url === url })))
    setFormData((prev) => ({ ...prev, image_url: url }))
  }

  const removeImage = () => {
    // remove the currently previewed image from both preview and gallery
    const toRemove = imagePreview
    const next = productImages.filter((p) => p.url !== toRemove).map((p, idx) => ({ ...p, order: idx }))
    if (next.length === 0) {
      setProductImages([])
      setImagePreview("")
      setFormData((prev) => ({ ...prev, image_url: "" }))
      return
    }

    // Preserve existing main if still present, otherwise set first as main
    const existingMain = next.find((p) => p.isMain) || next[0]
    const normalized = next.map((p) => ({ ...p, isMain: p.url === existingMain.url }))
    setProductImages(normalized)
    setImagePreview(existingMain.url)
    setFormData((prev) => ({ ...prev, image_url: existingMain.url }))
  }

  const isValidUUID = (str: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(str)
  }

  const handleInputChange = (field: keyof ProductFormData, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .eq("is_active", true)
        .is("parent_id", null)
        .order("name")

      if (error) throw error

      setDbCategories(data || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
      setDbCategories([])
    }
  }

  const fetchSubcategories = async (parentId: string) => {
    try {
      if (!isValidUUID(parentId)) {
        setSubcategories([])
        return
      }

      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .eq("parent_id", parentId)
        .eq("is_active", true)
        .order("name")

      if (error) throw error
      setSubcategories(data || [])
    } catch (error) {
      console.error("Error fetching subcategories:", error)
      setSubcategories([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!formData.name || !formData.category) {
        toast.error("Please fill in all required fields")
        setLoading(false)
        return
      }

      // When updating, prefer to write the canonical category_id/subcategory_id columns if present
      const productData: any = {
        name: formData.name,
        description: formData.description || null,
        brand: formData.brand || null,
        size: formData.size || null,
        color: formData.color || null,
        material: formData.material || null,
        price: formData.price,
        regular_price: formData.regular_price,
        rental_price: formData.rental_price,
        cost_price: formData.cost_price,
        security_deposit: formData.security_deposit,
        stock_total: formData.stock_total,
        stock_available: formData.stock_total, // Set available stock equal to total stock
        reorder_level: formData.reorder_level,
        image_url: formData.image_url || null,
        updated_at: new Date().toISOString(),
      }

      // If selectedMainCategory looks like a UUID, write it into category_id. Otherwise write legacy category text
      if (selectedMainCategory) {
        if (isValidUUID(selectedMainCategory)) {
          productData.category_id = selectedMainCategory
        } else {
          productData.category = selectedMainCategory
        }
      }

      if (formData.subcategory) {
        if (isValidUUID(formData.subcategory)) {
          productData.subcategory_id = formData.subcategory
        } else {
          productData.subcategory = formData.subcategory
        }
      }

      console.log("Updating product data:", productData)

      // Ensure image_url reflects the main image selected in gallery
      const currentMain = productImages.find((p) => p.isMain)
      if (currentMain?.url) {
        productData.image_url = currentMain.url
      }

      const { data, error } = await supabase.from("products").update(productData).eq("id", productId).select().single()

      if (error) {
        console.error("Supabase error:", error)
        throw error
      }

      console.log("Product updated successfully:", data)
      
      // Auto-generate barcodes if stock total increased
      const stockIncrease = formData.stock_total - originalStockTotal
      if (stockIncrease > 0 && productCode && franchiseId) {
        const nextSeq = await getNextSequenceNumber(productId)
        const barcodeResult = await generateBarcodesForProduct(
          productId,
          productCode,
          franchiseId,
          stockIncrease,
          nextSeq
        )

        if (!barcodeResult.success) {
          console.error("Failed to generate barcodes:", barcodeResult.error)
          toast.warning("Product updated but barcode generation failed")
        } else {
          toast.success(`Product updated! Generated ${stockIncrease} new barcodes.`)
        }
      } else {
        toast.success("Product updated successfully!")
      }
      
      // Sync gallery images to product_images table (best-effort)
      try {
        const { data: existingImages } = await supabase.from("product_images").select("id, url, is_main, order").eq("product_id", productId)

        const existingByUrl = new Map((existingImages || []).map((r: any) => [r.url, r]))

        // Insert new images
        const toInsert = productImages.filter((p) => !existingByUrl.has(p.url)).map((p) => ({ product_id: productId, url: p.url, is_main: p.isMain, order: p.order }))
        if (toInsert.length > 0) {
          const { error: insErr } = await supabase.from("product_images").insert(toInsert)
          if (insErr) console.error("Error inserting images:", insErr)
        }

        // Update existing images' meta if changed
        for (const p of productImages) {
          const existing = existingByUrl.get(p.url) as any
          if (existing) {
            const needsUpdate = existing.is_main !== p.isMain || existing.order !== p.order
            if (needsUpdate) {
              const { error: updErr } = await supabase
                .from("product_images")
                .update({ is_main: p.isMain, order: p.order, updated_at: new Date().toISOString() })
                .eq("id", existing.id)
              if (updErr) console.error("Error updating image:", updErr)
            }
          }
        }

        // Delete images removed from UI
        const keepUrls = new Set(productImages.map((p) => p.url))
        const toDelete = (existingImages || []).filter((r: any) => !keepUrls.has(r.url)).map((r: any) => r.id)
        if (toDelete.length > 0) {
          const { error: delErr } = await supabase.from("product_images").delete().in("id", toDelete)
          if (delErr) console.error("Error deleting images:", delErr)
        }
      } catch (galleryErr) {
        console.error("Gallery sync error:", galleryErr)
      }

      // Stay on this product after saving instead of navigating away and losing the
      // user's position. Use the saved stock total as the baseline for later saves.
      setOriginalStockTotal(formData.stock_total)
    } catch (error: any) {
      console.error("Error updating product:", error)
      toast.error("Failed to update product. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const getCategoryDisplayName = (categoryValue: string) => {
    if (isValidUUID(categoryValue)) {
      const category = dbCategories.find((cat) => cat.id === categoryValue)
      return category?.name || categoryValue
    }
    return categoryValue.charAt(0).toUpperCase() + categoryValue.slice(1)
  }

  if (loadingProduct) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Loading product...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Product</h1>
            <p className="text-muted-foreground">Update product information</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Product Information</span>
            </CardTitle>
            <CardDescription>Update the product details below.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <ImageIcon className="h-4 w-4" />
                    <span>Product Image</span>
                  </CardTitle>
                  <CardDescription>Upload a photo of the product</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview || "/placeholder.svg"}
                        alt="Product preview"
                        className="w-full max-w-md h-48 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={removeImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                      <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">No image uploaded</p>
                    </div>
                  )}

                  {/* Read-only gallery thumbnails (show persisted product images if any) */}
                  {productImages.length > 0 && (
                    <div className="mt-4 grid grid-cols-4 gap-2">
                      {productImages.map((img) => (
                        <img
                          key={img.id}
                          src={img.url}
                          alt="Gallery thumbnail"
                          className={`h-20 w-full object-cover rounded border ${img.isMain ? "ring-2 ring-yellow-400" : ""}`}
                          onClick={() => setMainImage(img.url)}
                        />
                      ))}
                    </div>
                  )}

                  <div className="flex space-x-4">
                    <div className="flex-1">
                      <Label htmlFor="camera-upload" className="cursor-pointer">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full bg-transparent"
                          disabled={uploadingImage}
                          asChild
                        >
                          <span>
                            <Camera className="h-4 w-4 mr-2" />
                            {uploadingImage ? "Uploading..." : "Take Photo"}
                          </span>
                        </Button>
                      </Label>
                      <Input
                        id="camera-upload"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleCameraCapture}
                        className="hidden"
                      />
                    </div>

                    <div className="flex-1">
                      <Label htmlFor="file-upload" className="cursor-pointer">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full bg-transparent"
                          disabled={uploadingImage}
                          asChild
                        >
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            {uploadingImage ? "Uploading..." : "Upload from Device"}
                          </span>
                        </Button>
                      </Label>
                      <Input
                        id="file-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Enter product name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="main_category">Category *</Label>
                  {dbCategories.length > 0 ? (
                    <Select
                      value={selectedMainCategory}
                      onValueChange={(value) => {
                        setSelectedMainCategory(value)
                        handleInputChange("category", value)
                        setSubcategories([])
                        fetchSubcategories(value)
                        setFormData((prev) => ({ ...prev, subcategory: "" }))
                      }}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {dbCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="category"
                      value={getCategoryDisplayName(selectedMainCategory)}
                      onChange={(e) => {
                        const value = e.target.value.toLowerCase()
                        setSelectedMainCategory(value)
                        handleInputChange("category", value)
                      }}
                      placeholder="Enter category (e.g., turban, sehra, kalgi)"
                      required
                    />
                  )}
                </div>

                {selectedMainCategory && isValidUUID(selectedMainCategory) && (
                  <div className="space-y-2">
                    <Label htmlFor="subcategory">Subcategory</Label>
                    <Select
                      value={formData.subcategory || ""}
                      onValueChange={(value) => handleInputChange("subcategory", value)}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            subcategories.length > 0 ? "Select subcategory (optional)" : "No subcategories available"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {subcategories.length > 0 ? (
                          subcategories.map((subcategory) => (
                            <SelectItem key={subcategory.id} value={subcategory.id}>
                              {subcategory.name}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No subcategories available for this category
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => handleInputChange("brand", e.target.value)}
                    placeholder="e.g., Royal Collection, Premium Jewels"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="size">Size</Label>
                  <Input
                    id="size"
                    value={formData.size}
                    onChange={(e) => handleInputChange("size", e.target.value)}
                    placeholder="e.g., M, L, XL, Standard, Free Size"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    value={formData.color}
                    onChange={(e) => handleInputChange("color", e.target.value)}
                    placeholder="e.g., Red, Gold, Silver, Maroon"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="material">Material</Label>
                  <Input
                    id="material"
                    value={formData.material}
                    onChange={(e) => handleInputChange("material", e.target.value)}
                    placeholder="e.g., Silk, Cotton, Metal, Pearls"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Detailed description of the product"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="regular_price">Regular Price (MRP) (₹)</Label>
                  <Input
                    id="regular_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.regular_price === 0 ? "" : formData.regular_price}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === "") {
                        handleInputChange("regular_price", 0)
                      } else {
                        const cleanValue = value.replace(/^0+(?=\d)/, "")
                        handleInputChange("regular_price", Number.parseFloat(cleanValue) || 0)
                      }
                    }}
                    placeholder="0.00"
                    className="placeholder:opacity-30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Sale Price (₹) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="1"
                    step="0.01"
                    value={formData.price === 0 ? "" : formData.price}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === "") {
                        handleInputChange("price", 0)
                      } else {
                        const cleanValue = value.replace(/^0+(?=\d)/, "")
                        handleInputChange("price", Number.parseFloat(cleanValue) || 0)
                      }
                    }}
                    placeholder="0.00"
                    className="placeholder:opacity-30"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rental_price">Rental Price (₹)</Label>
                  <Input
                    id="rental_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.rental_price === 0 ? "" : formData.rental_price}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === "") {
                        handleInputChange("rental_price", 0)
                      } else {
                        const cleanValue = value.replace(/^0+(?=\d)/, "")
                        handleInputChange("rental_price", Number.parseFloat(cleanValue) || 0)
                      }
                    }}
                    placeholder="0.00"
                    className="placeholder:opacity-30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost_price">Cost Price (₹)</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.cost_price === 0 ? "" : formData.cost_price}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === "") {
                        handleInputChange("cost_price", 0)
                      } else {
                        const cleanValue = value.replace(/^0+(?=\d)/, "")
                        handleInputChange("cost_price", Number.parseFloat(cleanValue) || 0)
                      }
                    }}
                    placeholder="0.00"
                    className="placeholder:opacity-30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="security_deposit">Security Deposit (₹)</Label>
                  <Input
                    id="security_deposit"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.security_deposit === 0 ? "" : formData.security_deposit}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === "") {
                        handleInputChange("security_deposit", 0)
                      } else {
                        const cleanValue = value.replace(/^0+(?=\d)/, "")
                        handleInputChange("security_deposit", Number.parseFloat(cleanValue) || 0)
                      }
                    }}
                    placeholder="0.00"
                    className="placeholder:opacity-30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock_total">Stock Quantity *</Label>
                  <Input
                    id="stock_total"
                    type="number"
                    min="0"
                    value={formData.stock_total}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === "") {
                        handleInputChange("stock_total", 1)
                        handleInputChange("stock_available", 1)
                      } else {
                        const cleanValue = value.replace(/^0+(?=\d)/, "")
                        handleInputChange("stock_total", Number.parseInt(cleanValue) || 1)
                        handleInputChange("stock_available", Number.parseInt(cleanValue) || 1)
                      }
                    }}
                    placeholder="1"
                    className="placeholder:opacity-30"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reorder_level">Reorder Level</Label>
                  <Input
                    id="reorder_level"
                    type="number"
                    min="0"
                    value={formData.reorder_level === 0 ? "" : formData.reorder_level}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === "") {
                        handleInputChange("reorder_level", 0)
                      } else {
                        const cleanValue = value.replace(/^0+(?=\d)/, "")
                        handleInputChange("reorder_level", Number.parseInt(cleanValue) || 0)
                      }
                    }}
                    placeholder="5"
                    className="placeholder:opacity-30"
                  />
                </div>
              </div>

              {/* Product Variations */}
              <ProductVariationManager
                productId={productId}
                franchiseId={franchiseId}
                productName={formData.name}
                productPrice={Number(formData.price) || undefined}
                productRegularPrice={Number(formData.regular_price) || undefined}
              />

              <div className="flex justify-end space-x-4">
                <Button variant="outline" onClick={() => router.back()}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? "Updating..." : "Update Product"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
