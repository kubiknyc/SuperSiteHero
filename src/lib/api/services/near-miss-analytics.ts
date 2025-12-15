/**
 * Near-Miss Analytics API Service
 *
 * Provides data access for near-miss trend analysis, pattern detection,
 * and predictive safety analytics.
 */

import { supabase } from '@/lib/supabase'
import { ApiErrorClass } from '../errors'
import { logger } from '@/lib/utils/logger'
import type {
  NearMissCategory,
  NearMissZone,
  NearMissPattern,
  NearMissAlert,
  MonthlyReport,
  AlertThreshold,
  SafetyBenchmark,
  DailyTrendPoint,
  LocationHeatMapData,
  TimePatternData,
  RootCauseParetoData,
  FrequencySpike,
  LocationHotspot,
  TrendCalculation,
  NearMissAnalyticsSummary,
  TimeMatrix,
  NearMissAnalyticsFilters,
  CreateZoneDTO,
  CreateCategoryDTO,
  CreateThresholdDTO,
  UpdatePatternDTO,
  PatternStatus,
  TrendDirection,
} from '@/types/near-miss-analytics'
import type { RootCauseCategory } from '@/types/safety-incidents'

// Use 'any' cast for tables not in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// ============================================================================
// ANALYTICS QUERIES
// ============================================================================

export const nearMissAnalyticsApi = {
  /**
   * Get analytics summary for dashboard
   */
  async getSummary(
    companyId: string,
    projectId?: string
  ): Promise<NearMissAnalyticsSummary> {
    try {
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      const yearStart = new Date(now.getFullYear(), 0, 1)

      // Build base query
      let baseQuery = db
        .from('safety_incidents')
        .select('*')
        .eq('company_id', companyId)
        .eq('severity', 'near_miss')
        .is('deleted_at', null)

      if (projectId) {
        baseQuery = baseQuery.eq('project_id', projectId)
      }

      // Get all near-misses for analysis
      const [last30DaysResult, last60to30Result, last90DaysResult, ytdResult] = await Promise.all([
        baseQuery.clone().gte('incident_date', thirtyDaysAgo.toISOString().split('T')[0]),
        baseQuery
          .clone()
          .gte('incident_date', sixtyDaysAgo.toISOString().split('T')[0])
          .lt('incident_date', thirtyDaysAgo.toISOString().split('T')[0]),
        baseQuery.clone().gte('incident_date', ninetyDaysAgo.toISOString().split('T')[0]),
        baseQuery.clone().gte('incident_date', yearStart.toISOString().split('T')[0]),
      ])

      const last30Days = last30DaysResult.data || []
      const prev30Days = last60to30Result.data || []
      const last90Days = last90DaysResult.data || []
      const ytd = ytdResult.data || []

      // Calculate trends
      const changePercentage =
        prev30Days.length === 0
          ? 0
          : Math.round(((last30Days.length - prev30Days.length) / prev30Days.length) * 100)

      const trendDirection: TrendDirection =
        changePercentage > 5 ? 'increasing' : changePercentage < -5 ? 'decreasing' : 'stable'

      // Calculate severity distribution
      const bySeverity: Record<string, number> = {
        first_aid: 0,
        medical_treatment: 0,
        lost_time: 0,
        fatality: 0,
      }
      last30Days.forEach((incident: { potential_severity?: string }) => {
        if (incident.potential_severity && bySeverity[incident.potential_severity] !== undefined) {
          bySeverity[incident.potential_severity]++
        }
      })

      // Calculate top locations
      const locationCounts: Record<string, number> = {}
      last30Days.forEach((incident: { location?: string }) => {
        const loc = incident.location || 'Unknown'
        locationCounts[loc] = (locationCounts[loc] || 0) + 1
      })
      const topLocations = Object.entries(locationCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([location, count]) => ({ location, count }))

      // Calculate top root causes
      const rootCauseCounts: Record<string, number> = {}
      last30Days.forEach((incident: { root_cause_category?: string }) => {
        if (incident.root_cause_category) {
          rootCauseCounts[incident.root_cause_category] =
            (rootCauseCounts[incident.root_cause_category] || 0) + 1
        }
      })
      const topRootCauses = Object.entries(rootCauseCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category, count]) => ({ category: category as RootCauseCategory, count }))

      // Get alerts and patterns count
      let alertsQuery = db
        .from('near_miss_alerts')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('is_dismissed', false)

      let patternsQuery = db
        .from('near_miss_patterns')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .in('status', ['new', 'acknowledged', 'investigating'])

      if (projectId) {
        alertsQuery = alertsQuery.eq('project_id', projectId)
        patternsQuery = patternsQuery.eq('project_id', projectId)
      }

      const [alertsResult, patternsResult] = await Promise.all([alertsQuery, patternsQuery])

      // Get benchmark
      const { data: benchmark } = await db
        .from('safety_benchmarks')
        .select('metric_value')
        .eq('industry_type', 'construction')
        .eq('metric_name', 'reporting_rate_good')
        .single()

      const benchmarkRate = benchmark?.metric_value || 10 // Default 10 per 100 workers per month

      return {
        total_near_misses_30_days: last30Days.length,
        total_near_misses_90_days: last90Days.length,
        total_near_misses_ytd: ytd.length,
        trend_vs_previous_30_days: {
          change_percentage: changePercentage,
          direction: trendDirection,
        },
        by_potential_severity: bySeverity as Record<string, number>,
        top_locations: topLocations,
        top_root_causes: topRootCauses,
        top_categories: [], // Would need category tracking
        active_alerts_count: alertsResult.count || 0,
        unresolved_patterns_count: patternsResult.count || 0,
        reporting_rate: last30Days.length, // Simplified - would need worker count
        industry_benchmark_rate: benchmarkRate,
        is_above_benchmark: last30Days.length >= benchmarkRate,
      }
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_SUMMARY_ERROR',
        message: 'Failed to fetch near-miss analytics summary',
        details: error,
      })
    }
  },

  /**
   * Get daily trend data for charting
   */
  async getDailyTrends(
    filters: NearMissAnalyticsFilters,
    days = 30
  ): Promise<DailyTrendPoint[]> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      let query = db
        .from('safety_incidents')
        .select('incident_date, potential_severity, root_cause_category')
        .eq('severity', 'near_miss')
        .is('deleted_at', null)
        .gte('incident_date', startDate.toISOString().split('T')[0])
        .order('incident_date', { ascending: true })

      if (filters.company_id) {
        query = query.eq('company_id', filters.company_id)
      }
      if (filters.project_id) {
        query = query.eq('project_id', filters.project_id)
      }

      const { data, error } = await query

      if (error) {throw error}

      // Group by date
      const groupedByDate: Record<string, DailyTrendPoint> = {}

      // Initialize all dates in range
      for (let d = new Date(startDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0]
        groupedByDate[dateStr] = {
          date: dateStr,
          total_count: 0,
          fatality_potential_count: 0,
          lost_time_potential_count: 0,
          medical_treatment_potential_count: 0,
          first_aid_potential_count: 0,
          by_root_cause: {} as Record<RootCauseCategory, number>,
        }
      }

      // Aggregate data
      (data || []).forEach((incident: {
        incident_date: string
        potential_severity?: string
        root_cause_category?: RootCauseCategory
      }) => {
        const point = groupedByDate[incident.incident_date]
        if (!point) {return}

        point.total_count++

        switch (incident.potential_severity) {
          case 'fatality':
            point.fatality_potential_count++
            break
          case 'lost_time':
            point.lost_time_potential_count++
            break
          case 'medical_treatment':
            point.medical_treatment_potential_count++
            break
          case 'first_aid':
            point.first_aid_potential_count++
            break
        }

        if (incident.root_cause_category) {
          point.by_root_cause[incident.root_cause_category] =
            (point.by_root_cause[incident.root_cause_category] || 0) + 1
        }
      })

      return Object.values(groupedByDate)
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_TRENDS_ERROR',
        message: 'Failed to fetch daily trends',
        details: error,
      })
    }
  },

  /**
   * Get location heat map data
   */
  async getLocationHeatMap(
    filters: NearMissAnalyticsFilters
  ): Promise<LocationHeatMapData[]> {
    try {
      let query = db
        .from('near_miss_location_heatmap')
        .select('*')

      if (filters.company_id) {
        query = query.eq('company_id', filters.company_id)
      }
      if (filters.project_id) {
        query = query.eq('project_id', filters.project_id)
      }

      const { data, error } = await query

      if (error) {
        // View might not exist yet - fall back to direct query
        logger.warn('Heat map view not available, using direct query')
        return this._getLocationHeatMapFallback(filters)
      }

      return (data || []) as LocationHeatMapData[]
    } catch (error) {
      return this._getLocationHeatMapFallback(filters)
    }
  },

  /**
   * Fallback method for location heat map when view is not available
   */
  async _getLocationHeatMapFallback(
    filters: NearMissAnalyticsFilters
  ): Promise<LocationHeatMapData[]> {
    try {
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

      let query = db
        .from('safety_incidents')
        .select('location, zone_id, potential_severity, root_cause_category, incident_date')
        .eq('severity', 'near_miss')
        .is('deleted_at', null)
        .gte('incident_date', ninetyDaysAgo.toISOString().split('T')[0])

      if (filters.company_id) {
        query = query.eq('company_id', filters.company_id)
      }
      if (filters.project_id) {
        query = query.eq('project_id', filters.project_id)
      }

      const { data, error } = await query

      if (error) {throw error}

      // Group by location
      const locationMap: Record<string, LocationHeatMapData> = {}

      ;(data || []).forEach((incident: {
        location?: string
        zone_id?: string
        potential_severity?: string
        root_cause_category?: RootCauseCategory
        incident_date: string
      }) => {
        const loc = incident.location || 'Unknown'
        if (!locationMap[loc]) {
          locationMap[loc] = {
            location: loc,
            zone_id: incident.zone_id || null,
            zone_name: null,
            zone_type: null,
            floor_number: null,
            incident_count: 0,
            high_severity_count: 0,
            last_incident_date: incident.incident_date,
            root_causes: [],
          }
        }

        const entry = locationMap[loc]
        entry.incident_count++

        if (['lost_time', 'fatality'].includes(incident.potential_severity || '')) {
          entry.high_severity_count++
        }

        if (incident.incident_date > entry.last_incident_date) {
          entry.last_incident_date = incident.incident_date
        }

        if (incident.root_cause_category && !entry.root_causes.includes(incident.root_cause_category)) {
          entry.root_causes.push(incident.root_cause_category)
        }
      })

      // Calculate risk scores
      const results = Object.values(locationMap).map(entry => ({
        ...entry,
        risk_score: entry.incident_count + entry.high_severity_count * 3,
      }))

      return results.sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_HEATMAP_ERROR',
        message: 'Failed to fetch location heat map data',
        details: error,
      })
    }
  },

  /**
   * Get time pattern data (hour x day of week)
   */
  async getTimePatterns(filters: NearMissAnalyticsFilters): Promise<TimeMatrix> {
    try {
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

      let query = db
        .from('safety_incidents')
        .select('incident_time, incident_date')
        .eq('severity', 'near_miss')
        .is('deleted_at', null)
        .not('incident_time', 'is', null)
        .gte('incident_date', ninetyDaysAgo.toISOString().split('T')[0])

      if (filters.company_id) {
        query = query.eq('company_id', filters.company_id)
      }
      if (filters.project_id) {
        query = query.eq('project_id', filters.project_id)
      }

      const { data, error } = await query

      if (error) {throw error}

      // Initialize 24x7 matrix
      const matrix: number[][] = Array.from({ length: 24 }, () => Array(7).fill(0))
      let maxValue = 0
      let totalIncidents = 0

      ;(data || []).forEach((incident: { incident_time?: string; incident_date: string }) => {
        if (!incident.incident_time) {return}

        const hour = parseInt(incident.incident_time.split(':')[0], 10)
        const dayOfWeek = new Date(incident.incident_date).getDay()

        if (hour >= 0 && hour < 24 && dayOfWeek >= 0 && dayOfWeek < 7) {
          matrix[hour][dayOfWeek]++
          totalIncidents++
          if (matrix[hour][dayOfWeek] > maxValue) {
            maxValue = matrix[hour][dayOfWeek]
          }
        }
      })

      return { matrix, maxValue, totalIncidents }
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_TIME_PATTERNS_ERROR',
        message: 'Failed to fetch time patterns',
        details: error,
      })
    }
  },

  /**
   * Get root cause Pareto data
   */
  async getRootCausePareto(filters: NearMissAnalyticsFilters): Promise<RootCauseParetoData[]> {
    try {
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

      let query = db
        .from('safety_incidents')
        .select('root_cause_category')
        .eq('severity', 'near_miss')
        .is('deleted_at', null)
        .gte('incident_date', ninetyDaysAgo.toISOString().split('T')[0])

      if (filters.company_id) {
        query = query.eq('company_id', filters.company_id)
      }
      if (filters.project_id) {
        query = query.eq('project_id', filters.project_id)
      }

      const { data, error } = await query

      if (error) {throw error}

      // Count by root cause
      const counts: Record<string, number> = {}
      let total = 0

      ;(data || []).forEach((incident: { root_cause_category?: string }) => {
        const cause = incident.root_cause_category || 'unknown'
        counts[cause] = (counts[cause] || 0) + 1
        total++
      })

      // Sort by count descending
      const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([category, count], index, arr) => {
          const percentage = total > 0 ? Math.round((count / total) * 100 * 10) / 10 : 0
          const cumulative = arr
            .slice(0, index + 1)
            .reduce((sum, [, c]) => sum + c, 0)
          const cumulativePercentage = total > 0 ? Math.round((cumulative / total) * 100 * 10) / 10 : 0

          return {
            root_cause_category: category as RootCauseCategory | 'unknown',
            count,
            percentage,
            cumulative_percentage: cumulativePercentage,
          }
        })

      return sorted
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_PARETO_ERROR',
        message: 'Failed to fetch root cause Pareto data',
        details: error,
      })
    }
  },

  /**
   * Detect frequency spikes
   */
  async detectFrequencySpikes(
    companyId: string,
    projectId?: string,
    lookbackDays = 30,
    spikeThreshold = 2.0
  ): Promise<FrequencySpike[]> {
    try {
      const { data, error } = await db.rpc('detect_near_miss_frequency_spikes', {
        p_company_id: companyId,
        p_project_id: projectId || null,
        p_lookback_days: lookbackDays,
        p_spike_threshold: spikeThreshold,
      })

      if (error) {
        // Function might not exist - fall back to JS implementation
        logger.warn('RPC not available, using JS fallback')
        return this._detectFrequencySpikesFallback(companyId, projectId, lookbackDays, spikeThreshold)
      }

      return (data || []) as FrequencySpike[]
    } catch (error) {
      return this._detectFrequencySpikesFallback(companyId, projectId, lookbackDays, spikeThreshold)
    }
  },

  /**
   * Fallback for frequency spike detection
   */
  async _detectFrequencySpikesFallback(
    companyId: string,
    projectId?: string,
    lookbackDays = 30,
    spikeThreshold = 2.0
  ): Promise<FrequencySpike[]> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - lookbackDays)

    let query = db
      .from('safety_incidents')
      .select('incident_date')
      .eq('company_id', companyId)
      .eq('severity', 'near_miss')
      .is('deleted_at', null)
      .gte('incident_date', startDate.toISOString().split('T')[0])

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query

    if (error) {throw error}

    // Count by date
    const dailyCounts: Record<string, number> = {}
    ;(data || []).forEach((incident: { incident_date: string }) => {
      dailyCounts[incident.incident_date] = (dailyCounts[incident.incident_date] || 0) + 1
    })

    const counts = Object.values(dailyCounts)
    if (counts.length === 0) {return []}

    const average = counts.reduce((a, b) => a + b, 0) / counts.length
    const variance = counts.reduce((sum, c) => sum + Math.pow(c - average, 2), 0) / counts.length
    const stdDev = Math.sqrt(variance)

    if (stdDev === 0) {return []}

    const spikes: FrequencySpike[] = []
    Object.entries(dailyCounts).forEach(([date, count]) => {
      const deviationScore = (count - average) / stdDev
      if (deviationScore >= spikeThreshold) {
        spikes.push({
          spike_date: date,
          count,
          average: Math.round(average * 100) / 100,
          std_dev: Math.round(stdDev * 100) / 100,
          deviation_score: Math.round(deviationScore * 100) / 100,
        })
      }
    })

    return spikes.sort((a, b) => b.spike_date.localeCompare(a.spike_date))
  },

  /**
   * Detect location hotspots
   */
  async detectLocationHotspots(
    companyId: string,
    projectId?: string,
    minIncidents = 3,
    days = 30
  ): Promise<LocationHotspot[]> {
    try {
      const { data, error } = await db.rpc('detect_location_hotspots', {
        p_company_id: companyId,
        p_project_id: projectId || null,
        p_min_incidents: minIncidents,
        p_days: days,
      })

      if (error) {
        logger.warn('RPC not available, using JS fallback')
        return this._detectLocationHotspotsFallback(companyId, projectId, minIncidents, days)
      }

      return (data || []) as LocationHotspot[]
    } catch (error) {
      return this._detectLocationHotspotsFallback(companyId, projectId, minIncidents, days)
    }
  },

  /**
   * Fallback for location hotspot detection
   */
  async _detectLocationHotspotsFallback(
    companyId: string,
    projectId?: string,
    minIncidents = 3,
    days = 30
  ): Promise<LocationHotspot[]> {
    const heatMapData = await this.getLocationHeatMap({
      company_id: companyId,
      project_id: projectId,
    })

    return heatMapData
      .filter(loc => loc.incident_count >= minIncidents)
      .map(loc => ({
        location: loc.location,
        zone_id: loc.zone_id,
        incident_count: loc.incident_count,
        high_severity_count: loc.high_severity_count,
        root_causes: loc.root_causes,
        risk_score: loc.risk_score || loc.incident_count + loc.high_severity_count * 3,
      }))
  },

  /**
   * Calculate trend comparison
   */
  async calculateTrend(
    companyId: string,
    projectId?: string,
    periodDays = 30
  ): Promise<TrendCalculation> {
    try {
      const { data, error } = await db.rpc('calculate_near_miss_trend', {
        p_company_id: companyId,
        p_project_id: projectId || null,
        p_period_days: periodDays,
      })

      if (error) {
        logger.warn('RPC not available, using JS fallback')
        return this._calculateTrendFallback(companyId, projectId, periodDays)
      }

      if (!data || data.length === 0) {
        return {
          current_period_count: 0,
          previous_period_count: 0,
          change_percentage: 0,
          trend_direction: 'stable',
          by_category: {},
          by_root_cause: {},
        }
      }

      return data[0] as TrendCalculation
    } catch (error) {
      return this._calculateTrendFallback(companyId, projectId, periodDays)
    }
  },

  /**
   * Fallback for trend calculation
   */
  async _calculateTrendFallback(
    companyId: string,
    projectId?: string,
    periodDays = 30
  ): Promise<TrendCalculation> {
    const now = new Date()
    const currentStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)
    const previousStart = new Date(currentStart.getTime() - periodDays * 24 * 60 * 60 * 1000)

    let baseQuery = db
      .from('safety_incidents')
      .select('incident_date, incident_type, root_cause_category')
      .eq('company_id', companyId)
      .eq('severity', 'near_miss')
      .is('deleted_at', null)

    if (projectId) {
      baseQuery = baseQuery.eq('project_id', projectId)
    }

    const [currentResult, previousResult] = await Promise.all([
      baseQuery.clone().gte('incident_date', currentStart.toISOString().split('T')[0]),
      baseQuery
        .clone()
        .gte('incident_date', previousStart.toISOString().split('T')[0])
        .lt('incident_date', currentStart.toISOString().split('T')[0]),
    ])

    const currentData = currentResult.data || []
    const previousData = previousResult.data || []

    const byCategory: Record<string, number> = {}
    const byRootCause: Record<string, number> = {}

    currentData.forEach((incident: { incident_type?: string; root_cause_category?: string }) => {
      if (incident.incident_type) {
        byCategory[incident.incident_type] = (byCategory[incident.incident_type] || 0) + 1
      }
      if (incident.root_cause_category) {
        byRootCause[incident.root_cause_category] = (byRootCause[incident.root_cause_category] || 0) + 1
      }
    })

    const changePercentage =
      previousData.length === 0
        ? 0
        : Math.round(((currentData.length - previousData.length) / previousData.length) * 100)

    const trendDirection: TrendDirection =
      changePercentage > 5 ? 'increasing' : changePercentage < -5 ? 'decreasing' : 'stable'

    return {
      current_period_count: currentData.length,
      previous_period_count: previousData.length,
      change_percentage: changePercentage,
      trend_direction: trendDirection,
      by_category: byCategory,
      by_root_cause: byRootCause as Record<RootCauseCategory, number>,
    }
  },

  // ============================================================================
  // PATTERNS
  // ============================================================================

  /**
   * Get detected patterns
   */
  async getPatterns(
    companyId: string,
    projectId?: string,
    status?: PatternStatus | PatternStatus[]
  ): Promise<NearMissPattern[]> {
    try {
      let query = db
        .from('near_miss_patterns')
        .select('*')
        .eq('company_id', companyId)
        .order('detection_date', { ascending: false })

      if (projectId) {
        query = query.eq('project_id', projectId)
      }
      if (status) {
        if (Array.isArray(status)) {
          query = query.in('status', status)
        } else {
          query = query.eq('status', status)
        }
      }

      const { data, error } = await query

      if (error) {throw error}

      return (data || []) as NearMissPattern[]
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_PATTERNS_ERROR',
        message: 'Failed to fetch patterns',
        details: error,
      })
    }
  },

  /**
   * Update a pattern
   */
  async updatePattern(id: string, input: UpdatePatternDTO): Promise<NearMissPattern> {
    try {
      const { data, error } = await db
        .from('near_miss_patterns')
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}

      return data as NearMissPattern
    } catch (error) {
      throw new ApiErrorClass({
        code: 'UPDATE_PATTERN_ERROR',
        message: 'Failed to update pattern',
        details: error,
      })
    }
  },

  // ============================================================================
  // ALERTS
  // ============================================================================

  /**
   * Get active alerts
   */
  async getAlerts(
    companyId: string,
    projectId?: string,
    includeRead = false,
    includeDismissed = false
  ): Promise<NearMissAlert[]> {
    try {
      let query = db
        .from('near_miss_alerts')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (projectId) {
        query = query.eq('project_id', projectId)
      }
      if (!includeRead) {
        query = query.eq('is_read', false)
      }
      if (!includeDismissed) {
        query = query.eq('is_dismissed', false)
      }

      const { data, error } = await query

      if (error) {throw error}

      return (data || []) as NearMissAlert[]
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_ALERTS_ERROR',
        message: 'Failed to fetch alerts',
        details: error,
      })
    }
  },

  /**
   * Mark an alert as read
   */
  async markAlertRead(id: string): Promise<void> {
    try {
      await db.from('near_miss_alerts').update({ is_read: true }).eq('id', id)
    } catch (error) {
      logger.error('Failed to mark alert as read:', error)
    }
  },

  /**
   * Dismiss an alert
   */
  async dismissAlert(id: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      await db
        .from('near_miss_alerts')
        .update({
          is_dismissed: true,
          dismissed_by: user?.id,
          dismissed_at: new Date().toISOString(),
        })
        .eq('id', id)
    } catch (error) {
      throw new ApiErrorClass({
        code: 'DISMISS_ALERT_ERROR',
        message: 'Failed to dismiss alert',
        details: error,
      })
    }
  },

  // ============================================================================
  // ZONES & CATEGORIES
  // ============================================================================

  /**
   * Get zones for a project
   */
  async getZones(projectId: string): Promise<NearMissZone[]> {
    try {
      const { data, error } = await db
        .from('near_miss_zones')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('name')

      if (error) {throw error}

      return (data || []) as NearMissZone[]
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_ZONES_ERROR',
        message: 'Failed to fetch zones',
        details: error,
      })
    }
  },

  /**
   * Create a zone
   */
  async createZone(input: CreateZoneDTO): Promise<NearMissZone> {
    try {
      const { data, error } = await db
        .from('near_miss_zones')
        .insert(input)
        .select()
        .single()

      if (error) {throw error}

      return data as NearMissZone
    } catch (error) {
      throw new ApiErrorClass({
        code: 'CREATE_ZONE_ERROR',
        message: 'Failed to create zone',
        details: error,
      })
    }
  },

  /**
   * Get categories for a company
   */
  async getCategories(companyId: string): Promise<NearMissCategory[]> {
    try {
      const { data, error } = await db
        .from('near_miss_categories')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name')

      if (error) {throw error}

      return (data || []) as NearMissCategory[]
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_CATEGORIES_ERROR',
        message: 'Failed to fetch categories',
        details: error,
      })
    }
  },

  /**
   * Create a category
   */
  async createCategory(input: CreateCategoryDTO): Promise<NearMissCategory> {
    try {
      const { data, error } = await db
        .from('near_miss_categories')
        .insert(input)
        .select()
        .single()

      if (error) {throw error}

      return data as NearMissCategory
    } catch (error) {
      throw new ApiErrorClass({
        code: 'CREATE_CATEGORY_ERROR',
        message: 'Failed to create category',
        details: error,
      })
    }
  },

  // ============================================================================
  // THRESHOLDS
  // ============================================================================

  /**
   * Get alert thresholds
   */
  async getThresholds(companyId: string, projectId?: string): Promise<AlertThreshold[]> {
    try {
      let query = db
        .from('near_miss_alert_thresholds')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)

      if (projectId) {
        query = query.or(`project_id.eq.${projectId},project_id.is.null`)
      }

      const { data, error } = await query

      if (error) {throw error}

      return (data || []) as AlertThreshold[]
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_THRESHOLDS_ERROR',
        message: 'Failed to fetch thresholds',
        details: error,
      })
    }
  },

  /**
   * Create an alert threshold
   */
  async createThreshold(input: CreateThresholdDTO): Promise<AlertThreshold> {
    try {
      const { data, error } = await db
        .from('near_miss_alert_thresholds')
        .insert(input)
        .select()
        .single()

      if (error) {throw error}

      return data as AlertThreshold
    } catch (error) {
      throw new ApiErrorClass({
        code: 'CREATE_THRESHOLD_ERROR',
        message: 'Failed to create threshold',
        details: error,
      })
    }
  },

  // ============================================================================
  // REPORTS
  // ============================================================================

  /**
   * Get monthly reports
   */
  async getMonthlyReports(
    companyId: string,
    projectId?: string,
    limit = 12
  ): Promise<MonthlyReport[]> {
    try {
      let query = db
        .from('near_miss_monthly_reports')
        .select('*')
        .eq('company_id', companyId)
        .order('report_month', { ascending: false })
        .limit(limit)

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query

      if (error) {throw error}

      return (data || []) as MonthlyReport[]
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_REPORTS_ERROR',
        message: 'Failed to fetch monthly reports',
        details: error,
      })
    }
  },

  /**
   * Get industry benchmarks
   */
  async getBenchmarks(industryType = 'construction'): Promise<SafetyBenchmark[]> {
    try {
      const { data, error } = await db
        .from('safety_benchmarks')
        .select('*')
        .eq('industry_type', industryType)
        .order('year', { ascending: false })

      if (error) {throw error}

      return (data || []) as SafetyBenchmark[]
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_BENCHMARKS_ERROR',
        message: 'Failed to fetch benchmarks',
        details: error,
      })
    }
  },
}
