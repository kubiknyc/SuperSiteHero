// File: /src/features/documents/components/DocumentSearchResults.tsx
// Component for displaying document search results with OCR content

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  Input,
  Button,
  Badge,
} from '@/components/ui'
import { useDocumentContentSearch } from '../hooks/useDocumentAi'
import { DocumentCategoryBadge } from './DocumentCategoryBadge'
import type { ContentSearchResult } from '@/types/document-ai'

interface DocumentSearchResultsProps {
  projectId: string
  initialQuery?: string
  className?: string
  onDocumentClick?: (documentId: string) => void
  includeContent?: boolean
}

/**
 * DocumentSearchResults Component
 *
 * Full-text search across document content including OCR text.
 * Displays matching documents with highlighted excerpts.
 *
 * Usage:
 * ```tsx
 * <DocumentSearchResults projectId="proj-123" />
 * <DocumentSearchResults
 *   projectId="proj-123"
 *   onDocumentClick={(id) => navigate(`/documents/${id}`)}
 * />
 * ```
 */
export function DocumentSearchResults({
  projectId,
  initialQuery = '',
  className,
  onDocumentClick,
  includeContent = true,
}: DocumentSearchResultsProps) {
  const [query, setQuery] = useState(initialQuery)
  const [searchQuery, setSearchQuery] = useState(initialQuery)

  const { data: results, isLoading, error, isFetching } = useDocumentContentSearch(
    projectId,
    searchQuery,
    { includeContent }
  )

  const handleSearch = () => {
    setSearchQuery(query.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span>🔍</span>
          <span>Document Search</span>
        </CardTitle>

        {/* Search input */}
        <div className="flex gap-2 mt-3">
          <Input
            type="text"
            placeholder="Search document content..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <Button
            onClick={handleSearch}
            disabled={query.trim().length < 2 || isFetching}
          >
            {isFetching ? 'Searching...' : 'Search'}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Loading state */}
        {isLoading && searchQuery && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse p-4 bg-gray-50 rounded-lg">
                <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-full bg-gray-100 rounded mb-1" />
                <div className="h-3 w-2/3 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-center text-red-600 py-4">
            <p>Search failed</p>
            <p className="text-sm text-gray-500">{(error as Error).message}</p>
          </div>
        )}

        {/* Empty state - no search yet */}
        {!searchQuery && !isLoading && (
          <div className="text-center text-gray-500 py-8">
            <span className="text-3xl">📄</span>
            <p className="mt-2">Search document content</p>
            <p className="text-sm">
              Enter a search term to find documents by their content
            </p>
          </div>
        )}

        {/* No results */}
        {searchQuery && !isLoading && results?.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <span className="text-3xl">🔍</span>
            <p className="mt-2">No documents found</p>
            <p className="text-sm">
              No documents match "{searchQuery}"
            </p>
          </div>
        )}

        {/* Search results */}
        {results && results.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{results.length} document(s) found</span>
              {isFetching && <span className="animate-pulse">Updating...</span>}
            </div>

            {results.map((result) => (
              <SearchResultItem
                key={result.document_id}
                result={result}
                searchQuery={searchQuery}
                onClick={onDocumentClick}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Individual search result item
 */
interface SearchResultItemProps {
  result: ContentSearchResult
  searchQuery: string
  onClick?: (documentId: string) => void
}

function SearchResultItem({ result, searchQuery, onClick }: SearchResultItemProps) {
  const [expanded, setExpanded] = useState(false)

  const handleClick = () => {
    onClick?.(result.document_id)
  }

  // Highlight search term in content
  const highlightContent = (content: string, query: string) => {
    if (!query) {return content}

    const parts = content.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'))
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  return (
    <div
      className={cn(
        'p-4 rounded-lg border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors',
        onClick && 'cursor-pointer'
      )}
      onClick={handleClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-gray-900 truncate">
            {result.document_name}
          </h4>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {result.document_number && (
              <span className="text-xs text-gray-500">
                #{result.document_number}
              </span>
            )}
            {result.category && (
              <DocumentCategoryBadge
                category={result.category}
                className="text-[10px]"
              />
            )}
          </div>
        </div>

        {/* Relevance score */}
        {result.rank && (
          <Badge variant="outline" className="text-xs">
            Rank: {result.rank.toFixed(2)}
          </Badge>
        )}
      </div>

      {/* Content excerpt */}
      {result.content_excerpt && (
        <div className="mt-3">
          <p
            className={cn(
              'text-sm text-gray-600 leading-relaxed',
              !expanded && 'line-clamp-3'
            )}
          >
            {highlightContent(result.content_excerpt, searchQuery)}
          </p>

          {result.content_excerpt.length > 200 && (
            <button
              type="button"
              className="text-xs text-blue-600 hover:underline mt-1"
              onClick={(e) => {
                e.stopPropagation()
                setExpanded(!expanded)
              }}
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {/* Match locations */}
      {result.match_locations && result.match_locations.length > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-gray-400">Matches:</span>
          <div className="flex flex-wrap gap-1">
            {result.match_locations.slice(0, 5).map((loc, i) => (
              <Badge key={i} variant="outline" className="text-[10px]">
                {loc.source === 'ocr' ? '📝 OCR' : '📄 Metadata'}
                {loc.page && ` (p.${loc.page})`}
              </Badge>
            ))}
            {result.match_locations.length > 5 && (
              <span className="text-xs text-gray-400">
                +{result.match_locations.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Compact search input for integration into other components
 */
interface DocumentSearchInputProps {
  projectId: string
  onSearch?: (query: string) => void
  className?: string
}

export function DocumentSearchInput({
  projectId,
  onSearch,
  className,
}: DocumentSearchInputProps) {
  const [query, setQuery] = useState('')

  const handleSearch = () => {
    if (query.trim().length >= 2) {
      onSearch?.(query.trim())
    }
  }

  return (
    <div className={cn('flex gap-2', className)}>
      <Input
        type="text"
        placeholder="Search documents..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        className="flex-1"
      />
      <Button
        size="sm"
        variant="outline"
        onClick={handleSearch}
        disabled={query.trim().length < 2}
      >
        🔍
      </Button>
    </div>
  )
}
