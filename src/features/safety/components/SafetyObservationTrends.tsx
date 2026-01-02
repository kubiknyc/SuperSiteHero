/**
 * SafetyObservationTrends Component
 *
 * Advanced trend analysis dashboard for safety observations using
 * aggregated daily/weekly/monthly statistics from the database.
 *
 * Features:
 * - Daily/Weekly/Monthly trend charts
 * - Observation rate calculations
 * - Category distribution analysis
 * - Resolution time metrics
 * - Trend vs previous period comparison
 * - Export capabilities
 */

import * as React from 'react';
import { format, subDays, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Clock,
  CheckCircle,
  AlertTriangle,
  Target,
  Download,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  ThumbsUp,
  AlertCircle,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ============================================================================
// Types
// ============================================================================

interface DailyStats {
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
}

interface PeriodStats {
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
}

interface TrendData {
  date: string;
  total: number;
  safe: number;
  unsafe: number;
  nearMiss: number;
}

interface SafetyObservationTrendsProps {
  projectId?: string;
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-';
  return num.toLocaleString();
}

function formatPercent(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-';
  return `${num.toFixed(1)}%`;
}

function formatHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined) return '-';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${Math.round(hours / 24)}d`;
}

function getTrendIndicator(value: number | null) {
  if (value === null || value === 0) {
    return { icon: Minus, color: 'text-gray-500', bg: 'bg-gray-100' };
  }
  if (value > 0) {
    return { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100' };
  }
  return { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-100' };
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Trend indicator with comparison to previous period
 */
function TrendIndicator({
  current,
  previous,
  label,
  higherIsBetter = true,
}: {
  current: number;
  previous: number | null;
  label: string;
  higherIsBetter?: boolean;
}) {
  const change = previous !== null && previous !== 0
    ? ((current - previous) / previous) * 100
    : null;

  const isPositive = change !== null && change > 0;
  const isGood = higherIsBetter ? isPositive : !isPositive;

  return (
    <div className="text-center">
      <div className="text-3xl font-bold">{formatNumber(current)}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
      {change !== null && Math.abs(change) > 0.1 && (
        <div className={cn(
          'flex items-center justify-center gap-1 mt-1 text-xs',
          isGood ? 'text-green-600' : 'text-red-600'
        )}>
          {isPositive ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          <span>{isPositive ? '+' : ''}{change.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}

/**
 * Category distribution chart (simple bar chart)
 */
function CategoryDistribution({
  data,
  total,
}: {
  data: Record<string, number>;
  total: number;
}) {
  const sortedCategories = Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const categoryLabels: Record<string, string> = {
    ppe: 'PPE',
    housekeeping: 'Housekeeping',
    fall_protection: 'Fall Protection',
    electrical: 'Electrical',
    fire_safety: 'Fire Safety',
    chemical: 'Chemical',
    ergonomics: 'Ergonomics',
    vehicle: 'Vehicle',
    equipment: 'Equipment',
    lifting: 'Lifting',
    other: 'Other',
  };

  return (
    <div className="space-y-3">
      {sortedCategories.map(([category, count]) => {
        const percent = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={category} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{categoryLabels[category] || category}</span>
              <span className="text-muted-foreground">
                {count} ({percent.toFixed(0)}%)
              </span>
            </div>
            <Progress value={percent} className="h-2" />
          </div>
        );
      })}
      {sortedCategories.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No category data available
        </p>
      )}
    </div>
  );
}

/**
 * Resolution metrics card
 */
function ResolutionMetrics({
  avgResolutionHours,
  onTimeRate,
  resolvedSameDay,
  pendingResolution,
}: {
  avgResolutionHours: number | null;
  onTimeRate: number | null;
  resolvedSameDay: number;
  pendingResolution: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="text-center p-4 bg-green-50 rounded-lg">
        <div className="text-2xl font-bold text-green-700">
          {formatHours(avgResolutionHours)}
        </div>
        <div className="text-xs text-green-600">Avg Resolution Time</div>
      </div>
      <div className="text-center p-4 bg-blue-50 rounded-lg">
        <div className="text-2xl font-bold text-blue-700">
          {formatPercent(onTimeRate)}
        </div>
        <div className="text-xs text-blue-600">On-Time Resolution</div>
      </div>
      <div className="text-center p-4 bg-emerald-50 rounded-lg">
        <div className="text-2xl font-bold text-emerald-700">
          {resolvedSameDay}
        </div>
        <div className="text-xs text-emerald-600">Same-Day Resolved</div>
      </div>
      <div className="text-center p-4 bg-orange-50 rounded-lg">
        <div className="text-2xl font-bold text-orange-700">
          {pendingResolution}
        </div>
        <div className="text-xs text-orange-600">Pending Resolution</div>
      </div>
    </div>
  );
}

/**
 * Simple sparkline-style trend visualization
 */
function TrendSparkline({ data, height = 40 }: { data: TrendData[]; height?: number }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-10 text-muted-foreground text-sm">
        No trend data
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.total), 1);
  const width = 100 / data.length;

  return (
    <div className="flex items-end gap-0.5" style={{ height }}>
      {data.map((d, i) => {
        const barHeight = (d.total / max) * 100;
        const safeHeight = (d.safe / max) * 100;
        const unsafeHeight = (d.unsafe / max) * 100;

        return (
          <div
            key={d.date}
            className="flex-1 flex flex-col justify-end"
            title={`${d.date}: ${d.total} total (${d.safe} safe, ${d.unsafe} unsafe)`}
          >
            <div
              className="bg-green-400 rounded-t-sm"
              style={{ height: `${safeHeight}%` }}
            />
            <div
              className="bg-orange-400"
              style={{ height: `${unsafeHeight}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Hooks
// ============================================================================

function useDailyStats(projectId?: string, days = 30) {
  const { userProfile } = useAuth();

  return useQuery({
    queryKey: ['safety-observation-daily-stats', projectId, days],
    queryFn: async (): Promise<DailyStats[]> => {
      if (!userProfile?.company_id) return [];

      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

      let query = (supabase as any)
        .from('safety_observation_daily_stats')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .gte('stat_date', startDate)
        .order('stat_date', { ascending: true });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!userProfile?.company_id,
  });
}

function usePeriodStats(projectId?: string, periodType: 'weekly' | 'monthly' = 'weekly') {
  const { userProfile } = useAuth();

  return useQuery({
    queryKey: ['safety-observation-period-stats', projectId, periodType],
    queryFn: async (): Promise<PeriodStats[]> => {
      if (!userProfile?.company_id) return [];

      let query = (supabase as any)
        .from('safety_observation_period_stats')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .eq('period_type', periodType)
        .order('period_start', { ascending: false })
        .limit(12);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!userProfile?.company_id,
  });
}

// ============================================================================
// Main Component
// ============================================================================

export function SafetyObservationTrends({
  projectId,
  className,
}: SafetyObservationTrendsProps) {
  const [periodType, setPeriodType] = React.useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [dateRange, setDateRange] = React.useState(30);

  // Queries
  const { data: dailyStats, isLoading: dailyLoading } = useDailyStats(projectId, dateRange);
  const { data: periodStats, isLoading: periodLoading } = usePeriodStats(
    projectId,
    periodType === 'daily' ? 'weekly' : periodType
  );

  // Calculate aggregates from daily stats
  const aggregates = React.useMemo(() => {
    if (!dailyStats || dailyStats.length === 0) {
      return {
        totalObservations: 0,
        safeObservations: 0,
        unsafeObservations: 0,
        nearMissObservations: 0,
        avgDaily: 0,
        safeRatio: 0,
        byCategory: {} as Record<string, number>,
        bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
        uniqueObservers: 0,
        avgResolutionHours: null as number | null,
        resolvedSameDay: 0,
        pendingResolution: 0,
      };
    }

    const totals = dailyStats.reduce(
      (acc, day) => ({
        total: acc.total + day.total_observations,
        safe: acc.safe + day.safe_observations,
        unsafe: acc.unsafe + day.unsafe_observations,
        nearMiss: acc.nearMiss + day.near_miss_observations,
        low: acc.low + day.low_severity,
        medium: acc.medium + day.medium_severity,
        high: acc.high + day.high_severity,
        critical: acc.critical + day.critical_severity,
        observers: Math.max(acc.observers, day.unique_observers),
        resolvedSameDay: acc.resolvedSameDay + day.resolved_same_day,
        pendingResolution: acc.pendingResolution + day.pending_resolution,
        resolutionSum: acc.resolutionSum + (day.avg_resolution_hours || 0),
        resolutionCount: acc.resolutionCount + (day.avg_resolution_hours ? 1 : 0),
      }),
      {
        total: 0, safe: 0, unsafe: 0, nearMiss: 0,
        low: 0, medium: 0, high: 0, critical: 0,
        observers: 0, resolvedSameDay: 0, pendingResolution: 0,
        resolutionSum: 0, resolutionCount: 0,
      }
    );

    // Merge category data
    const byCategory: Record<string, number> = {};
    dailyStats.forEach((day) => {
      if (day.by_category) {
        Object.entries(day.by_category).forEach(([cat, count]) => {
          byCategory[cat] = (byCategory[cat] || 0) + count;
        });
      }
    });

    return {
      totalObservations: totals.total,
      safeObservations: totals.safe,
      unsafeObservations: totals.unsafe,
      nearMissObservations: totals.nearMiss,
      avgDaily: totals.total / dailyStats.length,
      safeRatio: totals.total > 0 ? (totals.safe / totals.total) * 100 : 0,
      byCategory,
      bySeverity: {
        low: totals.low,
        medium: totals.medium,
        high: totals.high,
        critical: totals.critical,
      },
      uniqueObservers: totals.observers,
      avgResolutionHours: totals.resolutionCount > 0
        ? totals.resolutionSum / totals.resolutionCount
        : null,
      resolvedSameDay: totals.resolvedSameDay,
      pendingResolution: totals.pendingResolution,
    };
  }, [dailyStats]);

  // Transform daily stats for trend chart
  const trendData: TrendData[] = React.useMemo(() => {
    if (!dailyStats) return [];
    return dailyStats.map((day) => ({
      date: format(new Date(day.stat_date), 'MMM d'),
      total: day.total_observations,
      safe: day.safe_observations,
      unsafe: day.unsafe_observations,
      nearMiss: day.near_miss_observations,
    }));
  }, [dailyStats]);

  // Get current and previous period from period stats
  const currentPeriod = periodStats?.[0];
  const previousPeriod = periodStats?.[1];

  const isLoading = dailyLoading || periodLoading;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Safety Observation Trends
          </h2>
          <p className="text-sm text-muted-foreground">
            Analyze observation patterns and identify areas for improvement
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={dateRange.toString()}
            onValueChange={(v) => setDateRange(parseInt(v))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" title="Export Data">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Observations</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-500" />
              {formatNumber(aggregates.totalObservations)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Avg {aggregates.avgDaily.toFixed(1)} per day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Safe Observation Rate</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <ThumbsUp className="h-5 w-5 text-green-500" />
              {formatPercent(aggregates.safeRatio)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={aggregates.safeRatio} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Near Misses</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              {formatNumber(aggregates.nearMissObservations)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {aggregates.totalObservations > 0
                ? `${((aggregates.nearMissObservations / aggregates.totalObservations) * 100).toFixed(1)}% of total`
                : 'No observations'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Observers</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-500" />
              {formatNumber(aggregates.uniqueObservers)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Unique contributors
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Observation Trend
          </CardTitle>
          <CardDescription>
            Daily observation counts over the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-20 flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <TrendSparkline data={trendData} height={80} />
          )}
          <div className="flex items-center justify-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-400" />
              <span>Safe</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-orange-400" />
              <span>Unsafe</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analysis */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              By Category
            </CardTitle>
            <CardDescription>
              Distribution of observations by hazard category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryDistribution
              data={aggregates.byCategory}
              total={aggregates.totalObservations}
            />
          </CardContent>
        </Card>

        {/* Severity Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              By Severity
            </CardTitle>
            <CardDescription>
              Breakdown of observations by severity level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-700">
                  {aggregates.bySeverity.low}
                </div>
                <div className="text-xs text-gray-600">Low</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-700">
                  {aggregates.bySeverity.medium}
                </div>
                <div className="text-xs text-yellow-600">Medium</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-700">
                  {aggregates.bySeverity.high}
                </div>
                <div className="text-xs text-orange-600">High</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-700">
                  {aggregates.bySeverity.critical}
                </div>
                <div className="text-xs text-red-600">Critical</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resolution Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Resolution Performance
          </CardTitle>
          <CardDescription>
            How quickly unsafe observations are being addressed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResolutionMetrics
            avgResolutionHours={aggregates.avgResolutionHours}
            onTimeRate={currentPeriod?.on_time_resolution_rate ?? null}
            resolvedSameDay={aggregates.resolvedSameDay}
            pendingResolution={aggregates.pendingResolution}
          />
        </CardContent>
      </Card>

      {/* Period Comparison */}
      {currentPeriod && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Period Comparison
            </CardTitle>
            <CardDescription>
              {format(new Date(currentPeriod.period_start), 'MMM d')} -{' '}
              {format(new Date(currentPeriod.period_end), 'MMM d, yyyy')}
              {previousPeriod && ' vs previous period'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <TrendIndicator
                current={currentPeriod.total_observations}
                previous={previousPeriod?.total_observations ?? null}
                label="Total"
                higherIsBetter={true}
              />
              <TrendIndicator
                current={currentPeriod.safe_observations}
                previous={previousPeriod?.safe_observations ?? null}
                label="Safe"
                higherIsBetter={true}
              />
              <TrendIndicator
                current={currentPeriod.total_observers}
                previous={previousPeriod?.total_observers ?? null}
                label="Observers"
                higherIsBetter={true}
              />
              <TrendIndicator
                current={currentPeriod.avg_observations_per_observer ?? 0}
                previous={previousPeriod?.avg_observations_per_observer ?? null}
                label="Avg/Observer"
                higherIsBetter={true}
              />
            </div>

            {/* Top Unsafe Categories */}
            {currentPeriod.top_unsafe_categories &&
              currentPeriod.top_unsafe_categories.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-medium text-sm mb-3">
                    Top Unsafe Categories This Period
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {currentPeriod.top_unsafe_categories.map((item, i) => (
                      <Badge key={i} variant="outline" className="text-orange-600">
                        {item.category}: {item.count}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default SafetyObservationTrends;
