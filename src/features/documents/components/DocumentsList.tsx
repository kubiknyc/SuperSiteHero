// File: /src/features/documents/components/DocumentsList.tsx
// Documents list with filtering and actions

import { useState } from 'react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { VirtualizedTable } from '@/components/ui/virtualized-table'
import { useDocuments } from '../hooks/useDocuments'
import { useDeleteDocumentWithNotification } from '../hooks/useDocumentMutations'
import { DocumentUpload } from './DocumentUpload'
import { formatFileSize, getFileTypeIcon } from '../utils/fileUtils'
import {
  Download,
  Trash2,
  Plus,
  File,
  FileText,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Document, DocumentType } from '@/types/database'

interface DocumentsListProps {
  projectId: string | undefined
  folderId?: string | null
}

export function DocumentsList({ projectId, folderId }: DocumentsListProps) {
  const [uploadOpen, setUploadOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<DocumentType | ''>('')

  const { data: documents, isLoading, error } = useDocuments(projectId)
  const deleteDocument = useDeleteDocumentWithNotification()

  // Filter documents
  const filtered = (documents || []).filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFolder = folderId ? doc.folder_id === folderId : true

    const matchesType = filterType ? doc.document_type === filterType : true

    return matchesSearch && matchesFolder && matchesType
  })

  const handleDelete = async (documentId: string) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      await deleteDocument.mutateAsync(documentId)
    }
  }

  const getIconForType = (fileName: string) => {
    const type = getFileTypeIcon(fileName)
    const iconProps = { className: 'h-4 w-4' }

    switch (type) {
      case 'pdf':
        return <FileText {...iconProps} className="h-4 w-4 text-error" />
      case 'image':
        return <ImageIcon {...iconProps} className="h-4 w-4 text-primary" />
      case 'doc':
        return <File {...iconProps} className="h-4 w-4 text-primary" />
      case 'sheet':
        return <File {...iconProps} className="h-4 w-4 text-success" />
      default:
        return <File {...iconProps} className="h-4 w-4 text-secondary" />
    }
  }

  const tableColumns = [
    {
      key: 'name',
      header: 'Name',
      render: (doc: Document) => (
        <div className="flex items-center gap-2">
          {getIconForType(doc.file_name)}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{doc.name}</p>
            {doc.drawing_number && (
              <p className="text-xs text-secondary">#{doc.drawing_number}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (doc: Document) => (
        <Badge variant="outline" className="capitalize">
          {doc.document_type}
        </Badge>
      ),
      className: 'w-32',
    },
    {
      key: 'size',
      header: 'Size',
      render: (doc: Document) => (
        <span className="text-secondary">{formatFileSize(doc.file_size)}</span>
      ),
      className: 'w-20',
    },
    {
      key: 'uploaded',
      header: 'Uploaded',
      render: (doc: Document) => (
        <span className="text-secondary">
          {doc.created_at ? format(new Date(doc.created_at), 'MMM d, yyyy') : 'N/A'}
        </span>
      ),
      className: 'w-28',
    },
    {
      key: 'status',
      header: 'Status',
      render: (doc: Document) => (
        <Badge
          variant={doc.status === 'current' ? 'default' : 'secondary'}
          className={cn(
            doc.status === 'current' && 'bg-success-light text-green-800',
            doc.status === 'superseded' && 'bg-warning-light text-yellow-800',
            doc.status === 'archived' && 'bg-muted text-foreground',
            doc.status === 'void' && 'bg-error-light text-red-800'
          )}
        >
          {doc.status}
        </Badge>
      ),
      className: 'w-28',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (doc: Document) => (
        <div className="flex justify-end gap-2">
          <a href={doc.file_url} download target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm" title="Download">
              <Download className="h-4 w-4" />
            </Button>
          </a>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(doc.id)}
            disabled={deleteDocument.isPending}
            title="Delete"
          >
            <Trash2 className="h-4 w-4 text-error" />
          </Button>
        </div>
      ),
      className: 'w-20',
    },
  ]

  if (!projectId) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-disabled mx-auto mb-4" />
          <p className="text-secondary">No project selected</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="h-12 w-12 text-disabled mx-auto mb-4 animate-spin" />
          <p className="text-secondary">Loading documents...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-error">Failed to load documents</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Documents</CardTitle>
            <CardDescription>
              {filtered.length} document{filtered.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Select value={filterType} onChange={(e) => setFilterType(e.target.value as DocumentType | '')}>
              <option value="">All Types</option>
              <option value="drawing">Drawing</option>
              <option value="specification">Specification</option>
              <option value="submittal">Submittal</option>
              <option value="shop_drawing">Shop Drawing</option>
              <option value="scope">Scope</option>
              <option value="general">General</option>
              <option value="photo">Photo</option>
              <option value="other">Other</option>
            </Select>
          </div>

          {/* Documents Table */}
          {filtered.length === 0 ? (
            <div className="text-center py-8">
              <File className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-muted">No documents found</p>
            </div>
          ) : (
            <VirtualizedTable<Document>
              data={filtered}
              columns={tableColumns}
              estimatedRowHeight={73}
              emptyMessage="No documents available"
            />
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      {uploadOpen && (
        <DocumentUpload
          projectId={projectId}
          folderId={folderId ?? null}
          onUploadSuccess={() => {
            setSearchTerm('')
            setUploadOpen(false)
          }}
        />
      )}
    </>
  )
}
