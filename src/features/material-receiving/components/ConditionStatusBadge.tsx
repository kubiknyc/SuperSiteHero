/**
 * Condition Status Badge Component
 * Displays material condition with color coding
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ConditionStatus } from '@/types/material-receiving';
import { CheckCircle, AlertTriangle, XCircle, AlertCircle } from 'lucide-react';

interface ConditionStatusBadgeProps {
  status: ConditionStatus;
  className?: string;
}

const statusConfig: Record<ConditionStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  good: {
    label: 'Good',
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: CheckCircle,
  },
  damaged: {
    label: 'Damaged',
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: AlertTriangle,
  },
  defective: {
    label: 'Defective',
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: XCircle,
  },
  incorrect: {
    label: 'Incorrect',
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    icon: AlertCircle,
  },
};

export function ConditionStatusBadge({ status, className }: ConditionStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn(config.color, 'flex items-center gap-1', className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

export default ConditionStatusBadge;
