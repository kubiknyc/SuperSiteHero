// File: /src/features/reports/components/ProjectHealthReport.tsx
// Project health dashboard showing schedule, budget, and status

import { useProjectHealthReport } from '../hooks/useReports'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, TrendingUp, Loader2 } from 'lucide-react'
import { formatReportDate, formatCurrency } from '@/lib/utils/pdfExport'

interface ProjectHealthReportProps {
  projectId: string | undefined
}

export function ProjectHealthReport({ projectId }: ProjectHealthReportProps) {
  const { data: report, isLoading, error } = useProjectHealthReport(projectId)

  if (!projectId) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-disabled mx-auto mb-4" />
          <p className="text-secondary">No project selected</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="h-12 w-12 text-disabled mx-auto mb-4 animate-spin" />
          <p className="text-secondary">Loading project health...</p>
        </CardContent>
      </Card>
    )
  }

  if (error || !report) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-error">Failed to load project health</p>
        </CardContent>
      </Card>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success-light text-green-800'
      case 'on_hold':
        return 'bg-warning-light text-yellow-800'
      case 'completed':
        return 'bg-info-light text-blue-800'
      case 'archived':
        return 'bg-muted text-foreground'
      default:
        return 'bg-muted text-foreground'
    }
  }

  const isBudgetOverrun = report.budgetVariance && report.budgetVariance > 0

  return (
    <div id="project-health-report" className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl">{report.projectName}</CardTitle>
              <CardDescription className="mt-2">Project Health Dashboard</CardDescription>
            </div>
            <Badge className={getStatusColor(report.status)}>
              {report.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Completion */}
        <Card>
          <CardHeader>
            <CardDescription>Completion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{report.completionPercentage.toFixed(0)}%</div>
            <p className="text-xs text-secondary mt-2">Overall progress</p>
          </CardContent>
        </Card>

        {/* Schedule Variance */}
        <Card>
          <CardHeader>
            <CardDescription>Schedule</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${report.scheduleVariance && report.scheduleVariance < 0 ? 'text-orange-600' : 'text-success'}`}>
              {report.scheduleVariance ? `${report.scheduleVariance.toFixed(0)} days` : 'N/A'}
            </div>
            <p className="text-xs text-secondary mt-2">Variance from baseline</p>
          </CardContent>
        </Card>

        {/* Budget */}
        <Card>
          <CardHeader>
            <CardDescription>Budget Status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${isBudgetOverrun ? 'text-error' : 'text-success'}`}>
              {report.budgetVariance ? `${report.budgetVariance.toFixed(1)}%` : 'N/A'}
            </div>
            <p className="text-xs text-secondary mt-2">{isBudgetOverrun ? 'Over budget' : 'Within budget'}</p>
          </CardContent>
        </Card>

        {/* Contract Value */}
        <Card>
          <CardHeader>
            <CardDescription>Contract Value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatCurrency(report.contractValue)}</div>
            <p className="text-xs text-secondary mt-2">Total contract amount</p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-secondary">Start Date</p>
              <p className="text-lg font-semibold text-foreground">{formatReportDate(report.startDate)}</p>
            </div>
            <div>
              <p className="text-sm text-secondary">Estimated End Date</p>
              <p className="text-lg font-semibold text-foreground">{formatReportDate(report.estimatedEndDate)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Open Items Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Open Items</CardTitle>
          <CardDescription>Outstanding items requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <p className="text-sm text-secondary">RFIs</p>
              <p className="text-2xl font-bold text-primary">{report.openItems.rfis}</p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <p className="text-sm text-secondary">Change Orders</p>
              <p className="text-2xl font-bold text-purple-600">{report.openItems.changeOrders}</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <p className="text-sm text-secondary">Submittals</p>
              <p className="text-2xl font-bold text-success">{report.openItems.submittals}</p>
            </div>
            <div className="border-l-4 border-orange-500 pl-4">
              <p className="text-sm text-secondary">Punch Items</p>
              <p className="text-2xl font-bold text-orange-600">{report.openItems.punchListItems}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {isBudgetOverrun && (
        <div className="alert alert-danger rounded-lg p-4 bg-error-light border border-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-error mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-900">Budget Alert</p>
              <p className="text-sm text-red-800 mt-1">
                Project is {report.budgetVariance?.toFixed(1)}% over budget. Current contract value exceeds budget allocation.
              </p>
            </div>
          </div>
        </div>
      )}

      {report.openItems.rfis > 5 || report.openItems.changeOrders > 5 && (
        <div className="alert alert-warning rounded-lg p-4 bg-warning-light border border-yellow-200">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-yellow-900">High Open Items</p>
              <p className="text-sm text-yellow-800 mt-1">
                Multiple RFIs and change orders are pending. Review and expedite approvals as needed.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
