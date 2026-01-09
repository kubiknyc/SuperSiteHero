/**
 * Tool Registry
 * Centralized registry for all agent tools
 */

import type { AgentContext } from '../types/agent'
import type {
  Tool,
  ToolRegistry as IToolRegistry,
  ToolCategory,
  OpenAITool,
  AnthropicTool,
} from '../types/tools'

// ============================================================================
// Tool Registry Implementation
// ============================================================================

class ToolRegistryImpl implements IToolRegistry {
  private tools: Map<string, Tool> = new Map()

  /**
   * Register a tool
   */
  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      console.warn(`[ToolRegistry] Tool "${tool.name}" already registered, overwriting`)
    }
    this.tools.set(tool.name, tool)
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): void {
    this.tools.delete(name)
  }

  /**
   * Get a tool by name
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name)
  }

  /**
   * Get all registered tools
   */
  list(): Tool[] {
    return Array.from(this.tools.values())
  }

  /**
   * Get tools filtered by context (permissions, features, etc.)
   */
  getForContext(context: AgentContext): Tool[] {
    return this.list().filter((tool) => {
      // Check if feature is enabled for this tool's category
      const featureMapping: Partial<Record<ToolCategory, keyof typeof context.featuresEnabled>> = {
        document: 'document_processing',
        report: 'daily_report_summaries',
        rfi: 'rfi_routing',
        submittal: 'submittal_classification',
        search: 'semantic_search',
        action: 'background_tasks',
        inspection: 'background_tasks',
        safety: 'background_tasks',
        schedule: 'background_tasks',
      }

      const featureKey = featureMapping[tool.category]
      if (featureKey && !context.featuresEnabled[featureKey]) {
        return false
      }

      // Check autonomy level for tools requiring confirmation
      if (tool.requiresConfirmation && context.autonomyLevel === 'disabled') {
        return false
      }

      return true
    })
  }

  /**
   * Get tools by category
   */
  getByCategory(category: ToolCategory): Tool[] {
    return this.list().filter((tool) => tool.category === category)
  }

  /**
   * Convert tools to OpenAI function format
   */
  toOpenAIFormat(tools?: Tool[]): OpenAITool[] {
    const toolList = tools || this.list()
    return toolList.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }))
  }

  /**
   * Convert tools to Anthropic tool format
   */
  toAnthropicFormat(tools?: Tool[]): AnthropicTool[] {
    const toolList = tools || this.list()
    return toolList.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters,
    }))
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const toolRegistry = new ToolRegistryImpl()

// ============================================================================
// Tool Registration Helper
// ============================================================================

/**
 * Helper function to create and register a tool
 */
export function createTool<TInput, TOutput>(
  definition: Tool<TInput, TOutput>
): Tool<TInput, TOutput> {
  toolRegistry.register(definition as Tool)
  return definition
}

// ============================================================================
// Re-export types
// ============================================================================

export type { Tool, ToolCategory, ToolContext, ToolResult } from '../types/tools'
