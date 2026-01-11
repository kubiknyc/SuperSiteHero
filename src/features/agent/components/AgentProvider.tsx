/**
 * Agent Provider
 * Context provider that wraps the app to manage agent chat state and keyboard shortcuts
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { useAgentStore, useAgentChat } from '../state/store'

// ============================================================================
// Types
// ============================================================================

interface AgentContextValue {
  // State
  isOpen: boolean
  isMinimized: boolean
  isProcessing: boolean
  hasUnreadMessages: boolean
  hasSuggestions: boolean

  // Actions
  openChat: () => void
  closeChat: () => void
  toggleChat: () => void
  minimizeChat: () => void
  maximizeChat: () => void
}

interface AgentProviderProps {
  children: ReactNode
  /**
   * Enable keyboard shortcut (Cmd/Ctrl + K) to toggle chat
   * @default true
   */
  enableKeyboardShortcut?: boolean
  /**
   * Custom keyboard shortcut key (used with Cmd/Ctrl)
   * @default 'k'
   */
  shortcutKey?: string
}

// ============================================================================
// Context
// ============================================================================

const AgentContext = createContext<AgentContextValue | null>(null)

/**
 * Hook to access agent context
 * Must be used within AgentProvider
 */
export function useAgent(): AgentContextValue {
  const context = useContext(AgentContext)
  if (!context) {
    throw new Error('useAgent must be used within AgentProvider')
  }
  return context
}

/**
 * Hook to check if agent context is available
 * Safe to use anywhere - returns null if outside provider
 */
export function useAgentSafe(): AgentContextValue | null {
  return useContext(AgentContext)
}

// ============================================================================
// Provider Component
// ============================================================================

export function AgentProvider({
  children,
  enableKeyboardShortcut = true,
  shortcutKey = 'k',
}: AgentProviderProps) {
  const {
    isOpen,
    isMinimized,
    isProcessing,
    openChat,
    closeChat,
    toggleChat,
    minimizeChat,
    maximizeChat,
  } = useAgentChat()

  // For now, these are placeholders - would connect to actual unread/suggestion state
  const hasUnreadMessages = false
  const hasSuggestions = false

  // ========================================================================
  // Keyboard Shortcut Handler
  // ========================================================================

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const modifier = isMac ? event.metaKey : event.ctrlKey

      if (modifier && event.key.toLowerCase() === shortcutKey.toLowerCase()) {
        // Prevent default browser behavior (e.g., browser search)
        event.preventDefault()
        event.stopPropagation()

        toggleChat()
      }

      // Also handle Escape to close chat when open
      if (event.key === 'Escape' && isOpen && !isMinimized) {
        event.preventDefault()
        closeChat()
      }
    },
    [shortcutKey, toggleChat, isOpen, isMinimized, closeChat]
  )

  // Register keyboard listener
  useEffect(() => {
    if (!enableKeyboardShortcut) {return}

    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true })
    }
  }, [enableKeyboardShortcut, handleKeyDown])

  // ========================================================================
  // Context Value
  // ========================================================================

  const contextValue: AgentContextValue = {
    isOpen,
    isMinimized,
    isProcessing,
    hasUnreadMessages,
    hasSuggestions,
    openChat,
    closeChat,
    toggleChat,
    minimizeChat,
    maximizeChat,
  }

  return (
    <AgentContext.Provider value={contextValue}>
      {children}
    </AgentContext.Provider>
  )
}

export default AgentProvider
