/**
 * Payment Aging Dashboard Component
 *
 * Displays accounts receivable aging analysis with bucket breakdown,
 * alerts, DSO metrics, and cash flow forecast.
 */

import React, { useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  AlertCircle,
  Info,
  DollarSign,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Download,
  Filter,
  ChevronDown,
  ChevronUp,
  Building2,
  Clock,
  PiggyBank,
  BarChart3,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import {
  usePaymentAgingDashboard,
  usePaymentAgingReport,
  usePaymentAgingAlerts,
  useDSOMetrics,
  getBucketColor,
} from '../hooks/usePaymentAging'
import { useProjects } from '@/features/projects/hooks/useProjects'
import type {
  AgingReceivable,
  AgingBucket,
  AgingAlert,
  ProjectAgingSummary,
} from '@/types/payment-application'
import { AGING_BUCKETS } from '@/types/payment-application'

// ============================================================================
// Utility Functions
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

function getBucketBadgeVariant(
  bucket: AgingBucket
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (bucket) {
    case 'current':
      return 'default'
    case '1-30':
      return 'secondary'
    case '31-60':
    case '61-90':
      return 'outline'
    case '90+':
      return 'destructive'
    default:
      return 'default'
  }
}

function getSeverityIcon(severity: 'info' | 'warning' | 'critical') {
  switch (severity) {
    case 'critical':
      return <AlertTriangle className="h-4 w-4 text-error" />
    case 'warning':
      return <AlertCircle className="h-4 w-4 text-warning" />
    case 'info':
      return <Info className="h-4 w-4 text-primary" />
  }
}

// ============================================================================
// Sub-Components
// ============================================================================

interface AgingSummaryCardsProps {
  totalOutstanding: number
  totalRetainage: number
  averageDays: number
  oldestDays: number
  currentDSO: number
  targetDSO: number
}

function AgingSummaryCards({
  totalOutstanding,
  totalRetainage,
  averageDays,
  oldestDays,
  currentDSO,
  targetDSO,
}: AgingSummaryCardsProps) {
  const dsoStatus = currentDSO <= targetDSO ? 'good' : currentDSO <= targetDSO * 1.5 ? 'warning' : 'bad'

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalOutstanding)}</div>
          <p className="text-xs text-muted-foreground">
            + {formatCurrency(totalRetainage)} retainage held
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Days Outstanding</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{averageDays} days</div>
          <p className="text-xs text-muted-foreground">Oldest: {oldestDays} days</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">DSO (Days Sales Outstanding)</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-2xl font-bold',
                dsoStatus === 'good' && 'text-success',
                dsoStatus === 'warning' && 'text-warning',
                dsoStatus === 'bad' && 'text-error'
              )}
            >
              {currentDSO}
            </span>
            {dsoStatus === 'good' ? (
              <TrendingDown className="h-4 w-4 text-success" />
            ) : dsoStatus === 'warning' ? (
              <Minus className="h-4 w-4 text-warning" />
            ) : (
              <TrendingUp className="h-4 w-4 text-error" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">Target: {targetDSO} days</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Retainage Balance</CardTitle>
          <PiggyBank className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalRetainage)}</div>
          <p className="text-xs text-muted-foreground">Held across all projects</p>
        </CardContent>
      </Card>
    </div>
  )
}

interface AgingBucketChartProps {
  buckets: Array<{
    bucket: AgingBucket
    label: string
    count: number
    amount: number
    percent: number
  }>
  total: number
}

function AgingBucketChart({ buckets, total }: AgingBucketChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Aging Breakdown</CardTitle>
        <CardDescription>Outstanding receivables by age</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Stacked bar visualization */}
        <div className="mb-6">
          <div className="flex h-8 rounded-lg overflow-hidden">
            {buckets.map((bucket) => (
              <div
                key={bucket.bucket}
                className={cn(
                  'transition-all duration-300',
                  bucket.bucket === 'current' && 'bg-green-500',
                  bucket.bucket === '1-30' && 'bg-blue-500',
                  bucket.bucket === '31-60' && 'bg-warning',
                  bucket.bucket === '61-90' && 'bg-orange-500',
                  bucket.bucket === '90+' && 'bg-red-500'
                )}
                style={{ width: `${bucket.percent}%` }}
                title={`${bucket.label}: ${formatCurrency(bucket.amount)}`}
              />
            ))}
          </div>
        </div>

        {/* Bucket details */}
        <div className="space-y-3">
          {buckets.map((bucket) => (
            <div key={bucket.bucket} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'h-3 w-3 rounded-full',
                    bucket.bucket === 'current' && 'bg-green-500',
                    bucket.bucket === '1-30' && 'bg-blue-500',
                    bucket.bucket === '31-60' && 'bg-warning',
                    bucket.bucket === '61-90' && 'bg-orange-500',
                    bucket.bucket === '90+' && 'bg-red-500'
                  )}
                />
                <span className="text-sm">{bucket.label}</span>
                <Badge variant="secondary" className="text-xs">
                  {bucket.count}
                </Badge>
              </div>
              <div className="text-right">
                <div className="font-medium">{formatCurrency(bucket.amount)}</div>
                <div className="text-xs text-muted-foreground">
                  {formatPercent(bucket.percent)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface AlertsListProps {
  alerts: AgingAlert[]
  maxItems?: number
}

function AlertsList({ alerts, maxItems = 5 }: AlertsListProps) {
  const displayAlerts = maxItems ? alerts.slice(0, maxItems) : alerts
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length
  const warningCount = alerts.filter((a) => a.severity === 'warning').length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Payment Alerts</CardTitle>
            <CardDescription>
              {criticalCount > 0 && (
                <span className="text-error font-medium">{criticalCount} critical</span>
              )}
              {criticalCount > 0 && warningCount > 0 && ', '}
              {warningCount > 0 && (
                <span className="text-warning font-medium">{warningCount} warnings</span>
              )}
              {criticalCount === 0 && warningCount === 0 && 'No urgent alerts'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {displayAlerts.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            All payments are current. Great job!
          </div>
        ) : (
          <div className="space-y-3">
            {displayAlerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border',
                  alert.severity === 'critical' && 'bg-error-light border-red-200',
                  alert.severity === 'warning' && 'bg-warning-light border-yellow-200',
                  alert.severity === 'info' && 'bg-blue-50 border-blue-200'
                )}
              >
                {getSeverityIcon(alert.severity)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{alert.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(alert.receivable.amount_outstanding)}
                    </span>
                    <Badge variant={getBucketBadgeVariant(alert.receivable.aging_bucket)}>
                      {alert.receivable.days_outstanding} days
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface ReceivablesTableProps {
  receivables: AgingReceivable[]
  onSort?: (column: string) => void
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
}

function ReceivablesTable({
  receivables,
  onSort,
  sortColumn,
  sortDirection,
}: ReceivablesTableProps) {
  const SortHeader = ({
    column,
    children,
  }: {
    column: string
    children: React.ReactNode
  }) => (
    <TableHead
      className={cn(onSort && 'cursor-pointer hover:bg-muted/50')}
      onClick={() => onSort?.(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortColumn === column &&
          (sortDirection === 'asc' ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          ))}
      </div>
    </TableHead>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Outstanding Receivables</CardTitle>
        <CardDescription>All pending payment applications</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader column="project_name">Project</SortHeader>
              <SortHeader column="application_number">Application</SortHeader>
              <SortHeader column="period_to">Period End</SortHeader>
              <SortHeader column="amount_outstanding">Outstanding</SortHeader>
              <SortHeader column="days_outstanding">Days</SortHeader>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {receivables.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No outstanding receivables
                </TableCell>
              </TableRow>
            ) : (
              receivables.map((receivable) => (
                <TableRow key={receivable.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{receivable.project_name}</div>
                      {receivable.project_number && (
                        <div className="text-xs text-muted-foreground">
                          #{receivable.project_number}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{receivable.display_number}</TableCell>
                  <TableCell>
                    {format(parseISO(receivable.period_to), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(receivable.amount_outstanding)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getBucketBadgeVariant(receivable.aging_bucket)}>
                      {receivable.days_outstanding} days
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{receivable.status}</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

interface ProjectSummaryTableProps {
  projects: ProjectAgingSummary[]
}

function ProjectSummaryTable({ projects }: ProjectSummaryTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>By Project</CardTitle>
        <CardDescription>Outstanding amounts per project</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead className="text-right">Retainage</TableHead>
              <TableHead className="text-right">Apps</TableHead>
              <TableHead className="text-right">Avg Days</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No project data
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project) => (
                <TableRow key={project.project_id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{project.project_name}</div>
                        {project.project_number && (
                          <div className="text-xs text-muted-foreground">
                            #{project.project_number}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(project.total_outstanding)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(project.total_retainage)}
                  </TableCell>
                  <TableCell className="text-right">{project.application_count}</TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={
                        project.average_days <= 30
                          ? 'default'
                          : project.average_days <= 60
                            ? 'secondary'
                            : 'destructive'
                      }
                    >
                      {project.average_days} days
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export interface PaymentAgingDashboardProps {
  className?: string
}

export function PaymentAgingDashboard({ className }: PaymentAgingDashboardProps) {
  const [selectedProject, setSelectedProject] = useState<string | undefined>()
  const [sortColumn, setSortColumn] = useState<string>('days_outstanding')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const { data: report, isLoading, error, refetch } = usePaymentAgingReport(selectedProject)
  const { data: alerts } = usePaymentAgingAlerts()
  const { data: dsoMetrics } = useDSOMetrics()
  const { data: projects } = useProjects()

  // Sort receivables
  const sortedReceivables = useMemo(() => {
    if (!report?.receivables) {return []}

    return [...report.receivables].sort((a, b) => {
      let comparison = 0

      switch (sortColumn) {
        case 'project_name':
          comparison = a.project_name.localeCompare(b.project_name)
          break
        case 'application_number':
          comparison = a.application_number - b.application_number
          break
        case 'period_to':
          comparison = a.period_to.localeCompare(b.period_to)
          break
        case 'amount_outstanding':
          comparison = a.amount_outstanding - b.amount_outstanding
          break
        case 'days_outstanding':
          comparison = a.days_outstanding - b.days_outstanding
          break
        default:
          comparison = 0
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [report?.receivables, sortColumn, sortDirection])

  const handleSort = (column: string) => {
    if (column === sortColumn) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-3 w-20 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-error" />
            <p>Failed to load aging data</p>
            <Button variant="outline" className="mt-2" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!report) {
    return null
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight heading-section">Payment Aging</h2>
          <p className="text-muted-foreground">
            As of {format(parseISO(report.as_of_date), 'MMMM d, yyyy')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedProject || 'all'} onValueChange={(v) => setSelectedProject(v === 'all' ? undefined : v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects?.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <AgingSummaryCards
        totalOutstanding={report.total_outstanding}
        totalRetainage={report.total_retainage}
        averageDays={report.average_days_outstanding}
        oldestDays={report.oldest_receivable_days}
        currentDSO={dsoMetrics?.current_dso ?? 0}
        targetDSO={dsoMetrics?.target_dso ?? 45}
      />

      {/* Aging Chart and Alerts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AgingBucketChart buckets={report.buckets} total={report.total_outstanding} />
        <AlertsList alerts={alerts || []} maxItems={5} />
      </div>

      {/* Receivables Table */}
      <ReceivablesTable
        receivables={sortedReceivables}
        onSort={handleSort}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
      />

      {/* Project Summary */}
      {report.by_project.length > 0 && (
        <ProjectSummaryTable projects={report.by_project} />
      )}
    </div>
  )
}

export default PaymentAgingDashboard
