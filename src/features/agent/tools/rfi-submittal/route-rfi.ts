/**
 * RFI Routing Suggestion Tool
 * Get intelligent routing suggestion for an RFI
 */

import { supabase } from '@/lib/supabase'
import { aiService } from '@/lib/api/services/ai-provider'
import { createTool } from '../registry'
import type { ToolContext, ToolResult, JSONSchema } from '../../types/tools'
import { logger } from '@/lib/utils/logger'

// ============================================================================
// Types
// ============================================================================

interface RouteRFIInput {
  rfi_id: string
}

interface SimilarRFI {
  id: string
  number: string
  subject: string
  resolution?: string
  assigned_to?: string
  similarity: number
}

interface RouteRFIOutput {
  rfi_id: string
  suggested_role: string
  role_confidence: number
  suggested_assignee_id?: string
  suggested_assignee_name?: string
  assignee_confidence?: number
  csi_section?: string
  keywords: string[]
  reasoning: string
  similar_rfis: SimilarRFI[]
}

// ============================================================================
// Tool Definition
// ============================================================================

const parameters: JSONSchema = {
  type: 'object',
  properties: {
    rfi_id: {
      type: 'string',
      description: 'UUID of the RFI to route',
    },
  },
  required: ['rfi_id'],
}

async function execute(
  input: RouteRFIInput,
  context: ToolContext
): Promise<ToolResult<RouteRFIOutput>> {
  const startTime = Date.now()

  try {
    // Fetch RFI details
    const { data: rfi, error: fetchError } = await supabase
      .from('rfis')
      .select(`
        id,
        rfi_number,
        subject,
        question,
        project_id,
        spec_section,
        status,
        created_at
      `)
      .eq('id', input.rfi_id)
      .single()

    if (fetchError || !rfi) {
      return {
        success: false,
        error: `RFI not found: ${input.rfi_id}`,
        errorCode: 'RFI_NOT_FOUND',
      }
    }

    // Find similar past RFIs for reference
    const similarRFIs = await findSimilarRFIs(rfi.project_id, rfi.subject, rfi.question, rfi.id)

    // Get project team members
    const teamMembers = await getProjectTeam(rfi.project_id)

    // Build routing prompt
    const prompt = buildRoutingPrompt(rfi, similarRFIs, teamMembers)

    // Call AI service
    const result = await aiService.extractJSON<RoutingSuggestion>(
      'rfi_routing',
      prompt,
      {
        systemPrompt: ROUTING_SYSTEM_PROMPT,
        temperature: 0.3,
        maxTokens: 1024,
      }
    )

    const suggestion = result.data

    // Save routing suggestion to RFI
    await supabase
      .from('rfis')
      .update({
        agent_routing_suggestion: {
          suggested_role: suggestion.suggested_role,
          role_confidence: suggestion.role_confidence,
          suggested_assignee_id: suggestion.suggested_assignee_id,
          assignee_confidence: suggestion.assignee_confidence,
          csi_section: suggestion.csi_section,
          keywords: suggestion.keywords,
          reasoning: suggestion.reasoning,
          suggested_at: new Date().toISOString(),
        },
      })
      .eq('id', input.rfi_id)

    // Log action
    await logAction(context, input, suggestion)

    return {
      success: true,
      data: {
        rfi_id: input.rfi_id,
        suggested_role: suggestion.suggested_role,
        role_confidence: suggestion.role_confidence,
        suggested_assignee_id: suggestion.suggested_assignee_id,
        suggested_assignee_name: suggestion.suggested_assignee_name,
        assignee_confidence: suggestion.assignee_confidence,
        csi_section: suggestion.csi_section,
        keywords: suggestion.keywords,
        reasoning: suggestion.reasoning,
        similar_rfis: similarRFIs,
      },
      metadata: {
        executionTimeMs: Date.now() - startTime,
        tokensUsed: result.tokens.total,
      },
    }
  } catch (error) {
    logger.error('[RouteRFI] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Routing failed',
      errorCode: 'ROUTING_ERROR',
      metadata: {
        executionTimeMs: Date.now() - startTime,
      },
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

interface RoutingSuggestion {
  suggested_role: string
  role_confidence: number
  suggested_assignee_id?: string
  suggested_assignee_name?: string
  assignee_confidence?: number
  csi_section?: string
  keywords: string[]
  reasoning: string
}

const ROUTING_SYSTEM_PROMPT = `You are an expert construction RFI routing assistant. Your job is to analyze RFIs and recommend the most appropriate person or role to respond.

You must respond with valid JSON matching this schema:
{
  "suggested_role": "string - who should answer (architect, engineer, owner, gc_pm, subcontractor, consultant)",
  "role_confidence": number 0-100,
  "suggested_assignee_id": "string or null - specific person UUID if known",
  "suggested_assignee_name": "string or null - specific person name",
  "assignee_confidence": number 0-100 or null,
  "csi_section": "string or null - relevant CSI section code",
  "keywords": ["array of key terms from the RFI"],
  "reasoning": "brief explanation of your routing decision"
}

Routing Guidelines:
- Architect: Design intent, aesthetics, layout, materials specification
- Engineer (Structural): Structural questions, load bearing, foundations
- Engineer (MEP): Mechanical, electrical, plumbing systems
- Owner: Scope changes, budget impacts, timeline decisions
- GC PM: Means and methods, coordination, scheduling
- Subcontractor: Trade-specific installation details
- Consultant: Specialty items within their scope`

async function findSimilarRFIs(
  projectId: string,
  subject: string,
  question: string,
  excludeId: string
): Promise<SimilarRFI[]> {
  // Get closed RFIs from same project for reference
  const { data: rfis } = await supabase
    .from('rfis')
    .select('id, rfi_number, subject, answer, assigned_to')
    .eq('project_id', projectId)
    .neq('id', excludeId)
    .eq('status', 'closed')
    .order('created_at', { ascending: false })
    .limit(50)

  if (!rfis || rfis.length === 0) {return []}

  // Simple keyword-based similarity
  const searchTerms = `${subject} ${question}`.toLowerCase().split(/\s+/)

  const scored = rfis.map((rfi) => {
    const rfiText = `${rfi.subject} ${rfi.answer || ''}`.toLowerCase()
    let score = 0
    for (const term of searchTerms) {
      if (term.length > 3 && rfiText.includes(term)) {
        score += 1
      }
    }
    return { ...rfi, similarity: Math.min(score * 10, 100) }
  })

  return scored
    .filter((r) => r.similarity > 20)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5)
    .map((rfi) => ({
      id: rfi.id,
      number: rfi.rfi_number,
      subject: rfi.subject,
      resolution: rfi.answer,
      assigned_to: rfi.assigned_to,
      similarity: rfi.similarity,
    }))
}

async function getProjectTeam(projectId: string): Promise<Array<{ id: string; name: string; role: string }>> {
  const { data } = await supabase
    .from('project_users')
    .select(`
      user_id,
      role,
      users!inner(id, first_name, last_name)
    `)
    .eq('project_id', projectId)
    .limit(20)

  if (!data) {return []}

  return data.map((pu: any) => ({
    id: pu.user_id,
    name: `${pu.users.first_name || ''} ${pu.users.last_name || ''}`.trim() || 'Unknown',
    role: pu.role,
  }))
}

function buildRoutingPrompt(
  rfi: {
    rfi_number: string
    subject: string
    question: string
    spec_section?: string
  },
  similarRFIs: SimilarRFI[],
  teamMembers: Array<{ id: string; name: string; role: string }>
): string {
  let prompt = `Analyze this RFI and suggest routing:

RFI Number: ${rfi.rfi_number}
Subject: ${rfi.subject}
Question: ${rfi.question}
${rfi.spec_section ? `Spec Section: ${rfi.spec_section}` : ''}`

  if (similarRFIs.length > 0) {
    prompt += `\n\nSimilar Past RFIs (for reference):
${similarRFIs.map((r) => `- ${r.number}: ${r.subject} → ${r.assigned_to || 'Unknown'}`).join('\n')}`
  }

  if (teamMembers.length > 0) {
    prompt += `\n\nProject Team:
${teamMembers.map((m) => `- ${m.name} (${m.role}) [ID: ${m.id}]`).join('\n')}`
  }

  prompt += `\n\nProvide a routing recommendation.`

  return prompt
}

async function logAction(
  context: ToolContext,
  input: RouteRFIInput,
  output: RoutingSuggestion
): Promise<void> {
  try {
    await supabase.from('agent_actions').insert({
      company_id: context.companyId,
      session_id: context.sessionId,
      message_id: context.messageId,
      action_type: 'tool_call',
      tool_name: 'suggest_rfi_routing',
      target_entity_type: 'rfi',
      target_entity_id: input.rfi_id,
      input_summary: `Suggest routing for RFI ${input.rfi_id}`,
      output_summary: `Suggested ${output.suggested_role} (${output.role_confidence}% confidence)`,
      status: 'executed',
      executed_at: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('[RouteRFI] Error logging action:', error)
  }
}

// ============================================================================
// Register Tool
// ============================================================================

export const routeRFITool = createTool({
  name: 'suggest_rfi_routing',
  displayName: 'Suggest RFI Routing',
  description:
    'Get an intelligent routing suggestion for an RFI, including the recommended role, specific assignee if possible, and similar past RFIs for reference',
  category: 'rfi',
  parameters,
  requiresConfirmation: false,
  estimatedTokens: 600,
  execute,
  formatOutput: (output: RouteRFIOutput) => ({
    title: 'RFI Routing Suggestion',
    summary: `Route to ${output.suggested_role}${output.suggested_assignee_name ? ` (${output.suggested_assignee_name})` : ''} - ${output.role_confidence}% confidence`,
    icon: 'Route',
    status: output.role_confidence >= 80 ? 'success' : output.role_confidence >= 50 ? 'warning' : 'info',
    details: [
      { label: 'Suggested Role', value: output.suggested_role, type: 'badge' },
      { label: 'Confidence', value: `${output.role_confidence}%`, type: 'text' },
      ...(output.suggested_assignee_name
        ? [{ label: 'Suggested Assignee', value: output.suggested_assignee_name, type: 'text' as const }]
        : []),
      ...(output.csi_section
        ? [{ label: 'CSI Section', value: output.csi_section, type: 'text' as const }]
        : []),
      { label: 'Keywords', value: output.keywords.join(', '), type: 'text' },
    ],
    actions:
      output.similar_rfis.length > 0
        ? output.similar_rfis.slice(0, 3).map((rfi) => ({
            id: `view-${rfi.id}`,
            label: `View ${rfi.number}`,
            icon: 'ExternalLink',
            action: 'navigate' as const,
            data: { url: `/rfis/${rfi.id}` },
          }))
        : undefined,
    expandedContent: output.reasoning,
  }),
})
