/**
 * DocuSign Dashboard Component
 *
 * Overview of e-signature activity including pending signatures,
 * recent envelopes, and statistics.
 */

import { useState } from 'react'
import {
  useDocuSignDashboard,
  useDocuSignConnectionStatus,
  useVoidDocuSignEnvelope,
  useResendDocuSignEnvelope,
} from '../hooks/useDocuSign'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  FileSignature,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  MoreVertical,
  Mail,
  Eye,
  Ban,
  RefreshCw,
  Loader2,
  FileText,
  Users,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import type {
  DSEnvelope,
  DSEnvelopeStatus,
  DSDocumentType,
} from '@/types/docusign'
import { getEnvelopeStatusConfig, getDocumentTypeConfig } from '@/types/docusign'

export function DocuSignDashboard() {
  const { data: connectionStatus } = useDocuSignConnectionStatus()
  const { data: dashboard, isLoading, error, refetch } = useDocuSignDashboard()

  if (!connectionStatus?.isConnected) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted">
            <FileSignature className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="font-medium">DocuSign Not Connected</p>
            <p className="text-sm mt-1">
              Connect your DocuSign account in Settings to enable e-signatures
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center text-muted">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading dashboard...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !dashboard) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-error">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
            <p>Failed to load dashboard</p>
            <Button variant="outline" onClick={() => refetch()} className="mt-4">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { stats, recentEnvelopes, pendingSignatures } = dashboard

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Total Envelopes"
          value={stats.total}
          icon={<FileText className="h-5 w-5" />}
          trend={null}
        />
        <StatCard
          title="Pending Signatures"
          value={stats.sent + stats.delivered}
          icon={<Clock className="h-5 w-5" />}
          color="yellow"
        />
        <StatCard
          title="Completed"
          value={stats.completed}
          icon={<CheckCircle className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          title="Declined/Voided"
          value={stats.declined + stats.voided}
          icon={<XCircle className="h-5 w-5" />}
          color="red"
        />
      </div>

      {/* By Document Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">By Document Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <DocumentTypeStats
              type="payment_application"
              label="Payment Applications"
              stats={stats.byDocumentType.payment_application}
            />
            <DocumentTypeStats
              type="change_order"
              label="Change Orders"
              stats={stats.byDocumentType.change_order}
            />
            <DocumentTypeStats
              type="lien_waiver"
              label="Lien Waivers"
              stats={stats.byDocumentType.lien_waiver}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs for pending and recent */}
      <Card>
        <Tabs defaultValue="pending">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Signature Activity</CardTitle>
              <TabsList>
                <TabsTrigger value="pending">
                  Pending ({pendingSignatures.length})
                </TabsTrigger>
                <TabsTrigger value="recent">
                  Recent
                </TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>
          <CardContent>
            <TabsContent value="pending" className="mt-0">
              {pendingSignatures.length === 0 ? (
                <div className="text-center py-8 text-muted">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success" />
                  <p>No pending signatures</p>
                </div>
              ) : (
                <EnvelopeList envelopes={pendingSignatures} />
              )}
            </TabsContent>
            <TabsContent value="recent" className="mt-0">
              {recentEnvelopes.length === 0 ? (
                <div className="text-center py-8 text-muted">
                  <FileSignature className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No recent envelopes</p>
                </div>
              ) : (
                <EnvelopeList envelopes={recentEnvelopes} />
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  )
}

// Stat card component
function StatCard({
  title,
  value,
  icon,
  color = 'blue',
  trend,
}: {
  title: string
  value: number
  icon: React.ReactNode
  color?: 'blue' | 'green' | 'yellow' | 'red'
  trend?: number | null
}) {
  const colorClasses = {
    blue: 'text-primary bg-blue-50',
    green: 'text-success bg-success-light',
    yellow: 'text-warning bg-warning-light',
    red: 'text-error bg-error-light',
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className={cn('p-2 rounded-lg', colorClasses[color])}>
            {icon}
          </div>
          {trend !== null && trend !== undefined && (
            <div className={cn(
              'flex items-center text-sm',
              trend >= 0 ? 'text-success' : 'text-error'
            )}>
              <TrendingUp className={cn('h-4 w-4', trend < 0 && 'rotate-180')} />
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        <div className="mt-4">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted">{title}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// Document type stats component
function DocumentTypeStats({
  type,
  label,
  stats,
}: {
  type: DSDocumentType
  label: string
  stats: { total: number; pending: number; completed: number }
}) {
  const completionRate = stats.total > 0
    ? Math.round((stats.completed / stats.total) * 100)
    : 0

  return (
    <div className="p-4 border rounded-lg">
      <p className="font-medium text-foreground">{label}</p>
      <div className="mt-2 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">Total</span>
          <span className="font-medium">{stats.total}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Pending</span>
          <span className="font-medium text-warning">{stats.pending}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Completed</span>
          <span className="font-medium text-success">{stats.completed}</span>
        </div>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted">Completion Rate</span>
          <span className="font-medium">{completionRate}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// Envelope list component
function EnvelopeList({ envelopes }: { envelopes: DSEnvelope[] }) {
  const voidMutation = useVoidDocuSignEnvelope()
  const resendMutation = useResendDocuSignEnvelope()

  return (
    <div className="space-y-2">
      {envelopes.map((envelope) => {
        const statusConfig = getEnvelopeStatusConfig(envelope.status)
        const docTypeConfig = getDocumentTypeConfig(envelope.document_type)

        return (
          <div
            key={envelope.id}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-surface"
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                'p-2 rounded-lg',
                envelope.status === 'completed' ? 'bg-success-light text-success' :
                envelope.status === 'declined' ? 'bg-error-light text-error' :
                envelope.status === 'voided' ? 'bg-surface text-secondary' :
                'bg-blue-50 text-primary'
              )}>
                <FileSignature className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {envelope.subject || `${docTypeConfig.label} Signature Request`}
                </p>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted">
                  <span>{docTypeConfig.label}</span>
                  <span>•</span>
                  <span>{formatDate(envelope.created_at)}</span>
                  {envelope.recipients && envelope.recipients.length > 0 && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {envelope.recipients.length} recipient{envelope.recipients.length !== 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <EnvelopeStatusBadge status={envelope.status} />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  {['sent', 'delivered'].includes(envelope.status) && (
                    <>
                      <DropdownMenuItem
                        onClick={() => resendMutation.mutate({
                          envelope_id: envelope.envelope_id,
                        })}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Resend
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-error"
                        onClick={() => voidMutation.mutate({
                          envelope_id: envelope.envelope_id,
                          reason: 'Voided by user',
                        })}
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        Void
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Envelope status badge
function EnvelopeStatusBadge({ status }: { status: DSEnvelopeStatus }) {
  const config = getEnvelopeStatusConfig(status)

  const variantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    created: 'secondary',
    sent: 'default',
    delivered: 'default',
    signed: 'default',
    completed: 'default',
    declined: 'destructive',
    voided: 'outline',
    deleted: 'outline',
  }

  return (
    <Badge variant={variantMap[status] || 'secondary'}>
      {config.label}
    </Badge>
  )
}

export default DocuSignDashboard
