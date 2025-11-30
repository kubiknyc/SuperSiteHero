/**
 * Material Condition Badge Component
 */

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { CheckCircle, AlertTriangle, AlertCircle, XCircle } from 'lucide-react'
import type { MaterialCondition } from '@/types/material-receiving'
import { MATERIAL_CONDITIONS } from '@/types/material-receiving'

interface ConditionBadgeProps {
  condition: MaterialCondition
  className?: string
  showIcon?: boolean
}

const conditionConfig: Record<MaterialCondition, { color: string; icon: typeof CheckCircle }> = {
  good: {
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle,
  },
  damaged: {
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle,
  },
  partial: {
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: AlertTriangle,
  },
  rejected: {
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: AlertCircle,
  },
}

export function ConditionBadge({ condition, className, showIcon = true }: ConditionBadgeProps) {
  const config = conditionConfig[condition]
  const conditionLabel = MATERIAL_CONDITIONS.find((c) => c.value === condition)?.label || condition
  const Icon = config.icon

  return (
    <Badge variant="outline" className={cn(config.color, 'gap-1', className)}>
      {showIcon && <Icon className="h-3 w-3" />}
      {conditionLabel}
    </Badge>
  )
}

export default ConditionBadge
