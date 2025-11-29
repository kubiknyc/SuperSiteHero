// File: /src/features/documents/components/SimilarDocumentsList.tsx
// Component for displaying similar documents based on content analysis

import { cn } from '@/lib/utils'
import { Card, CardHeader, CardContent, CardTitle, Badge } from '@/components/ui'
import { useSimilarDocuments } from '../hooks/useDocumentAi'
import { DocumentCategoryBadge } from './DocumentCategoryBadge'
import type { SimilarDocument } from '@/types/document-ai'

interface SimilarDocumentsListProps {
  documentId: string
  threshold?: number
  maxItems?: number
  className?: string
  onDocumentClick?: (documentId: string) => void
}

/**
 * SimilarDocumentsList Component
 *
 * Displays documents that are similar to the current document
 * based on content similarity (embeddings).
 *
 * Usage:
 * ```tsx
 * <SimilarDocumentsList documentId="doc-123" />
 * <SimilarDocumentsList documentId="doc-123" threshold={0.7} maxItems={5} />
 * ```
 */
export function SimilarDocumentsList({
  documentId,
  threshold = 0.5,
  maxItems = 10,
  className,
  onDocumentClick,
}: SimilarDocumentsListProps) {
  const { data: similarDocs, isLoading, error } = useSimilarDocuments(documentId, threshold)

  if (isLoading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader>
          <CardTitle className="h-4 w-40 bg-gray-200 rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="h-10 w-10 bg-gray-200 rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-gray-200 rounded" />
                  <div className="h-3 w-1/2 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn('border-red-200', className)}>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <p>Failed to find similar documents</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const documents = similarDocs?.slice(0, maxItems) || []

  if (documents.length === 0) {
    return (
      <Card className={cn('border-gray-200', className)}>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            <span className="text-2xl">🔗</span>
            <p className="mt-2">No similar documents found</p>
            <p className="text-sm mt-1">
              Try lowering the similarity threshold to find more matches.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <span>🔗</span>
          <span>Similar Documents</span>
          <Badge variant="outline" className="ml-auto text-xs">
            {documents.length} found
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {documents.map((doc) => (
            <SimilarDocumentItem
              key={doc.document_id}
              document={doc}
              onClick={onDocumentClick}
            />
          ))}
        </div>

        {similarDocs && similarDocs.length > maxItems && (
          <p className="text-xs text-gray-400 mt-4 text-center">
            Showing {maxItems} of {similarDocs.length} similar documents
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Individual similar document item
 */
interface SimilarDocumentItemProps {
  document: SimilarDocument
  onClick?: (documentId: string) => void
}

function SimilarDocumentItem({ document, onClick }: SimilarDocumentItemProps) {
  const similarityPercent = Math.round(document.similarity_score * 100)

  // Similarity color scale
  const getSimilarityColor = (score: number) => {
    if (score >= 0.9) {return 'text-green-600 bg-green-50'}
    if (score >= 0.7) {return 'text-blue-600 bg-blue-50'}
    if (score >= 0.5) {return 'text-amber-600 bg-amber-50'}
    return 'text-gray-600 bg-gray-50'
  }

  const handleClick = () => {
    onClick?.(document.document_id)
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors',
        onClick && 'cursor-pointer'
      )}
      onClick={handleClick}
    >
      {/* Similarity score */}
      <div
        className={cn(
          'flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm',
          getSimilarityColor(document.similarity_score)
        )}
      >
        {similarityPercent}%
      </div>

      {/* Document info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-gray-900 truncate">
          {document.document_name}
        </h4>
        <div className="flex items-center gap-2 mt-1">
          {document.category && (
            <DocumentCategoryBadge
              category={document.category}
              className="text-[10px]"
            />
          )}
          {document.document_number && (
            <span className="text-xs text-gray-500">
              #{document.document_number}
            </span>
          )}
        </div>
      </div>

      {/* Similarity type indicator */}
      {document.similarity_type && (
        <Badge variant="outline" className="text-[10px] flex-shrink-0">
          {document.similarity_type}
        </Badge>
      )}

      {/* Arrow indicator */}
      {onClick && (
        <span className="text-gray-400 flex-shrink-0">→</span>
      )}
    </div>
  )
}

/**
 * Compact similar documents indicator for list views
 */
interface SimilarDocumentsCountProps {
  documentId: string
  className?: string
}

export function SimilarDocumentsCount({ documentId, className }: SimilarDocumentsCountProps) {
  const { data: similarDocs } = useSimilarDocuments(documentId, 0.7)

  if (!similarDocs || similarDocs.length === 0) {
    return null
  }

  return (
    <Badge variant="outline" className={cn('text-xs gap-1', className)}>
      <span>🔗</span>
      <span>{similarDocs.length} similar</span>
    </Badge>
  )
}
