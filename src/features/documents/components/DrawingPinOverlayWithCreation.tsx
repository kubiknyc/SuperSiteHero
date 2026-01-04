/**
 * DrawingPinOverlayWithCreation Component
 *
 * Enhanced version of DrawingPinOverlay that includes the ability to create
 * RFIs and Submittals directly from the drawing view by clicking to place a pin.
 *
 * This component wraps DrawingPinOverlay and adds the creation dialogs.
 */

import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { DrawingPinOverlay } from './DrawingPinOverlay'
import { CreateRFIFromDrawingDialog, type DrawingContext } from '@/features/rfis/components'
import { CreateSubmittalFromDrawingDialog, type SubmittalDrawingContext } from '@/features/submittals/components'

// =============================================
// Types
// =============================================

interface DocumentInfo {
  id: string
  title: string
  drawingNumber?: string
  discipline?: string
  fileUrl?: string
}

interface DrawingPinOverlayWithCreationProps {
  /** Document ID */
  documentId: string
  /** Project ID for RFI/Submittal creation */
  projectId: string | undefined
  /** Container width in pixels */
  containerWidth: number
  /** Container height in pixels */
  containerHeight: number
  /** Current zoom level (default: 100) */
  zoom?: number
  /** Document information for pre-filling dialogs */
  documentInfo?: DocumentInfo
  /** Show RFI pins (default: true) */
  showRFIs?: boolean
  /** Show Submittal pins (default: true) */
  showSubmittals?: boolean
  /** Enable adding new pins (default: true when projectId is provided) */
  enableAddPin?: boolean
  /** Optional class name */
  className?: string
}

// =============================================
// Component
// =============================================

export function DrawingPinOverlayWithCreation({
  documentId,
  projectId,
  containerWidth,
  containerHeight,
  zoom = 100,
  documentInfo,
  showRFIs = true,
  showSubmittals = true,
  enableAddPin = !!projectId,
  className,
}: DrawingPinOverlayWithCreationProps) {
  const navigate = useNavigate()

  // Dialog state
  const [showRFIDialog, setShowRFIDialog] = useState(false)
  const [showSubmittalDialog, setShowSubmittalDialog] = useState(false)
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null)

  // Build drawing context from document info and pending pin
  const drawingContext: DrawingContext | undefined = pendingPin && documentInfo ? {
    documentId: documentInfo.id,
    documentTitle: documentInfo.title,
    drawingNumber: documentInfo.drawingNumber,
    discipline: documentInfo.discipline,
    pinX: pendingPin.x,
    pinY: pendingPin.y,
    fileUrl: documentInfo.fileUrl,
  } : undefined

  // Handle pin placement from overlay
  const handleAddPin = useCallback((type: 'rfi' | 'submittal', normalizedX: number, normalizedY: number) => {
    setPendingPin({ x: normalizedX, y: normalizedY })

    if (type === 'rfi') {
      setShowRFIDialog(true)
    } else {
      setShowSubmittalDialog(true)
    }
  }, [])

  // Handle successful RFI creation
  const handleRFISuccess = useCallback((rfiId: string) => {
    setPendingPin(null)
    toast.success('RFI created successfully', {
      description: 'The RFI has been linked to the drawing location.',
      action: {
        label: 'View RFI',
        onClick: () => navigate(`/rfis/${rfiId}`),
      },
    })
  }, [navigate])

  // Handle successful Submittal creation
  const handleSubmittalSuccess = useCallback((submittalId: string) => {
    setPendingPin(null)
    toast.success('Submittal created successfully', {
      description: 'The submittal has been linked to the drawing location.',
      action: {
        label: 'View Submittal',
        onClick: () => navigate(`/submittals/${submittalId}`),
      },
    })
  }, [navigate])

  // Handle dialog close
  const handleRFIDialogClose = useCallback((open: boolean) => {
    setShowRFIDialog(open)
    if (!open) {
      setPendingPin(null)
    }
  }, [])

  const handleSubmittalDialogClose = useCallback((open: boolean) => {
    setShowSubmittalDialog(open)
    if (!open) {
      setPendingPin(null)
    }
  }, [])

  return (
    <>
      <DrawingPinOverlay
        documentId={documentId}
        containerWidth={containerWidth}
        containerHeight={containerHeight}
        zoom={zoom}
        showRFIs={showRFIs}
        showSubmittals={showSubmittals}
        enableAddPin={enableAddPin}
        onAddPin={handleAddPin}
        className={className}
      />

      {/* RFI Creation Dialog */}
      <CreateRFIFromDrawingDialog
        projectId={projectId}
        open={showRFIDialog}
        onOpenChange={handleRFIDialogClose}
        drawingContext={drawingContext}
        onSuccess={handleRFISuccess}
      />

      {/* Submittal Creation Dialog */}
      <CreateSubmittalFromDrawingDialog
        projectId={projectId}
        open={showSubmittalDialog}
        onOpenChange={handleSubmittalDialogClose}
        drawingContext={drawingContext as SubmittalDrawingContext}
        onSuccess={handleSubmittalSuccess}
      />
    </>
  )
}

export default DrawingPinOverlayWithCreation
