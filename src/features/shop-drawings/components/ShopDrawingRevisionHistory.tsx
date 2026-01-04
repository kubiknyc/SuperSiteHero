// File: /src/features/shop-drawings/components/ShopDrawingRevisionHistory.tsx
// Display revision history timeline for a shop drawing

import { memo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  GitBranch,
  Plus,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow, format } from 'date-fns'
import { cn } from '@/lib/utils'
import { ShopDrawingStatusBadge } from './ShopDrawingStatusBadge'
import {
  useShopDrawingRevisions,
  useCreateShopDrawingRevision,
  type ShopDrawing,
} from '../hooks'

interface ShopDrawingRevisionHistoryProps {
  shopDrawingId: string
  currentStatus: string
  canCreateRevision?: boolean
}

export const ShopDrawingRevisionHistory = memo(function ShopDrawingRevisionHistory({
  shopDrawingId,
  currentStatus,
  canCreateRevision = true,
}: ShopDrawingRevisionHistoryProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [changeDescription, setChangeDescription] = useState('')

  const { data: revisions, isLoading } = useShopDrawingRevisions(shopDrawingId)
  const createRevision = useCreateShopDrawingRevision()

  // Can only create revision if status is revise_resubmit or rejected
  const canCreate =
    canCreateRevision && ['revise_resubmit', 'rejected'].includes(currentStatus)

  const handleCreateRevision = async () => {
    try {
      await createRevision.mutateAsync({
        shopDrawingId,
        changeDescription: changeDescription.trim() || undefined,
      })

      toast.success('New revision created successfully')
      setIsDialogOpen(false)
      setChangeDescription('')
    } catch (error) {
      toast.error('Failed to create revision: ' + (error as Error).message)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'approved_as_noted':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'revise_resubmit':
        return <Clock className="h-4 w-4 text-orange-600" />
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-medium">
            <GitBranch className="h-4 w-4" />
            Revision History
          </h3>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-6 w-6 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-medium">
          <GitBranch className="h-4 w-4" />
          Revision History
        </h3>
        {canCreate && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDialogOpen(true)}
          >
            <Plus className="mr-1 h-4 w-4" />
            New Revision
          </Button>
        )}
      </div>

      {!revisions || revisions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
          <FileText className="mx-auto h-8 w-8 mb-2" />
          <p className="text-sm">No revision history available</p>
          <p className="text-xs">This is the original submission</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />

          {/* Revision items */}
          <div className="space-y-4">
            {revisions.map((rev, index) => (
              <div
                key={rev.id}
                className={cn(
                  'relative flex gap-4 pl-8',
                  index === 0 && 'font-medium'
                )}
              >
                {/* Timeline dot */}
                <div
                  className={cn(
                    'absolute left-0 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-background',
                    index === 0
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/30'
                  )}
                >
                  {index === 0 ? (
                    <span className="text-xs font-bold">
                      {rev.revision_number}
                    </span>
                  ) : (
                    getStatusIcon(rev.review_status)
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm">
                      Rev {rev.revision_number}
                    </span>
                    <ShopDrawingStatusBadge
                      status={rev.review_status}
                      showLockIcon={false}
                    />
                    {index === 0 && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                        Current
                      </span>
                    )}
                  </div>

                  <div className="mt-1 text-sm text-muted-foreground">
                    {rev.date_submitted ? (
                      <span>
                        Submitted {formatDistanceToNow(new Date(rev.date_submitted), { addSuffix: true })}
                      </span>
                    ) : rev.created_at ? (
                      <span>
                        Created {formatDistanceToNow(new Date(rev.created_at), { addSuffix: true })}
                      </span>
                    ) : null}

                    {rev.date_returned && (
                      <span className="ml-2">
                        • Returned {format(new Date(rev.date_returned), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>

                  {rev.review_comments && (
                    <p className="mt-2 text-sm text-muted-foreground bg-muted/50 rounded p-2">
                      {rev.review_comments}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Revision Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Revision</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p>
                Creating a new revision will reset the status to "Not Submitted"
                and increment the revision number.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="change-description">
                What changed in this revision?
              </Label>
              <Textarea
                id="change-description"
                value={changeDescription}
                onChange={(e) => setChangeDescription(e.target.value)}
                placeholder="Describe the changes made in this revision..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={createRevision.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateRevision}
              disabled={createRevision.isPending}
            >
              {createRevision.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Revision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
})
