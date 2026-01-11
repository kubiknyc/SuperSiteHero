/**
 * Safety Trends Hooks
 *
 * React Query hooks for safety observation trend analysis using
 * aggregated daily/weekly/monthly statistics from the database.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
import { useToast } from '@/lib/notifications/ToastContext';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

// ============================================================================
// Types
// ============================================================================

export interface DailyObservationStats {
  id: string;
  company_id: string;
  project_id: string | null;
  stat_date: string;
  total_observations: number;
  safe_observations: number;
  unsafe_observations: number;
  near_miss_observations: number;
  low_severity: number;
  medium_severity: number;
  high_severity: number;
  critical_severity: number;
  by_category: Record<string, number>;
  by_location: Record<string, number>;
  by_trade: Record<string, number>;
  resolved_same_day: number;
  pending_resolution: number;
  avg_resolution_hours: number | null;
  unique_observers: number;
  unique_workers_observed: number;
  created_at: string;
  updated_at: string;
}

export interface PeriodObservationStats {
  id: string;
  company_id: string;
  project_id: string | null;
  period_type: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  period_start: string;
  period_end: string;
  total_observations: number;
  safe_observations: number;
  unsafe_observations: number;
  near_miss_observations: number;
  observation_rate: number | null;
  safe_observation_rate: number | null;
  trend_vs_previous: number | null;
  top_unsafe_categories: Array<{ category: string; count: number }>;
  top_locations: Array<{ location: string; count: number }>;
  total_observers: number;
  avg_observations_per_observer: number | null;
  avg_resolution_time_hours: number | null;
  on_time_resolution_rate: number | null;
  created_at: string;
}

export interface TrendFilters {
  project_id?: string;
  start_date?: string;
  end_date?: string;
  period_type?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  limit?: number;
}

export interface TrendSummary {
  totalObservations: number;
  safeObservations: number;
  unsafeObservations: number;
  nearMissObservations: number;
  avgDailyObservations: number;
  safeObservationRate: number;
  trendVsPrevious: number | null;
  topCategories: Array<{ category: string; count: number }>;
  topLocations: Array<{ location: string; count: number }>;
  resolutionMetrics: {
    avgResolutionHours: number | null;
    resolvedSameDay: number;
    pendingResolution: number;
    onTimeRate: number | null;
  };
  participationMetrics: {
    uniqueObservers: number;
    avgObservationsPerObserver: number | null;
  };
}

// Use any type workaround for tables not in generated types yet
const db = supabase as any;

// ============================================================================
// Query Keys
// ============================================================================

export const safetyTrendKeys = {
  all: ['safety-trends'] as const,
  daily: (filters?: TrendFilters) => [...safetyTrendKeys.all, 'daily', filters] as const,
  period: (filters?: TrendFilters) => [...safetyTrendKeys.all, 'period', filters] as const,
  summary: (projectId?: string, days?: number) =>
    [...safetyTrendKeys.all, 'summary', projectId, days] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch daily observation statistics
 */
export function useDailyObservationStats(filters: TrendFilters = {}) {
  const { userProfile } = useAuth();

  return useQuery({
    queryKey: safetyTrendKeys.daily(filters),
    queryFn: async (): Promise<DailyObservationStats[]> => {
      if (!userProfile?.company_id) {throw new Error('No company context');}

      let query = db
        .from('safety_observation_daily_stats')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('stat_date', { ascending: false });

      if (filters.project_id) {
        query = query.eq('project_id', filters.project_id);
      }
      if (filters.start_date) {
        query = query.gte('stat_date', filters.start_date);
      }
      if (filters.end_date) {
        query = query.lte('stat_date', filters.end_date);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) {throw error;}
      return data || [];
    },
    enabled: !!userProfile?.company_id,
  });
}

/**
 * Fetch period observation statistics (weekly/monthly/etc)
 */
export function usePeriodObservationStats(filters: TrendFilters = {}) {
  const { userProfile } = useAuth();

  return useQuery({
    queryKey: safetyTrendKeys.period(filters),
    queryFn: async (): Promise<PeriodObservationStats[]> => {
      if (!userProfile?.company_id) {throw new Error('No company context');}

      let query = db
        .from('safety_observation_period_stats')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('period_start', { ascending: false });

      if (filters.project_id) {
        query = query.eq('project_id', filters.project_id);
      }
      if (filters.period_type) {
        query = query.eq('period_type', filters.period_type);
      }
      if (filters.start_date) {
        query = query.gte('period_start', filters.start_date);
      }
      if (filters.end_date) {
        query = query.lte('period_end', filters.end_date);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) {throw error;}
      return data || [];
    },
    enabled: !!userProfile?.company_id,
  });
}

/**
 * Calculate trend summary from raw observations (fallback if aggregates don't exist)
 */
export function useTrendSummary(projectId?: string, days = 30) {
  const { userProfile } = useAuth();

  return useQuery({
    queryKey: safetyTrendKeys.summary(projectId, days),
    queryFn: async (): Promise<TrendSummary> => {
      if (!userProfile?.company_id) {throw new Error('No company context');}

      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
      const previousStartDate = format(subDays(new Date(), days * 2), 'yyyy-MM-dd');
      const previousEndDate = format(subDays(new Date(), days + 1), 'yyyy-MM-dd');

      // Try to get from aggregated stats first
      let query = db
        .from('safety_observation_daily_stats')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .gte('stat_date', startDate);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data: dailyStats, error: dailyError } = await query;

      if (dailyError) {
        console.error('Error fetching daily stats:', dailyError);
      }

      // If we have aggregated stats, use them
      if (dailyStats && dailyStats.length > 0) {
        const totals = dailyStats.reduce(
          (acc: any, day: DailyObservationStats) => ({
            total: acc.total + day.total_observations,
            safe: acc.safe + day.safe_observations,
            unsafe: acc.unsafe + day.unsafe_observations,
            nearMiss: acc.nearMiss + day.near_miss_observations,
            resolvedSameDay: acc.resolvedSameDay + day.resolved_same_day,
            pendingResolution: acc.pendingResolution + day.pending_resolution,
            resolutionSum: acc.resolutionSum + (day.avg_resolution_hours || 0),
            resolutionCount: acc.resolutionCount + (day.avg_resolution_hours ? 1 : 0),
            observers: Math.max(acc.observers, day.unique_observers),
          }),
          {
            total: 0, safe: 0, unsafe: 0, nearMiss: 0,
            resolvedSameDay: 0, pendingResolution: 0,
            resolutionSum: 0, resolutionCount: 0, observers: 0,
          }
        );

        // Merge categories
        const categoryTotals: Record<string, number> = {};
        const locationTotals: Record<string, number> = {};

        dailyStats.forEach((day: DailyObservationStats) => {
          if (day.by_category) {
            Object.entries(day.by_category).forEach(([cat, count]) => {
              categoryTotals[cat] = (categoryTotals[cat] || 0) + count;
            });
          }
          if (day.by_location) {
            Object.entries(day.by_location).forEach(([loc, count]) => {
              locationTotals[loc] = (locationTotals[loc] || 0) + count;
            });
          }
        });

        return {
          totalObservations: totals.total,
          safeObservations: totals.safe,
          unsafeObservations: totals.unsafe,
          nearMissObservations: totals.nearMiss,
          avgDailyObservations: totals.total / Math.max(dailyStats.length, 1),
          safeObservationRate: totals.total > 0 ? (totals.safe / totals.total) * 100 : 0,
          trendVsPrevious: null, // Would need previous period calculation
          topCategories: Object.entries(categoryTotals)
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5),
          topLocations: Object.entries(locationTotals)
            .map(([location, count]) => ({ location, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5),
          resolutionMetrics: {
            avgResolutionHours: totals.resolutionCount > 0
              ? totals.resolutionSum / totals.resolutionCount
              : null,
            resolvedSameDay: totals.resolvedSameDay,
            pendingResolution: totals.pendingResolution,
            onTimeRate: null,
          },
          participationMetrics: {
            uniqueObservers: totals.observers,
            avgObservationsPerObserver: totals.observers > 0
              ? totals.total / totals.observers
              : null,
          },
        };
      }

      // Fallback: Calculate from raw observations
      let observationsQuery = db
        .from('safety_observations')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .gte('observed_at', startDate);

      if (projectId) {
        observationsQuery = observationsQuery.eq('project_id', projectId);
      }

      const { data: observations, error: obsError } = await observationsQuery;

      if (obsError) {throw obsError;}

      const obs = observations || [];
      const safe = obs.filter((o: any) =>
        o.observation_type === 'safe_behavior' || o.observation_type === 'best_practice'
      ).length;
      const unsafe = obs.filter((o: any) =>
        o.observation_type === 'unsafe_condition'
      ).length;
      const nearMiss = obs.filter((o: any) =>
        o.observation_type === 'near_miss'
      ).length;

      // Category counts
      const categories: Record<string, number> = {};
      obs.forEach((o: any) => {
        if (o.category) {
          categories[o.category] = (categories[o.category] || 0) + 1;
        }
      });

      // Location counts
      const locations: Record<string, number> = {};
      obs.forEach((o: any) => {
        if (o.location) {
          locations[o.location] = (locations[o.location] || 0) + 1;
        }
      });

      // Unique observers
      const uniqueObservers = new Set(obs.map((o: any) => o.observer_id)).size;

      return {
        totalObservations: obs.length,
        safeObservations: safe,
        unsafeObservations: unsafe,
        nearMissObservations: nearMiss,
        avgDailyObservations: obs.length / days,
        safeObservationRate: obs.length > 0 ? (safe / obs.length) * 100 : 0,
        trendVsPrevious: null,
        topCategories: Object.entries(categories)
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
        topLocations: Object.entries(locations)
          .map(([location, count]) => ({ location, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
        resolutionMetrics: {
          avgResolutionHours: null,
          resolvedSameDay: 0,
          pendingResolution: obs.filter((o: any) =>
            o.status === 'action_required' || o.status === 'in_progress'
          ).length,
          onTimeRate: null,
        },
        participationMetrics: {
          uniqueObservers,
          avgObservationsPerObserver: uniqueObservers > 0
            ? obs.length / uniqueObservers
            : null,
        },
      };
    },
    enabled: !!userProfile?.company_id,
  });
}

/**
 * Get comparison data between two periods
 */
export function usePeriodComparison(
  projectId?: string,
  currentPeriodDays = 7,
  periodType: 'weekly' | 'monthly' = 'weekly'
) {
  const { userProfile } = useAuth();

  return useQuery({
    queryKey: ['safety-trends', 'comparison', projectId, currentPeriodDays, periodType],
    queryFn: async () => {
      if (!userProfile?.company_id) {throw new Error('No company context');}

      let query = db
        .from('safety_observation_period_stats')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .eq('period_type', periodType)
        .order('period_start', { ascending: false })
        .limit(2);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) {throw error;}

      const [current, previous] = data || [];

      if (!current) {
        return {
          current: null,
          previous: null,
          changes: null,
        };
      }

      const changes = previous
        ? {
            totalObservations: current.total_observations - previous.total_observations,
            totalObservationsPercent: previous.total_observations > 0
              ? ((current.total_observations - previous.total_observations) / previous.total_observations) * 100
              : null,
            safeObservations: current.safe_observations - previous.safe_observations,
            safeRate: (current.safe_observation_rate || 0) - (previous.safe_observation_rate || 0),
            observers: current.total_observers - previous.total_observers,
          }
        : null;

      return {
        current,
        previous,
        changes,
      };
    },
    enabled: !!userProfile?.company_id,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Manually trigger aggregation for a date range
 * (Useful if real-time aggregation isn't set up)
 */
export function useRefreshTrendStats() {
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      startDate,
      endDate,
      projectId,
    }: {
      startDate: string;
      endDate: string;
      projectId?: string;
    }) => {
      if (!userProfile?.company_id) {throw new Error('No company context');}

      // This would call a server function to recalculate aggregates
      // For now, just invalidate the cache to refetch
      const { error } = await db.rpc('refresh_safety_observation_stats', {
        p_company_id: userProfile.company_id,
        p_project_id: projectId || null,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) {throw error;}
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: safetyTrendKeys.all });
      showToast({
        type: 'success',
        title: 'Stats Refreshed',
        message: 'Safety observation statistics have been updated.',
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Refresh Failed',
        message: error.message || 'Failed to refresh statistics.',
      });
    },
  });
}
