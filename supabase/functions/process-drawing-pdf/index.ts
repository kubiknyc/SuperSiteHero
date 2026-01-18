// Supabase Edge Function: process-drawing-pdf
// Splits multipage PDF drawing sets into individual sheets
// Creates drawing_sheet records and queues AI extraction for each page

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessPdfRequest {
  document_id: string
  project_id: string
  company_id: string
}

interface ProcessPdfResult {
  success: boolean
  document_id?: string
  message?: string
  sheets_created?: number
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

    // Validate authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create Supabase client with service role (bypass RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request
    const request: ProcessPdfRequest = await req.json()
    const { document_id, project_id, company_id } = request

    if (!document_id) {
      throw new Error('document_id is required')
    }
    if (!project_id) {
      throw new Error('project_id is required')
    }
    if (!company_id) {
      throw new Error('company_id is required')
    }

    console.log(`Processing drawing PDF: ${document_id}`)

    // 1. Get the document record
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, name, file_url, file_type, project_id')
      .eq('id', document_id)
      .single()

    if (docError || !document) {
      throw new Error(`Document not found: ${docError?.message || 'Unknown error'}`)
    }

    // Validate file type
    if (document.file_type !== 'application/pdf') {
      throw new Error(`Invalid file type: ${document.file_type}. Expected application/pdf`)
    }

    // 2. Download the PDF from storage
    // Extract the storage path from the file_url
    const storagePath = document.file_url.replace(/^.*\/documents\//, '')

    console.log(`Downloading PDF from storage: ${storagePath}`)

    const { data: pdfData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(storagePath)

    if (downloadError || !pdfData) {
      throw new Error(`Failed to download PDF: ${downloadError?.message || 'Unknown error'}`)
    }

    // 3. Load the PDF and get page count
    console.log('Loading PDF document...')
    const pdfBytes = await pdfData.arrayBuffer()
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const pageCount = pdfDoc.getPageCount()

    console.log(`PDF has ${pageCount} pages`)

    // 4. Create drawing_sheet records for each page
    const sheets: Array<{
      project_id: string
      company_id: string
      source_pdf_id: string
      document_id: string
      page_number: number
      processing_status: string
      ai_extracted_metadata: Record<string, unknown>
      full_image_url: string | null
      thumbnail_url: string | null
    }> = []

    for (let i = 0; i < pageCount; i++) {
      const pageNumber = i + 1

      try {
        // Create a new PDF with just this page
        const singlePagePdf = await PDFDocument.create()
        const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [i])
        singlePagePdf.addPage(copiedPage)
        const singlePageBytes = await singlePagePdf.save()

        // Upload single page PDF to storage
        const pageFileName = `${project_id}/sheets/${document_id}_page_${pageNumber}.pdf`

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(pageFileName, singlePageBytes, {
            contentType: 'application/pdf',
            upsert: true,
          })

        if (uploadError) {
          console.error(`Failed to upload page ${pageNumber}:`, uploadError)
          continue
        }

        // Get public URL for the page
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(pageFileName)

        sheets.push({
          project_id,
          company_id,
          source_pdf_id: document_id,
          document_id: document_id,
          page_number: pageNumber,
          processing_status: 'pending',
          ai_extracted_metadata: {},
          full_image_url: urlData?.publicUrl || null,
          thumbnail_url: null, // Will be generated separately if needed
        })

        console.log(`Uploaded page ${pageNumber}/${pageCount}`)
      } catch (pageError) {
        console.error(`Error processing page ${pageNumber}:`, pageError)
      }
    }

    if (sheets.length === 0) {
      throw new Error('Failed to create any sheet records from PDF')
    }

    // 5. Insert all sheet records
    console.log(`Creating ${sheets.length} sheet records...`)

    const { data: insertedSheets, error: insertError } = await supabase
      .from('drawing_sheets')
      .insert(sheets as any)
      .select('id, page_number')

    if (insertError) {
      throw new Error(`Failed to create sheet records: ${insertError.message}`)
    }

    console.log(`Created ${insertedSheets?.length || 0} sheet records`)

    // 6. Update the source document status
    await supabase
      .from('documents')
      .update({
        ai_processed: false,
        status: 'processing',
      } as any)
      .eq('id', document_id)

    // 7. Queue AI extraction for each sheet (fire and forget)
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/extract-sheet-metadata`

    for (const sheet of insertedSheets || []) {
      // Fire and forget - extraction happens async
      fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({ sheet_id: sheet.id }),
      }).catch((err) => {
        console.error(`Failed to queue extraction for sheet ${sheet.id}:`, err)
      })
    }

    const result: ProcessPdfResult = {
      success: true,
      document_id,
      message: `PDF split into ${pageCount} pages, ${insertedSheets?.length || 0} sheets created`,
      sheets_created: insertedSheets?.length || 0,
    }

    console.log(`Processing completed: ${result.message}`)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Processing error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

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
