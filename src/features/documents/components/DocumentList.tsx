// File: /src/features/documents/components/DocumentList.tsx
// Table list component for displaying documents

import { format } from 'date-fns'
import { Eye, Edit, Trash2, Loader2 } from 'lucide-react'
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
import { DocumentTypeIcon } from './DocumentTypeIcon'
import { DocumentStatusBadge } from './DocumentStatusBadge'
import { highlightSearchTerm } from '../hooks/useDocumentSearch'
import type { Document } from '@/types/database'

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
 *   onEdit={(doc) => console.log('Edit', doc)}
 *   onDelete={(doc) => console.log('Delete', doc)}
 *   onView={(doc) => console.log('View', doc)}
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
  // Format file size in human-readable format
  const formatFileSize = (bytes: number | null): string => {
    if (!bytes || bytes === 0) {return 'N/A'}
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  // Format date in readable format
  const formatDate = (dateString: string | null): string => {
    try {
      return dateString ? format(new Date(dateString), 'MMM d, yyyy') : 'N/A'
    } catch {
      return 'N/A'
    }
  }

  // Loading state with skeleton rows
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-600">Loading documents...</span>
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No documents found
            </h3>
            <p className="text-gray-500">
              Upload your first document to get started.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Documents table
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
                  {/* Name column with icon */}
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <DocumentTypeIcon type={doc.document_type} className="flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">
                          {searchTerm
                            ? highlightSearchTerm(doc.name, searchTerm)
                            : doc.name}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {searchTerm && doc.drawing_number
                            ? highlightSearchTerm(doc.drawing_number, searchTerm)
                            : doc.drawing_number || doc.file_name}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Type column */}
                  <TableCell>
                    <span className="text-sm text-gray-600 capitalize">
                      {doc.document_type.replace('_', ' ')}
                    </span>
                  </TableCell>

                  {/* Status column */}
                  <TableCell>
                    <DocumentStatusBadge status={doc.status ?? 'draft'} />
                  </TableCell>

                  {/* Version column */}
                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {doc.version}
                      {doc.revision && ` (${doc.revision})`}
                    </span>
                  </TableCell>

                  {/* Size column */}
                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {formatFileSize(doc.file_size)}
                    </span>
                  </TableCell>

                  {/* Created date column */}
                  <TableCell>
                    <span className="text-sm text-gray-600">
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
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
