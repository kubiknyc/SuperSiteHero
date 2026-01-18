/**
 * Daily Log Generator Tool
 * Generates structured daily logs from field notes and observations
 * Enhanced with CSI division recognition, improved location extraction, and quantity parsing
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'
import type { AgentContext } from '../../types'
import {
  TRADE_ALIASES,
  LOCATION_PATTERNS,
  QUANTITY_PATTERNS,
  extractLocations,
  extractQuantities,
  translateSlang,
  normalizeTradeName,
} from '../../domain/construction-terminology'
import { CSI_DIVISIONS, TRADE_PRODUCTIVITY_BENCHMARKS } from '../../domain/construction-constants'

interface GenerateDailyLogInput {
  project_id: string
  date: string
  notes: string
  weather?: {
    conditions: string
    temperature_high?: number
    temperature_low?: number
    precipitation?: boolean
  }
  include_manpower?: boolean
  include_equipment?: boolean
  include_deliveries?: boolean
}

interface WorkActivity {
  trade: string
  csi_division?: string
  description: string
  location: string
  location_details?: {
    building?: string
    floor?: string
    room?: string
    area?: string
    grid_line?: string
  }
  workers: number
  hours: number
  percent_complete?: number
  quantities?: Array<{
    value: number
    unit: string
    original: string
  }>
}

interface ManpowerEntry {
  trade: string
  company: string
  headcount: number
  hours_worked: number
}

interface EquipmentEntry {
  type: string
  quantity: number
  status: 'active' | 'idle' | 'maintenance'
  hours_used: number
}

interface DeliveryEntry {
  material: string
  supplier: string
  quantity: string
  received_by: string
  storage_location: string
}

interface GenerateDailyLogOutput {
  daily_log: {
    date: string
    project_name: string
    weather_summary: string
    superintendent_narrative: string
    work_activities: WorkActivity[]
    manpower_summary: {
      total_workers: number
      total_hours: number
      by_trade: ManpowerEntry[]
    }
    equipment_on_site: EquipmentEntry[]
    deliveries: DeliveryEntry[]
    delays_issues: string[]
    safety_observations: string[]
    visitors: string[]
    notes: string
  }
  quality_score: number
  missing_info: string[]
  suggestions: string[]
  productivity_analysis?: {
    trade: string
    actual_rate: string
    benchmark_rate: string
    variance: string
  }[]
}

export const generateDailyLogTool = createTool<GenerateDailyLogInput, GenerateDailyLogOutput>({
  name: 'generate_daily_log',
  description: 'Generates a structured daily log from field notes. Extracts work activities, manpower counts, equipment usage, and deliveries. Useful for superintendents creating end-of-day reports.',
  category: 'reports',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID'
      },
      date: {
        type: 'string',
        description: 'Date for the daily log (ISO format)'
      },
      notes: {
        type: 'string',
        description: 'Raw field notes, observations, or dictated notes from the day'
      },
      weather: {
        type: 'object',
        description: 'Weather conditions for the day',
        properties: {
          conditions: { type: 'string' },
          temperature_high: { type: 'number' },
          temperature_low: { type: 'number' },
          precipitation: { type: 'boolean' }
        }
      },
      include_manpower: {
        type: 'boolean',
        description: 'Extract manpower information (default: true)'
      },
      include_equipment: {
        type: 'boolean',
        description: 'Extract equipment information (default: true)'
      },
      include_deliveries: {
        type: 'boolean',
        description: 'Extract delivery information (default: true)'
      }
    },
    required: ['project_id', 'date', 'notes']
  },

  async execute(input: GenerateDailyLogInput, context: AgentContext): Promise<GenerateDailyLogOutput> {
    const {
      project_id,
      date,
      notes,
      weather,
      include_manpower = true,
      include_equipment = true,
      include_deliveries = true
    } = input

    // Get project info
    const { data: project } = await supabase
      .from('projects')
      .select('name, address')
      .eq('id', project_id)
      .single()

    // Get subcontractors for trade matching
    const { data: subcontractors } = await supabase
      .from('subcontractors')
      .select('company_name, trade')
      .eq('project_id', project_id)

    const tradeMap = new Map(subcontractors?.map(s => [s.trade?.toLowerCase(), s.company_name]) || [])

    // Parse the notes
    const workActivities = extractWorkActivities(notes, tradeMap)
    const manpowerEntries = include_manpower ? extractManpower(notes, tradeMap) : []
    const equipmentEntries = include_equipment ? extractEquipment(notes) : []
    const deliveryEntries = include_deliveries ? extractDeliveries(notes) : []
    const delaysIssues = extractDelaysAndIssues(notes)
    const safetyObservations = extractSafetyObservations(notes)
    const visitors = extractVisitors(notes)

    // Build weather summary
    const weatherSummary = buildWeatherSummary(weather)

    // Calculate totals
    const totalWorkers = manpowerEntries.reduce((sum, e) => sum + e.headcount, 0)
    const totalHours = manpowerEntries.reduce((sum, e) => sum + (e.headcount * e.hours_worked), 0)

    // Assess quality and identify missing info
    const { qualityScore, missingInfo } = assessLogQuality(
      workActivities,
      manpowerEntries,
      delaysIssues,
      safetyObservations,
      weather
    )

    // Generate suggestions
    const suggestions = generateLogSuggestions(
      workActivities,
      manpowerEntries,
      delaysIssues,
      qualityScore
    )

    // Generate superintendent narrative
    const superintendentNarrative = generateSuperintendentNarrative(
      weatherSummary,
      workActivities,
      manpowerEntries,
      delaysIssues,
      safetyObservations,
      visitors
    )

    // Analyze productivity against benchmarks
    const productivityAnalysis = analyzeProductivity(workActivities, manpowerEntries)

    return {
      daily_log: {
        date,
        project_name: project?.name || 'Unknown Project',
        weather_summary: weatherSummary,
        superintendent_narrative: superintendentNarrative,
        work_activities: workActivities,
        manpower_summary: {
          total_workers: totalWorkers,
          total_hours: totalHours,
          by_trade: manpowerEntries
        },
        equipment_on_site: equipmentEntries,
        deliveries: deliveryEntries,
        delays_issues: delaysIssues,
        safety_observations: safetyObservations,
        visitors,
        notes: cleanNotes(notes)
      },
      quality_score: qualityScore,
      missing_info: missingInfo,
      suggestions,
      productivity_analysis: productivityAnalysis.length > 0 ? productivityAnalysis : undefined,
    }
  }
})

// Map trades to CSI divisions
const TRADE_TO_CSI: Record<string, string> = {
  'Concrete': '03',
  'Masonry': '04',
  'Steel': '05',
  'Framing': '06',
  'Carpentry': '06',
  'Roofing': '07',
  'Insulation': '07',
  'Waterproofing': '07',
  'Glazing': '08',
  'Doors': '08',
  'Drywall': '09',
  'Painting': '09',
  'Flooring': '09',
  'Tile': '09',
  'Fire Protection': '21',
  'Plumbing': '22',
  'HVAC': '23',
  'Electrical': '26',
  'Fire Alarm': '28',
  'Site Work': '31',
  'Excavation': '31',
  'Landscaping': '32',
  'Elevator': '14',
  'Demolition': '02',
}

function extractWorkActivities(notes: string, tradeMap: Map<string, string>): WorkActivity[] {
  const activities: WorkActivity[] = []

  // First, translate any slang terms in the notes
  const processedNotes = notes.split(/\s+/).map(word => {
    const translated = translateSlang(word)
    return translated !== word ? translated : word
  }).join(' ')

  const lines = processedNotes.split(/[.\n]+/).filter(l => l.trim().length > 10)

  const tradePatterns: Array<[RegExp, string]> = [
    [/concrete|pour|slab|foundation|footings?|formwork/i, 'Concrete'],
    [/framing|fram|stud|wood|sheathing|plywood/i, 'Framing'],
    [/electrical|electric|wire|outlet|panel|conduit|romex/i, 'Electrical'],
    [/plumbing|plumb|pipe|drain|fixture|toilet|sink/i, 'Plumbing'],
    [/hvac|duct|mechanical|air.*handler|diffuser|grille/i, 'HVAC'],
    [/drywall|sheetrock|gypsum|joint.*compound|taping/i, 'Drywall'],
    [/painting|paint|primer|coating|stain/i, 'Painting'],
    [/roofing|roof|shingle|membrane|flashing/i, 'Roofing'],
    [/flooring|floor|tile|carpet|hardwood|lvp|vinyl/i, 'Flooring'],
    [/masonry|brick|block|cmu|stone|mortar/i, 'Masonry'],
    [/steel|iron|metal|weld|erect/i, 'Steel'],
    [/insulation|insulate|batt|spray.*foam/i, 'Insulation'],
    [/fire.*protect|sprinkler|fire.*alarm|detection/i, 'Fire Protection'],
    [/elevator|lift/i, 'Elevator'],
    [/landscape|landscap|sod|plant|irrigation/i, 'Landscaping'],
    [/site.*work|excavat|grad|backfill|compact/i, 'Site Work'],
    [/demolition|demo|abate/i, 'Demolition'],
    [/glass|glazing|window|storefront|curtain.*wall/i, 'Glazing'],
    [/waterproof|dampproof|membrane/i, 'Waterproofing'],
    [/millwork|cabinet|casework|trim/i, 'Millwork'],
    [/door|hardware|frame/i, 'Doors'],
  ]

  for (const line of lines) {
    // Determine trade - also try normalization from terminology module
    let trade = normalizeTradeName(line) || 'General'
    if (trade === 'General') {
      for (const [pattern, tradeName] of tradePatterns) {
        if (pattern.test(line)) {
          trade = tradeName
          break
        }
      }
    }

    // Get CSI division
    const csiDivision = TRADE_TO_CSI[trade]

    // Extract location using enhanced patterns from terminology module
    const locations = extractLocations(line)
    let location = 'General Area'
    const locationDetails: WorkActivity['location_details'] = {}

    if (locations.buildings.length > 0) {
      locationDetails.building = locations.buildings[0]
      location = locations.buildings[0]
    }
    if (locations.floors.length > 0) {
      locationDetails.floor = locations.floors[0]
      location = locations.floors[0]
    }
    if (locations.rooms.length > 0) {
      locationDetails.room = locations.rooms[0]
      if (location === 'General Area') location = locations.rooms[0]
    }
    if (locations.areas.length > 0) {
      locationDetails.area = locations.areas[0]
      if (location === 'General Area') location = locations.areas[0]
    }
    if (locations.gridLines.length > 0) {
      locationDetails.grid_line = locations.gridLines[0]
    }

    // Fallback location patterns
    if (location === 'General Area') {
      const fallbackPatterns = [
        /(?:in|at|on)\s+(floor\s*\d+|level\s*\d+|room\s*\d+|area\s*[a-z]|building\s*[a-z]|wing\s*[a-z])/i,
        /(north|south|east|west)\s+(wing|side|end)/i,
        /(basement|ground|first|second|third|fourth|fifth|roof)\s*(?:floor|level)?/i,
      ]
      for (const pattern of fallbackPatterns) {
        const match = line.match(pattern)
        if (match) {
          location = match[0]
          break
        }
      }
    }

    // Extract quantities using enhanced patterns from terminology module
    const quantities = extractQuantities(line)

    // Extract worker count
    const workerMatch = line.match(/(\d+)\s*(?:workers?|men|guys|people|crew|journeymen?|apprentices?)/i)
    const workers = workerMatch ? parseInt(workerMatch[1]) : 0

    // Extract hours
    const hoursMatch = line.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/i)
    const hours = hoursMatch ? parseFloat(hoursMatch[1]) : 8

    // Extract percent complete
    const percentMatch = line.match(/(\d+)\s*%\s*(?:complete|done|finished)/i)
    const percentComplete = percentMatch ? parseInt(percentMatch[1]) : undefined

    // Only add if it looks like a work activity
    const hasWorkVerb = /work|install|pour|set|lay|hang|run|pull|connect|finish|complete|start|continue|progress|erect|place|form|strip|cure|rough|trim|test|inspect/i.test(line)

    if (hasWorkVerb || trade !== 'General') {
      activities.push({
        trade,
        csi_division: csiDivision ? `Division ${csiDivision}: ${CSI_DIVISIONS[csiDivision as keyof typeof CSI_DIVISIONS]}` : undefined,
        description: cleanActivityDescription(line),
        location,
        location_details: Object.keys(locationDetails).length > 0 ? locationDetails : undefined,
        workers,
        hours,
        percent_complete: percentComplete,
        quantities: quantities.length > 0 ? quantities : undefined,
      })
    }
  }

  // Deduplicate by combining similar activities
  return deduplicateActivities(activities)
}

function cleanActivityDescription(text: string): string {
  return text
    .replace(/\d+\s*(?:workers?|men|guys|people|crew)/gi, '')
    .replace(/\d+(?:\.\d+)?\s*(?:hours?|hrs?)/gi, '')
    .replace(/\d+\s*%\s*(?:complete|done|finished)/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function deduplicateActivities(activities: WorkActivity[]): WorkActivity[] {
  const seen = new Map<string, WorkActivity>()

  for (const activity of activities) {
    const key = `${activity.trade}-${activity.location}`
    const existing = seen.get(key)

    if (existing) {
      existing.workers = Math.max(existing.workers, activity.workers)
      existing.hours += activity.hours
      if (activity.percent_complete !== undefined) {
        existing.percent_complete = activity.percent_complete
      }
      existing.description += '; ' + activity.description
    } else {
      seen.set(key, { ...activity })
    }
  }

  return Array.from(seen.values())
}

function extractManpower(notes: string, tradeMap: Map<string, string>): ManpowerEntry[] {
  const entries: ManpowerEntry[] = []

  const tradeNames: Record<string, string> = {
    electrician: 'Electrical',
    plumber: 'Plumbing',
    carpenter: 'Carpentry',
    laborer: 'General Labor',
    operator: 'Equipment Operator',
    painter: 'Painting',
    roofer: 'Roofing',
    mason: 'Masonry',
    ironworker: 'Steel',
  }

  // Pattern for "5 electricians" style
  const workerPattern = /(\d+)\s*(electricians?|plumbers?|carpenters?|laborers?|operators?|painters?|roofers?|masons?|ironworkers?)/gi
  let match
  while ((match = workerPattern.exec(notes)) !== null) {
    const count = parseInt(match[1])
    const tradeKey = match[2].toLowerCase().replace(/s$/, '')
    const trade = tradeNames[tradeKey] || tradeKey.charAt(0).toUpperCase() + tradeKey.slice(1)

    if (count > 0 && count < 100) {
      entries.push({
        trade,
        company: tradeMap.get(trade.toLowerCase()) || 'Unknown',
        headcount: count,
        hours_worked: 8
      })
    }
  }

  return entries
}

function extractEquipment(notes: string): EquipmentEntry[] {
  const entries: EquipmentEntry[] = []

  const equipmentPatterns: Array<[RegExp, string]> = [
    [/crane/i, 'Crane'],
    [/excavator|backhoe/i, 'Excavator'],
    [/loader|skid.?steer|bobcat/i, 'Loader'],
    [/forklift|telehandler|lull/i, 'Forklift'],
    [/concrete.?pump|pump.?truck/i, 'Concrete Pump'],
    [/dump.?truck/i, 'Dump Truck'],
    [/boom.?lift|man.?lift|jlg/i, 'Boom Lift'],
    [/scissor.?lift/i, 'Scissor Lift'],
    [/compactor|roller/i, 'Compactor'],
    [/generator/i, 'Generator'],
    [/welder/i, 'Welder'],
    [/compressor/i, 'Air Compressor'],
  ]

  for (const [pattern, equipType] of equipmentPatterns) {
    if (pattern.test(notes)) {
      const quantityMatch = notes.match(new RegExp(`(\\d+)\\s*${pattern.source}`, 'i'))
      const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1

      const isIdle = /idle|down|not.?working|broken/i.test(notes)
      const isMaintenance = /maintenance|repair|service/i.test(notes)

      entries.push({
        type: equipType,
        quantity,
        status: isMaintenance ? 'maintenance' : isIdle ? 'idle' : 'active',
        hours_used: 8
      })
    }
  }

  return entries
}

function extractDeliveries(notes: string): DeliveryEntry[] {
  const entries: DeliveryEntry[] = []

  const materialPatterns: Array<[RegExp, string]> = [
    [/rebar|reinforc/i, 'Rebar'],
    [/concrete|ready.?mix/i, 'Concrete'],
    [/lumber|wood|2x/i, 'Lumber'],
    [/steel|beam|column/i, 'Steel'],
    [/drywall|sheetrock/i, 'Drywall'],
    [/pipe|fitting/i, 'Pipe & Fittings'],
    [/electrical|wire|conduit/i, 'Electrical Materials'],
    [/hvac|duct/i, 'HVAC Equipment'],
    [/window|glass/i, 'Windows'],
    [/door/i, 'Doors'],
    [/fixture/i, 'Fixtures'],
    [/insulation/i, 'Insulation'],
    [/roofing|membrane/i, 'Roofing Materials'],
  ]

  // Look for delivery keywords
  if (/deliver|received|arrived/i.test(notes)) {
    for (const [matPattern, matName] of materialPatterns) {
      if (matPattern.test(notes)) {
        entries.push({
          material: matName,
          supplier: 'Supplier',
          quantity: 'As noted',
          received_by: 'Site Team',
          storage_location: 'Staging Area'
        })
      }
    }
  }

  return entries.slice(0, 5)
}

function extractDelaysAndIssues(notes: string): string[] {
  const issues: string[] = []

  // Simple keyword search for delays
  if (/delay|wait|held up|could not|unable/i.test(notes)) {
    const sentences = notes.split(/[.!?]+/)
    for (const sentence of sentences) {
      if (/delay|wait|held up|could not|unable/i.test(sentence) && sentence.trim().length > 15) {
        issues.push(sentence.trim())
      }
    }
  }

  return Array.from(new Set(issues)).slice(0, 5)
}

function extractSafetyObservations(notes: string): string[] {
  const observations: string[] = []

  const safetyKeywords = ['safety', 'toolbox', 'ppe', 'hard hat', 'hazard', 'incident', 'housekeeping']

  const sentences = notes.split(/[.!?]+/)
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase()
    if (safetyKeywords.some(kw => lowerSentence.includes(kw)) && sentence.trim().length > 15) {
      observations.push(sentence.trim())
    }
  }

  return Array.from(new Set(observations)).slice(0, 5)
}

function extractVisitors(notes: string): string[] {
  const visitors: string[] = []

  if (/visit|inspector|architect|engineer|owner/i.test(notes)) {
    const sentences = notes.split(/[.!?]+/)
    for (const sentence of sentences) {
      if (/visit|inspector|architect|engineer|owner.*(?:site|project|walk)/i.test(sentence) && sentence.trim().length > 15) {
        visitors.push(sentence.trim())
      }
    }
  }

  return Array.from(new Set(visitors)).slice(0, 5)
}

function buildWeatherSummary(weather?: {
  conditions: string
  temperature_high?: number
  temperature_low?: number
  precipitation?: boolean
}): string {
  if (!weather) {
    return 'Weather conditions not recorded'
  }

  let summary = weather.conditions

  if (weather.temperature_high !== undefined || weather.temperature_low !== undefined) {
    const temps = []
    if (weather.temperature_high !== undefined) {temps.push(`High: ${weather.temperature_high}F`)}
    if (weather.temperature_low !== undefined) {temps.push(`Low: ${weather.temperature_low}F`)}
    summary += `. ${temps.join(', ')}`
  }

  if (weather.precipitation) {
    summary += '. Precipitation occurred'
  }

  return summary
}

function assessLogQuality(
  activities: WorkActivity[],
  manpower: ManpowerEntry[],
  delays: string[],
  safety: string[],
  weather?: {
    conditions: string
    temperature_high?: number
    temperature_low?: number
    precipitation?: boolean
  }
): { qualityScore: number; missingInfo: string[] } {
  let score = 100
  const missing: string[] = []

  if (activities.length === 0) {
    score -= 30
    missing.push('No work activities documented')
  }

  if (manpower.length === 0) {
    score -= 20
    missing.push('No manpower counts recorded')
  }

  if (!weather) {
    score -= 10
    missing.push('Weather conditions not documented')
  }

  if (safety.length === 0) {
    score -= 15
    missing.push('No safety observations noted')
  }

  // Check for detail level
  const activitiesWithWorkers = activities.filter(a => a.workers > 0).length
  if (activities.length > 0 && activitiesWithWorkers / activities.length < 0.5) {
    score -= 10
    missing.push('Worker counts missing from most activities')
  }

  const activitiesWithPercent = activities.filter(a => a.percent_complete !== undefined).length
  if (activities.length > 0 && activitiesWithPercent / activities.length < 0.3) {
    score -= 5
    missing.push('Progress percentages would improve tracking')
  }

  return { qualityScore: Math.max(0, score), missingInfo: missing }
}

function generateLogSuggestions(
  activities: WorkActivity[],
  manpower: ManpowerEntry[],
  delays: string[],
  qualityScore: number
): string[] {
  const suggestions: string[] = []

  if (qualityScore < 70) {
    suggestions.push('Add more detail to daily observations for better project tracking')
  }

  if (activities.length > 0 && activities.every(a => a.percent_complete === undefined)) {
    suggestions.push('Include percent complete for activities to track progress')
  }

  if (manpower.length === 0) {
    suggestions.push('Document crew sizes by trade for accurate manpower tracking')
  }

  if (delays.length > 0) {
    suggestions.push('Ensure delays are documented with root cause for potential claims')
  }

  suggestions.push('Take photos to accompany daily log entries')

  return suggestions.slice(0, 4)
}

function cleanNotes(notes: string): string {
  return notes
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 2000)
}

/**
 * Generate a professional superintendent narrative from the extracted data
 */
function generateSuperintendentNarrative(
  weatherSummary: string,
  activities: WorkActivity[],
  manpower: ManpowerEntry[],
  delays: string[],
  safety: string[],
  visitors: string[]
): string {
  const sections: string[] = []

  // Weather opening
  sections.push(`Weather conditions: ${weatherSummary}.`)

  // Manpower summary
  const totalWorkers = manpower.reduce((sum, e) => sum + e.headcount, 0)
  if (totalWorkers > 0) {
    const tradeList = manpower.map(m => `${m.headcount} ${m.trade}`).join(', ')
    sections.push(`Total workforce on site: ${totalWorkers} workers (${tradeList}).`)
  }

  // Key activities by trade
  const tradeActivities = new Map<string, string[]>()
  for (const activity of activities) {
    const existing = tradeActivities.get(activity.trade) || []
    existing.push(activity.description)
    tradeActivities.set(activity.trade, existing)
  }

  if (tradeActivities.size > 0) {
    sections.push('Work performed today:')
    tradeActivities.forEach((descriptions, trade) => {
      const uniqueDescriptions = Array.from(new Set(descriptions))
      sections.push(`- ${trade}: ${uniqueDescriptions.slice(0, 2).join('; ')}`)
    })
  }

  // Delays/issues
  if (delays.length > 0) {
    sections.push(`Issues encountered: ${delays.slice(0, 2).join('. ')}.`)
  }

  // Safety
  if (safety.length > 0) {
    sections.push(`Safety notes: ${safety.slice(0, 2).join('. ')}.`)
  } else {
    sections.push('No safety incidents to report. Safety protocols followed.')
  }

  // Visitors
  if (visitors.length > 0) {
    sections.push(`Site visitors: ${visitors.join(', ')}.`)
  }

  return sections.join(' ')
}

/**
 * Analyze productivity against industry benchmarks
 */
function analyzeProductivity(
  activities: WorkActivity[],
  manpower: ManpowerEntry[]
): { trade: string; actual_rate: string; benchmark_rate: string; variance: string }[] {
  const analysis: { trade: string; actual_rate: string; benchmark_rate: string; variance: string }[] = []

  for (const activity of activities) {
    const benchmark = TRADE_PRODUCTIVITY_BENCHMARKS[activity.trade as keyof typeof TRADE_PRODUCTIVITY_BENCHMARKS]
    if (!benchmark || !activity.quantities || activity.quantities.length === 0) continue

    // Find matching quantity for benchmark comparison
    for (const qty of activity.quantities) {
      // Try to find a matching benchmark metric
      for (const [metric, data] of Object.entries(benchmark)) {
        if (data.unit.includes(qty.unit)) {
          const manpowerForTrade = manpower.find(m => m.trade === activity.trade)
          if (manpowerForTrade && manpowerForTrade.headcount > 0) {
            const actualRate = qty.value / (manpowerForTrade.headcount * activity.hours)
            const benchmarkValue = parseFloat(data.value.toString())
            const variance = ((actualRate - benchmarkValue) / benchmarkValue * 100).toFixed(0)

            analysis.push({
              trade: activity.trade,
              actual_rate: `${actualRate.toFixed(1)} ${data.unit}`,
              benchmark_rate: `${data.value} ${data.unit}`,
              variance: `${variance}%`,
            })
          }
        }
      }
    }
  }

  return analysis.slice(0, 5) // Limit to top 5
}
