'use client'

export function RowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-[#e4e7ef]">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5 animate-pulse">
          <div className="h-8 w-8 rounded-full bg-[#e4e7ef] shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-[#e4e7ef] rounded w-1/3" />
            <div className="h-2.5 bg-[#f1f3f7] rounded w-1/2" />
          </div>
          <div className="h-3 bg-[#e4e7ef] rounded w-16" />
          <div className="h-6 w-20 bg-[#f1f3f7] rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-[#e4e7ef] p-5 animate-pulse">
          <div className="h-3 bg-[#e4e7ef] rounded w-20 mb-3" />
          <div className="h-7 bg-[#e4e7ef] rounded w-24 mb-2" />
          <div className="h-2.5 bg-[#f1f3f7] rounded w-16" />
        </div>
      ))}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 bg-[#e4e7ef] rounded w-40" />
          <div className="h-3 bg-[#f1f3f7] rounded w-60" />
        </div>
        <div className="h-9 w-28 bg-[#e4e7ef] rounded-lg" />
      </div>
      <CardSkeleton />
      <div className="bg-white rounded-xl border border-[#e4e7ef] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#e4e7ef]">
          <div className="h-3.5 bg-[#e4e7ef] rounded w-24" />
        </div>
        <RowSkeleton count={6} />
      </div>
    </div>
  )
}
