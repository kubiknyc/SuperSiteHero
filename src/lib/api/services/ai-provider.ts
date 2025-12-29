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

    const messages: Array<{ role: string; content: string }> = []

    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt })
    }
    messages.push({ role: 'user', content: prompt })

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
        stop: options?.stopSequences,
        response_format:
          options?.responseFormat === 'json' ? { type: 'json_object' } : undefined,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`)
    }

    const data = await response.json()
    const latencyMs = Date.now() - startTime

    return {
      content: data.choices[0]?.message?.content || '',
      tokens: {
        input: data.usage?.prompt_tokens || 0,
        output: data.usage?.completion_tokens || 0,
        total: data.usage?.total_tokens || 0,
      },
      model,
      finishReason: this.mapFinishReason(data.choices[0]?.finish_reason),
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
    this.defaultModel = defaultModel || 'claude-3-5-haiku-latest'
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<CompletionResult> {
    const startTime = Date.now()
    const model = options?.model || this.defaultModel

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: options?.maxTokens ?? 2048,
        system: options?.systemPrompt,
        messages: [{ role: 'user', content: prompt }],
        temperature: options?.temperature ?? 0.7,
        stop_sequences: options?.stopSequences,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`)
    }

    const data = await response.json()
    const latencyMs = Date.now() - startTime

    const content =
      data.content?.find((block: { type: string }) => block.type === 'text')?.text || ''

    return {
      content,
      tokens: {
        input: data.usage?.input_tokens || 0,
        output: data.usage?.output_tokens || 0,
        total: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
      model,
      finishReason: this.mapStopReason(data.stop_reason),
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
    return ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-opus-latest']
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

export function getAIProvider(config: AIConfiguration): AIProvider {
  switch (config.provider) {
    case 'openai':
      if (!config.api_key_encrypted) {
        throw new Error('OpenAI API key not configured')
      }
      return new OpenAIProvider(config.api_key_encrypted, config.model_preference)

    case 'anthropic':
      if (!config.api_key_encrypted) {
        throw new Error('Anthropic API key not configured')
      }
      return new AnthropicProvider(config.api_key_encrypted, config.model_preference)

    case 'local':
      return new LocalProvider(undefined, config.model_preference)

    default:
      throw new Error(`Unknown AI provider: ${config.provider}`)
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

    if (existing) {
      const { data, error } = await (supabase as any)
        .from('ai_configuration')
        .update({
          ...dto,
          api_key_encrypted: dto.api_key,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {throw error}
      return data as AIConfiguration
    } else {
      // Create new configuration
      const { data, error } = await (supabase as any)
        .from('ai_configuration')
        .insert({
          provider: dto.provider || 'openai',
          api_key_encrypted: dto.api_key,
          model_preference: dto.model_preference || 'gpt-4o-mini',
          is_enabled: dto.is_enabled ?? true,
          monthly_budget_cents: dto.monthly_budget_cents,
          features_enabled: dto.features_enabled || {
            rfi_routing: true,
            smart_summaries: true,
            risk_prediction: true,
            schedule_optimization: true,
            document_enhancement: true,
          },
        })
        .select()
        .single()

      if (error) {throw error}
      return data as AIConfiguration
    }
  },

  /**
   * Test AI configuration by making a simple request
   */
  async testConfiguration(config: AIConfiguration): Promise<{ success: boolean; error?: string }> {
    try {
      const provider = getAIProvider(config)
      await provider.complete('Say "Hello" in exactly one word.', {
        maxTokens: 10,
        temperature: 0,
      })
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

    const { error } = await (supabase as any).from('ai_usage_log').insert({
      feature: params.feature,
      model: params.model,
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      cost_cents: costCents,
      latency_ms: params.latencyMs,
      request_metadata: params.metadata,
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
      .select('feature, input_tokens, output_tokens, cost_cents')
      .gte('created_at', start)
      .lte('created_at', end)

    if (featureError) {throw featureError}

    // Aggregate by feature
    const byFeatureMap = new Map<string, FeatureUsage>()
    let totalTokens = 0
    let totalCostCents = 0

    for (const row of featureData || []) {
      const tokens = row.input_tokens + row.output_tokens
      totalTokens += tokens
      totalCostCents += row.cost_cents

      const existing = byFeatureMap.get(row.feature) || {
        feature: row.feature,
        tokens: 0,
        costCents: 0,
        requestCount: 0,
      }
      existing.tokens += tokens
      existing.costCents += row.cost_cents
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
    if (!config || !config.is_enabled) {
      throw new Error('AI features are not enabled')
    }

    // Check budget before making request
    const { withinBudget, usedPercent } = await aiUsageApi.checkBudget()
    if (!withinBudget) {
      throw new Error(`AI budget exceeded (${usedPercent}% used). Please increase your budget.`)
    }

    const provider = getAIProvider(config)
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
    if (!config || !config.is_enabled) {
      throw new Error('AI features are not enabled')
    }

    const { withinBudget, usedPercent } = await aiUsageApi.checkBudget()
    if (!withinBudget) {
      throw new Error(`AI budget exceeded (${usedPercent}% used). Please increase your budget.`)
    }

    const provider = getAIProvider(config)
    const startTime = Date.now()
    const data = await provider.extractJSON<T>(prompt, options)
    const latencyMs = Date.now() - startTime

    // Estimate tokens for JSON extraction (rough approximation)
    const inputTokens = Math.ceil(prompt.length / 4)
    const outputTokens = Math.ceil(JSON.stringify(data).length / 4)

    await aiUsageApi.logUsage({
      feature,
      model: config.model_preference,
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
    feature: keyof AIConfiguration['features_enabled']
  ): Promise<boolean> {
    const config = await aiConfigurationApi.getConfiguration()
    if (!config || !config.is_enabled) {return false}
    return config.features_enabled?.[feature] ?? false
  },

  /**
   * Get the current provider instance
   */
  async getProvider(): Promise<AIProvider | null> {
    const config = await aiConfigurationApi.getConfiguration()
    if (!config || !config.is_enabled) {return null}
    return getAIProvider(config)
  },
}
