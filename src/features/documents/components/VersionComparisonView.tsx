// File: /src/features/documents/components/VersionComparisonView.tsx
// Side-by-side version comparison component

import { useState } from 'react'
import { ChevronRight, Download, FileText, X } from 'lucide-react'
import { Button, Card, CardContent, CardHeader } from '@/components/ui'
import { PDFViewer } from './viewers/PDFViewer'
import { formatFileSize } from '@/features/documents/utils/fileUtils'
import { formatDistanceToNow } from 'date-fns'
import type { Document } from '@/types/database'

interface VersionComparisonViewProps {
  version1: Document
  version2: Document
  onClose?: () => void
  className?: string
}

/**
 * VersionComparisonView Component
 *
 * Displays two document versions side-by-side for comparison.
 *
 * Features:
 * - Side-by-side metadata comparison
 * - PDF/image viewer for visual comparison
 * - Metadata diff highlighting
 * - Download buttons for each version
 * - Responsive layout
 *
 * Usage:
 * ```tsx
 * <VersionComparisonView
 *   version1={olderVersion}
 *   version2={newerVersion}
 *   onClose={() => setShowComparison(false)}
 * />
 * ```
 */
export function VersionComparisonView({
  version1,
  version2,
  onClose,
  className = '',
}: VersionComparisonViewProps) {
  const [showMetadata, setShowMetadata] = useState(true)

  // Determine which version is older
  const date1 = version1.created_at ? new Date(version1.created_at) : new Date(0)
  const date2 = version2.created_at ? new Date(version2.created_at) : new Date(0)

  const olderVersion = date1 < date2 ? version1 : version2
  const newerVersion = date1 < date2 ? version2 : version1

  // Check if file types are PDFs or images
  const isPdf1 = version1.file_type === 'application/pdf'
  const isPdf2 = version2.file_type === 'application/pdf'
  const isImage1 = version1.file_type?.startsWith('image/')
  const isImage2 = version2.file_type?.startsWith('image/')

  // Metadata fields to compare
  const metadataFields = [
    { key: 'version', label: 'Version', format: (val: any) => val || 'N/A' },
    { key: 'revision', label: 'Revision', format: (val: any) => val || 'N/A' },
    { key: 'file_size', label: 'File Size', format: (val: any) => formatFileSize(val) },
    { key: 'issue_date', label: 'Issue Date', format: (val: any) => val ? new Date(val).toLocaleDateString() : 'N/A' },
    { key: 'status', label: 'Status', format: (val: any) => val || 'N/A' },
    { key: 'description', label: 'Description', format: (val: any) => val || 'No description' },
    { key: 'created_at', label: 'Created', format: (val: any) => formatDistanceToNow(new Date(val), { addSuffix: true }) },
  ]

  // Check if a field has changed
  const hasChanged = (field: string) => {
    return olderVersion[field as keyof Document] !== newerVersion[field as keyof Document]
  }

  return (
    <div className={`fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4 ${className}`}>
      <Card className="w-full max-w-7xl max-h-[90vh] overflow-auto">
        <CardHeader className="border-b sticky top-0 bg-card z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold heading-section">Version Comparison</h2>
              <p className="text-sm text-secondary mt-1">
                {olderVersion.name} - v{olderVersion.version} vs v{newerVersion.version}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMetadata(!showMetadata)}
              >
                {showMetadata ? 'Hide' : 'Show'} Metadata
              </Button>
              {onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  aria-label="Close comparison"
                >
                  <X className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Metadata Comparison Table */}
          {showMetadata && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 heading-subsection">Metadata Comparison</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-input">
                      <th className="text-left py-2 px-3 font-semibold">Field</th>
                      <th className="text-left py-2 px-3 font-semibold">
                        v{olderVersion.version} (Older)
                      </th>
                      <th className="text-center py-2 px-3 w-12">
                        <ChevronRight className="w-4 h-4 mx-auto text-disabled" />
                      </th>
                      <th className="text-left py-2 px-3 font-semibold">
                        v{newerVersion.version} (Newer)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {metadataFields.map((field) => {
                      const changed = hasChanged(field.key)
                      const oldValue = field.format(olderVersion[field.key as keyof Document])
                      const newValue = field.format(newerVersion[field.key as keyof Document])

                      return (
                        <tr
                          key={field.key}
                          className={`border-b ${changed ? 'bg-warning-light' : ''}`}
                        >
                          <td className="py-2 px-3 font-medium text-secondary">
                            {field.label}
                            {changed && (
                              <span className="ml-2 text-xs text-warning font-semibold">
                                CHANGED
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-secondary">
                            {oldValue}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {changed && (
                              <ChevronRight className="w-4 h-4 mx-auto text-warning" />
                            )}
                          </td>
                          <td className="py-2 px-3 text-foreground font-medium">
                            {newValue}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Side-by-Side File Viewers */}
          <div>
            <h3 className="text-lg font-semibold mb-3 heading-subsection">Visual Comparison</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Version 1 */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-2 border-b flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-secondary" />
                    <span className="font-semibold">v{olderVersion.version} (Older)</span>
                  </div>
                  <a
                    href={olderVersion.file_url}
                    download
                    className="text-primary hover:text-blue-800"
                    aria-label={`Download version ${olderVersion.version}`}
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
                <div className="p-4 bg-card">
                  {isPdf1 ? (
                    <PDFViewer
                      fileUrl={olderVersion.file_url}
                      documentId={olderVersion.id}
                      projectId={olderVersion.project_id}
                      height="600px"
                      readOnly
                    />
                  ) : isImage1 ? (
                    <img
                      src={olderVersion.file_url}
                      alt={`Version ${olderVersion.version}`}
                      className="w-full h-auto rounded"
                    />
                  ) : (
                    <div className="text-center py-12 text-muted">
                      <FileText className="w-12 h-12 mx-auto mb-2 text-disabled" />
                      <p>Preview not available for this file type</p>
                      <a
                        href={olderVersion.file_url}
                        download
                        className="text-primary hover:underline mt-2 inline-block"
                      >
                        Download to view
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Version 2 */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-2 border-b flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-secondary" />
                    <span className="font-semibold">v{newerVersion.version} (Newer)</span>
                  </div>
                  <a
                    href={newerVersion.file_url}
                    download
                    className="text-primary hover:text-blue-800"
                    aria-label={`Download version ${newerVersion.version}`}
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
                <div className="p-4 bg-card">
                  {isPdf2 ? (
                    <PDFViewer
                      fileUrl={newerVersion.file_url}
                      documentId={newerVersion.id}
                      projectId={newerVersion.project_id}
                      height="600px"
                      readOnly
                    />
                  ) : isImage2 ? (
                    <img
                      src={newerVersion.file_url}
                      alt={`Version ${newerVersion.version}`}
                      className="w-full h-auto rounded"
                    />
                  ) : (
                    <div className="text-center py-12 text-muted">
                      <FileText className="w-12 h-12 mx-auto mb-2 text-disabled" />
                      <p>Preview not available for this file type</p>
                      <a
                        href={newerVersion.file_url}
                        download
                        className="text-primary hover:underline mt-2 inline-block"
                      >
                        Download to view
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2 heading-card">Summary</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>
                • Time difference: {olderVersion.created_at ? formatDistanceToNow(new Date(olderVersion.created_at)) : 'Unknown'} → {newerVersion.created_at ? formatDistanceToNow(new Date(newerVersion.created_at)) : 'Unknown'}
              </li>
              <li>
                • File size: {formatFileSize(olderVersion.file_size)} → {formatFileSize(newerVersion.file_size)}
                {olderVersion.file_size !== newerVersion.file_size && (
                  <span className="ml-2 font-semibold">
                    ({newerVersion.file_size! > olderVersion.file_size! ? '+' : ''}
                    {formatFileSize(Math.abs((newerVersion.file_size || 0) - (olderVersion.file_size || 0)))})
                  </span>
                )}
              </li>
              {newerVersion.description && (
                <li>• Version notes: {newerVersion.description}</li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
