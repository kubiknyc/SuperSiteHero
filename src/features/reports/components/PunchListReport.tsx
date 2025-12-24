// File: /src/features/reports/components/PunchListReport.tsx
// Punch list status report

import { usePunchListReport } from '../hooks/useReports'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AlertCircle, Loader2 } from 'lucide-react'
import { formatPercentage } from '@/lib/utils/pdfExport'

interface PunchListReportProps {
  projectId: string | undefined
}

export function PunchListReport({ projectId }: PunchListReportProps) {
  const { data: report, isLoading, error } = usePunchListReport(projectId)

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
          <p className="text-secondary">Loading punch list data...</p>
        </CardContent>
      </Card>
    )
  }

  if (error || !report) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-error">Failed to load punch list report</p>
        </CardContent>
      </Card>
    )
  }

  const completionRate = report.totalItems > 0
    ? (((report.byStatus['completed'] || 0) + (report.byStatus['verified'] || 0)) / report.totalItems) * 100
    : 0

  return (
    <div id="punch-list-report" className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Punch List Status</CardTitle>
          <CardDescription>Project closeout and final quality tracking</CardDescription>
        </CardHeader>
      </Card>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Items</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{report.totalItems}</div>
            <p className="text-xs text-secondary mt-2">Punch list items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Completion Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{formatPercentage(completionRate)}</div>
            <p className="text-xs text-secondary mt-2">Items completed/verified</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Open Items</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {report.totalItems - (report.byStatus['completed'] || 0) - (report.byStatus['verified'] || 0)}
            </div>
            <p className="text-xs text-secondary mt-2">Requiring attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Rejection Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-error">{formatPercentage(report.rejectionRate)}</div>
            <p className="text-xs text-secondary mt-2">Items rejected</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(report.byStatus)
              .sort(([, a], [, b]) => b - a)
              .map(([status, count]) => (
                <div key={status}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-secondary capitalize">{status.replace('_', ' ')}</span>
                    <span className="text-sm font-bold text-foreground">{count}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        status === 'verified' || status === 'completed'
                          ? 'bg-success'
                          : status === 'rejected'
                            ? 'bg-error'
                            : 'bg-primary'
                      }`}
                      style={{ width: `${(count / report.totalItems) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* By Trade */}
      {report.byTrade.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance by Trade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium text-secondary">Trade</th>
                    <th className="text-right py-2 px-2 font-medium text-secondary">Items</th>
                    <th className="text-right py-2 px-2 font-medium text-secondary">Completion %</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byTrade.map((trade) => (
                    <tr key={trade.trade} className="border-b hover:bg-surface">
                      <td className="py-2 px-2 font-medium text-foreground">{trade.trade}</td>
                      <td className="py-2 px-2 text-right text-secondary">{trade.count}</td>
                      <td className="py-2 px-2 text-right">
                        <span
                          className={`font-semibold ${
                            trade.completionRate === 100
                              ? 'text-success'
                              : trade.completionRate >= 50
                                ? 'text-warning'
                                : 'text-error'
                          }`}
                        >
                          {formatPercentage(trade.completionRate)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* By Location */}
      {report.byLocation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Items by Location</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {report.byLocation.map((location) => (
                <div key={location.location} className="border rounded-lg p-3">
                  <p className="text-sm font-medium text-foreground">{location.location}</p>
                  <p className="text-2xl font-bold text-secondary mt-1">{location.count} items</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Average Days Open */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <p className="text-sm text-secondary">Average Days Open</p>
              <p className="text-2xl font-bold text-foreground">{report.averageDaysOpen.toFixed(1)}</p>
            </div>
            <div className="border-l-4 border-red-500 pl-4">
              <p className="text-sm text-secondary">Items Overdue</p>
              <p className="text-2xl font-bold text-error">{report.itemsOverdue}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
