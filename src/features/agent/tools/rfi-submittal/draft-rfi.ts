/**
 * Draft RFI Tool
 * Helps users create well-structured RFIs with proper formatting and context
 */

import { createTool } from '../registry'
import type { AgentContext } from '../../types'

interface DraftRFIInput {
  subject: string
  question: string
  context?: string
  spec_section?: string
  drawing_reference?: string
  urgency?: 'low' | 'normal' | 'high' | 'critical'
}

interface DraftRFIOutput {
  draft: {
    subject: string
    question: string
    background: string
    impact_if_not_resolved: string
    suggested_spec_section: string
    suggested_drawing_refs: string[]
    suggested_priority: string
    suggested_assignee_role: string
  }
  suggestions: string[]
}

export const draftRFITool = createTool<DraftRFIInput, DraftRFIOutput>({
  name: 'draft_rfi',
  description: 'Helps draft a well-structured RFI (Request for Information) with proper formatting, context, and suggestions for routing. Use when user wants to create a new RFI or needs help formulating their question.',
  category: 'rfi_submittal',
  parameters: {
    type: 'object',
    properties: {
      subject: {
        type: 'string',
        description: 'Brief subject line for the RFI'
      },
      question: {
        type: 'string',
        description: 'The main question or clarification being requested'
      },
      context: {
        type: 'string',
        description: 'Additional context about why this RFI is needed'
      },
      spec_section: {
        type: 'string',
        description: 'Related specification section (CSI format)'
      },
      drawing_reference: {
        type: 'string',
        description: 'Related drawing sheet number or reference'
      },
      urgency: {
        type: 'string',
        enum: ['low', 'normal', 'high', 'critical'],
        description: 'How urgent is this RFI'
      }
    },
    required: ['subject', 'question']
  },

  async execute(input: DraftRFIInput, context: AgentContext): Promise<DraftRFIOutput> {
    const { subject, question, context: rfiContext, spec_section, drawing_reference, urgency } = input

    // Build a more detailed background from the provided context
    const background = rfiContext
      ? `This RFI is being submitted to clarify the following: ${rfiContext}`
      : `Clarification is needed regarding ${subject.toLowerCase()} to ensure proper installation and compliance with contract documents.`

    // Determine impact based on urgency
    const impactMap = {
      critical: 'Work is currently stopped or will stop within 24 hours without resolution. Critical path activity affected.',
      high: 'Work in this area will be delayed within the next week without resolution. May affect upcoming scheduled activities.',
      normal: 'Resolution needed before this phase of work can proceed. No immediate schedule impact.',
      low: 'General clarification needed for future reference. No current work impact.'
    }

    // Suggest spec section if not provided
    const suggestedSpecSection = spec_section || inferSpecSection(subject, question)

    // Suggest drawing references
    const suggestedDrawingRefs = drawing_reference
      ? [drawing_reference]
      : inferDrawingReferences(subject)

    // Suggest priority
    const suggestedPriority = urgency || 'normal'

    // Suggest assignee role based on content
    const suggestedAssigneeRole = inferAssigneeRole(subject, question, suggestedSpecSection)

    // Generate improvement suggestions
    const suggestions: string[] = []

    if (question.length < 50) {
      suggestions.push('Consider adding more detail to your question to avoid follow-up questions')
    }

    if (!spec_section) {
      suggestions.push(`Consider adding specification reference: ${suggestedSpecSection}`)
    }

    if (!drawing_reference) {
      suggestions.push('Adding a drawing reference will help the reviewer locate the area in question')
    }

    if (!rfiContext) {
      suggestions.push('Adding background context helps reviewers understand the full situation')
    }

    if (question.split('?').length > 2) {
      suggestions.push('Consider splitting multiple questions into separate RFIs for clearer tracking')
    }

    return {
      draft: {
        subject: formatSubject(subject),
        question: formatQuestion(question),
        background,
        impact_if_not_resolved: impactMap[suggestedPriority as keyof typeof impactMap],
        suggested_spec_section: suggestedSpecSection,
        suggested_drawing_refs: suggestedDrawingRefs,
        suggested_priority: suggestedPriority,
        suggested_assignee_role: suggestedAssigneeRole
      },
      suggestions
    }
  }
})

function formatSubject(subject: string): string {
  // Capitalize first letter, ensure it's concise
  const formatted = subject.charAt(0).toUpperCase() + subject.slice(1)
  return formatted.length > 100 ? formatted.substring(0, 97) + '...' : formatted
}

function formatQuestion(question: string): string {
  // Ensure question ends with question mark
  let formatted = question.trim()
  if (!formatted.endsWith('?')) {
    formatted += '?'
  }
  return formatted
}

function inferSpecSection(subject: string, question: string): string {
  const text = (subject + ' ' + question).toLowerCase()

  // Common spec section mappings
  const mappings: [RegExp, string][] = [
    [/concrete|foundation|slab|footing/i, '03 30 00 - Cast-in-Place Concrete'],
    [/steel|structural|beam|column/i, '05 12 00 - Structural Steel'],
    [/masonry|brick|block|cmu/i, '04 20 00 - Unit Masonry'],
    [/roof|roofing|membrane|flashing/i, '07 50 00 - Membrane Roofing'],
    [/door|frame|hardware/i, '08 10 00 - Doors and Frames'],
    [/window|glazing|storefront/i, '08 50 00 - Windows'],
    [/drywall|gypsum|partition/i, '09 21 00 - Plaster and Gypsum Board'],
    [/paint|coating|finish/i, '09 90 00 - Painting and Coating'],
    [/plumbing|pipe|fixture|drain/i, '22 00 00 - Plumbing'],
    [/hvac|mechanical|duct|air/i, '23 00 00 - HVAC'],
    [/electrical|wire|conduit|panel/i, '26 00 00 - Electrical'],
    [/fire|sprinkler|suppression/i, '21 10 00 - Fire Suppression'],
    [/elevator|lift/i, '14 20 00 - Elevators'],
    [/tile|ceramic|porcelain/i, '09 30 00 - Tiling'],
    [/ceiling|acoustical/i, '09 51 00 - Acoustical Ceilings'],
    [/carpet|flooring|resilient/i, '09 65 00 - Resilient Flooring'],
  ]

  for (const [pattern, section] of mappings) {
    if (pattern.test(text)) {
      return section
    }
  }

  return '01 00 00 - General Requirements'
}

function inferDrawingReferences(subject: string): string[] {
  const refs: string[] = []
  const text = subject.toLowerCase()

  // Suggest drawing types based on subject
  if (/structural|foundation|concrete|steel/i.test(text)) {
    refs.push('S-Series (Structural)')
  }
  if (/architectural|door|window|finish/i.test(text)) {
    refs.push('A-Series (Architectural)')
  }
  if (/mechanical|hvac|duct/i.test(text)) {
    refs.push('M-Series (Mechanical)')
  }
  if (/electrical|panel|conduit/i.test(text)) {
    refs.push('E-Series (Electrical)')
  }
  if (/plumbing|pipe|drain/i.test(text)) {
    refs.push('P-Series (Plumbing)')
  }
  if (/site|grading|paving/i.test(text)) {
    refs.push('C-Series (Civil)')
  }

  return refs.length > 0 ? refs : ['Review contract drawings']
}

function inferAssigneeRole(subject: string, question: string, specSection: string): string {
  const text = (subject + ' ' + question + ' ' + specSection).toLowerCase()

  if (/design|intent|specification|clarif/i.test(text)) {
    return 'Architect'
  }
  if (/structural|foundation|concrete|steel|load/i.test(text)) {
    return 'Structural Engineer'
  }
  if (/mechanical|hvac|plumbing/i.test(text)) {
    return 'MEP Engineer'
  }
  if (/electrical/i.test(text)) {
    return 'Electrical Engineer'
  }
  if (/civil|site|grading/i.test(text)) {
    return 'Civil Engineer'
  }
  if (/cost|budget|payment/i.test(text)) {
    return 'Owner/CM'
  }

  return 'Architect'
}
