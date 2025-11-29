// Supabase Edge Function: process-queue
// Scheduled function that processes pending documents in the queue
// Should be triggered via pg_cron or Supabase scheduled functions

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Configuration
const MAX_CONCURRENT = 3 // Maximum concurrent processing jobs
const MAX_RETRIES = 3 // Maximum retry attempts per document
const BATCH_SIZE = 10 // Number of documents to process per invocation

interface QueueItem {
  id: string
  document_id: string
  project_id: string
  priority: number
  retry_count: number
  process_ocr: boolean
  process_categorization: boolean
  process_metadata_extraction: boolean
  process_similarity: boolean
}

interface ProcessResult {
  processed: number
  failed: number
  skipped: number
  details: {
    document_id: string
    status: 'success' | 'failed' | 'skipped'
    error?: string
  }[]
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

    // Create Supabase client with service role (bypass RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting queue processing...')

    // Get count of currently processing items
    const { count: processingCount } = await supabase
      .from('document_processing_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'processing')

    const availableSlots = MAX_CONCURRENT - (processingCount || 0)

    if (availableSlots <= 0) {
      console.log('All processing slots are occupied. Skipping this run.')
      return new Response(
        JSON.stringify({
          message: 'Queue processor busy',
          processing_count: processingCount,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Get pending items from queue
    const { data: queueItems, error: queueError } = await supabase
      .from('document_processing_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('retry_count', MAX_RETRIES)
      .order('priority', { ascending: true })
      .order('scheduled_at', { ascending: true })
      .limit(Math.min(availableSlots, BATCH_SIZE))

    if (queueError) {
      throw new Error(`Failed to fetch queue: ${queueError.message}`)
    }

    if (!queueItems || queueItems.length === 0) {
      console.log('No pending items in queue.')
      return new Response(
        JSON.stringify({
          message: 'No pending items',
          processed: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    console.log(`Found ${queueItems.length} pending items to process.`)

    const result: ProcessResult = {
      processed: 0,
      failed: 0,
      skipped: 0,
      details: [],
    }

    // Process items concurrently
    const processingPromises = queueItems.map(async (item: QueueItem) => {
      try {
        // Check if document still exists
        const { data: document } = await supabase
          .from('documents')
          .select('id, file_url')
          .eq('id', item.document_id)
          .is('deleted_at', null)
          .single()

        if (!document) {
          // Document was deleted, remove from queue
          await supabase
            .from('document_processing_queue')
            .delete()
            .eq('id', item.id)

          return {
            document_id: item.document_id,
            status: 'skipped' as const,
            error: 'Document no longer exists',
          }
        }

        if (!document.file_url) {
          // No file URL, skip
          await supabase
            .from('document_processing_queue')
            .update({ status: 'failed', last_error: 'No file URL' })
            .eq('id', item.id)

          return {
            document_id: item.document_id,
            status: 'skipped' as const,
            error: 'No file URL',
          }
        }

        // Call the process-document function
        const processResponse = await fetch(
          `${supabaseUrl}/functions/v1/process-document`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              document_id: item.document_id,
              process_ocr: item.process_ocr,
              process_categorization: item.process_categorization,
              process_metadata: item.process_metadata_extraction,
              process_similarity: item.process_similarity,
            }),
          }
        )

        if (!processResponse.ok) {
          const errorText = await processResponse.text()
          throw new Error(`Process function failed: ${errorText}`)
        }

        const processResult = await processResponse.json()

        if (processResult.success) {
          return {
            document_id: item.document_id,
            status: 'success' as const,
          }
        } else {
          return {
            document_id: item.document_id,
            status: 'failed' as const,
            error: processResult.error,
          }
        }
      } catch (error) {
        console.error(`Error processing ${item.document_id}:`, error)

        // Update retry count
        await supabase
          .from('document_processing_queue')
          .update({
            status: 'pending',
            retry_count: item.retry_count + 1,
            last_error: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', item.id)

        return {
          document_id: item.document_id,
          status: 'failed' as const,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    })

    // Wait for all processing to complete
    const results = await Promise.all(processingPromises)

    // Aggregate results
    for (const r of results) {
      result.details.push(r)
      if (r.status === 'success') {
        result.processed++
      } else if (r.status === 'failed') {
        result.failed++
      } else {
        result.skipped++
      }
    }

    console.log(`Queue processing completed. Processed: ${result.processed}, Failed: ${result.failed}, Skipped: ${result.skipped}`)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Queue processor error:', error)

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
