const BRIDGE_URL = "http://localhost:9200"

export interface BartenderPrintJob {
  barcode: string
  productName: string
  salePrice?: number
  regularPrice?: number
  color?: string
  size?: string
  material?: string
  quantity: number
  templatePath?: string
}

export async function checkBartenderBridge(): Promise<boolean> {
  try {
    const res = await fetch(`${BRIDGE_URL}/status`, {
      signal: AbortSignal.timeout(2000),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function printViaBartender(
  job: BartenderPrintJob
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${BRIDGE_URL}/print`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(job),
      signal: AbortSignal.timeout(30000),
    })
    const data = await res.json()
    if (!res.ok) return { success: false, error: data.error || "Print failed" }
    return { success: true }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message?.includes("fetch")
        ? "Bridge not running. Start start.bat on this PC."
        : err?.message || "Unknown error",
    }
  }
}
