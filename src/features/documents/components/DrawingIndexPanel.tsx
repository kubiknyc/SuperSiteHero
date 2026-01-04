// File: /src/features/documents/components/DrawingIndexPanel.tsx
// Collapsible sidebar panel for quick sheet navigation in drawing sets

import { useState, useMemo } from 'react'
import { X, Search, ChevronDown, ChevronRight, FileText } from 'lucide-react'
import { Button, Input, ScrollArea, Badge } from '@/components/ui'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { Document } from '@/types/database'

interface DrawingIndexPanelProps {
  documents: Document[]
  currentDocumentId?: string
  currentPage?: number
  onNavigate: (documentId: string, pageNumber?: number) => void
  isOpen: boolean
  onClose: () => void
}

/**
 * Discipline mapping for sheet prefixes
 */
const DISCIPLINE_MAP: Record<string, { name: string; color: string }> = {
  A: { name: 'Architectural', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  S: { name: 'Structural', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  M: { name: 'Mechanical', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  E: { name: 'Electrical', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  P: { name: 'Plumbing', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  FP: { name: 'Fire Protection', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  C: { name: 'Civil', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300' },
  L: { name: 'Landscape', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  G: { name: 'General', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300' },
}

/**
 * Extract discipline from sheet number
 * Handles formats like:
 * - A-001, A001 (Architectural)
 * - S-100, S100 (Structural)
 * - FP-001 (Fire Protection)
 */
function extractDiscipline(fileName: string): string {
  const match = fileName.match(/^([A-Z]{1,2})[-\s]?(\d+)/)
  if (match) {
    return match[1]
  }
  // Fallback to first letter
  const firstLetter = fileName.charAt(0).toUpperCase()
  return /[A-Z]/.test(firstLetter) ? firstLetter : 'G'
}

/**
 * Extract sheet number from filename
 */
function extractSheetNumber(fileName: string): string {
  // Remove file extension
  const nameWithoutExt = fileName.replace(/\.(pdf|png|jpg|jpeg|dwg|dxf)$/i, '')
  // Try to extract standard sheet number pattern
  const match = nameWithoutExt.match(/^([A-Z]{1,2}[-\s]?\d+)/)
  if (match) {
    return match[1]
  }
  return nameWithoutExt
}

/**
 * Extract sheet title (everything after the sheet number)
 */
function extractSheetTitle(fileName: string): string {
  const nameWithoutExt = fileName.replace(/\.(pdf|png|jpg|jpeg|dwg|dxf)$/i, '')
  // Remove sheet number prefix
  const withoutNumber = nameWithoutExt.replace(/^[A-Z]{1,2}[-\s]?\d+[-\s]*/, '')
  return withoutNumber || nameWithoutExt
}

/**
 * Group documents by discipline
 */
interface GroupedDocuments {
  discipline: string
  disciplineName: string
  disciplineColor: string
  documents: Array<{
    id: string
    sheetNumber: string
    sheetTitle: string
    fileName: string
  }>
}

/**
 * DrawingIndexPanel Component
 *
 * A collapsible sidebar panel that shows all sheets in a drawing set,
 * grouped by discipline for quick navigation.
 *
 * Features:
 * - Search/filter by sheet number or title
 * - Group sheets by discipline (A=Architectural, S=Structural, etc.)
 * - Collapsible discipline groups
 * - Highlight current sheet
 * - Click to navigate to any sheet
 * - Sheet count badges per discipline
 * - Responsive slide-out panel
 *
 * Usage:
 * ```tsx
 * <DrawingIndexPanel
 *   documents={drawingDocuments}
 *   currentDocumentId={currentDoc?.id}
 *   onNavigate={(docId) => navigateToDocument(docId)}
 *   isOpen={isPanelOpen}
 *   onClose={() => setIsPanelOpen(false)}
 * />
 * ```
 */
export function DrawingIndexPanel({
  documents,
  currentDocumentId,
  currentPage: _currentPage,
  onNavigate,
  isOpen,
  onClose,
}: DrawingIndexPanelProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedDisciplines, setExpandedDisciplines] = useState<Set<string>>(
    new Set(Object.keys(DISCIPLINE_MAP))
  )

  // Group and filter documents
  const groupedDocuments = useMemo(() => {
    // Filter by search term
    const filtered = documents.filter((doc) => {
      if (!searchTerm) {return true}
      const lower = searchTerm.toLowerCase()
      return (
        doc.file_name?.toLowerCase().includes(lower) ||
        doc.name?.toLowerCase().includes(lower)
      )
    })

    // Group by discipline
    const groups = new Map<string, GroupedDocuments>()

    filtered.forEach((doc) => {
      const fileName = doc.file_name || doc.name || 'Untitled'
      const discipline = extractDiscipline(fileName)
      const disciplineInfo = DISCIPLINE_MAP[discipline] || DISCIPLINE_MAP.G

      if (!groups.has(discipline)) {
        groups.set(discipline, {
          discipline,
          disciplineName: disciplineInfo.name,
          disciplineColor: disciplineInfo.color,
          documents: [],
        })
      }

      groups.get(discipline)!.documents.push({
        id: doc.id,
        sheetNumber: extractSheetNumber(fileName),
        sheetTitle: extractSheetTitle(fileName),
        fileName,
      })
    })

    // Sort documents within each group by sheet number
    groups.forEach((group) => {
      group.documents.sort((a, b) => {
        // Extract numeric part for proper sorting
        const aNum = parseInt(a.sheetNumber.replace(/\D/g, ''), 10) || 0
        const bNum = parseInt(b.sheetNumber.replace(/\D/g, ''), 10) || 0
        return aNum - bNum
      })
    })

    // Convert to array and sort by discipline
    const disciplineOrder = ['A', 'S', 'M', 'E', 'P', 'FP', 'C', 'L', 'G']
    return Array.from(groups.values()).sort((a, b) => {
      const aIndex = disciplineOrder.indexOf(a.discipline)
      const bIndex = disciplineOrder.indexOf(b.discipline)
      const aOrder = aIndex === -1 ? 999 : aIndex
      const bOrder = bIndex === -1 ? 999 : bIndex
      return aOrder - bOrder
    })
  }, [documents, searchTerm])

  const toggleDiscipline = (discipline: string) => {
    setExpandedDisciplines((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(discipline)) {
        newSet.delete(discipline)
      } else {
        newSet.add(discipline)
      }
      return newSet
    })
  }

  const handleNavigate = (documentId: string) => {
    onNavigate(documentId)
    // On mobile, close panel after navigation
    if (window.innerWidth < 768) {
      onClose()
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <>
      {/* Backdrop (mobile only) */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-80 bg-card border-l border-border shadow-lg z-50',
          'flex flex-col',
          'md:relative md:w-80 md:shadow-none',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-secondary">Drawing Index</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <Input
              type="text"
              placeholder="Search sheets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Sheet List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {groupedDocuments.length === 0 ? (
              <div className="p-8 text-center text-muted">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">
                  {searchTerm ? 'No sheets found' : 'No drawings available'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {groupedDocuments.map((group) => (
                  <Collapsible
                    key={group.discipline}
                    open={expandedDisciplines.has(group.discipline)}
                    onOpenChange={() => toggleDiscipline(group.discipline)}
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          'flex items-center justify-between w-full px-3 py-2 rounded-md',
                          'hover:bg-surface transition-colors',
                          'text-left font-medium text-sm'
                        )}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {expandedDisciplines.has(group.discipline) ? (
                            <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted" />
                          ) : (
                            <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted" />
                          )}
                          <span className="truncate text-secondary">
                            {group.disciplineName}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn('ml-2 flex-shrink-0', group.disciplineColor)}
                        >
                          {group.documents.length}
                        </Badge>
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="ml-6 mt-1 space-y-0.5">
                        {group.documents.map((doc) => {
                          const isCurrent = doc.id === currentDocumentId
                          return (
                            <button
                              key={doc.id}
                              type="button"
                              onClick={() => handleNavigate(doc.id)}
                              className={cn(
                                'w-full px-3 py-2 rounded-md text-left',
                                'hover:bg-surface transition-colors',
                                'flex items-start gap-2 group',
                                isCurrent && 'bg-primary/10 border-l-2 border-primary'
                              )}
                            >
                              <FileText
                                className={cn(
                                  'h-4 w-4 mt-0.5 flex-shrink-0',
                                  isCurrent ? 'text-primary' : 'text-muted group-hover:text-secondary'
                                )}
                              />
                              <div className="flex-1 min-w-0">
                                <div
                                  className={cn(
                                    'text-xs font-medium mb-0.5',
                                    isCurrent ? 'text-primary' : 'text-secondary'
                                  )}
                                >
                                  {doc.sheetNumber}
                                </div>
                                <div className="text-xs text-muted truncate">
                                  {doc.sheetTitle}
                                </div>
                              </div>
                              {isCurrent && (
                                <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer with stats */}
        <div className="p-3 border-t border-border bg-surface/50">
          <div className="text-xs text-muted text-center">
            {documents.length} sheet{documents.length !== 1 ? 's' : ''} total
            {searchTerm && groupedDocuments.length > 0 && (
              <span>
                {' '}
                • {groupedDocuments.reduce((sum, g) => sum + g.documents.length, 0)}{' '}
                matching
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
