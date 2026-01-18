/**
 * Summarize Daily Report Tool Tests
 *
 * Tests the summarize_daily_report tool functionality:
 * - Tool definition and configuration
 * - Successful execution with complete report data
 * - Include/exclude recommendations based on input
 * - Error handling for missing reports and AI failures
 * - Prompt building with various data combinations
 * - Output formatting with different statuses
 * - Database updates and action logging
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { ToolContext, ToolResult } from '../../../types/tools'

// ============================================================================
// Mocks Setup (using vi.hoisted)
// ============================================================================

const mockAiService = vi.hoisted(() => ({
  extractJSON: vi.fn(),
}))

const mockLogger = vi.hoisted(() => ({
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}))

const mockCreateTool = vi.hoisted(() => vi.fn((config) => config))

// Create mock Supabase that tracks queries
let querySequence: any[] = []
let currentQueryIndex = 0

const createMockQuery = (returnValue: any) => {
  const query = {
    _returnValue: returnValue,
    from: vi.fn(function(this: any) { return this }),
    select: vi.fn(function(this: any) { return this }),
    eq: vi.fn(function(this: any) {
      // For queries without .single(), eq() should resolve to the return value
      // Make it thenable so it can be awaited
      const result = Promise.resolve(this._returnValue)
      // But also return this for chaining
      Object.assign(result, this)
      return result
    }),
    single: vi.fn(function(this: any) { return Promise.resolve(this._returnValue) }),
    insert: vi.fn(function(this: any) { return Promise.resolve(this._returnValue) }),
    update: vi.fn(function(this: any) { return this }),
  }
  return query
}

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(() => {
    if (currentQueryIndex < querySequence.length) {
      return querySequence[currentQueryIndex++]
    }
    return createMockQuery({ data: null, error: null })
  }),
}))

// Mock modules
vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}))

vi.mock('@/lib/api/services/ai-provider', () => ({
  aiService: mockAiService,
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: mockLogger,
}))

vi.mock('../../registry', () => ({
  createTool: mockCreateTool,
}))

// ============================================================================
// Test Data Factories
// ============================================================================

interface MockDailyReport {
  id: string
  report_date: string
  summary: string | null
  work_performed: string | null
  weather_conditions: string | null
  temperature_high: number | null
  temperature_low: number | null
  delays: string | null
  issues: string | null
  notes: string | null
  total_workers: number | null
  project_id: string
  created_at: string
}

function createMockReport(overrides: Partial<MockDailyReport> = {}): MockDailyReport {
  return {
    id: 'report-123',
    report_date: '2026-01-19', // Monday
    summary: 'Foundation work continued',
    work_performed: 'Poured concrete for east wing foundation. Installed rebar in west wing.',
    weather_conditions: 'Partly cloudy',
    temperature_high: 72,
    temperature_low: 55,
    delays: null,
    issues: null,
    notes: 'Good progress today',
    total_workers: 15,
    project_id: 'project-456',
    created_at: '2026-01-19T08:00:00Z',
    ...overrides,
  }
}

function createMockLaborEntries() {
  return [
    { trade: 'Concrete', headcount: 8, hours_worked: 64 },
    { trade: 'Carpentry', headcount: 5, hours_worked: 40 },
    { trade: 'General Labor', headcount: 2, hours_worked: 16 },
  ]
}

function createMockEquipmentEntries() {
  return [
    { equipment_name: 'Concrete Mixer', hours_used: 6, status: 'operational' },
    { equipment_name: 'Excavator', hours_used: 4, status: 'operational' },
  ]
}

function createMockAiResult(overrides: Partial<any> = {}) {
  return {
    data: {
      summary: 'Foundation work progressed well with 15 workers completing concrete pour for east wing. Weather conditions were favorable.',
      highlights: [
        'Successfully poured concrete for east wing foundation',
        'Installed rebar in west wing on schedule',
        'Good weather conditions supported productivity',
      ],
      concerns: [
        'Need to monitor concrete curing conditions',
      ],
      recommendations: [
        'Schedule inspection for poured concrete',
        'Begin formwork for west wing foundation',
        'Order additional rebar for upcoming work',
      ],
      action_items: [
        'Schedule concrete inspection',
        'Order rebar',
      ],
      safety_incidents_count: 0,
      weather_impact: 'none',
      ...overrides,
    },
    tokens: {
      total: 450,
      prompt: 300,
      completion: 150,
    },
  }
}

function createMockContext(): ToolContext {
  return {
    companyId: 'company-123',
    sessionId: 'session-456',
    messageId: 'message-789',
    userId: 'user-abc',
  }
}

// Helper to setup query sequence
function setupQueries(queries: Array<{ data: any; error?: any }>) {
  querySequence = queries.map(q => createMockQuery(q))
  currentQueryIndex = 0
}

// ============================================================================
// Tests
// ============================================================================

describe('summarizeDailyReportTool', () => {
  // Import the tool after mocks are set up
  let summarizeDailyReportTool: any

  beforeEach(async () => {
    vi.clearAllMocks()
    querySequence = []
    currentQueryIndex = 0

    // Import fresh module for each test
    const module = await import('../summarize-daily')
    summarizeDailyReportTool = module.summarizeDailyReportTool
  })

  afterEach(() => {
    vi.resetModules()
  })

  describe('Tool Definition', () => {
    it('should have correct name', () => {
      expect(summarizeDailyReportTool.name).toBe('summarize_daily_report')
    })

    it('should have correct display name', () => {
      expect(summarizeDailyReportTool.displayName).toBe('Summarize Daily Report')
    })

    it('should have correct category', () => {
      expect(summarizeDailyReportTool.category).toBe('report')
    })

    it('should have correct description', () => {
      expect(summarizeDailyReportTool.description).toContain('AI summary')
      expect(summarizeDailyReportTool.description).toContain('daily field report')
    })

    it('should not require confirmation', () => {
      expect(summarizeDailyReportTool.requiresConfirmation).toBe(false)
    })

    it('should have estimated tokens', () => {
      expect(summarizeDailyReportTool.estimatedTokens).toBe(800)
    })

    it('should have correct parameters schema', () => {
      const { parameters } = summarizeDailyReportTool

      expect(parameters.type).toBe('object')
      expect(parameters.required).toContain('report_id')
      expect(parameters.properties.report_id).toEqual({
        type: 'string',
        description: 'UUID of the daily report to summarize',
      })
      expect(parameters.properties.include_recommendations).toEqual({
        type: 'boolean',
        description: 'Include AI recommendations for next steps',
        default: true,
      })
    })

    it('should have execute function', () => {
      expect(typeof summarizeDailyReportTool.execute).toBe('function')
    })

    it('should have formatOutput function', () => {
      expect(typeof summarizeDailyReportTool.formatOutput).toBe('function')
    })
  })

  describe('Execute - Success Cases', () => {
    it('should successfully summarize a daily report with full data', async () => {
      const mockReport = createMockReport()
      const mockLabor = createMockLaborEntries()
      const mockEquipment = createMockEquipmentEntries()
      const mockAi = createMockAiResult()
      const context = createMockContext()

      // Setup query sequence: report, labor, equipment, update, insert
      setupQueries([
        { data: mockReport, error: null },
        { data: mockLabor, error: null },
        { data: mockEquipment, error: null },
        { data: null, error: null },
        { data: null, error: null },
      ])

      mockAiService.extractJSON.mockResolvedValueOnce(mockAi)

      const result = await summarizeDailyReportTool.execute(
        { report_id: 'report-123' },
        context
      )

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        report_id: 'report-123',
        report_date: '2026-01-19',
        summary: mockAi.data.summary,
        highlights: mockAi.data.highlights,
        concerns: mockAi.data.concerns,
        recommendations: mockAi.data.recommendations,
        metrics: {
          workers_on_site: 15,
          hours_worked: 120,
          safety_incidents: 0,
          weather_impact: 'none',
        },
      })
      expect(result.metadata?.executionTimeMs).toBeGreaterThan(0)
      expect(result.metadata?.tokensUsed).toBe(450)
    })

    it('should calculate workers from labor entries when total_workers is null', async () => {
      const mockReport = createMockReport({ total_workers: null })
      const mockLabor = createMockLaborEntries()
      const mockAi = createMockAiResult()
      const context = createMockContext()

      setupQueries([
        { data: mockReport, error: null },
        { data: mockLabor, error: null },
        { data: [], error: null },
        { data: null, error: null },
        { data: null, error: null },
      ])

      mockAiService.extractJSON.mockResolvedValueOnce(mockAi)

      const result = await summarizeDailyReportTool.execute(
        { report_id: 'report-123' },
        context
      )

      expect(result.success).toBe(true)
      expect(result.data?.metrics.workers_on_site).toBe(15) // 8 + 5 + 2
      expect(result.data?.metrics.hours_worked).toBe(120) // 64 + 40 + 16
    })

    it('should update daily_reports with AI summary', async () => {
      const mockReport = createMockReport()
      const mockAi = createMockAiResult()
      const context = createMockContext()

      setupQueries([
        { data: mockReport, error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: null, error: null },
        { data: null, error: null },
      ])

      mockAiService.extractJSON.mockResolvedValueOnce(mockAi)

      await summarizeDailyReportTool.execute(
        { report_id: 'report-123' },
        context
      )

      // Verify update query was called (4th query in sequence)
      const updateQuery = querySequence[3]
      expect(updateQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          agent_summary: mockAi.data.summary,
          agent_action_items: mockAi.data.action_items,
        })
      )
      expect(updateQuery.eq).toHaveBeenCalledWith('id', 'report-123')
    })

    it('should log action to agent_actions table', async () => {
      const mockReport = createMockReport()
      const mockAi = createMockAiResult()
      const context = createMockContext()

      setupQueries([
        { data: mockReport, error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: null, error: null },
        { data: null, error: null },
      ])

      mockAiService.extractJSON.mockResolvedValueOnce(mockAi)

      await summarizeDailyReportTool.execute(
        { report_id: 'report-123' },
        context
      )

      // Verify insert was called (5th query in sequence)
      const insertQuery = querySequence[4]
      expect(insertQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: context.companyId,
          session_id: context.sessionId,
          message_id: context.messageId,
          action_type: 'tool_call',
          tool_name: 'summarize_daily_report',
          target_entity_type: 'daily_report',
          target_entity_id: 'report-123',
          status: 'executed',
        })
      )
    })
  })

  describe('Execute - include_recommendations Parameter', () => {
    it('should include recommendations when include_recommendations is true', async () => {
      const mockReport = createMockReport()
      const mockAi = createMockAiResult()
      const context = createMockContext()

      setupQueries([
        { data: mockReport, error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: null, error: null },
        { data: null, error: null },
      ])

      mockAiService.extractJSON.mockResolvedValueOnce(mockAi)

      const result = await summarizeDailyReportTool.execute(
        { report_id: 'report-123', include_recommendations: true },
        context
      )

      expect(result.data?.recommendations).toEqual(mockAi.data.recommendations)
      expect(result.data?.recommendations.length).toBeGreaterThan(0)
    })

    it('should return empty recommendations when include_recommendations is false', async () => {
      const mockReport = createMockReport()
      const mockAi = createMockAiResult()
      const context = createMockContext()

      setupQueries([
        { data: mockReport, error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: null, error: null },
        { data: null, error: null },
      ])

      mockAiService.extractJSON.mockResolvedValueOnce(mockAi)

      const result = await summarizeDailyReportTool.execute(
        { report_id: 'report-123', include_recommendations: false },
        context
      )

      expect(result.data?.recommendations).toEqual([])
    })

    it('should default to including recommendations when parameter is omitted', async () => {
      const mockReport = createMockReport()
      const mockAi = createMockAiResult()
      const context = createMockContext()

      setupQueries([
        { data: mockReport, error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: null, error: null },
        { data: null, error: null },
      ])

      mockAiService.extractJSON.mockResolvedValueOnce(mockAi)

      const result = await summarizeDailyReportTool.execute(
        { report_id: 'report-123' },
        context
      )

      expect(result.data?.recommendations).toEqual(mockAi.data.recommendations)
    })
  })

  describe('Execute - Error Handling', () => {
    it('should return error when report is not found', async () => {
      const context = createMockContext()

      setupQueries([
        { data: null, error: { message: 'Not found' } },
      ])

      const result = await summarizeDailyReportTool.execute(
        { report_id: 'nonexistent-report' },
        context
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Daily report not found')
      expect(result.errorCode).toBe('REPORT_NOT_FOUND')
    })

    it('should return error when AI service fails', async () => {
      const mockReport = createMockReport()
      const context = createMockContext()

      setupQueries([
        { data: mockReport, error: null },
        { data: [], error: null },
        { data: [], error: null },
      ])

      mockAiService.extractJSON.mockRejectedValueOnce(
        new Error('AI service unavailable')
      )

      const result = await summarizeDailyReportTool.execute(
        { report_id: 'report-123' },
        context
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('AI service unavailable')
      expect(result.errorCode).toBe('SUMMARIZATION_ERROR')
      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('should return error when database update fails', async () => {
      const mockReport = createMockReport()
      const mockAi = createMockAiResult()
      const context = createMockContext()

      // Create a special query that rejects on update
      const failingUpdateQuery = createMockQuery({ data: null, error: null })
      failingUpdateQuery.eq.mockRejectedValueOnce(new Error('Database error'))

      querySequence = [
        createMockQuery({ data: mockReport, error: null }),
        createMockQuery({ data: [], error: null }),
        createMockQuery({ data: [], error: null }),
        failingUpdateQuery,
      ]
      currentQueryIndex = 0

      mockAiService.extractJSON.mockResolvedValueOnce(mockAi)

      const result = await summarizeDailyReportTool.execute(
        { report_id: 'report-123' },
        context
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
      expect(result.errorCode).toBe('SUMMARIZATION_ERROR')
    })

    it('should include execution time in error metadata for AI failures', async () => {
      const mockReport = createMockReport()
      const context = createMockContext()

      setupQueries([
        { data: mockReport, error: null },
        { data: [], error: null },
        { data: [], error: null },
      ])

      mockAiService.extractJSON.mockRejectedValueOnce(
        new Error('AI service error')
      )

      const result = await summarizeDailyReportTool.execute(
        { report_id: 'report-123' },
        context
      )

      expect(result.metadata).toBeDefined()
      expect(typeof result.metadata?.executionTimeMs).toBe('number')
      expect(result.metadata?.executionTimeMs).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Prompt Building', () => {
    it('should include weather conditions in prompt', async () => {
      const mockReport = createMockReport({
        weather_conditions: 'Heavy rain',
        temperature_high: 65,
        temperature_low: 50,
      })
      const mockAi = createMockAiResult()
      const context = createMockContext()

      setupQueries([
        { data: mockReport, error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: null, error: null },
        { data: null, error: null },
      ])

      mockAiService.extractJSON.mockResolvedValueOnce(mockAi)

      await summarizeDailyReportTool.execute(
        { report_id: 'report-123' },
        context
      )

      const promptCall = mockAiService.extractJSON.mock.calls[0][1]
      expect(promptCall).toContain('Weather: Heavy rain')
      expect(promptCall).toContain('High: 65°F')
      expect(promptCall).toContain('Low: 50°F')
    })

    it('should include work performed in prompt', async () => {
      const mockReport = createMockReport({
        work_performed: 'Framing second floor walls',
      })
      const mockAi = createMockAiResult()
      const context = createMockContext()

      setupQueries([
        { data: mockReport, error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: null, error: null },
        { data: null, error: null },
      ])

      mockAiService.extractJSON.mockResolvedValueOnce(mockAi)

      await summarizeDailyReportTool.execute(
        { report_id: 'report-123' },
        context
      )

      const promptCall = mockAiService.extractJSON.mock.calls[0][1]
      expect(promptCall).toContain('Work Performed:')
      expect(promptCall).toContain('Framing second floor walls')
    })

    it('should include delays and issues in prompt when present', async () => {
      const mockReport = createMockReport({
        delays: 'Material delivery delayed 2 hours',
        issues: 'Rebar inspection failed, needs rework',
      })
      const mockAi = createMockAiResult()
      const context = createMockContext()

      setupQueries([
        { data: mockReport, error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: null, error: null },
        { data: null, error: null },
      ])

      mockAiService.extractJSON.mockResolvedValueOnce(mockAi)

      await summarizeDailyReportTool.execute(
        { report_id: 'report-123' },
        context
      )

      const promptCall = mockAiService.extractJSON.mock.calls[0][1]
      expect(promptCall).toContain('Delays:')
      expect(promptCall).toContain('Material delivery delayed 2 hours')
      expect(promptCall).toContain('Issues:')
      expect(promptCall).toContain('Rebar inspection failed')
    })

    it('should include labor entries in prompt', async () => {
      const mockReport = createMockReport()
      const mockLabor = createMockLaborEntries()
      const mockAi = createMockAiResult()
      const context = createMockContext()

      setupQueries([
        { data: mockReport, error: null },
        { data: mockLabor, error: null },
        { data: [], error: null },
        { data: null, error: null },
        { data: null, error: null },
      ])

      mockAiService.extractJSON.mockResolvedValueOnce(mockAi)

      await summarizeDailyReportTool.execute(
        { report_id: 'report-123' },
        context
      )

      const promptCall = mockAiService.extractJSON.mock.calls[0][1]
      expect(promptCall).toContain('Labor:')
      expect(promptCall).toContain('Concrete: 8 workers, 64 hours')
      expect(promptCall).toContain('Carpentry: 5 workers, 40 hours')
    })

    it('should include equipment entries in prompt', async () => {
      const mockReport = createMockReport()
      const mockEquipment = createMockEquipmentEntries()
      const mockAi = createMockAiResult()
      const context = createMockContext()

      setupQueries([
        { data: mockReport, error: null },
        { data: [], error: null },
        { data: mockEquipment, error: null },
        { data: null, error: null },
        { data: null, error: null },
      ])

      mockAiService.extractJSON.mockResolvedValueOnce(mockAi)

      await summarizeDailyReportTool.execute(
        { report_id: 'report-123' },
        context
      )

      const promptCall = mockAiService.extractJSON.mock.calls[0][1]
      expect(promptCall).toContain('Equipment:')
      expect(promptCall).toContain('Concrete Mixer: 6 hours (operational)')
      expect(promptCall).toContain('Excavator: 4 hours (operational)')
    })

    it('should handle missing optional fields gracefully', async () => {
      const mockReport = createMockReport({
        summary: null,
        weather_conditions: null,
        temperature_high: null,
        temperature_low: null,
        delays: null,
        issues: null,
        notes: null,
      })
      const mockAi = createMockAiResult()
      const context = createMockContext()

      setupQueries([
        { data: mockReport, error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: null, error: null },
        { data: null, error: null },
      ])

      mockAiService.extractJSON.mockResolvedValueOnce(mockAi)

      await summarizeDailyReportTool.execute(
        { report_id: 'report-123' },
        context
      )

      const promptCall = mockAiService.extractJSON.mock.calls[0][1]
      expect(promptCall).toContain('Weather: Not recorded')
      expect(promptCall).not.toContain('Delays:')
      expect(promptCall).not.toContain('Issues:')
    })
  })

  describe('formatOutput', () => {
    it('should return correct title with formatted date', () => {
      const output = {
        report_id: 'report-123',
        report_date: '2026-01-19',
        summary: 'Test summary',
        highlights: [],
        concerns: [],
        recommendations: [],
        metrics: {
          workers_on_site: 10,
          hours_worked: 80,
          safety_incidents: 0,
          weather_impact: 'none',
        },
      }

      const formatted = summarizeDailyReportTool.formatOutput(output)

      expect(formatted.title).toContain('Daily Report Summary')
      // Date formatting can vary by timezone, just check it contains a date
      expect(formatted.title).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
    })

    it('should include summary in output', () => {
      const output = {
        report_id: 'report-123',
        report_date: '2024-01-15',
        summary: 'Full summary of foundation work',
        executive_summary: 'Great progress on foundation work',
        highlights: [],
        concerns: [],
        recommendations: [],
        next_day_actions: [],
        metrics: {
          workers_on_site: 10,
          hours_worked: 80,
          safety_incidents: 0,
          weather_impact: 'none',
        },
      }

      const formatted = summarizeDailyReportTool.formatOutput(output)

      // formatOutput sets summary from executive_summary
      expect(formatted.summary).toBe('Great progress on foundation work')
    })

    it('should use correct icon', () => {
      const output = {
        report_id: 'report-123',
        report_date: '2024-01-15',
        summary: 'Test',
        highlights: [],
        concerns: [],
        recommendations: [],
        metrics: {
          workers_on_site: 10,
          hours_worked: 80,
          safety_incidents: 0,
          weather_impact: 'none',
        },
      }

      const formatted = summarizeDailyReportTool.formatOutput(output)

      expect(formatted.icon).toBe('FileText')
    })

    it('should return success status when no concerns', () => {
      const output = {
        report_id: 'report-123',
        report_date: '2024-01-15',
        summary: 'Test',
        highlights: ['Highlight 1'],
        concerns: [],
        recommendations: [],
        metrics: {
          workers_on_site: 10,
          hours_worked: 80,
          safety_incidents: 0,
          weather_impact: 'none',
        },
      }

      const formatted = summarizeDailyReportTool.formatOutput(output)

      expect(formatted.status).toBe('success')
    })

    it('should return warning status when few concerns (1-2)', () => {
      const output = {
        report_id: 'report-123',
        report_date: '2024-01-15',
        summary: 'Test',
        highlights: [],
        concerns: ['Concern 1', 'Concern 2'],
        recommendations: [],
        metrics: {
          workers_on_site: 10,
          hours_worked: 80,
          safety_incidents: 0,
          weather_impact: 'none',
        },
      }

      const formatted = summarizeDailyReportTool.formatOutput(output)

      expect(formatted.status).toBe('warning')
    })

    it('should return info status when many concerns (3+)', () => {
      const output = {
        report_id: 'report-123',
        report_date: '2024-01-15',
        summary: 'Test',
        highlights: [],
        concerns: ['Concern 1', 'Concern 2', 'Concern 3'],
        recommendations: [],
        metrics: {
          workers_on_site: 10,
          hours_worked: 80,
          safety_incidents: 0,
          weather_impact: 'none',
        },
      }

      const formatted = summarizeDailyReportTool.formatOutput(output)

      expect(formatted.status).toBe('info')
    })

    it('should include metrics in details', () => {
      const output = {
        report_id: 'report-123',
        report_date: '2024-01-15',
        summary: 'Test',
        highlights: [],
        concerns: [],
        recommendations: [],
        metrics: {
          workers_on_site: 15,
          hours_worked: 120,
          safety_incidents: 0,
          weather_impact: 'moderate',
        },
      }

      const formatted = summarizeDailyReportTool.formatOutput(output)

      expect(formatted.details).toContainEqual({
        label: 'Workers',
        value: 15,
        type: 'text',
      })
      expect(formatted.details).toContainEqual({
        label: 'Hours',
        value: 120,
        type: 'text',
      })
      expect(formatted.details).toContainEqual({
        label: 'Weather Impact',
        value: 'moderate',
        type: 'badge',
      })
    })

    it('should include safety incidents when greater than zero', () => {
      const output = {
        report_id: 'report-123',
        report_date: '2024-01-15',
        summary: 'Test',
        highlights: [],
        concerns: [],
        recommendations: [],
        metrics: {
          workers_on_site: 10,
          hours_worked: 80,
          safety_incidents: 2,
          weather_impact: 'none',
        },
      }

      const formatted = summarizeDailyReportTool.formatOutput(output)

      expect(formatted.details).toContainEqual({
        label: 'Safety Incidents',
        value: 2,
        type: 'badge',
      })
    })

    it('should not include safety incidents when zero', () => {
      const output = {
        report_id: 'report-123',
        report_date: '2024-01-15',
        summary: 'Test',
        highlights: [],
        concerns: [],
        recommendations: [],
        metrics: {
          workers_on_site: 10,
          hours_worked: 80,
          safety_incidents: 0,
          weather_impact: 'none',
        },
      }

      const formatted = summarizeDailyReportTool.formatOutput(output)

      const safetyDetail = formatted.details.find(
        (d: any) => d.label === 'Safety Incidents'
      )
      expect(safetyDetail).toBeUndefined()
    })

    it('should include expanded content with highlights, concerns, and recommendations', () => {
      const output = {
        report_id: 'report-123',
        report_date: '2024-01-15',
        summary: 'Test summary',
        executive_summary: 'Executive summary for owners',
        highlights: ['Highlight 1', 'Highlight 2'],
        concerns: ['Concern 1'],
        recommendations: ['Recommendation 1', 'Recommendation 2'],
        next_day_actions: ['Action 1'],
        critical_path_impact: undefined,
        metrics: {
          workers_on_site: 10,
          hours_worked: 80,
          safety_incidents: 0,
          weather_impact: 'none',
        },
      }

      const formatted = summarizeDailyReportTool.formatOutput(output)

      // formatOutput includes all summary fields in expandedContent
      expect(formatted.expandedContent.highlights).toEqual(['Highlight 1', 'Highlight 2'])
      expect(formatted.expandedContent.concerns).toEqual(['Concern 1'])
      expect(formatted.expandedContent.recommendations).toEqual(['Recommendation 1', 'Recommendation 2'])
      expect(formatted.expandedContent.full_summary).toBe('Test summary')
      expect(formatted.expandedContent.executive_summary).toBe('Executive summary for owners')
    })
  })

  describe('AI Service Integration', () => {
    it('should call AI service with correct parameters', async () => {
      const mockReport = createMockReport()
      const mockAi = createMockAiResult()
      const context = createMockContext()

      setupQueries([
        { data: mockReport, error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: null, error: null },
        { data: null, error: null },
      ])

      mockAiService.extractJSON.mockResolvedValueOnce(mockAi)

      await summarizeDailyReportTool.execute(
        { report_id: 'report-123' },
        context
      )

      expect(mockAiService.extractJSON).toHaveBeenCalledWith(
        'daily_report_summary',
        expect.any(String),
        expect.objectContaining({
          systemPrompt: expect.stringContaining('construction daily report analyst'),
          temperature: 0.4,
          maxTokens: 1500,
        })
      )
    })

    it('should pass formatted date to AI prompt', async () => {
      const mockReport = createMockReport({ report_date: '2026-01-19' })
      const mockAi = createMockAiResult()
      const context = createMockContext()

      setupQueries([
        { data: mockReport, error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: null, error: null },
        { data: null, error: null },
      ])

      mockAiService.extractJSON.mockResolvedValueOnce(mockAi)

      await summarizeDailyReportTool.execute(
        { report_id: 'report-123' },
        context
      )

      const promptCall = mockAiService.extractJSON.mock.calls[0][1]
      // Date formatting can vary by timezone, just check it contains "January" and "2026"
      expect(promptCall).toContain('January')
      expect(promptCall).toContain('2026')
      expect(promptCall).toMatch(/(Monday|Sunday)/) // Could be either depending on timezone
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero workers and hours', async () => {
      const mockReport = createMockReport({ total_workers: 0 })
      const mockAi = createMockAiResult()
      const context = createMockContext()

      setupQueries([
        { data: mockReport, error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: null, error: null },
        { data: null, error: null },
      ])

      mockAiService.extractJSON.mockResolvedValueOnce(mockAi)

      const result = await summarizeDailyReportTool.execute(
        { report_id: 'report-123' },
        context
      )

      expect(result.data?.metrics.workers_on_site).toBe(0)
      expect(result.data?.metrics.hours_worked).toBe(0)
    })

    it('should handle null labor entries gracefully', async () => {
      const mockReport = createMockReport()
      const mockAi = createMockAiResult()
      const context = createMockContext()

      setupQueries([
        { data: mockReport, error: null },
        { data: [{ trade: null, headcount: null, hours_worked: null }], error: null },
        { data: [], error: null },
        { data: null, error: null },
        { data: null, error: null },
      ])

      mockAiService.extractJSON.mockResolvedValueOnce(mockAi)

      const result = await summarizeDailyReportTool.execute(
        { report_id: 'report-123' },
        context
      )

      expect(result.success).toBe(true)
    })

    it('should handle action logging failure gracefully', async () => {
      const mockReport = createMockReport()
      const mockAi = createMockAiResult()
      const context = createMockContext()

      // Create a failing insert query
      const failingInsertQuery = createMockQuery({ data: null, error: null })
      failingInsertQuery.insert.mockRejectedValueOnce(new Error('Logging failed'))

      querySequence = [
        createMockQuery({ data: mockReport, error: null }),
        createMockQuery({ data: [], error: null }),
        createMockQuery({ data: [], error: null }),
        createMockQuery({ data: null, error: null }),
        failingInsertQuery,
      ]
      currentQueryIndex = 0

      mockAiService.extractJSON.mockResolvedValueOnce(mockAi)

      const result = await summarizeDailyReportTool.execute(
        { report_id: 'report-123' },
        context
      )

      // Should still succeed even if logging fails
      expect(result.success).toBe(true)
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error logging action'),
        expect.any(Error)
      )
    })
  })
})
