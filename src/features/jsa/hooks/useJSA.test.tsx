/**
 * Tests for JSA (Job Safety Analysis) Hooks
 * Comprehensive testing for safety-critical workflow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Define mock functions before vi.mock calls
const mockFrom = vi.fn()
const mockRpc = vi.fn()
const mockStorageUpload = vi.fn().mockResolvedValue({ error: null })
const mockStorageRemove = vi.fn().mockResolvedValue({ error: null })
const mockStorageFrom = vi.fn().mockReturnValue({
  upload: mockStorageUpload,
  remove: mockStorageRemove,
})

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
    storage: {
      from: (...args: unknown[]) => mockStorageFrom(...args),
    },
  },
}))

// Mock useAuth
const mockUserProfile = {
  id: 'user-123',
  company_id: 'company-456',
  full_name: 'Test User',
}

vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({
    userProfile: mockUserProfile,
  }),
}))

import {
  jsaKeys,
  useJSAs,
  useJSA,
  useJSAHazards,
  useJSAAcknowledgments,
  useJSATemplates,
  useNextJSANumber,
  useJSAStatistics,
  useCreateJSA,
  useUpdateJSA,
  useSubmitJSAForReview,
  useApproveJSA,
  useStartJSAWork,
  useCompleteJSA,
  useCancelJSA,
  useDeleteJSA,
  useAddJSAHazard,
  useUpdateJSAHazard,
  useVerifyHazardControls,
  useRemoveJSAHazard,
  useAddJSAAcknowledgment,
  useRemoveJSAAcknowledgment,
  useCreateJSATemplate,
  useUploadJSAAttachment,
  useDeleteJSAAttachment,
} from './useJSA'

// =============================================
// Test Utilities
// =============================================

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createQueryClient()}>
    {children}
  </QueryClientProvider>
)

const createChainMock = (data: unknown, error: unknown = null) => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  then: vi.fn().mockImplementation((onFulfilled) =>
    Promise.resolve({ data, error }).then(onFulfilled)
  ),
})

// =============================================
// Test Data
// =============================================

const mockJSA = {
  id: 'jsa-1',
  company_id: 'company-456',
  project_id: 'project-1',
  jsa_number: 'JSA-001',
  task_description: 'Concrete pouring',
  work_location: 'Level 3',
  equipment_used: 'Concrete pump',
  scheduled_date: '2024-01-15',
  start_time: '08:00',
  estimated_duration: '4 hours',
  supervisor_id: 'user-789',
  supervisor_name: 'John Smith',
  status: 'draft',
  created_by: 'user-123',
  created_at: '2024-01-01T00:00:00Z',
}

const mockHazard = {
  id: 'hazard-1',
  jsa_id: 'jsa-1',
  step_number: 1,
  step_description: 'Set up concrete pump',
  hazard_description: 'Slip hazard from wet concrete',
  hazard_type: 'physical',
  risk_level: 'high',
  ppe_required: ['hard hat', 'safety boots', 'gloves'],
  created_at: '2024-01-01T00:00:00Z',
}

const mockAcknowledgment = {
  id: 'ack-1',
  jsa_id: 'jsa-1',
  worker_name: 'Mike Johnson',
  worker_company: 'ABC Concrete',
  worker_trade: 'Concrete finisher',
  understands_hazards: true,
  acknowledged_at: '2024-01-15T07:30:00Z',
}

const mockTemplate = {
  id: 'template-1',
  company_id: 'company-456',
  name: 'Concrete Work Template',
  description: 'Standard JSA for concrete operations',
  category: 'concrete',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
}

// =============================================
// Query Keys Tests
// =============================================

describe('jsaKeys', () => {
  it('should have correct base key', () => {
    expect(jsaKeys.all).toEqual(['jsa'])
  })

  it('should generate list keys with filters', () => {
    const filters = { projectId: 'project-1', status: 'draft' as const }
    expect(jsaKeys.lists(filters)).toEqual(['jsa', 'list', filters])
  })

  it('should generate list keys without filters', () => {
    expect(jsaKeys.lists()).toEqual(['jsa', 'list', undefined])
  })

  it('should generate detail key', () => {
    expect(jsaKeys.list('jsa-1')).toEqual(['jsa', 'detail', 'jsa-1'])
  })

  it('should generate hazards key', () => {
    expect(jsaKeys.hazards('jsa-1')).toEqual(['jsa', 'hazards', 'jsa-1'])
  })

  it('should generate acknowledgments key', () => {
    expect(jsaKeys.acknowledgments('jsa-1')).toEqual(['jsa', 'acknowledgments', 'jsa-1'])
  })

  it('should generate attachments key', () => {
    expect(jsaKeys.attachments('jsa-1')).toEqual(['jsa', 'attachments', 'jsa-1'])
  })

  it('should generate templates key with filters', () => {
    const filters = { category: 'concrete', isActive: true }
    expect(jsaKeys.templates(filters)).toEqual(['jsa', 'templates', filters])
  })

  it('should generate template detail key', () => {
    expect(jsaKeys.template('template-1')).toEqual(['jsa', 'template', 'template-1'])
  })

  it('should generate stats key', () => {
    expect(jsaKeys.stats('project-1')).toEqual(['jsa', 'stats', 'project-1'])
  })

  it('should generate next number key', () => {
    expect(jsaKeys.nextNumber('project-1')).toEqual(['jsa', 'next-number', 'project-1'])
  })
})

// =============================================
// Query Hooks Tests
// =============================================

describe('useJSAs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch JSAs', async () => {
    const jsaWithCounts = {
      ...mockJSA,
      hazards: [{ count: 3 }],
      acknowledgments: [{ count: 5 }],
    }
    mockFrom.mockReturnValue(createChainMock([jsaWithCounts]))

    const { result } = renderHook(() => useJSAs(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFrom).toHaveBeenCalledWith('job_safety_analyses')
    expect(result.current.data).toBeDefined()
    expect(result.current.data![0].hazard_count).toBe(3)
    expect(result.current.data![0].acknowledgment_count).toBe(5)
  })

  it('should apply project filter', async () => {
    const chainMock = createChainMock([mockJSA])
    mockFrom.mockReturnValue(chainMock)

    renderHook(() => useJSAs({ projectId: 'project-1' }), { wrapper })

    await waitFor(() => expect(mockFrom).toHaveBeenCalled())
    expect(chainMock.eq).toHaveBeenCalledWith('project_id', 'project-1')
  })

  it('should apply status filter', async () => {
    const chainMock = createChainMock([mockJSA])
    mockFrom.mockReturnValue(chainMock)

    renderHook(() => useJSAs({ status: 'approved' }), { wrapper })

    await waitFor(() => expect(mockFrom).toHaveBeenCalled())
    expect(chainMock.eq).toHaveBeenCalledWith('status', 'approved')
  })

  it('should apply date range filters', async () => {
    const chainMock = createChainMock([mockJSA])
    mockFrom.mockReturnValue(chainMock)

    renderHook(
      () => useJSAs({ scheduledFrom: '2024-01-01', scheduledTo: '2024-01-31' }),
      { wrapper }
    )

    await waitFor(() => expect(mockFrom).toHaveBeenCalled())
    expect(chainMock.gte).toHaveBeenCalledWith('scheduled_date', '2024-01-01')
    expect(chainMock.lte).toHaveBeenCalledWith('scheduled_date', '2024-01-31')
  })
})

describe('useJSA', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch single JSA with details', async () => {
    const jsaWithDetails = {
      ...mockJSA,
      hazards: [{ ...mockHazard, step_number: 2 }, { ...mockHazard, id: 'h2', step_number: 1 }],
      acknowledgments: [mockAcknowledgment],
    }
    mockFrom.mockReturnValue(createChainMock(jsaWithDetails))

    const { result } = renderHook(() => useJSA('jsa-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFrom).toHaveBeenCalledWith('job_safety_analyses')
    expect(result.current.data?.id).toBe('jsa-1')
    // Hazards should be sorted by step_number
    expect(result.current.data?.hazards[0].step_number).toBe(1)
  })

  it('should not fetch when jsaId is empty', async () => {
    renderHook(() => useJSA(''), { wrapper })

    await new Promise((r) => setTimeout(r, 100))
    expect(mockFrom).not.toHaveBeenCalled()
  })
})

describe('useJSAHazards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch hazards for JSA', async () => {
    mockFrom.mockReturnValue(createChainMock([mockHazard]))

    const { result } = renderHook(() => useJSAHazards('jsa-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFrom).toHaveBeenCalledWith('jsa_hazards')
    expect(result.current.data).toHaveLength(1)
  })
})

describe('useJSAAcknowledgments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch acknowledgments for JSA', async () => {
    mockFrom.mockReturnValue(createChainMock([mockAcknowledgment]))

    const { result } = renderHook(() => useJSAAcknowledgments('jsa-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFrom).toHaveBeenCalledWith('jsa_acknowledgments')
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data![0].worker_name).toBe('Mike Johnson')
  })
})

describe('useJSATemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch templates for company', async () => {
    mockFrom.mockReturnValue(createChainMock([mockTemplate]))

    const { result } = renderHook(() => useJSATemplates(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFrom).toHaveBeenCalledWith('jsa_templates')
    expect(result.current.data).toHaveLength(1)
  })

  it('should apply category filter', async () => {
    const chainMock = createChainMock([mockTemplate])
    mockFrom.mockReturnValue(chainMock)

    renderHook(() => useJSATemplates({ category: 'concrete' }), { wrapper })

    await waitFor(() => expect(mockFrom).toHaveBeenCalled())
    expect(chainMock.eq).toHaveBeenCalledWith('category', 'concrete')
  })
})

describe('useNextJSANumber', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch next JSA number', async () => {
    mockRpc.mockResolvedValue({ data: 'JSA-002', error: null })

    const { result } = renderHook(() => useNextJSANumber('project-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockRpc).toHaveBeenCalledWith('get_next_jsa_number', {
      p_company_id: 'company-456',
      p_project_id: 'project-1',
    })
    expect(result.current.data).toBe('JSA-002')
  })
})

describe('useJSAStatistics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch JSA statistics', async () => {
    const stats = {
      total_jsas: 10,
      pending_review: 2,
      approved: 5,
      completed: 3,
      high_risk_count: 4,
      avg_hazards_per_jsa: 3.5,
      total_acknowledgments: 25,
    }
    mockRpc.mockResolvedValue({ data: [stats], error: null })

    const { result } = renderHook(() => useJSAStatistics('project-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockRpc).toHaveBeenCalledWith('get_jsa_statistics', {
      p_project_id: 'project-1',
    })
    expect(result.current.data).toEqual(stats)
  })

  it('should return defaults when no stats', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    const { result } = renderHook(() => useJSAStatistics('project-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.total_jsas).toBe(0)
    expect(result.current.data?.pending_review).toBe(0)
  })
})

// =============================================
// Mutation Hooks Tests - JSA CRUD
// =============================================

describe('useCreateJSA', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a new JSA', async () => {
    const newJSA = { ...mockJSA, id: 'new-jsa' }
    mockFrom.mockReturnValue(createChainMock(newJSA))

    const { result } = renderHook(() => useCreateJSA(), { wrapper })

    await result.current.mutateAsync({
      project_id: 'project-1',
      task_description: 'Test task',
      scheduled_date: '2024-01-20',
    })

    expect(mockFrom).toHaveBeenCalledWith('job_safety_analyses')
  })

  it('should create JSA with hazards', async () => {
    const newJSA = { ...mockJSA, id: 'new-jsa' }
    mockFrom
      .mockReturnValueOnce(createChainMock(newJSA)) // JSA insert
      .mockReturnValueOnce(createChainMock(null)) // Hazards insert

    const { result } = renderHook(() => useCreateJSA(), { wrapper })

    await result.current.mutateAsync({
      project_id: 'project-1',
      task_description: 'Test task',
      scheduled_date: '2024-01-20',
      hazards: [
        {
          step_description: 'Step 1',
          hazard_description: 'Hazard 1',
          risk_level: 'high',
        },
      ],
    })

    expect(mockFrom).toHaveBeenCalledWith('jsa_hazards')
  })
})

describe('useUpdateJSA', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should update JSA', async () => {
    mockFrom.mockReturnValue(createChainMock(mockJSA))

    const { result } = renderHook(() => useUpdateJSA(), { wrapper })

    await result.current.mutateAsync({
      id: 'jsa-1',
      task_description: 'Updated task',
    })

    expect(mockFrom).toHaveBeenCalledWith('job_safety_analyses')
  })
})

describe('useDeleteJSA', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should delete draft JSA', async () => {
    const chainMock = createChainMock(null)
    mockFrom.mockReturnValue(chainMock)

    const { result } = renderHook(() => useDeleteJSA(), { wrapper })

    await result.current.mutateAsync('jsa-1')

    expect(mockFrom).toHaveBeenCalledWith('job_safety_analyses')
    expect(chainMock.delete).toHaveBeenCalled()
    expect(chainMock.eq).toHaveBeenCalledWith('status', 'draft')
  })
})

// =============================================
// Status Workflow Tests
// =============================================

describe('JSA Status Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should submit JSA for review (draft → pending_review)', async () => {
    const chainMock = createChainMock({ ...mockJSA, status: 'pending_review' })
    mockFrom.mockReturnValue(chainMock)

    const { result } = renderHook(() => useSubmitJSAForReview(), { wrapper })

    await result.current.mutateAsync('jsa-1')

    expect(chainMock.update).toHaveBeenCalledWith({ status: 'pending_review' })
    expect(chainMock.eq).toHaveBeenCalledWith('status', 'draft')
  })

  it('should approve JSA (pending_review → approved)', async () => {
    const chainMock = createChainMock({ ...mockJSA, status: 'approved' })
    mockFrom.mockReturnValue(chainMock)

    const { result } = renderHook(() => useApproveJSA(), { wrapper })

    await result.current.mutateAsync({ jsaId: 'jsa-1', notes: 'Approved' })

    expect(chainMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'approved',
        reviewed_by: 'user-123',
      })
    )
    expect(chainMock.eq).toHaveBeenCalledWith('status', 'pending_review')
  })

  it('should start work (approved → in_progress)', async () => {
    const chainMock = createChainMock({ ...mockJSA, status: 'in_progress' })
    mockFrom.mockReturnValue(chainMock)

    const { result } = renderHook(() => useStartJSAWork(), { wrapper })

    await result.current.mutateAsync('jsa-1')

    expect(chainMock.update).toHaveBeenCalledWith({ status: 'in_progress' })
    expect(chainMock.eq).toHaveBeenCalledWith('status', 'approved')
  })

  it('should complete JSA (in_progress → completed)', async () => {
    const chainMock = createChainMock({ ...mockJSA, status: 'completed' })
    mockFrom.mockReturnValue(chainMock)

    const { result } = renderHook(() => useCompleteJSA(), { wrapper })

    await result.current.mutateAsync({ jsaId: 'jsa-1', notes: 'Work completed safely' })

    expect(chainMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
      })
    )
    expect(chainMock.eq).toHaveBeenCalledWith('status', 'in_progress')
  })

  it('should cancel JSA', async () => {
    const chainMock = createChainMock({ ...mockJSA, status: 'cancelled' })
    mockFrom.mockReturnValue(chainMock)

    const { result } = renderHook(() => useCancelJSA(), { wrapper })

    await result.current.mutateAsync('jsa-1')

    expect(chainMock.update).toHaveBeenCalledWith({ status: 'cancelled' })
  })
})

// =============================================
// Hazard Management Tests
// =============================================

describe('Hazard Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should add hazard to JSA', async () => {
    mockFrom.mockReturnValue(createChainMock(mockHazard))

    const { result } = renderHook(() => useAddJSAHazard(), { wrapper })

    await result.current.mutateAsync({
      jsa_id: 'jsa-1',
      step_description: 'New step',
      hazard_description: 'New hazard',
      risk_level: 'high',
    })

    expect(mockFrom).toHaveBeenCalledWith('jsa_hazards')
  })

  it('should update hazard', async () => {
    mockFrom.mockReturnValue(createChainMock(mockHazard))

    const { result } = renderHook(() => useUpdateJSAHazard(), { wrapper })

    await result.current.mutateAsync({
      id: 'hazard-1',
      jsa_id: 'jsa-1',
      risk_level: 'critical',
    })

    expect(mockFrom).toHaveBeenCalledWith('jsa_hazards')
  })

  it('should verify hazard controls', async () => {
    const chainMock = createChainMock({
      ...mockHazard,
      controls_verified: true,
      verified_by: 'user-123',
    })
    mockFrom.mockReturnValue(chainMock)

    const { result } = renderHook(() => useVerifyHazardControls(), { wrapper })

    await result.current.mutateAsync({ hazardId: 'hazard-1', jsaId: 'jsa-1' })

    expect(chainMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        controls_verified: true,
        verified_by: 'user-123',
      })
    )
  })

  it('should remove hazard', async () => {
    const chainMock = createChainMock(null)
    mockFrom.mockReturnValue(chainMock)

    const { result } = renderHook(() => useRemoveJSAHazard(), { wrapper })

    await result.current.mutateAsync({ hazardId: 'hazard-1', jsaId: 'jsa-1' })

    expect(chainMock.delete).toHaveBeenCalled()
    expect(chainMock.eq).toHaveBeenCalledWith('id', 'hazard-1')
  })
})

// =============================================
// Acknowledgment Management Tests
// =============================================

describe('Acknowledgment Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should add acknowledgment', async () => {
    mockFrom.mockReturnValue(createChainMock(mockAcknowledgment))

    const { result } = renderHook(() => useAddJSAAcknowledgment(), { wrapper })

    await result.current.mutateAsync({
      jsa_id: 'jsa-1',
      worker_name: 'New Worker',
      understands_hazards: true,
    })

    expect(mockFrom).toHaveBeenCalledWith('jsa_acknowledgments')
  })

  it('should add acknowledgment with signature', async () => {
    mockFrom.mockReturnValue(createChainMock(mockAcknowledgment))

    const { result } = renderHook(() => useAddJSAAcknowledgment(), { wrapper })

    await result.current.mutateAsync({
      jsa_id: 'jsa-1',
      worker_name: 'Jane Doe',
      worker_company: 'XYZ Corp',
      worker_trade: 'Electrician',
      signature_data: 'base64-signature-data',
      understands_hazards: true,
      has_questions: false,
    })

    expect(mockFrom).toHaveBeenCalledWith('jsa_acknowledgments')
  })

  it('should remove acknowledgment', async () => {
    const chainMock = createChainMock(null)
    mockFrom.mockReturnValue(chainMock)

    const { result } = renderHook(() => useRemoveJSAAcknowledgment(), { wrapper })

    await result.current.mutateAsync({ acknowledgmentId: 'ack-1', jsaId: 'jsa-1' })

    expect(chainMock.delete).toHaveBeenCalled()
    expect(chainMock.eq).toHaveBeenCalledWith('id', 'ack-1')
  })
})

// =============================================
// Template Management Tests
// =============================================

describe('useCreateJSATemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create new template', async () => {
    mockFrom.mockReturnValue(createChainMock(mockTemplate))

    const { result } = renderHook(() => useCreateJSATemplate(), { wrapper })

    await result.current.mutateAsync({
      name: 'New Template',
      description: 'Template description',
      category: 'electrical',
      default_hazards: [{ hazard_description: 'Electric shock' }],
    })

    expect(mockFrom).toHaveBeenCalledWith('jsa_templates')
  })
})

// =============================================
// Attachment Management Tests
// =============================================

describe('Attachment Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStorageUpload.mockResolvedValue({ error: null })
    mockStorageRemove.mockResolvedValue({ error: null })
  })

  it('should upload attachment', async () => {
    mockFrom.mockReturnValue(
      createChainMock({
        id: 'attachment-1',
        file_name: 'photo.jpg',
        file_path: 'jsa/jsa-1/photo.jpg',
      })
    )

    const { result } = renderHook(() => useUploadJSAAttachment(), { wrapper })

    const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' })
    await result.current.mutateAsync({
      jsaId: 'jsa-1',
      file,
      attachmentType: 'photo',
      description: 'Site photo',
    })

    expect(mockStorageFrom).toHaveBeenCalledWith('documents')
    expect(mockFrom).toHaveBeenCalledWith('jsa_attachments')
  })

  it('should delete attachment', async () => {
    const chainMock = createChainMock(null)
    mockFrom.mockReturnValue(chainMock)

    const { result } = renderHook(() => useDeleteJSAAttachment(), { wrapper })

    await result.current.mutateAsync({
      attachmentId: 'attachment-1',
      jsaId: 'jsa-1',
      filePath: 'jsa/jsa-1/photo.jpg',
    })

    expect(mockStorageFrom).toHaveBeenCalledWith('documents')
    expect(chainMock.delete).toHaveBeenCalled()
  })
})

// =============================================
// Error Handling Tests
// =============================================

describe('Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle fetch error', async () => {
    mockFrom.mockReturnValue(createChainMock(null, { message: 'Network error' }))

    const { result } = renderHook(() => useJSAs(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeDefined()
  })

  it('should handle mutation error', async () => {
    mockFrom.mockReturnValue(createChainMock(null, { message: 'Validation failed' }))

    const { result } = renderHook(() => useCreateJSA(), { wrapper })

    await expect(
      result.current.mutateAsync({
        project_id: 'project-1',
        task_description: '',
        scheduled_date: '2024-01-20',
      })
    ).rejects.toEqual({ message: 'Validation failed' })
  })
})

// =============================================
// Risk Level Tests
// =============================================

describe('Risk Level Handling', () => {
  it('should handle different risk levels in hazards', async () => {
    const hazards = [
      { ...mockHazard, id: 'h1', risk_level: 'low' },
      { ...mockHazard, id: 'h2', risk_level: 'medium' },
      { ...mockHazard, id: 'h3', risk_level: 'high' },
      { ...mockHazard, id: 'h4', risk_level: 'critical' },
    ]
    mockFrom.mockReturnValue(createChainMock(hazards))

    const { result } = renderHook(() => useJSAHazards('jsa-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(4)
    const riskLevels = result.current.data!.map((h) => h.risk_level)
    expect(riskLevels).toContain('low')
    expect(riskLevels).toContain('medium')
    expect(riskLevels).toContain('high')
    expect(riskLevels).toContain('critical')
  })
})
