/**
 * Semantic Search Service
 * Provides natural language search with LLM query expansion across all entities.
 * Uses the existing AI service for query expansion, NOT vector embeddings.
 */

import { supabase } from '@/lib/supabase'
import { aiService } from './ai-provider'
import { logger } from '@/lib/utils/logger'

// ============================================================================
// Types
// ============================================================================

export type SearchEntityType =
  | 'rfi'
  | 'submittal'
  | 'daily_report'
  | 'document'
  | 'punch_item'
  | 'change_order'
  | 'task'
  | 'meeting'
  | 'inspection'
  | 'photo'
  | 'message'

export interface DateRange {
  start?: string
  end?: string
}

export interface SearchOptions {
  entities?: SearchEntityType[]
  projectId?: string
  dateRange?: DateRange
  limit?: number
  offset?: number
}

export interface SearchResult {
  id: string
  entityType: SearchEntityType
  title: string
  description: string
  number?: string | number
  status?: string
  projectId?: string
  projectName?: string
  createdAt: string
  updatedAt?: string
  matchedTerms: string[]
  relevanceScore: number
  url: string
}

export interface SemanticSearchResponse {
  results: SearchResult[]
  expandedTerms: string[]
  totalResults: number
  searchTimeMs: number
  queryExpansionTimeMs: number
}

export interface RateLimitInfo {
  remaining: number
  limit: number
  resetAt: Date
}

// ============================================================================
// Constants
// ============================================================================

const RATE_LIMIT_PER_HOUR = 50
const DEFAULT_RESULT_LIMIT = 50
const MAX_RESULT_LIMIT = 100
const QUERY_EXPANSION_CACHE = new Map<string, { terms: string[]; timestamp: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// Entity type configurations for search
const ENTITY_CONFIGS: Record<SearchEntityType, {
  table: string
  titleField: string
  descriptionField: string
  numberField?: string
  statusField?: string
  searchFields: string[]
  urlTemplate: (id: string, projectId?: string) => string
}> = {
  rfi: {
    table: 'workflow_items',
    titleField: 'title',
    descriptionField: 'description',
    numberField: 'number',
    statusField: 'status',
    searchFields: ['title', 'description', 'response'],
    urlTemplate: (id) => `/rfis/${id}`,
  },
  submittal: {
    table: 'workflow_items',
    titleField: 'title',
    descriptionField: 'description',
    numberField: 'number',
    statusField: 'status',
    searchFields: ['title', 'description', 'spec_section'],
    urlTemplate: (id) => `/submittals/${id}`,
  },
  daily_report: {
    table: 'daily_reports',
    titleField: 'report_date',
    descriptionField: 'summary',
    statusField: 'status',
    searchFields: ['summary', 'work_completed', 'issues_encountered', 'notes'],
    urlTemplate: (id) => `/daily-reports/${id}`,
  },
  document: {
    table: 'documents',
    titleField: 'name',
    descriptionField: 'description',
    statusField: 'status',
    searchFields: ['name', 'description', 'category'],
    urlTemplate: (id) => `/documents/${id}`,
  },
  punch_item: {
    table: 'punch_items',
    titleField: 'title',
    descriptionField: 'description',
    numberField: 'number',
    statusField: 'status',
    searchFields: ['title', 'description', 'location', 'notes'],
    urlTemplate: (id) => `/punch-lists/${id}`,
  },
  change_order: {
    table: 'change_orders',
    titleField: 'title',
    descriptionField: 'description',
    numberField: 'number',
    statusField: 'status',
    searchFields: ['title', 'description', 'reason', 'scope_of_work'],
    urlTemplate: (id) => `/change-orders/${id}`,
  },
  task: {
    table: 'tasks',
    titleField: 'title',
    descriptionField: 'description',
    statusField: 'status',
    searchFields: ['title', 'description', 'notes'],
    urlTemplate: (id) => `/tasks/${id}`,
  },
  meeting: {
    table: 'meetings',
    titleField: 'title',
    descriptionField: 'notes',
    statusField: 'status',
    searchFields: ['title', 'notes', 'agenda', 'minutes'],
    urlTemplate: (id) => `/meetings/${id}`,
  },
  inspection: {
    table: 'inspections',
    titleField: 'title',
    descriptionField: 'notes',
    statusField: 'status',
    searchFields: ['title', 'notes', 'findings', 'inspector_comments'],
    urlTemplate: (id) => `/inspections/${id}`,
  },
  photo: {
    table: 'photos',
    titleField: 'caption',
    descriptionField: 'description',
    searchFields: ['caption', 'description', 'tags', 'location'],
    urlTemplate: (id, projectId) => projectId ? `/projects/${projectId}/photos?photoId=${id}` : `/photos?photoId=${id}`,
  },
  message: {
    table: 'messages',
    titleField: 'content',
    descriptionField: 'content',
    searchFields: ['content'],
    urlTemplate: (id, projectId) => projectId ? `/projects/${projectId}/messages?messageId=${id}` : `/messages?messageId=${id}`,
  },
}

const ALL_ENTITY_TYPES: SearchEntityType[] = Object.keys(ENTITY_CONFIGS) as SearchEntityType[]

// ============================================================================
// Rate Limiting
// ============================================================================

const userSearchCounts = new Map<string, { count: number; resetAt: Date }>()

/**
 * Check if user has exceeded rate limit
 */
export function checkRateLimit(userId: string): RateLimitInfo {
  const now = new Date()
  const hourFromNow = new Date(now.getTime() + 60 * 60 * 1000)

  const userLimit = userSearchCounts.get(userId)

  if (!userLimit || userLimit.resetAt < now) {
    // Reset or initialize
    userSearchCounts.set(userId, { count: 0, resetAt: hourFromNow })
    return { remaining: RATE_LIMIT_PER_HOUR, limit: RATE_LIMIT_PER_HOUR, resetAt: hourFromNow }
  }

  return {
    remaining: Math.max(0, RATE_LIMIT_PER_HOUR - userLimit.count),
    limit: RATE_LIMIT_PER_HOUR,
    resetAt: userLimit.resetAt,
  }
}

/**
 * Increment rate limit counter
 */
function incrementRateLimit(userId: string): void {
  const now = new Date()
  const hourFromNow = new Date(now.getTime() + 60 * 60 * 1000)

  const userLimit = userSearchCounts.get(userId)

  if (!userLimit || userLimit.resetAt < now) {
    userSearchCounts.set(userId, { count: 1, resetAt: hourFromNow })
  } else {
    userLimit.count++
  }
}

// ============================================================================
// Input Sanitization (SQL Injection Prevention)
// ============================================================================

/**
 * Sanitize search query to prevent SQL injection
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') {
    return ''
  }

  // Remove potential SQL injection patterns
  const sanitized = query
    // Remove SQL comments
    .replace(/--/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove semicolons (statement terminators)
    .replace(/;/g, '')
    // Remove quotes that could break out of strings
    .replace(/['"]/g, '')
    // Remove backslashes
    .replace(/\\/g, '')
    // Remove null bytes
    .replace(/\0/g, '')
    // Limit length
    .slice(0, 500)
    // Trim whitespace
    .trim()

  return sanitized
}

/**
 * Validate and sanitize date range
 */
export function sanitizeDateRange(dateRange?: DateRange): DateRange | undefined {
  if (!dateRange) {return undefined}

  const result: DateRange = {}

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/

  if (dateRange.start && dateRegex.test(dateRange.start)) {
    result.start = dateRange.start
  }

  if (dateRange.end && dateRegex.test(dateRange.end)) {
    result.end = dateRange.end
  }

  return Object.keys(result).length > 0 ? result : undefined
}

// ============================================================================
// Query Expansion with LLM
// ============================================================================

/**
 * System prompt for query expansion
 */
const QUERY_EXPANSION_SYSTEM_PROMPT = `You are a construction project management search assistant.
Your task is to expand user search queries into related search terms that would help find relevant
documents, RFIs, submittals, daily reports, and other construction project items.

Consider:
- Common construction industry terminology
- Related technical terms
- Alternative phrasings
- CSI (Construction Specifications Institute) divisions when relevant
- Common abbreviations and their expansions

Respond with a JSON array of 3-5 search terms. Include the original query as the first term.
Do not include explanations, just the JSON array.

Example:
Query: "roof leaks"
Response: ["roof leaks", "waterproofing", "roof membrane", "flashing", "roof penetrations"]

Example:
Query: "HVAC submittal"
Response: ["HVAC submittal", "mechanical equipment", "air handling unit", "Division 23", "ductwork"]`

/**
 * Expand search query using LLM
 */
export async function expandSearchQuery(userQuery: string): Promise<string[]> {
  const sanitizedQuery = sanitizeSearchQuery(userQuery)

  if (!sanitizedQuery) {
    return []
  }

  // Check cache first
  const cacheKey = sanitizedQuery.toLowerCase()
  const cached = QUERY_EXPANSION_CACHE.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    logger.log('[SemanticSearch] Using cached query expansion for:', cacheKey)
    return cached.terms
  }

  try {
    const result = await aiService.complete(
      'semantic-search',
      `Query: "${sanitizedQuery}"\nGenerate search terms as a JSON array:`,
      {
        systemPrompt: QUERY_EXPANSION_SYSTEM_PROMPT,
        temperature: 0.3,
        maxTokens: 200,
      }
    )

    // Parse the JSON response
    let terms: string[]
    try {
      // Try to extract JSON array from response
      const jsonMatch = result.content.match(/\[[\s\S]*?\]/)
      if (jsonMatch) {
        terms = JSON.parse(jsonMatch[0])
      } else {
        // Fallback: split by commas or newlines
        terms = result.content
          .replace(/[[\]"]/g, '')
          .split(/[,\n]/)
          .map(t => t.trim())
          .filter(t => t.length > 0)
      }
    } catch {
      // If parsing fails, use original query
      terms = [sanitizedQuery]
    }

    // Ensure original query is included and sanitize all terms
    const sanitizedTerms = terms
      .map(t => sanitizeSearchQuery(t))
      .filter(t => t.length > 0)

    if (!sanitizedTerms.includes(sanitizedQuery)) {
      sanitizedTerms.unshift(sanitizedQuery)
    }

    // Limit to 5 terms
    const finalTerms = sanitizedTerms.slice(0, 5)

    // Cache the results
    QUERY_EXPANSION_CACHE.set(cacheKey, {
      terms: finalTerms,
      timestamp: Date.now(),
    })

    logger.log('[SemanticSearch] Expanded query:', {
      original: sanitizedQuery,
      expanded: finalTerms,
      tokensUsed: result.tokens.total,
    })

    return finalTerms
  } catch (error) {
    logger.error('[SemanticSearch] Query expansion failed:', error)
    // Return original query on error
    return [sanitizedQuery]
  }
}

// ============================================================================
// Entity Search Functions
// ============================================================================

/**
 * Build search query for a specific entity type
 */
async function searchEntity(
  entityType: SearchEntityType,
  searchTerms: string[],
  options: SearchOptions
): Promise<SearchResult[]> {
  const config = ENTITY_CONFIGS[entityType]
  if (!config) {
    return []
  }

  try {
    // Build the text search pattern
    const searchPattern = searchTerms
      .map(term => term.split(/\s+/).filter(w => w.length > 2).join(' & '))
      .filter(p => p.length > 0)
      .join(' | ')

    if (!searchPattern) {
      return []
    }

    // Build query based on entity type
    let query

    if (entityType === 'message') {
      // Messages need special handling - join through conversations to projects
      query = supabase
        .from(config.table)
        .select(`
          id,
          ${config.titleField},
          conversation_id,
          sender_id,
          created_at,
          updated_at,
          conversations!inner(
            id,
            name,
            type,
            project_id,
            projects(name)
          )
        `)
    } else {
      // Standard query for entities with direct project_id
      query = supabase
        .from(config.table)
        .select(`
          id,
          ${config.titleField},
          ${config.descriptionField || 'null as description'},
          ${config.numberField ? config.numberField : 'null as number'},
          ${config.statusField || 'null as status'},
          project_id,
          created_at,
          updated_at,
          projects!inner(name)
        `)

      // For workflow_items, filter by type
      if (entityType === 'rfi') {
        query = query.ilike('workflow_types.name_singular', 'RFI')
      } else if (entityType === 'submittal') {
        query = query.ilike('workflow_types.name_singular', 'Submittal')
      }
    }

    // Apply project filter
    if (options.projectId) {
      if (entityType === 'message') {
        query = query.eq('conversations.project_id', options.projectId)
      } else {
        query = query.eq('project_id', options.projectId)
      }
    }

    // Apply date range filter
    if (options.dateRange?.start) {
      query = query.gte('created_at', options.dateRange.start)
    }
    if (options.dateRange?.end) {
      query = query.lte('created_at', options.dateRange.end)
    }

    // Apply text search using OR across search fields
    // We'll use ilike for each term and field combination
    const orConditions: string[] = []
    for (const term of searchTerms) {
      for (const field of config.searchFields) {
        orConditions.push(`${field}.ilike.%${term}%`)
      }
    }

    if (orConditions.length > 0) {
      query = query.or(orConditions.join(','))
    }

    // Apply limit
    const limit = Math.min(options.limit || DEFAULT_RESULT_LIMIT, MAX_RESULT_LIMIT)
    query = query.limit(limit)

    // Execute query
    const { data, error } = await query

    if (error) {
      logger.error(`[SemanticSearch] Error searching ${entityType}:`, error)
      return []
    }

    // Transform results
    return (data || []).map((item: Record<string, unknown>) => {
      // Calculate which terms matched
      const matchedTerms: string[] = []
      const titleVal = String(item[config.titleField] || '').toLowerCase()
      const descVal = String(item[config.descriptionField] || '').toLowerCase()

      for (const term of searchTerms) {
        const termLower = term.toLowerCase()
        if (titleVal.includes(termLower) || descVal.includes(termLower)) {
          matchedTerms.push(term)
        }
      }

      // Calculate relevance score (simple: based on matched terms and position)
      const relevanceScore = calculateRelevanceScore(item, searchTerms, config)

      // Extract project info based on entity type
      let projectId = ''
      let projectName = 'Unknown Project'

      if (entityType === 'message') {
        // Messages have conversations.project_id
        const conversation = item.conversations as { project_id?: string; projects?: { name?: string } } | undefined
        projectId = String(conversation?.project_id || '')
        projectName = conversation?.projects?.name || 'Direct Message'
      } else {
        // Standard entities have direct project_id
        projectId = String(item.project_id || '')
        projectName = (item.projects as { name?: string })?.name || 'Unknown Project'
      }

      return {
        id: String(item.id),
        entityType,
        title: formatTitle(item, config, entityType),
        description: String(item[config.descriptionField] || '').slice(0, 200),
        number: config.numberField ? item[config.numberField] as string | number : undefined,
        status: config.statusField ? String(item[config.statusField] || '') : undefined,
        projectId,
        projectName,
        createdAt: String(item.created_at || ''),
        updatedAt: item.updated_at ? String(item.updated_at) : undefined,
        matchedTerms,
        relevanceScore,
        url: config.urlTemplate(String(item.id), projectId),
      }
    })
  } catch (error) {
    logger.error(`[SemanticSearch] Exception searching ${entityType}:`, error)
    return []
  }
}

/**
 * Calculate relevance score for a search result
 */
function calculateRelevanceScore(
  item: Record<string, unknown>,
  searchTerms: string[],
  config: typeof ENTITY_CONFIGS[SearchEntityType]
): number {
  let score = 0
  const titleVal = String(item[config.titleField] || '').toLowerCase()
  const descVal = String(item[config.descriptionField] || '').toLowerCase()

  for (let i = 0; i < searchTerms.length; i++) {
    const term = searchTerms[i].toLowerCase()
    const termWeight = 1 - (i * 0.15) // First term has highest weight

    // Title match is worth more
    if (titleVal.includes(term)) {
      score += 10 * termWeight
      // Exact match in title worth even more
      if (titleVal === term) {
        score += 5 * termWeight
      }
    }

    // Description match
    if (descVal.includes(term)) {
      score += 5 * termWeight
    }
  }

  // Normalize to 0-100
  return Math.min(100, Math.round(score))
}

/**
 * Format title for display
 */
function formatTitle(
  item: Record<string, unknown>,
  config: typeof ENTITY_CONFIGS[SearchEntityType],
  entityType: SearchEntityType
): string {
  const title = String(item[config.titleField] || 'Untitled')
  const number = config.numberField ? item[config.numberField] : undefined

  if (entityType === 'daily_report') {
    // Format date for daily reports
    const date = new Date(title)
    return `Daily Report - ${date.toLocaleDateString()}`
  }

  if (number !== undefined && number !== null) {
    return `#${number} - ${title}`
  }

  return title
}

// ============================================================================
// Main Search Function
// ============================================================================

/**
 * Perform semantic search across all entity types
 */
export async function semanticSearch(
  query: string,
  userId: string,
  options: SearchOptions = {}
): Promise<SemanticSearchResponse> {
  const startTime = Date.now()

  // Check rate limit
  const rateLimitInfo = checkRateLimit(userId)
  if (rateLimitInfo.remaining <= 0) {
    throw new Error(
      `Rate limit exceeded. You can perform ${RATE_LIMIT_PER_HOUR} searches per hour. ` +
      `Try again at ${rateLimitInfo.resetAt.toLocaleTimeString()}.`
    )
  }

  // Sanitize inputs
  const sanitizedQuery = sanitizeSearchQuery(query)
  if (!sanitizedQuery) {
    return {
      results: [],
      expandedTerms: [],
      totalResults: 0,
      searchTimeMs: Date.now() - startTime,
      queryExpansionTimeMs: 0,
    }
  }

  const sanitizedDateRange = sanitizeDateRange(options.dateRange)

  // Expand query with LLM
  const expansionStart = Date.now()
  const expandedTerms = await expandSearchQuery(sanitizedQuery)
  const queryExpansionTimeMs = Date.now() - expansionStart

  // Determine which entity types to search
  const entityTypes = options.entities && options.entities.length > 0
    ? options.entities
    : ALL_ENTITY_TYPES

  // Search all entity types in parallel
  const searchPromises = entityTypes.map(entityType =>
    searchEntity(entityType, expandedTerms, {
      ...options,
      dateRange: sanitizedDateRange,
    })
  )

  const searchResults = await Promise.all(searchPromises)

  // Combine and sort results by relevance
  const allResults = searchResults
    .flat()
    .sort((a, b) => b.relevanceScore - a.relevanceScore)

  // Apply overall limit
  const limit = Math.min(options.limit || DEFAULT_RESULT_LIMIT, MAX_RESULT_LIMIT)
  const limitedResults = allResults.slice(0, limit)

  // Increment rate limit counter
  incrementRateLimit(userId)

  const totalTimeMs = Date.now() - startTime

  logger.log('[SemanticSearch] Search completed:', {
    query: sanitizedQuery,
    expandedTerms,
    entityTypes,
    totalResults: allResults.length,
    returnedResults: limitedResults.length,
    searchTimeMs: totalTimeMs,
    queryExpansionTimeMs,
  })

  return {
    results: limitedResults,
    expandedTerms,
    totalResults: allResults.length,
    searchTimeMs: totalTimeMs,
    queryExpansionTimeMs,
  }
}

// ============================================================================
// Simple Text Search (No LLM)
// ============================================================================

/**
 * Perform simple text search without LLM query expansion
 * Useful as a fallback or for users who prefer exact matching
 */
export async function simpleSearch(
  query: string,
  userId: string,
  options: SearchOptions = {}
): Promise<SemanticSearchResponse> {
  const startTime = Date.now()

  // Check rate limit (same limit applies)
  const rateLimitInfo = checkRateLimit(userId)
  if (rateLimitInfo.remaining <= 0) {
    throw new Error(
      `Rate limit exceeded. You can perform ${RATE_LIMIT_PER_HOUR} searches per hour. ` +
      `Try again at ${rateLimitInfo.resetAt.toLocaleTimeString()}.`
    )
  }

  // Sanitize inputs
  const sanitizedQuery = sanitizeSearchQuery(query)
  if (!sanitizedQuery) {
    return {
      results: [],
      expandedTerms: [],
      totalResults: 0,
      searchTimeMs: Date.now() - startTime,
      queryExpansionTimeMs: 0,
    }
  }

  const sanitizedDateRange = sanitizeDateRange(options.dateRange)

  // No query expansion - just use the original terms
  const searchTerms = sanitizedQuery.split(/\s+/).filter(t => t.length > 2)
  if (searchTerms.length === 0) {
    searchTerms.push(sanitizedQuery)
  }

  // Determine which entity types to search
  const entityTypes = options.entities && options.entities.length > 0
    ? options.entities
    : ALL_ENTITY_TYPES

  // Search all entity types in parallel
  const searchPromises = entityTypes.map(entityType =>
    searchEntity(entityType, searchTerms, {
      ...options,
      dateRange: sanitizedDateRange,
    })
  )

  const searchResults = await Promise.all(searchPromises)

  // Combine and sort results by relevance
  const allResults = searchResults
    .flat()
    .sort((a, b) => b.relevanceScore - a.relevanceScore)

  // Apply overall limit
  const limit = Math.min(options.limit || DEFAULT_RESULT_LIMIT, MAX_RESULT_LIMIT)
  const limitedResults = allResults.slice(0, limit)

  // Increment rate limit counter
  incrementRateLimit(userId)

  const totalTimeMs = Date.now() - startTime

  return {
    results: limitedResults,
    expandedTerms: searchTerms,
    totalResults: allResults.length,
    searchTimeMs: totalTimeMs,
    queryExpansionTimeMs: 0,
  }
}

// ============================================================================
// Exports
// ============================================================================

export const semanticSearchApi = {
  semanticSearch,
  simpleSearch,
  expandSearchQuery,
  checkRateLimit,
  sanitizeSearchQuery,
  sanitizeDateRange,
}
