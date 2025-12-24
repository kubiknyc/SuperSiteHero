// File: /src/features/documents/components/OcrResultPanel.tsx
// Panel component for displaying OCR text extraction results

import { useState } from 'react'
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  Button,
  Badge,
} from '@/components/ui'
import { cn } from '@/lib/utils'
import { useDocumentOcr, useReprocessOcr } from '../hooks/useDocumentAi'
import type { DocumentOcrResult, CloudVisionTextAnnotation } from '@/types/document-ai'

interface OcrResultPanelProps {
  documentId: string
  className?: string
  showReprocessButton?: boolean
  maxHeight?: string
}

/**
 * OcrResultPanel Component
 *
 * Displays OCR extraction results including:
 * - Extracted text content
 * - Processing status and confidence
 * - Word/block-level details (collapsible)
 * - Option to reprocess
 *
 * Usage:
 * ```tsx
 * <OcrResultPanel documentId="doc-123" />
 * ```
 */
export function OcrResultPanel({
  documentId,
  className,
  showReprocessButton = true,
  maxHeight = '400px',
}: OcrResultPanelProps) {
  const [showDetails, setShowDetails] = useState(false)
  const { data: ocrResult, isLoading, error } = useDocumentOcr(documentId)
  const reprocessMutation = useReprocessOcr()

  if (isLoading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 bg-muted rounded" />
            <span className="h-4 w-32 bg-muted rounded" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-5/6" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn('border-red-200', className)}>
        <CardContent className="pt-6">
          <div className="text-center text-error">
            <p>Failed to load OCR results</p>
            <p className="text-sm text-muted mt-1">{(error as Error).message}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!ocrResult) {
    return (
      <Card className={cn('border-border', className)}>
        <CardContent className="pt-6">
          <div className="text-center text-muted">
            <p>No OCR data available</p>
            <p className="text-sm mt-1">
              This document has not been processed with OCR yet.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleReprocess = () => {
    reprocessMutation.mutate(documentId)
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <span>📝</span>
            <span>Extracted Text</span>
            {ocrResult.confidence_score && (
              <Badge variant="outline" className="ml-2 text-xs">
                {Math.round(ocrResult.confidence_score * 100)}% confidence
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {ocrResult.word_count && (
              <span className="text-xs text-muted">{ocrResult.word_count} words</span>
            )}
            {showReprocessButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReprocess}
                disabled={reprocessMutation.isPending}
              >
                {reprocessMutation.isPending ? 'Processing...' : 'Reprocess'}
              </Button>
            )}
          </div>
        </div>
        {ocrResult.provider && (
          <p className="text-xs text-disabled">
            Processed by {ocrResult.provider} • {ocrResult.language_detected || 'Unknown language'}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {/* Main extracted text */}
        <div
          className="bg-surface rounded-lg p-4 font-mono text-sm overflow-auto"
          style={{ maxHeight }}
        >
          {ocrResult.extracted_text || (
            <span className="text-disabled italic">No text extracted</span>
          )}
        </div>

        {/* Block-level details (collapsible) */}
        {ocrResult.text_blocks && ocrResult.text_blocks.length > 0 && (
          <div className="mt-4">
            <button
              type="button"
              className="text-sm text-primary hover:underline flex items-center gap-1"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? '▼' : '▶'} View {ocrResult.text_blocks.length} text blocks
            </button>

            {showDetails && (
              <div className="mt-2 space-y-2 max-h-60 overflow-auto">
                {ocrResult.text_blocks.map((block, index) => (
                  <div
                    key={index}
                    className="bg-card border rounded p-2 text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">Block {index + 1}</span>
                      {block.confidence && (
                        <Badge variant="outline" className="text-[10px]">
                          {Math.round(block.confidence * 100)}%
                        </Badge>
                      )}
                    </div>
                    <p className="text-secondary font-mono">{block.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Processing info */}
        <div className="mt-4 pt-4 border-t text-xs text-disabled flex items-center justify-between">
          <span>
            Last processed: {ocrResult.processed_at ? new Date(ocrResult.processed_at).toLocaleString() : 'N/A'}
          </span>
          {ocrResult.page_count && (
            <span>{ocrResult.page_count} page(s)</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Compact OCR status indicator for list views
 */
interface OcrStatusIndicatorProps {
  hasOcr: boolean
  wordCount?: number
  className?: string
}

export function OcrStatusIndicator({
  hasOcr,
  wordCount,
  className,
}: OcrStatusIndicatorProps) {
  if (!hasOcr) {
    return (
      <span className={cn('text-xs text-disabled', className)}>
        No OCR
      </span>
    )
  }

  return (
    <span className={cn('text-xs text-success flex items-center gap-1', className)}>
      <span>✓</span>
      <span>OCR</span>
      {wordCount !== undefined && (
        <span className="text-disabled">({wordCount} words)</span>
      )}
    </span>
  )
}
