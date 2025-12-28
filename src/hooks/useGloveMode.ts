// File: src/hooks/useGloveMode.ts
// Hook for managing glove mode (enhanced touch targets for field workers)

import { useCallback, useEffect, useState } from 'react'

const GLOVE_MODE_KEY = 'field-mgmt-glove-mode'

/**
 * Hook for managing glove mode state
 * Persists to localStorage and applies the 'glove-mode' class to the html element
 *
 * @example
 * ```tsx
 * const { isGloveModeEnabled, toggleGloveMode, enableGloveMode, disableGloveMode } = useGloveMode()
 *
 * return (
 *   <button onClick={toggleGloveMode}>
 *     {isGloveModeEnabled ? 'Disable' : 'Enable'} Glove Mode
 *   </button>
 * )
 * ```
 */
export function useGloveMode() {
  const [isGloveModeEnabled, setIsGloveModeEnabled] = useState(() => {
    // Check localStorage on initial render
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(GLOVE_MODE_KEY)
      return stored === 'true'
    }
    return false
  })

  // Apply or remove the glove-mode class on the html element
  useEffect(() => {
    const htmlElement = document.documentElement

    if (isGloveModeEnabled) {
      htmlElement.classList.add('glove-mode')
    } else {
      htmlElement.classList.remove('glove-mode')
    }

    // Persist to localStorage
    localStorage.setItem(GLOVE_MODE_KEY, String(isGloveModeEnabled))
  }, [isGloveModeEnabled])

  const enableGloveMode = useCallback(() => {
    setIsGloveModeEnabled(true)
  }, [])

  const disableGloveMode = useCallback(() => {
    setIsGloveModeEnabled(false)
  }, [])

  const toggleGloveMode = useCallback(() => {
    setIsGloveModeEnabled((prev) => !prev)
  }, [])

  return {
    isGloveModeEnabled,
    enableGloveMode,
    disableGloveMode,
    toggleGloveMode,
  }
}

export default useGloveMode
