// File: /src/features/documents/components/DrawingIndexPanel.example.tsx
// Example usage of DrawingIndexPanel component

import { useState } from 'react'
import { List } from 'lucide-react'
import { Button } from '@/components/ui'
import { DrawingIndexPanel } from './DrawingIndexPanel'
import type { Document } from '@/types/database'

/**
 * Example: Using DrawingIndexPanel in a Document Viewer
 *
 * This shows how to integrate the DrawingIndexPanel with a document viewer
 * to provide quick navigation between sheets in a drawing set.
 */
export function DocumentViewerWithIndex() {
  const [isPanelOpen, setIsPanelOpen] = useState(true)
  const [currentDocumentId, setCurrentDocumentId] = useState<string>()

  // Mock drawing documents - replace with real data from your API
  const drawingDocuments: Document[] = [
    {
      id: '1',
      file_name: 'A-001 Cover Sheet.pdf',
      name: 'Cover Sheet',
      // ... other document properties
    },
    {
      id: '2',
      file_name: 'A-100 Site Plan.pdf',
      name: 'Site Plan',
    },
    {
      id: '3',
      file_name: 'A-101 Floor Plan Level 1.pdf',
      name: 'Floor Plan Level 1',
    },
    {
      id: '4',
      file_name: 'A-102 Floor Plan Level 2.pdf',
      name: 'Floor Plan Level 2',
    },
    {
      id: '5',
      file_name: 'S-001 Structural General Notes.pdf',
      name: 'Structural General Notes',
    },
    {
      id: '6',
      file_name: 'S-100 Foundation Plan.pdf',
      name: 'Foundation Plan',
    },
    {
      id: '7',
      file_name: 'M-001 Mechanical General Notes.pdf',
      name: 'Mechanical General Notes',
    },
    {
      id: '8',
      file_name: 'M-100 HVAC Plan.pdf',
      name: 'HVAC Plan',
    },
    {
      id: '9',
      file_name: 'E-001 Electrical General Notes.pdf',
      name: 'Electrical General Notes',
    },
    {
      id: '10',
      file_name: 'E-100 Lighting Plan.pdf',
      name: 'Lighting Plan',
    },
  ] as Document[]

  const handleNavigate = (documentId: string, pageNumber?: number) => {
    setCurrentDocumentId(documentId)
    console.log('Navigate to document:', documentId, 'page:', pageNumber)
    // Here you would typically:
    // 1. Load the document
    // 2. Navigate to the specified page
    // 3. Update the viewer state
  }

  return (
    <div className="flex h-screen">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center gap-2 p-4 border-b border-border bg-surface">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPanelOpen(!isPanelOpen)}
          >
            <List className="h-4 w-4 mr-2" />
            {isPanelOpen ? 'Hide' : 'Show'} Index
          </Button>
          <div className="flex-1 text-center text-sm text-muted">
            {currentDocumentId
              ? `Viewing: ${
                  drawingDocuments.find((d) => d.id === currentDocumentId)?.file_name ||
                  'Document'
                }`
              : 'Select a sheet from the index'}
          </div>
        </div>

        {/* Document Viewer Area */}
        <div className="flex-1 bg-muted/20 flex items-center justify-center">
          {currentDocumentId ? (
            <div className="text-center">
              <p className="text-lg font-medium mb-2">Document Viewer</p>
              <p className="text-sm text-muted">
                Document ID: {currentDocumentId}
              </p>
              <p className="text-xs text-muted mt-4">
                Your PDF/Image viewer component would go here
              </p>
            </div>
          ) : (
            <div className="text-center text-muted">
              <List className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p>Select a sheet from the index to view</p>
            </div>
          )}
        </div>
      </div>

      {/* Drawing Index Panel */}
      <DrawingIndexPanel
        documents={drawingDocuments}
        currentDocumentId={currentDocumentId}
        onNavigate={handleNavigate}
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      />
    </div>
  )
}

/**
 * Example: Minimal Usage
 *
 * Simplest way to use the DrawingIndexPanel
 */
export function MinimalExample({ documents }: { documents: Document[] }) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <DrawingIndexPanel
      documents={documents}
      currentDocumentId={undefined}
      onNavigate={(docId) => console.log('Navigate to:', docId)}
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
    />
  )
}

/**
 * Example: With Page Navigation
 *
 * Using the panel with page-level navigation support
 */
export function WithPageNavigation({ documents }: { documents: Document[] }) {
  const [isOpen, setIsOpen] = useState(true)
  const [currentDoc, setCurrentDoc] = useState<string>()
  const [currentPage, setCurrentPage] = useState(1)

  const handleNavigate = (documentId: string, pageNumber?: number) => {
    setCurrentDoc(documentId)
    if (pageNumber) {
      setCurrentPage(pageNumber)
    }
  }

  return (
    <DrawingIndexPanel
      documents={documents}
      currentDocumentId={currentDoc}
      currentPage={currentPage}
      onNavigate={handleNavigate}
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
    />
  )
}

/**
 * Example: Mobile-Responsive Usage
 *
 * Shows how the panel works on mobile devices
 * (automatically becomes a slide-out panel with backdrop)
 */
export function MobileResponsiveExample({ documents }: { documents: Document[] }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="h-screen flex flex-col">
      {/* Mobile Header */}
      <div className="p-4 border-b border-border bg-surface md:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="w-full"
        >
          <List className="h-4 w-4 mr-2" />
          Open Drawing Index
        </Button>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-muted/20">
        {/* Your document viewer */}
      </div>

      {/* Drawing Index - slides in on mobile, always visible on desktop */}
      <DrawingIndexPanel
        documents={documents}
        onNavigate={(docId) => {
          console.log('Navigate to:', docId)
          // Panel auto-closes on mobile after navigation
        }}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </div>
  )
}
