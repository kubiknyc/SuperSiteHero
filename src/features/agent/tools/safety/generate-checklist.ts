/**
 * Safety Checklist Generator Tool
 * Generates context-aware safety checklists based on work activities
 */

import { createTool } from '../registry'
import type { AgentContext } from '../../types'

interface GenerateChecklistInput {
  work_type: string
  location?: string
  weather_conditions?: string
  special_hazards?: string[]
  include_ppe?: boolean
  include_permits?: boolean
}

interface ChecklistItem {
  category: string
  item: string
  priority: 'required' | 'recommended' | 'conditional'
  frequency: 'once' | 'daily' | 'continuous'
  notes?: string
}

interface GenerateChecklistOutput {
  checklist_title: string
  work_type: string
  items: ChecklistItem[]
  ppe_requirements: string[]
  required_permits: string[]
  emergency_contacts: Array<{ role: string; action: string }>
  weather_considerations: string[]
  toolbox_talk_topics: string[]
}

export const generateSafetyChecklistTool = createTool<GenerateChecklistInput, GenerateChecklistOutput>({
  name: 'generate_safety_checklist',
  description: 'Generates a comprehensive safety checklist based on the type of work being performed. Includes PPE requirements, permits, and hazard-specific items.',
  category: 'safety',
  parameters: {
    type: 'object',
    properties: {
      work_type: {
        type: 'string',
        description: 'Type of work (e.g., excavation, roofing, electrical, concrete, demolition, steel erection)'
      },
      location: {
        type: 'string',
        description: 'Work location details (e.g., ground level, elevated, confined space)'
      },
      weather_conditions: {
        type: 'string',
        description: 'Current or expected weather (e.g., hot, cold, rain, wind)'
      },
      special_hazards: {
        type: 'array',
        items: { type: 'string' },
        description: 'Known special hazards at the site'
      },
      include_ppe: {
        type: 'boolean',
        description: 'Include PPE requirements (default: true)'
      },
      include_permits: {
        type: 'boolean',
        description: 'Include permit requirements (default: true)'
      }
    },
    required: ['work_type']
  },

  async execute(input: GenerateChecklistInput, context: AgentContext): Promise<GenerateChecklistOutput> {
    const {
      work_type,
      location = 'general',
      weather_conditions,
      special_hazards = [],
      include_ppe = true,
      include_permits = true
    } = input

    const workTypeLower = work_type.toLowerCase()

    // Get base checklist for work type
    const baseItems = getBaseChecklist(workTypeLower)

    // Add location-specific items
    const locationItems = getLocationItems(location.toLowerCase())

    // Add weather-specific items
    const weatherItems = weather_conditions
      ? getWeatherItems(weather_conditions.toLowerCase())
      : []

    // Add special hazard items
    const hazardItems = special_hazards.flatMap(h => getHazardItems(h.toLowerCase()))

    // Combine all items
    const allItems = [...baseItems, ...locationItems, ...weatherItems, ...hazardItems]

    // Get PPE requirements
    const ppeRequirements = include_ppe ? getPPERequirements(workTypeLower, location) : []

    // Get permit requirements
    const requiredPermits = include_permits ? getPermitRequirements(workTypeLower, location) : []

    // Get weather considerations
    const weatherConsiderations = weather_conditions
      ? getWeatherConsiderations(weather_conditions.toLowerCase())
      : []

    // Generate toolbox talk topics
    const toolboxTopics = generateToolboxTopics(workTypeLower, special_hazards)

    return {
      checklist_title: `Safety Checklist: ${formatWorkType(work_type)}`,
      work_type: work_type,
      items: allItems,
      ppe_requirements: ppeRequirements,
      required_permits: requiredPermits,
      emergency_contacts: [
        { role: 'Site Safety Officer', action: 'Report all incidents and near-misses' },
        { role: 'Site Superintendent', action: 'Report unsafe conditions' },
        { role: 'Emergency Services (911)', action: 'Life-threatening emergencies' },
        { role: 'Poison Control', action: 'Chemical exposure incidents' }
      ],
      weather_considerations: weatherConsiderations,
      toolbox_talk_topics: toolboxTopics
    }
  }
})

function formatWorkType(workType: string): string {
  return workType.charAt(0).toUpperCase() + workType.slice(1).toLowerCase()
}

function getBaseChecklist(workType: string): ChecklistItem[] {
  const commonItems: ChecklistItem[] = [
    { category: 'Pre-Work', item: 'Review Job Hazard Analysis (JHA)', priority: 'required', frequency: 'daily' },
    { category: 'Pre-Work', item: 'Attend toolbox talk / safety briefing', priority: 'required', frequency: 'daily' },
    { category: 'Pre-Work', item: 'Inspect PPE for damage or wear', priority: 'required', frequency: 'daily' },
    { category: 'Pre-Work', item: 'Verify emergency exits and muster points', priority: 'required', frequency: 'once' },
    { category: 'Housekeeping', item: 'Clear work area of debris and tripping hazards', priority: 'required', frequency: 'continuous' },
    { category: 'Housekeeping', item: 'Ensure proper material storage', priority: 'required', frequency: 'continuous' },
  ]

  const workTypeItems: Record<string, ChecklistItem[]> = {
    excavation: [
      { category: 'Excavation Safety', item: 'Verify utility locates completed (call 811)', priority: 'required', frequency: 'once' },
      { category: 'Excavation Safety', item: 'Install shoring/trench boxes for depths >5 feet', priority: 'required', frequency: 'once' },
      { category: 'Excavation Safety', item: 'Competent person inspection of excavation', priority: 'required', frequency: 'daily' },
      { category: 'Excavation Safety', item: 'Check for atmospheric hazards', priority: 'required', frequency: 'continuous' },
      { category: 'Excavation Safety', item: 'Maintain safe distance from excavation edge', priority: 'required', frequency: 'continuous' },
      { category: 'Excavation Safety', item: 'Provide ladder access within 25 feet', priority: 'required', frequency: 'once' },
      { category: 'Excavation Safety', item: 'Inspect after rain or water intrusion', priority: 'required', frequency: 'daily' },
    ],
    roofing: [
      { category: 'Fall Protection', item: 'Install warning lines at 6 feet from edge', priority: 'required', frequency: 'once' },
      { category: 'Fall Protection', item: 'Verify fall arrest systems inspected', priority: 'required', frequency: 'daily' },
      { category: 'Fall Protection', item: 'Cover or guard roof openings', priority: 'required', frequency: 'continuous' },
      { category: 'Roofing Safety', item: 'Check roof structural integrity', priority: 'required', frequency: 'daily' },
      { category: 'Roofing Safety', item: 'Secure materials against wind', priority: 'required', frequency: 'continuous' },
      { category: 'Roofing Safety', item: 'Monitor for heat-related illness', priority: 'required', frequency: 'continuous' },
      { category: 'Fire Safety', item: 'Fire extinguisher within 25 feet of hot work', priority: 'required', frequency: 'once' },
    ],
    electrical: [
      { category: 'Electrical Safety', item: 'Verify lockout/tagout procedures followed', priority: 'required', frequency: 'once' },
      { category: 'Electrical Safety', item: 'Test for absence of voltage', priority: 'required', frequency: 'once' },
      { category: 'Electrical Safety', item: 'Use insulated tools only', priority: 'required', frequency: 'continuous' },
      { category: 'Electrical Safety', item: 'Maintain safe approach distances', priority: 'required', frequency: 'continuous' },
      { category: 'Electrical Safety', item: 'Ground fault protection in place', priority: 'required', frequency: 'once' },
      { category: 'Electrical Safety', item: 'Arc flash PPE for live work', priority: 'conditional', frequency: 'continuous', notes: 'Required when energized work is necessary' },
      { category: 'Electrical Safety', item: 'Qualified electrician supervision', priority: 'required', frequency: 'continuous' },
    ],
    concrete: [
      { category: 'Concrete Safety', item: 'Inspect formwork and shoring', priority: 'required', frequency: 'daily' },
      { category: 'Concrete Safety', item: 'Wear rubber boots and gloves', priority: 'required', frequency: 'continuous' },
      { category: 'Concrete Safety', item: 'Eye wash station available', priority: 'required', frequency: 'once' },
      { category: 'Concrete Safety', item: 'Avoid skin contact with wet concrete', priority: 'required', frequency: 'continuous' },
      { category: 'Concrete Safety', item: 'Secure pump hoses and lines', priority: 'required', frequency: 'continuous' },
      { category: 'Concrete Safety', item: 'Traffic control for concrete trucks', priority: 'required', frequency: 'continuous' },
    ],
    demolition: [
      { category: 'Demolition Safety', item: 'Engineering survey completed', priority: 'required', frequency: 'once' },
      { category: 'Demolition Safety', item: 'Utilities disconnected and capped', priority: 'required', frequency: 'once' },
      { category: 'Demolition Safety', item: 'Hazmat survey (asbestos, lead)', priority: 'required', frequency: 'once' },
      { category: 'Demolition Safety', item: 'Exclusion zone established', priority: 'required', frequency: 'once' },
      { category: 'Demolition Safety', item: 'Dust suppression measures', priority: 'required', frequency: 'continuous' },
      { category: 'Demolition Safety', item: 'Structural stability monitoring', priority: 'required', frequency: 'continuous' },
    ],
    'steel erection': [
      { category: 'Steel Erection', item: 'Anchor bolts inspected and certified', priority: 'required', frequency: 'once' },
      { category: 'Steel Erection', item: 'Crane inspection completed', priority: 'required', frequency: 'daily' },
      { category: 'Steel Erection', item: 'Rigging inspected by competent person', priority: 'required', frequency: 'daily' },
      { category: 'Fall Protection', item: '100% tie-off above 15 feet', priority: 'required', frequency: 'continuous' },
      { category: 'Steel Erection', item: 'Column stability verified before release', priority: 'required', frequency: 'continuous' },
      { category: 'Steel Erection', item: 'Decking installed within 2 floors', priority: 'required', frequency: 'continuous' },
    ],
    welding: [
      { category: 'Hot Work', item: 'Hot work permit obtained', priority: 'required', frequency: 'daily' },
      { category: 'Hot Work', item: 'Fire watch assigned', priority: 'required', frequency: 'continuous' },
      { category: 'Hot Work', item: 'Combustibles removed or covered', priority: 'required', frequency: 'once' },
      { category: 'Hot Work', item: 'Adequate ventilation verified', priority: 'required', frequency: 'continuous' },
      { category: 'Hot Work', item: 'Welding screens in place', priority: 'required', frequency: 'continuous' },
      { category: 'Hot Work', item: 'Cylinder storage and handling', priority: 'required', frequency: 'continuous' },
    ],
  }

  const typeItems = workTypeItems[workType] || []

  return [...commonItems, ...typeItems]
}

function getLocationItems(location: string): ChecklistItem[] {
  const items: ChecklistItem[] = []

  if (/elevated|height|roof|scaffold/i.test(location)) {
    items.push(
      { category: 'Fall Protection', item: 'Fall protection system in place', priority: 'required', frequency: 'continuous' },
      { category: 'Fall Protection', item: 'Guardrails or personal fall arrest', priority: 'required', frequency: 'continuous' },
      { category: 'Fall Protection', item: 'Scaffold inspection tag current', priority: 'required', frequency: 'daily' }
    )
  }

  if (/confined|tank|pit|vault/i.test(location)) {
    items.push(
      { category: 'Confined Space', item: 'Confined space permit obtained', priority: 'required', frequency: 'once' },
      { category: 'Confined Space', item: 'Atmospheric testing completed', priority: 'required', frequency: 'continuous' },
      { category: 'Confined Space', item: 'Attendant stationed at entry', priority: 'required', frequency: 'continuous' },
      { category: 'Confined Space', item: 'Rescue equipment available', priority: 'required', frequency: 'once' }
    )
  }

  return items
}

function getWeatherItems(weather: string): ChecklistItem[] {
  const items: ChecklistItem[] = []

  if (/hot|heat|summer/i.test(weather)) {
    items.push(
      { category: 'Heat Safety', item: 'Water and shade available', priority: 'required', frequency: 'continuous' },
      { category: 'Heat Safety', item: 'Rest breaks scheduled', priority: 'required', frequency: 'continuous' },
      { category: 'Heat Safety', item: 'Monitor workers for heat illness', priority: 'required', frequency: 'continuous' }
    )
  }

  if (/cold|winter|freeze/i.test(weather)) {
    items.push(
      { category: 'Cold Safety', item: 'Heated break areas available', priority: 'required', frequency: 'continuous' },
      { category: 'Cold Safety', item: 'Check for ice/slipping hazards', priority: 'required', frequency: 'daily' },
      { category: 'Cold Safety', item: 'Monitor for frostbite/hypothermia', priority: 'required', frequency: 'continuous' }
    )
  }

  if (/rain|wet|storm/i.test(weather)) {
    items.push(
      { category: 'Weather Safety', item: 'Suspend outdoor elevated work', priority: 'conditional', frequency: 'continuous', notes: 'When surfaces are slippery' },
      { category: 'Weather Safety', item: 'Cover electrical connections', priority: 'required', frequency: 'continuous' },
      { category: 'Weather Safety', item: 'Check excavation stability', priority: 'required', frequency: 'daily' }
    )
  }

  if (/wind|windy/i.test(weather)) {
    items.push(
      { category: 'Wind Safety', item: 'Secure loose materials', priority: 'required', frequency: 'continuous' },
      { category: 'Wind Safety', item: 'Suspend crane operations if wind >25mph', priority: 'required', frequency: 'continuous' },
      { category: 'Wind Safety', item: 'Monitor wind speed regularly', priority: 'required', frequency: 'continuous' }
    )
  }

  return items
}

function getHazardItems(hazard: string): ChecklistItem[] {
  const items: ChecklistItem[] = []

  if (/asbestos/i.test(hazard)) {
    items.push(
      { category: 'Hazmat', item: 'Asbestos abatement contractor on site', priority: 'required', frequency: 'continuous' },
      { category: 'Hazmat', item: 'Containment area established', priority: 'required', frequency: 'once' },
      { category: 'Hazmat', item: 'Air monitoring in place', priority: 'required', frequency: 'continuous' }
    )
  }

  if (/lead/i.test(hazard)) {
    items.push(
      { category: 'Hazmat', item: 'Lead exposure assessment completed', priority: 'required', frequency: 'once' },
      { category: 'Hazmat', item: 'Respiratory protection program', priority: 'required', frequency: 'continuous' },
      { category: 'Hazmat', item: 'Decontamination procedures in place', priority: 'required', frequency: 'continuous' }
    )
  }

  if (/silica/i.test(hazard)) {
    items.push(
      { category: 'Hazmat', item: 'Silica exposure control plan', priority: 'required', frequency: 'once' },
      { category: 'Hazmat', item: 'Wet cutting methods used', priority: 'required', frequency: 'continuous' },
      { category: 'Hazmat', item: 'Respiratory protection required', priority: 'required', frequency: 'continuous' }
    )
  }

  return items
}

function getPPERequirements(workType: string, location: string): string[] {
  const basePPE = [
    'Hard hat (ANSI Z89.1)',
    'Safety glasses (ANSI Z87.1)',
    'High-visibility vest (Class 2 minimum)',
    'Safety-toe boots (ASTM F2413)',
    'Work gloves appropriate for task'
  ]

  const additionalPPE: string[] = []

  if (/weld|cut|grind/i.test(workType)) {
    additionalPPE.push(
      'Welding helmet with proper shade',
      'Leather welding gloves',
      'Flame-resistant clothing',
      'Welding jacket or sleeves'
    )
  }

  if (/electrical/i.test(workType)) {
    additionalPPE.push(
      'Voltage-rated gloves',
      'Arc flash face shield',
      'Arc-rated clothing (appropriate cal/cm²)'
    )
  }

  if (/concrete/i.test(workType)) {
    additionalPPE.push(
      'Rubber boots',
      'Chemical-resistant gloves',
      'Long sleeves to prevent skin contact'
    )
  }

  if (/elevated|height|roof/i.test(location)) {
    additionalPPE.push(
      'Full body harness',
      'Shock-absorbing lanyard',
      'Self-retracting lifeline (SRL)'
    )
  }

  if (/confined/i.test(location)) {
    additionalPPE.push(
      'Supplied air respirator',
      'Gas detector/monitor',
      'Retrieval system'
    )
  }

  return [...basePPE, ...additionalPPE]
}

function getPermitRequirements(workType: string, location: string): string[] {
  const permits: string[] = []

  if (/excavation|dig/i.test(workType)) {
    permits.push('Excavation permit', 'Utility locate confirmation (811)')
  }

  if (/weld|cut|torch|hot/i.test(workType)) {
    permits.push('Hot work permit')
  }

  if (/confined|tank|vault/i.test(location)) {
    permits.push('Confined space entry permit')
  }

  if (/electrical/i.test(workType)) {
    permits.push('Electrical work permit', 'Lockout/Tagout authorization')
  }

  if (/crane|lift|hoist/i.test(workType)) {
    permits.push('Crane lift plan approval', 'Critical lift permit (if applicable)')
  }

  if (/demolition/i.test(workType)) {
    permits.push('Demolition permit', 'Hazmat clearance')
  }

  return permits.length > 0 ? permits : ['Standard work authorization']
}

function getWeatherConsiderations(weather: string): string[] {
  const considerations: string[] = []

  if (/hot|heat/i.test(weather)) {
    considerations.push(
      'Schedule strenuous work for early morning',
      'Mandatory water breaks every 20-30 minutes',
      'Know the signs of heat exhaustion and heat stroke',
      'Acclimatization period for new workers'
    )
  }

  if (/cold/i.test(weather)) {
    considerations.push(
      'Limit exposure time outdoors',
      'Provide warm beverages',
      'Watch for hypothermia symptoms',
      'Check equipment for cold weather operation'
    )
  }

  if (/rain|storm/i.test(weather)) {
    considerations.push(
      'Lightning safety: 30-30 rule',
      'Avoid contact with standing water near electrical',
      'Increased slip and fall hazard',
      'May need to suspend work'
    )
  }

  return considerations
}

function generateToolboxTopics(workType: string, hazards: string[]): string[] {
  const topics: string[] = []

  // General topics
  topics.push('Stop Work Authority - When and how to use it')

  // Work-type specific
  if (/excavation/i.test(workType)) {
    topics.push('Trench safety and cave-in prevention')
  }

  if (/electrical/i.test(workType)) {
    topics.push('Lockout/Tagout procedures')
  }

  if (/elevated|roof|height/i.test(workType)) {
    topics.push('Fall protection and 100% tie-off')
  }

  if (/concrete/i.test(workType)) {
    topics.push('Concrete burns and prevention')
  }

  // Hazard-specific
  for (const hazard of hazards) {
    if (/silica/i.test(hazard)) {
      topics.push('Silica exposure and respiratory protection')
    }
  }

  // Always include
  topics.push('Incident reporting and near-miss documentation')

  return topics.slice(0, 5)
}
