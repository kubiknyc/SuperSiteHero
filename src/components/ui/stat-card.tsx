// File: src/components/ui/stat-card.tsx
// Glass morphism stat card with premium styling for dashboard metrics

import * as React from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'

export interface StatCardProps {
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
  /** Animation delay index for staggered animations (0-3) */
  animationIndex?: number
}

// Color to glow class mapping
const colorToGlow: Record<string, string> = {
  '#3B82F6': 'icon-glow-primary',    // Blue
  '#1E40AF': 'icon-glow-primary',    // Blue dark
  '#10B981': 'icon-glow-success',    // Green
  '#059669': 'icon-glow-success',    // Green dark
  '#F59E0B': 'icon-glow-warning',    // Amber
  '#D97706': 'icon-glow-warning',    // Amber dark
  '#EF4444': 'icon-glow-danger',     // Red
  '#DC2626': 'icon-glow-danger',     // Red dark
  '#8B5CF6': 'icon-glow-primary',    // Purple (use primary glow)
  '#7C3AED': 'icon-glow-primary',    // Purple dark
}

// Counter for generating unique gradient IDs (avoids Math.random() on every render)
let gradientIdCounter = 0

// Sparkline component with improved styling
function Sparkline({ data, color }: { data: number[]; color: string }) {
  // Generate stable ID on mount using counter
  const gradientId = React.useMemo(() => {
    const id = `sparkline-gradient-${color.replace('#', '')}-${++gradientIdCounter}`
    return id
  }, [color])

  if (!data || data.length < 2) {return null}

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
      height="36"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="overflow-visible opacity-80"
    >
      {/* Gradient fill under line */}
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Area fill */}
      <polygon
        points={`0,100 ${points} 100,100`}
        fill={`url(#${gradientId})`}
      />

      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="drop-shadow-sm"
      />

      {/* End dot with pulse effect */}
      <circle
        cx="100"
        cy={100 - ((data[data.length - 1] - min) / range) * 80 - 10}
        r="3.5"
        fill={color}
        className="animate-pulse"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  )
}

// Progress bar component with refined styling
function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0

  return (
    <div className="relative">
      <div className="flex justify-between mb-1.5 text-xs">
        <span className="text-gray-500 dark:text-gray-400 font-medium">Progress</span>
        <span className="font-mono font-bold text-gray-900 dark:text-white">{Math.round(percentage)}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out relative"
          style={{
            width: `${percentage}%`,
            background: `linear-gradient(90deg, ${color} 0%, ${color}CC 100%)`,
            boxShadow: `0 0 12px ${color}50`
          }}
        />
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
  animationIndex = 0,
}: StatCardProps) {
  const [isHovered, setIsHovered] = React.useState(false)

  const numericValue = typeof value === 'string' ? parseInt(value, 10) : value
  const hasOverdue = overdueCount && overdueCount > 0
  const glowClass = colorToGlow[color] || 'icon-glow-primary'
  const staggerClass = `stagger-${Math.min(animationIndex + 1, 4)}`

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
        // Glass morphism base
        'glass-stat',
        // Rounded and padding - rounded-xl (12px) for refined look
        'rounded-xl p-6',
        // Layout
        'relative overflow-hidden cursor-pointer',
        // Transitions including border-color
        'transition-[transform,box-shadow,border-color] duration-200',
        // Animations
        'animate-fade-in-up',
        staggerClass,
        // Focus styles
        'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-transparent',
        className
      )}
      style={{
        // Dynamic border color on hover
        borderColor: isHovered ? `${color}40` : undefined,
      }}
    >
      {/* Colored accent - left border */}
      <div
        className="absolute left-0 top-4 bottom-4 w-1 rounded-full transition-all duration-300"
        style={{
          background: `linear-gradient(180deg, ${color} 0%, ${color}80 100%)`,
          opacity: isHovered ? 1 : 0.6,
          boxShadow: isHovered ? `0 0 12px ${color}60` : 'none'
        }}
      />

      {/* Header row */}
      <div className="flex justify-between items-start mb-5">
        {/* Icon with glow effect */}
        <div
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center',
            'transition-all duration-300',
            'bg-white/60 dark:bg-white/5',
            'border border-gray-200/50 dark:border-white/10',
            isHovered && 'scale-105'
          )}
          style={{
            backgroundColor: isHovered ? `${color}10` : undefined,
            borderColor: isHovered ? `${color}30` : undefined
          }}
        >
          <Icon
            className={cn(
              'w-5 h-5 transition-all duration-300',
              isHovered && glowClass
            )}
            style={{ color }}
          />
        </div>

        {/* Trend badge */}
        {change && (
          <div
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1',
              'backdrop-blur-sm transition-all duration-200',
              trend === 'up'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
            )}
          >
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {change}
          </div>
        )}
      </div>

      {/* Label - uppercase with letter spacing */}
      <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-2">
        {label}
      </p>

      {/* Value display - larger, bolder */}
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white tabular-nums">
          {value}
        </span>
        {target && (
          <span className="text-sm font-medium text-gray-400 dark:text-gray-500">
            / {target}
          </span>
        )}
      </div>

      {/* Sparkline */}
      {sparklineData && sparklineData.length > 1 && (
        <div className="mb-4 -mx-1">
          <Sparkline data={sparklineData} color={color} />
        </div>
      )}

      {/* Progress bar */}
      {target && (
        <ProgressBar value={numericValue || 0} max={target} color={color} />
      )}

      {/* Footer with overdue and link */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200/50 dark:border-white/5">
        {hasOverdue ? (
          <Link
            to={overdueLink || filterLink || '#'}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'flex items-center gap-1.5 text-xs font-semibold',
              'text-red-600 dark:text-red-400',
              'hover:text-red-700 dark:hover:text-red-300',
              'bg-red-500/10 px-2 py-1 rounded-md',
              'border border-red-500/20',
              'transition-colors duration-200'
            )}
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
            className={cn(
              'flex items-center gap-1 text-xs font-semibold',
              'text-gray-500 dark:text-gray-400',
              'hover:text-primary dark:hover:text-primary',
              'transition-colors duration-200'
            )}
          >
            View All
            <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  )
}

// Skeleton loader for stat cards
export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'glass-stat rounded-xl p-6 animate-pulse',
        className
      )}
    >
      {/* Icon placeholder */}
      <div className="flex justify-between items-start mb-5">
        <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700 shimmer" />
        <div className="w-16 h-6 rounded-lg bg-gray-200 dark:bg-gray-700 shimmer" />
      </div>

      {/* Label placeholder */}
      <div className="w-20 h-3 rounded bg-gray-200 dark:bg-gray-700 mb-3 shimmer" />

      {/* Value placeholder */}
      <div className="w-24 h-8 rounded bg-gray-200 dark:bg-gray-700 mb-4 shimmer" />

      {/* Sparkline placeholder */}
      <div className="w-full h-9 rounded bg-gray-100 dark:bg-gray-800 mb-4 shimmer" />

      {/* Progress bar placeholder */}
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <div className="w-12 h-3 rounded bg-gray-200 dark:bg-gray-700 shimmer" />
          <div className="w-8 h-3 rounded bg-gray-200 dark:bg-gray-700 shimmer" />
        </div>
        <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 shimmer" />
      </div>
    </div>
  )
}
