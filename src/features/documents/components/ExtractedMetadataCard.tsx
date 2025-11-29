// File: /src/features/documents/components/ExtractedMetadataCard.tsx
// Card component for displaying AI-extracted document metadata

import { useState } from 'react'
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  Button,
  Badge,
} from '@/components/ui'
import { cn } from '@/lib/utils'
import { useExtractedMetadata, useApplyExtractedMetadata } from '../hooks/useDocumentAi'
import type { DocumentExtractedMetadata, MetadataField } from '@/types/document-ai'

interface ExtractedMetadataCardProps {
  documentId: string
  className?: string
  onMetadataApplied?: () => void
}

// Field display configuration
const FIELD_CONFIG: Record<string, { label: string; icon: string }> = {
  title: { label: 'Title', icon: '📝' },
  date: { label: 'Date', icon: '📅' },
  author: { label: 'Author', icon: '👤' },
  company: { label: 'Company', icon: '🏢' },
  project_number: { label: 'Project Number', icon: '#️⃣' },
  drawing_number: { label: 'Drawing Number', icon: '📐' },
  revision: { label: 'Revision', icon: '🔄' },
  sheet_number: { label: 'Sheet Number', icon: '📄' },
  discipline: { label: 'Discipline', icon: '🔧' },
  amount: { label: 'Amount', icon: '💰' },
  contract_value: { label: 'Contract Value', icon: '📊' },
  reference_number: { label: 'Reference', icon: '🔗' },
}

/**
 * ExtractedMetadataCard Component
 *
 * Displays AI-extracted metadata from a document with:
 * - List of extracted fields with confidence scores
 * - Ability to apply metadata to the document
 * - Review workflow (approve/reject individual fields)
 *
 * Usage:
 * ```tsx
 * <ExtractedMetadataCard documentId="doc-123" onMetadataApplied={() => refetch()} />
 * ```
 */
export function ExtractedMetadataCard({
  documentId,
  className,
  onMetadataApplied,
}: ExtractedMetadataCardProps) {
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set())
  const { data: metadata, isLoading, error } = useExtractedMetadata(documentId)
  const applyMutation = useApplyExtractedMetadata()

  // Auto-select high-confidence fields
  const initializeSelection = (fields: MetadataField[]) => {
    const highConfidence = fields
      .filter((f) => f.confidence >= 0.8)
      .map((f) => f.field_name)
    setSelectedFields(new Set(highConfidence))
  }

  const toggleField = (fieldName: string) => {
    const newSelected = new Set(selectedFields)
    if (newSelected.has(fieldName)) {
      newSelected.delete(fieldName)
    } else {
      newSelected.add(fieldName)
    }
    setSelectedFields(newSelected)
  }

  const handleApply = async () => {
    if (!metadata || selectedFields.size === 0) {return}

    const fieldsToApply = metadata.extracted_fields.filter((f) =>
      selectedFields.has(f.field_name)
    )

    await applyMutation.mutateAsync({
      document_id: documentId,
      metadata_id: metadata.id,
      fields_to_apply: fieldsToApply.map((f) => f.field_name),
    })

    onMetadataApplied?.()
  }

  if (isLoading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader>
          <CardTitle className="h-4 w-40 bg-gray-200 rounded" />
          <CardDescription className="h-3 w-32 bg-gray-100 rounded mt-1" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-4 w-4 bg-gray-200 rounded" />
                <div className="h-4 w-24 bg-gray-200 rounded" />
                <div className="h-4 w-32 bg-gray-100 rounded ml-auto" />
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
            <p>Failed to load metadata</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!metadata || metadata.extracted_fields.length === 0) {
    return (
      <Card className={cn('border-gray-200', className)}>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            <span className="text-2xl">🔍</span>
            <p className="mt-2">No metadata extracted</p>
            <p className="text-sm mt-1">
              AI did not detect any structured metadata in this document.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Initialize selection on first render with data
  if (selectedFields.size === 0 && metadata.extracted_fields.length > 0) {
    initializeSelection(metadata.extracted_fields)
  }

  const appliedFields = metadata.extracted_fields.filter((f) => f.applied_to_document)
  const pendingFields = metadata.extracted_fields.filter((f) => !f.applied_to_document)

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <span>🏷️</span>
              <span>Extracted Metadata</span>
            </CardTitle>
            <CardDescription>
              {metadata.extracted_fields.length} fields detected
              {appliedFields.length > 0 && ` • ${appliedFields.length} applied`}
            </CardDescription>
          </div>
          {metadata.extraction_method && (
            <Badge variant="outline" className="text-xs">
              {metadata.extraction_method}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Applied fields (read-only) */}
        {appliedFields.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-500 mb-2">Applied Fields</h4>
            <div className="space-y-2">
              {appliedFields.map((field) => (
                <MetadataFieldRow
                  key={field.field_name}
                  field={field}
                  isApplied
                />
              ))}
            </div>
          </div>
        )}

        {/* Pending fields (selectable) */}
        {pendingFields.length > 0 && (
          <div>
            {appliedFields.length > 0 && (
              <h4 className="text-xs font-medium text-gray-500 mb-2">Pending Fields</h4>
            )}
            <div className="space-y-2">
              {pendingFields.map((field) => (
                <MetadataFieldRow
                  key={field.field_name}
                  field={field}
                  isSelected={selectedFields.has(field.field_name)}
                  onToggle={() => toggleField(field.field_name)}
                />
              ))}
            </div>

            {/* Apply button */}
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {selectedFields.size} field(s) selected
              </span>
              <Button
                size="sm"
                onClick={handleApply}
                disabled={selectedFields.size === 0 || applyMutation.isPending}
              >
                {applyMutation.isPending ? 'Applying...' : 'Apply Selected'}
              </Button>
            </div>
          </div>
        )}

        {/* Processing info */}
        <div className="pt-4 border-t text-xs text-gray-400">
          Extracted: {new Date(metadata.extracted_at).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Individual metadata field row
 */
interface MetadataFieldRowProps {
  field: MetadataField
  isApplied?: boolean
  isSelected?: boolean
  onToggle?: () => void
}

function MetadataFieldRow({
  field,
  isApplied,
  isSelected,
  onToggle,
}: MetadataFieldRowProps) {
  const config = FIELD_CONFIG[field.field_name] || {
    label: field.field_name,
    icon: '📌',
  }

  const confidenceColor =
    field.confidence >= 0.9
      ? 'text-green-600'
      : field.confidence >= 0.7
      ? 'text-amber-600'
      : 'text-red-600'

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg transition-colors',
        isApplied
          ? 'bg-green-50 border border-green-100'
          : isSelected
          ? 'bg-blue-50 border border-blue-200 cursor-pointer'
          : 'bg-gray-50 border border-gray-100 cursor-pointer hover:bg-gray-100'
      )}
      onClick={!isApplied ? onToggle : undefined}
    >
      {/* Checkbox (for pending fields) */}
      {!isApplied && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="h-4 w-4 text-blue-600 rounded"
        />
      )}

      {/* Icon */}
      <span className="text-sm">{config.icon}</span>

      {/* Field name */}
      <span className="text-sm font-medium text-gray-700 min-w-[100px]">
        {config.label}
      </span>

      {/* Value */}
      <span className="text-sm text-gray-900 flex-1 truncate" title={field.value}>
        {field.value}
      </span>

      {/* Confidence */}
      <span className={cn('text-xs font-mono', confidenceColor)}>
        {Math.round(field.confidence * 100)}%
      </span>

      {/* Applied indicator */}
      {isApplied && (
        <Badge variant="outline" className="text-[10px] bg-green-100 text-green-700">
          Applied
        </Badge>
      )}
    </div>
  )
}
