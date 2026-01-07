// File: src/components/layout/sidebar/useSidebarState.ts
// Custom hook for sidebar state management with localStorage persistence
// Extracted from CollapsibleSidebarV2 to follow Single Responsibility Principle

import { useState, useEffect, useCallback } from 'react'
import { getStorageItem, setStorageItem, STORAGE_KEYS } from '@/lib/utils/storage'

interface UseSidebarStateOptions {
  /** Default groups to expand on first load */
  defaultExpandedGroups?: string[]
}

interface UseSidebarStateReturn {
  /** Whether sidebar is pinned open */
  isPinned: boolean
  /** Whether mouse is hovering over sidebar */
  isHovered: boolean
  /** Computed expanded state (pinned OR hovered) */
  isExpanded: boolean
  /** Set of currently expanded group IDs */
  expandedGroups: Set<string>
  /** Toggle pin state */
  togglePin: () => void
  /** Toggle a specific group's expansion state */
  toggleGroup: (groupId: string) => void
  /** Set hover state */
  setIsHovered: (hovered: boolean) => void
  /** Mouse enter handler */
  handleMouseEnter: () => void
  /** Mouse leave handler */
  handleMouseLeave: () => void
}

export function useSidebarState(
  options: UseSidebarStateOptions = {}
): UseSidebarStateReturn {
  const { defaultExpandedGroups = ['workflows', 'field'] } = options

  // Initialize pinned state from localStorage
  const [isPinned, setIsPinned] = useState(() =>
    getStorageItem(STORAGE_KEYS.SIDEBAR_V2_PINNED, false)
  )

  // Hover state
  const [isHovered, setIsHovered] = useState(false)

  // Initialize expanded groups from localStorage
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const saved = getStorageItem<string[] | null>(
      STORAGE_KEYS.SIDEBAR_V2_EXPANDED_GROUPS,
      null
    )
    return saved ? new Set(saved) : new Set(defaultExpandedGroups)
  })

  // Computed expanded state
  const isExpanded = isPinned || isHovered

  // Persist pinned state
  useEffect(() => {
    setStorageItem(STORAGE_KEYS.SIDEBAR_V2_PINNED, isPinned)
  }, [isPinned])

  // Persist expanded groups
  useEffect(() => {
    setStorageItem(STORAGE_KEYS.SIDEBAR_V2_EXPANDED_GROUPS, [...expandedGroups])
  }, [expandedGroups])

  // Toggle pin state
  const togglePin = useCallback(() => {
    setIsPinned((prev) => !prev)
  }, [])

  // Toggle group expansion
  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }, [])

  // Mouse handlers
  const handleMouseEnter = useCallback(() => setIsHovered(true), [])
  const handleMouseLeave = useCallback(() => setIsHovered(false), [])

  return {
    isPinned,
    isHovered,
    isExpanded,
    expandedGroups,
    togglePin,
    toggleGroup,
    setIsHovered,
    handleMouseEnter,
    handleMouseLeave,
  }
}
