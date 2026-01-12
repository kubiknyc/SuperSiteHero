/**
 * Agent Mock Fixtures
 *
 * Utilities for mocking AI responses in E2E tests to ensure deterministic,
 * fast, and cost-effective testing of the Agent Chat feature.
 */

import { Page, Route } from '@playwright/test'

// ============================================================================
// Types
// ============================================================================

export interface MockAgentResponse {
  content: string
  toolCalls?: Array<{
    name: string
    arguments: Record<string, unknown>
    result?: unknown
  }>
  tokens?: { input: number; output: number }
  latencyMs?: number
}

export interface AgentMockerOptions {
  /** Default latency for responses in ms */
  defaultLatency?: number
  /** Whether to log mocked requests */
  debug?: boolean
}

// ============================================================================
// Agent Mocker Class
// ============================================================================

export class AgentMocker {
  private page: Page
  private responses: Map<string, MockAgentResponse> = new Map()
  private options: AgentMockerOptions

  constructor(page: Page, options: AgentMockerOptions = {}) {
    this.page = page
    this.options = {
      defaultLatency: 100,
      debug: false,
      ...options,
    }
  }

  /**
   * Set up default mock responses for all agent endpoints
   */
  async setupDefaultMocks(): Promise<void> {
    // Mock the agent orchestrator endpoints
    await this.page.route('**/api/agent/**', async (route) => {
      await this.handleAgentRequest(route)
    })

    // Mock Supabase edge functions related to agent
    await this.page.route('**/functions/v1/agent*', async (route) => {
      await this.handleAgentRequest(route)
    })

    // Mock agent_messages table operations
    await this.page.route('**/rest/v1/agent_messages**', async (route) => {
      await this.handleMessagesRequest(route)
    })

    // Mock agent_sessions table operations
    await this.page.route('**/rest/v1/agent_sessions**', async (route) => {
      await this.handleSessionsRequest(route)
    })

    if (this.options.debug) {
      console.log('[AgentMocker] Default mocks set up')
    }
  }

  /**
   * Register a mock response for a specific message pattern
   */
  mockResponse(messagePattern: string | RegExp, response: MockAgentResponse): void {
    const key = messagePattern instanceof RegExp ? messagePattern.source : messagePattern.toLowerCase()
    this.responses.set(key, response)

    if (this.options.debug) {
      console.log(`[AgentMocker] Registered mock for pattern: ${key}`)
    }
  }

  /**
   * Clear all custom mock responses
   */
  clearMocks(): void {
    this.responses.clear()
  }

  /**
   * Mock a rate limit response
   */
  async mockRateLimit(): Promise<void> {
    await this.page.route('**/api/agent/**', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: 60,
        }),
      })
    })
  }

  /**
   * Mock a network failure
   */
  async mockNetworkFailure(): Promise<void> {
    await this.page.route('**/api/agent/**', (route) => route.abort('failed'))
  }

  /**
   * Mock a timeout
   */
  async mockTimeout(timeoutMs: number = 60000): Promise<void> {
    await this.page.route('**/api/agent/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, timeoutMs))
      await route.abort('timedout')
    })
  }

  /**
   * Remove all agent-related route mocks
   */
  async clearAllMocks(): Promise<void> {
    await this.page.unroute('**/api/agent/**')
    await this.page.unroute('**/functions/v1/agent*')
    await this.page.unroute('**/rest/v1/agent_messages**')
    await this.page.unroute('**/rest/v1/agent_sessions**')
    this.clearMocks()
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async handleAgentRequest(route: Route): Promise<void> {
    const request = route.request()
    const method = request.method()

    if (method === 'POST') {
      try {
        const body = await request.postDataJSON()
        const message = body?.message || body?.content || ''

        // Find matching mock response
        const response = this.findMatchingResponse(message)

        // Add artificial latency
        const latency = response?.latencyMs || this.options.defaultLatency || 100
        await new Promise((resolve) => setTimeout(resolve, latency))

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            content: response?.content || MOCK_RESPONSES.default.content,
            toolCalls: response?.toolCalls || [],
            tokens: response?.tokens || { input: 10, output: 50 },
            latencyMs: latency,
            model: 'gpt-4-turbo-preview',
          }),
        })
      } catch (error) {
        if (this.options.debug) {
          console.error('[AgentMocker] Error handling request:', error)
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_RESPONSES.default),
        })
      }
    } else {
      await route.continue()
    }
  }

  private async handleMessagesRequest(route: Route): Promise<void> {
    const request = route.request()
    const method = request.method()

    if (method === 'POST') {
      // Creating a new message
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: `msg-${Date.now()}`,
          created_at: new Date().toISOString(),
        }),
      })
    } else if (method === 'GET') {
      // Fetching messages - return empty array by default
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    } else {
      await route.continue()
    }
  }

  private async handleSessionsRequest(route: Route): Promise<void> {
    const request = route.request()
    const method = request.method()

    if (method === 'POST') {
      // Creating a new session
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: `session-${Date.now()}`,
          title: 'New Chat',
          status: 'active',
          created_at: new Date().toISOString(),
          message_count: 0,
        }),
      })
    } else if (method === 'GET') {
      // Fetching sessions - return empty array by default
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    } else {
      await route.continue()
    }
  }

  private findMatchingResponse(message: string): MockAgentResponse | undefined {
    const lowerMessage = message.toLowerCase()

    // Check exact matches first
    if (this.responses.has(lowerMessage)) {
      return this.responses.get(lowerMessage)
    }

    // Check pattern matches
    for (const [pattern, response] of this.responses) {
      try {
        const regex = new RegExp(pattern, 'i')
        if (regex.test(message)) {
          return response
        }
      } catch {
        // Not a valid regex, try substring match
        if (lowerMessage.includes(pattern.toLowerCase())) {
          return response
        }
      }
    }

    // Check built-in patterns
    if (/help|what.*can.*you|assist/i.test(message)) {
      return MOCK_RESPONSES.help
    }
    if (/summarize|summary|today/i.test(message)) {
      return MOCK_RESPONSES.summarize
    }
    if (/weekly.*status|status.*report/i.test(message)) {
      return MOCK_RESPONSES.weeklyStatus
    }
    if (/error|fail|test.*error/i.test(message)) {
      return MOCK_RESPONSES.error
    }

    return MOCK_RESPONSES.default
  }
}

// ============================================================================
// Pre-defined Mock Responses
// ============================================================================

export const MOCK_RESPONSES: Record<string, MockAgentResponse> = {
  default: {
    content:
      "I understand you're asking about construction management. How can I help you today? I can assist with daily reports, RFIs, change orders, punch lists, and more.",
    tokens: { input: 10, output: 35 },
    latencyMs: 150,
  },

  help: {
    content: `I can help you with many things:

**Daily Reports**
- Summarize today's activities
- Generate weather logs
- Track workforce hours

**Workflows**
- Find open RFIs
- Track submittals
- Review change orders

**Safety**
- Log safety incidents
- Create toolbox talks
- Track JSAs

**Documents**
- Search project documents
- Generate reports

What would you like to do?`,
    tokens: { input: 5, output: 80 },
    latencyMs: 200,
  },

  summarize: {
    content: `**Today's Summary**

**Highlights:**
- Concrete pour completed on Level 3
- 45 workers on site
- Weather: Clear, 72°F

**Concerns:**
- RFI-042 still pending response
- Minor delay in electrical rough-in

**Tomorrow's Focus:**
- Begin framing on Level 4
- Inspection scheduled for 10am`,
    toolCalls: [
      {
        name: 'summarize_daily_report',
        arguments: { date: 'today' },
        result: { success: true },
      },
    ],
    tokens: { input: 10, output: 120 },
    latencyMs: 300,
  },

  weeklyStatus: {
    content: `**Weekly Status Report**

**Period:** Last 7 days

**Progress:**
- Overall project: 42% complete (+3%)
- Schedule status: On track
- Budget status: Under budget by 2%

**Key Accomplishments:**
1. Completed structural steel on Level 2
2. Passed MEP rough-in inspection
3. Submitted 12 shop drawings

**Upcoming Milestones:**
- Level 3 concrete: Next Tuesday
- Roofing start: End of week

**Issues Requiring Attention:**
- 3 RFIs overdue
- 2 submittals pending review`,
    toolCalls: [
      {
        name: 'generate_weekly_status',
        arguments: { period: '7d' },
        result: { success: true },
      },
    ],
    tokens: { input: 15, output: 150 },
    latencyMs: 400,
  },

  error: {
    content: "I'm sorry, I encountered an error processing your request. Please try again or rephrase your question.",
    tokens: { input: 10, output: 20 },
    latencyMs: 100,
  },

  emptyResponse: {
    content: '',
    tokens: { input: 10, output: 0 },
    latencyMs: 50,
  },

  longResponse: {
    content: `This is a detailed response to demonstrate handling of long content.

${'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(50)}

The response continues with more detailed information about the topic you asked about.

${'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. '.repeat(30)}

In conclusion, I hope this comprehensive answer helps address your question fully.`,
    tokens: { input: 10, output: 500 },
    latencyMs: 1000,
  },

  toolExecution: {
    content: 'I found the information you requested.',
    toolCalls: [
      {
        name: 'search_documents',
        arguments: { query: 'test', limit: 10 },
        result: { documents: [], total: 0 },
      },
    ],
    tokens: { input: 10, output: 20 },
    latencyMs: 500,
  },
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create an AgentMocker instance with default mocks already set up
 */
export async function createAgentMocker(page: Page, options?: AgentMockerOptions): Promise<AgentMocker> {
  const mocker = new AgentMocker(page, options)
  await mocker.setupDefaultMocks()
  return mocker
}

/**
 * Quick setup for basic agent mocking without custom responses
 */
export async function setupBasicAgentMocks(page: Page): Promise<void> {
  const mocker = new AgentMocker(page)
  await mocker.setupDefaultMocks()
}
