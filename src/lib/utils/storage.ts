// File: src/lib/utils/storage.ts
// Type-safe localStorage wrapper with error handling
// Handles restricted contexts (private browsing, storage disabled)

/**
 * Storage keys used throughout the application
 * Centralizes key management to prevent typos and enable easy refactoring
 */
export const STORAGE_KEYS = {
  SIDEBAR_V2_PINNED: 'sidebar-v2-pinned',
  SIDEBAR_V2_EXPANDED_GROUPS: 'sidebar-v2-expanded-groups',
  NAVIGATION_LAYOUT: 'navigation-layout',
  THEME: 'theme',
  LAST_PROJECT_ID: 'last-project-id',
  GLOVE_MODE: 'glove-mode',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

/**
 * Check if localStorage is available in the current context
 */
function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__'
    localStorage.setItem(testKey, testKey)
    localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

const storageAvailable = isLocalStorageAvailable()

/**
 * Type-safe localStorage getter with fallback
 * Handles JSON parsing and storage unavailability gracefully
 */
export function getStorageItem<T>(key: StorageKey | string, fallback: T): T {
  if (!storageAvailable) {
    return fallback
  }

  try {
    const item = localStorage.getItem(key)
    if (item === null) {
      return fallback
    }

    // Handle primitive types stored as-is
    if (typeof fallback === 'boolean') {
      return (item === 'true') as T
    }
    if (typeof fallback === 'number') {
      const num = parseFloat(item)
      return (isNaN(num) ? fallback : num) as T
    }
    if (typeof fallback === 'string') {
      return item as T
    }

    // Parse JSON for complex types
    return JSON.parse(item) as T
  } catch {
    console.warn(`[storage] Failed to read key "${key}", using fallback`)
    return fallback
  }
}

/**
 * Type-safe localStorage setter
 * Handles JSON stringification and storage unavailability gracefully
 */
export function setStorageItem<T>(key: StorageKey | string, value: T): boolean {
  if (!storageAvailable) {
    return false
  }

  try {
    const stringValue = typeof value === 'object'
      ? JSON.stringify(value)
      : String(value)

    localStorage.setItem(key, stringValue)
    return true
  } catch (error) {
    // Storage might be full or restricted
    console.warn(`[storage] Failed to write key "${key}"`, error)
    return false
  }
}

/**
 * Remove an item from localStorage
 */
export function removeStorageItem(key: StorageKey | string): boolean {
  if (!storageAvailable) {
    return false
  }

  try {
    localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

/**
 * Clear all application storage (use with caution)
 */
export function clearAllStorage(): boolean {
  if (!storageAvailable) {
    return false
  }

  try {
    // Only clear our known keys, not all localStorage
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key)
    })
    return true
  } catch {
    return false
  }
}
