// File: /src/features/punch-lists/components/LazyFloorPlanPinDrop.tsx
// Lazy-loaded wrapper for FloorPlanPinDrop to defer loading of react-konva

import { lazy, Suspense } from 'react'
import { Loader2, MapPin } from 'lucide-react'
import { Label } from '@/components/ui/label'

const FloorPlanPinDrop = lazy(() => import('./FloorPlanPinDrop'))

// Re-export the PinLocation type
export type { PinLocation } from './FloorPlanPinDrop'

interface LazyFloorPlanPinDropProps {
  projectId: string
  value?: { x: number; y: number; documentId?: string; pageNumber?: number; sheetName?: string } | null
  onChange: (location: { x: number; y: number; documentId?: string; pageNumber?: number; sheetName?: string } | null) => void
  disabled?: boolean
}

function FloorPlanPinDropLoader() {
  return (
    <div>
      <Label className="text-sm font-medium mb-2 block">Floor Plan Location</Label>
      <div className="flex items-center gap-2 p-3 bg-muted border rounded-lg">
        <MapPin className="h-5 w-5 text-disabled" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted">Loading floor plan tools...</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LazyFloorPlanPinDrop(props: LazyFloorPlanPinDropProps) {
  return (
    <Suspense fallback={<FloorPlanPinDropLoader />}>
      <FloorPlanPinDrop {...props} />
    </Suspense>
  )
}

export default LazyFloorPlanPinDrop
