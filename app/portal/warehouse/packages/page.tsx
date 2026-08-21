"use client"

import { useEffect, useMemo, useState } from "react"
import { PortalPageHeader, PortalEmptyState, PortalSkeleton, PortalSectionLabel } from "@/components/portal/portal-shared"
import { PortalIcon } from "@/components/portal/portal-icons"

const COLOR = "#6f3f7b"
const COLOR_DARK = "#4b2458"

type Category = { id: string; name: string; display_order?: number }
type Variant = {
  id: string
  category_id: string
  name: string
  base_price: number
  extra_safa_price: number
  missing_safa_penalty: number
  deposit_amount: number
  inclusions?: string[]
}

const emptyVariant = {
  name: "",
  base_price: "0",
  extra_safa_price: "0",
  missing_safa_penalty: "0",
  deposit_amount: "0",
  inclusions: "",
}

export default function WarehousePackagesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [categoryDialog, setCategoryDialog] = useState(false)
  const [variantDialog, setVariantDialog] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null)
  const [categoryName, setCategoryName] = useState("")
  const [variantForm, setVariantForm] = useState(emptyVariant)

  useEffect(() => { void loadData() }, [])

  async function loadData() {
    setLoading(true)
    setError("")
    try {
      const [categoryResponse, variantResponse] = await Promise.all([
        fetch("/api/packages/categories", { cache: "no-store" }),
        fetch("/api/packages/variants?include_inactive=false", { cache: "no-store" }),
      ])
      const [categoryResult, variantResult] = await Promise.all([categoryResponse.json(), variantResponse.json()])
      if (!categoryResponse.ok) throw new Error(categoryResult.error || "Failed to load categories")
      if (!variantResponse.ok) throw new Error(variantResult.error || "Failed to load variants")
      const nextCategories = categoryResult.data || []
      setCategories(nextCategories)
      setVariants(variantResult.data || [])
      setSelectedCategoryId(current => current && nextCategories.some((item: Category) => item.id === current) ? current : nextCategories[0]?.id || "")
    } catch (loadError: any) {
      setError(loadError.message || "Failed to load packages")
    } finally {
      setLoading(false)
    }
  }

  const selectedCategory = categories.find(category => category.id === selectedCategoryId)
  const selectedVariants = useMemo(
    () => variants.filter(variant => variant.category_id === selectedCategoryId),
    [variants, selectedCategoryId],
  )

  function openNewCategory() {
    setEditingCategory(null)
    setCategoryName("")
    setCategoryDialog(true)
  }

  function openEditCategory(category: Category) {
    setEditingCategory(category)
    setCategoryName(category.name)
    setCategoryDialog(true)
  }

  async function saveCategory() {
    if (!categoryName.trim()) return
    setSaving(true)
    try {
      const response = await fetch("/api/packages/categories", {
        method: editingCategory ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingCategory
          ? { id: editingCategory.id, name: categoryName }
          : { name: categoryName, display_order: categories.length + 1 }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "Failed to save category")
      setCategoryDialog(false)
      await loadData()
    } catch (saveError: any) {
      alert(saveError.message || "Failed to save category")
    } finally {
      setSaving(false)
    }
  }

  async function deleteCategory(category: Category) {
    if (!window.confirm(`Delete category "${category.name}"?`)) return
    const response = await fetch(`/api/packages/categories?id=${category.id}`, { method: "DELETE" })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) return alert(result.error || "Failed to delete category")
    await loadData()
  }

  function openNewVariant() {
    if (!selectedCategoryId) return
    setEditingVariant(null)
    setVariantForm(emptyVariant)
    setVariantDialog(true)
  }

  function openEditVariant(variant: Variant) {
    setEditingVariant(variant)
    setVariantForm({
      name: variant.name,
      base_price: String(variant.base_price || 0),
      extra_safa_price: String(variant.extra_safa_price || 0),
      missing_safa_penalty: String(variant.missing_safa_penalty || 0),
      deposit_amount: String(variant.deposit_amount || 0),
      inclusions: (variant.inclusions || []).join(", "),
    })
    setVariantDialog(true)
  }

  async function saveVariant() {
    if (!variantForm.name.trim() || !selectedCategoryId) return
    setSaving(true)
    try {
      const response = await fetch("/api/packages/variants", {
        method: editingVariant ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingVariant ? { id: editingVariant.id } : {}),
          category_id: selectedCategoryId,
          package_id: selectedCategoryId,
          name: variantForm.name,
          base_price: Number(variantForm.base_price) || 0,
          extra_safa_price: Number(variantForm.extra_safa_price) || 0,
          missing_safa_penalty: Number(variantForm.missing_safa_penalty) || 0,
          deposit_amount: Number(variantForm.deposit_amount) || 0,
          inclusions: variantForm.inclusions,
          display_order: editingVariant ? undefined : selectedVariants.length + 1,
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "Failed to save variant")
      setVariantDialog(false)
      await loadData()
    } catch (saveError: any) {
      alert(saveError.message || "Failed to save variant")
    } finally {
      setSaving(false)
    }
  }

  async function deleteVariant(variant: Variant) {
    if (!window.confirm(`Delete variant "${variant.name}"?`)) return
    const response = await fetch(`/api/packages/variants?id=${variant.id}`, { method: "DELETE" })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) return alert(result.error || "Failed to delete variant")
    await loadData()
  }

  return (
    <div className="warehouse-packages-page min-h-screen pb-24" style={{ background: "linear-gradient(160deg,#f5f0fb,#ede4f7)" }}>
      <PortalPageHeader title="Packages" subtitle="Manage categories, variants and package pricing" color={COLOR} backHref="/portal/warehouse" />

      <div className="grid grid-cols-2 gap-3 px-4 pt-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-white"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Categories</p><p className="text-2xl font-black" style={{ color: COLOR_DARK }}>{categories.length}</p></div>
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-white"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Variants</p><p className="text-2xl font-black" style={{ color: COLOR_DARK }}>{variants.length}</p></div>
      </div>

      {error && <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</div>}

      {loading ? <div className="mx-4 mt-4 overflow-hidden rounded-2xl bg-white"><PortalSkeleton rows={6} /></div> : categories.length === 0 ? (
        <PortalEmptyState icon="package" title="No package categories" subtitle="Create the first package category to get started" color={COLOR} />
      ) : (
        <>
          <div className="flex items-center justify-between px-4 pt-4"><PortalSectionLabel label="Package Categories" /><button onClick={openNewCategory} className="rounded-xl px-3 py-2 text-[11px] font-extrabold text-white" style={{ background: COLOR }}>+ Category</button></div>
          <div className="flex gap-2 overflow-x-auto px-4 py-3">
            {categories.map(category => <button key={category.id} onClick={() => setSelectedCategoryId(category.id)} className="shrink-0 rounded-full px-4 py-2 text-[11px] font-bold" style={{ background: selectedCategoryId === category.id ? COLOR : "white", color: selectedCategoryId === category.id ? "white" : COLOR_DARK, border: `1px solid ${COLOR}28` }}>{category.name}</button>)}
          </div>

          {selectedCategory && <div className="mx-4 rounded-2xl bg-white/80 p-4 shadow-sm border border-white">
            <div className="flex items-start justify-between gap-3 border-b border-purple-100 pb-3">
              <div><p className="text-lg font-black" style={{ color: COLOR_DARK }}>{selectedCategory.name}</p><p className="text-[11px] text-slate-500">{selectedVariants.length} variants configured</p></div>
              <div className="flex gap-2"><button onClick={() => openEditCategory(selectedCategory)} className="rounded-lg bg-purple-50 px-3 py-2 text-[11px] font-bold" style={{ color: COLOR }}>Edit</button><button onClick={() => deleteCategory(selectedCategory)} className="rounded-lg bg-red-50 px-3 py-2 text-[11px] font-bold text-red-600">Delete</button></div>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {selectedVariants.map(variant => <div key={variant.id} className="rounded-xl border border-purple-100 bg-white p-4">
                <div className="flex items-start justify-between gap-2"><div><p className="text-sm font-extrabold text-slate-900">{variant.name}</p><p className="mt-1 text-lg font-black" style={{ color: COLOR }}>₹{Number(variant.base_price || 0).toLocaleString("en-IN")}</p></div><PortalIcon name="crown" size={20} /></div>
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-purple-50/60 p-2 text-[10px] text-slate-600"><span>Extra Safa: ₹{variant.extra_safa_price || 0}</span><span>Deposit: ₹{variant.deposit_amount || 0}</span><span className="col-span-2">Missing penalty: ₹{variant.missing_safa_penalty || 0}</span></div>
                {!!variant.inclusions?.length && <p className="mt-2 text-[10px] leading-relaxed text-slate-500">{variant.inclusions.join(" • ")}</p>}
                <div className="mt-3 flex justify-end gap-2"><button onClick={() => openEditVariant(variant)} className="rounded-lg bg-purple-50 px-3 py-2 text-[10px] font-bold" style={{ color: COLOR }}>Edit</button><button onClick={() => deleteVariant(variant)} className="rounded-lg bg-red-50 px-3 py-2 text-[10px] font-bold text-red-600">Delete</button></div>
              </div>)}
              {selectedVariants.length === 0 && <div className="col-span-full rounded-xl border border-dashed border-purple-200 p-8 text-center text-xs text-slate-500">No variants in this category yet</div>}
            </div>
          </div>}
        </>
      )}

      <button onClick={categories.length ? openNewVariant : openNewCategory} className="fixed bottom-[86px] right-4 z-40 flex items-center gap-2 rounded-2xl px-5 py-4 text-xs font-extrabold text-white shadow-xl" style={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})` }}>+ {categories.length ? "Add Variant" : "Add Category"}</button>

      {categoryDialog && <Modal title={editingCategory ? "Edit Category" : "Create Category"} onClose={() => setCategoryDialog(false)}><Field label="Category Name" value={categoryName} onChange={setCategoryName} /><ModalActions saving={saving} onCancel={() => setCategoryDialog(false)} onSave={saveCategory} /></Modal>}
      {variantDialog && <Modal title={editingVariant ? "Edit Variant" : "Create Variant"} onClose={() => setVariantDialog(false)}>
        <Field label="Variant Name" value={variantForm.name} onChange={value => setVariantForm(form => ({ ...form, name: value }))} />
        <div className="grid grid-cols-2 gap-3"><Field label="Base Price (₹)" type="number" value={variantForm.base_price} onChange={value => setVariantForm(form => ({ ...form, base_price: value }))} /><Field label="Extra Safa Price (₹)" type="number" value={variantForm.extra_safa_price} onChange={value => setVariantForm(form => ({ ...form, extra_safa_price: value }))} /><Field label="Missing Safa Penalty (₹)" type="number" value={variantForm.missing_safa_penalty} onChange={value => setVariantForm(form => ({ ...form, missing_safa_penalty: value }))} /><Field label="Security Deposit (₹)" type="number" value={variantForm.deposit_amount} onChange={value => setVariantForm(form => ({ ...form, deposit_amount: value }))} /></div>
        <Field label="Inclusions (comma-separated)" value={variantForm.inclusions} onChange={value => setVariantForm(form => ({ ...form, inclusions: value }))} />
        <ModalActions saving={saving} onCancel={() => setVariantDialog(false)} onSave={saveVariant} />
      </Modal>}
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 md:items-center" onMouseDown={event => event.target === event.currentTarget && onClose()}><div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl md:rounded-3xl"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-black text-slate-900">{title}</h2><button onClick={onClose} className="h-9 w-9 rounded-xl bg-slate-100 text-xl">×</button></div><div className="space-y-4">{children}</div></div></div>
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-600">{label}</span><input type={type} min={type === "number" ? 0 : undefined} value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-xl border border-purple-100 px-3 py-2.5 text-sm outline-none focus:border-purple-400" /></label>
}

function ModalActions({ saving, onCancel, onSave }: { saving: boolean; onCancel: () => void; onSave: () => void }) {
  return <div className="flex justify-end gap-2 pt-2"><button onClick={onCancel} disabled={saving} className="rounded-xl border px-4 py-2 text-xs font-bold">Cancel</button><button onClick={onSave} disabled={saving} className="rounded-xl px-4 py-2 text-xs font-bold text-white" style={{ background: COLOR }}>{saving ? "Saving..." : "Save"}</button></div>
}
