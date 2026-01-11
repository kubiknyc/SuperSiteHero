/**
 * Agent Orchestrator
 * Central controller that coordinates agent activities including:
 * - Processing user messages with tool calling
 * - Managing conversation context
 * - Executing multi-step reasoning
 * - Handling background tasks
 */

import { supabase } from '@/lib/supabase'
import { aiService, aiConfigurationApi } from '@/lib/api/services/ai-provider'
import type {
  AgentContext,
  AgentResponse,
  AgentSession,
  AgentEvent,
  ToolCallResult,
  SuggestedAction,
} from '../types/agent'
import type {
  AgentMessage,
  ToolCall,
  StreamChunk,
  ConversationContext,
} from '../types/chat'
import type {
  Tool,
  ToolContext,
  ToolResult,
  OpenAITool,
  AnthropicTool,
} from '../types/tools'
import { toolRegistry } from '../tools/registry'
import { buildSystemPrompt, buildContextPrompt } from '../chat/prompts/system-prompt'
import { logger } from '@/lib/utils/logger'
import { createContextManager, estimateTokens } from '../utils/token-counter'

// ============================================================================
// Types
// ============================================================================

interface OrchestratorConfig {
  maxToolCalls: number
  maxTokens: number
  temperature: number
  streamResponses: boolean
}

const DEFAULT_CONFIG: OrchestratorConfig = {
  maxToolCalls: 10,
  maxTokens: 4096,
  temperature: 0.7,
  streamResponses: true,
}

interface ProcessMessageOptions {
  config?: Partial<OrchestratorConfig>
  onStreamChunk?: (chunk: StreamChunk) => void
  onConfirmationRequired?: (confirmation: ToolConfirmationRequest) => void
  abortSignal?: AbortSignal
}

interface ToolConfirmationRequest {
  id: string
  toolName: string
  toolInput: Record<string, unknown>
  description: string
  severity: 'low' | 'medium' | 'high'
  estimatedImpact?: string
  toolCall: {
    id: string
    name: string
    arguments: Record<string, unknown>
  }
}

// ============================================================================
// Orchestrator Class
// ============================================================================

export class AgentOrchestrator {
  private config: OrchestratorConfig

  constructor(config?: Partial<OrchestratorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Process a user message in conversation
   */
  async processMessage(
    session: AgentSession,
    userMessage: string,
    options?: ProcessMessageOptions
  ): Promise<AgentResponse> {
    const startTime = Date.now()
    const config = { ...this.config, ...options?.config }

    try {
      // Build context
      const context = await this.buildContext(session)

      // Save user message
      const userMsg = await this.saveMessage(session.id, {
        role: 'user',
        content: userMessage,
      })

      // Get AI configuration to determine model
      const aiConfig = await aiConfigurationApi.getConfiguration()
      const model = aiConfig?.openai_model || aiConfig?.anthropic_model || 'gpt-4o-mini'

      // Get conversation history with token-aware trimming
      const history = await this.getConversationHistory(session.id, model)

      // Get available tools for this context
      const tools = toolRegistry.getForContext(context)

      // Build messages for LLM
      const messages = this.buildLLMMessages(history, context)

      // Process with tool calling loop
      const response = await this.processWithTools(
        messages,
        tools,
        context,
        config,
        options?.onStreamChunk,
        options?.onConfirmationRequired,
        options?.abortSignal
      )

      // Update session metrics
      await this.updateSessionMetrics(session.id, response.tokens)

      return {
        ...response,
        latencyMs: Date.now() - startTime,
      }
    } catch (error) {
      logger.error('[Orchestrator] Error processing message:', error)
      throw error
    }
  }

  /**
   * Execute a background task
   */
  async executeTask(
    taskType: string,
    input: Record<string, unknown>,
    context: AgentContext
  ): Promise<ToolResult> {
    const tool = toolRegistry.get(taskType)
    if (!tool) {
      return {
        success: false,
        error: `Unknown task type: ${taskType}`,
        errorCode: 'UNKNOWN_TASK_TYPE',
      }
    }

    const toolContext: ToolContext = {
      ...context,
    }

    return tool.execute(input, toolContext)
  }

  /**
   * Handle incoming events (document upload, RFI created, etc.)
   */
  async handleEvent(event: AgentEvent): Promise<void> {
    logger.info('[Orchestrator] Handling event:', event.type)

    // Get agent configuration for the company
    const config = await this.getAgentConfig(event.companyId)
    if (!config?.is_enabled) {
      logger.debug('[Orchestrator] Agent disabled for company:', event.companyId)
      return
    }

    // Check if the feature for this event is enabled
    const featureKey = this.getFeatureKeyForEvent(event.type)
    if (featureKey && !config.features_enabled[featureKey]) {
      logger.debug('[Orchestrator] Feature disabled:', featureKey)
      return
    }

    // Create background task for the event
    await this.createTaskForEvent(event, config)
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Build agent context from session
   */
  private async buildContext(session: AgentSession): Promise<AgentContext> {
    const config = await this.getAgentConfig(session.company_id)

    return {
      sessionId: session.id,
      userId: session.user_id,
      companyId: session.company_id,
      projectId: session.project_id,
      autonomyLevel: config?.autonomy_level || 'suggest_only',
      featuresEnabled: config?.features_enabled || {
        document_processing: true,
        daily_report_summaries: true,
        rfi_routing: true,
        rfi_drafting: true,
        submittal_classification: true,
        weekly_rollups: true,
        chat_interface: true,
        background_tasks: true,
        semantic_search: true,
      },
      currentEntity: session.context_entity_type
        ? {
            type: session.context_entity_type,
            id: session.context_entity_id!,
          }
        : undefined,
      userPreferences: session.user_preferences || {},
    }
  }

  /**
   * Get conversation history for a session with token-aware management
   */
  private async getConversationHistory(
    sessionId: string,
    model?: string
  ): Promise<AgentMessage[]> {
    // Fetch more messages initially, then trim based on tokens
    const { data, error } = await supabase
      .from('agent_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(100) // Fetch more, trim by tokens

    if (error) {
      logger.error('[Orchestrator] Error fetching history:', error)
      return []
    }

    const messages = data as AgentMessage[]

    // If we have a model, use token-aware trimming
    if (model && messages.length > 10) {
      const contextManager = createContextManager(model)
      const trimmedMessages = contextManager.trimToFit(
        messages.map((m) => ({
          role: m.role,
          content: m.content,
          tool_calls: m.tool_calls,
          tool_call_id: m.tool_call_id,
        })),
        {
          preserveSystemMessage: true,
          summarizeOld: true,
          minRecentMessages: 6,
        }
      )

      // Map back to AgentMessage format (preserve IDs for messages we kept)
      const trimmedSet = new Set(trimmedMessages.map((m) => m.content))
      const result = messages.filter((m) => trimmedSet.has(m.content))

      // If we summarized old messages, add the summary as a synthetic message
      const summaryMessage = trimmedMessages.find(
        (m) => m.role === 'system' && m.content.startsWith('Previous conversation summary')
      )
      if (summaryMessage) {
        // Insert summary at the beginning
        result.unshift({
          id: 'summary',
          session_id: sessionId,
          role: 'system',
          content: summaryMessage.content,
          created_at: messages[0]?.created_at || new Date().toISOString(),
        } as AgentMessage)
      }

      const stats = contextManager.getStats(trimmedMessages)
      logger.debug('[Orchestrator] Context stats:', {
        original: messages.length,
        trimmed: result.length,
        ...stats,
      })

      return result
    }

    return messages
  }

  /**
   * Build messages array for LLM
   */
  private buildLLMMessages(
    history: AgentMessage[],
    context: AgentContext
  ): Array<{ role: string; content: string; tool_calls?: unknown; tool_call_id?: string }> {
    const systemPrompt = buildSystemPrompt(context)
    const contextPrompt = buildContextPrompt(context)

    const messages: Array<{
      role: string
      content: string
      tool_calls?: unknown
      tool_call_id?: string
    }> = [{ role: 'system', content: systemPrompt + '\n\n' + contextPrompt }]

    // Add history messages
    for (const msg of history) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role,
          content: msg.content,
          tool_calls: msg.tool_calls || undefined,
        })
      } else if (msg.role === 'tool' && msg.tool_call_id) {
        messages.push({
          role: 'tool',
          content: JSON.stringify(msg.tool_output),
          tool_call_id: msg.tool_call_id,
        })
      }
    }

    return messages
  }

  /**
   * Process message with tool calling loop
   */
  private async processWithTools(
    messages: Array<{ role: string; content: string; tool_calls?: unknown; tool_call_id?: string }>,
    tools: Tool[],
    context: AgentContext,
    config: OrchestratorConfig,
    onStreamChunk?: (chunk: StreamChunk) => void,
    onConfirmationRequired?: (confirmation: ToolConfirmationRequest) => void,
    abortSignal?: AbortSignal
  ): Promise<Omit<AgentResponse, 'latencyMs'>> {
    let toolCallCount = 0
    const toolCallResults: ToolCallResult[] = []
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let modelUsed = ''

    // Convert tools to OpenAI format
    const toolDefinitions = this.toolsToOpenAIFormat(tools)

    while (toolCallCount < config.maxToolCalls) {
      // Check for abort
      if (abortSignal?.aborted) {
        throw new Error('Request aborted')
      }

      // Call LLM
      const response = await this.callLLM(messages, toolDefinitions, config)
      totalInputTokens += response.tokens.input
      totalOutputTokens += response.tokens.output
      modelUsed = response.model

      // Check if there are tool calls
      if (response.toolCalls && response.toolCalls.length > 0) {
        // Save assistant message with tool calls
        await this.saveMessage(context.sessionId, {
          role: 'assistant',
          content: response.content || '',
          tool_calls: response.toolCalls,
        })

        // Execute tools
        for (const toolCall of response.toolCalls) {
          toolCallCount++

          // Stream tool call start
          onStreamChunk?.({
            type: 'tool_call_start',
            toolCall: {
              id: toolCall.id,
              name: toolCall.name,
            },
          })

          // Execute tool
          const tool = toolRegistry.get(toolCall.name)
          if (!tool) {
            const errorResult: ToolCallResult = {
              id: toolCall.id,
              toolName: toolCall.name,
              input: toolCall.arguments,
              output: null,
              error: `Tool not found: ${toolCall.name}`,
              executionTimeMs: 0,
            }
            toolCallResults.push(errorResult)

            // Add error to messages
            messages.push({
              role: 'tool',
              content: JSON.stringify({ error: errorResult.error }),
              tool_call_id: toolCall.id,
            })

            continue
          }

          // Check if confirmation required
          if (
            tool.requiresConfirmation &&
            context.autonomyLevel !== 'autonomous' &&
            !context.userPreferences?.autoConfirmTools
          ) {
            // Emit confirmation request instead of just skipping
            if (onConfirmationRequired) {
              const confirmationRequest: ToolConfirmationRequest = {
                id: `confirm_${toolCall.id}`,
                toolName: toolCall.name,
                toolInput: toolCall.arguments,
                description: this.generateToolConfirmationDescription(tool, toolCall.arguments),
                severity: this.assessToolSeverity(tool),
                estimatedImpact: tool.estimatedImpact,
                toolCall: {
                  id: toolCall.id,
                  name: toolCall.name,
                  arguments: toolCall.arguments,
                },
              }
              onConfirmationRequired(confirmationRequest)
            }

            // Add pending result to messages
            const pendingResult: ToolCallResult = {
              id: toolCall.id,
              toolName: toolCall.name,
              input: toolCall.arguments,
              output: null,
              error: 'Awaiting user confirmation',
              executionTimeMs: 0,
            }
            toolCallResults.push(pendingResult)

            messages.push({
              role: 'tool',
              content: JSON.stringify({
                status: 'pending_confirmation',
                message: 'This action requires your confirmation before proceeding.',
                tool: toolCall.name,
                requiresConfirmation: true,
              }),
              tool_call_id: toolCall.id,
            })

            // Stream the confirmation request
            onStreamChunk?.({
              type: 'confirmation_required',
              toolCall: {
                id: toolCall.id,
                name: toolCall.name,
              },
            } as StreamChunk)

            continue
          }

          // Execute tool
          const startTime = Date.now()
          const toolContext: ToolContext = {
            ...context,
            abortSignal,
            messageId: undefined, // Will be set after saving
          }

          try {
            const result = await tool.execute(toolCall.arguments, toolContext)
            const executionTimeMs = Date.now() - startTime

            const toolResult: ToolCallResult = {
              id: toolCall.id,
              toolName: toolCall.name,
              input: toolCall.arguments,
              output: result.data,
              error: result.error,
              executionTimeMs,
            }
            toolCallResults.push(toolResult)

            // Save tool result message
            await this.saveMessage(context.sessionId, {
              role: 'tool',
              content: JSON.stringify(result.data || result.error),
              tool_call_id: toolCall.id,
              tool_name: toolCall.name,
              tool_input: toolCall.arguments,
              tool_output: result.data,
              tool_error: result.error,
            })

            // Add to messages for next LLM call
            messages.push({
              role: 'tool',
              content: JSON.stringify(result.success ? result.data : { error: result.error }),
              tool_call_id: toolCall.id,
            })

            // Stream tool result
            onStreamChunk?.({
              type: 'tool_result',
              toolResult: {
                toolCallId: toolCall.id,
                result: result.data,
                error: result.error,
              },
            })
          } catch (error) {
            const executionTimeMs = Date.now() - startTime
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'

            const toolResult: ToolCallResult = {
              id: toolCall.id,
              toolName: toolCall.name,
              input: toolCall.arguments,
              output: null,
              error: errorMessage,
              executionTimeMs,
            }
            toolCallResults.push(toolResult)

            messages.push({
              role: 'tool',
              content: JSON.stringify({ error: errorMessage }),
              tool_call_id: toolCall.id,
            })

            onStreamChunk?.({
              type: 'tool_result',
              toolResult: {
                toolCallId: toolCall.id,
                result: null,
                error: errorMessage,
              },
            })
          }

          // Stream tool call end
          onStreamChunk?.({
            type: 'tool_call_end',
            toolCall: {
              id: toolCall.id,
              name: toolCall.name,
            },
          })
        }

        // Continue loop to get LLM response with tool results
        continue
      }

      // No tool calls - we have the final response
      // Save assistant message
      const savedMessage = await this.saveMessage(context.sessionId, {
        role: 'assistant',
        content: response.content,
        tokens_used: response.tokens.total,
        model_used: response.model,
      })

      // Stream final content
      onStreamChunk?.({
        type: 'text_delta',
        content: response.content,
      })

      onStreamChunk?.({
        type: 'message_complete',
        messageId: savedMessage.id,
        tokens: {
          input: totalInputTokens,
          output: totalOutputTokens,
        },
      })

      // Generate suggested actions
      const suggestedActions = this.generateSuggestedActions(response.content, context, tools)

      return {
        content: response.content,
        toolCalls: toolCallResults.length > 0 ? toolCallResults : undefined,
        suggestedActions,
        tokens: {
          input: totalInputTokens,
          output: totalOutputTokens,
          total: totalInputTokens + totalOutputTokens,
        },
        model: modelUsed,
      }
    }

    // Max tool calls reached
    const finalMessage =
      "I've reached the maximum number of tool calls. Here's what I was able to accomplish:\n\n" +
      toolCallResults
        .map((r) => `- ${r.toolName}: ${r.error ? `Error: ${r.error}` : 'Completed'}`)
        .join('\n')

    await this.saveMessage(context.sessionId, {
      role: 'assistant',
      content: finalMessage,
      tokens_used: totalInputTokens + totalOutputTokens,
      model_used: modelUsed,
    })

    return {
      content: finalMessage,
      toolCalls: toolCallResults,
      tokens: {
        input: totalInputTokens,
        output: totalOutputTokens,
        total: totalInputTokens + totalOutputTokens,
      },
      model: modelUsed,
    }
  }

  /**
   * Call LLM with tools
   */
  private async callLLM(
    messages: Array<{ role: string; content: string; tool_calls?: unknown; tool_call_id?: string }>,
    tools: OpenAITool[],
    config: OrchestratorConfig
  ): Promise<{
    content: string
    toolCalls?: ToolCall[]
    tokens: { input: number; output: number; total: number }
    model: string
  }> {
    // Get AI configuration
    const aiConfig = await aiConfigurationApi.getConfiguration()
    if (!aiConfig) {
      throw new Error('AI is not configured. Please configure AI in Settings → AI.')
    }

    // Check if AI is enabled (aiService.complete will do a detailed check)
    const hasAnyFeatureEnabled =
      aiConfig.is_enabled ||
      aiConfig.enable_rfi_routing ||
      aiConfig.enable_smart_summaries ||
      aiConfig.enable_action_item_extraction ||
      aiConfig.enable_risk_prediction ||
      aiConfig.enable_schedule_optimization ||
      aiConfig.enable_document_enhancement

    if (!hasAnyFeatureEnabled) {
      throw new Error('AI features are disabled. Please enable at least one AI feature in Settings → AI.')
    }

    // For now, use the existing aiService.complete
    // In the future, this should use the native function calling API
    const prompt = messages
      .map((m) => {
        if (m.role === 'system') {return `System: ${m.content}`}
        if (m.role === 'user') {return `User: ${m.content}`}
        if (m.role === 'assistant') {return `Assistant: ${m.content}`}
        if (m.role === 'tool') {return `Tool Result: ${m.content}`}
        return ''
      })
      .join('\n\n')

    // Build tool instructions
    const toolInstructions =
      tools.length > 0
        ? `\n\nYou have access to the following tools. To use a tool, respond with a JSON object in this format:
{"tool_call": {"name": "tool_name", "arguments": {...}}}

Available tools:
${tools.map((t) => `- ${t.function.name}: ${t.function.description}`).join('\n')}

If you don't need to use a tool, respond normally without the JSON format.`
        : ''

    const result = await aiService.complete('agent_chat', prompt + toolInstructions, {
      maxTokens: config.maxTokens,
      temperature: config.temperature,
    })

    // Parse tool calls from response and extract remaining text
    const { toolCalls, textContent } = this.parseToolCallsWithText(result.content)

    return {
      content: textContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      tokens: result.tokens,
      model: result.model,
    }
  }

  /**
   * Parse tool calls and extract remaining text content
   * Returns both the tool calls AND any text that wasn't part of a tool call
   */
  private parseToolCallsWithText(content: string): {
    toolCalls: ToolCall[]
    textContent: string
  } {
    const toolCalls: ToolCall[] = []
    let textContent = content

    // Only look for explicit tool_call format - don't be too aggressive
    // Pattern: {"tool_call": {"name": "...", "arguments": {...}}}
    const toolCallPattern = /\{\s*"tool_call"\s*:\s*\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*(\{[^}]*\}|\{\})\s*\}\s*\}/g

    let match
    const matches: { start: number; end: number; toolCall: ToolCall }[] = []

    while ((match = toolCallPattern.exec(content)) !== null) {
      try {
        const name = match[1]
        const argsStr = match[2]
        const args = JSON.parse(argsStr)

        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          toolCall: {
            id: `call_${Date.now()}_${toolCalls.length}`,
            name,
            arguments: args,
          },
        })

        toolCalls.push({
          id: `call_${Date.now()}_${toolCalls.length}`,
          name,
          arguments: args,
        })
      } catch {
        // Invalid JSON in arguments, skip this match
      }
    }

    // Remove tool call JSON from text content (from end to start to preserve indices)
    if (matches.length > 0) {
      matches.sort((a, b) => b.start - a.start) // Sort by position descending
      for (const m of matches) {
        textContent = textContent.slice(0, m.start) + textContent.slice(m.end)
      }

      // Clean up the remaining text
      textContent = textContent
        .replace(/^\s*```json\s*/g, '') // Remove opening code block markers
        .replace(/\s*```\s*$/g, '')     // Remove closing code block markers
        .replace(/\n{3,}/g, '\n\n')     // Collapse multiple newlines
        .trim()
    }

    return { toolCalls, textContent }
  }

  /**
   * Parse tool calls from LLM response using robust JSON parsing
   * Supports multiple tool calls and handles nested JSON properly
   */
  private parseToolCalls(content: string): ToolCall[] | undefined {
    const toolCalls: ToolCall[] = []

    try {
      // Strategy 1: Look for tool_call wrapper format
      // Matches: {"tool_call": {...}} with proper nesting
      const toolCallPattern = /\{\s*"tool_call"\s*:\s*(\{[\s\S]*?\})\s*\}/g
      let match

      while ((match = toolCallPattern.exec(content)) !== null) {
        try {
          // Extract the inner tool call object
          const innerJson = match[1]
          const toolData = this.parseNestedJSON(innerJson)

          if (toolData && toolData.name) {
            toolCalls.push({
              id: `call_${Date.now()}_${toolCalls.length}`,
              name: toolData.name as string,
              arguments: (toolData.arguments as Record<string, unknown>) || {},
            })
          }
        } catch {
          // Continue to next match
        }
      }

      if (toolCalls.length > 0) {
        return toolCalls
      }

      // Strategy 2: Look for direct tool format (name + arguments at root)
      // Matches: {"name": "tool_name", "arguments": {...}}
      const directPattern = /\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*(\{[\s\S]*?\})\s*\}/g

      while ((match = directPattern.exec(content)) !== null) {
        try {
          const name = match[1]
          const argsJson = match[2]
          const args = JSON.parse(argsJson)

          toolCalls.push({
            id: `call_${Date.now()}_${toolCalls.length}`,
            name,
            arguments: args,
          })
        } catch {
          // Continue to next match
        }
      }

      if (toolCalls.length > 0) {
        return toolCalls
      }

      // Strategy 3: Try to find any JSON object that looks like a tool call
      const jsonObjects = this.extractAllJSONObjects(content)

      for (const obj of jsonObjects) {
        if (obj.tool_call && typeof obj.tool_call === 'object') {
          const tc = obj.tool_call as Record<string, unknown>
          if (tc.name) {
            toolCalls.push({
              id: `call_${Date.now()}_${toolCalls.length}`,
              name: tc.name as string,
              arguments: (tc.arguments as Record<string, unknown>) || {},
            })
          }
        } else if (obj.name && (obj.arguments !== undefined || obj.input !== undefined)) {
          // Direct tool call format
          toolCalls.push({
            id: `call_${Date.now()}_${toolCalls.length}`,
            name: obj.name as string,
            arguments: (obj.arguments || obj.input || {}) as Record<string, unknown>,
          })
        }
      }

      return toolCalls.length > 0 ? toolCalls : undefined
    } catch (error) {
      logger.debug('[Orchestrator] Tool call parsing failed:', error)
      return undefined
    }
  }

  /**
   * Parse nested JSON with proper brace matching
   */
  private parseNestedJSON(jsonStr: string): Record<string, unknown> | null {
    try {
      return JSON.parse(jsonStr)
    } catch {
      // Try to fix common issues
      try {
        // Remove trailing commas
        const fixed = jsonStr.replace(/,\s*([}\]])/g, '$1')
        return JSON.parse(fixed)
      } catch {
        return null
      }
    }
  }

  /**
   * Extract all valid JSON objects from a string
   */
  private extractAllJSONObjects(content: string): Record<string, unknown>[] {
    const objects: Record<string, unknown>[] = []
    let depth = 0
    let start = -1

    for (let i = 0; i < content.length; i++) {
      const char = content[i]

      if (char === '{') {
        if (depth === 0) {
          start = i
        }
        depth++
      } else if (char === '}') {
        depth--
        if (depth === 0 && start !== -1) {
          const jsonStr = content.substring(start, i + 1)
          try {
            const parsed = JSON.parse(jsonStr)
            if (typeof parsed === 'object' && parsed !== null) {
              objects.push(parsed)
            }
          } catch {
            // Not valid JSON, continue
          }
          start = -1
        }
      }
    }

    return objects
  }

  /**
   * Convert tools to OpenAI format
   */
  private toolsToOpenAIFormat(tools: Tool[]): OpenAITool[] {
    return tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }))
  }

  /**
   * Save a message to the database
   */
  private async saveMessage(
    sessionId: string,
    message: Partial<AgentMessage>
  ): Promise<AgentMessage> {
    const { data, error } = await supabase
      .from('agent_messages')
      .insert({
        session_id: sessionId,
        role: message.role,
        content: message.content || '',
        tool_calls: message.tool_calls,
        tool_call_id: message.tool_call_id,
        tool_name: message.tool_name,
        tool_input: message.tool_input,
        tool_output: message.tool_output,
        tool_error: message.tool_error,
        tokens_used: message.tokens_used,
        model_used: message.model_used,
      })
      .select()
      .single()

    if (error) {
      logger.error('[Orchestrator] Error saving message:', error)
      throw error
    }

    return data as AgentMessage
  }

  /**
   * Update session metrics
   */
  private async updateSessionMetrics(
    sessionId: string,
    tokens: { input: number; output: number; total: number }
  ): Promise<void> {
    // The trigger handles incrementing message_count and tokens
    // We just need to update cost if needed
    const costCents = Math.ceil(tokens.total * 0.0001) // Rough estimate

    await supabase
      .from('agent_sessions')
      .update({
        total_cost_cents: supabase.rpc('increment_cost', { amount: costCents }),
      })
      .eq('id', sessionId)
  }

  /**
   * Get agent configuration for a company
   */
  private async getAgentConfig(companyId: string) {
    const { data, error } = await supabase
      .from('agent_configuration')
      .select('*')
      .eq('company_id', companyId)
      .single()

    if (error && error.code !== 'PGRST116') {
      logger.error('[Orchestrator] Error fetching agent config:', error)
    }

    return data
  }

  /**
   * Get feature key for event type
   */
  private getFeatureKeyForEvent(eventType: string): keyof typeof defaultFeatures | null {
    const defaultFeatures = {
      document_processing: true,
      daily_report_summaries: true,
      rfi_routing: true,
      rfi_drafting: true,
      submittal_classification: true,
      weekly_rollups: true,
      chat_interface: true,
      background_tasks: true,
      semantic_search: true,
    }

    const mapping: Record<string, keyof typeof defaultFeatures> = {
      document_uploaded: 'document_processing',
      rfi_created: 'rfi_routing',
      submittal_created: 'submittal_classification',
      daily_report_submitted: 'daily_report_summaries',
    }

    return mapping[eventType] || null
  }

  /**
   * Create a background task for an event
   */
  private async createTaskForEvent(
    event: AgentEvent,
    _config: Record<string, unknown>
  ): Promise<void> {
    const taskTypeMapping: Record<string, string> = {
      document_uploaded: 'document_classify',
      rfi_created: 'rfi_suggest_routing',
      submittal_created: 'submittal_classify',
      daily_report_submitted: 'report_summarize',
    }

    const taskType = taskTypeMapping[event.type]
    if (!taskType) {return}

    await supabase.from('agent_tasks').insert({
      company_id: event.companyId,
      project_id: event.projectId,
      task_type: taskType,
      status: 'pending',
      priority: 100,
      input_data: {
        entity_type: event.entityType,
        entity_id: event.entityId,
        event_data: event.data,
      },
      target_entity_type: event.entityType,
      target_entity_id: event.entityId,
      created_by: event.userId,
    })
  }

  /**
   * Generate a human-readable description for tool confirmation
   */
  private generateToolConfirmationDescription(
    tool: Tool,
    args: Record<string, unknown>
  ): string {
    // Tool-specific descriptions
    const descriptions: Record<string, (args: Record<string, unknown>) => string> = {
      'delete_document': (a) => `Delete the document "${a.document_name || a.document_id}"`,
      'delete_rfi': (a) => `Delete RFI #${a.rfi_number || a.rfi_id}`,
      'send_notification': (a) => `Send notification to ${a.recipient || 'recipients'}`,
      'update_status': (a) => `Update status of ${a.entity_type || 'item'} to "${a.status}"`,
      'create_rfi': (a) => `Create a new RFI: "${a.subject || 'Untitled'}"`,
      'submit_daily_report': (a) => `Submit daily report for ${a.date || 'today'}`,
      'assign_task': (a) => `Assign task to ${a.assignee || 'user'}`,
      'schedule_inspection': (a) => `Schedule inspection for ${a.date || 'a date'}`,
      'approve_submittal': (a) => `Approve submittal "${a.submittal_name || a.submittal_id}"`,
      'reject_submittal': (a) => `Reject submittal "${a.submittal_name || a.submittal_id}"`,
    }

    const generator = descriptions[tool.name]
    if (generator) {
      return generator(args)
    }

    // Fallback to tool description with args summary
    const argSummary = Object.entries(args)
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${String(v).slice(0, 30)}`)
      .join(', ')

    return `${tool.description}${argSummary ? ` (${argSummary})` : ''}`
  }

  /**
   * Assess the severity level of a tool action
   */
  private assessToolSeverity(tool: Tool): 'low' | 'medium' | 'high' {
    // High severity: destructive or irreversible actions
    const highSeverityTools = [
      'delete_document',
      'delete_rfi',
      'delete_project',
      'delete_user',
      'archive_project',
      'send_external_notification',
      'approve_payment',
      'finalize_report',
    ]

    // Medium severity: modifying actions
    const mediumSeverityTools = [
      'update_status',
      'assign_task',
      'reassign_task',
      'approve_submittal',
      'reject_submittal',
      'schedule_inspection',
      'submit_daily_report',
      'create_rfi',
      'send_notification',
    ]

    if (highSeverityTools.includes(tool.name)) {
      return 'high'
    }

    if (mediumSeverityTools.includes(tool.name)) {
      return 'medium'
    }

    // Check tool's own severity if defined
    if (tool.severity) {
      return tool.severity
    }

    return 'low'
  }

  /**
   * Generate suggested actions based on response
   */
  private generateSuggestedActions(
    _content: string,
    context: AgentContext,
    _tools: Tool[]
  ): SuggestedAction[] {
    const suggestions: SuggestedAction[] = []

    // Add context-aware suggestions
    if (context.currentEntity) {
      if (context.currentEntity.type === 'rfi') {
        suggestions.push({
          id: 'draft_response',
          label: 'Draft Response',
          description: 'Generate a draft response for this RFI',
          toolName: 'draft_rfi_response',
          toolInput: { rfi_id: context.currentEntity.id },
          icon: 'PenLine',
        })
      }

      if (context.currentEntity.type === 'document') {
        suggestions.push({
          id: 'classify_document',
          label: 'Classify Document',
          description: 'Automatically classify this document',
          toolName: 'classify_document',
          toolInput: { document_id: context.currentEntity.id },
          icon: 'Tags',
        })
      }
    }

    // Add general suggestions
    suggestions.push({
      id: 'search',
      label: 'Search',
      description: 'Search across project data',
      toolName: 'semantic_search',
      toolInput: {},
      icon: 'Search',
    })

    return suggestions.slice(0, 3) // Max 3 suggestions
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const agentOrchestrator = new AgentOrchestrator()
