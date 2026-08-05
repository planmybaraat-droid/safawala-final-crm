import { redirect } from "next/navigation"

/** Stable department entry-point for warehouse staff and bookmarked URLs. */
export default function WarehouseEntryPage() {
  redirect("/portal/warehouse")
}
