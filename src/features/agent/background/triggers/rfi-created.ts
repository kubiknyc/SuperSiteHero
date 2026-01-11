/**
 * RFI Created Trigger
 * Auto-suggest routing, identify similar RFIs, and draft initial response suggestions
 */

import { supabase } from '@/lib/supabase'
import { aiService } from '@/lib/api/services/ai-provider'
import { logger } from '@/lib/utils/logger'
import { taskService } from '../../services/task-service'
import { registerTaskHandler } from '../processor'
import type { AgentTask, TaskContext, TaskResult, TaskHandler } from '../../types/tasks'

// ============================================================================
// Types
// ============================================================================

interface RFICreatedInput {
  rfi_id: string
  auto_route?: boolean
  find_similar?: boolean
  draft_response?: boolean
}

interface SimilarRFI {
  id: string
  number: string
  subject: string
  answer: string | null
  assigned_to_role: string | null
  similarity_score: number
  relevant_excerpt: string | null
}

interface RoutingSuggestion {
  suggested_role: string
  role_confidence: number
  suggested_assignee_id: string | null
  suggested_assignee_name: string | null
  assignee_confidence: number | null
  csi_section: string | null
  keywords: string[]
  reasoning: string
}

interface ResponseDraft {
  draft_text: string
  confidence: number
  references: Array<{
    type: string
    id: string
    name: string
    excerpt: string | null
  }>
  suggested_attachments: string[]
  review_notes: string[]
}

interface RFIProcessingOutput {
  rfi_id: string
  routing_suggestion: RoutingSuggestion | null
  similar_rfis: SimilarRFI[]
  response_draft: ResponseDraft | null
  processing_summary: string
}

// ============================================================================
// Prompts
// ============================================================================

const ROUTING_SYSTEM_PROMPT = `You are an expert construction RFI routing assistant. Analyze RFIs and recommend the most appropriate person or role to respond.

Routing Guidelines:
- Architect: Design intent, aesthetics, layout, materials specification
- Engineer (Structural): Structural questions, load bearing, foundations
- Engineer (MEP): Mechanical, electrical, plumbing systems
- Owner: Scope changes, budget impacts, timeline decisions
- GC PM: Means and methods, coordination, scheduling
- Subcontractor: Trade-specific installation details
- Consultant: Specialty items within their scope

Respond with JSON:
{
  "suggested_role": "architect|structural_engineer|mep_engineer|owner|gc_pm|subcontractor|consultant",
  "role_confidence": 0-100,
  "suggested_assignee_id": "UUID or null",
  "suggested_assignee_name": "Name or null",
  "assignee_confidence": 0-100 or null,
  "csi_section": "CSI code or null",
  "keywords": ["key", "terms"],
  "reasoning": "Brief explanation"
}`

const RESPONSE_DRAFT_PROMPT = `You are a construction professional drafting an RFI response. Based on the RFI question and similar past RFIs, draft a professional response.

Guidelines:
- Be clear and specific
- Reference relevant specifications or drawings when applicable
- Maintain professional tone
- Indicate if additional information is needed
- Note any cost or schedule implications

Respond with JSON:
{
  "draft_text": "The professional response text...",
  "confidence": 0-100,
  "references": [{"type": "rfi|drawing|spec", "id": "id", "name": "name", "excerpt": "relevant text"}],
  "suggested_attachments": ["Drawing A-101", "Spec Section 03 30 00"],
  "review_notes": ["Points to verify before sending"]
}`

// ============================================================================
// Task Handler
// ============================================================================

const rfiCreatedHandler: TaskHandler<RFICreatedInput, RFIProcessingOutput> = {
  taskType: 'rfi_suggest_routing',
  displayName: 'Process New RFI',
  description: 'Suggest routing, find similar RFIs, and draft response for new RFI',

  async execute(
    task: AgentTask,
    context: TaskContext
  ): Promise<TaskResult<RFIProcessingOutput>> {
    const input = task.input_data as RFICreatedInput
    let totalTokens = 0

    try {
      // Fetch RFI details
      const { data: rfi, error: fetchError } = await supabase
        .from('rfis')
        .select(`
          id,
          rfi_number,
          subject,
          question,
          spec_section,
          project_id,
          status,
          created_at,
          created_by
        `)
        .eq('id', input.rfi_id)
        .single()

      if (fetchError || !rfi) {
        return {
          success: false,
          error: `RFI not found: ${input.rfi_id}`,
          errorCode: 'RFI_NOT_FOUND',
          shouldRetry: false,
        }
      }

      let routingSuggestion: RoutingSuggestion | null = null
      let similarRfis: SimilarRFI[] = []
      let responseDraft: ResponseDraft | null = null

      // Step 1: Find similar RFIs
      if (input.find_similar !== false) {
        similarRfis = await findSimilarRFIs(
          rfi.project_id,
          rfi.subject,
          rfi.question,
          rfi.id
        )
        logger.debug(`[RFICreated] Found ${similarRfis.length} similar RFIs`)
      }

      // Step 2: Suggest routing
      if (input.auto_route !== false) {
        const routeResult = await suggestRouting(rfi, similarRfis)
        routingSuggestion = routeResult.suggestion
        totalTokens += routeResult.tokens

        // Update RFI with routing suggestion
        await supabase
          .from('rfis')
          .update({
            agent_routing_suggestion: routingSuggestion,
          })
          .eq('id', input.rfi_id)
      }

      // Step 3: Draft response (if we have similar answered RFIs)
      if (input.draft_response !== false && hasUsefulPrecedents(similarRfis)) {
        const draftResult = await draftResponse(rfi, similarRfis)
        responseDraft = draftResult.draft
        totalTokens += draftResult.tokens

        // Update RFI with draft
        await supabase
          .from('rfis')
          .update({
            agent_draft_response: responseDraft.draft_text,
            agent_draft_generated_at: new Date().toISOString(),
          })
          .eq('id', input.rfi_id)
      }

      // Log action
      await logRFIProcessing(context, input.rfi_id, {
        routing_suggested: !!routingSuggestion,
        similar_count: similarRfis.length,
        draft_generated: !!responseDraft,
      })

      // Send notification to relevant users
      await sendRFINotifications(task, rfi, routingSuggestion, similarRfis)

      return {
        success: true,
        data: {
          rfi_id: input.rfi_id,
          routing_suggestion: routingSuggestion,
          similar_rfis: similarRfis,
          response_draft: responseDraft,
          processing_summary: buildProcessingSummary(routingSuggestion, similarRfis, responseDraft),
        },
        metadata: {
          tokensUsed: totalTokens,
          costCents: Math.ceil(totalTokens * 0.00001 * 100),
        },
      }
    } catch (error) {
      logger.error('[RFICreated] Processing error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed',
        errorCode: 'PROCESSING_ERROR',
        shouldRetry: true,
      }
    }
  },

  validate(input: RFICreatedInput) {
    if (!input.rfi_id) {
      return {
        valid: false,
        errors: [{ field: 'rfi_id', message: 'RFI ID is required' }],
      }
    }
    return { valid: true }
  },
}

// ============================================================================
// Helper Functions
// ============================================================================

async function findSimilarRFIs(
  projectId: string,
  subject: string,
  question: string,
  excludeId: string
): Promise<SimilarRFI[]> {
  // Get closed/answered RFIs from the same project
  const { data: rfis } = await supabase
    .from('rfis')
    .select(`
      id,
      rfi_number,
      subject,
      question,
      answer,
      assigned_to,
      status
    `)
    .eq('project_id', projectId)
    .neq('id', excludeId)
    .in('status', ['closed', 'answered'])
    .order('created_at', { ascending: false })
    .limit(100)

  if (!rfis || rfis.length === 0) {return []}

  // Simple keyword-based similarity scoring
  const searchText = `${subject} ${question}`.toLowerCase()
  const searchTerms = searchText.split(/\s+/).filter((t) => t.length > 3)

  const scored = rfis.map((rfi) => {
    const rfiText = `${rfi.subject} ${rfi.question} ${rfi.answer || ''}`.toLowerCase()

    let matchCount = 0
    let excerpt: string | null = null

    for (const term of searchTerms) {
      if (rfiText.includes(term)) {
        matchCount++
        // Find a relevant excerpt
        if (!excerpt && rfi.answer) {
          const idx = rfi.answer.toLowerCase().indexOf(term)
          if (idx >= 0) {
            const start = Math.max(0, idx - 50)
            const end = Math.min(rfi.answer.length, idx + 100)
            excerpt = rfi.answer.slice(start, end)
          }
        }
      }
    }

    const similarity = searchTerms.length > 0
      ? Math.min((matchCount / searchTerms.length) * 100, 100)
      : 0

    return {
      id: rfi.id,
      number: rfi.rfi_number,
      subject: rfi.subject,
      answer: rfi.answer,
      assigned_to_role: rfi.assigned_to,
      similarity_score: Math.round(similarity),
      relevant_excerpt: excerpt,
    }
  })

  return scored
    .filter((r) => r.similarity_score >= 20)
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, 5)
}

function hasUsefulPrecedents(similarRfis: SimilarRFI[]): boolean {
  // Check if we have at least one similar RFI with a useful answer
  return similarRfis.some(
    (rfi) => rfi.similarity_score >= 40 && rfi.answer && rfi.answer.length > 50
  )
}

async function suggestRouting(
  rfi: {
    rfi_number: string
    subject: string
    question: string
    spec_section: string | null
    project_id: string
  },
  similarRfis: SimilarRFI[]
): Promise<{ suggestion: RoutingSuggestion; tokens: number }> {
  // Get project team for assignee suggestions
  const { data: teamMembers } = await supabase
    .from('project_users')
    .select(`
      user_id,
      role,
      users!inner(id, first_name, last_name)
    `)
    .eq('project_id', rfi.project_id)
    .limit(20)

  let prompt = `Analyze this RFI and suggest routing:

RFI Number: ${rfi.rfi_number}
Subject: ${rfi.subject}
Question: ${rfi.question}
${rfi.spec_section ? `Spec Section: ${rfi.spec_section}` : ''}`

  if (similarRfis.length > 0) {
    prompt += `\n\nSimilar Past RFIs (for reference):
${similarRfis.map((r) => `- ${r.number}: ${r.subject} (assigned to: ${r.assigned_to_role || 'Unknown'})`).join('\n')}`
  }

  if (teamMembers && teamMembers.length > 0) {
    prompt += `\n\nProject Team:
${teamMembers.map((m: any) => `- ${m.users.first_name} ${m.users.last_name} (${m.role}) [${m.user_id}]`).join('\n')}`
  }

  const result = await aiService.extractJSON<RoutingSuggestion>(
    'rfi_routing',
    prompt,
    {
      systemPrompt: ROUTING_SYSTEM_PROMPT,
      temperature: 0.3,
      maxTokens: 1024,
    }
  )

  return {
    suggestion: result.data,
    tokens: result.tokens.total,
  }
}

async function draftResponse(
  rfi: {
    rfi_number: string
    subject: string
    question: string
    spec_section: string | null
  },
  similarRfis: SimilarRFI[]
): Promise<{ draft: ResponseDraft; tokens: number }> {
  // Use similar RFIs as context for drafting
  const answeredRfis = similarRfis.filter((r) => r.answer && r.answer.length > 50)

  let prompt = `Draft a response for this RFI:

RFI Number: ${rfi.rfi_number}
Subject: ${rfi.subject}
Question: ${rfi.question}
${rfi.spec_section ? `Spec Section: ${rfi.spec_section}` : ''}`

  if (answeredRfis.length > 0) {
    prompt += `\n\nSimilar Answered RFIs (use as reference):
${answeredRfis.map((r) => `
--- ${r.number}: ${r.subject} ---
Question context: (similarity: ${r.similarity_score}%)
Answer: ${r.answer}
`).join('\n')}`
  }

  prompt += `\n\nDraft a professional response based on the patterns from similar RFIs.`

  const result = await aiService.extractJSON<ResponseDraft>(
    'rfi_response_draft',
    prompt,
    {
      systemPrompt: RESPONSE_DRAFT_PROMPT,
      temperature: 0.4,
      maxTokens: 1500,
    }
  )

  return {
    draft: result.data,
    tokens: result.tokens.total,
  }
}

function buildProcessingSummary(
  routing: RoutingSuggestion | null,
  similarRfis: SimilarRFI[],
  draft: ResponseDraft | null
): string {
  const parts: string[] = []

  if (routing) {
    parts.push(`Routing: ${routing.suggested_role} (${routing.role_confidence}% confidence)`)
  }

  if (similarRfis.length > 0) {
    const topMatch = similarRfis[0]
    parts.push(`Found ${similarRfis.length} similar RFIs (top: ${topMatch.number} @ ${topMatch.similarity_score}%)`)
  }

  if (draft) {
    parts.push(`Draft response generated (${draft.confidence}% confidence)`)
  }

  return parts.join('. ') || 'No processing performed'
}

async function logRFIProcessing(
  context: TaskContext,
  rfiId: string,
  summary: { routing_suggested: boolean; similar_count: number; draft_generated: boolean }
): Promise<void> {
  try {
    await supabase.from('agent_actions').insert({
      company_id: context.companyId,
      action_type: 'tool_call',
      tool_name: 'process_rfi',
      target_entity_type: 'rfi',
      target_entity_id: rfiId,
      input_summary: `Process RFI ${rfiId}`,
      output_summary: `Routing: ${summary.routing_suggested}, Similar: ${summary.similar_count}, Draft: ${summary.draft_generated}`,
      status: 'executed',
      executed_at: new Date().toISOString(),
    })
  } catch (error) {
    logger.warn('[RFICreated] Could not log action:', error)
  }
}

async function sendRFINotifications(
  task: AgentTask,
  rfi: { rfi_number: string; subject: string; created_by: string },
  routing: RoutingSuggestion | null,
  similarRfis: SimilarRFI[]
): Promise<void> {
  try {
    // Notify creator about suggestions
    if (routing && rfi.created_by) {
      let message = `AI suggests routing RFI ${rfi.rfi_number} to ${routing.suggested_role}.`
      if (similarRfis.length > 0) {
        message += ` Found ${similarRfis.length} similar RFI(s) for reference.`
      }

      await supabase.from('notifications').insert({
        user_id: rfi.created_by,
        company_id: task.company_id,
        title: `RFI ${rfi.rfi_number} - Routing Suggestion`,
        message,
        type: 'info',
        entity_type: 'rfi',
        entity_id: task.target_entity_id,
        is_agent_generated: true,
        agent_task_id: task.id,
      })
    }

    // If we have a suggested assignee, notify them too
    if (routing?.suggested_assignee_id) {
      await supabase.from('notifications').insert({
        user_id: routing.suggested_assignee_id,
        company_id: task.company_id,
        title: `RFI ${rfi.rfi_number} - Action Suggested`,
        message: `You've been suggested as the responder for RFI: ${rfi.subject}`,
        type: 'action',
        entity_type: 'rfi',
        entity_id: task.target_entity_id,
        is_agent_generated: true,
        agent_task_id: task.id,
      })
    }
  } catch (error) {
    logger.warn('[RFICreated] Could not send notifications:', error)
  }
}

// ============================================================================
// Subscribe to RFI Creation
// ============================================================================

/**
 * Set up realtime subscription for new RFI creation
 */
export function subscribeToRFICreation(companyId: string): () => void {
  const channel = supabase
    .channel(`rfi-creation-${companyId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'rfis',
      },
      async (payload) => {
        const rfi = payload.new as {
          id: string
          project_id: string
          rfi_number: string
        }

        logger.info('[RFICreated] New RFI detected:', rfi.rfi_number)

        try {
          await taskService.create({
            task_type: 'rfi_suggest_routing',
            project_id: rfi.project_id,
            input_data: {
              rfi_id: rfi.id,
              auto_route: true,
              find_similar: true,
              draft_response: true,
            },
            target_entity_type: 'rfi',
            target_entity_id: rfi.id,
            priority: 80, // Higher priority for new RFIs
          })
        } catch (error) {
          logger.error('[RFICreated] Failed to create task:', error)
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// ============================================================================
// Register Handler
// ============================================================================

registerTaskHandler(rfiCreatedHandler)

// ============================================================================
// Exports
// ============================================================================

export { rfiCreatedHandler }
export type { RFICreatedInput, RFIProcessingOutput }
