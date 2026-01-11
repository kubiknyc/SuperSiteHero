/**
 * Drawing Register Component
 * AIA G810-style drawing log with revision tracking
 */

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import {
  FileText,
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronRight,
  History,
  AlertTriangle,
  FileWarning,
  Layers,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  useDrawingRegister,
  useDrawingRevisionHistory,
  DRAWING_DISCIPLINES,
  DOCUMENT_SETS,
  type DrawingDocument,
} from '../hooks/useDrawingRevisions'

interface DrawingRegisterProps {
  projectId: string
  onSelectDrawing?: (drawing: DrawingDocument) => void
  className?: string
}

export function DrawingRegister({
  projectId,
  onSelectDrawing,
  className,
}: DrawingRegisterProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [disciplineFilter, setDisciplineFilter] = useState<string>('all')
  const [setFilter, setSetFilter] = useState<string>('all')
  const [showASIOnly, setShowASIOnly] = useState(false)
  const [expandedDisciplines, setExpandedDisciplines] = useState<Set<string>>(new Set())
  const [selectedDrawing, setSelectedDrawing] = useState<DrawingDocument | null>(null)
  const [showRevisionHistory, setShowRevisionHistory] = useState(false)

  const { data: drawings, isLoading, error } = useDrawingRegister(projectId)

  // Group drawings by discipline
  const groupedDrawings = useMemo(() => {
    if (!drawings) {return {}}

    let filtered = drawings

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (d) =>
          d.drawing_number?.toLowerCase().includes(query) ||
          d.drawing_title?.toLowerCase().includes(query) ||
          d.sheet_number?.toLowerCase().includes(query) ||
          d.title?.toLowerCase().includes(query)
      )
    }

    // Apply discipline filter
    if (disciplineFilter !== 'all') {
      filtered = filtered.filter((d) => d.drawing_discipline === disciplineFilter)
    }

    // Apply document set filter
    if (setFilter !== 'all') {
      filtered = filtered.filter((d) => d.document_set === setFilter)
    }

    // Apply ASI filter
    if (showASIOnly) {
      filtered = filtered.filter((d) => d.affected_by_asi)
    }

    // Group by discipline
    return filtered.reduce(
      (acc, drawing) => {
        const discipline = drawing.drawing_discipline || 'Unknown'
        if (!acc[discipline]) {
          acc[discipline] = []
        }
        acc[discipline].push(drawing)
        return acc
      },
      {} as Record<string, DrawingDocument[]>
    )
  }, [drawings, searchQuery, disciplineFilter, setFilter, showASIOnly])

  // Get unique document sets from data
  const availableSets = useMemo(() => {
    if (!drawings) {return []}
    const sets = new Set(drawings.map((d) => d.document_set).filter(Boolean))
    return Array.from(sets) as string[]
  }, [drawings])

  // Toggle discipline expansion
  const toggleDiscipline = (discipline: string) => {
    setExpandedDisciplines((prev) => {
      const next = new Set(prev)
      if (next.has(discipline)) {
        next.delete(discipline)
      } else {
        next.add(discipline)
      }
      return next
    })
  }

  // Handle drawing click
  const handleDrawingClick = (drawing: DrawingDocument) => {
    setSelectedDrawing(drawing)
    onSelectDrawing?.(drawing)
  }

  // Export drawing register as CSV
  const handleExport = () => {
    if (!drawings || drawings.length === 0) {return}

    const headers = [
      'Drawing Number',
      'Sheet Number',
      'Discipline',
      'Title',
      'Revision',
      'Revision Date',
      'Document Set',
      'Issue Date',
      'ASI Number',
      'Scale',
    ]

    const rows = drawings.map((d) => [
      d.drawing_number || '',
      d.sheet_number || '',
      d.drawing_discipline || '',
      d.drawing_title || d.title || '',
      `${d.revision_number || 0}${d.revision_letter ? ` (${d.revision_letter})` : ''}`,
      d.revision_date ? format(new Date(d.revision_date), 'yyyy-MM-dd') : '',
      d.document_set || '',
      d.issue_date ? format(new Date(d.issue_date), 'yyyy-MM-dd') : '',
      d.asi_number || '',
      d.scale || '',
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `drawing-register-${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        <FileWarning className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>Error loading drawing register</p>
      </div>
    )
  }

  const totalDrawings = drawings?.length || 0
  const asiAffectedCount = drawings?.filter((d) => d.affected_by_asi).length || 0

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Drawing Register</h2>
          <Badge variant="secondary">{totalDrawings} Drawings</Badge>
          {asiAffectedCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {asiAffectedCount} ASI Affected
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={totalDrawings === 0}>
          <Download className="h-4 w-4 mr-1" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search drawings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={disciplineFilter} onValueChange={setDisciplineFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Discipline" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Disciplines</SelectItem>
            {Object.entries(DRAWING_DISCIPLINES).map(([code, name]) => (
              <SelectItem key={code} value={code}>
                {code} - {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={setFilter} onValueChange={setSetFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Document Set" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sets</SelectItem>
            {availableSets.map((set) => (
              <SelectItem key={set} value={set}>
                {set}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={showASIOnly ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setShowASIOnly(!showASIOnly)}
        >
          <AlertTriangle className="h-4 w-4 mr-1" />
          ASI Only
        </Button>
      </div>

      {/* Drawing List by Discipline */}
      {Object.keys(groupedDrawings).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No drawings found</p>
          <p className="text-sm mt-1">Upload drawings with drawing numbers to populate the register</p>
        </div>
      ) : (
        <div className="space-y-2">
          {Object.entries(groupedDrawings)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([discipline, disciplineDrawings]) => (
              <Collapsible
                key={discipline}
                open={expandedDisciplines.has(discipline)}
                onOpenChange={() => toggleDiscipline(discipline)}
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      {expandedDisciplines.has(discipline) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span className="font-medium">
                        {discipline} - {DRAWING_DISCIPLINES[discipline] || 'Unknown'}
                      </span>
                      <Badge variant="outline">{disciplineDrawings.length}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {disciplineDrawings.some((d) => d.affected_by_asi) && (
                        <Badge variant="destructive" className="text-xs">ASI</Badge>
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="mt-2 border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">Drawing #</TableHead>
                          <TableHead className="w-[80px]">Sheet</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead className="w-[80px] text-center">Rev</TableHead>
                          <TableHead className="w-[100px]">Rev Date</TableHead>
                          <TableHead className="w-[120px]">Set</TableHead>
                          <TableHead className="w-[80px]">ASI</TableHead>
                          <TableHead className="w-[100px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {disciplineDrawings.map((drawing) => (
                          <TableRow
                            key={drawing.id}
                            className={cn(
                              'cursor-pointer hover:bg-muted/50',
                              drawing.affected_by_asi && 'bg-amber-50/50'
                            )}
                            onClick={() => handleDrawingClick(drawing)}
                          >
                            <TableCell className="font-medium">{drawing.drawing_number}</TableCell>
                            <TableCell>{drawing.sheet_number || '-'}</TableCell>
                            <TableCell className="max-w-[300px] truncate">
                              {drawing.drawing_title || drawing.title}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="font-mono">
                                {drawing.revision_number || 0}
                                {drawing.revision_letter && ` (${drawing.revision_letter})`}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {drawing.revision_date
                                ? format(new Date(drawing.revision_date), 'MM/dd/yy')
                                : '-'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {drawing.document_set || '-'}
                            </TableCell>
                            <TableCell>
                              {drawing.asi_number ? (
                                <Badge variant="destructive" className="text-xs">
                                  {drawing.asi_number}
                                </Badge>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedDrawing(drawing)
                                    setShowRevisionHistory(true)
                                  }}
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                                {drawing.file_url && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      window.open(drawing.file_url!, '_blank')
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
        </div>
      )}

      {/* Revision History Dialog */}
      {selectedDrawing && (
        <DrawingRevisionHistoryDialog
          drawing={selectedDrawing}
          projectId={projectId}
          open={showRevisionHistory}
          onOpenChange={setShowRevisionHistory}
        />
      )}
    </div>
  )
}

// =============================================
// Revision History Dialog
// =============================================

interface DrawingRevisionHistoryDialogProps {
  drawing: DrawingDocument
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function DrawingRevisionHistoryDialog({
  drawing,
  projectId,
  open,
  onOpenChange,
}: DrawingRevisionHistoryDialogProps) {
  const { data: revisions, isLoading } = useDrawingRevisionHistory(
    drawing.drawing_number || undefined,
    projectId
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Revision History: {drawing.drawing_number}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : !revisions || revisions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No revision history found</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {revisions.map((rev, index) => (
              <div
                key={rev.id}
                className={cn(
                  'border rounded-lg p-4',
                  index === 0 ? 'bg-blue-50 border-blue-200' : 'bg-card'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={index === 0 ? 'default' : 'outline'}>
                        Rev {rev.revision_number}
                        {rev.revision_letter && ` (${rev.revision_letter})`}
                      </Badge>
                      {index === 0 && <Badge variant="secondary">Current</Badge>}
                      {rev.affected_by_asi && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          ASI {rev.asi_number}
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium">{rev.drawing_title || rev.title}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      {rev.revision_date && (
                        <span>Revised: {format(new Date(rev.revision_date), 'MMM d, yyyy')}</span>
                      )}
                      {rev.document_set && <span>Set: {rev.document_set}</span>}
                      {rev.scale && <span>Scale: {rev.scale}</span>}
                    </div>
                  </div>
                  {rev.file_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(rev.file_url!, '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default DrawingRegister
