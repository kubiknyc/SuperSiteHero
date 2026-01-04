/**
 * Keyboard Shortcuts Provider
 * Provides global keyboard shortcuts and help overlay functionality
 *
 * Wrap your app with this provider to enable:
 * - Cmd/Ctrl+K: Command palette
 * - ?: Keyboard shortcuts help
 * - G+H: Go to home
 * - G+P: Go to projects
 * - G+T: Go to tasks
 * - G+R: Go to RFIs
 * - G+S: Go to settings
 *
 * @example
 * <KeyboardShortcutsProvider>
 *   <App />
 * </KeyboardShortcutsProvider>
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { CommandPalette, useCommandPalette } from '@/components/ui/command-palette'
import { KeyboardShortcutsHelp } from '@/components/ui/keyboard-shortcuts-help'
import {
  useGlobalKeyboardShortcuts,
  type GlobalShortcut,
  type ShortcutCategory,
} from '@/hooks/useGlobalKeyboardShortcuts'

// ============================================================================
// Types
// ============================================================================

interface KeyboardShortcutsContextValue {
  /** Open the command palette */
  openCommandPalette: () => void
  /** Close the command palette */
  closeCommandPalette: () => void
  /** Toggle the command palette */
  toggleCommandPalette: () => void
  /** Whether command palette is open */
  isCommandPaletteOpen: boolean
  /** Open the shortcuts help */
  openShortcutsHelp: () => void
  /** Close the shortcuts help */
  closeShortcutsHelp: () => void
  /** Whether shortcuts help is open */
  isShortcutsHelpOpen: boolean
  /** All registered shortcuts */
  shortcuts: GlobalShortcut[]
  /** Shortcuts by category */
  shortcutsByCategory: Record<ShortcutCategory, GlobalShortcut[]>
  /** Register a custom shortcut */
  registerShortcut: (shortcut: GlobalShortcut) => void
  /** Unregister a shortcut */
  unregisterShortcut: (id: string) => void
}

interface KeyboardShortcutsProviderProps {
  children: ReactNode
  /** Whether shortcuts are enabled (default: true) */
  enabled?: boolean
  /** Custom shortcuts to add */
  customShortcuts?: GlobalShortcut[]
  /** Callback when creating new item (for Cmd+N) */
  onCreateNew?: () => void
  /** Callback when saving (for Cmd+S) */
  onSave?: () => void
}

// ============================================================================
// Context
// ============================================================================

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue | null>(null)

// ============================================================================
// Hook
// ============================================================================

export function useKeyboardShortcutsContext() {
  const context = useContext(KeyboardShortcutsContext)
  if (!context) {
    throw new Error(
      'useKeyboardShortcutsContext must be used within a KeyboardShortcutsProvider'
    )
  }
  return context
}

// ============================================================================
// Provider
// ============================================================================

export function KeyboardShortcutsProvider({
  children,
  enabled = true,
  customShortcuts: initialCustomShortcuts = [],
  onCreateNew,
  onSave,
}: KeyboardShortcutsProviderProps) {
  // Command palette state
  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } = useCommandPalette()

  // Shortcuts help state
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false)

  // Custom shortcuts registry
  const [customShortcuts, setCustomShortcuts] = useState<GlobalShortcut[]>(
    initialCustomShortcuts
  )

  // Handlers
  const openCommandPalette = useCallback(() => setCommandPaletteOpen(true), [setCommandPaletteOpen])
  const closeCommandPalette = useCallback(() => setCommandPaletteOpen(false), [setCommandPaletteOpen])
  const toggleCommandPalette = useCallback(
    () => setCommandPaletteOpen((prev) => !prev),
    [setCommandPaletteOpen]
  )
  const openShortcutsHelp = useCallback(() => setShortcutsHelpOpen(true), [])
  const closeShortcutsHelp = useCallback(() => setShortcutsHelpOpen(false), [])

  // Register/unregister shortcuts
  const registerShortcut = useCallback((shortcut: GlobalShortcut) => {
    setCustomShortcuts((prev) => {
      // Replace if exists, otherwise add
      const filtered = prev.filter((s) => s.id !== shortcut.id)
      return [...filtered, shortcut]
    })
  }, [])

  const unregisterShortcut = useCallback((id: string) => {
    setCustomShortcuts((prev) => prev.filter((s) => s.id !== id))
  }, [])

  // Initialize global shortcuts
  const { shortcuts, shortcutsByCategory } = useGlobalKeyboardShortcuts({
    onToggleCommandPalette: toggleCommandPalette,
    onShowHelp: openShortcutsHelp,
    onCreateNew,
    onSave,
    customShortcuts,
    enabled,
  })

  // Context value
  const value: KeyboardShortcutsContextValue = {
    openCommandPalette,
    closeCommandPalette,
    toggleCommandPalette,
    isCommandPaletteOpen: commandPaletteOpen,
    openShortcutsHelp,
    closeShortcutsHelp,
    isShortcutsHelpOpen: shortcutsHelpOpen,
    shortcuts,
    shortcutsByCategory,
    registerShortcut,
    unregisterShortcut,
  }

  return (
    <KeyboardShortcutsContext.Provider value={value}>
      {children}

      {/* Command Palette */}
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        open={shortcutsHelpOpen}
        onOpenChange={setShortcutsHelpOpen}
        shortcuts={shortcuts}
        shortcutsByCategory={shortcutsByCategory}
      />
    </KeyboardShortcutsContext.Provider>
  )
}

// ============================================================================
// Convenience Components
// ============================================================================

/**
 * Button that opens the command palette
 */
export function CommandPaletteButton({ className }: { className?: string }) {
  const { openCommandPalette } = useKeyboardShortcutsContext()

  return (
    <button
      onClick={openCommandPalette}
      className={className}
      aria-label="Open command palette (Cmd+K)"
    >
      <span className="sr-only">Open command palette</span>
    </button>
  )
}

/**
 * Button that opens the shortcuts help
 */
export function ShortcutsHelpButton({ className }: { className?: string }) {
  const { openShortcutsHelp } = useKeyboardShortcutsContext()

  return (
    <button
      onClick={openShortcutsHelp}
      className={className}
      aria-label="Show keyboard shortcuts (?)"
    >
      <span className="sr-only">Show keyboard shortcuts</span>
    </button>
  )
}

export default KeyboardShortcutsProvider
