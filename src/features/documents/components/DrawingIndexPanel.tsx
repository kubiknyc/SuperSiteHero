// File: /src/features/documents/components/DrawingIndexPanel.tsx
// Premium blueprint-styled collapsible sidebar panel for sheet navigation

import { useState, useMemo } from 'react'
import { X, Search, ChevronRight, FileText } from 'lucide-react'
import { Button, ScrollArea } from '@/components/ui'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { Document } from '@/types/database'

// Import blueprint styles
import '@/styles/blueprint-navigation.css'

interface DrawingIndexPanelProps {
  documents: Document[]
  currentDocumentId?: string
  currentPage?: number
  onNavigate: (documentId: string, pageNumber?: number) => void
  isOpen: boolean
  onClose: () => void
}

/**
 * Discipline mapping with premium color scheme
 * Colors optimized for field visibility on tablets
 */
const DISCIPLINE_MAP: Record<string, { name: string; code: string }> = {
  A: { name: 'Architectural', code: 'A' },
  S: { name: 'Structural', code: 'S' },
  M: { name: 'Mechanical', code: 'M' },
  E: { name: 'Electrical', code: 'E' },
  P: { name: 'Plumbing', code: 'P' },
  FP: { name: 'Fire Protection', code: 'FP' },
  C: { name: 'Civil', code: 'C' },
  L: { name: 'Landscape', code: 'L' },
  G: { name: 'General', code: 'G' },
}

function extractDiscipline(fileName: string): string {
  const match = fileName.match(/^([A-Z]{1,2})[-\s]?(\d+)/)
  if (match) {return match[1]}
  const firstLetter = fileName.charAt(0).toUpperCase()
  return /[A-Z]/.test(firstLetter) ? firstLetter : 'G'
}

function extractSheetNumber(fileName: string): string {
  const nameWithoutExt = fileName.replace(/\.(pdf|png|jpg|jpeg|dwg|dxf)$/i, '')
  const match = nameWithoutExt.match(/^([A-Z]{1,2}[-\s]?\d+)/)
  if (match) {return match[1]}
  return nameWithoutExt
}

function extractSheetTitle(fileName: string): string {
  const nameWithoutExt = fileName.replace(/\.(pdf|png|jpg|jpeg|dwg|dxf)$/i, '')
  const withoutNumber = nameWithoutExt.replace(/^[A-Z]{1,2}[-\s]?\d+[-\s]*/, '')
  return withoutNumber || nameWithoutExt
}

interface GroupedDocuments {
  discipline: string
  disciplineName: string
  documents: Array<{
    id: string
    sheetNumber: string
    sheetTitle: string
    fileName: string
  }>
}

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

  const groupedDocuments = useMemo(() => {
    const filtered = documents.filter((doc) => {
      if (!searchTerm) {return true}
      const lower = searchTerm.toLowerCase()
      return (
        doc.file_name?.toLowerCase().includes(lower) ||
        doc.name?.toLowerCase().includes(lower)
      )
    })

    const groups = new Map<string, GroupedDocuments>()

    filtered.forEach((doc) => {
      const fileName = doc.file_name || doc.name || 'Untitled'
      const discipline = extractDiscipline(fileName)
      const disciplineInfo = DISCIPLINE_MAP[discipline] || DISCIPLINE_MAP.G

      if (!groups.has(discipline)) {
        groups.set(discipline, {
          discipline,
          disciplineName: disciplineInfo.name,
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

    groups.forEach((group) => {
      group.documents.sort((a, b) => {
        const aNum = parseInt(a.sheetNumber.replace(/\D/g, ''), 10) || 0
        const bNum = parseInt(b.sheetNumber.replace(/\D/g, ''), 10) || 0
        return aNum - bNum
      })
    })

    const disciplineOrder = ['A', 'S', 'M', 'E', 'P', 'FP', 'C', 'L', 'G']
    return Array.from(groups.values()).sort((a, b) => {
      const aIndex = disciplineOrder.indexOf(a.discipline)
      const bIndex = disciplineOrder.indexOf(b.discipline)
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
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
    if (window.innerWidth < 768) {
      onClose()
    }
  }

  if (!isOpen) {return null}

  const totalMatching = groupedDocuments.reduce((sum, g) => sum + g.documents.length, 0)

  return (
    <>
      {/* Backdrop (mobile only) */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden blueprint-backdrop-enter"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-80 z-50',
          'flex flex-col',
          'md:relative md:w-80',
          'drawing-index-panel blueprint-panel-enter',
          isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="drawing-index-header flex items-center justify-between">
          <h2 className="drawing-index-title flex items-center gap-2">
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10,9 9,9 8,9" />
            </svg>
            Drawing Index
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-10 w-10 p-0 text-[var(--blueprint-text-muted)] hover:text-[var(--blueprint-text-primary)] hover:bg-[var(--blueprint-bg-hover)]"
            aria-label="Close panel"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[var(--blueprint-border)]">
          <div className="blueprint-search-container">
            <Search className="blueprint-search-icon" />
            <input
              type="text"
              placeholder="Search sheets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="blueprint-search-input"
            />
          </div>
        </div>

        {/* Sheet List */}
        <ScrollArea className="flex-1">
          <div className="p-3 blueprint-grid-bg-subtle min-h-full">
            {groupedDocuments.length === 0 ? (
              <div className="blueprint-empty-state">
                <FileText className="blueprint-empty-icon" />
                <p className="blueprint-empty-text">
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
                        className="discipline-header w-full"
                        data-state={expandedDisciplines.has(group.discipline) ? 'open' : 'closed'}
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <ChevronRight className="discipline-chevron" />
                          <span className="discipline-name truncate">
                            {group.disciplineName}
                          </span>
                        </div>
                        <span className={cn('discipline-badge', `discipline-badge-${group.discipline}`)}>
                          {group.documents.length}
                        </span>
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="mt-1 space-y-0.5">
                        {group.documents.map((doc) => {
                          const isCurrent = doc.id === currentDocumentId
                          return (
                            <button
                              key={doc.id}
                              type="button"
                              onClick={() => handleNavigate(doc.id)}
                              className={cn(
                                'sheet-list-item w-full text-left',
                                isCurrent && 'sheet-list-item--current'
                              )}
                            >
                              <FileText className="sheet-icon" />
                              <div className="flex-1 min-w-0">
                                <div className="sheet-number">
                                  {doc.sheetNumber}
                                </div>
                                <div className="sheet-title">
                                  {doc.sheetTitle}
                                </div>
                              </div>
                              {isCurrent && (
                                <div className="sheet-active-indicator" />
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
        <div className="blueprint-panel-footer">
          <div className="blueprint-panel-stats">
            <span className="blueprint-panel-stats-highlight">{documents.length}</span>
            {' sheet'}{documents.length !== 1 ? 's' : ''} total
            {searchTerm && totalMatching > 0 && (
              <span>
                {' · '}
                <span className="blueprint-panel-stats-highlight">{totalMatching}</span>
                {' matching'}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
