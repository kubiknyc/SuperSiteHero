/**
 * Subcontractor Pay Applications Page
 * Displays pay applications with detailed line items (Schedule of Values / G703)
 * P1 Feature: Billing visibility for subcontractors
 */

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import {
  useSubcontractorPayApplications,
  usePayApplicationSummary,
  getPayAppStatusLabel,
  getPayAppStatusVariant,
  getPayAppStatusColor,
  formatCurrency,
  formatPercent,
  isAwaitingAction,
} from '@/features/subcontractor-portal/hooks'
import type {
  SubcontractorPayApplication,
  SubcontractorPayAppLineItem,
  PayApplicationStatus,
} from '@/features/subcontractor-portal/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Receipt,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  XCircle,
  Building2,
  Calendar,
  FileText,
  Banknote,
  TrendingUp,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function PayAppsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
  )
}

type TabValue = 'all' | 'pending' | 'approved' | 'paid'

export function SubcontractorPayAppsPage() {
  const [activeTab, setActiveTab] = useState<TabValue>('all')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [expandedApp, setExpandedApp] = useState<string | null>(null)

  const { data: applications, isLoading, isError } = useSubcontractorPayApplications()
  const { data: summary } = usePayApplicationSummary()

  // Get unique projects for filter
  const projects = useMemo(() => {
    if (!applications) {return []}
    const uniqueProjects = new Map<string, string>()
    applications.forEach((app) => {
      if (!uniqueProjects.has(app.project_id)) {
        uniqueProjects.set(app.project_id, app.project_name)
      }
    })
    return Array.from(uniqueProjects.entries()).map(([id, name]) => ({ id, name }))
  }, [applications])

  // Filter applications
  const filteredApplications = useMemo(() => {
    if (!applications) {return []}

    let filtered = applications

    // Apply tab filter
    switch (activeTab) {
      case 'pending':
        filtered = filtered.filter((app) => isAwaitingAction(app.status))
        break
      case 'approved':
        filtered = filtered.filter((app) => app.status === 'approved')
        break
      case 'paid':
        filtered = filtered.filter((app) => app.status === 'paid')
        break
    }

    // Apply project filter
    if (projectFilter !== 'all') {
      filtered = filtered.filter((app) => app.project_id === projectFilter)
    }

    return filtered
  }, [applications, activeTab, projectFilter])

  // Calculate tab counts
  const counts = useMemo(() => {
    if (!applications) {return { all: 0, pending: 0, approved: 0, paid: 0 }}

    return {
      all: applications.length,
      pending: applications.filter((app) => isAwaitingAction(app.status)).length,
      approved: applications.filter((app) => app.status === 'approved').length,
      paid: applications.filter((app) => app.status === 'paid').length,
    }
  }, [applications])

  const toggleExpanded = (appId: string) => {
    setExpandedApp(expandedApp === appId ? null : appId)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 heading-page">
            <Receipt className="h-6 w-6" />
            Pay Applications
          </h1>
          <p className="text-muted-foreground">
            Track your billing and payment status across all projects.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(summary.total_billed)}</p>
                  <p className="text-xs text-muted-foreground">Total Billed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <div>
                  <p className="text-2xl font-bold text-success">
                    {formatCurrency(summary.total_received)}
                  </p>
                  <p className="text-xs text-muted-foreground">Received</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                <div>
                  <p className="text-2xl font-bold text-warning">
                    {formatCurrency(summary.pending_approval_amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pending ({summary.pending_approval_count})
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(summary.total_retainage_held)}</p>
                  <p className="text-xs text-muted-foreground">Retainage Held</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pending Alert */}
      {summary && summary.pending_approval_count > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Awaiting Approval</AlertTitle>
          <AlertDescription>
            You have {summary.pending_approval_count} pay application(s) totaling{' '}
            {formatCurrency(summary.pending_approval_amount)} awaiting approval.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        {projects.length > 1 && (
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="pending" className="text-warning">
            Pending ({counts.pending})
          </TabsTrigger>
          <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
          <TabsTrigger value="paid">Paid ({counts.paid})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <PayAppsSkeleton />
          ) : isError ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Failed to load pay applications
              </CardContent>
            </Card>
          ) : filteredApplications.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2 heading-subsection">
                  {activeTab === 'all'
                    ? 'No Pay Applications'
                    : activeTab === 'pending'
                    ? 'No Pending Applications'
                    : activeTab === 'approved'
                    ? 'No Approved Applications'
                    : 'No Paid Applications'}
                </h3>
                <p className="text-muted-foreground">
                  {activeTab === 'all'
                    ? 'Pay applications will appear here once submitted.'
                    : 'No applications match this filter.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredApplications.map((app) => (
                <PayApplicationCard
                  key={app.id}
                  application={app}
                  isExpanded={expandedApp === app.id}
                  onToggle={() => toggleExpanded(app.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface PayApplicationCardProps {
  application: SubcontractorPayApplication
  isExpanded: boolean
  onToggle: () => void
}

function PayApplicationCard({ application, isExpanded, onToggle }: PayApplicationCardProps) {
  const app = application

  return (
    <Card className={cn(isAwaitingAction(app.status) && 'border-warning/50')}>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">
                    Pay App #{app.application_number}
                  </CardTitle>
                  <Badge variant={getPayAppStatusVariant(app.status)}>
                    {getPayAppStatusLabel(app.status)}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {app.project_name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Through {format(new Date(app.period_to), 'MMM d, yyyy')}
                  </span>
                </CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-lg font-semibold">{formatCurrency(app.current_payment_due)}</p>
                  <p className="text-xs text-muted-foreground">Current Due</p>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-6">
            <Separator />

            {/* Summary Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Contract Sum</p>
                <p className="font-medium">{formatCurrency(app.contract_sum_to_date)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Completed</p>
                <p className="font-medium">{formatCurrency(app.total_completed_and_stored)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Percent Complete</p>
                <p className="font-medium">{formatPercent(app.percent_complete)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Balance to Finish</p>
                <p className="font-medium">{formatCurrency(app.balance_to_finish)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Retainage ({app.retainage_percent}%)</p>
                <p className="font-medium">{formatCurrency(app.total_retainage)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Less Previous</p>
                <p className="font-medium">{formatCurrency(app.less_previous_certificates)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">This Period</p>
                <p className="font-medium">{formatCurrency(app.total_completed_this_period)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Current Payment Due</p>
                <p className="font-semibold text-primary">{formatCurrency(app.current_payment_due)}</p>
              </div>
            </div>

            {/* Status Timeline */}
            {(app.submitted_at || app.approved_at || app.paid_at) && (
              <>
                <Separator />
                <div className="flex flex-wrap gap-4 text-sm">
                  {app.submitted_at && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      Submitted: {format(new Date(app.submitted_at), 'MMM d, yyyy')}
                    </div>
                  )}
                  {app.approved_at && (
                    <div className="flex items-center gap-1 text-success">
                      <CheckCircle className="h-4 w-4" />
                      Approved: {format(new Date(app.approved_at), 'MMM d, yyyy')}
                    </div>
                  )}
                  {app.paid_at && (
                    <div className="flex items-center gap-1 text-emerald-600">
                      <DollarSign className="h-4 w-4" />
                      Paid: {format(new Date(app.paid_at), 'MMM d, yyyy')}
                      {app.payment_reference && (
                        <span className="text-muted-foreground ml-1">
                          (Ref: {app.payment_reference})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Rejection Reason */}
            {app.status === 'rejected' && app.rejection_reason && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Rejected</AlertTitle>
                <AlertDescription>{app.rejection_reason}</AlertDescription>
              </Alert>
            )}

            {/* Line Items Table */}
            {app.line_items.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Schedule of Values ({app.line_items.length} items)
                  </h4>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">Item</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-[100px]">Cost Code</TableHead>
                          <TableHead className="text-right w-[120px]">Scheduled</TableHead>
                          <TableHead className="text-right w-[120px]">Previous</TableHead>
                          <TableHead className="text-right w-[120px]">This Period</TableHead>
                          <TableHead className="text-right w-[100px]">Materials</TableHead>
                          <TableHead className="text-right w-[80px]">%</TableHead>
                          <TableHead className="text-right w-[120px]">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {app.line_items.map((item) => (
                          <LineItemRow key={item.id} item={item} />
                        ))}
                        {/* Totals Row */}
                        <TableRow className="font-medium bg-muted/50">
                          <TableCell colSpan={3}>Totals</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(
                              app.line_items.reduce((s, i) => s + i.total_scheduled_value, 0)
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(
                              app.line_items.reduce((s, i) => s + i.work_completed_previous, 0)
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(
                              app.line_items.reduce((s, i) => s + i.work_completed_this_period, 0)
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(
                              app.line_items.reduce((s, i) => s + i.materials_stored, 0)
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatPercent(app.percent_complete)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(
                              app.line_items.reduce((s, i) => s + i.balance_to_finish, 0)
                            )}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

interface LineItemRowProps {
  item: SubcontractorPayAppLineItem
}

function LineItemRow({ item }: LineItemRowProps) {
  return (
    <TableRow>
      <TableCell className="font-mono text-sm">{item.item_number}</TableCell>
      <TableCell className="max-w-[200px] truncate" title={item.description}>
        {item.description}
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {item.cost_code || '-'}
      </TableCell>
      <TableCell className="text-right">{formatCurrency(item.total_scheduled_value)}</TableCell>
      <TableCell className="text-right">{formatCurrency(item.work_completed_previous)}</TableCell>
      <TableCell className="text-right font-medium">
        {formatCurrency(item.work_completed_this_period)}
      </TableCell>
      <TableCell className="text-right">{formatCurrency(item.materials_stored)}</TableCell>
      <TableCell className="text-right">{formatPercent(item.percent_complete)}</TableCell>
      <TableCell className="text-right">{formatCurrency(item.balance_to_finish)}</TableCell>
    </TableRow>
  )
}

export default SubcontractorPayAppsPage
