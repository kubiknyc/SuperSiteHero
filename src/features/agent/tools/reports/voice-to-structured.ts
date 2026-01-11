/**
 * Voice to Structured Data Tool
 * Convert voice/text notes into structured daily report format using NLP
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'

interface VoiceToStructuredInput {
  project_id: string
  raw_text: string
  date: string
  context?: {
    trades_on_site?: string[]
    scheduled_activities?: string[]
  }
}

interface WorkActivity {
  trade: string
  description: string
  location: string
  workers: number
  hours: number
  percent_complete?: number
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
}

interface DeliveryEntry {
  material: string
  supplier: string
  quantity: string
  notes?: string
}

interface AmbiguousItem {
  original_text: string
  interpretation: string
  alternatives: string[]
  needs_clarification: boolean
}

interface VoiceToStructuredOutput {
  structured_data: {
    work_activities: WorkActivity[]
    manpower: ManpowerEntry[]
    equipment: EquipmentEntry[]
    deliveries: DeliveryEntry[]
    delays_issues: string[]
    safety_observations: string[]
    visitors: string[]
    notes: string
  }
  extraction_confidence: number
  ambiguous_items: AmbiguousItem[]
  missing_required: string[]
}

// Trade patterns for extraction
const TRADE_PATTERNS: Array<[RegExp, string]> = [
  [/concrete|pour|slab|foundation|footing|deck pour/i, 'Concrete'],
  [/framing|fram|stud|wood|carpenter|truss|joist/i, 'Framing'],
  [/electrical|electric|wire|outlet|panel|conduit|pulling wire/i, 'Electrical'],
  [/plumbing|plumb|pipe|drain|fixture|sanitary|domestic/i, 'Plumbing'],
  [/hvac|duct|mechanical|air handler|vav|diffuser/i, 'HVAC'],
  [/drywall|sheetrock|gypsum|hanging board|taping|finishing/i, 'Drywall'],
  [/painting|paint|primer|coat|rolling|spraying/i, 'Painting'],
  [/roofing|roof|shingle|membrane|flashing/i, 'Roofing'],
  [/flooring|floor|tile|carpet|lvt|epoxy/i, 'Flooring'],
  [/masonry|brick|block|stone|cmu/i, 'Masonry'],
  [/steel|iron|metal|beam|column|erection/i, 'Steel'],
  [/insulation|insulate|batt|spray foam/i, 'Insulation'],
  [/fire.*protect|sprinkler|fire.*alarm/i, 'Fire Protection'],
  [/elevator/i, 'Elevator'],
  [/landscape|landscap|irrigation/i, 'Landscaping'],
  [/site.*work|excavat|grad|earthwork/i, 'Site Work'],
  [/demolition|demo/i, 'Demolition'],
  [/glass|glazing|window|storefront/i, 'Glazing'],
  [/ceiling|act|acoustic|grid/i, 'Ceiling'],
  [/millwork|casework|cabinet/i, 'Millwork'],
]

// Equipment patterns
const EQUIPMENT_PATTERNS: Array<[RegExp, string]> = [
  [/crane/i, 'Crane'],
  [/excavator|backhoe/i, 'Excavator'],
  [/loader|skid.?steer|bobcat/i, 'Loader'],
  [/forklift|telehandler|lull|reach/i, 'Forklift'],
  [/concrete.?pump|pump.?truck/i, 'Concrete Pump'],
  [/dump.?truck/i, 'Dump Truck'],
  [/boom.?lift|man.?lift|jlg|genie/i, 'Boom Lift'],
  [/scissor.?lift/i, 'Scissor Lift'],
  [/compactor|roller/i, 'Compactor'],
  [/generator/i, 'Generator'],
  [/welder/i, 'Welder'],
  [/compressor/i, 'Air Compressor'],
  [/mixer|concrete mixer/i, 'Concrete Mixer'],
  [/scaffold/i, 'Scaffolding'],
]

// Location patterns
const LOCATION_PATTERNS = [
  /(?:in|at|on)\s+(floor\s*\d+|level\s*\d+|room\s*\d+|area\s*[a-z]|building\s*[a-z]|wing\s*[a-z])/i,
  /(north|south|east|west)\s+(wing|side|end)/i,
  /(basement|ground|first|second|third|fourth|fifth|roof)\s*(?:floor|level)?/i,
  /(?:in|at)\s+the\s+(\w+\s+(?:area|room|wing|section))/i,
]

function extractTrade(text: string): string {
  for (const [pattern, trade] of TRADE_PATTERNS) {
    if (pattern.test(text)) {
      return trade
    }
  }
  return 'General'
}

function extractLocation(text: string): string {
  for (const pattern of LOCATION_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      return match[0].replace(/^(?:in|at|on)\s+/i, '')
    }
  }
  return 'General Area'
}

function extractNumbers(text: string): { workers: number; hours: number; percent?: number } {
  const workerMatch = text.match(/(\d+)\s*(?:workers?|men|guys|people|crew|hands)/i)
  const hoursMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/i)
  const percentMatch = text.match(/(\d+)\s*%\s*(?:complete|done|finished)?/i)

  return {
    workers: workerMatch ? parseInt(workerMatch[1]) : 0,
    hours: hoursMatch ? parseFloat(hoursMatch[1]) : 8,
    percent: percentMatch ? parseInt(percentMatch[1]) : undefined
  }
}

function splitIntoSentences(text: string): string[] {
  // Split on periods, exclamation marks, or double newlines
  return text
    .split(/[.!?]+|\n\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 5)
}

function isWorkActivity(sentence: string): boolean {
  const workVerbs = /work|install|pour|set|lay|hang|run|pull|connect|finish|complete|start|continue|progress|erect|place|rough|trim|test|inspect|frame|wire|pipe|duct|paint|tape|sand|patch|grout|set|anchor/i
  return workVerbs.test(sentence)
}

function isDelayOrIssue(sentence: string): boolean {
  return /delay|wait|held up|could not|unable|problem|issue|concern|behind|stopped|shortage|missing|damaged|broken|rain|weather/i.test(sentence)
}

function isSafetyObservation(sentence: string): boolean {
  return /safety|toolbox|ppe|hard hat|hazard|incident|near miss|housekeeping|violation|corrected|caution|warning|injury|first aid/i.test(sentence)
}

function isVisitor(sentence: string): boolean {
  return /visit|inspector|architect|engineer|owner|client|walked|tour|meeting|representative|rep from/i.test(sentence)
}

function isDelivery(sentence: string): boolean {
  return /deliver|received|arrived|shipment|truck|material|drop|unload/i.test(sentence)
}

export const voiceToStructuredTool = createTool<VoiceToStructuredInput, VoiceToStructuredOutput>({
  name: 'voice_to_structured',
  displayName: 'Voice to Structured Data',
  description: 'Converts voice transcription or raw text notes into structured daily report format. Extracts work activities, manpower, equipment, deliveries, issues, and safety observations.',
  category: 'report',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID for context'
      },
      raw_text: {
        type: 'string',
        description: 'Raw voice transcription or typed notes to parse'
      },
      date: {
        type: 'string',
        description: 'Date for the report (ISO format)'
      },
      context: {
        type: 'object',
        description: 'Optional context to improve extraction accuracy',
        properties: {
          trades_on_site: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of trades expected on site'
          },
          scheduled_activities: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of scheduled activities for reference'
          }
        }
      }
    },
    required: ['project_id', 'raw_text', 'date']
  },
  requiresConfirmation: false,
  estimatedTokens: 1200,

  async execute(input, context) {
    const { project_id, raw_text, date, context: inputContext } = input

    // Get subcontractors for company matching
    const { data: subcontractors } = await supabase
      .from('subcontractors')
      .select('company_name, trade')
      .eq('project_id', project_id)

    const tradeToCompany = new Map<string, string>(
      (subcontractors?.map(s => [s.trade?.toLowerCase() || '', s.company_name || '']) || []) as [string, string][]
    )

    // Split text into sentences
    const sentences = splitIntoSentences(raw_text)

    // Extract data from sentences
    const workActivities: WorkActivity[] = []
    const manpowerMap = new Map<string, ManpowerEntry>()
    const equipmentMap = new Map<string, EquipmentEntry>()
    const deliveries: DeliveryEntry[] = []
    const delaysIssues: string[] = []
    const safetyObservations: string[] = []
    const visitors: string[] = []
    const ambiguousItems: AmbiguousItem[] = []

    for (const sentence of sentences) {
      // Check for delays/issues first (they often contain work verbs too)
      if (isDelayOrIssue(sentence)) {
        delaysIssues.push(sentence)
        continue
      }

      // Check for safety observations
      if (isSafetyObservation(sentence)) {
        safetyObservations.push(sentence)
        continue
      }

      // Check for visitors
      if (isVisitor(sentence)) {
        visitors.push(sentence)
        continue
      }

      // Check for deliveries
      if (isDelivery(sentence)) {
        const material = extractDeliveryMaterial(sentence)
        deliveries.push({
          material: material || 'Materials',
          supplier: 'Supplier',
          quantity: 'As noted',
          notes: sentence
        })
        continue
      }

      // Check for work activities
      if (isWorkActivity(sentence)) {
        const trade = extractTrade(sentence)
        const location = extractLocation(sentence)
        const numbers = extractNumbers(sentence)

        workActivities.push({
          trade,
          description: cleanDescription(sentence),
          location,
          workers: numbers.workers,
          hours: numbers.hours,
          percent_complete: numbers.percent
        })

        // Update manpower tracking
        if (numbers.workers > 0) {
          const existing = manpowerMap.get(trade)
          if (existing) {
            existing.headcount = Math.max(existing.headcount, numbers.workers)
          } else {
            manpowerMap.set(trade, {
              trade,
              company: tradeToCompany.get(trade.toLowerCase()) || 'Unknown',
              headcount: numbers.workers,
              hours_worked: numbers.hours
            })
          }
        }
      }

      // Check for equipment mentions
      for (const [pattern, equipType] of EQUIPMENT_PATTERNS) {
        if (pattern.test(sentence)) {
          const quantityMatch = sentence.match(/(\d+)\s*(?:${pattern.source})/i)
          const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1
          const isIdle = /idle|down|not working|broken/i.test(sentence)
          const isMaintenance = /maintenance|repair|service/i.test(sentence)

          equipmentMap.set(equipType, {
            type: equipType,
            quantity,
            status: isMaintenance ? 'maintenance' : isIdle ? 'idle' : 'active'
          })
        }
      }
    }

    // Identify ambiguous items
    for (const sentence of sentences) {
      const trade = extractTrade(sentence)
      if (trade === 'General' && isWorkActivity(sentence)) {
        ambiguousItems.push({
          original_text: sentence,
          interpretation: 'Work activity - trade unclear',
          alternatives: ['Could be site work', 'Could be general conditions', 'Could be supervision'],
          needs_clarification: true
        })
      }
    }

    // Check for missing required information
    const missingRequired: string[] = []
    if (workActivities.length === 0) {
      missingRequired.push('No work activities detected - please describe today\'s work')
    }
    if (manpowerMap.size === 0) {
      missingRequired.push('No manpower counts detected - please specify crew sizes')
    }
    if (!raw_text.toLowerCase().includes('weather')) {
      missingRequired.push('Weather conditions not mentioned')
    }

    // Calculate confidence score
    let confidence = 0.5 // Base confidence
    if (workActivities.length > 0) {confidence += 0.15}
    if (manpowerMap.size > 0) {confidence += 0.15}
    if (delaysIssues.length > 0 || safetyObservations.length > 0) {confidence += 0.1}
    if (ambiguousItems.length === 0) {confidence += 0.1}
    confidence = Math.min(confidence, 0.95)

    return {
      success: true,
      data: {
        structured_data: {
          work_activities: workActivities,
          manpower: Array.from(manpowerMap.values()),
          equipment: Array.from(equipmentMap.values()),
          deliveries,
          delays_issues: delaysIssues,
          safety_observations: safetyObservations,
          visitors,
          notes: raw_text.substring(0, 2000)
        },
        extraction_confidence: confidence,
        ambiguous_items: ambiguousItems,
        missing_required: missingRequired
      },
      metadata: {
        executionTimeMs: 0
      }
    }
  },

  formatOutput(output) {
    const { structured_data, extraction_confidence, ambiguous_items, missing_required } = output

    return {
      title: 'Notes Parsed Successfully',
      summary: `${structured_data.work_activities.length} activities, ${structured_data.manpower.length} trades - ${Math.round(extraction_confidence * 100)}% confidence`,
      icon: 'mic',
      status: extraction_confidence > 0.7 ? 'success' : 'warning',
      details: [
        { label: 'Work Activities', value: structured_data.work_activities.length, type: 'text' },
        { label: 'Trades', value: structured_data.manpower.length, type: 'text' },
        { label: 'Equipment', value: structured_data.equipment.length, type: 'text' },
        { label: 'Issues/Delays', value: structured_data.delays_issues.length, type: 'text' },
        { label: 'Safety Notes', value: structured_data.safety_observations.length, type: 'text' },
        { label: 'Confidence', value: `${Math.round(extraction_confidence * 100)}%`, type: 'badge' }
      ],
      expandedContent: {
        structured_data,
        ambiguous_items,
        missing_required
      }
    }
  }
})

function cleanDescription(text: string): string {
  return text
    .replace(/\d+\s*(?:workers?|men|guys|people|crew|hands)/gi, '')
    .replace(/\d+(?:\.\d+)?\s*(?:hours?|hrs?)/gi, '')
    .replace(/\d+\s*%\s*(?:complete|done|finished)?/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractDeliveryMaterial(text: string): string | null {
  const materials = [
    'rebar', 'concrete', 'lumber', 'steel', 'drywall', 'pipe', 'electrical',
    'hvac', 'windows', 'doors', 'fixtures', 'insulation', 'roofing', 'paint',
    'hardware', 'equipment', 'materials'
  ]

  const lowerText = text.toLowerCase()
  for (const material of materials) {
    if (lowerText.includes(material)) {
      return material.charAt(0).toUpperCase() + material.slice(1)
    }
  }
  return null
}
