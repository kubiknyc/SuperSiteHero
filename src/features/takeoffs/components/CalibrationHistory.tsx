/**
 * CalibrationHistory Component
 * Shows calibration change history with revert capability
 */

import { useState } from 'react'
import { History, RotateCcw, Clock, User, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import {
  useCalibrationHistory,
  useRevertCalibration,
  type TakeoffCalibrationHistory,
} from '../hooks/useTakeoffCalibration'

export interface CalibrationHistoryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  calibrationId: string
  onRevert?: () => void
}

/**
 * CalibrationHistory Component
 *
 * Features:
 * - Lists all previous calibration changes
 * - Shows timestamp and user for each change
 * - Allows reverting to a previous calibration
 * - Displays accuracy comparison
 */
export function CalibrationHistory({
  open,
  onOpenChange,
  calibrationId,
  onRevert,
}: CalibrationHistoryProps) {
  const [revertingHistoryId, setRevertingHistoryId] = useState<string | null>(null)

  const { data: history, isLoading } = useCalibrationHistory(calibrationId)
  const revertCalibration = useRevertCalibration()

  const handleRevert = async (historyId: string) => {
    try {
      await revertCalibration.mutateAsync({
        calibrationId,
        historyId,
      })
      toast.success('Calibration reverted', {
        description: 'The calibration has been restored to the previous value',
      })
      onRevert?.()
      setRevertingHistoryId(null)
    } catch (error) {
      console.error('Failed to revert calibration:', error)
      toast.error('Failed to revert calibration')
    }
  }

  const getAccuracyBadge = (accuracy: string | null) => {
    switch (accuracy) {
      case 'high':
        return <Badge variant="default">High</Badge>
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>
      case 'low':
        return <Badge variant="outline">Low</Badge>
      default:
        return null
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Calibration History
            </DialogTitle>
            <DialogDescription>
              Previous calibration values for this page. Revert to any previous calibration if needed.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 border rounded-lg space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </div>
            ) : !history || history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No calibration history</p>
                <p className="text-sm">Changes will appear here after updates</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item, index) => (
                  <HistoryItem
                    key={item.id}
                    item={item}
                    isFirst={index === 0}
                    onRevert={() => setRevertingHistoryId(item.id)}
                    isReverting={revertCalibration.isPending}
                    getAccuracyBadge={getAccuracyBadge}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Revert Confirmation Dialog */}
      <AlertDialog
        open={!!revertingHistoryId}
        onOpenChange={(open) => !open && setRevertingHistoryId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert Calibration</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the calibration to the selected previous value.
              The current calibration will be saved to history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revertingHistoryId && handleRevert(revertingHistoryId)}
              disabled={revertCalibration.isPending}
            >
              {revertCalibration.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Reverting...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Revert
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

interface HistoryItemProps {
  item: TakeoffCalibrationHistory
  isFirst: boolean
  onRevert: () => void
  isReverting: boolean
  getAccuracyBadge: (accuracy: string | null) => React.ReactNode
}

function HistoryItem({
  item,
  isFirst,
  onRevert,
  isReverting,
  getAccuracyBadge,
}: HistoryItemProps) {
  const timeAgo = formatDistanceToNow(new Date(item.changed_at), { addSuffix: true })

  return (
    <div className="p-4 border rounded-lg space-y-3 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-semibold">
              {item.pixels_per_unit.toFixed(4)} px/{item.unit}
            </span>
            {getAccuracyBadge(item.accuracy)}
          </div>
          {item.real_world_distance && (
            <p className="text-sm text-muted-foreground">
              Reference: {item.real_world_distance} {item.unit}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRevert}
          disabled={isReverting}
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          Revert
        </Button>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{timeAgo}</span>
        </div>
        {item.changed_by && (
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>User updated</span>
          </div>
        )}
      </div>

      {item.change_reason && (
        <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
          {item.change_reason}
        </p>
      )}

      {isFirst && (
        <Badge variant="outline" className="text-xs">
          Most recent change
        </Badge>
      )}
    </div>
  )
}

export default CalibrationHistory
