/**
 * DocuSign Connection Settings Component
 *
 * Allows company admins to connect/disconnect DocuSign OAuth
 * and manage e-signature integration settings.
 */

import { useState } from 'react'
import {
  useDocuSignConnectionStatus,
  useInitiateDocuSignConnection,
  useDisconnectDocuSign,
  useRefreshDocuSignToken
} from '../hooks/useDocuSign'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  FileSignature,
  Link,
  Unlink,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Shield,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'

export function DocuSignConnectionSettings() {
  const [isDemo, setIsDemo] = useState(false)
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)

  const { data: connectionStatus, isLoading } = useDocuSignConnectionStatus()
  const initiateMutation = useInitiateDocuSignConnection()
  const disconnectMutation = useDisconnectDocuSign()
  const refreshMutation = useRefreshDocuSignToken()

  const handleConnect = () => {
    initiateMutation.mutate({
      is_demo: isDemo,
      return_url: window.location.href,
    })
  }

  const handleDisconnect = () => {
    if (connectionStatus?.connectionId) {
      disconnectMutation.mutate(connectionStatus.connectionId, {
        onSuccess: () => setShowDisconnectDialog(false),
      })
    }
  }

  const handleRefreshToken = () => {
    if (connectionStatus?.connectionId) {
      refreshMutation.mutate(connectionStatus.connectionId)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center text-muted">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading DocuSign settings...
          </div>
        </CardContent>
      </Card>
    )
  }

  const isConnected = connectionStatus?.isConnected

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSignature className="h-5 w-5 text-primary" />
                DocuSign Integration
              </CardTitle>
              <CardDescription>
                Enable electronic signatures for payment applications, change orders, and lien waivers
              </CardDescription>
            </div>
            {isConnected && (
              <Badge variant={connectionStatus.isDemo ? 'secondary' : 'default'}>
                {connectionStatus.isDemo ? 'Demo Account' : 'Production'}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Connection Status */}
          <div className={cn(
            'p-4 rounded-lg border',
            isConnected
              ? 'bg-success-light border-green-200'
              : 'bg-surface border-border'
          )}>
            <div className="flex items-center gap-3">
              {isConnected ? (
                <CheckCircle className="h-6 w-6 text-success" />
              ) : (
                <XCircle className="h-6 w-6 text-disabled" />
              )}
              <div className="flex-1">
                <p className={cn(
                  'font-medium',
                  isConnected ? 'text-green-800' : 'text-secondary'
                )}>
                  {isConnected ? 'Connected' : 'Not Connected'}
                </p>
                {isConnected && connectionStatus.accountName && (
                  <p className="text-sm text-success-dark">
                    Account: {connectionStatus.accountName}
                  </p>
                )}
              </div>
              {isConnected && (
                <div className="flex items-center gap-2">
                  {connectionStatus.needsReauth && !connectionStatus.isTokenExpired && (
                    <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800">
                      <AlertTriangle className="h-3 w-3" />
                      Token Expiring
                    </Badge>
                  )}
                  {connectionStatus.isTokenExpired && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Token Expired
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Connection details */}
            {isConnected && (
              <div className="mt-4 pt-4 border-t border-green-200 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-success-dark font-medium">Account ID</p>
                  <p className="text-success font-mono text-xs">
                    {connectionStatus.accountId}
                  </p>
                </div>
                <div>
                  <p className="text-success-dark font-medium">Last Connected</p>
                  <p className="text-success">
                    {connectionStatus.lastConnectedAt
                      ? formatDate(connectionStatus.lastConnectedAt)
                      : 'Unknown'}
                  </p>
                </div>
                {connectionStatus.tokenExpiresAt && (
                  <div>
                    <p className="text-success-dark font-medium">Token Expires</p>
                    <p className="text-success">
                      {formatDate(connectionStatus.tokenExpiresAt)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Connection error */}
            {connectionStatus?.connectionError && (
              <div className="mt-4 p-3 bg-error-light border border-red-200 rounded text-sm text-error-dark">
                <strong>Error:</strong> {connectionStatus.connectionError}
              </div>
            )}
          </div>

          {/* Actions */}
          {isConnected ? (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleRefreshToken}
                disabled={refreshMutation.isPending}
              >
                {refreshMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh Token
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowDisconnectDialog(true)}
              >
                <Unlink className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Demo mode toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="demo-mode" className="font-medium">Demo Mode</Label>
                  <p className="text-sm text-muted">
                    Use DocuSign sandbox environment for testing
                  </p>
                </div>
                <Switch
                  id="demo-mode"
                  checked={isDemo}
                  onCheckedChange={setIsDemo}
                />
              </div>

              <Button
                onClick={handleConnect}
                disabled={initiateMutation.isPending}
                className="w-full"
              >
                {initiateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Link className="h-4 w-4 mr-2" />
                )}
                Connect DocuSign Account
              </Button>

              <p className="text-xs text-muted text-center">
                You will be redirected to DocuSign to authorize access
              </p>
            </div>
          )}

          {/* Features info */}
          <div className="border-t pt-6">
            <h4 className="font-medium text-foreground mb-4 heading-card">What you can do with DocuSign</h4>
            <div className="grid gap-4 md:grid-cols-3">
              <FeatureCard
                icon={<FileSignature className="h-5 w-5" />}
                title="Payment Applications"
                description="Send G702/G703 for contractor, architect, and owner signatures"
              />
              <FeatureCard
                icon={<Shield className="h-5 w-5" />}
                title="Change Orders"
                description="Get owner approval signatures on change orders"
              />
              <FeatureCard
                icon={<Clock className="h-5 w-5" />}
                title="Lien Waivers"
                description="Collect claimant signatures with optional notarization"
              />
            </div>
          </div>

          {/* Help link */}
          <div className="text-sm text-center">
            <a
              href="https://developers.docusign.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary-hover inline-flex items-center gap-1"
            >
              Learn more about DocuSign
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Disconnect confirmation dialog */}
      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect DocuSign?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the DocuSign integration. Pending signature requests
              will remain in DocuSign but you won't be able to track them here.
              You can reconnect at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              className="bg-error hover:bg-red-700"
            >
              {disconnectMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// Feature card sub-component
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center gap-2 text-primary mb-2">
        {icon}
        <span className="font-medium text-foreground">{title}</span>
      </div>
      <p className="text-sm text-secondary">{description}</p>
    </div>
  )
}

export default DocuSignConnectionSettings
