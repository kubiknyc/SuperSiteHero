// File: /src/features/punch-lists/components/DeletePunchItemConfirmation.tsx
// Delete button component with confirmation for punch items

import { Trash2 } from 'lucide-react'
import { useDeletePunchItemWithNotification } from '../hooks/usePunchItemsMutations'
import type { PunchItem } from '@/types/database'
import { Button } from '@/components/ui/button'

interface DeletePunchItemConfirmationProps {
  punchItem: PunchItem
  onSuccess?: () => void
}

export function DeletePunchItemConfirmation({
  punchItem,
  onSuccess,
}: DeletePunchItemConfirmationProps) {
  const deleteMutation = useDeletePunchItemWithNotification()

  const handleDelete = () => {
    // Show browser confirm dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete "${punchItem.title}"?\n\nThis action cannot be undone.`
    )

    if (!confirmed) {
      return
    }

    deleteMutation.mutate(punchItem.id, {
      onSuccess: () => {
        onSuccess?.()
      },
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDelete}
      disabled={deleteMutation.isPending}
      className="text-error hover:text-error-dark hover:bg-error-light"
      title="Delete punch item"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
