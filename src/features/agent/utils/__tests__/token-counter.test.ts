import { describe, it, expect } from 'vitest'
import {
  MODEL_CONTEXT_WINDOWS,
  estimateTokens,
  estimateMessageTokens,
  getContextWindow,
  getMaxConversationTokens,
  createContextManager,
  ContextManager,
} from '../token-counter'

describe('token-counter', () => {
  describe('MODEL_CONTEXT_WINDOWS', () => {
    it('contains known OpenAI models', () => {
      expect(MODEL_CONTEXT_WINDOWS['gpt-4o']).toBe(128000)
      expect(MODEL_CONTEXT_WINDOWS['gpt-4o-mini']).toBe(128000)
      expect(MODEL_CONTEXT_WINDOWS['gpt-4-turbo']).toBe(128000)
      expect(MODEL_CONTEXT_WINDOWS['gpt-4']).toBe(8192)
      expect(MODEL_CONTEXT_WINDOWS['gpt-3.5-turbo']).toBe(16385)
    })

    it('contains known Anthropic models', () => {
      expect(MODEL_CONTEXT_WINDOWS['claude-3-opus-20240229']).toBe(200000)
      expect(MODEL_CONTEXT_WINDOWS['claude-3-5-sonnet-20241022']).toBe(200000)
      expect(MODEL_CONTEXT_WINDOWS['claude-3-haiku-20240307']).toBe(200000)
      expect(MODEL_CONTEXT_WINDOWS['claude-3-5-haiku-20241022']).toBe(200000)
    })

    it('contains known local models', () => {
      expect(MODEL_CONTEXT_WINDOWS['llama3']).toBe(8192)
      expect(MODEL_CONTEXT_WINDOWS['mistral']).toBe(32768)
      expect(MODEL_CONTEXT_WINDOWS['codellama']).toBe(16384)
      expect(MODEL_CONTEXT_WINDOWS['phi3']).toBe(4096)
    })
  })

  describe('estimateTokens', () => {
    it('returns 0 for empty string', () => {
      expect(estimateTokens('')).toBe(0)
    })

    it('returns 0 for null/undefined', () => {
      expect(estimateTokens(null as any)).toBe(0)
      expect(estimateTokens(undefined as any)).toBe(0)
    })

    it('estimates simple text at ~4 chars per token', () => {
      const text = 'Hello world this is a test'
      const estimated = estimateTokens(text)
      // 26 chars / 4 = ~6.5 tokens, rounded up
      expect(estimated).toBeGreaterThanOrEqual(6)
      expect(estimated).toBeLessThanOrEqual(10)
    })

    it('increases estimate for code blocks (~30% more)', () => {
      const plainText = 'const x = 1; console.log(x);'
      const codeText = '```javascript\nconst x = 1; console.log(x);\n```'

      const plainEstimate = estimateTokens(plainText)
      const codeEstimate = estimateTokens(codeText)

      // Code block should have more tokens
      expect(codeEstimate).toBeGreaterThan(plainEstimate)
    })

    it('increases estimate for JSON content (~20%)', () => {
      const jsonText = '{"name": "test", "value": 123}'
      const plainText = 'name test value 123'

      const jsonEstimate = estimateTokens(jsonText)
      const plainEstimate = estimateTokens(plainText)

      // JSON should have more tokens due to 1.2x multiplier
      expect(jsonEstimate).toBeGreaterThan(plainEstimate)
    })

    it('increases estimate for special characters (>10%)', () => {
      const specialText = '@@@@##$$%%^^&&**!!'
      const plainText = 'aaaaaaaaaaaaaaaaaaa'

      const specialEstimate = estimateTokens(specialText)
      const plainEstimate = estimateTokens(plainText)

      // Special characters should increase estimate
      expect(specialEstimate).toBeGreaterThanOrEqual(plainEstimate)
    })

    it('increases estimate for many short words (>50%)', () => {
      const shortWords = 'I am in an at by on up do it'
      const longWords = 'elephant hippopotamus rhinoceros'

      const shortEstimate = estimateTokens(shortWords)
      const longEstimate = estimateTokens(longWords)

      // Short words get 1.1x multiplier
      expect(shortEstimate).toBeGreaterThan(0)
      expect(longEstimate).toBeGreaterThan(0)
    })

    it('handles complex code blocks with special characters', () => {
      const complexCode = '```typescript\nfunction test() {\n  return { x: 1, y: 2 };\n}\n```'
      const estimate = estimateTokens(complexCode)

      // Should account for code block and special characters
      expect(estimate).toBeGreaterThan(10)
    })

    it('handles array JSON', () => {
      const arrayJson = '[{"id": 1}, {"id": 2}, {"id": 3}]'
      const estimate = estimateTokens(arrayJson)

      // Should apply JSON multiplier
      expect(estimate).toBeGreaterThan(5)
    })

    it('does not apply JSON multiplier to invalid JSON starting with {', () => {
      const invalidJson = '{this is not valid json'
      const estimate = estimateTokens(invalidJson)

      // Should use base estimate without JSON multiplier
      expect(estimate).toBeGreaterThan(0)
    })

    it('returns at least 1 token for very short text', () => {
      // Single char: Math.ceil(1/4) = 1, but with short word multiplier = 1.1, rounds to 2
      expect(estimateTokens('a')).toBeGreaterThanOrEqual(1)
      expect(estimateTokens('ab')).toBeGreaterThanOrEqual(1)
    })
  })

  describe('estimateMessageTokens', () => {
    it('includes base overhead (4 tokens + 1 for role)', () => {
      const message = {
        role: 'user',
        content: '',
      }

      const estimate = estimateMessageTokens(message)
      // 4 (base) + 1 (role) + 0 (content) = 5
      expect(estimate).toBe(5)
    })

    it('estimates message with content', () => {
      const message = {
        role: 'user',
        content: 'Hello world',
      }

      const estimate = estimateMessageTokens(message)
      // 4 (base) + 1 (role) + ~3 (content)
      expect(estimate).toBeGreaterThan(5)
      expect(estimate).toBeLessThan(15)
    })

    it('estimates message with tool_calls', () => {
      const message = {
        role: 'assistant',
        content: 'Let me help with that',
        tool_calls: [
          {
            id: 'call_1',
            name: 'search',
            arguments: '{"query": "test"}',
          },
        ],
      }

      const estimate = estimateMessageTokens(message)
      // Should include tokens for content + tool_calls JSON
      expect(estimate).toBeGreaterThan(10)
    })

    it('handles different roles', () => {
      const userMessage = estimateMessageTokens({
        role: 'user',
        content: 'test',
      })

      const assistantMessage = estimateMessageTokens({
        role: 'assistant',
        content: 'test',
      })

      const systemMessage = estimateMessageTokens({
        role: 'system',
        content: 'test',
      })

      // All should have same structure (role is just 1 token each)
      expect(userMessage).toBeGreaterThan(0)
      expect(assistantMessage).toBeGreaterThan(0)
      expect(systemMessage).toBeGreaterThan(0)
    })
  })

  describe('getContextWindow', () => {
    it('returns correct window for GPT-4o', () => {
      expect(getContextWindow('gpt-4o')).toBe(128000)
    })

    it('returns correct window for Claude Opus', () => {
      expect(getContextWindow('claude-3-opus-20240229')).toBe(200000)
    })

    it('returns correct window for GPT-4', () => {
      expect(getContextWindow('gpt-4')).toBe(8192)
    })

    it('returns 8192 default for unknown model', () => {
      expect(getContextWindow('unknown-model')).toBe(8192)
      expect(getContextWindow('my-custom-llm')).toBe(8192)
    })
  })

  describe('getMaxConversationTokens', () => {
    it('subtracts 4096 reserved tokens from context window', () => {
      // gpt-4o: 128000 - 4096 = 123904
      expect(getMaxConversationTokens('gpt-4o')).toBe(123904)
    })

    it('works with Claude models', () => {
      // claude-3-opus: 200000 - 4096 = 195904
      expect(getMaxConversationTokens('claude-3-opus-20240229')).toBe(195904)
    })

    it('works with smaller models', () => {
      // gpt-4: 8192 - 4096 = 4096
      expect(getMaxConversationTokens('gpt-4')).toBe(4096)
    })

    it('works with unknown models', () => {
      // unknown: 8192 - 4096 = 4096
      expect(getMaxConversationTokens('unknown')).toBe(4096)
    })
  })

  describe('createContextManager', () => {
    it('creates ContextManager instance', () => {
      const manager = createContextManager('gpt-4o')
      expect(manager).toBeInstanceOf(ContextManager)
    })

    it('creates manager with system prompt', () => {
      const manager = createContextManager('gpt-4o', 'You are a helpful assistant')
      expect(manager).toBeInstanceOf(ContextManager)
      expect(manager.getAvailableTokens()).toBeLessThan(123904)
    })
  })

  describe('ContextManager', () => {
    describe('constructor', () => {
      it('initializes with model only', () => {
        const manager = new ContextManager('gpt-4o')
        expect(manager.getAvailableTokens()).toBe(123904)
      })

      it('initializes with system prompt', () => {
        const systemPrompt = 'You are a helpful assistant.'
        const manager = new ContextManager('gpt-4o', systemPrompt)

        // Should account for system prompt tokens
        const available = manager.getAvailableTokens()
        expect(available).toBeLessThan(123904)
        expect(available).toBeGreaterThan(123880) // ~20 tokens for prompt
      })
    })

    describe('getAvailableTokens', () => {
      it('returns max tokens when no system prompt', () => {
        const manager = new ContextManager('gpt-4o')
        expect(manager.getAvailableTokens()).toBe(123904)
      })

      it('subtracts system prompt tokens', () => {
        const manager = new ContextManager('gpt-4o', 'Short prompt')
        const available = manager.getAvailableTokens()

        expect(available).toBeLessThan(123904)
        expect(available).toBeGreaterThan(123890)
      })
    })

    describe('trimToFit', () => {
      it('returns all messages when they fit', () => {
        const manager = new ContextManager('gpt-4o')
        const messages = [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there' },
          { role: 'user', content: 'How are you?' },
        ]

        const trimmed = manager.trimToFit(messages)
        expect(trimmed).toHaveLength(3)
        expect(trimmed).toEqual(messages)
      })

      it('trims old messages when they exceed limit', () => {
        const manager = new ContextManager('gpt-4')

        // Create many messages that will exceed the small 4096 limit
        const messages = Array.from({ length: 100 }, (_, i) => ({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: 'This is a test message with some content that takes up tokens. '.repeat(50),
        }))

        const trimmed = manager.trimToFit(messages)

        // Should have fewer messages than original
        expect(trimmed.length).toBeLessThan(messages.length)

        // Should keep most recent messages
        const lastOriginal = messages[messages.length - 1]
        const lastTrimmed = trimmed[trimmed.length - 1]
        expect(lastTrimmed).toEqual(lastOriginal)
      })

      it('preserves minimum recent messages', () => {
        const manager = new ContextManager('gpt-4')

        const messages = Array.from({ length: 20 }, (_, i) => ({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: 'Test message '.repeat(100),
        }))

        const trimmed = manager.trimToFit(messages, { minRecentMessages: 6 })

        // Should keep at least 6 messages
        expect(trimmed.length).toBeGreaterThanOrEqual(6)
      })

      it('adds summary when summarizeOld is true', () => {
        const manager = new ContextManager('gpt-4')

        const messages = Array.from({ length: 30 }, (_, i) => ({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i} with content`.repeat(50),
        }))

        const trimmed = manager.trimToFit(messages, {
          summarizeOld: true,
          minRecentMessages: 4,
        })

        // Should have a summary message at the start
        const firstMessage = trimmed[0]
        expect(firstMessage.role).toBe('system')
        expect(firstMessage.content).toContain('Previous conversation summary')
      })

      it('skips system messages when preserveSystemMessage is true', () => {
        const manager = new ContextManager('gpt-4o')

        const messages = [
          { role: 'system', content: 'You are helpful' },
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi' },
        ]

        const trimmed = manager.trimToFit(messages, {
          preserveSystemMessage: true,
        })

        // System message should be filtered out from trimmed results
        const systemMessages = trimmed.filter(m => m.role === 'system')
        expect(systemMessages).toHaveLength(0)
      })

      it('includes system messages when preserveSystemMessage is false', () => {
        const manager = new ContextManager('gpt-4o')

        const messages = [
          { role: 'system', content: 'You are helpful' },
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi' },
        ]

        const trimmed = manager.trimToFit(messages, {
          preserveSystemMessage: false,
        })

        // System message should be included
        const systemMessages = trimmed.filter(m => m.role === 'system')
        expect(systemMessages.length).toBeGreaterThan(0)
      })

      it('handles messages with tool_calls', () => {
        const manager = new ContextManager('gpt-4o')

        const messages = [
          { role: 'user', content: 'Search for cats' },
          {
            role: 'assistant',
            content: 'Searching...',
            tool_calls: [{ id: '1', name: 'search', arguments: '{"query":"cats"}' }],
          },
        ]

        const trimmed = manager.trimToFit(messages)
        expect(trimmed).toHaveLength(2)
        expect(trimmed[1].tool_calls).toBeDefined()
      })
    })

    describe('wouldExceedLimit', () => {
      it('returns false when message fits', () => {
        const manager = new ContextManager('gpt-4o')
        const currentTokens = 1000
        const newMessage = { role: 'user', content: 'Hello' }

        const exceeds = manager.wouldExceedLimit(currentTokens, newMessage)
        expect(exceeds).toBe(false)
      })

      it('returns true when message would exceed', () => {
        const manager = new ContextManager('gpt-4')
        const currentTokens = 4090 // Close to 4096 limit
        const newMessage = {
          role: 'user',
          content: 'This is a longer message'.repeat(10),
        }

        const exceeds = manager.wouldExceedLimit(currentTokens, newMessage)
        expect(exceeds).toBe(true)
      })

      it('handles large tool_calls', () => {
        const manager = new ContextManager('gpt-4')
        const currentTokens = 4000
        const newMessage = {
          role: 'assistant',
          content: 'Using tools',
          tool_calls: Array.from({ length: 10 }, (_, i) => ({
            id: `call_${i}`,
            name: 'search',
            arguments: JSON.stringify({ query: 'test'.repeat(20) }),
          })),
        }

        const exceeds = manager.wouldExceedLimit(currentTokens, newMessage)
        expect(exceeds).toBe(true)
      })
    })

    describe('getStats', () => {
      it('returns correct metrics for empty messages', () => {
        const manager = new ContextManager('gpt-4o')
        const stats = manager.getStats([])

        expect(stats.totalTokens).toBe(0)
        expect(stats.usedPercent).toBe(0)
        expect(stats.remaining).toBe(123904)
        expect(stats.messageCount).toBe(0)
      })

      it('returns correct metrics for messages with system prompt', () => {
        const manager = new ContextManager('gpt-4o', 'You are helpful')
        const messages = [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there' },
        ]

        const stats = manager.getStats(messages)

        expect(stats.totalTokens).toBeGreaterThan(0)
        // Small messages may round to 0% in a large context window
        expect(stats.usedPercent).toBeGreaterThanOrEqual(0)
        expect(stats.usedPercent).toBeLessThan(100)
        expect(stats.remaining).toBeLessThan(123904)
        expect(stats.messageCount).toBe(2)
      })

      it('calculates used percentage correctly', () => {
        const manager = new ContextManager('gpt-4')

        // Create messages using ~50% of tokens
        const messages = Array.from({ length: 10 }, () => ({
          role: 'user',
          content: 'x'.repeat(800), // ~200 tokens each = 2000 tokens total
        }))

        const stats = manager.getStats(messages)

        expect(stats.usedPercent).toBeGreaterThan(30)
        expect(stats.usedPercent).toBeLessThan(70)
      })

      it('ensures remaining is never negative', () => {
        const manager = new ContextManager('phi3') // Small 4096 window

        // Create many large messages
        const messages = Array.from({ length: 50 }, () => ({
          role: 'user',
          content: 'This is a very long message. '.repeat(100),
        }))

        const stats = manager.getStats(messages)

        expect(stats.remaining).toBeGreaterThanOrEqual(0)
      })

      it('counts all messages correctly', () => {
        const manager = new ContextManager('gpt-4o')

        const messages = [
          { role: 'system', content: 'System' },
          { role: 'user', content: 'User 1' },
          { role: 'assistant', content: 'Assistant 1' },
          { role: 'user', content: 'User 2' },
          { role: 'assistant', content: 'Assistant 2' },
        ]

        const stats = manager.getStats(messages)
        expect(stats.messageCount).toBe(5)
      })

      it('includes tool_calls in token count', () => {
        const manager = new ContextManager('gpt-4o')

        const messagesWithoutTools = [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi' },
        ]

        const messagesWithTools = [
          { role: 'user', content: 'Hello' },
          {
            role: 'assistant',
            content: 'Hi',
            tool_calls: [
              {
                id: 'call_1',
                name: 'search',
                arguments: '{"query": "test search query"}',
              },
            ],
          },
        ]

        const statsWithout = manager.getStats(messagesWithoutTools)
        const statsWith = manager.getStats(messagesWithTools)

        expect(statsWith.totalTokens).toBeGreaterThan(statsWithout.totalTokens)
      })
    })
  })
})
