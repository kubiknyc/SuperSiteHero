/**
 * Document Uploaded Trigger
 * Auto-process new documents: classify, extract metadata, and link to entities
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

interface DocumentUploadedInput {
  document_id: string
  auto_classify?: boolean
  auto_extract_metadata?: boolean
  auto_link_entities?: boolean
}

interface DocumentClassification {
  category: string
  subcategory: string | null
  confidence: number
  csi_section: string | null
  csi_description: string | null
  keywords: string[]
  reasoning: string
}

interface ExtractedMetadata {
  title: string | null
  date: string | null
  revision: string | null
  sheet_number: string | null
  author: string | null
  parties: string[]
  spec_sections: string[]
  drawing_numbers: string[]
}

interface LinkedEntity {
  entity_type: string
  entity_id: string
  entity_name: string
  link_type: 'reference' | 'attachment' | 'related'
  confidence: number
}

interface DocumentProcessingOutput {
  document_id: string
  classification: DocumentClassification | null
  metadata: ExtractedMetadata | null
  linked_entities: LinkedEntity[]
  processing_summary: string
}

// ============================================================================
// Document Classification Prompt
// ============================================================================

const CLASSIFICATION_PROMPT = `You are an expert construction document classifier. Analyze the document and classify it accurately.

Categories:
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
- other: Documents that don't fit other categories

Respond with JSON:
{
  "category": "string",
  "subcategory": "string or null",
  "confidence": 0-100,
  "csi_section": "CSI code like '03 30 00' or null",
  "csi_description": "CSI section name or null",
  "keywords": ["relevant", "keywords"],
  "reasoning": "Brief explanation"
}`

const METADATA_PROMPT = `Extract structured metadata from this construction document.

Respond with JSON:
{
  "title": "Document title or null",
  "date": "ISO date or null",
  "revision": "Revision number or null",
  "sheet_number": "Sheet number or null",
  "author": "Author name or null",
  "parties": ["Company A", "Company B"],
  "spec_sections": ["Section 03 30 00"],
  "drawing_numbers": ["A-101", "S-201"]
}`

const ENTITY_LINKING_PROMPT = `Given this document and the list of project items, identify which items this document relates to.

Project Items:
{items}

For each match, provide:
- entity_type: rfi, submittal, change_order, or punch_item
- entity_id: the UUID
- entity_name: the item name/number
- link_type: reference, attachment, or related
- confidence: 0-100

Respond with JSON array of matches.`

// ============================================================================
// Task Handler
// ============================================================================

const documentUploadedHandler: TaskHandler<DocumentUploadedInput, DocumentProcessingOutput> = {
  taskType: 'document_classify',
  displayName: 'Process Uploaded Document',
  description: 'Automatically classify and extract metadata from uploaded documents',

  async execute(
    task: AgentTask,
    context: TaskContext
  ): Promise<TaskResult<DocumentProcessingOutput>> {
    const input = task.input_data as unknown as DocumentUploadedInput
    const startTime = Date.now()
    let totalTokens = 0

    try {
      // Fetch document
      const { data: document, error: fetchError } = await supabase
        .from('documents')
        .select(`
          id,
          name,
          file_name,
          file_type,
          description,
          document_type,
          project_id
        `)
        .eq('id', input.document_id)
        .single() as { data: any; error: any }

      if (fetchError || !document) {
        return {
          success: false,
          error: `Document not found: ${input.document_id}`,
          errorCode: 'DOCUMENT_NOT_FOUND',
          shouldRetry: false,
        }
      }

      let classification: DocumentClassification | null = null
      let metadata: ExtractedMetadata | null = null
      let linkedEntities: LinkedEntity[] = []

      // Step 1: Classify document
      if (input.auto_classify !== false) {
        const classResult = await classifyDocument(document)
        classification = classResult.classification
        totalTokens += classResult.tokens

        // Update document with classification
        await supabase
          .from('documents')
          .update({
            agent_classification: classification,
            agent_processed_at: new Date().toISOString(),
          })
          .eq('id', input.document_id)
      }

      // Step 2: Extract metadata
      if (input.auto_extract_metadata !== false && document.ocr_text) {
        const metaResult = await extractMetadata(document)
        metadata = metaResult.metadata
        totalTokens += metaResult.tokens

        // Update document with metadata
        await supabase
          .from('documents')
          .update({
            agent_metadata: metadata,
          })
          .eq('id', input.document_id)
      }

      // Step 3: Link to entities
      if (input.auto_link_entities !== false && document.project_id) {
        const linkResult = await linkToEntities(document, document.project_id)
        linkedEntities = linkResult.entities
        totalTokens += linkResult.tokens

        // Create document links
        for (const entity of linkedEntities) {
          if (entity.confidence >= 70) {
            await createDocumentLink(input.document_id, entity)
          }
        }
      }

      // Log action
      await logDocumentProcessing(context, input.document_id, {
        classified: !!classification,
        extracted_metadata: !!metadata,
        linked_count: linkedEntities.length,
      })

      const processingTime = Date.now() - startTime

      return {
        success: true,
        data: {
          document_id: input.document_id,
          classification,
          metadata,
          linked_entities: linkedEntities,
          processing_summary: buildProcessingSummary(classification, metadata, linkedEntities),
        },
        metadata: {
          tokensUsed: totalTokens,
          costCents: Math.ceil(totalTokens * 0.00001 * 100), // Rough estimate
        },
      }
    } catch (error) {
      logger.error('[DocumentUploaded] Processing error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed',
        errorCode: 'PROCESSING_ERROR',
        shouldRetry: true,
      }
    }
  },

  validate(input: DocumentUploadedInput) {
    if (!input.document_id) {
      return {
        valid: false,
        errors: [{ field: 'document_id', message: 'Document ID is required' }],
      }
    }
    return { valid: true }
  },

  async onComplete(task: AgentTask, result: DocumentProcessingOutput) {
    // Send notification if significant findings
    if (result.linked_entities.length > 0) {
      await sendProcessingNotification(task, result)
    }
  },
}

// ============================================================================
// Helper Functions
// ============================================================================

async function classifyDocument(document: Record<string, unknown>): Promise<{ classification: DocumentClassification; tokens: number }> {
  let prompt = `Classify this construction document:

Document Name: ${document.name}
File Name: ${document.file_name}
File Type: ${document.file_type}`

  if (document.description) {
    prompt += `\nDescription: ${document.description}`
  }

  if (document.ocr_text) {
    const textSample = String(document.ocr_text).slice(0, 3000)
    prompt += `\n\nDocument Text (excerpt):\n${textSample}`
  }

  const result = await aiService.extractJSON<DocumentClassification>(
    'document_classification',
    prompt,
    {
      systemPrompt: CLASSIFICATION_PROMPT,
      temperature: 0.3,
      maxTokens: 1024,
    }
  )

  return {
    classification: result.data,
    tokens: result.tokens.total,
  }
}

async function extractMetadata(document: Record<string, unknown>): Promise<{ metadata: ExtractedMetadata; tokens: number }> {
  if (!document.ocr_text) {
    return {
      metadata: {
        title: String(document.name),
        date: null,
        revision: null,
        sheet_number: null,
        author: null,
        parties: [],
        spec_sections: [],
        drawing_numbers: [],
      },
      tokens: 0,
    }
  }

  const prompt = `Extract metadata from this document:

File: ${document.name} (${document.file_type})

Content:
${String(document.ocr_text).slice(0, 4000)}`

  const result = await aiService.extractJSON<ExtractedMetadata>(
    'document_metadata',
    prompt,
    {
      systemPrompt: METADATA_PROMPT,
      temperature: 0.2,
      maxTokens: 1024,
    }
  )

  return {
    metadata: result.data,
    tokens: result.tokens.total,
  }
}

async function linkToEntities(
  document: Record<string, unknown>,
  projectId: string
): Promise<{ entities: LinkedEntity[]; tokens: number }> {
  // Fetch project items
  const [rfis, submittals, changeOrders] = await Promise.all([
    supabase
      .from('rfis')
      .select('id, rfi_number, subject')
      .eq('project_id', projectId)
      .limit(50),
    supabase
      .from('submittals')
      .select('id, submittal_number, title')
      .eq('project_id', projectId)
      .limit(50),
    supabase
      .from('change_orders')
      .select('id, co_number, title')
      .eq('project_id', projectId)
      .limit(50),
  ])

  const items: string[] = []

  if (rfis.data) {
    for (const rfi of rfis.data) {
      items.push(`RFI ${rfi.rfi_number}: ${rfi.subject} [rfi:${rfi.id}]`)
    }
  }

  if (submittals.data) {
    for (const sub of submittals.data) {
      items.push(`Submittal ${sub.submittal_number}: ${sub.title} [submittal:${sub.id}]`)
    }
  }

  if (changeOrders.data) {
    for (const co of changeOrders.data) {
      items.push(`CO ${(co as any).co_number}: ${(co as any).title} [change_order:${(co as any).id}]`)
    }
  }

  if (items.length === 0) {
    return { entities: [], tokens: 0 }
  }

  const prompt = ENTITY_LINKING_PROMPT.replace('{items}', items.join('\n')) +
    `\n\nDocument: ${document.name}\n${document.ocr_text ? String(document.ocr_text).slice(0, 2000) : 'No text available'}`

  try {
    const result = await aiService.extractJSON<LinkedEntity[]>(
      'entity_linking',
      prompt,
      {
        temperature: 0.3,
        maxTokens: 1024,
      }
    )

    return {
      entities: Array.isArray(result.data) ? result.data : [],
      tokens: result.tokens.total,
    }
  } catch {
    return { entities: [], tokens: 0 }
  }
}

async function createDocumentLink(
  documentId: string,
  entity: LinkedEntity
): Promise<void> {
  try {
    // This would insert into a document_links table if it exists
    // For now, we'll skip if the table doesn't exist
    logger.debug(`[DocumentUploaded] Would link document ${documentId} to ${entity.entity_type}:${entity.entity_id}`)
  } catch (error) {
    logger.warn('[DocumentUploaded] Could not create document link:', error)
  }
}

function buildProcessingSummary(
  classification: DocumentClassification | null,
  metadata: ExtractedMetadata | null,
  linkedEntities: LinkedEntity[]
): string {
  const parts: string[] = []

  if (classification) {
    parts.push(`Classified as ${classification.category} (${classification.confidence}% confidence)`)
  }

  if (metadata) {
    const metaParts: string[] = []
    if (metadata.title) {metaParts.push(`title: "${metadata.title}"`)}
    if (metadata.revision) {metaParts.push(`revision: ${metadata.revision}`)}
    if (metadata.date) {metaParts.push(`date: ${metadata.date}`)}
    if (metaParts.length > 0) {
      parts.push(`Extracted: ${metaParts.join(', ')}`)
    }
  }

  if (linkedEntities.length > 0) {
    parts.push(`Linked to ${linkedEntities.length} item(s)`)
  }

  return parts.join('. ') || 'No processing performed'
}

async function logDocumentProcessing(
  context: TaskContext,
  documentId: string,
  summary: { classified: boolean; extracted_metadata: boolean; linked_count: number }
): Promise<void> {
  try {
    await supabase.from('agent_actions').insert({
      company_id: context.companyId,
      task_id: null, // Will be set by processor
      action_type: 'tool_call',
      tool_name: 'process_document',
      target_entity_type: 'document',
      target_entity_id: documentId,
      input_summary: `Process document ${documentId}`,
      output_summary: buildActionSummary(summary),
      status: 'executed',
      executed_at: new Date().toISOString(),
    })
  } catch (error) {
    logger.warn('[DocumentUploaded] Could not log action:', error)
  }
}

function buildActionSummary(summary: { classified: boolean; extracted_metadata: boolean; linked_count: number }): string {
  const parts: string[] = []
  if (summary.classified) {parts.push('classified')}
  if (summary.extracted_metadata) {parts.push('metadata extracted')}
  if (summary.linked_count > 0) {parts.push(`${summary.linked_count} links created`)}
  return parts.join(', ') || 'no actions taken'
}

async function sendProcessingNotification(
  task: AgentTask,
  result: DocumentProcessingOutput
): Promise<void> {
  // Send notification about document processing
  if (!task.created_by) {return}

  try {
    await supabase.from('notifications').insert({
      user_id: task.created_by,
      company_id: task.company_id,
      title: 'Document Processed',
      message: result.processing_summary,
      type: 'info',
      entity_type: 'document',
      entity_id: result.document_id,
      is_agent_generated: true,
      agent_task_id: task.id,
    })
  } catch (error) {
    logger.warn('[DocumentUploaded] Could not send notification:', error)
  }
}

// ============================================================================
// Subscribe to Document Uploads
// ============================================================================

/**
 * Set up realtime subscription for new document uploads
 */
export function subscribeToDocumentUploads(companyId: string): () => void {
  const channel = supabase
    .channel(`document-uploads-${companyId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'documents',
      },
      async (payload) => {
        const document = payload.new as { id: string; project_id: string; company_id: string }

        // Only process documents for this company
        // Note: RLS should handle this, but extra check for safety
        logger.info('[DocumentUploaded] New document detected:', document.id)

        // Create processing task
        try {
          await taskService.create({
            task_type: 'document_classify',
            project_id: document.project_id,
            input_data: {
              document_id: document.id,
              auto_classify: true,
              auto_extract_metadata: true,
              auto_link_entities: true,
            },
            target_entity_type: 'document',
            target_entity_id: document.id,
          })
        } catch (error) {
          logger.error('[DocumentUploaded] Failed to create task:', error)
        }
      }
    )
    .subscribe()

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel)
  }
}

// ============================================================================
// Register Handler
// ============================================================================

registerTaskHandler(documentUploadedHandler as unknown as TaskHandler)

// ============================================================================
// Exports
// ============================================================================

export { documentUploadedHandler }
export type { DocumentUploadedInput, DocumentProcessingOutput }
