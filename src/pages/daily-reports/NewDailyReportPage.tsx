import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMyProjects } from '@/features/projects/hooks/useProjects'
import { DailyReportForm } from '@/features/daily-reports/components/DailyReportForm'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { useState } from 'react'

export function NewDailyReportPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { data: projects } = useMyProjects()
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    searchParams.get('projectId') || ''
  )
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )

  const handleSave = () => {
    navigate('/daily-reports')
  }

  const handleCancel = () => {
    navigate('/daily-reports')
  }

  if (!selectedProjectId) {
    return (
      <AppLayout>
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">New Daily Report</h1>
            <p className="text-gray-600 mt-1">Create a new daily report for your project</p>
          </div>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Project
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select a project --</option>
                  {projects?.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {projects && projects.length === 0 && (
                <div className="flex gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-yellow-900">No projects available</p>
                    <p className="text-sm text-yellow-700">
                      Create a project first before creating daily reports.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Daily Report</h1>
          <p className="text-gray-600 mt-1">Document your daily activities and progress</p>
        </div>

        <DailyReportForm
          projectId={selectedProjectId}
          reportDate={selectedDate}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </AppLayout>
  )
}
