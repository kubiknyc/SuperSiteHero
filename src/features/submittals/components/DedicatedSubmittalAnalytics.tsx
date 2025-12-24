/**
 * Dedicated Submittal Analytics Component
 *
 * Displays visual analytics for submittal approval timelines
 * using the dedicated submittals table.
 */

import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { differenceInDays, differenceInBusinessDays, parseISO, format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  Timer,
  CalendarDays,
  BarChart3,
} from 'lucide-react'
import { useProjectSubmittals, type SubmittalWithDetails } from '../hooks/useDedicatedSubmittals'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

interface DedicatedSubmittalAnalyticsProps {
  projectId?: string
  className?: string
}

interface LeadTimeMetrics {
  totalDays: number
  businessDays: number
  submittedToApproval: number | null
  isOverdue: boolean
  daysOverdue: number
  status: 'pending' | 'on_track' | 'at_risk' | 'overdue' | 'completed'
}

interface AnalyticsStats {
  totalSubmittals: number
  completedCount: number
  pendingCount: number
  overdueCount: number
  averageLeadTimeDays: number
  fastestApprovalDays: number
  slowestApprovalDays: number
  medianLeadTimeDays: number
  byStatus: Record<string, number>
  byMonth: MonthlyStats[]
  bySpecDivision: DivisionStats[]
}

interface MonthlyStats {
  month: string
  year: number
  submitted: number
  approved: number
  rejected: number
  averageLeadTime: number
}

interface DivisionStats {
  division: string
  divisionTitle: string
  total: number
  approved: number
  pending: number
  averageLeadTime: number
}

// ============================================================================
// Constants
// ============================================================================

const COLORS = {
  primary: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  secondary: '#64748b',
  info: '#06b6d4',
}

const STATUS_COLORS: Record<string, string> = {
  not_submitted: '#94a3b8',
  submitted: '#3b82f6',
  under_review: '#f59e0b',
  approved: '#22c55e',
  approved_as_noted: '#84cc16',
  rejected: '#ef4444',
  revise_resubmit: '#f97316',
  void: '#6b7280',
}

const EXPECTED_LEAD_TIME_DAYS = 14

const DIVISION_TITLES: Record<string, string> = {
  '00': 'Procurement',
  '01': 'General Requirements',
  '02': 'Existing Conditions',
  '03': 'Concrete',
  '04': 'Masonry',
  '05': 'Metals',
  '06': 'Wood, Plastics, Composites',
  '07': 'Thermal & Moisture Protection',
  '08': 'Openings',
  '09': 'Finishes',
  '10': 'Specialties',
  '11': 'Equipment',
  '12': 'Furnishings',
  '13': 'Special Construction',
  '14': 'Conveying Equipment',
  '21': 'Fire Suppression',
  '22': 'Plumbing',
  '23': 'HVAC',
  '25': 'Integrated Automation',
  '26': 'Electrical',
  '27': 'Communications',
  '28': 'Electronic Safety & Security',
  '31': 'Earthwork',
  '32': 'Exterior Improvements',
  '33': 'Utilities',
}

// ============================================================================
// Sub-Components
// ============================================================================

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  status?: 'success' | 'warning' | 'danger' | 'neutral'
}

function MetricCard({ title, value, subtitle, icon: Icon, status = 'neutral' }: MetricCardProps) {
  const statusColors = {
    success: 'text-success bg-success-light border-green-200',
    warning: 'text-warning bg-warning-light border-yellow-200',
    danger: 'text-error bg-error-light border-red-200',
    neutral: 'text-secondary bg-surface border-border',
  }

  return (
    <Card className={cn('border', statusColors[status].split(' ').slice(2).join(' '))}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={cn('p-2 rounded-lg', statusColors[status].split(' ').slice(1, 2).join(' '))}>
            <Icon className={cn('h-5 w-5', statusColors[status].split(' ')[0])} />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-sm font-medium text-secondary">{title}</p>
          {subtitle && <p className="text-xs text-muted mt-1">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Helper Functions
// ============================================================================

// Utility function for individual submittal lead time (reserved for future use)
function _calculateLeadTimeMetrics(submittal: SubmittalWithDetails): LeadTimeMetrics {
  const metrics: LeadTimeMetrics = {
    totalDays: 0,
    businessDays: 0,
    submittedToApproval: null,
    isOverdue: false,
    daysOverdue: 0,
    status: 'pending',
  }

  const today = new Date()
  const submittedDate = submittal.date_submitted ? parseISO(submittal.date_submitted) : null
  const returnedDate = submittal.date_returned ? parseISO(submittal.date_returned) : null
  const requiredDate = submittal.date_required ? parseISO(submittal.date_required) : null

  // Calculate days since creation
  if (submittal.created_at) {
    const createdDate = parseISO(submittal.created_at)
    metrics.totalDays = differenceInDays(today, createdDate)
    metrics.businessDays = differenceInBusinessDays(today, createdDate)
  }

  // Calculate submitted to approval time
  if (submittedDate && returnedDate) {
    metrics.submittedToApproval = differenceInDays(returnedDate, submittedDate)
  } else if (submittedDate) {
    metrics.submittedToApproval = differenceInDays(today, submittedDate)
  }

  // Determine status
  const isApproved = ['approved', 'approved_as_noted'].includes(submittal.review_status)
  const isRejected = submittal.review_status === 'rejected'

  if (isApproved || isRejected) {
    metrics.status = 'completed'
  } else if (requiredDate && requiredDate < today) {
    metrics.status = 'overdue'
    metrics.isOverdue = true
    metrics.daysOverdue = differenceInDays(today, requiredDate)
  } else if (requiredDate) {
    const daysUntilDue = differenceInDays(requiredDate, today)
    if (daysUntilDue <= 3) {
      metrics.status = 'at_risk'
    } else {
      metrics.status = 'on_track'
    }
  } else {
    metrics.status = metrics.totalDays > EXPECTED_LEAD_TIME_DAYS ? 'at_risk' : 'on_track'
  }

  return metrics
}

function calculateStats(submittals: SubmittalWithDetails[]): AnalyticsStats {
  const completed = submittals.filter(s =>
    ['approved', 'approved_as_noted', 'rejected'].includes(s.review_status)
  )
  const pending = submittals.filter(s =>
    !['approved', 'approved_as_noted', 'rejected', 'void'].includes(s.review_status)
  )

  // Calculate overdue count
  const today = new Date()
  const overdue = pending.filter(s => {
    if (!s.date_required) return false
    return parseISO(s.date_required) < today
  })

  // Calculate lead times from completed submittals
  const leadTimes: number[] = []
  completed.forEach(s => {
    if (s.date_submitted && s.date_returned) {
      const days = differenceInDays(parseISO(s.date_returned), parseISO(s.date_submitted))
      if (days >= 0) leadTimes.push(days)
    }
  })

  const sortedLeadTimes = [...leadTimes].sort((a, b) => a - b)

  // Count by status
  const byStatus: Record<string, number> = {}
  submittals.forEach(s => {
    byStatus[s.review_status] = (byStatus[s.review_status] || 0) + 1
  })

  // Calculate monthly stats
  const monthlyData = new Map<string, { submitted: number; approved: number; rejected: number; leadTimes: number[] }>()

  submittals.forEach(s => {
    if (!s.created_at) return
    const date = parseISO(s.created_at)
    const key = format(date, 'yyyy-MM')

    if (!monthlyData.has(key)) {
      monthlyData.set(key, { submitted: 0, approved: 0, rejected: 0, leadTimes: [] })
    }

    const data = monthlyData.get(key)!
    data.submitted++

    if (['approved', 'approved_as_noted'].includes(s.review_status)) {
      data.approved++
      if (s.date_submitted && s.date_returned) {
        data.leadTimes.push(differenceInDays(parseISO(s.date_returned), parseISO(s.date_submitted)))
      }
    } else if (s.review_status === 'rejected') {
      data.rejected++
    }
  })

  const byMonth = Array.from(monthlyData.entries())
    .map(([key, data]) => ({
      month: key.split('-')[1],
      year: parseInt(key.split('-')[0]),
      submitted: data.submitted,
      approved: data.approved,
      rejected: data.rejected,
      averageLeadTime: data.leadTimes.length > 0
        ? Math.round(data.leadTimes.reduce((a, b) => a + b, 0) / data.leadTimes.length)
        : 0,
    }))
    .sort((a, b) => (a.year * 100 + parseInt(a.month)) - (b.year * 100 + parseInt(b.month)))

  // Calculate by spec division
  const divisionData = new Map<string, { total: number; approved: number; pending: number; leadTimes: number[] }>()

  submittals.forEach(s => {
    const division = s.spec_section?.substring(0, 2) || '00'

    if (!divisionData.has(division)) {
      divisionData.set(division, { total: 0, approved: 0, pending: 0, leadTimes: [] })
    }

    const data = divisionData.get(division)!
    data.total++

    if (['approved', 'approved_as_noted'].includes(s.review_status)) {
      data.approved++
      if (s.date_submitted && s.date_returned) {
        data.leadTimes.push(differenceInDays(parseISO(s.date_returned), parseISO(s.date_submitted)))
      }
    } else if (!['rejected', 'void'].includes(s.review_status)) {
      data.pending++
    }
  })

  const bySpecDivision = Array.from(divisionData.entries())
    .map(([division, data]) => ({
      division,
      divisionTitle: DIVISION_TITLES[division] || `Division ${division}`,
      total: data.total,
      approved: data.approved,
      pending: data.pending,
      averageLeadTime: data.leadTimes.length > 0
        ? Math.round(data.leadTimes.reduce((a, b) => a + b, 0) / data.leadTimes.length)
        : 0,
    }))
    .sort((a, b) => a.division.localeCompare(b.division))

  return {
    totalSubmittals: submittals.length,
    completedCount: completed.length,
    pendingCount: pending.length,
    overdueCount: overdue.length,
    averageLeadTimeDays: leadTimes.length > 0
      ? Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length)
      : 0,
    fastestApprovalDays: sortedLeadTimes.length > 0 ? sortedLeadTimes[0] : 0,
    slowestApprovalDays: sortedLeadTimes.length > 0 ? sortedLeadTimes[sortedLeadTimes.length - 1] : 0,
    medianLeadTimeDays: sortedLeadTimes.length > 0
      ? sortedLeadTimes[Math.floor(sortedLeadTimes.length / 2)]
      : 0,
    byStatus,
    byMonth,
    bySpecDivision,
  }
}

// ============================================================================
// Main Component
// ============================================================================

export function DedicatedSubmittalAnalytics({ projectId: propProjectId, className }: DedicatedSubmittalAnalyticsProps) {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>()
  const projectId = propProjectId || routeProjectId

  const [dateRange, setDateRange] = useState<'30' | '90' | '180' | 'all'>('90')

  // Fetch submittals
  const { data: submittals, isLoading } = useProjectSubmittals(projectId)

  // Filter by date range
  const filteredSubmittals = useMemo(() => {
    if (!submittals) return []
    if (dateRange === 'all') return submittals

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(dateRange))

    return submittals.filter(s => {
      if (!s.created_at) return false
      return parseISO(s.created_at) >= cutoffDate
    })
  }, [submittals, dateRange])

  // Calculate stats
  const stats = useMemo(() => {
    if (!filteredSubmittals.length) return null
    return calculateStats(filteredSubmittals)
  }, [filteredSubmittals])

  // Prepare chart data
  const statusPieData = useMemo(() => {
    if (!stats?.byStatus) return []
    return Object.entries(stats.byStatus).map(([status, count]) => ({
      name: status.replace(/_/g, ' '),
      value: count,
      fill: STATUS_COLORS[status] || COLORS.secondary,
    }))
  }, [stats])

  const monthlyChartData = useMemo(() => {
    if (!stats?.byMonth) return []
    return stats.byMonth.map(m => ({
      name: `${m.month}/${m.year.toString().slice(-2)}`,
      submitted: m.submitted,
      approved: m.approved,
      rejected: m.rejected,
      avgLeadTime: m.averageLeadTime,
    }))
  }, [stats])

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    )
  }

  if (!stats || filteredSubmittals.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-12 text-center">
          <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-secondary">No submittal data available for analysis</p>
          <p className="text-sm text-muted mt-2">
            Create some submittals to see analytics here.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Determine status based on average lead time
  const getLeadTimeStatus = (days: number): 'success' | 'warning' | 'danger' => {
    if (days <= EXPECTED_LEAD_TIME_DAYS) return 'success'
    if (days <= EXPECTED_LEAD_TIME_DAYS * 1.5) return 'warning'
    return 'danger'
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Date Range Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2" className="heading-section">
            <Timer className="h-6 w-6" />
            Lead Time Analytics
          </h2>
          <p className="text-sm text-muted mt-1">
            Analyzing {stats.totalSubmittals} submittals
          </p>
        </div>
        <Select value={dateRange} onValueChange={(v: typeof dateRange) => setDateRange(v)}>
          <SelectTrigger className="w-[150px]">
            <CalendarDays className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="180">Last 180 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Avg Lead Time"
          value={`${stats.averageLeadTimeDays} days`}
          subtitle={`Target: ${EXPECTED_LEAD_TIME_DAYS} days`}
          icon={Clock}
          status={getLeadTimeStatus(stats.averageLeadTimeDays)}
        />
        <MetricCard
          title="Completed"
          value={stats.completedCount}
          subtitle={`of ${stats.totalSubmittals} total`}
          icon={CheckCircle}
          status="success"
        />
        <MetricCard
          title="Pending Review"
          value={stats.pendingCount}
          subtitle="Awaiting action"
          icon={Timer}
          status={stats.pendingCount > 0 ? 'warning' : 'neutral'}
        />
        <MetricCard
          title="Overdue"
          value={stats.overdueCount}
          subtitle="Past due date"
          icon={AlertTriangle}
          status={stats.overdueCount === 0 ? 'success' : 'danger'}
        />
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="trends" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends">Monthly Trends</TabsTrigger>
          <TabsTrigger value="distribution">Lead Time</TabsTrigger>
          <TabsTrigger value="status">By Status</TabsTrigger>
          <TabsTrigger value="division">By Division</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monthly Submittal Activity</CardTitle>
              <CardDescription>Submissions and approvals over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="submitted" fill={COLORS.primary} name="Submitted" />
                  <Bar dataKey="approved" fill={COLORS.success} name="Approved" />
                  <Bar dataKey="rejected" fill={COLORS.danger} name="Rejected" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {monthlyChartData.length > 1 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Average Lead Time Trend</CardTitle>
                <CardDescription>Days from submission to approval</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="avgLeadTime"
                      stroke={COLORS.primary}
                      strokeWidth={2}
                      dot={{ fill: COLORS.primary }}
                      name="Avg Lead Time (days)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="distribution" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lead Time Statistics</CardTitle>
              <CardDescription>Performance metrics for completed submittals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 py-4">
                <div className="text-center p-4 bg-success-light rounded-lg">
                  <p className="text-2xl font-bold text-success">{stats.fastestApprovalDays}</p>
                  <p className="text-xs text-muted">Fastest (days)</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{stats.medianLeadTimeDays}</p>
                  <p className="text-xs text-muted">Median (days)</p>
                </div>
                <div className="text-center p-4 bg-error-light rounded-lg">
                  <p className="text-2xl font-bold text-error">{stats.slowestApprovalDays}</p>
                  <p className="text-xs text-muted">Slowest (days)</p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t">
                <h4 className="text-sm font-medium text-foreground mb-4" className="heading-card">Performance Summary</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-secondary">Average Lead Time</span>
                      <span className="text-sm font-semibold">{stats.averageLeadTimeDays} days</span>
                    </div>
                    <Progress
                      value={Math.min((EXPECTED_LEAD_TIME_DAYS / Math.max(stats.averageLeadTimeDays, 1)) * 100, 100)}
                      className="h-2"
                    />
                    <p className="text-xs text-muted mt-1">
                      Target: {EXPECTED_LEAD_TIME_DAYS} days
                    </p>
                  </div>

                  <div className="mt-4">
                    <h5 className="text-sm font-medium text-secondary mb-2">Recommendations</h5>
                    <ul className="space-y-2 text-sm text-secondary">
                      {stats.averageLeadTimeDays > EXPECTED_LEAD_TIME_DAYS && (
                        <li className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                          Average lead time exceeds target - consider process improvements
                        </li>
                      )}
                      {stats.overdueCount > 0 && (
                        <li className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-error flex-shrink-0 mt-0.5" />
                          {stats.overdueCount} overdue submittal{stats.overdueCount > 1 ? 's' : ''} need{stats.overdueCount === 1 ? 's' : ''} attention
                        </li>
                      )}
                      {stats.averageLeadTimeDays <= EXPECTED_LEAD_TIME_DAYS && stats.overdueCount === 0 && (
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                          Submittal process is performing well
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Submittals by Status</CardTitle>
              <CardDescription>Current status distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="w-full md:w-1/2">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ value }) => `${value}`}
                        labelLine={false}
                      >
                        {statusPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full md:w-1/2 space-y-2">
                  {statusPieData.map(item => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.fill }}
                        />
                        <span className="text-sm text-secondary capitalize">{item.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="division" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Submittals by CSI Division</CardTitle>
              <CardDescription>Breakdown by spec section division</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.bySpecDivision.map(div => (
                  <div key={div.division} className="p-3 bg-surface rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-mono text-sm text-primary mr-2">
                          Div {div.division}
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {div.divisionTitle}
                        </span>
                      </div>
                      <Badge variant="secondary">{div.total} submittals</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-secondary">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        {div.approved} approved
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-warning" />
                        {div.pending} pending
                      </span>
                      {div.averageLeadTime > 0 && (
                        <span className="text-muted">
                          Avg: {div.averageLeadTime} days
                        </span>
                      )}
                    </div>
                    <Progress
                      value={(div.approved / Math.max(div.total, 1)) * 100}
                      className="h-1.5 mt-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default DedicatedSubmittalAnalytics
