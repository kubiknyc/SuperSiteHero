// Supabase Edge Function: find-pattern-matches
// Uses Claude Vision API to find matching symbols/patterns across drawing sheets
// Supports both saved patterns and ad-hoc lasso selections

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FindPatternsRequest {
  // Either pattern_id (saved pattern) or pattern_image_base64 (ad-hoc selection)
  pattern_id?: string
  pattern_image_base64?: string
  pattern_description?: string
  // Sheets to search
  sheet_ids: string[]
  // Search settings
  match_tolerance?: number // 0.0-1.0, default 0.8
}

interface PatternMatch {
  sheet_id: string
  sheet_number: string | null
  sheet_title: string | null
  bounding_box: {
    x: number
    y: number
    width: number
    height: number
  }
  confidence: number
  is_excluded: boolean
}

interface FindPatternsResult {
  success: boolean
  pattern_id?: string
  matches?: PatternMatch[]
  total_sheets_searched?: number
  error?: string
}

// Prompt for Claude to find matching patterns in drawings
const createSearchPrompt = (
  patternDescription: string,
  matchTolerance: number
) => `You are analyzing a construction drawing sheet to find specific symbols or patterns.

SEARCH FOR THIS PATTERN:
${patternDescription}

MATCH TOLERANCE: ${matchTolerance * 100}% (${matchTolerance >= 0.9 ? 'exact match required' : matchTolerance >= 0.7 ? 'similar matches allowed' : 'fuzzy matches allowed'})

INSTRUCTIONS:
1. Scan the entire drawing carefully for instances of this pattern
2. Consider rotations, scale variations, and minor style differences based on tolerance
3. For each match found, identify its location as a percentage of the image (0-100)
4. Rate your confidence in each match (0.0-1.0)

Return ONLY valid JSON (no markdown):
{
  "matches": [
    {
      "x": 0-100,
      "y": 0-100,
      "width": 0-100,
      "height": 0-100,
      "confidence": 0.0-1.0,
      "notes": "optional description of this instance"
    }
  ],
  "total_found": number,
  "search_confidence": 0.0-1.0
}

If no matches are found, return:
{
  "matches": [],
  "total_found": 0,
  "search_confidence": 0.0-1.0
}

The search_confidence indicates how thoroughly you were able to search the image (1.0 = complete scan, lower = image quality issues or unclear areas).`

// Prompt to analyze a pattern image and generate a description
const DESCRIBE_PATTERN_PROMPT = `Analyze this image section from a construction drawing and describe the symbol or pattern you see.

Focus on:
1. What type of symbol/element is it? (electrical outlet, light fixture, equipment, annotation, etc.)
2. Key visual features (shape, lines, text, numbers)
3. Any standardized symbol conventions it follows
4. Size relative to typical drawing elements

Provide a clear, concise description that could be used to find similar symbols in other drawings.
Be specific about visual characteristics that would help identify matches.

Return ONLY a plain text description (no JSON, no markdown formatting).`

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

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
    const request: FindPatternsRequest = await req.json()
    const {
      pattern_id,
      pattern_image_base64,
      pattern_description: providedDescription,
      sheet_ids,
      match_tolerance = 0.8,
    } = request

    if (!pattern_id && !pattern_image_base64) {
      throw new Error('Either pattern_id or pattern_image_base64 is required')
    }

    if (!sheet_ids || sheet_ids.length === 0) {
      throw new Error('sheet_ids array is required and must not be empty')
    }

    console.log(`Searching for pattern across ${sheet_ids.length} sheets`)

    // 1. Get pattern description
    let patternDescription = providedDescription
    let patternImageUrl: string | null = null
    let savedPatternId: string | null = null

    if (pattern_id) {
      // Fetch saved pattern
      const { data: pattern, error: patternError } = await supabase
        .from('visual_search_patterns')
        .select('*')
        .eq('id', pattern_id)
        .single()

      if (patternError || !pattern) {
        throw new Error(`Pattern not found: ${patternError?.message || 'Unknown error'}`)
      }

      patternDescription = pattern.pattern_description
      patternImageUrl = pattern.pattern_image_url
      savedPatternId = pattern.id

      // Update usage count
      await supabase
        .from('visual_search_patterns')
        .update({
          usage_count: (pattern.usage_count || 0) + 1,
          last_used_at: new Date().toISOString(),
        } as any)
        .eq('id', pattern_id)

      console.log(`Using saved pattern: ${pattern.name}`)
    } else if (pattern_image_base64) {
      // Generate description from the provided image if not provided
      if (!patternDescription) {
        console.log('Generating pattern description from image...')

        const describeResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicApiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 500,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: 'image/png',
                      data: pattern_image_base64,
                    },
                  },
                  {
                    type: 'text',
                    text: DESCRIBE_PATTERN_PROMPT,
                  },
                ],
              },
            ],
          }),
        })

        if (!describeResponse.ok) {
          const errorText = await describeResponse.text()
          throw new Error(`Failed to analyze pattern: ${describeResponse.status} - ${errorText}`)
        }

        const describeResult = await describeResponse.json()
        patternDescription = describeResult.content?.[0]?.text || 'Unknown pattern'

        console.log(`Generated description: ${patternDescription.substring(0, 100)}...`)
      }
    }

    if (!patternDescription) {
      throw new Error('Could not determine pattern description')
    }

    // 2. Get sheet details
    const { data: sheets, error: sheetsError } = await supabase
      .from('drawing_sheets')
      .select('id, sheet_number, title, full_image_url')
      .in('id', sheet_ids)
      .is('deleted_at', null)

    if (sheetsError || !sheets || sheets.length === 0) {
      throw new Error(`No sheets found: ${sheetsError?.message || 'Unknown error'}`)
    }

    console.log(`Found ${sheets.length} sheets to search`)

    // 3. Search each sheet for the pattern
    const allMatches: PatternMatch[] = []
    const searchPrompt = createSearchPrompt(patternDescription, match_tolerance)

    for (const sheet of sheets) {
      if (!sheet.full_image_url) {
        console.log(`Skipping sheet ${sheet.id} - no image URL`)
        continue
      }

      try {
        console.log(`Searching sheet: ${sheet.sheet_number || sheet.id}`)

        const searchResponse = await fetch('https://api.anthropic.com/v1/messages', {
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
                      url: sheet.full_image_url,
                    },
                  },
                  {
                    type: 'text',
                    text: searchPrompt,
                  },
                ],
              },
            ],
          }),
        })

        if (!searchResponse.ok) {
          console.error(`Search failed for sheet ${sheet.id}:`, await searchResponse.text())
          continue
        }

        const searchResult = await searchResponse.json()
        const responseText = searchResult.content?.[0]?.text || '{}'

        // Parse response
        let parsed
        try {
          let cleanedText = responseText.trim()
          if (cleanedText.startsWith('```json')) {
            cleanedText = cleanedText.slice(7)
          }
          if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.slice(3)
          }
          if (cleanedText.endsWith('```')) {
            cleanedText = cleanedText.slice(0, -3)
          }
          parsed = JSON.parse(cleanedText.trim())
        } catch {
          console.error(`Failed to parse response for sheet ${sheet.id}`)
          continue
        }

        // Add matches for this sheet
        if (parsed.matches && Array.isArray(parsed.matches)) {
          for (const match of parsed.matches) {
            // Only include matches above the tolerance threshold
            if ((match.confidence || 0) >= match_tolerance) {
              allMatches.push({
                sheet_id: sheet.id,
                sheet_number: sheet.sheet_number,
                sheet_title: sheet.title,
                bounding_box: {
                  x: match.x || 0,
                  y: match.y || 0,
                  width: match.width || 5,
                  height: match.height || 5,
                },
                confidence: match.confidence || 0.5,
                is_excluded: false,
              })
            }
          }
        }

        console.log(`Found ${parsed.total_found || 0} matches in sheet ${sheet.sheet_number || sheet.id}`)
      } catch (sheetError) {
        console.error(`Error searching sheet ${sheet.id}:`, sheetError)
      }
    }

    // 4. Sort matches by confidence (highest first)
    allMatches.sort((a, b) => b.confidence - a.confidence)

    const result: FindPatternsResult = {
      success: true,
      pattern_id: savedPatternId || undefined,
      matches: allMatches,
      total_sheets_searched: sheets.length,
    }

    console.log(`Search complete: ${allMatches.length} total matches found across ${sheets.length} sheets`)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Pattern search error:', error)

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
