// Supabase Edge Function: extract-sheet-metadata
// Uses Claude Vision API to extract metadata from a drawing sheet
// Extracts title block info, sheet number, discipline, scale, and callouts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExtractMetadataRequest {
  sheet_id: string
}

interface ExtractedCallout {
  text: string
  type: string
  target_sheet?: string
}

interface AIExtractionResult {
  sheet_number?: string
  title?: string
  discipline?: string
  scale?: string
  revision?: string
  revision_date?: string
  callouts?: ExtractedCallout[]
  confidence: number
}

interface ExtractMetadataResult {
  success: boolean
  sheet_id?: string
  extracted?: AIExtractionResult
  error?: string
}

// Prompt for Claude Vision API to extract metadata from construction drawings
const EXTRACTION_PROMPT = `You are analyzing a construction drawing sheet image. Extract the following information from the title block and sheet content.

IMPORTANT: Look carefully at the title block (usually in the bottom right corner or along the right edge of the drawing). Construction drawings have standardized title blocks containing key metadata.

Extract these fields:

1. **Sheet Number**: The alphanumeric identifier (e.g., "A2.1", "S-101", "M-001", "E1.2")
   - Usually appears prominently in the title block
   - Often has a prefix letter indicating discipline (A=Architectural, S=Structural, M=Mechanical, E=Electrical, P=Plumbing, C=Civil, L=Landscape, FP=Fire Protection)

2. **Sheet Title**: The descriptive name (e.g., "FLOOR PLAN - LEVEL 2", "FOUNDATION DETAILS", "ELECTRICAL PLAN")

3. **Discipline**: Determine from sheet number prefix or content:
   - architectural, structural, mechanical, electrical, plumbing, civil, landscape, fire_protection, or other

4. **Scale**: The drawing scale (e.g., "1/4\\" = 1'-0\\"", "1:100", "AS NOTED", "NTS")

5. **Revision**: Current revision number or letter (e.g., "REV 2", "B", "3")

6. **Revision Date**: Date of current revision in YYYY-MM-DD format if identifiable

7. **Callouts**: List all cross-references to other sheets you can identify, including:
   - Detail markers (circles with numbers like "3/A5.1" meaning detail 3 on sheet A5.1)
   - Section markers (arrows with text like "SECTION A-A, SEE S-201")
   - Elevation markers
   - "SEE SHEET..." or "SEE DETAIL..." notes
   - Any reference to another sheet number

For each callout, identify:
- The full text shown
- The type: detail, section, elevation, plan, reference, or other
- The target sheet number if identifiable

Return ONLY valid JSON (no markdown formatting, no code blocks):
{
  "sheet_number": "string or null",
  "title": "string or null",
  "discipline": "string or null",
  "scale": "string or null",
  "revision": "string or null",
  "revision_date": "string or null",
  "callouts": [
    {
      "text": "string",
      "type": "detail|section|elevation|plan|reference|other",
      "target_sheet": "string or null"
    }
  ],
  "confidence": 0.0-1.0
}

If you cannot extract a field, use null. The confidence score should reflect your overall certainty about the extracted data (1.0 = very confident, 0.5 = uncertain, 0.0 = could not extract anything).`

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let sheetId: string | null = null

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')

    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured')
    }

    // Create Supabase client with service role (bypass RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request
    const request: ExtractMetadataRequest = await req.json()
    sheetId = request.sheet_id

    if (!sheetId) {
      throw new Error('sheet_id is required')
    }

    console.log(`Extracting metadata for sheet: ${sheetId}`)

    // 1. Get the sheet record
    const { data: sheet, error: sheetError } = await supabase
      .from('drawing_sheets')
      .select('*')
      .eq('id', sheetId)
      .single()

    if (sheetError || !sheet) {
      throw new Error(`Sheet not found: ${sheetError?.message || 'Unknown error'}`)
    }

    // 2. Update status to processing
    await supabase
      .from('drawing_sheets')
      .update({ processing_status: 'processing' } as any)
      .eq('id', sheetId)

    // 3. Get the image URL
    const imageUrl = sheet.full_image_url

    if (!imageUrl) {
      throw new Error('Sheet has no image URL')
    }

    console.log(`Calling Claude Vision API for: ${imageUrl}`)

    // 4. Call Claude Vision API
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'url',
                  url: imageUrl,
                },
              },
              {
                type: 'text',
                text: EXTRACTION_PROMPT,
              },
            ],
          },
        ],
      }),
    })

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text()
      throw new Error(`Claude API error: ${claudeResponse.status} - ${errorText}`)
    }

    const claudeResult = await claudeResponse.json()
    const extractedText = claudeResult.content?.[0]?.text || '{}'

    console.log(`Claude response: ${extractedText.substring(0, 200)}...`)

    // 5. Parse the JSON response
    let extracted: AIExtractionResult
    try {
      // Clean up the response - remove any markdown formatting
      let cleanedText = extractedText.trim()
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.slice(7)
      }
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.slice(3)
      }
      if (cleanedText.endsWith('```')) {
        cleanedText = cleanedText.slice(0, -3)
      }
      cleanedText = cleanedText.trim()

      extracted = JSON.parse(cleanedText)
    } catch (parseError) {
      console.error('Failed to parse Claude response:', extractedText)
      extracted = { confidence: 0 }
    }

    // 6. Map discipline string to valid enum value
    const disciplineMap: Record<string, string> = {
      architectural: 'architectural',
      arch: 'architectural',
      a: 'architectural',
      structural: 'structural',
      struct: 'structural',
      s: 'structural',
      mechanical: 'mechanical',
      mech: 'mechanical',
      m: 'mechanical',
      electrical: 'electrical',
      elec: 'electrical',
      e: 'electrical',
      plumbing: 'plumbing',
      plumb: 'plumbing',
      p: 'plumbing',
      civil: 'civil',
      c: 'civil',
      landscape: 'landscape',
      land: 'landscape',
      l: 'landscape',
      fire_protection: 'fire_protection',
      fp: 'fire_protection',
      fire: 'fire_protection',
    }

    const normalizedDiscipline = extracted.discipline
      ? disciplineMap[extracted.discipline.toLowerCase()] || 'other'
      : null

    // 7. Update the sheet record with extracted metadata
    const updateData: Record<string, unknown> = {
      processing_status: 'completed',
      ai_processed_at: new Date().toISOString(),
      ai_confidence_score: extracted.confidence || 0.5,
      ai_extracted_metadata: {
        raw_title: extracted.title,
        raw_sheet_number: extracted.sheet_number,
        raw_scale: extracted.scale,
        raw_revision: extracted.revision,
        raw_discipline: extracted.discipline,
        callouts: extracted.callouts || [],
        extraction_model: 'claude-sonnet-4-20250514',
        extraction_timestamp: new Date().toISOString(),
      },
    }

    // Only update top-level fields if we extracted them with confidence
    if (extracted.sheet_number && extracted.confidence >= 0.5) {
      updateData.sheet_number = extracted.sheet_number
    }
    if (extracted.title && extracted.confidence >= 0.5) {
      updateData.title = extracted.title
    }
    if (normalizedDiscipline && extracted.confidence >= 0.5) {
      updateData.discipline = normalizedDiscipline
    }
    if (extracted.scale && extracted.confidence >= 0.5) {
      updateData.scale = extracted.scale
    }
    if (extracted.revision && extracted.confidence >= 0.5) {
      updateData.revision = extracted.revision
    }
    if (extracted.revision_date && extracted.confidence >= 0.5) {
      updateData.revision_date = extracted.revision_date
    }

    const { error: updateError } = await supabase
      .from('drawing_sheets')
      .update(updateData as any)
      .eq('id', sheetId)

    if (updateError) {
      throw new Error(`Failed to update sheet: ${updateError.message}`)
    }

    console.log(`Updated sheet ${sheetId} with extracted metadata`)

    // 8. Create callout records if any were found
    if (extracted.callouts && extracted.callouts.length > 0) {
      const calloutRecords = extracted.callouts.map((c) => ({
        source_sheet_id: sheetId,
        callout_text: c.text,
        callout_type: ['detail', 'section', 'elevation', 'plan', 'reference', 'other'].includes(c.type)
          ? c.type
          : 'reference',
        target_sheet_number: c.target_sheet || null,
        ai_confidence: extracted.confidence || 0.5,
        is_verified: false,
      }))

      const { error: calloutsError } = await supabase
        .from('sheet_callouts')
        .insert(calloutRecords as any)

      if (calloutsError) {
        console.error('Failed to create callouts:', calloutsError)
        // Don't throw - callout creation is not critical
      } else {
        console.log(`Created ${calloutRecords.length} callout records`)
      }
    }

    const result: ExtractMetadataResult = {
      success: true,
      sheet_id: sheetId,
      extracted,
    }

    console.log(`Extraction completed for sheet: ${sheetId}`)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Extraction error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Update sheet status to failed if we have the ID
    if (sheetId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        await supabase
          .from('drawing_sheets')
          .update({
            processing_status: 'failed',
            processing_error: errorMessage,
          } as any)
          .eq('id', sheetId)
      } catch {
        // Ignore error update errors
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        sheet_id: sheetId,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
