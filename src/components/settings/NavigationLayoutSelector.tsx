// File: src/components/settings/NavigationLayoutSelector.tsx
// Settings component for selecting navigation menu organization

import { useState } from 'react'
import { Navigation, Check, ChevronDown, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import {
  NAVIGATION_LAYOUTS,
  DEFAULT_LAYOUT_ID,
  type NavigationLayout,
} from '@/config/navigation-layouts'
import { getStorageItem, setStorageItem, STORAGE_KEYS } from '@/lib/utils/storage'

// ============================================================================
// LAYOUT OPTION CARD
// Clean, minimal layout preview matching settings page style
// ============================================================================

interface LayoutOptionProps {
  layout: NavigationLayout
  isSelected: boolean
  onSelect: () => void
}

function LayoutOption({ layout, isSelected, onSelect }: LayoutOptionProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full p-4 rounded-lg border text-left transition-all",
        "hover:border-primary/50 hover:bg-accent/30",
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-border bg-card"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Mini preview */}
        <div className={cn(
          "flex-shrink-0 w-10 h-10 rounded-md border flex flex-col justify-center p-1.5 gap-0.5",
          isSelected ? "border-primary/30 bg-primary/10" : "border-border bg-muted/50"
        )}>
          {layout.groups.slice(0, 3).map((_, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                isSelected ? "bg-primary" : "bg-muted-foreground/40"
              )} />
              <div className={cn(
                "h-0.5 rounded-full flex-1",
                isSelected ? "bg-primary/50" : "bg-muted-foreground/20"
              )} />
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-medium text-sm",
              isSelected ? "text-primary" : "text-foreground"
            )}>
              {layout.name}
            </span>
            {isSelected && (
              <Check className="w-4 h-4 text-primary" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {layout.groups.length} groups · {layout.groups.reduce((sum, g) => sum + g.items.length, 0)} items
          </p>
        </div>
      </div>
    </button>
  )
}

// ============================================================================
// CURRENT SELECTION DISPLAY
// Shows the active layout with expand/collapse
// ============================================================================

interface CurrentSelectionProps {
  layout: NavigationLayout
  isExpanded: boolean
  onToggle: () => void
}

function CurrentSelection({ layout, isExpanded, onToggle }: CurrentSelectionProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg border transition-all",
        "hover:bg-accent/50",
        isExpanded ? "border-primary/30 bg-accent/30" : "border-border bg-muted/30"
      )}
    >
      {/* Mini preview icon */}
      <div className={cn(
        "flex-shrink-0 w-10 h-10 rounded-md border flex flex-col justify-center p-1.5 gap-0.5",
        "border-primary/30 bg-primary/10"
      )}>
        {layout.groups.slice(0, 3).map((_, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            <div className="h-0.5 rounded-full flex-1 bg-primary/50" />
          </div>
        ))}
      </div>

      {/* Layout info */}
      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-primary uppercase tracking-wide">
            Active Layout
          </span>
        </div>
        <p className="font-semibold text-foreground">
          {layout.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {layout.groups.length} groups · {layout.groups.reduce((sum, g) => sum + g.items.length, 0)} items
        </p>
      </div>

      {/* Expand indicator */}
      <ChevronDown
        className={cn(
          "w-5 h-5 text-muted-foreground transition-transform",
          isExpanded && "rotate-180"
        )}
      />
    </button>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function NavigationLayoutSelector() {
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>(() =>
    getStorageItem(STORAGE_KEYS.NAVIGATION_LAYOUT, DEFAULT_LAYOUT_ID)
  )
  const [isExpanded, setIsExpanded] = useState(false)

  // Get the selected layout object
  const selectedLayout =
    NAVIGATION_LAYOUTS.find((l) => l.id === selectedLayoutId) ||
    NAVIGATION_LAYOUTS[0]

  // Handle layout selection
  const handleSelect = (layoutId: string) => {
    setSelectedLayoutId(layoutId)
    setStorageItem(STORAGE_KEYS.NAVIGATION_LAYOUT, layoutId)
    window.dispatchEvent(new CustomEvent('navigation-layout-changed', { detail: layoutId }))
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Icon matching other settings cards */}
          <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
            <Navigation className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg">Navigation Layout</CardTitle>
              <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                {NAVIGATION_LAYOUTS.length} options
              </span>
            </div>
            <CardDescription className="mb-4">
              Choose how the sidebar navigation menu is organized
            </CardDescription>

            {/* Current selection display */}
            <CurrentSelection
              layout={selectedLayout}
              isExpanded={isExpanded}
              onToggle={() => setIsExpanded(!isExpanded)}
            />

            {/* Expanded grid of options */}
            {isExpanded && (
              <div className="grid gap-2 mt-3 sm:grid-cols-2 lg:grid-cols-3">
                {NAVIGATION_LAYOUTS.map((layout) => (
                  <LayoutOption
                    key={layout.id}
                    layout={layout}
                    isSelected={layout.id === selectedLayoutId}
                    onSelect={() => handleSelect(layout.id)}
                  />
                ))}
              </div>
            )}

            {/* Helper text when expanded */}
            {isExpanded && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                <Layers className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Click any layout to apply it instantly
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default NavigationLayoutSelector
