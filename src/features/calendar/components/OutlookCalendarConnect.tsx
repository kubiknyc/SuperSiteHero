/**
 * OutlookCalendarConnect Component
 *
 * UI component for connecting and managing Outlook Calendar integration.
 * Provides OAuth flow, connection status, and sync settings.
 */

import { useState, useEffect, useRef } from 'react'
import { Calendar, Check, AlertCircle, RefreshCw, Settings, Unlink, ExternalLink } from 'lucide-react'
import {
  useOutlookConnectionStatus,
  useInitiateOutlookConnection,
  useCompleteOutlookConnection,
  useUpdateOutlookConnection,
  useDisconnectOutlook,
  useRefreshOutlookToken,
  useOutlookSyncStats,
} from '../hooks/useOutlookCalendar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { formatLastSyncTime, OUTLOOK_SYNC_DIRECTIONS, type OutlookSyncDirection } from '@/types/outlook-calendar'
import { logger } from '../../../lib/utils/logger';


interface OutlookCalendarConnectProps {
  onConnected?: () => void
  onDisconnected?: () => void
  showStats?: boolean
  compact?: boolean
}

export function OutlookCalendarConnect({
  onConnected,
  onDisconnected,
  showStats = true,
  compact = false,
}: OutlookCalendarConnectProps) {
  const [showSettings, setShowSettings] = useState(false)
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)

  const { data: connectionStatus, isLoading: isLoadingStatus, refetch: refetchStatus } = useOutlookConnectionStatus()
  const { data: syncStats } = useOutlookSyncStats()

  const initiateConnection = useInitiateOutlookConnection()
  const completeConnection = useCompleteOutlookConnection()
  const updateConnection = useUpdateOutlookConnection()
  const disconnectOutlook = useDisconnectOutlook()
  const refreshToken = useRefreshOutlookToken()

  // Use refs to store latest callbacks to avoid re-running the OAuth effect
  const onConnectedRef = useRef(onConnected)
  const refetchStatusRef = useRef(refetchStatus)
  const completeConnectionRef = useRef(completeConnection)

  // Keep refs updated with latest values
  useEffect(() => {
    onConnectedRef.current = onConnected
    refetchStatusRef.current = refetchStatus
    completeConnectionRef.current = completeConnection
  }, [onConnected, refetchStatus, completeConnection])

  // Handle OAuth callback - runs only once on mount to process OAuth redirect params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const state = urlParams.get('state')

    // Check if this is an Outlook OAuth callback
    if (code && state && state.includes(':')) {
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)

      // Complete OAuth flow using refs for latest values
      completeConnectionRef.current.mutate(
        { code, state },
        {
          onSuccess: () => {
            onConnectedRef.current?.()
            refetchStatusRef.current()
          },
        }
      )
    }
  }, [])

  const handleConnect = async () => {
    try {
      const authUrl = await initiateConnection.mutateAsync()
      // Redirect to Microsoft login
      window.location.href = authUrl
    } catch (_error) {
      logger.error('Failed to initiate Outlook connection:', _error)
    }
  }

  const handleDisconnect = async () => {
    if (!connectionStatus?.connectionId) {return}

    try {
      await disconnectOutlook.mutateAsync(connectionStatus.connectionId)
      setShowDisconnectConfirm(false)
      onDisconnected?.()
    } catch (_error) {
      logger.error('Failed to disconnect Outlook:', _error)
    }
  }

  const handleRefreshToken = async () => {
    if (!connectionStatus?.connectionId) {return}

    try {
      await refreshToken.mutateAsync(connectionStatus.connectionId)
      refetchStatus()
    } catch (_error) {
      logger.error('Failed to refresh token:', _error)
    }
  }

  const handleUpdateSettings = async (updates: Record<string, unknown>) => {
    if (!connectionStatus?.connectionId) {return}

    try {
      await updateConnection.mutateAsync({
        connectionId: connectionStatus.connectionId,
        updates,
      })
    } catch (_error) {
      logger.error('Failed to update settings:', _error)
    }
  }

  if (isLoadingStatus) {
    return (
      <Card className={compact ? 'p-4' : ''}>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  // Not connected state
  if (!connectionStatus?.isConnected) {
    return (
      <Card className={compact ? 'p-4' : ''}>
        <CardHeader className={compact ? 'p-0 pb-4' : ''}>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Outlook Calendar
          </CardTitle>
          <CardDescription>
            Connect your Outlook calendar to sync meetings, inspections, and schedule activities.
          </CardDescription>
        </CardHeader>
        <CardContent className={compact ? 'p-0' : ''}>
          <Button
            onClick={handleConnect}
            disabled={initiateConnection.isPending || completeConnection.isPending}
            className="w-full"
          >
            {initiateConnection.isPending || completeConnection.isPending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <ExternalLink className="mr-2 h-4 w-4" />
                Connect Outlook Calendar
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Connected state
  return (
    <>
      <Card className={compact ? 'p-4' : ''}>
        <CardHeader className={compact ? 'p-0 pb-4' : ''}>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Outlook Calendar
              <Badge variant="outline" className="ml-2 bg-success-light text-success-dark border-green-200">
                <Check className="mr-1 h-3 w-3" />
                Connected
              </Badge>
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDisconnectConfirm(true)}
                className="text-destructive hover:text-destructive"
              >
                <Unlink className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription>
            {connectionStatus.email || connectionStatus.displayName}
            {connectionStatus.calendarName && ` - ${connectionStatus.calendarName}`}
          </CardDescription>
        </CardHeader>
        <CardContent className={compact ? 'p-0' : ''}>
          {/* Connection warnings */}
          {connectionStatus.needsReauth && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Reconnection Required</AlertTitle>
              <AlertDescription>
                Your Outlook session has expired. Please reconnect to continue syncing.
                <Button variant="link" onClick={handleConnect} className="p-0 h-auto ml-2">
                  Reconnect
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {connectionStatus.isTokenExpired && !connectionStatus.needsReauth && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Token Refresh Needed</AlertTitle>
              <AlertDescription>
                Your access token needs to be refreshed.
                <Button
                  variant="link"
                  onClick={handleRefreshToken}
                  disabled={refreshToken.isPending}
                  className="p-0 h-auto ml-2"
                >
                  {refreshToken.isPending ? 'Refreshing...' : 'Refresh Now'}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {connectionStatus.connectionError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Sync Error</AlertTitle>
              <AlertDescription>{connectionStatus.connectionError}</AlertDescription>
            </Alert>
          )}

          {/* Sync status summary */}
          {showStats && syncStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{syncStats.totalMappedEvents}</div>
                <div className="text-xs text-muted-foreground">Synced Events</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-warning">{syncStats.pendingSyncs}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-error">{syncStats.failedSyncs}</div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-sm font-medium">{formatLastSyncTime(syncStats.lastSyncAt)}</div>
                <div className="text-xs text-muted-foreground">Last Sync</div>
              </div>
            </div>
          )}

          {/* Quick settings */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Switch
                id="auto-sync"
                checked={connectionStatus.autoSyncEnabled}
                onCheckedChange={(checked) => handleUpdateSettings({ auto_sync_enabled: checked })}
              />
              <Label htmlFor="auto-sync" className="text-sm">
                Auto-sync enabled
              </Label>
            </div>
            <Badge variant="secondary">
              {OUTLOOK_SYNC_DIRECTIONS.find(d => d.value === connectionStatus.syncDirection)?.label || 'Two-way'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Outlook Calendar Settings</DialogTitle>
            <DialogDescription>
              Configure how your calendar syncs with the construction management system.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Sync direction */}
            <div className="space-y-2">
              <Label>Sync Direction</Label>
              <Select
                value={connectionStatus.syncDirection}
                onValueChange={(value) => handleUpdateSettings({ sync_direction: value as OutlookSyncDirection })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OUTLOOK_SYNC_DIRECTIONS.map((dir) => (
                    <SelectItem key={dir.value} value={dir.value}>
                      <div>
                        <div>{dir.label}</div>
                        <div className="text-xs text-muted-foreground">{dir.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sync frequency */}
            <div className="space-y-2">
              <Label>Sync Frequency</Label>
              <Select
                value={String(connectionStatus.syncFrequencyMinutes)}
                onValueChange={(value) => handleUpdateSettings({ sync_frequency_minutes: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Every 5 minutes</SelectItem>
                  <SelectItem value="15">Every 15 minutes</SelectItem>
                  <SelectItem value="30">Every 30 minutes</SelectItem>
                  <SelectItem value="60">Every hour</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Entity type toggles */}
            <div className="space-y-4">
              <Label>What to Sync</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="sync-meetings" className="font-normal">Meetings</Label>
                  <Switch
                    id="sync-meetings"
                    checked={connectionStatus.syncSettings.meetings}
                    onCheckedChange={(checked) => handleUpdateSettings({ sync_meetings: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="sync-inspections" className="font-normal">Inspections</Label>
                  <Switch
                    id="sync-inspections"
                    checked={connectionStatus.syncSettings.inspections}
                    onCheckedChange={(checked) => handleUpdateSettings({ sync_inspections: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="sync-tasks" className="font-normal">Tasks</Label>
                  <Switch
                    id="sync-tasks"
                    checked={connectionStatus.syncSettings.tasks}
                    onCheckedChange={(checked) => handleUpdateSettings({ sync_tasks: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="sync-milestones" className="font-normal">Milestones</Label>
                  <Switch
                    id="sync-milestones"
                    checked={connectionStatus.syncSettings.milestones}
                    onCheckedChange={(checked) => handleUpdateSettings({ sync_milestones: checked })}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={showDisconnectConfirm} onOpenChange={setShowDisconnectConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Outlook Calendar?</DialogTitle>
            <DialogDescription>
              This will stop syncing events between your Outlook calendar and the construction management system.
              Your existing events will not be deleted from either system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisconnectConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={disconnectOutlook.isPending}
            >
              {disconnectOutlook.isPending ? 'Disconnecting...' : 'Disconnect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default OutlookCalendarConnect
