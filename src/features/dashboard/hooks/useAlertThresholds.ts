/**
 * Alert Thresholds Hook
 * Manages configurable alert thresholds for dashboard warnings
 * E.g., warn when RFIs > 7 days old, punch items overdue, etc.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import { supabase } from '@/lib/supabase'

// ============================================================================
// Types
// ============================================================================

export interface AlertThreshold {
  id: string
  name: string
  description: string
  category: 'rfi' | 'submittal' | 'task' | 'punch_item' | 'change_order' | 'safety'
  metric: string
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq'
  value: number
  unit: 'days' | 'count' | 'percentage' | 'currency'
  severity: 'info' | 'warning' | 'critical'
  enabled: boolean
  notifyEmail: boolean
  notifyInApp: boolean
}

export interface AlertThresholdConfig {
  thresholds: AlertThreshold[]
  lastUpdated: string | null
}

export interface TriggeredAlert {
  threshold: AlertThreshold
  currentValue: number
  message: string
  itemIds?: string[]
}

// Default thresholds
export const DEFAULT_THRESHOLDS: AlertThreshold[] = [
  {
    id: 'rfi_overdue_7',
    name: 'RFIs Over 7 Days',
    description: 'Alert when RFIs are open for more than 7 days',
    category: 'rfi',
    metric: 'days_open',
    operator: 'gt',
    value: 7,
    unit: 'days',
    severity: 'warning',
    enabled: true,
    notifyEmail: false,
    notifyInApp: true,
  },
  {
    id: 'rfi_overdue_14',
    name: 'RFIs Over 14 Days',
    description: 'Critical alert when RFIs are open for more than 14 days',
    category: 'rfi',
    metric: 'days_open',
    operator: 'gt',
    value: 14,
    unit: 'days',
    severity: 'critical',
    enabled: true,
    notifyEmail: true,
    notifyInApp: true,
  },
  {
    id: 'submittal_overdue',
    name: 'Overdue Submittals',
    description: 'Alert when submittals are past their required date',
    category: 'submittal',
    metric: 'days_overdue',
    operator: 'gt',
    value: 0,
    unit: 'days',
    severity: 'warning',
    enabled: true,
    notifyEmail: false,
    notifyInApp: true,
  },
  {
    id: 'submittal_critical',
    name: 'Submittals 7+ Days Overdue',
    description: 'Critical alert when submittals are 7+ days overdue',
    category: 'submittal',
    metric: 'days_overdue',
    operator: 'gt',
    value: 7,
    unit: 'days',
    severity: 'critical',
    enabled: true,
    notifyEmail: true,
    notifyInApp: true,
  },
  {
    id: 'punch_item_overdue',
    name: 'Overdue Punch Items',
    description: 'Alert when punch items are past their due date',
    category: 'punch_item',
    metric: 'days_overdue',
    operator: 'gt',
    value: 0,
    unit: 'days',
    severity: 'warning',
    enabled: true,
    notifyEmail: false,
    notifyInApp: true,
  },
  {
    id: 'task_overdue',
    name: 'Overdue Tasks',
    description: 'Alert when tasks are past their due date',
    category: 'task',
    metric: 'days_overdue',
    operator: 'gt',
    value: 0,
    unit: 'days',
    severity: 'warning',
    enabled: true,
    notifyEmail: false,
    notifyInApp: true,
  },
  {
    id: 'open_rfis_count',
    name: 'High RFI Count',
    description: 'Alert when total open RFIs exceed threshold',
    category: 'rfi',
    metric: 'open_count',
    operator: 'gt',
    value: 20,
    unit: 'count',
    severity: 'warning',
    enabled: true,
    notifyEmail: false,
    notifyInApp: true,
  },
  {
    id: 'pending_approvals',
    name: 'Pending Change Order Approvals',
    description: 'Alert when change orders pending approval exceed 5',
    category: 'change_order',
    metric: 'pending_count',
    operator: 'gt',
    value: 5,
    unit: 'count',
    severity: 'warning',
    enabled: true,
    notifyEmail: false,
    notifyInApp: true,
  },
  {
    id: 'safety_incidents',
    name: 'Recent Safety Incidents',
    description: 'Alert when there are open safety incidents',
    category: 'safety',
    metric: 'open_count',
    operator: 'gt',
    value: 0,
    unit: 'count',
    severity: 'critical',
    enabled: true,
    notifyEmail: true,
    notifyInApp: true,
  },
  {
    id: 'punch_completion_rate',
    name: 'Low Punch Completion Rate',
    description: 'Alert when punch item completion rate falls below 70%',
    category: 'punch_item',
    metric: 'completion_rate',
    operator: 'lt',
    value: 70,
    unit: 'percentage',
    severity: 'warning',
    enabled: false,
    notifyEmail: false,
    notifyInApp: true,
  },
]

// ============================================================================
// Local Storage Key
// ============================================================================

const THRESHOLDS_KEY = 'jobsight-alert-thresholds'

// ============================================================================
// Hook Implementation
// ============================================================================

export function useAlertThresholds() {
  const { userProfile } = useAuth()
  const [config, setConfig] = useState<AlertThresholdConfig>({
    thresholds: DEFAULT_THRESHOLDS,
    lastUpdated: null,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Load thresholds on mount
  useEffect(() => {
    const loadThresholds = async () => {
      setLoading(true)
      try {
        // Try to load from server first
        if (userProfile?.id) {
          const { data, error } = await supabase
            .from('user_preferences')
            .select('alert_thresholds')
            .eq('user_id', userProfile.id)
            .single()

          if (!error && data?.alert_thresholds) {
            setConfig({
              thresholds: mergeThresholds(data.alert_thresholds.thresholds || []),
              lastUpdated: data.alert_thresholds.lastUpdated,
            })
            setLoading(false)
            return
          }
        }

        // Fall back to localStorage
        const stored = localStorage.getItem(THRESHOLDS_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          setConfig({
            thresholds: mergeThresholds(parsed.thresholds || []),
            lastUpdated: parsed.lastUpdated,
          })
        }
      } catch (error) {
        console.error('Failed to load alert thresholds:', error)
      } finally {
        setLoading(false)
      }
    }

    loadThresholds()
  }, [userProfile?.id])

  // Merge user thresholds with defaults (ensures new thresholds are included)
  const mergeThresholds = (userThresholds: AlertThreshold[]): AlertThreshold[] => {
    const userThresholdMap = new Map(userThresholds.map((t) => [t.id, t]))

    return DEFAULT_THRESHOLDS.map((defaultThreshold) => {
      const userThreshold = userThresholdMap.get(defaultThreshold.id)
      if (userThreshold) {
        return { ...defaultThreshold, ...userThreshold }
      }
      return defaultThreshold
    })
  }

  // Save thresholds
  const saveThresholds = useCallback(
    async (newThresholds: AlertThreshold[]) => {
      setSaving(true)
      const updated: AlertThresholdConfig = {
        thresholds: newThresholds,
        lastUpdated: new Date().toISOString(),
      }
      setConfig(updated)

      try {
        // Save to localStorage immediately
        localStorage.setItem(THRESHOLDS_KEY, JSON.stringify(updated))

        // Save to server if logged in
        if (userProfile?.id) {
          await supabase
            .from('user_preferences')
            .upsert(
              {
                user_id: userProfile.id,
                alert_thresholds: updated,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' }
            )
        }
      } catch (error) {
        console.error('Failed to save alert thresholds:', error)
      } finally {
        setSaving(false)
      }
    },
    [userProfile?.id]
  )

  // Update a single threshold
  const updateThreshold = useCallback(
    (thresholdId: string, updates: Partial<AlertThreshold>) => {
      const newThresholds = config.thresholds.map((t) =>
        t.id === thresholdId ? { ...t, ...updates } : t
      )
      saveThresholds(newThresholds)
    },
    [config.thresholds, saveThresholds]
  )

  // Toggle threshold enabled state
  const toggleThreshold = useCallback(
    (thresholdId: string) => {
      const threshold = config.thresholds.find((t) => t.id === thresholdId)
      if (threshold) {
        updateThreshold(thresholdId, { enabled: !threshold.enabled })
      }
    },
    [config.thresholds, updateThreshold]
  )

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    saveThresholds(DEFAULT_THRESHOLDS)
  }, [saveThresholds])

  // Get thresholds by category
  const getThresholdsByCategory = useCallback(
    (category: AlertThreshold['category']) => {
      return config.thresholds.filter((t) => t.category === category && t.enabled)
    },
    [config.thresholds]
  )

  // Get enabled thresholds
  const enabledThresholds = useMemo(
    () => config.thresholds.filter((t) => t.enabled),
    [config.thresholds]
  )

  // Get thresholds by severity
  const getThresholdsBySeverity = useCallback(
    (severity: AlertThreshold['severity']) => {
      return config.thresholds.filter((t) => t.severity === severity && t.enabled)
    },
    [config.thresholds]
  )

  return {
    thresholds: config.thresholds,
    enabledThresholds,
    loading,
    saving,
    updateThreshold,
    toggleThreshold,
    saveThresholds,
    resetToDefaults,
    getThresholdsByCategory,
    getThresholdsBySeverity,
  }
}

/**
 * Check if a value triggers an alert based on threshold configuration
 */
export function checkThresholdTrigger(
  threshold: AlertThreshold,
  currentValue: number
): boolean {
  if (!threshold.enabled) {return false}

  switch (threshold.operator) {
    case 'gt':
      return currentValue > threshold.value
    case 'gte':
      return currentValue >= threshold.value
    case 'lt':
      return currentValue < threshold.value
    case 'lte':
      return currentValue <= threshold.value
    case 'eq':
      return currentValue === threshold.value
    default:
      return false
  }
}

/**
 * Format threshold value with unit for display
 */
export function formatThresholdValue(threshold: AlertThreshold): string {
  const operatorSymbols = {
    gt: '>',
    gte: '>=',
    lt: '<',
    lte: '<=',
    eq: '=',
  }

  const unitSuffixes = {
    days: ' days',
    count: '',
    percentage: '%',
    currency: '',
  }

  const prefix = threshold.unit === 'currency' ? '$' : ''
  const value = threshold.unit === 'currency'
    ? threshold.value.toLocaleString()
    : threshold.value

  return `${operatorSymbols[threshold.operator]} ${prefix}${value}${unitSuffixes[threshold.unit]}`
}

export default useAlertThresholds
