import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Safawala — Wedding Packages",
  description: "Premium wedding accessories packages — safas, malas, kalgis and more.",
}

export default function PackagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#f9fafb", color: "#111827", minHeight: "100vh" }}>
      {children}
    </div>
  )
}
