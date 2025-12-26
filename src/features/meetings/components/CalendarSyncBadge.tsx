/**
 * Calendar Sync Badge Component
 *
 * Shows Google Calendar sync status for a meeting with quick sync action.
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import {
  useGCalConnectionStatus,
  useIsMeetingSynced,
  useSyncMeetingToGCal,
} from '@/features/calendar/hooks/useGoogleCalendar';
import { formatDistanceToNow } from 'date-fns';
import { getSyncStatusColor, getSyncStatusLabel } from '@/types/google-calendar';
import type { MeetingWithDetails } from '../hooks/useMeetings';
import { TouchWrapper } from '@/components/ui/touch-wrapper';
import { logger } from '../../../lib/utils/logger';


interface CalendarSyncBadgeProps {
  meeting: MeetingWithDetails;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function CalendarSyncBadge({
  meeting,
  showLabel = false,
  size = 'sm',
  className = '',
}: CalendarSyncBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: connectionStatus } = useGCalConnectionStatus();
  const { isSynced, syncStatus, googleEventId, lastSyncedAt, lastError, isLoading } =
    useIsMeetingSynced(meeting.id);
  const syncMutation = useSyncMeetingToGCal();

  // Don't show anything if not connected
  if (!connectionStatus?.isConnected) {
    return null;
  }

  const handleSync = async () => {
    if (!connectionStatus.connectionId) {return;}

    // Prepare meeting data for sync
    const meetingData = {
      title: meeting.title,
      description: meeting.description,
      location: meeting.location,
      virtual_meeting_link: meeting.virtual_meeting_link,
      meeting_date: meeting.meeting_date,
      start_time: meeting.start_time,
      end_time: meeting.end_time,
      duration_minutes: meeting.duration_minutes,
      attendees: meeting.attendees as Array<{ email?: string; name: string }> | null,
    };

    try {
      await syncMutation.mutateAsync({
        connectionId: connectionStatus.connectionId,
        dto: {
          operation: googleEventId ? 'update' : 'create',
          meetingId: meeting.id,
          googleEventId: googleEventId || undefined,
          meetingData,
        },
      });
      setIsOpen(false);
    } catch (error) {
      logger.error('Sync failed:', error);
    }
  };

  const handleDelete = async () => {
    if (!connectionStatus.connectionId || !googleEventId) {return;}

    try {
      await syncMutation.mutateAsync({
        connectionId: connectionStatus.connectionId,
        dto: {
          operation: 'delete',
          meetingId: meeting.id,
          googleEventId,
        },
      });
      setIsOpen(false);
    } catch (error) {
      logger.error('Delete failed:', error);
    }
  };

  const getStatusIcon = () => {
    if (isLoading || syncMutation.isPending) {
      return <Loader2 className="h-3 w-3 animate-spin" />;
    }
    switch (syncStatus) {
      case 'synced':
        return <CheckCircle2 className="h-3 w-3" />;
      case 'pending':
        return <Clock className="h-3 w-3" />;
      case 'failed':
      case 'conflict':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Calendar className="h-3 w-3" />;
    }
  };

  const getStatusText = () => {
    if (!syncStatus) {return 'Not synced';}
    return getSyncStatusLabel(syncStatus);
  };

  const badgeContent = (
    <TouchWrapper>
      <Badge
        variant="outline"
        className={`${getSyncStatusColor(syncStatus || 'pending')} ${
          size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'
        } ${className} cursor-pointer hover:opacity-80`}
      >
        {getStatusIcon()}
        {showLabel && <span className="ml-1">{getStatusText()}</span>}
      </Badge>
    </TouchWrapper>
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>{badgeContent}</PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Google Calendar: {getStatusText()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent className="w-72" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium flex items-center gap-2 heading-card">
              <Calendar className="h-4 w-4 text-primary" />
              Google Calendar
            </h4>
            <Badge
              variant="outline"
              className={getSyncStatusColor(syncStatus || 'pending')}
            >
              {getStatusText()}
            </Badge>
          </div>

          {lastSyncedAt && (
            <p className="text-xs text-muted-foreground">
              Last synced {formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })}
            </p>
          )}

          {lastError && (
            <div className="p-2 bg-error-light border border-red-200 rounded text-xs text-red-800">
              {lastError}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleSync}
              disabled={syncMutation.isPending || !connectionStatus.syncEnabled}
            >
              {syncMutation.isPending ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-3 w-3" />
              )}
              {googleEventId ? 'Update' : 'Sync'}
            </Button>

            {googleEventId && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a
                    href={`https://calendar.google.com/calendar/event?eid=${btoa(googleEventId)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              </>
            )}
          </div>

          {googleEventId && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-error hover:text-error-dark hover:bg-error-light"
              onClick={handleDelete}
              disabled={syncMutation.isPending}
            >
              Remove from Calendar
            </Button>
          )}

          {!connectionStatus.syncEnabled && (
            <p className="text-xs text-warning">
              Calendar sync is disabled. Enable it in Settings to sync this meeting.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Simple sync button for quick actions
 */
interface QuickSyncButtonProps {
  meeting: MeetingWithDetails;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
}

export function QuickSyncButton({
  meeting,
  variant = 'outline',
  size = 'sm',
}: QuickSyncButtonProps) {
  const { data: connectionStatus } = useGCalConnectionStatus();
  const { isSynced, googleEventId } = useIsMeetingSynced(meeting.id);
  const syncMutation = useSyncMeetingToGCal();

  if (!connectionStatus?.isConnected || !connectionStatus.syncEnabled) {
    return null;
  }

  const handleSync = async () => {
    if (!connectionStatus.connectionId) {return;}

    const meetingData = {
      title: meeting.title,
      description: meeting.description,
      location: meeting.location,
      virtual_meeting_link: meeting.virtual_meeting_link,
      meeting_date: meeting.meeting_date,
      start_time: meeting.start_time,
      end_time: meeting.end_time,
      duration_minutes: meeting.duration_minutes,
      attendees: meeting.attendees as Array<{ email?: string; name: string }> | null,
    };

    try {
      await syncMutation.mutateAsync({
        connectionId: connectionStatus.connectionId,
        dto: {
          operation: googleEventId ? 'update' : 'create',
          meetingId: meeting.id,
          googleEventId: googleEventId || undefined,
          meetingData,
        },
      });
    } catch (error) {
      logger.error('Sync failed:', error);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleSync}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSynced ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : (
              <Calendar className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isSynced ? 'Synced to Google Calendar' : 'Sync to Google Calendar'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default CalendarSyncBadge;
