'use client'
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  trend?: { value: number; label: string }
  onClick?: () => void
  urgent?: boolean
}

export function StatsCard({
  title, value, subtitle, icon: Icon,
  iconColor = 'text-[#d4a017]', iconBg = 'bg-[#fef9ee]',
  trend, onClick, urgent
}: StatsCardProps) {
  const TrendIcon = !trend ? null : trend.value > 0 ? TrendingUp : trend.value < 0 ? TrendingDown : Minus
  const trendColor = !trend ? '' : trend.value > 0 ? 'text-green-600' : trend.value < 0 ? 'text-red-500' : 'text-[#9ca3af]'

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-xl border p-5 transition-all duration-150',
        onClick ? 'cursor-pointer hover:shadow-md hover:border-[#d1d5e0]' : '',
        urgent ? 'border-red-200 bg-red-50/30' : 'border-[#e4e7ef]'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[#9ca3af] uppercase tracking-wide truncate">{title}</p>
          <p className={cn('text-2xl font-bold mt-1.5', urgent ? 'text-red-600' : 'text-[#0f1117]')}>
            {value}
          </p>
          {subtitle && <p className="text-xs text-[#9ca3af] mt-0.5 truncate">{subtitle}</p>}
          {trend && TrendIcon && (
            <div className={cn('flex items-center gap-1 mt-2 text-xs font-medium', trendColor)}>
              <TrendIcon className="h-3 w-3" />
              <span>{Math.abs(trend.value)}% {trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
      </div>
    </div>
  )
}
