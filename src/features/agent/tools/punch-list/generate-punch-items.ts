/**
 * Punch List Generator Tool
 * Generates punch list items from observations, walkthrough notes, or descriptions
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'
import type { AgentContext } from '../../types'

interface GeneratePunchItemsInput {
  project_id: string
  observations: string
  location?: string
  trade?: string
  priority?: 'low' | 'medium' | 'high' | 'critical'
}

interface PunchItem {
  description: string
  location: string
  trade: string
  priority: string
  category: string
  suggested_assignee: string
  estimated_hours: number
}

interface GeneratePunchItemsOutput {
  items: PunchItem[]
  summary: {
    total_items: number
    by_trade: Record<string, number>
    by_priority: Record<string, number>
    estimated_total_hours: number
  }
  tips: string[]
}

export const generatePunchItemsTool = createTool<GeneratePunchItemsInput, GeneratePunchItemsOutput>({
  name: 'generate_punch_items',
  description: 'Generates structured punch list items from walkthrough observations or free-form notes. Automatically categorizes by trade, suggests priorities, and estimates completion time.',
  category: 'punch_list',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID for context'
      },
      observations: {
        type: 'string',
        description: 'Free-form observations, notes from walkthrough, or list of items to parse'
      },
      location: {
        type: 'string',
        description: 'Default location if not specified in observations (e.g., "Floor 2", "Unit 101")'
      },
      trade: {
        type: 'string',
        description: 'Default trade if not obvious from observations'
      },
      priority: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'critical'],
        description: 'Default priority level for items'
      }
    },
    required: ['project_id', 'observations']
  },

  async execute(input: GeneratePunchItemsInput, context: AgentContext): Promise<GeneratePunchItemsOutput> {
    const { project_id, observations, location: defaultLocation, trade: defaultTrade, priority: defaultPriority = 'medium' } = input

    // Get project subcontractors for assignee suggestions
    const { data: subcontractors } = await supabase
      .from('subcontractors')
      .select('id, company_name, trade')
      .eq('project_id', project_id)

    const tradeMap = new Map(subcontractors?.map(s => [s.trade?.toLowerCase(), s.company_name]) || [])

    // Parse observations into individual items
    const rawItems = parseObservations(observations)

    // Process each item
    const items: PunchItem[] = rawItems.map(rawItem => {
      const analysis = analyzeItem(rawItem, defaultLocation, defaultTrade, defaultPriority)
      const suggestedAssignee = tradeMap.get(analysis.trade.toLowerCase()) || analysis.trade

      return {
        description: analysis.description,
        location: analysis.location,
        trade: analysis.trade,
        priority: analysis.priority,
        category: analysis.category,
        suggested_assignee: suggestedAssignee,
        estimated_hours: analysis.estimatedHours
      }
    })

    // Calculate summary
    const byTrade: Record<string, number> = {}
    const byPriority: Record<string, number> = {}
    let totalHours = 0

    for (const item of items) {
      byTrade[item.trade] = (byTrade[item.trade] || 0) + 1
      byPriority[item.priority] = (byPriority[item.priority] || 0) + 1
      totalHours += item.estimated_hours
    }

    // Generate tips
    const tips = generateTips(items, byTrade, byPriority)

    return {
      items,
      summary: {
        total_items: items.length,
        by_trade: byTrade,
        by_priority: byPriority,
        estimated_total_hours: totalHours
      },
      tips
    }
  }
})

function parseObservations(observations: string): string[] {
  // Split by common delimiters
  const lines = observations
    .split(/[\n\r]+|(?:^|\s)[-•*]\s+|(?:^|\s)\d+[.)]\s+/)
    .map(line => line.trim())
    .filter(line => line.length > 5)

  // If we got very few items, try splitting by sentences
  if (lines.length <= 2 && observations.length > 100) {
    return observations
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10)
  }

  return lines
}

interface ItemAnalysis {
  description: string
  location: string
  trade: string
  priority: string
  category: string
  estimatedHours: number
}

function analyzeItem(
  rawItem: string,
  defaultLocation?: string,
  defaultTrade?: string,
  defaultPriority?: string
): ItemAnalysis {
  const itemLower = rawItem.toLowerCase()

  // Extract or infer location
  const location = extractLocation(rawItem) || defaultLocation || 'General'

  // Determine trade
  const trade = determineTrade(itemLower) || defaultTrade || 'General'

  // Determine priority
  const priority = determinePriority(itemLower) || defaultPriority || 'medium'

  // Categorize
  const category = categorizeItem(itemLower)

  // Estimate hours
  const estimatedHours = estimateHours(itemLower, category)

  // Clean up description
  const description = cleanDescription(rawItem, location)

  return {
    description,
    location,
    trade,
    priority,
    category,
    estimatedHours
  }
}

function extractLocation(text: string): string | null {
  // Common location patterns
  const patterns = [
    /(?:in|at|on)\s+(room\s*\d+|unit\s*\d+|floor\s*\d+|level\s*\d+|area\s*[a-z])/i,
    /(?:floor|level|room|unit|area|wing|building)\s*[\w-]+/i,
    /(north|south|east|west)\s+(wing|side|end)/i,
    /\b(lobby|kitchen|bathroom|bedroom|office|hallway|corridor|stairwell)\b/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return match[0].trim()
    }
  }

  return null
}

function determineTrade(text: string): string | null {
  const tradePatterns: [RegExp, string][] = [
    [/paint|touch.?up|color|finish|coating/i, 'Painting'],
    [/drywall|gypsum|tape|mud|patch/i, 'Drywall'],
    [/tile|grout|ceramic|porcelain/i, 'Tile'],
    [/carpet|flooring|lvt|vinyl|floor/i, 'Flooring'],
    [/ceiling|grid|acoust/i, 'Ceilings'],
    [/door|hardware|closer|lockset|frame/i, 'Doors & Hardware'],
    [/window|glass|glazing|seal/i, 'Glazing'],
    [/plumb|faucet|toilet|sink|drain|pipe/i, 'Plumbing'],
    [/electric|outlet|switch|light|fixture|circuit/i, 'Electrical'],
    [/hvac|duct|diffuser|thermostat|air/i, 'HVAC'],
    [/cabinet|casework|millwork|countertop/i, 'Casework'],
    [/clean|debris|trash|dust/i, 'Cleaning'],
    [/caulk|seal|weather.?strip/i, 'Sealants'],
    [/fire|sprinkler|alarm|smoke/i, 'Fire Protection'],
    [/concrete|crack|spall|patch/i, 'Concrete'],
    [/roof|membrane|flash/i, 'Roofing'],
    [/masonry|brick|block|mortar/i, 'Masonry'],
    [/steel|metal|weld/i, 'Metals'],
    [/landscape|plant|irrigation/i, 'Landscaping'],
    [/paving|asphalt|concrete.*park/i, 'Sitework'],
  ]

  for (const [pattern, trade] of tradePatterns) {
    if (pattern.test(text)) {
      return trade
    }
  }

  return null
}

function determinePriority(text: string): string | null {
  if (/urgent|immediate|critical|safety|hazard|asap|emergency/i.test(text)) {
    return 'critical'
  }
  if (/important|major|significant|visible|prominent/i.test(text)) {
    return 'high'
  }
  if (/minor|small|cosmetic|touch.?up/i.test(text)) {
    return 'low'
  }
  return null
}

function categorizeItem(text: string): string {
  if (/missing|install|add|need/i.test(text)) return 'Missing/Incomplete'
  if (/damage|broken|crack|chip|dent/i.test(text)) return 'Damage'
  if (/clean|debris|dust|smudge|stain/i.test(text)) return 'Cleaning'
  if (/adjust|align|level|plumb|square/i.test(text)) return 'Adjustment'
  if (/touch.?up|repaint|refinish/i.test(text)) return 'Touch-up'
  if (/repair|fix|replace/i.test(text)) return 'Repair'
  if (/incomplete|unfinished|partial/i.test(text)) return 'Incomplete'
  return 'General'
}

function estimateHours(text: string, category: string): number {
  // Base hours by category
  const categoryHours: Record<string, number> = {
    'Missing/Incomplete': 2,
    'Damage': 1.5,
    'Cleaning': 0.5,
    'Adjustment': 0.5,
    'Touch-up': 0.5,
    'Repair': 1.5,
    'Incomplete': 2,
    'General': 1
  }

  let hours = categoryHours[category] || 1

  // Adjust based on keywords
  if (/multiple|several|all|throughout/i.test(text)) hours *= 2
  if (/small|minor|single/i.test(text)) hours *= 0.5
  if (/major|large|extensive/i.test(text)) hours *= 2

  return Math.round(hours * 2) / 2 // Round to nearest 0.5
}

function cleanDescription(text: string, location: string): string {
  // Remove the location from description if it's there
  let cleaned = text
  if (location && location !== 'General') {
    cleaned = cleaned.replace(new RegExp(location, 'gi'), '').trim()
  }

  // Remove common prefixes
  cleaned = cleaned.replace(/^(need to|needs|must|should|please|todo:?|note:?)\s*/i, '')

  // Capitalize first letter
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)

  // Ensure it ends properly
  if (!/[.!?]$/.test(cleaned)) {
    cleaned += '.'
  }

  return cleaned.trim()
}

function generateTips(
  items: PunchItem[],
  byTrade: Record<string, number>,
  byPriority: Record<string, number>
): string[] {
  const tips: string[] = []

  // Check for critical items
  if (byPriority['critical'] > 0) {
    tips.push(`${byPriority['critical']} critical item(s) require immediate attention before occupancy`)
  }

  // Find dominant trade
  const trades = Object.entries(byTrade).sort((a, b) => b[1] - a[1])
  if (trades.length > 0 && trades[0][1] > items.length * 0.4) {
    tips.push(`${trades[0][0]} has the most items (${trades[0][1]}) - consider dedicated walkthrough with this trade`)
  }

  // Suggest grouping
  if (items.length > 10) {
    tips.push('Consider grouping items by location for efficient contractor walkthroughs')
  }

  // Photo tip
  tips.push('Attach photos to each item for clear communication with trades')

  return tips
}
