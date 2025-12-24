// File: /src/features/notices/components/NoticeTypeBadge.tsx
// Type badge component for notices

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getNoticeTypeLabel } from '../types'

interface NoticeTypeBadgeProps {
  type: string
  className?: string
}

const typeColors: Record<string, string> = {
  claim: 'bg-error-light text-red-800 border-red-200',
  delay: 'bg-orange-100 text-orange-800 border-orange-200',
  change_directive: 'bg-info-light text-blue-800 border-blue-200',
  cure: 'bg-warning-light text-yellow-800 border-yellow-200',
  completion: 'bg-success-light text-green-800 border-green-200',
  termination: 'bg-error-light text-red-800 border-red-200',
  insurance: 'bg-purple-100 text-purple-800 border-purple-200',
  payment: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  deficiency: 'bg-amber-100 text-amber-800 border-amber-200',
  stop_work: 'bg-error-light text-red-800 border-red-200',
  general: 'bg-muted text-foreground border-border',
}

export function NoticeTypeBadge({ type, className }: NoticeTypeBadgeProps) {
  const label = getNoticeTypeLabel(type)
  const color = typeColors[type] || typeColors.general

  return (
    <Badge variant="outline" className={cn(color, className)}>
      {label}
    </Badge>
  )
}
