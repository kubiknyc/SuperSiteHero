/**
 * Client Documents View
 *
 * Read-only document list with download capability for clients.
 */

import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useClientDocuments } from '../hooks/useClientPortal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  Search,
  Download,
  ExternalLink,
  FolderOpen,
} from 'lucide-react'
import { format } from 'date-fns'
import type { ClientDocumentView } from '@/types/client-portal'

// File type to icon mapping
const getFileIcon = (fileType: string | null) => {
  if (!fileType) {return File}
  const type = fileType.toLowerCase()
  if (type.includes('pdf')) {return FileText}
  if (type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg')) {return FileImage}
  if (type.includes('spreadsheet') || type.includes('excel') || type.includes('xlsx') || type.includes('xls') || type.includes('csv')) {return FileSpreadsheet}
  if (type.includes('document') || type.includes('doc') || type.includes('word')) {return FileText}
  return File
}

// Format file size
const formatFileSize = (bytes: number | null): string => {
  if (!bytes) {return 'Unknown size'}
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

export function ClientDocuments() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: documents, isLoading } = useClientDocuments(projectId)

  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [_viewMode, _setViewMode] = useState<'list' | 'grid'>('list')

  // Get unique categories
  const categories = useMemo(() => {
    if (!documents) {return []}
    const cats = new Set(documents.map(d => d.category).filter(Boolean))
    return Array.from(cats) as string[]
  }, [documents])

  // Filter documents
  const filteredDocuments = useMemo(() => {
    if (!documents) {return []}
    return documents.filter(doc => {
      const matchesSearch = !searchTerm ||
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.document_number?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [documents, searchTerm, categoryFilter])

  // Group documents by category
  const documentsByCategory = useMemo(() => {
    const grouped: Record<string, ClientDocumentView[]> = {}
    filteredDocuments.forEach(doc => {
      const cat = doc.category || 'Uncategorized'
      if (!grouped[cat]) {
        grouped[cat] = []
      }
      grouped[cat].push(doc)
    })
    return grouped
  }, [filteredDocuments])

  const handleDownload = (doc: ClientDocumentView) => {
    if (doc.file_url) {
      window.open(doc.file_url, '_blank')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground heading-page">Project Documents</h1>
        <p className="text-secondary mt-1">
          Access and download project documents and files.
        </p>
      </div>

      {/* Filters */}
      {documents && documents.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-disabled" />
            <Input
              placeholder="Search by name or document number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {categories.length > 0 && (
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Document Count */}
      {filteredDocuments.length > 0 && (
        <p className="text-sm text-muted">
          Showing {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
          {searchTerm || categoryFilter !== 'all' ? ' (filtered)' : ''}
        </p>
      )}

      {/* Documents Table */}
      {filteredDocuments.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Document</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => {
                  const FileIcon = getFileIcon(doc.file_type)
                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-muted rounded-lg">
                            <FileIcon className="h-5 w-5 text-secondary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{doc.name}</p>
                            {doc.document_number && (
                              <p className="text-sm text-muted">#{doc.document_number}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {doc.category ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-secondary">
                            {doc.category}
                          </span>
                        ) : (
                          <span className="text-disabled">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {doc.version || (
                          <span className="text-disabled">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted">
                        {formatFileSize(doc.file_size)}
                      </TableCell>
                      <TableCell className="text-muted">
                        {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {doc.file_url && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownload(doc)}
                                title="Download"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                                title="Open in new tab"
                              >
                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-12 w-12 text-disabled mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground heading-subsection">No Documents Available</h3>
            <p className="text-muted mt-1">
              {searchTerm || categoryFilter !== 'all'
                ? 'No documents match your filters. Try adjusting your search.'
                : 'Project documents will appear here once they\'re uploaded.'}
            </p>
            {(searchTerm || categoryFilter !== 'all') && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchTerm('')
                  setCategoryFilter('all')
                }}
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Documents by Category (Alternative View) */}
      {Object.keys(documentsByCategory).length > 1 && categoryFilter === 'all' && (
        <div className="space-y-6 mt-8">
          <h2 className="text-lg font-semibold text-foreground heading-section">By Category</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(documentsByCategory).map(([category, docs]) => (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FolderOpen className="h-5 w-5 text-disabled" />
                      {category}
                    </span>
                    <span className="text-sm font-normal text-muted">
                      {docs.length} file{docs.length !== 1 ? 's' : ''}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {docs.slice(0, 3).map(doc => {
                      const FileIcon = getFileIcon(doc.file_type)
                      return (
                        <button
                          key={doc.id}
                          onClick={() => handleDownload(doc)}
                          className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-surface transition-colors text-left"
                        >
                          <FileIcon className="h-4 w-4 text-disabled flex-shrink-0" />
                          <span className="text-sm text-secondary truncate flex-1">
                            {doc.name}
                          </span>
                          <Download className="h-4 w-4 text-disabled" />
                        </button>
                      )
                    })}
                    {docs.length > 3 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => setCategoryFilter(category)}
                      >
                        View all {docs.length} documents
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
