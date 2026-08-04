'use client'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface ErrorCardProps {
  message?: string
  onRetry?: () => void
  compact?: boolean
}

export function ErrorCard({ message = 'Failed to load data', onRetry, compact }: ErrorCardProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 py-3 px-4 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span className="flex-1">{message}</span>
        {onRetry && (
          <button onClick={onRetry} className="text-red-500 hover:text-red-700 transition-colors">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-red-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-[#0f1117]">Something went wrong</p>
        <p className="text-xs text-[#9ca3af] mt-1 max-w-xs">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 text-xs font-medium text-[#7c3aed] hover:text-[#6d28d9] transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Try again
        </button>
      )}
    </div>
  )
}
