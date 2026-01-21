// File: /src/features/lien-waivers/components/LienWaiverStatusBadge.tsx
// Badge component for displaying lien waiver status
// Refactored to use unified StatusBadge component

import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LIEN_WAIVER_TYPES, type LienWaiverStatus, type LienWaiverType } from '@/types/lien-waiver';

interface LienWaiverStatusBadgeProps {
  status: LienWaiverStatus;
  className?: string;
}

export function LienWaiverStatusBadge({ status, className }: LienWaiverStatusBadgeProps) {
  return (
    <StatusBadge
      status={status}
      domain="lien_waiver"
      className={cn(className)}
    />
  );
}

interface LienWaiverTypeBadgeProps {
  type: LienWaiverType;
  className?: string;
}

export function LienWaiverTypeBadge({ type, className }: LienWaiverTypeBadgeProps) {
  const config = LIEN_WAIVER_TYPES.find((t) => t.value === type);
  const isConditional = config?.isConditional;
  const isFinal = config?.isFinal;

  // Use semantic colors: warning for conditional, success for unconditional
  const colorClass = isConditional
    ? 'bg-warning-light text-warning-dark border-warning'
    : 'bg-success-light text-success-dark border-success';

  return (
    <div className="flex items-center gap-1">
      <Badge className={cn('font-medium border', colorClass, className)}>
        {config?.label || type}
      </Badge>
      {isFinal && (
        <Badge variant="outline" className="text-xs">
          Final
        </Badge>
      )}
    </div>
  );
}

export default LienWaiverStatusBadge;
