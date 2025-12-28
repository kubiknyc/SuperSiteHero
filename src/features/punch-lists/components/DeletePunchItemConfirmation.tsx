// File: /src/features/punch-lists/components/DeletePunchItemConfirmation.tsx
// Delete button component with confirmation for punch items

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useDeletePunchItemWithNotification } from '../hooks/usePunchItemsMutations'
import type { PunchItem } from '@/types/database'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface DeletePunchItemConfirmationProps {
  punchItem: PunchItem
  onSuccess?: () => void
}

export function DeletePunchItemConfirmation({
  punchItem,
  onSuccess,
}: DeletePunchItemConfirmationProps) {
  const deleteMutation = useDeletePunchItemWithNotification()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleDelete = () => {
    deleteMutation.mutate(punchItem.id, {
      onSuccess: () => {
        setShowDeleteDialog(false)
        onSuccess?.()
      },
      onError: () => {
        setShowDeleteDialog(false)
      },
    })
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowDeleteDialog(true)}
        disabled={deleteMutation.isPending}
        className="text-error hover:text-error-dark hover:bg-error-light"
        title="Delete punch item"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Punch Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{punchItem.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
