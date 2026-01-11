/**
 * Equipment Rental Optimization Tool
 * Analyzes rental periods, usage, vendor rates, and provides rental vs purchase recommendations
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'

interface OptimizeRentalsInput {
  project_id: string
}

interface CurrentRental {
  id: string
  equipment_name: string
  equipment_type: string
  vendor_name: string
  rental_start: string
  rental_end: string
  daily_rate: number
  weekly_rate: number
  monthly_rate: number
  total_rental_cost: number
  days_rented: number
  days_remaining: number
  actual_usage_days: number
  utilization_percent: number
  status: 'active' | 'scheduled' | 'returned' | 'overdue'
}

interface OptimizationOpportunity {
  rental_id: string
  equipment_name: string
  opportunity_type: 'early_return' | 'extend_rental' | 'rate_change' | 'vendor_switch' | 'consolidate'
  current_cost: number
  optimized_cost: number
  savings: number
  description: string
  action_required: string
  urgency: 'low' | 'medium' | 'high'
}

interface VendorComparison {
  equipment_type: string
  current_vendor: string
  current_rate: number
  alternative_vendors: Array<{
    vendor_name: string
    daily_rate: number
    weekly_rate: number
    monthly_rate: number
    availability: string
    rating: number
    potential_savings: number
  }>
  best_option: string
}

interface RentalVsPurchaseAnalysis {
  equipment_name: string
  equipment_type: string
  total_project_rental_cost: number
  purchase_cost_estimate: number
  resale_value_estimate: number
  net_purchase_cost: number
  break_even_days: number
  project_days_remaining: number
  recommendation: 'rent' | 'purchase'
  reasoning: string
  savings_potential: number
}

interface OptimizeRentalsOutput {
  current_rentals: CurrentRental[]
  optimization_opportunities: OptimizationOpportunity[]
  potential_savings: {
    total_potential_savings: number
    early_return_savings: number
    rate_optimization_savings: number
    vendor_switch_savings: number
    purchase_vs_rent_savings: number
  }
  recommendations: string[]
  vendor_comparisons: VendorComparison[]
  rental_vs_purchase: RentalVsPurchaseAnalysis[]
  summary: {
    total_active_rentals: number
    total_monthly_cost: number
    average_utilization: number
    opportunities_count: number
    high_priority_actions: number
  }
}

export const optimizeRentalsTool = createTool<OptimizeRentalsInput, OptimizeRentalsOutput>({
  name: 'optimize_rentals',
  displayName: 'Optimize Equipment Rentals',
  description: 'Analyzes equipment rental periods vs actual usage, identifies opportunities to return early or extend, compares rental vendors for best rates, and recommends rental vs purchase decisions.',
  category: 'action',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID to analyze equipment rentals for'
      }
    },
    required: ['project_id']
  },
  requiresConfirmation: false,
  estimatedTokens: 1200,

  async execute(input) {
    const { project_id } = input

    const today = new Date()

    // Get project details for timeline context
    const { data: project } = await supabase
      .from('projects')
      .select('id, name, start_date, end_date, status')
      .eq('id', project_id)
      .single()

    const projectEndDate = project?.end_date ? new Date(project.end_date) : null
    const projectDaysRemaining = projectEndDate
      ? Math.max(0, Math.ceil((projectEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
      : 90 // Default assumption

    // Get equipment rentals for the project
    const { data: rentals } = await supabase
      .from('equipment_rentals')
      .select(`
        *,
        vendor:equipment_vendors(id, name, contact_email, contact_phone, rating)
      `)
      .eq('project_id', project_id)
      .is('deleted_at', null)
      .order('rental_start', { ascending: true })

    // Get equipment usage logs for utilization analysis
    const { data: usageLogs } = await supabase
      .from('equipment_usage_logs')
      .select('*')
      .eq('project_id', project_id)
      .is('deleted_at', null)

    // Get available vendors for comparison
    const { data: vendors } = await supabase
      .from('equipment_vendors')
      .select(`
        *,
        equipment_rates(equipment_type, daily_rate, weekly_rate, monthly_rate)
      `)
      .eq('is_active', true)

    // Process current rentals
    const currentRentals: CurrentRental[] = []
    const optimizationOpportunities: OptimizationOpportunity[] = []
    const vendorComparisons: VendorComparison[] = []
    const rentalVsPurchase: RentalVsPurchaseAnalysis[] = []

    let totalPotentialSavings = 0
    let earlyReturnSavings = 0
    let rateOptimizationSavings = 0
    let vendorSwitchSavings = 0
    let purchaseVsRentSavings = 0
    let totalMonthlyRate = 0
    let totalUtilization = 0
    let highPriorityCount = 0

    for (const rental of rentals || []) {
      const rentalStart = new Date(rental.rental_start)
      const rentalEnd = rental.rental_end ? new Date(rental.rental_end) : new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

      const daysRented = Math.ceil((today.getTime() - rentalStart.getTime()) / (1000 * 60 * 60 * 24))
      const daysRemaining = Math.max(0, Math.ceil((rentalEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
      const totalRentalDays = daysRented + daysRemaining

      // Calculate actual usage from logs
      const rentalUsageLogs = (usageLogs || []).filter(
        log => log.equipment_rental_id === rental.id || log.equipment_id === rental.equipment_id
      )
      const actualUsageDays = rentalUsageLogs.length > 0
        ? new Set(rentalUsageLogs.map(log => log.usage_date?.split('T')[0])).size
        : Math.round(daysRented * 0.65) // Estimate 65% utilization if no logs

      const utilizationPercent = daysRented > 0
        ? Math.round((actualUsageDays / daysRented) * 100)
        : 0

      // Determine rental status
      let status: CurrentRental['status'] = 'active'
      if (rentalStart > today) {status = 'scheduled'}
      else if (rental.returned_date) {status = 'returned'}
      else if (rentalEnd < today) {status = 'overdue'}

      // Calculate rates
      const dailyRate = rental.daily_rate || 0
      const weeklyRate = rental.weekly_rate || dailyRate * 5 // Typical 5-day week rate
      const monthlyRate = rental.monthly_rate || dailyRate * 20 // Typical 20-day month rate

      const totalRentalCost = calculateRentalCost(daysRented, dailyRate, weeklyRate, monthlyRate)

      const currentRental: CurrentRental = {
        id: rental.id,
        equipment_name: rental.equipment_name || rental.description || 'Unknown Equipment',
        equipment_type: rental.equipment_type || 'General',
        vendor_name: rental.vendor?.name || rental.vendor_name || 'Unknown Vendor',
        rental_start: rental.rental_start,
        rental_end: rental.rental_end || rentalEnd.toISOString().split('T')[0],
        daily_rate: dailyRate,
        weekly_rate: weeklyRate,
        monthly_rate: monthlyRate,
        total_rental_cost: totalRentalCost,
        days_rented: daysRented,
        days_remaining: daysRemaining,
        actual_usage_days: actualUsageDays,
        utilization_percent: utilizationPercent,
        status
      }

      currentRentals.push(currentRental)

      if (status === 'active' || status === 'scheduled') {
        totalMonthlyRate += monthlyRate
        totalUtilization += utilizationPercent
      }

      // Identify optimization opportunities

      // 1. Early return opportunity (low utilization)
      if (status === 'active' && utilizationPercent < 50 && daysRemaining > 7) {
        const returnSavings = calculateRentalCost(daysRemaining, dailyRate, weeklyRate, monthlyRate)
        earlyReturnSavings += returnSavings

        const urgency = utilizationPercent < 25 ? 'high' : 'medium'
        if (urgency === 'high') {highPriorityCount++}

        optimizationOpportunities.push({
          rental_id: rental.id,
          equipment_name: currentRental.equipment_name,
          opportunity_type: 'early_return',
          current_cost: totalRentalCost + calculateRentalCost(daysRemaining, dailyRate, weeklyRate, monthlyRate),
          optimized_cost: totalRentalCost,
          savings: returnSavings,
          description: `Equipment utilization is only ${utilizationPercent}% - consider returning early`,
          action_required: `Evaluate if ${currentRental.equipment_name} is still needed. ${daysRemaining} rental days remaining.`,
          urgency
        })
      }

      // 2. Rate optimization (switch to better rate tier)
      if (status === 'active' && daysRemaining >= 7) {
        const currentDailyCost = dailyRate * daysRemaining
        const weeklyEquivalent = weeklyRate * Math.ceil(daysRemaining / 7)
        const monthlyEquivalent = daysRemaining >= 20 ? monthlyRate : weeklyEquivalent

        if (currentDailyCost > weeklyEquivalent && !rental.is_weekly_rate) {
          const rateSavings = currentDailyCost - weeklyEquivalent
          rateOptimizationSavings += rateSavings

          optimizationOpportunities.push({
            rental_id: rental.id,
            equipment_name: currentRental.equipment_name,
            opportunity_type: 'rate_change',
            current_cost: currentDailyCost,
            optimized_cost: weeklyEquivalent,
            savings: rateSavings,
            description: `Switch from daily to weekly rate for remaining rental period`,
            action_required: `Contact vendor to change billing to weekly rate`,
            urgency: rateSavings > 500 ? 'high' : 'medium'
          })

          if (rateSavings > 500) {highPriorityCount++}
        }

        if (daysRemaining >= 20 && weeklyEquivalent > monthlyRate && !rental.is_monthly_rate) {
          const rateSavings = weeklyEquivalent - monthlyRate
          rateOptimizationSavings += rateSavings

          optimizationOpportunities.push({
            rental_id: rental.id,
            equipment_name: currentRental.equipment_name,
            opportunity_type: 'rate_change',
            current_cost: weeklyEquivalent,
            optimized_cost: monthlyRate,
            savings: rateSavings,
            description: `Switch to monthly rate for remaining rental period`,
            action_required: `Negotiate monthly rate with vendor`,
            urgency: rateSavings > 500 ? 'high' : 'medium'
          })
        }
      }

      // 3. Vendor comparison
      const alternativeVendors = (vendors || [])
        .filter(v => v.id !== rental.vendor?.id)
        .map(v => {
          const rate = v.equipment_rates?.find(
            (r: { equipment_type: string }) => r.equipment_type === rental.equipment_type
          )
          return {
            vendor_name: v.name || 'Unknown',
            daily_rate: rate?.daily_rate || dailyRate * 1.1,
            weekly_rate: rate?.weekly_rate || weeklyRate * 1.1,
            monthly_rate: rate?.monthly_rate || monthlyRate * 1.1,
            availability: 'Contact for availability',
            rating: v.rating || 3,
            potential_savings: 0
          }
        })
        .filter(v => v.daily_rate < dailyRate)
        .map(v => ({
          ...v,
          potential_savings: (dailyRate - v.daily_rate) * daysRemaining
        }))
        .sort((a, b) => b.potential_savings - a.potential_savings)

      if (alternativeVendors.length > 0 && alternativeVendors[0].potential_savings > 200) {
        const bestAlternative = alternativeVendors[0]
        vendorSwitchSavings += bestAlternative.potential_savings

        vendorComparisons.push({
          equipment_type: rental.equipment_type || 'General',
          current_vendor: currentRental.vendor_name,
          current_rate: dailyRate,
          alternative_vendors: alternativeVendors.slice(0, 3),
          best_option: bestAlternative.vendor_name
        })

        if (bestAlternative.potential_savings > 500 && daysRemaining > 14) {
          optimizationOpportunities.push({
            rental_id: rental.id,
            equipment_name: currentRental.equipment_name,
            opportunity_type: 'vendor_switch',
            current_cost: dailyRate * daysRemaining,
            optimized_cost: bestAlternative.daily_rate * daysRemaining,
            savings: bestAlternative.potential_savings,
            description: `${bestAlternative.vendor_name} offers better rates for this equipment`,
            action_required: `Get quote from ${bestAlternative.vendor_name} and evaluate switching vendors`,
            urgency: bestAlternative.potential_savings > 1000 ? 'high' : 'medium'
          })

          if (bestAlternative.potential_savings > 1000) {highPriorityCount++}
        }
      }

      // 4. Rental vs Purchase analysis
      if (status === 'active' && projectDaysRemaining > 60) {
        const projectedTotalRentalCost = totalRentalCost +
          calculateRentalCost(Math.min(daysRemaining, projectDaysRemaining), dailyRate, weeklyRate, monthlyRate)

        // Estimate purchase costs based on equipment type
        const purchaseEstimate = estimatePurchaseCost(rental.equipment_type || 'General', monthlyRate)
        const resaleEstimate = purchaseEstimate * 0.6 // Assume 60% resale value
        const netPurchaseCost = purchaseEstimate - resaleEstimate

        const breakEvenDays = netPurchaseCost > 0 ? Math.ceil(netPurchaseCost / dailyRate) : 0

        const shouldPurchase = projectedTotalRentalCost > netPurchaseCost && projectDaysRemaining > breakEvenDays
        const savingsPotential = shouldPurchase ? projectedTotalRentalCost - netPurchaseCost : 0

        if (savingsPotential > 1000) {
          purchaseVsRentSavings += savingsPotential

          rentalVsPurchase.push({
            equipment_name: currentRental.equipment_name,
            equipment_type: rental.equipment_type || 'General',
            total_project_rental_cost: projectedTotalRentalCost,
            purchase_cost_estimate: purchaseEstimate,
            resale_value_estimate: resaleEstimate,
            net_purchase_cost: netPurchaseCost,
            break_even_days: breakEvenDays,
            project_days_remaining: projectDaysRemaining,
            recommendation: shouldPurchase ? 'purchase' : 'rent',
            reasoning: shouldPurchase
              ? `Purchasing saves $${savingsPotential.toLocaleString()} over remaining project duration`
              : `Rental is more cost-effective for the remaining ${projectDaysRemaining} days`,
            savings_potential: savingsPotential
          })

          if (shouldPurchase && savingsPotential > 2000) {
            optimizationOpportunities.push({
              rental_id: rental.id,
              equipment_name: currentRental.equipment_name,
              opportunity_type: 'consolidate',
              current_cost: projectedTotalRentalCost,
              optimized_cost: netPurchaseCost,
              savings: savingsPotential,
              description: `Consider purchasing instead of continuing rental`,
              action_required: `Evaluate equipment purchase: break-even at ${breakEvenDays} days`,
              urgency: savingsPotential > 5000 ? 'high' : 'medium'
            })

            if (savingsPotential > 5000) {highPriorityCount++}
          }
        }
      }
    }

    totalPotentialSavings = earlyReturnSavings + rateOptimizationSavings + vendorSwitchSavings + purchaseVsRentSavings

    // Calculate summary metrics
    const activeRentals = currentRentals.filter(r => r.status === 'active' || r.status === 'scheduled')
    const averageUtilization = activeRentals.length > 0
      ? Math.round(totalUtilization / activeRentals.length)
      : 0

    // Generate recommendations
    const recommendations = generateRentalRecommendations(
      currentRentals,
      optimizationOpportunities,
      averageUtilization,
      totalPotentialSavings
    )

    // Sort opportunities by savings
    optimizationOpportunities.sort((a, b) => b.savings - a.savings)

    return {
      success: true,
      data: {
        current_rentals: currentRentals,
        optimization_opportunities: optimizationOpportunities.slice(0, 15),
        potential_savings: {
          total_potential_savings: totalPotentialSavings,
          early_return_savings: earlyReturnSavings,
          rate_optimization_savings: rateOptimizationSavings,
          vendor_switch_savings: vendorSwitchSavings,
          purchase_vs_rent_savings: purchaseVsRentSavings
        },
        recommendations,
        vendor_comparisons: vendorComparisons.slice(0, 10),
        rental_vs_purchase: rentalVsPurchase.slice(0, 10),
        summary: {
          total_active_rentals: activeRentals.length,
          total_monthly_cost: totalMonthlyRate,
          average_utilization: averageUtilization,
          opportunities_count: optimizationOpportunities.length,
          high_priority_actions: highPriorityCount
        }
      },
      metadata: {
        executionTimeMs: 0
      }
    }
  },

  formatOutput(output) {
    const { summary, potential_savings, optimization_opportunities, recommendations } = output

    const hasHighPriority = summary.high_priority_actions > 0
    const hasSignificantSavings = potential_savings.total_potential_savings > 1000

    return {
      title: 'Equipment Rental Optimization',
      summary: `${summary.total_active_rentals} active rentals - $${potential_savings.total_potential_savings.toLocaleString()} potential savings identified`,
      icon: hasSignificantSavings ? 'dollar-sign' : hasHighPriority ? 'alert-circle' : 'check-circle',
      status: hasHighPriority ? 'warning' : hasSignificantSavings ? 'info' : 'success',
      details: [
        { label: 'Active Rentals', value: summary.total_active_rentals, type: 'text' },
        { label: 'Monthly Cost', value: `$${summary.total_monthly_cost.toLocaleString()}`, type: 'text' },
        { label: 'Avg Utilization', value: `${summary.average_utilization}%`, type: 'badge' },
        { label: 'Potential Savings', value: `$${potential_savings.total_potential_savings.toLocaleString()}`, type: 'text' },
        { label: 'Opportunities', value: optimization_opportunities.length, type: 'text' },
        { label: 'High Priority', value: summary.high_priority_actions, type: 'badge' }
      ],
      expandedContent: output as unknown as Record<string, unknown>
    }
  }
})

/**
 * Calculate rental cost using best available rate
 */
function calculateRentalCost(
  days: number,
  dailyRate: number,
  weeklyRate: number,
  monthlyRate: number
): number {
  if (days <= 0) {return 0}

  // Determine most cost-effective rate
  const dailyCost = days * dailyRate
  const weeklyCost = Math.ceil(days / 7) * weeklyRate
  const monthlyCost = Math.ceil(days / 30) * monthlyRate

  // For short rentals, use daily; for longer, compare weekly/monthly
  if (days <= 4) {return dailyCost}
  if (days <= 25) {return Math.min(dailyCost, weeklyCost)}
  return Math.min(dailyCost, weeklyCost, monthlyCost)
}

/**
 * Estimate purchase cost based on equipment type and monthly rate
 */
function estimatePurchaseCost(equipmentType: string, monthlyRate: number): number {
  // Typical purchase cost is roughly 8-15x monthly rental rate
  const typeMultipliers: Record<string, number> = {
    'excavator': 15,
    'loader': 14,
    'crane': 18,
    'forklift': 10,
    'compactor': 10,
    'generator': 8,
    'scaffolding': 6,
    'lift': 12,
    'concrete': 10,
    'default': 10
  }

  const lowerType = equipmentType.toLowerCase()
  const multiplier = Object.entries(typeMultipliers).find(([key]) =>
    lowerType.includes(key)
  )?.[1] || typeMultipliers.default

  return monthlyRate * multiplier
}

/**
 * Generate rental optimization recommendations
 */
function generateRentalRecommendations(
  rentals: CurrentRental[],
  opportunities: OptimizationOpportunity[],
  avgUtilization: number,
  totalSavings: number
): string[] {
  const recommendations: string[] = []

  // High priority opportunities
  const highPriorityOpps = opportunities.filter(o => o.urgency === 'high')
  if (highPriorityOpps.length > 0) {
    recommendations.push(
      `Address ${highPriorityOpps.length} high-priority optimization opportunities totaling $${
        highPriorityOpps.reduce((sum, o) => sum + o.savings, 0).toLocaleString()
      } in potential savings`
    )
  }

  // Low utilization
  const lowUtilRentals = rentals.filter(r => r.utilization_percent < 40 && r.status === 'active')
  if (lowUtilRentals.length > 0) {
    recommendations.push(
      `Review ${lowUtilRentals.length} rentals with <40% utilization for early return potential`
    )
  }

  // Rate optimization
  const rateOpps = opportunities.filter(o => o.opportunity_type === 'rate_change')
  if (rateOpps.length > 0) {
    recommendations.push(
      `Renegotiate ${rateOpps.length} rentals for better rate tiers (weekly/monthly rates)`
    )
  }

  // Vendor switches
  const vendorOpps = opportunities.filter(o => o.opportunity_type === 'vendor_switch')
  if (vendorOpps.length > 0) {
    recommendations.push(
      `Evaluate ${vendorOpps.length} alternative vendor quotes for potential cost reduction`
    )
  }

  // Overall utilization
  if (avgUtilization < 60) {
    recommendations.push(
      `Overall equipment utilization is ${avgUtilization}% - consider consolidating rentals or improving scheduling`
    )
  }

  // Overdue rentals
  const overdueRentals = rentals.filter(r => r.status === 'overdue')
  if (overdueRentals.length > 0) {
    recommendations.push(
      `URGENT: ${overdueRentals.length} rentals are past return date - return immediately to avoid late fees`
    )
  }

  // Purchase considerations
  const purchaseOpps = opportunities.filter(o => o.opportunity_type === 'consolidate')
  if (purchaseOpps.length > 0) {
    recommendations.push(
      `Evaluate purchasing ${purchaseOpps.length} pieces of equipment currently being rented`
    )
  }

  // General best practice
  if (totalSavings > 5000) {
    recommendations.push(
      `Total identified savings of $${totalSavings.toLocaleString()} - schedule equipment review meeting`
    )
  }

  if (recommendations.length === 0) {
    recommendations.push('Equipment rentals are well-optimized - continue monitoring utilization')
  }

  recommendations.push('Update equipment usage logs daily to maintain accurate utilization tracking')

  return recommendations.slice(0, 8)
}
