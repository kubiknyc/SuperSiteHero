/**
 * Google Calendar Connection Card
 *
 * Displays connection status and allows connect/disconnect/configure actions.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Loader2,
  Link2,
  Unlink,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ArrowLeftRight,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import {
  useGCalConnectionStatus,
  useInitiateGCalConnection,
  useDisconnectGCal,
  useUpdateGCalConnection,
  useRefreshGCalToken,
  useGCalSyncStats,
} from '../hooks/useGoogleCalendar';
import { formatDistanceToNow } from 'date-fns';
import { getSyncDirectionLabel } from '@/types/google-calendar';
import { logger } from '../../../lib/utils/logger';


interface CalendarConnectionCardProps {
  onConnectionChange?: () => void;
}

export function CalendarConnectionCard({ onConnectionChange }: CalendarConnectionCardProps) {
  const { data: status, isLoading } = useGCalConnectionStatus();
  const { data: stats } = useGCalSyncStats(status?.connectionId);
  const initiateConnection = useInitiateGCalConnection();
  const disconnect = useDisconnectGCal();
  const updateConnection = useUpdateGCalConnection();
  const refreshToken = useRefreshGCalToken();

  const handleConnect = async () => {
    try {
      const authUrl = await initiateConnection.mutateAsync();
      // Redirect to Google OAuth
      window.location.href = authUrl;
    } catch (error) {
      logger.error('Failed to initiate Google Calendar connection:', error);
    }
  };

  const handleDisconnect = async () => {
    if (!status?.connectionId) {return;}
    try {
      await disconnect.mutateAsync(status.connectionId);
      onConnectionChange?.();
    } catch (error) {
      logger.error('Failed to disconnect from Google Calendar:', error);
    }
  };

  const handleSyncToggle = async (enabled: boolean) => {
    if (!status?.connectionId) {return;}
    try {
      await updateConnection.mutateAsync({
        connectionId: status.connectionId,
        updates: { sync_enabled: enabled },
      });
    } catch (error) {
      logger.error('Failed to update sync setting:', error);
    }
  };

  const handleSyncDirectionChange = async (direction: string) => {
    if (!status?.connectionId) {return;}
    try {
      await updateConnection.mutateAsync({
        connectionId: status.connectionId,
        updates: { sync_direction: direction as 'to_google' | 'from_google' | 'bidirectional' },
      });
    } catch (error) {
      logger.error('Failed to update sync direction:', error);
    }
  };

  const handleRefreshToken = async () => {
    if (!status?.connectionId) {return;}
    try {
      await refreshToken.mutateAsync(status.connectionId);
    } catch (error) {
      logger.error('Failed to refresh token:', error);
    }
  };

  const getSyncDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'to_google':
        return <ArrowRight className="h-4 w-4" />;
      case 'from_google':
        return <ArrowLeft className="h-4 w-4" />;
      case 'bidirectional':
      default:
        return <ArrowLeftRight className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Connection Status...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!status?.isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Google Calendar
          </CardTitle>
          <CardDescription>
            Connect your Google Calendar to sync meetings automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h4 className="font-medium text-blue-900 mb-2 heading-card">Features</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>- Sync meetings to Google Calendar automatically</li>
              <li>- Import calendar events as meetings</li>
              <li>- Real-time updates with push notifications</li>
              <li>- Send calendar invites to attendees</li>
            </ul>
          </div>

          <Button
            onClick={handleConnect}
            disabled={initiateConnection.isPending}
            className="w-full"
          >
            {initiateConnection.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Link2 className="mr-2 h-4 w-4" />
                Connect to Google Calendar
              </>
            )}
          </Button>

          {initiateConnection.isError && (
            <p className="text-sm text-error">
              Failed to connect. Please try again.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Google Calendar
          </CardTitle>
          <Badge
            variant={status.needsReconnect || status.isTokenExpired ? 'destructive' : 'default'}
            className={
              status.needsReconnect || status.isTokenExpired
                ? ''
                : 'bg-success-light text-green-800 border-green-300'
            }
          >
            {status.needsReconnect
              ? 'Reconnect Required'
              : status.isTokenExpired
              ? 'Token Expired'
              : 'Connected'}
          </Badge>
        </div>
        <CardDescription>
          {status.googleAccountEmail}
          {status.calendarName && (
            <span className="block text-xs mt-1">
              Calendar: {status.calendarName}
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Connection Error */}
        {status.connectionError && (
          <div className="flex items-start gap-2 p-3 bg-error-light border border-red-200 rounded-md">
            <AlertTriangle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <strong>Connection Error:</strong> {status.connectionError}
            </div>
          </div>
        )}

        {/* Token Status */}
        {(status.needsReconnect || status.isTokenExpired) && (
          <div className="flex items-center justify-between p-3 bg-warning-light border border-yellow-200 rounded-md">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm">
                {status.needsReconnect
                  ? 'Please reconnect your Google Calendar.'
                  : 'Your access token has expired.'}
              </span>
            </div>
            {status.isTokenExpired && !status.needsReconnect && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshToken}
                disabled={refreshToken.isPending}
              >
                {refreshToken.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        )}

        {/* Sync Statistics */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 p-3 bg-surface rounded-md">
            <div className="text-center">
              <div className="text-2xl font-semibold text-foreground">{stats.totalSyncedMeetings}</div>
              <div className="text-xs text-secondary">Synced</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-warning">{stats.pendingSyncs}</div>
              <div className="text-xs text-secondary">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-error">{stats.failedSyncs}</div>
              <div className="text-xs text-secondary">Failed</div>
            </div>
          </div>
        )}

        {/* Last Sync */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Last Sync:</span>
          <span className="flex items-center gap-1">
            {status.lastSyncAt ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-success" />
                {formatDistanceToNow(new Date(status.lastSyncAt), { addSuffix: true })}
              </>
            ) : (
              'Never'
            )}
          </span>
        </div>

        {/* Sync Settings */}
        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="sync-enabled" className="font-normal">
              Sync Enabled
            </Label>
            <Switch
              id="sync-enabled"
              checked={status.syncEnabled}
              onCheckedChange={handleSyncToggle}
              disabled={updateConnection.isPending}
            />
          </div>

          {status.syncEnabled && (
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-direction" className="font-normal flex items-center gap-2">
                {getSyncDirectionIcon(status.syncDirection)}
                Sync Direction
              </Label>
              <RadixSelect
                value={status.syncDirection}
                onValueChange={handleSyncDirectionChange}
                disabled={updateConnection.isPending}
              >
                <SelectTrigger id="sync-direction" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bidirectional">Two-way sync</SelectItem>
                  <SelectItem value="to_google">App to Google</SelectItem>
                  <SelectItem value="from_google">Google to App</SelectItem>
                </SelectContent>
              </RadixSelect>
            </div>
          )}
        </div>

        {/* Disconnect Button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full text-error hover:text-error-dark">
              <Unlink className="mr-2 h-4 w-4" />
              Disconnect
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disconnect from Google Calendar?</AlertDialogTitle>
              <AlertDialogDescription>
                This will stop all syncing between your meetings and Google Calendar.
                Your existing calendar events will remain in Google Calendar.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDisconnect}
                className="bg-error hover:bg-red-700"
              >
                {disconnect.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Disconnect
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

export default CalendarConnectionCard;
