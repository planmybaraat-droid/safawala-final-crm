import jsPDF from "jspdf"
import "jspdf-autotable"

// Minimal generator for Settlement Invoice PDF; returns Blob in browser / Uint8Array in Node
export async function generateSettlementInvoicePDF(data: {
  invoiceNumber: string
  booking: any
  customer: any
  returns: { damaged: number; lost: number; breakdown: Array<{ name?: string; quantity?: number; damaged?: number; lost?: number; damage_fee?: number; lost_fee?: number; subtotal?: number }> }
  deposit: number
  deductions: number
  refundDue: number
  extraPayable: number
  notes?: string
}) {
  const doc = new jsPDF()
  const primary: [number, number, number] = [27, 94, 32]

  doc.setFontSize(16)
  doc.setTextColor(primary[0], primary[1], primary[2])
  doc.text("Settlement Invoice", 14, 16)

  doc.setFontSize(10)
  doc.setTextColor(0,0,0)
  doc.text(`No: ${data.invoiceNumber}`, 14, 24)
  doc.text(`Booking: ${data.booking?.booking_number || ''}`, 14, 30)
  doc.text(`Customer: ${data.customer?.name || ''}`, 14, 36)
  if (data.booking?.event_date) doc.text(`Event: ${new Date(data.booking.event_date).toLocaleDateString('en-IN')}`, 14, 42)

  let y = 50
  doc.setFontSize(12)
  doc.setTextColor(primary[0], primary[1], primary[2])
  doc.text("Return Summary", 14, y)
  y += 6
  doc.setTextColor(0,0,0)
  doc.text(`Damaged: ${data.returns.damaged} | Lost: ${data.returns.lost}`, 14, y)

  y += 8
  ;(doc as any).autoTable({
    head: [["Item", "Damaged", "Lost", "Damage Fee", "Lost Fee", "Subtotal"]],
    body: (data.returns.breakdown || []).map((r) => [r.name || '-', `${r.damaged||0}`, `${r.lost||0}`, `${r.damage_fee||0}`, `${r.lost_fee||0}`, `${r.subtotal||0}`]),
    startY: y,
    theme: 'grid',
    headStyles: { fillColor: primary, textColor: [255,255,255] },
    styles: { fontSize: 9 },
  })

  y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : y + 10

  doc.setFontSize(12)
  doc.setTextColor(primary[0], primary[1], primary[2])
  doc.text("Settlement", 14, y)
  y += 6
  doc.setTextColor(0,0,0)
  doc.text(`Deposit: ₹${data.deposit.toFixed(2)}`, 14, y)
  y += 6
  doc.text(`Deductions: ₹${data.deductions.toFixed(2)}`, 14, y)
  y += 6
  if (data.refundDue > 0) {
    doc.text(`Refund Due: ₹${data.refundDue.toFixed(2)}`, 14, y)
    y += 6
  }
  if (data.extraPayable > 0) {
    doc.text(`Extra Payable: ₹${data.extraPayable.toFixed(2)}`, 14, y)
    y += 6
  }

  if (data.notes) {
    y += 6
    doc.setTextColor(primary[0], primary[1], primary[2])
    doc.text("Notes", 14, y)
    y += 6
    doc.setTextColor(0,0,0)
    const lines = doc.splitTextToSize(data.notes, 180)
    doc.text(lines, 14, y)
  }

  return doc.output("blob")
}
