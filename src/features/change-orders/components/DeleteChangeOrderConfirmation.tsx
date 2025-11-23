// File: /src/features/change-orders/components/DeleteChangeOrderConfirmation.tsx
// Delete change order confirmation with toast notifications

import { useDeleteChangeOrderWithNotification } from '../hooks/useChangeOrderMutations'
import { useToast } from '@/lib/notifications/ToastContext'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

interface DeleteChangeOrderConfirmationProps {
  changeOrderId: string
  changeOrderNumber: number | null
  onSuccess?: () => void
}

/**
 * DeleteChangeOrderConfirmation Component
 * Shows a confirmation dialog via toast before deleting a change order
 * Handles the deletion with automatic success/error notifications
 */
export function DeleteChangeOrderConfirmation({
  changeOrderId,
  changeOrderNumber,
  onSuccess,
}: DeleteChangeOrderConfirmationProps) {
  const deleteChangeOrder = useDeleteChangeOrderWithNotification()
  const { addToast } = useToast()

  const handleDelete = () => {
    // Show confirmation toast with action button
    const displayNumber = changeOrderNumber ? `#${changeOrderNumber}` : 'this change order'
    addToast('warning', 'Confirm Delete', `Delete change order ${displayNumber}? This cannot be undone.`, {
      action: {
        label: 'Yes, delete',
        onClick: async () => {
          try {
            await deleteChangeOrder.mutateAsync(changeOrderId)
            // Success toast shown automatically by mutation hook
            onSuccess?.()
          } catch (error) {
            // Error toast shown automatically by mutation hook
            console.error('Failed to delete change order:', error)
          }
        },
      },
    })
  }

  return (
    <Button
      onClick={handleDelete}
      disabled={deleteChangeOrder.isPending}
      variant="ghost"
      size="sm"
      className="text-red-600 hover:text-red-700 hover:bg-red-50"
      title="Delete change order"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
