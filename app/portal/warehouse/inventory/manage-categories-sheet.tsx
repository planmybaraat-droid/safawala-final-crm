"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { PortalIcon } from "@/components/portal/portal-icons"

const COLOR = "#a855f7"
const supabase = createClient()

interface Category { id: string; name: string; parent_id?: string | null }

/**
 * Same CRUD app/inventory/dashboard.tsx's Manage Categories dialog does
 * (direct against product_categories, soft-delete via is_active=false) —
 * as a purple portal bottom sheet instead of a centered desktop dialog.
 */
export function ManageCategoriesSheet({
  open,
  onClose,
  franchiseId,
  isSuperAdmin,
  onChanged,
}: {
  open: boolean
  onClose: () => void
  franchiseId?: string
  isSuperAdmin?: boolean
  onChanged?: () => void
}) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState("")
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [error, setError] = useState("")

  useEffect(() => { if (open) load() }, [open])

  async function load() {
    setLoading(true)
    try {
      let q = supabase.from("product_categories").select("id, name, parent_id").eq("is_active", true)
      if (!isSuperAdmin && franchiseId) q = q.eq("franchise_id", franchiseId)
      const { data } = await q.order("name")
      setCategories(data || [])
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd() {
    if (!newName.trim() || adding) return
    setAdding(true)
    setError("")
    try {
      const payload: Record<string, any> = { name: newName.trim(), is_active: true }
      if (!isSuperAdmin) {
        if (!franchiseId) throw new Error("Franchise context is required")
        payload.franchise_id = franchiseId
      }
      const { error: err } = await supabase.from("product_categories").insert([payload])
      if (err) throw err
      setNewName("")
      await load()
      onChanged?.()
    } catch (e: any) {
      setError(e.message || "Failed to add category")
    } finally {
      setAdding(false)
    }
  }

  async function handleUpdate(id: string) {
    if (!editingName.trim()) return
    try {
      let q = supabase.from("product_categories").update({ name: editingName.trim() }).eq("id", id)
      if (!isSuperAdmin && franchiseId) q = q.eq("franchise_id", franchiseId)
      const { error: err } = await q
      if (err) throw err
      setEditingId(null)
      await load()
      onChanged?.()
    } catch (e: any) {
      setError(e.message || "Failed to update category")
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete category "${name}"? Products in it become uncategorized.`)) return
    try {
      let q = supabase.from("product_categories").update({ is_active: false }).eq("id", id)
      if (!isSuperAdmin && franchiseId) q = q.eq("franchise_id", franchiseId)
      const { error: err } = await q
      if (err) throw err
      await load()
      onChanged?.()
    } catch (e: any) {
      setError(e.message || "Failed to delete category")
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-t-[28px] sm:rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl border-t-4"
        style={{ borderColor: COLOR }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h3 className="font-extrabold text-[15px]" style={{ color: "#1e1208" }}>Manage Categories</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Add, rename, or remove inventory categories</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400"><PortalIcon name="x" size={18} /></button>
        </div>

        <div className="p-5 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="New category name..."
            className="flex-1 px-3 py-2.5 rounded-xl border text-[13px] outline-none"
            style={{ borderColor: "rgba(0,0,0,0.12)" }}
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
            className="px-4 rounded-xl text-white text-[13px] font-bold disabled:opacity-50"
            style={{ background: COLOR }}
          >
            Add
          </button>
        </div>

        {error && <p className="px-5 -mt-2 mb-2 text-[11px] text-red-600 font-semibold">{error}</p>}

        <div className="divide-y divide-slate-100">
          {loading ? (
            <p className="p-6 text-center text-[12px] text-slate-400">Loading…</p>
          ) : categories.length === 0 ? (
            <p className="p-6 text-center text-[12px] text-slate-400">No categories yet</p>
          ) : (
            categories.map((cat) => (
              <div key={cat.id} className="px-5 py-3 flex items-center gap-2">
                {editingId === cat.id ? (
                  <>
                    <input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleUpdate(cat.id)}
                      autoFocus
                      className="flex-1 px-2.5 py-1.5 rounded-lg border text-[13px] outline-none"
                      style={{ borderColor: COLOR }}
                    />
                    <button onClick={() => handleUpdate(cat.id)} className="p-1.5 text-emerald-600"><PortalIcon name="check" size={16} /></button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400"><PortalIcon name="x" size={16} /></button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-[13px] font-bold text-slate-800 uppercase">{cat.name}</span>
                    <button onClick={() => { setEditingId(cat.id); setEditingName(cat.name) }} className="p-1.5 text-slate-400 hover:text-slate-600"><PortalIcon name="clipboard" size={15} /></button>
                    <button onClick={() => handleDelete(cat.id, cat.name)} className="p-1.5 text-red-400 hover:text-red-600"><PortalIcon name="x" size={16} /></button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
