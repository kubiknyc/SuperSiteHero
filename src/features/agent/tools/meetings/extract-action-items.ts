/**
 * Meeting Action Items Extractor Tool
 * Extracts action items from meeting notes, emails, or conversations
 */

import { createTool } from '../registry'
import type { AgentContext } from '../../types'

interface ExtractActionItemsInput {
  text: string
  meeting_type?: 'oac' | 'subcontractor' | 'internal' | 'owner' | 'design' | 'safety' | 'general'
  meeting_date?: string
}

interface ActionItem {
  action: string
  owner: string
  due_date: string | null
  priority: 'low' | 'medium' | 'high' | 'critical'
  category: string
  context: string
  original_text: string
}

interface ExtractActionItemsOutput {
  action_items: ActionItem[]
  summary: {
    total: number
    by_owner: Record<string, number>
    by_priority: Record<string, number>
    by_category: Record<string, number>
  }
  key_decisions: string[]
  parking_lot_items: string[]
  next_meeting_topics: string[]
}

export const extractActionItemsTool = createTool<ExtractActionItemsInput, ExtractActionItemsOutput>({
  name: 'extract_action_items',
  description: 'Extracts action items, decisions, and follow-ups from meeting notes or text. Identifies owners, due dates, and priorities automatically.',
  category: 'meetings',
  parameters: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Meeting notes, transcript, or text to extract action items from'
      },
      meeting_type: {
        type: 'string',
        enum: ['oac', 'subcontractor', 'internal', 'owner', 'design', 'safety', 'general'],
        description: 'Type of meeting for better context'
      },
      meeting_date: {
        type: 'string',
        description: 'Date of the meeting (ISO format) for calculating due dates'
      }
    },
    required: ['text']
  },

  execute: async function(input: ExtractActionItemsInput, context: AgentContext): Promise<ExtractActionItemsOutput> {
    const { text, meeting_type = 'general', meeting_date } = input
    const baseDate = meeting_date ? new Date(meeting_date) : new Date()

    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10)

    const actionItems: ActionItem[] = []
    const seenActions = new Set<string>()

    for (const sentence of sentences) {
      const item = extractActionFromSentence(sentence, meeting_type, baseDate)
      if (item && !seenActions.has(item.action.toLowerCase())) {
        seenActions.add(item.action.toLowerCase())
        actionItems.push(item)
      }
    }

    const keyDecisions = extractDecisions(text)
    const parkingLotItems = extractParkingLotItems(text)
    const nextMeetingTopics = extractNextMeetingTopics(text)

    const byOwner: Record<string, number> = {}
    const byPriority: Record<string, number> = {}
    const byCategory: Record<string, number> = {}

    for (const item of actionItems) {
      byOwner[item.owner] = (byOwner[item.owner] || 0) + 1
      byPriority[item.priority] = (byPriority[item.priority] || 0) + 1
      byCategory[item.category] = (byCategory[item.category] || 0) + 1
    }

    return {
      action_items: actionItems,
      summary: {
        total: actionItems.length,
        by_owner: byOwner,
        by_priority: byPriority,
        by_category: byCategory
      },
      key_decisions: keyDecisions,
      parking_lot_items: parkingLotItems,
      next_meeting_topics: nextMeetingTopics
    }
  }
})

function extractActionFromSentence(
  sentence: string,
  meetingType: string,
  baseDate: Date
): ActionItem | null {
  const trimmed = sentence.trim()
  if (trimmed.length < 15) {return null}

  const hasActionVerb = /\b(will|shall|must|need|should|send|submit|provide|review|coordinate|schedule|contact|follow-up|prepare|complete|verify|confirm|update|create|develop|issue|resolve|address)\b/i.test(trimmed)

  if (!hasActionVerb) {return null}

  const owner = extractOwner(trimmed, meetingType)
  const dueDate = extractDueDate(trimmed, baseDate)
  const priority = determinePriority(trimmed)
  const category = determineCategory(trimmed, meetingType)
  const action = cleanActionText(trimmed)

  return {
    action,
    owner,
    due_date: dueDate,
    priority,
    category,
    context: meetingType,
    original_text: trimmed
  }
}

function extractOwner(text: string, meetingType: string): string {
  const ownerPatterns = [
    /(?:assigned to|owner:|responsible:)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:will|shall|to)\s+/i,
  ]

  for (const pattern of ownerPatterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }

  if (/\b(GC|general contractor)\b/i.test(text)) {return 'GC'}
  if (/\barchitect\b/i.test(text)) {return 'Architect'}
  if (/\bengineer\b/i.test(text)) {return 'Engineer'}
  if (/\bowner\b/i.test(text)) {return 'Owner'}
  if (/\b(CM|construction manager)\b/i.test(text)) {return 'CM'}
  if (/\bsubcontractor\b/i.test(text)) {return 'Subcontractor'}

  const defaultOwners: Record<string, string> = {
    oac: 'TBD',
    subcontractor: 'Subcontractor',
    internal: 'Team',
    owner: 'Owner',
    design: 'Design Team',
    safety: 'Safety Officer',
    general: 'TBD'
  }

  return defaultOwners[meetingType] || 'TBD'
}

function extractDueDate(text: string, baseDate: Date): string | null {
  const datePatterns = [
    /(?:by|before|due|deadline)\s+(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/i,
    /(?:by|before)\s+(?:end of\s+)?(this week|next week|friday|monday|eow|eom)/i,
    /(?:within|in)\s+(\d+)\s+(day|week|business day)/i,
  ]

  for (const pattern of datePatterns) {
    const match = text.match(pattern)
    if (match) {
      return interpretDatePhrase(match[0], baseDate)
    }
  }

  if (/asap|immediately|urgent|today/i.test(text)) {
    return formatDate(baseDate)
  }

  return null
}

function interpretDatePhrase(phrase: string, baseDate: Date): string {
  const date = new Date(baseDate)

  if (/this week|eow|friday/i.test(phrase)) {
    const daysUntilFriday = (5 - date.getDay() + 7) % 7 || 7
    date.setDate(date.getDate() + daysUntilFriday)
  } else if (/next week|monday/i.test(phrase)) {
    const daysUntilMonday = (8 - date.getDay()) % 7 || 7
    date.setDate(date.getDate() + daysUntilMonday)
  } else if (/eom|end of month/i.test(phrase)) {
    date.setMonth(date.getMonth() + 1, 0)
  } else if (/(\d+)\s+(day|week)/i.test(phrase)) {
    const match = phrase.match(/(\d+)\s+(day|week)/i)
    if (match) {
      const num = parseInt(match[1])
      const unit = match[2].toLowerCase()
      date.setDate(date.getDate() + num * (unit === 'week' ? 7 : 1))
    }
  }

  return formatDate(date)
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function determinePriority(text: string): 'low' | 'medium' | 'high' | 'critical' {
  if (/critical|urgent|asap|immediate|safety|hazard|stop work/i.test(text)) {
    return 'critical'
  }
  if (/important|priority|soon|this week|required/i.test(text)) {
    return 'high'
  }
  if (/when possible|eventually|fyi|nice to have/i.test(text)) {
    return 'low'
  }
  return 'medium'
}

function determineCategory(text: string, meetingType: string): string {
  if (/rfi|clarification|question/i.test(text)) {return 'RFI/Clarification'}
  if (/submittal|shop drawing|approval/i.test(text)) {return 'Submittals'}
  if (/schedule|milestone|delay/i.test(text)) {return 'Schedule'}
  if (/budget|cost|payment|invoice/i.test(text)) {return 'Cost/Budget'}
  if (/safety|incident|hazard/i.test(text)) {return 'Safety'}
  if (/quality|inspection|test/i.test(text)) {return 'Quality'}
  if (/drawing|document|revision/i.test(text)) {return 'Documents'}
  if (/change|modification|revision/i.test(text)) {return 'Changes'}
  if (/coordinate|sequence|logistics/i.test(text)) {return 'Coordination'}

  const categoryDefaults: Record<string, string> = {
    oac: 'Coordination',
    subcontractor: 'Trade Coordination',
    internal: 'Internal',
    owner: 'Owner Direction',
    design: 'Design',
    safety: 'Safety',
    general: 'General'
  }

  return categoryDefaults[meetingType] || 'General'
}

function cleanActionText(text: string): string {
  let cleaned = text
    .replace(/(?:action|todo|task):\s*/i, '')
    .replace(/(?:assigned to|owner:|responsible:)\s*[A-Za-z\s]+/i, '')
    .replace(/\s+/g, ' ')
    .trim()

  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)

  return cleaned
}

function extractDecisions(text: string): string[] {
  const decisions: string[] = []
  const pattern = /(?:decided|decision|agreed|approved|confirmed|resolved)(?:\s+(?:to|that))?\s*[:\-]?\s*(.+?)(?:[.!?\n]|$)/gi

  let match
  while ((match = pattern.exec(text)) !== null) {
    const decision = match[1].trim()
    if (decision.length > 15 && decision.length < 200) {
      decisions.push(decision)
    }
  }

  return [...new Set(decisions)].slice(0, 5)
}

function extractParkingLotItems(text: string): string[] {
  const items: string[] = []

  const parkingLotMatch = text.match(/(?:parking lot|deferred|future discussion|tbd|hold)[:\-\s]*(.+?)(?=(?:^|\n)[A-Z]|\n\n|$)/is)
  if (parkingLotMatch) {
    const lines = parkingLotMatch[1].split(/[\n\-]/).map(l => l.trim()).filter(l => l.length > 10)
    items.push(...lines.slice(0, 5))
  }

  const pattern = /(?:defer|table|postpone|revisit)\s+(?:the\s+)?(.+?)(?:[.!?\n]|$)/gi

  let match
  while ((match = pattern.exec(text)) !== null) {
    const item = match[1].trim()
    if (item.length > 10 && item.length < 150) {
      items.push(item)
    }
  }

  return [...new Set(items)].slice(0, 5)
}

function extractNextMeetingTopics(text: string): string[] {
  const topics: string[] = []

  const nextMeetingMatch = text.match(/(?:next meeting|upcoming|agenda for next)[:\-\s]*(.+?)(?=(?:^|\n)[A-Z]|\n\n|$)/is)
  if (nextMeetingMatch) {
    const lines = nextMeetingMatch[1].split(/[\n\-]/).map(l => l.trim()).filter(l => l.length > 10)
    topics.push(...lines.slice(0, 5))
  }

  const pattern = /(?:discuss|review|follow up on)\s+(?:at next meeting|next time)\s*[:\-]?\s*(.+?)(?:[.!?\n]|$)/gi

  let match
  while ((match = pattern.exec(text)) !== null) {
    const topic = match[1].trim()
    if (topic.length > 10 && topic.length < 150) {
      topics.push(topic)
    }
  }

  return [...new Set(topics)].slice(0, 5)
}
