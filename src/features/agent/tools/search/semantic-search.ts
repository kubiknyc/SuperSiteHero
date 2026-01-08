/**
 * Semantic Search Tool
 * Search across all project data using natural language
 */

import { supabase } from '@/lib/supabase'
import { aiService } from '@/lib/api/services/ai-provider'
import { createTool } from '../registry'
import type { ToolContext, ToolResult, JSONSchema } from '../../types/tools'
import { logger } from '@/lib/utils/logger'

// ============================================================================
// Types
// ============================================================================

interface SemanticSearchInput {
  query: string
  project_id?: string
  entity_types?: string[]
  limit?: number
}

interface SearchResult {
  entity_type: string
  entity_id: string
  title: string
  excerpt: string
  relevance_score: number
  metadata?: Record<string, unknown>
}

interface SemanticSearchOutput {
  query: string
  results: SearchResult[]
  total_count: number
  search_time_ms: number
  expanded_query?: string
}

// ============================================================================
// Tool Definition
// ============================================================================

const parameters: JSONSchema = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      description: 'Natural language search query',
    },
    project_id: {
      type: 'string',
      description: 'Optional project ID to scope the search',
    },
    entity_types: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Types to search: rfi, submittal, document, daily_report, punch_item, change_order, task, meeting',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of results (default: 10)',
      default: 10,
    },
  },
  required: ['query'],
}

async function execute(
  input: SemanticSearchInput,
  context: ToolContext
): Promise<ToolResult<SemanticSearchOutput>> {
  const startTime = Date.now()
  const limit = input.limit || 10

  try {
    // Use project from input or context
    const projectId = input.project_id || context.projectId

    // Expand query using LLM for better search
    const expandedQuery = await expandQuery(input.query)

    // Determine which entity types to search
    const entityTypes = input.entity_types || [
      'rfi',
      'submittal',
      'document',
      'daily_report',
      'punch_item',
      'change_order',
      'task',
    ]

    // Search across all entity types in parallel
    const searchPromises = entityTypes.map((type) =>
      searchEntityType(type, expandedQuery, projectId, context.companyId, Math.ceil(limit / entityTypes.length))
    )

    const searchResults = await Promise.all(searchPromises)

    // Flatten and sort by relevance
    const allResults = searchResults
      .flat()
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, limit)

    const searchTimeMs = Date.now() - startTime

    return {
      success: true,
      data: {
        query: input.query,
        results: allResults,
        total_count: allResults.length,
        search_time_ms: searchTimeMs,
        expanded_query: expandedQuery !== input.query ? expandedQuery : undefined,
      },
      metadata: {
        executionTimeMs: searchTimeMs,
      },
    }
  } catch (error) {
    logger.error('[SemanticSearch] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Search failed',
      errorCode: 'SEARCH_ERROR',
      metadata: {
        executionTimeMs: Date.now() - startTime,
      },
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

async function expandQuery(query: string): Promise<string> {
  try {
    // Use LLM to expand the query with synonyms and related terms
    const result = await aiService.extractJSON<{ expanded: string }>(
      'query_expansion',
      `Expand this construction search query with relevant synonyms and terms. Keep it concise.

Original query: "${query}"

Return JSON: {"expanded": "expanded query with synonyms"}`,
      {
        temperature: 0.3,
        maxTokens: 100,
      }
    )

    return result.data.expanded || query
  } catch {
    // If expansion fails, use original query
    return query
  }
}

async function searchEntityType(
  entityType: string,
  query: string,
  projectId: string | null,
  companyId: string,
  limit: number
): Promise<SearchResult[]> {
  const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean)

  switch (entityType) {
    case 'rfi':
      return searchRFIs(searchTerms, projectId, companyId, limit)
    case 'submittal':
      return searchSubmittals(searchTerms, projectId, companyId, limit)
    case 'document':
      return searchDocuments(searchTerms, projectId, companyId, limit)
    case 'daily_report':
      return searchDailyReports(searchTerms, projectId, companyId, limit)
    case 'punch_item':
      return searchPunchItems(searchTerms, projectId, companyId, limit)
    case 'change_order':
      return searchChangeOrders(searchTerms, projectId, companyId, limit)
    case 'task':
      return searchTasks(searchTerms, projectId, companyId, limit)
    default:
      return []
  }
}

async function searchRFIs(
  terms: string[],
  projectId: string | null,
  _companyId: string,
  limit: number
): Promise<SearchResult[]> {
  let query = supabase
    .from('rfis')
    .select('id, rfi_number, subject, question, answer, status')
    .limit(limit)

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  // Text search on subject and question
  const searchPattern = terms.join(' | ')
  query = query.or(`subject.ilike.%${terms[0]}%,question.ilike.%${terms[0]}%`)

  const { data, error } = await query

  if (error || !data) return []

  return data.map((rfi) => ({
    entity_type: 'rfi',
    entity_id: rfi.id,
    title: `RFI ${rfi.rfi_number}: ${rfi.subject}`,
    excerpt: truncate(rfi.question || '', 200),
    relevance_score: calculateRelevance(terms, [rfi.subject, rfi.question, rfi.answer]),
    metadata: { status: rfi.status, rfi_number: rfi.rfi_number },
  }))
}

async function searchSubmittals(
  terms: string[],
  projectId: string | null,
  _companyId: string,
  limit: number
): Promise<SearchResult[]> {
  let query = supabase
    .from('submittals')
    .select('id, submittal_number, title, description, status, spec_section')
    .limit(limit)

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  query = query.or(`title.ilike.%${terms[0]}%,description.ilike.%${terms[0]}%`)

  const { data, error } = await query

  if (error || !data) return []

  return data.map((sub) => ({
    entity_type: 'submittal',
    entity_id: sub.id,
    title: `Submittal ${sub.submittal_number}: ${sub.title}`,
    excerpt: truncate(sub.description || '', 200),
    relevance_score: calculateRelevance(terms, [sub.title, sub.description, sub.spec_section]),
    metadata: { status: sub.status, spec_section: sub.spec_section },
  }))
}

async function searchDocuments(
  terms: string[],
  projectId: string | null,
  _companyId: string,
  limit: number
): Promise<SearchResult[]> {
  let query = supabase
    .from('documents')
    .select('id, name, description, category, file_name')
    .limit(limit)

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  query = query.or(`name.ilike.%${terms[0]}%,description.ilike.%${terms[0]}%`)

  const { data, error } = await query

  if (error || !data) return []

  return data.map((doc) => ({
    entity_type: 'document',
    entity_id: doc.id,
    title: doc.name,
    excerpt: truncate(doc.description || doc.file_name || '', 200),
    relevance_score: calculateRelevance(terms, [doc.name, doc.description, doc.category]),
    metadata: { category: doc.category },
  }))
}

async function searchDailyReports(
  terms: string[],
  projectId: string | null,
  _companyId: string,
  limit: number
): Promise<SearchResult[]> {
  let query = supabase
    .from('daily_reports')
    .select('id, report_date, summary, weather_conditions, work_performed')
    .order('report_date', { ascending: false })
    .limit(limit)

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error || !data) return []

  // Filter by terms in summary or work_performed
  const filtered = data.filter((report) => {
    const text = `${report.summary || ''} ${report.work_performed || ''}`.toLowerCase()
    return terms.some((term) => text.includes(term))
  })

  return filtered.map((report) => ({
    entity_type: 'daily_report',
    entity_id: report.id,
    title: `Daily Report - ${new Date(report.report_date).toLocaleDateString()}`,
    excerpt: truncate(report.summary || report.work_performed || '', 200),
    relevance_score: calculateRelevance(terms, [report.summary, report.work_performed]),
    metadata: { date: report.report_date, weather: report.weather_conditions },
  }))
}

async function searchPunchItems(
  terms: string[],
  projectId: string | null,
  _companyId: string,
  limit: number
): Promise<SearchResult[]> {
  let query = supabase
    .from('punch_items')
    .select('id, item_number, description, location, status, trade')
    .limit(limit)

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  query = query.or(`description.ilike.%${terms[0]}%,location.ilike.%${terms[0]}%`)

  const { data, error } = await query

  if (error || !data) return []

  return data.map((item) => ({
    entity_type: 'punch_item',
    entity_id: item.id,
    title: `Punch Item ${item.item_number}: ${truncate(item.description, 50)}`,
    excerpt: `${item.location || 'No location'} - ${item.trade || 'No trade'}`,
    relevance_score: calculateRelevance(terms, [item.description, item.location, item.trade]),
    metadata: { status: item.status, trade: item.trade },
  }))
}

async function searchChangeOrders(
  terms: string[],
  projectId: string | null,
  _companyId: string,
  limit: number
): Promise<SearchResult[]> {
  let query = supabase
    .from('change_orders')
    .select('id, co_number, title, description, status, amount')
    .limit(limit)

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  query = query.or(`title.ilike.%${terms[0]}%,description.ilike.%${terms[0]}%`)

  const { data, error } = await query

  if (error || !data) return []

  return data.map((co) => ({
    entity_type: 'change_order',
    entity_id: co.id,
    title: `CO ${co.co_number}: ${co.title}`,
    excerpt: truncate(co.description || '', 200),
    relevance_score: calculateRelevance(terms, [co.title, co.description]),
    metadata: { status: co.status, amount: co.amount },
  }))
}

async function searchTasks(
  terms: string[],
  projectId: string | null,
  _companyId: string,
  limit: number
): Promise<SearchResult[]> {
  let query = supabase
    .from('tasks')
    .select('id, task_number, title, description, status, priority')
    .limit(limit)

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  query = query.or(`title.ilike.%${terms[0]}%,description.ilike.%${terms[0]}%`)

  const { data, error } = await query

  if (error || !data) return []

  return data.map((task) => ({
    entity_type: 'task',
    entity_id: task.id,
    title: `Task ${task.task_number}: ${task.title}`,
    excerpt: truncate(task.description || '', 200),
    relevance_score: calculateRelevance(terms, [task.title, task.description]),
    metadata: { status: task.status, priority: task.priority },
  }))
}

function calculateRelevance(terms: string[], fields: (string | null | undefined)[]): number {
  const text = fields.filter(Boolean).join(' ').toLowerCase()
  let score = 0

  for (const term of terms) {
    if (text.includes(term)) {
      score += 30
      // Bonus for exact word match
      if (text.split(/\s+/).includes(term)) {
        score += 20
      }
    }
  }

  return Math.min(score, 100)
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

// ============================================================================
// Register Tool
// ============================================================================

export const semanticSearchTool = createTool({
  name: 'semantic_search',
  displayName: 'Search',
  description:
    'Search across all project data using natural language. Searches RFIs, submittals, documents, daily reports, punch items, change orders, and tasks.',
  category: 'search',
  parameters,
  requiresConfirmation: false,
  estimatedTokens: 200,
  execute,
  formatOutput: (output: SemanticSearchOutput) => ({
    title: 'Search Results',
    summary: `Found ${output.total_count} results for "${output.query}"`,
    icon: 'Search',
    status: output.total_count > 0 ? 'success' : 'info',
    details: output.results.slice(0, 5).map((result) => ({
      label: result.entity_type.toUpperCase(),
      value: result.title,
      type: 'link' as const,
      linkHref: `/${result.entity_type}s/${result.entity_id}`,
    })),
    expandedContent: output.results.length > 5 ? `...and ${output.results.length - 5} more results` : undefined,
  }),
})
