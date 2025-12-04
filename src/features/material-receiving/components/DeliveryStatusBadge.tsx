/**
 * Delivery Status Badge Component
 * Displays delivery status with color coding
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DeliveryStatus } from '@/types/material-receiving';
import { Package, PackageCheck, PackageX, PackageMinus, Clock } from 'lucide-react';

interface DeliveryStatusBadgeProps {
  status: DeliveryStatus;
  className?: string;
}

const statusConfig: Record<DeliveryStatus, { label: string; color: string; icon: typeof Package }> = {
  scheduled: {
    label: 'Scheduled',
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: Clock,
  },
  received: {
    label: 'Received',
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: PackageCheck,
  },
  partially_received: {
    label: 'Partial',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: PackageMinus,
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: PackageX,
  },
  back_ordered: {
    label: 'Back Ordered',
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    icon: Clock,
  },
};

export function DeliveryStatusBadge({ status, className }: DeliveryStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn(config.color, 'flex items-center gap-1', className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

export default DeliveryStatusBadge;
