/**
 * Document Entity Linking Service
 * Extracts and links documents to related entities (RFIs, Submittals, Change Orders)
 * and enhances document classification with LLM when needed.
 */

import { supabase } from '@/lib/supabase'
import { aiService } from './ai-provider'
import type {
  DocumentLLMResult,
  DocumentEntityLink,
  ExtractedDocumentMetadata,
  EnhanceDocumentRequest,
  EnhanceDocumentResponse,
} from '@/types/ai'

// Entity reference patterns
const ENTITY_PATTERNS = {
  rfi: /\bRFI[#\s-]*(\d+)\b/gi,
  submittal: /\b(SUBMITTAL|SUB)[#\s-]*(\d+)\b/gi,
  change_order: /\b(CO|CHANGE ORDER|PCO)[#\s-]*(\d+)\b/gi,
  drawing: /\b([A-Z]\d{3}|\d{3}[A-Z]?)\b/g,
  spec_section: /\b(\d{2}\s?\d{2}\s?\d{2})\b/g,
}

// CSI Division mapping
const CSI_DIVISIONS: Record<string, string> = {
  '01': 'General Requirements',
  '02': 'Existing Conditions',
  '03': 'Concrete',
  '04': 'Masonry',
  '05': 'Metals',
  '06': 'Wood, Plastics, Composites',
  '07': 'Thermal and Moisture Protection',
  '08': 'Openings',
  '09': 'Finishes',
  '10': 'Specialties',
  '11': 'Equipment',
  '12': 'Furnishings',
  '13': 'Special Construction',
  '14': 'Conveying Equipment',
  '21': 'Fire Suppression',
  '22': 'Plumbing',
  '23': 'HVAC',
  '25': 'Integrated Automation',
  '26': 'Electrical',
  '27': 'Communications',
  '28': 'Electronic Safety and Security',
  '31': 'Earthwork',
  '32': 'Exterior Improvements',
  '33': 'Utilities',
}

// System prompt for document classification
const DOCUMENT_CLASSIFICATION_PROMPT = `You are an expert construction document classifier.
Analyze the document content and provide classification details.

For drawings, extract: sheet number, title, revision, scale, drawn by.
For submittals, extract: spec section, manufacturer, model, dates.
For RFI responses, extract: answer summary, cost impact, schedule impact.
For contracts, extract: parties, value, dates, key terms.

Respond with valid JSON only.`

export const documentEntityLinkingApi = {
  /**
   * Enhance a document with LLM classification and entity linking
   */
  async enhanceDocument(request: EnhanceDocumentRequest): Promise<EnhanceDocumentResponse> {
    const startTime = Date.now()

    // Get document details
    const { data: document, error: docError } = await (supabase as any)
      .from('documents')
      .select('*, processing_result, extracted_text')
      .eq('id', request.document_id)
      .single()

    if (docError || !document) {
      throw new Error('Document not found')
    }

    const existingCategory = document.processing_result?.category
    const existingConfidence = document.processing_result?.confidence || 0
    const extractedText = document.extracted_text || ''

    // Determine if LLM is needed
    const needsLLM = request.force_llm || existingConfidence < 75

    let llmResult: DocumentLLMResult | null = null
    let tokensUsed = 0

    if (needsLLM && extractedText.length > 50) {
      llmResult = await this.classifyWithLLM(
        request.document_id,
        extractedText,
        document.file_name,
        existingCategory
      )
      tokensUsed = llmResult.tokens_used || 0
    } else {
      // Create result from existing classification
      llmResult = {
        id: crypto.randomUUID(),
        document_id: request.document_id,
        classification_method: 'keyword',
        llm_category: existingCategory,
        llm_confidence: existingConfidence,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    }

    // Extract metadata if requested
    if (request.extract_metadata && extractedText.length > 50) {
      llmResult.extracted_metadata = await this.extractMetadata(
        extractedText,
        llmResult.llm_category || existingCategory
      )
    }

    // Generate summary if requested
    if (request.generate_summary && extractedText.length > 100) {
      llmResult.summary = await this.generateSummary(extractedText)
      tokensUsed += 500 // Estimate
    }

    // Find entity links
    let entityLinks: DocumentEntityLink[] = []
    if (request.find_entity_links) {
      entityLinks = await this.findEntityLinks(
        request.document_id,
        document.project_id,
        extractedText,
        document.file_name
      )
    }

    // Save LLM result
    await this.saveLLMResult(llmResult)

    const totalTimeMs = Date.now() - startTime
    const costCents = Math.ceil(tokensUsed * 0.00002 * 100) // Rough estimate

    return {
      llmResult,
      entityLinks,
      suggestedCategory: llmResult.llm_category,
      processingStats: {
        method: llmResult.classification_method as 'keyword' | 'llm' | 'hybrid',
        totalTimeMs,
        tokensUsed,
        costCents,
      },
    }
  },

  /**
   * Classify document using LLM
   */
  async classifyWithLLM(
    documentId: string,
    text: string,
    fileName: string,
    existingCategory?: string
  ): Promise<DocumentLLMResult> {
    const truncatedText = text.slice(0, 3000) // Limit input size

    const prompt = `Classify this construction document:

File name: ${fileName}
${existingCategory ? `Current category: ${existingCategory}` : ''}

Content excerpt:
${truncatedText}

Provide JSON response:
{
  "category": "drawing|submittal|rfi|correspondence|contract|specification|report|photo|other",
  "confidence": 0-100,
  "reasoning": "Brief explanation",
  "csiSection": "XX XX XX or null",
  "csiDivision": "XX or null",
  "documentType": "More specific type within category"
}`

    interface ClassificationResult {
      category: string
      confidence: number
      reasoning: string
      csiSection?: string
      csiDivision?: string
      documentType?: string
    }

    const { data: result, tokens } = await aiService.extractJSON<ClassificationResult>(
      'document_classification',
      prompt,
      { systemPrompt: DOCUMENT_CLASSIFICATION_PROMPT }
    )

    return {
      id: crypto.randomUUID(),
      document_id: documentId,
      classification_method: 'llm',
      llm_category: result.category,
      llm_confidence: result.confidence,
      llm_reasoning: result.reasoning,
      csi_section: result.csiSection,
      csi_confidence: result.csiSection ? 80 : undefined,
      tokens_used: tokens.total,
      model_used: 'ai',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  },

  /**
   * Extract metadata based on document type
   */
  async extractMetadata(
    text: string,
    category?: string
  ): Promise<ExtractedDocumentMetadata> {
    const truncatedText = text.slice(0, 2000)

    const categoryPrompts: Record<string, string> = {
      drawing: `Extract from this drawing:
- Sheet number (e.g., A-101, S-301)
- Sheet title
- Revision number/letter
- Scale
- Drawn by / checked by`,

      submittal: `Extract from this submittal:
- Spec section (XX XX XX format)
- Manufacturer name
- Product model/number
- Submittal date
- Action required`,

      rfi: `Extract from this RFI or response:
- RFI number
- Question summary
- Answer summary (if response)
- Cost impact mentioned
- Schedule impact mentioned`,

      contract: `Extract from this contract:
- Contract value
- Effective date
- Expiration date
- Key parties
- Important milestones
- Key terms or conditions`,
    }

    const prompt = `${categoryPrompts[category || 'other'] || 'Extract key metadata from this document.'}

Document content:
${truncatedText}

Respond with JSON containing the extracted fields (use null for missing fields).`

    try {
      const { data } = await aiService.extractJSON<ExtractedDocumentMetadata>(
        'metadata_extraction',
        prompt
      )
      return data
    } catch (error) {
      console.error('Metadata extraction failed:', error)
      return {}
    }
  },

  /**
   * Generate document summary
   */
  async generateSummary(text: string): Promise<string> {
    const truncatedText = text.slice(0, 2000)

    const result = await aiService.complete(
      'document_summary',
      `Summarize this construction document in 2-3 sentences:\n\n${truncatedText}`,
      { maxTokens: 150 }
    )

    return result.content.trim()
  },

  /**
   * Find entity links in document
   */
  async findEntityLinks(
    documentId: string,
    projectId: string,
    text: string,
    fileName: string
  ): Promise<DocumentEntityLink[]> {
    const links: DocumentEntityLink[] = []
    const combinedText = `${fileName} ${text}`.toUpperCase()

    // Extract RFI references
    const rfiMatches = [...combinedText.matchAll(ENTITY_PATTERNS.rfi)]
    for (const match of rfiMatches) {
      const rfiNumber = match[1]

      // Try to find matching RFI
      const { data: rfi } = await supabase
        .from('rfis')
        .select('id')
        .eq('project_id', projectId)
        .ilike('rfi_number', `%${rfiNumber}%`)
        .limit(1)
        .single()

      if (rfi) {
        links.push({
          id: crypto.randomUUID(),
          document_id: documentId,
          entity_type: 'rfi',
          entity_id: rfi.id,
          link_type: 'reference',
          confidence: 85,
          extracted_reference: match[0],
          is_verified: false,
          created_at: new Date().toISOString(),
        })
      }
    }

    // Extract Submittal references
    const submittalMatches = [...combinedText.matchAll(ENTITY_PATTERNS.submittal)]
    for (const match of submittalMatches) {
      const submittalNumber = match[2]

      const { data: submittal } = await (supabase as any)
        .from('dedicated_submittals')
        .select('id')
        .eq('project_id', projectId)
        .ilike('submittal_number', `%${submittalNumber}%`)
        .limit(1)
        .single()

      if (submittal) {
        links.push({
          id: crypto.randomUUID(),
          document_id: documentId,
          entity_type: 'submittal',
          entity_id: submittal.id,
          link_type: 'reference',
          confidence: 85,
          extracted_reference: match[0],
          is_verified: false,
          created_at: new Date().toISOString(),
        })
      }
    }

    // Extract Change Order references
    const coMatches = [...combinedText.matchAll(ENTITY_PATTERNS.change_order)]
    for (const match of coMatches) {
      const coNumber = match[2]

      const { data: co } = await supabase
        .from('change_orders')
        .select('id')
        .eq('project_id', projectId)
        .ilike('co_number', `%${coNumber}%`)
        .limit(1)
        .single()

      if (co) {
        links.push({
          id: crypto.randomUUID(),
          document_id: documentId,
          entity_type: 'change_order',
          entity_id: co.id,
          link_type: 'reference',
          confidence: 80,
          extracted_reference: match[0],
          is_verified: false,
          created_at: new Date().toISOString(),
        })
      }
    }

    // Save links
    if (links.length > 0) {
      await (supabase as any).from('document_entity_links').insert(links)
    }

    return links
  },

  /**
   * Verify an entity link
   */
  async verifyLink(
    linkId: string,
    userId: string,
    isCorrect: boolean
  ): Promise<void> {
    if (isCorrect) {
      const { error } = await (supabase as any)
        .from('document_entity_links')
        .update({
          is_verified: true,
          verified_by: userId,
          verified_at: new Date().toISOString(),
        })
        .eq('id', linkId)

      if (error) {throw error}
    } else {
      // Remove incorrect link
      const { error } = await (supabase as any)
        .from('document_entity_links')
        .delete()
        .eq('id', linkId)

      if (error) {throw error}
    }
  },

  /**
   * Get entity links for a document
   */
  async getEntityLinks(documentId: string): Promise<DocumentEntityLink[]> {
    const { data, error } = await (supabase as any)
      .from('document_entity_links')
      .select('*')
      .eq('document_id', documentId)
      .order('confidence', { ascending: false })

    if (error) {throw error}
    return data || []
  },

  /**
   * Get LLM result for a document
   */
  async getLLMResult(documentId: string): Promise<DocumentLLMResult | null> {
    const { data, error } = await (supabase as any)
      .from('document_llm_results')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {throw error}
    return data
  },

  /**
   * Save LLM result
   */
  async saveLLMResult(result: DocumentLLMResult): Promise<void> {
    const { error } = await (supabase as any)
      .from('document_llm_results')
      .upsert(result, { onConflict: 'document_id' })

    if (error) {
      console.error('Failed to save LLM result:', error)
    }
  },

  /**
   * Batch process documents for a project
   */
  async batchEnhanceDocuments(
    projectId: string,
    options?: {
      limit?: number
      category?: string
      lowConfidenceOnly?: boolean
    }
  ): Promise<{ processed: number; enhanced: number; errors: number }> {
    let query = (supabase as any)
      .from('documents')
      .select('id, processing_result')
      .eq('project_id', projectId)

    if (options?.category) {
      query = query.eq('processing_result->>category', options.category)
    }

    const { data: documents } = await query.limit(options?.limit || 50)

    if (!documents?.length) {
      return { processed: 0, enhanced: 0, errors: 0 }
    }

    let processed = 0
    let enhanced = 0
    let errors = 0

    for (const doc of documents) {
      const confidence = doc.processing_result?.confidence || 0

      if (options?.lowConfidenceOnly && confidence >= 75) {
        continue
      }

      try {
        await this.enhanceDocument({
          document_id: doc.id,
          force_llm: confidence < 75,
          extract_metadata: true,
          find_entity_links: true,
        })
        processed++
        enhanced++
      } catch (error) {
        console.error(`Failed to enhance document ${doc.id}:`, error)
        errors++
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    return { processed, enhanced, errors }
  },
}
