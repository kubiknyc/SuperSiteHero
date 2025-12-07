// File: /src/pages/reports/ReportsPage.tsx
// Main reports page with report selection and display

import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, Printer, BarChart3, FileText, TrendingUp, ClipboardList, Shield } from 'lucide-react'
import { exportToPDF, exportToCSV } from '@/lib/utils/pdfExport'
import { useMyProjects } from '@/features/projects/hooks/useProjects'
import {
  ProjectHealthReport,
  FinancialSummaryReport,
  PunchListReport,
  SafetyIncidentReport,
} from '@/features/reports/components'

type ReportType = 'health' | 'financial' | 'punchlist' | 'safety'

const reportIcons: Record<ReportType, typeof FileText> = {
  health: TrendingUp,
  financial: FileText,
  punchlist: ClipboardList,
  safety: Shield,
}

export function ReportsPage() {
  const { data: projects, isLoading: projectsLoading } = useMyProjects()
  const [selectedReport, setSelectedReport] = useState<ReportType>('health')
  const [selectedProjectId, setSelectedProjectId] = useState('')

  // Use selected project or first active project
  const projectId = selectedProjectId || projects?.find((p) => p.status === 'active')?.id || projects?.[0]?.id || ''
  const selectedProject = projects?.find((p) => p.id === projectId)

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
    const projectName = selectedProject?.name?.replace(/\s+/g, '-') || 'project'
    const filename = `${projectName}-${reportNames[selectedReport]}-${new Date().toISOString().split('T')[0]}`

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
                <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                <Select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  disabled={projectsLoading}
                >
                  <option value="">
                    {projectsLoading ? 'Loading projects...' : 'Select a project'}
                  </option>
                  {projects?.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                <Select
                  value={selectedReport}
                  onChange={(e) => setSelectedReport(e.target.value as ReportType)}
                >
                  {reportOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Report Type Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              {reportOptions.map((option) => {
                const Icon = reportIcons[option.value as ReportType]
                const isSelected = selectedReport === option.value
                return (
                  <button
                    key={option.value}
                    onClick={() => setSelectedReport(option.value as ReportType)}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`h-5 w-5 mb-1 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                    <p className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
                      {option.label.split(' ')[0]}
                    </p>
                  </button>
                )
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={handlePrint} variant="outline" disabled={!projectId}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button onClick={handleExportPDF} variant="outline" disabled={!projectId}>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
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

        {!projectId && !projectsLoading && (
          <Card>
            <CardContent className="p-12 text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Select a project to generate reports</p>
              <p className="text-sm text-gray-400 mt-2">
                {projects?.length === 0
                  ? 'No projects available. Create a project first.'
                  : 'Choose from the project dropdown above'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
