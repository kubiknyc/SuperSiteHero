// File: /src/pages/dashboard/components/StatCard.tsx
// Optimized memoized stat card component for dashboard

import { memo } from 'react'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'

export interface StatCardData {
  label: string
  value: string
  target: number
  change: string
  trend: 'up' | 'down'
  icon: LucideIcon
  color: string
  sparkline: number[]
  ariaLabel: string
}

interface StatCardProps {
  stat: StatCardData
  isFocused: boolean
  onFocus: () => void
  onBlur: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
  renderSparkline: (data: number[], color: string) => JSX.Element
}

/**
 * Memoized Stat Card Component
 * Only re-renders when stat data or focus state changes
 *
 * Performance: Prevents re-rendering all 4 stat cards when only one is interacted with
 */
export const StatCard = memo<StatCardProps>(function StatCard({
  stat,
  isFocused,
  onFocus,
  onBlur,
  onMouseEnter,
  onMouseLeave,
  renderSparkline,
}) {
  const Icon = stat.icon
  const percentage = (parseInt(stat.value) / stat.target) * 100

  return (
    <div
      role="article"
      aria-label={stat.ariaLabel}
      tabIndex={0}
      onFocus={onFocus}
      onBlur={onBlur}
      style={{
        backgroundColor: '#FFFFFF',
        border: `1px solid ${isFocused ? stat.color : '#E2E8F0'}`,
        borderRadius: '12px',
        padding: '1.75rem',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isFocused
          ? `0 8px 16px -4px ${stat.color}20, 0 4px 6px -2px ${stat.color}15`
          : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        transform: isFocused ? 'translateY(-4px) scale(1.01)' : 'translateY(0) scale(1)',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Top accent bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: `linear-gradient(90deg, ${stat.color} 0%, ${stat.color}80 100%)`,
          opacity: isFocused ? 1 : 0,
          transition: 'opacity 0.25s',
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.25rem' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            backgroundColor: `${stat.color}08`,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${stat.color}15`,
            transition: 'all 0.25s',
            transform: isFocused ? 'scale(1.05)' : 'scale(1)',
          }}
        >
          <Icon className="w-6 h-6" style={{ color: stat.color, strokeWidth: 2 }} />
        </div>

        <div
          style={{
            padding: '0.5rem 0.875rem',
            backgroundColor: stat.trend === 'up' ? '#ECFDF5' : '#FEF2F2',
            color: stat.trend === 'up' ? '#059669' : '#DC2626',
            borderRadius: '8px',
            fontSize: '0.8125rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            border: `1px solid ${stat.trend === 'up' ? '#A7F3D0' : '#FECACA'}`,
          }}
        >
          {stat.trend === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {stat.change}
        </div>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <p className="text-uppercase-label mb-2.5">{stat.label}</p>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <p className="text-4xl font-bold text-foreground dark:text-gray-50 leading-none tracking-tight">
            {stat.value}
          </p>
          <p className="text-base text-muted font-medium">/ {stat.target}</p>
        </div>

        {/* Sparkline */}
        <div style={{ marginBottom: '0.75rem' }}>
          {renderSparkline(stat.sparkline, stat.color)}
        </div>
      </div>

      {/* Enhanced Progress Bar */}
      <div>
        <div className="flex justify-between mb-2 text-xs text-muted font-medium">
          <span>Progress to Target</span>
          <span className="text-foreground dark:text-gray-50 font-semibold">{Math.round(percentage)}%</span>
        </div>
        <div
          style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#F1F5F9',
            borderRadius: '4px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: `${percentage}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${stat.color} 0%, ${stat.color}CC 100%)`,
              borderRadius: '4px',
              transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              boxShadow: `0 0 8px ${stat.color}40`,
            }}
          >
            {/* Shimmer effect */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                animation: 'shimmer 2s infinite',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
})
