/**
 * Scheduled Report Form Page
 *
 * Page for creating and editing scheduled report delivery.
 */

import { useParams, Link } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ScheduledReportForm } from '@/features/reports/components/ScheduledReportForm'
import { Calendar, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ScheduledReportFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEditing = !!id

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link to="/reports">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Reports
            </Link>
          </Button>

          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2 heading-page">
            <Calendar className="h-7 w-7 text-primary" />
            {isEditing ? 'Edit Scheduled Report' : 'Create Scheduled Report'}
          </h1>
          <p className="text-secondary mt-1">
            {isEditing
              ? 'Update the schedule configuration for automated report delivery.'
              : 'Set up automated report generation and email delivery.'}
          </p>
        </div>

        {/* Form */}
        <ScheduledReportForm scheduleId={id} />
      </div>
    </AppLayout>
  )
}

export default ScheduledReportFormPage
