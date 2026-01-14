/**
 * Closeout Hooks Tests
 * Tests for closeout document and warranty React Query hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'

import {
  closeoutKeys,
  useCloseoutDocuments,
  useCloseoutDocument,
  useCreateCloseoutDocument,
  useUpdateCloseoutDocument,
  useDeleteCloseoutDocument,
  useWarranties,
  useWarranty,
  useCreateWarranty,
  useUpdateWarranty,
  useDeleteWarranty,
  useCloseoutChecklist,
  useCreateChecklistItem,
  useToggleChecklistItem,
} from './useCloseout'

// Mock user profile
const mockUserProfile = {
  id: 'user-1',
  company_id: 'company-1',
  email: 'test@example.com',
}

// Mock useAuth
vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({
    userProfile: mockUserProfile,
  }),
}))

// Create mock Supabase chain helpers
const createSupabaseMock = (data: unknown, error: unknown = null) => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data, error }),
  then: vi.fn((cb) => Promise.resolve({ data, error }).then(cb)),
})

const mockSupabaseFrom = vi.fn()

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}))

// Test wrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// Mock data
const mockCloseoutDocument = {
  id: 'doc-1',
  company_id: 'company-1',
  project_id: 'project-1',
  document_type: 'om_manual',
  title: 'HVAC O&M Manual',
  description: 'Complete manual',
  spec_section: '23 00 00',
  spec_section_title: 'HVAC',
  subcontractor_id: 'sub-1',
  responsible_party: 'HVAC Contractor',
  required: true,
  required_copies: 3,
  format_required: 'PDF',
  required_date: '2024-12-31',
  submitted_date: null,
  approved_date: null,
  status: 'pending',
  document_url: null,
  document_urls: [],
  reviewed_by: null,
  reviewed_at: null,
  review_notes: null,
  rejection_reason: null,
  notes: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'user-1',
  deleted_at: null,
  project: { id: 'project-1', name: 'Test Project', number: 'P-001' },
  subcontractor: { id: 'sub-1', company_name: 'HVAC Inc', first_name: 'John', last_name: 'Doe' },
}

const mockWarranty = {
  id: 'w-1',
  company_id: 'company-1',
  project_id: 'project-1',
  warranty_number: 'W-001',
  title: 'Roof Warranty',
  description: '20-year warranty',
  spec_section: '07 50 00',
  subcontractor_id: 'sub-1',
  manufacturer_name: 'ABC Roofing',
  manufacturer_contact: 'Jane Smith',
  manufacturer_phone: '555-1234',
  manufacturer_email: 'jane@abc.com',
  warranty_type: 'manufacturer',
  coverage_description: 'Full coverage',
  start_date: '2024-01-01',
  end_date: '2044-01-01',
  duration_years: 20,
  document_url: null,
  closeout_document_id: null,
  status: 'active',
  notification_days: [90, 60, 30, 7],
  last_notification_sent: null,
  notes: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  deleted_at: null,
  project: { id: 'project-1', name: 'Test Project' },
  subcontractor: { id: 'sub-1', company_name: 'ABC Roofing' },
}

const mockChecklistItem = {
  id: 'check-1',
  company_id: 'company-1',
  project_id: 'project-1',
  item_number: 1,
  category: 'documentation',
  description: 'Submit O&M manuals',
  assigned_to_user_id: 'user-1',
  assigned_to_name: 'John Doe',
  subcontractor_id: 'sub-1',
  completed: false,
  completed_at: null,
  completed_by: null,
  due_date: '2024-12-31',
  notes: null,
  sort_order: 0,
  closeout_document_id: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  deleted_at: null,
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// QUERY KEYS TESTS
// ============================================================================

describe('closeoutKeys', () => {
  it('should have all key as base', () => {
    expect(closeoutKeys.all).toEqual(['closeout'])
  })

  it('should generate documents key without projectId', () => {
    expect(closeoutKeys.documents()).toEqual(['closeout', 'documents', undefined])
  })

  it('should generate documents key with projectId', () => {
    expect(closeoutKeys.documents('project-1')).toEqual(['closeout', 'documents', 'project-1'])
  })

  it('should generate document detail key', () => {
    expect(closeoutKeys.document('doc-1')).toEqual(['closeout', 'document', 'doc-1'])
  })

  it('should generate warranties key', () => {
    expect(closeoutKeys.warranties('project-1')).toEqual(['closeout', 'warranties', 'project-1'])
  })

  it('should generate warranty detail key', () => {
    expect(closeoutKeys.warranty('w-1')).toEqual(['closeout', 'warranty', 'w-1'])
  })

  it('should generate checklist key', () => {
    expect(closeoutKeys.checklist('project-1')).toEqual(['closeout', 'checklist', 'project-1'])
  })

  it('should generate documentStats key', () => {
    expect(closeoutKeys.documentStats('project-1')).toEqual([
      'closeout',
      'documentStats',
      'project-1',
    ])
  })

  it('should generate warrantyStats key', () => {
    expect(closeoutKeys.warrantyStats('project-1')).toEqual([
      'closeout',
      'warrantyStats',
      'project-1',
    ])
  })
})

// ============================================================================
// DOCUMENT QUERY HOOKS TESTS
// ============================================================================

describe('Closeout Document Query Hooks', () => {
  describe('useCloseoutDocuments', () => {
    it('should fetch closeout documents', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => Promise.resolve({ data: [mockCloseoutDocument], error: null }).then(cb)),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => useCloseoutDocuments('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSupabaseFrom).toHaveBeenCalledWith('closeout_documents')
    })

    it('should fetch all documents without projectId', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => Promise.resolve({ data: [mockCloseoutDocument], error: null }).then(cb)),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => useCloseoutDocuments(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })

  describe('useCloseoutDocument', () => {
    it('should fetch single document', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCloseoutDocument, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => useCloseoutDocument('doc-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it('should not fetch when id is undefined', () => {
      const { result } = renderHook(() => useCloseoutDocument(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })
})

// ============================================================================
// DOCUMENT MUTATION HOOKS TESTS
// ============================================================================

describe('Closeout Document Mutation Hooks', () => {
  describe('useCreateCloseoutDocument', () => {
    it('should create closeout document', async () => {
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCloseoutDocument, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => useCreateCloseoutDocument(), {
        wrapper: createWrapper(),
      })

      const dto = {
        project_id: 'project-1',
        document_type: 'om_manual' as const,
        title: 'HVAC O&M Manual',
      }

      result.current.mutate(dto)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSupabaseFrom).toHaveBeenCalledWith('closeout_documents')
    })
  })

  describe('useUpdateCloseoutDocument', () => {
    it('should update closeout document', async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCloseoutDocument, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => useUpdateCloseoutDocument(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ id: 'doc-1', title: 'Updated Title' })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })

  describe('useDeleteCloseoutDocument', () => {
    it('should soft delete closeout document', async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => useDeleteCloseoutDocument(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('doc-1')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })
})

// ============================================================================
// WARRANTY QUERY HOOKS TESTS
// ============================================================================

describe('Warranty Query Hooks', () => {
  describe('useWarranties', () => {
    it('should fetch warranties', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => Promise.resolve({ data: [mockWarranty], error: null }).then(cb)),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => useWarranties('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSupabaseFrom).toHaveBeenCalledWith('warranties')
    })

    it('should calculate expiration info', async () => {
      // Set end_date to 45 days from now for expiring soon test
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 45)
      const expiringWarranty = { ...mockWarranty, end_date: futureDate.toISOString() }

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => Promise.resolve({ data: [expiringWarranty], error: null }).then(cb)),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => useWarranties('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // The hook adds days_until_expiration and is_expiring_soon
      expect(result.current.data?.[0].days_until_expiration).toBeDefined()
    })
  })

  describe('useWarranty', () => {
    it('should fetch single warranty', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockWarranty, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => useWarranty('w-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it('should not fetch when id is undefined', () => {
      const { result } = renderHook(() => useWarranty(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })
})

// ============================================================================
// WARRANTY MUTATION HOOKS TESTS
// ============================================================================

describe('Warranty Mutation Hooks', () => {
  describe('useCreateWarranty', () => {
    it('should create warranty', async () => {
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockWarranty, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => useCreateWarranty(), {
        wrapper: createWrapper(),
      })

      const dto = {
        project_id: 'project-1',
        title: 'Roof Warranty',
        start_date: '2024-01-01',
        end_date: '2044-01-01',
      }

      result.current.mutate(dto)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSupabaseFrom).toHaveBeenCalledWith('warranties')
    })
  })

  describe('useUpdateWarranty', () => {
    it('should update warranty', async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockWarranty, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => useUpdateWarranty(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ id: 'w-1', title: 'Updated Warranty' })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })

  describe('useDeleteWarranty', () => {
    it('should soft delete warranty', async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => useDeleteWarranty(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('w-1')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })
})

// ============================================================================
// CHECKLIST HOOKS TESTS
// ============================================================================

describe('Checklist Hooks', () => {
  describe('useCloseoutChecklist', () => {
    it('should fetch checklist items', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockChecklistItem], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => useCloseoutChecklist('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSupabaseFrom).toHaveBeenCalledWith('closeout_checklist_items')
    })
  })

  describe('useCreateChecklistItem', () => {
    it('should create checklist item', async () => {
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockChecklistItem, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => useCreateChecklistItem(), {
        wrapper: createWrapper(),
      })

      const dto = {
        project_id: 'project-1',
        description: 'Submit O&M manuals',
      }

      result.current.mutate(dto)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })

  describe('useToggleChecklistItem', () => {
    it('should toggle checklist item completion', async () => {
      const completedItem = { ...mockChecklistItem, completed: true }
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: completedItem, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => useToggleChecklistItem(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ id: 'check-1', completed: true })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it('should uncomplete checklist item', async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockChecklistItem, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => useToggleChecklistItem(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ id: 'check-1', completed: false })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })
})

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('Error Handling', () => {
  it('should handle document fetch error', async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn((cb) =>
        Promise.resolve({ data: null, error: new Error('Database error') }).then(cb)
      ),
    }
    mockSupabaseFrom.mockReturnValue(mockChain)

    const { result } = renderHook(() => useCloseoutDocuments('project-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('should handle warranty fetch error', async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn((cb) => Promise.resolve({ data: null, error: new Error('Not found') }).then(cb)),
    }
    mockSupabaseFrom.mockReturnValue(mockChain)

    const { result } = renderHook(() => useWarranties('project-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
