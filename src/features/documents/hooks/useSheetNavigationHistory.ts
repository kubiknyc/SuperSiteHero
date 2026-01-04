// File: /src/features/documents/hooks/useSheetNavigationHistory.ts
// Hook for managing sheet navigation history with back/forward support

import { useState, useCallback, useEffect, useMemo } from 'react'
import type { SheetReference, NavigationHistory } from '../types/navigation'

/**
 * Maximum number of entries to keep in navigation history
 */
const MAX_HISTORY_SIZE = 50

/**
 * Initial navigation history state
 */
const initialHistory: NavigationHistory = {
  history: [],
  currentIndex: -1,
}

/**
 * Hook for managing sheet navigation history
 * Provides back/forward navigation, keyboard shortcuts, and recent sheets tracking
 *
 * @example
 * ```tsx
 * const {
 *   navigateTo,
 *   goBack,
 *   goForward,
 *   canGoBack,
 *   canGoForward,
 *   currentSheet,
 *   getRecentSheets,
 * } = useSheetNavigationHistory()
 *
 * // Navigate to a sheet
 * navigateTo({ documentId: 'doc-123', pageNumber: 1, sheetNumber: 'A-101' })
 *
 * // Go back
 * if (canGoBack) goBack()
 *
 * // Get recent sheets for a dropdown menu
 * const recent = getRecentSheets(5)
 * ```
 */
export function useSheetNavigationHistory() {
  const [navigationState, setNavigationState] = useState<NavigationHistory>(initialHistory)

  // Derived state
  const canGoBack = useMemo(
    () => navigationState.currentIndex > 0,
    [navigationState.currentIndex]
  )

  const canGoForward = useMemo(
    () => navigationState.currentIndex < navigationState.history.length - 1,
    [navigationState.currentIndex, navigationState.history.length]
  )

  const currentSheet = useMemo(
    () =>
      navigationState.currentIndex >= 0
        ? navigationState.history[navigationState.currentIndex]
        : null,
    [navigationState.history, navigationState.currentIndex]
  )

  /**
   * Navigate to a new sheet, adding it to history
   */
  const navigateTo = useCallback((sheet: SheetReference) => {
    setNavigationState((prev) => {
      // Don't add duplicate consecutive entries
      if (prev.currentIndex >= 0) {
        const currentSheet = prev.history[prev.currentIndex]
        if (
          currentSheet.documentId === sheet.documentId &&
          currentSheet.pageNumber === sheet.pageNumber
        ) {
          return prev
        }
      }

      // Truncate forward history when navigating to a new sheet
      const newHistory = prev.history.slice(0, prev.currentIndex + 1)

      // Add the new sheet
      newHistory.push(sheet)

      // Enforce maximum history size by removing oldest entries
      while (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift()
      }

      return {
        history: newHistory,
        currentIndex: newHistory.length - 1,
      }
    })
  }, [])

  /**
   * Navigate back in history
   */
  const goBack = useCallback(() => {
    setNavigationState((prev) => {
      if (prev.currentIndex <= 0) {
        return prev
      }

      return {
        ...prev,
        currentIndex: prev.currentIndex - 1,
      }
    })
  }, [])

  /**
   * Navigate forward in history
   */
  const goForward = useCallback(() => {
    setNavigationState((prev) => {
      if (prev.currentIndex >= prev.history.length - 1) {
        return prev
      }

      return {
        ...prev,
        currentIndex: prev.currentIndex + 1,
      }
    })
  }, [])

  /**
   * Get the most recent sheets from history
   * Returns sheets in reverse chronological order (most recent first)
   */
  const getRecentSheets = useCallback(
    (count: number = 10): SheetReference[] => {
      const { history, currentIndex } = navigationState

      // Get unique sheets from history, excluding the current one
      const seen = new Set<string>()
      const recent: SheetReference[] = []

      // Start from the current position and go backwards
      for (let i = currentIndex - 1; i >= 0 && recent.length < count; i--) {
        const sheet = history[i]
        const key = `${sheet.documentId}-${sheet.pageNumber}`

        if (!seen.has(key)) {
          seen.add(key)
          recent.push(sheet)
        }
      }

      return recent
    },
    [navigationState]
  )

  /**
   * Clear the navigation history
   */
  const clearHistory = useCallback(() => {
    setNavigationState(initialHistory)
  }, [])

  /**
   * Get the full history for debugging or display
   */
  const getFullHistory = useCallback(() => {
    return [...navigationState.history]
  }, [navigationState.history])

  /**
   * Get the current position in history
   */
  const getHistoryPosition = useCallback(() => {
    return {
      current: navigationState.currentIndex + 1,
      total: navigationState.history.length,
    }
  }, [navigationState.currentIndex, navigationState.history.length])

  // Keyboard shortcuts: Alt+Left for back, Alt+Right for forward
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Alt+Left (back)
      if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault()
        if (canGoBack) {
          goBack()
        }
      }

      // Check for Alt+Right (forward)
      if (event.altKey && event.key === 'ArrowRight') {
        event.preventDefault()
        if (canGoForward) {
          goForward()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [canGoBack, canGoForward, goBack, goForward])

  return {
    // Navigation actions
    navigateTo,
    goBack,
    goForward,
    clearHistory,

    // Navigation state
    canGoBack,
    canGoForward,
    currentSheet,

    // History utilities
    getRecentSheets,
    getFullHistory,
    getHistoryPosition,

    // Raw state (for advanced use cases)
    historyLength: navigationState.history.length,
    currentIndex: navigationState.currentIndex,
  }
}

/**
 * Type for the return value of useSheetNavigationHistory
 */
export type SheetNavigationHistoryHook = ReturnType<typeof useSheetNavigationHistory>
