/**
 * AI Proxy Edge Function
 * Proxies AI API calls to avoid CORS issues in the browser.
 * Supports OpenAI and Anthropic providers.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AIRequest {
  provider: 'openai' | 'anthropic'
  apiKey: string
  model: string
  prompt: string
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { provider, apiKey, model, prompt, systemPrompt, maxTokens = 100, temperature = 0.7 } = await req.json() as AIRequest

    if (!provider || !apiKey || !model || !prompt) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: provider, apiKey, model, prompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let response: Response
    let result: { content: string; tokens?: { input: number; output: number } }

    if (provider === 'openai') {
      const messages = []
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt })
      }
      messages.push({ role: 'user', content: prompt })

      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error?.message || `OpenAI API error: ${response.status}`)
      }

      const data = await response.json()
      result = {
        content: data.choices?.[0]?.message?.content || '',
        tokens: {
          input: data.usage?.prompt_tokens || 0,
          output: data.usage?.completion_tokens || 0,
        },
      }
    } else if (provider === 'anthropic') {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [{ role: 'user', content: prompt }],
          temperature,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error?.message || `Anthropic API error: ${response.status}`)
      }

      const data = await response.json()
      const content = data.content?.find((block: { type: string }) => block.type === 'text')?.text || ''
      result = {
        content,
        tokens: {
          input: data.usage?.input_tokens || 0,
          output: data.usage?.output_tokens || 0,
        },
      }
    } else {
      throw new Error(`Unsupported provider: ${provider}`)
    }

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('AI Proxy Error:', error)
    // Return 200 with success: false so Supabase client can extract the error message
    // (non-2xx status codes cause the client to throw a generic error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
