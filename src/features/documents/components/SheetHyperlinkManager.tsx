// File: /src/features/documents/components/SheetHyperlinkManager.tsx
// Manages sheet hyperlinks and cross-references between drawings

import { useState, useMemo, useCallback } from 'react'
import {
  Link2,
  ExternalLink,
  Plus,
  Trash2,
  Search,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  FileText,
  Eye,
  X,
  Check,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  useSheetReferences,
  useSheetBacklinks,
  useCreateSheetReference,
  useDeleteSheetReference,
  useAutoDetectSheetReferences,
  parseDrawingReferences,
  getDrawingDiscipline,
} from '../hooks/useDrawingSetManagement'
import { useDocuments } from '../hooks/useDocuments'
import type {
  SheetReference,
  SheetBacklink,
  SheetReferenceType,
  ParsedDrawingReference,
} from '../types/drawing-set'

interface SheetHyperlinkManagerProps {
  documentId: string
  projectId: string
  onNavigateToSheet?: (documentId: string) => void
  className?: string
}

/**
 * SheetHyperlinkManager Component
 *
 * Manages hyperlinks between drawing sheets including:
 * - Viewing outgoing references from the current sheet
 * - Viewing incoming backlinks from other sheets
 * - Auto-detecting references from drawing text
 * - Manual link creation
 * - Bidirectional navigation
 */
export function SheetHyperlinkManager({
  documentId,
  projectId,
  onNavigateToSheet,
  className = '',
}: SheetHyperlinkManagerProps) {
  // State
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showAutoDetectDialog, setShowAutoDetectDialog] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'outgoing' | 'incoming'>('outgoing')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Queries
  const { data: outgoingLinks, isLoading: loadingOutgoing } = useSheetReferences(documentId)
  const { data: incomingLinks, isLoading: loadingIncoming } = useSheetBacklinks(documentId)
  const { data: projectDocuments } = useDocuments(projectId)

  // Mutations
  const createReference = useCreateSheetReference()
  const deleteReference = useDeleteSheetReference()
  const autoDetectReferences = useAutoDetectSheetReferences()

  // Filter drawings from documents
  const drawings = useMemo(() => {
    return (projectDocuments || []).filter(
      doc => doc.document_type === 'drawing' && doc.id !== documentId
    )
  }, [projectDocuments, documentId])

  // Group links by reference type
  const groupedOutgoing = useMemo(() => {
    if (!outgoingLinks) return {}
    return outgoingLinks.reduce((acc, link) => {
      const type = link.referenceType || 'general'
      if (!acc[type]) acc[type] = []
      acc[type].push(link)
      return acc
    }, {} as Record<string, SheetReference[]>)
  }, [outgoingLinks])

  const groupedIncoming = useMemo(() => {
    if (!incomingLinks) return {}
    return incomingLinks.reduce((acc, link) => {
      const type = link.referenceType || 'general'
      if (!acc[type]) acc[type] = []
      acc[type].push(link)
      return acc
    }, {} as Record<string, SheetBacklink[]>)
  }, [incomingLinks])

  // Filter links by search term
  const filteredOutgoing = useMemo(() => {
    if (!searchTerm) return groupedOutgoing
    const term = searchTerm.toLowerCase()
    const filtered: Record<string, SheetReference[]> = {}
    for (const [type, links] of Object.entries(groupedOutgoing)) {
      const matchingLinks = links.filter(
        link => link.referenceText.toLowerCase().includes(term)
      )
      if (matchingLinks.length > 0) filtered[type] = matchingLinks
    }
    return filtered
  }, [groupedOutgoing, searchTerm])

  const filteredIncoming = useMemo(() => {
    if (!searchTerm) return groupedIncoming
    const term = searchTerm.toLowerCase()
    const filtered: Record<string, SheetBacklink[]> = {}
    for (const [type, links] of Object.entries(groupedIncoming)) {
      const matchingLinks = links.filter(
        link =>
          link.referenceText.toLowerCase().includes(term) ||
          link.sourceDocumentName.toLowerCase().includes(term)
      )
      if (matchingLinks.length > 0) filtered[type] = matchingLinks
    }
    return filtered
  }, [groupedIncoming, searchTerm])

  // Toggle group expansion
  const toggleGroup = useCallback((groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }
      return next
    })
  }, [])

  // Handle delete
  const handleDelete = async (referenceId: string) => {
    try {
      await deleteReference.mutateAsync(referenceId)
      toast.success('Reference deleted')
    } catch (error) {
      toast.error('Failed to delete reference')
    }
  }

  // Reference type labels
  const typeLabels: Record<SheetReferenceType, string> = {
    detail: 'Details',
    section: 'Sections',
    elevation: 'Elevations',
    plan: 'Plans',
    schedule: 'Schedules',
    general: 'General References',
  }

  // Reference type colors
  const typeColors: Record<SheetReferenceType, string> = {
    detail: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    section: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    elevation: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    plan: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    schedule: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    general: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Link2 className="w-5 h-5" />
            Sheet References
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAutoDetectDialog(true)}
              disabled={autoDetectReferences.isPending}
            >
              <RefreshCw className={cn(
                "w-4 h-4 mr-1",
                autoDetectReferences.isPending && "animate-spin"
              )} />
              Auto-Detect
            </Button>
            <Button
              size="sm"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Link
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Tab Buttons */}
        <div className="flex items-center gap-2 border-b">
          <button
            onClick={() => setSelectedTab('outgoing')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              selectedTab === 'outgoing'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <ArrowRight className="w-4 h-4" />
            Outgoing ({outgoingLinks?.length || 0})
          </button>
          <button
            onClick={() => setSelectedTab('incoming')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              selectedTab === 'incoming'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <ArrowLeft className="w-4 h-4" />
            Incoming ({incomingLinks?.length || 0})
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search references..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Content */}
        <ScrollArea className="h-[300px]">
          {selectedTab === 'outgoing' ? (
            loadingOutgoing ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : Object.keys(filteredOutgoing).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Link2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No outgoing references</p>
                <p className="text-sm">Click "Auto-Detect" to scan for references</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(filteredOutgoing).map(([type, links]) => (
                  <div key={type} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleGroup(`out-${type}`)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {expandedGroups.has(`out-${type}`) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <span className="font-medium">
                          {typeLabels[type as SheetReferenceType] || type}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {links.length}
                        </Badge>
                      </div>
                    </button>
                    {expandedGroups.has(`out-${type}`) && (
                      <div className="divide-y">
                        {links.map(link => (
                          <OutgoingLinkItem
                            key={link.id}
                            link={link}
                            typeColor={typeColors[type as SheetReferenceType]}
                            onNavigate={onNavigateToSheet}
                            onDelete={() => handleDelete(link.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            loadingIncoming ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : Object.keys(filteredIncoming).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ArrowLeft className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No incoming references</p>
                <p className="text-sm">Other sheets don't reference this sheet yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(filteredIncoming).map(([type, links]) => (
                  <div key={type} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleGroup(`in-${type}`)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {expandedGroups.has(`in-${type}`) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <span className="font-medium">
                          {typeLabels[type as SheetReferenceType] || type}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {links.length}
                        </Badge>
                      </div>
                    </button>
                    {expandedGroups.has(`in-${type}`) && (
                      <div className="divide-y">
                        {links.map(link => (
                          <IncomingLinkItem
                            key={link.id}
                            link={link}
                            typeColor={typeColors[type as SheetReferenceType]}
                            onNavigate={onNavigateToSheet}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </ScrollArea>
      </CardContent>

      {/* Add Link Dialog */}
      <AddLinkDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        sourceDocumentId={documentId}
        availableDocuments={drawings}
        onAdd={createReference.mutateAsync}
        isAdding={createReference.isPending}
      />

      {/* Auto-Detect Dialog */}
      <AutoDetectDialog
        open={showAutoDetectDialog}
        onClose={() => setShowAutoDetectDialog(false)}
        documentId={documentId}
        projectId={projectId}
        onDetect={autoDetectReferences.mutateAsync}
        isDetecting={autoDetectReferences.isPending}
      />
    </Card>
  )
}

// ============================================================
// Sub-components
// ============================================================

interface OutgoingLinkItemProps {
  link: SheetReference
  typeColor: string
  onNavigate?: (documentId: string) => void
  onDelete: () => void
}

function OutgoingLinkItem({ link, typeColor, onNavigate, onDelete }: OutgoingLinkItemProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 hover:bg-muted/30">
      <div className="flex items-center gap-3 min-w-0">
        <Badge className={cn('text-xs shrink-0', typeColor)}>
          {link.referenceText}
        </Badge>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {(link as any).target_document?.name || 'Unknown Sheet'}
          </p>
          {link.isAutoDetected && (
            <p className="text-xs text-muted-foreground">Auto-detected</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {onNavigate && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onNavigate(link.targetDocumentId)}
            title="Navigate to sheet"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          className="text-destructive hover:text-destructive"
          title="Delete reference"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

interface IncomingLinkItemProps {
  link: SheetBacklink
  typeColor: string
  onNavigate?: (documentId: string) => void
}

function IncomingLinkItem({ link, typeColor, onNavigate }: IncomingLinkItemProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 hover:bg-muted/30">
      <div className="flex items-center gap-3 min-w-0">
        <Badge className={cn('text-xs shrink-0', typeColor)}>
          {link.referenceText}
        </Badge>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{link.sourceDocumentName}</p>
          {link.sourceDrawingNumber && (
            <p className="text-xs text-muted-foreground">{link.sourceDrawingNumber}</p>
          )}
        </div>
      </div>
      {onNavigate && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onNavigate(link.sourceDocumentId)}
          title="Navigate to source sheet"
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}

interface AddLinkDialogProps {
  open: boolean
  onClose: () => void
  sourceDocumentId: string
  availableDocuments: any[]
  onAdd: (data: any) => Promise<any>
  isAdding: boolean
}

function AddLinkDialog({
  open,
  onClose,
  sourceDocumentId,
  availableDocuments,
  onAdd,
  isAdding,
}: AddLinkDialogProps) {
  const [targetDocumentId, setTargetDocumentId] = useState('')
  const [referenceText, setReferenceText] = useState('')
  const [referenceType, setReferenceType] = useState<SheetReferenceType>('general')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetDocumentId || !referenceText) return

    try {
      await onAdd({
        sourceDocumentId,
        targetDocumentId,
        sourceLocation: { x: 0, y: 0, page: 1 },
        referenceText,
        referenceType,
        isAutoDetected: false,
      })
      toast.success('Reference added')
      onClose()
      setTargetDocumentId('')
      setReferenceText('')
      setReferenceType('general')
    } catch (error) {
      toast.error('Failed to add reference')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Sheet Reference</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="target">Target Sheet</Label>
            <Select value={targetDocumentId} onValueChange={setTargetDocumentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a sheet..." />
              </SelectTrigger>
              <SelectContent>
                {availableDocuments.map(doc => (
                  <SelectItem key={doc.id} value={doc.id}>
                    {doc.drawing_number || doc.name} - {doc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="referenceText">Reference Text</Label>
            <Input
              id="referenceText"
              placeholder="e.g., See A-201, Detail 3/A-501"
              value={referenceText}
              onChange={(e) => setReferenceText(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="referenceType">Reference Type</Label>
            <Select
              value={referenceType}
              onValueChange={(v) => setReferenceType(v as SheetReferenceType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="detail">Detail</SelectItem>
                <SelectItem value="section">Section</SelectItem>
                <SelectItem value="elevation">Elevation</SelectItem>
                <SelectItem value="plan">Plan</SelectItem>
                <SelectItem value="schedule">Schedule</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isAdding || !targetDocumentId || !referenceText}>
              {isAdding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Add Reference
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface AutoDetectDialogProps {
  open: boolean
  onClose: () => void
  documentId: string
  projectId: string
  onDetect: (data: any) => Promise<any>
  isDetecting: boolean
}

function AutoDetectDialog({
  open,
  onClose,
  documentId,
  projectId,
  onDetect,
  isDetecting,
}: AutoDetectDialogProps) {
  const [textContent, setTextContent] = useState('')
  const [previewRefs, setPreviewRefs] = useState<ParsedDrawingReference[]>([])

  const handlePreview = () => {
    const refs = parseDrawingReferences(textContent)
    setPreviewRefs(refs)
  }

  const handleDetect = async () => {
    try {
      const result = await onDetect({
        sourceDocumentId: documentId,
        projectId,
        textContent,
        pageNumber: 1,
      })
      toast.success(`Created ${result.created} reference(s)`)
      onClose()
      setTextContent('')
      setPreviewRefs([])
    } catch (error) {
      toast.error('Failed to detect references')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Auto-Detect Sheet References</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Drawing Text Content</Label>
            <p className="text-sm text-muted-foreground">
              Paste text content from the drawing to scan for references
            </p>
            <textarea
              className="w-full h-32 px-3 py-2 border rounded-md text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Paste drawing text here...&#10;e.g., See A-201 for details. Refer to Detail 3/A-501."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
            />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handlePreview}
            disabled={!textContent}
          >
            <Search className="w-4 h-4 mr-2" />
            Preview Detected References
          </Button>

          {previewRefs.length > 0 && (
            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="font-medium">Detected References ({previewRefs.length})</h4>
              <div className="flex flex-wrap gap-2">
                {previewRefs.map((ref, idx) => (
                  <Badge key={idx} variant="outline">
                    {ref.fullMatch} ({ref.referenceType})
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {previewRefs.length === 0 && textContent && (
            <div className="border rounded-lg p-4 text-center text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No references detected in the provided text</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleDetect}
            disabled={isDetecting || previewRefs.length === 0}
          >
            {isDetecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Detecting...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Create References
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default SheetHyperlinkManager
