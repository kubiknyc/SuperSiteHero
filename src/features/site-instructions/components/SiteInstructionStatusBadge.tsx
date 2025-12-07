import { Badge } from '@/components/ui/badge'
import type { SiteInstructionStatus } from '@/types/database'

interface SiteInstructionStatusBadgeProps {
  status: SiteInstructionStatus | string | null | undefined
}

const statusConfig: Record<
  SiteInstructionStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }
> = {
  draft: { label: 'Draft', variant: 'secondary' },
  issued: { label: 'Issued', variant: 'default' },
  acknowledged: { label: 'Acknowledged', variant: 'warning' },
  in_progress: { label: 'In Progress', variant: 'default' },
  completed: { label: 'Completed', variant: 'success' },
  verified: { label: 'Verified', variant: 'success' },
  void: { label: 'Void', variant: 'destructive' },
}

export function SiteInstructionStatusBadge({ status }: SiteInstructionStatusBadgeProps) {
  if (!status) return null

  const config = statusConfig[status as SiteInstructionStatus] || {
    label: status,
    variant: 'secondary' as const,
  }

  return <Badge variant={config.variant}>{config.label}</Badge>
}
