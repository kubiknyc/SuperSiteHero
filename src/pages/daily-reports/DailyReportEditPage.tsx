// File: /src/pages/daily-reports/DailyReportEditPage.tsx
// Edit daily report page

import { useNavigate, useParams } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { useDailyReport, useUpdateDailyReport } from '@/features/daily-reports/hooks/useDailyReports'
import { DailyReportForm, DailyReportFormData } from '@/features/daily-reports/components/DailyReportForm'
import { AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export function DailyReportEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: report, isLoading, error } = useDailyReport(id)
  const updateMutation = useUpdateDailyReport()

  if (!id) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <p className="text-red-600">Report ID not found</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <p className="text-gray-500">Loading report...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error || !report) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">Error loading report: {error?.message}</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Only allow editing draft reports
  if (report.status !== 'draft') {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <p className="text-orange-600 font-semibold">Cannot edit submitted reports</p>
            <p className="text-gray-600 mt-2">Only draft reports can be edited</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  const handleSubmit = async (formData: DailyReportFormData) => {
    try {
      await updateMutation.mutateAsync({
        id: report.id,
        ...formData,
      })

      toast.success('Daily report updated successfully')
      navigate(`/daily-reports/${report.id}`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to update daily report')
    }
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Daily Report</h1>
          <p className="text-gray-600 mt-2">
            Update daily activities, weather, and workforce information
          </p>
        </div>

        <DailyReportForm
          projectId={report.project_id}
          initialData={report}
          onSubmit={handleSubmit}
          isLoading={updateMutation.isPending}
        />
      </div>
    </AppLayout>
  )
}
