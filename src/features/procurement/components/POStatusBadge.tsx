/**
 * Purchase Order Status Badge
 */

import { cn } from '@/lib/utils';
import type { POStatus } from '@/types/procurement';
import { PO_STATUS_CONFIG } from '@/types/procurement';

interface POStatusBadgeProps {
  status: POStatus;
  className?: string;
}

export function POStatusBadge({ status, className }: POStatusBadgeProps) {
  const config = PO_STATUS_CONFIG[status] || PO_STATUS_CONFIG.draft;

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        config.bgColor,
        config.color,
        className
      )}
    >
      {config.label}
    </span>
  );
}
