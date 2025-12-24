// File: /src/features/projects/components/DeleteProjectConfirmation.tsx
// Delete project confirmation with toast notifications

import { useDeleteProjectWithNotification } from '../hooks/useProjectsMutations'
import { useToast } from '@/lib/notifications/ToastContext'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

interface DeleteProjectConfirmationProps {
  projectId: string
  projectName: string
  onSuccess?: () => void
}

/**
 * DeleteProjectConfirmation Component
 * Shows a confirmation dialog via toast before deleting a project
 * Handles the deletion with automatic success/error notifications
 */
export function DeleteProjectConfirmation({
  projectId,
  projectName,
  onSuccess,
}: DeleteProjectConfirmationProps) {
  const deleteProject = useDeleteProjectWithNotification()
  const { addToast } = useToast()

  const handleDelete = () => {
    // Show confirmation toast with action button
    addToast('warning', 'Confirm Delete', `Delete project "${projectName}"? This cannot be undone.`, {
      action: {
        label: 'Yes, delete',
        onClick: async () => {
          try {
            await deleteProject.mutateAsync(projectId)
            // Success toast shown automatically by mutation hook
            onSuccess?.()
          } catch (error) {
            // Error toast shown automatically by mutation hook
            console.error('Failed to delete project:', error)
          }
        },
      },
    })
  }

  return (
    <Button
      onClick={handleDelete}
      disabled={deleteProject.isPending}
      variant="ghost"
      size="sm"
      className="text-error hover:text-error-dark hover:bg-error-light"
      title="Delete project"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
