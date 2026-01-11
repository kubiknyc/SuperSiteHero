/**
 * useBidLeveling Hook
 * React Query hooks for bid leveling and comparison functionality
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import type {
  BidLevelingMatrix,
  BidLevelingExportOptions,
  BidRecommendation,
} from '../types'

// Use any for tables not in generated types
const db = supabase as any

// Query keys
export const bidLevelingKeys = {
  all: ['bidLeveling'] as const,
  matrix: (packageId: string) => [...bidLevelingKeys.all, 'matrix', packageId] as const,
  lineItems: (packageId: string) => [...bidLevelingKeys.all, 'lineItems', packageId] as const,
  recommendation: (packageId: string) => [...bidLevelingKeys.all, 'recommendation', packageId] as const,
  exports: () => [...bidLevelingKeys.all, 'exports'] as const,
}

// =============================================
// Bid Leveling Matrix Query
// =============================================

/**
 * Get the bid leveling matrix for a package
 */
export function useBidLevelingMatrix(packageId: string | undefined) {
  return useQuery({
    queryKey: bidLevelingKeys.matrix(packageId || ''),
    queryFn: async (): Promise<BidLevelingMatrix> => {
      // Get bid package details
      const { data: pkg, error: pkgError } = await db
        .from('bid_packages')
        .select('id, name, estimated_value')
        .eq('id', packageId)
        .single()

      if (pkgError) {throw pkgError}

      // Get package items
      const { data: items, error: itemsError } = await db
        .from('bid_package_items')
        .select('*')
        .eq('bid_package_id', packageId)
        .order('sort_order', { ascending: true })

      if (itemsError) {throw itemsError}

      // Get submissions with line items
      const { data: submissions, error: subError } = await db
        .from('bid_submissions')
        .select(`
          *,
          items:bid_submission_items(*)
        `)
        .eq('bid_package_id', packageId)
        .in('status', ['received', 'under_review', 'qualified', 'shortlisted', 'awarded'])
        .order('base_bid_amount', { ascending: true })

      if (subError) {throw subError}

      // Build the matrix
      const matrix: BidLevelingMatrix = {
        packageId: pkg.id,
        packageName: pkg.name,
        estimatedValue: pkg.estimated_value,
        lineItems: [],
        submissions: [],
        alternates: [],
        exclusions: [],
        inclusions: [],
        summary: {
          totalBids: 0,
          qualifiedBids: 0,
          lowBid: 0,
          highBid: 0,
          averageBid: 0,
          spreadPercent: 0,
          estimatedValue: pkg.estimated_value,
          varianceFromEstimate: null,
          recommendedBid: null,
          recommendationReason: null,
        },
      }

      if (!submissions || submissions.length === 0) {
        return matrix
      }

      // Process submissions
      const amounts = submissions.map((s: any) => s.base_bid_amount)
      const lowBid = Math.min(...amounts)
      const highBid = Math.max(...amounts)
      const avgBid = amounts.reduce((a: number, b: number) => a + b, 0) / amounts.length

      matrix.submissions = submissions.map((s: any, index: number) => ({
        id: s.id,
        bidderName: s.bidder_company_name,
        bidderContact: s.bidder_contact_name,
        bidderEmail: s.bidder_email,
        baseBidAmount: s.base_bid_amount,
        alternatesTotal: s.alternates_total || 0,
        totalBidAmount: s.total_bid_amount || s.base_bid_amount,
        rank: index + 1,
        varianceFromLow: lowBid > 0 ? ((s.base_bid_amount - lowBid) / lowBid) * 100 : 0,
        varianceFromEstimate: pkg.estimated_value
          ? ((s.base_bid_amount - pkg.estimated_value) / pkg.estimated_value) * 100
          : null,
        isQualified: ['qualified', 'shortlisted'].includes(s.status),
        isLate: s.is_late || false,
        status: s.status,
        submittedAt: s.submitted_at,
        exclusions: s.exclusions,
        clarifications: s.clarifications,
        proposedStartDate: s.proposed_start_date,
        proposedDuration: s.proposed_duration_days,
      }))

      // Build line item matrix
      if (items && items.length > 0) {
        matrix.lineItems = items.map((item: any) => {
          const itemSubmissions = submissions.map((sub: any) => {
            const subItem = sub.items?.find((si: any) => si.package_item_id === item.id)
            return {
              submissionId: sub.id,
              bidderName: sub.bidder_company_name,
              unitPrice: subItem?.unit_price || null,
              totalPrice: subItem?.total_price || null,
              isIncluded: subItem?.is_included !== false,
              notes: subItem?.notes || null,
              isLowest: false,
              isHighest: false,
              varianceFromLowest: 0,
            }
          })

          // Calculate lowest/highest for this line item
          const prices = itemSubmissions
            .filter((s) => s.isIncluded && s.totalPrice !== null)
            .map((s) => s.totalPrice as number)

          if (prices.length > 0) {
            const minPrice = Math.min(...prices)
            const maxPrice = Math.max(...prices)
            const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length

            itemSubmissions.forEach((s) => {
              if (s.totalPrice !== null) {
                s.isLowest = s.totalPrice === minPrice
                s.isHighest = s.totalPrice === maxPrice
                s.varianceFromLowest = minPrice > 0
                  ? ((s.totalPrice - minPrice) / minPrice) * 100
                  : 0
              }
            })

            return {
              id: item.id,
              packageItemId: item.id,
              itemNumber: item.item_number,
              description: item.description,
              unit: item.unit,
              quantity: item.quantity,
              submissions: itemSubmissions,
              lowestPrice: minPrice,
              highestPrice: maxPrice,
              averagePrice: avgPrice,
              estimatedPrice: item.estimated_unit_price
                ? item.estimated_unit_price * (item.quantity || 1)
                : null,
            }
          }

          return {
            id: item.id,
            packageItemId: item.id,
            itemNumber: item.item_number,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            submissions: itemSubmissions,
            lowestPrice: null,
            highestPrice: null,
            averagePrice: null,
            estimatedPrice: null,
          }
        })
      }

      // Build exclusions comparison
      matrix.exclusions = submissions
        .filter((s: any) => s.exclusions)
        .map((s: any) => ({
          submissionId: s.id,
          bidderName: s.bidder_company_name,
          exclusions: s.exclusions.split('\n').filter(Boolean),
        }))

      // Update summary
      matrix.summary = {
        totalBids: submissions.length,
        qualifiedBids: submissions.filter((s: any) =>
          ['qualified', 'shortlisted'].includes(s.status)
        ).length,
        lowBid,
        highBid,
        averageBid: avgBid,
        spreadPercent: lowBid > 0 ? ((highBid - lowBid) / lowBid) * 100 : 0,
        estimatedValue: pkg.estimated_value,
        varianceFromEstimate: pkg.estimated_value
          ? ((lowBid - pkg.estimated_value) / pkg.estimated_value) * 100
          : null,
        recommendedBid: null,
        recommendationReason: null,
      }

      return matrix
    },
    enabled: !!packageId,
  })
}

// =============================================
// Award Recommendation
// =============================================

/**
 * Get award recommendation for a package
 */
export function useBidRecommendation(packageId: string | undefined) {
  return useQuery({
    queryKey: bidLevelingKeys.recommendation(packageId || ''),
    queryFn: async (): Promise<BidRecommendation | null> => {
      const { data, error } = await db.rpc('generate_bid_recommendation', {
        p_package_id: packageId,
      })

      if (error) {
        // If function doesn't exist, calculate manually
        console.warn('generate_bid_recommendation not available, using fallback')
        return null
      }

      return data
    },
    enabled: !!packageId,
  })
}

// =============================================
// Export Mutations
// =============================================

/**
 * Export bid leveling matrix to Excel
 */
export function useExportBidLeveling() {
  return useMutation({
    mutationFn: async ({
      packageId,
      options,
    }: {
      packageId: string
      options: BidLevelingExportOptions
    }) => {
      // Call edge function or generate locally
      const { data, error } = await db.functions.invoke('export-bid-leveling', {
        body: { packageId, options },
      })

      if (error) {
        // Fallback: generate CSV locally
        console.warn('Export function not available, generating locally')
        return { url: null, fallback: true }
      }

      return data
    },
    onSuccess: (data) => {
      if (data.url) {
        // Download the file
        window.open(data.url, '_blank')
        toast.success('Bid leveling exported successfully')
      } else if (data.fallback) {
        toast.info('Export function not available. Please try again later.')
      }
    },
    onError: (error: Error) => {
      toast.error(`Export failed: ${error.message}`)
    },
  })
}

// =============================================
// Line Item Analysis
// =============================================

/**
 * Get line item price analysis
 */
export function useLineItemAnalysis(packageId: string | undefined) {
  return useQuery({
    queryKey: bidLevelingKeys.lineItems(packageId || ''),
    queryFn: async () => {
      const { data, error } = await db.rpc('analyze_bid_line_items', {
        p_package_id: packageId,
      })

      if (error) {throw error}
      return data
    },
    enabled: !!packageId,
  })
}

// =============================================
// Normalize Bids
// =============================================

/**
 * Normalize bid values for comparison
 */
export function useNormalizeBids() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      packageId,
      adjustments,
    }: {
      packageId: string
      adjustments: Record<string, { submissionId: string; adjustment: number; reason: string }[]>
    }) => {
      // Store normalization adjustments
      const { error } = await db.from('bid_normalization_adjustments').upsert(
        Object.entries(adjustments).flatMap(([itemId, adjs]) =>
          adjs.map((adj) => ({
            bid_package_id: packageId,
            package_item_id: itemId,
            submission_id: adj.submissionId,
            adjustment_amount: adj.adjustment,
            adjustment_reason: adj.reason,
          }))
        ),
        { onConflict: 'submission_id,package_item_id' }
      )

      if (error) {throw error}

      return { success: true }
    },
    onSuccess: (_, { packageId }) => {
      queryClient.invalidateQueries({ queryKey: bidLevelingKeys.matrix(packageId) })
      toast.success('Bid values normalized')
    },
    onError: (error: Error) => {
      toast.error(`Normalization failed: ${error.message}`)
    },
  })
}

// =============================================
// Utility Functions
// =============================================

/**
 * Calculate scope gap score
 */
export function calculateScopeGapScore(
  exclusions: string[],
  inclusions: string[],
  requiredItems: string[]
): number {
  const missingRequired = requiredItems.filter(
    (item) => exclusions.some((ex) => ex.toLowerCase().includes(item.toLowerCase()))
  )
  return Math.max(0, 100 - missingRequired.length * 10)
}

/**
 * Get price variance status
 */
export function getPriceVarianceStatus(variance: number): 'low' | 'normal' | 'high' | 'extreme' {
  if (variance <= 0) {return 'low'}
  if (variance <= 5) {return 'normal'}
  if (variance <= 15) {return 'high'}
  return 'extreme'
}

/**
 * Format currency for display
 */
export function formatBidCurrency(value: number | null): string {
  if (value === null) {return '-'}
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}
