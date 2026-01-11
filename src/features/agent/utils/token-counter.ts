/**
 * Token Counter Utility
 * Estimates token counts for text content to manage LLM context windows.
 *
 * Uses a simplified BPE-like estimation based on common patterns.
 * For production accuracy, consider using tiktoken or the provider's tokenizer.
 */

// Model context window sizes
export const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  // OpenAI models
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,
  'gpt-4-turbo': 128000,
  'gpt-4': 8192,
  'gpt-3.5-turbo': 16385,
  // Anthropic models
  'claude-3-opus-20240229': 200000,
  'claude-3-5-sonnet-20241022': 200000,
  'claude-3-haiku-20240307': 200000,
  'claude-3-5-haiku-20241022': 200000,
  // Local models (typical defaults)
  'llama3': 8192,
  'mistral': 32768,
  'codellama': 16384,
  'phi3': 4096,
}

// Reserved tokens for response generation
const RESPONSE_RESERVED_TOKENS = 4096

/**
 * Estimate token count for a string using BPE-like heuristics
 * Average English text is ~4 characters per token for GPT models
 */
export function estimateTokens(text: string): number {
  if (!text) {return 0}

  // Count different character types
  const words = text.split(/\s+/).filter(Boolean)
  const codeBlocks = (text.match(/```[\s\S]*?```/g) || []).join('').length
  const punctuation = (text.match(/[.,!?;:'"()\[\]{}]/g) || []).length
  const numbers = (text.match(/\d+/g) || []).join('').length
  const specialChars = (text.match(/[^a-zA-Z0-9\s.,!?;:'"()\[\]{}]/g) || []).length

  // Base estimation: ~4 chars per token for normal text
  let baseTokens = Math.ceil(text.length / 4)

  // Adjustments for different content types
  // Code tends to have more tokens per character
  if (codeBlocks > 0) {
    const codeRatio = codeBlocks / text.length
    baseTokens += Math.ceil(codeBlocks * 0.3 * codeRatio) // Code is ~30% more token-dense
  }

  // Technical content with many special characters
  if (specialChars > text.length * 0.1) {
    baseTokens = Math.ceil(baseTokens * 1.2)
  }

  // Short words are often full tokens
  const shortWords = words.filter((w) => w.length <= 4).length
  if (shortWords > words.length * 0.5) {
    baseTokens = Math.ceil(baseTokens * 1.1)
  }

  // JSON content tends to have more tokens
  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      JSON.parse(text)
      // It's valid JSON - add 20% overhead
      baseTokens = Math.ceil(baseTokens * 1.2)
    } catch {
      // Not JSON, keep base estimate
    }
  }

  return Math.max(1, baseTokens)
}

/**
 * Estimate tokens for a chat message
 */
export function estimateMessageTokens(message: {
  role: string
  content: string
  tool_calls?: unknown
}): number {
  let tokens = 4 // Base overhead for message structure

  // Role token
  tokens += 1

  // Content tokens
  tokens += estimateTokens(message.content)

  // Tool calls (if present)
  if (message.tool_calls) {
    tokens += estimateTokens(JSON.stringify(message.tool_calls))
  }

  return tokens
}

/**
 * Get the available context window for a model
 */
export function getContextWindow(model: string): number {
  return MODEL_CONTEXT_WINDOWS[model] || 8192 // Default to 8k if unknown
}

/**
 * Get the maximum tokens available for the conversation
 * (context window minus reserved response tokens)
 */
export function getMaxConversationTokens(model: string): number {
  const window = getContextWindow(model)
  return window - RESPONSE_RESERVED_TOKENS
}

interface Message {
  role: string
  content: string
  tool_calls?: unknown
  tool_call_id?: string
}

/**
 * Context manager for maintaining conversation history within token limits
 */
export class ContextManager {
  private model: string
  private maxTokens: number
  private systemPromptTokens: number = 0

  constructor(model: string, systemPrompt?: string) {
    this.model = model
    this.maxTokens = getMaxConversationTokens(model)

    if (systemPrompt) {
      this.systemPromptTokens = estimateTokens(systemPrompt) + 4 // +4 for message structure
    }
  }

  /**
   * Get available tokens for conversation history
   */
  getAvailableTokens(): number {
    return this.maxTokens - this.systemPromptTokens
  }

  /**
   * Trim messages to fit within context window
   * Keeps the most recent messages, with optional summarization of older ones
   */
  trimToFit(
    messages: Message[],
    options?: {
      preserveSystemMessage?: boolean
      summarizeOld?: boolean
      minRecentMessages?: number
    }
  ): Message[] {
    const {
      preserveSystemMessage = true,
      summarizeOld = false,
      minRecentMessages = 4,
    } = options || {}

    const availableTokens = this.getAvailableTokens()

    // Calculate tokens for each message
    const messageTokens = messages.map((msg) => ({
      message: msg,
      tokens: estimateMessageTokens(msg),
    }))

    // Start from the end (most recent) and work backwards
    const result: Message[] = []
    let totalTokens = 0
    let recentCount = 0

    // First, ensure we keep minimum recent messages
    for (let i = messageTokens.length - 1; i >= 0 && recentCount < minRecentMessages; i--) {
      const { message, tokens } = messageTokens[i]

      // Skip system messages if we're preserving them separately
      if (preserveSystemMessage && message.role === 'system') {continue}

      result.unshift(message)
      totalTokens += tokens
      recentCount++
    }

    // Then add older messages if we have room
    for (let i = messageTokens.length - 1 - recentCount; i >= 0; i--) {
      const { message, tokens } = messageTokens[i]

      // Skip system messages
      if (preserveSystemMessage && message.role === 'system') {continue}

      // Check if we have room
      if (totalTokens + tokens > availableTokens) {
        // No more room - optionally summarize remaining messages
        if (summarizeOld && i > 0) {
          const oldMessages = messageTokens.slice(0, i + 1)
          const summary = this.generateConversationSummary(
            oldMessages.map((m) => m.message)
          )
          result.unshift({
            role: 'system',
            content: `Previous conversation summary:\n${summary}`,
          })
        }
        break
      }

      result.unshift(message)
      totalTokens += tokens
    }

    return result
  }

  /**
   * Generate a summary of older messages (for context compression)
   */
  private generateConversationSummary(messages: Message[]): string {
    // Simple extractive summary - in production, use LLM for this
    const userQuestions = messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content.slice(0, 100))
      .slice(-3)

    const assistantActions = messages
      .filter((m) => m.role === 'assistant' && m.tool_calls)
      .map((m) => {
        const tools = m.tool_calls as Array<{ name: string }> | undefined
        return tools?.map((t) => t.name).join(', ') || ''
      })
      .filter(Boolean)
      .slice(-5)

    let summary = 'Earlier in this conversation:\n'

    if (userQuestions.length > 0) {
      summary += `- User asked about: ${userQuestions.join('; ')}\n`
    }

    if (assistantActions.length > 0) {
      summary += `- Tools used: ${assistantActions.join(', ')}\n`
    }

    return summary
  }

  /**
   * Check if a message would exceed the context window
   */
  wouldExceedLimit(currentTokens: number, newMessage: Message): boolean {
    const newTokens = estimateMessageTokens(newMessage)
    return currentTokens + newTokens > this.getAvailableTokens()
  }

  /**
   * Get token usage statistics
   */
  getStats(messages: Message[]): {
    totalTokens: number
    usedPercent: number
    remaining: number
    messageCount: number
  } {
    const totalTokens = messages.reduce(
      (sum, msg) => sum + estimateMessageTokens(msg),
      this.systemPromptTokens
    )

    return {
      totalTokens,
      usedPercent: Math.round((totalTokens / this.maxTokens) * 100),
      remaining: Math.max(0, this.maxTokens - totalTokens),
      messageCount: messages.length,
    }
  }
}

/**
 * Create a context manager for a model
 */
export function createContextManager(model: string, systemPrompt?: string): ContextManager {
  return new ContextManager(model, systemPrompt)
}
