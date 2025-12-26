// File: /src/features/documents/components/LazyDrawingCanvas.tsx
// Lazy-loaded wrapper for DrawingCanvas to reduce initial bundle size

import { lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'

const DrawingCanvas = lazy(() => import('./DrawingCanvas'))

interface LazyDrawingCanvasProps {
  documentId: string
  projectId: string
  pageNumber?: number | null
  backgroundImageUrl?: string
  width?: number
  height?: number
  readOnly?: boolean
  onSave?: () => void
  currentUserId?: string
}

function DrawingCanvasLoader() {
  return (
    <div className="flex items-center justify-center w-full h-full min-h-[400px] bg-surface rounded-lg border">
      <div className="flex flex-col items-center gap-2 text-muted">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="text-sm">Loading drawing tools...</span>
      </div>
    </div>
  )
}

export function LazyDrawingCanvas(props: LazyDrawingCanvasProps) {
  return (
    <Suspense fallback={<DrawingCanvasLoader />}>
      <DrawingCanvas {...props} />
    </Suspense>
  )
}

export default LazyDrawingCanvas
