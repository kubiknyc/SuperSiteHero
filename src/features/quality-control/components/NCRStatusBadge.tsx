/**
 * NCR Status Badge Component
 *
 * Displays the status of a Non-Conformance Report with appropriate styling.
 * Status values match migration 155: open, under_review, corrective_action, verification, resolved, closed, voided
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { NCRStatus } from '@/types/quality-control';

interface NCRStatusBadgeProps {
  status: NCRStatus | string;
  className?: string;
}

// Status values aligned with database schema (migration 155)
const statusConfig: Record<string, { label: string; variant: string }> = {
  [NCRStatus.OPEN]: { label: 'Open', variant: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  [NCRStatus.UNDER_REVIEW]: { label: 'Under Review', variant: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
  [NCRStatus.CORRECTIVE_ACTION]: { label: 'Corrective Action', variant: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  [NCRStatus.VERIFICATION]: { label: 'Verification', variant: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
  [NCRStatus.RESOLVED]: { label: 'Resolved', variant: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  [NCRStatus.CLOSED]: { label: 'Closed', variant: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
  [NCRStatus.VOIDED]: { label: 'Voided', variant: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
  // Legacy values for backwards compatibility
  under_investigation: { label: 'Under Investigation', variant: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
  pending_verification: { label: 'Pending Verification', variant: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
  verified: { label: 'Verified', variant: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
};

export function NCRStatusBadge({ status, className }: NCRStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig[NCRStatus.OPEN];

  return (
    <Badge className={cn(config.variant, className)}>
      {config.label}
    </Badge>
  );
}
