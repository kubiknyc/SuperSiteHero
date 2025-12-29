/**
 * CalibrationDialog Component
 * Dialog for calibrating scale on PDF drawings with database persistence
 */

import { useState, useEffect } from 'react'
import { Ruler, Check, X, Copy, History, CheckCircle2, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import type { Point, ScaleFactor, LinearUnit } from '../utils/measurements'
import { distanceBetweenPoints } from '../utils/measurements'
import {
  useCalibration,
  useDocumentCalibrations,
  useSaveCalibration,
  useCopyCalibration,
  calibrationToScaleFactor,
} from '../hooks/useTakeoffCalibration'

export interface CalibrationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  calibrationPoints?: Point[]
  onCalibrationComplete: (scale: ScaleFactor) => void
  /** Document ID for persistence */
  documentId?: string
  /** Current page number (1-indexed) */
  pageNumber?: number
  /** Total number of pages in the document */
  totalPages?: number
  /** Callback when history is requested */
  onShowHistory?: (calibrationId: string) => void
}

const COMMON_UNITS: Array<{ value: LinearUnit; label: string }> = [
  { value: 'in', label: 'Inches' },
  { value: 'ft', label: 'Feet' },
  { value: 'yd', label: 'Yards' },
  { value: 'm', label: 'Meters' },
  { value: 'cm', label: 'Centimeters' },
]

/**
 * CalibrationDialog Component
 *
 * Allows users to calibrate scale by:
 * 1. Drawing a line on the canvas
 * 2. Entering the known real-world length
 * 3. Selecting the unit
 *
 * Features:
 * - Persists calibration to database per document page
 * - Shows existing calibration status
 * - Copy calibration from other pages
 * - View calibration history
 */
export function CalibrationDialog({
  open,
  onOpenChange,
  calibrationPoints,
  onCalibrationComplete,
  documentId,
  pageNumber = 1,
  totalPages: _totalPages = 1,
  onShowHistory,
}: CalibrationDialogProps) {
  const [knownLength, setKnownLength] = useState('')
  const [unit, setUnit] = useState<LinearUnit>('ft')
  const [copyFromPage, setCopyFromPage] = useState<string>('')

  // Fetch existing calibration for this page
  const { data: existingCalibration, isLoading: isLoadingCalibration } = useCalibration(
    documentId,
    pageNumber
  )

  // Fetch calibrations from other pages for copy feature
  const { data: allCalibrations } = useDocumentCalibrations(documentId)

  // Mutations
  const saveCalibration = useSaveCalibration()
  const copyCalibration = useCopyCalibration()

  // Filter to get other pages with calibrations
  const otherPageCalibrations = allCalibrations?.filter(
    (cal) => cal.page_number !== pageNumber
  ) || []

  // Calculate pixel distance from calibration points
  const pixelDistance =
    calibrationPoints && calibrationPoints.length === 2
      ? distanceBetweenPoints(calibrationPoints[0], calibrationPoints[1])
      : 0

  // Pre-fill from existing calibration when dialog opens
  useEffect(() => {
    if (open && existingCalibration && pixelDistance === 0) {
      // If there's an existing calibration and no new line drawn,
      // show the existing values
      setTimeout(() => {
        if (existingCalibration.real_world_distance) {
          setKnownLength(existingCalibration.real_world_distance.toString())
        }
        setUnit(existingCalibration.unit as LinearUnit)
      }, 0)
    }
  }, [open, existingCalibration, pixelDistance])

  // Calculate pixels per unit
  const calculatePixelsPerUnit = (): number | null => {
    const length = parseFloat(knownLength)
    if (isNaN(length) || length <= 0 || pixelDistance <= 0) {
      return null
    }
    return pixelDistance / length
  }

  // Determine accuracy level
  const getAccuracyLevel = (): 'high' | 'medium' | 'low' | null => {
    if (pixelDistance === 0) {return null}
    if (pixelDistance > 200) {return 'high'}
    if (pixelDistance > 100) {return 'medium'}
    return 'low'
  }

  // Handle calibration
  const handleCalibrate = async () => {
    const pixelsPerUnit = calculatePixelsPerUnit()
    if (!pixelsPerUnit) {return}

    const length = parseFloat(knownLength)
    const scale: ScaleFactor = {
      pixelsPerUnit,
      unit,
      pixelDistance,
      realWorldDistance: length,
    }

    // Save to database if documentId is provided
    if (documentId) {
      try {
        await saveCalibration.mutateAsync({
          documentId,
          pageNumber,
          scaleFactor: scale,
          calibrationLine: calibrationPoints?.length === 2 ? {
            start: calibrationPoints[0],
            end: calibrationPoints[1],
          } : undefined,
          accuracy: getAccuracyLevel() || undefined,
        })
        toast.success('Calibration saved', {
          description: `Scale saved for page ${pageNumber}`,
        })
      } catch (error) {
        console.error('Failed to save calibration:', error)
        toast.error('Failed to save calibration')
      }
    }

    onCalibrationComplete(scale)
    onOpenChange(false)

    // Reset
    setKnownLength('')
    setUnit('ft')
  }

  // Handle copy from another page
  const handleCopyFromPage = async () => {
    if (!documentId || !copyFromPage) {return}

    const sourcePageNumber = parseInt(copyFromPage, 10)

    try {
      await copyCalibration.mutateAsync({
        sourceDocumentId: documentId,
        sourcePageNumber,
        targetDocumentId: documentId,
        targetPageNumber: pageNumber,
      })

      // Get the source calibration to apply locally
      const sourceCal = otherPageCalibrations.find(
        (cal) => cal.page_number === sourcePageNumber
      )
      if (sourceCal) {
        const scale = calibrationToScaleFactor(sourceCal)
        if (scale) {
          onCalibrationComplete(scale)
        }
      }

      toast.success('Calibration copied', {
        description: `Calibration copied from page ${sourcePageNumber} to page ${pageNumber}`,
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to copy calibration:', error)
      toast.error('Failed to copy calibration')
    }
  }

  // Get accuracy indicator
  const getAccuracyBadge = () => {
    const accuracy = getAccuracyLevel()
    if (!accuracy) {return null}

    const pixelsPerUnit = calculatePixelsPerUnit()
    if (!pixelsPerUnit) {return null}

    switch (accuracy) {
      case 'high':
        return <Badge variant="default">High accuracy</Badge>
      case 'medium':
        return <Badge variant="secondary">Medium accuracy</Badge>
      case 'low':
        return <Badge variant="outline">Low accuracy</Badge>
    }
  }

  const pixelsPerUnit = calculatePixelsPerUnit()
  const canCalibrate = pixelsPerUnit !== null && pixelDistance > 0
  const hasExistingCalibration = !!existingCalibration
  const isSaving = saveCalibration.isPending || copyCalibration.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ruler className="w-5 h-5" />
            Scale Calibration
            {pageNumber > 0 && (
              <Badge variant="outline" className="ml-2">
                Page {pageNumber}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Draw a line on a known dimension in the drawing, then enter the actual length below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Existing Calibration Status */}
          {isLoadingCalibration ? (
            <div className="p-4 bg-muted rounded-lg flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Loading calibration...</span>
            </div>
          ) : hasExistingCalibration && existingCalibration ? (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    Page is calibrated
                  </span>
                </div>
                {onShowHistory && existingCalibration.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onShowHistory(existingCalibration.id)}
                  >
                    <History className="w-4 h-4 mr-1" />
                    History
                  </Button>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                Current scale: {existingCalibration.pixels_per_unit.toFixed(4)} px/{existingCalibration.unit}
                {existingCalibration.real_world_distance && (
                  <> ({existingCalibration.real_world_distance} {existingCalibration.unit})</>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Draw a new calibration line to update, or copy from another page below.
              </div>
            </div>
          ) : null}

          {/* Calibration Line Info */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="text-sm font-medium">Calibration Line</div>
            {pixelDistance > 0 ? (
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">
                  Pixel distance: {pixelDistance.toFixed(2)} px
                </div>
                {calibrationPoints && calibrationPoints.length === 2 && (
                  <div className="text-xs text-muted-foreground font-mono">
                    From ({calibrationPoints[0].x.toFixed(0)}, {calibrationPoints[0].y.toFixed(0)})
                    to ({calibrationPoints[1].x.toFixed(0)}, {calibrationPoints[1].y.toFixed(0)})
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Draw a line on the canvas to calibrate
              </div>
            )}
          </div>

          {/* Known Length Input */}
          <div className="space-y-2">
            <Label htmlFor="knownLength">Known Length</Label>
            <div className="flex gap-2">
              <Input
                id="knownLength"
                type="number"
                step="0.01"
                placeholder="Enter length"
                value={knownLength}
                onChange={(e) => setKnownLength(e.target.value)}
                className="flex-1"
                disabled={pixelDistance === 0}
              />
              <RadixSelect value={unit} onValueChange={(v) => setUnit(v as LinearUnit)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </RadixSelect>
            </div>
          </div>

          {/* Calculated Scale */}
          {pixelsPerUnit && (
            <div className="p-4 bg-primary/10 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Calculated Scale</div>
                {getAccuracyBadge()}
              </div>
              <div className="text-lg font-mono font-semibold">
                {pixelsPerUnit.toFixed(4)} px/{unit}
              </div>
              <div className="text-xs text-muted-foreground">
                1 {unit} = {pixelsPerUnit.toFixed(2)} pixels on screen
              </div>
            </div>
          )}

          {/* Copy from another page */}
          {otherPageCalibrations.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>Copy from another page</Label>
                <div className="flex gap-2">
                  <RadixSelect
                    value={copyFromPage}
                    onValueChange={setCopyFromPage}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a page" />
                    </SelectTrigger>
                    <SelectContent>
                      {otherPageCalibrations.map((cal) => (
                        <SelectItem
                          key={cal.page_number}
                          value={cal.page_number.toString()}
                        >
                          Page {cal.page_number} ({cal.pixels_per_unit.toFixed(2)} px/{cal.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </RadixSelect>
                  <Button
                    variant="outline"
                    onClick={handleCopyFromPage}
                    disabled={!copyFromPage || isSaving}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Instructions */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium">Tips for accurate calibration:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-1">
              <li>Use a dimension line or scale bar on the drawing</li>
              <li>Choose a longer reference line for better accuracy</li>
              <li>Verify the drawing scale matches the expected ratio</li>
              <li>Recalibrate if zooming significantly</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleCalibrate}
            disabled={!canCalibrate || isSaving}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            {hasExistingCalibration ? 'Update Calibration' : 'Apply Calibration'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
