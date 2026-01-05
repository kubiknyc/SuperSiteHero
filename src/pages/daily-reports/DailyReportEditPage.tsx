// File: /src/pages/daily-reports/DailyReportEditPage.tsx
// Edit daily report page

import { useNavigate, useParams, useBlocker } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { SmartLayout } from '@/components/layout/SmartLayout'
import { useDailyReport, useUpdateDailyReport } from '@/features/daily-reports/hooks/useDailyReports'
import { DailyReportForm, DailyReportFormData } from '@/features/daily-reports/components/DailyReportForm'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useOfflineReportStore } from '@/features/daily-reports/store/offlineReportStore'

export function DailyReportEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: report, isLoading, error } = useDailyReport(id)
  const updateMutation = useUpdateDailyReport()
  const store = useOfflineReportStore()

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [initialDataHash, setInitialDataHash] = useState<string>('')

  // Track changes by monitoring the draft report store
  useEffect(() => {
    if (report && !initialDataHash) {
      // Create a simple hash of the initial data
      const hash = JSON.stringify(report)
      // Use a timeout to defer the state update to avoid synchronous setState in effect
      const timeoutId = setTimeout(() => {
        setInitialDataHash(hash)
      }, 0)
      return () => clearTimeout(timeoutId)
    }
  }, [report, initialDataHash])

  useEffect(() => {
    if (store.draftReport && initialDataHash) {
      // Compare current state with initial state
      const currentHash = JSON.stringify(store.draftReport)
      const hasChanges = currentHash !== initialDataHash
      // Use a timeout to defer the state update to avoid synchronous setState in effect
      const timeoutId = setTimeout(() => {
        setHasUnsavedChanges(hasChanges)
      }, 0)
      return () => clearTimeout(timeoutId)
    }
  }, [store.draftReport, initialDataHash])

  // Browser beforeunload warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = '' // Required for Chrome
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsavedChanges])

  // React Router navigation blocker
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname
  )

  if (!id) {
    return (
      <SmartLayout title="Edit Daily Report">
        <div className="p-6">
          <div className="text-center py-12">
            <p className="text-error">Report ID not found</p>
          </div>
        </div>
      </SmartLayout>
    )
  }

  if (isLoading) {
    return (
      <SmartLayout title="Edit Daily Report">
        <div className="p-6">
          <div className="text-center py-12">
            <p className="text-muted">Loading report...</p>
          </div>
        </div>
      </SmartLayout>
    )
  }

  if (error || !report) {
    return (
      <SmartLayout title="Edit Daily Report">
        <div className="p-6">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-error mx-auto mb-4" />
            <p className="text-error">Error loading report: {error?.message}</p>
          </div>
        </div>
      </SmartLayout>
    )
  }

  // Only allow editing draft reports
  if (report.status !== 'draft') {
    return (
      <SmartLayout title="Edit Daily Report">
        <div className="p-6">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <p className="text-orange-600 font-semibold">Cannot edit submitted reports</p>
            <p className="text-secondary mt-2">Only draft reports can be edited</p>
          </div>
        </div>
      </SmartLayout>
    )
  }

  const handleSubmit = async (formData: DailyReportFormData) => {
    try {
      await updateMutation.mutateAsync({
        id: report.id,
        ...formData,
      })

      setHasUnsavedChanges(false) // Reset unsaved changes flag
      toast.success('Daily report updated successfully')
      navigate(`/daily-reports/${report.id}`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to update daily report')
    }
  }

  const handleSaveDraft = () => {
    setHasUnsavedChanges(false)
    toast.success('Draft saved successfully')
  }

  return (
    <SmartLayout title="Edit Daily Report">
      {/* Unsaved Changes Confirmation Modal */}
      {blocker.state === 'blocked' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-warning" />
                Unsaved Changes
              </CardTitle>
              <CardDescription>
                You have unsaved changes. Are you sure you want to leave?
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => blocker.reset()}
                className="flex-1"
              >
                Stay on Page
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setHasUnsavedChanges(false)
                  blocker.proceed()
                }}
                className="flex-1"
              >
                Leave Anyway
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="p-6 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground heading-page">Edit Daily Report</h1>
          <p className="text-secondary mt-2">
            Update daily activities, weather, and workforce information
          </p>
          {hasUnsavedChanges && (
            <p className="text-sm text-warning mt-1 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              You have unsaved changes
            </p>
          )}
        </div>

        <DailyReportForm
          projectId={report.project_id}
          initialData={report}
          onSubmit={handleSubmit}
          onSave={handleSaveDraft}
          isLoading={updateMutation.isPending}
        />
      </div>
    </SmartLayout>
  )
}
