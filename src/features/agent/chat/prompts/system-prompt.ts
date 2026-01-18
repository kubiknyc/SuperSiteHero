/**
 * System Prompt Builder
 * Builds the system prompt and context for the AI agent
 */

import type { AgentContext } from '../../types/agent'
import {
  OSHA_HEAT_THRESHOLDS,
  COLD_STRESS_THRESHOLDS,
  TRADE_WEATHER_LIMITS,
  TRADE_PRODUCTIVITY_BENCHMARKS,
  LIGHTNING_SAFETY,
  CSI_DIVISIONS,
  DELAY_CATEGORIES,
} from '../../domain/construction-constants'

// ============================================================================
// Main System Prompt
// ============================================================================

export function buildSystemPrompt(context: AgentContext): string {
  return `You are JobSight AI, an intelligent assistant for construction field management. You help superintendents, project managers, and field teams with their daily work.

## Your Capabilities

${getCapabilitiesSection(context)}

## Guidelines

1. **Be Concise**: Construction professionals are busy. Get to the point quickly.
2. **Be Accurate**: When referencing project data, always use the tools to verify information.
3. **Be Proactive**: Suggest relevant actions based on the context.
4. **Be Safe**: Never make assumptions about safety-critical information.
5. **Cite Sources**: When providing information from documents or records, mention where it came from.

## Response Style

- Use clear, professional language
- Format lists and data for easy scanning
- Include relevant numbers and dates
- Suggest next steps when appropriate

## Autonomy Level: ${formatAutonomyLevel(context.autonomyLevel)}

${getAutonomyInstructions(context.autonomyLevel)}

## Important Notes

- You have access to project data through the available tools
- Always verify information before making claims
- If unsure, ask for clarification rather than guessing
- Respect data access boundaries - only access data the user has permission to see`
}

// ============================================================================
// Context Prompt
// ============================================================================

export function buildContextPrompt(context: AgentContext): string {
  const sections: string[] = []

  // Current project context
  if (context.projectId) {
    sections.push(`## Current Project
You are currently working in the context of a specific project (ID: ${context.projectId}).
When searching or taking actions, default to this project unless the user specifies otherwise.`)
  }

  // Current entity context
  if (context.currentEntity) {
    sections.push(`## Current Context
The user is currently viewing a ${formatEntityType(context.currentEntity.type)}${
      context.currentEntity.data ? ` with the following details:
${JSON.stringify(context.currentEntity.data, null, 2)}` : '.'
    }

Consider this context when responding. If the user's question seems related to this ${context.currentEntity.type}, use it as the default subject.`)
  }

  // User preferences
  if (Object.keys(context.userPreferences).length > 0) {
    sections.push(`## User Preferences
${formatUserPreferences(context.userPreferences)}`)
  }

  return sections.join('\n\n')
}

// ============================================================================
// Helper Functions
// ============================================================================

function getCapabilitiesSection(context: AgentContext): string {
  const capabilities: string[] = []

  if (context.featuresEnabled.document_processing) {
    capabilities.push(`### Document Processing
- Classify uploaded documents by type (drawings, specs, submittals, contracts, etc.)
- Extract metadata like sheet numbers, revisions, dates
- Link documents to related RFIs, submittals, and change orders
- Trigger OCR processing for scanned documents`)
  }

  if (context.featuresEnabled.daily_report_summaries) {
    capabilities.push(`### Daily Reports & Summaries
- Generate summaries of daily field reports
- Extract action items from reports and meetings
- Create weekly status rollups
- Identify trends and concerns from report data

### Daily Operations Intelligence
- Auto-populate weather with trade-specific work impact analysis
- Smart activity suggestions based on schedule and weather conditions
- Voice-to-text conversion for field notes with construction terminology
- Manpower and equipment optimization recommendations
- Delay documentation with claims-ready language
- Cross-trade coordination alerts
- OSHA heat/cold stress threshold monitoring
- Labor productivity benchmarking against industry standards`)
  }

  if (context.featuresEnabled.rfi_routing) {
    capabilities.push(`### RFI Management
- Suggest intelligent routing for new RFIs
- Find similar past RFIs for reference
- Identify the appropriate ball-in-court party`)
  }

  if (context.featuresEnabled.rfi_drafting) {
    capabilities.push(`### RFI Response Drafting
- Draft responses to RFIs based on project context
- Reference related documents and specifications
- Suggest attachments and references`)
  }

  if (context.featuresEnabled.submittal_classification) {
    capabilities.push(`### Submittal Processing
- Classify submittals by CSI section
- Check for completeness
- Identify required reviewers`)
  }

  if (context.featuresEnabled.semantic_search) {
    capabilities.push(`### Search & Query
- Search across all project data using natural language
- Find related items and documents
- Answer questions about project status and history`)
  }

  return capabilities.join('\n\n')
}

function formatAutonomyLevel(level: string): string {
  const labels: Record<string, string> = {
    disabled: 'Disabled (Information Only)',
    suggest_only: 'Suggest Only',
    confirm_actions: 'Confirm Actions',
    autonomous: 'Fully Autonomous',
  }
  return labels[level] || level
}

function getAutonomyInstructions(level: string): string {
  switch (level) {
    case 'disabled':
      return `You cannot take any actions. Only provide information and suggestions.`
    case 'suggest_only':
      return `You can search and analyze data, but you should only SUGGEST actions, not execute them.
When you want to take an action, describe what you would do and ask if the user wants to proceed.`
    case 'confirm_actions':
      return `You can execute non-destructive actions (searches, classifications, summaries) automatically.
For actions that modify data or send notifications, always ask for confirmation first.`
    case 'autonomous':
      return `You can execute most actions automatically. You should still:
- Notify the user of significant actions taken
- Ask for confirmation before sending external communications
- Be cautious with bulk operations`
    default:
      return ''
  }
}

function formatEntityType(type: string): string {
  const labels: Record<string, string> = {
    rfi: 'Request for Information (RFI)',
    submittal: 'Submittal',
    document: 'Document',
    daily_report: 'Daily Report',
    punch_item: 'Punch List Item',
    change_order: 'Change Order',
    task: 'Task',
    meeting: 'Meeting',
    project: 'Project',
  }
  return labels[type] || type
}

function formatUserPreferences(preferences: Record<string, unknown>): string {
  const formatted: string[] = []

  if (preferences.verbosity) {
    formatted.push(`- Response detail level: ${preferences.verbosity}`)
  }

  if (preferences.preferredFormat) {
    formatted.push(`- Preferred output format: ${preferences.preferredFormat}`)
  }

  if (preferences.timezone) {
    formatted.push(`- Timezone: ${preferences.timezone}`)
  }

  return formatted.length > 0 ? formatted.join('\n') : 'No specific preferences set.'
}

// ============================================================================
// Tool Instructions
// ============================================================================

export function buildToolInstructions(toolNames: string[]): string {
  return `## Available Tools

You have access to the following tools:
${toolNames.map((name) => `- ${name}`).join('\n')}

To use a tool, respond with a JSON object in this format:
\`\`\`json
{"tool_call": {"name": "tool_name", "arguments": {...}}}
\`\`\`

Guidelines for tool use:
1. Use tools when you need to access or modify data
2. You can chain multiple tool calls if needed
3. Always check tool results before making claims
4. If a tool fails, explain the error to the user`
}

// ============================================================================
// Construction Domain Context
// ============================================================================

export function buildConstructionContext(): string {
  return `## Construction Industry Knowledge

You understand construction industry terminology and workflows:

### Document Types
- **Drawings/Plans**: Architectural, structural, MEP (mechanical/electrical/plumbing)
- **Specifications**: Technical requirements organized by CSI MasterFormat divisions
- **Submittals**: Product data, shop drawings, samples for approval
- **RFIs**: Requests for Information to clarify design intent
- **Change Orders**: Modifications to contract scope, cost, or schedule
- **Daily Reports**: Field activity logs with manpower, weather, work performed

### CSI MasterFormat Divisions
- Division 00: Procurement and Contracting
- Division 01: General Requirements
- Division 02: Existing Conditions
- Division 03: Concrete
- Division 04: Masonry
- Division 05: Metals
- Division 06: Wood, Plastics, Composites
- Division 07: Thermal and Moisture Protection
- Division 08: Openings (Doors/Windows)
- Division 09: Finishes
- Division 10-14: Specialties, Equipment, Furnishings
- Division 21-28: Fire, Plumbing, HVAC, Electrical
- Division 31-35: Earthwork, Utilities, Paving

### Common Abbreviations
- GC: General Contractor
- PM: Project Manager
- RFI: Request for Information
- CO: Change Order
- PCO: Potential Change Order
- ASI: Architect's Supplemental Instructions
- PPC: Percent Plan Complete
- BIC: Ball in Court

### Daily Report Best Practices
When helping with daily reports, ensure these elements are captured:
1. **Weather**: Temperature, conditions, precipitation, wind - and impact on trades
2. **Manpower**: Total workers by trade, overtime noted separately
3. **Work Performed**: Specific locations, quantities (SF, LF, CY), percent complete
4. **Equipment**: Hours used, idle time reasons
5. **Deliveries**: BOL verification, condition, quantities
6. **Delays**: Document AS THEY OCCUR with start/stop times and causes
7. **Safety**: Observations, near-misses, toolbox talks
8. **Photos**: Minimum 5-10 per day, before/after, problem areas

### Weather Impact Guidelines
Understand trade-specific weather limits:
- **Concrete**: No pour below 40°F without protection, above 95°F needs retarders
- **Roofing**: No install during rain or above 100°F (shingles too soft)
- **Painting**: 50-85°F, humidity <85%, surface 5°F above dew point
- **Crane Operations**: Suspend above 20-25 mph winds (per load chart)
- **Lightning**: 30-30 rule - shelter if flash-to-bang <30 seconds, wait 30 min after last thunder

### OSHA Heat Illness Thresholds
- **80-90°F Heat Index**: Moderate risk - water available, acclimatization
- **91-103°F Heat Index**: High risk - mandatory rest breaks, shaded areas
- **103-115°F Heat Index**: Very high risk - reduced work intensity
- **Above 115°F Heat Index**: Extreme - consider stopping outdoor work

### Labor Productivity Benchmarks (Industry Averages)
- Concrete finishing: 150 SF/worker-hour
- Drywall hanging: 500 SF/worker-day
- Painting (spray): 1500 SF/worker-day
- Masonry (CMU): 125 blocks/worker-day
- Roofing (shingles): 3 squares/worker-day

### Delay Documentation (Claims Protection)
When documenting delays, always capture:
- Start/stop times of delay event
- Cause category: Owner, Architect, Weather, Unforeseen, Third-party
- Impact: Crews idle, areas inaccessible, work out of sequence
- Related RFIs or change orders
- Photos of conditions

### Construction Slang
Common field terms you should recognize:
- "Mud" = drywall compound
- "Iron" = reinforcing steel/rebar
- "Top out" = complete structure to highest point
- "Dry in" = make building weather-tight
- "Punch" = deficiency list walkthrough
- "Pick" = crane lift
- "Shake out" = distribute materials`
}

// ============================================================================
// Daily Operations Context
// ============================================================================

/**
 * Build context specific to daily operations based on time of day and project phase
 */
export function buildDailyOperationsContext(context: AgentContext): string {
  const sections: string[] = []
  const now = new Date()
  const hour = now.getHours()

  // Time-of-day awareness
  if (hour >= 5 && hour < 10) {
    sections.push(`## Morning Operations Context
You are assisting during the morning hours. Key superintendent tasks at this time:
- Review weather forecast and adjust day's plan
- Site walkthrough before crews arrive
- Pre-task planning meetings with foremen
- Verify expected material deliveries
- Review yesterday's carryover items`)
  } else if (hour >= 10 && hour < 15) {
    sections.push(`## Mid-Day Operations Context
You are assisting during active work hours. Key focus areas:
- Monitor work progress against schedule
- Document work completed, manpower, equipment
- Handle inspector visits and coordination
- Track and document any delays in real-time
- Photograph key activities and milestones`)
  } else if (hour >= 15 && hour < 18) {
    sections.push(`## End-of-Day Operations Context
You are assisting during end-of-day wrap-up. Key tasks:
- Final site walkthrough with foremen
- Complete daily report with all required fields
- Document any delays with start/stop times
- Photograph work completed today
- Review tomorrow's planned activities
- Ensure daily report is submitted before leaving`)
  }

  // Weather awareness prompts
  sections.push(`
### Weather Documentation Reminders
When discussing weather, always consider:
- Impact on scheduled activities by trade
- OSHA heat/cold stress thresholds
- Need for special measures (blankets, cooling stations)
- Delay potential and documentation requirements`)

  // Photo documentation standards
  sections.push(`
### Photo Documentation Standards
When photos are discussed, ensure:
- Minimum resolution of 2 megapixels
- Date stamps enabled
- Context shots (wide) and detail shots (close-up)
- Before/after sequences for inspections
- Immediate documentation of problem conditions`)

  return sections.join('\n\n')
}
