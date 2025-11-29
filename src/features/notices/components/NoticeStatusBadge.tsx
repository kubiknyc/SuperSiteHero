// File: /src/features/notices/components/NoticeStatusBadge.tsx
// Status badge component for notices

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getNoticeStatusInfo } from '../types'

interface NoticeStatusBadgeProps {
  status: string | null
  className?: string
}

export function NoticeStatusBadge({ status, className }: NoticeStatusBadgeProps) {
  if (!status) return null

  const { label, color } = getNoticeStatusInfo(status)

  return (
    <Badge className={cn(color, 'capitalize', className)}>
      {label}
    </Badge>
  )
}
