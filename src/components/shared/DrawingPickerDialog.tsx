/**
 * DrawingPickerDialog Component
 *
 * A reusable dialog for selecting drawings from the project's drawing register.
 * Supports optional pin placement for location-based references (e.g., RFIs, punch items).
 *
 * Features:
 * - Search and filter drawings by number, title, discipline
 * - Discipline tabs for quick filtering
 * - Optional pin placement mode with visual feedback
 * - Returns selected drawing with optional pin coordinates
 */

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search,
  FileImage,
  MapPin,
  Check,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDrawings } from '@/features/drawings/hooks/useDrawings'
import type { Drawing } from '@/types/drawing'

// Discipline options for filtering
const DISCIPLINES = [
  { value: 'all', label: 'All' },
  { value: 'architectural', label: 'Arch' },
  { value: 'structural', label: 'Struct' },
  { value: 'mechanical', label: 'Mech' },
  { value: 'electrical', label: 'Elec' },
  { value: 'plumbing', label: 'Plumb' },
  { value: 'civil', label: 'Civil' },
  { value: 'landscape', label: 'Land' },
]

export interface SelectedDrawing {
  id: string
  drawingNumber: string
  title: string
  discipline: string | null
  fileUrl: string | null
  pinX?: number
  pinY?: number
  pinLabel?: string
}

interface DrawingPickerDialogProps {
  projectId: string | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (drawing: SelectedDrawing) => void
  /** If true, allows user to place a pin on the drawing */
  enablePinPlacement?: boolean
  /** Title for the dialog */
  title?: string
  /** Description for the dialog */
  description?: string
  /** Already selected drawing IDs (for multi-select scenarios) */
  selectedIds?: string[]
}

export function DrawingPickerDialog({
  projectId,
  open,
  onOpenChange,
  onSelect,
  enablePinPlacement = false,
  title = 'Select Drawing',
  description = 'Choose a drawing from the project register',
  selectedIds = [],
}: DrawingPickerDialogProps) {
  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [activeDiscipline, setActiveDiscipline] = useState('all')
  const [selectedDrawing, setSelectedDrawing] = useState<Drawing | null>(null)
  const [pinPosition, setPinPosition] = useState<{ x: number; y: number } | null>(null)
  const [pinLabel, setPinLabel] = useState('')

  // Fetch drawings
  const { data: drawings = [], isLoading, error } = useDrawings(projectId)

  // Filter drawings based on search and discipline
  const filteredDrawings = useMemo(() => {
    return drawings.filter((drawing) => {
      // Discipline filter
      if (activeDiscipline !== 'all') {
        const drawingDiscipline = drawing.discipline?.toLowerCase() || ''
        if (!drawingDiscipline.includes(activeDiscipline.toLowerCase())) {
          return false
        }
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const number = drawing.drawingNumber?.toLowerCase() || ''
        const titleText = drawing.title?.toLowerCase() || ''
        const desc = drawing.description?.toLowerCase() || ''

        if (!number.includes(query) && !titleText.includes(query) && !desc.includes(query)) {
          return false
        }
      }

      return true
    })
  }, [drawings, activeDiscipline, searchQuery])

  // Reset state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSearchQuery('')
      setActiveDiscipline('all')
      setSelectedDrawing(null)
      setPinPosition(null)
      setPinLabel('')
    }
    onOpenChange(newOpen)
  }

  // Handle drawing selection
  const handleDrawingClick = (drawing: Drawing) => {
    if (enablePinPlacement) {
      setSelectedDrawing(drawing)
      setPinPosition(null)
      setPinLabel('')
    } else {
      // Direct selection without pin
      onSelect({
        id: drawing.id,
        drawingNumber: drawing.drawingNumber,
        title: drawing.title,
        discipline: drawing.discipline,
        fileUrl: drawing.currentFileUrl || null,
      })
      handleOpenChange(false)
    }
  }

  // Handle pin placement confirmation
  const handleConfirmWithPin = () => {
    if (!selectedDrawing) return

    onSelect({
      id: selectedDrawing.id,
      drawingNumber: selectedDrawing.drawingNumber,
      title: selectedDrawing.title,
      discipline: selectedDrawing.discipline,
      fileUrl: selectedDrawing.currentFileUrl || null,
      pinX: pinPosition?.x,
      pinY: pinPosition?.y,
      pinLabel: pinLabel.trim() || undefined,
    })
    handleOpenChange(false)
  }

  // Handle skip pin placement
  const handleSkipPin = () => {
    if (!selectedDrawing) return

    onSelect({
      id: selectedDrawing.id,
      drawingNumber: selectedDrawing.drawingNumber,
      title: selectedDrawing.title,
      discipline: selectedDrawing.discipline,
      fileUrl: selectedDrawing.currentFileUrl || null,
    })
    handleOpenChange(false)
  }

  // Back to drawing list
  const handleBackToList = () => {
    setSelectedDrawing(null)
    setPinPosition(null)
    setPinLabel('')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileImage className="h-5 w-5" />
            {selectedDrawing ? `Pin Location on ${selectedDrawing.drawingNumber}` : title}
          </DialogTitle>
          <DialogDescription>
            {selectedDrawing
              ? 'Click on the drawing to place a reference pin, or skip to select without a pin.'
              : description}
          </DialogDescription>
        </DialogHeader>

        {/* Drawing List View */}
        {!selectedDrawing && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search and Filter */}
            <div className="space-y-3 pb-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by number, title, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Tabs value={activeDiscipline} onValueChange={setActiveDiscipline}>
                <TabsList className="flex-wrap h-auto gap-1">
                  {DISCIPLINES.map((disc) => (
                    <TabsTrigger
                      key={disc.value}
                      value={disc.value}
                      className="text-xs px-2 py-1"
                    >
                      {disc.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* Drawing List */}
            <div className="flex-1 overflow-auto py-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading drawings...</span>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-12 text-error">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Failed to load drawings
                </div>
              ) : filteredDrawings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileImage className="h-10 w-10 mb-2 opacity-50" />
                  <p>No drawings found</p>
                  {searchQuery && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setSearchQuery('')}
                      className="mt-1"
                    >
                      Clear search
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredDrawings.map((drawing) => {
                    const isSelected = selectedIds.includes(drawing.id)
                    return (
                      <button
                        key={drawing.id}
                        onClick={() => handleDrawingClick(drawing)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
                          'hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20',
                          isSelected && 'bg-primary/10 border border-primary/20'
                        )}
                      >
                        {/* Drawing icon/thumbnail */}
                        <div className="flex-shrink-0 h-10 w-10 rounded bg-muted flex items-center justify-center">
                          <FileImage className="h-5 w-5 text-muted-foreground" />
                        </div>

                        {/* Drawing info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {drawing.drawingNumber}
                            </span>
                            {drawing.discipline && (
                              <Badge variant="outline" className="text-xs">
                                {drawing.discipline}
                              </Badge>
                            )}
                            {drawing.isIssuedForConstruction && (
                              <Badge className="text-xs bg-green-100 text-green-800">
                                IFC
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {drawing.title}
                          </p>
                          {drawing.currentRevision && (
                            <p className="text-xs text-muted-foreground">
                              Rev {drawing.currentRevision}
                            </p>
                          )}
                        </div>

                        {/* Selection indicator */}
                        {isSelected && (
                          <Check className="h-5 w-5 text-primary flex-shrink-0" />
                        )}

                        {/* Pin indicator for pin mode */}
                        {enablePinPlacement && (
                          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {filteredDrawings.length} drawing{filteredDrawings.length !== 1 ? 's' : ''}
              </span>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Pin Placement View */}
        {selectedDrawing && enablePinPlacement && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Drawing Preview with Pin */}
            <div
              className="flex-1 relative bg-muted rounded-lg overflow-hidden cursor-crosshair min-h-[300px]"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const x = (e.clientX - rect.left) / rect.width
                const y = (e.clientY - rect.top) / rect.height
                setPinPosition({ x, y })
              }}
            >
              {/* Drawing preview image or placeholder */}
              {selectedDrawing.currentFileUrl ? (
                <img
                  src={selectedDrawing.currentFileUrl}
                  alt={selectedDrawing.title}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <FileImage className="h-16 w-16 opacity-30" />
                </div>
              )}

              {/* Pin marker */}
              {pinPosition && (
                <div
                  className="absolute transform -translate-x-1/2 -translate-y-full pointer-events-none"
                  style={{
                    left: `${pinPosition.x * 100}%`,
                    top: `${pinPosition.y * 100}%`,
                  }}
                >
                  <MapPin className="h-8 w-8 text-red-500 drop-shadow-lg" />
                </div>
              )}

              {/* Instructions overlay */}
              {!pinPosition && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                  <div className="bg-white/90 px-4 py-2 rounded-lg shadow text-sm">
                    Click to place a pin
                  </div>
                </div>
              )}
            </div>

            {/* Pin Label Input */}
            {pinPosition && (
              <div className="pt-3">
                <Input
                  placeholder="Pin label (optional) - e.g., 'Detail A', 'Grid B-5'"
                  value={pinLabel}
                  onChange={(e) => setPinLabel(e.target.value)}
                  maxLength={50}
                />
              </div>
            )}

            {/* Footer */}
            <DialogFooter className="pt-4 gap-2">
              <Button variant="outline" onClick={handleBackToList}>
                <X className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button variant="ghost" onClick={handleSkipPin}>
                Skip Pin
              </Button>
              <Button onClick={handleConfirmWithPin} disabled={!pinPosition}>
                <MapPin className="h-4 w-4 mr-1" />
                Confirm Location
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default DrawingPickerDialog
