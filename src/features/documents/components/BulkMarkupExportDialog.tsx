/**
 * BulkMarkupExportDialog Component
 *
 * Dialog for selecting drawings and export options for bulk markup export.
 * Provides drawing selection, format options, and progress tracking.
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  FileImage,
  FileText,
  FileJson,
  Download,
  Check,
  AlertTriangle,
  Loader2,
  Layers,
  Files,
  FileArchive,
  Info,
  ArrowUpDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBulkMarkupExport } from '../hooks/useBulkMarkupExport'
import type { DrawingWithMarkups } from '@/lib/api/services/markup-export'

// ============================================================================
// Types
// ============================================================================

interface BulkMarkupExportDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ============================================================================
// Sub-components
// ============================================================================

interface DrawingListItemProps {
  drawing: DrawingWithMarkups
  onToggle: (id: string) => void
}

function DrawingListItem({ drawing, onToggle }: DrawingListItemProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
        drawing.selected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      )}
      onClick={() => onToggle(drawing.id)}
    >
      <Checkbox
        checked={drawing.selected}
        onCheckedChange={() => onToggle(drawing.id)}
        className="pointer-events-none"
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{drawing.name}</p>
        <p className="text-xs text-gray-500">{drawing.file_name}</p>
      </div>
      <Badge variant={drawing.markupCount > 0 ? 'default' : 'secondary'}>
        {drawing.markupCount} markup{drawing.markupCount !== 1 ? 's' : ''}
      </Badge>
    </div>
  )
}

interface FormatOptionProps {
  format: 'png' | 'pdf' | 'json'
  selected: boolean
  onSelect: () => void
  disabled?: boolean
}

function FormatOption({ format, selected, onSelect, disabled }: FormatOptionProps) {
  const icons = {
    png: FileImage,
    pdf: FileText,
    json: FileJson,
  }
  const labels = {
    png: 'PNG Images',
    pdf: 'PDF Document',
    json: 'JSON Data',
  }
  const descriptions = {
    png: 'Export as high-quality images with markups',
    pdf: 'Export as printable PDF document(s)',
    json: 'Export markup data only for integration',
  }

  const Icon = icons[format]

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border text-left transition-all w-full',
        selected
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
          : 'border-gray-200 hover:border-gray-300',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div
        className={cn(
          'p-2 rounded-lg',
          selected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-sm">{labels[format]}</p>
        <p className="text-xs text-gray-500 mt-0.5">{descriptions[format]}</p>
      </div>
      {selected && (
        <div className="text-blue-600">
          <Check className="w-5 h-5" />
        </div>
      )}
    </button>
  )
}

interface ModeOptionProps {
  mode: 'individual' | 'merged'
  selected: boolean
  onSelect: () => void
  disabled?: boolean
}

function ModeOption({ mode, selected, onSelect, disabled }: ModeOptionProps) {
  const icons = {
    individual: Files,
    merged: FileArchive,
  }
  const labels = {
    individual: 'Individual Files',
    merged: 'Merged Document',
  }
  const descriptions = {
    individual: 'One file per drawing, packaged in ZIP',
    merged: 'All drawings in a single document',
  }

  const Icon = icons[mode]

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border text-left transition-all flex-1',
        selected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <Icon className={cn('w-4 h-4', selected ? 'text-blue-600' : 'text-gray-500')} />
      <div className="flex-1">
        <p className="font-medium text-sm">{labels[mode]}</p>
        <p className="text-xs text-gray-500">{descriptions[mode]}</p>
      </div>
    </button>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function BulkMarkupExportDialog({
  projectId,
  open,
  onOpenChange,
}: BulkMarkupExportDialogProps) {
  const [activeTab, setActiveTab] = useState<'selection' | 'options'>('selection')
  const [sortBy, setSortBy] = useState<'name' | 'markupCount'>('name')

  const {
    drawings,
    selectedDrawings,
    isLoading,
    isExporting,
    error,
    state,
    progress,
    lastResult,
    summary,
    validation,
    toggleDrawingSelection,
    selectAll,
    selectNone,
    selectWithMarkups,
    setFormat,
    setMode,
    setQuality,
    setPageSize,
    setOrientation,
    setIncludeMetadata,
    setIncludeComments,
    sortBy: setSortCriteria,
    startExport,
    downloadResult,
    reset,
  } = useBulkMarkupExport(projectId)

  // Handle sort change
  const handleSortChange = (criteria: 'name' | 'markupCount') => {
    setSortBy(criteria)
    setSortCriteria(criteria)
  }

  // Handle close
  const handleClose = () => {
    if (!isExporting) {
      reset()
      setActiveTab('selection')
      onOpenChange(false)
    }
  }

  // Handle export start
  const handleStartExport = async () => {
    await startExport()
  }

  // Render loading state
  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Markup Export</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Loading drawings...</span>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Render error state
  if (error) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Markup Export</DialogTitle>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Render export progress
  if (isExporting && progress) {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Exporting Markups...</DialogTitle>
            <DialogDescription>
              Please wait while your markups are being exported.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{progress.currentStep}</span>
              <span className="font-medium">{progress.percentage}%</span>
            </div>
            <Progress value={progress.percentage} className="h-2" />
            {progress.drawingName && (
              <p className="text-sm text-gray-500 truncate">
                Processing: {progress.drawingName}
              </p>
            )}
            <p className="text-sm text-gray-500">
              Drawing {progress.currentDrawing} of {progress.totalDrawings}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Render success state
  if (lastResult && lastResult.success) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Check className="w-5 h-5" />
              Export Complete
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="bg-green-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Files exported:</span>
                <span className="font-medium">{lastResult.fileCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total markups:</span>
                <span className="font-medium">{lastResult.totalMarkups}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Format:</span>
                <span className="font-medium">{lastResult.mimeType.split('/')[1].toUpperCase()}</span>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
            <Button onClick={downloadResult}>
              <Download className="w-4 h-4 mr-2" />
              Download {lastResult.filename}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Main dialog
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Bulk Markup Export
          </DialogTitle>
          <DialogDescription>
            Select drawings and configure export options to export markups in bulk.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="selection">
              1. Select Drawings ({summary.selectedCount})
            </TabsTrigger>
            <TabsTrigger value="options" disabled={summary.selectedCount === 0}>
              2. Export Options
            </TabsTrigger>
          </TabsList>

          {/* Selection Tab */}
          <TabsContent value="selection" className="flex-1 flex flex-col min-h-0 mt-4">
            {/* Summary bar */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-600">
                {summary.totalDrawings} drawing(s), {summary.drawingsWithMarkups} with markups
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleSortChange(sortBy === 'name' ? 'markupCount' : 'name')}>
                  <ArrowUpDown className="w-3 h-3 mr-1" />
                  Sort by {sortBy === 'name' ? 'Markups' : 'Name'}
                </Button>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex items-center gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={selectNone}>
                Select None
              </Button>
              <Button variant="outline" size="sm" onClick={selectWithMarkups}>
                Select With Markups
              </Button>
            </div>

            {/* Drawing list */}
            <ScrollArea className="flex-1 border rounded-lg">
              <div className="p-2 space-y-2">
                {drawings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileImage className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No drawings found in this project</p>
                  </div>
                ) : (
                  drawings.map((drawing) => (
                    <DrawingListItem
                      key={drawing.id}
                      drawing={drawing}
                      onToggle={toggleDrawingSelection}
                    />
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Selection summary */}
            {summary.selectedCount > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    {summary.selectedCount} drawing(s) selected
                  </span>
                </div>
                <span className="text-sm text-blue-600">
                  ~{selectedDrawings.reduce((sum, d) => sum + d.markupCount, 0)} markups
                </span>
              </div>
            )}
          </TabsContent>

          {/* Options Tab */}
          <TabsContent value="options" className="flex-1 flex flex-col min-h-0 mt-4">
            <ScrollArea className="flex-1">
              <div className="space-y-6 pr-4">
                {/* Format selection */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Export Format</Label>
                  <div className="space-y-2">
                    <FormatOption
                      format="png"
                      selected={state.format === 'png'}
                      onSelect={() => setFormat('png')}
                    />
                    <FormatOption
                      format="pdf"
                      selected={state.format === 'pdf'}
                      onSelect={() => setFormat('pdf')}
                    />
                    <FormatOption
                      format="json"
                      selected={state.format === 'json'}
                      onSelect={() => setFormat('json')}
                    />
                  </div>
                </div>

                {/* Mode selection (for PNG/PDF only) */}
                {state.format !== 'json' && (
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Export Mode</Label>
                    <div className="flex gap-2">
                      <ModeOption
                        mode="individual"
                        selected={state.mode === 'individual'}
                        onSelect={() => setMode('individual')}
                      />
                      {state.format === 'pdf' && (
                        <ModeOption
                          mode="merged"
                          selected={state.mode === 'merged'}
                          onSelect={() => setMode('merged')}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Quality settings (for PNG/PDF) */}
                {state.format !== 'json' && (
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Image Quality</Label>
                    <Select value={state.quality} onValueChange={(v: any) => setQuality(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low (faster, smaller files)</SelectItem>
                        <SelectItem value="medium">Medium (balanced)</SelectItem>
                        <SelectItem value="high">High (best quality, larger files)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* PDF-specific options */}
                {state.format === 'pdf' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium mb-3 block">Page Size</Label>
                      <Select value={state.pageSize} onValueChange={(v: any) => setPageSize(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="letter">Letter (8.5 x 11 in)</SelectItem>
                          <SelectItem value="legal">Legal (8.5 x 14 in)</SelectItem>
                          <SelectItem value="a4">A4 (210 x 297 mm)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-3 block">Orientation</Label>
                      <Select value={state.orientation} onValueChange={(v: any) => setOrientation(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="portrait">Portrait</SelectItem>
                          <SelectItem value="landscape">Landscape</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Metadata options */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium block">Include</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="include-metadata"
                      checked={state.includeMetadata}
                      onCheckedChange={(checked) => setIncludeMetadata(checked as boolean)}
                    />
                    <label
                      htmlFor="include-metadata"
                      className="text-sm text-gray-600 cursor-pointer"
                    >
                      Metadata (author, date, document info)
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="include-comments"
                      checked={state.includeComments}
                      onCheckedChange={(checked) => setIncludeComments(checked as boolean)}
                    />
                    <label
                      htmlFor="include-comments"
                      className="text-sm text-gray-600 cursor-pointer"
                    >
                      Comments and notes
                    </label>
                  </div>
                </div>

                {/* Export summary */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Export Summary</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-600">Drawings:</div>
                    <div className="font-medium">{summary.selectedCount}</div>
                    <div className="text-gray-600">Total markups:</div>
                    <div className="font-medium">
                      {selectedDrawings.reduce((sum, d) => sum + d.markupCount, 0)}
                    </div>
                    <div className="text-gray-600">Estimated size:</div>
                    <div className="font-medium">{summary.estimatedSize}</div>
                    <div className="text-gray-600">Output:</div>
                    <div className="font-medium">
                      {state.format === 'json'
                        ? 'JSON file'
                        : state.mode === 'merged'
                        ? 'Single PDF'
                        : 'ZIP archive'}
                    </div>
                  </div>
                </div>

                {/* Validation warnings */}
                {validation.warnings.length > 0 && (
                  <Alert>
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside">
                        {validation.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Validation errors */}
                {!validation.valid && (
                  <Alert variant="destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside">
                        {validation.errors.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {activeTab === 'selection' ? (
            <Button
              onClick={() => setActiveTab('options')}
              disabled={summary.selectedCount === 0}
            >
              Continue to Options
            </Button>
          ) : (
            <Button
              onClick={handleStartExport}
              disabled={!validation.valid || isExporting}
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export {summary.selectedCount} Drawing(s)
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default BulkMarkupExportDialog
