/**
 * NCR Severity Badge Component
 *
 * Displays the severity level of a Non-Conformance Report.
 * Severity values match migration 155: minor, major, critical
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertTriangle, AlertCircle, XCircle } from 'lucide-react';
import { NCRSeverity } from '@/types/quality-control';

interface NCRSeverityBadgeProps {
  severity: NCRSeverity | string;
  showIcon?: boolean;
  className?: string;
}

// Severity values aligned with database schema (migration 155)
const severityConfig: Record<string, { label: string; variant: string; Icon: typeof AlertTriangle }> = {
  [NCRSeverity.CRITICAL]: {
    label: 'Critical',
    variant: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    Icon: XCircle,
  },
  [NCRSeverity.MAJOR]: {
    label: 'Major',
    variant: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    Icon: AlertTriangle,
  },
  [NCRSeverity.MINOR]: {
    label: 'Minor',
    variant: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    Icon: AlertCircle,
  },
};

export function NCRSeverityBadge({ severity, showIcon = true, className }: NCRSeverityBadgeProps) {
  const config = severityConfig[severity] || severityConfig[NCRSeverity.MINOR];
  const { Icon } = config;

  return (
    <Badge className={cn(config.variant, 'gap-1', className)}>
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}
