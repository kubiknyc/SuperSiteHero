/**
 * Global Keyboard Shortcuts Hook
 * Provides app-wide keyboard shortcut management with registry pattern
 *
 * @example
 * // In App.tsx or layout component:
 * useGlobalKeyboardShortcuts({
 *   onToggleCommandPalette: () => setCommandPaletteOpen(true),
 *   onShowHelp: () => setHelpOpen(true),
 * })
 */

import { useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

// ============================================================================
// Types
// ============================================================================

export interface GlobalShortcut {
  /** Unique identifier for the shortcut */
  id: string
  /** Display label */
  label: string
  /** Description of what the shortcut does */
  description: string
  /** Array of keys (e.g., ['ctrl', 'k'] or ['?']) */
  keys: string[]
  /** Action to perform */
  action: () => void
  /** Whether shortcut is currently enabled */
  enabled?: boolean
  /** Category for grouping in help display */
  category: ShortcutCategory
  /** Whether this requires modifier (ctrl/cmd) */
  requiresModifier?: boolean
  /** Platform-specific display (auto-detected if not specified) */
  displayKeys?: {
    mac?: string[]
    windows?: string[]
  }
}

export type ShortcutCategory =
  | 'navigation'
  | 'actions'
  | 'views'
  | 'editing'
  | 'help'

export interface UseGlobalKeyboardShortcutsOptions {
  /** Callback when command palette should open */
  onToggleCommandPalette?: () => void
  /** Callback when help overlay should open */
  onShowHelp?: () => void
  /** Callback when creating new item */
  onCreateNew?: () => void
  /** Callback when saving */
  onSave?: () => void
  /** Custom additional shortcuts */
  customShortcuts?: GlobalShortcut[]
  /** Whether shortcuts are enabled (default: true) */
  enabled?: boolean
}

export interface KeyboardShortcutsState {
  /** All registered shortcuts */
  shortcuts: GlobalShortcut[]
  /** Shortcuts grouped by category */
  shortcutsByCategory: Record<ShortcutCategory, GlobalShortcut[]>
  /** Whether the help overlay is open */
  helpOpen: boolean
  /** Toggle help overlay */
  toggleHelp: () => void
}

// ============================================================================
// Constants
// ============================================================================

const CATEGORY_LABELS: Record<ShortcutCategory, string> = {
  navigation: 'Navigation',
  actions: 'Actions',
  views: 'Views',
  editing: 'Editing',
  help: 'Help',
}

const CATEGORY_ORDER: ShortcutCategory[] = [
  'navigation',
  'actions',
  'views',
  'editing',
  'help',
]

// Detect platform for displaying correct modifier key
const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if the event target is an input element
 */
function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false
  const tagName = target.tagName.toLowerCase()
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    target.isContentEditable
  )
}

/**
 * Format key combination for display
 */
export function formatKeyCombo(keys: string[], platform?: 'mac' | 'windows'): string {
  const useMac = platform === 'mac' || (platform === undefined && isMac)

  return keys
    .map((key) => {
      switch (key.toLowerCase()) {
        case 'ctrl':
        case 'control':
          return useMac ? '⌘' : 'Ctrl'
        case 'cmd':
        case 'meta':
          return useMac ? '⌘' : 'Ctrl'
        case 'alt':
        case 'option':
          return useMac ? '⌥' : 'Alt'
        case 'shift':
          return useMac ? '⇧' : 'Shift'
        case 'enter':
        case 'return':
          return '↵'
        case 'escape':
        case 'esc':
          return 'Esc'
        case 'arrowup':
          return '↑'
        case 'arrowdown':
          return '↓'
        case 'arrowleft':
          return '←'
        case 'arrowright':
          return '→'
        case 'backspace':
          return useMac ? '⌫' : 'Backspace'
        case 'delete':
          return useMac ? '⌦' : 'Del'
        case 'tab':
          return '⇥'
        case 'space':
          return 'Space'
        default:
          return key.toUpperCase()
      }
    })
    .join(useMac ? '' : '+')
}

/**
 * Check if a keyboard event matches a shortcut
 */
function matchesShortcut(event: KeyboardEvent, shortcut: GlobalShortcut): boolean {
  const keys = shortcut.keys.map((k) => k.toLowerCase())
  const eventKey = event.key.toLowerCase()

  // Check modifier requirements
  const needsCtrlOrCmd = keys.includes('ctrl') || keys.includes('cmd') || keys.includes('meta')
  const needsAlt = keys.includes('alt') || keys.includes('option')
  const needsShift = keys.includes('shift')

  const hasCtrlOrCmd = event.ctrlKey || event.metaKey
  const hasAlt = event.altKey
  const hasShift = event.shiftKey

  // If shortcut requires modifier but event doesn't have it
  if (needsCtrlOrCmd && !hasCtrlOrCmd) return false
  if (needsAlt && !hasAlt) return false
  if (needsShift && !hasShift) return false

  // If event has modifier but shortcut doesn't require it
  if (!needsCtrlOrCmd && hasCtrlOrCmd) return false
  if (!needsAlt && hasAlt) return false
  // Allow shift for case variations

  // Get the non-modifier key
  const targetKey = keys.find(
    (k) => !['ctrl', 'cmd', 'meta', 'alt', 'option', 'shift'].includes(k)
  )

  if (!targetKey) return false

  // Special handling for ? (shift + /)
  if (targetKey === '?') {
    return eventKey === '?' || (hasShift && eventKey === '/')
  }

  return eventKey === targetKey
}

// ============================================================================
// Main Hook
// ============================================================================

export function useGlobalKeyboardShortcuts(
  options: UseGlobalKeyboardShortcutsOptions = {}
): KeyboardShortcutsState {
  const {
    onToggleCommandPalette,
    onShowHelp,
    onCreateNew,
    onSave,
    customShortcuts = [],
    enabled = true,
  } = options

  const navigate = useNavigate()
  const location = useLocation()
  const helpOpenRef = useRef(false)

  // Build default shortcuts
  const defaultShortcuts: GlobalShortcut[] = [
    // Navigation
    {
      id: 'command-palette',
      label: 'Command Palette',
      description: 'Open quick search and navigation',
      keys: ['ctrl', 'k'],
      action: () => onToggleCommandPalette?.(),
      category: 'navigation',
      requiresModifier: true,
      enabled: !!onToggleCommandPalette,
    },
    {
      id: 'go-home',
      label: 'Go to Dashboard',
      description: 'Navigate to dashboard',
      keys: ['g', 'h'],
      action: () => navigate('/'),
      category: 'navigation',
    },
    {
      id: 'go-projects',
      label: 'Go to Projects',
      description: 'Navigate to projects list',
      keys: ['g', 'p'],
      action: () => navigate('/projects'),
      category: 'navigation',
    },
    {
      id: 'go-tasks',
      label: 'Go to Tasks',
      description: 'Navigate to tasks list',
      keys: ['g', 't'],
      action: () => navigate('/tasks'),
      category: 'navigation',
    },
    {
      id: 'go-rfis',
      label: 'Go to RFIs',
      description: 'Navigate to RFIs list',
      keys: ['g', 'r'],
      action: () => navigate('/rfis'),
      category: 'navigation',
    },
    {
      id: 'go-settings',
      label: 'Go to Settings',
      description: 'Navigate to settings',
      keys: ['g', 's'],
      action: () => navigate('/settings'),
      category: 'navigation',
    },

    // Actions
    {
      id: 'create-new',
      label: 'Create New',
      description: 'Create new item (context-aware)',
      keys: ['ctrl', 'n'],
      action: () => onCreateNew?.(),
      category: 'actions',
      requiresModifier: true,
      enabled: !!onCreateNew,
    },
    {
      id: 'save',
      label: 'Save',
      description: 'Save current changes',
      keys: ['ctrl', 's'],
      action: () => onSave?.(),
      category: 'actions',
      requiresModifier: true,
      enabled: !!onSave,
    },

    // Help
    {
      id: 'show-help',
      label: 'Show Shortcuts',
      description: 'Display keyboard shortcuts help',
      keys: ['?'],
      action: () => onShowHelp?.(),
      category: 'help',
      enabled: !!onShowHelp,
    },
    {
      id: 'close-modal',
      label: 'Close',
      description: 'Close modal or panel',
      keys: ['escape'],
      action: () => {}, // Handled by individual components
      category: 'help',
      enabled: false, // Just for display
    },
  ]

  // Combine default and custom shortcuts
  const allShortcuts = [...defaultShortcuts, ...customShortcuts].filter(
    (s) => s.enabled !== false
  )

  // Group shortcuts by category
  const shortcutsByCategory = CATEGORY_ORDER.reduce((acc, category) => {
    acc[category] = allShortcuts.filter((s) => s.category === category)
    return acc
  }, {} as Record<ShortcutCategory, GlobalShortcut[]>)

  // Track key sequences for multi-key shortcuts (like g+h)
  const keySequenceRef = useRef<string[]>([])
  const keySequenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Don't trigger shortcuts in input elements (except for modifier shortcuts)
      const hasModifier = event.ctrlKey || event.metaKey
      if (isInputElement(event.target) && !hasModifier) return

      // Build current key
      const currentKey = event.key.toLowerCase()

      // Check for single-key shortcuts first
      for (const shortcut of allShortcuts) {
        if (shortcut.enabled === false) continue
        if (matchesShortcut(event, shortcut)) {
          event.preventDefault()
          shortcut.action()
          // Clear sequence
          keySequenceRef.current = []
          if (keySequenceTimeoutRef.current) {
            clearTimeout(keySequenceTimeoutRef.current)
          }
          return
        }
      }

      // Handle multi-key sequences (g+h, g+p, etc.)
      if (!hasModifier && !event.altKey && currentKey.length === 1) {
        keySequenceRef.current.push(currentKey)

        // Clear sequence after 1 second of inactivity
        if (keySequenceTimeoutRef.current) {
          clearTimeout(keySequenceTimeoutRef.current)
        }
        keySequenceTimeoutRef.current = setTimeout(() => {
          keySequenceRef.current = []
        }, 1000)

        // Check for matching sequence
        const sequence = keySequenceRef.current.join('')
        for (const shortcut of allShortcuts) {
          if (shortcut.enabled === false) continue
          if (shortcut.keys.length === 2 && !shortcut.requiresModifier) {
            const shortcutSequence = shortcut.keys.join('')
            if (sequence === shortcutSequence) {
              event.preventDefault()
              shortcut.action()
              keySequenceRef.current = []
              if (keySequenceTimeoutRef.current) {
                clearTimeout(keySequenceTimeoutRef.current)
              }
              return
            }
          }
        }

        // Limit sequence length
        if (keySequenceRef.current.length > 2) {
          keySequenceRef.current = keySequenceRef.current.slice(-2)
        }
      }
    },
    [enabled, allShortcuts]
  )

  // Set up event listener
  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (keySequenceTimeoutRef.current) {
        clearTimeout(keySequenceTimeoutRef.current)
      }
    }
  }, [enabled, handleKeyDown])

  // Clear sequence on location change
  useEffect(() => {
    keySequenceRef.current = []
  }, [location.pathname])

  return {
    shortcuts: allShortcuts,
    shortcutsByCategory,
    helpOpen: helpOpenRef.current,
    toggleHelp: () => onShowHelp?.(),
  }
}

// ============================================================================
// Exports
// ============================================================================

export { CATEGORY_LABELS, CATEGORY_ORDER }
export type { GlobalShortcut as KeyboardShortcutConfig }
