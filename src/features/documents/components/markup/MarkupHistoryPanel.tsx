// File: /src/features/documents/components/markup/MarkupHistoryPanel.tsx
// Markup history panel showing author, creation time, and edit history

import { useState, useMemo } from 'react'
import { format, formatDistanceToNow, isToday, isYesterday, startOfDay } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Select } from '@/components/ui/select'
import {
  History,
  User,
  Calendar,
  Search,
  Filter,
  Trash2,
  Eye,
  Edit2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EnhancedShape, MarkupHistoryEntry, MarkupAuthor } from '../../types/markup'

interface MarkupHistoryPanelProps {
  markups: EnhancedShape[]
  authors: MarkupAuthor[]
  currentUserId: string
  onSelectMarkup: (markupId: string) => void
  onDeleteMarkup: (markupId: string) => void
  onEditMarkup: (markupId: string) => void
  onViewMarkup: (markupId: string) => void
  selectedMarkupId?: string
  disabled?: boolean
  className?: string
}

type SortOption = 'newest' | 'oldest' | 'author' | 'type'
type GroupOption = 'none' | 'date' | 'author' | 'type' | 'layer'

const TYPE_LABELS: Record<string, string> = {
  arrow: 'Arrow',
  rectangle: 'Rectangle',
  circle: 'Circle',
  text: 'Text',
  freehand: 'Freehand',
  cloud: 'Cloud',
  dimension: 'Dimension',
  stamp: 'Stamp',
  'photo-pin': 'Photo Pin',
  'measurement-line': 'Measurement',
  'measurement-area': 'Area Measurement',
  highlight: 'Highlight',
  callout: 'Callout',
}

const TYPE_COLORS: Record<string, string> = {
  arrow: 'bg-info-light text-blue-800',
  rectangle: 'bg-success-light text-green-800',
  circle: 'bg-purple-100 text-purple-800',
  text: 'bg-warning-light text-yellow-800',
  freehand: 'bg-orange-100 text-orange-800',
  cloud: 'bg-pink-100 text-pink-800',
  dimension: 'bg-cyan-100 text-cyan-800',
  stamp: 'bg-error-light text-red-800',
  'photo-pin': 'bg-indigo-100 text-indigo-800',
  'measurement-line': 'bg-teal-100 text-teal-800',
  'measurement-area': 'bg-emerald-100 text-emerald-800',
  highlight: 'bg-amber-100 text-amber-800',
  callout: 'bg-muted text-foreground',
}

export function MarkupHistoryPanel({
  markups,
  authors,
  currentUserId,
  onSelectMarkup,
  onDeleteMarkup,
  onEditMarkup,
  onViewMarkup,
  selectedMarkupId,
  disabled = false,
  className,
}: MarkupHistoryPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [groupBy, setGroupBy] = useState<GroupOption>('date')
  const [filterAuthor, setFilterAuthor] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['today', 'yesterday']))

  // Filter and sort markups
  const filteredMarkups = useMemo(() => {
    let result = [...markups]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(m =>
        m.text?.toLowerCase().includes(query) ||
        m.createdByName?.toLowerCase().includes(query) ||
        m.layerName?.toLowerCase().includes(query) ||
        TYPE_LABELS[m.type]?.toLowerCase().includes(query)
      )
    }

    // Apply author filter
    if (filterAuthor !== 'all') {
      result = result.filter(m => m.createdBy === filterAuthor)
    }

    // Apply type filter
    if (filterType !== 'all') {
      result = result.filter(m => m.type === filterType)
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'author':
          return (a.createdByName || '').localeCompare(b.createdByName || '')
        case 'type':
          return a.type.localeCompare(b.type)
        default:
          return 0
      }
    })

    return result
  }, [markups, searchQuery, filterAuthor, filterType, sortBy])

  // Group markups
  const groupedMarkups = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All Markups': filteredMarkups }
    }

    const groups: Record<string, EnhancedShape[]> = {}

    filteredMarkups.forEach(markup => {
      let groupKey: string

      switch (groupBy) {
        case 'date': {
          const date = new Date(markup.createdAt)
          if (isToday(date)) {
            groupKey = 'Today'
          } else if (isYesterday(date)) {
            groupKey = 'Yesterday'
          } else {
            groupKey = format(date, 'MMM d, yyyy')
          }
          break
        }
        case 'author':
          groupKey = markup.createdByName || 'Unknown'
          break
        case 'type':
          groupKey = TYPE_LABELS[markup.type] || markup.type
          break
        case 'layer':
          groupKey = markup.layerName || 'No Layer'
          break
        default:
          groupKey = 'All'
      }

      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(markup)
    })

    return groups
  }, [filteredMarkups, groupBy])

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupKey.toLowerCase())) {
      newExpanded.delete(groupKey.toLowerCase())
    } else {
      newExpanded.add(groupKey.toLowerCase())
    }
    setExpandedGroups(newExpanded)
  }

  const isGroupExpanded = (groupKey: string) => expandedGroups.has(groupKey.toLowerCase())

  const uniqueTypes = [...new Set(markups.map(m => m.type))]

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn('flex items-center gap-2', className)}
        >
          <History className="w-4 h-4" />
          <span className="text-xs">{markups.length}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        {/* Header with Search */}
        <div className="p-3 border-b bg-surface">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm heading-card">Markup History</h4>
            <Badge variant="secondary" className="text-xs">
              {filteredMarkups.length} markup{filteredMarkups.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-disabled" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search markups..."
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="p-2 border-b flex items-center gap-2 bg-card">
          <Select
            value={filterAuthor}
            onChange={(e) => setFilterAuthor(e.target.value)}
            className="h-7 text-xs flex-1"
          >
            <option value="all">All Authors</option>
            <option value={currentUserId}>My Markups</option>
            {authors.filter(a => a.id !== currentUserId).map(author => (
              <option key={author.id} value={author.id}>
                {author.name}
              </option>
            ))}
          </Select>

          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-7 text-xs flex-1"
          >
            <option value="all">All Types</option>
            {uniqueTypes.map(type => (
              <option key={type} value={type}>
                {TYPE_LABELS[type] || type}
              </option>
            ))}
          </Select>

          <Select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupOption)}
            className="h-7 text-xs w-24"
          >
            <option value="date">By Date</option>
            <option value="author">By Author</option>
            <option value="type">By Type</option>
            <option value="layer">By Layer</option>
            <option value="none">No Groups</option>
          </Select>
        </div>

        {/* Markup List */}
        <div className="max-h-96 overflow-y-auto">
          {Object.keys(groupedMarkups).length === 0 ? (
            <div className="p-6 text-center text-muted">
              <History className="w-10 h-10 mx-auto mb-2 text-disabled" />
              <p className="text-sm">No markups found</p>
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
            Object.entries(groupedMarkups).map(([groupKey, groupMarkups]) => (
              <div key={groupKey} className="border-b last:border-b-0">
                {/* Group Header */}
                <button
                  className="w-full flex items-center justify-between px-3 py-2 bg-surface hover:bg-muted transition-colors"
                  onClick={() => toggleGroup(groupKey)}
                >
                  <span className="text-xs font-medium text-secondary">{groupKey}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {groupMarkups.length}
                    </Badge>
                    {isGroupExpanded(groupKey) ? (
                      <ChevronUp className="w-4 h-4 text-disabled" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-disabled" />
                    )}
                  </div>
                </button>

                {/* Group Items */}
                {isGroupExpanded(groupKey) && (
                  <div className="divide-y divide-gray-100">
                    {groupMarkups.map(markup => (
                      <div
                        key={markup.id}
                        className={cn(
                          'p-2 hover:bg-surface transition-colors cursor-pointer',
                          selectedMarkupId === markup.id && 'bg-blue-50 border-l-2 border-blue-500'
                        )}
                        onClick={() => onSelectMarkup(markup.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={cn('text-xs', TYPE_COLORS[markup.type])}>
                                {TYPE_LABELS[markup.type] || markup.type}
                              </Badge>
                              {markup.layerName && (
                                <span className="text-xs text-muted truncate">
                                  {markup.layerName}
                                </span>
                              )}
                            </div>

                            {/* Text preview for text/callout markups */}
                            {markup.text && (
                              <p className="text-xs text-secondary truncate mb-1">
                                "{markup.text}"
                              </p>
                            )}

                            <div className="flex items-center gap-2 text-xs text-muted">
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                <span className="truncate max-w-20">
                                  {markup.createdBy === currentUserId ? 'You' : markup.createdByName}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{formatDistanceToNow(new Date(markup.createdAt), { addSuffix: true })}</span>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onViewMarkup(markup.id)
                              }}
                              className="p-1 hover:bg-muted rounded"
                              title="Zoom to markup"
                            >
                              <Eye className="w-3 h-3 text-muted" />
                            </button>
                            {markup.createdBy === currentUserId && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onEditMarkup(markup.id)
                                  }}
                                  className="p-1 hover:bg-muted rounded"
                                  title="Edit markup"
                                  disabled={disabled}
                                >
                                  <Edit2 className="w-3 h-3 text-muted" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onDeleteMarkup(markup.id)
                                  }}
                                  className="p-1 hover:bg-muted rounded"
                                  title="Delete markup"
                                  disabled={disabled}
                                >
                                  <Trash2 className="w-3 h-3 text-error" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Color indicator */}
                        <div
                          className="mt-1 h-0.5 rounded-full"
                          style={{ backgroundColor: markup.stroke }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer Stats */}
        <div className="p-2 border-t bg-surface text-xs text-muted">
          <div className="flex items-center justify-between">
            <span>
              {authors.length} contributor{authors.length !== 1 ? 's' : ''}
            </span>
            <span>
              {uniqueTypes.length} type{uniqueTypes.length !== 1 ? 's' : ''} of annotations
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default MarkupHistoryPanel
