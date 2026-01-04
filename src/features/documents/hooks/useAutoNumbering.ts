// File: /src/features/documents/hooks/useAutoNumbering.ts
// Hook for auto-numbering clouds and callouts in markup annotations

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import type {
  AutoNumberingConfig,
  AutoNumberingState,
  ExtendedAnnotationType,
  NumberedAnnotation,
} from '../types/markup'

// Default types that support auto-numbering
const DEFAULT_NUMBERABLE_TYPES: ExtendedAnnotationType[] = ['cloud', 'callout']

// Common prefix options for construction markup
export const NUMBERING_PREFIX_OPTIONS = [
  { value: '', label: 'No Prefix' },
  { value: 'RFI-', label: 'RFI-' },
  { value: 'PC-', label: 'PC- (Punch)' },
  { value: 'SI-', label: 'SI- (Site Issue)' },
  { value: 'QC-', label: 'QC- (Quality)' },
  { value: 'CO-', label: 'CO- (Change Order)' },
  { value: 'NC-', label: 'NC- (Non-Conformance)' },
  { value: '#', label: '# (Number Only)' },
] as const

interface UseAutoNumberingOptions {
  documentId: string | undefined
  pageNumber?: number
  initialConfig?: Partial<AutoNumberingConfig>
}

interface UseAutoNumberingReturn {
  // State
  config: AutoNumberingConfig
  currentNumber: number
  isEnabled: boolean

  // Actions
  getNextNumber: () => NumberedAnnotation
  assignNumber: (annotationType: ExtendedAnnotationType) => NumberedAnnotation | null
  resetNumbering: (startNumber?: number) => void
  setPrefix: (prefix: string) => void
  setEnabled: (enabled: boolean) => void
  setResetOnNewPage: (reset: boolean) => void
  setApplicableTypes: (types: ExtendedAnnotationType[]) => void
  setStartNumber: (num: number) => void

  // Utilities
  isTypeNumberable: (type: ExtendedAnnotationType) => boolean
  formatNumber: (num: number) => string
  getNumberingHistory: () => Array<{ number: number; timestamp: string }>
}

export function useAutoNumbering({
  documentId,
  pageNumber = 1,
  initialConfig,
}: UseAutoNumberingOptions): UseAutoNumberingReturn {
  // Persist config per document in localStorage
  const storageKey = documentId ? `markup-autonumber-${documentId}` : null

  const [storedConfig, setStoredConfig] = useLocalStorage<AutoNumberingConfig | null>(
    storageKey || 'markup-autonumber-temp',
    null
  )

  // Initialize config with defaults or stored values
  const [config, setConfig] = useState<AutoNumberingConfig>(() => ({
    prefix: storedConfig?.prefix ?? initialConfig?.prefix ?? '',
    startNumber: storedConfig?.startNumber ?? initialConfig?.startNumber ?? 1,
    enabled: storedConfig?.enabled ?? initialConfig?.enabled ?? true,
    resetOnNewPage: storedConfig?.resetOnNewPage ?? initialConfig?.resetOnNewPage ?? false,
    applicableTypes: storedConfig?.applicableTypes ?? initialConfig?.applicableTypes ?? DEFAULT_NUMBERABLE_TYPES,
  }))

  // Track current number state per page
  const [numberingState, setNumberingState] = useState<Record<number, AutoNumberingState>>({})

  // Track numbering history for undo/reference
  const [numberHistory, setNumberHistory] = useState<Array<{ number: number; timestamp: string; pageNumber: number }>>([])

  // Get current state for this page
  const currentState = useMemo(() => {
    if (!documentId) return null
    return numberingState[pageNumber] || null
  }, [documentId, pageNumber, numberingState])

  // Current number for this page
  const currentNumber = useMemo(() => {
    if (!currentState) return config.startNumber
    return currentState.currentNumber
  }, [currentState, config.startNumber])

  // Initialize state for a new page
  const initializePageState = useCallback((page: number) => {
    if (!documentId) return

    setNumberingState(prev => {
      if (prev[page]) return prev

      // If resetOnNewPage, start from startNumber
      // Otherwise, continue from previous pages
      let startNum = config.startNumber

      if (!config.resetOnNewPage) {
        // Find the highest number from all pages
        const maxFromHistory = numberHistory.reduce((max, entry) =>
          Math.max(max, entry.number), config.startNumber - 1
        )
        startNum = maxFromHistory + 1
      }

      return {
        ...prev,
        [page]: {
          documentId,
          pageNumber: page,
          currentNumber: startNum,
          prefix: config.prefix,
          enabled: config.enabled,
          resetOnNewPage: config.resetOnNewPage,
        },
      }
    })
  }, [documentId, config, numberHistory])

  // Initialize on page change
  useEffect(() => {
    if (documentId) {
      initializePageState(pageNumber)
    }
  }, [documentId, pageNumber, initializePageState])

  // Persist config changes
  useEffect(() => {
    if (storageKey) {
      setStoredConfig(config)
    }
  }, [config, storageKey, setStoredConfig])

  // Get next number without incrementing
  const getNextNumber = useCallback((): NumberedAnnotation => {
    return {
      autoNumber: currentNumber,
      numberPrefix: config.prefix,
      showNumber: true,
    }
  }, [currentNumber, config.prefix])

  // Assign a number to an annotation (increments counter)
  const assignNumber = useCallback((annotationType: ExtendedAnnotationType): NumberedAnnotation | null => {
    // Only assign numbers to applicable types
    if (!config.applicableTypes.includes(annotationType)) {
      return null
    }

    if (!config.enabled) {
      return null
    }

    const assignedNumber = currentNumber

    // Increment the counter
    setNumberingState(prev => ({
      ...prev,
      [pageNumber]: {
        ...prev[pageNumber],
        currentNumber: assignedNumber + 1,
      },
    }))

    // Record in history
    setNumberHistory(prev => [
      ...prev,
      {
        number: assignedNumber,
        timestamp: new Date().toISOString(),
        pageNumber,
      },
    ])

    return {
      autoNumber: assignedNumber,
      numberPrefix: config.prefix,
      showNumber: true,
    }
  }, [config.applicableTypes, config.enabled, config.prefix, currentNumber, pageNumber])

  // Reset numbering to start number or specified number
  const resetNumbering = useCallback((startNumber?: number) => {
    const newStart = startNumber ?? config.startNumber

    if (config.resetOnNewPage) {
      // Reset only current page
      setNumberingState(prev => ({
        ...prev,
        [pageNumber]: {
          ...prev[pageNumber],
          currentNumber: newStart,
        },
      }))
    } else {
      // Reset all pages
      setNumberingState(prev => {
        const updated: Record<number, AutoNumberingState> = {}
        Object.keys(prev).forEach(page => {
          updated[parseInt(page)] = {
            ...prev[parseInt(page)],
            currentNumber: newStart,
          }
        })
        return updated
      })
    }

    // Clear history
    setNumberHistory([])
  }, [config.resetOnNewPage, config.startNumber, pageNumber])

  // Update config functions
  const setPrefix = useCallback((prefix: string) => {
    setConfig(prev => ({ ...prev, prefix }))
  }, [])

  const setEnabled = useCallback((enabled: boolean) => {
    setConfig(prev => ({ ...prev, enabled }))
  }, [])

  const setResetOnNewPage = useCallback((resetOnNewPage: boolean) => {
    setConfig(prev => ({ ...prev, resetOnNewPage }))
  }, [])

  const setApplicableTypes = useCallback((applicableTypes: ExtendedAnnotationType[]) => {
    setConfig(prev => ({ ...prev, applicableTypes }))
  }, [])

  const setStartNumber = useCallback((startNumber: number) => {
    setConfig(prev => ({ ...prev, startNumber }))
    // Also update current state if we haven't assigned any numbers yet
    if (numberHistory.length === 0) {
      setNumberingState(prev => ({
        ...prev,
        [pageNumber]: {
          ...prev[pageNumber],
          currentNumber: startNumber,
        },
      }))
    }
  }, [numberHistory.length, pageNumber])

  // Check if a type supports auto-numbering
  const isTypeNumberable = useCallback((type: ExtendedAnnotationType): boolean => {
    return config.applicableTypes.includes(type)
  }, [config.applicableTypes])

  // Format number with prefix
  const formatNumber = useCallback((num: number): string => {
    return `${config.prefix}${num}`
  }, [config.prefix])

  // Get numbering history for current document
  const getNumberingHistory = useCallback(() => {
    return numberHistory.map(({ number, timestamp }) => ({ number, timestamp }))
  }, [numberHistory])

  return {
    config,
    currentNumber,
    isEnabled: config.enabled,
    getNextNumber,
    assignNumber,
    resetNumbering,
    setPrefix,
    setEnabled,
    setResetOnNewPage,
    setApplicableTypes,
    setStartNumber,
    isTypeNumberable,
    formatNumber,
    getNumberingHistory,
  }
}

export default useAutoNumbering
