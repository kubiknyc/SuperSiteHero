/**
 * Agent Keyboard Shortcut
 * Displays keyboard shortcut hint that shows the correct modifier key based on OS
 * Shows "Cmd+K" on Mac or "Ctrl+K" on Windows/Linux
 */

import React, { useMemo } from 'react'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

interface AgentKeyboardShortcutProps {
  /**
   * Visual variant of the shortcut display
   * - 'default': Full kbd styling
   * - 'compact': Smaller inline style
   * - 'text': Plain text without styling
   */
  variant?: 'default' | 'compact' | 'text'
  /**
   * The key that triggers the shortcut (used with modifier)
   * @default 'K'
   */
  shortcutKey?: string
  /**
   * Custom class name
   */
  className?: string
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Detects if the user is on a Mac
 */
function useIsMac(): boolean {
  return useMemo(() => {
    if (typeof window === 'undefined') return false

    // Check navigator.platform first (more reliable)
    if (navigator.platform) {
      return navigator.platform.toUpperCase().indexOf('MAC') >= 0
    }

    // Fallback to userAgent
    return navigator.userAgent.toUpperCase().indexOf('MAC') >= 0
  }, [])
}

// ============================================================================
// Component
// ============================================================================

export function AgentKeyboardShortcut({
  variant = 'default',
  shortcutKey = 'K',
  className,
}: AgentKeyboardShortcutProps) {
  const isMac = useIsMac()

  const modifierKey = isMac ? 'Cmd' : 'Ctrl'
  const modifierSymbol = isMac ? '\u2318' : 'Ctrl'

  // Text-only variant
  if (variant === 'text') {
    return (
      <span className={cn('text-muted-foreground', className)}>
        {modifierKey}+{shortcutKey}
      </span>
    )
  }

  // Compact variant (for tooltips, inline use)
  if (variant === 'compact') {
    return (
      <kbd
        className={cn(
          'inline-flex items-center gap-0.5',
          'px-1.5 py-0.5 rounded',
          'text-[10px] font-medium',
          'bg-muted/80 text-muted-foreground',
          'border border-border/50',
          className
        )}
      >
        <span>{modifierSymbol}</span>
        <span>{shortcutKey}</span>
      </kbd>
    )
  }

  // Default variant (full kbd styling)
  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      <kbd
        className={cn(
          'inline-flex items-center justify-center',
          'min-w-[24px] h-6 px-1.5',
          'text-xs font-medium',
          'bg-muted text-muted-foreground',
          'border border-border rounded-md',
          'shadow-[0_1px_0_1px_rgba(0,0,0,0.1)]',
          'dark:shadow-[0_1px_0_1px_rgba(255,255,255,0.05)]'
        )}
      >
        {modifierSymbol}
      </kbd>
      <span className="text-xs text-muted-foreground">+</span>
      <kbd
        className={cn(
          'inline-flex items-center justify-center',
          'min-w-[24px] h-6 px-1.5',
          'text-xs font-medium',
          'bg-muted text-muted-foreground',
          'border border-border rounded-md',
          'shadow-[0_1px_0_1px_rgba(0,0,0,0.1)]',
          'dark:shadow-[0_1px_0_1px_rgba(255,255,255,0.05)]'
        )}
      >
        {shortcutKey}
      </kbd>
    </div>
  )
}

/**
 * Hook to get keyboard shortcut text programmatically
 */
export function useKeyboardShortcutText(key: string = 'K'): {
  text: string
  symbol: string
  isMac: boolean
} {
  const isMac = useIsMac()

  return useMemo(() => ({
    text: isMac ? `Cmd+${key}` : `Ctrl+${key}`,
    symbol: isMac ? `\u2318${key}` : `Ctrl+${key}`,
    isMac,
  }), [isMac, key])
}

export default AgentKeyboardShortcut
