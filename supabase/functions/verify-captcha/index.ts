// File: /supabase/functions/verify-captcha/index.ts
// Edge Function for Cloudflare Turnstile CAPTCHA verification

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

interface TurnstileResponse {
  success: boolean
  'error-codes'?: string[]
  challenge_ts?: string
  hostname?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const secretKey = Deno.env.get('TURNSTILE_SECRET_KEY')

    if (!secretKey) {
      console.error('[VerifyCaptcha] TURNSTILE_SECRET_KEY not configured')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'CAPTCHA verification not configured'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const { token } = await req.json()

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing CAPTCHA token' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get client IP for additional verification
    const clientIP = req.headers.get('cf-connecting-ip') ||
                     req.headers.get('x-forwarded-for')?.split(',')[0] ||
                     'unknown'

    // Verify with Cloudflare Turnstile
    const formData = new URLSearchParams()
    formData.append('secret', secretKey)
    formData.append('response', token)
    if (clientIP !== 'unknown') {
      formData.append('remoteip', clientIP)
    }

    const verifyResponse = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    const result: TurnstileResponse = await verifyResponse.json()

    if (!result.success) {
      console.warn('[VerifyCaptcha] Verification failed:', result['error-codes'])
      return new Response(
        JSON.stringify({
          success: false,
          error: 'CAPTCHA verification failed',
          codes: result['error-codes'],
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('[VerifyCaptcha] Verification successful for hostname:', result.hostname)

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: result.challenge_ts,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('[VerifyCaptcha] Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
