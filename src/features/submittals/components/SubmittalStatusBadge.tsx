// File: /src/features/submittals/components/SubmittalStatusBadge.tsx
// Display status as a colored badge for submittals

import { cn } from '@/lib/utils'

interface SubmittalStatusBadgeProps {
  status: string
  className?: string
}

// Status color mappings for submittals
const statusColors: Record<string, string> = {
  draft: 'bg-muted text-foreground border-input',
  submitted: 'bg-info-light text-blue-800 border-blue-300',
  under_review: 'bg-warning-light text-yellow-800 border-yellow-300',
  approved: 'bg-success text-white border-green-700',
  rejected: 'bg-error-light text-red-800 border-red-300',
  resubmit_required: 'bg-orange-100 text-orange-800 border-orange-300',
}

// Status label mappings
const statusLabels: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  resubmit_required: 'Resubmit Required',
}

export function SubmittalStatusBadge({ status, className }: SubmittalStatusBadgeProps) {
  const colorClass = statusColors[status] || statusColors.draft
  const label = statusLabels[status] || status

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold',
        colorClass,
        className
      )}
    >
      {label}
    </span>
  )
}
