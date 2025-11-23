// File: /src/pages/reports/ReportsPage.tsx
// Main reports page with report selection and display

import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Download, Printer, BarChart3 } from 'lucide-react'
import { exportToPDF, exportToCSV } from '@/lib/utils/pdfExport'
import {
  ProjectHealthReport,
  FinancialSummaryReport,
  PunchListReport,
  SafetyIncidentReport,
} from '@/features/reports/components'

type ReportType = 'health' | 'financial' | 'punchlist' | 'safety'

export function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType>('health')
  const [projectId, setProjectId] = useState('')

  const handleExportPDF = () => {
    const reportIds: Record<ReportType, string> = {
      health: 'project-health-report',
      financial: 'financial-summary-report',
      punchlist: 'punch-list-report',
      safety: 'safety-incident-report',
    }

    const reportNames: Record<ReportType, string> = {
      health: 'project-health',
      financial: 'financial-summary',
      punchlist: 'punch-list',
      safety: 'safety-incident',
    }

    const elementId = reportIds[selectedReport]
    const filename = `${reportNames[selectedReport]}-${new Date().toISOString().split('T')[0]}`

    exportToPDF(elementId, filename)
  }

  const handlePrint = () => {
    window.print()
  }

  const reportOptions = [
    { value: 'health', label: 'Project Health Dashboard' },
    { value: 'financial', label: 'Financial Summary' },
    { value: 'punchlist', label: 'Punch List Status' },
    { value: 'safety', label: 'Safety Incident Report' },
  ]

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Generate and view project reports</p>
        </div>

        {/* Report Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Report Type</label>
                <Select
                  value={selectedReport}
                  onChange={(e) => setSelectedReport(e.target.value as ReportType)}
                  className="mt-1"
                >
                  {reportOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Project (Optional)</label>
                <Input
                  type="text"
                  placeholder="Enter project ID"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={handlePrint} variant="outline">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button onClick={handleExportPDF} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <div className="flex-1" />
              <Button disabled={!projectId}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Content */}
        {projectId && (
          <div className="no-print">
            {selectedReport === 'health' && <ProjectHealthReport projectId={projectId} />}
            {selectedReport === 'financial' && <FinancialSummaryReport projectId={projectId} />}
            {selectedReport === 'punchlist' && <PunchListReport projectId={projectId} />}
            {selectedReport === 'safety' && <SafetyIncidentReport projectId={projectId} />}
          </div>
        )}

        {!projectId && (
          <Card>
            <CardContent className="p-12 text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Select a project to generate reports</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
