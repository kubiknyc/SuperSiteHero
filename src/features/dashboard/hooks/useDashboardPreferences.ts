/**
 * Dashboard Preferences Hook
 * Manages user's dashboard widget preferences (visibility, order, etc.)
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import { supabase } from '@/lib/supabase'

// ============================================================================
// Types
// ============================================================================

export type WidgetId =
  | 'tasks_pending'
  | 'open_rfis'
  | 'punch_items'
  | 'safety_days'
  | 'active_projects'
  | 'action_required'
  | 'notices'
  | 'weather'
  | 'quick_actions'
  | 'recent_activity'
  | 'upcoming_deadlines'

export interface WidgetConfig {
  id: WidgetId
  visible: boolean
  order: number
  size: 'small' | 'medium' | 'large'
  settings?: Record<string, any>
}

export interface DashboardPreferences {
  theme: 'compact' | 'comfortable' | 'spacious'
  refreshInterval: number // in seconds, 0 = manual only
  showSparklines: boolean
  showTrends: boolean
  defaultProjectId: string | null
  widgets: WidgetConfig[]
}

export const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'tasks_pending', visible: true, order: 0, size: 'medium' },
  { id: 'open_rfis', visible: true, order: 1, size: 'medium' },
  { id: 'punch_items', visible: true, order: 2, size: 'medium' },
  { id: 'safety_days', visible: true, order: 3, size: 'medium' },
  { id: 'active_projects', visible: true, order: 4, size: 'large' },
  { id: 'action_required', visible: true, order: 5, size: 'medium' },
  { id: 'notices', visible: true, order: 6, size: 'medium' },
  { id: 'quick_actions', visible: false, order: 7, size: 'small' },
  { id: 'recent_activity', visible: false, order: 8, size: 'medium' },
  { id: 'upcoming_deadlines', visible: false, order: 9, size: 'medium' },
]

export const DEFAULT_PREFERENCES: DashboardPreferences = {
  theme: 'comfortable',
  refreshInterval: 60,
  showSparklines: true,
  showTrends: true,
  defaultProjectId: null,
  widgets: DEFAULT_WIDGETS,
}

export const WIDGET_LABELS: Record<WidgetId, { name: string; description: string }> = {
  tasks_pending: {
    name: 'Tasks Pending',
    description: 'Shows pending and in-progress task count',
  },
  open_rfis: {
    name: 'Open RFIs',
    description: 'Shows open RFI count with overdue indicator',
  },
  punch_items: {
    name: 'Punch Items',
    description: 'Shows open punch item count',
  },
  safety_days: {
    name: 'Safety Days',
    description: 'Shows days since last incident',
  },
  active_projects: {
    name: 'Active Projects',
    description: 'List of active projects with progress',
  },
  action_required: {
    name: 'Action Required',
    description: 'Items needing your attention',
  },
  notices: {
    name: 'Notices',
    description: 'Recent project notices and announcements',
  },
  weather: {
    name: 'Weather',
    description: 'Current weather for project location',
  },
  quick_actions: {
    name: 'Quick Actions',
    description: 'Shortcuts to common actions',
  },
  recent_activity: {
    name: 'Recent Activity',
    description: 'Latest updates across all projects',
  },
  upcoming_deadlines: {
    name: 'Upcoming Deadlines',
    description: 'Tasks and items due soon',
  },
}

// ============================================================================
// Local Storage Key
// ============================================================================

const PREFERENCES_KEY = 'jobsight-dashboard-preferences'

// ============================================================================
// Hook Implementation
// ============================================================================

export function useDashboardPreferences() {
  const { userProfile } = useAuth()
  const [preferences, setPreferences] = useState<DashboardPreferences>(DEFAULT_PREFERENCES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      setLoading(true)
      try {
        // Try to load from server first
        if (userProfile?.id) {
          const { data, error } = await supabase
            .from('user_preferences')
            .select('dashboard_preferences')
            .eq('user_id', userProfile.id)
            .single()

          if (!error && data?.dashboard_preferences) {
            setPreferences({
              ...DEFAULT_PREFERENCES,
              ...data.dashboard_preferences,
              widgets: mergeWidgets(data.dashboard_preferences.widgets || []),
            })
            setLoading(false)
            return
          }
        }

        // Fall back to localStorage
        const stored = localStorage.getItem(PREFERENCES_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          setPreferences({
            ...DEFAULT_PREFERENCES,
            ...parsed,
            widgets: mergeWidgets(parsed.widgets || []),
          })
        }
      } catch (error) {
        console.error('Failed to load dashboard preferences:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPreferences()
  }, [userProfile?.id])

  // Merge user widgets with defaults (ensures new widgets are included)
  const mergeWidgets = (userWidgets: WidgetConfig[]): WidgetConfig[] => {
    const merged: WidgetConfig[] = []
    const userWidgetMap = new Map(userWidgets.map((w) => [w.id, w]))

    // Start with default widgets, applying user overrides
    DEFAULT_WIDGETS.forEach((defaultWidget) => {
      const userWidget = userWidgetMap.get(defaultWidget.id)
      if (userWidget) {
        merged.push({ ...defaultWidget, ...userWidget })
      } else {
        merged.push(defaultWidget)
      }
    })

    // Sort by order
    return merged.sort((a, b) => a.order - b.order)
  }

  // Save preferences
  const savePreferences = useCallback(
    async (newPreferences: Partial<DashboardPreferences>) => {
      setSaving(true)
      const updated = { ...preferences, ...newPreferences }
      setPreferences(updated)

      try {
        // Save to localStorage immediately
        localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated))

        // Save to server if logged in
        if (userProfile?.id) {
          await supabase
            .from('user_preferences')
            .upsert(
              {
                user_id: userProfile.id,
                dashboard_preferences: updated,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' }
            )
        }
      } catch (error) {
        console.error('Failed to save dashboard preferences:', error)
      } finally {
        setSaving(false)
      }
    },
    [preferences, userProfile?.id]
  )

  // Toggle widget visibility
  const toggleWidget = useCallback(
    (widgetId: WidgetId) => {
      const widgets = preferences.widgets.map((w) =>
        w.id === widgetId ? { ...w, visible: !w.visible } : w
      )
      savePreferences({ widgets })
    },
    [preferences.widgets, savePreferences]
  )

  // Reorder widgets
  const reorderWidgets = useCallback(
    (sourceIndex: number, destinationIndex: number) => {
      const widgets = [...preferences.widgets]
      const [removed] = widgets.splice(sourceIndex, 1)
      widgets.splice(destinationIndex, 0, removed)

      // Update order values
      const reordered = widgets.map((w, i) => ({ ...w, order: i }))
      savePreferences({ widgets: reordered })
    },
    [preferences.widgets, savePreferences]
  )

  // Update widget settings
  const updateWidget = useCallback(
    (widgetId: WidgetId, updates: Partial<WidgetConfig>) => {
      const widgets = preferences.widgets.map((w) =>
        w.id === widgetId ? { ...w, ...updates } : w
      )
      savePreferences({ widgets })
    },
    [preferences.widgets, savePreferences]
  )

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    savePreferences(DEFAULT_PREFERENCES)
  }, [savePreferences])

  // Get visible widgets sorted by order
  const visibleWidgets = preferences.widgets
    .filter((w) => w.visible)
    .sort((a, b) => a.order - b.order)

  return {
    preferences,
    loading,
    saving,
    savePreferences,
    toggleWidget,
    reorderWidgets,
    updateWidget,
    resetToDefaults,
    visibleWidgets,
  }
}

export default useDashboardPreferences
