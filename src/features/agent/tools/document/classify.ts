/**
 * Classify Document Tool
 * Automatically classifies a document by type and category
 */

import { supabase } from '@/lib/supabase'
import { aiService } from '@/lib/api/services/ai-provider'
import { createTool } from '../registry'
import type { ToolContext, ToolResult, JSONSchema } from '../../types/tools'
import { logger } from '@/lib/utils/logger'

// ============================================================================
// Types
// ============================================================================

interface ClassifyDocumentInput {
  document_id: string
}

interface ClassifyDocumentOutput {
  document_id: string
  category: string
  subcategory: string | null
  confidence: number
  csi_section: string | null
  csi_description: string | null
  reasoning: string
  keywords: string[]
}

// ============================================================================
// Tool Definition
// ============================================================================

const parameters: JSONSchema = {
  type: 'object',
  properties: {
    document_id: {
      type: 'string',
      description: 'UUID of the document to classify',
    },
  },
  required: ['document_id'],
}

async function execute(
  input: ClassifyDocumentInput,
  context: ToolContext
): Promise<ToolResult<ClassifyDocumentOutput>> {
  const startTime = Date.now()

  try {
    // Fetch document details
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('id, name, file_name, file_type, description, category, ocr_text')
      .eq('id', input.document_id)
      .single()

    if (fetchError || !document) {
      return {
        success: false,
        error: `Document not found: ${input.document_id}`,
        errorCode: 'DOCUMENT_NOT_FOUND',
      }
    }

    // Build classification prompt
    const prompt = buildClassificationPrompt(document)

    // Call AI service
    const result = await aiService.extractJSON<ClassificationResult>(
      'document_classification',
      prompt,
      {
        systemPrompt: CLASSIFICATION_SYSTEM_PROMPT,
        temperature: 0.3,
        maxTokens: 1024,
      }
    )

    const classification = result.data

    // Update document with classification
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        category: classification.category,
        agent_classification: {
          category: classification.category,
          subcategory: classification.subcategory,
          confidence: classification.confidence,
          csi_section: classification.csi_section,
          csi_description: classification.csi_description,
          keywords: classification.keywords,
          reasoning: classification.reasoning,
          classified_at: new Date().toISOString(),
        },
        agent_processed_at: new Date().toISOString(),
      })
      .eq('id', input.document_id)

    if (updateError) {
      logger.error('[ClassifyDocument] Error updating document:', updateError)
    }

    // Log action
    await logAction(context, input, classification)

    return {
      success: true,
      data: {
        document_id: input.document_id,
        category: classification.category,
        subcategory: classification.subcategory,
        confidence: classification.confidence,
        csi_section: classification.csi_section,
        csi_description: classification.csi_description,
        reasoning: classification.reasoning,
        keywords: classification.keywords,
      },
      metadata: {
        executionTimeMs: Date.now() - startTime,
        tokensUsed: result.tokens.total,
      },
    }
  } catch (error) {
    logger.error('[ClassifyDocument] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'CLASSIFICATION_ERROR',
      metadata: {
        executionTimeMs: Date.now() - startTime,
      },
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

interface ClassificationResult {
  category: string
  subcategory: string | null
  confidence: number
  csi_section: string | null
  csi_description: string | null
  reasoning: string
  keywords: string[]
}

const CLASSIFICATION_SYSTEM_PROMPT = `You are an expert construction document classifier. Your job is to analyze construction documents and classify them accurately.

You must respond with valid JSON matching this schema:
{
  "category": "string - main category from the allowed list",
  "subcategory": "string or null - more specific classification",
  "confidence": "number 0-100 - how confident you are",
  "csi_section": "string or null - CSI MasterFormat section code (e.g., '03 30 00')",
  "csi_description": "string or null - CSI section description",
  "reasoning": "string - brief explanation of why you chose this classification",
  "keywords": ["array of relevant keywords found in the document"]
}

Document Categories:
- drawing: Architectural, structural, MEP, or civil drawings
- specification: Technical specifications and requirements
- submittal: Shop drawings, product data, samples
- rfi: Request for Information
- change_order: Change orders, PCOs, modifications
- contract: Contracts, agreements, purchase orders
- correspondence: Letters, emails, memos
- report: Daily reports, inspection reports, test reports
- schedule: Project schedules, Gantt charts
- photo: Site photos, progress photos
- permit: Building permits, inspections
- safety: Safety plans, JSAs, toolbox talks
- closeout: O&M manuals, warranties, as-builts
- other: Documents that don't fit other categories`

function buildClassificationPrompt(document: {
  name: string
  file_name: string
  file_type: string
  description: string | null
  ocr_text: string | null
}): string {
  let prompt = `Classify this construction document:

Document Name: ${document.name}
File Name: ${document.file_name}
File Type: ${document.file_type}
${document.description ? `Description: ${document.description}` : ''}`

  if (document.ocr_text) {
    // Limit OCR text to prevent token overflow
    const textSample = document.ocr_text.slice(0, 3000)
    prompt += `\n\nDocument Text (excerpt):\n${textSample}`
  }

  prompt += `\n\nAnalyze this document and provide a classification.`

  return prompt
}

async function logAction(
  context: ToolContext,
  input: ClassifyDocumentInput,
  output: ClassificationResult
): Promise<void> {
  try {
    await supabase.from('agent_actions').insert({
      company_id: context.companyId,
      session_id: context.sessionId,
      message_id: context.messageId,
      action_type: 'tool_call',
      tool_name: 'classify_document',
      target_entity_type: 'document',
      target_entity_id: input.document_id,
      input_summary: `Classify document ${input.document_id}`,
      output_summary: `Classified as ${output.category} (${output.confidence}% confidence)`,
      status: 'executed',
      executed_at: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('[ClassifyDocument] Error logging action:', error)
  }
}

// ============================================================================
// Register Tool
// ============================================================================

export const classifyDocumentTool = createTool({
  name: 'classify_document',
  displayName: 'Classify Document',
  description:
    'Automatically classify a construction document by type (drawing, spec, submittal, RFI, etc.) and identify relevant CSI sections',
  category: 'document',
  parameters,
  requiresConfirmation: false,
  estimatedTokens: 500,
  execute,
  formatOutput: (output: ClassifyDocumentOutput) => ({
    title: 'Document Classified',
    summary: `Classified as ${output.category}${output.subcategory ? ` (${output.subcategory})` : ''} with ${output.confidence}% confidence`,
    icon: 'FileType',
    status: output.confidence >= 80 ? 'success' : output.confidence >= 50 ? 'warning' : 'info',
    details: [
      { label: 'Category', value: output.category, type: 'badge' },
      ...(output.subcategory
        ? [{ label: 'Subcategory', value: output.subcategory, type: 'text' as const }]
        : []),
      { label: 'Confidence', value: `${output.confidence}%`, type: 'text' },
      ...(output.csi_section
        ? [{ label: 'CSI Section', value: `${output.csi_section} - ${output.csi_description}`, type: 'text' as const }]
        : []),
    ],
    expandedContent: output.reasoning,
  }),
})
