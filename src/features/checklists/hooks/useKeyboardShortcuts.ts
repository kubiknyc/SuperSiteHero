// File: /src/features/checklists/hooks/useKeyboardShortcuts.ts
// Custom hook for keyboard shortcuts in checklist filling
// Enhancement: #3 - Keyboard Shortcuts

import { useEffect, useCallback } from 'react'

export interface KeyboardShortcut {
  key: string
  description: string
  action: () => void
  enabled?: boolean
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
}

/**
 * Custom hook to handle keyboard shortcuts for checklist filling
 * Supports global shortcuts like P (pass), F (fail), N (n/a), S (save), etc.
 */
export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input/textarea
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      // Don't trigger if modifier keys are pressed (except Shift for capital letters)
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return
      }

      const key = event.key.toLowerCase()

      // Find matching shortcut
      const shortcut = shortcuts.find(
        (s) => s.key.toLowerCase() === key && (s.enabled === undefined || s.enabled)
      )

      if (shortcut) {
        event.preventDefault()
        shortcut.action()
      }
    },
    [shortcuts]
  )

  useEffect(() => {
    if (!enabled) {return}

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, handleKeyDown])
}

/**
 * Get default checklist keyboard shortcuts
 */
export function getChecklistShortcuts(callbacks: {
  onPass?: () => void
  onFail?: () => void
  onNA?: () => void
  onNext?: () => void
  onPrevious?: () => void
  onSave?: () => void
  onSubmit?: () => void
}): KeyboardShortcut[] {
  return [
    {
      key: 'p',
      description: 'Mark as Pass',
      action: callbacks.onPass || (() => {}),
      enabled: !!callbacks.onPass,
    },
    {
      key: 'f',
      description: 'Mark as Fail',
      action: callbacks.onFail || (() => {}),
      enabled: !!callbacks.onFail,
    },
    {
      key: 'n',
      description: 'Mark as N/A',
      action: callbacks.onNA || (() => {}),
      enabled: !!callbacks.onNA,
    },
    {
      key: 'j',
      description: 'Next item',
      action: callbacks.onNext || (() => {}),
      enabled: !!callbacks.onNext,
    },
    {
      key: 'k',
      description: 'Previous item',
      action: callbacks.onPrevious || (() => {}),
      enabled: !!callbacks.onPrevious,
    },
    {
      key: 's',
      description: 'Save progress',
      action: callbacks.onSave || (() => {}),
      enabled: !!callbacks.onSave,
    },
    {
      key: 'enter',
      description: 'Submit checklist',
      action: callbacks.onSubmit || (() => {}),
      enabled: !!callbacks.onSubmit,
    },
  ]
}
