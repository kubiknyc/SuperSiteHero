// Supabase Edge Function: process-document
// Main AI processing function for documents
// Performs OCR, categorization, metadata extraction, and similarity detection

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

import {
  performOcr,
  performOcrOnPdf,
  fetchFileAsBase64,
  type CloudVisionOcrResult,
} from '../_shared/cloud-vision.ts'

import { categorizeDocument, type CategoryResult } from '../_shared/categorization.ts'

import {
  extractMetadata,
  type ExtractedMetadata,
} from '../_shared/metadata-extraction.ts'

import {
  calculateDocumentSimilarity,
  type DocumentText,
} from '../_shared/similarity.ts'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessRequest {
  document_id: string
  process_ocr?: boolean
  process_categorization?: boolean
  process_metadata?: boolean
  process_similarity?: boolean
}

interface ProcessResult {
  success: boolean
  document_id: string
  ocr?: {
    status: string
    word_count: number
    confidence: number
  }
  category?: CategoryResult
  metadata?: ExtractedMetadata
  similarity?: {
    similar_count: number
  }
  error?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const cloudVisionApiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY')

    if (!cloudVisionApiKey) {
      throw new Error('GOOGLE_CLOUD_VISION_API_KEY is not configured')
    }

    // Create Supabase client with service role (bypass RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request
    const request: ProcessRequest = await req.json()
    const {
      document_id,
      process_ocr = true,
      process_categorization = true,
      process_metadata = true,
      process_similarity = true,
    } = request

    if (!document_id) {
      throw new Error('document_id is required')
    }

    console.log(`Processing document: ${document_id}`)

    // Get document details
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, name, project_id, file_url, file_type, drawing_number, revision')
      .eq('id', document_id)
      .single()

    if (docError || !document) {
      throw new Error(`Document not found: ${docError?.message}`)
    }

    // Update queue status to processing
    await supabase
      .from('document_processing_queue')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .eq('document_id', document_id)

    const result: ProcessResult = {
      success: true,
      document_id,
    }

    let extractedText = ''
    const startTime = Date.now()

    // Step 1: OCR Processing
    if (process_ocr && document.file_url) {
      try {
        console.log('Starting OCR processing...')

        let ocrResult: CloudVisionOcrResult

        // Handle different file types
        if (document.file_type === 'application/pdf') {
          // Fetch PDF as base64 and process
          const base64Content = await fetchFileAsBase64(document.file_url)
          ocrResult = await performOcrOnPdf(base64Content, cloudVisionApiKey)
        } else {
          // Process image directly
          ocrResult = await performOcr(document.file_url, cloudVisionApiKey)
        }

        extractedText = ocrResult.text

        // Save OCR result
        const ocrRecord = {
          document_id,
          project_id: document.project_id,
          status: 'completed',
          extracted_text: ocrResult.text,
          confidence_score: ocrResult.confidence,
          word_count: ocrResult.words.length,
          page_count: ocrResult.pageCount,
          processor_type: 'cloud_vision',
          processing_started_at: new Date(startTime).toISOString(),
          processing_completed_at: new Date().toISOString(),
          processing_duration_ms: Date.now() - startTime,
          detected_language: ocrResult.language,
          raw_response: null, // Don't store full response to save space
          words_data: ocrResult.words.slice(0, 100), // Store first 100 words
          blocks_data: ocrResult.blocks,
        }

        await supabase
          .from('document_ocr_results')
          .upsert(ocrRecord, { onConflict: 'document_id' })

        // Update queue
        await supabase
          .from('document_processing_queue')
          .update({ ocr_completed: true })
          .eq('document_id', document_id)

        result.ocr = {
          status: 'completed',
          word_count: ocrResult.words.length,
          confidence: ocrResult.confidence,
        }

        console.log(`OCR completed: ${ocrResult.words.length} words extracted`)
      } catch (ocrError) {
        console.error('OCR error:', ocrError)

        // Save error status
        await supabase
          .from('document_ocr_results')
          .upsert({
            document_id,
            project_id: document.project_id,
            status: 'failed',
            error_message: ocrError instanceof Error ? ocrError.message : 'Unknown OCR error',
            processing_completed_at: new Date().toISOString(),
          }, { onConflict: 'document_id' })

        result.ocr = { status: 'failed', word_count: 0, confidence: 0 }
      }
    }

    // Step 2: Categorization
    if (process_categorization && extractedText) {
      try {
        console.log('Starting categorization...')

        const categoryResult = categorizeDocument(extractedText, document.name)

        // Save category
        await supabase
          .from('document_categories')
          .upsert({
            document_id,
            project_id: document.project_id,
            primary_category: categoryResult.primary_category,
            sub_category: categoryResult.sub_category,
            confidence_score: categoryResult.confidence,
            suggested_categories: categoryResult.suggested_categories,
            detected_keywords: categoryResult.detected_keywords,
            is_manually_set: false,
          }, { onConflict: 'document_id' })

        // Update queue
        await supabase
          .from('document_processing_queue')
          .update({ categorization_completed: true })
          .eq('document_id', document_id)

        result.category = categoryResult

        console.log(`Categorization completed: ${categoryResult.primary_category} (${categoryResult.confidence}%)`)
      } catch (catError) {
        console.error('Categorization error:', catError)
      }
    }

    // Step 3: Metadata Extraction
    if (process_metadata && extractedText) {
      try {
        console.log('Starting metadata extraction...')

        const metadataResult = extractMetadata(extractedText, document.name)

        // Save metadata
        await supabase
          .from('document_extracted_metadata')
          .upsert({
            document_id,
            project_id: document.project_id,
            extracted_dates: metadataResult.extracted_dates,
            extracted_numbers: metadataResult.extracted_numbers,
            extracted_entities: metadataResult.extracted_entities,
            extracted_contacts: metadataResult.extracted_contacts,
            auto_tags: metadataResult.auto_tags,
          }, { onConflict: 'document_id' })

        // Update queue
        await supabase
          .from('document_processing_queue')
          .update({ metadata_completed: true })
          .eq('document_id', document_id)

        result.metadata = metadataResult

        console.log(`Metadata extraction completed: ${Object.keys(metadataResult.extracted_numbers).length} numbers, ${metadataResult.extracted_dates.length} dates`)
      } catch (metaError) {
        console.error('Metadata extraction error:', metaError)
      }
    }

    // Step 4: Similarity Detection
    if (process_similarity && extractedText) {
      try {
        console.log('Starting similarity detection...')

        // Get other documents in the project with OCR text
        const { data: projectDocs } = await supabase
          .from('document_ocr_results')
          .select('document_id, extracted_text, documents!inner(name, drawing_number, revision)')
          .eq('project_id', document.project_id)
          .eq('status', 'completed')
          .neq('document_id', document_id)
          .limit(100) // Limit for performance

        if (projectDocs && projectDocs.length > 0) {
          const sourceDoc: DocumentText = {
            document_id,
            text: extractedText,
            name: document.name,
            drawing_number: document.drawing_number,
            revision: document.revision,
          }

          const targetDocs: DocumentText[] = projectDocs.map((doc: any) => ({
            document_id: doc.document_id,
            text: doc.extracted_text || '',
            name: doc.documents?.name || '',
            drawing_number: doc.documents?.drawing_number,
            revision: doc.documents?.revision,
          }))

          const similarities = calculateDocumentSimilarity(sourceDoc, targetDocs)

          // Save similarities (batch insert)
          if (similarities.length > 0) {
            const similarityRecords = similarities.map((sim) => ({
              document_id: sim.document_id,
              similar_document_id: sim.similar_document_id,
              project_id: document.project_id,
              text_similarity_score: sim.text_similarity_score,
              overall_similarity_score: sim.overall_similarity_score,
              similarity_type: sim.similarity_type,
              matching_keywords: sim.matching_keywords,
            }))

            // Delete existing similarities for this document first
            await supabase
              .from('document_similarity')
              .delete()
              .eq('document_id', document_id)

            // Insert new similarities
            await supabase
              .from('document_similarity')
              .insert(similarityRecords)
          }

          result.similarity = { similar_count: similarities.length }

          console.log(`Similarity detection completed: ${similarities.length} similar documents found`)
        } else {
          result.similarity = { similar_count: 0 }
        }

        // Update queue
        await supabase
          .from('document_processing_queue')
          .update({ similarity_completed: true })
          .eq('document_id', document_id)
      } catch (simError) {
        console.error('Similarity detection error:', simError)
      }
    }

    // Update queue to completed
    await supabase
      .from('document_processing_queue')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('document_id', document_id)

    // Update document AI processed flag
    await supabase
      .from('documents')
      .update({
        ai_processed: true,
        ai_processed_at: new Date().toISOString(),
      })
      .eq('id', document_id)

    console.log(`Document processing completed: ${document_id}`)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Processing error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Try to update queue with error
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      const request: ProcessRequest = await req.clone().json()
      if (request.document_id) {
        await supabase
          .from('document_processing_queue')
          .update({
            status: 'failed',
            last_error: errorMessage,
            retry_count: supabase.rpc('increment_retry_count', { doc_id: request.document_id }),
          })
          .eq('document_id', request.document_id)
      }
    } catch {
      // Ignore error logging errors
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
