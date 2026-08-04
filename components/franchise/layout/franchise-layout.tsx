'use client'
import { FranchiseSidebar } from './sidebar'
import { FranchiseTopbar } from './topbar'

export function FranchiseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f9fc]">
      <FranchiseSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <FranchiseTopbar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
