"use client"

import { useState } from "react"
import Link from "next/link"

export default function WorkflowStep1Page() {
  const [isSimulated, setIsSimulated] = useState(true)
  const [activeTab, setActiveTab] = useState<"diagram" | "logic">("diagram")

  return (
    <div className="min-h-screen bg-[#FBFBFD] text-slate-900 font-sans p-4 sm:p-8 flex flex-col items-center">
      {/* ── Top Header Bar ── */}
      <div className="w-full max-w-7xl flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200/80">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100/80 text-purple-700 text-xs font-bold mb-2">
            <span>🚀 SAFAWALA CRM</span>
            <span>•</span>
            <span>STEP 1 WORKFLOW</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Booking Created → Department Jobs Generated Automatically
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1 max-w-3xl">
            As soon as a rental booking is confirmed, Safawala CRM automatically creates department-wise Jobs using the same Booking ID for complete tracking.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsSimulated(!isSimulated)}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all shadow-md shadow-purple-200 flex items-center gap-2"
          >
            <span>⚡</span>
            <span>{isSimulated ? "Simulating Auto-Trigger" : "Run Live Trigger Test"}</span>
          </button>
          <Link
            href="/dashboard"
            className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* ── 16:9 Landscape Infographic Container ── */}
      <div className="w-full max-w-7xl bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-100 p-6 sm:p-10 relative overflow-hidden">
        {/* Subtle Background Mesh & Accent Lines */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-50/50 rounded-full blur-3xl -z-0 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-50/50 rounded-full blur-3xl -z-0 pointer-events-none" />

        {/* ── 3-Column Infographic Layout ── */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* 👈 LEFT SIDE: Master Booking Card */}
          <div className="lg:col-span-4 flex flex-col items-center">
            <div className="w-full bg-gradient-to-b from-white to-slate-50 border border-slate-200 rounded-2xl p-6 shadow-md hover:shadow-lg transition-all relative">
              
              {/* Header Badge */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-600" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-purple-700">
                    BOOKING PORTAL
                  </span>
                </div>
                <span className="text-xs font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                  Master Record
                </span>
              </div>

              {/* Card Fields */}
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center bg-purple-50/60 p-2.5 rounded-xl border border-purple-100">
                  <span className="font-semibold text-slate-500">Booking ID</span>
                  <span className="font-black text-purple-900 text-sm tracking-wide">JOB #2026-0001</span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="font-semibold text-slate-500">Customer</span>
                  <span className="font-extrabold text-slate-800">Rahul Sharma</span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="font-semibold text-slate-500">Event Date</span>
                  <span className="font-extrabold text-slate-800">20 Jan 2026</span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="font-semibold text-slate-500">Package</span>
                  <span className="font-extrabold text-slate-800">Premium Rental Package</span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="font-semibold text-slate-500">Status</span>
                  <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 font-extrabold text-[11px] px-3 py-1 rounded-full border border-emerald-200">
                    <span>✅</span> Booking Confirmed
                  </span>
                </div>
              </div>

            </div>

            <div className="mt-3 text-center">
              <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-black uppercase tracking-wider">
                One Booking = One Master Job
              </span>
            </div>
          </div>

          {/* 🎯 CENTER: CRM Automation Engine */}
          <div className="lg:col-span-4 flex flex-col items-center text-center px-2 py-4 relative">
            
            {/* Animated Connecting Line (Desktop Left -> Center) */}
            <div className="hidden lg:block absolute left-[-2rem] top-1/2 -translate-y-1/2 w-8 h-[2px] bg-gradient-to-r from-purple-300 to-purple-500" />
            
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-200 mb-4 animate-pulse">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>

            <h2 className="text-base font-black text-slate-900 tracking-tight">
              CRM Automation Engine
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed max-w-xs">
              When the booking is confirmed, the CRM automatically generates department-specific Jobs using the same Booking ID.
            </p>

            <div className="mt-4 space-y-1.5 text-[11px] font-bold text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/60 w-full max-w-xs">
              <div className="flex items-center justify-center gap-1.5 text-emerald-700">
                <span>✓</span> No manual task creation
              </div>
              <div className="flex items-center justify-center gap-1.5 text-emerald-700">
                <span>✓</span> No phone calls
              </div>
              <div className="flex items-center justify-center gap-1.5 text-emerald-700">
                <span>✓</span> No WhatsApp follow-ups
              </div>
              <div className="text-purple-700 font-black pt-1 border-t border-slate-200/60">
                ⚡ Everything is created automatically
              </div>
            </div>

            {/* Animated Connecting Line (Desktop Center -> Right) */}
            <div className="hidden lg:block absolute right-[-2rem] top-1/2 -translate-y-1/2 w-8 h-[2px] bg-gradient-to-r from-purple-500 to-indigo-300" />
          </div>

          {/* 👉 RIGHT SIDE: 6 Department Job Cards */}
          <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
            
            {/* 📦 Warehouse */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between hover:bg-white hover:border-purple-200 transition-all shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">📦</span>
                <div>
                  <h4 className="text-xs font-black text-slate-800">Warehouse</h4>
                  <p className="text-[10px] font-bold text-purple-700">JOB #2026-0001</p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                🟡 Waiting
              </span>
            </div>

            {/* ✅ QC */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between hover:bg-white hover:border-purple-200 transition-all shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">✅</span>
                <div>
                  <h4 className="text-xs font-black text-slate-800">QC (Quality Check)</h4>
                  <p className="text-[10px] font-bold text-purple-700">JOB #2026-0001</p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                🟡 Waiting
              </span>
            </div>

            {/* 🚚 Travels */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between hover:bg-white hover:border-purple-200 transition-all shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">🚚</span>
                <div>
                  <h4 className="text-xs font-black text-slate-800">Travels</h4>
                  <p className="text-[10px] font-bold text-purple-700">JOB #2026-0001</p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                🟡 Waiting
              </span>
            </div>

            {/* 🚛 Delivery */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between hover:bg-white hover:border-purple-200 transition-all shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">🚛</span>
                <div>
                  <h4 className="text-xs font-black text-slate-800">Delivery</h4>
                  <p className="text-[10px] font-bold text-purple-700">JOB #2026-0001</p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                🟡 Waiting
              </span>
            </div>

            {/* 💰 Accounts */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between hover:bg-white hover:border-purple-200 transition-all shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">💰</span>
                <div>
                  <h4 className="text-xs font-black text-slate-800">Accounts</h4>
                  <p className="text-[10px] font-bold text-purple-700">JOB #2026-0001</p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                🟡 Waiting
              </span>
            </div>

            {/* 👑 Manager (Optional) */}
            <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 flex items-center justify-between hover:bg-white transition-all shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">👑</span>
                <div>
                  <h4 className="text-xs font-black text-purple-900">Manager (Optional)</h4>
                  <p className="text-[10px] font-bold text-purple-700">JOB #2026-0001</p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                🟢 Monitoring
              </span>
            </div>

          </div>

        </div>

        {/* ── Bottom Section: System Logic Flowchart & Note ── */}
        <div className="mt-10 pt-6 border-t border-slate-200/80 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          <div className="md:col-span-7 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
              <span>🔄</span> System Logic Flowchart
            </h3>
            
            <div className="font-mono text-[11px] text-slate-700 bg-white p-3.5 rounded-xl border border-slate-200/60 overflow-x-auto leading-relaxed">
              <div className="text-purple-700 font-bold">Booking Confirmed</div>
              <div className="text-slate-400">        │</div>
              <div className="text-slate-400">        ▼</div>
              <div className="text-indigo-700 font-bold">CRM Creates Master Job (#2026-0001)</div>
              <div className="text-slate-400">        │</div>
              <div className="text-slate-400">        ├── 📦 Warehouse Job #2026-0001</div>
              <div className="text-slate-400">        ├── ✅ QC Job #2026-0001</div>
              <div className="text-slate-400">        ├── 🚚 Travels Job #2026-0001</div>
              <div className="text-slate-400">        ├── 🚛 Delivery Job #2026-0001</div>
              <div className="text-slate-400">        └── 💰 Accounts Job #2026-0001</div>
            </div>
          </div>

          <div className="md:col-span-5 bg-purple-50/80 p-5 rounded-2xl border border-purple-200/80 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-purple-900 font-black text-xs uppercase tracking-wider mb-2">
              <span>💡</span> Bottom Note & Trackability
            </div>
            <p className="text-xs font-semibold text-purple-950 leading-relaxed">
              Every department receives its own Job instantly using the same Booking ID, making it easy to track the booking from start to finish.
            </p>
          </div>

        </div>

      </div>
    </div>
  )
}
