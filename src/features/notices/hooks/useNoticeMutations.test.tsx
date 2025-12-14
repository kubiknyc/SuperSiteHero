/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// Define mock functions BEFORE vi.mock calls (hoisting requirement)
const mockCreateNotice = vi.fn()
const mockUpdateNotice = vi.fn()
const mockDeleteNotice = vi.fn()
const mockUpdateNoticeStatus = vi.fn()
const mockRecordResponse = vi.fn()
const mockUploadDocument = vi.fn()

const mockUser = { id: 'user-1', email: 'test@example.com' }
const mockUserProfile = { id: 'profile-1', company_id: 'company-1' }
const mockUseAuth = vi.fn(() => ({ user: mockUser, userProfile: mockUserProfile }))

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock the API service
vi.mock('@/lib/api/services/notices', () => ({
  noticesApi: {
    createNotice: (...args: unknown[]) => mockCreateNotice(...args),
    updateNotice: (...args: unknown[]) => mockUpdateNotice(...args),
    deleteNotice: (...args: unknown[]) => mockDeleteNotice(...args),
    updateNoticeStatus: (...args: unknown[]) => mockUpdateNoticeStatus(...args),
    recordResponse: (...args: unknown[]) => mockRecordResponse(...args),
    uploadDocument: (...args: unknown[]) => mockUploadDocument(...args),
  },
}))

// Mock useNotifications which is used by useMutationWithNotification
vi.mock('@/lib/notifications/useNotifications', () => ({
  useNotifications: () => ({
    handleError: vi.fn(),
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn(),
    showInfo: vi.fn(),
  }),
}))

vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

import {
  useCreateNoticeWithNotification,
  useUpdateNoticeWithNotification,
  useDeleteNoticeWithNotification,
  useUpdateNoticeStatusWithNotification,
  useRecordNoticeResponseWithNotification,
  useUploadNoticeDocumentWithNotification,
} from './useNoticeMutations'

// Test wrapper with QueryClientProvider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

// Sample test data
const mockNotice = {
  id: 'notice-1',
  project_id: 'project-1',
  company_id: 'company-1',
  notice_type: 'delay',
  subject: 'Weather Delay Notice',
  description: 'Work suspended due to heavy rain',
  direction: 'outgoing',
  status: 'draft',
  is_critical: false,
  notice_date: '2025-01-10',
  response_due_date: '2025-01-20',
  created_at: '2025-01-10T00:00:00Z',
  created_by: 'user-1',
}

describe('useCreateNoticeWithNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: mockUser, userProfile: mockUserProfile })
  })

  it('should create a notice successfully', async () => {
    mockCreateNotice.mockResolvedValue(mockNotice)

    const { result } = renderHook(() => useCreateNoticeWithNotification(), {
      wrapper: createWrapper(),
    })

    const input = {
      project_id: 'project-1',
      notice_type: 'delay',
      subject: 'Weather Delay Notice',
      direction: 'outgoing',
      notice_date: '2025-01-10',
    }

    result.current.mutate(input as any)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockCreateNotice).toHaveBeenCalledWith(input, 'profile-1')
  })

  it('should throw error when user not authenticated', async () => {
    mockUseAuth.mockReturnValue({ user: null, userProfile: null })

    const { result } = renderHook(() => useCreateNoticeWithNotification(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      project_id: 'project-1',
      notice_type: 'delay',
      subject: 'Test Notice',
      direction: 'outgoing',
      notice_date: '2025-01-10',
    } as any)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('User must be authenticated')
  })

  it('should throw error when project_id is missing', async () => {
    const { result } = renderHook(() => useCreateNoticeWithNotification(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      notice_type: 'delay',
      subject: 'Test Notice',
      direction: 'outgoing',
      notice_date: '2025-01-10',
    } as any)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('Project ID is required')
  })

  it('should throw error when subject is missing', async () => {
    const { result } = renderHook(() => useCreateNoticeWithNotification(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      project_id: 'project-1',
      notice_type: 'delay',
      subject: '',
      direction: 'outgoing',
      notice_date: '2025-01-10',
    } as any)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('Notice subject is required')
  })
})

describe('useUpdateNoticeWithNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: mockUser, userProfile: mockUserProfile })
  })

  it('should update a notice successfully', async () => {
    const updatedNotice = { ...mockNotice, subject: 'Updated Subject' }
    mockUpdateNotice.mockResolvedValue(updatedNotice)

    const { result } = renderHook(() => useUpdateNoticeWithNotification(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      id: 'notice-1',
      updates: { subject: 'Updated Subject' },
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockUpdateNotice).toHaveBeenCalledWith('notice-1', { subject: 'Updated Subject' })
  })

  it('should throw error when id is missing', async () => {
    const { result } = renderHook(() => useUpdateNoticeWithNotification(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      id: '',
      updates: { subject: 'Test' },
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('Notice ID is required')
  })

  it('should handle update error', async () => {
    mockUpdateNotice.mockRejectedValue(new Error('Update failed'))

    const { result } = renderHook(() => useUpdateNoticeWithNotification(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      id: 'notice-1',
      updates: { subject: 'Updated' },
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Update failed')
  })
})

describe('useDeleteNoticeWithNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: mockUser, userProfile: mockUserProfile })
  })

  it('should delete a notice successfully', async () => {
    mockDeleteNotice.mockResolvedValue(undefined)

    const { result } = renderHook(() => useDeleteNoticeWithNotification(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ id: 'notice-1', projectId: 'project-1' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockDeleteNotice).toHaveBeenCalledWith('notice-1')
  })

  it('should throw error when id is missing', async () => {
    const { result } = renderHook(() => useDeleteNoticeWithNotification(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ id: '', projectId: 'project-1' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('Notice ID is required')
  })
})

describe('useUpdateNoticeStatusWithNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: mockUser, userProfile: mockUserProfile })
  })

  it('should update notice status to sent', async () => {
    const sentNotice = { ...mockNotice, status: 'sent' }
    mockUpdateNoticeStatus.mockResolvedValue(sentNotice)

    const { result } = renderHook(() => useUpdateNoticeStatusWithNotification(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      id: 'notice-1',
      status: 'sent',
      projectId: 'project-1',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockUpdateNoticeStatus).toHaveBeenCalledWith('notice-1', 'sent')
  })

  it('should update notice status to acknowledged', async () => {
    const acknowledgedNotice = { ...mockNotice, status: 'acknowledged' }
    mockUpdateNoticeStatus.mockResolvedValue(acknowledgedNotice)

    const { result } = renderHook(() => useUpdateNoticeStatusWithNotification(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      id: 'notice-1',
      status: 'acknowledged',
      projectId: 'project-1',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockUpdateNoticeStatus).toHaveBeenCalledWith('notice-1', 'acknowledged')
  })

  it('should update notice status to closed', async () => {
    const closedNotice = { ...mockNotice, status: 'closed' }
    mockUpdateNoticeStatus.mockResolvedValue(closedNotice)

    const { result } = renderHook(() => useUpdateNoticeStatusWithNotification(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      id: 'notice-1',
      status: 'closed',
      projectId: 'project-1',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockUpdateNoticeStatus).toHaveBeenCalledWith('notice-1', 'closed')
  })

  it('should throw error when id is missing', async () => {
    const { result } = renderHook(() => useUpdateNoticeStatusWithNotification(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      id: '',
      status: 'sent',
      projectId: 'project-1',
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('Notice ID is required')
  })

  it('should throw error when status is missing', async () => {
    const { result } = renderHook(() => useUpdateNoticeStatusWithNotification(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      id: 'notice-1',
      status: '',
      projectId: 'project-1',
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('Status is required')
  })
})

describe('useRecordNoticeResponseWithNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: mockUser, userProfile: mockUserProfile })
  })

  it('should record a response successfully', async () => {
    const respondedNotice = {
      ...mockNotice,
      status: 'responded',
      response_date: '2025-01-15',
      response_status: 'submitted',
    }
    mockRecordResponse.mockResolvedValue(respondedNotice)

    const { result } = renderHook(() => useRecordNoticeResponseWithNotification(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      id: 'notice-1',
      projectId: 'project-1',
      response: {
        response_date: '2025-01-15',
        response_status: 'submitted',
      },
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockRecordResponse).toHaveBeenCalledWith('notice-1', {
      response_date: '2025-01-15',
      response_status: 'submitted',
    })
  })

  it('should record response with document URL', async () => {
    const respondedNotice = {
      ...mockNotice,
      status: 'responded',
      response_date: '2025-01-15',
      response_document_url: 'https://example.com/response.pdf',
    }
    mockRecordResponse.mockResolvedValue(respondedNotice)

    const { result } = renderHook(() => useRecordNoticeResponseWithNotification(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      id: 'notice-1',
      projectId: 'project-1',
      response: {
        response_date: '2025-01-15',
        response_document_url: 'https://example.com/response.pdf',
      },
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('should throw error when id is missing', async () => {
    const { result } = renderHook(() => useRecordNoticeResponseWithNotification(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      id: '',
      projectId: 'project-1',
      response: { response_date: '2025-01-15' },
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('Notice ID is required')
  })

  it('should throw error when response_date is missing', async () => {
    const { result } = renderHook(() => useRecordNoticeResponseWithNotification(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      id: 'notice-1',
      projectId: 'project-1',
      response: { response_status: 'submitted' } as any,
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('Response date is required')
  })
})

describe('useUploadNoticeDocumentWithNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: mockUser, userProfile: mockUserProfile })
  })

  it('should upload notice document successfully', async () => {
    const documentUrl = 'https://storage.example.com/notices/doc.pdf'
    mockUploadDocument.mockResolvedValue(documentUrl)

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })

    const { result } = renderHook(() => useUploadNoticeDocumentWithNotification(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      projectId: 'project-1',
      noticeId: 'notice-1',
      file,
      type: 'notice',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockUploadDocument).toHaveBeenCalledWith('project-1', 'notice-1', file, 'notice')
  })

  it('should upload response document successfully', async () => {
    const documentUrl = 'https://storage.example.com/notices/response.pdf'
    mockUploadDocument.mockResolvedValue(documentUrl)

    const file = new File(['content'], 'response.pdf', { type: 'application/pdf' })

    const { result } = renderHook(() => useUploadNoticeDocumentWithNotification(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      projectId: 'project-1',
      noticeId: 'notice-1',
      file,
      type: 'response',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockUploadDocument).toHaveBeenCalledWith('project-1', 'notice-1', file, 'response')
  })

  it('should throw error when projectId or noticeId is missing', async () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })

    const { result } = renderHook(() => useUploadNoticeDocumentWithNotification(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      projectId: '',
      noticeId: 'notice-1',
      file,
      type: 'notice',
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('Project ID and Notice ID are required')
  })

  it('should throw error when file is missing', async () => {
    const { result } = renderHook(() => useUploadNoticeDocumentWithNotification(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      projectId: 'project-1',
      noticeId: 'notice-1',
      file: null as any,
      type: 'notice',
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toContain('File is required')
  })

  it('should handle upload error', async () => {
    mockUploadDocument.mockRejectedValue(new Error('Upload failed'))

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })

    const { result } = renderHook(() => useUploadNoticeDocumentWithNotification(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      projectId: 'project-1',
      noticeId: 'notice-1',
      file,
      type: 'notice',
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Upload failed')
  })
})
