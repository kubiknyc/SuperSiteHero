/**
 * Recent Items Store
 *
 * Zustand store for tracking recently viewed items (projects, reports, documents, etc.)
 * Persists to localStorage for cross-session continuity.
 *
 * Usage:
 * ```tsx
 * // Track a viewed item
 * const { trackItem } = useRecentItemsStore()
 * trackItem({ type: 'project', id: '123', title: 'Downtown Tower', href: '/projects/123' })
 *
 * // Get recent items
 * const { items, getItemsByType } = useRecentItemsStore()
 * const recentProjects = getItemsByType('project')
 * ```
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * Types of items that can be tracked
 */
export type RecentItemType =
  | 'project'
  | 'daily-report'
  | 'document'
  | 'task'
  | 'rfi'
  | 'submittal'
  | 'change-order'
  | 'punch-item'
  | 'inspection'
  | 'safety-incident'
  | 'meeting'
  | 'contact'

/**
 * A recently viewed item
 */
export interface RecentItem {
  /** Unique identifier (usually the item's ID) */
  id: string
  /** Type of item */
  type: RecentItemType
  /** Display title */
  title: string
  /** Optional subtitle (e.g., project name for a report) */
  subtitle?: string
  /** Navigation href */
  href: string
  /** When the item was last viewed */
  viewedAt: number
  /** Optional icon name (lucide icon) */
  icon?: string
  /** Optional metadata */
  metadata?: Record<string, unknown>
}

interface RecentItemsState {
  /** All recent items, sorted by viewedAt (most recent first) */
  items: RecentItem[]
  /** Maximum number of items to keep */
  maxItems: number

  /**
   * Track a viewed item - adds to recent items or updates existing
   */
  trackItem: (item: Omit<RecentItem, 'viewedAt'>) => void

  /**
   * Remove an item from recent items
   */
  removeItem: (id: string, type: RecentItemType) => void

  /**
   * Clear all recent items
   */
  clearAll: () => void

  /**
   * Clear items of a specific type
   */
  clearByType: (type: RecentItemType) => void

  /**
   * Get items filtered by type
   */
  getItemsByType: (type: RecentItemType, limit?: number) => RecentItem[]

  /**
   * Get the most recent items (across all types)
   */
  getRecentItems: (limit?: number) => RecentItem[]

  /**
   * Check if an item exists in recent items
   */
  hasItem: (id: string, type: RecentItemType) => boolean

  /**
   * Set the maximum number of items to keep
   */
  setMaxItems: (max: number) => void
}

export const useRecentItemsStore = create<RecentItemsState>()(
  persist(
    (set, get) => ({
      items: [],
      maxItems: 50, // Keep up to 50 items total

      trackItem: (item) => {
        set((state) => {
          const now = Date.now()
          const existingIndex = state.items.findIndex(
            (i) => i.id === item.id && i.type === item.type
          )

          let newItems: RecentItem[]

          if (existingIndex >= 0) {
            // Update existing item and move to front
            const updated: RecentItem = {
              ...state.items[existingIndex],
              ...item,
              viewedAt: now,
            }
            newItems = [
              updated,
              ...state.items.slice(0, existingIndex),
              ...state.items.slice(existingIndex + 1),
            ]
          } else {
            // Add new item to front
            const newItem: RecentItem = {
              ...item,
              viewedAt: now,
            }
            newItems = [newItem, ...state.items]
          }

          // Trim to maxItems
          if (newItems.length > state.maxItems) {
            newItems = newItems.slice(0, state.maxItems)
          }

          return { items: newItems }
        })
      },

      removeItem: (id, type) => {
        set((state) => ({
          items: state.items.filter((i) => !(i.id === id && i.type === type)),
        }))
      },

      clearAll: () => {
        set({ items: [] })
      },

      clearByType: (type) => {
        set((state) => ({
          items: state.items.filter((i) => i.type !== type),
        }))
      },

      getItemsByType: (type, limit = 10) => {
        return get()
          .items.filter((i) => i.type === type)
          .slice(0, limit)
      },

      getRecentItems: (limit = 10) => {
        return get().items.slice(0, limit)
      },

      hasItem: (id, type) => {
        return get().items.some((i) => i.id === id && i.type === type)
      },

      setMaxItems: (max) => {
        set((state) => {
          const newItems =
            state.items.length > max ? state.items.slice(0, max) : state.items
          return { maxItems: max, items: newItems }
        })
      },
    }),
    {
      name: 'jobsight-recent-items',
      storage: createJSONStorage(() => localStorage),
      // Only persist items and maxItems
      partialize: (state) => ({
        items: state.items,
        maxItems: state.maxItems,
      }),
    }
  )
)

/**
 * Hook to track page views automatically
 *
 * Usage:
 * ```tsx
 * function ProjectDetailPage({ projectId }) {
 *   const { project } = useProject(projectId)
 *
 *   useTrackRecentItem({
 *     type: 'project',
 *     id: projectId,
 *     title: project?.name || 'Loading...',
 *     href: `/projects/${projectId}`,
 *   }, [project?.name]) // Re-track when title changes
 *
 *   return <div>...</div>
 * }
 * ```
 */
import { useEffect } from 'react'

export function useTrackRecentItem(
  item: Omit<RecentItem, 'viewedAt'> | null,
  deps: unknown[] = []
) {
  const trackItem = useRecentItemsStore((state) => state.trackItem)

  useEffect(() => {
    if (item && item.title && item.title !== 'Loading...') {
      trackItem(item)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, item?.type, ...deps])
}

/**
 * Get icon name for item type
 */
export function getIconForType(type: RecentItemType): string {
  const icons: Record<RecentItemType, string> = {
    'project': 'FolderKanban',
    'daily-report': 'FileText',
    'document': 'File',
    'task': 'CheckSquare',
    'rfi': 'HelpCircle',
    'submittal': 'Send',
    'change-order': 'FileEdit',
    'punch-item': 'AlertCircle',
    'inspection': 'ClipboardCheck',
    'safety-incident': 'ShieldAlert',
    'meeting': 'Calendar',
    'contact': 'User',
  }
  return icons[type] || 'File'
}

/**
 * Get human-readable label for item type
 */
export function getLabelForType(type: RecentItemType): string {
  const labels: Record<RecentItemType, string> = {
    'project': 'Project',
    'daily-report': 'Daily Report',
    'document': 'Document',
    'task': 'Task',
    'rfi': 'RFI',
    'submittal': 'Submittal',
    'change-order': 'Change Order',
    'punch-item': 'Punch Item',
    'inspection': 'Inspection',
    'safety-incident': 'Safety Incident',
    'meeting': 'Meeting',
    'contact': 'Contact',
  }
  return labels[type] || type
}
