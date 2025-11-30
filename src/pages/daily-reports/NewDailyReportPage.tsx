import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMyProjects } from '@/features/projects/hooks/useProjects'
import { DailyReportForm } from '@/features/daily-reports/components/DailyReportForm'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { validateDateNotFuture } from '@/features/daily-reports/validation/validationUtils'
import toast from 'react-hot-toast'

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
  const [errors, setErrors] = useState({
    project: '',
    date: '',
  })
  const [hasValidated, setHasValidated] = useState(false)

  const handleSave = () => {
    navigate('/daily-reports')
  }

  const handleCancel = () => {
    navigate('/daily-reports')
  }

  const validateBeforeProceed = (): boolean => {
    const newErrors = { project: '', date: '' }

    // Validate project selection
    if (!selectedProjectId) {
      newErrors.project = 'Please select a project'
    }

    // Validate date
    if (!selectedDate) {
      newErrors.date = 'Please select a date'
    } else if (!validateDateNotFuture(selectedDate)) {
      newErrors.date = 'Report date cannot be in the future'
    }

    setErrors(newErrors)

    // Show toast if there are errors
    if (newErrors.project || newErrors.date) {
      toast.error('Please fix validation errors before continuing')
      return false
    }

    return true
  }

  // Project selection screen - show if no project selected OR validation failed
  if (!selectedProjectId || (hasValidated && !validateBeforeProceed())) {
    return (
      <AppLayout>
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">New Daily Report</h1>
            <p className="text-gray-600 mt-1">Create a new daily report for your project</p>
          </div>

          <Card>
            <CardContent className="p-6 space-y-4">
              <FormField
                label="Select Project"
                htmlFor="project_select"
                required
                error={errors.project}
              >
                <select
                  id="project_select"
                  value={selectedProjectId}
                  onChange={(e) => {
                    setSelectedProjectId(e.target.value)
                    setErrors((prev) => ({ ...prev, project: '' }))
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.project ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">-- Select a project --</option>
                  {projects?.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                label="Report Date"
                htmlFor="report_date"
                required
                error={errors.date}
              >
                <input
                  id="report_date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value)
                    setErrors((prev) => ({ ...prev, date: '' }))
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.date ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </FormField>

              <button
                onClick={() => {
                  setHasValidated(true)
                  if (validateBeforeProceed()) {
                    // Allow rendering of the form
                    toast.success('Validation passed')
                  }
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                Continue to Report
              </button>

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
