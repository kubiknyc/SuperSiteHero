// File: src/components/layout/header/stats-config.ts
// Configuration for dashboard stats displayed in the header
// Extracted from StickyHeader to follow Single Responsibility Principle

import {
  ClipboardList,
  AlertCircle,
  ListChecks,
  Shield,
  LucideIcon,
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

export interface StatItemConfig {
  id: string
  label: string
  icon: LucideIcon
  color: string
  iconColor: string
  link: string
}

export interface StatItem extends StatItemConfig {
  value: string | number
  trend?: 'up' | 'down'
  change?: string
}

export interface DashboardStats {
  tasks: {
    pending: number
    inProgress: number
    completed: number
  }
  rfis: {
    open: number
    pendingResponse: number
    closed: number
  }
  punchItems: {
    open: number
    inProgress: number
    completed: number
  }
  safety: {
    daysSinceIncident: number
    openObservations: number
  }
}

// ============================================================================
// STAT DEFINITIONS
// ============================================================================

/**
 * Configuration for each stat type
 * Defines display properties independent of data
 */
export const STAT_CONFIGS: StatItemConfig[] = [
  {
    id: 'tasks',
    label: 'Tasks',
    icon: ClipboardList,
    color: 'bg-blue-500/10 dark:bg-blue-500/20',
    iconColor: '#3B82F6',
    link: '/tasks?status=pending',
  },
  {
    id: 'rfis',
    label: 'RFIs',
    icon: AlertCircle,
    color: 'bg-amber-500/10 dark:bg-amber-500/20',
    iconColor: '#F59E0B',
    link: '/rfis?status=open',
  },
  {
    id: 'punch',
    label: 'Punch',
    icon: ListChecks,
    color: 'bg-purple-500/10 dark:bg-purple-500/20',
    iconColor: '#8B5CF6',
    link: '/punch-lists?status=open',
  },
  {
    id: 'safety',
    label: 'Safety',
    icon: Shield,
    color: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    iconColor: '#10B981',
    link: '/safety',
  },
]

// ============================================================================
// STAT BUILDERS
// ============================================================================

/**
 * Build stat items from dashboard data
 * Combines static config with dynamic data
 */
export function buildStatsFromData(stats: DashboardStats | null | undefined): StatItem[] {
  if (!stats) return []

  return [
    {
      ...STAT_CONFIGS[0],
      value: stats.tasks.pending + stats.tasks.inProgress,
      trend: 'up' as const,
      change: '+2',
    },
    {
      ...STAT_CONFIGS[1],
      value: stats.rfis.open + stats.rfis.pendingResponse,
      trend: 'down' as const,
      change: '-1',
    },
    {
      ...STAT_CONFIGS[2],
      value: stats.punchItems.open + stats.punchItems.inProgress,
      trend: 'up' as const,
      change: '+3',
    },
    {
      ...STAT_CONFIGS[3],
      value: `${stats.safety.daysSinceIncident}d`,
      trend: 'up' as const,
      change: '+1',
    },
  ]
}

// ============================================================================
// ANIMATION CONFIG
// ============================================================================

/** Animation delay per stat item in milliseconds */
export const STAT_ANIMATION_DELAY_MS = 50

/** Spring easing function for premium transitions */
export const SPRING_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)'
