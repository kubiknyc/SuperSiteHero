/**
 * Create Safety Observation Tool
 * Create structured safety observations from field notes/voice input with auto-classification
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'

interface CreateSafetyObservationInput {
  project_id: string
  company_id: string
  description: string
  observation_type?: 'positive' | 'negative' | 'corrective_action'
  category?: string
  location?: string
  photo_urls?: string[]
  recognized_person?: string
}

interface AutoClassifications {
  type: 'positive' | 'negative' | 'corrective_action'
  type_confidence: number
  category: string
  category_confidence: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  severity_confidence: number
}

interface SimilarObservation {
  id: string
  description: string
  resolution?: string
  similarity: number
}

interface CreateSafetyObservationOutput {
  observation: {
    id: string
    description: string
    observation_type: string
    category: string
    severity: string
    location: string
    status: string
    created_at: string
  }
  auto_classifications: AutoClassifications
  suggested_corrective_actions?: string[]
  points_awarded: number
  similar_observations: SimilarObservation[]
}

// Category detection patterns
const CATEGORY_PATTERNS: Array<{ pattern: RegExp; category: string }> = [
  { pattern: /hard.?hat|safety.?glass|glove|vest|ppe|hearing|respiratory|boot/i, category: 'ppe' },
  { pattern: /housekeeping|clean|debris|clutter|organize|trip.?hazard|slip/i, category: 'housekeeping' },
  { pattern: /equipment|tool|machine|ladder|scaffold|lift|crane|forklift/i, category: 'equipment' },
  { pattern: /procedure|process|method|lock.?out|tag.?out|permit|hot.?work/i, category: 'procedure' },
  { pattern: /behavior|unsafe.?act|shortcut|horseplay|distract|phone|rushing/i, category: 'behavior' },
  { pattern: /condition|guard|rail|cover|hole|opening|edge|fall/i, category: 'condition' },
  { pattern: /near.?miss|close.?call|almost|could.?have|narrowly/i, category: 'near_miss' },
]

// Severity detection patterns
const SEVERITY_INDICATORS = {
  critical: [/fatal|death|life.?threat|immediate.?danger|serious.?injury|collapse|fall.?from.?height/i],
  high: [/hospitalize|fracture|lacerat|electr|amputation|chemical|exposure|struck.?by/i],
  medium: [/minor.?injury|first.?aid|bruise|cut|scrape|strain|sprain|minor/i],
  low: [/positive|good|excellent|proper|correct|wearing|following|compliant/i],
}

// Positive observation indicators
const POSITIVE_INDICATORS = [
  /good|great|excellent|proper|correct|wearing|following|compliant|observed.*using/i,
  /thank|recognize|appreciate|kudos|well.?done|good.?job|safe.?behavior/i,
  /correctly|properly|as.?required|per.?procedure|full.?ppe/i,
]

// Negative/corrective indicators
const NEGATIVE_INDICATORS = [
  /not.?wearing|missing|forgot|failed|violation|unsafe|hazard|danger/i,
  /corrected|fixed|addressed|resolved|removed|cleaned|repaired/i,
  /immediately|stopped|intervened|warned|reminded/i,
]

function detectObservationType(text: string): { type: 'positive' | 'negative' | 'corrective_action'; confidence: number } {
  const lowerText = text.toLowerCase()

  // Check for positive indicators
  for (const pattern of POSITIVE_INDICATORS) {
    if (pattern.test(lowerText)) {
      // Check if it's actually a corrective action
      if (/correct|fix|address|resolve/i.test(lowerText)) {
        return { type: 'corrective_action', confidence: 0.8 }
      }
      return { type: 'positive', confidence: 0.85 }
    }
  }

  // Check for negative/corrective indicators
  for (const pattern of NEGATIVE_INDICATORS) {
    if (pattern.test(lowerText)) {
      // Check if it was corrected
      if (/corrected|fixed|addressed|resolved/i.test(lowerText)) {
        return { type: 'corrective_action', confidence: 0.9 }
      }
      return { type: 'negative', confidence: 0.85 }
    }
  }

  // Default to negative for safety observations
  return { type: 'negative', confidence: 0.5 }
}

function detectCategory(text: string): { category: string; confidence: number } {
  for (const { pattern, category } of CATEGORY_PATTERNS) {
    if (pattern.test(text)) {
      return { category, confidence: 0.85 }
    }
  }
  return { category: 'general', confidence: 0.4 }
}

function detectSeverity(text: string, type: string): { severity: 'low' | 'medium' | 'high' | 'critical'; confidence: number } {
  // Positive observations are always low severity
  if (type === 'positive') {
    return { severity: 'low', confidence: 0.95 }
  }

  for (const [level, patterns] of Object.entries(SEVERITY_INDICATORS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return { severity: level as 'low' | 'medium' | 'high' | 'critical', confidence: 0.8 }
      }
    }
  }

  return { severity: 'medium', confidence: 0.5 }
}

function calculatePoints(type: string, severity: string): number {
  // Gamification points for safety observations
  const basePoints: Record<string, number> = {
    'positive': 10,
    'negative': 5,
    'corrective_action': 15,
  }

  const severityMultiplier: Record<string, number> = {
    'critical': 2.0,
    'high': 1.5,
    'medium': 1.0,
    'low': 0.8,
  }

  return Math.round((basePoints[type] || 5) * (severityMultiplier[severity] || 1))
}

function generateCorrectiveActions(category: string, severity: string): string[] {
  const actions: Record<string, string[]> = {
    'ppe': [
      'Provide required PPE to worker',
      'Conduct PPE refresher training',
      'Post PPE requirements signage',
      'Review PPE policy with crew',
    ],
    'housekeeping': [
      'Clean and organize work area',
      'Establish daily housekeeping routine',
      'Provide additional trash containers',
      'Schedule housekeeping inspection',
    ],
    'equipment': [
      'Remove defective equipment from service',
      'Schedule equipment inspection',
      'Provide equipment training',
      'Install equipment guards',
    ],
    'procedure': [
      'Review procedure with workers',
      'Update procedure documentation',
      'Conduct procedure training',
      'Post procedure at work location',
    ],
    'behavior': [
      'Counsel worker on safe behavior',
      'Conduct safety stand-down',
      'Review safety expectations',
      'Implement buddy system',
    ],
    'condition': [
      'Barricade/guard hazard immediately',
      'Report to appropriate trade for repair',
      'Install warning signage',
      'Schedule permanent fix',
    ],
    'near_miss': [
      'Conduct incident investigation',
      'Identify root causes',
      'Implement preventive measures',
      'Share lessons learned with crew',
    ],
  }

  return actions[category] || [
    'Investigate and document finding',
    'Implement corrective measures',
    'Follow up to verify correction',
  ]
}

export const createSafetyObservationTool = createTool<CreateSafetyObservationInput, CreateSafetyObservationOutput>({
  name: 'create_safety_observation',
  displayName: 'Create Safety Observation',
  description: 'Creates a structured safety observation from text description with automatic classification of type, category, and severity. Supports positive observations, hazard identification, and corrective actions.',
  category: 'action',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID'
      },
      company_id: {
        type: 'string',
        description: 'The company ID'
      },
      description: {
        type: 'string',
        description: 'Description of the safety observation'
      },
      observation_type: {
        type: 'string',
        enum: ['positive', 'negative', 'corrective_action'],
        description: 'Type of observation (optional, will be auto-detected)'
      },
      category: {
        type: 'string',
        description: 'Category of observation (optional, will be auto-detected)'
      },
      location: {
        type: 'string',
        description: 'Location where observation was made'
      },
      photo_urls: {
        type: 'array',
        items: { type: 'string' },
        description: 'URLs of attached photos'
      },
      recognized_person: {
        type: 'string',
        description: 'Person being recognized (for positive observations)'
      }
    },
    required: ['project_id', 'company_id', 'description']
  },
  requiresConfirmation: false,
  estimatedTokens: 600,

  async execute(input, context) {
    const {
      project_id,
      company_id,
      description,
      observation_type,
      category,
      location,
      photo_urls,
      recognized_person
    } = input

    // Auto-classify if not provided
    const typeResult = observation_type
      ? { type: observation_type, confidence: 1.0 }
      : detectObservationType(description)

    const categoryResult = category
      ? { category, confidence: 1.0 }
      : detectCategory(description)

    const severityResult = detectSeverity(description, typeResult.type)

    // Calculate points
    const points = calculatePoints(typeResult.type, severityResult.severity)

    // Generate corrective actions for non-positive observations
    const correctiveActions = typeResult.type !== 'positive'
      ? generateCorrectiveActions(categoryResult.category, severityResult.severity)
      : undefined

    // Create the observation
    const observationData = {
      project_id,
      company_id,
      description,
      observation_type: typeResult.type,
      category: categoryResult.category,
      severity: severityResult.severity,
      location: location || 'Not specified',
      status: typeResult.type === 'corrective_action' ? 'corrected' : 'open',
      recognized_person,
      created_by: context.userId,
      points_awarded: points,
    }

    const { data: observation, error } = await supabase
      .from('safety_observations')
      .insert(observationData)
      .select()
      .single()

    if (error) {
      return {
        success: false,
        error: `Failed to create observation: ${error.message}`,
        errorCode: 'CREATE_FAILED'
      }
    }

    // Find similar observations
    const { data: similarObs } = await supabase
      .from('safety_observations')
      .select('id, description, status')
      .eq('project_id', project_id)
      .eq('category', categoryResult.category)
      .neq('id', observation.id)
      .order('created_at', { ascending: false })
      .limit(5)

    const similarObservations: SimilarObservation[] = (similarObs || []).map(obs => ({
      id: obs.id,
      description: obs.description,
      resolution: obs.status === 'closed' ? 'Resolved' : undefined,
      similarity: 0.7 // Simplified similarity score
    }))

    // Add photos if provided
    if (photo_urls && photo_urls.length > 0) {
      for (const url of photo_urls) {
        await supabase
          .from('safety_observation_photos')
          .insert({
            observation_id: observation.id,
            photo_url: url,
            uploaded_by: context.userId,
          })
      }
    }

    return {
      success: true,
      data: {
        observation: {
          id: observation.id,
          description: observation.description,
          observation_type: observation.observation_type,
          category: observation.category,
          severity: observation.severity,
          location: observation.location,
          status: observation.status,
          created_at: observation.created_at,
        },
        auto_classifications: {
          type: typeResult.type,
          type_confidence: typeResult.confidence,
          category: categoryResult.category,
          category_confidence: categoryResult.confidence,
          severity: severityResult.severity,
          severity_confidence: severityResult.confidence,
        },
        suggested_corrective_actions: correctiveActions,
        points_awarded: points,
        similar_observations: similarObservations,
      },
      metadata: {
        executionTimeMs: 0
      }
    }
  },

  formatOutput(output) {
    const { observation, auto_classifications, points_awarded } = output

    const typeIcons: Record<string, string> = {
      'positive': 'thumbs-up',
      'negative': 'alert-triangle',
      'corrective_action': 'check-circle',
    }

    const statusColors: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
      'positive': 'success',
      'negative': 'warning',
      'corrective_action': 'info',
    }

    return {
      title: `${observation.observation_type.replace('_', ' ')} Observation Created`,
      summary: `${observation.category} - ${observation.severity} severity - +${points_awarded} points`,
      icon: typeIcons[observation.observation_type] || 'clipboard',
      status: statusColors[observation.observation_type] || 'info',
      details: [
        { label: 'Type', value: observation.observation_type.replace('_', ' '), type: 'badge' },
        { label: 'Category', value: observation.category, type: 'text' },
        { label: 'Severity', value: observation.severity, type: 'badge' },
        { label: 'Location', value: observation.location, type: 'text' },
        { label: 'Points', value: `+${points_awarded}`, type: 'text' },
      ],
      actions: [
        {
          id: 'view',
          label: 'View Observation',
          icon: 'eye',
          action: 'navigate',
          data: { path: `/safety/observations/${observation.id}` }
        }
      ],
      expandedContent: output as unknown as Record<string, unknown>
    }
  }
})
