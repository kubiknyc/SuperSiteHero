// File: /src/features/documents/components/DocumentAiPanel.tsx
// Integrated AI panel for document detail page

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardHeader, CardContent, CardTitle, Button, Badge } from '@/components/ui'
import {
  useDocumentOcr,
  useDocumentCategory,
  useExtractedMetadata,
  useDocumentProcessingStatus,
  useTriggerOcrProcessing,
} from '../hooks/useDocumentAi'
import { DocumentAiStatusIndicator } from './DocumentAiStatusIndicator'
import { OcrResultPanel } from './OcrResultPanel'
import { ExtractedMetadataCard } from './ExtractedMetadataCard'
import { DocumentCategoryBadge } from './DocumentCategoryBadge'
import { SimilarDocumentsList } from './SimilarDocumentsList'

interface DocumentAiPanelProps {
  documentId: string
  projectId?: string
  onNavigateToDocument?: (documentId: string) => void
  className?: string
}

type TabType = 'overview' | 'ocr' | 'metadata' | 'similar'

/**
 * DocumentAiPanel Component
 *
 * Comprehensive AI panel for document detail pages showing:
 * - Processing status
 * - OCR results
 * - Extracted metadata
 * - Category classification
 * - Similar documents
 *
 * Usage:
 * ```tsx
 * <DocumentAiPanel documentId="doc-123" projectId="proj-456" />
 * ```
 */
export function DocumentAiPanel({
  documentId,
  projectId,
  onNavigateToDocument,
  className,
}: DocumentAiPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  const { data: processingStatus, isLoading: statusLoading } =
    useDocumentProcessingStatus(documentId)
  const { data: category } = useDocumentCategory(documentId)
  const { data: ocr } = useDocumentOcr(documentId)
  const { data: metadata } = useExtractedMetadata(documentId)
  const triggerOcrMutation = useTriggerOcrProcessing()

  const isProcessing = processingStatus?.is_processing

  const handleTriggerProcessing = () => {
    triggerOcrMutation.mutate({
      document_id: documentId,
      force_reprocess: false,
    })
  }

  const tabs: { id: TabType; label: string; icon: string; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    {
      id: 'ocr',
      label: 'OCR Text',
      icon: '📝',
      count: ocr?.word_count ?? undefined,
    },
    {
      id: 'metadata',
      label: 'Metadata',
      icon: '🏷️',
      count: metadata?.extracted_fields?.length,
    },
    { id: 'similar', label: 'Similar', icon: '🔗' },
  ]

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <span>🤖</span>
            <span>AI Analysis</span>
          </CardTitle>
          <DocumentAiStatusIndicator documentId={documentId} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3 border-b">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors',
                activeTab === tab.id
                  ? 'bg-white border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              )}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <Badge variant="outline" className="ml-1 text-[10px]">
                  {tab.count}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <OverviewTab
            documentId={documentId}
            category={category}
            ocr={ocr}
            metadata={metadata}
            processingStatus={processingStatus}
            isProcessing={isProcessing}
            onTriggerProcessing={handleTriggerProcessing}
            triggerLoading={triggerOcrMutation.isPending}
          />
        )}

        {/* OCR Tab */}
        {activeTab === 'ocr' && (
          <OcrResultPanel
            documentId={documentId}
            showReprocessButton
            maxHeight="500px"
          />
        )}

        {/* Metadata Tab */}
        {activeTab === 'metadata' && (
          <ExtractedMetadataCard documentId={documentId} />
        )}

        {/* Similar Documents Tab */}
        {activeTab === 'similar' && (
          <SimilarDocumentsList
            documentId={documentId}
            onDocumentClick={onNavigateToDocument}
          />
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Overview tab content
 */
interface OverviewTabProps {
  documentId: string
  category: any
  ocr: any
  metadata: any
  processingStatus: any
  isProcessing: boolean | undefined
  onTriggerProcessing: () => void
  triggerLoading: boolean
}

function OverviewTab({
  documentId,
  category,
  ocr,
  metadata,
  processingStatus,
  isProcessing,
  onTriggerProcessing,
  triggerLoading,
}: OverviewTabProps) {
  const hasBeenProcessed =
    processingStatus?.ocr_status === 'completed' ||
    processingStatus?.categorization_status === 'completed'

  if (!hasBeenProcessed && !isProcessing) {
    return (
      <div className="text-center py-8">
        <span className="text-4xl">🤖</span>
        <h3 className="text-lg font-medium mt-4">AI Analysis Available</h3>
        <p className="text-gray-500 mt-2">
          Run AI analysis to extract text, detect category, and find similar documents.
        </p>
        <Button
          className="mt-4"
          onClick={onTriggerProcessing}
          disabled={triggerLoading}
        >
          {triggerLoading ? 'Starting...' : 'Start AI Analysis'}
        </Button>
      </div>
    )
  }

  if (isProcessing) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin text-4xl">⚙️</div>
        <h3 className="text-lg font-medium mt-4">Processing...</h3>
        <p className="text-gray-500 mt-2">
          AI analysis is in progress. This may take a few moments.
        </p>
        <DocumentAiStatusIndicator
          documentId={documentId}
          variant="detailed"
          className="mt-4 max-w-sm mx-auto"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Category */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="text-sm text-gray-500">Detected Category</p>
          <div className="mt-1">
            {category ? (
              <DocumentCategoryBadge
                category={category.category}
                confidence={category.confidence}
                showConfidence
              />
            ) : (
              <span className="text-gray-400">Not categorized</span>
            )}
          </div>
        </div>
        {category?.is_auto_detected && (
          <Badge variant="outline" className="text-xs">
            Auto-detected
          </Badge>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <QuickStat
          label="Words Extracted"
          value={ocr?.word_count?.toString() || '—'}
          icon="📝"
        />
        <QuickStat
          label="Metadata Fields"
          value={metadata?.extracted_fields?.length?.toString() || '—'}
          icon="🏷️"
        />
        <QuickStat
          label="Confidence"
          value={
            category?.confidence
              ? `${Math.round(category.confidence * 100)}%`
              : '—'
          }
          icon="📊"
        />
      </div>

      {/* Processing details */}
      <div className="pt-4 border-t">
        <DocumentAiStatusIndicator
          documentId={documentId}
          variant="detailed"
        />
      </div>

      {/* Reprocess button */}
      <div className="flex justify-end pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={onTriggerProcessing}
          disabled={triggerLoading || isProcessing}
        >
          {triggerLoading ? 'Starting...' : '🔄 Reprocess'}
        </Button>
      </div>
    </div>
  )
}

/**
 * Quick stat component
 */
interface QuickStatProps {
  label: string
  value: string
  icon: string
}

function QuickStat({ label, value, icon }: QuickStatProps) {
  return (
    <div className="text-center p-3 bg-gray-50 rounded-lg">
      <span className="text-xl">{icon}</span>
      <p className="text-lg font-semibold mt-1">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

/**
 * Compact AI status for document list items
 */
interface DocumentAiCompactStatusProps {
  documentId: string
  className?: string
}

export function DocumentAiCompactStatus({
  documentId,
  className,
}: DocumentAiCompactStatusProps) {
  const { data: status } = useDocumentProcessingStatus(documentId)
  const { data: category } = useDocumentCategory(documentId)

  if (!status && !category) {
    return null
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {category && (
        <DocumentCategoryBadge
          category={category.primary_category}
          className="text-[10px]"
        />
      )}
      {status?.is_processing && (
        <Badge variant="outline" className="text-[10px] animate-pulse">
          Processing...
        </Badge>
      )}
    </div>
  )
}
