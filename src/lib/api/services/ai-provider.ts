/**
 * AI Provider Service
 * Provider-agnostic AI service supporting OpenAI, Anthropic, and local models.
 * Handles completions, JSON extraction, cost tracking, and provider management.
 */

import { supabase } from '@/lib/supabase'
import type {
  AIProvider,
  AIProviderType,
  AIConfiguration,
  CompletionOptions,
  CompletionResult,
  JSONExtractionOptions,
  TokenCount,
  AIUsageStats,
  FeatureUsage,
  DailyUsage,
  UpdateAIConfigurationDTO,
} from '@/types/ai'

// Import values separately (not as types)
import { MODEL_PRICING, DEFAULT_MODELS } from '@/types/ai'
import { logger } from '../../utils/logger';
import { vaultService } from '@/lib/security/vault';


// Re-export for convenience
export { MODEL_PRICING, DEFAULT_MODELS }

// ============================================================================
// OpenAI Provider Implementation
// ============================================================================

class OpenAIProvider implements AIProvider {
  private apiKey: string
  private defaultModel: string

  constructor(apiKey: string, defaultModel?: string) {
    this.apiKey = apiKey
    this.defaultModel = defaultModel || 'gpt-4o-mini'
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<CompletionResult> {
    const startTime = Date.now()
    const model = options?.model || this.defaultModel

    // Use Edge Function to avoid CORS issues
    const { data, error } = await supabase.functions.invoke('ai-proxy', {
      body: {
        provider: 'openai',
        apiKey: this.apiKey,
        model,
        prompt,
        systemPrompt: options?.systemPrompt,
        maxTokens: options?.maxTokens ?? 2048,
        temperature: options?.temperature ?? 0.7,
      },
    })

    if (error) {
      logger.error('[OpenAIProvider] Edge function error:', error)
      throw new Error(`OpenAI API error: ${error.message || 'Edge function failed'}`)
    }

    if (!data) {
      throw new Error('OpenAI API error: No response from AI proxy')
    }

    if (!data.success) {
      logger.error('[OpenAIProvider] AI proxy returned error:', data.error)
      throw new Error(`OpenAI API error: ${data.error || 'Unknown error from AI service'}`)
    }

    const latencyMs = Date.now() - startTime

    return {
      content: data.content || '',
      tokens: {
        input: data.tokens?.input || 0,
        output: data.tokens?.output || 0,
        total: (data.tokens?.input || 0) + (data.tokens?.output || 0),
      },
      model,
      finishReason: 'stop',
      latencyMs,
    }
  }

  async extractJSON<T>(prompt: string, options?: JSONExtractionOptions): Promise<T> {
    const systemPrompt = options?.systemPrompt
      ? `${options.systemPrompt}\n\nYou must respond with valid JSON only.`
      : 'You are a helpful assistant that extracts structured data. Respond with valid JSON only.'

    const enhancedPrompt = options?.schema
      ? `${prompt}\n\nRespond with JSON matching this schema:\n${JSON.stringify(options.schema, null, 2)}`
      : prompt

    const result = await this.complete(enhancedPrompt, {
      ...options,
      systemPrompt,
      responseFormat: 'json',
    })

    try {
      return JSON.parse(result.content) as T
    } catch (parseError) {
      if (options?.retryOnParseError !== false) {
        // Retry with explicit JSON instruction
        const retryResult = await this.complete(
          `The previous response was not valid JSON. Please try again:\n\n${enhancedPrompt}\n\nRespond ONLY with valid JSON, no other text.`,
          {
            ...options,
            systemPrompt,
            responseFormat: 'json',
          }
        )
        return JSON.parse(retryResult.content) as T
      }
      throw new Error(`Failed to parse JSON response: ${parseError}`)
    }
  }

  estimateCost(tokens: TokenCount): number {
    const pricing = (MODEL_PRICING as Record<string, { input: number; output: number }>)[
      this.defaultModel
    ] || { input: 0.015, output: 0.06 }
    return Math.ceil((tokens.input * pricing.input + tokens.output * pricing.output) / 1000)
  }

  getProviderName(): AIProviderType {
    return 'openai'
  }

  getAvailableModels(): string[] {
    return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo']
  }

  isConfigured(): boolean {
    return !!this.apiKey
  }

  private mapFinishReason(
    reason: string
  ): 'stop' | 'length' | 'content_filter' | 'error' {
    switch (reason) {
      case 'stop':
        return 'stop'
      case 'length':
        return 'length'
      case 'content_filter':
        return 'content_filter'
      default:
        return 'error'
    }
  }
}

// ============================================================================
// Anthropic Provider Implementation
// ============================================================================

class AnthropicProvider implements AIProvider {
  private apiKey: string
  private defaultModel: string

  constructor(apiKey: string, defaultModel?: string) {
    this.apiKey = apiKey
    this.defaultModel = defaultModel || 'claude-3-haiku-20240307'
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<CompletionResult> {
    const startTime = Date.now()
    const model = options?.model || this.defaultModel

    // Use Edge Function to avoid CORS issues
    const { data, error } = await supabase.functions.invoke('ai-proxy', {
      body: {
        provider: 'anthropic',
        apiKey: this.apiKey,
        model,
        prompt,
        systemPrompt: options?.systemPrompt,
        maxTokens: options?.maxTokens ?? 2048,
        temperature: options?.temperature ?? 0.7,
      },
    })

    if (error) {
      logger.error('[AnthropicProvider] Edge function error:', error)
      throw new Error(`Anthropic API error: ${error.message || 'Edge function failed'}`)
    }

    if (!data) {
      throw new Error('Anthropic API error: No response from AI proxy')
    }

    if (!data.success) {
      logger.error('[AnthropicProvider] AI proxy returned error:', data.error)
      throw new Error(`Anthropic API error: ${data.error || 'Unknown error from AI service'}`)
    }

    const latencyMs = Date.now() - startTime

    return {
      content: data.content || '',
      tokens: {
        input: data.tokens?.input || 0,
        output: data.tokens?.output || 0,
        total: (data.tokens?.input || 0) + (data.tokens?.output || 0),
      },
      model,
      finishReason: 'stop',
      latencyMs,
    }
  }

  async extractJSON<T>(prompt: string, options?: JSONExtractionOptions): Promise<T> {
    const systemPrompt = options?.systemPrompt
      ? `${options.systemPrompt}\n\nYou must respond with valid JSON only. Do not include any text before or after the JSON.`
      : 'You are a helpful assistant that extracts structured data. Respond with valid JSON only. Do not include any text before or after the JSON.'

    const enhancedPrompt = options?.schema
      ? `${prompt}\n\nRespond with JSON matching this schema:\n${JSON.stringify(options.schema, null, 2)}`
      : prompt

    const result = await this.complete(enhancedPrompt, {
      ...options,
      systemPrompt,
    })

    // Extract JSON from response (Anthropic may include some surrounding text)
    const jsonMatch = result.content.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
    if (!jsonMatch) {
      if (options?.retryOnParseError !== false) {
        const retryResult = await this.complete(
          `The previous response was not valid JSON. Please try again:\n\n${enhancedPrompt}\n\nRespond ONLY with valid JSON, no other text.`,
          {
            ...options,
            systemPrompt,
          }
        )
        const retryMatch = retryResult.content.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
        if (retryMatch) {
          return JSON.parse(retryMatch[0]) as T
        }
      }
      throw new Error('No JSON found in response')
    }

    try {
      return JSON.parse(jsonMatch[0]) as T
    } catch (parseError) {
      throw new Error(`Failed to parse JSON response: ${parseError}`)
    }
  }

  estimateCost(tokens: TokenCount): number {
    const pricing = (MODEL_PRICING as Record<string, { input: number; output: number }>)[
      this.defaultModel
    ] || { input: 0.08, output: 0.4 }
    return Math.ceil((tokens.input * pricing.input + tokens.output * pricing.output) / 1000)
  }

  getProviderName(): AIProviderType {
    return 'anthropic'
  }

  getAvailableModels(): string[] {
    return ['claude-3-haiku-20240307', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229']
  }

  isConfigured(): boolean {
    return !!this.apiKey
  }

  private mapStopReason(
    reason: string
  ): 'stop' | 'length' | 'content_filter' | 'error' {
    switch (reason) {
      case 'end_turn':
      case 'stop_sequence':
        return 'stop'
      case 'max_tokens':
        return 'length'
      default:
        return 'error'
    }
  }
}

// ============================================================================
// Local Provider Implementation (Ollama)
// ============================================================================

class LocalProvider implements AIProvider {
  private baseUrl: string
  private defaultModel: string

  constructor(baseUrl?: string, defaultModel?: string) {
    this.baseUrl = baseUrl || 'http://localhost:11434'
    this.defaultModel = defaultModel || 'llama3'
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<CompletionResult> {
    const startTime = Date.now()
    const model = options?.model || this.defaultModel

    const fullPrompt = options?.systemPrompt
      ? `${options.systemPrompt}\n\n${prompt}`
      : prompt

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.7,
          num_predict: options?.maxTokens ?? 2048,
          stop: options?.stopSequences,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Local model error: ${response.statusText}`)
    }

    const data = await response.json()
    const latencyMs = Date.now() - startTime

    // Ollama doesn't provide token counts, estimate from text
    const inputTokens = Math.ceil(fullPrompt.length / 4)
    const outputTokens = Math.ceil((data.response?.length || 0) / 4)

    return {
      content: data.response || '',
      tokens: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens,
      },
      model,
      finishReason: data.done ? 'stop' : 'error',
      latencyMs,
    }
  }

  async extractJSON<T>(prompt: string, options?: JSONExtractionOptions): Promise<T> {
    const systemPrompt =
      'You are a helpful assistant that extracts structured data. Respond with valid JSON only.'

    const enhancedPrompt = options?.schema
      ? `${prompt}\n\nRespond with JSON matching this schema:\n${JSON.stringify(options.schema, null, 2)}`
      : prompt

    const result = await this.complete(enhancedPrompt, {
      ...options,
      systemPrompt,
    })

    const jsonMatch = result.content.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    return JSON.parse(jsonMatch[0]) as T
  }

  estimateCost(_tokens: TokenCount): number {
    return 0 // Local models are free
  }

  getProviderName(): AIProviderType {
    return 'local'
  }

  getAvailableModels(): string[] {
    return ['llama3', 'mistral', 'codellama', 'phi3']
  }

  isConfigured(): boolean {
    return true // Local is always "configured" but may not be running
  }
}

// ============================================================================
// Provider Factory
// ============================================================================

/**
 * Get the API key ID for the current provider
 * Returns the vault secret ID or legacy encrypted key
 */
function getApiKeyIdForProvider(config: AIConfiguration): string | undefined {
  const provider = config.default_provider || config.provider

  // Check for provider-specific vault key IDs first (preferred)
  if (provider === 'openai' && config.openai_api_key_id) {
    return config.openai_api_key_id
  }
  if (provider === 'anthropic' && config.anthropic_api_key_id) {
    return config.anthropic_api_key_id
  }

  // Fall back to legacy direct API key
  if (config.api_key_encrypted) {
    return config.api_key_encrypted
  }

  return undefined
}

/**
 * Resolve API key from vault or legacy storage
 * Attempts to retrieve from vault first, falls back to direct value
 */
async function resolveApiKey(keyIdOrValue: string): Promise<string | null> {
  // Check if it looks like a UUID (vault secret ID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (uuidRegex.test(keyIdOrValue)) {
    // It's a vault secret ID - retrieve from vault
    try {
      const secret = await vaultService.getSecret(keyIdOrValue);
      if (secret) {
        return secret;
      }
      logger.warn('[AI Provider] Vault secret not found, treating as direct key');
    } catch (error) {
      logger.warn('[AI Provider] Vault lookup failed, treating as direct key:', error);
    }
  }

  // Return as-is (legacy direct key or vault unavailable)
  return keyIdOrValue;
}

/**
 * Get the model for the current provider
 */
function getModelForProvider(config: AIConfiguration): string {
  const provider = config.default_provider || config.provider

  // Use the provider-specific model setting
  if (provider === 'openai') {
    return config.openai_model || config.model_preference || 'gpt-4o-mini'
  }
  if (provider === 'anthropic') {
    return config.anthropic_model || config.model_preference || 'claude-3-haiku-20240307'
  }
  // Local models
  return config.model_preference || 'llama3'
}

/**
 * Check if AI features are enabled (any feature toggle is on)
 */
function isAIEnabled(config: AIConfiguration): boolean {
  // Check explicit is_enabled flag (legacy)
  if (config.is_enabled !== undefined) {
    return config.is_enabled
  }

  // Check if any feature is enabled
  return (
    config.enable_rfi_routing ||
    config.enable_smart_summaries ||
    config.enable_action_item_extraction ||
    config.enable_risk_prediction ||
    config.enable_schedule_optimization ||
    config.enable_document_enhancement
  )
}

/**
 * Get AI provider instance (async to support vault key resolution)
 */
export async function getAIProvider(config: AIConfiguration): Promise<AIProvider> {
  const provider = config.default_provider || config.provider
  const keyIdOrValue = getApiKeyIdForProvider(config)
  const model = getModelForProvider(config)

  switch (provider) {
    case 'openai': {
      if (!keyIdOrValue) {
        throw new Error('OpenAI API key not configured. Please add your API key in Settings → AI.')
      }
      const apiKey = await resolveApiKey(keyIdOrValue)
      if (!apiKey) {
        throw new Error('Failed to retrieve OpenAI API key from secure storage.')
      }
      return new OpenAIProvider(apiKey, model)
    }

    case 'anthropic': {
      if (!keyIdOrValue) {
        throw new Error('Anthropic API key not configured. Please add your API key in Settings → AI.')
      }
      const apiKey = await resolveApiKey(keyIdOrValue)
      if (!apiKey) {
        throw new Error('Failed to retrieve Anthropic API key from secure storage.')
      }
      return new AnthropicProvider(apiKey, model)
    }

    case 'local':
      return new LocalProvider(undefined, model)

    default:
      throw new Error(`Unknown AI provider: ${provider}`)
  }
}

/**
 * Synchronous version for backward compatibility
 * Uses the key ID directly (for edge functions that handle vault internally)
 */
export function getAIProviderSync(config: AIConfiguration): AIProvider {
  const provider = config.default_provider || config.provider
  const apiKey = getApiKeyIdForProvider(config)
  const model = getModelForProvider(config)

  switch (provider) {
    case 'openai':
      if (!apiKey) {
        throw new Error('OpenAI API key not configured. Please add your API key in Settings → AI.')
      }
      return new OpenAIProvider(apiKey, model)

    case 'anthropic':
      if (!apiKey) {
        throw new Error('Anthropic API key not configured. Please add your API key in Settings → AI.')
      }
      return new AnthropicProvider(apiKey, model)

    case 'local':
      return new LocalProvider(undefined, model)

    default:
      throw new Error(`Unknown AI provider: ${provider}`)
  }
}

// ============================================================================
// AI Configuration API
// ============================================================================

export const aiConfigurationApi = {
  /**
   * Get AI configuration for the current company
   */
  async getConfiguration(): Promise<AIConfiguration | null> {
    const { data, error } = await (supabase as any)
      .from('ai_configuration')
      .select('*')
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return data as AIConfiguration | null
  },

  /**
   * Update AI configuration
   */
  async updateConfiguration(dto: UpdateAIConfigurationDTO): Promise<AIConfiguration> {
    const { data: existing } = await (supabase as any)
      .from('ai_configuration')
      .select('id')
      .single()

    // Build update object with correct column names
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    // Provider settings
    if (dto.default_provider || dto.provider) {
      updateData.default_provider = dto.default_provider || dto.provider
    }
    if (dto.openai_model || (dto.model_preference && (dto.default_provider || dto.provider) === 'openai')) {
      updateData.openai_model = dto.openai_model || dto.model_preference
    }
    if (dto.anthropic_model || (dto.model_preference && (dto.default_provider || dto.provider) === 'anthropic')) {
      updateData.anthropic_model = dto.anthropic_model || dto.model_preference
    }

    // API Keys - store in vault and save secret ID
    const openaiKey = dto.openai_api_key || (dto.api_key && (dto.default_provider || dto.provider) === 'openai' ? dto.api_key : null)
    const anthropicKey = dto.anthropic_api_key || (dto.api_key && (dto.default_provider || dto.provider) === 'anthropic' ? dto.api_key : null)

    if (openaiKey) {
      try {
        const secretId = await vaultService.createSecret(openaiKey, {
          name: `openai_api_key_${existing?.id || 'new'}`,
          description: 'OpenAI API key for AI features'
        })
        updateData.openai_api_key_id = secretId
      } catch (vaultError) {
        // Vault not available - store directly (less secure but functional)
        logger.warn('[AI Config] Vault unavailable, storing key directly:', vaultError)
        updateData.openai_api_key_id = openaiKey
      }
    }

    if (anthropicKey) {
      try {
        const secretId = await vaultService.createSecret(anthropicKey, {
          name: `anthropic_api_key_${existing?.id || 'new'}`,
          description: 'Anthropic API key for AI features'
        })
        updateData.anthropic_api_key_id = secretId
      } catch (vaultError) {
        // Vault not available - store directly (less secure but functional)
        logger.warn('[AI Config] Vault unavailable, storing key directly:', vaultError)
        updateData.anthropic_api_key_id = anthropicKey
      }
    }

    // Feature toggles
    if (dto.enable_rfi_routing !== undefined) {updateData.enable_rfi_routing = dto.enable_rfi_routing}
    if (dto.enable_smart_summaries !== undefined) {updateData.enable_smart_summaries = dto.enable_smart_summaries}
    if (dto.enable_action_item_extraction !== undefined) {updateData.enable_action_item_extraction = dto.enable_action_item_extraction}
    if (dto.enable_risk_prediction !== undefined) {updateData.enable_risk_prediction = dto.enable_risk_prediction}
    if (dto.enable_schedule_optimization !== undefined) {updateData.enable_schedule_optimization = dto.enable_schedule_optimization}
    if (dto.enable_document_enhancement !== undefined) {updateData.enable_document_enhancement = dto.enable_document_enhancement}

    // Handle legacy features_enabled object
    if (dto.features_enabled) {
      if (dto.features_enabled.rfi_routing !== undefined) {updateData.enable_rfi_routing = dto.features_enabled.rfi_routing}
      if (dto.features_enabled.smart_summaries !== undefined) {updateData.enable_smart_summaries = dto.features_enabled.smart_summaries}
      if (dto.features_enabled.risk_prediction !== undefined) {updateData.enable_risk_prediction = dto.features_enabled.risk_prediction}
      if (dto.features_enabled.schedule_optimization !== undefined) {updateData.enable_schedule_optimization = dto.features_enabled.schedule_optimization}
      if (dto.features_enabled.document_enhancement !== undefined) {updateData.enable_document_enhancement = dto.features_enabled.document_enhancement}
    }

    // Cost controls
    if (dto.monthly_budget_cents !== undefined) {updateData.monthly_budget_cents = dto.monthly_budget_cents}
    if (dto.alert_threshold_percent !== undefined) {updateData.alert_threshold_percent = dto.alert_threshold_percent}

    if (existing) {
      const { data, error } = await (supabase as any)
        .from('ai_configuration')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {throw error}
      return data as AIConfiguration
    } else {
      // Create new configuration with defaults
      // Store API keys in vault if provided
      let openaiKeyId: string | null = null
      let anthropicKeyId: string | null = null

      const newOpenaiKey = dto.openai_api_key || (dto.api_key && (dto.default_provider || dto.provider) === 'openai' ? dto.api_key : null)
      const newAnthropicKey = dto.anthropic_api_key || (dto.api_key && (dto.default_provider || dto.provider) === 'anthropic' ? dto.api_key : null)

      if (newOpenaiKey) {
        try {
          openaiKeyId = await vaultService.createSecret(newOpenaiKey, {
            name: `openai_api_key_new_${Date.now()}`,
            description: 'OpenAI API key for AI features'
          })
        } catch (vaultError) {
          logger.warn('[AI Config] Vault unavailable for new config, storing key directly:', vaultError)
          openaiKeyId = newOpenaiKey
        }
      }

      if (newAnthropicKey) {
        try {
          anthropicKeyId = await vaultService.createSecret(newAnthropicKey, {
            name: `anthropic_api_key_new_${Date.now()}`,
            description: 'Anthropic API key for AI features'
          })
        } catch (vaultError) {
          logger.warn('[AI Config] Vault unavailable for new config, storing key directly:', vaultError)
          anthropicKeyId = newAnthropicKey
        }
      }

      const insertData = {
        default_provider: dto.default_provider || dto.provider || 'openai',
        openai_model: dto.openai_model || 'gpt-4o-mini',
        anthropic_model: dto.anthropic_model || 'claude-3-haiku-20240307',
        openai_api_key_id: openaiKeyId,
        anthropic_api_key_id: anthropicKeyId,
        enable_rfi_routing: dto.enable_rfi_routing ?? dto.features_enabled?.rfi_routing ?? true,
        enable_smart_summaries: dto.enable_smart_summaries ?? dto.features_enabled?.smart_summaries ?? true,
        enable_action_item_extraction: dto.enable_action_item_extraction ?? true,
        enable_risk_prediction: dto.enable_risk_prediction ?? dto.features_enabled?.risk_prediction ?? true,
        enable_schedule_optimization: dto.enable_schedule_optimization ?? dto.features_enabled?.schedule_optimization ?? true,
        enable_document_enhancement: dto.enable_document_enhancement ?? dto.features_enabled?.document_enhancement ?? true,
        monthly_budget_cents: dto.monthly_budget_cents ?? 10000,
        alert_threshold_percent: dto.alert_threshold_percent ?? 80,
      }

      const { data, error } = await (supabase as any)
        .from('ai_configuration')
        .insert(insertData)
        .select()
        .single()

      if (error) {throw error}
      return data as AIConfiguration
    }
  },

  /**
   * Test AI configuration by making a simple request via Edge Function (to avoid CORS)
   */
  async testConfiguration(config: AIConfiguration): Promise<{ success: boolean; error?: string }> {
    try {
      const providerType = config.default_provider || config.provider
      const keyIdOrValue = getApiKeyIdForProvider(config)
      const model = getModelForProvider(config)

      if (!keyIdOrValue) {
        return { success: false, error: 'API key not configured' }
      }

      // Resolve key from vault if needed
      const apiKey = await resolveApiKey(keyIdOrValue)
      if (!apiKey) {
        return { success: false, error: 'Failed to retrieve API key from secure storage' }
      }

      // Use Edge Function to avoid CORS issues
      const { data, error } = await supabase.functions.invoke('ai-proxy', {
        body: {
          provider: providerType,
          apiKey,
          model,
          prompt: 'Say "Hello" in exactly one word.',
          maxTokens: 10,
          temperature: 0,
        },
      })

      if (error) {
        // If Edge Function not deployed, provide helpful message
        if (error.message?.includes('FunctionNotFound') || error.message?.includes('404')) {
          return {
            success: false,
            error: 'AI proxy not deployed. Please deploy the ai-proxy Edge Function or save configuration to test with the AI agent.',
          }
        }
        throw error
      }

      if (!data.success) {
        return { success: false, error: data.error || 'Test failed' }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },
}

// ============================================================================
// AI Usage Tracking API
// ============================================================================

export const aiUsageApi = {
  /**
   * Log AI usage for cost tracking
   */
  async logUsage(params: {
    feature: string
    model: string
    inputTokens: number
    outputTokens: number
    latencyMs: number
    metadata?: Record<string, unknown>
  }): Promise<void> {
    const pricing = (MODEL_PRICING as Record<string, { input: number; output: number }>)[
      params.model
    ] || { input: 0, output: 0 }
    const costCents = Math.ceil(
      (params.inputTokens * pricing.input + params.outputTokens * pricing.output) / 1000
    )

    // Determine provider from model name
    const aiProvider = params.model.startsWith('claude') ? 'anthropic' :
                       params.model.startsWith('gpt') ? 'openai' : 'openai'

    const { error } = await (supabase as any).from('ai_usage_log').insert({
      feature: params.feature,
      ai_provider: aiProvider,
      ai_model: params.model,
      prompt_tokens: params.inputTokens,
      completion_tokens: params.outputTokens,
      estimated_cost_cents: costCents,
    })

    if (error) {
      logger.error('Failed to log AI usage:', error)
    }
  },

  /**
   * Get usage statistics for the current billing period
   */
  async getUsageStats(startDate?: string, endDate?: string): Promise<AIUsageStats> {
    const start = startDate || new Date(new Date().setDate(1)).toISOString().split('T')[0]
    const end = endDate || new Date().toISOString().split('T')[0]

    // Get configuration for budget
    const config = await aiConfigurationApi.getConfiguration()

    // Get aggregated usage by feature
    const { data: featureData, error: featureError } = await (supabase as any)
      .from('ai_usage_log')
      .select('feature, prompt_tokens, completion_tokens, estimated_cost_cents')
      .gte('created_at', start)
      .lte('created_at', end)

    if (featureError) {throw featureError}

    // Aggregate by feature
    const byFeatureMap = new Map<string, FeatureUsage>()
    let totalTokens = 0
    let totalCostCents = 0

    for (const row of featureData || []) {
      const tokens = (row.prompt_tokens || 0) + (row.completion_tokens || 0)
      totalTokens += tokens
      totalCostCents += row.estimated_cost_cents || 0

      const existing = byFeatureMap.get(row.feature) || {
        feature: row.feature,
        tokens: 0,
        costCents: 0,
        requestCount: 0,
      }
      existing.tokens += tokens
      existing.costCents += row.estimated_cost_cents || 0
      existing.requestCount += 1
      byFeatureMap.set(row.feature, existing)
    }

    // Get daily usage
    const { data: dailyData, error: dailyError } = await (supabase as any).rpc(
      'get_daily_ai_usage',
      {
        start_date: start,
        end_date: end,
      }
    )

    const byDay: DailyUsage[] =
      dailyError || !dailyData
        ? []
        : dailyData.map((d: { date: string; tokens: number; cost_cents: number }) => ({
            date: d.date,
            tokens: d.tokens,
            costCents: d.cost_cents,
          }))

    const budgetCents = config?.monthly_budget_cents
    const budgetUsedPercent = budgetCents
      ? Math.round((totalCostCents / budgetCents) * 100)
      : 0

    return {
      companyId: config?.company_id || '',
      periodStart: start,
      periodEnd: end,
      totalTokens,
      totalCostCents,
      budgetCents,
      budgetUsedPercent,
      byFeature: Array.from(byFeatureMap.values()),
      byDay,
    }
  },

  /**
   * Check if usage is within budget
   */
  async checkBudget(): Promise<{ withinBudget: boolean; usedPercent: number }> {
    const stats = await this.getUsageStats()
    return {
      withinBudget: stats.budgetUsedPercent < 100,
      usedPercent: stats.budgetUsedPercent,
    }
  },
}

// ============================================================================
// AI Service Wrapper (High-Level API)
// ============================================================================

export const aiService = {
  /**
   * Execute an AI completion with automatic configuration loading and usage tracking
   */
  async complete(
    feature: string,
    prompt: string,
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    const config = await aiConfigurationApi.getConfiguration()
    if (!config || !isAIEnabled(config)) {
      throw new Error('AI features are not enabled. Please configure AI in Settings → AI.')
    }

    // Check budget before making request
    const { withinBudget, usedPercent } = await aiUsageApi.checkBudget()
    if (!withinBudget) {
      throw new Error(`AI budget exceeded (${usedPercent}% used). Please increase your budget.`)
    }

    const provider = await getAIProvider(config)
    const result = await provider.complete(prompt, options)

    // Log usage
    await aiUsageApi.logUsage({
      feature,
      model: result.model,
      inputTokens: result.tokens.input,
      outputTokens: result.tokens.output,
      latencyMs: result.latencyMs,
    })

    return result
  },

  /**
   * Extract structured JSON with automatic configuration loading and usage tracking
   */
  async extractJSON<T>(
    feature: string,
    prompt: string,
    options?: JSONExtractionOptions
  ): Promise<{ data: T; tokens: TokenCount }> {
    const config = await aiConfigurationApi.getConfiguration()
    if (!config || !isAIEnabled(config)) {
      throw new Error('AI features are not enabled. Please configure AI in Settings → AI.')
    }

    const { withinBudget, usedPercent } = await aiUsageApi.checkBudget()
    if (!withinBudget) {
      throw new Error(`AI budget exceeded (${usedPercent}% used). Please increase your budget.`)
    }

    const provider = await getAIProvider(config)
    const startTime = Date.now()
    const data = await provider.extractJSON<T>(prompt, options)
    const latencyMs = Date.now() - startTime

    // Estimate tokens for JSON extraction (rough approximation)
    const inputTokens = Math.ceil(prompt.length / 4)
    const outputTokens = Math.ceil(JSON.stringify(data).length / 4)

    await aiUsageApi.logUsage({
      feature,
      model: getModelForProvider(config),
      inputTokens,
      outputTokens,
      latencyMs,
    })

    return {
      data,
      tokens: { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens },
    }
  },

  /**
   * Check if a specific AI feature is enabled
   */
  async isFeatureEnabled(
    feature: 'rfi_routing' | 'smart_summaries' | 'risk_prediction' | 'schedule_optimization' | 'document_enhancement' | 'action_item_extraction'
  ): Promise<boolean> {
    const config = await aiConfigurationApi.getConfiguration()
    if (!config || !isAIEnabled(config)) {return false}

    // Map feature names to column names
    const featureMap: Record<string, keyof AIConfiguration> = {
      rfi_routing: 'enable_rfi_routing',
      smart_summaries: 'enable_smart_summaries',
      risk_prediction: 'enable_risk_prediction',
      schedule_optimization: 'enable_schedule_optimization',
      document_enhancement: 'enable_document_enhancement',
      action_item_extraction: 'enable_action_item_extraction',
    }

    const columnName = featureMap[feature]
    if (columnName && config[columnName] !== undefined) {
      return config[columnName] as boolean
    }

    // Fallback to legacy features_enabled object
    return config.features_enabled?.[feature as keyof typeof config.features_enabled] ?? false
  },

  /**
   * Get the current provider instance
   */
  async getProvider(): Promise<AIProvider | null> {
    const config = await aiConfigurationApi.getConfiguration()
    if (!config || !isAIEnabled(config)) {return null}
    return getAIProvider(config)
  },
}
