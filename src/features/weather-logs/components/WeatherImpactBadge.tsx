// File: /src/features/weather-logs/components/WeatherImpactBadge.tsx
// Badge component for displaying work impact level

import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import type { WorkImpact } from '@/types/database-extensions'
import { cn } from '@/lib/utils'

interface WeatherImpactBadgeProps {
  impact: WorkImpact
  className?: string
  showIcon?: boolean
}

const impactConfig: Record<
  WorkImpact,
  {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    color: string
    icon: React.ComponentType<{ className?: string }>
  }
> = {
  none: {
    label: 'No Impact',
    variant: 'outline',
    color: 'text-success border-success',
    icon: CheckCircle,
  },
  minor: {
    label: 'Minor Impact',
    variant: 'secondary',
    color: 'text-warning bg-warning-light border-yellow-600',
    icon: AlertCircle,
  },
  moderate: {
    label: 'Moderate Impact',
    variant: 'default',
    color: 'text-orange-600 bg-orange-50 border-orange-600',
    icon: AlertTriangle,
  },
  severe: {
    label: 'Severe Impact',
    variant: 'destructive',
    color: 'text-error bg-error-light border-error',
    icon: XCircle,
  },
}

export function WeatherImpactBadge({ impact, className = '', showIcon = true }: WeatherImpactBadgeProps) {
  const config = impactConfig[impact]
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={cn(config.color, className)}>
      {showIcon && <Icon className="w-3 h-3 mr-1" />}
      {config.label}
    </Badge>
  )
}

// Helper function to get impact level label
export function getWorkImpactLabel(impact: WorkImpact): string {
  return impactConfig[impact].label
}
