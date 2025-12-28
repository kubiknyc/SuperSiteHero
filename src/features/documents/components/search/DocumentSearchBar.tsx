// File: /src/features/documents/components/search/DocumentSearchBar.tsx
// Document search input with debouncing and suggestions

import { useState, useEffect, useRef } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { Input, Button } from '@/components/ui'
import { useDocumentSearch } from '@/features/documents/hooks/useDocumentSearch'
import { cn } from '@/lib/utils'
import type { Document } from '@/types/database'
import { logger } from '../../../../lib/utils/logger';


interface DocumentSearchBarProps {
  projectId?: string
  onSearch: (searchTerm: string) => void
  onDocumentSelect?: (document: Document) => void
  placeholder?: string
  showSuggestions?: boolean
}

/**
 * DocumentSearchBar Component
 *
 * Search input with debouncing and optional search suggestions dropdown.
 *
 * Features:
 * - Debounced search (400ms default)
 * - Recent searches display
 * - Search suggestions from matching documents
 * - Clear button
 * - Keyboard navigation support (coming soon)
 * - Mobile-friendly
 *
 * Usage:
 * ```tsx
 * <DocumentSearchBar
 *   projectId={projectId}
 *   onSearch={(term) => logger.log('Search:', term)}
 *   onDocumentSelect={(doc) => navigate(`/documents/${doc.id}`)}
 *   showSuggestions
 * />
 * ```
 */
export function DocumentSearchBar({
  projectId,
  onSearch,
  onDocumentSelect,
  placeholder = 'Search documents by name, number, section...',
  showSuggestions = true,
}: DocumentSearchBarProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedTerm, setDebouncedTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceTimer = useRef<NodeJS.Timeout>()

  // Fetch search results
  const { data: searchResults = [], isLoading } = useDocumentSearch(
    debouncedTerm,
    projectId,
    { enabled: showSuggestions && debouncedTerm.length >= 2 }
  )

  // Debounce search term
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    debounceTimer.current = setTimeout(() => {
      setDebouncedTerm(searchTerm)
    }, 400)

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [searchTerm])

  // Call onSearch when debounced term changes
  useEffect(() => {
    onSearch(debouncedTerm)
  }, [debouncedTerm, onSearch])

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('documentSearchHistory')
    if (stored) {
      setTimeout(() => {
        setRecentSearches(JSON.parse(stored))
      }, 0)
    }
  }, [])

  // Handle click outside dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setShowDropdown(true)
  }

  // Handle clear button
  const handleClear = () => {
    setSearchTerm('')
    setDebouncedTerm('')
    setShowDropdown(false)
  }

  // Handle suggestion click
  const handleSuggestionClick = (document: Document) => {
    setSearchTerm(document.name)
    setShowDropdown(false)

    // Save to recent searches
    const updated = [
      document.name,
      ...recentSearches.filter(s => s !== document.name),
    ].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem('documentSearchHistory', JSON.stringify(updated))

    // Callback
    if (onDocumentSelect) {
      onDocumentSelect(document)
    }
  }

  // Handle recent search click
  const handleRecentClick = (term: string) => {
    setSearchTerm(term)
    setDebouncedTerm(term)
    setShowDropdown(false)
  }

  // Show dropdown if we have content to show
  const hasResults = searchResults.length > 0
  const hasRecentSearches = recentSearches.length > 0
  const shouldShowDropdown = showDropdown && (hasResults || hasRecentSearches)

  return (
    <div className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-disabled" />
        <Input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setShowDropdown(true)}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />

        {/* Clear Button */}
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
            title="Clear search"
          >
            <X className="w-4 h-4" />
          </Button>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-disabled" />
          </div>
        )}
      </div>

      {/* Dropdown Suggestions */}
      {shouldShowDropdown && showSuggestions && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden"
        >
          {/* Search Results */}
          {hasResults && (
            <div className="max-h-96 overflow-y-auto">
              <div className="px-3 py-2 bg-surface text-xs font-semibold text-secondary">
                Search Results
              </div>
              <div className="divide-y">
                {searchResults.map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => handleSuggestionClick(doc)}
                    className="w-full px-3 py-2 text-left hover:bg-surface transition-colors flex items-start gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {doc.name}
                      </p>
                      <p className="text-xs text-muted truncate">
                        {doc.file_name}
                      </p>
                      {doc.drawing_number && (
                        <p className="text-xs text-disabled">
                          Drawing: {doc.drawing_number}
                        </p>
                      )}
                    </div>
                    <span className="text-xs px-2 py-1 bg-muted text-secondary rounded whitespace-nowrap">
                      {doc.document_type.replace('_', ' ')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent Searches */}
          {!hasResults && hasRecentSearches && searchTerm.length === 0 && (
            <div>
              <div className="px-3 py-2 bg-surface text-xs font-semibold text-secondary">
                Recent Searches
              </div>
              <div className="divide-y">
                {recentSearches.map(term => (
                  <button
                    key={term}
                    onClick={() => handleRecentClick(term)}
                    className="w-full px-3 py-2 text-left hover:bg-surface transition-colors text-sm text-secondary"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!hasResults && !hasRecentSearches && searchTerm.length >= 2 && (
            <div className="px-3 py-8 text-center">
              <p className="text-sm text-muted">No documents found</p>
              <p className="text-xs text-disabled mt-1">
                Try different keywords
              </p>
            </div>
          )}

          {/* No Results */}
          {!hasResults && hasRecentSearches && searchTerm.length >= 2 && (
            <div className="px-3 py-4 text-center">
              <p className="text-sm text-muted">No matching documents</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
