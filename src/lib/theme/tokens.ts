// File: /src/lib/theme/tokens.ts
// Design system color tokens and utilities
// Ensures consistent color usage across the application

/**
 * Professional Blueprint color palette
 * Source: DESIGN_SYSTEM.md
 */
export const colors = {
  // Primary - Professional Blueprint Blue
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af', // Main brand color
    900: '#1e3a8a',
    DEFAULT: '#1e40af'
  },

  // Semantic colors
  semantic: {
    success: '#10B981',    // Approved Green
    warning: '#FBBF24',    // Safety Yellow
    destructive: '#EF4444', // Caution Red
    info: '#06B6D4'        // Steel Cyan
  },

  // Industrial grays (zinc/slate scale)
  surface: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
    950: '#09090b'
  }
} as const

/**
 * Status color mapping for badges and indicators
 * Maps common status values to semantic colors
 */
export const statusColors = {
  // Project statuses
  active: 'success',
  pending: 'warning',
  completed: 'default',
  cancelled: 'destructive',
  on_hold: 'secondary',

  // Task statuses
  todo: 'secondary',
  in_progress: 'info',
  review: 'warning',
  done: 'success',
  blocked: 'destructive',

  // Approval statuses
  approved: 'success',
  rejected: 'destructive',
  needs_review: 'warning',
  draft: 'secondary',

  // RFI statuses
  open: 'warning',
  answered: 'info',
  closed: 'success',
  overdue: 'destructive',

  // Safety statuses
  safe: 'success',
  caution: 'warning',
  danger: 'destructive',
  alert: 'warning'
} as const

export type StatusColorKey = keyof typeof statusColors
export type StatusColorVariant = typeof statusColors[StatusColorKey]

/**
 * Get the badge variant for a given status
 * @param status - Status string (case-insensitive)
 * @returns Badge variant ('success' | 'warning' | 'destructive' | 'default' | 'secondary' | 'info')
 */
export function getStatusVariant(status: string): StatusColorVariant {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_') as StatusColorKey
  return statusColors[normalizedStatus] || 'default'
}

/**
 * Chart color palette for data visualization
 * Ensures good contrast and distinguishability
 */
export const chartColors = {
  blue: colors.primary[600],
  orange: '#D97706',
  purple: '#8B5CF6',
  green: colors.semantic.success,
  yellow: colors.semantic.warning,
  red: colors.semantic.destructive,
  cyan: colors.semantic.info,
  gray: colors.surface[500]
} as const

/**
 * Get chart color by index (cycles through palette)
 * @param index - Index for color selection
 * @returns Hex color string
 */
export function getChartColor(index: number): string {
  const colorArray = Object.values(chartColors)
  return colorArray[index % colorArray.length]
}

/**
 * Tailwind class names for common color applications
 * Use these instead of hard-coded color values
 */
export const colorClasses = {
  // Primary colors
  primaryBg: 'bg-primary hover:bg-primary/90',
  primaryText: 'text-primary dark:text-primary-400',
  primaryBorder: 'border-primary dark:border-primary-600',

  // Semantic colors
  successBg: 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600',
  successText: 'text-green-600 dark:text-green-400',
  successBorder: 'border-green-600 dark:border-green-500',

  warningBg: 'bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-400 dark:hover:bg-yellow-500',
  warningText: 'text-yellow-600 dark:text-yellow-400',
  warningBorder: 'border-yellow-500 dark:border-yellow-400',

  destructiveBg: 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600',
  destructiveText: 'text-red-600 dark:text-red-400',
  destructiveBorder: 'border-red-600 dark:border-red-500',

  infoBg: 'bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-600',
  infoText: 'text-cyan-600 dark:text-cyan-400',
  infoBorder: 'border-cyan-600 dark:border-cyan-500',

  // Surface colors
  cardBg: 'bg-white dark:bg-surface-900',
  surfaceBg: 'bg-surface-50 dark:bg-surface-950',
  borderColor: 'border-surface-200 dark:border-surface-800'
} as const
