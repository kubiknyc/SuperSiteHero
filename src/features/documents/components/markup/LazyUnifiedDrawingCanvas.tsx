// File: /src/features/documents/components/markup/LazyUnifiedDrawingCanvas.tsx
// Lazy-loaded wrapper for UnifiedDrawingCanvas to defer loading of react-konva
// This reduces initial bundle size by ~50KB

import { lazy, Suspense, memo } from 'react'
import { Loader2, Pencil } from 'lucide-react'
import type { useEnhancedMarkupState } from '../../hooks/useEnhancedMarkupState'

// Lazy load the heavy canvas component
const UnifiedDrawingCanvasComponent = lazy(() => import('./UnifiedDrawingCanvas'))

interface LazyUnifiedDrawingCanvasProps {
    documentId: string
    projectId: string
    pageNumber?: number | null
    backgroundImageUrl?: string
    width?: number
    height?: number
    readOnly?: boolean
    onSave?: () => void
    selectedLayerId?: string | null
    visibleLayerIds?: string[]
    selectedColor?: string
    selectedLineWidth?: number
    markupState?: ReturnType<typeof useEnhancedMarkupState>
    collaborative?: boolean
}

/**
 * Loading placeholder shown while UnifiedDrawingCanvas is being loaded
 */
const CanvasLoader = memo(function CanvasLoader({ width, height }: { width?: number; height?: number }) {
    return (
        <div
            className="flex flex-col items-center justify-center bg-muted/50 border border-dashed border-border rounded-lg"
            style={{ width: width || '100%', height: height || 400 }}
        >
            <div className="p-4 bg-card rounded-full shadow-sm mb-3">
                <Pencil className="h-8 w-8 text-muted animate-pulse" />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading drawing tools...</span>
            </div>
        </div>
    )
})

/**
 * Lazy-loaded wrapper for UnifiedDrawingCanvas
 *
 * This component defers the loading of the heavy react-konva library
 * until the canvas is actually needed, reducing initial page load time.
 */
export function LazyUnifiedDrawingCanvas(props: LazyUnifiedDrawingCanvasProps) {
    return (
        <Suspense fallback={<CanvasLoader width={props.width} height={props.height} />}>
            <UnifiedDrawingCanvasComponent {...props} />
        </Suspense>
    )
}

// Also export as UnifiedDrawingCanvas for drop-in replacement usage
export { LazyUnifiedDrawingCanvas as UnifiedDrawingCanvas }

export default LazyUnifiedDrawingCanvas
