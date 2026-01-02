/**
 * DailyReportListItem Component
 *
 * A touch-friendly daily report list item with swipe actions for mobile users.
 * - Swipe right: Quick edit
 * - Swipe left: Show options (view, delete)
 */

import * as React from 'react';
import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  SwipeableListItem,
  createEditAction,
  createDeleteAction,
  type SwipeAction,
} from '@/components/ui/swipeable-list-item';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Calendar,
  Users,
  HardHat,
  CloudSun,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  MoreHorizontal,
  Edit2,
  Trash2,
  Eye,
  Send,
  Copy,
} from 'lucide-react';

export type DailyReportStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface DailyReportListItemData {
  id: string;
  report_date: string;
  status: DailyReportStatus;
  weather_condition?: string | null;
  temperature_high?: number | null;
  temperature_low?: number | null;
  work_summary?: string | null;
  workforce_count?: number;
  equipment_count?: number;
  delay_count?: number;
  created_at: string;
  updated_at?: string;
  submitted_by_name?: string | null;
  approved_by_name?: string | null;
}

export interface DailyReportListItemProps {
  report: DailyReportListItemData;
  /** Callback when view is requested */
  onView?: (id: string) => void;
  /** Callback when edit is requested */
  onEdit?: (id: string) => void;
  /** Callback when delete is requested */
  onDelete?: (id: string) => void;
  /** Callback when submit is requested */
  onSubmit?: (id: string) => void;
  /** Callback when copy is requested */
  onCopy?: (id: string) => void;
  /** Callback when item is clicked/tapped */
  onClick?: (id: string) => void;
  /** Disable swipe actions */
  disableSwipe?: boolean;
  /** Show in compact mode */
  compact?: boolean;
  /** Additional className */
  className?: string;
}

const statusConfig: Record<
  DailyReportStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  draft: {
    label: 'Draft',
    color: 'bg-muted text-secondary border-border',
    icon: <FileText className="h-3.5 w-3.5" />,
  },
  submitted: {
    label: 'Submitted',
    color: 'bg-info-light text-blue-800 border-blue-200',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  approved: {
    label: 'Approved',
    color: 'bg-success-light text-green-800 border-green-200',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-error-light text-red-800 border-red-200',
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
};

const weatherIcons: Record<string, string> = {
  sunny: 'Clear',
  cloudy: 'Cloudy',
  partly_cloudy: 'Partly Cloudy',
  rainy: 'Rainy',
  stormy: 'Stormy',
  snowy: 'Snowy',
  windy: 'Windy',
  foggy: 'Foggy',
};

export const DailyReportListItem = React.memo(function DailyReportListItem({
  report,
  onView,
  onEdit,
  onDelete,
  onSubmit,
  onCopy,
  onClick,
  disableSwipe = false,
  compact = false,
  className,
}: DailyReportListItemProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleView = useCallback(() => {
    onView?.(report.id);
    setIsMenuOpen(false);
  }, [onView, report.id]);

  const handleEdit = useCallback(() => {
    onEdit?.(report.id);
    setIsMenuOpen(false);
  }, [onEdit, report.id]);

  const handleDelete = useCallback(() => {
    onDelete?.(report.id);
    setIsMenuOpen(false);
  }, [onDelete, report.id]);

  const handleSubmit = useCallback(() => {
    onSubmit?.(report.id);
    setIsMenuOpen(false);
  }, [onSubmit, report.id]);

  const handleCopy = useCallback(() => {
    onCopy?.(report.id);
    setIsMenuOpen(false);
  }, [onCopy, report.id]);

  const handleClick = useCallback(() => {
    onClick?.(report.id);
  }, [onClick, report.id]);

  // Build swipe actions
  const rightActions: SwipeAction[] = [];
  const leftActions: SwipeAction[] = [];

  // Right swipe action (edit) - only for drafts
  if (onEdit && report.status === 'draft') {
    rightActions.push(createEditAction(handleEdit));
  }

  // Left swipe actions
  if (onDelete && report.status === 'draft') {
    leftActions.push(createDeleteAction(handleDelete));
  }

  const status = statusConfig[report.status];
  const reportDate = new Date(report.report_date);
  const [today] = React.useState(() => new Date());
  const isToday =
    format(reportDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
  const [yesterday] = React.useState(() => new Date(Date.now() - 86400000));
  const isYesterday =
    format(reportDate, 'yyyy-MM-dd') ===
    format(yesterday, 'yyyy-MM-dd');

  const dateDisplay = isToday
    ? 'Today'
    : isYesterday
    ? 'Yesterday'
    : format(reportDate, 'EEE, MMM d');

  const content = (
    <div
      className={cn(
        'p-4 border-b border-border bg-card cursor-pointer',
        'active:bg-surface transition-colors',
        compact && 'p-3',
        className
      )}
      onClick={handleClick}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Date */}
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-muted" />
            <h3 className="font-semibold text-foreground heading-subsection">
              {dateDisplay}
              {!isToday && !isYesterday && (
                <span className="text-muted font-normal ml-2">
                  {format(reportDate, 'yyyy')}
                </span>
              )}
            </h3>
          </div>

          {/* Status and Weather */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              className={cn(
                'text-xs font-medium flex items-center gap-1',
                status.color
              )}
            >
              {status.icon}
              {status.label}
            </Badge>
            {report.weather_condition && (
              <div className="flex items-center gap-1 text-sm text-secondary">
                <CloudSun className="h-4 w-4" />
                <span>
                  {weatherIcons[report.weather_condition] ||
                    report.weather_condition}
                </span>
                {report.temperature_high && (
                  <span className="text-muted">
                    {report.temperature_high}
                    {report.temperature_low && `/${report.temperature_low}`}
                    °F
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions Menu (desktop) */}
        <div className="hidden md:block">
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={handleView}>
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </DropdownMenuItem>
              )}
              {onEdit && report.status === 'draft' && (
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {onCopy && (
                <DropdownMenuItem onClick={handleCopy}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to Today
                </DropdownMenuItem>
              )}
              {onSubmit && report.status === 'draft' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSubmit}>
                    <Send className="h-4 w-4 mr-2" />
                    Submit for Approval
                  </DropdownMenuItem>
                </>
              )}
              {onDelete && report.status === 'draft' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-error"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Work Summary (if not compact) */}
      {!compact && report.work_summary && (
        <p className="text-sm text-secondary mt-2 line-clamp-2">
          {report.work_summary}
        </p>
      )}

      {/* Stats Row */}
      <div className="flex items-center gap-4 mt-3 text-xs text-muted flex-wrap">
        {/* Workforce */}
        {report.workforce_count !== undefined && report.workforce_count > 0 && (
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span>
              {report.workforce_count}{' '}
              {report.workforce_count === 1 ? 'worker' : 'workers'}
            </span>
          </div>
        )}

        {/* Equipment */}
        {report.equipment_count !== undefined && report.equipment_count > 0 && (
          <div className="flex items-center gap-1">
            <HardHat className="h-3.5 w-3.5" />
            <span>
              {report.equipment_count}{' '}
              {report.equipment_count === 1 ? 'equipment' : 'equipment'}
            </span>
          </div>
        )}

        {/* Delays */}
        {report.delay_count !== undefined && report.delay_count > 0 && (
          <div className="flex items-center gap-1 text-warning">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>
              {report.delay_count} {report.delay_count === 1 ? 'delay' : 'delays'}
            </span>
          </div>
        )}

        {/* Submitted/Approved by */}
        {(report.submitted_by_name || report.approved_by_name) && (
          <div className="flex items-center gap-1 ml-auto text-disabled">
            {report.approved_by_name ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                <span>by {report.approved_by_name}</span>
              </>
            ) : report.submitted_by_name ? (
              <>
                <Clock className="h-3.5 w-3.5" />
                <span>by {report.submitted_by_name}</span>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Mobile hint for swipe */}
      {!disableSwipe &&
        report.status === 'draft' &&
        (rightActions.length > 0 || leftActions.length > 0) && (
          <div className="md:hidden mt-2 text-xs text-disabled flex items-center gap-1">
            <span className="animate-pulse">Swipe for actions</span>
          </div>
        )}
    </div>
  );

  // Wrap in swipeable container for mobile
  if (!disableSwipe && (rightActions.length > 0 || leftActions.length > 0)) {
    return (
      <SwipeableListItem
        rightActions={rightActions}
        leftActions={leftActions}
        className="md:contents"
      >
        {content}
      </SwipeableListItem>
    );
  }

  return content;
}

export default DailyReportListItem;
