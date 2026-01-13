// File: /src/features/documents/components/DocumentList.tsx
// Table list component for displaying documents
// Uses virtualization for large datasets (50+ items) for better performance

import { useCallback, useMemo } from 'react'
import { format } from 'date-fns'
import { Eye, Edit, Trash2, Loader2, Maximize2 } from 'lucide-react'
import {
  Card,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Button,
} from '@/components/ui'
import { VirtualizedTable } from '@/components/ui/virtualized-table'
import { DocumentTypeIcon } from './DocumentTypeIcon'
import { DocumentStatusBadge } from './DocumentStatusBadge'
import { highlightSearchTerm } from '../hooks/useDocumentSearch'
import { openDocumentPopup } from '@/lib/utils/openDocumentPopup'
import type { Document } from '@/types/database'

// Threshold for using virtualization (avoids overhead for small lists)
const VIRTUALIZATION_THRESHOLD = 50


interface DocumentListProps {
  documents: Document[]
  isLoading: boolean
  onEdit: (doc: Document) => void
  onDelete: (doc: Document) => void
  onView: (doc: Document) => void
  searchTerm?: string
}

/**
 * DocumentList Component
 *
 * Displays a table list of documents with actions.
 *
 * Features:
 * - Table with columns: Name, Type, Status, Version, Created, Actions
 * - Uses DocumentTypeIcon for type visualization
 * - Uses DocumentStatusBadge for status display
 * - Action buttons: View, Edit, Delete
 * - Formatted dates (e.g. "Nov 21, 2025")
 * - Human-readable file sizes (KB, MB)
 * - Loading state with skeleton rows
 * - Empty state message
 * - Responsive with horizontal scroll on mobile
 *
 * Usage:
 * ```tsx
 * <DocumentList
 *   documents={documents}
 *   isLoading={false}
 *   onEdit={(doc) => logger.log('Edit', doc)}
 *   onDelete={(doc) => logger.log('Delete', doc)}
 *   onView={(doc) => logger.log('View', doc)}
 * />
 * ```
 */
export function DocumentList({
  documents,
  isLoading,
  onEdit,
  onDelete,
  onView,
  searchTerm = '',
}: DocumentListProps) {
  // Handle opening document in popup viewer
  const handleOpenInPopup = useCallback((doc: Document) => {
    const popup = openDocumentPopup(doc.id, {
      width: Math.min(1400, window.screen.width - 100),
      height: Math.min(900, window.screen.height - 100),
    })

    // If popup was blocked, fall back to onView callback
    if (!popup) {
      onView(doc)
    }
  }, [onView])

  // Format file size in human-readable format
  const formatFileSize = useCallback((bytes: number | null): string => {
    if (!bytes || bytes === 0) {return 'N/A'}
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }, [])

  // Format date in readable format
  const formatDate = useCallback((dateString: string | null): string => {
    try {
      return dateString ? format(new Date(dateString), 'MMM d, yyyy') : 'N/A'
    } catch {
      return 'N/A'
    }
  }, [])

  // Use virtualization for large datasets
  const useVirtualization = documents.length >= VIRTUALIZATION_THRESHOLD

  // Memoized columns for virtualized table - must be called before any early returns
  const virtualizedColumns = useMemo(() => [
    {
      key: 'name',
      header: 'Name',
      className: 'w-[300px]',
      render: (doc: Document) => (
        <div className="flex items-center space-x-3">
          <DocumentTypeIcon type={doc.document_type} className="flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <button
              onClick={(e) => { e.stopPropagation(); handleOpenInPopup(doc) }}
              className="group flex items-center gap-1 font-medium text-primary hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 truncate transition-colors text-left"
              title={`Open ${doc.name} in viewer (popup window)`}
            >
              <span className="truncate">
                {searchTerm ? highlightSearchTerm(doc.name, searchTerm) : doc.name}
              </span>
              <Maximize2 className="w-3 h-3 opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity" />
            </button>
            <p className="text-sm text-muted truncate">
              {searchTerm && doc.drawing_number
                ? highlightSearchTerm(doc.drawing_number, searchTerm)
                : doc.drawing_number || doc.file_name}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      className: 'w-[120px]',
      render: (doc: Document) => (
        <span className="text-sm text-secondary capitalize">
          {doc.document_type.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      className: 'w-[120px]',
      render: (doc: Document) => <DocumentStatusBadge status={doc.status ?? 'draft'} />,
    },
    {
      key: 'version',
      header: 'Version',
      className: 'w-[100px]',
      render: (doc: Document) => (
        <span className="text-sm text-secondary">
          {doc.version}
          {doc.revision && ` (${doc.revision})`}
        </span>
      ),
    },
    {
      key: 'size',
      header: 'Size',
      className: 'w-[100px]',
      render: (doc: Document) => (
        <span className="text-sm text-secondary">{formatFileSize(doc.file_size)}</span>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      className: 'w-[140px]',
      render: (doc: Document) => (
        <span className="text-sm text-secondary">{formatDate(doc.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-[140px] text-right',
      render: (doc: Document) => (
        <div className="flex items-center justify-end space-x-1">
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onView(doc) }} title="View document">
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(doc) }} title="Edit document">
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(doc) }} title="Delete document" className="text-error hover:text-error-dark hover:bg-error-light">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ], [searchTerm, handleOpenInPopup, onView, onEdit, onDelete, formatFileSize, formatDate])

  // Loading state with skeleton rows
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-disabled" />
            <span className="ml-3 text-secondary">Loading documents...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Empty state
  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <DocumentTypeIcon type="general" className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-foreground mb-2 heading-subsection">
              No documents found
            </h3>
            <p className="text-muted">
              Upload your first document to get started.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Virtualized table for large datasets (50+ documents)
  if (useVirtualization) {
    return (
      <Card>
        <CardContent className="p-0">
          <VirtualizedTable
            data={documents}
            columns={virtualizedColumns}
            estimatedRowHeight={73}
            emptyMessage="No documents found"
          />
        </CardContent>
      </Card>
    )
  }

  // Standard table for small datasets (< 50 documents)
  return (
    <Card>
      <CardContent className="p-0">
        {/* Responsive wrapper with horizontal scroll */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Name</TableHead>
                <TableHead className="w-[120px]">Type</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[100px]">Version</TableHead>
                <TableHead className="w-[100px]">Size</TableHead>
                <TableHead className="w-[140px]">Created</TableHead>
                <TableHead className="w-[140px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  {/* Name column with icon - clickable to open in popup viewer */}
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <DocumentTypeIcon type={doc.document_type} className="flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <button
                          onClick={() => handleOpenInPopup(doc)}
                          className="group flex items-center gap-1 font-medium text-primary hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 truncate transition-colors text-left"
                          title={`Open ${doc.name} in viewer (popup window)`}
                        >
                          <span className="truncate">
                            {searchTerm
                              ? highlightSearchTerm(doc.name, searchTerm)
                              : doc.name}
                          </span>
                          <Maximize2 className="w-3 h-3 opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity" />
                        </button>
                        <p className="text-sm text-muted truncate">
                          {searchTerm && doc.drawing_number
                            ? highlightSearchTerm(doc.drawing_number, searchTerm)
                            : doc.drawing_number || doc.file_name}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Type column */}
                  <TableCell>
                    <span className="text-sm text-secondary capitalize">
                      {doc.document_type.replace('_', ' ')}
                    </span>
                  </TableCell>

                  {/* Status column */}
                  <TableCell>
                    <DocumentStatusBadge status={doc.status ?? 'draft'} />
                  </TableCell>

                  {/* Version column */}
                  <TableCell>
                    <span className="text-sm text-secondary">
                      {doc.version}
                      {doc.revision && ` (${doc.revision})`}
                    </span>
                  </TableCell>

                  {/* Size column */}
                  <TableCell>
                    <span className="text-sm text-secondary">
                      {formatFileSize(doc.file_size)}
                    </span>
                  </TableCell>

                  {/* Created date column */}
                  <TableCell>
                    <span className="text-sm text-secondary">
                      {formatDate(doc.created_at)}
                    </span>
                  </TableCell>

                  {/* Actions column */}
                  <TableCell>
                    <div className="flex items-center justify-end space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(doc)}
                        title="View document"
                        aria-label={`View ${doc.name}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(doc)}
                        title="Edit document"
                        aria-label={`Edit ${doc.name}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(doc)}
                        title="Delete document"
                        aria-label={`Delete ${doc.name}`}
                        className="text-error hover:text-error-dark hover:bg-error-light"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
