// File: /src/features/documents/components/BulkMarkupApply.tsx
// Bulk apply markups to multiple drawing sheets

import { useState, useMemo, useCallback } from 'react'
import {
  Layers,
  Copy,
  Check,
  CheckCheck,
  X,
  Loader2,
  FileText,
  Search,
  ChevronDown,
  ChevronRight,
  Move,
  Maximize,
  Target,
  Percent,
  AlertCircle,
  Eye,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useBulkApplyMarkups } from '../hooks/useDrawingSetManagement'
import { useDocuments } from '../hooks/useDocuments'
import { useDocumentMarkups } from '../hooks/useMarkups'
import type {
  BulkMarkupSelection,
  BulkMarkupTarget,
  BulkMarkupApplyOptions,
  BulkOperationProgress,
  MarkupPositionStrategy,
} from '../types/drawing-set'
import type { DocumentMarkup } from '@/lib/api/services/markups'

interface BulkMarkupApplyProps {
  open: boolean
  onClose: () => void
  sourceDocumentId: string
  projectId: string
  preSelectedMarkupIds?: string[]
}

/**
 * BulkMarkupApply Component
 *
 * Dialog for applying markups to multiple sheets including:
 * - Markup selection from source document
 * - Target sheet multi-selection
 * - Position adjustment strategies
 * - Preview before applying
 * - Progress tracking
 */
export function BulkMarkupApply({
  open,
  onClose,
  sourceDocumentId,
  projectId,
  preSelectedMarkupIds = [],
}: BulkMarkupApplyProps) {
  // State
  const [step, setStep] = useState<'select' | 'configure' | 'apply'>('select')
  const [selectedMarkupIds, setSelectedMarkupIds] = useState<Set<string>>(
    new Set(preSelectedMarkupIds)
  )
  const [selectedTargetIds, setSelectedTargetIds] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedDisciplines, setExpandedDisciplines] = useState<Set<string>>(new Set())
  const [options, setOptions] = useState<BulkMarkupApplyOptions>({
    positionStrategy: 'same-position',
    createCopy: true,
    preserveColors: true,
    offset: { x: 0, y: 0 },
  })
  const [progress, setProgress] = useState<BulkOperationProgress | null>(null)

  // Queries
  const { data: sourceMarkups, isLoading: loadingMarkups } = useDocumentMarkups(sourceDocumentId)
  const { data: documents, isLoading: loadingDocuments } = useDocuments(projectId)

  // Mutations
  const bulkApply = useBulkApplyMarkups()

  // Filter drawings (exclude source)
  const targetDocuments = useMemo(() => {
    return (documents || []).filter(
      doc => doc.document_type === 'drawing' && doc.id !== sourceDocumentId
    )
  }, [documents, sourceDocumentId])

  // Group by discipline
  const groupedDocuments = useMemo(() => {
    const grouped: Record<string, typeof targetDocuments> = {}
    for (const doc of targetDocuments) {
      const discipline = doc.discipline || 'Other'
      if (!grouped[discipline]) grouped[discipline] = []
      grouped[discipline].push(doc)
    }
    return grouped
  }, [targetDocuments])

  // Filter by search
  const filteredDocuments = useMemo(() => {
    if (!searchTerm) return groupedDocuments
    const term = searchTerm.toLowerCase()
    const filtered: Record<string, typeof targetDocuments> = {}
    for (const [discipline, docs] of Object.entries(groupedDocuments)) {
      const matchingDocs = docs.filter(
        doc =>
          doc.name.toLowerCase().includes(term) ||
          (doc.drawing_number || '').toLowerCase().includes(term)
      )
      if (matchingDocs.length > 0) filtered[discipline] = matchingDocs
    }
    return filtered
  }, [groupedDocuments, searchTerm])

  // Toggle discipline expansion
  const toggleDiscipline = useCallback((discipline: string) => {
    setExpandedDisciplines(prev => {
      const next = new Set(prev)
      if (next.has(discipline)) {
        next.delete(discipline)
      } else {
        next.add(discipline)
      }
      return next
    })
  }, [])

  // Toggle markup selection
  const toggleMarkup = useCallback((markupId: string) => {
    setSelectedMarkupIds(prev => {
      const next = new Set(prev)
      if (next.has(markupId)) {
        next.delete(markupId)
      } else {
        next.add(markupId)
      }
      return next
    })
  }, [])

  // Toggle target selection
  const toggleTarget = useCallback((documentId: string) => {
    setSelectedTargetIds(prev => {
      const next = new Set(prev)
      if (next.has(documentId)) {
        next.delete(documentId)
      } else {
        next.add(documentId)
      }
      return next
    })
  }, [])

  // Select/deselect all markups
  const toggleAllMarkups = useCallback(() => {
    if (!sourceMarkups) return
    if (selectedMarkupIds.size === sourceMarkups.length) {
      setSelectedMarkupIds(new Set())
    } else {
      setSelectedMarkupIds(new Set(sourceMarkups.map(m => m.id)))
    }
  }, [sourceMarkups, selectedMarkupIds])

  // Select/deselect all targets in a discipline
  const toggleDisciplineTargets = useCallback((discipline: string) => {
    const disciplineDocs = groupedDocuments[discipline] || []
    const allSelected = disciplineDocs.every(doc => selectedTargetIds.has(doc.id))

    setSelectedTargetIds(prev => {
      const next = new Set(prev)
      disciplineDocs.forEach(doc => {
        if (allSelected) {
          next.delete(doc.id)
        } else {
          next.add(doc.id)
        }
      })
      return next
    })
  }, [groupedDocuments, selectedTargetIds])

  // Handle apply
  const handleApply = async () => {
    if (selectedMarkupIds.size === 0 || selectedTargetIds.size === 0) return

    setStep('apply')
    setProgress({
      current: 0,
      total: selectedTargetIds.size,
      status: 'in-progress',
    })

    const targets: BulkMarkupTarget[] = Array.from(selectedTargetIds).map(id => {
      const doc = targetDocuments.find(d => d.id === id)
      return {
        documentId: id,
        documentName: doc?.name || 'Unknown',
        selected: true,
      }
    })

    try {
      const result = await bulkApply.mutateAsync({
        selection: {
          markupIds: Array.from(selectedMarkupIds),
          sourceDocumentId,
        },
        targets,
        options,
        onProgress: setProgress,
      })

      if (result.success) {
        toast.success(
          `Applied ${selectedMarkupIds.size} markup(s) to ${result.appliedCount / selectedMarkupIds.size} sheet(s)`
        )
        onClose()
      } else {
        toast.error(`Some operations failed: ${result.errors.length} error(s)`)
      }
    } catch (error) {
      toast.error('Failed to apply markups')
    } finally {
      setProgress(null)
      setStep('select')
    }
  }

  // Reset state on close
  const handleClose = () => {
    setStep('select')
    setSelectedMarkupIds(new Set(preSelectedMarkupIds))
    setSelectedTargetIds(new Set())
    setProgress(null)
    onClose()
  }

  // Position strategy icons
  const strategyIcons: Record<MarkupPositionStrategy, React.ReactNode> = {
    'same-position': <Move className="w-4 h-4" />,
    'centered': <Target className="w-4 h-4" />,
    'scaled': <Maximize className="w-4 h-4" />,
    'relative': <Percent className="w-4 h-4" />,
  }

  const strategyLabels: Record<MarkupPositionStrategy, string> = {
    'same-position': 'Same Position',
    'centered': 'Centered',
    'scaled': 'Scaled',
    'relative': 'Relative Position',
  }

  const strategyDescriptions: Record<MarkupPositionStrategy, string> = {
    'same-position': 'Keep exact X/Y coordinates',
    'centered': 'Center on target sheet',
    'scaled': 'Scale to fit target dimensions',
    'relative': 'Keep relative position (% of page)',
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Bulk Apply Markups
          </DialogTitle>
          <DialogDescription>
            Apply selected markups to multiple drawing sheets at once.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        {progress && (
          <div className="p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Applying to: {progress.currentTarget || '...'}
              </span>
              <span className="text-sm text-muted-foreground">
                {progress.current} / {progress.total}
              </span>
            </div>
            <Progress value={(progress.current / progress.total) * 100} />
          </div>
        )}

        {step === 'select' && (
          <div className="grid grid-cols-2 gap-6">
            {/* Markup Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Select Markups</h3>
                <Button size="sm" variant="ghost" onClick={toggleAllMarkups}>
                  {selectedMarkupIds.size === (sourceMarkups?.length || 0) ? (
                    <>
                      <X className="w-4 h-4 mr-1" />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <CheckCheck className="w-4 h-4 mr-1" />
                      Select All
                    </>
                  )}
                </Button>
              </div>

              <ScrollArea className="h-[300px] border rounded-lg p-3">
                {loadingMarkups ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : !sourceMarkups || sourceMarkups.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No markups available</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sourceMarkups.map(markup => (
                      <MarkupItem
                        key={markup.id}
                        markup={markup}
                        selected={selectedMarkupIds.has(markup.id)}
                        onToggle={() => toggleMarkup(markup.id)}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>

              <p className="text-sm text-muted-foreground">
                {selectedMarkupIds.size} markup(s) selected
              </p>
            </div>

            {/* Target Selection */}
            <div className="space-y-3">
              <h3 className="font-medium">Select Target Sheets</h3>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search sheets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <ScrollArea className="h-[250px] border rounded-lg p-3">
                {loadingDocuments ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : Object.keys(filteredDocuments).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No drawing sheets found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(filteredDocuments).map(([discipline, docs]) => (
                      <DisciplineGroup
                        key={discipline}
                        discipline={discipline}
                        documents={docs}
                        isExpanded={expandedDisciplines.has(discipline)}
                        selectedIds={selectedTargetIds}
                        onToggle={() => toggleDiscipline(discipline)}
                        onToggleAll={() => toggleDisciplineTargets(discipline)}
                        onToggleDocument={toggleTarget}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>

              <p className="text-sm text-muted-foreground">
                {selectedTargetIds.size} sheet(s) selected
              </p>
            </div>
          </div>
        )}

        {step === 'configure' && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="p-4 border rounded-lg bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge>{selectedMarkupIds.size} markups</Badge>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <Badge>{selectedTargetIds.size} sheets</Badge>
              </div>
              <span className="text-sm text-muted-foreground">
                = {selectedMarkupIds.size * selectedTargetIds.size} operations
              </span>
            </div>

            {/* Position Strategy */}
            <div className="space-y-3">
              <Label>Position Strategy</Label>
              <RadioGroup
                value={options.positionStrategy}
                onValueChange={(v) =>
                  setOptions({ ...options, positionStrategy: v as MarkupPositionStrategy })
                }
                className="grid grid-cols-2 gap-3"
              >
                {(Object.keys(strategyIcons) as MarkupPositionStrategy[]).map(strategy => (
                  <div key={strategy}>
                    <RadioGroupItem
                      value={strategy}
                      id={strategy}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={strategy}
                      className={cn(
                        'flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors',
                        'hover:bg-muted/50',
                        options.positionStrategy === strategy && 'border-primary bg-primary/5'
                      )}
                    >
                      <div className="mt-0.5">{strategyIcons[strategy]}</div>
                      <div>
                        <p className="font-medium">{strategyLabels[strategy]}</p>
                        <p className="text-sm text-muted-foreground">
                          {strategyDescriptions[strategy]}
                        </p>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Additional Options */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Checkbox
                  id="preserveColors"
                  checked={options.preserveColors}
                  onCheckedChange={(v) =>
                    setOptions({ ...options, preserveColors: !!v })
                  }
                />
                <Label htmlFor="preserveColors" className="cursor-pointer">
                  <span className="font-medium">Preserve Colors</span>
                  <p className="text-sm text-muted-foreground">
                    Keep original markup colors
                  </p>
                </Label>
              </div>

              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Checkbox
                  id="createCopy"
                  checked={options.createCopy}
                  onCheckedChange={(v) =>
                    setOptions({ ...options, createCopy: !!v })
                  }
                />
                <Label htmlFor="createCopy" className="cursor-pointer">
                  <span className="font-medium">Create Copies</span>
                  <p className="text-sm text-muted-foreground">
                    Create independent copies
                  </p>
                </Label>
              </div>
            </div>

            {/* Offset for same-position strategy */}
            {options.positionStrategy === 'same-position' && (
              <div className="space-y-3">
                <Label>Position Offset (optional)</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="offsetX" className="w-8">X:</Label>
                    <Input
                      id="offsetX"
                      type="number"
                      value={options.offset?.x || 0}
                      onChange={(e) =>
                        setOptions({
                          ...options,
                          offset: { ...options.offset!, x: parseInt(e.target.value) || 0 },
                        })
                      }
                    />
                    <span className="text-sm text-muted-foreground">px</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="offsetY" className="w-8">Y:</Label>
                    <Input
                      id="offsetY"
                      type="number"
                      value={options.offset?.y || 0}
                      onChange={(e) =>
                        setOptions({
                          ...options,
                          offset: { ...options.offset!, y: parseInt(e.target.value) || 0 },
                        })
                      }
                    />
                    <span className="text-sm text-muted-foreground">px</span>
                  </div>
                </div>
              </div>
            )}

            {/* Scale factor for scaled strategy */}
            {options.positionStrategy === 'scaled' && (
              <div className="space-y-3">
                <Label>Scale Factor</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="5"
                    value={options.scaleFactor || 1}
                    onChange={(e) =>
                      setOptions({
                        ...options,
                        scaleFactor: parseFloat(e.target.value) || 1,
                      })
                    }
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">
                    (1.0 = original size)
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 'select' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep('configure')}
                disabled={selectedMarkupIds.size === 0 || selectedTargetIds.size === 0}
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </>
          )}

          {step === 'configure' && (
            <>
              <Button variant="outline" onClick={() => setStep('select')}>
                Back
              </Button>
              <Button onClick={handleApply} disabled={bulkApply.isPending}>
                {bulkApply.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Apply to {selectedTargetIds.size} Sheets
                  </>
                )}
              </Button>
            </>
          )}

          {step === 'apply' && (
            <Button variant="outline" disabled>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Sub-components
// ============================================================

interface MarkupItemProps {
  markup: DocumentMarkup
  selected: boolean
  onToggle: () => void
}

function MarkupItem({ markup, selected, onToggle }: MarkupItemProps) {
  const typeIcons: Record<string, string> = {
    arrow: 'Arrow',
    rectangle: 'Rectangle',
    circle: 'Circle',
    text: 'Text',
    freehand: 'Freehand',
    cloud: 'Cloud',
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors',
        selected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
      )}
      onClick={onToggle}
    >
      <Checkbox checked={selected} className="pointer-events-none" />
      <div
        className="w-4 h-4 rounded"
        style={{ backgroundColor: markup.markup_data?.stroke || '#FF0000' }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {typeIcons[markup.markup_type] || markup.markup_type}
        </p>
        {markup.markup_data?.label && (
          <p className="text-xs text-muted-foreground truncate">
            {markup.markup_data.label}
          </p>
        )}
      </div>
      <span className="text-xs text-muted-foreground">
        Page {markup.page_number || 1}
      </span>
    </div>
  )
}

interface DisciplineGroupProps {
  discipline: string
  documents: any[]
  isExpanded: boolean
  selectedIds: Set<string>
  onToggle: () => void
  onToggleAll: () => void
  onToggleDocument: (id: string) => void
}

function DisciplineGroup({
  discipline,
  documents,
  isExpanded,
  selectedIds,
  onToggle,
  onToggleAll,
  onToggleDocument,
}: DisciplineGroupProps) {
  const selectedCount = documents.filter(d => selectedIds.has(d.id)).length
  const allSelected = selectedCount === documents.length

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 hover:text-foreground"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          <span className="font-medium">{discipline}</span>
          <Badge variant="secondary" className="text-xs">
            {selectedCount}/{documents.length}
          </Badge>
        </button>
        <Checkbox
          checked={allSelected}
          onCheckedChange={onToggleAll}
          className="ml-2"
        />
      </div>

      {isExpanded && (
        <div className="divide-y">
          {documents.map(doc => (
            <div
              key={doc.id}
              className={cn(
                'flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors',
                selectedIds.has(doc.id) ? 'bg-primary/5' : 'hover:bg-muted/30'
              )}
              onClick={() => onToggleDocument(doc.id)}
            >
              <Checkbox
                checked={selectedIds.has(doc.id)}
                className="pointer-events-none"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {doc.drawing_number || doc.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {doc.name}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default BulkMarkupApply
