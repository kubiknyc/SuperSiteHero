/**
 * Historical Bid Analysis React Query Hooks
 * Provides hooks for accessing bid history and analysis data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth/AuthContext'
import { historicalBidAnalysisApi } from '@/lib/api/services/historical-bid-analysis'
import { format, subMonths } from 'date-fns'
import {
  exportBidAnalysis,
  downloadBidAnalysisExport,
  type BidAnalysisExportData,
} from '../services/bidAnalysisExportService'

import type {
  BidAnalysisFilters,
  VendorRecommendationOptions,
  ExportBidAnalysisRequest,
} from '@/types/historical-bid-analysis'

// Query keys
export const bidAnalysisKeys = {
  all: ['bidAnalysis'] as const,
  vendorHistory: (vendorId: string, filters?: any) =>
    [...bidAnalysisKeys.all, 'vendorHistory', vendorId, filters] as const,
  vendorWinRate: (vendorId: string, options?: any) =>
    [...bidAnalysisKeys.all, 'vendorWinRate', vendorId, options] as const,
  bidAccuracy: (projectId: string) =>
    [...bidAnalysisKeys.all, 'bidAccuracy', projectId] as const,
  priceVariance: (tradeType: string, options?: any) =>
    [...bidAnalysisKeys.all, 'priceVariance', tradeType, options] as const,
  bidTrends: (dateRange: { from: string; to: string }) =>
    [...bidAnalysisKeys.all, 'bidTrends', dateRange] as const,
  recommendations: (options: VendorRecommendationOptions) =>
    [...bidAnalysisKeys.all, 'recommendations', options] as const,
  performanceReport: (filters: BidAnalysisFilters) =>
    [...bidAnalysisKeys.all, 'performanceReport', filters] as const,
}

// ============================================================================
// VENDOR BID HISTORY
// ============================================================================

/**
 * Hook to fetch vendor bid history
 */
export function useVendorBidHistory(
  vendorId: string | undefined,
  options?: {
    dateFrom?: string
    dateTo?: string
    divisions?: string[]
    enabled?: boolean
  }
) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: bidAnalysisKeys.vendorHistory(vendorId || '', {
      dateFrom: options?.dateFrom,
      dateTo: options?.dateTo,
      divisions: options?.divisions,
    }),
    queryFn: async () => {
      if (!vendorId || !userProfile?.company_id) {
        throw new Error('Vendor ID and company ID are required')
      }

      const response = await historicalBidAnalysisApi.getVendorBidHistory(vendorId, {
        companyId: userProfile.company_id,
        dateFrom: options?.dateFrom,
        dateTo: options?.dateTo,
        divisions: options?.divisions,
      })

      return response.data
    },
    enabled: !!vendorId && !!userProfile?.company_id && (options?.enabled !== false),
  })
}

/**
 * Hook to fetch vendor win rate statistics
 */
export function useVendorWinRate(
  vendorId: string | undefined,
  options?: {
    dateFrom?: string
    dateTo?: string
    division?: string
    enabled?: boolean
  }
) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: bidAnalysisKeys.vendorWinRate(vendorId || '', options),
    queryFn: async () => {
      if (!vendorId || !userProfile?.company_id) {
        throw new Error('Vendor ID and company ID are required')
      }

      return await historicalBidAnalysisApi.getVendorWinRate(
        vendorId,
        userProfile.company_id,
        options
      )
    },
    enabled: !!vendorId && !!userProfile?.company_id && (options?.enabled !== false),
  })
}

// ============================================================================
// BID ACCURACY ANALYSIS
// ============================================================================

/**
 * Hook to analyze bid accuracy for a project
 */
export function useBidAccuracyAnalysis(
  projectId: string | undefined,
  options?: {
    includeIncomplete?: boolean
    enabled?: boolean
  }
) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: bidAnalysisKeys.bidAccuracy(projectId || ''),
    queryFn: async () => {
      if (!projectId) {
        throw new Error('Project ID is required')
      }

      const response = await historicalBidAnalysisApi.getBidAccuracyAnalysis(projectId, {
        companyId: userProfile?.company_id,
        includeIncomplete: options?.includeIncomplete,
      })

      return response.data[0]
    },
    enabled: !!projectId && (options?.enabled !== false),
  })
}

/**
 * Hook to get price variance by trade
 */
export function usePriceVarianceByTrade(
  tradeType: string | undefined,
  options?: {
    dateFrom?: string
    dateTo?: string
    enabled?: boolean
  }
) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: bidAnalysisKeys.priceVariance(tradeType || '', options),
    queryFn: async () => {
      if (!tradeType || !userProfile?.company_id) {
        throw new Error('Trade type and company ID are required')
      }

      return await historicalBidAnalysisApi.getPriceVarianceByTrade(
        tradeType,
        userProfile.company_id,
        options
      )
    },
    enabled: !!tradeType && !!userProfile?.company_id && (options?.enabled !== false),
  })
}

// ============================================================================
// BID TRENDS
// ============================================================================

/**
 * Hook to analyze bid trends over time
 */
export function useBidTrendAnalysis(
  dateRange?: {
    from: string
    to: string
  },
  options?: {
    enabled?: boolean
  }
) {
  const { userProfile } = useAuth()

  // Default to last 12 months if no date range provided
  const defaultDateRange = {
    from: format(subMonths(new Date(), 12), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  }

  const range = dateRange || defaultDateRange

  return useQuery({
    queryKey: bidAnalysisKeys.bidTrends(range),
    queryFn: async () => {
      if (!userProfile?.company_id) {
        throw new Error('Company ID is required')
      }

      const response = await historicalBidAnalysisApi.getBidTrendAnalysis(
        userProfile.company_id,
        range
      )

      return response.data
    },
    enabled: !!userProfile?.company_id && (options?.enabled !== false),
  })
}

// ============================================================================
// VENDOR RECOMMENDATIONS
// ============================================================================

/**
 * Hook to get recommended vendors
 */
export function useRecommendedVendors(
  options: VendorRecommendationOptions,
  queryOptions?: {
    enabled?: boolean
  }
) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: bidAnalysisKeys.recommendations(options),
    queryFn: async () => {
      if (!userProfile?.company_id) {
        throw new Error('Company ID is required')
      }

      const response = await historicalBidAnalysisApi.getRecommendedVendors(
        userProfile.company_id,
        options
      )

      return response.data
    },
    enabled: !!userProfile?.company_id && (queryOptions?.enabled !== false),
  })
}

// ============================================================================
// PERFORMANCE REPORTS
// ============================================================================

/**
 * Hook to generate bid performance report
 */
export function useBidPerformanceReport(
  filters: BidAnalysisFilters,
  options?: {
    enabled?: boolean
  }
) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: bidAnalysisKeys.performanceReport(filters),
    queryFn: async () => {
      if (!userProfile?.company_id) {
        throw new Error('Company ID is required')
      }

      const response = await historicalBidAnalysisApi.generateBidPerformanceReport(
        userProfile.company_id,
        filters
      )

      return response.data
    },
    enabled: !!userProfile?.company_id && (options?.enabled !== false),
    // Cache for longer since reports are expensive to generate
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  })
}

/**
 * Hook to generate and cache performance report
 */
export function useGeneratePerformanceReport() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (filters: BidAnalysisFilters) => {
      if (!userProfile?.company_id) {
        throw new Error('Company ID is required')
      }

      const response = await historicalBidAnalysisApi.generateBidPerformanceReport(
        userProfile.company_id,
        filters
      )

      return response.data
    },
    onSuccess: (data, filters) => {
      // Cache the generated report
      queryClient.setQueryData(bidAnalysisKeys.performanceReport(filters), data)
      toast.success('Performance report generated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate report: ${error.message}`)
    },
  })
}

// ============================================================================
// EXPORT FUNCTIONALITY
// ============================================================================

/**
 * Extended export request with data
 */
interface ExportBidAnalysisWithData extends ExportBidAnalysisRequest {
  /** Optional pre-fetched data to export (if not provided, will fetch based on filters) */
  data?: {
    trends?: any[]
    recommendations?: any[]
  }
}

/**
 * Hook to export bid analysis data
 * Generates PDF, Excel, or CSV exports with bid trends and vendor recommendations
 */
export function useExportBidAnalysis() {
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (request: ExportBidAnalysisWithData) => {
      // Fetch data if not provided
      let trends = request.data?.trends || []
      let recommendations = request.data?.recommendations || []

      // If no data provided, fetch it based on filters
      if (trends.length === 0 && userProfile?.company_id) {
        try {
          const trendResponse = await historicalBidAnalysisApi.getBidTrendAnalysis(
            userProfile.company_id,
            {
              from: request.filters.date_from,
              to: request.filters.date_to,
            }
          )
          trends = trendResponse.data || []
        } catch {
          // Continue with empty trends if fetch fails
        }
      }

      if (recommendations.length === 0 && request.include_vendor_details && userProfile?.company_id) {
        try {
          const recResponse = await historicalBidAnalysisApi.getRecommendedVendors(
            userProfile.company_id,
            { limit: 20 }
          )
          recommendations = recResponse.data || []
        } catch {
          // Continue with empty recommendations if fetch fails
        }
      }

      // Prepare export data
      const exportData: BidAnalysisExportData = {
        trends,
        recommendations,
        filters: request.filters,
        summaryMetrics: {
          totalBids: trends.reduce((sum: number, t: any) => sum + (t.bid_count || 0), 0),
          avgAccuracy: 95, // Placeholder - would come from actual accuracy calculation
          topVendorsCount: recommendations.length,
          dateRange: {
            from: request.filters.date_from,
            to: request.filters.date_to,
          },
        },
      }

      // Generate export
      const result = await exportBidAnalysis(request.format, exportData, {
        includeCharts: request.include_charts,
        includeVendorDetails: request.include_vendor_details,
        includeRawData: request.include_raw_data,
        companyName: userProfile?.company_name || undefined,
      })

      // Trigger download
      downloadBidAnalysisExport(result)

      return { success: true, filename: result.filename }
    },
    onSuccess: (data) => {
      toast.success(`Export "${data.filename}" downloaded successfully`)
    },
    onError: (error: Error) => {
      toast.error(`Export failed: ${error.message}`)
    },
  })
}

// ============================================================================
// HELPER HOOKS
// ============================================================================

/**
 * Hook to invalidate all bid analysis queries
 */
export function useInvalidateBidAnalysis() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: bidAnalysisKeys.all })
    toast.success('Analysis data refreshed')
  }
}

/**
 * Hook to prefetch vendor history
 */
export function usePrefetchVendorHistory() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return (vendorId: string, options?: { dateFrom?: string; dateTo?: string }) => {
    if (!userProfile?.company_id) {return}

    queryClient.prefetchQuery({
      queryKey: bidAnalysisKeys.vendorHistory(vendorId, options),
      queryFn: async () => {
        const response = await historicalBidAnalysisApi.getVendorBidHistory(vendorId, {
          companyId: userProfile.company_id!,
          ...options,
        })
        return response.data
      },
    })
  }
}

/**
 * Combined hook for dashboard data
 */
export function useBidAnalysisDashboard(filters?: Partial<BidAnalysisFilters>) {
  useAuth()

  const dateRange = {
    from: filters?.date_from || format(subMonths(new Date(), 12), 'yyyy-MM-dd'),
    to: filters?.date_to || format(new Date(), 'yyyy-MM-dd'),
  }

  const trends = useBidTrendAnalysis(dateRange)
  const recommendations = useRecommendedVendors({ limit: 5 })

  return {
    trends,
    recommendations,
    isLoading: trends.isLoading || recommendations.isLoading,
    isError: trends.isError || recommendations.isError,
    error: trends.error || recommendations.error,
  }
}
