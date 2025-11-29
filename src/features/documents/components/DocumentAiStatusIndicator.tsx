// File: /src/features/documents/components/DocumentAiStatusIndicator.tsx
// Status indicator component for document AI processing

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui'
import { useDocumentProcessingStatus } from '../hooks/useDocumentAi'
import type { DocumentProcessingStatus, OcrProcessingStatus } from '@/types/document-ai'

interface DocumentAiStatusIndicatorProps {
  documentId: string
  variant?: 'badge' | 'inline' | 'detailed'
  className?: string
}

// Status display configuration
const STATUS_CONFIG: Record<
  OcrProcessingStatus,
  { label: string; color: string; icon: string }
> = {
  pending: {
    label: 'Pending',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: '⏳',
  },
  processing: {
    label: 'Processing',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: '🔄',
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: '✅',
  },
  failed: {
    label: 'Failed',
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: '❌',
  },
  skipped: {
    label: 'Skipped',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: '⏭️',
  },
}

/**
 * DocumentAiStatusIndicator Component
 *
 * Displays the AI processing status for a document with different variants:
 * - badge: Compact badge style
 * - inline: Simple inline text
 * - detailed: Full status with progress and details
 *
 * Usage:
 * ```tsx
 * <DocumentAiStatusIndicator documentId="doc-123" />
 * <DocumentAiStatusIndicator documentId="doc-123" variant="detailed" />
 * ```
 */
export function DocumentAiStatusIndicator({
  documentId,
  variant = 'badge',
  className,
}: DocumentAiStatusIndicatorProps) {
  const { data: status, isLoading } = useDocumentProcessingStatus(documentId)

  if (isLoading) {
    return <LoadingIndicator variant={variant} className={className} />
  }

  if (!status) {
    return (
      <EmptyStatusIndicator variant={variant} className={className} />
    )
  }

  switch (variant) {
    case 'inline':
      return <InlineStatus status={status} className={className} />
    case 'detailed':
      return <DetailedStatus status={status} className={className} />
    default:
      return <BadgeStatus status={status} className={className} />
  }
}

/**
 * Badge variant
 */
function BadgeStatus({
  status,
  className,
}: {
  status: DocumentProcessingStatus
  className?: string
}) {
  const overallStatus = getOverallStatus(status)
  const config = STATUS_CONFIG[overallStatus]

  return (
    <Badge variant="outline" className={cn(config.color, 'gap-1', className)}>
      <span className="text-xs">{config.icon}</span>
      <span>{config.label}</span>
    </Badge>
  )
}

/**
 * Inline variant
 */
function InlineStatus({
  status,
  className,
}: {
  status: DocumentProcessingStatus
  className?: string
}) {
  const overallStatus = getOverallStatus(status)
  const config = STATUS_CONFIG[overallStatus]

  return (
    <span className={cn('text-sm flex items-center gap-1', className)}>
      <span>{config.icon}</span>
      <span className={overallStatus === 'processing' ? 'animate-pulse' : ''}>
        {config.label}
      </span>
    </span>
  )
}

/**
 * Detailed variant with progress
 */
function DetailedStatus({
  status,
  className,
}: {
  status: DocumentProcessingStatus
  className?: string
}) {
  const isProcessing = status.is_processing

  return (
    <div className={cn('space-y-3', className)}>
      {/* Overall status */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">AI Processing Status</span>
        <BadgeStatus status={status} />
      </div>

      {/* Progress bar (if processing) */}
      {isProcessing && (
        <div className="space-y-1">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all animate-pulse"
              style={{ width: '60%' }}
            />
          </div>
          <p className="text-xs text-gray-500">
            Processing in progress...
          </p>
        </div>
      )}

      {/* Individual process statuses */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <ProcessStatusItem
          label="OCR"
          status={status.ocr_status}
          error={status.ocr_error}
        />
        <ProcessStatusItem
          label="Categorization"
          status={status.categorization_status}
          error={status.categorization_error}
        />
        <ProcessStatusItem
          label="Metadata"
          status={status.metadata_status}
          error={status.metadata_error}
        />
        <ProcessStatusItem
          label="Embedding"
          status={status.embedding_status}
          error={status.embedding_error}
        />
      </div>

      {/* Timestamps */}
      {status.started_at && (
        <div className="text-xs text-gray-400 space-y-1 pt-2 border-t">
          <div>Started: {new Date(status.started_at).toLocaleString()}</div>
          {status.completed_at && (
            <div>Completed: {new Date(status.completed_at).toLocaleString()}</div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Individual process status item for detailed view
 */
function ProcessStatusItem({
  label,
  status,
  error,
}: {
  label: string
  status: OcrProcessingStatus | null | undefined
  error?: string | null
}) {
  const effectiveStatus: OcrProcessingStatus = status ?? 'pending'
  const config = STATUS_CONFIG[effectiveStatus]

  return (
    <div
      className={cn(
        'flex items-center gap-2 p-2 rounded',
        effectiveStatus === 'failed' ? 'bg-red-50' : 'bg-gray-50'
      )}
      title={error || undefined}
    >
      <span>{config.icon}</span>
      <span className="font-medium">{label}</span>
      {error && <span className="text-red-500 text-[10px]">!</span>}
    </div>
  )
}

/**
 * Loading state indicator
 */
function LoadingIndicator({
  variant,
  className,
}: {
  variant: 'badge' | 'inline' | 'detailed'
  className?: string
}) {
  if (variant === 'detailed') {
    return (
      <div className={cn('animate-pulse space-y-3', className)}>
        <div className="h-6 w-32 bg-gray-200 rounded" />
        <div className="h-2 w-full bg-gray-200 rounded" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <Badge variant="outline" className={cn('bg-gray-100 animate-pulse', className)}>
      Loading...
    </Badge>
  )
}

/**
 * Empty state (no status available)
 */
function EmptyStatusIndicator({
  variant,
  className,
}: {
  variant: 'badge' | 'inline' | 'detailed'
  className?: string
}) {
  if (variant === 'detailed') {
    return (
      <div className={cn('text-center text-gray-500 py-4', className)}>
        <span className="text-2xl">🤖</span>
        <p className="mt-2 text-sm">No AI processing status</p>
        <p className="text-xs">Document has not been queued for processing</p>
      </div>
    )
  }

  return (
    <Badge variant="outline" className={cn('bg-gray-100 text-gray-500', className)}>
      Not processed
    </Badge>
  )
}

/**
 * Helper to determine overall status from individual statuses
 */
function getOverallStatus(status: DocumentProcessingStatus): OcrProcessingStatus {
  const statuses = [
    status.ocr_status,
    status.categorization_status,
    status.metadata_status,
    status.embedding_status,
  ]

  // If any is processing, overall is processing
  if (statuses.includes('processing')) {return 'processing'}

  // If any failed, overall is failed
  if (statuses.includes('failed')) {return 'failed'}

  // If all completed, overall is completed
  if (statuses.every((s) => s === 'completed' || s === 'skipped')) {return 'completed'}

  // If any pending, overall is pending
  if (statuses.includes('pending')) {return 'pending'}

  return 'pending'
}
