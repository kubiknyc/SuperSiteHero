// File: /src/pages/documents/DocumentPopupViewerPage.tsx
// Popup PDF viewer page with minimal chrome for maximum viewing space
// This page is designed to be opened in a popup window without URL bar

import { useParams } from 'react-router-dom'
import { X, Download, Maximize2, Minimize2, ExternalLink, Loader2, AlertCircle } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui'
import { DocumentViewer } from '@/features/documents/components/viewers'
import { useDocument } from '@/features/documents/hooks/useDocuments'

/**
 * DocumentPopupViewerPage Component
 *
 * A minimal, full-screen document viewer designed for popup windows.
 * Provides maximum viewing space with only essential controls.
 *
 * Features:
 * - Full viewport height for maximum viewing
 * - Minimal header with document name and close button
 * - Download button for quick file download
 * - Fullscreen toggle
 * - Works with PDFs and images
 * - Keyboard shortcuts (Escape to close)
 *
 * Usage:
 * This page is meant to be opened via window.open() from the document list:
 * ```ts
 * window.open(`/documents/${documentId}/popup`, 'viewer', 'toolbar=no,...')
 * ```
 */
export function DocumentPopupViewerPage() {
  const { documentId } = useParams<{ documentId: string }>()
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Fetch document data
  const { data: document, isLoading, error } = useDocument(documentId)

  // Handle close - closes the popup window
  const handleClose = useCallback(() => {
    window.close()
  }, [])

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!globalThis.document.fullscreenElement) {
      globalThis.document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      globalThis.document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  // Handle download
  const handleDownload = useCallback(() => {
    if (!document?.file_url) {return}

    const a = globalThis.document.createElement('a')
    a.href = document.file_url
    a.download = document.file_name || document.name || 'document'
    globalThis.document.body.appendChild(a)
    a.click()
    globalThis.document.body.removeChild(a)
  }, [document])

  // Open in new tab (fallback for when popup doesn't work as expected)
  const handleOpenInNewTab = useCallback(() => {
    if (document?.file_url) {
      window.open(document.file_url, '_blank')
    }
  }, [document])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleClose, toggleFullscreen])

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!globalThis.document.fullscreenElement)
    }

    globalThis.document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => globalThis.document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Set window title
  useEffect(() => {
    if (document) {
      globalThis.document.title = `${document.name} - Document Viewer`
    } else {
      globalThis.document.title = 'Document Viewer'
    }
  }, [document])

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted text-lg">Loading document...</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !document) {
    return (
      <div className="h-screen flex flex-col bg-background">
        {/* Header */}
        <div className="bg-surface border-b border-gray-700 px-4 py-2 flex items-center justify-between">
          <span className="text-white font-medium">Document Viewer</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-white hover:bg-gray-700"
            title="Close (Escape)"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Error content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
            <h2 className="heading-section text-white mb-2">Error Loading Document</h2>
            <p className="text-muted mb-6">
              {error?.message || 'The document could not be found or you do not have permission to view it.'}
            </p>
            <Button onClick={handleClose} variant="outline">
              Close Window
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Minimal Header */}
      <div className="bg-surface border-b border-gray-700 px-4 py-2 flex items-center justify-between flex-shrink-0">
        {/* Left side - Document info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="min-w-0 flex-1">
            <h1 className="heading-subsection text-white truncate">
              {document.name}
            </h1>
            <p className="text-xs text-muted truncate">
              {document.drawing_number && `Drawing: ${document.drawing_number}`}
              {document.version && ` | Version ${document.version}`}
              {document.revision && ` (Rev ${document.revision})`}
            </p>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenInNewTab}
            className="text-white hover:bg-gray-700"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="text-white hover:bg-gray-700"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="text-white hover:bg-gray-700"
            title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>

          <div className="w-px h-5 bg-gray-600 mx-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-white hover:bg-gray-700"
            title="Close (Escape)"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Document Viewer - Full remaining height */}
      <div className="flex-1 overflow-hidden">
        <DocumentViewer
          document={document}
          allowMarkup={false}
          readOnly={true}
          height="h-full"
          enableMarkup={false}
        />
      </div>

      {/* Keyboard shortcut hint - shown briefly */}
      <div className="absolute bottom-4 right-4 bg-surface/80 backdrop-blur-sm border border-gray-700 rounded-lg px-3 py-2 text-xs text-muted opacity-60 pointer-events-none">
        Press <kbd className="bg-gray-700 px-1 rounded mx-1">Esc</kbd> to close |{' '}
        <kbd className="bg-gray-700 px-1 rounded mx-1">F</kbd> for fullscreen
      </div>
    </div>
  )
}

export default DocumentPopupViewerPage
