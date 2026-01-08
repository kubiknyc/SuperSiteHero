/**
 * TanStack Query Stale Time Constants
 *
 * Centralized stale time configuration for consistent caching behavior
 * across the application. Use these constants in your query configurations
 * instead of hardcoded values.
 *
 * @example
 * const { data } = useQuery({
 *   queryKey: ['projects'],
 *   queryFn: fetchProjects,
 *   staleTime: STALE_TIMES.STANDARD,
 * })
 */

export const STALE_TIMES = {
  /** 0ms - For data that must always be fresh (real-time updates, presence) */
  REALTIME: 0,

  /** 30 seconds - For frequently changing data (notifications, active tasks) */
  FREQUENT: 30 * 1000,

  /** 5 minutes - Default for most data (projects, reports, documents) */
  STANDARD: 5 * 60 * 1000,

  /** 30 minutes - For rarely changing data (user settings, templates) */
  STATIC: 30 * 60 * 1000,

  /** Infinity - For reference data that never changes (cost codes, enums) */
  INFINITE: Infinity,
} as const

export type StaleTimeKey = keyof typeof STALE_TIMES
export type StaleTimeValue = (typeof STALE_TIMES)[StaleTimeKey]
