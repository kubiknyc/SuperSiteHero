import { Badge } from '@/components/ui/badge'
import type { SiteInstructionPriority } from '@/types/database'

interface SiteInstructionPriorityBadgeProps {
  priority: SiteInstructionPriority | string | null | undefined
}

const priorityConfig: Record<
  SiteInstructionPriority,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }
> = {
  low: { label: 'Low', variant: 'secondary' },
  normal: { label: 'Normal', variant: 'outline' },
  high: { label: 'High', variant: 'warning' },
  urgent: { label: 'Urgent', variant: 'destructive' },
}

export function SiteInstructionPriorityBadge({ priority }: SiteInstructionPriorityBadgeProps) {
  if (!priority) return null

  const config = priorityConfig[priority as SiteInstructionPriority] || {
    label: priority,
    variant: 'secondary' as const,
  }

  return <Badge variant={config.variant}>{config.label}</Badge>
}
