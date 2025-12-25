/**
 * QuickBooks Integration Settings Page
 *
 * Manage QuickBooks Online connection and sync settings.
 */

import { AppLayout } from '@/components/layout/AppLayout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Link2, Settings, Activity, Table, History, ExternalLink } from 'lucide-react'
import {
  QBConnectionCard,
  QBSyncDashboard,
  QBAccountMappingTable,
  QBSyncLogTable,
} from '@/features/quickbooks/components'
import {
  useQBConnectionStatus,
  useQBSyncLogs,
} from '@/features/quickbooks/hooks/useQuickBooks'

export function QuickBooksPage() {
  const { data: connectionStatus, isLoading: connectionLoading } = useQBConnectionStatus()
  const { data: logs, isLoading: logsLoading } = useQBSyncLogs({ limit: 50 })

  const isConnected = connectionStatus?.isConnected ?? false

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight heading-page">QuickBooks Integration</h1>
            <p className="text-muted-foreground">
              Sync your financial data with QuickBooks Online
            </p>
          </div>
          <Button variant="outline" asChild>
            <a
              href="https://developer.intuit.com/app/developer/qbo/docs/develop"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              QB Developer Docs
            </a>
          </Button>
        </div>

        {/* Connection Card - Always Visible */}
        <QBConnectionCard />

        {/* Main Content - Only visible when connected */}
        {connectionLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : isConnected ? (
          <Tabs defaultValue="dashboard" className="space-y-4">
            <TabsList>
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="mappings" className="flex items-center gap-2">
                <Table className="h-4 w-4" />
                Account Mappings
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Sync History
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-4">
              <QBSyncDashboard />
            </TabsContent>

            <TabsContent value="mappings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Account Mappings</CardTitle>
                  <CardDescription>
                    Map your cost codes to QuickBooks accounts for accurate financial tracking.
                    Transactions will be categorized in QuickBooks based on these mappings.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <QBAccountMappingTable connectionId={connectionStatus?.connectionId} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Sync History</CardTitle>
                  <CardDescription>
                    View all past sync operations and their results.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {logsLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <QBSyncLogTable logs={logs || []} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Sync Settings</CardTitle>
                  <CardDescription>
                    Configure how data is synced between your platform and QuickBooks.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium heading-subsection">Entity Sync Configuration</h3>
                    <p className="text-sm text-muted-foreground">
                      Choose which entities are automatically synced to QuickBooks.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SyncEntityCard
                        title="Subcontractors → Vendors"
                        description="Sync subcontractor records as QB vendors"
                        enabled
                      />
                      <SyncEntityCard
                        title="Payment Applications → Invoices"
                        description="Sync pay apps as QB invoices"
                        enabled
                      />
                      <SyncEntityCard
                        title="Change Orders → Bills"
                        description="Sync approved COs as QB bills"
                        enabled
                      />
                      <SyncEntityCard
                        title="Cost Transactions → Expenses"
                        description="Sync cost items as QB expenses"
                        enabled={false}
                      />
                    </div>
                  </div>

                  <div className="border-t pt-6 space-y-4">
                    <h3 className="text-sm font-medium heading-subsection">Data Sync Direction</h3>
                    <p className="text-sm text-muted-foreground">
                      Currently, sync is one-way from your platform to QuickBooks.
                      Two-way sync will be available in a future update.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Environment</CardTitle>
                  <CardDescription>
                    QuickBooks environment configuration.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {connectionStatus?.isSandbox ? 'Sandbox' : 'Production'} Environment
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {connectionStatus?.isSandbox
                          ? 'Connected to QuickBooks Sandbox for testing'
                          : 'Connected to live QuickBooks account'}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Realm ID: {connectionStatus?.realmId}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          // Not connected - show setup guide
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>
                Connect your QuickBooks Online account to start syncing financial data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SetupStep
                  number={1}
                  title="Connect"
                  description="Click 'Connect to QuickBooks' and sign in to your Intuit account."
                />
                <SetupStep
                  number={2}
                  title="Map Accounts"
                  description="Map your cost codes to QuickBooks chart of accounts."
                />
                <SetupStep
                  number={3}
                  title="Sync Data"
                  description="Start syncing vendors, invoices, and expenses automatically."
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2 heading-card">What gets synced?</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>Subcontractors</strong> → QuickBooks Vendors</li>
                  <li>• <strong>Payment Applications</strong> → QuickBooks Invoices</li>
                  <li>• <strong>Approved Change Orders</strong> → QuickBooks Bills</li>
                  <li>• <strong>Cost Transactions</strong> → QuickBooks Expenses</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}

interface SetupStepProps {
  number: number
  title: string
  description: string
}

function SetupStep({ number, title, description }: SetupStepProps) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
        {number}
      </div>
      <div>
        <h4 className="font-medium heading-card">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

interface SyncEntityCardProps {
  title: string
  description: string
  enabled: boolean
}

function SyncEntityCard({ title, description, enabled }: SyncEntityCardProps) {
  return (
    <div className={`p-4 border rounded-lg ${enabled ? 'bg-success-light border-green-200' : 'bg-muted'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-sm">{title}</span>
        <span className={`text-xs ${enabled ? 'text-success' : 'text-muted-foreground'}`}>
          {enabled ? 'Enabled' : 'Coming Soon'}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}
