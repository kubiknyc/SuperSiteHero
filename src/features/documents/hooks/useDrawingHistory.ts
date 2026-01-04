// File: /src/features/documents/hooks/useDrawingHistory.ts
// Hook for managing undo/redo history for drawing operations

import { useCallback, useRef, useState } from 'react'

// ============================================================================
// Types
// ============================================================================

export type DrawingAction = {
  id: string
  type: 'add' | 'remove' | 'modify' | 'batch'
  timestamp: number
  data: any
  previousData?: any
}

export interface UseDrawingHistoryOptions {
  /** Maximum number of actions to keep in history */
  maxHistorySize?: number
  /** Callback when history changes */
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void
}

export interface UseDrawingHistoryReturn {
  /** Whether undo is available */
  canUndo: boolean
  /** Whether redo is available */
  canRedo: boolean
  /** Current history index */
  historyIndex: number
  /** Total history length */
  historyLength: number
  /** Push a new action to history */
  pushAction: (action: Omit<DrawingAction, 'id' | 'timestamp'>) => void
  /** Undo the last action */
  undo: () => DrawingAction | null
  /** Redo the next action */
  redo: () => DrawingAction | null
  /** Clear all history */
  clearHistory: () => void
  /** Get the current action */
  getCurrentAction: () => DrawingAction | null
  /** Get action at specific index */
  getActionAt: (index: number) => DrawingAction | null
  /** Batch multiple actions into one undo step */
  startBatch: () => void
  /** End batch and commit */
  endBatch: () => void
  /** Whether currently in batch mode */
  isBatching: boolean
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useDrawingHistory({
  maxHistorySize = 50,
  onHistoryChange,
}: UseDrawingHistoryOptions = {}): UseDrawingHistoryReturn {
  const [history, setHistory] = useState<DrawingAction[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isBatching, setIsBatching] = useState(false)
  const batchActionsRef = useRef<DrawingAction[]>([])
  const idCounter = useRef(0)

  const generateId = useCallback(() => {
    idCounter.current += 1
    return `action-${idCounter.current}-${Date.now()}`
  }, [])

  const canUndo = historyIndex >= 0
  const canRedo = historyIndex < history.length - 1

  // Notify parent of history changes
  const notifyChange = useCallback(
    (newCanUndo: boolean, newCanRedo: boolean) => {
      onHistoryChange?.(newCanUndo, newCanRedo)
    },
    [onHistoryChange]
  )

  const pushAction = useCallback(
    (actionData: Omit<DrawingAction, 'id' | 'timestamp'>) => {
      const action: DrawingAction = {
        ...actionData,
        id: generateId(),
        timestamp: Date.now(),
      }

      if (isBatching) {
        batchActionsRef.current.push(action)
        return
      }

      setHistory((prev) => {
        // Remove any actions after current index (discard redo stack)
        const newHistory = prev.slice(0, historyIndex + 1)
        newHistory.push(action)

        // Enforce max size
        if (newHistory.length > maxHistorySize) {
          newHistory.shift()
        }

        return newHistory
      })

      setHistoryIndex((prev) => {
        const newIndex = Math.min(prev + 1, maxHistorySize - 1)
        notifyChange(newIndex >= 0, false)
        return newIndex
      })
    },
    [generateId, historyIndex, isBatching, maxHistorySize, notifyChange]
  )

  const undo = useCallback((): DrawingAction | null => {
    if (!canUndo) return null

    const action = history[historyIndex]
    setHistoryIndex((prev) => {
      const newIndex = prev - 1
      notifyChange(newIndex >= 0, true)
      return newIndex
    })

    return action
  }, [canUndo, history, historyIndex, notifyChange])

  const redo = useCallback((): DrawingAction | null => {
    if (!canRedo) return null

    const nextIndex = historyIndex + 1
    const action = history[nextIndex]
    setHistoryIndex(() => {
      notifyChange(true, nextIndex < history.length - 1)
      return nextIndex
    })

    return action
  }, [canRedo, history, historyIndex, notifyChange])

  const clearHistory = useCallback(() => {
    setHistory([])
    setHistoryIndex(-1)
    batchActionsRef.current = []
    setIsBatching(false)
    notifyChange(false, false)
  }, [notifyChange])

  const getCurrentAction = useCallback((): DrawingAction | null => {
    if (historyIndex < 0 || historyIndex >= history.length) return null
    return history[historyIndex]
  }, [history, historyIndex])

  const getActionAt = useCallback(
    (index: number): DrawingAction | null => {
      if (index < 0 || index >= history.length) return null
      return history[index]
    },
    [history]
  )

  const startBatch = useCallback(() => {
    setIsBatching(true)
    batchActionsRef.current = []
  }, [])

  const endBatch = useCallback(() => {
    if (!isBatching || batchActionsRef.current.length === 0) {
      setIsBatching(false)
      batchActionsRef.current = []
      return
    }

    const batchAction: DrawingAction = {
      id: generateId(),
      type: 'batch',
      timestamp: Date.now(),
      data: batchActionsRef.current,
    }

    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(batchAction)

      if (newHistory.length > maxHistorySize) {
        newHistory.shift()
      }

      return newHistory
    })

    setHistoryIndex((prev) => {
      const newIndex = Math.min(prev + 1, maxHistorySize - 1)
      notifyChange(newIndex >= 0, false)
      return newIndex
    })

    setIsBatching(false)
    batchActionsRef.current = []
  }, [generateId, historyIndex, isBatching, maxHistorySize, notifyChange])

  return {
    canUndo,
    canRedo,
    historyIndex,
    historyLength: history.length,
    pushAction,
    undo,
    redo,
    clearHistory,
    getCurrentAction,
    getActionAt,
    startBatch,
    endBatch,
    isBatching,
  }
}

// ============================================================================
// Keyboard shortcut hook for undo/redo
// ============================================================================

export interface UseDrawingKeyboardShortcutsOptions {
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  enabled?: boolean
}

export function useDrawingKeyboardShortcuts({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  enabled = true,
}: UseDrawingKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return

      // Check for Ctrl/Cmd + Z (Undo)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if (canUndo) {
          e.preventDefault()
          onUndo()
        }
      }

      // Check for Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y (Redo)
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') ||
        ((e.ctrlKey || e.metaKey) && e.key === 'y')
      ) {
        if (canRedo) {
          e.preventDefault()
          onRedo()
        }
      }
    },
    [enabled, canUndo, canRedo, onUndo, onRedo]
  )

  // Attach/detach event listener
  useState(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  })
}

// ============================================================================
// Drawing state manager (combines history with current state)
// ============================================================================

export interface DrawingElement {
  id: string
  type: string
  data: any
}

export interface UseDrawingStateOptions {
  initialElements?: DrawingElement[]
  maxHistorySize?: number
}

export interface UseDrawingStateReturn {
  elements: DrawingElement[]
  addElement: (element: Omit<DrawingElement, 'id'>) => string
  updateElement: (id: string, data: Partial<DrawingElement['data']>) => void
  removeElement: (id: string) => void
  removeElements: (ids: string[]) => void
  clearElements: () => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  clearHistory: () => void
}

export function useDrawingState({
  initialElements = [],
  maxHistorySize = 50,
}: UseDrawingStateOptions = {}): UseDrawingStateReturn {
  const [elements, setElements] = useState<DrawingElement[]>(initialElements)
  const elementIdCounter = useRef(0)

  const {
    canUndo,
    canRedo,
    pushAction,
    undo: historyUndo,
    redo: historyRedo,
    clearHistory,
  } = useDrawingHistory({ maxHistorySize })

  const generateElementId = useCallback(() => {
    elementIdCounter.current += 1
    return `element-${elementIdCounter.current}`
  }, [])

  const addElement = useCallback(
    (element: Omit<DrawingElement, 'id'>): string => {
      const id = generateElementId()
      const newElement = { ...element, id }

      setElements((prev) => [...prev, newElement])
      pushAction({
        type: 'add',
        data: newElement,
      })

      return id
    },
    [generateElementId, pushAction]
  )

  const updateElement = useCallback(
    (id: string, data: Partial<DrawingElement['data']>) => {
      setElements((prev) => {
        const index = prev.findIndex((el) => el.id === id)
        if (index === -1) return prev

        const previousElement = prev[index]
        const updatedElement = {
          ...previousElement,
          data: { ...previousElement.data, ...data },
        }

        pushAction({
          type: 'modify',
          data: updatedElement,
          previousData: previousElement,
        })

        const newElements = [...prev]
        newElements[index] = updatedElement
        return newElements
      })
    },
    [pushAction]
  )

  const removeElement = useCallback(
    (id: string) => {
      setElements((prev) => {
        const element = prev.find((el) => el.id === id)
        if (!element) return prev

        pushAction({
          type: 'remove',
          data: element,
        })

        return prev.filter((el) => el.id !== id)
      })
    },
    [pushAction]
  )

  const removeElements = useCallback(
    (ids: string[]) => {
      setElements((prev) => {
        const removedElements = prev.filter((el) => ids.includes(el.id))
        if (removedElements.length === 0) return prev

        pushAction({
          type: 'batch',
          data: removedElements.map((el) => ({ type: 'remove', data: el })),
        })

        return prev.filter((el) => !ids.includes(el.id))
      })
    },
    [pushAction]
  )

  const clearElements = useCallback(() => {
    setElements((prev) => {
      if (prev.length === 0) return prev

      pushAction({
        type: 'batch',
        data: prev.map((el) => ({ type: 'remove', data: el })),
      })

      return []
    })
  }, [pushAction])

  const undo = useCallback(() => {
    const action = historyUndo()
    if (!action) return

    setElements((prev) => {
      switch (action.type) {
        case 'add':
          return prev.filter((el) => el.id !== action.data.id)
        case 'remove':
          return [...prev, action.data]
        case 'modify':
          return prev.map((el) =>
            el.id === action.previousData.id ? action.previousData : el
          )
        case 'batch':
          // Reverse batch operations
          let result = prev
          const batchActions = action.data as DrawingAction[]
          for (let i = batchActions.length - 1; i >= 0; i--) {
            const batchAction = batchActions[i]
            if (batchAction.type === 'add') {
              result = result.filter((el) => el.id !== batchAction.data.id)
            } else if (batchAction.type === 'remove') {
              result = [...result, batchAction.data]
            }
          }
          return result
        default:
          return prev
      }
    })
  }, [historyUndo])

  const redo = useCallback(() => {
    const action = historyRedo()
    if (!action) return

    setElements((prev) => {
      switch (action.type) {
        case 'add':
          return [...prev, action.data]
        case 'remove':
          return prev.filter((el) => el.id !== action.data.id)
        case 'modify':
          return prev.map((el) =>
            el.id === action.data.id ? action.data : el
          )
        case 'batch':
          let result = prev
          const batchActions = action.data as DrawingAction[]
          for (const batchAction of batchActions) {
            if (batchAction.type === 'add') {
              result = [...result, batchAction.data]
            } else if (batchAction.type === 'remove') {
              result = result.filter((el) => el.id !== batchAction.data.id)
            }
          }
          return result
        default:
          return prev
      }
    })
  }, [historyRedo])

  return {
    elements,
    addElement,
    updateElement,
    removeElement,
    removeElements,
    clearElements,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
  }
}
