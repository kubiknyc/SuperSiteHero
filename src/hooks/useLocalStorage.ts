// File: /src/hooks/useLocalStorage.ts
// Hook for persisting state in localStorage with type safety

import { useState, useEffect, useCallback } from 'react'

/**
 * Hook to persist state in localStorage
 * @param key - The localStorage key
 * @param initialValue - The initial value if nothing is stored
 * @returns [storedValue, setValue] tuple similar to useState
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }

    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        // Allow value to be a function so we have same API as useState
        const valueToStore =
          value instanceof Function ? value(storedValue) : value

        // Save state
        setStoredValue(valueToStore)

        // Save to localStorage
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore))
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error)
      }
    },
    [key, storedValue]
  )

  // Listen for changes from other tabs/windows
  useEffect(() => {
    if (typeof window === 'undefined') {return}

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          setStoredValue(JSON.parse(event.newValue))
        } catch (error) {
          console.warn(`Error parsing localStorage change for key "${key}":`, error)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [key])

  return [storedValue, setValue]
}

/**
 * Hook to remove a value from localStorage
 * @param key - The localStorage key to remove
 */
export function useRemoveFromLocalStorage(key: string): () => void {
  return useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key)
    }
  }, [key])
}

/**
 * Hook to check if a key exists in localStorage
 * @param key - The localStorage key to check
 */
export function useLocalStorageExists(key: string): boolean {
  const [exists, setExists] = useState<boolean>(() => {
    if (typeof window === 'undefined') {return false}
    return window.localStorage.getItem(key) !== null
  })

  useEffect(() => {
    if (typeof window === 'undefined') {return}

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key) {
        setExists(event.newValue !== null)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [key])

  return exists
}

export default useLocalStorage
