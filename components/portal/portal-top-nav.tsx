"use client"

import Link from "next/link"
import { Bell } from "lucide-react"

export function PortalTopNav() {
  return (
    <header className="sticky top-0 z-40 flex h-[72px] items-center justify-between border-b border-[#E7E2EA] bg-white/95 px-8 backdrop-blur">
      <Link href="/dashboard" className="text-lg font-bold tracking-[-0.02em] text-[#1F1B24] no-underline">Safawala.com</Link>
      <div className="flex items-center gap-3">
        <button type="button" aria-label="Notifications" className="grid h-10 w-10 place-items-center rounded-xl text-[#6F6878] transition hover:bg-[#F1EAF5] hover:text-[#4A1F5E]"><Bell size={18} /></button>
        <div className="grid h-10 w-10 place-items-center rounded-full border border-[#E7E2EA] bg-[#F1EAF5] text-sm font-bold text-[#4A1F5E]">RD</div>
      </div>
    </header>
  )
}
