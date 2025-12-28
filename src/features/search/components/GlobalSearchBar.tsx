/**
 * GlobalSearchBar Component
 * Natural language search bar with LLM query expansion.
 * Features: debounced search, entity filters, date range, keyboard shortcuts, and result navigation.
 */

import { useState, useEffect, useRef, useCallback, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  X,
  Loader2,
  Clock,
  FileText,
  AlertCircle,
  ClipboardList,
  ListChecks,
  FileEdit,
  Camera,
  CalendarDays,
  ClipboardCheck,
  CheckSquare,
  Sparkles,
  ChevronDown,
  Filter,
  MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useSemanticSearch,
  type SearchEntityType,
  type SearchResult,
} from '@/features/ai/hooks/useSemanticSearch'

// ============================================================================
// Types
// ============================================================================

interface GlobalSearchBarProps {
  /** Initial project ID filter */
  projectId?: string
  /** Placeholder text */
  placeholder?: string
  /** Whether to show in compact mode */
  compact?: boolean
  /** Custom class name */
  className?: string
  /** Callback when result is selected */
  onResultSelect?: (result: SearchResult) => void
}

interface EntityFilterOption {
  type: SearchEntityType
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

// ============================================================================
// Constants
// ============================================================================

const ENTITY_FILTERS: EntityFilterOption[] = [
  { type: 'rfi', label: 'RFIs', icon: AlertCircle, color: 'text-error' },
  { type: 'submittal', label: 'Submittals', icon: FileText, color: 'text-primary' },
  { type: 'daily_report', label: 'Daily Reports', icon: ClipboardList, color: 'text-success' },
  { type: 'document', label: 'Documents', icon: FileText, color: 'text-muted' },
  { type: 'punch_item', label: 'Punch Items', icon: ListChecks, color: 'text-warning' },
  { type: 'change_order', label: 'Change Orders', icon: FileEdit, color: 'text-purple-500' },
  { type: 'task', label: 'Tasks', icon: CheckSquare, color: 'text-indigo-500' },
  { type: 'meeting', label: 'Meetings', icon: CalendarDays, color: 'text-pink-500' },
  { type: 'inspection', label: 'Inspections', icon: ClipboardCheck, color: 'text-orange-500' },
  { type: 'photo', label: 'Photos', icon: Camera, color: 'text-cyan-500' },
  { type: 'message', label: 'Messages', icon: MessageSquare, color: 'text-teal-500' },
]

const ENTITY_TYPE_ICONS: Record<SearchEntityType, React.ComponentType<{ className?: string }>> = {
  rfi: AlertCircle,
  submittal: FileText,
  daily_report: ClipboardList,
  document: FileText,
  punch_item: ListChecks,
  change_order: FileEdit,
  task: CheckSquare,
  meeting: CalendarDays,
  inspection: ClipboardCheck,
  photo: Camera,
  message: MessageSquare,
}

const ENTITY_TYPE_COLORS: Record<SearchEntityType, string> = {
  rfi: 'bg-error-light text-error-dark dark:bg-red-900/30 dark:text-red-400',
  submittal: 'bg-info-light text-primary-hover dark:bg-blue-900/30 dark:text-blue-400',
  daily_report: 'bg-success-light text-success-dark dark:bg-green-900/30 dark:text-green-400',
  document: 'bg-muted text-secondary dark:bg-surface dark:text-disabled',
  punch_item: 'bg-warning-light text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  change_order: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  task: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  meeting: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  inspection: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  photo: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  message: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
}

const ENTITY_TYPE_LABELS: Record<SearchEntityType, string> = {
  rfi: 'RFI',
  submittal: 'Submittal',
  daily_report: 'Daily Report',
  document: 'Document',
  punch_item: 'Punch Item',
  change_order: 'Change Order',
  task: 'Task',
  meeting: 'Meeting',
  inspection: 'Inspection',
  photo: 'Photo',
  message: 'Message',
}

// ============================================================================
// Subcomponents
// ============================================================================

/**
 * Loading skeleton for search results
 */
function SearchResultSkeleton() {
  return (
    <div className="animate-pulse p-3 border-b border-border dark:border-border">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-muted dark:bg-muted rounded" />
        <div className="flex-1">
          <div className="h-4 bg-muted dark:bg-muted rounded w-3/4 mb-2" />
          <div className="h-3 bg-muted dark:bg-surface rounded w-1/2" />
        </div>
      </div>
    </div>
  )
}

/**
 * Helper function to highlight matched terms - moved outside component to fix React Compiler "Cannot call impure function during render"
 */
function highlightText(text: string, highlightTerms: string[]) {
  if (!highlightTerms.length) {return text}

  const regex = new RegExp(`(${highlightTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
  const parts = text.split(regex)

  return parts.map((part, i) =>
    highlightTerms.some(t => part.toLowerCase() === t.toLowerCase()) ? (
      <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

/**
 * Single search result item
 */
function SearchResultItem({
  result,
  isSelected,
  onClick,
  highlightTerms,
}: {
  result: SearchResult
  isSelected: boolean
  onClick: () => void
  highlightTerms: string[]
}) {
  const Icon = ENTITY_TYPE_ICONS[result.entityType]

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 border-b border-border dark:border-border',
        'hover:bg-surface dark:hover:bg-surface/50 transition-colors',
        'focus:outline-none focus:bg-surface dark:focus:bg-surface/50',
        isSelected && 'bg-primary-50 dark:bg-primary-950/20'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded', ENTITY_TYPE_COLORS[result.entityType])}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              'text-xs font-medium px-1.5 py-0.5 rounded',
              ENTITY_TYPE_COLORS[result.entityType]
            )}>
              {ENTITY_TYPE_LABELS[result.entityType]}
            </span>
            {result.status && (
              <span className="text-xs text-muted dark:text-disabled">
                {result.status}
              </span>
            )}
          </div>
          <h4 className="font-medium text-foreground dark:text-gray-100 truncate heading-card">
            {highlightText(result.title, highlightTerms)}
          </h4>
          {result.description && (
            <p className="text-sm text-muted dark:text-disabled line-clamp-1 mt-0.5">
              {highlightText(result.description, highlightTerms)}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1 text-xs text-disabled dark:text-muted">
            <span>{result.projectName}</span>
            <span>-</span>
            <span>{new Date(result.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="text-xs text-disabled dark:text-muted">
          {result.relevanceScore}%
        </div>
      </div>
    </button>
  )
}

/**
 * Empty state when no results found
 */
function EmptyState({ query }: { query: string }) {
  return (
    <div className="p-8 text-center">
      <Search className="w-12 h-12 mx-auto text-gray-300 dark:text-secondary mb-3" />
      <p className="text-muted dark:text-disabled mb-1">
        No results found for "{query}"
      </p>
      <p className="text-sm text-disabled dark:text-muted">
        Try different keywords or remove filters
      </p>
    </div>
  )
}

/**
 * Recent searches list
 */
function RecentSearches({
  searches,
  onSelect,
  onClear,
}: {
  searches: string[]
  onSelect: (query: string) => void
  onClear: () => void
}) {
  if (!searches.length) {return null}

  return (
    <div className="p-3 border-b border-border dark:border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted dark:text-disabled uppercase">
          Recent Searches
        </span>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-disabled hover:text-secondary dark:hover:text-gray-300"
        >
          Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {searches.slice(0, 5).map((search, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onSelect(search)}
            className="flex items-center gap-1 px-2 py-1 text-sm bg-muted dark:bg-surface rounded hover:bg-muted dark:hover:bg-gray-700 transition-colors"
          >
            <Clock className="w-3 h-3 text-disabled" />
            {search}
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function GlobalSearchBar({
  projectId: initialProjectId,
  placeholder = 'Search across all items...',
  compact = false,
  className,
  onResultSelect,
}: GlobalSearchBarProps) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Dialog state
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [showFilters, setShowFilters] = useState(false)

  // Search hook
  const {
    query,
    setQuery,
    results,
    expandedTerms,
    isLoading,
    hasSearched,
    error,
    search,
    clearResults,
    totalResults,
    searchTimeMs,
    entityFilters,
    setEntityFilters,
    expansionEnabled,
    setExpansionEnabled,
    rateLimit,
    recentSearches,
    clearRecentSearches,
    setProjectId,
  } = useSemanticSearch({
    defaultProjectId: initialProjectId,
    debounceMs: 300,
    enableExpansion: true,
    autoSearch: false,
    minQueryLength: 2,
  })

  // Handle result selection - moved before handleKeyDown that uses it
  const handleResultSelect = useCallback(
    (result: SearchResult) => {
      if (onResultSelect) {
        onResultSelect(result)
      } else {
        navigate(result.url)
      }
      setIsOpen(false)
      clearResults()
      setQuery('')
    },
    [navigate, onResultSelect, clearResults, setQuery]
  )

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, -1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleResultSelect(results[selectedIndex])
        } else if (query.trim()) {
          search()
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        if (hasSearched) {
          clearResults()
          setQuery('')
        } else {
          setIsOpen(false)
        }
      }
    },
    [selectedIndex, results, query, search, hasSearched, clearResults, setQuery, handleResultSelect]
  )

  // Toggle entity filter
  const toggleEntityFilter = useCallback(
    (entityType: SearchEntityType) => {
      setEntityFilters(prev =>
        prev.includes(entityType)
          ? prev.filter(t => t !== entityType)
          : [...prev, entityType]
      )
    },
    [setEntityFilters]
  )

  // Handle recent search selection
  const handleRecentSearchSelect = useCallback(
    (searchQuery: string) => {
      setQuery(searchQuery)
      search()
    },
    [setQuery, search]
  )

  // Global keyboard shortcut (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isOpen])

  // Reset selection when results change
  useEffect(() => {
    const timer = setTimeout(() => {
      setSelectedIndex(-1)
    }, 0)
    return () => clearTimeout(timer)
  }, [results])

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement
      selectedElement?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  // Render compact trigger button
  if (compact) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className={cn(
            'gap-2 text-muted dark:text-disabled',
            className
          )}
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">Ctrl+K</span>
          </kbd>
        </Button>
        {renderDialog()}
      </>
    )
  }

  // Render full search bar
  function renderDialog() {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Search</DialogTitle>
          </DialogHeader>

          {/* Search Input */}
          <div className="flex items-center gap-2 p-4 border-b border-border dark:border-border">
            <Search className="w-5 h-5 text-disabled" />
            <Input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1 border-0 focus-visible:ring-0 text-base"
              autoFocus
            />
            {isLoading && <Loader2 className="w-5 h-5 text-disabled animate-spin" />}
            {query && !isLoading && (
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  clearResults()
                }}
                className="p-1 hover:bg-muted dark:hover:bg-surface rounded"
              >
                <X className="w-4 h-4 text-disabled" />
              </button>
            )}
            <Button
              size="sm"
              onClick={() => search()}
              disabled={!query.trim() || isLoading}
            >
              Search
            </Button>
          </div>

          {/* Filters Row */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border dark:border-border bg-surface dark:bg-background/50">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 text-sm rounded border transition-colors',
                showFilters
                  ? 'bg-primary-100 border-primary-200 text-primary-700 dark:bg-primary-950/30 dark:border-primary-800 dark:text-primary-400'
                  : 'bg-card border-border text-secondary dark:bg-surface dark:border-gray-700 dark:text-gray-300'
              )}
            >
              <Filter className="w-3 h-3" />
              Filters
              {entityFilters.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-white rounded-full dark:bg-primary">
                  {entityFilters.length}
                </span>
              )}
              <ChevronDown className={cn('w-3 h-3 transition-transform', showFilters && 'rotate-180')} />
            </button>

            <div className="h-4 w-px bg-muted dark:bg-muted" />

            <button
              type="button"
              onClick={() => setExpansionEnabled(!expansionEnabled)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 text-sm rounded border transition-colors',
                expansionEnabled
                  ? 'bg-purple-100 border-purple-200 text-purple-700 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-400'
                  : 'bg-card border-border text-secondary dark:bg-surface dark:border-gray-700 dark:text-gray-300'
              )}
              title={expansionEnabled ? 'AI expansion enabled - click to disable' : 'AI expansion disabled - click to enable'}
            >
              <Sparkles className="w-3 h-3" />
              AI Expand
            </button>

            {rateLimit && (
              <span className="ml-auto text-xs text-disabled dark:text-muted">
                {rateLimit.remaining}/{rateLimit.limit} searches remaining
              </span>
            )}
          </div>

          {/* Entity Filters */}
          {showFilters && (
            <div className="px-4 py-3 border-b border-border dark:border-border bg-surface/50 dark:bg-background/30">
              <div className="flex flex-wrap gap-2">
                {ENTITY_FILTERS.map((filter) => {
                  const Icon = filter.icon
                  const isSelected = entityFilters.includes(filter.type)
                  return (
                    <button
                      key={filter.type}
                      type="button"
                      onClick={() => toggleEntityFilter(filter.type)}
                      className={cn(
                        'flex items-center gap-1.5 px-2 py-1 text-sm rounded border transition-colors',
                        isSelected
                          ? ENTITY_TYPE_COLORS[filter.type]
                          : 'bg-card border-border text-secondary dark:bg-surface dark:border-gray-700 dark:text-disabled hover:border-input dark:hover:border-gray-600'
                      )}
                    >
                      <Icon className="w-3 h-3" />
                      {filter.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Results Area */}
          <div
            ref={resultsRef}
            className="max-h-[400px] overflow-y-auto"
          >
            {/* Recent Searches (when no query) */}
            {!query && !hasSearched && (
              <RecentSearches
                searches={recentSearches}
                onSelect={handleRecentSearchSelect}
                onClear={clearRecentSearches}
              />
            )}

            {/* Loading State */}
            {isLoading && (
              <>
                <SearchResultSkeleton />
                <SearchResultSkeleton />
                <SearchResultSkeleton />
              </>
            )}

            {/* Error State */}
            {error && (
              <div className="p-4 text-center text-error">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p>{error.message}</p>
              </div>
            )}

            {/* Results */}
            {!isLoading && hasSearched && results.length > 0 && (
              <>
                {results.map((result, index) => (
                  <SearchResultItem
                    key={`${result.entityType}-${result.id}`}
                    result={result}
                    isSelected={index === selectedIndex}
                    onClick={() => handleResultSelect(result)}
                    highlightTerms={expandedTerms}
                  />
                ))}
              </>
            )}

            {/* Empty State */}
            {!isLoading && hasSearched && results.length === 0 && (
              <EmptyState query={query} />
            )}
          </div>

          {/* Footer */}
          {hasSearched && results.length > 0 && (
            <div className="px-4 py-2 border-t border-border dark:border-border bg-surface dark:bg-background/50 text-xs text-muted dark:text-disabled flex items-center justify-between">
              <span>
                {totalResults} result{totalResults !== 1 ? 's' : ''} in {searchTimeMs}ms
              </span>
              {expandedTerms.length > 1 && (
                <span>
                  Searched: {expandedTerms.slice(0, 3).join(', ')}
                  {expandedTerms.length > 3 && ` +${expandedTerms.length - 3} more`}
                </span>
              )}
            </div>
          )}

          {/* Keyboard Hints */}
          <div className="px-4 py-2 border-t border-border dark:border-border bg-surface dark:bg-background/50 flex items-center gap-4 text-xs text-disabled dark:text-muted">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted dark:bg-muted rounded">Enter</kbd>
              to search/select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted dark:bg-muted rounded">Up</kbd>
              <kbd className="px-1.5 py-0.5 bg-muted dark:bg-muted rounded">Down</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted dark:bg-muted rounded">Esc</kbd>
              to close
            </span>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <div
        onClick={() => setIsOpen(true)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 bg-muted dark:bg-surface rounded-md cursor-pointer',
          'hover:bg-muted dark:hover:bg-gray-700 transition-colors',
          className
        )}
      >
        <Search className="w-4 h-4 text-disabled" />
        <span className="text-sm text-muted dark:text-disabled flex-1">
          {placeholder}
        </span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-card dark:bg-background px-1.5 font-mono text-[10px] font-medium text-muted dark:text-disabled">
          <span className="text-xs">Ctrl+K</span>
        </kbd>
      </div>
      {renderDialog()}
    </>
  )
}
