// File: src/components/ui/stat-card.tsx
// Industrial-styled stat card for dashboard metrics

import * as React from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'

interface StatCardProps {
  label: string
  value: string | number
  target?: number
  change?: string
  trend?: 'up' | 'down'
  icon: LucideIcon
  color: string
  sparklineData?: number[]
  link?: string
  filterLink?: string
  overdueCount?: number
  overdueLink?: string
  ariaLabel?: string
  onClick?: () => void
  className?: string
}

// Sparkline component
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = 100 - ((val - min) / range) * 80 - 10
    return `${x},${y}`
  }).join(' ')

  return (
    <svg
      width="100%"
      height="32"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="overflow-visible"
    >
      {/* Gradient fill under line */}
      <defs>
        <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Area fill */}
      <polygon
        points={`0,100 ${points} 100,100`}
        fill={`url(#gradient-${color.replace('#', '')})`}
      />

      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 3px ${color}40)` }}
      />

      {/* End dot */}
      <circle
        cx="100"
        cy={100 - ((data[data.length - 1] - min) / range) * 80 - 10}
        r="3"
        fill={color}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  )
}

// Progress bar component
function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0

  return (
    <div className="relative">
      <div className="flex justify-between mb-1.5 text-xs">
        <span className="text-steel-gray dark:text-gray-400 font-medium">Progress</span>
        <span className="font-mono font-semibold text-foreground">{Math.round(percentage)}%</span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out relative"
          style={{
            width: `${percentage}%`,
            background: `linear-gradient(90deg, ${color} 0%, ${color}CC 100%)`,
            boxShadow: `0 0 8px ${color}40`
          }}
        >
          {/* Shimmer effect */}
          <div
            className="absolute inset-0 animate-[shimmer_2s_infinite]"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              backgroundSize: '200% 100%',
            }}
          />
        </div>
      </div>
    </div>
  )
}

export function StatCard({
  label,
  value,
  target,
  change,
  trend = 'up',
  icon: Icon,
  color,
  sparklineData,
  link,
  filterLink,
  overdueCount,
  overdueLink,
  ariaLabel,
  onClick,
  className,
}: StatCardProps) {
  const [isHovered, setIsHovered] = React.useState(false)

  const numericValue = typeof value === 'string' ? parseInt(value, 10) : value
  const hasOverdue = overdueCount && overdueCount > 0

  return (
    <div
      role="article"
      aria-label={ariaLabel || `${label}: ${value}`}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        // Base styles
        'relative overflow-hidden rounded-xl p-6 cursor-pointer',
        'bg-white dark:bg-gray-900',
        'border border-slate-200 dark:border-gray-800',
        // Shadow and hover effects
        'shadow-sm hover:shadow-lg',
        'transition-all duration-300 ease-out',
        'hover:-translate-y-1',
        // Focus styles
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        className
      )}
      style={{
        boxShadow: isHovered
          ? `0 12px 24px -8px ${color}20, 0 4px 8px rgba(0,0,0,0.08)`
          : undefined
      }}
    >
      {/* Top colored accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1 transition-opacity duration-300"
        style={{
          background: `linear-gradient(90deg, ${color} 0%, ${color}80 100%)`,
          opacity: isHovered ? 1 : 0
        }}
      />

      {/* Header row */}
      <div className="flex justify-between items-start mb-5">
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center transition-transform duration-300"
          style={{
            backgroundColor: `${color}08`,
            border: `1px solid ${color}15`,
            transform: isHovered ? 'scale(1.05)' : 'scale(1)'
          }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>

        {/* Trend badge */}
        {change && (
          <div
            className={cn(
              'px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5',
              'border',
              trend === 'up'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800'
                : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800'
            )}
          >
            {trend === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {change}
          </div>
        )}
      </div>

      {/* Label */}
      <p className="label-blueprint text-steel-gray dark:text-gray-400 mb-2">
        {label}
      </p>

      {/* Value display */}
      <div className="flex items-baseline gap-3 mb-4">
        <span className="stat-number text-4xl text-foreground">
          {value}
        </span>
        {target && (
          <span className="text-base font-medium text-slate-400 dark:text-gray-500">
            / {target}
          </span>
        )}
      </div>

      {/* Sparkline */}
      {sparklineData && sparklineData.length > 1 && (
        <div className="mb-4">
          <Sparkline data={sparklineData} color={color} />
        </div>
      )}

      {/* Progress bar */}
      {target && (
        <ProgressBar value={numericValue || 0} max={target} color={color} />
      )}

      {/* Footer with overdue and link */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-gray-800">
        {hasOverdue ? (
          <Link
            to={overdueLink || filterLink || '#'}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 bg-red-50 dark:bg-red-950/50 px-2.5 py-1 rounded-md border border-red-100 dark:border-red-900"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            {overdueCount} Overdue
          </Link>
        ) : (
          <span />
        )}

        {(filterLink || link) && (
          <Link
            to={filterLink || link || '#'}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            View All
            <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  )
}
