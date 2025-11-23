// File: /src/features/reports/components/SafetyIncidentReport.tsx
// Safety incident and compliance report

import { useState } from 'react'
import { useSafetyIncidentReport } from '../hooks/useReports'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AlertCircle, AlertTriangle, Loader2, Download } from 'lucide-react'
import { formatReportDate } from '@/lib/utils/pdfExport'
import { subDays, format } from 'date-fns'

interface SafetyIncidentReportProps {
  projectId: string | undefined
}

export function SafetyIncidentReport({ projectId }: SafetyIncidentReportProps) {
  const today = new Date()
  const thirtyDaysAgo = subDays(today, 30)

  const [startDate, setStartDate] = useState(format(thirtyDaysAgo, 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(today, 'yyyy-MM-dd'))

  const { data: report, isLoading, error } = useSafetyIncidentReport(projectId, startDate, endDate)

  if (!projectId) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No project selected</p>
        </CardContent>
      </Card>
    )
  }

  const handleExport = () => {
    // Placeholder for export functionality
    console.log('Export report:', { startDate, endDate })
  }

  return (
    <div id="safety-incident-report" className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-3xl">Safety Incident Report</CardTitle>
            <CardDescription>Compliance and incident tracking</CardDescription>
          </div>
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </CardHeader>
      </Card>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Report Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Loading safety data...</p>
          </CardContent>
        </Card>
      ) : error || !report ? (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-600">Failed to load safety report</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardDescription>Total Incidents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${report.totalIncidents > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {report.totalIncidents}
                </div>
                <p className="text-xs text-gray-600 mt-2">Reported incidents</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription>OSHA Reportable</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${report.oSHAReportable > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {report.oSHAReportable}
                </div>
                <p className="text-xs text-gray-600 mt-2">OSHA reportable incidents</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription>Open Incidents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${report.openIncidents > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {report.openIncidents}
                </div>
                <p className="text-xs text-gray-600 mt-2">Under investigation</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription>Avg Resolution Time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{report.averageResolutionTime.toFixed(1)}d</div>
                <p className="text-xs text-gray-600 mt-2">Days to close</p>
              </CardContent>
            </Card>
          </div>

          {/* Incident Type Breakdown */}
          {Object.keys(report.byType).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Incidents by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(report.byType)
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, count]) => (
                      <div key={type}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700 capitalize">{type.replace('_', ' ')}</span>
                          <span className="text-sm font-bold text-gray-900">{count}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-red-600 h-2 rounded-full"
                            style={{ width: `${(count / report.totalIncidents) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Severity Breakdown */}
          {Object.keys(report.bySeverity).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Incidents by Severity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(report.bySeverity)
                    .sort(([, a], [, b]) => b - a)
                    .map(([severity, count]) => (
                      <div
                        key={severity}
                        className={`p-4 rounded-lg border-l-4 ${
                          severity === 'critical'
                            ? 'border-l-red-600 bg-red-50'
                            : severity === 'major'
                              ? 'border-l-orange-600 bg-orange-50'
                              : severity === 'minor'
                                ? 'border-l-yellow-600 bg-yellow-50'
                                : 'border-l-blue-600 bg-blue-50'
                        }`}
                      >
                        <p className="text-xs font-semibold text-gray-600 uppercase">{severity}</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Safety Status */}
          {report.totalIncidents === 0 && (
            <div className="alert alert-success rounded-lg p-4 bg-green-50 border border-green-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-900">Excellent Safety Record</p>
                  <p className="text-sm text-green-800 mt-1">
                    No incidents reported during the selected period. Keep up the great work!
                  </p>
                </div>
              </div>
            </div>
          )}

          {report.totalIncidents > 0 && report.openIncidents > 0 && (
            <div className="alert alert-warning rounded-lg p-4 bg-yellow-50 border border-yellow-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-yellow-900">Open Incidents</p>
                  <p className="text-sm text-yellow-800 mt-1">
                    {report.openIncidents} incident(s) are still under investigation. Follow up on corrective actions.
                  </p>
                </div>
              </div>
            </div>
          )}

          {report.oSHAReportable > 0 && (
            <div className="alert alert-danger rounded-lg p-4 bg-red-50 border border-red-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-900">OSHA Reportable Incidents</p>
                  <p className="text-sm text-red-800 mt-1">
                    {report.oSHAReportable} incident(s) were OSHA reportable. Ensure all documentation is complete and submitted.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
