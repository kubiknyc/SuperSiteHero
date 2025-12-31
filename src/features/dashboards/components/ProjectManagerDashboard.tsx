/**
 * Project Manager Dashboard
 *
 * Project oversight focused dashboard for PMs:
 * - Budget vs. actual
 * - Schedule status
 * - RFI/Submittal tracking
 * - Change order summary
 * - Action items
 * - Team workload
 * - Risk indicators
 */

import * as React from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  DollarSign,
  Calendar,
  HelpCircle,
  FileCheck,
  RefreshCw,
  TrendingUp,
  Users,
  BarChart2,
  Briefcase,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  CircleDot,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import type { Project } from '@/types/database'
import { useProjectManagerDashboard } from '../hooks/useProjectManagerDashboard'

interface ProjectManagerDashboardProps {
  project?: Project | null
  projectId?: string
}

export function ProjectManagerDashboard({ project: _project, projectId }: ProjectManagerDashboardProps) {
  // Fetch real data from the dashboard hook
  const { data, isLoading } = useProjectManagerDashboard(projectId)

  // Use real data or fallback defaults
  const budgetMetrics = data?.budgetMetrics || {
    contractValue: 0,
    costToDate: 0,
    percentComplete: 0,
    projectedFinal: 0,
    variance: 0,
    variancePercent: 0,
    committedCosts: 0,
    pendingChanges: 0,
  }

  const scheduleMetrics = data?.scheduleMetrics || {
    percentComplete: 0,
    daysRemaining: 0,
    baselineEndDate: new Date(),
    projectedEndDate: new Date(),
    varianceDays: 0,
    milestonesDue: 0,
    milestonesOverdue: 0,
  }

  const rfiMetrics = data?.rfiMetrics || {
    total: 0,
    open: 0,
    overdue: 0,
    avgResponseDays: 0,
    submittedThisWeek: 0,
    closedThisWeek: 0,
  }

  const submittalMetrics = data?.submittalMetrics || {
    total: 0,
    pending: 0,
    underReview: 0,
    overdue: 0,
    approved: 0,
    approvedWithComments: 0,
  }

  const changeOrderMetrics = data?.changeOrderMetrics || {
    pendingCount: 0,
    pendingValue: 0,
    approvedCount: 0,
    approvedValue: 0,
    rejectedCount: 0,
    netChange: 0,
  }

  const actionItems = data?.actionItems || []

  const teamWorkload = data?.teamWorkload || []

  const riskIndicators = data?.riskIndicators || []

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: value >= 1000000 ? 'compact' : 'standard',
      maximumFractionDigits: value >= 1000000 ? 1 : 0,
    }).format(value)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 heading-section">
              <Briefcase className="h-6 w-6 text-primary" />
              Project Manager Dashboard
            </h2>
            <p className="text-muted-foreground">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-2 w-full mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground mt-2">Loading project data...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 heading-section">
            <Briefcase className="h-6 w-6 text-primary" />
            Project Manager Dashboard
          </h2>
          <p className="text-muted-foreground">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="flex gap-2">
          <Link to={projectId ? `/projects/${projectId}/reports` : '/reports'}>
            <Button variant="outline">
              <BarChart2 className="h-4 w-4 mr-2" />
              Reports
            </Button>
          </Link>
          <Link to={projectId ? `/projects/${projectId}/analytics` : '/analytics'}>
            <Button>
              <TrendingUp className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </Link>
        </div>
      </div>

      {/* Risk Indicators */}
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {riskIndicators.map((risk, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  risk.level === 'low' ? 'bg-green-500' :
                  risk.level === 'medium' ? 'bg-warning' : 'bg-red-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{risk.area}</span>
                    {risk.trend === 'up' && <ArrowUpRight className="h-3 w-3 text-success" />}
                    {risk.trend === 'down' && <ArrowDownRight className="h-3 w-3 text-error" />}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{risk.message}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Row - Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Budget */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Budget Status</p>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(budgetMetrics.costToDate)}</p>
            <p className="text-xs text-muted-foreground mb-2">
              of {formatCurrency(budgetMetrics.contractValue)} contract
            </p>
            <Progress value={budgetMetrics.percentComplete} className="h-2 mb-2" />
            <div className="flex items-center justify-between text-xs">
              <span>{budgetMetrics.percentComplete}% spent</span>
              <span className={budgetMetrics.variance > 0 ? 'text-error' : 'text-success'}>
                {budgetMetrics.variance > 0 ? '+' : ''}{formatCurrency(budgetMetrics.variance)} variance
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Schedule Status</p>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{scheduleMetrics.percentComplete}%</p>
            <p className="text-xs text-muted-foreground mb-2">
              {scheduleMetrics.daysRemaining} days remaining
            </p>
            <Progress value={scheduleMetrics.percentComplete} className="h-2 mb-2" />
            <div className="flex items-center justify-between text-xs">
              <span>Due: {format(scheduleMetrics.baselineEndDate, 'MMM d, yyyy')}</span>
              <span className={scheduleMetrics.varianceDays > 0 ? 'text-error' : 'text-success'}>
                {scheduleMetrics.varianceDays > 0 ? '+' : ''}{scheduleMetrics.varianceDays} days
              </span>
            </div>
          </CardContent>
        </Card>

        {/* RFIs */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Open RFIs</p>
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{rfiMetrics.open}</p>
            <p className="text-xs text-muted-foreground mb-2">
              {rfiMetrics.total} total
            </p>
            <div className="flex gap-2 mt-2">
              {rfiMetrics.overdue > 0 && (
                <Badge variant="secondary" className="bg-error-light text-red-800">
                  {rfiMetrics.overdue} overdue
                </Badge>
              )}
              <Badge variant="secondary" className="bg-info-light text-blue-800">
                {rfiMetrics.avgResponseDays.toFixed(1)}d avg response
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Submittals */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Pending Submittals</p>
              <FileCheck className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{submittalMetrics.pending + submittalMetrics.underReview}</p>
            <p className="text-xs text-muted-foreground mb-2">
              {submittalMetrics.total} total
            </p>
            <div className="flex gap-2 mt-2">
              {submittalMetrics.overdue > 0 && (
                <Badge variant="secondary" className="bg-error-light text-red-800">
                  {submittalMetrics.overdue} overdue
                </Badge>
              )}
              <Badge variant="secondary" className="bg-success-light text-green-800">
                {submittalMetrics.approved} approved
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Change Orders */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Change Orders</CardTitle>
              <Link to={projectId ? `/projects/${projectId}/change-orders` : '/change-orders'}>
                <Button variant="ghost" size="sm">
                  View All <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-warning-light rounded-lg">
                <div>
                  <p className="text-sm font-medium">Pending Approval</p>
                  <p className="text-xs text-muted-foreground">{changeOrderMetrics.pendingCount} items</p>
                </div>
                <p className="text-lg font-bold text-amber-700">
                  {formatCurrency(changeOrderMetrics.pendingValue)}
                </p>
              </div>
              <div className="flex items-center justify-between p-3 bg-success-light rounded-lg">
                <div>
                  <p className="text-sm font-medium">Approved</p>
                  <p className="text-xs text-muted-foreground">{changeOrderMetrics.approvedCount} items</p>
                </div>
                <p className="text-lg font-bold text-success-dark">
                  {formatCurrency(changeOrderMetrics.approvedValue)}
                </p>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Net Contract Change</span>
                  <span className={`font-bold ${changeOrderMetrics.netChange > 0 ? 'text-error' : 'text-success'}`}>
                    {changeOrderMetrics.netChange > 0 ? '+' : ''}{formatCurrency(changeOrderMetrics.netChange)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Items */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Action Items</CardTitle>
              <Link to={projectId ? `/projects/${projectId}/action-items` : '/action-items'}>
                <Button variant="ghost" size="sm">
                  View All <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {actionItems.map((item, index) => (
                <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
                  <CircleDot className={`h-4 w-4 mt-0.5 ${
                    item.priority === 'high' ? 'text-error' : 'text-warning'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{item.assignee}</span>
                      <span>•</span>
                      <span className={item.dueDate === 'Today' ? 'text-error' : ''}>
                        {item.dueDate}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Team Workload */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Team Workload</CardTitle>
              <Link to={projectId ? `/projects/${projectId}/team` : '/team'}>
                <Button variant="ghost" size="sm">
                  View All <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {teamWorkload.map((member, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{member.tasks} tasks</Badge>
                    {member.overdue > 0 && (
                      <Badge variant="secondary" className="bg-error-light text-red-800">
                        {member.overdue} overdue
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row - Financial Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="p-3 bg-surface rounded-lg">
              <p className="text-xs text-muted-foreground">Contract Value</p>
              <p className="text-lg font-bold">{formatCurrency(budgetMetrics.contractValue)}</p>
            </div>
            <div className="p-3 bg-surface rounded-lg">
              <p className="text-xs text-muted-foreground">Cost to Date</p>
              <p className="text-lg font-bold">{formatCurrency(budgetMetrics.costToDate)}</p>
            </div>
            <div className="p-3 bg-surface rounded-lg">
              <p className="text-xs text-muted-foreground">Committed Costs</p>
              <p className="text-lg font-bold">{formatCurrency(budgetMetrics.committedCosts)}</p>
            </div>
            <div className="p-3 bg-surface rounded-lg">
              <p className="text-xs text-muted-foreground">Pending Changes</p>
              <p className="text-lg font-bold text-warning">{formatCurrency(budgetMetrics.pendingChanges)}</p>
            </div>
            <div className="p-3 bg-surface rounded-lg">
              <p className="text-xs text-muted-foreground">Projected Final</p>
              <p className="text-lg font-bold">{formatCurrency(budgetMetrics.projectedFinal)}</p>
            </div>
            <div className="p-3 bg-surface rounded-lg">
              <p className="text-xs text-muted-foreground">Variance</p>
              <p className={`text-lg font-bold ${budgetMetrics.variance > 0 ? 'text-error' : 'text-success'}`}>
                {budgetMetrics.variance > 0 ? '+' : ''}{formatCurrency(budgetMetrics.variance)}
                <span className="text-xs ml-1">({budgetMetrics.variancePercent}%)</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <Link to={projectId ? `/projects/${projectId}/rfis/new` : '/rfis/new'}>
              <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1">
                <HelpCircle className="h-5 w-5" />
                <span className="text-xs">New RFI</span>
              </Button>
            </Link>
            <Link to={projectId ? `/projects/${projectId}/submittals/new` : '/submittals/new'}>
              <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1">
                <FileCheck className="h-5 w-5" />
                <span className="text-xs">New Submittal</span>
              </Button>
            </Link>
            <Link to={projectId ? `/projects/${projectId}/change-orders/new` : '/change-orders/new'}>
              <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1">
                <RefreshCw className="h-5 w-5" />
                <span className="text-xs">New CO</span>
              </Button>
            </Link>
            <Link to={projectId ? `/projects/${projectId}/meetings/new` : '/meetings/new'}>
              <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1">
                <Users className="h-5 w-5" />
                <span className="text-xs">New Meeting</span>
              </Button>
            </Link>
            <Link to={projectId ? `/projects/${projectId}/cost-tracking` : '/cost-tracking'}>
              <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1">
                <DollarSign className="h-5 w-5" />
                <span className="text-xs">Cost Tracking</span>
              </Button>
            </Link>
            <Link to={projectId ? `/projects/${projectId}/schedule` : '/schedule'}>
              <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1">
                <Calendar className="h-5 w-5" />
                <span className="text-xs">Schedule</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ProjectManagerDashboard
