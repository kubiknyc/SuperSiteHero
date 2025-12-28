/* eslint-disable react-hooks/set-state-in-effect */
/**
 * Drawing Revision Comparison Dialog
 *
 * Full-featured comparison dialog with multiple view modes:
 * - Side-by-side: View both revisions simultaneously
 * - Overlay: Blend revisions with adjustable opacity
 * - Diff: Show visual differences highlighted
 * - Slider: Interactive before/after slider
 */

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  SplitSquareHorizontal,
  GitCompare,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Link2,
  Unlink2,
  AlertCircle,
  Loader2,
  SlidersHorizontal,
  FileText,
  List,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDrawingRevisionComparison, useComparisonState } from '../hooks/useDrawingComparison';
import { BeforeAfterSlider } from '@/features/photo-progress/components/BeforeAfterSlider';
import type { DrawingRevision, ChangeRegion, ComparisonViewMode, CHANGE_TYPE_COLORS } from '@/types/drawing';

interface DrawingRevisionComparisonProps {
  revision1Id: string;
  revision2Id: string;
  open: boolean;
  onClose: () => void;
  drawingNumber?: string;
}

export function DrawingRevisionComparison({
  revision1Id,
  revision2Id,
  open,
  onClose,
  drawingNumber,
}: DrawingRevisionComparisonProps) {
  // View state
  const [viewMode, setViewMode] = useState<ComparisonViewMode>('side-by-side');
  const [showChangesPanel, setShowChangesPanel] = useState(true);

  // Page navigation
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages1, setNumPages1] = useState<number | null>(null);
  const [numPages2, setNumPages2] = useState<number | null>(null);

  // Zoom and pan state
  const [zoom, setZoom] = useState(100);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [syncZoomPan, setSyncZoomPan] = useState(true);
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPosition = useRef({ x: 0, y: 0 });

  // Change highlighting
  const [showChangeHighlights, setShowChangeHighlights] = useState(true);
  const [selectedChangeId, setSelectedChangeId] = useState<string | null>(null);

  // Overlay settings
  const [overlayOpacity1, setOverlayOpacity1] = useState(50);
  const [overlayOpacity2, setOverlayOpacity2] = useState(50);

  // Slider image URLs for slider mode
  const [sliderImage1, setSliderImage1] = useState<string | null>(null);
  const [sliderImage2, setSliderImage2] = useState<string | null>(null);

  // PDF worker initialization
  const [pdfWorkerReady, setPdfWorkerReady] = useState(false);

  // Container ref
  const containerRef = useRef<HTMLDivElement>(null);

  // Comparison helpers
  const { formatRevisionLabel, getChangeTypeLabel } = useComparisonState();

  // Fetch comparison data
  const {
    data: comparisonResult,
    isLoading: isComparing,
    error: comparisonError,
  } = useDrawingRevisionComparison(
    open ? revision1Id : undefined,
    open ? revision2Id : undefined,
    { pageNumber: currentPage }
  );

  // Extract data from result
  const olderRevision = comparisonResult?.revision1;
  const newerRevision = comparisonResult?.revision2;
  const changeRegions = comparisonResult?.changeRegions || [];

  // Initialize PDF.js worker
  useEffect(() => {
    if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();
    }
    setPdfWorkerReady(true);
  }, []);

  // Update page count from comparison result
  useEffect(() => {
    if (comparisonResult) {
      setNumPages1(comparisonResult.page1Count);
      setNumPages2(comparisonResult.page2Count);
    }
  }, [comparisonResult]);

  // Generate slider images when in slider mode
  useEffect(() => {
    if (viewMode === 'slider' && olderRevision?.fileUrl && newerRevision?.fileUrl) {
      // For images, use URLs directly
      if (!olderRevision.fileType?.includes('pdf')) {
        setSliderImage1(olderRevision.fileUrl);
      }
      if (!newerRevision.fileType?.includes('pdf')) {
        setSliderImage2(newerRevision.fileUrl);
      }
      // For PDFs, we'd need to render to canvas first - for now just show a message
    }
  }, [viewMode, olderRevision, newerRevision]);

  // Change statistics
  const changeStats = useMemo(
    () => ({
      added: changeRegions.filter((r) => r.changeType === 'added').length,
      removed: changeRegions.filter((r) => r.changeType === 'removed').length,
      modified: changeRegions.filter((r) => r.changeType === 'modified').length,
      total: changeRegions.length,
    }),
    [changeRegions]
  );

  // Page navigation
  const maxPages = Math.max(numPages1 || 1, numPages2 || 1);
  const handlePrevPage = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNextPage = () => setCurrentPage((p) => Math.min(maxPages, p + 1));

  // Zoom controls
  const handleZoomIn = () => setZoom((p) => Math.min(300, p + 25));
  const handleZoomOut = () => setZoom((p) => Math.max(25, p - 25));
  const handleResetView = () => {
    setZoom(100);
    setPosition({ x: 0, y: 0 });
  };

  // Pan handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) {return;}
    setIsPanning(true);
    lastPanPosition.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) {return;}
      const dx = e.clientX - lastPanPosition.current.x;
      const dy = e.clientY - lastPanPosition.current.y;
      setPosition((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPanPosition.current = { x: e.clientX, y: e.clientY };
    },
    [isPanning]
  );

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  // Jump to change region
  const handleJumpToChange = (change: ChangeRegion) => {
    setSelectedChangeId(change.id);
    if (containerRef.current) {
      const centerX =
        -change.x * (zoom / 100) + containerRef.current.clientWidth / 2;
      const centerY =
        -change.y * (zoom / 100) + containerRef.current.clientHeight / 2;
      setPosition({ x: centerX, y: centerY });
    }
  };

  if (!open) {return null;}

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[98vw] max-h-[98vh] w-full h-full p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="p-4 border-b bg-background flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <GitCompare className="w-5 h-5" />
                  Drawing Revision Comparison
                </DialogTitle>
                {drawingNumber && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {drawingNumber}
                    {olderRevision && newerRevision && (
                      <>
                        {' '}
                        - Rev {olderRevision.revision} vs Rev{' '}
                        {newerRevision.revision}
                      </>
                    )}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-muted rounded-lg p-1">
                  <ViewModeButton
                    mode="side-by-side"
                    currentMode={viewMode}
                    onClick={setViewMode}
                    icon={SplitSquareHorizontal}
                    label="Side by Side"
                  />
                  <ViewModeButton
                    mode="overlay"
                    currentMode={viewMode}
                    onClick={setViewMode}
                    icon={Layers}
                    label="Overlay"
                  />
                  <ViewModeButton
                    mode="diff"
                    currentMode={viewMode}
                    onClick={setViewMode}
                    icon={GitCompare}
                    label="Diff View"
                  />
                  <ViewModeButton
                    mode="slider"
                    currentMode={viewMode}
                    onClick={setViewMode}
                    icon={SlidersHorizontal}
                    label="Slider"
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowChangesPanel(!showChangesPanel)}
                >
                  <List className="w-4 h-4 mr-1" />
                  {showChangesPanel ? 'Hide' : 'Show'} Changes
                </Button>

                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Toolbar */}
          <div className="p-2 border-b bg-card flex items-center justify-between flex-shrink-0">
            {/* Left: Zoom Controls */}
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleZoomOut}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium w-14 text-center">
                {zoom}%
              </span>
              <Button size="sm" variant="outline" onClick={handleZoomIn}>
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={handleResetView}>
                <RotateCcw className="w-4 h-4" />
              </Button>

              <div className="w-px h-6 bg-border mx-2" />

              {/* Sync Controls */}
              <Button
                size="sm"
                variant={syncZoomPan ? 'default' : 'outline'}
                onClick={() => setSyncZoomPan(!syncZoomPan)}
                title="Sync zoom and pan"
              >
                {syncZoomPan ? (
                  <Link2 className="w-4 h-4" />
                ) : (
                  <Unlink2 className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Center: Page Navigation */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm">
                Page {currentPage} / {maxPages}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleNextPage}
                disabled={currentPage >= maxPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Right: Change Stats & Controls */}
            <div className="flex items-center gap-2">
              {isComparing ? (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </div>
              ) : comparisonError ? (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  Error
                </div>
              ) : comparisonResult ? (
                <>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-green-600">
                      {changeStats.added} Added
                    </Badge>
                    <Badge variant="default" className="bg-red-600">
                      {changeStats.removed} Removed
                    </Badge>
                    <Badge variant="default" className="bg-yellow-600">
                      {changeStats.modified} Modified
                    </Badge>
                  </div>
                  <div className="w-px h-6 bg-border" />
                  <Button
                    size="sm"
                    variant={showChangeHighlights ? 'default' : 'outline'}
                    onClick={() => setShowChangeHighlights(!showChangeHighlights)}
                  >
                    {showChangeHighlights ? (
                      <Eye className="w-3 h-3 mr-1" />
                    ) : (
                      <EyeOff className="w-3 h-3 mr-1" />
                    )}
                    Highlights
                  </Button>
                </>
              ) : null}

              {/* Overlay opacity controls */}
              {viewMode === 'overlay' && (
                <>
                  <div className="w-px h-6 bg-border" />
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Older:</Label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={overlayOpacity1}
                      onChange={(e) =>
                        setOverlayOpacity1(parseInt(e.target.value))
                      }
                      className="w-20"
                    />
                    <span className="text-xs w-8">{overlayOpacity1}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Newer:</Label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={overlayOpacity2}
                      onChange={(e) =>
                        setOverlayOpacity2(parseInt(e.target.value))
                      }
                      className="w-20"
                    />
                    <span className="text-xs w-8">{overlayOpacity2}%</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Document Viewer */}
            <div
              ref={containerRef}
              className={cn(
                'flex-1 overflow-hidden bg-muted',
                isPanning && 'cursor-grabbing',
                !showChangesPanel && 'w-full'
              )}
              onMouseDown={viewMode !== 'slider' ? handleMouseDown : undefined}
              onMouseMove={viewMode !== 'slider' ? handleMouseMove : undefined}
              onMouseUp={viewMode !== 'slider' ? handleMouseUp : undefined}
              onMouseLeave={viewMode !== 'slider' ? handleMouseUp : undefined}
            >
              {isComparing ? (
                <LoadingState />
              ) : comparisonError ? (
                <ErrorState error={comparisonError} />
              ) : !olderRevision || !newerRevision ? (
                <LoadingState />
              ) : viewMode === 'slider' ? (
                <SliderView
                  olderRevision={olderRevision}
                  newerRevision={newerRevision}
                />
              ) : viewMode === 'diff' ? (
                <DiffView
                  diffImageDataUrl={comparisonResult?.diffImageDataUrl}
                  changeRegions={changeRegions}
                  showHighlights={showChangeHighlights}
                  selectedChangeId={selectedChangeId}
                  zoom={zoom}
                  position={position}
                />
              ) : viewMode === 'side-by-side' ? (
                <SideBySideView
                  olderRevision={olderRevision}
                  newerRevision={newerRevision}
                  currentPage={currentPage}
                  zoom={zoom}
                  position={position}
                  changeRegions={showChangeHighlights ? changeRegions : []}
                  selectedChangeId={selectedChangeId}
                  onLoadSuccess1={(numPages) => setNumPages1(numPages)}
                  onLoadSuccess2={(numPages) => setNumPages2(numPages)}
                />
              ) : (
                <OverlayView
                  olderRevision={olderRevision}
                  newerRevision={newerRevision}
                  currentPage={currentPage}
                  opacity1={overlayOpacity1}
                  opacity2={overlayOpacity2}
                  zoom={zoom}
                  position={position}
                  onLoadSuccess1={(numPages) => setNumPages1(numPages)}
                  onLoadSuccess2={(numPages) => setNumPages2(numPages)}
                />
              )}
            </div>

            {/* Changes Panel */}
            {showChangesPanel && (
              <ChangesPanel
                changeRegions={changeRegions}
                changeStats={changeStats}
                selectedChangeId={selectedChangeId}
                onSelectChange={handleJumpToChange}
                summary={comparisonResult?.summary}
              />
            )}
          </div>

          {/* Footer */}
          {olderRevision && newerRevision && (
            <div className="p-3 border-t bg-background flex-shrink-0">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <RevisionFooter
                  revision={olderRevision}
                  label="Older"
                  className="bg-blue-50 dark:bg-blue-950"
                />
                <RevisionFooter
                  revision={newerRevision}
                  label="Newer"
                  className="bg-purple-50 dark:bg-purple-950"
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// View Mode Button
interface ViewModeButtonProps {
  mode: ComparisonViewMode;
  currentMode: ComparisonViewMode;
  onClick: (mode: ComparisonViewMode) => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

function ViewModeButton({
  mode,
  currentMode,
  onClick,
  icon: Icon,
  label,
}: ViewModeButtonProps) {
  return (
    <button
      onClick={() => onClick(mode)}
      className={cn(
        'px-3 py-1.5 rounded text-sm font-medium transition-colors',
        mode === currentMode
          ? 'bg-card shadow text-foreground'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <Icon className="w-4 h-4 inline mr-1" />
      {label}
    </button>
  );
}

// Side-by-Side View
interface SideBySideViewProps {
  olderRevision: DrawingRevision;
  newerRevision: DrawingRevision;
  currentPage: number;
  zoom: number;
  position: { x: number; y: number };
  changeRegions: ChangeRegion[];
  selectedChangeId: string | null;
  onLoadSuccess1: (numPages: number) => void;
  onLoadSuccess2: (numPages: number) => void;
}

function SideBySideView({
  olderRevision,
  newerRevision,
  currentPage,
  zoom,
  position,
  changeRegions,
  selectedChangeId,
  onLoadSuccess1,
  onLoadSuccess2,
}: SideBySideViewProps) {
  return (
    <div className="grid grid-cols-2 h-full divide-x">
      <DocumentView
        revision={olderRevision}
        currentPage={currentPage}
        onLoadSuccess={onLoadSuccess1}
        zoom={zoom}
        position={position}
        label={`Rev ${olderRevision.revision} (Older)`}
        labelClassName="bg-blue-600"
      />
      <DocumentView
        revision={newerRevision}
        currentPage={currentPage}
        onLoadSuccess={onLoadSuccess2}
        zoom={zoom}
        position={position}
        label={`Rev ${newerRevision.revision} (Newer)`}
        labelClassName="bg-purple-600"
        changeRegions={changeRegions}
        selectedChangeId={selectedChangeId}
      />
    </div>
  );
}

// Document View
interface DocumentViewProps {
  revision: DrawingRevision;
  currentPage: number;
  onLoadSuccess: (numPages: number) => void;
  zoom: number;
  position: { x: number; y: number };
  label: string;
  labelClassName: string;
  changeRegions?: ChangeRegion[];
  selectedChangeId?: string | null;
}

function DocumentView({
  revision,
  currentPage,
  onLoadSuccess,
  zoom,
  position,
  label,
  labelClassName,
  changeRegions = [],
  selectedChangeId,
}: DocumentViewProps) {
  const isPdf =
    revision.fileType === 'application/pdf' || !revision.fileType;

  return (
    <div className="relative overflow-hidden h-full">
      <div className="absolute top-2 left-2 z-10">
        <Badge className={cn('text-white', labelClassName)}>{label}</Badge>
      </div>
      <div
        className="flex items-center justify-center h-full"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${zoom / 100})`,
          transformOrigin: 'center center',
        }}
      >
        {isPdf && revision.fileUrl ? (
          <Document
            file={revision.fileUrl}
            onLoadSuccess={({ numPages }) => onLoadSuccess(numPages)}
            loading={<LoadingSpinner />}
            error={<DocumentError />}
          >
            <Page
              pageNumber={currentPage}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
        ) : revision.fileUrl ? (
          <img
            src={revision.fileUrl}
            alt={label}
            className="max-w-full max-h-full"
          />
        ) : (
          <DocumentError />
        )}
      </div>

      {/* Change Region Highlights */}
      {changeRegions.map((region) => {
        const colorClasses = {
          added: 'border-green-500 bg-green-500/20',
          removed: 'border-red-500 bg-red-500/20',
          modified: 'border-yellow-400 bg-yellow-400/20',
        };
        const isSelected = region.id === selectedChangeId;
        const colorClass =
          colorClasses[region.changeType] || colorClasses.modified;

        return (
          <div
            key={region.id}
            className={cn(
              'absolute border-2 pointer-events-none transition-all',
              colorClass,
              isSelected && 'border-4 shadow-lg animate-pulse'
            )}
            style={{
              left: region.x,
              top: region.y,
              width: region.width,
              height: region.height,
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom / 100})`,
            }}
            title={region.description}
          />
        );
      })}
    </div>
  );
}

// Overlay View
interface OverlayViewProps {
  olderRevision: DrawingRevision;
  newerRevision: DrawingRevision;
  currentPage: number;
  opacity1: number;
  opacity2: number;
  zoom: number;
  position: { x: number; y: number };
  onLoadSuccess1: (numPages: number) => void;
  onLoadSuccess2: (numPages: number) => void;
}

function OverlayView({
  olderRevision,
  newerRevision,
  currentPage,
  opacity1,
  opacity2,
  zoom,
  position,
  onLoadSuccess1,
  onLoadSuccess2,
}: OverlayViewProps) {
  const isPdf1 =
    olderRevision.fileType === 'application/pdf' || !olderRevision.fileType;
  const isPdf2 =
    newerRevision.fileType === 'application/pdf' || !newerRevision.fileType;

  return (
    <div className="relative h-full flex items-center justify-center overflow-hidden">
      <div
        className="relative"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${zoom / 100})`,
          transformOrigin: 'center center',
        }}
      >
        {/* Older version (bottom layer) */}
        <div className="absolute inset-0" style={{ opacity: opacity1 / 100 }}>
          {isPdf1 && olderRevision.fileUrl ? (
            <Document
              file={olderRevision.fileUrl}
              onLoadSuccess={({ numPages }) => onLoadSuccess1(numPages)}
              loading={<LoadingSpinner />}
            >
              <Page
                pageNumber={currentPage}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
          ) : olderRevision.fileUrl ? (
            <img src={olderRevision.fileUrl} alt="Older version" />
          ) : null}
        </div>

        {/* Newer version (top layer) */}
        <div style={{ opacity: opacity2 / 100, mixBlendMode: 'difference' }}>
          {isPdf2 && newerRevision.fileUrl ? (
            <Document
              file={newerRevision.fileUrl}
              onLoadSuccess={({ numPages }) => onLoadSuccess2(numPages)}
              loading={<LoadingSpinner />}
            >
              <Page
                pageNumber={currentPage}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
          ) : newerRevision.fileUrl ? (
            <img src={newerRevision.fileUrl} alt="Newer version" />
          ) : null}
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-black/80 text-white p-3 rounded text-xs space-y-1">
        <p className="font-semibold">Overlay Legend:</p>
        <p>• Red/Magenta: Older version content</p>
        <p>• Green/Cyan: Newer version content</p>
        <p>• Gray/Black: Unchanged areas</p>
      </div>
    </div>
  );
}

// Diff View
interface DiffViewProps {
  diffImageDataUrl?: string;
  changeRegions: ChangeRegion[];
  showHighlights: boolean;
  selectedChangeId: string | null;
  zoom: number;
  position: { x: number; y: number };
}

function DiffView({
  diffImageDataUrl,
  changeRegions,
  showHighlights,
  selectedChangeId,
  zoom,
  position,
}: DiffViewProps) {
  if (!diffImageDataUrl) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Generating diff view...</p>
      </div>
    );
  }

  return (
    <div className="relative h-full flex items-center justify-center overflow-hidden">
      <div
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${zoom / 100})`,
          transformOrigin: 'center center',
        }}
      >
        <img src={diffImageDataUrl} alt="Diff view" className="max-w-none" />
      </div>

      {/* Change Region Highlights */}
      {showHighlights &&
        changeRegions.map((region) => {
          const colorClasses = {
            added: 'border-green-500',
            removed: 'border-red-500',
            modified: 'border-yellow-400',
          };
          const isSelected = region.id === selectedChangeId;
          const colorClass =
            colorClasses[region.changeType] || colorClasses.modified;

          return (
            <div
              key={region.id}
              className={cn(
                'absolute border-2 pointer-events-none',
                colorClass,
                isSelected && 'border-4 shadow-lg animate-pulse'
              )}
              style={{
                left: region.x,
                top: region.y,
                width: region.width,
                height: region.height,
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom / 100})`,
              }}
            />
          );
        })}
    </div>
  );
}

// Slider View
interface SliderViewProps {
  olderRevision: DrawingRevision;
  newerRevision: DrawingRevision;
}

function SliderView({ olderRevision, newerRevision }: SliderViewProps) {
  const isPdf1 =
    olderRevision.fileType === 'application/pdf' || !olderRevision.fileType;
  const isPdf2 =
    newerRevision.fileType === 'application/pdf' || !newerRevision.fileType;

  if (isPdf1 || isPdf2) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Slider view is only available for image files.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Use Side-by-Side or Overlay mode for PDF drawings.
          </p>
        </div>
      </div>
    );
  }

  if (!olderRevision.fileUrl || !newerRevision.fileUrl) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No files available for comparison</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="w-full max-w-4xl">
        <BeforeAfterSlider
          beforeImage={olderRevision.fileUrl}
          afterImage={newerRevision.fileUrl}
          beforeLabel={`Rev ${olderRevision.revision}`}
          afterLabel={`Rev ${newerRevision.revision}`}
        />
      </div>
    </div>
  );
}

// Changes Panel
interface ChangesPanelProps {
  changeRegions: ChangeRegion[];
  changeStats: {
    added: number;
    removed: number;
    modified: number;
    total: number;
  };
  selectedChangeId: string | null;
  onSelectChange: (change: ChangeRegion) => void;
  summary?: string;
}

function ChangesPanel({
  changeRegions,
  changeStats,
  selectedChangeId,
  onSelectChange,
  summary,
}: ChangesPanelProps) {
  return (
    <div className="w-80 border-l bg-card flex-shrink-0 overflow-hidden flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold mb-2">Changes Detected</h3>
        <div className="flex gap-2 text-sm">
          <Badge variant="outline" className="border-green-500 text-green-600">
            {changeStats.added} added
          </Badge>
          <Badge variant="outline" className="border-red-500 text-red-600">
            {changeStats.removed} removed
          </Badge>
          <Badge variant="outline" className="border-yellow-500 text-yellow-600">
            {changeStats.modified} modified
          </Badge>
        </div>
        {summary && (
          <p className="text-sm text-muted-foreground mt-2">{summary}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {changeRegions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No changes detected
          </p>
        ) : (
          changeRegions.map((region) => (
            <ChangeCard
              key={region.id}
              region={region}
              isSelected={region.id === selectedChangeId}
              onClick={() => onSelectChange(region)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Change Card
interface ChangeCardProps {
  region: ChangeRegion;
  isSelected: boolean;
  onClick: () => void;
}

function ChangeCard({ region, isSelected, onClick }: ChangeCardProps) {
  const colorClasses = {
    added: 'border-l-green-500',
    removed: 'border-l-red-500',
    modified: 'border-l-yellow-400',
  };
  const colorClass = colorClasses[region.changeType] || colorClasses.modified;

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md border-l-4',
        colorClass,
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={onClick}
    >
      <CardContent className="py-2 px-3">
        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            className={cn(
              'text-xs capitalize',
              region.changeType === 'added' && 'border-green-500 text-green-600',
              region.changeType === 'removed' && 'border-red-500 text-red-600',
              region.changeType === 'modified' &&
                'border-yellow-500 text-yellow-600'
            )}
          >
            {region.changeType}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {Math.round(region.confidence * 100)}% confidence
          </span>
        </div>
        {region.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {region.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Revision Footer
interface RevisionFooterProps {
  revision: DrawingRevision;
  label: string;
  className?: string;
}

function RevisionFooter({ revision, label, className }: RevisionFooterProps) {
  return (
    <div className={cn('flex items-center justify-between p-2 rounded', className)}>
      <div>
        <p className="font-medium">
          Rev {revision.revision} ({label})
        </p>
        <p className="text-xs text-muted-foreground">
          {revision.revisionDate
            ? format(new Date(revision.revisionDate), 'MMM d, yyyy')
            : 'Unknown date'}
        </p>
      </div>
      {revision.fileUrl && (
        <a
          href={revision.fileUrl}
          download
          className="text-primary hover:text-primary/80"
        >
          <Download className="w-4 h-4" />
        </a>
      )}
    </div>
  );
}

// Loading States
function LoadingState() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Analyzing revisions...</p>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

function ErrorState({ error }: { error: Error }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <p className="text-destructive font-medium">Failed to compare revisions</p>
        <p className="text-sm text-muted-foreground mt-2">
          {error.message || 'An unexpected error occurred'}
        </p>
      </div>
    </div>
  );
}

function DocumentError() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Failed to load document</p>
      </div>
    </div>
  );
}

export default DrawingRevisionComparison;
