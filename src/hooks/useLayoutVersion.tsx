// File: /src/hooks/useLayoutVersion.ts
// Feature flag hook for toggling between layout versions

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react'

type LayoutVersion = 'v1' | 'v2'

interface LayoutVersionContextType {
  layoutVersion: LayoutVersion
  setLayoutVersion: (version: LayoutVersion) => void
  toggleLayoutVersion: () => void
  isV2: boolean
}

const LayoutVersionContext = createContext<LayoutVersionContextType | null>(null)

const STORAGE_KEY = 'jobsight-layout-version'

export function LayoutVersionProvider({ children }: { children: ReactNode }) {
  const [layoutVersion, setLayoutVersionState] = useState<LayoutVersion>(() => {
    // Check URL param first (for easy testing)
    const urlParams = new URLSearchParams(window.location.search)
    const urlVersion = urlParams.get('layout')
    if (urlVersion === 'v1' || urlVersion === 'v2') {
      return urlVersion
    }

    // Check localStorage
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'v1' || saved === 'v2') {
      return saved
    }

    // Default to v2 (new layout)
    return 'v2'
  })

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, layoutVersion)
  }, [layoutVersion])

  const setLayoutVersion = useCallback((version: LayoutVersion) => {
    setLayoutVersionState(version)
  }, [])

  const toggleLayoutVersion = useCallback(() => {
    setLayoutVersionState((prev) => (prev === 'v1' ? 'v2' : 'v1'))
  }, [])

  const value: LayoutVersionContextType = {
    layoutVersion,
    setLayoutVersion,
    toggleLayoutVersion,
    isV2: layoutVersion === 'v2',
  }

  return (
    <LayoutVersionContext.Provider value={value}>
      {children}
    </LayoutVersionContext.Provider>
  )
}

export function useLayoutVersion(): LayoutVersionContextType {
  const context = useContext(LayoutVersionContext)
  if (!context) {
    // Return default values if provider not found (for backwards compatibility)
    return {
      layoutVersion: 'v2',
      setLayoutVersion: () => {},
      toggleLayoutVersion: () => {},
      isV2: true,
    }
  }
  return context
}

// Simple hook for components that just need to know the version
export function useIsV2Layout(): boolean {
  const { isV2 } = useLayoutVersion()
  return isV2
}
