"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, Loader2, DollarSign, Package, Image, Layers, Barcode, Sparkles, Wand2, X, ImageIcon, Camera, Download, RefreshCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { compressImage } from "@/lib/compress-image"
import { PricingPanel } from "./pricing-panel"
import { PhotoGallery } from "./photo-gallery"
import { VariantManager, ProductVariant } from "./variant-manager"
import { BarcodeGenerator } from "./barcode-generator-enhanced"
import { doPrint, getCleanVariantName } from "./barcode-print-dialog"

interface Product {
  id?: string
  name: string
  description: string
  brand?: string
  size?: string
  color?: string
  material?: string
  price: number
  regular_price: number
  rental_price: number
  cost_price: number
  security_deposit: number
  stock_total: number
  stock_available: number
  reorder_level: number
  category_id?: string
  subcategory_id?: string
  image_url?: string
  barcode?: string
  franchise_id?: string
}

interface ProductImage {
  id?: string
  url: string
  is_main: boolean
  order: number
}

interface ProductEditorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
  onSave: (data: any) => Promise<void>
  franchiseId?: string
}

export function ProductEditorModal({
  open,
  onOpenChange,
  product,
  onSave,
  franchiseId,
}: ProductEditorModalProps) {
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("info")
  const [images, setImages] = useState<ProductImage[]>([])
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [loadingImages, setLoadingImages] = useState(false)
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [subcategories, setSubcategories] = useState<{ id: string; name: string }[]>([])

  // Safawala AI
  const [aiOpen, setAiOpen] = useState(false)
  const [aiHint, setAiHint] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<{
    productType?: string
    productNames: string[]
    materials: string[]
    colours: string[]
    sizes: string[]
    description: string
    suggestedCategoryId?: string
    suggestedCategoryName?: string
    suggestedSubcategoryId?: string
    suggestedSubcategoryName?: string
  } | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)

  const handleAiGenerate = async () => {
    const mainImage = images.find((img) => img.is_main) || images[0]
    if (!aiHint.trim() && !mainImage) {
      setAiError("Upload a photo first (in Photos tab), or type a hint below.")
      return
    }
    setAiLoading(true)
    setAiError(null)
    setAiResult(null)
    try {
      const fd = new FormData()
      if (mainImage?.url) fd.append("imageUrl", mainImage.url)
      if (aiHint.trim()) fd.append("hints", aiHint.trim())
      // Pass full category tree (with subcategories) so AI can match both
      fd.append("categories", JSON.stringify(categories))
      const res = await fetch("/api/generate-product-names", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to generate")
      setAiResult(data)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setAiLoading(false)
    }
  }

  const applyAi = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    toast.success(`${String(field).replace("_", " ")} applied!`)
  }

  // Photo Studio state
  const [studioOpen, setStudioOpen] = useState(false)
  const [studioHint, setStudioHint] = useState("")
  const [studioLoading, setStudioLoading] = useState(false)
  const [studioStep, setStudioStep] = useState<"idle" | "analysing" | "generating">("idle")
  const [studioImages, setStudioImages] = useState<{ key: string; label: string; icon: string; image: string }[]>([])
  const [studioError, setStudioError] = useState<string | null>(null)
  const [studioDescription, setStudioDescription] = useState<string | null>(null)
  const studioFileRef = useRef<HTMLInputElement>(null)
  const [studioSourceFile, setStudioSourceFile] = useState<File | null>(null)
  const [studioSourcePreview, setStudioSourcePreview] = useState<string | null>(null)
  const [addingToGallery, setAddingToGallery] = useState<string | null>(null)

  const handleStudioGenerate = async () => {
    const mainImg = images.find((img) => img.is_main) || images[0]
    const sourceUrl = mainImg?.url
    if (!studioSourceFile && !sourceUrl) {
      setStudioError("Upload a product photo above first, or add one in the gallery.")
      return
    }
    setStudioLoading(true); setStudioError(null); setStudioImages([]); setStudioDescription(null)
    setStudioStep("analysing")
    try {
      const fd = new FormData()
      if (studioSourceFile) {
        fd.append("image", studioSourceFile)
      } else if (sourceUrl) {
        const res = await fetch(sourceUrl)
        const blob = await res.blob()
        fd.append("image", blob, "product.jpg")
      }
      if (studioHint.trim()) fd.append("productHint", studioHint.trim())
      setStudioStep("generating")
      const res = await fetch("/api/generate-product-images", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to generate images")
      setStudioImages(data.images || [])
      if (data.productDescription) setStudioDescription(data.productDescription)
    } catch (err) {
      setStudioError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setStudioLoading(false); setStudioStep("idle")
    }
  }

  const handleAddToGallery = async (img: { key: string; label: string; icon: string; image: string }) => {
    if (!franchiseId) { toast.error("Franchise ID required to save images"); return }
    setAddingToGallery(img.key)
    try {
      const res = await fetch(img.image)
      const blob = await res.blob()
      const file = new File([blob], `ai-${img.key}-${Date.now()}.png`, { type: "image/png" })
      const { urls } = await handleUploadImages([file])
      if (urls[0]) {
        const newImg = { url: urls[0], is_main: images.length === 0, order: images.length }
        setImages(prev => [...prev, newImg])
        toast.success(`${img.icon} ${img.label} added to gallery!`)
      }
    } catch (err) {
      toast.error("Failed to add image to gallery")
    } finally {
      setAddingToGallery(null)
    }
  }

  // Load categories + all their subcategories on mount
  useEffect(() => {
    const loadAll = async () => {
      let categoriesQuery = supabase
        .from("product_categories")
        .select("id, name")
        .eq("is_active", true)
        .is("parent_id", null)
      if (franchiseId) {
        categoriesQuery = categoriesQuery.eq("franchise_id", franchiseId)
      }
      const { data: cats } = await categoriesQuery.order("name")
      if (!cats) return
      // Fetch all subcategories at once
      let subcategoriesQuery = supabase
        .from("product_categories")
        .select("id, name, parent_id")
        .eq("is_active", true)
        .not("parent_id", "is", null)
      if (franchiseId) {
        subcategoriesQuery = subcategoriesQuery.eq("franchise_id", franchiseId)
      }
      const { data: subs } = await subcategoriesQuery.order("name")
      const catsWithSubs = cats.map((c: any) => ({
        ...c,
        subcategories: (subs || []).filter((s: any) => s.parent_id === c.id).map((s: any) => ({ id: s.id, name: s.name })),
      }))
      setCategories(catsWithSubs as any)
    }
    loadAll()
  }, [franchiseId])

  // Load subcategories when category changes
  const handleCategoryChange = async (categoryId: string) => {
    setFormData(prev => ({ ...prev, category_id: categoryId, subcategory_id: "" }))
    setSubcategories([])
    if (categoryId) {
      let subcategoriesQuery = supabase
        .from("product_categories")
        .select("id, name")
        .eq("parent_id", categoryId)
        .eq("is_active", true)
      if (franchiseId) {
        subcategoriesQuery = subcategoriesQuery.eq("franchise_id", franchiseId)
      }
      const { data } = await subcategoriesQuery.order("name")
      if (data) setSubcategories(data)
    }
  }

  // When product loads, also load its subcategories
  useEffect(() => {
    if (!product?.category_id) {
      setSubcategories([])
      return
    }

    let subcategoriesQuery = supabase
      .from("product_categories")
      .select("id, name")
      .eq("parent_id", product.category_id)
      .eq("is_active", true)

    if (franchiseId) {
      subcategoriesQuery = subcategoriesQuery.eq("franchise_id", franchiseId)
    }

    subcategoriesQuery
      .order("name")
      .then(({ data }: any) => { if (data) setSubcategories(data) })
  }, [franchiseId, product?.category_id])

  const [formData, setFormData] = useState<Product>({
    name: "",
    description: "",
    brand: "",
    size: "",
    color: "",
    material: "",
    price: 0,
    regular_price: 0,
    rental_price: 0,
    cost_price: 0,
    security_deposit: 0,
    stock_total: 0,
    stock_available: 0,
    reorder_level: 0,
  })

  useEffect(() => {
    if (product) {
      setFormData(product)
      loadImages()
      loadVariants()
    } else {
      resetForm()
    }
  }, [product, open])

  const loadImages = async () => {
    if (!product?.id) return
    try {
      setLoadingImages(true)
      const { data, error } = await supabase
        .from("product_images")
        .select("*")
        .eq("product_id", product.id)
        .order("order", { ascending: true })

      if (error) throw error
      const normalizedImages = data?.map((img: any) => ({
        id: img.id,
        url: img.url,
        is_main: img.is_main,
        order: img.order,
      })) || []

      if (normalizedImages.length === 0 && product.image_url) {
        setImages([{ url: product.image_url, is_main: true, order: 0 }])
        return
      }

      setImages(normalizedImages)
    } catch (error) {
      console.error("Failed to load images:", error)
    } finally {
      setLoadingImages(false)
    }
  }

  const loadVariants = async () => {
    if (!product?.id) return
    try {
      const res = await fetch(`/api/products/${product.id}/variations`)
      if (!res.ok) return
      const json = await res.json()
      setVariants(json.data || [])
    } catch (error) {
      console.error("Failed to load variants:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      brand: "",
      size: "",
      color: "",
      material: "",
      category_id: "",
      subcategory_id: "",
      price: 0,
      regular_price: 0,
      rental_price: 0,
      cost_price: 0,
      security_deposit: 0,
      stock_total: 0,
      stock_available: 0,
      reorder_level: 0,
    })
    setImages([])
    setVariants([])
    setSubcategories([])
    setActiveTab("info")
  }

  const handleUploadImages = async (files: File[]) => {
    const uploadFranchiseId = (franchiseId || (product as any)?.franchise_id || "").trim()
    if (!uploadFranchiseId || uploadFranchiseId === "undefined" || uploadFranchiseId === "null") {
      throw new Error("Franchise context is required before uploading product images")
    }

    try {
      const urls: string[] = []
      for (const rawFile of files) {
        const file = await compressImage(rawFile)

        const fd = new FormData()
        fd.append("file", file)
        fd.append("franchiseId", uploadFranchiseId)

        const res = await fetch("/api/upload/product-image", {
          method: "POST",
          body: fd,
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || `Upload failed (${res.status})`)
        }

        const { url } = await res.json()
        urls.push(url)
      }
      return { urls }
    } catch (error) {
      console.error("Image upload failed:", error)
      throw error
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Product name is required")
      return
    }

    setSaving(true)
    try {
      if (!product && !franchiseId) {
        throw new Error("Franchise context is required before creating a product")
      }

      const mainImage = images.find((img) => img.is_main)

      const payload = {
        ...formData,
        // Convert empty strings to null for UUID fields
        category_id: formData.category_id || null,
        subcategory_id: formData.subcategory_id || null,
        image_url: mainImage?.url,
        images,
        variants,
      }

      await onSave(payload)
      toast.success(product ? "Product updated" : "Product created")
      onOpenChange(false)
      resetForm()
    } catch (error) {
      console.error("Save error:", error)
      toast.error("Failed to save product")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {product ? `Edit: ${product.name}` : "Add New Product"}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="info" className="text-xs">
              <Package className="w-3 h-3 mr-1" />
              Info
            </TabsTrigger>
            <TabsTrigger value="photos" className="text-xs">
              <Image className="w-3 h-3 mr-1" />
              Photos
            </TabsTrigger>
            <TabsTrigger value="pricing" className="text-xs">
              <DollarSign className="w-3 h-3 mr-1" />
              Pricing
            </TabsTrigger>
            <TabsTrigger value="variants" className="text-xs">
              <Layers className="w-3 h-3 mr-1" />
              Variants
            </TabsTrigger>
            <TabsTrigger value="barcode" className="text-xs">
              <Barcode className="w-3 h-3 mr-1" />
              Barcode
            </TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="flex-1 overflow-y-auto space-y-4">
            <div className="space-y-3">

              {/* Safawala AI Button */}
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setAiOpen(!aiOpen); setAiResult(null); setAiError(null) }}
                  className="w-full flex items-center justify-center gap-2 border-violet-300 text-violet-700 hover:bg-violet-50 hover:text-violet-800 font-medium"
                >
                  <Sparkles className="h-4 w-4" />
                  Safawala AI — Suggest Product Details
                </Button>
              </div>

              {/* AI Panel */}
              {aiOpen && (
                <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                    <span className="text-xs font-semibold text-violet-800">AI reads your product photo + hint</span>
                    <button type="button" onClick={() => setAiOpen(false)} className="ml-auto text-violet-400 hover:text-violet-700">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Photo status */}
                  {(() => {
                    const mainImg = images.find((img) => img.is_main) || images[0]
                    return mainImg ? (
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-green-50 border border-green-200">
                        <img src={mainImg.url} alt="product" className="w-7 h-7 rounded object-cover border border-green-300" />
                        <span className="text-xs text-green-700 font-medium">✓ Using uploaded product photo</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
                        <ImageIcon className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span className="text-xs text-amber-700">No photo yet — go to Photos tab to upload, or use hint only</span>
                      </div>
                    )
                  })()}

                  {/* Hint + Generate */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={aiHint}
                      onChange={(e) => setAiHint(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAiGenerate()}
                      placeholder="Optional hint: e.g. red silk turban, gold brooch..."
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-violet-200 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
                    />
                    <Button type="button" size="sm" onClick={handleAiGenerate} disabled={aiLoading}
                      className="bg-violet-600 hover:bg-violet-700 text-white text-xs px-3 shrink-0">
                      {aiLoading
                        ? <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />...</span>
                        : <span className="flex items-center gap-1"><Wand2 className="h-3 w-3" />Generate</span>}
                    </Button>
                  </div>

                  {aiError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">⚠️ {aiError}</p>}

                  {/* Results */}
                  {aiResult && (
                    <div className="space-y-2.5 pt-1">
                      {/* Product type badge */}
                      {aiResult.productType && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-violet-500">Detected:</span>
                          <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold">{aiResult.productType}</span>
                        </div>
                      )}
                      {/* Names */}
                      <div>
                        <p className="text-xs font-semibold text-violet-700 mb-1">✨ Product Names</p>
                        <div className="flex flex-wrap gap-1.5">
                          {aiResult.productNames.map((name, i) => (
                            <button key={i} type="button" onClick={() => applyAi("name", name)}
                              className="px-2.5 py-1 rounded-full bg-white border border-violet-300 text-xs text-violet-800 hover:bg-violet-600 hover:text-white hover:border-violet-600 transition-all">
                              {name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Category + Subcategory */}
                      {aiResult.suggestedCategoryName && (
                        <div>
                          <p className="text-xs font-semibold text-violet-700 mb-1">🏷️ Category</p>
                          <div className="flex flex-wrap gap-1.5">
                            <button type="button"
                              onClick={async () => {
                                if (aiResult.suggestedCategoryId) {
                                  await handleCategoryChange(aiResult.suggestedCategoryId)
                                  // After category loads subcategories, auto-apply subcategory
                                  if (aiResult.suggestedSubcategoryId) {
                                    setTimeout(() => {
                                      setFormData(prev => ({ ...prev, subcategory_id: aiResult.suggestedSubcategoryId }))
                                    }, 400)
                                  }
                                }
                              }}
                              className="px-2.5 py-1 rounded-full bg-white border border-violet-300 text-xs text-violet-800 hover:bg-violet-600 hover:text-white hover:border-violet-600 transition-all">
                              {aiResult.suggestedCategoryName}
                            </button>
                            {aiResult.suggestedSubcategoryName && (
                              <span className="px-2.5 py-1 rounded-full bg-violet-100 border border-violet-300 text-xs text-violet-700 flex items-center gap-1">
                                ↳ {aiResult.suggestedSubcategoryName}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Material / Colour / Size */}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "🧵 Material", items: aiResult.materials, field: "material" as const },
                          { label: "🎨 Colour", items: aiResult.colours, field: "color" as const },
                          { label: "📏 Size", items: aiResult.sizes, field: "size" as const },
                        ].map(({ label, items, field }) => (
                          <div key={field}>
                            <p className="text-xs font-semibold text-violet-700 mb-1">{label}</p>
                            <div className="flex flex-col gap-1">
                              {items.map((item, i) => (
                                <button key={i} type="button" onClick={() => applyAi(field, item)}
                                  className="px-2 py-1 rounded-lg bg-white border border-violet-200 text-xs text-violet-800 hover:bg-violet-600 hover:text-white transition-all text-center">
                                  {item}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Description */}
                      {aiResult.description && (
                        <div>
                          <p className="text-xs font-semibold text-violet-700 mb-1">📝 Description</p>
                          <button type="button" onClick={() => applyAi("description", aiResult.description)}
                            className="w-full text-left px-2.5 py-2 rounded-lg bg-white border border-violet-200 text-xs text-gray-700 hover:bg-violet-50 hover:border-violet-400 transition-all">
                            {aiResult.description}
                          </button>
                        </div>
                      )}
                      <p className="text-xs text-violet-400 text-center">Click any suggestion to apply it to the form</p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="product-name" className="text-sm">Product Name *</Label>
                <Input
                  id="product-name"
                  placeholder="e.g., Wedding Lehenga"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1"
                />
              </div>

              {/* Category & Subcategory */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Category *</Label>
                  <Select
                    value={formData.category_id || ""}
                    onValueChange={handleCategoryChange}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Subcategory</Label>
                  <Select
                    value={formData.subcategory_id || ""}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, subcategory_id: value }))}
                    disabled={subcategories.length === 0}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={subcategories.length === 0 ? "Select category first" : "Select subcategory"} />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategories.map(sub => (
                        <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="product-desc" className="text-sm">Description</Label>
                <Textarea
                  id="product-desc"
                  placeholder="Product details..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="product-size" className="text-sm">Size</Label>
                  <Input
                    id="product-size"
                    placeholder="e.g., Free, S-M-L"
                    value={formData.size || ""}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="product-color" className="text-sm">Color</Label>
                  <Input
                    id="product-color"
                    placeholder="e.g., Red, Navy"
                    value={formData.color || ""}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="product-material" className="text-sm">Material</Label>
                  <Input
                    id="product-material"
                    placeholder="e.g., Silk, Cotton"
                    value={formData.material || ""}
                    onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="product-stock" className="text-sm">Total Stock</Label>
                  <Input
                    id="product-stock"
                    type="number"
                    min="0"
                    value={formData.stock_total}
                    onChange={(e) => setFormData({ ...formData, stock_total: parseInt(e.target.value) || 0 })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="product-available" className="text-sm">Available Stock</Label>
                  <Input
                    id="product-available"
                    type="number"
                    min="0"
                    max={formData.stock_total}
                    value={formData.stock_available}
                    onChange={(e) => setFormData({ ...formData, stock_available: parseInt(e.target.value) || 0 })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="product-reorder" className="text-sm">Reorder Level</Label>
                  <Input
                    id="product-reorder"
                    type="number"
                    min="0"
                    value={formData.reorder_level}
                    onChange={(e) => setFormData({ ...formData, reorder_level: parseInt(e.target.value) || 0 })}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Photos Tab */}
          <TabsContent value="photos" className="flex-1 overflow-y-auto space-y-4">
            {loadingImages ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <PhotoGallery
                  images={images}
                  onImagesChange={setImages}
                  onUpload={handleUploadImages}
                  disabled={saving}
                />

                {/* ── Safawala AI Photo Studio ── */}
                <div className="rounded-xl border border-violet-200 bg-violet-50/40 overflow-hidden">
                  {/* Header */}
                  <button
                    type="button"
                    onClick={() => { setStudioOpen(!studioOpen); setStudioImages([]); setStudioError(null); setStudioDescription(null) }}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-violet-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-violet-600" />
                      <span className="text-sm font-semibold text-violet-800">Safawala AI — Generate Studio Photos</span>
                      <span className="text-xs bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full">New</span>
                    </div>
                    <span className="text-violet-400 text-xs">{studioOpen ? "▲ Close" : "▼ Open"}</span>
                  </button>

                  {studioOpen && (
                    <div className="px-4 pb-4 space-y-4 border-t border-violet-100 pt-4">

                      {/* Source image indicator */}
                      {(() => {
                        const mainImg = images.find(i => i.is_main) || images[0]
                        return mainImg ? (
                          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
                            <img src={mainImg.url} alt="source" className="w-10 h-10 rounded object-cover border border-green-300" />
                            <div>
                              <p className="text-xs font-medium text-green-700">✓ Using your primary product photo</p>
                              <p className="text-xs text-green-500">AI will read this image and generate 6 studio versions</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                            <ImageIcon className="h-4 w-4 text-amber-500 shrink-0" />
                            <p className="text-xs text-amber-700">No photo uploaded yet — add one above first, or the AI can't generate images</p>
                          </div>
                        )
                      })()}

                      {/* Hint + Generate */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={studioHint}
                          onChange={(e) => setStudioHint(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleStudioGenerate()}
                          placeholder="Optional hint: e.g. gold kundan mala, yellow silk turban..."
                          className="flex-1 px-3 py-2 text-xs rounded-lg border border-violet-200 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 placeholder:text-gray-400"
                        />
                        <Button type="button" onClick={handleStudioGenerate} disabled={studioLoading}
                          className="bg-violet-600 hover:bg-violet-700 text-white text-xs px-4 shrink-0 gap-1">
                          {studioLoading
                            ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />{studioStep === "analysing" ? "Reading..." : "Generating..."}</>
                            : <><Wand2 className="h-3 w-3" />{studioImages.length > 0 ? "Regenerate" : "Generate 6 Photos"}</>}
                        </Button>
                      </div>

                      {/* Step indicator */}
                      {studioLoading && (
                        <div className="flex items-center gap-4 text-xs">
                          <span className={`flex items-center gap-1.5 ${studioStep === "analysing" ? "text-amber-600 font-medium" : "text-gray-400"}`}>
                            <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-xs ${studioStep === "analysing" ? "border-amber-500 animate-pulse" : "border-gray-300"}`}>1</span>
                            GPT-4o reading photo
                          </span>
                          <span className="text-gray-300">→</span>
                          <span className={`flex items-center gap-1.5 ${studioStep === "generating" ? "text-violet-600 font-medium" : "text-gray-400"}`}>
                            <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-xs ${studioStep === "generating" ? "border-violet-500 animate-pulse" : "border-gray-300"}`}>2</span>
                            Generating 6 studio images
                          </span>
                        </div>
                      )}

                      {studioError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">⚠️ {studioError}</p>}

                      {/* What AI read */}
                      {studioDescription && (
                        <div className="bg-white border border-violet-100 rounded-lg px-3 py-2">
                          <p className="text-xs text-violet-500 font-medium mb-1">🔍 GPT-4o read your product as:</p>
                          <p className="text-xs text-gray-600 leading-relaxed">{studioDescription}</p>
                        </div>
                      )}

                      {/* Generated images grid */}
                      {studioImages.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-violet-700 mb-2">Click "+ Add" to save to product gallery</p>
                          <div className="grid grid-cols-3 gap-2">
                            {studioImages.map((img) => (
                              <div key={img.key} className="relative rounded-xl overflow-hidden border border-violet-100 group">
                                <img src={img.image} alt={img.label} className="w-full h-28 object-cover" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all" />
                                <div className="absolute bottom-0 left-0 right-0 p-1.5 flex items-end justify-between">
                                  <span className="text-xs text-white drop-shadow font-medium">{img.icon} {img.label}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleAddToGallery(img)}
                                    disabled={addingToGallery === img.key}
                                    className="text-xs bg-violet-600 hover:bg-violet-700 text-white px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                                  >
                                    {addingToGallery === img.key
                                      ? <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 border border-white/40 border-t-white rounded-full animate-spin inline-block" />Adding</span>
                                      : "+ Add"}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <input ref={studioFileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    setStudioSourceFile(f)
                    const reader = new FileReader()
                    reader.onload = (ev) => setStudioSourcePreview(ev.target?.result as string)
                    reader.readAsDataURL(f)
                  }}
                />
              </>
            )}
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing" className="flex-1 overflow-y-auto">
            <PricingPanel
              data={{
                cost_price: formData.cost_price,
                rental_price: formData.rental_price,
                regular_price: formData.regular_price,
                price: formData.price,
                security_deposit: formData.security_deposit,
              }}
              onChange={(data) => setFormData({ ...formData, ...data })}
            />
          </TabsContent>

          {/* Variants Tab */}
          <TabsContent value="variants" className="flex-1 overflow-y-auto">
            <VariantManager
              variants={variants}
              onVariantsChange={setVariants}
              productName={formData.name}
              productId={product?.id}
              onPrintBarcode={async (variant) => {
                if (!variant.barcode) {
                  toast.error("No barcode for this variant")
                  return
                }
                try {
                  const variantName = variant.variation_name
                    ? getCleanVariantName(formData.name, variant.variation_name)
                    : formData.name
                  const regularPrice = (formData.regular_price ?? 0) + (variant.regular_price_adjustment ?? 0) || undefined
                  const salePrice = (formData.price ?? 0) + (variant.price_adjustment ?? 0) || undefined
                  await doPrint(
                    variant.barcode,
                    variantName,
                    2,
                    regularPrice,
                    salePrice,
                    variant.color || formData.color,
                    variant.size || formData.size,
                    variant.material || formData.material
                  )
                  toast.success("Barcode sent to printer")
                } catch (error) {
                  toast.error("Failed to print barcode")
                  console.error(error)
                }
              }}
            />
          </TabsContent>

          {/* Barcode Tab */}
          <TabsContent value="barcode" className="flex-1 overflow-y-auto space-y-4">
            {product ? (
              <BarcodeGenerator product={{ ...formData, id: product.id || "" }} onBarcodeGenerated={loadVariants} />
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Save the product first, then you can generate barcodes.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex gap-2 justify-end border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {product ? "Update Product" : "Create Product"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
