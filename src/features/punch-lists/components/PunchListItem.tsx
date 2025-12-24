/**
 * PunchListItem Component
 *
 * A touch-friendly punch list item with swipe actions for mobile users.
 * - Swipe right: Mark complete
 * - Swipe left: Show options (edit, delete, assign)
 */

import * as React from 'react';
import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  SwipeableListItem,
  createCompleteAction,
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
  MapPin,
  Calendar,
  User,
  AlertCircle,
  CheckCircle2,
  Clock,
  MoreHorizontal,
  Edit2,
  Trash2,
  UserPlus,
  Camera,
  MessageSquare,
} from 'lucide-react';
import type { PunchItemStatus, Priority } from '@/types/database';

export interface PunchListItemData {
  id: string;
  number?: number | null;
  title: string;
  description?: string | null;
  trade: string;
  status: PunchItemStatus;
  priority: Priority;
  location?: string | null;
  building?: string | null;
  floor?: string | null;
  room?: string | null;
  area?: string | null;
  due_date?: string | null;
  created_at: string;
  assigned_to?: string | null;
  assignee_name?: string | null;
  photo_count?: number;
  comment_count?: number;
}

export interface PunchListItemProps {
  item: PunchListItemData;
  /** Callback when item is marked complete */
  onComplete?: (id: string) => void;
  /** Callback when edit is requested */
  onEdit?: (id: string) => void;
  /** Callback when delete is requested */
  onDelete?: (id: string) => void;
  /** Callback when assign is requested */
  onAssign?: (id: string) => void;
  /** Callback when item is clicked/tapped */
  onClick?: (id: string) => void;
  /** Callback to add photo */
  onAddPhoto?: (id: string) => void;
  /** Callback to add comment */
  onAddComment?: (id: string) => void;
  /** Disable swipe actions */
  disableSwipe?: boolean;
  /** Show in compact mode */
  compact?: boolean;
  /** Additional className */
  className?: string;
}

const statusConfig: Record<
  PunchItemStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  open: {
    label: 'Open',
    color: 'bg-warning-light text-yellow-800 border-yellow-200',
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-info-light text-blue-800 border-blue-200',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  ready_for_review: {
    label: 'Ready for Review',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  completed: {
    label: 'Completed',
    color: 'bg-success-light text-green-800 border-green-200',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  verified: {
    label: 'Verified',
    color: 'bg-green-200 text-green-900 border-green-300',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-error-light text-red-800 border-red-200',
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
};

const priorityConfig: Record<Priority, { label: string; color: string }> = {
  low: { label: 'Low', color: 'bg-muted text-secondary' },
  normal: { label: 'Normal', color: 'bg-info-light text-primary-hover' },
  high: { label: 'High', color: 'bg-error-light text-error-dark' },
};

export function PunchListItem({
  item,
  onComplete,
  onEdit,
  onDelete,
  onAssign,
  onClick,
  onAddPhoto,
  onAddComment,
  disableSwipe = false,
  compact = false,
  className,
}: PunchListItemProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleComplete = useCallback(() => {
    onComplete?.(item.id);
  }, [onComplete, item.id]);

  const handleEdit = useCallback(() => {
    onEdit?.(item.id);
    setIsMenuOpen(false);
  }, [onEdit, item.id]);

  const handleDelete = useCallback(() => {
    onDelete?.(item.id);
    setIsMenuOpen(false);
  }, [onDelete, item.id]);

  const handleAssign = useCallback(() => {
    onAssign?.(item.id);
    setIsMenuOpen(false);
  }, [onAssign, item.id]);

  const handleClick = useCallback(() => {
    onClick?.(item.id);
  }, [onClick, item.id]);

  // Build swipe actions
  const rightActions: SwipeAction[] = [];
  const leftActions: SwipeAction[] = [];

  // Right swipe action (mark complete) - only if not already completed
  if (onComplete && item.status !== 'completed' && item.status !== 'verified') {
    rightActions.push(createCompleteAction(handleComplete));
  }

  // Left swipe actions
  if (onEdit) {
    leftActions.push(createEditAction(handleEdit));
  }
  if (onDelete) {
    leftActions.push(createDeleteAction(handleDelete));
  }

  const status = statusConfig[item.status];
  const priority = priorityConfig[item.priority];

  const isOverdue =
    item.due_date &&
    new Date(item.due_date) < new Date() &&
    item.status !== 'completed' &&
    item.status !== 'verified';

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
          {/* Title with number */}
          <div className="flex items-center gap-2 mb-1">
            {item.number && (
              <span className="text-xs font-mono text-muted bg-muted px-1.5 py-0.5 rounded">
                #{item.number}
              </span>
            )}
            <h3 className="font-medium text-foreground truncate" className="heading-subsection">{item.title}</h3>
          </div>

          {/* Trade and Status */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-secondary">{item.trade}</span>
            <Badge
              className={cn(
                'text-xs font-medium flex items-center gap-1',
                status.color
              )}
            >
              {status.icon}
              {status.label}
            </Badge>
            {item.priority !== 'normal' && (
              <Badge className={cn('text-xs', priority.color)}>
                {priority.label}
              </Badge>
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
              {onEdit && (
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {onAssign && (
                <DropdownMenuItem onClick={handleAssign}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign
                </DropdownMenuItem>
              )}
              {onAddPhoto && (
                <DropdownMenuItem onClick={() => onAddPhoto(item.id)}>
                  <Camera className="h-4 w-4 mr-2" />
                  Add Photo
                </DropdownMenuItem>
              )}
              {onAddComment && (
                <DropdownMenuItem onClick={() => onAddComment(item.id)}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Add Comment
                </DropdownMenuItem>
              )}
              {onComplete &&
                item.status !== 'completed' &&
                item.status !== 'verified' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleComplete}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark Complete
                    </DropdownMenuItem>
                  </>
                )}
              {onDelete && (
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

      {/* Description (if not compact) */}
      {!compact && item.description && (
        <p className="text-sm text-secondary mt-2 line-clamp-2">
          {item.description}
        </p>
      )}

      {/* Meta Row */}
      <div className="flex items-center gap-4 mt-3 text-xs text-muted flex-wrap">
        {/* Location */}
        {item.location && (
          <div className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate max-w-[150px]">{item.location}</span>
          </div>
        )}

        {/* Due Date */}
        {item.due_date && (
          <div
            className={cn(
              'flex items-center gap-1',
              isOverdue && 'text-error font-medium'
            )}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {isOverdue ? 'Overdue: ' : 'Due: '}
              {format(new Date(item.due_date), 'MMM d')}
            </span>
          </div>
        )}

        {/* Assignee */}
        {item.assignee_name && (
          <div className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            <span className="truncate max-w-[100px]">{item.assignee_name}</span>
          </div>
        )}

        {/* Photo/Comment counts */}
        {(item.photo_count || item.comment_count) && (
          <div className="flex items-center gap-3 ml-auto">
            {item.photo_count ? (
              <div className="flex items-center gap-1">
                <Camera className="h-3.5 w-3.5" />
                <span>{item.photo_count}</span>
              </div>
            ) : null}
            {item.comment_count ? (
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                <span>{item.comment_count}</span>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Mobile hint for swipe */}
      {!disableSwipe && (rightActions.length > 0 || leftActions.length > 0) && (
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

export default PunchListItem;
