'use client'

import { useState, useRef, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface NameResult {
  productNames: string[]
  materials: string[]
  colours: string[]
  sizes: string[]
  description?: string
}

interface GeneratedImage {
  key: string
  label: string
  icon: string
  image: string
}

type Tab = 'names' | 'studio'

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SizebarPage() {
  const [activeTab, setActiveTab] = useState<Tab>('names')

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white font-sans">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-black font-bold text-sm">S</div>
          <div>
            <p className="text-white font-semibold text-sm">Safawala AI</p>
            <p className="text-white/40 text-xs">Internal Product Tools</p>
          </div>
        </div>
        <span className="text-xs text-white/20 bg-white/5 px-2 py-1 rounded-full">Internal Use Only</span>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10 px-6">
        <div className="flex gap-1 pt-2">
          <button
            onClick={() => setActiveTab('names')}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-all ${activeTab === 'names' ? 'bg-white/10 text-white border-b-2 border-amber-400' : 'text-white/40 hover:text-white/70'}`}
          >
            ✨ Name Generator
          </button>
          <button
            onClick={() => setActiveTab('studio')}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-all ${activeTab === 'studio' ? 'bg-white/10 text-white border-b-2 border-violet-400' : 'text-white/40 hover:text-white/70'}`}
          >
            📸 Photo Studio
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {activeTab === 'names' ? <NameGeneratorTab /> : <PhotoStudioTab />}
      </div>
    </div>
  )
}

// ─── Name Generator Tab ───────────────────────────────────────────────────────
function NameGeneratorTab() {
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [hints, setHints] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<NameResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [copiedItem, setCopiedItem] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Please upload an image file.'); return }
    setImage(file); setResult(null); setError(null)
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  const handleGenerate = async () => {
    if (!image) return
    setLoading(true); setError(null); setResult(null)
    try {
      const fd = new FormData()
      fd.append('image', image)
      if (hints.trim()) fd.append('hints', hints.trim())
      const res = await fetch('/api/generate-product-names', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate names')
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedItem(text)
    setTimeout(() => setCopiedItem(null), 1500)
  }

  const reset = () => {
    setImage(null); setImagePreview(null); setHints(''); setResult(null); setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-white mb-1">Product Name Generator</h1>
        <p className="text-white/40 text-sm">Upload a product photo → get names, materials, colours & sizes</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left */}
        <div className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 overflow-hidden
              ${dragOver ? 'border-amber-400 bg-amber-400/5' : 'border-white/15 hover:border-white/30'}
              ${imagePreview ? 'h-64' : 'h-48 flex flex-col items-center justify-center'}`}
          >
            {imagePreview ? (
              <>
                <img src={imagePreview} alt="Product" className="w-full h-full object-contain p-2" />
                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-sm font-medium">Click to change</span>
                </div>
              </>
            ) : (
              <>
                <div className="text-4xl mb-2">📸</div>
                <p className="text-white/60 text-sm font-medium">Drop image or click to upload</p>
                <p className="text-white/25 text-xs mt-1">JPG, PNG, WEBP</p>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

          <input type="text" value={hints} onChange={(e) => setHints(e.target.value)} placeholder="Optional hint: e.g. gold brooch, silk turban..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-amber-400/50" />

          <div className="flex gap-3">
            <button onClick={handleGenerate} disabled={!image || loading}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all
                ${image && !loading ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-black hover:opacity-90' : 'bg-white/10 text-white/30 cursor-not-allowed'}`}>
              {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin inline-block" />Generating...</span> : '✨ Generate Names'}
            </button>
            {(image || result) && <button onClick={reset} className="px-4 py-3 rounded-xl border border-white/10 text-white/40 hover:text-white/70 text-sm transition-colors">Reset</button>}
          </div>
          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">⚠️ {error}</div>}
        </div>

        {/* Right - Results */}
        <div className="space-y-4">
          {!result && !loading && (
            <div className="flex flex-col items-center justify-center text-center py-16 opacity-30">
              <div className="text-5xl mb-3">🏷️</div>
              <p className="text-white/60 text-sm">Results will appear here</p>
            </div>
          )}
          {loading && (
            <div className="flex flex-col items-center justify-center text-center py-16">
              <div className="w-10 h-10 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin mb-3" />
              <p className="text-white/40 text-sm">Analysing product image...</p>
            </div>
          )}
          {result && (
            <div className="space-y-4">
              <div className="bg-white/5 rounded-2xl p-5 border border-white/8">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">✨</span>
                  <h3 className="text-white font-semibold text-sm uppercase tracking-wider">Product Names</h3>
                  <span className="ml-auto text-white/25 text-xs">5 options</span>
                </div>
                <div className="space-y-2">
                  {result.productNames.map((name, i) => (
                    <button key={i} onClick={() => copy(name)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 hover:bg-amber-400/10 border border-transparent hover:border-amber-400/20 transition-all group text-left">
                      <span className="text-white text-sm font-medium">{name}</span>
                      <span className="text-xs text-white/20 group-hover:text-amber-400 transition-colors ml-2 shrink-0">{copiedItem === name ? '✓ Copied' : 'Copy'}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: '🧵 Material', items: result.materials },
                  { label: '🎨 Colour', items: result.colours },
                  { label: '📏 Size', items: result.sizes },
                ].map(({ label, items }) => (
                  <div key={label} className="bg-white/5 rounded-2xl p-4 border border-white/8">
                    <div className="mb-3"><h3 className="text-white/60 text-xs uppercase tracking-wider">{label}</h3></div>
                    <div className="space-y-2">
                      {items?.map((item, i) => (
                        <button key={i} onClick={() => copy(item)}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-medium text-center transition-colors">
                          {copiedItem === item ? '✓' : item}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {result.description && (
                <button onClick={() => copy(result.description!)}
                  className="w-full text-left bg-white/5 rounded-2xl p-4 border border-white/8 hover:border-amber-400/20 transition-all">
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-2">📝 Description</p>
                  <p className="text-white/80 text-sm">{result.description}</p>
                </button>
              )}
              <p className="text-white/20 text-xs text-center">Click any item to copy</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Photo Studio Tab ─────────────────────────────────────────────────────────
const STYLES = [
  { key: 'studio_white', label: 'Studio White', icon: '⬜', desc: 'Clean white background' },
  { key: 'mannequin', label: 'Mannequin', icon: '🪆', desc: 'Display on stand' },
  { key: 'detail_closeup', label: 'Close-up', icon: '🔍', desc: 'Macro detail shot' },
  { key: 'flat_lay', label: 'Flat Lay', icon: '📐', desc: 'Top-down view' },
  { key: 'lifestyle', label: 'Lifestyle', icon: '✨', desc: 'Elegant setting' },
  { key: 'dark_luxury', label: 'Dark Luxury', icon: '🖤', desc: 'Premium dark bg' },
]

function PhotoStudioTab() {
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [productHint, setProductHint] = useState('')
  const [loading, setLoading] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [generationCount, setGenerationCount] = useState(0)
  const [productDescription, setProductDescription] = useState<string | null>(null)
  const [step, setStep] = useState<'idle' | 'analysing' | 'generating'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Please upload an image file.'); return }
    setImage(file); setGeneratedImages([]); setSelectedImages(new Set()); setError(null)
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleGenerate = async () => {
    if (!image) return
    setLoading(true); setError(null); setGeneratedImages([]); setGenerationCount(c => c + 1)
    setProductDescription(null); setStep('analysing')
    try {
      const fd = new FormData()
      fd.append('image', image)
      if (productHint.trim()) fd.append('productHint', productHint.trim())
      setStep('generating')
      const res = await fetch('/api/generate-product-images', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate images')
      setGeneratedImages(data.images || [])
      if (data.productDescription) setProductDescription(data.productDescription)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false); setStep('idle')
    }
  }

  const toggleSelect = (key: string) => {
    setSelectedImages(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const downloadImage = (img: GeneratedImage) => {
    const a = document.createElement('a')
    a.href = img.image
    a.download = `safawala-${img.key}-${Date.now()}.png`
    a.click()
  }

  const downloadSelected = () => {
    generatedImages.filter(img => selectedImages.has(img.key)).forEach(img => downloadImage(img))
  }

  const reset = () => {
    setImage(null); setImagePreview(null); setProductHint(''); setGeneratedImages([])
    setSelectedImages(new Set()); setError(null); setGenerationCount(0); setProductDescription(null); setStep('idle')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-white mb-1">📸 Photo Studio</h1>
        <p className="text-white/40 text-sm">Upload 1 product photo → AI generates 6 ecommerce-ready styled images</p>
      </div>

      {/* Upload Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Image Upload */}
        <div className="space-y-3">
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all overflow-hidden
              ${image ? 'border-violet-400/40 h-52' : 'border-white/15 hover:border-white/30 h-52 flex flex-col items-center justify-center'}`}
          >
            {imagePreview ? (
              <>
                <img src={imagePreview} alt="Product" className="w-full h-full object-contain p-2" />
                <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-sm font-medium">Change Photo</span>
                </div>
              </>
            ) : (
              <>
                <div className="text-4xl mb-2">📷</div>
                <p className="text-white/60 text-sm font-medium">Upload product photo</p>
                <p className="text-white/30 text-xs mt-1">Any angle, any lighting</p>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

          <button onClick={() => cameraInputRef.current?.click()}
            className="w-full py-2 rounded-xl border border-white/15 text-white/50 hover:text-white/80 hover:border-white/30 text-sm transition-colors">
            📱 Take Photo with Camera
          </button>
        </div>

        {/* Settings */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <label className="text-white/50 text-xs font-medium uppercase tracking-wider block mb-2">Product Type / Hint</label>
            <input type="text" value={productHint} onChange={(e) => setProductHint(e.target.value)}
              placeholder="e.g. gold kundan mala, yellow silk turban, pink dupatta..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-400/50" />
            <p className="text-white/25 text-xs mt-1">This helps AI generate more accurate product presentations</p>
          </div>

          {/* Style Preview Cards */}
          <div>
            <label className="text-white/50 text-xs font-medium uppercase tracking-wider block mb-2">Will Generate These 6 Styles</label>
            <div className="grid grid-cols-3 gap-2">
              {STYLES.map(style => (
                <div key={style.key} className="bg-white/5 rounded-xl p-2.5 border border-white/8 flex items-center gap-2">
                  <span className="text-lg">{style.icon}</span>
                  <div>
                    <p className="text-white text-xs font-medium">{style.label}</p>
                    <p className="text-white/30 text-xs">{style.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleGenerate} disabled={!image || loading}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all
                ${image && !loading ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90' : 'bg-white/10 text-white/30 cursor-not-allowed'}`}>
              {loading
                ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />Generating {generationCount > 1 ? 'New Suggestions' : '6 Images'}...</span>
                : generatedImages.length > 0 ? '🔄 Next Suggestions' : '🪄 Generate Studio Images'}
            </button>
            {image && <button onClick={reset} className="px-4 py-3 rounded-xl border border-white/10 text-white/40 hover:text-white/70 text-sm transition-colors">Reset</button>}
          </div>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm mb-6">⚠️ {error}</div>}

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-6 py-3">
            <div className={`flex items-center gap-2 text-sm ${step === 'analysing' ? 'text-amber-400' : 'text-white/30'}`}>
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs ${step === 'analysing' ? 'border-amber-400 animate-pulse' : 'border-white/20'}`}>1</span>
              GPT-4o reading product...
            </div>
            <div className="w-8 h-px bg-white/10" />
            <div className={`flex items-center gap-2 text-sm ${step === 'generating' ? 'text-violet-400' : 'text-white/20'}`}>
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs ${step === 'generating' ? 'border-violet-400 animate-pulse' : 'border-white/20'}`}>2</span>
              Generating 6 studio images...
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {STYLES.map((style) => (
              <div key={style.key} className="rounded-2xl bg-white/5 border border-white/8 overflow-hidden">
                <div className="h-52 flex flex-col items-center justify-center gap-2">
                  <div className="w-8 h-8 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                  <p className="text-white/30 text-xs">{style.icon} {style.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Grid */}
      {!loading && generatedImages.length > 0 && (
        <div>
          {/* What GPT-4o read */}
          {productDescription && (
            <div className="mb-5 bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-1.5">🔍 What GPT-4o read from your photo</p>
              <p className="text-white/70 text-xs leading-relaxed">{productDescription}</p>
              <p className="text-white/25 text-xs mt-2">↑ This description was used to generate all images below — if product looks different, add a hint above and regenerate</p>
            </div>
          )}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold">Generated Images</h3>
              <p className="text-white/40 text-xs mt-0.5">Click to select • Download your favourites</p>
            </div>
            {selectedImages.size > 0 && (
              <button onClick={downloadSelected}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors">
                ⬇️ Download {selectedImages.size} Selected
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {generatedImages.map((img) => {
              const isSelected = selectedImages.has(img.key)
              return (
                <div key={img.key}
                  onClick={() => toggleSelect(img.key)}
                  className={`relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all group
                    ${isSelected ? 'border-violet-400 shadow-lg shadow-violet-500/20' : 'border-white/10 hover:border-white/30'}`}>
                  <img src={img.image} alt={img.label} className="w-full h-52 object-cover" />

                  {/* Overlay */}
                  <div className={`absolute inset-0 transition-all ${isSelected ? 'bg-violet-500/20' : 'bg-transparent group-hover:bg-black/20'}`} />

                  {/* Selected checkmark */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-violet-500 flex items-center justify-center">
                      <span className="text-white text-sm">✓</span>
                    </div>
                  )}

                  {/* Label + Download */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex items-end justify-between">
                    <div>
                      <p className="text-white text-xs font-semibold">{img.icon} {img.label}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadImage(img) }}
                      className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <span className="text-white text-xs">⬇</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 flex items-center justify-center">
            <button onClick={handleGenerate} disabled={loading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-violet-400/40 text-violet-300 hover:bg-violet-500/10 transition-colors text-sm font-medium">
              🔄 Generate New Suggestions
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && generatedImages.length === 0 && !error && (
        <div className="text-center py-12 opacity-30">
          <div className="text-6xl mb-4">🎨</div>
          <p className="text-white/60 text-sm">Your 6 studio-quality images will appear here</p>
          <p className="text-white/30 text-xs mt-1">Select your favourites and download</p>
        </div>
      )}
    </div>
  )
}
