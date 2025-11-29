// File: /src/features/analytics/components/RiskScoreGauge.tsx
// Circular gauge component for displaying risk scores

import { cn } from '@/lib/utils'
import type { RiskScore, RiskLevel } from '@/types/analytics'

interface RiskScoreGaugeProps {
  score: number
  level: RiskLevel
  label: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

// Risk level configuration
const RISK_COLORS: Record<RiskLevel, { stroke: string; bg: string; text: string }> = {
  low: { stroke: '#22c55e', bg: 'bg-green-50', text: 'text-green-700' },
  medium: { stroke: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700' },
  high: { stroke: '#f97316', bg: 'bg-orange-50', text: 'text-orange-700' },
  critical: { stroke: '#ef4444', bg: 'bg-red-50', text: 'text-red-700' },
}

const SIZE_CONFIG = {
  sm: { size: 64, strokeWidth: 6, fontSize: 'text-sm' },
  md: { size: 96, strokeWidth: 8, fontSize: 'text-xl' },
  lg: { size: 128, strokeWidth: 10, fontSize: 'text-2xl' },
}

/**
 * RiskScoreGauge Component
 *
 * Displays a circular gauge showing a risk score (0-100) with
 * color coding based on risk level.
 *
 * Usage:
 * ```tsx
 * <RiskScoreGauge score={75} level="high" label="Overall Risk" />
 * <RiskScoreGauge score={30} level="low" label="Cost Risk" size="sm" />
 * ```
 */
export function RiskScoreGauge({
  score,
  level,
  label,
  size = 'md',
  showLabel = true,
  className,
}: RiskScoreGaugeProps) {
  const config = SIZE_CONFIG[size]
  const colors = RISK_COLORS[level]

  const radius = (config.size - config.strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(Math.max(score, 0), 100) / 100
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <div className={cn('flex flex-col items-center', className)}>
      {/* SVG Gauge */}
      <div
        className="relative"
        style={{ width: config.size, height: config.size }}
      >
        <svg
          className="transform -rotate-90"
          width={config.size}
          height={config.size}
        >
          {/* Background circle */}
          <circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={config.strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500 ease-out"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-bold', config.fontSize, colors.text)}>
            {Math.round(score)}
          </span>
        </div>
      </div>

      {/* Label */}
      {showLabel && (
        <div className="mt-2 text-center">
          <p className="text-sm font-medium text-gray-700">{label}</p>
          <p className={cn('text-xs font-medium capitalize', colors.text)}>
            {level} Risk
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Risk score badge variant (inline)
 */
interface RiskBadgeProps {
  score: number
  level: RiskLevel
  className?: string
}

export function RiskBadge({ score, level, className }: RiskBadgeProps) {
  const colors = RISK_COLORS[level]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        colors.bg,
        colors.text,
        className
      )}
    >
      <span className="font-bold">{Math.round(score)}</span>
      <span className="capitalize">{level}</span>
    </span>
  )
}

/**
 * Compact risk indicator for list views
 */
interface RiskIndicatorProps {
  level: RiskLevel
  className?: string
}

export function RiskIndicator({ level, className }: RiskIndicatorProps) {
  const colors = RISK_COLORS[level]

  return (
    <span
      className={cn(
        'inline-block w-2 h-2 rounded-full',
        level === 'low' && 'bg-green-500',
        level === 'medium' && 'bg-amber-500',
        level === 'high' && 'bg-orange-500',
        level === 'critical' && 'bg-red-500',
        className
      )}
      title={`${level} risk`}
    />
  )
}

/**
 * Mini risk score display
 */
interface MiniRiskScoreProps {
  score: number
  level: RiskLevel
  className?: string
}

export function MiniRiskScore({ score, level, className }: MiniRiskScoreProps) {
  const colors = RISK_COLORS[level]

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded',
        colors.bg,
        className
      )}
    >
      <RiskIndicator level={level} />
      <span className={cn('text-sm font-semibold', colors.text)}>
        {Math.round(score)}
      </span>
    </div>
  )
}
