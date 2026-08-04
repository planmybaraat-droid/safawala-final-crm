"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Save, CheckCircle2 } from "lucide-react"
import { createClient } from "@supabase/supabase-js"
import { toast } from "@/hooks/use-toast"

function useSupabaseClient() {
  return useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    return createClient(url, key)
  }, [])
}

interface ProductRow {
  product_id: string
  name: string
  qty_delivered: number
  qty_returned: number
  qty_damaged: number
  qty_lost: number
  notes?: string
}

export default function DeliveryReturnPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const supabase = useSupabaseClient()
  const [delivery, setDelivery] = useState<any>(null)
  const [booking, setBooking] = useState<any>(null)
  const [items, setItems] = useState<ProductRow[]>([])
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (params.id) {
      loadData(params.id as string)
    }
  }, [params.id])

  const loadData = async (deliveryId: string) => {
    try {
      setLoading(true)
      // Fetch delivery with booking link if any
      const { data: del } = await supabase
        .from("deliveries")
        .select("*, booking:bookings(*), customer:customers(name, phone)")
        .eq("id", deliveryId)
        .maybeSingle()

      setDelivery(del)
      setBooking(del?.booking || null)

      // For MVP, derive items from booking_items if linked, else empty/manual
      if (del?.booking?.id) {
        const { data: bi } = await supabase
          .from("booking_items")
          .select("id, product_id, quantity, products(name)")
          .eq("booking_id", del.booking.id)

        const rows: ProductRow[] = (bi || []).map((row: any) => ({
          product_id: row.product_id,
          name: row.products?.name || "Item",
          qty_delivered: Number(row.quantity || 0),
          qty_returned: Number(row.quantity || 0),
          qty_damaged: 0,
          qty_lost: 0,
        }))
        setItems(rows)
      } else {
        setItems([])
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }

  const updateField = (idx: number, field: keyof ProductRow, value: number | string) => {
    setItems((prev) => {
      const next = [...prev]
      // @ts-ignore
      next[idx][field] = typeof value === "string" ? value : Number(value)
      return next
    })
  }

  const isValid = useMemo(() => {
    return items.every((it) => (it.qty_returned + it.qty_damaged + it.qty_lost) === it.qty_delivered)
  }, [items])

  const handleSave = async () => {
    if (!booking?.id) {
      toast({ title: "Error", description: "This delivery has no linked booking.", variant: "destructive" })
      return
    }

    if (!isValid) {
      toast({ title: "Fix quantities", description: "Returned + Damaged + Lost must equal Delivered for each item.", variant: "destructive" })
      return
    }

    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryId: params.id,
          bookingId: booking.id,
          items,
          notes,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || "Failed")

      toast({ title: "Rental Return processed", description: "Inventory and booking summary updated." })
      router.push("/deliveries")
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to save rental return", variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <div className="p-6">Loading…</div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/deliveries")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Delivery #{delivery?.delivery_number || ""}</h2>
            <p className="text-muted-foreground">Process Rental Return</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleSave} disabled={!isValid || items.length === 0}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> Save Rental Return
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rental Return Items</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-sm text-muted-foreground">No linked booking items found.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Delivered</TableHead>
                    <TableHead className="text-right">Returned</TableHead>
                    <TableHead className="text-right">Damaged</TableHead>
                    <TableHead className="text-right">Lost</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it, idx) => (
                    <TableRow key={it.product_id}>
                      <TableCell className="font-medium">{it.name}</TableCell>
                      <TableCell className="text-right">{it.qty_delivered}</TableCell>
                      <TableCell className="text-right w-28">
                        <Input type="number" value={it.qty_returned}
                          onChange={(e) => updateField(idx, 'qty_returned', Number(e.target.value))}
                          min={0} />
                      </TableCell>
                      <TableCell className="text-right w-28">
                        <Input type="number" value={it.qty_damaged}
                          onChange={(e) => updateField(idx, 'qty_damaged', Number(e.target.value))}
                          min={0} />
                      </TableCell>
                      <TableCell className="text-right w-28">
                        <Input type="number" value={it.qty_lost}
                          onChange={(e) => updateField(idx, 'qty_lost', Number(e.target.value))}
                          min={0} />
                      </TableCell>
                      <TableCell>
                        <Input value={it.notes || ''} onChange={(e) => updateField(idx, 'notes', e.target.value)} placeholder="Optional" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!isValid && (
                <div className="text-red-600 text-sm mt-2">Each row must satisfy: Returned + Damaged + Lost = Delivered</div>
              )}
            </div>
          )}

          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
