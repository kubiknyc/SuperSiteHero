/**
 * Meeting Minutes Generator Tool
 * Generates formatted meeting minutes from notes with attendees, decisions, and action items
 */

import { createTool } from '../registry'
import type { AgentContext } from '../../types'

interface GenerateMeetingMinutesInput {
  meeting_notes: string
  meeting_type: 'oac' | 'safety' | 'coordination' | 'subcontractor' | 'owner' | 'design' | 'kickoff' | 'closeout' | 'general'
  meeting_date: string
  meeting_title?: string
  project_name?: string
  location?: string
  attendees?: string[]
  duration_minutes?: number
}

interface AttendeeInfo {
  name: string
  organization: string
  role: string
  present: boolean
}

interface DecisionItem {
  decision: string
  made_by: string
  impact: 'low' | 'medium' | 'high'
  related_topics: string[]
}

interface ActionItem {
  action: string
  owner: string
  due_date: string | null
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'in_progress' | 'completed'
}

interface DiscussionTopic {
  topic: string
  summary: string
  key_points: string[]
  open_issues: string[]
}

interface GenerateMeetingMinutesOutput {
  formatted_minutes: string
  meeting_info: {
    title: string
    type: string
    date: string
    time: string | null
    location: string | null
    duration: string | null
    project: string | null
  }
  attendees: AttendeeInfo[]
  agenda_items: string[]
  discussion_topics: DiscussionTopic[]
  decisions: DecisionItem[]
  action_items: ActionItem[]
  parking_lot: string[]
  next_meeting: {
    suggested_date: string | null
    suggested_topics: string[]
  }
  summary: {
    total_action_items: number
    critical_items: number
    decisions_made: number
    open_issues: number
  }
}

export const generateMeetingMinutesTool = createTool<GenerateMeetingMinutesInput, GenerateMeetingMinutesOutput>({
  name: 'generate_meeting_minutes',
  description: 'Generates formatted meeting minutes from notes including attendees, decisions, action items, and discussion summaries. Supports OAC, safety, coordination, and other construction meeting formats.',
  category: 'meetings',
  parameters: {
    type: 'object',
    properties: {
      meeting_notes: {
        type: 'string',
        description: 'Raw meeting notes, transcript, or text to generate minutes from'
      },
      meeting_type: {
        type: 'string',
        enum: ['oac', 'safety', 'coordination', 'subcontractor', 'owner', 'design', 'kickoff', 'closeout', 'general'],
        description: 'Type of meeting for appropriate formatting'
      },
      meeting_date: {
        type: 'string',
        description: 'Date of the meeting (ISO format: YYYY-MM-DD)'
      },
      meeting_title: {
        type: 'string',
        description: 'Title of the meeting'
      },
      project_name: {
        type: 'string',
        description: 'Name of the project'
      },
      location: {
        type: 'string',
        description: 'Meeting location'
      },
      attendees: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of attendee names'
      },
      duration_minutes: {
        type: 'number',
        description: 'Meeting duration in minutes'
      }
    },
    required: ['meeting_notes', 'meeting_type', 'meeting_date']
  },

  async execute(input: GenerateMeetingMinutesInput, context: AgentContext): Promise<GenerateMeetingMinutesOutput> {
    const {
      meeting_notes,
      meeting_type,
      meeting_date,
      meeting_title,
      project_name,
      location,
      attendees: inputAttendees = [],
      duration_minutes
    } = input

    const baseDate = new Date(meeting_date)

    // Extract attendees from notes if not provided
    const attendees = inputAttendees.length > 0
      ? inputAttendees.map(name => parseAttendee(name, meeting_type))
      : extractAttendeesFromNotes(meeting_notes, meeting_type)

    // Extract agenda items
    const agendaItems = extractAgendaItems(meeting_notes, meeting_type)

    // Extract discussion topics
    const discussionTopics = extractDiscussionTopics(meeting_notes, meeting_type)

    // Extract decisions
    const decisions = extractDecisions(meeting_notes)

    // Extract action items
    const actionItems = extractActionItems(meeting_notes, baseDate, meeting_type)

    // Extract parking lot items
    const parkingLot = extractParkingLot(meeting_notes)

    // Calculate next meeting suggestions
    const nextMeeting = suggestNextMeeting(meeting_type, baseDate, discussionTopics)

    // Calculate summary stats
    const criticalItems = actionItems.filter(a => a.priority === 'critical').length
    const openIssues = discussionTopics.reduce((sum, t) => sum + t.open_issues.length, 0)

    // Generate formatted minutes
    const formattedMinutes = generateFormattedMinutes({
      title: meeting_title || getMeetingTitle(meeting_type),
      type: meeting_type,
      date: meeting_date,
      location: location || null,
      duration: duration_minutes ? `${duration_minutes} minutes` : null,
      project: project_name || null,
      attendees,
      agendaItems,
      discussionTopics,
      decisions,
      actionItems,
      parkingLot,
      nextMeeting
    })

    return {
      formatted_minutes: formattedMinutes,
      meeting_info: {
        title: meeting_title || getMeetingTitle(meeting_type),
        type: formatMeetingType(meeting_type),
        date: meeting_date,
        time: extractTimeFromNotes(meeting_notes),
        location: location || extractLocationFromNotes(meeting_notes),
        duration: duration_minutes ? `${duration_minutes} minutes` : null,
        project: project_name || null
      },
      attendees,
      agenda_items: agendaItems,
      discussion_topics: discussionTopics,
      decisions,
      action_items: actionItems,
      parking_lot: parkingLot,
      next_meeting: nextMeeting,
      summary: {
        total_action_items: actionItems.length,
        critical_items: criticalItems,
        decisions_made: decisions.length,
        open_issues: openIssues
      }
    }
  }
})

function parseAttendee(name: string, meetingType: string): AttendeeInfo {
  // Parse name with optional org/role info: "John Smith (ABC Corp, PM)"
  const match = name.match(/^([^(]+)(?:\(([^,)]+)(?:,\s*([^)]+))?\))?/)

  if (match) {
    return {
      name: match[1].trim(),
      organization: match[2]?.trim() || 'TBD',
      role: match[3]?.trim() || inferRole(match[1], meetingType),
      present: true
    }
  }

  return {
    name: name.trim(),
    organization: 'TBD',
    role: inferRole(name, meetingType),
    present: true
  }
}

function inferRole(name: string, meetingType: string): string {
  const nameLower = name.toLowerCase()

  if (/superintendent|super/i.test(nameLower)) return 'Superintendent'
  if (/project\s*manager|pm/i.test(nameLower)) return 'Project Manager'
  if (/architect/i.test(nameLower)) return 'Architect'
  if (/engineer/i.test(nameLower)) return 'Engineer'
  if (/owner/i.test(nameLower)) return 'Owner Representative'
  if (/safety/i.test(nameLower)) return 'Safety Manager'
  if (/foreman/i.test(nameLower)) return 'Foreman'

  const defaultRoles: Record<string, string> = {
    oac: 'Attendee',
    safety: 'Safety Team Member',
    coordination: 'Trade Coordinator',
    subcontractor: 'Trade Representative',
    owner: 'Participant',
    design: 'Design Team Member',
    kickoff: 'Team Member',
    closeout: 'Closeout Team Member',
    general: 'Attendee'
  }

  return defaultRoles[meetingType] || 'Attendee'
}

function extractAttendeesFromNotes(notes: string, meetingType: string): AttendeeInfo[] {
  const attendees: AttendeeInfo[] = []
  const seenNames = new Set<string>()

  // Look for attendee section
  const attendeePatterns = [
    /(?:attendees?|present|participants?)[\s:]+([^\n]+(?:\n(?!\n)[^\n]+)*)/i,
    /(?:those present|in attendance)[\s:]+([^\n]+(?:\n(?!\n)[^\n]+)*)/i
  ]

  for (const pattern of attendeePatterns) {
    const match = notes.match(pattern)
    if (match) {
      const names = match[1].split(/[,;\n]/).map(n => n.trim()).filter(n => n.length > 2)
      for (const name of names) {
        if (!seenNames.has(name.toLowerCase())) {
          seenNames.add(name.toLowerCase())
          attendees.push(parseAttendee(name, meetingType))
        }
      }
    }
  }

  // Extract names from action items
  const namePattern = /(?:assigned to|owner:|responsible:)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi
  let match
  while ((match = namePattern.exec(notes)) !== null) {
    const name = match[1].trim()
    if (!seenNames.has(name.toLowerCase()) && name.length > 2) {
      seenNames.add(name.toLowerCase())
      attendees.push(parseAttendee(name, meetingType))
    }
  }

  return attendees
}

function extractAgendaItems(notes: string, meetingType: string): string[] {
  const items: string[] = []

  // Look for agenda section
  const agendaMatch = notes.match(/(?:agenda|topics?)[\s:]+([^\n]+(?:\n(?!\n)[^\n]+)*)/i)
  if (agendaMatch) {
    const lines = agendaMatch[1].split(/[\n\-]/).map(l => l.trim()).filter(l => l.length > 5)
    items.push(...lines.slice(0, 10))
  }

  // If no explicit agenda, derive from structure
  if (items.length === 0) {
    const defaultAgendas: Record<string, string[]> = {
      oac: ['Project Status Update', 'Schedule Review', 'Budget Review', 'RFIs/Submittals', 'Change Orders', 'Safety', 'Quality', 'Upcoming Work'],
      safety: ['Safety Incidents Review', 'Hazard Identification', 'Training Updates', 'PPE Compliance', 'Upcoming Safety Concerns'],
      coordination: ['Two-Week Look-Ahead', 'Trade Coordination', 'Material Deliveries', 'Conflicts/Issues', 'Manpower'],
      subcontractor: ['Scope Review', 'Schedule', 'Submittals', 'Issues/Concerns', 'Resources'],
      owner: ['Progress Update', 'Budget Status', 'Key Decisions', 'Owner Concerns', 'Next Steps'],
      design: ['Design Issues', 'RFI Review', 'Drawing Updates', 'Coordination Items'],
      kickoff: ['Project Overview', 'Team Introductions', 'Communication Plan', 'Schedule', 'Safety Requirements'],
      closeout: ['Punch List Status', 'Documentation', 'Training', 'Warranties', 'Final Inspections'],
      general: ['Status Update', 'Discussion Items', 'Action Items', 'Next Steps']
    }
    items.push(...(defaultAgendas[meetingType] || defaultAgendas.general))
  }

  return items.slice(0, 12)
}

function extractDiscussionTopics(notes: string, meetingType: string): DiscussionTopic[] {
  const topics: DiscussionTopic[] = []

  // Split notes into paragraphs/sections
  const sections = notes.split(/\n\n+/)

  for (const section of sections) {
    if (section.length < 30) continue

    // Try to identify topic header
    const lines = section.split('\n')
    const topicLine = lines[0]
    const contentLines = lines.slice(1)

    if (topicLine.length > 5 && topicLine.length < 100) {
      const keyPoints: string[] = []
      const openIssues: string[] = []

      for (const line of contentLines) {
        const trimmed = line.trim()
        if (trimmed.length < 10) continue

        if (/\b(issue|problem|concern|outstanding|unresolved|pending)\b/i.test(trimmed)) {
          openIssues.push(trimmed.replace(/^[\-]/g, ''))
        } else if (/\b(discussed|agreed|noted|mentioned|reviewed)\b/i.test(trimmed)) {
          keyPoints.push(trimmed.replace(/^[\-]/g, ''))
        }
      }

      topics.push({
        topic: topicLine.replace(/^[\d\.\-]\s*/, '').trim(),
        summary: contentLines.join(' ').substring(0, 200),
        key_points: keyPoints.slice(0, 5),
        open_issues: openIssues.slice(0, 3)
      })
    }
  }

  return topics.slice(0, 8)
}

function extractDecisions(notes: string): DecisionItem[] {
  const decisions: DecisionItem[] = []

  const decisionPatterns = [
    /(?:decided|decision|agreed|approved|confirmed|resolved)(?:\s+(?:to|that))?\s*[:\-]?\s*(.+?)(?:[.!?\n]|$)/gi,
    /(?:motion|vote|consensus)(?:\s+to)?\s*[:\-]?\s*(.+?)(?:[.!?\n]|$)/gi
  ]

  for (const pattern of decisionPatterns) {
    let match
    while ((match = pattern.exec(notes)) !== null) {
      const decisionText = match[1].trim()
      if (decisionText.length > 15 && decisionText.length < 300) {
        const madeBy = extractDecisionMaker(match[0])
        const impact = determineDecisionImpact(decisionText)
        const relatedTopics = extractRelatedTopics(decisionText)

        decisions.push({
          decision: decisionText,
          made_by: madeBy,
          impact,
          related_topics: relatedTopics
        })
      }
    }
  }

  return [...new Map(decisions.map(d => [d.decision, d])).values()].slice(0, 10)
}

function extractDecisionMaker(context: string): string {
  const patterns = [
    /(?:by|per|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:decided|approved)/i
  ]

  for (const pattern of patterns) {
    const match = context.match(pattern)
    if (match) return match[1].trim()
  }

  if (/owner/i.test(context)) return 'Owner'
  if (/architect/i.test(context)) return 'Architect'
  if (/gc|general contractor/i.test(context)) return 'GC'
  if (/team|group/i.test(context)) return 'Team Consensus'

  return 'Meeting Consensus'
}

function determineDecisionImpact(text: string): 'low' | 'medium' | 'high' {
  if (/critical|major|significant|schedule|cost|budget|delay/i.test(text)) return 'high'
  if (/important|change|modify|update/i.test(text)) return 'medium'
  return 'low'
}

function extractRelatedTopics(text: string): string[] {
  const topics: string[] = []

  if (/schedule|timeline|date/i.test(text)) topics.push('Schedule')
  if (/cost|budget|price|payment/i.test(text)) topics.push('Cost')
  if (/safety|hazard/i.test(text)) topics.push('Safety')
  if (/quality|inspection/i.test(text)) topics.push('Quality')
  if (/submittal|approval/i.test(text)) topics.push('Submittals')
  if (/rfi|clarification/i.test(text)) topics.push('RFIs')
  if (/change|modification/i.test(text)) topics.push('Changes')

  return topics.slice(0, 3)
}

function extractActionItems(notes: string, baseDate: Date, meetingType: string): ActionItem[] {
  const actionItems: ActionItem[] = []
  const sentences = notes.split(/[.!?]+/).filter(s => s.trim().length > 15)

  for (const sentence of sentences) {
    const hasActionVerb = /\b(will|shall|must|need|should|send|submit|provide|review|coordinate|schedule|contact|follow-up|prepare|complete|verify|confirm|update|create|develop|issue|resolve|address|follow up)\b/i.test(sentence)

    if (hasActionVerb) {
      const owner = extractOwner(sentence)
      const dueDate = extractDueDate(sentence, baseDate)
      const priority = determinePriority(sentence)
      const action = cleanActionText(sentence)

      if (action.length > 10) {
        actionItems.push({
          action,
          owner,
          due_date: dueDate,
          priority,
          status: 'open'
        })
      }
    }
  }

  return actionItems.slice(0, 15)
}

function extractOwner(text: string): string {
  const patterns = [
    /(?:assigned to|owner:|responsible:)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:will|shall|to)\s+/i
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) return match[1].trim()
  }

  if (/\b(GC|general contractor)\b/i.test(text)) return 'GC'
  if (/\barchitect\b/i.test(text)) return 'Architect'
  if (/\bengineer\b/i.test(text)) return 'Engineer'
  if (/\bowner\b/i.test(text)) return 'Owner'

  return 'TBD'
}

function extractDueDate(text: string, baseDate: Date): string | null {
  const patterns = [
    /(?:by|before|due|deadline)\s+(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/i,
    /(?:by|before)\s+(?:end of\s+)?(this week|next week|friday|monday|eow|eom)/i,
    /(?:within|in)\s+(\d+)\s+(day|week|business day)/i
  ]

  for (const pattern of patterns) {
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
  if (/critical|urgent|asap|immediate|safety|hazard|stop work/i.test(text)) return 'critical'
  if (/important|priority|soon|this week|required/i.test(text)) return 'high'
  if (/when possible|eventually|fyi|nice to have/i.test(text)) return 'low'
  return 'medium'
}

function cleanActionText(text: string): string {
  return text
    .replace(/(?:action|todo|task):\s*/i, '')
    .replace(/(?:assigned to|owner:|responsible:)\s*[A-Za-z\s]+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, c => c.toUpperCase())
}

function extractParkingLot(notes: string): string[] {
  const items: string[] = []

  const parkingLotMatch = notes.match(/(?:parking lot|deferred|future discussion|tbd|hold)[:\-\s]*(.+?)(?=(?:^|\n)[A-Z]|\n\n|$)/is)
  if (parkingLotMatch) {
    const lines = parkingLotMatch[1].split(/[\n\-]/).map(l => l.trim()).filter(l => l.length > 10)
    items.push(...lines)
  }

  const deferPattern = /(?:defer|table|postpone|revisit)\s+(?:the\s+)?(.+?)(?:[.!?\n]|$)/gi
  let match
  while ((match = deferPattern.exec(notes)) !== null) {
    const item = match[1].trim()
    if (item.length > 10 && item.length < 150) {
      items.push(item)
    }
  }

  return [...new Set(items)].slice(0, 5)
}

function suggestNextMeeting(meetingType: string, currentDate: Date, discussionTopics: DiscussionTopic[]): { suggested_date: string | null; suggested_topics: string[] } {
  const nextDate = new Date(currentDate)

  // Suggest next meeting date based on type
  const intervalDays: Record<string, number> = {
    oac: 7,
    safety: 7,
    coordination: 7,
    subcontractor: 14,
    owner: 14,
    design: 7,
    kickoff: 0,
    closeout: 7,
    general: 7
  }

  const interval = intervalDays[meetingType] || 7
  if (interval > 0) {
    nextDate.setDate(nextDate.getDate() + interval)
  }

  // Gather open issues as suggested topics
  const suggestedTopics: string[] = []
  for (const topic of discussionTopics) {
    for (const issue of topic.open_issues) {
      suggestedTopics.push(`Follow-up: ${issue.substring(0, 50)}`)
    }
  }

  // Add standard topics for meeting type
  if (suggestedTopics.length < 3) {
    const standardTopics: Record<string, string[]> = {
      oac: ['Action items review', 'Schedule update', 'Budget review'],
      safety: ['Incident review', 'Upcoming hazards', 'Training status'],
      coordination: ['Look-ahead review', 'Trade conflicts', 'Material status']
    }
    suggestedTopics.push(...(standardTopics[meetingType] || []))
  }

  return {
    suggested_date: interval > 0 ? formatDate(nextDate) : null,
    suggested_topics: suggestedTopics.slice(0, 5)
  }
}

function getMeetingTitle(meetingType: string): string {
  const titles: Record<string, string> = {
    oac: 'Owner-Architect-Contractor Meeting',
    safety: 'Safety Meeting',
    coordination: 'Trade Coordination Meeting',
    subcontractor: 'Subcontractor Meeting',
    owner: 'Owner Meeting',
    design: 'Design Team Meeting',
    kickoff: 'Project Kickoff Meeting',
    closeout: 'Project Closeout Meeting',
    general: 'Project Meeting'
  }
  return titles[meetingType] || 'Project Meeting'
}

function formatMeetingType(meetingType: string): string {
  const formatted: Record<string, string> = {
    oac: 'OAC Meeting',
    safety: 'Safety Meeting',
    coordination: 'Coordination Meeting',
    subcontractor: 'Subcontractor Meeting',
    owner: 'Owner Meeting',
    design: 'Design Meeting',
    kickoff: 'Kickoff Meeting',
    closeout: 'Closeout Meeting',
    general: 'General Meeting'
  }
  return formatted[meetingType] || meetingType
}

function extractTimeFromNotes(notes: string): string | null {
  const timeMatch = notes.match(/(?:time|started|began)[:\s]+(\d{1,2}:\d{2}(?:\s*[AaPp][Mm])?)/i)
  return timeMatch ? timeMatch[1] : null
}

function extractLocationFromNotes(notes: string): string | null {
  const locationMatch = notes.match(/(?:location|place|room|at)[:\s]+([^\n,]+)/i)
  return locationMatch ? locationMatch[1].trim() : null
}

interface FormatMinutesParams {
  title: string
  type: string
  date: string
  location: string | null
  duration: string | null
  project: string | null
  attendees: AttendeeInfo[]
  agendaItems: string[]
  discussionTopics: DiscussionTopic[]
  decisions: DecisionItem[]
  actionItems: ActionItem[]
  parkingLot: string[]
  nextMeeting: { suggested_date: string | null; suggested_topics: string[] }
}

function generateFormattedMinutes(params: FormatMinutesParams): string {
  const {
    title, type, date, location, duration, project,
    attendees, agendaItems, discussionTopics, decisions,
    actionItems, parkingLot, nextMeeting
  } = params

  const lines: string[] = []
  const separator = '============================================================'
  const subSeparator = '----------------------------------------'

  // Header
  lines.push(separator)
  lines.push('MEETING MINUTES')
  lines.push(separator)
  lines.push('')
  lines.push(`Meeting: ${title}`)
  lines.push(`Date: ${date}`)
  if (location) lines.push(`Location: ${location}`)
  if (duration) lines.push(`Duration: ${duration}`)
  if (project) lines.push(`Project: ${project}`)
  lines.push('')

  // Attendees
  lines.push(subSeparator)
  lines.push('ATTENDEES')
  lines.push(subSeparator)
  for (const attendee of attendees) {
    lines.push(`  - ${attendee.name} (${attendee.organization}, ${attendee.role})`)
  }
  lines.push('')

  // Agenda
  if (agendaItems.length > 0) {
    lines.push(subSeparator)
    lines.push('AGENDA')
    lines.push(subSeparator)
    agendaItems.forEach((item, i) => {
      lines.push(`  ${i + 1}. ${item}`)
    })
    lines.push('')
  }

  // Discussion Topics
  if (discussionTopics.length > 0) {
    lines.push(subSeparator)
    lines.push('DISCUSSION SUMMARY')
    lines.push(subSeparator)
    for (const topic of discussionTopics) {
      lines.push(`\n  ${topic.topic}`)
      lines.push('  ------------------------------')
      if (topic.key_points.length > 0) {
        lines.push('  Key Points:')
        topic.key_points.forEach(p => lines.push(`    - ${p}`))
      }
      if (topic.open_issues.length > 0) {
        lines.push('  Open Issues:')
        topic.open_issues.forEach(i => lines.push(`    * ${i}`))
      }
    }
    lines.push('')
  }

  // Decisions
  if (decisions.length > 0) {
    lines.push(subSeparator)
    lines.push('DECISIONS MADE')
    lines.push(subSeparator)
    decisions.forEach((d, i) => {
      lines.push(`  ${i + 1}. ${d.decision}`)
      lines.push(`     Made by: ${d.made_by} | Impact: ${d.impact.toUpperCase()}`)
    })
    lines.push('')
  }

  // Action Items
  if (actionItems.length > 0) {
    lines.push(subSeparator)
    lines.push('ACTION ITEMS')
    lines.push(subSeparator)
    actionItems.forEach((a, i) => {
      const dueStr = a.due_date ? ` | Due: ${a.due_date}` : ''
      lines.push(`  ${i + 1}. [${a.priority.toUpperCase()}] ${a.action}`)
      lines.push(`     Owner: ${a.owner}${dueStr}`)
    })
    lines.push('')
  }

  // Parking Lot
  if (parkingLot.length > 0) {
    lines.push(subSeparator)
    lines.push('PARKING LOT (Deferred Items)')
    lines.push(subSeparator)
    parkingLot.forEach(item => lines.push(`  - ${item}`))
    lines.push('')
  }

  // Next Meeting
  if (nextMeeting.suggested_date || nextMeeting.suggested_topics.length > 0) {
    lines.push(subSeparator)
    lines.push('NEXT MEETING')
    lines.push(subSeparator)
    if (nextMeeting.suggested_date) {
      lines.push(`  Suggested Date: ${nextMeeting.suggested_date}`)
    }
    if (nextMeeting.suggested_topics.length > 0) {
      lines.push('  Suggested Topics:')
      nextMeeting.suggested_topics.forEach(t => lines.push(`    - ${t}`))
    }
    lines.push('')
  }

  lines.push(separator)
  lines.push('END OF MEETING MINUTES')
  lines.push(separator)

  return lines.join('\n')
}
