/**
 * Payment Forecast Calendar Component
 *
 * Displays upcoming payment schedules with:
 * - Monthly calendar grid view
 * - Timeline view
 * - List view with filtering
 * - Cash flow projections
 * - Payment analytics
 */

/* eslint-disable react-hooks/preserve-manual-memoization */

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
// Select components reserved for future filter UI implementation
// import {
//   RadixSelect as Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import {
  ChevronLeft,
  ChevronRight,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Users,
  FileText,
  Unlock,
  Building,
  Truck,
  RefreshCw,
  List,
  LayoutGrid,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { format, addMonths, subMonths, parseISO, isSameMonth, isToday } from 'date-fns'
import {
  usePaymentForecastDashboard,
} from '../hooks/usePaymentForecast'
import {
  getPaymentTypeConfig,
  getPaymentStatusConfig,
  isIncomingPayment,
  type PaymentCalendarEvent,
  type PaymentType,
  type PaymentStatus,
  type CashFlowProjection,
  type DailyPaymentTotals,
  type CalendarView,
} from '@/types/payment-forecast'

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

function formatCurrencyCompact(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`
  }
  return formatCurrency(amount)
}

function getPaymentTypeIcon(type: PaymentType) {
  switch (type) {
    case 'subcontractor_pay_application':
      return <Users className="h-4 w-4" />
    case 'invoice_payment':
      return <FileText className="h-4 w-4" />
    case 'retention_release':
      return <Unlock className="h-4 w-4" />
    case 'owner_requisition':
      return <Building className="h-4 w-4" />
    case 'vendor_payment':
      return <Truck className="h-4 w-4" />
    case 'progress_billing':
      return <TrendingUp className="h-4 w-4" />
    default:
      return <DollarSign className="h-4 w-4" />
  }
}

function getPaymentTypeColor(type: PaymentType): string {
  const config = getPaymentTypeConfig(type)
  const colors: Record<string, string> = {
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    emerald: 'bg-success',
    amber: 'bg-warning',
    pink: 'bg-pink-500',
    cyan: 'bg-cyan-500',
  }
  return colors[config.color] || 'bg-gray-500'
}

function getStatusBadgeVariant(status: PaymentStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'completed':
      return 'default'
    case 'approved':
    case 'processing':
      return 'secondary'
    case 'overdue':
      return 'destructive'
    default:
      return 'outline'
  }
}

// ============================================================================
// Sub-Components
// ============================================================================

interface SummaryCardsProps {
  totalIncoming: number
  totalOutgoing: number
  netCashFlow: number
  overdueCount: number
  pendingCount: number
  isLoading: boolean
}

function SummaryCards({
  totalIncoming,
  totalOutgoing,
  netCashFlow,
  overdueCount,
  pendingCount,
  isLoading,
}: SummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Expected Incoming</CardTitle>
          <ArrowDownRight className="h-4 w-4 text-success" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-success">{formatCurrency(totalIncoming)}</div>
          <p className="text-xs text-muted-foreground">Owner requisitions & billings</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Scheduled Outgoing</CardTitle>
          <ArrowUpRight className="h-4 w-4 text-error" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-error">{formatCurrency(totalOutgoing)}</div>
          <p className="text-xs text-muted-foreground">Subcontractor & vendor payments</p>
        </CardContent>
      </Card>

      <Card className={netCashFlow >= 0 ? 'border-green-200 bg-success-light' : 'border-red-200 bg-error-light'}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
          {netCashFlow >= 0 ? (
            <TrendingUp className="h-4 w-4 text-success" />
          ) : (
            <TrendingDown className="h-4 w-4 text-error" />
          )}
        </CardHeader>
        <CardContent>
          <div className={cn('text-2xl font-bold', netCashFlow >= 0 ? 'text-success' : 'text-error')}>
            {formatCurrency(netCashFlow)}
          </div>
          <p className="text-xs text-muted-foreground">Projected for period</p>
        </CardContent>
      </Card>

      <Card className={overdueCount > 0 ? 'border-red-200 bg-error-light' : ''}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overdue Payments</CardTitle>
          <AlertTriangle className={cn('h-4 w-4', overdueCount > 0 ? 'text-error' : 'text-muted-foreground')} />
        </CardHeader>
        <CardContent>
          <div className={cn('text-2xl font-bold', overdueCount > 0 ? 'text-error' : 'text-foreground')}>
            {overdueCount}
          </div>
          <p className="text-xs text-muted-foreground">Requires attention</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
          <Clock className="h-4 w-4 text-warning" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingCount}</div>
          <p className="text-xs text-muted-foreground">Awaiting review</p>
        </CardContent>
      </Card>
    </div>
  )
}

interface CalendarGridProps {
  monthData: {
    year: number
    month: number
    month_name: string
    weeks: Array<{
      days: DailyPaymentTotals[]
    }>
  } | undefined
  currentMonth: Date
  onDayClick?: (date: string, events: PaymentCalendarEvent[]) => void
}

function CalendarGrid({ monthData, currentMonth, onDayClick }: CalendarGridProps) {
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  if (!monthData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">No calendar data available</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-4">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekdays.map((day) => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="space-y-1">
          {monthData.weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-1">
              {week.days.map((day) => {
                const dayDate = parseISO(day.date)
                const isCurrentMonth = isSameMonth(dayDate, currentMonth)
                const isDayToday = isToday(dayDate)
                const hasPayments = day.payment_count > 0

                return (
                  <Popover key={day.date}>
                    <PopoverTrigger asChild>
                      <button
                        className={cn(
                          'relative min-h-[80px] p-2 text-left rounded-lg border transition-colors',
                          isCurrentMonth ? 'bg-card' : 'bg-surface',
                          isDayToday && 'ring-2 ring-blue-500',
                          hasPayments && 'cursor-pointer hover:bg-surface',
                          !isCurrentMonth && 'text-disabled'
                        )}
                        onClick={() => hasPayments && onDayClick?.(day.date, day.events)}
                      >
                        <span className={cn(
                          'text-sm font-medium',
                          isDayToday && 'text-primary'
                        )}>
                          {format(dayDate, 'd')}
                        </span>

                        {hasPayments && (
                          <div className="mt-1 space-y-1">
                            {/* Payment indicators */}
                            {day.events.slice(0, 3).map((event) => (
                              <div
                                key={event.id}
                                className={cn(
                                  'text-xs px-1 py-0.5 rounded truncate',
                                  event.is_incoming ? 'bg-success-light text-success-dark' : 'bg-error-light text-error-dark'
                                )}
                              >
                                {formatCurrencyCompact(event.amount)}
                              </div>
                            ))}
                            {day.events.length > 3 && (
                              <div className="text-xs text-muted-foreground">
                                +{day.events.length - 3} more
                              </div>
                            )}
                          </div>
                        )}

                        {/* Total indicator for days with multiple payments */}
                        {day.payment_count > 0 && (
                          <div className="absolute bottom-1 right-1">
                            <Badge variant="secondary" className="text-xs px-1">
                              {day.payment_count}
                            </Badge>
                          </div>
                        )}
                      </button>
                    </PopoverTrigger>

                    {hasPayments && (
                      <PopoverContent className="w-80 p-0" align="start">
                        <div className="p-4 border-b">
                          <h4 className="font-medium heading-card">{format(dayDate, 'EEEE, MMMM d, yyyy')}</h4>
                          <div className="flex gap-4 mt-2 text-sm">
                            <span className="text-success">In: {formatCurrency(day.incoming)}</span>
                            <span className="text-error">Out: {formatCurrency(day.outgoing)}</span>
                          </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto p-2">
                          {day.events.map((event) => (
                            <div
                              key={event.id}
                              className="flex items-center gap-2 p-2 rounded hover:bg-surface"
                            >
                              <div className={cn('w-2 h-2 rounded-full', getPaymentTypeColor(event.payment_type))} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{event.title}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {event.payee_name || getPaymentTypeConfig(event.payment_type).label}
                                </p>
                              </div>
                              <div className={cn('text-sm font-medium', event.is_incoming ? 'text-success' : 'text-error')}>
                                {event.is_incoming ? '+' : '-'}{formatCurrency(event.amount)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    )}
                  </Popover>
                )
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface PaymentListProps {
  payments: PaymentCalendarEvent[]
  showProject?: boolean
}

function PaymentList({ payments, showProject = true }: PaymentListProps) {
  if (payments.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No payments scheduled for this period
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Due Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Description</TableHead>
            {showProject && <TableHead>Project</TableHead>}
            <TableHead>Payee</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell className="font-medium">
                {format(parseISO(payment.date), 'MMM d, yyyy')}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getPaymentTypeIcon(payment.payment_type)}
                  <span className="text-sm">{getPaymentTypeConfig(payment.payment_type).label}</span>
                </div>
              </TableCell>
              <TableCell className="max-w-[200px] truncate">{payment.title}</TableCell>
              {showProject && (
                <TableCell className="text-muted-foreground">{payment.project_name}</TableCell>
              )}
              <TableCell>{payment.payee_name || '-'}</TableCell>
              <TableCell className={cn('text-right font-medium', payment.is_incoming ? 'text-success' : 'text-error')}>
                {payment.is_incoming ? '+' : '-'}{formatCurrency(payment.amount)}
              </TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(payment.status)}>
                  {getPaymentStatusConfig(payment.status).label}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

interface CashFlowChartProps {
  projections: CashFlowProjection[]
}

function CashFlowChart({ projections }: CashFlowChartProps) {
  if (!projections || projections.length === 0) {
    return null
  }

  const maxAmount = Math.max(
    ...projections.map((p) => Math.max(p.projected_incoming, p.projected_outgoing))
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash Flow Forecast</CardTitle>
        <CardDescription>6-month projection of incoming and outgoing payments</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {projections.map((projection) => {
            const incomingWidth = maxAmount > 0 ? (projection.projected_incoming / maxAmount) * 100 : 0
            const outgoingWidth = maxAmount > 0 ? (projection.projected_outgoing / maxAmount) * 100 : 0

            return (
              <div key={projection.month} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{projection.month_name}</span>
                  <span className={cn('font-medium', projection.net_cash_flow >= 0 ? 'text-success' : 'text-error')}>
                    Net: {formatCurrency(projection.net_cash_flow)}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16">Incoming</span>
                    <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${incomingWidth}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-success w-20 text-right">
                      {formatCurrencyCompact(projection.projected_incoming)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16">Outgoing</span>
                    <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full transition-all"
                        style={{ width: `${outgoingWidth}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-error w-20 text-right">
                      {formatCurrencyCompact(projection.projected_outgoing)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Confidence: {projection.confidence_percent}%</span>
                  <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        projection.confidence_percent >= 70 ? 'bg-green-400' :
                        projection.confidence_percent >= 40 ? 'bg-yellow-400' : 'bg-red-400'
                      )}
                      style={{ width: `${projection.confidence_percent}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

interface PaymentsByTypeProps {
  byType: Array<{
    payment_type: PaymentType
    label: string
    count: number
    amount: number
  }>
}

function PaymentsByType({ byType }: PaymentsByTypeProps) {
  if (!byType || byType.length === 0) {
    return null
  }

  const total = byType.reduce((sum, t) => sum + t.amount, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>By Payment Type</CardTitle>
        <CardDescription>Breakdown of scheduled payments</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {byType.map((item) => {
            const percentage = total > 0 ? (item.amount / total) * 100 : 0
            const isIncoming = isIncomingPayment(item.payment_type)

            return (
              <div key={item.payment_type} className="flex items-center gap-3">
                <div className={cn('p-2 rounded-lg', isIncoming ? 'bg-success-light' : 'bg-error-light')}>
                  {getPaymentTypeIcon(item.payment_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className={cn('text-sm font-medium', isIncoming ? 'text-success' : 'text-error')}>
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full', getPaymentTypeColor(item.payment_type))}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{item.count}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export interface PaymentForecastCalendarProps {
  projectId?: string
  className?: string
}

export function PaymentForecastCalendar({ projectId, className }: PaymentForecastCalendarProps) {
  'use no memo'
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<CalendarView>('month')
  // Filter state - setters reserved for future filter UI implementation
  const [selectedPaymentTypes, _setSelectedPaymentTypes] = useState<PaymentType[]>([])
  const [selectedStatuses, _setSelectedStatuses] = useState<PaymentStatus[]>([])
  // Suppress unused variable warnings for filter setters (will be used when filter UI is added)
  void _setSelectedPaymentTypes
  void _setSelectedStatuses

  // Fetch data
  const {
    payments,
    cashFlow,
    overdue,
    calendar,
    isLoading,
    error,
    refetch,
  } = usePaymentForecastDashboard(projectId, currentDate)

  // Navigation handlers
  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1))
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  // Filter events
  const filteredEvents = useMemo(() => {
    if (!calendar?.events) {return []}

    return calendar.events.filter((event) => {
      if (selectedPaymentTypes.length > 0 && !selectedPaymentTypes.includes(event.payment_type)) {
        return false
      }
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(event.status)) {
        return false
      }
      return true
    })
  }, [calendar?.events, selectedPaymentTypes, selectedStatuses])

  // Calculate summary values
  const summary = payments?.summary
  const totalIncoming = summary?.total_incoming || 0
  const totalOutgoing = summary?.total_outgoing || 0
  const netCashFlow = summary?.net_cash_flow || 0
  const overdueCount = overdue?.length || 0
  const pendingCount = summary?.pending_approval_count || 0

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-error" />
            <p>Failed to load payment forecast data</p>
            <Button variant="outline" className="mt-2" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight heading-section">Payment Forecast</h2>
          <p className="text-muted-foreground">
            Upcoming payment schedules and cash flow projections
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <SummaryCards
        totalIncoming={totalIncoming}
        totalOutgoing={totalOutgoing}
        netCashFlow={netCashFlow}
        overdueCount={overdueCount}
        pendingCount={pendingCount}
        isLoading={isLoading}
      />

      {/* View Tabs */}
      <Tabs value={view} onValueChange={(v) => setView(v as CalendarView)} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={handleToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-lg font-semibold ml-2">
              {format(currentDate, 'MMMM yyyy')}
            </span>
          </div>

          {/* View Toggle and Filters */}
          <div className="flex items-center gap-2">
            <TabsList>
              <TabsTrigger value="month" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-2">
                <List className="h-4 w-4" />
                List
              </TabsTrigger>
              <TabsTrigger value="timeline" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Calendar View */}
        <TabsContent value="month" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <CalendarGrid
                monthData={calendar?.monthly_data}
                currentMonth={currentDate}
              />
            </div>
            <div className="space-y-4">
              <PaymentsByType byType={summary?.by_type || []} />

              {/* Overdue Alert */}
              {overdueCount > 0 && (
                <Card className="border-red-200 bg-error-light">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-error-dark flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Overdue Payments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-error mb-3">
                      {overdueCount} payment{overdueCount !== 1 ? 's' : ''} require immediate attention
                    </p>
                    {overdue?.slice(0, 3).map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between py-2 border-t border-red-200"
                      >
                        <div>
                          <p className="text-sm font-medium">{payment.description}</p>
                          <p className="text-xs text-error">
                            Due: {format(parseISO(payment.due_date), 'MMM d')}
                          </p>
                        </div>
                        <span className="text-sm font-medium text-error-dark">
                          {formatCurrency(payment.amount)}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* List View */}
        <TabsContent value="list">
          <PaymentList payments={filteredEvents} showProject={!projectId} />
        </TabsContent>

        {/* Analytics View */}
        <TabsContent value="timeline" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <CashFlowChart projections={cashFlow?.projections || []} />

            <Card>
              <CardHeader>
                <CardTitle>Forecast Summary</CardTitle>
                <CardDescription>6-month totals</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {cashFlow?.total_forecast && (
                  <>
                    <div className="flex items-center justify-between p-3 bg-success-light rounded-lg">
                      <div className="flex items-center gap-2">
                        <ArrowDownRight className="h-5 w-5 text-success" />
                        <span className="font-medium">Total Incoming</span>
                      </div>
                      <span className="text-lg font-bold text-success">
                        {formatCurrency(cashFlow.total_forecast.incoming)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-error-light rounded-lg">
                      <div className="flex items-center gap-2">
                        <ArrowUpRight className="h-5 w-5 text-error" />
                        <span className="font-medium">Total Outgoing</span>
                      </div>
                      <span className="text-lg font-bold text-error">
                        {formatCurrency(cashFlow.total_forecast.outgoing)}
                      </span>
                    </div>
                    <div className={cn(
                      'flex items-center justify-between p-3 rounded-lg',
                      cashFlow.total_forecast.net >= 0 ? 'bg-success-light' : 'bg-error-light'
                    )}>
                      <div className="flex items-center gap-2">
                        {cashFlow.total_forecast.net >= 0 ? (
                          <CheckCircle className="h-5 w-5 text-success" />
                        ) : (
                          <XCircle className="h-5 w-5 text-error" />
                        )}
                        <span className="font-medium">Net Position</span>
                      </div>
                      <span className={cn(
                        'text-lg font-bold',
                        cashFlow.total_forecast.net >= 0 ? 'text-success' : 'text-error'
                      )}>
                        {formatCurrency(cashFlow.total_forecast.net)}
                      </span>
                    </div>
                  </>
                )}

                {/* Payment Patterns */}
                {cashFlow?.patterns && cashFlow.patterns.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3 heading-card">Historical Patterns</h4>
                    <div className="space-y-2">
                      {cashFlow.patterns.slice(0, 4).map((pattern) => (
                        <div
                          key={pattern.payment_type}
                          className="flex items-center justify-between text-sm"
                        >
                          <span>{getPaymentTypeConfig(pattern.payment_type).label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                              Avg: {pattern.average_days_to_payment}d
                            </span>
                            <Badge variant={pattern.on_time_percentage >= 90 ? 'default' : 'secondary'}>
                              {pattern.on_time_percentage}% on-time
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default PaymentForecastCalendar
