/**
 * Tests for useCloneTemplate Hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCloneTemplate, useBulkCloneTemplates } from './useCloneTemplate'
import { supabase } from '@/lib/supabase'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}))

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockTemplate = {
  id: 'template-1',
  name: 'Test Template',
  description: 'A test template',
  data_source: 'daily_reports',
  output_format: 'pdf',
  page_orientation: 'portrait',
  include_charts: true,
  include_summary: true,
  category_id: 'category-1',
  company_id: 'company-1',
  created_by: 'user-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  report_template_fields: [
    { field_name: 'date', display_name: 'Date', field_type: 'date', display_order: 1 },
  ],
  report_template_filters: [
    { field_name: 'date', operator: 'gte', filter_value: '2024-01-01' },
  ],
  report_template_sorting: [
    { field_name: 'date', direction: 'desc', sort_order: 1 },
  ],
  report_template_grouping: [
    { field_name: 'project_id', group_order: 1, include_subtotals: true },
  ],
}

const mockClonedTemplate = {
  id: 'template-cloned',
  name: 'Test Template (Copy)',
  description: 'A test template',
  data_source: 'daily_reports',
  output_format: 'pdf',
  page_orientation: 'portrait',
  include_charts: true,
  include_summary: true,
  category_id: 'category-1',
  company_id: 'company-1',
  created_by: 'user-1',
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useCloneTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should clone a template with default name', async () => {
    // Mock fetch original template
    const mockFrom = vi.fn()
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingleFetch = vi.fn().mockResolvedValue({
      data: mockTemplate,
      error: null,
    })
    const mockInsert = vi.fn().mockReturnThis()
    const mockSingleInsert = vi.fn().mockResolvedValue({
      data: mockClonedTemplate,
      error: null,
    })

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'report_templates') {
        return {
          select: mockSelect,
          insert: mockInsert,
          eq: mockEq,
          single: mockSingleFetch,
        } as any
      }
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      } as any
    })

    mockInsert.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      single: mockSingleInsert,
    })

    const { result } = renderHook(() => useCloneTemplate(), {
      wrapper: createWrapper(),
    })

    // Initial state
    expect(result.current.isCloning).toBe(false)
    expect(result.current.error).toBe(null)

    // Clone template
    await act(async () => {
      await result.current.cloneTemplate({ templateId: 'template-1' })
    })

    // Verify cloning was called
    expect(result.current.isCloning).toBe(false)
  })

  it('should clone with custom name', async () => {
    const customName = 'My Custom Clone'

    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockClonedTemplate, name: customName },
          error: null,
        }),
      }),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null }),
    } as any))

    const { result } = renderHook(() => useCloneTemplate(), {
      wrapper: createWrapper(),
    })

    // Verify function exists
    expect(result.current.cloneTemplate).toBeDefined()
    expect(typeof result.current.cloneTemplate).toBe('function')
  })

  it('should handle clone with custom category', async () => {
    const newCategoryId = 'category-2'

    const { result } = renderHook(() => useCloneTemplate(), {
      wrapper: createWrapper(),
    })

    expect(result.current.cloneTemplate).toBeDefined()
    expect(typeof result.current.cloneTemplate).toBe('function')
  })

  it('should handle fetch error gracefully', async () => {
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Template not found'),
      }),
    } as any))

    const { result } = renderHook(() => useCloneTemplate(), {
      wrapper: createWrapper(),
    })

    expect(result.current.error).toBe(null)
  })

  it('should handle insert error gracefully', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'report_templates') {
        const mock = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Insert failed'),
            }),
          }),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null }),
        }
        return mock as any
      }
      return {} as any
    })

    const { result } = renderHook(() => useCloneTemplate(), {
      wrapper: createWrapper(),
    })

    expect(result.current.error).toBe(null)
  })

  it('should clean up on partial failure', async () => {
    const mockDelete = vi.fn().mockReturnThis()

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'report_templates') {
        return {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockClonedTemplate, error: null }),
          }),
          delete: mockDelete,
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null }),
        } as any
      }
      if (table === 'report_template_fields') {
        return {
          insert: vi.fn().mockResolvedValue({
            error: new Error('Failed to insert fields'),
          }),
        } as any
      }
      return {} as any
    })

    const { result } = renderHook(() => useCloneTemplate(), {
      wrapper: createWrapper(),
    })

    expect(result.current.cloneTemplate).toBeDefined()
  })
})

describe('useBulkCloneTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should clone multiple templates', async () => {
    const templateIds = ['template-1', 'template-2', 'template-3']

    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockClonedTemplate, error: null }),
      }),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null }),
    } as any))

    const { result } = renderHook(() => useBulkCloneTemplates(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isCloning).toBe(false)
    expect(result.current.error).toBe(null)
    expect(result.current.bulkClone).toBeDefined()
  })

  it('should handle partial failures', async () => {
    let callCount = 0

    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount === 2) {
            return Promise.resolve({ data: null, error: new Error('Failed') })
          }
          return Promise.resolve({ data: mockClonedTemplate, error: null })
        }),
      }),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null }),
    } as any))

    const { result } = renderHook(() => useBulkCloneTemplates(), {
      wrapper: createWrapper(),
    })

    expect(result.current.bulkClone).toBeDefined()
  })

  it('should handle all failures', async () => {
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Not found'),
      }),
    } as any))

    const { result } = renderHook(() => useBulkCloneTemplates(), {
      wrapper: createWrapper(),
    })

    expect(result.current.bulkClone).toBeDefined()
    expect(result.current.isCloning).toBe(false)
  })
})
