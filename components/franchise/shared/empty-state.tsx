'use client'
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-[#f1f3f7] flex items-center justify-center">
          <Icon className="w-7 h-7 text-[#9ca3af]" />
        </div>
      )}
      <div>
        <p className="text-sm font-semibold text-[#0f1117]">{title}</p>
        {description && <p className="text-xs text-[#9ca3af] mt-1 max-w-xs">{description}</p>}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-1 px-4 py-2 bg-[#d4a017] hover:bg-[#b8891a] text-white text-xs font-semibold rounded-lg transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
