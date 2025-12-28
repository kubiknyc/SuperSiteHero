/**
 * Inspection Status Badge Component
 *
 * Displays the status of a QC Inspection with appropriate styling.
 * Status values match migration 155: pending, in_progress, passed, failed, conditional
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { InspectionStatus, type InspectionResult } from '@/types/quality-control';

interface InspectionStatusBadgeProps {
  status: InspectionStatus | string;
  className?: string;
}

interface InspectionResultBadgeProps {
  result: InspectionResult | string;
  className?: string;
}

// Status values aligned with database schema (migration 155)
// pending, in_progress, passed, failed, conditional, cancelled
const statusConfig: Record<string, { label: string; variant: string }> = {
  [InspectionStatus.PENDING]: { label: 'Pending', variant: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
  [InspectionStatus.IN_PROGRESS]: { label: 'In Progress', variant: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  [InspectionStatus.PASSED]: { label: 'Passed', variant: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  [InspectionStatus.FAILED]: { label: 'Failed', variant: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
  [InspectionStatus.CONDITIONAL]: { label: 'Conditional', variant: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  [InspectionStatus.CANCELLED]: { label: 'Cancelled', variant: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
  // Legacy values for backwards compatibility (used by service layer)
  scheduled: { label: 'Scheduled', variant: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  completed: { label: 'Completed', variant: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
};

const resultConfig: Record<string, { label: string; variant: string }> = {
  pass: { label: 'Pass', variant: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  fail: { label: 'Fail', variant: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
  conditional: { label: 'Conditional', variant: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  conditional_pass: { label: 'Conditional Pass', variant: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  pending: { label: 'Pending', variant: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
};

export function InspectionStatusBadge({ status, className }: InspectionStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig[InspectionStatus.PENDING];

  return (
    <Badge className={cn(config.variant, className)}>
      {config.label}
    </Badge>
  );
}

export function InspectionResultBadge({ result, className }: InspectionResultBadgeProps) {
  const config = resultConfig[result] || resultConfig.pending;

  return (
    <Badge className={cn(config.variant, className)}>
      {config.label}
    </Badge>
  );
}
