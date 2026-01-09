/**
 * AI Proxy Edge Function
 * Proxies AI API calls to avoid CORS issues in the browser.
 * Supports OpenAI and Anthropic providers.
 *
 * Security: Supports retrieving API keys from Supabase Vault for secure storage.
 * When using vault, pass the company_id instead of the raw API key.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AIRequest {
  provider: 'openai' | 'anthropic'
  // Direct API key (legacy - will be deprecated)
  apiKey?: string
  // Use vault-stored key via company_id lookup
  companyId?: string
  useVault?: boolean
  model: string
  prompt: string
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
  // For streaming support
  stream?: boolean
}

interface VaultSecret {
  id: string
  name: string
  secret: string
}

/**
 * Retrieve API key from Supabase Vault
 * The key is stored with name format: {provider}_api_key_{company_id}
 */
async function getApiKeyFromVault(
  supabaseClient: ReturnType<typeof createClient>,
  provider: string,
  companyId: string
): Promise<string | null> {
  // First, try to get from ai_configuration table
  const { data: config, error: configError } = await supabaseClient
    .from('ai_configuration')
    .select('openai_api_key_id, anthropic_api_key_id')
    .eq('company_id', companyId)
    .single()

  if (configError) {
    console.error('Error fetching AI configuration:', configError)
    return null
  }

  // Check if key is stored directly (legacy) or is a vault reference (UUID format)
  const keyField = provider === 'openai' ? 'openai_api_key_id' : 'anthropic_api_key_id'
  const storedValue = config?.[keyField]

  if (!storedValue) {
    return null
  }

  // Check if it's a UUID (vault reference) or direct key
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  if (uuidPattern.test(storedValue)) {
    // It's a vault reference - retrieve from vault
    const { data: secrets, error: vaultError } = await supabaseClient
      .rpc('get_secret', { secret_id: storedValue })

    if (vaultError) {
      console.error('Error retrieving secret from vault:', vaultError)

      // Fallback: Try to query vault.decrypted_secrets view
      const { data: decryptedSecret, error: fallbackError } = await supabaseClient
        .from('decrypted_secrets')
        .select('decrypted_secret')
        .eq('id', storedValue)
        .single()

      if (fallbackError) {
        console.error('Vault fallback also failed:', fallbackError)
        return null
      }

      return decryptedSecret?.decrypted_secret || null
    }

    return secrets || null
  }

  // It's a direct key (legacy support)
  return storedValue
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestBody = await req.json() as AIRequest
    const {
      provider,
      apiKey: directApiKey,
      companyId,
      useVault = false,
      model,
      prompt,
      systemPrompt,
      maxTokens = 2048,
      temperature = 0.7,
      stream = false,
    } = requestBody

    if (!provider || !model || !prompt) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: provider, model, prompt' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determine API key source
    let apiKey: string | null = null

    if (useVault && companyId) {
      // Get API key from vault using service role (server-side only)
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })

      apiKey = await getApiKeyFromVault(supabaseAdmin, provider, companyId)

      if (!apiKey) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `No ${provider} API key found for this company. Please configure it in Settings → AI.`
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else if (directApiKey) {
      // Use directly provided key (legacy support)
      apiKey = directApiKey
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No API key provided. Either provide apiKey directly or set useVault=true with companyId.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
          stream,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error?.message || `OpenAI API error: ${response.status}`)
      }

      // Handle streaming response
      if (stream) {
        // Return streaming response directly
        return new Response(response.body, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        })
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
          stream,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error?.message || `Anthropic API error: ${response.status}`)
      }

      // Handle streaming response
      if (stream) {
        return new Response(response.body, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        })
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
