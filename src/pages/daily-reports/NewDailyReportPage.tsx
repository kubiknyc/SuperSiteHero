import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useSelectedProject } from '@/hooks/useSelectedProject'
import { DailyReportForm } from '@/features/daily-reports/components/DailyReportForm'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { AlertCircle, Copy, Calendar, Users, Wrench, Package, UserPlus, AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { validateDateNotFuture } from '@/features/daily-reports/validation/validationUtils'
import { usePreviousDayReport, extractCopyableFields } from '@/features/daily-reports/hooks/useDailyReports'
import { useDailyReportFullData } from '@/features/daily-reports/hooks/useDailyReportRelatedData'
import { useOfflineReportStore } from '@/features/daily-reports/store/offlineReportStore'
import { useDuplicateDetection } from '@/features/daily-reports/hooks/useDuplicateDetection'
import toast from 'react-hot-toast'

export function NewDailyReportPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { selectedProjectId, setSelectedProjectId, projects } = useSelectedProject()

  // Sync from URL on mount if URL has projectId
  useState(() => {
    const urlProjectId = searchParams.get('projectId')
    if (urlProjectId && urlProjectId !== selectedProjectId) {
      setSelectedProjectId(urlProjectId)
    }
  })
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [errors, setErrors] = useState({
    project: '',
    date: '',
  })
  const [hasValidated, setHasValidated] = useState(false)
  const [copyFromPrevious, setCopyFromPrevious] = useState(false)
  const [includeRelatedData, setIncludeRelatedData] = useState(true)

  // Fetch previous day's report for copy functionality
  const { data: previousReport, isLoading: isPreviousLoading } = usePreviousDayReport(
    selectedProjectId || undefined,
    selectedDate
  )

  // Fetch related data for the previous report (workforce, equipment, deliveries, visitors)
  const previousReportRelatedData = useDailyReportFullData(previousReport?.id)

  // Check for duplicate reports on the same date
  const { data: duplicateResult } = useDuplicateDetection(selectedProjectId, selectedDate)

  const store = useOfflineReportStore()

  // Handle copying from previous report
  const handleCopyFromPrevious = () => {
    if (previousReport) {
      const copyableFields = extractCopyableFields(previousReport)

      // If includeRelatedData is true, pass the related data to copy
      const relatedData = includeRelatedData ? {
        workforce: previousReportRelatedData.workforce.map((w) => ({
          id: w.id,
          entry_type: (w.entry_type || 'team') as 'team' | 'individual',
          team_name: w.team_name || undefined,
          worker_name: w.worker_name || undefined,
          trade: w.trade || undefined,
          worker_count: w.worker_count || undefined,
          activity: w.activity || undefined,
          hours_worked: w.hours_worked || undefined,
        })),
        equipment: previousReportRelatedData.equipment.map((e) => ({
          id: e.id,
          equipment_type: e.equipment_type,
          equipment_description: e.equipment_description || undefined,
          quantity: e.quantity || 1,
          owner: e.owner || undefined,
          hours_used: e.hours_used || undefined,
          notes: e.notes || undefined,
        })),
        deliveries: previousReportRelatedData.deliveries.map((d) => ({
          id: d.id,
          material_description: d.material_description,
          quantity: d.quantity || undefined,
          vendor: d.vendor || undefined,
          delivery_ticket_number: d.delivery_ticket_number || undefined,
          delivery_time: undefined, // Don't copy time, it's day-specific
          notes: d.notes || undefined,
        })),
        visitors: previousReportRelatedData.visitors.map((v) => ({
          id: v.id,
          visitor_name: v.visitor_name,
          company: v.company || undefined,
          purpose: v.purpose || undefined,
          arrival_time: undefined, // Don't copy times, they're day-specific
          departure_time: undefined,
        })),
      } : undefined

      store.initializeFromPreviousReport(selectedProjectId, selectedDate, copyableFields, relatedData)
      setCopyFromPrevious(true)

      const relatedCounts = relatedData ? [
        relatedData.workforce.length > 0 ? `${relatedData.workforce.length} workforce` : '',
        relatedData.equipment.length > 0 ? `${relatedData.equipment.length} equipment` : '',
        relatedData.deliveries.length > 0 ? `${relatedData.deliveries.length} deliveries` : '',
        relatedData.visitors.length > 0 ? `${relatedData.visitors.length} visitors` : '',
      ].filter(Boolean).join(', ') : ''

      const message = relatedCounts
        ? `Copied data from ${previousReport.report_date} including ${relatedCounts}`
        : `Copied data from report dated ${previousReport.report_date}`
      toast.success(message)
    }
  }

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
            <h1 className="text-3xl font-bold text-foreground heading-page">New Daily Report</h1>
            <p className="text-secondary mt-1">Create a new daily report for your project</p>
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
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-primary ${
                    errors.project ? 'border-red-500' : 'border-input'
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
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-primary ${
                    errors.date ? 'border-red-500' : 'border-input'
                  }`}
                />
              </FormField>

              {/* Duplicate Report Warning */}
              {duplicateResult?.hasDuplicate && duplicateResult.existingReport && (
                <div className="p-4 bg-warning-light border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-amber-900">Report Already Exists</p>
                      <p className="text-sm text-amber-700 mb-2">
                        A daily report for <strong>{selectedDate}</strong> already exists for this project.
                        Status: <strong>{duplicateResult.existingReport.status}</strong>
                      </p>
                      <div className="flex gap-2">
                        <Link
                          to={`/daily-reports/${duplicateResult.existingReport.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md bg-amber-100 text-amber-800 hover:bg-amber-200"
                        >
                          View Existing Report
                        </Link>
                        {duplicateResult.existingReport.status === 'draft' && (
                          <Link
                            to={`/daily-reports/${duplicateResult.existingReport.id}/edit`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700"
                          >
                            Edit Existing Report
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Copy from Previous Report Button */}
              {selectedProjectId && previousReport && (
                <div className="p-4 bg-primary-50 border border-primary-200 dark:bg-primary-950/20 dark:border-primary-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-primary dark:text-primary-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-primary-900 dark:text-primary-100">Previous Report Available</p>
                      <p className="text-sm text-primary-700 dark:text-primary-300 mb-2">
                        Copy weather, notes, and other details from the report dated{' '}
                        <strong>{previousReport.report_date}</strong>
                      </p>

                      {/* Related data summary */}
                      {!previousReportRelatedData.isLoading && (
                        <div className="flex flex-wrap gap-2 mb-3 text-xs text-primary dark:text-primary-400">
                          {previousReportRelatedData.workforce.length > 0 && (
                            <span className="inline-flex items-center gap-1 bg-primary-100 dark:bg-primary-950 px-2 py-0.5 rounded">
                              <Users className="h-3 w-3" />
                              {previousReportRelatedData.workforce.length} workforce
                            </span>
                          )}
                          {previousReportRelatedData.equipment.length > 0 && (
                            <span className="inline-flex items-center gap-1 bg-primary-100 dark:bg-primary-950 px-2 py-0.5 rounded">
                              <Wrench className="h-3 w-3" />
                              {previousReportRelatedData.equipment.length} equipment
                            </span>
                          )}
                          {previousReportRelatedData.deliveries.length > 0 && (
                            <span className="inline-flex items-center gap-1 bg-primary-100 dark:bg-primary-950 px-2 py-0.5 rounded">
                              <Package className="h-3 w-3" />
                              {previousReportRelatedData.deliveries.length} deliveries
                            </span>
                          )}
                          {previousReportRelatedData.visitors.length > 0 && (
                            <span className="inline-flex items-center gap-1 bg-primary-100 dark:bg-primary-950 px-2 py-0.5 rounded">
                              <UserPlus className="h-3 w-3" />
                              {previousReportRelatedData.visitors.length} visitors
                            </span>
                          )}
                        </div>
                      )}

                      {/* Option to include related data */}
                      {(previousReportRelatedData.workforce.length > 0 ||
                        previousReportRelatedData.equipment.length > 0 ||
                        previousReportRelatedData.deliveries.length > 0 ||
                        previousReportRelatedData.visitors.length > 0) && (
                        <label className="flex items-center gap-2 mb-3 text-sm text-primary-700 dark:text-primary-300">
                          <input
                            type="checkbox"
                            checked={includeRelatedData}
                            onChange={(e) => setIncludeRelatedData(e.target.checked)}
                            className="rounded border-primary-300 dark:border-primary-700 text-primary dark:text-primary-400 focus:ring-primary dark:focus:ring-primary"
                          />
                          Include workforce, equipment, deliveries & visitors
                        </label>
                      )}

                      <button
                        type="button"
                        onClick={handleCopyFromPrevious}
                        disabled={copyFromPrevious || previousReportRelatedData.isLoading}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md ${
                          copyFromPrevious
                            ? 'bg-success-light text-green-800 cursor-default'
                            : 'bg-primary text-white hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/80'
                        }`}
                      >
                        <Copy className="h-4 w-4" />
                        {copyFromPrevious ? 'Data Copied!' : 'Copy from Previous'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {selectedProjectId && !previousReport && !isPreviousLoading && (
                <div className="p-4 bg-surface border border-border rounded-lg">
                  <p className="text-sm text-secondary">
                    No previous reports found for this project. You'll start with a fresh report.
                  </p>
                </div>
              )}

              <button
                onClick={() => {
                  setHasValidated(true)
                  if (validateBeforeProceed()) {
                    // Allow rendering of the form
                    toast.success('Validation passed')
                  }
                }}
                className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-primary font-medium"
              >
                Continue to Report
              </button>

              {projects && projects.length === 0 && (
                <div className="flex gap-3 p-4 bg-warning-light border border-yellow-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-warning flex-shrink-0" />
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
          <h1 className="text-3xl font-bold text-foreground heading-page">New Daily Report</h1>
          <p className="text-secondary mt-1">Document your daily activities and progress</p>
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
