// File: /src/features/drawing-sheets/components/CalloutOverlay.tsx
// Overlay for displaying clickable callouts on drawing sheets

import { cn } from '@/lib/utils'
import type { SheetCallout, CalloutType } from '@/types/drawing-sheets'

interface CalloutOverlayProps {
  callouts: SheetCallout[]
  onCalloutClick?: (callout: SheetCallout) => void
  selectedCalloutId?: string
  className?: string
}

/**
 * CalloutOverlay Component
 *
 * Renders clickable callout markers over a drawing sheet image.
 * Callouts are positioned based on their bounding_box percentages.
 *
 * Features:
 * - Visual indicators for different callout types
 * - Click handlers for navigation
 * - Selected state highlighting
 * - Linked vs unlinked visual distinction
 */
export function CalloutOverlay({
  callouts,
  onCalloutClick,
  selectedCalloutId,
  className,
}: CalloutOverlayProps) {
  return (
    <div className={cn('absolute inset-0 pointer-events-none', className)}>
      {callouts.map((callout) => (
        <CalloutMarker
          key={callout.id}
          callout={callout}
          isSelected={selectedCalloutId === callout.id}
          onClick={() => onCalloutClick?.(callout)}
        />
      ))}
    </div>
  )
}

interface CalloutMarkerProps {
  callout: SheetCallout
  isSelected: boolean
  onClick?: () => void
}

function CalloutMarker({ callout, isSelected, onClick }: CalloutMarkerProps) {
  // Get position from bounding box (percentages)
  const { bounding_box } = callout
  if (!bounding_box) {
    // If no bounding box, skip rendering this callout
    return null
  }

  const { x, y, width, height } = bounding_box

  // Get callout type styling
  const { bgColor, borderColor, icon } = getCalloutTypeStyle(callout.callout_type)

  // Determine if this callout is linked
  const isLinked = !!callout.target_sheet_id

  return (
    <div
      className={cn(
        'absolute pointer-events-auto cursor-pointer transition-all',
        'hover:scale-110 hover:z-10',
        isSelected && 'ring-2 ring-primary ring-offset-2'
      )}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${width}%`,
        height: `${height}%`,
        minWidth: '24px',
        minHeight: '24px',
      }}
      onClick={onClick}
      title={callout.callout_text}
    >
      {/* Bounding box highlight */}
      <div
        className={cn(
          'absolute inset-0 rounded-sm',
          'border-2',
          borderColor,
          'bg-opacity-20',
          bgColor
        )}
      />

      {/* Callout indicator dot */}
      <div
        className={cn(
          'absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center',
          'text-white text-xs font-bold shadow-md',
          isLinked ? 'bg-success dark:bg-success' : 'bg-warning dark:bg-warning'
        )}
      >
        {icon}
      </div>
    </div>
  )
}

// Get styling based on callout type
// Note: These colors are intentionally distinct for visual differentiation of callout types
// They use semantic tokens where available (info for detail, muted for other)
function getCalloutTypeStyle(type: CalloutType | null): {
  bgColor: string
  borderColor: string
  icon: string
} {
  switch (type) {
    case 'detail':
      return {
        bgColor: 'bg-info dark:bg-info',
        borderColor: 'border-info dark:border-info',
        icon: 'D',
      }
    case 'section':
      return {
        bgColor: 'bg-purple-500 dark:bg-purple-400',
        borderColor: 'border-purple-500 dark:border-purple-400',
        icon: 'S',
      }
    case 'elevation':
      return {
        bgColor: 'bg-teal-500 dark:bg-teal-400',
        borderColor: 'border-teal-500 dark:border-teal-400',
        icon: 'E',
      }
    case 'plan':
      return {
        bgColor: 'bg-warning dark:bg-warning',
        borderColor: 'border-warning dark:border-warning',
        icon: 'P',
      }
    case 'reference':
      return {
        bgColor: 'bg-cyan-500 dark:bg-cyan-400',
        borderColor: 'border-cyan-500 dark:border-cyan-400',
        icon: 'R',
      }
    case 'other':
    default:
      return {
        bgColor: 'bg-muted-foreground dark:bg-muted-foreground',
        borderColor: 'border-muted-foreground dark:border-muted-foreground',
        icon: '?',
      }
  }
}

// Simplified callout overlay without bounding boxes (just markers)
interface SimpleCalloutOverlayProps {
  callouts: SheetCallout[]
  onCalloutClick?: (callout: SheetCallout) => void
  selectedCalloutId?: string
}

export function SimpleCalloutOverlay({
  callouts,
  onCalloutClick,
  selectedCalloutId,
}: SimpleCalloutOverlayProps) {
  // Filter callouts with bounding boxes
  const calloutsWithPosition = callouts.filter((c) => c.bounding_box)

  if (calloutsWithPosition.length === 0) {
    return null
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {calloutsWithPosition.map((callout) => {
        const { x, y } = callout.bounding_box!
        const isSelected = selectedCalloutId === callout.id
        const isLinked = !!callout.target_sheet_id

        return (
          <button
            key={callout.id}
            className={cn(
              'absolute pointer-events-auto',
              'w-8 h-8 -ml-4 -mt-4 rounded-full',
              'flex items-center justify-center',
              'transition-all hover:scale-125',
              'shadow-lg border-2 border-white',
              isLinked ? 'bg-success dark:bg-success' : 'bg-warning dark:bg-warning',
              isSelected && 'ring-2 ring-primary ring-offset-2'
            )}
            style={{ left: `${x}%`, top: `${y}%` }}
            onClick={() => onCalloutClick?.(callout)}
            title={callout.callout_text}
          >
            <span className="text-white text-xs font-bold">
              {callout.callout_type?.charAt(0).toUpperCase() || '?'}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// Callout legend component
export function CalloutLegend({ className }: { className?: string }) {
  const types: { type: CalloutType; label: string }[] = [
    { type: 'detail', label: 'Detail' },
    { type: 'section', label: 'Section' },
    { type: 'elevation', label: 'Elevation' },
    { type: 'plan', label: 'Plan' },
    { type: 'reference', label: 'Reference' },
    { type: 'other', label: 'Other' },
  ]

  return (
    <div className={cn('flex flex-wrap gap-3 text-xs', className)}>
      {types.map(({ type, label }) => {
        const { bgColor, icon } = getCalloutTypeStyle(type)
        return (
          <div key={type} className="flex items-center gap-1.5">
            <div
              className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold',
                bgColor
              )}
            >
              {icon}
            </div>
            <span className="text-muted-foreground">{label}</span>
          </div>
        )
      })}

      <div className="w-px bg-border mx-2" />

      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-full bg-success dark:bg-success" />
        <span className="text-muted-foreground">Linked</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-full bg-warning dark:bg-warning" />
        <span className="text-muted-foreground">Unlinked</span>
      </div>
    </div>
  )
}
