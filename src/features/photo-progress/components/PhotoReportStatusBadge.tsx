/**
 * Photo Report Status Badge Component
 *
 * Displays the status of a photo progress report with appropriate styling.
 */

import { Badge } from '@/components/ui/badge';
import {
  FileEdit,
  Eye,
  CheckCircle,
  Send,
} from 'lucide-react';
import { PhotoReportStatus, getReportStatusLabel } from '@/types/photo-progress';

interface PhotoReportStatusBadgeProps {
  status: PhotoReportStatus | string;
  showIcon?: boolean;
  className?: string;
}

const statusConfig: Record<string, {
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  icon: React.ElementType;
  className: string;
}> = {
  [PhotoReportStatus.DRAFT]: {
    variant: 'outline',
    icon: FileEdit,
    className: 'border-gray-500 text-gray-600 dark:text-gray-400',
  },
  [PhotoReportStatus.REVIEW]: {
    variant: 'outline',
    icon: Eye,
    className: 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950',
  },
  [PhotoReportStatus.APPROVED]: {
    variant: 'outline',
    icon: CheckCircle,
    className: 'border-green-500 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950',
  },
  [PhotoReportStatus.DISTRIBUTED]: {
    variant: 'outline',
    icon: Send,
    className: 'border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950',
  },
};

export function PhotoReportStatusBadge({
  status,
  showIcon = true,
  className = '',
}: PhotoReportStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig[PhotoReportStatus.DRAFT];
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={`${config.className} ${className}`}
    >
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {getReportStatusLabel(status)}
    </Badge>
  );
}
