// File: src/components/ui/glove-mode-toggle.tsx
// Toggle for enabling/disabling glove mode (larger touch targets)

import * as React from 'react'
import { cn } from '@/lib/utils'
import { useGloveMode } from '@/hooks/useGloveMode'
import { Switch } from './switch'

/**
 * Hand/Glove icon component
 */
function GloveIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-4 w-4', className)}
    >
      <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
      <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
      <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
    </svg>
  )
}

interface GloveModeToggleProps {
  className?: string
  showLabel?: boolean
  compact?: boolean
}

/**
 * Glove mode toggle component
 * Enables larger touch targets for field workers wearing gloves
 */
export function GloveModeToggle({
  className,
  showLabel = true,
  compact = false,
}: GloveModeToggleProps) {
  const { isGloveModeEnabled, toggleGloveMode } = useGloveMode()

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleGloveMode}
        className={cn(
          'flex items-center justify-center rounded-md p-2',
          'hover:bg-muted dark:hover:bg-surface transition-colors',
          isGloveModeEnabled && 'bg-success-light dark:bg-green-900 text-success-dark dark:text-green-400',
          className
        )}
        title={isGloveModeEnabled ? 'Disable Glove Mode' : 'Enable Glove Mode (larger touch targets)'}
        aria-label={isGloveModeEnabled ? 'Disable Glove Mode' : 'Enable Glove Mode'}
      >
        <GloveIcon className={cn('h-5 w-5', isGloveModeEnabled && 'text-success dark:text-green-400')} />
      </button>
    )
  }

  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <div className="flex items-center gap-3">
        <GloveIcon className={cn('h-5 w-5', isGloveModeEnabled && 'text-success dark:text-green-400')} />
        {showLabel && (
          <div className="flex flex-col">
            <span className="text-sm font-medium">Glove Mode</span>
            <span className="text-xs text-muted-foreground">
              {isGloveModeEnabled ? 'Enabled - Larger touch targets' : 'Larger buttons for work gloves'}
            </span>
          </div>
        )}
      </div>
      <Switch
        checked={isGloveModeEnabled}
        onCheckedChange={toggleGloveMode}
        aria-label="Toggle Glove Mode"
      />
    </div>
  )
}

/**
 * Inline glove mode indicator badge
 */
export function GloveModeIndicator({ className }: { className?: string }) {
  const { isGloveModeEnabled } = useGloveMode()

  if (!isGloveModeEnabled) {return null}

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium',
        'bg-success-light dark:bg-green-900 text-success-dark dark:text-green-400 rounded-full',
        className
      )}
    >
      <GloveIcon className="h-3 w-3" />
      Glove Mode
    </span>
  )
}

export { GloveIcon }
