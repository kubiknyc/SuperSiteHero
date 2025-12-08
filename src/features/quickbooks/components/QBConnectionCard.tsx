/**
 * QuickBooks Connection Card
 *
 * Displays connection status and allows connect/disconnect actions.
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
} from '@/components/ui/alert-dialog'
import { Loader2, Link2, Unlink, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react'
import {
  useQBConnectionStatus,
  useInitiateQBConnection,
  useDisconnectQB,
  useUpdateQBConnection,
  useRefreshQBToken,
} from '../hooks/useQuickBooks'
import { formatDistanceToNow } from 'date-fns'

interface QBConnectionCardProps {
  onConnectionChange?: () => void
}

export function QBConnectionCard({ onConnectionChange }: QBConnectionCardProps) {
  const [isSandbox, setIsSandbox] = useState(false)
  const { data: status, isLoading } = useQBConnectionStatus()
  const initiateConnection = useInitiateQBConnection()
  const disconnect = useDisconnectQB()
  const updateConnection = useUpdateQBConnection()
  const refreshToken = useRefreshQBToken()

  const handleConnect = async () => {
    try {
      const authUrl = await initiateConnection.mutateAsync(isSandbox)
      // Redirect to QuickBooks OAuth
      window.location.href = authUrl
    } catch (error) {
      console.error('Failed to initiate QuickBooks connection:', error)
    }
  }

  const handleDisconnect = async () => {
    if (!status?.connectionId) return
    try {
      await disconnect.mutateAsync(status.connectionId)
      onConnectionChange?.()
    } catch (error) {
      console.error('Failed to disconnect from QuickBooks:', error)
    }
  }

  const handleAutoSyncToggle = async (enabled: boolean) => {
    if (!status?.connectionId) return
    try {
      await updateConnection.mutateAsync({
        connectionId: status.connectionId,
        updates: { auto_sync_enabled: enabled },
      })
    } catch (error) {
      console.error('Failed to update auto-sync setting:', error)
    }
  }

  const handleSyncFrequencyChange = async (hours: string) => {
    if (!status?.connectionId) return
    try {
      await updateConnection.mutateAsync({
        connectionId: status.connectionId,
        updates: { sync_frequency_hours: parseInt(hours, 10) },
      })
    } catch (error) {
      console.error('Failed to update sync frequency:', error)
    }
  }

  const handleRefreshToken = async () => {
    if (!status?.connectionId) return
    try {
      await refreshToken.mutateAsync(status.connectionId)
    } catch (error) {
      console.error('Failed to refresh token:', error)
    }
  }

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
    )
  }

  if (!status?.isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
                fill="#2CA01C"
              />
              <path
                d="M12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"
                fill="white"
              />
            </svg>
            QuickBooks Online
          </CardTitle>
          <CardDescription>
            Connect your QuickBooks account to sync vendors, invoices, and expenses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="sandbox-mode"
              checked={isSandbox}
              onCheckedChange={setIsSandbox}
            />
            <Label htmlFor="sandbox-mode">Use Sandbox (for testing)</Label>
          </div>

          <Button
            onClick={handleConnect}
            disabled={initiateConnection.isPending}
            className="w-full bg-[#2CA01C] hover:bg-[#228B15]"
          >
            {initiateConnection.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Link2 className="mr-2 h-4 w-4" />
                Connect to QuickBooks
              </>
            )}
          </Button>

          {initiateConnection.isError && (
            <p className="text-sm text-red-600">
              Failed to connect. Please try again.
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
                fill="#2CA01C"
              />
              <path
                d="M12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"
                fill="white"
              />
            </svg>
            {status.companyName || 'QuickBooks Online'}
          </CardTitle>
          <Badge
            variant={status.needsReauth || status.isTokenExpired ? 'destructive' : 'default'}
            className={
              status.needsReauth || status.isTokenExpired
                ? ''
                : 'bg-green-100 text-green-800 border-green-300'
            }
          >
            {status.needsReauth ? 'Re-auth Required' : status.isTokenExpired ? 'Token Expired' : 'Connected'}
          </Badge>
        </div>
        <CardDescription>
          {status.isSandbox && <span className="text-yellow-600 font-medium">Sandbox Mode - </span>}
          Realm ID: {status.realmId}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Connection Error */}
        {status.connectionError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <strong>Connection Error:</strong> {status.connectionError}
            </div>
          </div>
        )}

        {/* Token Status */}
        {(status.needsReauth || status.isTokenExpired) && (
          <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm">
                {status.needsReauth
                  ? 'Please re-authorize your QuickBooks connection.'
                  : 'Your access token has expired.'}
              </span>
            </div>
            {status.isTokenExpired && !status.needsReauth && (
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

        {/* Last Sync */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Last Sync:</span>
          <span className="flex items-center gap-1">
            {status.lastSyncAt ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                {formatDistanceToNow(new Date(status.lastSyncAt), { addSuffix: true })}
              </>
            ) : (
              'Never'
            )}
          </span>
        </div>

        {/* Auto Sync Settings */}
        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-sync" className="font-normal">
              Automatic Sync
            </Label>
            <Switch
              id="auto-sync"
              checked={status.autoSyncEnabled}
              onCheckedChange={handleAutoSyncToggle}
              disabled={updateConnection.isPending}
            />
          </div>

          {status.autoSyncEnabled && (
            <div className="flex items-center justify-between">
              <Label htmlFor="sync-frequency" className="font-normal">
                Sync Frequency
              </Label>
              <RadixSelect
                value={String(status.syncFrequencyHours)}
                onValueChange={handleSyncFrequencyChange}
                disabled={updateConnection.isPending}
              >
                <SelectTrigger id="sync-frequency" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Every hour</SelectItem>
                  <SelectItem value="4">Every 4 hours</SelectItem>
                  <SelectItem value="12">Every 12 hours</SelectItem>
                  <SelectItem value="24">Once daily</SelectItem>
                </SelectContent>
              </RadixSelect>
            </div>
          )}
        </div>

        {/* Disconnect Button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full text-red-600 hover:text-red-700">
              <Unlink className="mr-2 h-4 w-4" />
              Disconnect
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disconnect from QuickBooks?</AlertDialogTitle>
              <AlertDialogDescription>
                This will revoke access tokens and stop all syncing with QuickBooks.
                Your existing data mappings will be preserved and can be restored
                when you reconnect.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDisconnect}
                className="bg-red-600 hover:bg-red-700"
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
  )
}
