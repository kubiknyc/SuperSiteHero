import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { toolRegistry, createTool } from '../registry'
import type { Tool, ToolContext, ToolResult, ToolCategory } from '../../types/tools'
import type { AgentContext } from '../../types/agent'

// Helper to create mock tools
const createMockTool = (
  overrides: Partial<Tool> = {}
): Tool => {
  return {
    name: 'mock_tool',
    displayName: 'Mock Tool',
    description: 'A mock tool for testing',
    category: 'action' as ToolCategory,
    parameters: {
      type: 'object' as const,
      properties: {
        input: {
          type: 'string',
          description: 'Test input',
        },
      },
      required: ['input'],
    },
    requiresConfirmation: false,
    execute: async (
      input: Record<string, unknown>,
      context: ToolContext
    ): Promise<ToolResult> => {
      return {
        success: true,
        data: { result: 'mock result' },
        metadata: {
          executionTimeMs: 100,
        },
      }
    },
    ...overrides,
  }
}

// Helper to create mock agent context
const createMockContext = (
  overrides: Partial<AgentContext> = {}
): AgentContext => {
  return {
    sessionId: 'test-session-id',
    userId: 'test-user-id',
    companyId: 'test-company-id',
    projectId: 'test-project-id',
    autonomyLevel: 'confirm_actions' as const,
    featuresEnabled: {
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
    userPreferences: {},
    ...overrides,
  }
}

describe('ToolRegistry', () => {
  let consoleWarn: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Clear the registry before each test
    toolRegistry.list().forEach((tool) => {
      toolRegistry.unregister(tool.name)
    })

    // Mock console.warn to prevent warning logs in test output
    consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleWarn.mockRestore()
    vi.clearAllMocks()
  })

  describe('Registration', () => {
    it('registers a tool successfully', () => {
      const tool = createMockTool({ name: 'test_tool_1' })

      toolRegistry.register(tool)

      const registered = toolRegistry.get('test_tool_1')
      expect(registered).toBeDefined()
      expect(registered?.name).toBe('test_tool_1')
      expect(registered?.displayName).toBe('Mock Tool')
    })

    it('registers multiple tools', () => {
      const tool1 = createMockTool({ name: 'tool_1' })
      const tool2 = createMockTool({ name: 'tool_2' })
      const tool3 = createMockTool({ name: 'tool_3' })

      toolRegistry.register(tool1)
      toolRegistry.register(tool2)
      toolRegistry.register(tool3)

      const tools = toolRegistry.list()
      expect(tools).toHaveLength(3)
      expect(tools.map(t => t.name)).toContain('tool_1')
      expect(tools.map(t => t.name)).toContain('tool_2')
      expect(tools.map(t => t.name)).toContain('tool_3')
    })

    it('warns when registering a duplicate tool name', () => {
      const tool1 = createMockTool({ name: 'duplicate_tool' })
      const tool2 = createMockTool({
        name: 'duplicate_tool',
        displayName: 'Updated Tool'
      })

      toolRegistry.register(tool1)
      toolRegistry.register(tool2)

      expect(consoleWarn).toHaveBeenCalledWith(
        '[ToolRegistry] Tool "duplicate_tool" already registered, overwriting'
      )
    })

    it('overwrites existing tool when registering duplicate', () => {
      const tool1 = createMockTool({
        name: 'duplicate_tool',
        displayName: 'Original Tool'
      })
      const tool2 = createMockTool({
        name: 'duplicate_tool',
        displayName: 'Updated Tool'
      })

      toolRegistry.register(tool1)
      toolRegistry.register(tool2)

      const registered = toolRegistry.get('duplicate_tool')
      expect(registered?.displayName).toBe('Updated Tool')

      const tools = toolRegistry.list()
      expect(tools).toHaveLength(1)
    })

    it('registers tools with different categories', () => {
      const documentTool = createMockTool({
        name: 'document_tool',
        category: 'document'
      })
      const reportTool = createMockTool({
        name: 'report_tool',
        category: 'report'
      })
      const searchTool = createMockTool({
        name: 'search_tool',
        category: 'search'
      })

      toolRegistry.register(documentTool)
      toolRegistry.register(reportTool)
      toolRegistry.register(searchTool)

      expect(toolRegistry.get('document_tool')?.category).toBe('document')
      expect(toolRegistry.get('report_tool')?.category).toBe('report')
      expect(toolRegistry.get('search_tool')?.category).toBe('search')
    })
  })

  describe('Unregister', () => {
    it('unregisters an existing tool', () => {
      const tool = createMockTool({ name: 'removable_tool' })

      toolRegistry.register(tool)
      expect(toolRegistry.get('removable_tool')).toBeDefined()

      toolRegistry.unregister('removable_tool')
      expect(toolRegistry.get('removable_tool')).toBeUndefined()
    })

    it('does not error when unregistering non-existent tool', () => {
      expect(() => {
        toolRegistry.unregister('non_existent_tool')
      }).not.toThrow()
    })

    it('removes tool from list after unregistering', () => {
      const tool1 = createMockTool({ name: 'tool_1' })
      const tool2 = createMockTool({ name: 'tool_2' })

      toolRegistry.register(tool1)
      toolRegistry.register(tool2)
      expect(toolRegistry.list()).toHaveLength(2)

      toolRegistry.unregister('tool_1')
      const remaining = toolRegistry.list()

      expect(remaining).toHaveLength(1)
      expect(remaining[0].name).toBe('tool_2')
    })
  })

  describe('Get', () => {
    it('gets an existing tool by name', () => {
      const tool = createMockTool({
        name: 'get_test_tool',
        displayName: 'Get Test Tool'
      })

      toolRegistry.register(tool)

      const retrieved = toolRegistry.get('get_test_tool')
      expect(retrieved).toBeDefined()
      expect(retrieved?.name).toBe('get_test_tool')
      expect(retrieved?.displayName).toBe('Get Test Tool')
    })

    it('returns undefined for non-existent tool', () => {
      const result = toolRegistry.get('non_existent_tool')
      expect(result).toBeUndefined()
    })

    it('returns undefined after tool is unregistered', () => {
      const tool = createMockTool({ name: 'temporary_tool' })

      toolRegistry.register(tool)
      expect(toolRegistry.get('temporary_tool')).toBeDefined()

      toolRegistry.unregister('temporary_tool')
      expect(toolRegistry.get('temporary_tool')).toBeUndefined()
    })
  })

  describe('List', () => {
    it('returns empty array when registry is empty', () => {
      const tools = toolRegistry.list()
      expect(tools).toEqual([])
      expect(tools).toHaveLength(0)
    })

    it('lists all registered tools', () => {
      const tool1 = createMockTool({ name: 'tool_1' })
      const tool2 = createMockTool({ name: 'tool_2' })
      const tool3 = createMockTool({ name: 'tool_3' })

      toolRegistry.register(tool1)
      toolRegistry.register(tool2)
      toolRegistry.register(tool3)

      const tools = toolRegistry.list()
      expect(tools).toHaveLength(3)
      expect(tools).toContainEqual(expect.objectContaining({ name: 'tool_1' }))
      expect(tools).toContainEqual(expect.objectContaining({ name: 'tool_2' }))
      expect(tools).toContainEqual(expect.objectContaining({ name: 'tool_3' }))
    })

    it('returns a copy of tools array', () => {
      const tool = createMockTool({ name: 'test_tool' })
      toolRegistry.register(tool)

      const list1 = toolRegistry.list()
      const list2 = toolRegistry.list()

      expect(list1).not.toBe(list2)
      expect(list1).toEqual(list2)
    })
  })

  describe('getForContext', () => {
    it('filters tools by disabled document_processing feature', () => {
      const documentTool = createMockTool({
        name: 'document_tool',
        category: 'document'
      })
      const actionTool = createMockTool({
        name: 'action_tool',
        category: 'action'
      })

      toolRegistry.register(documentTool)
      toolRegistry.register(actionTool)

      const context = createMockContext({
        featuresEnabled: {
          document_processing: false,
          daily_report_summaries: true,
          rfi_routing: true,
          rfi_drafting: true,
          submittal_classification: true,
          weekly_rollups: true,
          chat_interface: true,
          background_tasks: true,
          semantic_search: true,
        }
      })

      const tools = toolRegistry.getForContext(context)

      expect(tools).toHaveLength(1)
      expect(tools[0].name).toBe('action_tool')
      expect(tools.find(t => t.name === 'document_tool')).toBeUndefined()
    })

    it('filters tools by disabled daily_report_summaries feature', () => {
      const reportTool = createMockTool({
        name: 'report_tool',
        category: 'report'
      })
      const actionTool = createMockTool({
        name: 'action_tool',
        category: 'action'
      })

      toolRegistry.register(reportTool)
      toolRegistry.register(actionTool)

      const context = createMockContext({
        featuresEnabled: {
          document_processing: true,
          daily_report_summaries: false,
          rfi_routing: true,
          rfi_drafting: true,
          submittal_classification: true,
          weekly_rollups: true,
          chat_interface: true,
          background_tasks: true,
          semantic_search: true,
        }
      })

      const tools = toolRegistry.getForContext(context)

      expect(tools).toHaveLength(1)
      expect(tools[0].name).toBe('action_tool')
    })

    it('filters tools by disabled rfi_routing feature', () => {
      const rfiTool = createMockTool({
        name: 'rfi_tool',
        category: 'rfi'
      })
      const actionTool = createMockTool({
        name: 'action_tool',
        category: 'action'
      })

      toolRegistry.register(rfiTool)
      toolRegistry.register(actionTool)

      const context = createMockContext({
        featuresEnabled: {
          document_processing: true,
          daily_report_summaries: true,
          rfi_routing: false,
          rfi_drafting: true,
          submittal_classification: true,
          weekly_rollups: true,
          chat_interface: true,
          background_tasks: true,
          semantic_search: true,
        }
      })

      const tools = toolRegistry.getForContext(context)

      expect(tools).toHaveLength(1)
      expect(tools[0].name).toBe('action_tool')
    })

    it('filters tools by disabled submittal_classification feature', () => {
      const submittalTool = createMockTool({
        name: 'submittal_tool',
        category: 'submittal'
      })
      const actionTool = createMockTool({
        name: 'action_tool',
        category: 'action'
      })

      toolRegistry.register(submittalTool)
      toolRegistry.register(actionTool)

      const context = createMockContext({
        featuresEnabled: {
          document_processing: true,
          daily_report_summaries: true,
          rfi_routing: true,
          rfi_drafting: true,
          submittal_classification: false,
          weekly_rollups: true,
          chat_interface: true,
          background_tasks: true,
          semantic_search: true,
        }
      })

      const tools = toolRegistry.getForContext(context)

      expect(tools).toHaveLength(1)
      expect(tools[0].name).toBe('action_tool')
    })

    it('filters tools by disabled semantic_search feature', () => {
      const searchTool = createMockTool({
        name: 'search_tool',
        category: 'search'
      })
      const actionTool = createMockTool({
        name: 'action_tool',
        category: 'action'
      })

      toolRegistry.register(searchTool)
      toolRegistry.register(actionTool)

      const context = createMockContext({
        featuresEnabled: {
          document_processing: true,
          daily_report_summaries: true,
          rfi_routing: true,
          rfi_drafting: true,
          submittal_classification: true,
          weekly_rollups: true,
          chat_interface: true,
          background_tasks: true,
          semantic_search: false,
        }
      })

      const tools = toolRegistry.getForContext(context)

      expect(tools).toHaveLength(1)
      expect(tools[0].name).toBe('action_tool')
    })

    it('filters tools by disabled background_tasks feature', () => {
      const actionTool = createMockTool({
        name: 'action_tool',
        category: 'action'
      })
      const inspectionTool = createMockTool({
        name: 'inspection_tool',
        category: 'inspection'
      })
      const safetyTool = createMockTool({
        name: 'safety_tool',
        category: 'safety'
      })
      const scheduleTool = createMockTool({
        name: 'schedule_tool',
        category: 'schedule'
      })
      const documentTool = createMockTool({
        name: 'document_tool',
        category: 'document'
      })

      toolRegistry.register(actionTool)
      toolRegistry.register(inspectionTool)
      toolRegistry.register(safetyTool)
      toolRegistry.register(scheduleTool)
      toolRegistry.register(documentTool)

      const context = createMockContext({
        featuresEnabled: {
          document_processing: true,
          daily_report_summaries: true,
          rfi_routing: true,
          rfi_drafting: true,
          submittal_classification: true,
          weekly_rollups: true,
          chat_interface: true,
          background_tasks: false,
          semantic_search: true,
        }
      })

      const tools = toolRegistry.getForContext(context)

      // Only document_tool should remain
      expect(tools).toHaveLength(1)
      expect(tools[0].name).toBe('document_tool')
    })

    it('filters tools requiring confirmation when autonomy is disabled', () => {
      const confirmationTool = createMockTool({
        name: 'confirmation_tool',
        requiresConfirmation: true
      })
      const normalTool = createMockTool({
        name: 'normal_tool',
        requiresConfirmation: false
      })

      toolRegistry.register(confirmationTool)
      toolRegistry.register(normalTool)

      const context = createMockContext({
        autonomyLevel: 'disabled'
      })

      const tools = toolRegistry.getForContext(context)

      expect(tools).toHaveLength(1)
      expect(tools[0].name).toBe('normal_tool')
    })

    it('includes tools requiring confirmation when autonomy is not disabled', () => {
      const confirmationTool = createMockTool({
        name: 'confirmation_tool',
        requiresConfirmation: true
      })
      const normalTool = createMockTool({
        name: 'normal_tool',
        requiresConfirmation: false
      })

      toolRegistry.register(confirmationTool)
      toolRegistry.register(normalTool)

      const context = createMockContext({
        autonomyLevel: 'confirm_actions'
      })

      const tools = toolRegistry.getForContext(context)

      expect(tools).toHaveLength(2)
      expect(tools.map(t => t.name)).toContain('confirmation_tool')
      expect(tools.map(t => t.name)).toContain('normal_tool')
    })

    it('returns all tools when all features are enabled', () => {
      const documentTool = createMockTool({ name: 'document_tool', category: 'document' })
      const reportTool = createMockTool({ name: 'report_tool', category: 'report' })
      const rfiTool = createMockTool({ name: 'rfi_tool', category: 'rfi' })
      const submittalTool = createMockTool({ name: 'submittal_tool', category: 'submittal' })
      const searchTool = createMockTool({ name: 'search_tool', category: 'search' })
      const actionTool = createMockTool({ name: 'action_tool', category: 'action' })

      toolRegistry.register(documentTool)
      toolRegistry.register(reportTool)
      toolRegistry.register(rfiTool)
      toolRegistry.register(submittalTool)
      toolRegistry.register(searchTool)
      toolRegistry.register(actionTool)

      const context = createMockContext()
      const tools = toolRegistry.getForContext(context)

      expect(tools).toHaveLength(6)
    })

    it('combines multiple filters correctly', () => {
      const documentTool = createMockTool({
        name: 'document_tool',
        category: 'document',
        requiresConfirmation: true
      })
      const reportTool = createMockTool({
        name: 'report_tool',
        category: 'report',
        requiresConfirmation: false
      })
      const actionTool = createMockTool({
        name: 'action_tool',
        category: 'action',
        requiresConfirmation: false
      })

      toolRegistry.register(documentTool)
      toolRegistry.register(reportTool)
      toolRegistry.register(actionTool)

      const context = createMockContext({
        autonomyLevel: 'disabled',
        featuresEnabled: {
          document_processing: false,
          daily_report_summaries: true,
          rfi_routing: true,
          rfi_drafting: true,
          submittal_classification: true,
          weekly_rollups: true,
          chat_interface: true,
          background_tasks: true,
          semantic_search: true,
        }
      })

      const tools = toolRegistry.getForContext(context)

      // document_tool filtered by feature, confirmation tool filtered by autonomy
      expect(tools).toHaveLength(2)
      expect(tools.map(t => t.name)).toContain('report_tool')
      expect(tools.map(t => t.name)).toContain('action_tool')
    })
  })

  describe('getByCategory', () => {
    beforeEach(() => {
      const documentTool = createMockTool({ name: 'document_tool_1', category: 'document' })
      const documentTool2 = createMockTool({ name: 'document_tool_2', category: 'document' })
      const reportTool = createMockTool({ name: 'report_tool_1', category: 'report' })
      const actionTool = createMockTool({ name: 'action_tool_1', category: 'action' })

      toolRegistry.register(documentTool)
      toolRegistry.register(documentTool2)
      toolRegistry.register(reportTool)
      toolRegistry.register(actionTool)
    })

    it('filters tools by document category', () => {
      const tools = toolRegistry.getByCategory('document')

      expect(tools).toHaveLength(2)
      expect(tools.every(t => t.category === 'document')).toBe(true)
      expect(tools.map(t => t.name)).toContain('document_tool_1')
      expect(tools.map(t => t.name)).toContain('document_tool_2')
    })

    it('filters tools by report category', () => {
      const tools = toolRegistry.getByCategory('report')

      expect(tools).toHaveLength(1)
      expect(tools[0].name).toBe('report_tool_1')
      expect(tools[0].category).toBe('report')
    })

    it('filters tools by action category', () => {
      const tools = toolRegistry.getByCategory('action')

      expect(tools).toHaveLength(1)
      expect(tools[0].name).toBe('action_tool_1')
    })

    it('returns empty array for category with no tools', () => {
      const tools = toolRegistry.getByCategory('rfi')

      expect(tools).toEqual([])
      expect(tools).toHaveLength(0)
    })

    it('filters tools by search category', () => {
      const searchTool = createMockTool({ name: 'search_tool_1', category: 'search' })
      toolRegistry.register(searchTool)

      const tools = toolRegistry.getByCategory('search')

      expect(tools).toHaveLength(1)
      expect(tools[0].name).toBe('search_tool_1')
    })

    it('filters tools by inspection category', () => {
      const inspectionTool = createMockTool({ name: 'inspection_tool_1', category: 'inspection' })
      toolRegistry.register(inspectionTool)

      const tools = toolRegistry.getByCategory('inspection')

      expect(tools).toHaveLength(1)
      expect(tools[0].name).toBe('inspection_tool_1')
    })

    it('filters tools by safety category', () => {
      const safetyTool = createMockTool({ name: 'safety_tool_1', category: 'safety' })
      toolRegistry.register(safetyTool)

      const tools = toolRegistry.getByCategory('safety')

      expect(tools).toHaveLength(1)
      expect(tools[0].name).toBe('safety_tool_1')
    })

    it('filters tools by schedule category', () => {
      const scheduleTool = createMockTool({ name: 'schedule_tool_1', category: 'schedule' })
      toolRegistry.register(scheduleTool)

      const tools = toolRegistry.getByCategory('schedule')

      expect(tools).toHaveLength(1)
      expect(tools[0].name).toBe('schedule_tool_1')
    })
  })

  describe('toOpenAIFormat', () => {
    it('converts a single tool to OpenAI format', () => {
      const tool = createMockTool({
        name: 'test_tool',
        description: 'Test description',
        parameters: {
          type: 'object' as const,
          properties: {
            input: { type: 'string' },
          },
          required: ['input'],
        }
      })

      toolRegistry.register(tool)

      const openAITools = toolRegistry.toOpenAIFormat()

      expect(openAITools).toHaveLength(1)
      expect(openAITools[0]).toEqual({
        type: 'function',
        function: {
          name: 'test_tool',
          description: 'Test description',
          parameters: {
            type: 'object',
            properties: {
              input: { type: 'string' },
            },
            required: ['input'],
          }
        }
      })
    })

    it('converts multiple tools to OpenAI format', () => {
      const tool1 = createMockTool({ name: 'tool_1', description: 'First tool' })
      const tool2 = createMockTool({ name: 'tool_2', description: 'Second tool' })

      toolRegistry.register(tool1)
      toolRegistry.register(tool2)

      const openAITools = toolRegistry.toOpenAIFormat()

      expect(openAITools).toHaveLength(2)
      expect(openAITools[0].function.name).toBe('tool_1')
      expect(openAITools[1].function.name).toBe('tool_2')
      expect(openAITools.every(t => t.type === 'function')).toBe(true)
    })

    it('has correct OpenAI structure with type and function', () => {
      const tool = createMockTool({ name: 'structure_test' })
      toolRegistry.register(tool)

      const openAITools = toolRegistry.toOpenAIFormat()

      expect(openAITools[0]).toHaveProperty('type')
      expect(openAITools[0]).toHaveProperty('function')
      expect(openAITools[0].function).toHaveProperty('name')
      expect(openAITools[0].function).toHaveProperty('description')
      expect(openAITools[0].function).toHaveProperty('parameters')
    })

    it('converts provided tools array instead of all tools', () => {
      const tool1 = createMockTool({ name: 'tool_1' })
      const tool2 = createMockTool({ name: 'tool_2' })
      const tool3 = createMockTool({ name: 'tool_3' })

      toolRegistry.register(tool1)
      toolRegistry.register(tool2)
      toolRegistry.register(tool3)

      const openAITools = toolRegistry.toOpenAIFormat([tool1, tool2])

      expect(openAITools).toHaveLength(2)
      expect(openAITools.map(t => t.function.name)).toContain('tool_1')
      expect(openAITools.map(t => t.function.name)).toContain('tool_2')
      expect(openAITools.map(t => t.function.name)).not.toContain('tool_3')
    })

    it('preserves parameter schemas correctly', () => {
      const complexParameters = {
        type: 'object' as const,
        properties: {
          query: {
            type: 'string',
            description: 'Search query'
          },
          limit: {
            type: 'number',
            description: 'Result limit',
            minimum: 1,
            maximum: 100
          },
          filters: {
            type: 'object',
            properties: {
              category: { type: 'string' }
            }
          }
        },
        required: ['query']
      }

      const tool = createMockTool({
        name: 'complex_tool',
        parameters: complexParameters
      })

      toolRegistry.register(tool)

      const openAITools = toolRegistry.toOpenAIFormat()

      expect(openAITools[0].function.parameters).toEqual(complexParameters)
    })
  })

  describe('toAnthropicFormat', () => {
    it('converts a single tool to Anthropic format', () => {
      const tool = createMockTool({
        name: 'test_tool',
        description: 'Test description',
        parameters: {
          type: 'object' as const,
          properties: {
            input: { type: 'string' },
          },
          required: ['input'],
        }
      })

      toolRegistry.register(tool)

      const anthropicTools = toolRegistry.toAnthropicFormat()

      expect(anthropicTools).toHaveLength(1)
      expect(anthropicTools[0]).toEqual({
        name: 'test_tool',
        description: 'Test description',
        input_schema: {
          type: 'object',
          properties: {
            input: { type: 'string' },
          },
          required: ['input'],
        }
      })
    })

    it('converts multiple tools to Anthropic format', () => {
      const tool1 = createMockTool({ name: 'tool_1', description: 'First tool' })
      const tool2 = createMockTool({ name: 'tool_2', description: 'Second tool' })

      toolRegistry.register(tool1)
      toolRegistry.register(tool2)

      const anthropicTools = toolRegistry.toAnthropicFormat()

      expect(anthropicTools).toHaveLength(2)
      expect(anthropicTools[0].name).toBe('tool_1')
      expect(anthropicTools[1].name).toBe('tool_2')
    })

    it('has correct Anthropic structure with name, description, input_schema', () => {
      const tool = createMockTool({ name: 'structure_test' })
      toolRegistry.register(tool)

      const anthropicTools = toolRegistry.toAnthropicFormat()

      expect(anthropicTools[0]).toHaveProperty('name')
      expect(anthropicTools[0]).toHaveProperty('description')
      expect(anthropicTools[0]).toHaveProperty('input_schema')
      expect(anthropicTools[0]).not.toHaveProperty('type')
      expect(anthropicTools[0]).not.toHaveProperty('function')
    })

    it('converts provided tools array instead of all tools', () => {
      const tool1 = createMockTool({ name: 'tool_1' })
      const tool2 = createMockTool({ name: 'tool_2' })
      const tool3 = createMockTool({ name: 'tool_3' })

      toolRegistry.register(tool1)
      toolRegistry.register(tool2)
      toolRegistry.register(tool3)

      const anthropicTools = toolRegistry.toAnthropicFormat([tool1, tool2])

      expect(anthropicTools).toHaveLength(2)
      expect(anthropicTools.map(t => t.name)).toContain('tool_1')
      expect(anthropicTools.map(t => t.name)).toContain('tool_2')
      expect(anthropicTools.map(t => t.name)).not.toContain('tool_3')
    })

    it('preserves parameter schemas as input_schema', () => {
      const complexParameters = {
        type: 'object' as const,
        properties: {
          document_id: {
            type: 'string',
            description: 'Document identifier'
          },
          options: {
            type: 'object',
            properties: {
              extract_text: { type: 'boolean' }
            }
          }
        },
        required: ['document_id']
      }

      const tool = createMockTool({
        name: 'complex_tool',
        parameters: complexParameters
      })

      toolRegistry.register(tool)

      const anthropicTools = toolRegistry.toAnthropicFormat()

      expect(anthropicTools[0].input_schema).toEqual(complexParameters)
    })
  })

  describe('createTool helper', () => {
    it('creates and registers a tool', () => {
      const toolDef = createMockTool({ name: 'helper_created_tool' })

      const result = createTool(toolDef)

      expect(result).toBe(toolDef)
      expect(toolRegistry.get('helper_created_tool')).toBeDefined()
      expect(toolRegistry.get('helper_created_tool')).toBe(toolDef)
    })

    it('returns the tool definition', () => {
      const toolDef = createMockTool({
        name: 'return_test',
        displayName: 'Return Test Tool'
      })

      const result = createTool(toolDef)

      expect(result.name).toBe('return_test')
      expect(result.displayName).toBe('Return Test Tool')
    })

    it('registers tool that can be retrieved from registry', () => {
      const toolDef = createMockTool({ name: 'retrievable_tool' })

      createTool(toolDef)

      const retrieved = toolRegistry.get('retrievable_tool')
      expect(retrieved).toBeDefined()
      expect(retrieved?.name).toBe('retrievable_tool')
    })

    it('creates tools with all properties intact', () => {
      const toolDef = createMockTool({
        name: 'full_featured_tool',
        displayName: 'Full Featured Tool',
        description: 'A tool with all features',
        category: 'search',
        requiresConfirmation: true,
        severity: 'high',
        estimatedImpact: 'High impact operation',
        estimatedTokens: 500
      })

      const result = createTool(toolDef)

      expect(result.name).toBe('full_featured_tool')
      expect(result.displayName).toBe('Full Featured Tool')
      expect(result.description).toBe('A tool with all features')
      expect(result.category).toBe('search')
      expect(result.requiresConfirmation).toBe(true)
      expect(result.severity).toBe('high')
      expect(result.estimatedImpact).toBe('High impact operation')
      expect(result.estimatedTokens).toBe(500)
    })
  })

  describe('Edge Cases', () => {
    it('handles empty registry operations', () => {
      expect(toolRegistry.list()).toEqual([])
      expect(toolRegistry.get('anything')).toBeUndefined()
      expect(toolRegistry.toOpenAIFormat()).toEqual([])
      expect(toolRegistry.toAnthropicFormat()).toEqual([])
    })

    it('handles getForContext with empty registry', () => {
      const context = createMockContext()
      const tools = toolRegistry.getForContext(context)

      expect(tools).toEqual([])
    })

    it('handles getByCategory with empty registry', () => {
      const tools = toolRegistry.getByCategory('document')

      expect(tools).toEqual([])
    })

    it('preserves tool execution function during registration', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        success: true,
        data: { custom: 'result' },
        metadata: { executionTimeMs: 50 }
      })

      const tool = createMockTool({
        name: 'executable_tool',
        execute: mockExecute
      })

      toolRegistry.register(tool)
      const retrieved = toolRegistry.get('executable_tool')

      expect(retrieved).toBeDefined()
      expect(typeof retrieved?.execute).toBe('function')

      const context: ToolContext = {
        ...createMockContext(),
        skipConfirmation: false
      }

      await retrieved?.execute({ input: 'test' }, context)

      expect(mockExecute).toHaveBeenCalledWith(
        { input: 'test' },
        context
      )
    })

    it('handles tools with optional properties', () => {
      const minimalTool = createMockTool({
        name: 'minimal_tool',
        displayName: 'Minimal',
        description: 'Minimal tool',
        category: 'action',
        requiresConfirmation: false
      })

      delete minimalTool.severity
      delete minimalTool.estimatedImpact
      delete minimalTool.estimatedTokens

      toolRegistry.register(minimalTool)
      const retrieved = toolRegistry.get('minimal_tool')

      expect(retrieved).toBeDefined()
      expect(retrieved?.severity).toBeUndefined()
      expect(retrieved?.estimatedImpact).toBeUndefined()
      expect(retrieved?.estimatedTokens).toBeUndefined()
    })
  })
})
