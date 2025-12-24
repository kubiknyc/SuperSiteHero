// File: /src/pages/documents/DrawingMarkupPage.tsx
// Full-screen drawing markup page with enhanced tools
// Mobile-optimized with touch gestures and bottom toolbar

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Maximize2, Minimize2, Loader2, AlertCircle, GitCompare, Layers, History, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { PDFViewer } from '@/features/documents/components/viewers/PDFViewer'
import { useDocument, useDocumentVersions } from '@/features/documents/hooks/useDocuments'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { useAuth } from '@/lib/auth/AuthContext'

// Enhanced markup components
import { LayerManager } from '@/features/documents/components/markup/LayerManager'
import { MarkupHistoryPanel } from '@/features/documents/components/markup/MarkupHistoryPanel'
import { EnhancedVersionComparison } from '@/features/documents/components/comparison'

// Mobile-optimized components
import { MobileMarkupToolbar } from '@/features/documents/components/markup/MobileMarkupToolbar'
import { MobileLayerDrawer } from '@/features/documents/components/markup/MobileLayerDrawer'

// Hooks
import { useEnhancedMarkupState } from '@/features/documents/hooks/useEnhancedMarkupState'
import { useMobileTouchGestures } from '@/features/documents/hooks/useMobileTouchGestures'
import type { Document } from '@/types/database'
import type { MarkupLayer } from '@/features/documents/types/markup'

// Mobile detection hook
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isSmallScreen = window.innerWidth < 768
      setIsMobile(isTouchDevice && isSmallScreen)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}

/**
 * DrawingMarkupPage Component
 *
 * Full-screen drawing viewer with enhanced markup tools, layer management,
 * version comparison, and measurement capabilities.
 *
 * Features:
 * - Full-screen immersive experience
 * - Enhanced markup toolbar with colors, layers, measurements
 * - Layer management panel (toggle visibility, reorder)
 * - Markup history with filtering
 * - Version comparison view
 * - Keyboard shortcuts for tools
 * - Minimal chrome for maximum drawing space
 *
 * Usage:
 * <Route path="/documents/:documentId/markup" element={<DrawingMarkupPage />} />
 */
export function DrawingMarkupPage() {
  const { documentId } = useParams<{ documentId: string }>()
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const isMobile = useIsMobile()

  // UI State
  const [showLayerPanel, setShowLayerPanel] = useState(true)
  const [showHistoryPanel, setShowHistoryPanel] = useState(false)
  const [comparisonMode, setComparisonMode] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [comparisonVersion, setComparisonVersion] = useState<Document | null>(null)

  // Mobile UI state
  const [mobileLayerDrawerOpen, setMobileLayerDrawerOpen] = useState(false)
  const [mobileTool, setMobileTool] = useState<string>('select')
  const [mobileColor, setMobileColor] = useState('#EF4444')
  const [mobileLineWidth, setMobileLineWidth] = useState(4)
  const [mobileZoom, setMobileZoom] = useState(100)

  // Queries
  const { data: currentDocument, isLoading, error } = useDocument(documentId)
  const { data: versions = [] } = useDocumentVersions(documentId)

  // Enhanced markup state - centralizes all markup-related state and handlers
  const markupState = useEnhancedMarkupState({
    documentId,
    pageNumber: 1, // TODO: track current page if multi-page support needed
  })

  // Destructure what we need for the UI
  const {
    layers,
    layersLoading,
    selectedLayerId,
    onSelectLayer,
    onCreateLayer,
    onUpdateLayer,
    onDeleteLayer,
    onReorderLayer,
    onToggleLayerVisibility,
    onToggleLayerLock,
    markups,
    authors,
    selectedMarkupId,
    onSelectMarkup,
    onDeleteMarkup,
    onEditMarkup,
    onViewMarkup,
    currentUserId,
  } = markupState

  // Get visible layer IDs
  const visibleLayerIds = useMemo(() => {
    return layers.filter((l: MarkupLayer) => l.visible).map((l: MarkupLayer) => l.id)
  }, [layers])

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!window.document.fullscreenElement) {
      window.document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      window.document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // Handle exit
  const handleExit = () => {
    if (window.document.fullscreenElement) {
      window.document.exitFullscreen()
    }
    navigate(`/documents/${documentId}`)
  }

  // Handle version comparison
  const handleStartComparison = (version: Document) => {
    setComparisonVersion(version)
    setComparisonMode(true)
  }

  const handleCloseComparison = () => {
    setComparisonMode(false)
    setComparisonVersion(null)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.key === 'Escape') {
        if (comparisonMode) {
          handleCloseComparison()
        } else {
          handleExit()
        }
      } else if (e.key === 'l' || e.key === 'L') {
        setShowLayerPanel(prev => !prev)
      } else if (e.key === 'h' || e.key === 'H') {
        setShowHistoryPanel(prev => !prev)
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [comparisonMode])

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-white mx-auto mb-4" />
          <p className="text-white text-lg">Loading drawing...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !currentDocument) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2" className="heading-section">Error Loading Drawing</h2>
          <p className="text-disabled mb-6">{error?.message || 'Document not found'}</p>
          <Button onClick={() => navigate('/documents')} variant="outline">
            Back to Documents
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top Bar - Minimal Chrome */}
      <div className="bg-surface border-b border-gray-700 px-4 py-2 flex items-center justify-between flex-shrink-0">
        {/* Left side - Back button and title */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExit}
            className="text-white hover:bg-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Exit Markup
          </Button>
          <div className="h-6 w-px bg-gray-600" />
          <div className="text-white">
            <h1 className="font-semibold text-sm truncate max-w-xs lg:max-w-md" className="heading-page">
              {currentDocument.name}
            </h1>
            <p className="text-xs text-disabled">
              {currentDocument.drawing_number && `Drawing: ${currentDocument.drawing_number}`}
              {currentDocument.version && ` • Version ${currentDocument.version}`}
            </p>
          </div>
        </div>

        {/* Right side - Panel toggles and fullscreen */}
        <div className="flex items-center gap-2">
          <Button
            variant={showLayerPanel ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowLayerPanel(!showLayerPanel)}
            className="hidden md:flex"
          >
            <Layers className="w-4 h-4 mr-1" />
            Layers
          </Button>
          <Button
            variant={showHistoryPanel ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowHistoryPanel(!showHistoryPanel)}
            className="hidden md:flex"
          >
            <History className="w-4 h-4 mr-1" />
            History
          </Button>
          {versions.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Find another version to compare with
                const otherVersion = versions.find(v => v.id !== currentDocument.id)
                if (otherVersion) {
                  handleStartComparison(otherVersion)
                }
              }}
              className="hidden lg:flex"
            >
              <GitCompare className="w-4 h-4 mr-1" />
              Compare
            </Button>
          )}
          <div className="h-6 w-px bg-gray-600" />
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="text-white hover:bg-gray-700"
            title={isFullscreen ? 'Exit fullscreen (F)' : 'Enter fullscreen (F)'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Layer Panel */}
        {showLayerPanel && !comparisonMode && (
          <div className="w-64 bg-surface border-r border-gray-700 overflow-y-auto hidden md:block">
            <div className="p-3 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-white" className="heading-subsection">Layers</h3>
            </div>
            <div className="p-2">
              <LayerManager
                layers={layers}
                selectedLayerId={selectedLayerId}
                onSelectLayer={onSelectLayer}
                onCreateLayer={onCreateLayer}
                onUpdateLayer={onUpdateLayer}
                onDeleteLayer={onDeleteLayer}
                onReorderLayer={onReorderLayer}
                onToggleVisibility={onToggleLayerVisibility}
                onToggleLock={onToggleLayerLock}
                currentUserId={currentUserId}
                disabled={layersLoading}
              />
            </div>
            {layers.length === 0 && !layersLoading && (
              <div className="p-4 text-center">
                <p className="text-xs text-muted">
                  No layers yet. Create a layer to organize your markups.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Center - Drawing Viewer */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Drawing Viewer */}
          <div className="flex-1 overflow-hidden">
            <PDFViewer
              documentId={currentDocument.id}
              projectId={currentDocument.project_id}
              fileUrl={currentDocument.file_url}
              fileName={currentDocument.file_name}
              allowMarkup={true}
              readOnly={false}
              enableMarkup={true}
              height="h-full"
              markupState={markupState}
            />
          </div>
        </div>

        {/* Right Sidebar - History Panel */}
        {showHistoryPanel && !comparisonMode && (
          <div className="w-80 bg-surface border-l border-gray-700 overflow-y-auto hidden lg:block">
            <div className="p-3 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-white" className="heading-subsection">Markup History</h3>
            </div>
            <div className="p-2">
              <MarkupHistoryPanel
                markups={markups}
                authors={authors}
                currentUserId={currentUserId}
                onSelectMarkup={onSelectMarkup}
                onDeleteMarkup={onDeleteMarkup}
                onEditMarkup={onEditMarkup}
                onViewMarkup={onViewMarkup}
                selectedMarkupId={selectedMarkupId}
                disabled={false}
              />
            </div>
            {markups.length === 0 && (
              <div className="p-4 text-center">
                <p className="text-xs text-muted">
                  No markups yet. Use the drawing tools to add annotations.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Markup Toolbar - Touch-optimized bottom toolbar */}
      {isMobile && !comparisonMode && (
        <MobileMarkupToolbar
          selectedTool={mobileTool as 'select' | 'pan' | 'freehand' | 'text' | 'rectangle' | 'circle' | 'arrow' | 'eraser'}
          onToolChange={(tool) => setMobileTool(tool)}
          selectedColor={mobileColor}
          onColorChange={setMobileColor}
          lineWidth={mobileLineWidth}
          onLineWidthChange={setMobileLineWidth}
          onZoomIn={() => setMobileZoom((z) => Math.min(z + 25, 400))}
          onZoomOut={() => setMobileZoom((z) => Math.max(z - 25, 25))}
          currentZoom={mobileZoom}
          onOpenLayers={() => setMobileLayerDrawerOpen(true)}
          disabled={false}
        />
      )}

      {/* Legacy Mobile Bottom Bar - Shown on non-touch small screens */}
      {!isMobile && (
        <div className="md:hidden bg-surface border-t border-gray-700 px-4 py-2 flex items-center justify-around">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLayerPanel(!showLayerPanel)}
            className="text-white"
          >
            <Layers className="w-4 h-4 mr-1" />
            Layers
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistoryPanel(!showHistoryPanel)}
            className="text-white"
          >
            <History className="w-4 h-4 mr-1" />
            History
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const otherVersion = versions.find(v => v.id !== currentDocument.id)
              if (otherVersion) {
                handleStartComparison(otherVersion)
              }
            }}
            className="text-white"
            disabled={versions.length < 2}
          >
            <GitCompare className="w-4 h-4 mr-1" />
            Compare
          </Button>
        </div>
      )}

      {/* Mobile Layer Drawer */}
      {isMobile && (
        <MobileLayerDrawer
          layers={layers}
          selectedLayerId={selectedLayerId}
          onSelectLayer={onSelectLayer}
          onCreateLayer={onCreateLayer}
          onUpdateLayer={onUpdateLayer}
          onDeleteLayer={onDeleteLayer}
          onReorderLayer={onReorderLayer}
          onToggleVisibility={onToggleLayerVisibility}
          onToggleLock={onToggleLayerLock}
          currentUserId={currentUserId}
          disabled={layersLoading}
          open={mobileLayerDrawerOpen}
          onOpenChange={setMobileLayerDrawerOpen}
        />
      )}

      {/* Keyboard Shortcuts Hint */}
      <div className="hidden xl:block absolute bottom-4 left-4 bg-surface/90 backdrop-blur-sm border border-gray-700 rounded-lg px-4 py-2 text-xs text-disabled">
        <p className="font-semibold mb-1 text-white">Keyboard Shortcuts</p>
        <div className="space-y-0.5">
          <p><kbd className="bg-gray-700 px-1 rounded">Esc</kbd> Exit markup mode</p>
          <p><kbd className="bg-gray-700 px-1 rounded">L</kbd> Toggle layers</p>
          <p><kbd className="bg-gray-700 px-1 rounded">H</kbd> Toggle history</p>
          <p><kbd className="bg-gray-700 px-1 rounded">F</kbd> Toggle fullscreen</p>
        </div>
      </div>

      {/* Version Comparison Dialog */}
      {comparisonMode && comparisonVersion && (
        <EnhancedVersionComparison
          version1={currentDocument}
          version2={comparisonVersion}
          open={comparisonMode}
          onClose={handleCloseComparison}
        />
      )}
    </div>
  )
}
