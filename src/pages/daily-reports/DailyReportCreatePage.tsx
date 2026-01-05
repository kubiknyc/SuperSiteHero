// File: /src/pages/daily-reports/DailyReportCreatePage.tsx
// Create new daily report page

import { useNavigate, useSearchParams } from 'react-router-dom'
import { SmartLayout } from '@/components/layout/SmartLayout'
import { useCreateDailyReport } from '@/features/daily-reports/hooks/useDailyReports'
import { DailyReportForm, DailyReportFormData } from '@/features/daily-reports/components/DailyReportForm'
import { toast } from 'sonner'

export function DailyReportCreatePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId') || ''
  const createMutation = useCreateDailyReport()

  const handleSubmit = async (formData: DailyReportFormData) => {
    if (!projectId) {
      toast.error('Project ID is required')
      return
    }

    try {
      const result = await createMutation.mutateAsync({
        project_id: projectId,
        reporter_id: '', // Will be set by the server/context
        ...formData,
      } as any)

      toast.success('Daily report created successfully')
      navigate(`/daily-reports/${result.id}`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to create daily report')
    }
  }

  return (
    <SmartLayout title="New Daily Report">
      <div className="p-6 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground heading-page">Create Daily Report</h1>
          <p className="text-secondary mt-2">
            Document daily activities, weather, and workforce information
          </p>
        </div>

        <DailyReportForm
          projectId={projectId}
          onSubmit={handleSubmit}
          isLoading={createMutation.isPending}
        />
      </div>
    </SmartLayout>
  )
}
