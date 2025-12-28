/**
 * Historical Bid Analysis API Service
 *
 * Comprehensive bid analysis services:
 * - Vendor bid history and performance tracking
 * - Bid accuracy analysis (estimated vs actual)
 * - Price trend analysis by trade
 * - Vendor recommendation engine
 * - Performance reports and insights
 */

import { supabase } from '@/lib/supabase'
import { ApiErrorClass } from '../errors'
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
  parseISO,
  differenceInDays,
  eachMonthOfInterval,
} from 'date-fns'

import type {
  BidRecord,
  VendorBidHistory,
  BidAccuracyMetrics,
  TradeVariance,
  BidTrendData,
  PriceTrendByTrade,
  VendorRecommendation,
  MarkupDistribution,
  BidPerformanceReport,
  BidAnalysisInsight,
  SeasonalBidPattern,
  BidAnalysisByProjectSize,
  BidAnalysisFilters,
  VendorRecommendationOptions,
  ExportBidAnalysisRequest,
  VendorBidHistoryResponse,
  BidAccuracyResponse,
  BidTrendResponse,
  VendorRecommendationsResponse,
  BidPerformanceReportResponse,
  AccuracyRating,
  TrendDirection,
  ReliabilityLevel,
  getAccuracyRating,
  getReliabilityLevel,
  calculateTrendDirection,
  calculateReliabilityScore,
  calculateWinRate,
  calculateVariancePercentage,
} from '@/types/historical-bid-analysis'

import type { CSIDivision } from '@/types/cost-tracking'

// Using extended Database types for tables not yet in generated types
const db = supabase as any

// ============================================================================
// VENDOR BID HISTORY
// ============================================================================

export const historicalBidAnalysisApi = {
  /**
   * Get comprehensive bid history for a specific vendor
   */
  async getVendorBidHistory(
    vendorId: string,
    options: {
      companyId: string
      dateFrom?: string
      dateTo?: string
      divisions?: string[]
    }
  ): Promise<VendorBidHistoryResponse> {
    try {
      const dateFrom = options.dateFrom || format(subMonths(new Date(), 24), 'yyyy-MM-dd')
      const dateTo = options.dateTo || format(new Date(), 'yyyy-MM-dd')

      // Query bid submissions with project and package details
      let query = db
        .from('bid_submissions')
        .select(`
          id,
          bid_package_id,
          bidder_company_name,
          bidder_contact_name,
          bidder_email,
          subcontractor_id,
          base_bid_amount,
          total_bid_amount,
          submitted_at,
          status,
          is_awarded,
          is_late,
          technical_score,
          quality_score:overall_score,
          bid_packages!inner (
            id,
            name,
            project_id,
            division,
            estimated_value,
            bid_type,
            issue_date,
            bid_due_date,
            projects (
              id,
              name,
              project_number,
              project_type,
              actual_completion_date,
              status
            )
          )
        `)
        .eq('bid_packages.company_id', options.companyId)
        .gte('submitted_at', dateFrom)
        .lte('submitted_at', dateTo)

      // Filter by vendor (could be linked subcontractor or manual entry)
      if (vendorId) {
        query = query.or(`subcontractor_id.eq.${vendorId},bidder_company_name.ilike.%${vendorId}%`)
      }

      if (options.divisions && options.divisions.length > 0) {
        query = query.in('bid_packages.division', options.divisions)
      }

      const { data: submissions, error } = await query.order('submitted_at', { ascending: false })

      if (error) {throw new ApiErrorClass(error.message, 500, 'DATABASE_ERROR')}
      if (!submissions || submissions.length === 0) {
        throw new ApiErrorClass('No bid history found for vendor', 404, 'NOT_FOUND')
      }

      // Transform to BidRecord format
      const bidRecords: BidRecord[] = await Promise.all(
        submissions.map(async (sub: any) => {
          const pkg = sub.bid_packages
          const project = pkg?.projects

          // Get actual cost from cost tracking if project is completed
          let actualCost: number | null = null
          if (project?.actual_completion_date && pkg?.division) {
            const { data: costData } = await db
              .from('project_budgets')
              .select('actual_cost')
              .eq('project_id', project.id)
              .eq('division', pkg.division)
              .single()

            actualCost = costData?.actual_cost || null
          }

          // Calculate response time
          let responseTimeDays: number | null = null
          if (pkg?.issue_date && sub.submitted_at) {
            responseTimeDays = differenceInDays(
              parseISO(sub.submitted_at),
              parseISO(pkg.issue_date)
            )
          }

          // Get division name
          const divisionName = pkg?.division ? getDivisionName(pkg.division) : null

          return {
            id: sub.id,
            bid_package_id: sub.bid_package_id,
            package_name: pkg?.name || 'Unknown Package',
            project_id: project?.id || '',
            project_name: project?.name || 'Unknown Project',
            project_type: project?.project_type || null,
            submitted_at: sub.submitted_at,
            base_bid_amount: sub.base_bid_amount || 0,
            total_bid_amount: sub.total_bid_amount || sub.base_bid_amount || 0,
            status: sub.status,
            is_awarded: sub.is_awarded || false,
            estimated_value: pkg?.estimated_value || null,
            actual_cost: actualCost,
            bid_type: pkg?.bid_type || 'lump_sum',
            division: pkg?.division || null,
            division_name: divisionName,
            response_time_days: responseTimeDays,
            was_late: sub.is_late || false,
            project_completed: !!project?.actual_completion_date,
            quality_score: sub.quality_score || null,
          }
        })
      )

      // Calculate aggregate metrics
      const totalBids = bidRecords.length
      const wins = bidRecords.filter(b => b.is_awarded).length
      const winRate = calculateWinRate(wins, totalBids)
      const losses = totalBids - wins

      const totalBidValue = bidRecords.reduce((sum, b) => sum + b.total_bid_amount, 0)
      const averageBidAmount = totalBidValue / totalBids

      const sortedAmounts = [...bidRecords].sort((a, b) => a.total_bid_amount - b.total_bid_amount)
      const medianBidAmount = sortedAmounts[Math.floor(sortedAmounts.length / 2)]?.total_bid_amount || 0

      // Calculate average markup (where we have estimated vs actual)
      const bidsWithEstimate = bidRecords.filter(b => b.estimated_value && b.estimated_value > 0)
      const totalMarkup = bidsWithEstimate.reduce((sum, b) => {
        const markup = ((b.total_bid_amount - b.estimated_value!) / b.estimated_value!) * 100
        return sum + markup
      }, 0)
      const averageMarkup = bidsWithEstimate.length > 0 ? totalMarkup / bidsWithEstimate.length : 0

      // Get unique trades
      const trades = [...new Set(bidRecords.map(b => b.division).filter(Boolean))] as string[]

      // Determine primary trades (top 3 by frequency)
      const tradeCounts = trades.reduce((acc, trade) => {
        acc[trade] = bidRecords.filter(b => b.division === trade).length
        return acc
      }, {} as Record<string, number>)

      const primaryTrades = Object.entries(tradeCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([trade]) => trade)

      // Response time metrics
      const bidsWithResponseTime = bidRecords.filter(b => b.response_time_days !== null)
      const averageResponseTimeDays = bidsWithResponseTime.length > 0
        ? bidsWithResponseTime.reduce((sum, b) => sum + b.response_time_days!, 0) / bidsWithResponseTime.length
        : 0

      const lateBids = bidRecords.filter(b => b.was_late).length
      const lateBidRate = (lateBids / totalBids) * 100

      // Performance metrics
      const completedProjects = bidRecords.filter(b => b.is_awarded && b.project_completed).length
      const completionRate = wins > 0 ? (completedProjects / wins) * 100 : 0

      const qualityScores = bidRecords.filter(b => b.quality_score !== null).map(b => b.quality_score!)
      const averageQualityScore = qualityScores.length > 0
        ? qualityScores.reduce((sum, s) => sum + s, 0) / qualityScores.length
        : null

      // Calculate reliability score
      const reliabilityScore = calculateReliabilityScore({
        completion_rate: completionRate,
        win_rate: winRate,
        on_time_rate: 100 - lateBidRate,
        quality_score: averageQualityScore,
      })
      const reliabilityLevel = getReliabilityLevel(reliabilityScore)

      // Recent trends (last 12 months)
      const twelveMonthsAgo = format(subMonths(new Date(), 12), 'yyyy-MM-dd')
      const recentBids = bidRecords.filter(b => b.submitted_at >= twelveMonthsAgo)
      const recentWins = recentBids.filter(b => b.is_awarded).length
      const recentWinRate = calculateWinRate(recentWins, recentBids.length)

      const winRateTrend: TrendDirection = recentWinRate > winRate + 5 ? 'increasing'
        : recentWinRate < winRate - 5 ? 'decreasing'
        : 'stable'

      // Markup trend
      const recentBidsWithEstimate = recentBids.filter(b => b.estimated_value && b.estimated_value > 0)
      const recentMarkup = recentBidsWithEstimate.length > 0
        ? recentBidsWithEstimate.reduce((sum, b) => {
            const markup = ((b.total_bid_amount - b.estimated_value!) / b.estimated_value!) * 100
            return sum + markup
          }, 0) / recentBidsWithEstimate.length
        : averageMarkup

      const markupTrend: TrendDirection = recentMarkup > averageMarkup + 2 ? 'increasing'
        : recentMarkup < averageMarkup - 2 ? 'decreasing'
        : 'stable'

      const vendorInfo = submissions[0]
      const result: VendorBidHistory = {
        vendor_id: vendorInfo.subcontractor_id || null,
        vendor_name: vendorInfo.bidder_company_name || 'Unknown Vendor',
        contact_name: vendorInfo.bidder_contact_name || null,
        contact_email: vendorInfo.bidder_email || null,
        total_bids: totalBids,
        wins,
        win_rate: winRate,
        losses,
        total_bid_value: totalBidValue,
        average_bid_amount: Math.round(averageBidAmount),
        median_bid_amount: Math.round(medianBidAmount),
        min_bid_amount: Math.round(sortedAmounts[0]?.total_bid_amount || 0),
        max_bid_amount: Math.round(sortedAmounts[sortedAmounts.length - 1]?.total_bid_amount || 0),
        average_markup: Math.round(averageMarkup * 10) / 10,
        primary_trades: primaryTrades,
        trades,
        average_response_time_days: Math.round(averageResponseTimeDays * 10) / 10,
        late_bids: lateBids,
        late_bid_rate: Math.round(lateBidRate * 10) / 10,
        completed_projects: completedProjects,
        completion_rate: Math.round(completionRate * 10) / 10,
        average_quality_score: averageQualityScore ? Math.round(averageQualityScore * 10) / 10 : null,
        reliability_score,
        reliability_level: reliabilityLevel,
        bid_history: bidRecords,
        recent_win_rate: recentWinRate,
        win_rate_trend: winRateTrend,
        markup_trend: markupTrend,
      }

      return {
        success: true,
        data: result,
        metadata: {
          queried_at: new Date().toISOString(),
          date_range: {
            from: dateFrom,
            to: dateTo,
          },
        },
      }
    } catch (error) {
      if (error instanceof ApiErrorClass) {throw error}
      throw new ApiErrorClass(
        error instanceof Error ? error.message : 'Failed to fetch vendor bid history',
        500,
        'FETCH_ERROR'
      )
    }
  },

  /**
   * Get win rate statistics for a vendor
   */
  async getVendorWinRate(
    vendorId: string,
    companyId: string,
    options?: {
      dateFrom?: string
      dateTo?: string
      division?: string
    }
  ): Promise<{
    vendor_name: string
    win_rate: number
    wins: number
    total_bids: number
    average_markup: number
    by_division: {
      division: string
      division_name: string
      win_rate: number
      wins: number
      total_bids: number
    }[]
  }> {
    try {
      const history = await this.getVendorBidHistory(vendorId, {
        companyId,
        dateFrom: options?.dateFrom,
        dateTo: options?.dateTo,
        divisions: options?.division ? [options.division] : undefined,
      })

      const byDivision = history.data.trades.map(div => {
        const divBids = history.data.bid_history.filter(b => b.division === div)
        const divWins = divBids.filter(b => b.is_awarded).length

        return {
          division: div,
          division_name: getDivisionName(div),
          win_rate: calculateWinRate(divWins, divBids.length),
          wins: divWins,
          total_bids: divBids.length,
        }
      })

      return {
        vendor_name: history.data.vendor_name,
        win_rate: history.data.win_rate,
        wins: history.data.wins,
        total_bids: history.data.total_bids,
        average_markup: history.data.average_markup,
        by_division: byDivision,
      }
    } catch (error) {
      if (error instanceof ApiErrorClass) {throw error}
      throw new ApiErrorClass(
        error instanceof Error ? error.message : 'Failed to fetch vendor win rate',
        500,
        'FETCH_ERROR'
      )
    }
  },

  /**
   * Analyze bid accuracy (estimated vs actual costs)
   */
  async getBidAccuracyAnalysis(
    projectId: string,
    options?: {
      companyId?: string
      includeIncomplete?: boolean
    }
  ): Promise<BidAccuracyResponse> {
    try {
      // Get project details
      const { data: project, error: projectError } = await db
        .from('projects')
        .select('id, name, project_number, company_id, actual_completion_date, status')
        .eq('id', projectId)
        .single()

      if (projectError) {throw new ApiErrorClass(projectError.message, 500, 'DATABASE_ERROR')}

      // Get all awarded bid packages for this project
      const { data: packages, error: packagesError } = await db
        .from('bid_packages')
        .select(`
          id,
          name,
          division,
          estimated_value,
          bid_submissions!inner (
            id,
            base_bid_amount,
            total_bid_amount,
            is_awarded
          )
        `)
        .eq('project_id', projectId)
        .eq('bid_submissions.is_awarded', true)

      if (packagesError) {throw new ApiErrorClass(packagesError.message, 500, 'DATABASE_ERROR')}
      if (!packages || packages.length === 0) {
        throw new ApiErrorClass('No awarded bids found for project', 404, 'NOT_FOUND')
      }

      // Get actual costs by division from project budgets
      const { data: budgets, error: budgetsError } = await db
        .from('project_budgets')
        .select(`
          id,
          cost_code_id,
          original_budget,
          actual_cost,
          cost_codes!inner (
            code,
            name,
            division
          )
        `)
        .eq('project_id', projectId)

      if (budgetsError) {throw new ApiErrorClass(budgetsError.message, 500, 'DATABASE_ERROR')}

      // Group actual costs by division
      const actualCostsByDivision = (budgets || []).reduce((acc, budget: any) => {
        const division = budget.cost_codes?.division
        if (division) {
          if (!acc[division]) {
            acc[division] = {
              estimated: 0,
              actual: 0,
              items: 0,
            }
          }
          acc[division].estimated += budget.original_budget || 0
          acc[division].actual += budget.actual_cost || 0
          acc[division].items += 1
        }
        return acc
      }, {} as Record<string, { estimated: number; actual: number; items: number }>)

      // Calculate variance by trade
      const byTrade: TradeVariance[] = Object.entries(actualCostsByDivision).map(([division, data]) => {
        const variance = data.actual - data.estimated
        const variancePercentage = calculateVariancePercentage(data.actual, data.estimated)
        const accuracyRating = getAccuracyRating(variancePercentage)

        return {
          division,
          division_name: getDivisionName(division),
          csi_code: division,
          estimated_amount: data.estimated,
          actual_amount: data.actual,
          variance,
          variance_percentage: variancePercentage,
          line_item_count: data.items,
          is_over_budget: variance > 0,
          accuracy_rating: accuracyRating,
        }
      })

      // Calculate overall metrics
      const estimatedTotal = byTrade.reduce((sum, t) => sum + t.estimated_amount, 0)
      const actualTotal = byTrade.reduce((sum, t) => sum + t.actual_amount, 0)
      const variance = actualTotal - estimatedTotal
      const variancePercentage = calculateVariancePercentage(actualTotal, estimatedTotal)
      const accuracyRating = getAccuracyRating(variancePercentage)

      const overBudgetItems = byTrade.filter(t => t.is_over_budget).length
      const underBudgetItems = byTrade.filter(t => !t.is_over_budget && t.variance < 0).length
      const onBudgetItems = byTrade.filter(t => Math.abs(t.variance_percentage) <= 5).length

      // Find largest variances
      const sortedByVariance = [...byTrade].sort((a, b) => b.variance - a.variance)
      const largestOverrun = sortedByVariance.find(t => t.variance > 0) || null
      const largestSavings = sortedByVariance.reverse().find(t => t.variance < 0) || null

      // Determine data quality
      const completedTrades = byTrade.filter(t => t.actual_amount > 0).length
      const dataQuality: 'complete' | 'partial' | 'incomplete' =
        completedTrades === byTrade.length ? 'complete'
        : completedTrades > 0 ? 'partial'
        : 'incomplete'

      const metrics: BidAccuracyMetrics = {
        project_id: projectId,
        project_name: project.name,
        project_number: project.project_number,
        estimated_total: estimatedTotal,
        actual_total: actualTotal,
        variance,
        variance_percentage: variancePercentage,
        accuracy_rating: accuracyRating,
        by_trade: byTrade,
        total_line_items: byTrade.length,
        over_budget_items: overBudgetItems,
        under_budget_items: underBudgetItems,
        on_budget_items: onBudgetItems,
        largest_overrun: largestOverrun,
        largest_savings: largestSavings,
        analysis_date: new Date().toISOString(),
        completion_date: project.actual_completion_date,
        data_quality: dataQuality,
      }

      return {
        success: true,
        data: [metrics],
        summary: {
          total_projects: 1,
          average_accuracy: Math.abs(variancePercentage),
          total_variance: variance,
        },
      }
    } catch (error) {
      if (error instanceof ApiErrorClass) {throw error}
      throw new ApiErrorClass(
        error instanceof Error ? error.message : 'Failed to analyze bid accuracy',
        500,
        'ANALYSIS_ERROR'
      )
    }
  },

  /**
   * Get price variance by trade type
   */
  async getPriceVarianceByTrade(
    tradeType: string,
    companyId: string,
    options?: {
      dateFrom?: string
      dateTo?: string
    }
  ): Promise<{
    division: string
    division_name: string
    average_variance_percentage: number
    variance_count: number
    over_budget_count: number
    under_budget_count: number
    total_estimated: number
    total_actual: number
    projects_analyzed: number
  }> {
    try {
      const dateFrom = options?.dateFrom || format(subMonths(new Date(), 12), 'yyyy-MM-dd')
      const dateTo = options?.dateTo || format(new Date(), 'yyyy-MM-dd')

      // Get completed projects with budgets in this trade
      const { data: budgets, error } = await db
        .from('project_budgets')
        .select(`
          id,
          project_id,
          original_budget,
          actual_cost,
          cost_codes!inner (
            division
          ),
          projects!inner (
            id,
            actual_completion_date,
            company_id
          )
        `)
        .eq('projects.company_id', companyId)
        .eq('cost_codes.division', tradeType)
        .gte('projects.actual_completion_date', dateFrom)
        .lte('projects.actual_completion_date', dateTo)
        .not('actual_cost', 'is', null)

      if (error) {throw new ApiErrorClass(error.message, 500, 'DATABASE_ERROR')}

      if (!budgets || budgets.length === 0) {
        return {
          division: tradeType,
          division_name: getDivisionName(tradeType),
          average_variance_percentage: 0,
          variance_count: 0,
          over_budget_count: 0,
          under_budget_count: 0,
          total_estimated: 0,
          total_actual: 0,
          projects_analyzed: 0,
        }
      }

      const variances = budgets.map((b: any) => {
        const variance = (b.actual_cost - b.original_budget) / b.original_budget * 100
        return {
          variance,
          isOver: variance > 0,
          estimated: b.original_budget,
          actual: b.actual_cost,
        }
      })

      const avgVariance = variances.reduce((sum, v) => sum + Math.abs(v.variance), 0) / variances.length
      const overCount = variances.filter(v => v.isOver).length
      const underCount = variances.filter(v => !v.isOver).length
      const totalEstimated = variances.reduce((sum, v) => sum + v.estimated, 0)
      const totalActual = variances.reduce((sum, v) => sum + v.actual, 0)

      const uniqueProjects = new Set(budgets.map((b: any) => b.project_id)).size

      return {
        division: tradeType,
        division_name: getDivisionName(tradeType),
        average_variance_percentage: Math.round(avgVariance * 10) / 10,
        variance_count: variances.length,
        over_budget_count: overCount,
        under_budget_count: underCount,
        total_estimated: totalEstimated,
        total_actual: totalActual,
        projects_analyzed: uniqueProjects,
      }
    } catch (error) {
      if (error instanceof ApiErrorClass) {throw error}
      throw new ApiErrorClass(
        error instanceof Error ? error.message : 'Failed to analyze price variance',
        500,
        'ANALYSIS_ERROR'
      )
    }
  },

  /**
   * Analyze bid trends over time
   */
  async getBidTrendAnalysis(
    companyId: string,
    dateRange: {
      from: string
      to: string
    }
  ): Promise<BidTrendResponse> {
    try {
      const startDate = parseISO(dateRange.from)
      const endDate = parseISO(dateRange.to)

      // Generate month intervals
      const months = eachMonthOfInterval({ start: startDate, end: endDate })

      // Get all bid submissions in date range
      const { data: submissions, error } = await db
        .from('bid_submissions')
        .select(`
          id,
          submitted_at,
          base_bid_amount,
          total_bid_amount,
          is_awarded,
          bid_packages!inner (
            id,
            estimated_value,
            company_id
          )
        `)
        .eq('bid_packages.company_id', companyId)
        .gte('submitted_at', dateRange.from)
        .lte('submitted_at', dateRange.to)

      if (error) {throw new ApiErrorClass(error.message, 500, 'DATABASE_ERROR')}

      const trendData: BidTrendData[] = months.map((month, index) => {
        const monthStart = startOfMonth(month)
        const monthEnd = endOfMonth(month)
        const monthKey = format(month, 'yyyy-MM')

        // Filter submissions for this month
        const monthSubmissions = (submissions || []).filter((s: any) => {
          const subDate = parseISO(s.submitted_at)
          return subDate >= monthStart && subDate <= monthEnd
        })

        const bidCount = monthSubmissions.length
        const winCount = monthSubmissions.filter((s: any) => s.is_awarded).length
        const winRate = calculateWinRate(winCount, bidCount)

        const totalBidValue = monthSubmissions.reduce(
          (sum: number, s: any) => sum + (s.total_bid_amount || 0),
          0
        )
        const averageBid = bidCount > 0 ? totalBidValue / bidCount : 0

        // Calculate median
        const sortedBids = monthSubmissions
          .map((s: any) => s.total_bid_amount || 0)
          .sort((a: number, b: number) => a - b)
        const medianBid = bidCount > 0
          ? sortedBids[Math.floor(bidCount / 2)]
          : 0

        // Calculate average markup
        const bidsWithEstimate = monthSubmissions.filter(
          (s: any) => s.bid_packages?.estimated_value && s.bid_packages.estimated_value > 0
        )
        const avgMarkup = bidsWithEstimate.length > 0
          ? bidsWithEstimate.reduce((sum: number, s: any) => {
              const markup = ((s.total_bid_amount - s.bid_packages.estimated_value) / s.bid_packages.estimated_value) * 100
              return sum + markup
            }, 0) / bidsWithEstimate.length
          : 0

        // Calculate markup standard deviation
        let markupStddev: number | null = null
        if (bidsWithEstimate.length > 1) {
          const markups = bidsWithEstimate.map((s: any) =>
            ((s.total_bid_amount - s.bid_packages.estimated_value) / s.bid_packages.estimated_value) * 100
          )
          const mean = avgMarkup
          const variance = markups.reduce((sum: number, m: number) => sum + Math.pow(m - mean, 2), 0) / markups.length
          markupStddev = Math.sqrt(variance)
        }

        // Determine trend direction (compare to previous month)
        let trendDirection: TrendDirection = 'stable'
        let monthOverMonthChange: number | null = null

        if (index > 0) {
          const prevMonth = trendData[index - 1]
          if (prevMonth && prevMonth.average_bid > 0) {
            monthOverMonthChange = ((averageBid - prevMonth.average_bid) / prevMonth.average_bid) * 100
            if (Math.abs(monthOverMonthChange) > 10) {
              trendDirection = monthOverMonthChange > 0 ? 'increasing' : 'decreasing'
            }
          }
        }

        return {
          period: monthKey,
          period_label: format(month, 'MMM yyyy'),
          start_date: format(monthStart, 'yyyy-MM-dd'),
          end_date: format(monthEnd, 'yyyy-MM-dd'),
          bid_count: bidCount,
          win_count: winCount,
          win_rate: winRate,
          total_bid_value: totalBidValue,
          average_bid: Math.round(averageBid),
          median_bid: Math.round(medianBid),
          average_markup: Math.round(avgMarkup * 10) / 10,
          markup_stddev: markupStddev ? Math.round(markupStddev * 10) / 10 : null,
          trend_direction: trendDirection,
          month_over_month_change: monthOverMonthChange ? Math.round(monthOverMonthChange * 10) / 10 : null,
        }
      })

      return {
        success: true,
        data: trendData,
        metadata: {
          periods: trendData.length,
          earliest_date: dateRange.from,
          latest_date: dateRange.to,
        },
      }
    } catch (error) {
      if (error instanceof ApiErrorClass) {throw error}
      throw new ApiErrorClass(
        error instanceof Error ? error.message : 'Failed to analyze bid trends',
        500,
        'ANALYSIS_ERROR'
      )
    }
  },

  /**
   * Get recommended vendors based on historical performance
   */
  async getRecommendedVendors(
    companyId: string,
    options: VendorRecommendationOptions
  ): Promise<VendorRecommendationsResponse> {
    try {
      const limit = options.limit || 10

      // Build query for vendor bid submissions
      let query = db
        .from('bid_submissions')
        .select(`
          id,
          bidder_company_name,
          subcontractor_id,
          base_bid_amount,
          total_bid_amount,
          is_awarded,
          overall_score,
          bid_packages!inner (
            id,
            division,
            estimated_value,
            bid_type,
            project_id,
            company_id,
            projects (
              project_type,
              actual_completion_date
            )
          )
        `)
        .eq('bid_packages.company_id', companyId)

      // Filter by trade type if specified
      if (options.trade_type) {
        query = query.eq('bid_packages.division', options.trade_type)
      }

      // Filter by project type if specified
      if (options.project_type) {
        query = query.eq('bid_packages.projects.project_type', options.project_type)
      }

      const { data: submissions, error } = await query

      if (error) {throw new ApiErrorClass(error.message, 500, 'DATABASE_ERROR')}

      if (!submissions || submissions.length === 0) {
        return {
          success: true,
          data: [],
          metadata: {
            total_evaluated: 0,
            criteria: options,
            generated_at: new Date().toISOString(),
          },
        }
      }

      // Group by vendor
      const vendorMap = new Map<string, any[]>()

      submissions.forEach((sub: any) => {
        const vendorKey = sub.subcontractor_id || sub.bidder_company_name
        if (!vendorMap.has(vendorKey)) {
          vendorMap.set(vendorKey, [])
        }
        vendorMap.get(vendorKey)!.push(sub)
      })

      // Score each vendor
      const recommendations: VendorRecommendation[] = []

      for (const [vendorKey, vendorSubs] of vendorMap.entries()) {
        const totalBids = vendorSubs.length
        const wins = vendorSubs.filter(s => s.is_awarded).length
        const winRate = calculateWinRate(wins, totalBids)

        // Calculate markup
        const subsWithEstimate = vendorSubs.filter(
          s => s.bid_packages?.estimated_value && s.bid_packages.estimated_value > 0
        )
        const avgMarkup = subsWithEstimate.length > 0
          ? subsWithEstimate.reduce((sum, s) => {
              const markup = ((s.total_bid_amount - s.bid_packages.estimated_value) / s.bid_packages.estimated_value) * 100
              return sum + markup
            }, 0) / subsWithEstimate.length
          : 0

        // Completion metrics
        const completedProjects = vendorSubs.filter(
          s => s.is_awarded && s.bid_packages?.projects?.actual_completion_date
        ).length
        const completionRate = wins > 0 ? (completedProjects / wins) * 100 : 0

        // Quality score
        const qualityScores = vendorSubs.filter(s => s.overall_score !== null)
        const avgQualityScore = qualityScores.length > 0
          ? qualityScores.reduce((sum, s) => sum + s.overall_score, 0) / qualityScores.length
          : null

        // Relevance metrics
        const similarProjects = options.project_type
          ? vendorSubs.filter(s => s.bid_packages?.projects?.project_type === options.project_type).length
          : 0

        const sameTradeBids = options.trade_type
          ? vendorSubs.filter(s => s.bid_packages?.division === options.trade_type).length
          : totalBids

        // Recent activity (last 6 months)
        const sixMonthsAgo = format(subMonths(new Date(), 6), 'yyyy-MM-dd')
        const recentActivity = vendorSubs.some(
          s => s.bid_packages?.created_at >= sixMonthsAgo
        )

        // Calculate score breakdown
        const winRateScore = Math.min(winRate / 2, 25) // Max 25 points
        const pricingScore = Math.max(25 - (Math.abs(avgMarkup) / 2), 0) // Lower markup = higher score
        const reliabilityScore = (completionRate / 100) * 25 // Max 25 points
        const experienceScore = Math.min((totalBids / 10) * 25, 25) // Max 25 points

        const totalScore = winRateScore + pricingScore + reliabilityScore + experienceScore

        // Determine confidence level
        const confidence: 'high' | 'medium' | 'low' =
          totalBids >= 10 && sameTradeBids >= 5 ? 'high'
          : totalBids >= 5 ? 'medium'
          : 'low'

        // Generate reasons and concerns
        const reasons: string[] = []
        const concerns: string[] = []

        if (winRate > 30) {reasons.push(`Strong win rate of ${winRate.toFixed(1)}%`)}
        if (completionRate >= 90) {reasons.push(`Excellent completion rate of ${completionRate.toFixed(1)}%`)}
        if (avgMarkup < 15) {reasons.push(`Competitive pricing with ${avgMarkup.toFixed(1)}% average markup`)}
        if (similarProjects >= 3) {reasons.push(`${similarProjects} similar projects completed`)}
        if (avgQualityScore && avgQualityScore >= 80) {reasons.push(`High quality score of ${avgQualityScore.toFixed(1)}`)}

        if (totalBids < 5) {concerns.push('Limited bid history')}
        if (winRate < 15) {concerns.push('Low win rate may indicate pricing issues')}
        if (completionRate < 70) {concerns.push('Below-average completion rate')}
        if (!recentActivity) {concerns.push('No recent bidding activity')}

        const vendorInfo = vendorSubs[0]
        const reliabilityLevel = getReliabilityLevel(totalScore)

        recommendations.push({
          rank: 0, // Will be set after sorting
          vendor_id: vendorInfo.subcontractor_id || null,
          vendor_name: vendorInfo.bidder_company_name,
          score: Math.round(totalScore * 10) / 10,
          score_breakdown: {
            win_rate_score: Math.round(winRateScore * 10) / 10,
            pricing_score: Math.round(pricingScore * 10) / 10,
            reliability_score: Math.round(reliabilityScore * 10) / 10,
            experience_score: Math.round(experienceScore * 10) / 10,
          },
          win_rate: winRate,
          average_markup: Math.round(avgMarkup * 10) / 10,
          completion_rate: Math.round(completionRate * 10) / 10,
          quality_score: avgQualityScore ? Math.round(avgQualityScore * 10) / 10 : null,
          similar_projects: similarProjects,
          same_trade_bids: sameTradeBids,
          recent_activity: recentActivity,
          reliability_level: reliabilityLevel,
          on_time_delivery: Math.round(completionRate * 10) / 10, // Use completion rate as proxy for on-time delivery
          confidence,
          reasons,
          concerns,
        })
      }

      // Sort by score and set ranks
      recommendations.sort((a, b) => b.score - a.score)
      recommendations.forEach((rec, index) => {
        rec.rank = index + 1
      })

      // Limit results
      const topRecommendations = recommendations.slice(0, limit)

      return {
        success: true,
        data: topRecommendations,
        metadata: {
          total_evaluated: vendorMap.size,
          criteria: options,
          generated_at: new Date().toISOString(),
        },
      }
    } catch (error) {
      if (error instanceof ApiErrorClass) {throw error}
      throw new ApiErrorClass(
        error instanceof Error ? error.message : 'Failed to generate vendor recommendations',
        500,
        'RECOMMENDATION_ERROR'
      )
    }
  },

  /**
   * Generate comprehensive bid performance report
   */
  async generateBidPerformanceReport(
    companyId: string,
    filters: BidAnalysisFilters
  ): Promise<BidPerformanceReportResponse> {
    try {
      const reportId = crypto.randomUUID()

      // Get bid trends
      const trendsResponse = await this.getBidTrendAnalysis(companyId, {
        from: filters.date_from,
        to: filters.date_to,
      })

      // Get all submissions with full details for analysis
      const { data: allSubmissions, error: allSubsError } = await db
        .from('bid_submissions')
        .select(`
          id,
          bidder_company_name,
          subcontractor_id,
          base_bid_amount,
          total_bid_amount,
          is_awarded,
          submitted_at,
          bid_packages!inner (
            id,
            company_id,
            division,
            estimated_value,
            projects (
              id,
              name,
              project_number,
              actual_completion_date,
              scheduled_completion_date
            )
          )
        `)
        .eq('bid_packages.company_id', companyId)
        .gte('submitted_at', filters.date_from)
        .lte('submitted_at', filters.date_to)

      if (allSubsError) {throw new ApiErrorClass(allSubsError.message, 500, 'DATABASE_ERROR')}

      const submissions = allSubmissions || []

      // Calculate unique vendors
      const uniqueVendors = new Set<string>()
      submissions.forEach((s: any) => {
        const key = s.subcontractor_id || s.bidder_company_name
        if (key) {uniqueVendors.add(key)}
      })

      // Calculate unique bid packages
      const uniquePackages = new Set<string>()
      submissions.forEach((s: any) => {
        if (s.bid_packages?.id) {uniquePackages.add(s.bid_packages.id)}
      })
      const totalPackages = uniquePackages.size

      // Calculate average bids per package
      const averageBidsPerPackage = totalPackages > 0 ? Math.round((submissions.length / totalPackages) * 10) / 10 : 0

      // Calculate markup values for statistical analysis
      const markupValues: number[] = []
      const markupByTrade: Map<string, number[]> = new Map()

      submissions.forEach((s: any) => {
        const estimated = s.bid_packages?.estimated_value
        if (estimated && estimated > 0) {
          const markup = ((s.total_bid_amount - estimated) / estimated) * 100
          markupValues.push(markup)

          // Track by trade
          const division = s.bid_packages?.division || 'Unknown'
          if (!markupByTrade.has(division)) {
            markupByTrade.set(division, [])
          }
          markupByTrade.get(division)!.push(markup)
        }
      })

      // Calculate markup distribution statistics
      const sortedMarkups = [...markupValues].sort((a, b) => a - b)
      const n = sortedMarkups.length
      const markupMean = n > 0 ? sortedMarkups.reduce((a, b) => a + b, 0) / n : 0
      const markupMedian = n > 0 ? sortedMarkups[Math.floor(n / 2)] : 0
      const markupMin = n > 0 ? sortedMarkups[0] : 0
      const markupMax = n > 0 ? sortedMarkups[n - 1] : 0
      const q1 = n > 3 ? sortedMarkups[Math.floor(n / 4)] : markupMin
      const q3 = n > 3 ? sortedMarkups[Math.floor((3 * n) / 4)] : markupMax
      const iqr = q3 - q1

      // Calculate standard deviation
      const variance = n > 0 ? sortedMarkups.reduce((sum, val) => sum + Math.pow(val - markupMean, 2), 0) / n : 0
      const stdDev = Math.sqrt(variance)

      // Calculate markup ranges
      const ranges = [
        { range: '<0%', min: -Infinity, max: 0 },
        { range: '0-5%', min: 0, max: 5 },
        { range: '5-10%', min: 5, max: 10 },
        { range: '10-15%', min: 10, max: 15 },
        { range: '15-20%', min: 15, max: 20 },
        { range: '>20%', min: 20, max: Infinity },
      ]
      const markupRanges = ranges.map(r => {
        const inRange = markupValues.filter(v => v > r.min && v <= r.max)
        return {
          range: r.range,
          min: r.min === -Infinity ? markupMin : r.min,
          max: r.max === Infinity ? markupMax : r.max,
          count: inRange.length,
          percentage: n > 0 ? Math.round((inRange.length / n) * 1000) / 10 : 0,
          total_value: 0, // Would require full join to calculate
        }
      })

      // Calculate by-trade markup stats
      const byTradeMarkup = Array.from(markupByTrade.entries()).map(([division, values]) => {
        const sorted = [...values].sort((a, b) => a - b)
        const avg = values.reduce((a, b) => a + b, 0) / values.length
        const med = sorted[Math.floor(sorted.length / 2)]
        return {
          division,
          division_name: getDivisionName(division),
          average_markup: Math.round(avg * 10) / 10,
          median_markup: Math.round(med * 10) / 10,
          sample_size: values.length,
        }
      })

      // Calculate variance for completed projects (bid accuracy)
      const completedProjectBids = submissions.filter(
        (s: any) => s.is_awarded && s.bid_packages?.projects?.actual_completion_date
      )
      let totalVariance = 0
      let varianceCount = 0
      completedProjectBids.forEach((s: any) => {
        const estimated = s.bid_packages?.estimated_value
        if (estimated && estimated > 0) {
          const variancePct = ((s.total_bid_amount - estimated) / estimated) * 100
          totalVariance += Math.abs(variancePct)
          varianceCount++
        }
      })
      const avgVariance = varianceCount > 0 ? totalVariance / varianceCount : 0
      const overallAccuracy = getAccuracyRating(avgVariance)

      // Get vendor performance for top vendors
      const vendorPerformance: VendorBidHistory[] = []
      const vendorIds = Array.from(uniqueVendors).slice(0, 20) // Top 20 vendors

      for (const vendorId of vendorIds) {
        try {
          const history = await this.getVendorBidHistory(vendorId, {
            companyId,
            dateFrom: filters.date_from,
            dateTo: filters.date_to,
            divisions: filters.divisions,
          })
          vendorPerformance.push(history.data)
        } catch (_err) {
          // Skip vendors with errors
          continue
        }
      }

      // Sort vendors by total bid value
      vendorPerformance.sort((a, b) => b.total_bid_value - a.total_bid_value)

      // Get top vendor recommendations
      const recommendationsResponse = await this.getRecommendedVendors(companyId, {
        limit: 10,
      })

      // Calculate executive summary from trends
      const totalBids = trendsResponse.data.reduce((sum, t) => sum + t.bid_count, 0)
      const totalBidValue = trendsResponse.data.reduce((sum, t) => sum + t.total_bid_value, 0)
      const totalWins = trendsResponse.data.reduce((sum, t) => sum + t.win_count, 0)
      const overallWinRate = calculateWinRate(totalWins, totalBids)

      // Calculate price trends by trade
      const priceTrends: PriceTrendByTrade[] = Array.from(markupByTrade.entries()).slice(0, 10).map(([division, values]) => {
        const avgMarkup = values.reduce((a, b) => a + b, 0) / values.length
        const stdDevTrade = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - avgMarkup, 2), 0) / values.length)

        return {
          division,
          division_name: getDivisionName(division),
          data_points: [], // Would need time-series data
          trend_direction: calculateTrendDirection(values),
          price_change_6mo: null,
          price_change_12mo: null,
          volatility: Math.round(stdDevTrade * 10) / 10,
          current_average_price: 0,
          market_low: Math.min(...values),
          market_high: Math.max(...values),
        }
      })

      // Generate insights based on the data
      const insights: BidAnalysisInsight[] = []

      // Win rate insight
      if (overallWinRate < 20) {
        insights.push({
          id: crypto.randomUUID(),
          type: 'risk',
          category: 'pricing',
          title: 'Low Win Rate Detected',
          description: `Overall win rate of ${overallWinRate}% is below the typical industry benchmark of 25-30%.`,
          impact: 'high',
          metric_value: overallWinRate,
          metric_label: 'Win Rate',
          action_items: [
            'Review pricing strategies for competitiveness',
            'Analyze winning bids for pricing patterns',
            'Consider targeting different project types',
          ],
          created_at: new Date().toISOString(),
        })
      } else if (overallWinRate > 40) {
        insights.push({
          id: crypto.randomUUID(),
          type: 'opportunity',
          category: 'pricing',
          title: 'Strong Win Rate Performance',
          description: `Win rate of ${overallWinRate}% exceeds industry benchmarks - consider if pricing can be optimized.`,
          impact: 'medium',
          metric_value: overallWinRate,
          metric_label: 'Win Rate',
          action_items: [
            'Evaluate if margins can be increased on future bids',
            'Consider expanding to more competitive markets',
          ],
          created_at: new Date().toISOString(),
        })
      }

      // Variance insight
      if (avgVariance > 15) {
        insights.push({
          id: crypto.randomUUID(),
          type: 'risk',
          category: 'accuracy',
          title: 'High Bid Variance',
          description: `Average variance of ${Math.round(avgVariance)}% indicates estimating accuracy needs improvement.`,
          impact: 'high',
          metric_value: avgVariance,
          metric_label: 'Average Variance',
          action_items: [
            'Review historical estimates vs actuals by trade',
            'Update cost databases with recent pricing',
            'Consider additional estimating reviews',
          ],
          created_at: new Date().toISOString(),
        })
      }

      // Vendor concentration insight
      if (uniqueVendors.size < 5) {
        insights.push({
          id: crypto.randomUUID(),
          type: 'risk',
          category: 'vendor',
          title: 'Limited Vendor Pool',
          description: `Only ${uniqueVendors.size} unique vendors in the analysis period may indicate supply chain risk.`,
          impact: 'medium',
          metric_value: uniqueVendors.size,
          metric_label: 'Unique Vendors',
          action_items: [
            'Develop relationships with additional qualified vendors',
            'Expand prequalification outreach',
          ],
          created_at: new Date().toISOString(),
        })
      }

      const report: BidPerformanceReport = {
        report_id: reportId,
        generated_at: new Date().toISOString(),
        generated_by: null, // Would be set by calling context with auth
        filters,
        date_range: {
          from: filters.date_from,
          to: filters.date_to,
          total_days: differenceInDays(parseISO(filters.date_to), parseISO(filters.date_from)),
        },
        summary: {
          total_bids: totalBids,
          total_bid_value: totalBidValue,
          total_packages: totalPackages,
          unique_vendors: uniqueVendors.size,
          average_bids_per_package: averageBidsPerPackage,
          overall_win_rate: overallWinRate,
          average_markup: Math.round(markupMean * 10) / 10,
          total_variance: Math.round(avgVariance * 10) / 10,
          overall_accuracy: overallAccuracy,
        },
        vendor_performance: vendorPerformance,
        top_vendors: recommendationsResponse.data,
        bid_accuracy: [], // Would require per-project accuracy query
        average_accuracy_rating: overallAccuracy,
        bid_trends: trendsResponse.data,
        price_trends: priceTrends,
        markup_distribution: {
          ranges: markupRanges,
          mean: Math.round(markupMean * 10) / 10,
          median: Math.round(markupMedian * 10) / 10,
          mode: null, // Would require mode calculation
          std_dev: Math.round(stdDev * 10) / 10,
          min: Math.round(markupMin * 10) / 10,
          max: Math.round(markupMax * 10) / 10,
          q1: Math.round(q1 * 10) / 10,
          q2: Math.round(markupMedian * 10) / 10,
          q3: Math.round(q3 * 10) / 10,
          iqr: Math.round(iqr * 10) / 10,
          by_trade: byTradeMarkup,
        },
        insights,
      }

      return {
        success: true,
        data: report,
      }
    } catch (error) {
      if (error instanceof ApiErrorClass) {throw error}
      throw new ApiErrorClass(
        error instanceof Error ? error.message : 'Failed to generate performance report',
        500,
        'REPORT_ERROR'
      )
    }
  },
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get CSI division name from code
 */
function getDivisionName(code: string): string {
  const divisions: Record<string, string> = {
    '01': 'General Requirements',
    '02': 'Existing Conditions',
    '03': 'Concrete',
    '04': 'Masonry',
    '05': 'Metals',
    '06': 'Wood, Plastics, and Composites',
    '07': 'Thermal and Moisture Protection',
    '08': 'Openings',
    '09': 'Finishes',
    '10': 'Specialties',
    '11': 'Equipment',
    '12': 'Furnishings',
    '13': 'Special Construction',
    '14': 'Conveying Equipment',
    '21': 'Fire Suppression',
    '22': 'Plumbing',
    '23': 'HVAC',
    '26': 'Electrical',
    '27': 'Communications',
    '28': 'Electronic Safety and Security',
    '31': 'Earthwork',
    '32': 'Exterior Improvements',
    '33': 'Utilities',
  }

  return divisions[code] || code
}
