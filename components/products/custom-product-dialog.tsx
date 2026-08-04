"use client"

/**
 * Custom Product Dialog - Create and save custom products to database
 * Features:
 * - Quick product creation during order entry
 * - Image upload via /api/upload endpoint (same as inventory)
 * - Camera capture option for mobile devices
 * - Save to database as franchise-specific product
 * - Optional barcode generation
 * - Automatic reuse in future orders
 */

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertCircle, Loader2, Check, Upload, X, Camera } from "lucide-react"
import { toast } from "sonner"
import { uploadWithProgress } from "@/lib/upload-with-progress"
import { supabase } from "@/lib/supabase"
import { compressImage } from "@/lib/compress-image"

interface CustomProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  franchiseId: string
  bookingType: "rental" | "sale"
  onProductCreated: (product: any) => void
}

export function CustomProductDialog({
  open,
  onOpenChange,
  franchiseId,
  bookingType,
  onProductCreated,
}: CustomProductDialogProps) {
  const [loading, setLoading] = useState(false)
  const [generateBarcode, setGenerateBarcode] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [useCameraFacing, setUseCameraFacing] = useState<"environment" | "user">("environment")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    category_id: "",
    subcategory_id: "",
    description: "",
    rental_price: 0,
    sale_price: 0,
    security_deposit: 0,
    stock_available: 999,
    barcode_number: "",
  })

  const [dbCategories, setDbCategories] = useState<{ id: string; name: string }[]>([])
  const [dbSubcategories, setDbSubcategories] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from("product_categories")
        .select("id, name")
        .eq("is_active", true)
        .is("parent_id", null)
        .order("name")
      if (data) setDbCategories(data)
    }
    fetchCategories()
  }, [])

  const handleCategoryChange = async (categoryId: string) => {
    const cat = dbCategories.find(c => c.id === categoryId)
    setFormData(prev => ({ ...prev, category_id: categoryId, category: cat?.name || "", subcategory_id: "" }))
    setDbSubcategories([])
    if (categoryId) {
      const { data } = await supabase
        .from("product_categories")
        .select("id, name")
        .eq("parent_id", categoryId)
        .eq("is_active", true)
        .order("name")
      if (data) setDbSubcategories(data)
    }
  }

  // Compress image to base64 with size optimization
  const compressImageToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement("canvas")
          let width = img.width
          let height = img.height

          // Max dimensions for compression
          const maxWidth = 800
          const maxHeight = 800

          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width
              width = maxWidth
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height
              height = maxHeight
            }
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext("2d")
          if (!ctx) {
            reject(new Error("Failed to get canvas context"))
            return
          }

          ctx.drawImage(img, 0, 0, width, height)

          // Convert to base64 with compression quality
          const base64 = canvas.toDataURL("image/jpeg", 0.7)
          resolve(base64)
        }
        img.onerror = () => reject(new Error("Failed to load image"))
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsDataURL(file)
    })
  }

  const handleGenerateBarcode = () => {
    // Generate a simple barcode: CUSTOM-{timestamp}-{random}
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    const barcode = `CUSTOM-${timestamp}-${random}`
    setFormData((prev) => ({ ...prev, barcode_number: barcode }))
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Product name is required")
      return
    }

    if (bookingType === "rental" && formData.rental_price <= 0) {
      toast.error("Rental price must be greater than 0")
      return
    }

    if (bookingType === "sale" && formData.sale_price <= 0) {
      toast.error("Sale price must be greater than 0")
      return
    }

    setLoading(true)
    try {
      let imageUrl: string | null = null

      // Step 1: Upload image using the same endpoint as inventory
      if (imageFile && imagePreview) {
        setUploadingImage(true)
        try {
          const compressedFile = await compressImage(imageFile)
          const uploadResult = await uploadWithProgress(compressedFile, { folder: "products" })
          imageUrl = uploadResult.url
          toast.success("Image uploaded successfully!")
        } catch (error) {
          toast.warning("Could not upload image, proceeding without image")
        }
        setUploadingImage(false)
      }

      // Step 2: Create product in database
      const productRes = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
          category_id: formData.category_id || null,
          subcategory_id: formData.subcategory_id || null,
          description: formData.description,
          rental_price: bookingType === "rental" ? formData.rental_price : 0,
          sale_price: bookingType === "sale" ? formData.sale_price : 0,
          security_deposit: formData.security_deposit,
          stock_available: formData.stock_available,
          image_url: imageUrl,
          franchise_id: franchiseId,
          is_custom: true,
        }),
      })

      if (!productRes.ok) {
        const error = await productRes.json()
        throw new Error(error.error || "Failed to create product")
      }

      const product = await productRes.json()

      // Step 3: Auto-generate barcodes for the custom product (5 barcodes by default)
      let barcodesGenerated = false
      try {
        const { generateBarcodesForProduct } = await import('@/lib/barcode-utils')
        const productCode = `CUST-${Date.now().toString(36).toUpperCase()}`
        const barcodeResult = await generateBarcodesForProduct(
          product.id,
          product.product_code || productCode,
          franchiseId,
          5 // Generate 5 barcodes for custom products
        )
        
        if (!barcodeResult.success) {
          // Non-fatal: continue without auto-barcodes
        } else {
          barcodesGenerated = true
        }
      } catch (barcodeError: any) {
        // Non-fatal: continue
      }

      toast.success(
        barcodesGenerated 
          ? `Custom product "${formData.name}" created successfully with barcodes!`
          : `Custom product "${formData.name}" created successfully!`
      )
      onProductCreated({
        ...product,
        id: product.id,
        name: formData.name,
        category: formData.category,
        category_id: "custom",
        rental_price: formData.rental_price,
        sale_price: formData.sale_price,
        security_deposit: formData.security_deposit,
        stock_available: formData.stock_available,
        image_url: imageUrl,
        barcode: formData.barcode_number,
      })

      // Reset form
      setFormData({
        name: "",
        category: "",
        category_id: "",
        subcategory_id: "",
        description: "",
        rental_price: 0,
        sale_price: 0,
        security_deposit: 0,
        stock_available: 999,
        barcode_number: "",
      })
      setDbSubcategories([])
      setGenerateBarcode(false)
      setImageFile(null)
      setImagePreview(null)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create product")
    } finally {
      setLoading(false)
      setUploadingImage(false)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }

    // Validate file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image size must be less than 10MB")
      return
    }

    setImageFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = ""
    }
  }

  const toggleCameraFacing = () => {
    setUseCameraFacing(useCameraFacing === "environment" ? "user" : "environment")
    // Reset camera input to allow re-triggering
    if (cameraInputRef.current) {
      cameraInputRef.current.value = ""
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>➕ Add Quick Custom Product</span>
            {bookingType === "rental" ? (
              <Badge variant="outline">Rental</Badge>
            ) : (
              <Badge variant="outline">Sale</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="product-name">Product Name *</Label>
            <Input
              id="product-name"
              placeholder="e.g., Outdoor Heater, Projection Screen, Sound System"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>

          {/* Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category_id} onValueChange={handleCategoryChange}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {dbCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {dbSubcategories.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="subcategory">Subcategory</Label>
                <Select
                  value={formData.subcategory_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, subcategory_id: value }))}
                >
                  <SelectTrigger id="subcategory">
                    <SelectValue placeholder="Select subcategory" />
                  </SelectTrigger>
                  <SelectContent>
                    {dbSubcategories.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add any details about this product..."
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="h-20"
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-3">
            <Label>Product Image (Optional)</Label>
            <div className="border-2 border-dashed rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition">
              {imagePreview ? (
                <div className="space-y-2">
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-32 w-32 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {imageFile?.name} ({((imageFile?.size || 0) / 1024 / 1024).toFixed(2)} MB)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Change Image
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => cameraInputRef.current?.click()}
                    >
                      <Camera className="h-4 w-4 mr-1" />
                      Camera
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer text-center p-3 rounded border border-dashed border-gray-300 hover:border-gray-400"
                  >
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm font-medium text-gray-700">Click to upload or drag & drop</p>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF (will be compressed)</p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex-1"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Take Photo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={toggleCameraFacing}
                      title={useCameraFacing === "environment" ? "Switch to Front Camera" : "Switch to Back Camera"}
                    >
                      🔄 {useCameraFacing === "environment" ? "Back" : "Front"}
                    </Button>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture={useCameraFacing === "environment" ? "environment" : "user"}
                onChange={handleCameraCapture}
                className="hidden"
              />
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-2 gap-4">
            {bookingType === "rental" && (
              <div className="space-y-2">
                <Label htmlFor="rental-price">Rental Price (₹) *</Label>
                <Input
                  id="rental-price"
                  type="number"
                  placeholder="0"
                  min="0"
                  value={formData.rental_price || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, rental_price: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>
            )}

            {bookingType === "sale" && (
              <div className="space-y-2">
                <Label htmlFor="sale-price">Sale Price (₹) *</Label>
                <Input
                  id="sale-price"
                  type="number"
                  placeholder="0"
                  min="0"
                  value={formData.sale_price || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, sale_price: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="security-deposit">Security Deposit (₹)</Label>
              <Input
                id="security-deposit"
                type="number"
                placeholder="0"
                min="0"
                value={formData.security_deposit || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, security_deposit: parseFloat(e.target.value) || 0 }))
                }
              />
            </div>
          </div>

          {/* Stock & Barcode Section */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="stock">Stock Available</Label>
                <Input
                  id="stock"
                  type="number"
                  placeholder="999"
                  min="0"
                  value={formData.stock_available || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, stock_available: parseFloat(e.target.value) || 999 }))
                  }
                />
              </div>

              {/* Barcode Generation */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="generate-barcode"
                    checked={generateBarcode}
                    onCheckedChange={(checked) => {
                      setGenerateBarcode(checked as boolean)
                      if (checked && !formData.barcode_number) {
                        handleGenerateBarcode()
                      }
                    }}
                  />
                  <Label htmlFor="generate-barcode" className="font-medium cursor-pointer">
                    Generate Barcode for this product
                  </Label>
                </div>

                {generateBarcode && (
                  <div className="space-y-2 ml-6">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label htmlFor="barcode">Barcode Number</Label>
                        <Input
                          id="barcode"
                          placeholder="Auto-generated"
                          value={formData.barcode_number}
                          onChange={(e) => setFormData((prev) => ({ ...prev, barcode_number: e.target.value }))}
                          disabled={!generateBarcode}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleGenerateBarcode}
                        >
                          Regenerate
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Barcode: {formData.barcode_number || "Click generate"}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Auto-Save Confirmation */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="font-medium text-green-900">Auto-Save to Database</p>
                  <p className="text-sm text-green-800">
                    ✅ This product will be saved and available for all future orders
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Alert */}
          <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              Custom products are franchise-specific and will appear in your product list for future orders.
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Add Product
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
