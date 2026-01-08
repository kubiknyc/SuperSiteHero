/**
 * Cost Estimator Tool
 * Provides rough cost estimates for construction work items
 */

import { createTool } from '../registry'
import type { AgentContext } from '../../types'

interface CostEstimateInput {
  work_description: string
  quantity?: number
  unit?: string
  location?: string
  quality_level?: 'budget' | 'standard' | 'premium'
  include_labor?: boolean
  include_materials?: boolean
}

interface CostBreakdown {
  labor: number
  materials: number
  equipment: number
  overhead: number
  total: number
}

interface CostEstimateOutput {
  estimate: {
    low: CostBreakdown
    mid: CostBreakdown
    high: CostBreakdown
  }
  unit_cost: {
    per_unit: number
    unit: string
  }
  assumptions: string[]
  factors_affecting_cost: string[]
  similar_items: Array<{
    description: string
    typical_cost_range: string
  }>
  recommendations: string[]
}

export const costEstimateTool = createTool<CostEstimateInput, CostEstimateOutput>({
  name: 'estimate_cost',
  description: 'Provides rough order of magnitude cost estimates for construction work items. Useful for budgeting, change order evaluation, and planning.',
  category: 'cost',
  parameters: {
    type: 'object',
    properties: {
      work_description: {
        type: 'string',
        description: 'Description of the work to estimate'
      },
      quantity: {
        type: 'number',
        description: 'Quantity of work (e.g., 1000 for 1000 SF)'
      },
      unit: {
        type: 'string',
        description: 'Unit of measure (e.g., SF, LF, CY, EA)'
      },
      location: {
        type: 'string',
        description: 'Geographic location for cost adjustment'
      },
      quality_level: {
        type: 'string',
        enum: ['budget', 'standard', 'premium'],
        description: 'Quality level of materials and finish'
      },
      include_labor: {
        type: 'boolean',
        description: 'Include labor costs (default: true)'
      },
      include_materials: {
        type: 'boolean',
        description: 'Include material costs (default: true)'
      }
    },
    required: ['work_description']
  },

  async execute(input: CostEstimateInput, context: AgentContext): Promise<CostEstimateOutput> {
    const {
      work_description,
      quantity = 1,
      unit = 'EA',
      location = 'US Average',
      quality_level = 'standard',
      include_labor = true,
      include_materials = true
    } = input

    // Get base unit cost for the work type
    const baseCost = getBaseCost(work_description, unit)

    // Apply quality multiplier
    const qualityMultiplier = getQualityMultiplier(quality_level)

    // Apply location multiplier
    const locationMultiplier = getLocationMultiplier(location)

    // Calculate costs
    const laborPercent = include_labor ? 0.40 : 0
    const materialsPercent = include_materials ? 0.45 : 0
    const equipmentPercent = 0.10
    const overheadPercent = 0.05

    const totalPercent = laborPercent + materialsPercent + equipmentPercent + overheadPercent
    const adjustedBase = baseCost * qualityMultiplier * locationMultiplier * quantity

    // Calculate low, mid, high ranges
    const midTotal = adjustedBase * totalPercent
    const lowTotal = midTotal * 0.8
    const highTotal = midTotal * 1.3

    const calculateBreakdown = (total: number): CostBreakdown => ({
      labor: Math.round(total * (laborPercent / totalPercent)),
      materials: Math.round(total * (materialsPercent / totalPercent)),
      equipment: Math.round(total * (equipmentPercent / totalPercent)),
      overhead: Math.round(total * (overheadPercent / totalPercent)),
      total: Math.round(total)
    })

    // Get similar items
    const similarItems = getSimilarItems(work_description)

    // Get factors affecting cost
    const factors = getFactorsAffectingCost(work_description, location)

    // Generate assumptions
    const assumptions = generateAssumptions(work_description, quality_level, include_labor, include_materials)

    // Generate recommendations
    const recommendations = generateCostRecommendations(work_description, quality_level)

    return {
      estimate: {
        low: calculateBreakdown(lowTotal),
        mid: calculateBreakdown(midTotal),
        high: calculateBreakdown(highTotal)
      },
      unit_cost: {
        per_unit: Math.round(baseCost * qualityMultiplier * locationMultiplier),
        unit: unit
      },
      assumptions,
      factors_affecting_cost: factors,
      similar_items: similarItems,
      recommendations
    }
  }
})

function getBaseCost(description: string, unit: string): number {
  const descLower = description.toLowerCase()

  // Cost database ($/unit) - these are approximate national averages
  const costData: Array<{ pattern: RegExp; costs: Record<string, number> }> = [
    // Concrete work
    {
      pattern: /concrete.*slab|slab.*concrete/i,
      costs: { SF: 8, SY: 72, CY: 150 }
    },
    {
      pattern: /concrete.*pour|pour.*concrete/i,
      costs: { CY: 180, SF: 12, CF: 15 }
    },
    {
      pattern: /foundation|footing/i,
      costs: { LF: 45, CY: 200, SF: 15 }
    },

    // Framing
    {
      pattern: /wood.*fram|fram.*wood|stud/i,
      costs: { SF: 12, LF: 8, EA: 25 }
    },
    {
      pattern: /steel.*fram|metal.*stud/i,
      costs: { SF: 18, LF: 12, EA: 35 }
    },

    // Roofing
    {
      pattern: /shingle|asphalt.*roof/i,
      costs: { SF: 5, SQ: 450 }
    },
    {
      pattern: /membrane.*roof|tpo|epdm/i,
      costs: { SF: 12, SQ: 1100 }
    },
    {
      pattern: /metal.*roof/i,
      costs: { SF: 15, SQ: 1400 }
    },

    // Drywall/Finishes
    {
      pattern: /drywall|gypsum|sheetrock/i,
      costs: { SF: 3.50, EA: 45 }
    },
    {
      pattern: /paint|painting/i,
      costs: { SF: 2.50, GAL: 45 }
    },
    {
      pattern: /tile|ceramic|porcelain/i,
      costs: { SF: 18, EA: 8 }
    },
    {
      pattern: /carpet/i,
      costs: { SF: 6, SY: 54 }
    },
    {
      pattern: /hardwood.*floor|wood.*floor/i,
      costs: { SF: 12, EA: 8 }
    },
    {
      pattern: /lvt|vinyl.*plank|lvp/i,
      costs: { SF: 8, EA: 5 }
    },

    // MEP
    {
      pattern: /electrical.*outlet|receptacle/i,
      costs: { EA: 150, LF: 25 }
    },
    {
      pattern: /light.*fixture|lighting/i,
      costs: { EA: 350, SF: 8 }
    },
    {
      pattern: /hvac.*duct|ductwork/i,
      costs: { LF: 35, SF: 12 }
    },
    {
      pattern: /plumb|pipe|piping/i,
      costs: { LF: 45, EA: 200 }
    },

    // Doors/Windows
    {
      pattern: /interior.*door/i,
      costs: { EA: 450, LF: 25 }
    },
    {
      pattern: /exterior.*door/i,
      costs: { EA: 1200, LF: 45 }
    },
    {
      pattern: /window/i,
      costs: { EA: 650, SF: 85 }
    },

    // Site work
    {
      pattern: /asphalt.*pav|paving/i,
      costs: { SF: 4, SY: 36, TON: 120 }
    },
    {
      pattern: /concrete.*sidewalk|sidewalk/i,
      costs: { SF: 10, LF: 35 }
    },
    {
      pattern: /landscap/i,
      costs: { SF: 5, EA: 150 }
    },
    {
      pattern: /excavat|earthwork/i,
      costs: { CY: 15, SF: 2 }
    },

    // Demolition
    {
      pattern: /demoli/i,
      costs: { SF: 8, CY: 45 }
    },
  ]

  // Find matching cost data
  for (const item of costData) {
    if (item.pattern.test(descLower)) {
      return item.costs[unit.toUpperCase()] || item.costs['EA'] || 100
    }
  }

  // Default fallback
  return 50
}

function getQualityMultiplier(quality: string): number {
  const multipliers: Record<string, number> = {
    budget: 0.75,
    standard: 1.0,
    premium: 1.5
  }
  return multipliers[quality] || 1.0
}

function getLocationMultiplier(location: string): number {
  const locLower = location.toLowerCase()

  // Location cost indices (US average = 1.0)
  if (/new york|nyc|manhattan/i.test(locLower)) return 1.35
  if (/san francisco|sf|bay area/i.test(locLower)) return 1.40
  if (/los angeles|la|socal/i.test(locLower)) return 1.20
  if (/chicago/i.test(locLower)) return 1.15
  if (/boston/i.test(locLower)) return 1.25
  if (/seattle/i.test(locLower)) return 1.18
  if (/denver/i.test(locLower)) return 1.05
  if (/miami|florida/i.test(locLower)) return 1.02
  if (/atlanta/i.test(locLower)) return 0.95
  if (/dallas|houston|texas/i.test(locLower)) return 0.92
  if (/phoenix|arizona/i.test(locLower)) return 0.95
  if (/rural|midwest/i.test(locLower)) return 0.85

  return 1.0
}

function getSimilarItems(description: string): Array<{ description: string; typical_cost_range: string }> {
  const descLower = description.toLowerCase()
  const items: Array<{ description: string; typical_cost_range: string }> = []

  if (/concrete/i.test(descLower)) {
    items.push(
      { description: 'Standard 4" concrete slab on grade', typical_cost_range: '$6-10/SF' },
      { description: 'Reinforced concrete foundation wall', typical_cost_range: '$180-250/CY' },
      { description: 'Concrete sidewalk', typical_cost_range: '$8-15/SF' }
    )
  }

  if (/drywall|finish/i.test(descLower)) {
    items.push(
      { description: 'Standard 1/2" drywall (Level 4 finish)', typical_cost_range: '$2.50-4.50/SF' },
      { description: 'Moisture-resistant drywall', typical_cost_range: '$3.50-5.50/SF' },
      { description: 'Fire-rated drywall assembly', typical_cost_range: '$5-8/SF' }
    )
  }

  if (/paint/i.test(descLower)) {
    items.push(
      { description: 'Interior latex paint (2 coats)', typical_cost_range: '$1.50-3.00/SF' },
      { description: 'Exterior paint (2 coats)', typical_cost_range: '$2.50-4.50/SF' },
      { description: 'Specialty coating/epoxy', typical_cost_range: '$4-12/SF' }
    )
  }

  if (/floor|tile/i.test(descLower)) {
    items.push(
      { description: 'Ceramic floor tile (installed)', typical_cost_range: '$12-25/SF' },
      { description: 'Luxury vinyl plank (LVP)', typical_cost_range: '$5-10/SF' },
      { description: 'Engineered hardwood', typical_cost_range: '$10-18/SF' }
    )
  }

  if (/electrical/i.test(descLower)) {
    items.push(
      { description: 'Standard duplex outlet', typical_cost_range: '$100-200/EA' },
      { description: 'Recessed LED light fixture', typical_cost_range: '$150-350/EA' },
      { description: 'Electrical panel upgrade', typical_cost_range: '$1,500-3,500/EA' }
    )
  }

  return items.slice(0, 3)
}

function getFactorsAffectingCost(description: string, location: string): string[] {
  const factors: string[] = [
    'Labor rates vary significantly by region and union status',
    'Material prices fluctuate with market conditions',
    'Site access and logistics can add 5-15% to costs'
  ]

  if (/demolition|existing/i.test(description)) {
    factors.push('Existing conditions may reveal unforeseen work')
  }

  if (/renovation|remodel/i.test(description)) {
    factors.push('Renovation work typically costs 15-25% more than new construction')
  }

  if (/high.*rise|multi.*story/i.test(description)) {
    factors.push('Vertical construction adds material handling costs')
  }

  if (/new york|san francisco|boston/i.test(location)) {
    factors.push('High-cost urban area - expect premium labor rates')
  }

  return factors.slice(0, 5)
}

function generateAssumptions(
  description: string,
  quality: string,
  includeLAbor: boolean,
  includeMaterials: boolean
): string[] {
  const assumptions: string[] = [
    'Estimate is rough order of magnitude (ROM) for budgeting purposes',
    `Quality level: ${quality}`,
    'Normal working conditions assumed',
    'Does not include permits, design fees, or inspections'
  ]

  if (includeLAbor) {
    assumptions.push('Labor included at prevailing rates')
  } else {
    assumptions.push('Labor NOT included - materials only')
  }

  if (includeMaterials) {
    assumptions.push('Standard grade materials assumed')
  } else {
    assumptions.push('Materials NOT included - labor only')
  }

  return assumptions
}

function generateCostRecommendations(description: string, quality: string): string[] {
  const recommendations: string[] = []

  recommendations.push('Get 3+ competitive bids for accurate pricing')

  if (quality === 'premium') {
    recommendations.push('Consider value engineering to reduce costs while maintaining quality')
  }

  if (quality === 'budget') {
    recommendations.push('Verify budget-grade materials meet project requirements')
  }

  if (/renovation|existing/i.test(description)) {
    recommendations.push('Add 15-20% contingency for unforeseen conditions')
  }

  recommendations.push('Verify quantities with detailed takeoff before finalizing budget')

  return recommendations.slice(0, 4)
}
