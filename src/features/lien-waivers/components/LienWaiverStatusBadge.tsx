// File: /src/features/lien-waivers/components/LienWaiverStatusBadge.tsx
// Badge component for displaying lien waiver status

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { LienWaiverStatus, LienWaiverType } from '@/types/lien-waiver';
import { LIEN_WAIVER_STATUSES, LIEN_WAIVER_TYPES } from '@/types/lien-waiver';

interface LienWaiverStatusBadgeProps {
  status: LienWaiverStatus;
  className?: string;
}

const statusColorMap: Record<string, string> = {
  gray: 'bg-gray-100 text-gray-700 border-gray-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  green: 'bg-green-100 text-green-700 border-green-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
};

export function LienWaiverStatusBadge({ status, className }: LienWaiverStatusBadgeProps) {
  const config = LIEN_WAIVER_STATUSES.find((s) => s.value === status);
  const colorClass = statusColorMap[config?.color || 'gray'];

  return (
    <Badge className={cn('font-medium border', colorClass, className)}>
      {config?.label || status}
    </Badge>
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

  const colorClass = isConditional
    ? 'bg-amber-100 text-amber-700 border-amber-200'
    : 'bg-emerald-100 text-emerald-700 border-emerald-200';

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
