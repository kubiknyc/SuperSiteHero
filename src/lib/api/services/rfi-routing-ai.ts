/**
 * RFI Routing AI Service
 * Intelligent RFI assignment suggestions based on content analysis,
 * CSI classification, and learned patterns from user feedback.
 */

import { supabase } from '@/lib/supabase'
import { aiService } from './ai-provider'
import type {
  RFIRoutingSuggestion,
  RFIRoutingPattern,
  GenerateRoutingSuggestionDTO,
  RoutingSuggestionResponse,
  RelatedItem,
  SubmitRoutingFeedbackDTO,
  BallInCourtRole,
} from '@/types/ai'

// Type assertion helper for tables not yet in Supabase types
const supabaseAny = supabase as any

// CSI MasterFormat divisions for classification
const CSI_DIVISIONS = [
  { code: '01', name: 'General Requirements', typicalRole: 'gc_pm' as const },
  { code: '02', name: 'Existing Conditions', typicalRole: 'engineer' as const },
  { code: '03', name: 'Concrete', typicalRole: 'engineer' as const },
  { code: '04', name: 'Masonry', typicalRole: 'architect' as const },
  { code: '05', name: 'Metals', typicalRole: 'engineer' as const },
  { code: '06', name: 'Wood, Plastics, Composites', typicalRole: 'architect' as const },
  { code: '07', name: 'Thermal and Moisture Protection', typicalRole: 'architect' as const },
  { code: '08', name: 'Openings', typicalRole: 'architect' as const },
  { code: '09', name: 'Finishes', typicalRole: 'architect' as const },
  { code: '10', name: 'Specialties', typicalRole: 'architect' as const },
  { code: '11', name: 'Equipment', typicalRole: 'owner' as const },
  { code: '12', name: 'Furnishings', typicalRole: 'architect' as const },
  { code: '13', name: 'Special Construction', typicalRole: 'engineer' as const },
  { code: '14', name: 'Conveying Equipment', typicalRole: 'engineer' as const },
  { code: '21', name: 'Fire Suppression', typicalRole: 'engineer' as const },
  { code: '22', name: 'Plumbing', typicalRole: 'engineer' as const },
  { code: '23', name: 'HVAC', typicalRole: 'engineer' as const },
  { code: '25', name: 'Integrated Automation', typicalRole: 'engineer' as const },
  { code: '26', name: 'Electrical', typicalRole: 'engineer' as const },
  { code: '27', name: 'Communications', typicalRole: 'engineer' as const },
  { code: '28', name: 'Electronic Safety and Security', typicalRole: 'engineer' as const },
  { code: '31', name: 'Earthwork', typicalRole: 'engineer' as const },
  { code: '32', name: 'Exterior Improvements', typicalRole: 'architect' as const },
  { code: '33', name: 'Utilities', typicalRole: 'engineer' as const },
]

// Keywords for role classification
const ROLE_KEYWORDS: Record<BallInCourtRole, string[]> = {
  architect: [
    'aesthetic', 'appearance', 'color', 'finish', 'design intent', 'architectural',
    'material selection', 'elevation', 'section', 'detail', 'partition', 'ceiling',
    'floor plan', 'facade', 'interior', 'space', 'layout', 'door', 'window',
    'cladding', 'tile', 'paint', 'millwork', 'cabinetry',
  ],
  engineer: [
    'structural', 'mechanical', 'electrical', 'plumbing', 'hvac', 'load',
    'foundation', 'footing', 'beam', 'column', 'slab', 'reinforcement', 'rebar',
    'duct', 'pipe', 'conduit', 'panel', 'circuit', 'transformer', 'pump',
    'calculation', 'capacity', 'sizing', 'specification', 'equipment',
  ],
  owner: [
    'budget', 'cost', 'approval', 'decision', 'preference', 'requirement',
    'scope change', 'timeline', 'schedule impact', 'funding', 'authorization',
    'contract', 'allowance', 'alternates', 'value engineering',
  ],
  gc_pm: [
    'coordination', 'schedule', 'logistics', 'sequencing', 'phasing',
    'safety', 'site', 'temporary', 'protection', 'staging', 'access',
    'subcontractor', 'procurement', 'delivery', 'installation',
  ],
  subcontractor: [
    'means and methods', 'installation', 'field condition', 'as-built',
    'shop drawing', 'fabrication', 'tolerance', 'clearance',
  ],
  consultant: [
    'specialty', 'acoustic', 'lighting', 'landscape', 'civil', 'geotechnical',
    'survey', 'environmental', 'fire protection', 'security',
  ],
  inspector: [
    'inspection', 'code', 'compliance', 'permit', 'testing', 'certification',
    'jurisdiction', 'authority', 'violation', 'correction',
  ],
}

// System prompt for RFI routing
const RFI_ROUTING_SYSTEM_PROMPT = `You are an expert construction project coordinator specializing in RFI (Request for Information) routing.

Your task is to analyze RFI content and determine:
1. The most appropriate role to receive this RFI (architect, engineer, owner, gc_pm, subcontractor, consultant, or inspector)
2. The CSI MasterFormat division and section if applicable
3. Keywords that characterize the RFI content
4. Brief reasoning for your classification

Consider:
- Architectural questions relate to design intent, aesthetics, finishes, and space planning
- Engineering questions relate to structural, MEP systems, calculations, and specifications
- Owner questions relate to budget, scope, timeline decisions, and approvals
- GC/PM questions relate to coordination, logistics, scheduling, and site management
- Inspector questions relate to code compliance, permits, and testing

Respond with valid JSON only.`

export const rfiRoutingAiApi = {
  /**
   * Generate routing suggestion for an RFI
   */
  async generateSuggestion(dto: GenerateRoutingSuggestionDTO): Promise<RoutingSuggestionResponse> {
    const startTime = Date.now()

    // First, try to find patterns from previous RFIs
    const patterns = await this.findMatchingPatterns(dto.subject, dto.question)

    // If we have high-confidence patterns, use them
    if (patterns.length > 0 && patterns[0].success_rate > 0.8) {
      const topPattern = patterns[0]
      const suggestion = await this.createSuggestionFromPattern(dto.rfi_id, topPattern, startTime)
      const relatedItems = await this.findRelatedItems(dto.project_id, dto.subject, dto.question)

      return {
        suggestion,
        relatedRFIs: relatedItems.rfis,
        relatedSubmittals: relatedItems.submittals,
      }
    }

    // Use AI for routing suggestion
    const prompt = `Analyze this RFI and determine the appropriate routing:

Subject: ${dto.subject}

Question/Issue:
${dto.question}

${dto.spec_section ? `Specification Section: ${dto.spec_section}` : ''}

Respond with JSON in this format:
{
  "suggestedRole": "architect|engineer|owner|gc_pm|subcontractor|consultant|inspector",
  "roleConfidence": 0-100,
  "csiDivision": "XX" or null,
  "csiSection": "XX XX XX" or null,
  "csiConfidence": 0-100 or null,
  "keywords": ["keyword1", "keyword2", ...],
  "reasoning": "Brief explanation for the classification"
}`

    interface AIRoutingResult {
      suggestedRole: BallInCourtRole
      roleConfidence: number
      csiDivision?: string
      csiSection?: string
      csiConfidence?: number
      keywords: string[]
      reasoning: string
    }

    const { data: aiResult } = await aiService.extractJSON<AIRoutingResult>(
      'rfi_routing',
      prompt,
      { systemPrompt: RFI_ROUTING_SYSTEM_PROMPT }
    )

    const processingTime = Date.now() - startTime

    // Save suggestion to database
    const { data: suggestion, error } = await supabaseAny
      .from('rfi_routing_suggestions')
      .insert({
        rfi_id: dto.rfi_id,
        suggested_role: aiResult.suggestedRole,
        role_confidence: aiResult.roleConfidence,
        csi_division: aiResult.csiDivision,
        csi_section: aiResult.csiSection,
        csi_confidence: aiResult.csiConfidence,
        keywords: aiResult.keywords,
        reasoning: aiResult.reasoning,
        processing_time_ms: processingTime,
        model_used: 'ai',
        feedback_status: 'pending',
      })
      .select()
      .single()

    if (error) {throw error}

    // Find related items
    const relatedItems = await this.findRelatedItems(dto.project_id, dto.subject, dto.question)

    return {
      suggestion,
      relatedRFIs: relatedItems.rfis,
      relatedSubmittals: relatedItems.submittals,
    }
  },

  /**
   * Submit feedback on a routing suggestion
   */
  async submitFeedback(dto: SubmitRoutingFeedbackDTO): Promise<void> {
    const { error } = await supabaseAny
      .from('rfi_routing_suggestions')
      .update({
        feedback_status: dto.feedback_status,
        actual_role_assigned: dto.actual_role_assigned,
        actual_assignee_id: dto.actual_assignee_id,
        feedback_notes: dto.feedback_notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dto.suggestion_id)

    if (error) {throw error}

    // If feedback was accepted or modified, update patterns
    if (dto.feedback_status === 'accepted' || dto.feedback_status === 'modified') {
      await this.updatePatternsFromFeedback(dto)
    }
  },

  /**
   * Find matching patterns from previous RFIs
   */
  async findMatchingPatterns(subject: string, question: string): Promise<RFIRoutingPattern[]> {
    const combinedText = `${subject} ${question}`.toLowerCase()
    const words = combinedText.split(/\s+/).filter(w => w.length > 3)

    // Look for patterns that match keywords
    const { data: patterns } = await supabaseAny
      .from('rfi_routing_patterns')
      .select('*')
      .gte('match_count', 3) // Only use patterns with enough matches
      .gte('success_rate', 0.6) // Only use successful patterns
      .order('success_rate', { ascending: false })
      .limit(10)

    if (!patterns) {return []}

    // Score patterns by keyword match
    const scoredPatterns = patterns
      .map((pattern: RFIRoutingPattern) => {
        const patternWords = pattern.keyword_pattern.toLowerCase().split(/\s+/)
        const matchScore = patternWords.filter((pw: string) =>
          words.some((w: string) => w.includes(pw) || pw.includes(w))
        ).length / patternWords.length

        return { ...pattern, matchScore }
      })
      .filter((p: RFIRoutingPattern & { matchScore: number }) => p.matchScore > 0.3)
      .sort((a: RFIRoutingPattern & { matchScore: number }, b: RFIRoutingPattern & { matchScore: number }) => b.matchScore * b.success_rate - a.matchScore * a.success_rate)

    return scoredPatterns.slice(0, 3)
  },

  /**
   * Create suggestion from a matched pattern
   */
  async createSuggestionFromPattern(
    rfiId: string,
    pattern: RFIRoutingPattern,
    startTime: number
  ): Promise<RFIRoutingSuggestion> {
    const processingTime = Date.now() - startTime

    const { data: suggestion, error } = await supabaseAny
      .from('rfi_routing_suggestions')
      .insert({
        rfi_id: rfiId,
        suggested_role: pattern.typical_role,
        role_confidence: Math.round(pattern.success_rate * 100),
        suggested_assignee_id: pattern.typical_assignee_id,
        assignee_confidence: pattern.typical_assignee_id ? Math.round(pattern.success_rate * 80) : null,
        csi_division: pattern.csi_division,
        keywords: pattern.keyword_pattern.split(/\s+/),
        reasoning: `Based on ${pattern.match_count} similar RFIs with ${Math.round(pattern.success_rate * 100)}% success rate`,
        processing_time_ms: processingTime,
        model_used: 'pattern',
        feedback_status: 'pending',
      })
      .select()
      .single()

    if (error) {throw error}

    // Update pattern usage
    await supabaseAny
      .from('rfi_routing_patterns')
      .update({
        match_count: pattern.match_count + 1,
        last_matched_at: new Date().toISOString(),
      })
      .eq('id', pattern.id)

    return suggestion
  },

  /**
   * Update patterns based on user feedback
   */
  async updatePatternsFromFeedback(dto: SubmitRoutingFeedbackDTO): Promise<void> {
    // Get the original suggestion
    const { data: suggestion } = await supabaseAny
      .from('rfi_routing_suggestions')
      .select('*, rfi:rfis!inner(subject, question)')
      .eq('id', dto.suggestion_id)
      .single()

    if (!suggestion) {return}

    const keywords = suggestion.keywords?.join(' ') || ''
    const roleToUse = dto.actual_role_assigned || suggestion.suggested_role

    // Check if pattern already exists
    const { data: existingPattern } = await supabaseAny
      .from('rfi_routing_patterns')
      .select('*')
      .eq('keyword_pattern', keywords)
      .eq('typical_role', roleToUse)
      .single()

    if (existingPattern) {
      // Update existing pattern
      const wasCorrect = dto.feedback_status === 'accepted'
      const newMatchCount = existingPattern.match_count + 1
      const newSuccessRate = wasCorrect
        ? (existingPattern.success_rate * existingPattern.match_count + 1) / newMatchCount
        : (existingPattern.success_rate * existingPattern.match_count) / newMatchCount

      await supabaseAny
        .from('rfi_routing_patterns')
        .update({
          match_count: newMatchCount,
          success_rate: newSuccessRate,
          typical_assignee_id: dto.actual_assignee_id || existingPattern.typical_assignee_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingPattern.id)
    } else if (keywords.length > 0) {
      // Create new pattern
      await supabaseAny
        .from('rfi_routing_patterns')
        .insert({
          keyword_pattern: keywords,
          typical_role: roleToUse,
          typical_assignee_id: dto.actual_assignee_id,
          csi_division: suggestion.csi_division,
          match_count: 1,
          success_rate: dto.feedback_status === 'accepted' ? 1.0 : 0.5,
        })
    }
  },

  /**
   * Find related RFIs and Submittals
   */
  async findRelatedItems(
    projectId: string,
    subject: string,
    question: string
  ): Promise<{ rfis: RelatedItem[]; submittals: RelatedItem[] }> {
    const searchTerms = extractKeyTerms(`${subject} ${question}`)

    // Find related RFIs using full-text search
    const { data: rfis } = await supabase
      .from('rfis')
      .select('id, rfi_number, subject, status')
      .eq('project_id', projectId)
      .textSearch('subject', searchTerms.join(' | '))
      .limit(5)

    // Find related Submittals
    const { data: submittals } = await supabaseAny
      .from('dedicated_submittals')
      .select('id, submittal_number, title, status')
      .eq('project_id', projectId)
      .textSearch('title', searchTerms.join(' | '))
      .limit(5)

    return {
      rfis: (rfis || []).map((rfi: { id: string; rfi_number: number; subject: string; status: string }) => ({
        id: rfi.id,
        number: String(rfi.rfi_number),
        subject: rfi.subject,
        similarity: 0.7, // Placeholder - would use actual similarity scoring
        status: rfi.status,
      })),
      submittals: (submittals || []).map((sub: { id: string; submittal_number: string; title: string; status: string }) => ({
        id: sub.id,
        number: sub.submittal_number,
        subject: sub.title,
        similarity: 0.6,
        status: sub.status,
      })),
    }
  },

  /**
   * Get routing suggestions for an RFI
   */
  async getSuggestions(rfiId: string): Promise<RFIRoutingSuggestion[]> {
    const { data, error } = await supabaseAny
      .from('rfi_routing_suggestions')
      .select('*')
      .eq('rfi_id', rfiId)
      .order('created_at', { ascending: false })

    if (error) {throw error}
    return data || []
  },

  /**
   * Quick role suggestion using keyword matching (no AI)
   */
  quickSuggestRole(subject: string, question: string): {
    role: BallInCourtRole
    confidence: number
    matchedKeywords: string[]
  } {
    const combinedText = `${subject} ${question}`.toLowerCase()
    const roleScores: Record<BallInCourtRole, { score: number; keywords: string[] }> = {
      architect: { score: 0, keywords: [] },
      engineer: { score: 0, keywords: [] },
      owner: { score: 0, keywords: [] },
      gc_pm: { score: 0, keywords: [] },
      subcontractor: { score: 0, keywords: [] },
      consultant: { score: 0, keywords: [] },
      inspector: { score: 0, keywords: [] },
    }

    // Score each role by keyword matches
    for (const [role, keywords] of Object.entries(ROLE_KEYWORDS) as [BallInCourtRole, string[]][]) {
      for (const keyword of keywords) {
        if (combinedText.includes(keyword.toLowerCase())) {
          roleScores[role].score += 1
          roleScores[role].keywords.push(keyword)
        }
      }
    }

    // Also check CSI division
    const csiMatch = combinedText.match(/\b(\d{2})\s*\d{2}/)
    if (csiMatch) {
      const division = CSI_DIVISIONS.find(d => d.code === csiMatch[1])
      if (division) {
        roleScores[division.typicalRole].score += 2
      }
    }

    // Find highest scoring role
    let topRole: BallInCourtRole = 'gc_pm'
    let topScore = 0
    let matchedKeywords: string[] = []

    for (const [role, data] of Object.entries(roleScores) as [BallInCourtRole, { score: number; keywords: string[] }][]) {
      if (data.score > topScore) {
        topScore = data.score
        topRole = role
        matchedKeywords = data.keywords
      }
    }

    // Calculate confidence (max 85% for keyword-only)
    const confidence = Math.min(85, Math.round((topScore / 5) * 100))

    return {
      role: topRole,
      confidence: confidence || 50, // Default 50% if no matches
      matchedKeywords,
    }
  },
}

/**
 * Extract key terms from text for search
 */
function extractKeyTerms(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who',
    'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few',
    'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
    'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if',
    'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with',
    'about', 'against', 'between', 'into', 'through', 'during', 'before',
    'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on',
    'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there',
    'please', 'need', 'want', 'like', 'per', 'ref', 'see', 'also',
  ])

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 10)
}
