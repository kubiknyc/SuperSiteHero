/**
 * Create/Edit Inspection Page
 *
 * Page for scheduling new inspections or editing existing ones.
 */

import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { InspectionForm } from '@/features/inspections/components'
import {
  useInspection,
  useCreateInspection,
  useUpdateInspection,
} from '@/features/inspections/hooks'
import { useToast } from '@/lib/notifications/ToastContext'
import type { CreateInspectionInput } from '@/features/inspections/types'
import { ArrowLeft, ClipboardCheck } from 'lucide-react'

export function CreateInspectionPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { addToast } = useToast()

  const isEditMode = !!id
  const projectId = searchParams.get('project') || ''

  // Fetch existing inspection if editing
  const { data: existingInspection, isLoading } = useInspection(id)

  // Mutations
  const createMutation = useCreateInspection()
  const updateMutation = useUpdateInspection()

  const handleSubmit = (data: CreateInspectionInput) => {
    if (isEditMode && id) {
      updateMutation.mutate(
        { id, ...data },
        {
          onSuccess: () => {
            addToast(
              'success',
              'Inspection Updated',
              'The inspection has been updated successfully.'
            )
            navigate(`/inspections/${id}`)
          },
          onError: () => {
            addToast(
              'error',
              'Error',
              'Failed to update inspection. Please try again.'
            )
          },
        }
      )
    } else {
      createMutation.mutate(data, {
        onSuccess: (newInspection) => {
          addToast(
            'success',
            'Inspection Scheduled',
            'The inspection has been scheduled successfully.'
          )
          navigate(`/inspections/${newInspection.id}`)
        },
        onError: () => {
          addToast(
            'error',
            'Error',
            'Failed to schedule inspection. Please try again.'
          )
        },
      })
    }
  }

  const handleCancel = () => {
    if (isEditMode && id) {
      navigate(`/inspections/${id}`)
    } else {
      navigate('/inspections')
    }
  }

  // Show loading state when fetching existing inspection
  if (isEditMode && isLoading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-muted mt-4">Loading inspection...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Validate that we have a project ID
  const effectiveProjectId = isEditMode
    ? existingInspection?.project_id || projectId
    : projectId

  if (!effectiveProjectId) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center py-12 bg-card rounded-lg border">
            <ClipboardCheck className="h-12 w-12 text-gray-300 mx-auto" />
            <h3 className="text-lg font-medium text-foreground mt-4 heading-subsection">
              Project Required
            </h3>
            <p className="text-muted mt-2">
              Please select a project before scheduling an inspection.
            </p>
            <Link to="/inspections" className="mt-4 inline-block">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Inspections
              </Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-muted" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground heading-page">
              {isEditMode ? 'Edit Inspection' : 'Schedule New Inspection'}
            </h1>
            <p className="text-muted mt-1">
              {isEditMode
                ? 'Update the inspection details below'
                : 'Fill in the details to schedule an inspection'}
            </p>
          </div>
        </div>

        {/* Form Card */}
        <Card className="max-w-3xl">
          <CardContent className="pt-6">
            <InspectionForm
              projectId={effectiveProjectId}
              initialData={
                existingInspection
                  ? {
                      inspection_name: existingInspection.inspection_name,
                      inspection_type: existingInspection.inspection_type,
                      description: existingInspection.description || undefined,
                      scheduled_date: existingInspection.scheduled_date || undefined,
                      scheduled_time: existingInspection.scheduled_time || undefined,
                      inspector_name: existingInspection.inspector_name || undefined,
                      inspector_company:
                        existingInspection.inspector_company || undefined,
                      inspector_phone:
                        existingInspection.inspector_phone || undefined,
                      reminder_days_before:
                        existingInspection.reminder_days_before || undefined,
                      related_checklist_id:
                        existingInspection.related_checklist_id || undefined,
                      related_permit_id:
                        existingInspection.related_permit_id || undefined,
                    }
                  : undefined
              }
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={createMutation.isPending || updateMutation.isPending}
              submitLabel={isEditMode ? 'Update Inspection' : 'Schedule Inspection'}
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

export default CreateInspectionPage
