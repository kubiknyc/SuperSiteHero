/**
 * Safety Metrics API Service
 *
 * Provides data access for OSHA safety rate calculations:
 * - TRIR (Total Recordable Incident Rate)
 * - DART (Days Away, Restricted, or Transferred)
 * - LTIR (Lost Time Injury Rate)
 * - EMR (Experience Modification Rate)
 */

import { supabase } from '@/lib/supabase'
import { ApiErrorClass } from '../errors'
import { logger } from '@/lib/utils/logger'
import type {
  EmployeeHoursWorked,
  EmployeeHoursWorkedInput,
  SafetyMetrics,
  SafetyMetricsSnapshot,
  SafetyMetricsTrendPoint,
  IndustrySafetyBenchmark,
  EMRRecord,
  EMRRecordInput,
  HoursWorkedFilters,
  MetricsSnapshotFilters,
  MetricsPeriodType,
  SafetyMetricsDashboard,
} from '@/types/safety-metrics'
import {
  calculateAllMetrics,
  calculateScorecard,
  getDefaultBenchmark,
} from '@/features/safety/utils/safetyCalculations'

// Use 'any' cast for tables not in generated types
const db = supabase as any

// ============================================================================
// EMPLOYEE HOURS WORKED
// ============================================================================

export const safetyMetricsApi = {
  /**
   * Get hours worked records
   */
  async getHoursWorked(filters: HoursWorkedFilters = {}): Promise<EmployeeHoursWorked[]> {
    try {
      let query = db
        .from('employee_hours_worked')
        .select('*')
        .order('period_start', { ascending: false })

      if (filters.project_id) {
        query = query.eq('project_id', filters.project_id)
      }
      if (filters.company_id) {
        query = query.eq('company_id', filters.company_id)
      }
      if (filters.period_type) {
        query = query.eq('period_type', filters.period_type)
      }
      if (filters.start_date) {
        query = query.gte('period_start', filters.start_date)
      }
      if (filters.end_date) {
        query = query.lte('period_end', filters.end_date)
      }

      const { data, error } = await query

      if (error) {throw error}
      return (data || []) as EmployeeHoursWorked[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_HOURS_ERROR',
            message: 'Failed to fetch hours worked records',
            details: error,
          })
    }
  },

  /**
   * Get total hours worked for a period
   */
  async getTotalHoursForPeriod(
    companyId: string,
    projectId: string | null,
    startDate: string,
    endDate: string
  ): Promise<{ totalHours: number; avgEmployees: number }> {
    try {
      let query = db
        .from('employee_hours_worked')
        .select('total_hours, average_employees')
        .eq('company_id', companyId)
        .gte('period_start', startDate)
        .lte('period_end', endDate)

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query

      if (error) {throw error}

      const records = data || []
      const totalHours = records.reduce((sum: number, r: any) => sum + (r.total_hours || 0), 0)
      const avgEmployees = records.length > 0
        ? Math.round(records.reduce((sum: number, r: any) => sum + (r.average_employees || 0), 0) / records.length)
        : 0

      return { totalHours, avgEmployees }
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_TOTAL_HOURS_ERROR',
        message: 'Failed to fetch total hours',
        details: error,
      })
    }
  },

  /**
   * Create hours worked record
   */
  async createHoursWorked(input: EmployeeHoursWorkedInput): Promise<EmployeeHoursWorked> {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await db
        .from('employee_hours_worked')
        .insert({
          ...input,
          created_by: user?.id,
        })
        .select()
        .single()

      if (error) {throw error}
      return data as EmployeeHoursWorked
    } catch (error) {
      throw new ApiErrorClass({
        code: 'CREATE_HOURS_ERROR',
        message: 'Failed to create hours worked record',
        details: error,
      })
    }
  },

  /**
   * Update hours worked record
   */
  async updateHoursWorked(
    id: string,
    input: Partial<EmployeeHoursWorkedInput>
  ): Promise<EmployeeHoursWorked> {
    try {
      const { data, error } = await db
        .from('employee_hours_worked')
        .update(input)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as EmployeeHoursWorked
    } catch (error) {
      throw new ApiErrorClass({
        code: 'UPDATE_HOURS_ERROR',
        message: 'Failed to update hours worked record',
        details: error,
      })
    }
  },

  /**
   * Delete hours worked record
   */
  async deleteHoursWorked(id: string): Promise<void> {
    try {
      const { error } = await db
        .from('employee_hours_worked')
        .delete()
        .eq('id', id)

      if (error) {throw error}
    } catch (error) {
      throw new ApiErrorClass({
        code: 'DELETE_HOURS_ERROR',
        message: 'Failed to delete hours worked record',
        details: error,
      })
    }
  },

  // ============================================================================
  // SAFETY METRICS
  // ============================================================================

  /**
   * Get current safety metrics for a company/project
   */
  async getCurrentMetrics(
    companyId: string,
    projectId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<SafetyMetrics> {
    try {
      // Use database function if available
      const { data: metricsData, error: metricsError } = await db.rpc(
        'get_safety_metrics_for_period',
        {
          p_company_id: companyId,
          p_project_id: projectId || null,
          p_start_date: startDate || null,
          p_end_date: endDate || null,
        }
      )

      if (!metricsError && metricsData && metricsData.length > 0) {
        const m = metricsData[0]
        return {
          total_recordable_cases: m.total_recordable_cases || 0,
          deaths: m.deaths || 0,
          days_away_cases: m.days_away_cases || 0,
          restricted_duty_cases: m.restricted_duty_cases || 0,
          job_transfer_cases: m.job_transfer_cases || 0,
          other_recordable_cases: m.other_recordable_cases || 0,
          lost_time_cases: m.lost_time_cases || 0,
          total_days_away: m.total_days_away || 0,
          total_days_restricted: m.total_days_restricted || 0,
          total_hours_worked: m.total_hours_worked || 0,
          average_employees: m.average_employees || 0,
          trir: m.trir,
          dart: m.dart,
          ltir: m.ltir,
          severity_rate: m.severity_rate,
          emr: null,
          period_start: startDate,
          period_end: endDate,
        }
      }

      // Fallback: calculate manually from incidents and hours
      logger.warn('get_safety_metrics_for_period failed, calculating manually')
      return this._calculateMetricsManually(companyId, projectId, startDate, endDate)
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_METRICS_ERROR',
        message: 'Failed to fetch safety metrics',
        details: error,
      })
    }
  },

  /**
   * Manual metrics calculation fallback
   */
  async _calculateMetricsManually(
    companyId: string,
    projectId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<SafetyMetrics> {
    const start = startDate || `${new Date().getFullYear()}-01-01`
    const end = endDate || new Date().toISOString().split('T')[0]

    // Get hours worked
    const { totalHours, avgEmployees } = await this.getTotalHoursForPeriod(
      companyId,
      projectId || null,
      start,
      end
    )

    // Get incidents
    let query = db
      .from('safety_incidents')
      .select('*')
      .eq('company_id', companyId)
      .gte('incident_date', start)
      .lte('incident_date', end)
      .is('deleted_at', null)

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data: incidents, error: incidentsError } = await query

    if (incidentsError) {throw incidentsError}

    const data = incidents || []

    // Calculate counts
    const recordableCases = data.filter((i: any) => i.osha_recordable).length
    const deaths = data.filter((i: any) => i.severity === 'fatality').length
    const daysAwayCases = data.filter((i: any) =>
      (i.days_away_from_work > 0) || (i.days_away_count > 0)
    ).length
    const restrictedCases = data.filter((i: any) =>
      (i.days_restricted_duty > 0) || (i.days_transfer_restriction > 0)
    ).length
    const lostTimeCases = data.filter((i: any) => i.severity === 'lost_time').length
    const daysAway = data.reduce((sum: number, i: any) =>
      sum + Math.max(i.days_away_from_work || 0, i.days_away_count || 0), 0
    )
    const daysRestricted = data.reduce((sum: number, i: any) =>
      sum + Math.max(i.days_restricted_duty || 0, i.days_transfer_restriction || 0), 0
    )

    return calculateAllMetrics({
      recordableCases,
      daysAwayCases,
      restrictedDutyCases: restrictedCases,
      jobTransferCases: 0,
      lostTimeCases,
      deaths,
      daysAway,
      daysRestricted,
      hoursWorked: totalHours,
      averageEmployees: avgEmployees,
    })
  },

  // ============================================================================
  // METRICS SNAPSHOTS
  // ============================================================================

  /**
   * Get metrics snapshots
   */
  async getSnapshots(filters: MetricsSnapshotFilters = {}): Promise<SafetyMetricsSnapshot[]> {
    try {
      let query = db
        .from('safety_metrics_snapshots')
        .select('*')
        .order('snapshot_date', { ascending: false })

      if (filters.company_id) {
        query = query.eq('company_id', filters.company_id)
      }
      if (filters.project_id) {
        query = query.eq('project_id', filters.project_id)
      }
      if (filters.period_type) {
        query = query.eq('period_type', filters.period_type)
      }
      if (filters.year) {
        query = query.eq('year', filters.year)
      }
      if (filters.month) {
        query = query.eq('month', filters.month)
      }
      if (filters.quarter) {
        query = query.eq('quarter', filters.quarter)
      }
      if (filters.start_date) {
        query = query.gte('snapshot_date', filters.start_date)
      }
      if (filters.end_date) {
        query = query.lte('snapshot_date', filters.end_date)
      }

      const { data, error } = await query

      if (error) {throw error}
      return (data || []) as SafetyMetricsSnapshot[]
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_SNAPSHOTS_ERROR',
        message: 'Failed to fetch metrics snapshots',
        details: error,
      })
    }
  },

  /**
   * Create a new metrics snapshot
   */
  async createSnapshot(
    companyId: string,
    projectId: string | null,
    periodType: MetricsPeriodType,
    year: number,
    month?: number,
    quarter?: number
  ): Promise<SafetyMetricsSnapshot> {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Call database function to create snapshot
      const { data, error } = await db.rpc('create_safety_metrics_snapshot', {
        p_company_id: companyId,
        p_project_id: projectId,
        p_period_type: periodType,
        p_year: year,
        p_month: month || null,
        p_quarter: quarter || null,
        p_created_by: user?.id || null,
      })

      if (error) {throw error}

      // Fetch the created snapshot
      const { data: snapshot, error: fetchError } = await db
        .from('safety_metrics_snapshots')
        .select('*')
        .eq('id', data)
        .single()

      if (fetchError) {throw fetchError}
      return snapshot as SafetyMetricsSnapshot
    } catch (error) {
      throw new ApiErrorClass({
        code: 'CREATE_SNAPSHOT_ERROR',
        message: 'Failed to create metrics snapshot',
        details: error,
      })
    }
  },

  // ============================================================================
  // TREND DATA
  // ============================================================================

  /**
   * Get metrics trend data
   */
  async getMetricsTrend(
    companyId: string,
    projectId: string | null,
    periodType: MetricsPeriodType = 'monthly',
    months: number = 12
  ): Promise<SafetyMetricsTrendPoint[]> {
    try {
      // Try database function first
      const { data, error } = await db.rpc('get_safety_metrics_trend', {
        p_company_id: companyId,
        p_project_id: projectId,
        p_period_type: periodType,
        p_months: months,
      })

      if (!error && data) {
        return data as SafetyMetricsTrendPoint[]
      }

      // Fallback: fetch from snapshots table
      const snapshots = await this.getSnapshots({
        company_id: companyId,
        project_id: projectId || undefined,
        period_type: periodType,
      })

      return snapshots
        .slice(0, months)
        .map((s) => ({
          period_label: this._getPeriodLabel(s.period_type, s.year, s.month, s.quarter),
          period_date: s.snapshot_date,
          trir: s.trir,
          dart: s.dart,
          ltir: s.ltir,
          severity_rate: s.severity_rate,
          total_recordable_cases: s.total_recordable_cases,
          hours_worked: s.total_hours_worked,
          industry_avg_trir: s.industry_avg_trir,
        }))
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_TREND_ERROR',
        message: 'Failed to fetch metrics trend',
        details: error,
      })
    }
  },

  _getPeriodLabel(
    periodType: MetricsPeriodType,
    year: number,
    month: number | null,
    quarter: number | null
  ): string {
    switch (periodType) {
      case 'monthly':
        if (month) {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          return `${monthNames[month - 1]} ${year}`
        }
        return `${year}`
      case 'quarterly':
        return quarter ? `Q${quarter} ${year}` : `${year}`
      case 'yearly':
        return `${year}`
      case 'ytd':
        return `${year} YTD`
      default:
        return `${year}`
    }
  },

  // ============================================================================
  // INDUSTRY BENCHMARKS
  // ============================================================================

  /**
   * Get industry benchmarks
   */
  async getBenchmarks(naicsCode?: string, year?: number): Promise<IndustrySafetyBenchmark[]> {
    try {
      let query = db
        .from('industry_safety_benchmarks')
        .select('*')
        .order('year', { ascending: false })

      if (naicsCode) {
        query = query.eq('naics_code', naicsCode)
      }
      if (year) {
        query = query.eq('year', year)
      }

      const { data, error } = await query

      if (error) {throw error}
      return (data || []) as IndustrySafetyBenchmark[]
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_BENCHMARKS_ERROR',
        message: 'Failed to fetch industry benchmarks',
        details: error,
      })
    }
  },

  /**
   * Get benchmark for comparison
   */
  async getBenchmarkForComparison(
    naicsCode: string = '23',
    year: number = new Date().getFullYear()
  ): Promise<IndustrySafetyBenchmark | null> {
    try {
      const { data, error } = await db
        .from('industry_safety_benchmarks')
        .select('*')
        .eq('naics_code', naicsCode)
        .eq('year', year)
        .maybeSingle()

      if (error) {throw error}

      if (!data) {
        // Try previous year
        const { data: prevData } = await db
          .from('industry_safety_benchmarks')
          .select('*')
          .eq('naics_code', naicsCode)
          .eq('year', year - 1)
          .maybeSingle()

        return prevData as IndustrySafetyBenchmark | null
      }

      return data as IndustrySafetyBenchmark
    } catch (error) {
      logger.warn('Failed to fetch benchmark, using defaults:', error)
      // Return default benchmark
      const defaultBenchmark = getDefaultBenchmark(naicsCode)
      if (defaultBenchmark) {
        return {
          id: 'default',
          naics_code: naicsCode,
          industry_name: 'Construction',
          industry_sector: null,
          year,
          avg_trir: defaultBenchmark.trir,
          avg_dart: defaultBenchmark.dart,
          avg_ltir: defaultBenchmark.ltir,
          avg_severity_rate: null,
          median_trir: null,
          percentile_25_trir: null,
          percentile_75_trir: null,
          source: 'Default',
          source_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      }
      return null
    }
  },

  // ============================================================================
  // EMR RECORDS
  // ============================================================================

  /**
   * Get EMR records for a company
   */
  async getEMRRecords(companyId: string): Promise<EMRRecord[]> {
    try {
      const { data, error } = await db
        .from('emr_records')
        .select('*')
        .eq('company_id', companyId)
        .order('effective_date', { ascending: false })

      if (error) {throw error}
      return (data || []) as EMRRecord[]
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_EMR_ERROR',
        message: 'Failed to fetch EMR records',
        details: error,
      })
    }
  },

  /**
   * Get current EMR for a company
   */
  async getCurrentEMR(companyId: string): Promise<EMRRecord | null> {
    try {
      const { data, error } = await db
        .from('emr_records')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_current', true)
        .maybeSingle()

      if (error) {throw error}
      return data as EMRRecord | null
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_CURRENT_EMR_ERROR',
        message: 'Failed to fetch current EMR',
        details: error,
      })
    }
  },

  /**
   * Create EMR record
   */
  async createEMRRecord(input: EMRRecordInput): Promise<EMRRecord> {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // If this is set as current, clear other current records
      if (input.is_current) {
        await db
          .from('emr_records')
          .update({ is_current: false })
          .eq('company_id', input.company_id)
      }

      const { data, error } = await db
        .from('emr_records')
        .insert({
          ...input,
          created_by: user?.id,
        })
        .select()
        .single()

      if (error) {throw error}
      return data as EMRRecord
    } catch (error) {
      throw new ApiErrorClass({
        code: 'CREATE_EMR_ERROR',
        message: 'Failed to create EMR record',
        details: error,
      })
    }
  },

  /**
   * Update EMR record
   */
  async updateEMRRecord(id: string, input: Partial<EMRRecordInput>): Promise<EMRRecord> {
    try {
      // If setting as current, clear other current records first
      if (input.is_current && input.company_id) {
        await db
          .from('emr_records')
          .update({ is_current: false })
          .eq('company_id', input.company_id)
          .neq('id', id)
      }

      const { data, error } = await db
        .from('emr_records')
        .update(input)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as EMRRecord
    } catch (error) {
      throw new ApiErrorClass({
        code: 'UPDATE_EMR_ERROR',
        message: 'Failed to update EMR record',
        details: error,
      })
    }
  },

  /**
   * Delete EMR record
   */
  async deleteEMRRecord(id: string): Promise<void> {
    try {
      const { error } = await db
        .from('emr_records')
        .delete()
        .eq('id', id)

      if (error) {throw error}
    } catch (error) {
      throw new ApiErrorClass({
        code: 'DELETE_EMR_ERROR',
        message: 'Failed to delete EMR record',
        details: error,
      })
    }
  },

  // ============================================================================
  // DASHBOARD DATA
  // ============================================================================

  /**
   * Get complete dashboard data
   */
  async getDashboardData(
    companyId: string,
    projectId?: string,
    year: number = new Date().getFullYear()
  ): Promise<SafetyMetricsDashboard> {
    try {
      const currentMonth = new Date().getMonth() + 1
      const currentDate = new Date().toISOString().split('T')[0]

      // Fetch all data in parallel
      const [
        currentMetrics,
        previousMetrics,
        ytdMetrics,
        benchmark,
        trend,
        emr,
        daysWithoutIncident,
      ] = await Promise.all([
        // Current month metrics
        this.getCurrentMetrics(
          companyId,
          projectId,
          `${year}-${String(currentMonth).padStart(2, '0')}-01`,
          currentDate
        ),
        // Previous month metrics
        this.getCurrentMetrics(
          companyId,
          projectId,
          `${year}-${String(currentMonth - 1 || 12).padStart(2, '0')}-01`,
          `${currentMonth === 1 ? year - 1 : year}-${String(currentMonth - 1 || 12).padStart(2, '0')}-28`
        ).catch(() => null),
        // YTD metrics
        this.getCurrentMetrics(companyId, projectId, `${year}-01-01`, currentDate),
        // Industry benchmark
        this.getBenchmarkForComparison('23', year),
        // Trend data
        this.getMetricsTrend(companyId, projectId || null, 'monthly', 12),
        // Current EMR
        this.getCurrentEMR(companyId),
        // Days without incident
        this._getDaysWithoutIncident(companyId, projectId),
      ])

      // Calculate scorecard
      const scorecard = calculateScorecard(
        ytdMetrics,
        previousMetrics,
        benchmark,
        daysWithoutIncident
      )
      scorecard.company_id = companyId
      scorecard.project_id = projectId
      scorecard.current_emr = emr?.emr_value || null

      return {
        current_metrics: currentMetrics,
        previous_metrics: previousMetrics,
        ytd_metrics: ytdMetrics,
        benchmark,
        trend,
        scorecard,
        period: {
          type: 'monthly',
          year,
          month: currentMonth,
          start_date: `${year}-${String(currentMonth).padStart(2, '0')}-01`,
          end_date: currentDate,
        },
      }
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_DASHBOARD_ERROR',
        message: 'Failed to fetch dashboard data',
        details: error,
      })
    }
  },

  /**
   * Get days since last incident
   */
  async _getDaysWithoutIncident(companyId: string, projectId?: string): Promise<number> {
    try {
      let query = db
        .from('safety_incidents')
        .select('incident_date')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .neq('severity', 'near_miss')
        .order('incident_date', { ascending: false })
        .limit(1)

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query

      if (error) {throw error}

      if (!data || data.length === 0) {
        return 999 // No incidents
      }

      const lastIncident = new Date(data[0].incident_date)
      const today = new Date()
      const diffTime = Math.abs(today.getTime() - lastIncident.getTime())
      return Math.floor(diffTime / (1000 * 60 * 60 * 24))
    } catch (error) {
      logger.error('Failed to calculate days without incident:', error)
      return 0
    }
  },
}
