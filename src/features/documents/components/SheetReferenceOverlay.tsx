// File: /src/features/documents/components/SheetReferenceOverlay.tsx
// Premium sheet reference hotspots - clickable callouts that link to other drawings

import { useState, useCallback, useMemo } from 'react'
import { ExternalLink, Plus, X, Edit2, Trash2, Link2 } from 'lucide-react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui'
import { cn } from '@/lib/utils'
import type { SheetReferenceAnnotation } from '../types/navigation'

// Import blueprint styles
import '@/styles/blueprint-navigation.css'

interface SheetReference {
  id: string
  targetSheet: string
  targetDetail?: string
  targetDocumentId?: string
  label: string
  position: { x: number; y: number }  // Normalized 0-1 coordinates
  createdBy?: string
  createdAt?: string
}

interface SheetReferenceOverlayProps {
  references: SheetReference[]
  containerWidth: number
  containerHeight: number
  scale: number
  isEditMode?: boolean
  onNavigate?: (targetSheet: string, targetDocumentId?: string) => void
  onAddReference?: (position: { x: number; y: number }) => void
  onEditReference?: (reference: SheetReference) => void
  onDeleteReference?: (referenceId: string) => void
}

interface AddReferenceDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { targetSheet: string; label: string; targetDetail?: string }) => void
  position: { x: number; y: number } | null
}

function AddReferenceDialog({ isOpen, onClose, onSave, position }: AddReferenceDialogProps) {
  const [targetSheet, setTargetSheet] = useState('')
  const [label, setLabel] = useState('')
  const [targetDetail, setTargetDetail] = useState('')

  const handleSave = () => {
    if (!targetSheet.trim()) {return}
    onSave({
      targetSheet: targetSheet.trim().toUpperCase(),
      label: label.trim() || `See ${targetSheet.trim().toUpperCase()}`,
      targetDetail: targetDetail.trim() || undefined,
    })
    setTargetSheet('')
    setLabel('')
    setTargetDetail('')
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[var(--blueprint-bg-panel)] border-[var(--blueprint-border)] max-w-md">
        <DialogHeader>
          <DialogTitle className="drawing-index-title text-base normal-case tracking-normal flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Add Sheet Reference
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-[var(--blueprint-text-secondary)] text-sm">
              Target Sheet Number *
            </Label>
            <Input
              value={targetSheet}
              onChange={(e) => setTargetSheet(e.target.value)}
              placeholder="e.g., A-501"
              className="bg-[var(--blueprint-bg-deep)] border-[var(--blueprint-border)] text-[var(--blueprint-text-primary)] font-mono uppercase"
            />
            <p className="text-xs text-[var(--blueprint-text-muted)]">
              Enter the sheet number to link to (e.g., A-501, S-100)
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-[var(--blueprint-text-secondary)] text-sm">
              Display Label
            </Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., See Detail A"
              className="bg-[var(--blueprint-bg-deep)] border-[var(--blueprint-border)] text-[var(--blueprint-text-primary)]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[var(--blueprint-text-secondary)] text-sm">
              Detail Reference (optional)
            </Label>
            <Input
              value={targetDetail}
              onChange={(e) => setTargetDetail(e.target.value)}
              placeholder="e.g., Detail 3"
              className="bg-[var(--blueprint-bg-deep)] border-[var(--blueprint-border)] text-[var(--blueprint-text-primary)]"
            />
          </div>

          {position && (
            <div className="p-3 rounded-md bg-[var(--blueprint-bg-surface)] border border-[var(--blueprint-border)]">
              <p className="text-xs text-[var(--blueprint-text-muted)] font-mono">
                Position: ({Math.round(position.x * 100)}%, {Math.round(position.y * 100)}%)
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[var(--blueprint-border)] text-[var(--blueprint-text-secondary)] hover:bg-[var(--blueprint-bg-hover)]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!targetSheet.trim()}
            className="bg-[var(--blueprint-cyan)] text-[var(--blueprint-bg-deep)] hover:bg-[var(--blueprint-cyan-dim)]"
          >
            Add Reference
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SheetReferenceOverlay({
  references,
  containerWidth,
  containerHeight,
  scale,
  isEditMode = false,
  onNavigate,
  onAddReference,
  onEditReference,
  onDeleteReference,
}: SheetReferenceOverlayProps) {
  const [selectedReference, setSelectedReference] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number } | null>(null)

  // Calculate pixel positions from normalized coordinates
  const positionedReferences = useMemo(() => {
    return references.map((ref) => ({
      ...ref,
      pixelX: ref.position.x * containerWidth,
      pixelY: ref.position.y * containerHeight,
    }))
  }, [references, containerWidth, containerHeight])

  const handleContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isEditMode || !onAddReference) {return}

      const rect = e.currentTarget.getBoundingClientRect()
      const x = (e.clientX - rect.left) / containerWidth
      const y = (e.clientY - rect.top) / containerHeight

      setPendingPosition({ x, y })
      setAddDialogOpen(true)
    },
    [isEditMode, onAddReference, containerWidth, containerHeight]
  )

  const handleAddSave = useCallback(
    (data: { targetSheet: string; label: string; targetDetail?: string }) => {
      if (pendingPosition && onAddReference) {
        // In real implementation, this would create the reference via API
        console.log('Adding reference:', { ...data, position: pendingPosition })
      }
      setAddDialogOpen(false)
      setPendingPosition(null)
    },
    [pendingPosition, onAddReference]
  )

  const handleReferenceClick = useCallback(
    (ref: SheetReference, e: React.MouseEvent) => {
      e.stopPropagation()

      if (isEditMode) {
        setSelectedReference(selectedReference === ref.id ? null : ref.id)
      } else if (onNavigate) {
        onNavigate(ref.targetSheet, ref.targetDocumentId)
      }
    },
    [isEditMode, selectedReference, onNavigate]
  )

  return (
    <TooltipProvider>
      <div
        className={cn(
          'absolute inset-0 pointer-events-none',
          isEditMode && 'pointer-events-auto cursor-crosshair'
        )}
        onClick={handleContainerClick}
      >
        {positionedReferences.map((ref) => (
          <div
            key={ref.id}
            className="absolute pointer-events-auto"
            style={{
              left: ref.pixelX,
              top: ref.pixelY,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => handleReferenceClick(ref, e)}
                  className={cn(
                    'sheet-reference-hotspot',
                    selectedReference === ref.id && 'ring-2 ring-white/50'
                  )}
                >
                  <span className="sheet-reference-label">{ref.label}</span>
                  <ExternalLink className="sheet-reference-icon" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="bg-[var(--blueprint-bg-surface)] border-[var(--blueprint-border)] text-[var(--blueprint-text-primary)]"
              >
                <div className="text-sm">
                  <p className="font-mono font-semibold text-[var(--blueprint-cyan)]">
                    {ref.targetSheet}
                  </p>
                  {ref.targetDetail && (
                    <p className="text-xs text-[var(--blueprint-text-muted)]">
                      {ref.targetDetail}
                    </p>
                  )}
                  <p className="text-xs text-[var(--blueprint-text-muted)] mt-1">
                    Click to navigate
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>

            {/* Edit/Delete buttons when selected in edit mode */}
            {isEditMode && selectedReference === ref.id && (
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 flex gap-1 p-1 rounded bg-[var(--blueprint-bg-surface)] border border-[var(--blueprint-border)]"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditReference?.(ref)}
                  className="h-8 w-8 p-0 text-[var(--blueprint-text-muted)] hover:text-[var(--blueprint-cyan)] hover:bg-[var(--blueprint-bg-hover)]"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteReference?.(ref.id)}
                  className="h-8 w-8 p-0 text-[var(--blueprint-text-muted)] hover:text-red-400 hover:bg-[var(--blueprint-bg-hover)]"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        ))}

        {/* Edit mode indicator */}
        {isEditMode && (
          <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--blueprint-bg-surface)] border border-[var(--blueprint-cyan)] text-[var(--blueprint-cyan)]">
            <Plus className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Click to add reference
            </span>
          </div>
        )}

        {/* Add Reference Dialog */}
        <AddReferenceDialog
          isOpen={addDialogOpen}
          onClose={() => {
            setAddDialogOpen(false)
            setPendingPosition(null)
          }}
          onSave={handleAddSave}
          position={pendingPosition}
        />
      </div>
    </TooltipProvider>
  )
}

export default SheetReferenceOverlay
