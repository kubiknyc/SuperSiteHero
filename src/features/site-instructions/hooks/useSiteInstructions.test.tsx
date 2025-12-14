/**
 * Tests for Site Instructions Hooks
 * Comprehensive testing for construction site instruction workflow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Define mock functions before vi.mock calls
const mockFrom = vi.fn()
const mockGetUser = vi.fn()
const mockStorageUpload = vi.fn()
const mockStorageRemove = vi.fn()
const mockStorageGetPublicUrl = vi.fn()

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      getUser: () => mockGetUser(),
    },
    storage: {
      from: () => ({
        upload: mockStorageUpload,
        remove: mockStorageRemove,
        getPublicUrl: mockStorageGetPublicUrl,
      }),
    },
  },
}))

import {
  siteInstructionKeys,
  useSiteInstructions,
  useSiteInstruction,
  useCreateSiteInstruction,
  useUpdateSiteInstruction,
  useDeleteSiteInstruction,
  useIssueSiteInstruction,
  useAcknowledgeSiteInstruction,
  useStartSiteInstruction,
  useCompleteSiteInstruction,
  useVerifySiteInstruction,
  useVoidSiteInstruction,
  useSiteInstructionHistory,
  useSiteInstructionComments,
  useAddSiteInstructionComment,
  useSiteInstructionAttachments,
  useUploadSiteInstructionAttachment,
  useDeleteSiteInstructionAttachment,
} from './useSiteInstructions'

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
  in: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  then: vi.fn().mockImplementation((onFulfilled) =>
    Promise.resolve({ data, error }).then(onFulfilled)
  ),
})

// =============================================
// Test Data
// =============================================

const mockSiteInstruction = {
  id: 'si-1',
  project_id: 'project-1',
  reference_number: 'SI-001',
  instruction_number: 'SI-2024-001',
  title: 'Install temporary safety barriers',
  description: 'Safety barriers required on floor 3 perimeter',
  subcontractor_id: 'sub-1',
  status: 'draft',
  priority: 'high',
  due_date: '2024-01-20',
  created_by: 'user-123',
  created_at: '2024-01-15T00:00:00Z',
  requires_acknowledgment: true,
  requires_completion_tracking: true,
}

const mockSubcontractor = {
  id: 'sub-1',
  company_name: 'ABC Safety Co',
  contact_name: 'John Smith',
  email: 'john@abc.com',
  phone: '555-1234',
}

const mockComment = {
  id: 'comment-1',
  site_instruction_id: 'si-1',
  content: 'Please confirm receipt',
  created_by: 'user-123',
  created_at: '2024-01-15T10:00:00Z',
}

const mockAttachment = {
  id: 'attachment-1',
  site_instruction_id: 'si-1',
  file_name: 'safety_plan.pdf',
  file_type: 'application/pdf',
  file_size: 1024000,
  file_url: 'https://storage.example.com/safety_plan.pdf',
  storage_path: 'site-instructions/si-1/safety_plan.pdf',
  uploaded_by: 'user-123',
  uploaded_at: '2024-01-15T08:00:00Z',
}

// =============================================
// Query Keys Tests
// =============================================

describe('siteInstructionKeys', () => {
  it('should have correct base key', () => {
    expect(siteInstructionKeys.all).toEqual(['site-instructions'])
  })

  it('should generate lists key', () => {
    expect(siteInstructionKeys.lists()).toEqual(['site-instructions', 'list'])
  })

  it('should generate list key with project and filters', () => {
    const filters = { status: 'issued' as const, priority: 'high' as const }
    expect(siteInstructionKeys.list('project-1', filters)).toEqual([
      'site-instructions', 'list', 'project-1', filters
    ])
  })

  it('should generate details key', () => {
    expect(siteInstructionKeys.details()).toEqual(['site-instructions', 'detail'])
  })

  it('should generate detail key', () => {
    expect(siteInstructionKeys.detail('si-1')).toEqual(['site-instructions', 'detail', 'si-1'])
  })

  it('should generate history key', () => {
    expect(siteInstructionKeys.history('si-1')).toEqual(['site-instructions', 'history', 'si-1'])
  })

  it('should generate comments key', () => {
    expect(siteInstructionKeys.comments('si-1')).toEqual(['site-instructions', 'comments', 'si-1'])
  })
})

// =============================================
// Query Hooks Tests
// =============================================

describe('useSiteInstructions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch site instructions for project', async () => {
    // Mock the main query and subcontractor query
    mockFrom
      .mockReturnValueOnce(createChainMock([mockSiteInstruction]))
      .mockReturnValue(createChainMock(mockSubcontractor))

    const { result } = renderHook(() => useSiteInstructions('project-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFrom).toHaveBeenCalledWith('site_instructions')
    expect(result.current.data).toBeDefined()
  })

  it('should not fetch when projectId is empty', async () => {
    renderHook(() => useSiteInstructions(''), { wrapper })

    await new Promise((r) => setTimeout(r, 100))
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('should apply status filter (single)', async () => {
    const chainMock = createChainMock([mockSiteInstruction])
    mockFrom.mockReturnValue(chainMock)

    renderHook(
      () => useSiteInstructions('project-1', { status: 'issued' }),
      { wrapper }
    )

    await waitFor(() => expect(mockFrom).toHaveBeenCalled())
    expect(chainMock.eq).toHaveBeenCalledWith('status', 'issued')
  })

  it('should apply status filter (array)', async () => {
    const chainMock = createChainMock([mockSiteInstruction])
    mockFrom.mockReturnValue(chainMock)

    renderHook(
      () => useSiteInstructions('project-1', { status: ['issued', 'acknowledged'] }),
      { wrapper }
    )

    await waitFor(() => expect(mockFrom).toHaveBeenCalled())
    expect(chainMock.in).toHaveBeenCalledWith('status', ['issued', 'acknowledged'])
  })

  it('should apply priority filter', async () => {
    const chainMock = createChainMock([mockSiteInstruction])
    mockFrom.mockReturnValue(chainMock)

    renderHook(
      () => useSiteInstructions('project-1', { priority: 'high' }),
      { wrapper }
    )

    await waitFor(() => expect(mockFrom).toHaveBeenCalled())
    expect(chainMock.eq).toHaveBeenCalledWith('priority', 'high')
  })

  it('should apply subcontractor filter', async () => {
    const chainMock = createChainMock([mockSiteInstruction])
    mockFrom.mockReturnValue(chainMock)

    renderHook(
      () => useSiteInstructions('project-1', { subcontractorId: 'sub-1' }),
      { wrapper }
    )

    await waitFor(() => expect(mockFrom).toHaveBeenCalled())
    expect(chainMock.eq).toHaveBeenCalledWith('subcontractor_id', 'sub-1')
  })

  it('should apply search filter', async () => {
    const chainMock = createChainMock([mockSiteInstruction])
    mockFrom.mockReturnValue(chainMock)

    renderHook(
      () => useSiteInstructions('project-1', { search: 'safety' }),
      { wrapper }
    )

    await waitFor(() => expect(mockFrom).toHaveBeenCalled())
    expect(chainMock.or).toHaveBeenCalled()
  })
})

describe('useSiteInstruction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch single site instruction with details', async () => {
    mockFrom.mockReturnValue(createChainMock(mockSiteInstruction))

    const { result } = renderHook(() => useSiteInstruction('si-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFrom).toHaveBeenCalledWith('site_instructions')
  })

  it('should not fetch when id is empty', async () => {
    renderHook(() => useSiteInstruction(''), { wrapper })

    await new Promise((r) => setTimeout(r, 100))
    expect(mockFrom).not.toHaveBeenCalled()
  })
})

// =============================================
// Mutation Hooks Tests - CRUD
// =============================================

describe('useCreateSiteInstruction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create site instruction with draft status', async () => {
    const chainMock = createChainMock(mockSiteInstruction)
    mockFrom.mockReturnValue(chainMock)

    const { result } = renderHook(() => useCreateSiteInstruction(), { wrapper })

    await result.current.mutateAsync({
      project_id: 'project-1',
      title: 'New instruction',
      description: 'Description',
      subcontractor_id: 'sub-1',
    })

    expect(chainMock.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'draft',
      })
    )
  })
})

describe('useUpdateSiteInstruction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should update site instruction', async () => {
    const chainMock = createChainMock({ ...mockSiteInstruction, title: 'Updated title' })
    mockFrom.mockReturnValue(chainMock)

    const { result } = renderHook(() => useUpdateSiteInstruction(), { wrapper })

    await result.current.mutateAsync({
      id: 'si-1',
      title: 'Updated title',
      priority: 'urgent',
    })

    expect(chainMock.update).toHaveBeenCalled()
    expect(chainMock.eq).toHaveBeenCalledWith('id', 'si-1')
  })
})

describe('useDeleteSiteInstruction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should soft delete site instruction', async () => {
    const chainMock = createChainMock(null)
    mockFrom.mockReturnValue(chainMock)

    const { result } = renderHook(() => useDeleteSiteInstruction(), { wrapper })

    await result.current.mutateAsync('si-1')

    expect(chainMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        deleted_at: expect.any(String),
      })
    )
    expect(chainMock.eq).toHaveBeenCalledWith('id', 'si-1')
  })
})

// =============================================
// Status Workflow Tests
// =============================================

describe('Site Instruction Status Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
  })

  describe('useIssueSiteInstruction', () => {
    it('should issue site instruction (draft → issued)', async () => {
      const chainMock = createChainMock({ ...mockSiteInstruction, status: 'issued' })
      mockFrom.mockReturnValue(chainMock)

      const { result } = renderHook(() => useIssueSiteInstruction(), { wrapper })

      await result.current.mutateAsync('si-1')

      expect(chainMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'issued',
          issued_by: 'user-123',
        })
      )
    })
  })

  describe('useAcknowledgeSiteInstruction', () => {
    it('should acknowledge site instruction', async () => {
      const chainMock = createChainMock({ ...mockSiteInstruction, status: 'acknowledged' })
      mockFrom.mockReturnValue(chainMock)

      const { result } = renderHook(() => useAcknowledgeSiteInstruction(), { wrapper })

      await result.current.mutateAsync({
        id: 'si-1',
        acknowledgedBy: 'sub-user-1',
        signature: 'base64-signature',
        notes: 'Received and understood',
      })

      expect(chainMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'acknowledged',
          acknowledged: true,
          acknowledged_by: 'sub-user-1',
          acknowledgment_signature: 'base64-signature',
          acknowledgment_notes: 'Received and understood',
        })
      )
    })
  })

  describe('useStartSiteInstruction', () => {
    it('should start site instruction (acknowledged → in_progress)', async () => {
      const chainMock = createChainMock({ ...mockSiteInstruction, status: 'in_progress' })
      mockFrom.mockReturnValue(chainMock)

      const { result } = renderHook(() => useStartSiteInstruction(), { wrapper })

      await result.current.mutateAsync('si-1')

      expect(chainMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'in_progress',
        })
      )
    })
  })

  describe('useCompleteSiteInstruction', () => {
    it('should complete site instruction (in_progress → completed)', async () => {
      const chainMock = createChainMock({ ...mockSiteInstruction, status: 'completed' })
      mockFrom.mockReturnValue(chainMock)

      const { result } = renderHook(() => useCompleteSiteInstruction(), { wrapper })

      await result.current.mutateAsync({
        id: 'si-1',
        completedBy: 'sub-user-1',
        notes: 'Work completed as specified',
      })

      expect(chainMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          completed_by: 'sub-user-1',
          completion_status: 'completed',
          completion_notes: 'Work completed as specified',
        })
      )
    })
  })

  describe('useVerifySiteInstruction', () => {
    it('should verify site instruction (completed → verified)', async () => {
      const chainMock = createChainMock({ ...mockSiteInstruction, status: 'verified' })
      mockFrom.mockReturnValue(chainMock)

      const { result } = renderHook(() => useVerifySiteInstruction(), { wrapper })

      await result.current.mutateAsync({
        id: 'si-1',
        notes: 'Verified by site supervisor',
      })

      expect(chainMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'verified',
          verified_by: 'user-123',
          verification_notes: 'Verified by site supervisor',
        })
      )
    })
  })

  describe('useVoidSiteInstruction', () => {
    it('should void site instruction', async () => {
      const chainMock = createChainMock({ ...mockSiteInstruction, status: 'void' })
      mockFrom.mockReturnValue(chainMock)

      const { result } = renderHook(() => useVoidSiteInstruction(), { wrapper })

      await result.current.mutateAsync('si-1')

      expect(chainMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'void',
        })
      )
    })
  })
})

// =============================================
// History & Comments Tests
// =============================================

describe('useSiteInstructionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch history for site instruction', async () => {
    const history = [
      { id: 'h1', action: 'created', performed_at: '2024-01-15T08:00:00Z', performed_by: 'user-123' },
      { id: 'h2', action: 'issued', performed_at: '2024-01-15T09:00:00Z', performed_by: 'user-123' },
    ]
    mockFrom.mockReturnValue(createChainMock(history))

    const { result } = renderHook(() => useSiteInstructionHistory('si-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFrom).toHaveBeenCalledWith('site_instruction_history')
  })
})

describe('useSiteInstructionComments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch comments for site instruction', async () => {
    mockFrom.mockReturnValue(createChainMock([mockComment]))

    const { result } = renderHook(() => useSiteInstructionComments('si-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFrom).toHaveBeenCalledWith('site_instruction_comments')
  })
})

describe('useAddSiteInstructionComment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
  })

  it('should add comment to site instruction', async () => {
    const chainMock = createChainMock(mockComment)
    mockFrom.mockReturnValue(chainMock)

    const { result } = renderHook(() => useAddSiteInstructionComment(), { wrapper })

    await result.current.mutateAsync({
      siteInstructionId: 'si-1',
      content: 'New comment',
    })

    expect(chainMock.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        site_instruction_id: 'si-1',
        content: 'New comment',
        created_by: 'user-123',
      })
    )
  })
})

// =============================================
// Attachments Tests
// =============================================

describe('useSiteInstructionAttachments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch attachments for site instruction', async () => {
    mockFrom.mockReturnValue(createChainMock([mockAttachment]))

    const { result } = renderHook(() => useSiteInstructionAttachments('si-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFrom).toHaveBeenCalledWith('site_instruction_attachments')
  })
})

describe('useUploadSiteInstructionAttachment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockStorageUpload.mockResolvedValue({ error: null })
    mockStorageGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://storage.example.com/file.pdf' } })
  })

  it('should upload attachment', async () => {
    const chainMock = createChainMock(mockAttachment)
    mockFrom.mockReturnValue(chainMock)

    const { result } = renderHook(() => useUploadSiteInstructionAttachment(), { wrapper })

    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
    await result.current.mutateAsync({
      siteInstructionId: 'si-1',
      file,
      description: 'Safety plan document',
    })

    expect(mockStorageUpload).toHaveBeenCalled()
    expect(chainMock.insert).toHaveBeenCalled()
  })
})

describe('useDeleteSiteInstructionAttachment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStorageRemove.mockResolvedValue({ error: null })
  })

  it('should delete attachment', async () => {
    const chainMock = createChainMock(null)
    mockFrom.mockReturnValue(chainMock)

    const { result } = renderHook(() => useDeleteSiteInstructionAttachment(), { wrapper })

    await result.current.mutateAsync({
      attachmentId: 'attachment-1',
      siteInstructionId: 'si-1',
      storagePath: 'site-instructions/si-1/test.pdf',
    })

    expect(mockStorageRemove).toHaveBeenCalledWith(['site-instructions/si-1/test.pdf'])
    expect(chainMock.delete).toHaveBeenCalled()
    expect(chainMock.eq).toHaveBeenCalledWith('id', 'attachment-1')
  })
})

// =============================================
// Error Handling Tests
// =============================================

describe('Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle query error', async () => {
    mockFrom.mockReturnValue(createChainMock(null, { message: 'Network error' }))

    const { result } = renderHook(() => useSiteInstructions('project-1'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeDefined()
  })

  it('should handle mutation error', async () => {
    mockFrom.mockReturnValue(createChainMock(null, { message: 'Validation failed' }))

    const { result } = renderHook(() => useCreateSiteInstruction(), { wrapper })

    await expect(
      result.current.mutateAsync({
        project_id: 'project-1',
        title: '',
        description: 'Test',
        subcontractor_id: 'sub-1',
      })
    ).rejects.toEqual({ message: 'Validation failed' })
  })
})

// =============================================
// Priority Levels Tests
// =============================================

describe('Priority Levels', () => {
  it('should handle different priority levels', async () => {
    const instructions = [
      { ...mockSiteInstruction, id: 'si-1', priority: 'low' },
      { ...mockSiteInstruction, id: 'si-2', priority: 'medium' },
      { ...mockSiteInstruction, id: 'si-3', priority: 'high' },
      { ...mockSiteInstruction, id: 'si-4', priority: 'urgent' },
    ]
    mockFrom.mockReturnValue(createChainMock(instructions))

    const { result } = renderHook(() => useSiteInstructions('project-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(4)
  })
})
