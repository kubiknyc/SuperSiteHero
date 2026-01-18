# AI Drawing Management System - UI Component Specifications

**Design Direction:** Blueprint Modernism
**Date:** 2026-01-18

---

## Table of Contents

1. [Design Tokens & Theme](#design-tokens--theme)
2. [Phase 4 Components](#phase-4-components)
   - [DrawingSetUpload](#1-drawingsetupload)
   - [SheetGrid](#2-sheetgrid)
   - [SheetCard](#3-sheetcard)
   - [SheetViewer](#4-sheetviewer)
   - [CalloutOverlay](#5-calloutoverlay)
3. [Phase 5 Components](#phase-5-components)
   - [LassoSelectTool](#6-lassoselecttool)
   - [VisualSearchPanel](#7-visualsearchpanel)
   - [MatchGallery](#8-matchgallery)
   - [MatchCard](#9-matchcard)
4. [Phase 6 Components](#phase-6-components)
   - [MaterialListGenerator](#10-materiallistgenerator)
   - [MaterialListTable](#11-materiallisttable)
   - [WasteFactorEditor](#12-wastefactoreditor)
   - [ExportDialog](#13-exportdialog)

---

## Design Tokens & Theme

### Tailwind Config Extensions

```typescript
// tailwind.config.ts - Add to extend section
{
  extend: {
    colors: {
      // Blueprint palette
      blueprint: {
        bg: '#0a1628',
        grid: '#142642',
        line: '#3b82f6',
        highlight: '#60a5fa',
      },
      // Paper palette
      paper: {
        cream: '#faf9f6',
        grid: '#e8e6e1',
      },
      // Discipline colors
      discipline: {
        arch: '#3b82f6',
        struct: '#dc2626',
        mech: '#22c55e',
        elec: '#eab308',
        plumb: '#8b5cf6',
        civil: '#f97316',
      },
      // Functional
      callout: '#f59e0b',
      measure: '#ef4444',
    },
    fontFamily: {
      mono: ['DM Mono', 'monospace'],
      sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
      serif: ['Instrument Serif', 'Georgia', 'serif'],
    },
    animation: {
      'slide-up': 'slideUp 0.4s ease-out both',
      'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      'marching-ants': 'marchingAnts 0.5s linear infinite',
      'draw-line': 'drawLine 1.5s ease-out forwards',
    },
    keyframes: {
      slideUp: {
        from: { opacity: '0', transform: 'translateY(20px)' },
        to: { opacity: '1', transform: 'translateY(0)' },
      },
      pulseGlow: {
        '0%, 100%': { boxShadow: '0 0 0 0 rgba(245, 158, 11, 0.4)' },
        '50%': { boxShadow: '0 0 0 8px rgba(245, 158, 11, 0)' },
      },
      marchingAnts: {
        to: { strokeDashoffset: '-16' },
      },
      drawLine: {
        from: { strokeDashoffset: '1000' },
        to: { strokeDashoffset: '0' },
      },
    },
  },
}
```

### CSS Custom Properties

```css
/* src/features/drawing-sheets/styles/drawing-sheets.css */

@layer components {
  /* Blueprint grid background pattern */
  .bg-blueprint-grid {
    background-color: theme('colors.blueprint.bg');
    background-image:
      linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px);
    background-size: 20px 20px;
  }

  /* Paper texture overlay */
  .bg-paper-texture {
    background-color: theme('colors.paper.cream');
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  }

  /* Sheet number badge */
  .sheet-number {
    @apply font-mono text-xs tracking-wider uppercase;
  }

  /* Sheet title */
  .sheet-title {
    @apply font-serif text-lg font-normal;
  }

  /* Discipline indicator dot */
  .discipline-dot {
    @apply w-2 h-2 rounded-full;
  }

  .discipline-dot-arch { @apply bg-discipline-arch; }
  .discipline-dot-struct { @apply bg-discipline-struct; }
  .discipline-dot-mech { @apply bg-discipline-mech; }
  .discipline-dot-elec { @apply bg-discipline-elec; }
  .discipline-dot-plumb { @apply bg-discipline-plumb; }
  .discipline-dot-civil { @apply bg-discipline-civil; }
}
```

---

## Phase 4 Components

### 1. DrawingSetUpload

**File:** `src/features/drawing-sheets/components/DrawingSetUpload.tsx`

```tsx
import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface DrawingSetUploadProps {
  projectId: string
  onUploadComplete: (documentId: string, sheetCount: number) => void
  onError?: (error: Error) => void
  className?: string
}

type UploadState = 'idle' | 'uploading' | 'processing' | 'complete' | 'error'

export function DrawingSetUpload({
  projectId,
  onUploadComplete,
  onError,
  className,
}: DrawingSetUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [progress, setProgress] = useState(0)
  const [fileName, setFileName] = useState<string>('')
  const [sheetCount, setSheetCount] = useState<number>(0)
  const [errorMessage, setErrorMessage] = useState<string>('')

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setErrorMessage('Please upload a PDF file')
      setUploadState('error')
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage('File size must be under 50MB')
      setUploadState('error')
      return
    }

    setFileName(file.name)
    setUploadState('uploading')
    setProgress(0)

    try {
      // Simulated upload progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      // Upload file to Supabase Storage
      const { uploadFile } = await import('@/features/documents/utils/fileUtils')
      const { publicUrl } = await uploadFile(file, projectId, 'documents', (p) => {
        setProgress(p * 0.5) // First 50% is upload
      })

      clearInterval(progressInterval)
      setProgress(50)
      setUploadState('processing')

      // Create document record and trigger processing
      const { supabase } = await import('@/lib/supabase')

      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          project_id: projectId,
          name: file.name,
          file_url: publicUrl,
          file_type: 'application/pdf',
          file_size: file.size,
          document_type: 'drawing',
          status: 'processing',
        })
        .select()
        .single()

      if (docError) throw docError

      // Trigger PDF processing Edge Function
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-drawing-pdf`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            document_id: document.id,
            project_id: projectId,
            company_id: document.company_id,
          }),
        }
      )

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Processing failed')
      }

      setProgress(100)
      setSheetCount(result.sheets)
      setUploadState('complete')
      onUploadComplete(document.id, result.sheets)

    } catch (error) {
      console.error('Upload error:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed')
      setUploadState('error')
      onError?.(error instanceof Error ? error : new Error('Upload failed'))
    }
  }, [projectId, onUploadComplete, onError])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: uploadState === 'uploading' || uploadState === 'processing',
  })

  const resetUpload = () => {
    setUploadState('idle')
    setProgress(0)
    setFileName('')
    setSheetCount(0)
    setErrorMessage('')
  }

  return (
    <div className={cn('w-full', className)}>
      {uploadState === 'idle' && (
        <div
          {...getRootProps()}
          className={cn(
            'relative overflow-hidden rounded-lg border-2 border-dashed transition-all duration-300 cursor-pointer',
            'bg-blueprint-grid min-h-[280px] flex items-center justify-center',
            isDragActive
              ? 'border-blueprint-line bg-blueprint-line/5 scale-[1.02]'
              : 'border-gray-600 hover:border-blueprint-highlight hover:bg-blueprint-line/5'
          )}
        >
          <input {...getInputProps()} />

          {/* Animated grid overlay on drag */}
          {isDragActive && (
            <div className="absolute inset-0 bg-gradient-to-br from-blueprint-line/10 to-transparent animate-pulse" />
          )}

          <div className="relative z-10 text-center px-6 py-12">
            {/* Icon */}
            <div className={cn(
              'mx-auto w-16 h-16 rounded-xl flex items-center justify-center mb-6 transition-all',
              'bg-blueprint-grid border border-blueprint-line/30',
              isDragActive && 'scale-110 border-blueprint-line'
            )}>
              <Upload className={cn(
                'w-8 h-8 transition-colors',
                isDragActive ? 'text-blueprint-line' : 'text-gray-400'
              )} />
            </div>

            {/* Text */}
            <h3 className="font-serif text-xl text-white mb-2">
              {isDragActive ? 'Drop your drawing set' : 'Upload Drawing Set'}
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              Drop a multi-page PDF here, or click to browse
            </p>

            {/* Specs */}
            <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                PDF format
              </span>
              <span>Up to 50MB</span>
              <span>Multi-page supported</span>
            </div>
          </div>
        </div>
      )}

      {(uploadState === 'uploading' || uploadState === 'processing') && (
        <div className="rounded-lg border border-blueprint-line/30 bg-blueprint-grid p-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-blueprint-line/10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-blueprint-line animate-spin" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-white mb-1">
                {uploadState === 'uploading' ? 'Uploading...' : 'Processing sheets...'}
              </h3>
              <p className="text-sm text-gray-400 mb-4 font-mono">{fileName}</p>

              <Progress value={progress} className="h-2 mb-2" />

              <p className="text-xs text-gray-500">
                {uploadState === 'uploading'
                  ? 'Uploading file to server...'
                  : 'Splitting PDF and extracting metadata with AI...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {uploadState === 'complete' && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-white mb-1">Upload Complete</h3>
              <p className="text-sm text-gray-400 mb-1 font-mono">{fileName}</p>
              <p className="text-sm text-green-400">
                {sheetCount} sheets extracted and queued for AI processing
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={resetUpload}>
              Upload Another
            </Button>
          </div>
        </div>
      )}

      {uploadState === 'error' && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-white mb-1">Upload Failed</h3>
              <p className="text-sm text-red-400">{errorMessage}</p>
            </div>
            <Button variant="outline" size="sm" onClick={resetUpload}>
              Try Again
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

### 2. SheetGrid

**File:** `src/features/drawing-sheets/components/SheetGrid.tsx`

```tsx
import { useState, useMemo } from 'react'
import { Search, Filter, Grid3X3, List } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SheetCard } from './SheetCard'
import { useDrawingSheets } from '../hooks/useDrawingSheets'
import type { DrawingSheet, DrawingDiscipline } from '@/types/drawing-sheets'

interface SheetGridProps {
  projectId: string
  sourcePdfId?: string
  onSheetSelect: (sheet: DrawingSheet) => void
  className?: string
}

const DISCIPLINES: { value: DrawingDiscipline | 'all'; label: string; color: string }[] = [
  { value: 'all', label: 'All', color: 'bg-gray-500' },
  { value: 'architectural', label: 'ARCH', color: 'bg-discipline-arch' },
  { value: 'structural', label: 'STRUCT', color: 'bg-discipline-struct' },
  { value: 'mechanical', label: 'MECH', color: 'bg-discipline-mech' },
  { value: 'electrical', label: 'ELEC', color: 'bg-discipline-elec' },
  { value: 'plumbing', label: 'PLUMB', color: 'bg-discipline-plumb' },
  { value: 'civil', label: 'CIVIL', color: 'bg-discipline-civil' },
]

export function SheetGrid({
  projectId,
  sourcePdfId,
  onSheetSelect,
  className,
}: SheetGridProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDiscipline, setSelectedDiscipline] = useState<DrawingDiscipline | 'all'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const { data: sheets, isLoading } = useDrawingSheets(projectId, {
    sourcePdfId,
    discipline: selectedDiscipline === 'all' ? undefined : selectedDiscipline,
  })

  const filteredSheets = useMemo(() => {
    if (!sheets) return []
    if (!searchTerm) return sheets

    const term = searchTerm.toLowerCase()
    return sheets.filter(
      (sheet) =>
        sheet.sheet_number?.toLowerCase().includes(term) ||
        sheet.title?.toLowerCase().includes(term)
    )
  }, [sheets, searchTerm])

  const processingCount = useMemo(() => {
    return sheets?.filter((s) => s.processing_status === 'processing' || s.processing_status === 'pending').length ?? 0
  }, [sheets])

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-800 pb-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-serif text-2xl text-white">Drawing Sheets</h2>
            <p className="text-sm text-gray-400 mt-1">
              {filteredSheets.length} sheets
              {processingCount > 0 && (
                <span className="text-blueprint-line ml-2">
                  ({processingCount} processing)
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search by sheet number or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-900 border-gray-700"
            />
          </div>

          <div className="flex items-center gap-1">
            <Filter className="w-4 h-4 text-gray-500 mr-2" />
            {DISCIPLINES.map((d) => (
              <Badge
                key={d.value}
                variant={selectedDiscipline === d.value ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer transition-all',
                  selectedDiscipline === d.value && d.color
                )}
                onClick={() => setSelectedDiscipline(d.value)}
              >
                {d.label}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-blueprint-line border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading sheets...</p>
          </div>
        </div>
      ) : filteredSheets.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-400 mb-2">No sheets found</p>
            <p className="text-sm text-gray-500">
              {searchTerm ? 'Try a different search term' : 'Upload a drawing set to get started'}
            </p>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            'flex-1 overflow-y-auto',
            viewMode === 'grid'
              ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
              : 'flex flex-col gap-2'
          )}
        >
          {filteredSheets.map((sheet, index) => (
            <SheetCard
              key={sheet.id}
              sheet={sheet}
              onClick={() => onSheetSelect(sheet)}
              viewMode={viewMode}
              style={{ animationDelay: `${index * 0.05}s` }}
              className="animate-slide-up"
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

---

### 3. SheetCard

**File:** `src/features/drawing-sheets/components/SheetCard.tsx`

```tsx
import { memo } from 'react'
import { Loader2, AlertCircle, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DrawingSheet } from '@/types/drawing-sheets'

interface SheetCardProps {
  sheet: DrawingSheet
  onClick: () => void
  viewMode: 'grid' | 'list'
  className?: string
  style?: React.CSSProperties
}

const disciplineColors: Record<string, string> = {
  architectural: 'bg-discipline-arch',
  structural: 'bg-discipline-struct',
  mechanical: 'bg-discipline-mech',
  electrical: 'bg-discipline-elec',
  plumbing: 'bg-discipline-plumb',
  civil: 'bg-discipline-civil',
  landscape: 'bg-green-600',
  fire_protection: 'bg-orange-600',
  other: 'bg-gray-500',
}

export const SheetCard = memo(function SheetCard({
  sheet,
  onClick,
  viewMode,
  className,
  style,
}: SheetCardProps) {
  const isProcessing = sheet.processing_status === 'processing' || sheet.processing_status === 'pending'
  const isFailed = sheet.processing_status === 'failed'
  const disciplineColor = disciplineColors[sheet.discipline || 'other']

  if (viewMode === 'list') {
    return (
      <button
        onClick={onClick}
        disabled={isProcessing}
        className={cn(
          'w-full flex items-center gap-4 p-3 rounded-lg text-left transition-all',
          'bg-gray-900/50 hover:bg-gray-800 border border-gray-800 hover:border-gray-700',
          isProcessing && 'opacity-60 cursor-wait',
          className
        )}
        style={style}
      >
        {/* Discipline dot */}
        <div className={cn('w-2 h-2 rounded-full flex-shrink-0', disciplineColor)} />

        {/* Sheet number */}
        <span className="font-mono text-sm text-blueprint-highlight w-20 flex-shrink-0">
          {sheet.sheet_number || `Page ${sheet.page_number}`}
        </span>

        {/* Title */}
        <span className="flex-1 text-sm text-gray-300 truncate">
          {isProcessing ? 'Extracting metadata...' : sheet.title || 'Untitled'}
        </span>

        {/* Status */}
        {isProcessing && <Loader2 className="w-4 h-4 text-blueprint-line animate-spin" />}
        {isFailed && <AlertCircle className="w-4 h-4 text-red-500" />}

        {/* Revision */}
        {sheet.revision && (
          <span className="text-xs text-gray-500 font-mono">Rev {sheet.revision}</span>
        )}
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      disabled={isProcessing}
      className={cn(
        'group relative flex flex-col rounded-lg overflow-hidden transition-all duration-200',
        'bg-paper-cream border border-gray-200 hover:border-blueprint-line',
        'hover:shadow-lg hover:shadow-blueprint-line/10 hover:-translate-y-1',
        isProcessing && 'opacity-80 cursor-wait',
        className
      )}
      style={style}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[8.5/11] bg-white overflow-hidden">
        {sheet.thumbnail_url ? (
          <img
            src={sheet.thumbnail_url}
            alt={sheet.title || `Sheet ${sheet.sheet_number}`}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            {isProcessing ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-blueprint-line animate-spin" />
                <span className="text-xs text-gray-500">Processing</span>
              </div>
            ) : (
              <span className="text-gray-400 font-mono text-sm">No preview</span>
            )}
          </div>
        )}

        {/* Hover overlay */}
        <div className={cn(
          'absolute inset-0 bg-blueprint-bg/80 flex items-center justify-center',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          isProcessing && 'hidden'
        )}>
          <div className="flex items-center gap-2 text-white">
            <Eye className="w-5 h-5" />
            <span className="font-medium">View Sheet</span>
          </div>
        </div>

        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-blueprint-bg/60 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-blueprint-line animate-spin mx-auto mb-2" />
              <span className="text-xs text-white">AI Processing</span>
            </div>
          </div>
        )}

        {/* Failed badge */}
        {isFailed && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded">
            Failed
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 bg-white border-t border-gray-100">
        <div className="flex items-start gap-2">
          <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', disciplineColor)} />
          <div className="flex-1 min-w-0">
            <p className="font-mono text-sm text-blueprint-bg font-medium truncate">
              {sheet.sheet_number || `Page ${sheet.page_number}`}
            </p>
            <p className="text-xs text-gray-600 truncate mt-0.5">
              {isProcessing ? 'Extracting...' : sheet.title || 'Untitled'}
            </p>
            {sheet.revision && (
              <p className="text-xs text-gray-400 mt-1">
                Rev {sheet.revision}
                {sheet.revision_date && ` · ${new Date(sheet.revision_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}`}
              </p>
            )}
          </div>
        </div>
      </div>
    </button>
  )
})
```

---

### 4. SheetViewer

**File:** `src/features/drawing-sheets/components/SheetViewer.tsx`

```tsx
import { useState, useCallback } from 'react'
import {
  ArrowLeft, ZoomIn, ZoomOut, Maximize2, Download,
  ChevronLeft, ChevronRight, Layers
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CalloutOverlay } from './CalloutOverlay'
import { useDrawingSheet, useSheetCallouts } from '../hooks/useDrawingSheets'
import type { DrawingSheet, SheetCallout } from '@/types/drawing-sheets'

interface SheetViewerProps {
  sheetId: string
  onBack: () => void
  onNavigateToSheet: (sheetId: string) => void
  className?: string
}

const ZOOM_LEVELS = [50, 75, 100, 125, 150, 200]

export function SheetViewer({
  sheetId,
  onBack,
  onNavigateToSheet,
  className,
}: SheetViewerProps) {
  const [zoom, setZoom] = useState(100)
  const [showCallouts, setShowCallouts] = useState(true)

  const { data: sheet, isLoading: sheetLoading } = useDrawingSheet(sheetId)
  const { data: callouts } = useSheetCallouts(sheetId)

  const handleZoomIn = useCallback(() => {
    const currentIndex = ZOOM_LEVELS.indexOf(zoom)
    if (currentIndex < ZOOM_LEVELS.length - 1) {
      setZoom(ZOOM_LEVELS[currentIndex + 1])
    }
  }, [zoom])

  const handleZoomOut = useCallback(() => {
    const currentIndex = ZOOM_LEVELS.indexOf(zoom)
    if (currentIndex > 0) {
      setZoom(ZOOM_LEVELS[currentIndex - 1])
    }
  }, [zoom])

  const handleCalloutClick = useCallback((callout: SheetCallout) => {
    if (callout.target_sheet_id) {
      onNavigateToSheet(callout.target_sheet_id)
    }
  }, [onNavigateToSheet])

  const linkedCallouts = callouts?.filter((c) => c.target_sheet_id) ?? []

  if (sheetLoading || !sheet) {
    return (
      <div className={cn('flex items-center justify-center h-full bg-gray-950', className)}>
        <div className="w-12 h-12 border-2 border-blueprint-line border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full bg-gray-950', className)}>
      {/* Toolbar */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Set
          </Button>

          <div className="h-6 w-px bg-gray-700" />

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {sheet.sheet_number || `Page ${sheet.page_number}`}
            </Badge>
            <span className="text-white font-serif">{sheet.title || 'Untitled'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Callouts toggle */}
          <Button
            variant={showCallouts ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setShowCallouts(!showCallouts)}
          >
            <Layers className="w-4 h-4 mr-2" />
            Callouts ({callouts?.length ?? 0})
          </Button>

          <div className="h-6 w-px bg-gray-700" />

          {/* Zoom controls */}
          <Button variant="ghost" size="icon" onClick={handleZoomOut} disabled={zoom <= 50}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-400 w-12 text-center font-mono">{zoom}%</span>
          <Button variant="ghost" size="icon" onClick={handleZoomIn} disabled={zoom >= 200}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Maximize2 className="w-4 h-4" />
          </Button>

          <div className="h-6 w-px bg-gray-700" />

          <Button variant="ghost" size="icon">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Viewer */}
      <div className="flex-1 overflow-auto bg-blueprint-grid">
        <div
          className="min-h-full flex items-center justify-center p-8"
          style={{ minWidth: zoom > 100 ? `${zoom}%` : '100%' }}
        >
          <div
            className="relative bg-white shadow-2xl"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center' }}
          >
            {sheet.full_image_url ? (
              <>
                <img
                  src={sheet.full_image_url}
                  alt={sheet.title || `Sheet ${sheet.sheet_number}`}
                  className="max-w-none"
                  draggable={false}
                />

                {/* Callout overlays */}
                {showCallouts && callouts && (
                  <CalloutOverlay
                    callouts={callouts}
                    onCalloutClick={handleCalloutClick}
                  />
                )}
              </>
            ) : (
              <div className="w-[850px] h-[1100px] flex items-center justify-center bg-gray-100">
                <span className="text-gray-400">No image available</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar - linked sheets */}
      {linkedCallouts.length > 0 && (
        <div className="flex-shrink-0 px-4 py-3 bg-gray-900 border-t border-gray-800">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Linked Sheets:</span>
            <div className="flex items-center gap-2 flex-wrap">
              {linkedCallouts.map((callout) => (
                <Button
                  key={callout.id}
                  variant="outline"
                  size="sm"
                  className="font-mono text-xs"
                  onClick={() => handleCalloutClick(callout)}
                >
                  {callout.target_sheet_number || callout.callout_text}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

### 5. CalloutOverlay

**File:** `src/features/drawing-sheets/components/CalloutOverlay.tsx`

```tsx
import { useState, memo } from 'react'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SheetCallout } from '@/types/drawing-sheets'

interface CalloutOverlayProps {
  callouts: SheetCallout[]
  onCalloutClick: (callout: SheetCallout) => void
}

export const CalloutOverlay = memo(function CalloutOverlay({
  callouts,
  onCalloutClick,
}: CalloutOverlayProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <div className="absolute inset-0 pointer-events-none">
      {callouts.map((callout) => {
        if (!callout.bounding_box) return null

        const { x, y, width, height } = callout.bounding_box
        const isLinked = !!callout.target_sheet_id
        const isHovered = hoveredId === callout.id

        return (
          <div
            key={callout.id}
            className="absolute pointer-events-auto"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: `${width}%`,
              height: `${height}%`,
            }}
            onMouseEnter={() => setHoveredId(callout.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* Callout marker */}
            <button
              onClick={() => isLinked && onCalloutClick(callout)}
              disabled={!isLinked}
              className={cn(
                'absolute inset-0 rounded-sm border-2 transition-all duration-200',
                isLinked
                  ? 'border-callout cursor-pointer hover:bg-callout/10'
                  : 'border-gray-400 cursor-default',
                isLinked && !isHovered && 'animate-pulse-glow'
              )}
            />

            {/* Tooltip */}
            {isHovered && (
              <div
                className={cn(
                  'absolute left-full top-0 ml-2 z-50',
                  'bg-gray-900 border border-gray-700 rounded-lg shadow-xl',
                  'px-3 py-2 min-w-[160px]'
                )}
              >
                <p className="font-mono text-sm text-blueprint-highlight mb-0.5">
                  {callout.callout_text}
                </p>
                {callout.target_sheet_number && (
                  <p className="text-xs text-gray-400 mb-2">
                    Sheet {callout.target_sheet_number}
                  </p>
                )}
                {isLinked ? (
                  <div className="flex items-center gap-1 text-xs text-callout">
                    <span>Click to navigate</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Sheet not found</p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
})
```

---

## Phase 5 Components

### 6. LassoSelectTool

**File:** `src/features/visual-search/components/LassoSelectTool.tsx`

```tsx
import { useRef, useState, useCallback, useEffect } from 'react'
import { Stage, Layer, Line, Image as KonvaImage } from 'react-konva'
import { cn } from '@/lib/utils'

interface LassoSelectToolProps {
  imageUrl: string
  onSelectionComplete: (imageData: string, bounds: SelectionBounds) => void
  className?: string
}

interface SelectionBounds {
  x: number
  y: number
  width: number
  height: number
}

interface Point {
  x: number
  y: number
}

export function LassoSelectTool({
  imageUrl,
  onSelectionComplete,
  className,
}: LassoSelectToolProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [points, setPoints] = useState<Point[]>([])
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  // Load image
  useEffect(() => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.src = imageUrl
    img.onload = () => {
      setImage(img)
      // Calculate dimensions to fit container
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth
        const scale = containerWidth / img.width
        setDimensions({
          width: containerWidth,
          height: img.height * scale,
        })
      }
    }
  }, [imageUrl])

  const handleMouseDown = useCallback((e: any) => {
    const stage = e.target.getStage()
    const pos = stage.getPointerPosition()
    setIsDrawing(true)
    setPoints([{ x: pos.x, y: pos.y }])
  }, [])

  const handleMouseMove = useCallback((e: any) => {
    if (!isDrawing) return
    const stage = e.target.getStage()
    const pos = stage.getPointerPosition()
    setPoints((prev) => [...prev, { x: pos.x, y: pos.y }])
  }, [isDrawing])

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || points.length < 3 || !image) return
    setIsDrawing(false)

    // Calculate bounding box
    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    // Add padding (10%)
    const padding = 0.1
    const width = maxX - minX
    const height = maxY - minY
    const paddedMinX = Math.max(0, minX - width * padding)
    const paddedMinY = Math.max(0, minY - height * padding)
    const paddedWidth = Math.min(dimensions.width - paddedMinX, width * (1 + 2 * padding))
    const paddedHeight = Math.min(dimensions.height - paddedMinY, height * (1 + 2 * padding))

    // Extract cropped image
    const canvas = document.createElement('canvas')
    const scale = image.width / dimensions.width
    canvas.width = paddedWidth * scale
    canvas.height = paddedHeight * scale
    const ctx = canvas.getContext('2d')

    if (ctx) {
      ctx.drawImage(
        image,
        paddedMinX * scale,
        paddedMinY * scale,
        paddedWidth * scale,
        paddedHeight * scale,
        0,
        0,
        canvas.width,
        canvas.height
      )

      const imageData = canvas.toDataURL('image/png')

      // Convert to percentages
      const bounds: SelectionBounds = {
        x: (paddedMinX / dimensions.width) * 100,
        y: (paddedMinY / dimensions.height) * 100,
        width: (paddedWidth / dimensions.width) * 100,
        height: (paddedHeight / dimensions.height) * 100,
      }

      onSelectionComplete(imageData, bounds)
    }

    setPoints([])
  }, [isDrawing, points, image, dimensions, onSelectionComplete])

  // Flatten points for Konva Line
  const flattenedPoints = points.flatMap((p) => [p.x, p.y])

  return (
    <div ref={containerRef} className={cn('relative cursor-crosshair', className)}>
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <Layer>
          {image && (
            <KonvaImage
              image={image}
              width={dimensions.width}
              height={dimensions.height}
            />
          )}
        </Layer>
        <Layer>
          {points.length > 0 && (
            <>
              {/* Lasso line */}
              <Line
                points={flattenedPoints}
                stroke="#f59e0b"
                strokeWidth={2}
                dash={[8, 8]}
                lineCap="round"
                lineJoin="round"
                closed={!isDrawing}
              />
              {/* Fill when complete */}
              {!isDrawing && (
                <Line
                  points={flattenedPoints}
                  fill="rgba(245, 158, 11, 0.1)"
                  stroke="transparent"
                  closed
                />
              )}
            </>
          )}
        </Layer>
      </Stage>

      {/* Instructions overlay */}
      {points.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-gray-900/90 px-4 py-2 rounded-lg">
            <p className="text-sm text-gray-300">
              Draw around the symbol you want to find
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

### 7. VisualSearchPanel

**File:** `src/features/visual-search/components/VisualSearchPanel.tsx`

```tsx
import { useState } from 'react'
import { X, Search, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Slider } from '@/components/ui/slider'
import { LassoSelectTool } from './LassoSelectTool'
import { MatchGallery } from './MatchGallery'
import { useVisualSearch } from '../hooks/useVisualSearch'
import type { VisualSearchMatch } from '@/types/drawing-sheets'

interface VisualSearchPanelProps {
  projectId: string
  currentSheetId: string
  sheetImageUrl: string
  onClose: () => void
  onCreateTakeoff: (matches: VisualSearchMatch[], assemblyId: string) => void
  className?: string
}

type SearchScope = 'current' | 'discipline' | 'all'

export function VisualSearchPanel({
  projectId,
  currentSheetId,
  sheetImageUrl,
  onClose,
  onCreateTakeoff,
  className,
}: VisualSearchPanelProps) {
  const [selectionImage, setSelectionImage] = useState<string | null>(null)
  const [scope, setScope] = useState<SearchScope>('all')
  const [tolerance, setTolerance] = useState(75)
  const [matches, setMatches] = useState<VisualSearchMatch[]>([])

  const { search, isSearching } = useVisualSearch()

  const handleSelectionComplete = (imageData: string) => {
    setSelectionImage(imageData)
  }

  const handleSearch = async () => {
    if (!selectionImage) return

    const results = await search({
      projectId,
      patternImage: selectionImage,
      scope,
      tolerance: tolerance / 100,
      currentSheetId,
    })

    setMatches(results.map((r) => ({ ...r, is_excluded: false })))
  }

  const handleToggleMatch = (index: number) => {
    setMatches((prev) =>
      prev.map((m, i) =>
        i === index ? { ...m, is_excluded: !m.is_excluded } : m
      )
    )
  }

  const selectedCount = matches.filter((m) => !m.is_excluded).length

  return (
    <div className={cn('flex flex-col h-full bg-gray-950', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <h2 className="font-serif text-xl text-white">Visual Search</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Selection */}
        <div className="w-1/2 border-r border-gray-800 flex flex-col">
          <div className="flex-1 p-4 overflow-auto">
            <LassoSelectTool
              imageUrl={sheetImageUrl}
              onSelectionComplete={handleSelectionComplete}
              className="rounded-lg overflow-hidden"
            />
          </div>

          {/* Selection preview */}
          {selectionImage && (
            <div className="p-4 border-t border-gray-800">
              <Label className="text-sm text-gray-400 mb-2 block">Selected Pattern</Label>
              <div className="flex items-start gap-4">
                <img
                  src={selectionImage}
                  alt="Selected pattern"
                  className="w-24 h-24 object-contain bg-white rounded border border-gray-700"
                />
                <div className="flex-1 space-y-4">
                  {/* Scope */}
                  <div>
                    <Label className="text-sm text-gray-400 mb-2 block">Search Scope</Label>
                    <RadioGroup value={scope} onValueChange={(v) => setScope(v as SearchScope)}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="current" id="current" />
                        <Label htmlFor="current" className="text-sm">Current Sheet</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="discipline" id="discipline" />
                        <Label htmlFor="discipline" className="text-sm">Same Discipline</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all" id="all" />
                        <Label htmlFor="all" className="text-sm">Entire Drawing Set</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Tolerance */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm text-gray-400">Match Tolerance</Label>
                      <span className="text-sm font-mono text-blueprint-highlight">{tolerance}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">Strict</span>
                      <Slider
                        value={[tolerance]}
                        onValueChange={([v]) => setTolerance(v)}
                        min={50}
                        max={95}
                        step={5}
                        className="flex-1"
                      />
                      <span className="text-xs text-gray-500">Fuzzy</span>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                className="w-full mt-4"
                onClick={handleSearch}
                disabled={isSearching}
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Search All Sheets
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Right panel - Results */}
        <div className="w-1/2 flex flex-col">
          {matches.length > 0 ? (
            <>
              <div className="p-4 border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-white">
                      {matches.length} matches found
                    </h3>
                    <p className="text-sm text-gray-400">
                      {selectedCount} selected across {new Set(matches.map(m => m.sheet_id)).size} sheets
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4">
                <MatchGallery
                  matches={matches}
                  onToggleMatch={handleToggleMatch}
                />
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-gray-800 bg-gray-900">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">
                    Selected: <span className="text-white font-mono">{selectedCount}</span> items
                  </span>
                  <Button
                    onClick={() => onCreateTakeoff(matches.filter(m => !m.is_excluded), '')}
                    disabled={selectedCount === 0}
                  >
                    Create Takeoff Item
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-600" />
                </div>
                <h3 className="text-lg text-white mb-2">No search results yet</h3>
                <p className="text-sm text-gray-400 max-w-xs">
                  Select a symbol on the drawing and click "Search All Sheets" to find matches
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

### 8. MatchGallery

**File:** `src/features/visual-search/components/MatchGallery.tsx`

```tsx
import { memo } from 'react'
import { cn } from '@/lib/utils'
import { MatchCard } from './MatchCard'
import type { VisualSearchMatch } from '@/types/drawing-sheets'

interface MatchGalleryProps {
  matches: VisualSearchMatch[]
  onToggleMatch: (index: number) => void
  className?: string
}

export const MatchGallery = memo(function MatchGallery({
  matches,
  onToggleMatch,
  className,
}: MatchGalleryProps) {
  // Group matches by sheet
  const groupedMatches = matches.reduce((acc, match, index) => {
    const key = match.sheet_id
    if (!acc[key]) {
      acc[key] = {
        sheetNumber: match.sheet_number,
        sheetTitle: match.sheet_title,
        matches: [],
      }
    }
    acc[key].matches.push({ match, index })
    return acc
  }, {} as Record<string, { sheetNumber: string | null; sheetTitle: string | null; matches: { match: VisualSearchMatch; index: number }[] }>)

  return (
    <div className={cn('space-y-6', className)}>
      {Object.entries(groupedMatches).map(([sheetId, group]) => (
        <div key={sheetId}>
          <div className="flex items-center gap-2 mb-3">
            <span className="font-mono text-sm text-blueprint-highlight">
              {group.sheetNumber || 'Unknown'}
            </span>
            <span className="text-sm text-gray-400 truncate">
              {group.sheetTitle}
            </span>
            <span className="text-xs text-gray-500 ml-auto">
              {group.matches.length} matches
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {group.matches.map(({ match, index }) => (
              <MatchCard
                key={`${sheetId}-${index}`}
                match={match}
                onToggle={() => onToggleMatch(index)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
})
```

---

### 9. MatchCard

**File:** `src/features/visual-search/components/MatchCard.tsx`

```tsx
import { memo } from 'react'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VisualSearchMatch } from '@/types/drawing-sheets'

interface MatchCardProps {
  match: VisualSearchMatch
  onToggle: () => void
}

export const MatchCard = memo(function MatchCard({
  match,
  onToggle,
}: MatchCardProps) {
  const confidencePercent = Math.round(match.confidence * 100)
  const isHighConfidence = confidencePercent >= 85
  const isMediumConfidence = confidencePercent >= 70 && confidencePercent < 85

  return (
    <button
      onClick={onToggle}
      className={cn(
        'relative aspect-square rounded-lg overflow-hidden border-2 transition-all',
        'hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blueprint-line',
        match.is_excluded
          ? 'border-gray-700 opacity-50'
          : 'border-green-500'
      )}
    >
      {/* Match image placeholder - would be actual cropped image */}
      <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
        <span className="text-xs text-gray-500 font-mono">
          {match.bounding_box.x.toFixed(0)}%
        </span>
      </div>

      {/* Selection indicator */}
      <div className={cn(
        'absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center',
        match.is_excluded ? 'bg-gray-700' : 'bg-green-500'
      )}>
        {match.is_excluded ? (
          <X className="w-3 h-3 text-gray-400" />
        ) : (
          <Check className="w-3 h-3 text-white" />
        )}
      </div>

      {/* Confidence bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-900">
        <div
          className={cn(
            'h-full transition-all',
            isHighConfidence && 'bg-green-500',
            isMediumConfidence && 'bg-yellow-500',
            !isHighConfidence && !isMediumConfidence && 'bg-red-500'
          )}
          style={{ width: `${confidencePercent}%` }}
        />
      </div>

      {/* Confidence label */}
      <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] font-mono text-white">
        {confidencePercent}%
      </div>
    </button>
  )
})
```

---

## Phase 6 Components

### 10. MaterialListGenerator

**File:** `src/features/material-lists/components/MaterialListGenerator.tsx`

```tsx
import { useState } from 'react'
import { FileSpreadsheet, Download, Mail, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { MaterialListTable } from './MaterialListTable'
import { ExportDialog } from './ExportDialog'
import { useMaterialList, useUpdateMaterialList } from '../hooks/useMaterialLists'
import type { MaterialList, MaterialListItem } from '@/types/drawing-sheets'

interface MaterialListGeneratorProps {
  listId?: string
  projectId: string
  takeoffId?: string
  className?: string
}

export function MaterialListGenerator({
  listId,
  projectId,
  takeoffId,
  className,
}: MaterialListGeneratorProps) {
  const [showExport, setShowExport] = useState(false)
  const [name, setName] = useState('New Material List')

  const { data: list, isLoading } = useMaterialList(listId)
  const { mutate: updateList } = useUpdateMaterialList()

  const handleItemChange = (index: number, updates: Partial<MaterialListItem>) => {
    if (!list) return

    const newItems = [...list.items]
    newItems[index] = { ...newItems[index], ...updates }

    // Recalculate order quantity if waste factor changed
    if (updates.waste_factor !== undefined) {
      newItems[index].order_quantity = Math.ceil(
        newItems[index].quantity * (1 + updates.waste_factor)
      )
    }

    updateList({ id: list.id, items: newItems })
  }

  const handleRemoveItem = (index: number) => {
    if (!list) return
    const newItems = list.items.filter((_, i) => i !== index)
    updateList({ id: list.id, items: newItems })
  }

  const totalItems = list?.items.length ?? 0
  const totalOrderLines = list?.items.reduce((acc, item) => acc + item.order_quantity, 0) ?? 0

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center h-64', className)}>
        <Loader2 className="w-8 h-8 text-blueprint-line animate-spin" />
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blueprint-line/10 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-blueprint-line" />
          </div>
          <div>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-lg font-serif bg-transparent border-none p-0 h-auto focus-visible:ring-0"
            />
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={list?.status === 'draft' ? 'outline' : 'default'}>
                {list?.status || 'Draft'}
              </Badge>
              <span className="text-sm text-gray-500">
                {totalItems} items · {totalOrderLines} total units
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowExport(true)}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Mail className="w-4 h-4 mr-2" />
            Email to Supplier
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {list && (
          <MaterialListTable
            items={list.items}
            onItemChange={handleItemChange}
            onRemoveItem={handleRemoveItem}
          />
        )}
      </div>

      {/* Summary */}
      <div className="flex-shrink-0 px-6 py-4 bg-gray-900 border-t border-gray-800">
        <div className="flex items-center justify-between">
          <div className="grid grid-cols-3 gap-8">
            <div>
              <Label className="text-xs text-gray-500">Total Items</Label>
              <p className="text-lg font-mono text-white">{totalItems}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Total Units</Label>
              <p className="text-lg font-mono text-white">{totalOrderLines.toLocaleString()}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Categories</Label>
              <p className="text-lg font-mono text-white">
                {new Set(list?.items.map((i) => i.category).filter(Boolean)).size}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline">Save as Template</Button>
            <Button>Finalize List</Button>
          </div>
        </div>
      </div>

      {/* Export Dialog */}
      {showExport && list && (
        <ExportDialog
          list={list}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  )
}
```

---

### 11. MaterialListTable

**File:** `src/features/material-lists/components/MaterialListTable.tsx`

```tsx
import { memo } from 'react'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { WasteFactorEditor } from './WasteFactorEditor'
import type { MaterialListItem } from '@/types/drawing-sheets'

interface MaterialListTableProps {
  items: MaterialListItem[]
  onItemChange: (index: number, updates: Partial<MaterialListItem>) => void
  onRemoveItem: (index: number) => void
  className?: string
}

export const MaterialListTable = memo(function MaterialListTable({
  items,
  onItemChange,
  onRemoveItem,
  className,
}: MaterialListTableProps) {
  return (
    <div className={cn('w-full', className)}>
      <table className="w-full">
        <thead className="bg-gray-900 sticky top-0">
          <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
            <th className="px-4 py-3 font-medium">Item</th>
            <th className="px-4 py-3 font-medium text-right w-24">Qty</th>
            <th className="px-4 py-3 font-medium text-center w-20">Unit</th>
            <th className="px-4 py-3 font-medium text-center w-28">Waste %</th>
            <th className="px-4 py-3 font-medium text-right w-28">Order Qty</th>
            <th className="px-4 py-3 w-12"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {items.map((item, index) => (
            <tr
              key={item.id}
              className="hover:bg-gray-900/50 transition-colors"
            >
              <td className="px-4 py-3">
                <Input
                  value={item.name}
                  onChange={(e) => onItemChange(index, { name: e.target.value })}
                  className="bg-transparent border-none p-0 h-auto focus-visible:ring-1"
                />
                {item.category && (
                  <span className="text-xs text-gray-500 mt-1 block">
                    {item.category}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <span className="font-mono text-white">
                  {item.quantity.toLocaleString()}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="text-sm text-gray-400">{item.unit}</span>
              </td>
              <td className="px-4 py-3">
                <WasteFactorEditor
                  value={item.waste_factor}
                  onChange={(value) => onItemChange(index, { waste_factor: value })}
                />
              </td>
              <td className="px-4 py-3 text-right">
                <span className="font-mono text-green-400 font-medium">
                  {item.order_quantity.toLocaleString()}
                </span>
              </td>
              <td className="px-4 py-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500 hover:text-red-500"
                  onClick={() => onRemoveItem(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {items.length === 0 && (
        <div className="flex items-center justify-center py-12 text-gray-500">
          No items in this material list
        </div>
      )}
    </div>
  )
})
```

---

### 12. WasteFactorEditor

**File:** `src/features/material-lists/components/WasteFactorEditor.tsx`

```tsx
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface WasteFactorEditorProps {
  value: number
  onChange: (value: number) => void
  className?: string
}

const PRESET_FACTORS = [0, 0.05, 0.10, 0.15, 0.20]

export function WasteFactorEditor({
  value,
  onChange,
  className,
}: WasteFactorEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleClick = () => {
    setInputValue((value * 100).toString())
    setIsEditing(true)
  }

  const handleBlur = () => {
    const parsed = parseFloat(inputValue)
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      onChange(parsed / 100)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
    }
  }

  const displayPercent = Math.round(value * 100)

  return (
    <div className={cn('flex items-center justify-center gap-1', className)}>
      {isEditing ? (
        <div className="flex items-center">
          <input
            ref={inputRef}
            type="number"
            min="0"
            max="100"
            step="1"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-12 bg-gray-800 border border-blueprint-line rounded px-2 py-1 text-sm text-center font-mono focus:outline-none"
          />
          <span className="text-sm text-gray-400 ml-1">%</span>
        </div>
      ) : (
        <button
          onClick={handleClick}
          className={cn(
            'px-2 py-1 rounded text-sm font-mono transition-colors',
            'hover:bg-gray-800',
            value === 0 ? 'text-gray-500' : 'text-callout'
          )}
        >
          +{displayPercent}%
        </button>
      )}
    </div>
  )
}
```

---

### 13. ExportDialog

**File:** `src/features/material-lists/components/ExportDialog.tsx`

```tsx
import { useState } from 'react'
import { FileText, FileSpreadsheet, FileCode, Mail, Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { MaterialList } from '@/types/drawing-sheets'

interface ExportDialogProps {
  list: MaterialList
  onClose: () => void
}

type ExportFormat = 'pdf' | 'excel' | 'csv' | 'email'

const EXPORT_OPTIONS: { format: ExportFormat; label: string; icon: typeof FileText; description: string }[] = [
  { format: 'pdf', label: 'PDF', icon: FileText, description: 'Formatted for printing' },
  { format: 'excel', label: 'Excel', icon: FileSpreadsheet, description: 'Editable spreadsheet' },
  { format: 'csv', label: 'CSV', icon: FileCode, description: 'Import to supplier portals' },
  { format: 'email', label: 'Email', icon: Mail, description: 'Send directly to supplier' },
]

export function ExportDialog({ list, onClose }: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null)
  const [emailAddress, setEmailAddress] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [exportComplete, setExportComplete] = useState(false)

  const handleExport = async () => {
    if (!selectedFormat) return

    setIsExporting(true)

    // Simulate export
    await new Promise((resolve) => setTimeout(resolve, 1500))

    setIsExporting(false)
    setExportComplete(true)

    // Auto-close after success
    setTimeout(() => {
      onClose()
    }, 1500)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Export Material List</DialogTitle>
        </DialogHeader>

        {exportComplete ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-1">Export Complete</h3>
            <p className="text-sm text-gray-400">
              {selectedFormat === 'email'
                ? `Sent to ${emailAddress}`
                : 'Your file is downloading'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 my-4">
              {EXPORT_OPTIONS.map((option) => (
                <button
                  key={option.format}
                  onClick={() => setSelectedFormat(option.format)}
                  className={cn(
                    'flex flex-col items-center p-4 rounded-lg border-2 transition-all',
                    selectedFormat === option.format
                      ? 'border-blueprint-line bg-blueprint-line/5'
                      : 'border-gray-800 hover:border-gray-700'
                  )}
                >
                  <option.icon className={cn(
                    'w-6 h-6 mb-2',
                    selectedFormat === option.format ? 'text-blueprint-line' : 'text-gray-400'
                  )} />
                  <span className="font-medium text-white text-sm">{option.label}</span>
                  <span className="text-xs text-gray-500 mt-1">{option.description}</span>
                </button>
              ))}
            </div>

            {selectedFormat === 'email' && (
              <div className="space-y-2">
                <Label htmlFor="email">Supplier Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="supplier@example.com"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                />
              </div>
            )}

            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                disabled={!selectedFormat || isExporting || (selectedFormat === 'email' && !emailAddress)}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  'Export'
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

---

## Component Index Files

### Drawing Sheets Feature Index

**File:** `src/features/drawing-sheets/components/index.ts`

```typescript
export { DrawingSetUpload } from './DrawingSetUpload'
export { SheetGrid } from './SheetGrid'
export { SheetCard } from './SheetCard'
export { SheetViewer } from './SheetViewer'
export { CalloutOverlay } from './CalloutOverlay'
```

### Visual Search Feature Index

**File:** `src/features/visual-search/components/index.ts`

```typescript
export { LassoSelectTool } from './LassoSelectTool'
export { VisualSearchPanel } from './VisualSearchPanel'
export { MatchGallery } from './MatchGallery'
export { MatchCard } from './MatchCard'
```

### Material Lists Feature Index

**File:** `src/features/material-lists/components/index.ts`

```typescript
export { MaterialListGenerator } from './MaterialListGenerator'
export { MaterialListTable } from './MaterialListTable'
export { WasteFactorEditor } from './WasteFactorEditor'
export { ExportDialog } from './ExportDialog'
```

---

## Summary

| Phase | Component | Lines | Complexity |
|-------|-----------|-------|------------|
| 4 | DrawingSetUpload | ~200 | Medium |
| 4 | SheetGrid | ~180 | Medium |
| 4 | SheetCard | ~130 | Low |
| 4 | SheetViewer | ~200 | High |
| 4 | CalloutOverlay | ~80 | Low |
| 5 | LassoSelectTool | ~150 | High |
| 5 | VisualSearchPanel | ~220 | High |
| 5 | MatchGallery | ~60 | Low |
| 5 | MatchCard | ~70 | Low |
| 6 | MaterialListGenerator | ~180 | Medium |
| 6 | MaterialListTable | ~120 | Medium |
| 6 | WasteFactorEditor | ~80 | Low |
| 6 | ExportDialog | ~140 | Medium |

**Total:** ~1,810 lines of component code

---

*Design specifications created 2026-01-18*
