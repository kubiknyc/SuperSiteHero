// File: /src/features/documents/components/viewers/DocumentViewer.tsx
// Universal document viewer that routes to appropriate viewer based on file type

import { PDFViewer } from './PDFViewer'
import { ImageViewer } from './ImageViewer'
import { Card, CardContent } from '@/components/ui'
import { AlertCircle, FileIcon } from 'lucide-react'
import type { Document } from '@/types/database'

interface DocumentViewerProps {
  document: Document
  allowMarkup?: boolean
  readOnly?: boolean
  onMarkupCreate?: (markup: any) => void
  height?: string
  enableMarkup?: boolean
  /** Enable real-time collaborative markup with other users */
  collaborative?: boolean
}

/**
 * DocumentViewer Component
 *
 * Universal document viewer that detects file type and routes to appropriate viewer.
 *
 * Supported formats:
 * - PDFs: application/pdf
 * - Images: image/jpeg, image/png, image/gif, image/webp, image/svg+xml
 * - Others: Shows download link
 *
 * Features:
 * - Automatic file type detection
 * - Responsive design
 * - Error handling
 * - Download fallback for unsupported types
 *
 * Usage:
 * ```tsx
 * <DocumentViewer
 *   document={documentData}
 *   allowMarkup={false}
 * />
 * ```
 */
export function DocumentViewer({
  document,
  allowMarkup = false,
  readOnly = false,
  onMarkupCreate,
  height = 'h-screen',
  enableMarkup = false,
  collaborative = false,
}: DocumentViewerProps) {
  const fileType = document.file_type?.toLowerCase() || ''
  const fileName = document.file_name || document.name || 'document'

  // Check if it's a PDF
  const isPDF = fileType.includes('pdf')

  // Check if it's an image
  const isImage = fileType.includes('image/')

  // Handle PDF files
  if (isPDF) {
    return (
      <PDFViewer
        documentId={document.id}
        projectId={document.project_id}
        fileUrl={document.file_url}
        fileName={fileName}
        allowMarkup={allowMarkup && !readOnly}
        readOnly={readOnly}
        onMarkupCreate={onMarkupCreate}
        height={height}
        enableMarkup={enableMarkup}
        collaborative={collaborative}
      />
    )
  }

  // Handle image files
  if (isImage) {
    return (
      <ImageViewer
        documentId={document.id}
        projectId={document.project_id}
        imageUrl={document.file_url}
        fileName={fileName}
        alt={document.name || 'Document image'}
        allowMarkup={allowMarkup && !readOnly}
        readOnly={readOnly}
        onMarkupCreate={onMarkupCreate}
        height={height}
        enableMarkup={enableMarkup}
        collaborative={collaborative}
      />
    )
  }

  // Unsupported file type - show error and download option
  return (
    <div className={`flex items-center justify-center bg-surface ${height}`}>
      <Card className="max-w-md mx-auto">
        <CardContent className="p-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <FileIcon className="w-16 h-16 text-disabled" />
              <AlertCircle className="w-6 h-6 text-orange-500 absolute bottom-0 right-0" />
            </div>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2 heading-subsection">
            Unsupported file type
          </h3>
          <p className="text-sm text-secondary mb-2">
            This file type cannot be previewed in the browser.
          </p>
          <p className="text-xs text-muted mb-6">
            File type: {fileType || 'unknown'}
          </p>
          <a
            href={document.file_url}
            download={fileName}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
          >
            Download File
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
