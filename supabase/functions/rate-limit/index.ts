// File: /supabase/functions/rate-limit/index.ts
// Edge Function for rate limit checking
// Used by the frontend to check rate limits before making auth requests

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  checkRateLimit,
  recordAttempt,
  RATE_LIMIT_CONFIGS,
  getClientIP,
  createIdentifier,
  getRateLimitHeaders,
  createRateLimitResponse,
} from '../_shared/rate-limiter.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { action, identifier: providedIdentifier } = await req.json()

    // Validate action
    if (!action || !RATE_LIMIT_CONFIGS[action]) {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get client IP and create identifier
    const ip = getClientIP(req)
    const identifier = providedIdentifier || createIdentifier(ip)
    const config = RATE_LIMIT_CONFIGS[action]

    // Check rate limit
    const result = await checkRateLimit(supabase, identifier, config)

    if (!result.allowed) {
      console.log(`[RateLimit] Blocked: ${action} from ${identifier}`)
      return createRateLimitResponse(result)
    }

    // Return success with rate limit info
    return new Response(
      JSON.stringify({
        allowed: true,
        remaining: result.remaining,
        resetAt: result.resetAt.toISOString(),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          ...getRateLimitHeaders(result),
        },
      }
    )
  } catch (error) {
    console.error('[RateLimit] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
