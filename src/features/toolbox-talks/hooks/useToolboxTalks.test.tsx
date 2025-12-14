/**
 * Tests for Toolbox Talks Hooks
 * Comprehensive testing for safety training workflow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Define mock functions before vi.mock calls
const mockGetTopics = vi.fn()
const mockGetTopic = vi.fn()
const mockGetTopicsByCategory = vi.fn()
const mockCreateTopic = vi.fn()
const mockUpdateTopic = vi.fn()
const mockDeleteTopic = vi.fn()

const mockGetTalks = vi.fn()
const mockGetTalk = vi.fn()
const mockGetTalkWithDetails = vi.fn()
const mockGetUpcomingTalks = vi.fn()
const mockGetRecentTalks = vi.fn()
const mockCreateTalk = vi.fn()
const mockUpdateTalk = vi.fn()
const mockStartTalk = vi.fn()
const mockCompleteTalk = vi.fn()
const mockCancelTalk = vi.fn()
const mockDeleteTalk = vi.fn()

const mockGetAttendees = vi.fn()
const mockAddAttendee = vi.fn()
const mockBulkAddAttendees = vi.fn()
const mockSignInAttendee = vi.fn()
const mockQuickSignIn = vi.fn()
const mockMarkAbsent = vi.fn()
const mockMarkExcused = vi.fn()
const mockRemoveAttendee = vi.fn()
const mockBulkSignIn = vi.fn()

const mockGetCertifications = vi.fn()
const mockGetWorkerCertifications = vi.fn()
const mockGetExpiringCertifications = vi.fn()

const mockGetProjectStats = vi.fn()
const mockGetComplianceSummary = vi.fn()
const mockGetAttendanceRate = vi.fn()

const mockShowToast = vi.fn()

// Mock API services
vi.mock('@/lib/api/services/toolbox-talks', () => ({
  toolboxTopicsApi: {
    getTopics: (...args: unknown[]) => mockGetTopics(...args),
    getTopic: (...args: unknown[]) => mockGetTopic(...args),
    getTopicsByCategory: (...args: unknown[]) => mockGetTopicsByCategory(...args),
    createTopic: (...args: unknown[]) => mockCreateTopic(...args),
    updateTopic: (...args: unknown[]) => mockUpdateTopic(...args),
    deleteTopic: (...args: unknown[]) => mockDeleteTopic(...args),
  },
  toolboxTalksApi: {
    getTalks: (...args: unknown[]) => mockGetTalks(...args),
    getTalk: (...args: unknown[]) => mockGetTalk(...args),
    getTalkWithDetails: (...args: unknown[]) => mockGetTalkWithDetails(...args),
    getUpcomingTalks: (...args: unknown[]) => mockGetUpcomingTalks(...args),
    getRecentTalks: (...args: unknown[]) => mockGetRecentTalks(...args),
    createTalk: (...args: unknown[]) => mockCreateTalk(...args),
    updateTalk: (...args: unknown[]) => mockUpdateTalk(...args),
    startTalk: (...args: unknown[]) => mockStartTalk(...args),
    completeTalk: (...args: unknown[]) => mockCompleteTalk(...args),
    cancelTalk: (...args: unknown[]) => mockCancelTalk(...args),
    deleteTalk: (...args: unknown[]) => mockDeleteTalk(...args),
  },
  toolboxAttendeesApi: {
    getAttendees: (...args: unknown[]) => mockGetAttendees(...args),
    addAttendee: (...args: unknown[]) => mockAddAttendee(...args),
    bulkAddAttendees: (...args: unknown[]) => mockBulkAddAttendees(...args),
    signInAttendee: (...args: unknown[]) => mockSignInAttendee(...args),
    quickSignIn: (...args: unknown[]) => mockQuickSignIn(...args),
    markAbsent: (...args: unknown[]) => mockMarkAbsent(...args),
    markExcused: (...args: unknown[]) => mockMarkExcused(...args),
    removeAttendee: (...args: unknown[]) => mockRemoveAttendee(...args),
    bulkSignIn: (...args: unknown[]) => mockBulkSignIn(...args),
  },
  toolboxCertificationsApi: {
    getCertifications: (...args: unknown[]) => mockGetCertifications(...args),
    getWorkerCertifications: (...args: unknown[]) => mockGetWorkerCertifications(...args),
    getExpiringCertifications: (...args: unknown[]) => mockGetExpiringCertifications(...args),
  },
  toolboxStatsApi: {
    getProjectStats: (...args: unknown[]) => mockGetProjectStats(...args),
    getComplianceSummary: (...args: unknown[]) => mockGetComplianceSummary(...args),
    getAttendanceRate: (...args: unknown[]) => mockGetAttendanceRate(...args),
  },
}))

// Mock useToast
vi.mock('@/lib/notifications/ToastContext', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}))

import {
  toolboxKeys,
  useToolboxTopics,
  useToolboxTopic,
  useToolboxTopicsByCategory,
  useCreateTopic,
  useUpdateTopic,
  useDeleteTopic,
  useToolboxTalks,
  useToolboxTalk,
  useToolboxTalkWithDetails,
  useUpcomingToolboxTalks,
  useRecentToolboxTalks,
  useCreateToolboxTalk,
  useUpdateToolboxTalk,
  useStartToolboxTalk,
  useCompleteToolboxTalk,
  useCancelToolboxTalk,
  useDeleteToolboxTalk,
  useToolboxAttendees,
  useAddAttendee,
  useBulkAddAttendees,
  useSignInAttendee,
  useQuickSignIn,
  useMarkAbsent,
  useMarkExcused,
  useRemoveAttendee,
  useBulkSignIn,
  useToolboxCertifications,
  useWorkerCertifications,
  useExpiringCertifications,
  useToolboxTalkStats,
  useComplianceSummary,
  useAttendanceRate,
} from './useToolboxTalks'

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

// =============================================
// Test Data
// =============================================

const mockTopic = {
  id: 'topic-1',
  company_id: 'company-456',
  title: 'Fall Protection Awareness',
  category: 'safety',
  description: 'Training on fall protection equipment and procedures',
  duration_minutes: 30,
  required_frequency_days: 90,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
}

const mockTalk = {
  id: 'talk-1',
  company_id: 'company-456',
  project_id: 'project-1',
  topic_id: 'topic-1',
  talk_number: 'TBT-001',
  scheduled_date: '2024-01-15',
  scheduled_time: '07:00',
  status: 'scheduled',
  presenter_name: 'John Smith',
  location: 'Site Office',
  created_at: '2024-01-01T00:00:00Z',
}

const mockAttendee = {
  id: 'attendee-1',
  toolbox_talk_id: 'talk-1',
  worker_name: 'Mike Johnson',
  worker_company: 'ABC Contractors',
  worker_trade: 'Carpenter',
  status: 'expected',
  created_at: '2024-01-01T00:00:00Z',
}

const mockCertification = {
  id: 'cert-1',
  company_id: 'company-456',
  worker_name: 'Mike Johnson',
  topic_id: 'topic-1',
  completed_date: '2024-01-15',
  expires_date: '2024-04-15',
  status: 'active',
}

const mockStats = {
  total_talks: 25,
  completed_talks: 20,
  scheduled_talks: 5,
  total_attendees: 150,
  attendance_rate: 92.5,
}

// =============================================
// Query Keys Tests
// =============================================

describe('toolboxKeys', () => {
  it('should have correct base key', () => {
    expect(toolboxKeys.all).toEqual(['toolbox-talks'])
  })

  it('should generate topics key', () => {
    expect(toolboxKeys.topics()).toEqual(['toolbox-talks', 'topics'])
  })

  it('should generate topic list key with filters', () => {
    const filters = { companyId: 'company-1', category: 'safety' }
    expect(toolboxKeys.topicList(filters)).toEqual(['toolbox-talks', 'topics', 'list', filters])
  })

  it('should generate topic detail key', () => {
    expect(toolboxKeys.topicDetail('topic-1')).toEqual(['toolbox-talks', 'topics', 'detail', 'topic-1'])
  })

  it('should generate topics by category key', () => {
    expect(toolboxKeys.topicsByCategory('company-1')).toEqual([
      'toolbox-talks', 'topics', 'by-category', 'company-1'
    ])
  })

  it('should generate talks key', () => {
    expect(toolboxKeys.talks()).toEqual(['toolbox-talks', 'talks'])
  })

  it('should generate talk list key with filters', () => {
    const filters = { projectId: 'project-1', status: 'completed' }
    expect(toolboxKeys.talkList(filters)).toEqual(['toolbox-talks', 'talks', 'list', filters])
  })

  it('should generate talk detail key', () => {
    expect(toolboxKeys.talkDetail('talk-1')).toEqual(['toolbox-talks', 'talks', 'detail', 'talk-1'])
  })

  it('should generate talk with details key', () => {
    expect(toolboxKeys.talkWithDetails('talk-1')).toEqual([
      'toolbox-talks', 'talks', 'with-details', 'talk-1'
    ])
  })

  it('should generate upcoming talks key', () => {
    expect(toolboxKeys.upcomingTalks('project-1', 7)).toEqual([
      'toolbox-talks', 'talks', 'upcoming', 'project-1', 7
    ])
  })

  it('should generate recent talks key', () => {
    expect(toolboxKeys.recentTalks('project-1', 10)).toEqual([
      'toolbox-talks', 'talks', 'recent', 'project-1', 10
    ])
  })

  it('should generate attendees key', () => {
    expect(toolboxKeys.attendees('talk-1')).toEqual(['toolbox-talks', 'attendees', 'talk-1'])
  })

  it('should generate certifications key', () => {
    expect(toolboxKeys.certifications()).toEqual(['toolbox-talks', 'certifications'])
  })

  it('should generate worker certifications key', () => {
    expect(toolboxKeys.workerCertifications('company-1', 'Mike Johnson')).toEqual([
      'toolbox-talks', 'certifications', 'worker', 'company-1', 'Mike Johnson'
    ])
  })

  it('should generate expiring certifications key', () => {
    expect(toolboxKeys.expiringCertifications('company-1', 30)).toEqual([
      'toolbox-talks', 'certifications', 'expiring', 'company-1', 30
    ])
  })

  it('should generate stats keys', () => {
    expect(toolboxKeys.stats()).toEqual(['toolbox-talks', 'stats'])
    expect(toolboxKeys.projectStats('project-1')).toEqual([
      'toolbox-talks', 'stats', 'project', 'project-1'
    ])
    expect(toolboxKeys.compliance('company-1')).toEqual([
      'toolbox-talks', 'stats', 'compliance', 'company-1'
    ])
    expect(toolboxKeys.attendanceRate('project-1', 30)).toEqual([
      'toolbox-talks', 'stats', 'attendance-rate', 'project-1', 30
    ])
  })
})

// =============================================
// Topic Query Hooks Tests
// =============================================

describe('Topic Query Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useToolboxTopics', () => {
    it('should fetch topics', async () => {
      mockGetTopics.mockResolvedValue([mockTopic])

      const { result } = renderHook(() => useToolboxTopics(), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetTopics).toHaveBeenCalledWith({})
      expect(result.current.data).toEqual([mockTopic])
    })

    it('should pass filters to API', async () => {
      mockGetTopics.mockResolvedValue([mockTopic])
      const filters = { companyId: 'company-1', category: 'safety' }

      renderHook(() => useToolboxTopics(filters), { wrapper })

      await waitFor(() => expect(mockGetTopics).toHaveBeenCalledWith(filters))
    })
  })

  describe('useToolboxTopic', () => {
    it('should fetch single topic', async () => {
      mockGetTopic.mockResolvedValue(mockTopic)

      const { result } = renderHook(() => useToolboxTopic('topic-1'), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetTopic).toHaveBeenCalledWith('topic-1')
      expect(result.current.data).toEqual(mockTopic)
    })

    it('should not fetch when id is empty', async () => {
      renderHook(() => useToolboxTopic(''), { wrapper })

      await new Promise((r) => setTimeout(r, 100))
      expect(mockGetTopic).not.toHaveBeenCalled()
    })
  })

  describe('useToolboxTopicsByCategory', () => {
    it('should fetch topics grouped by category', async () => {
      const groupedTopics = { safety: [mockTopic], orientation: [] }
      mockGetTopicsByCategory.mockResolvedValue(groupedTopics)

      const { result } = renderHook(() => useToolboxTopicsByCategory('company-1'), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetTopicsByCategory).toHaveBeenCalledWith('company-1')
      expect(result.current.data).toEqual(groupedTopics)
    })
  })
})

// =============================================
// Topic Mutation Hooks Tests
// =============================================

describe('Topic Mutation Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useCreateTopic', () => {
    it('should create topic and show success toast', async () => {
      mockCreateTopic.mockResolvedValue(mockTopic)

      const { result } = renderHook(() => useCreateTopic(), { wrapper })

      await result.current.mutateAsync({
        company_id: 'company-456',
        title: 'Fall Protection Awareness',
        category: 'safety',
      })

      expect(mockCreateTopic).toHaveBeenCalled()
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          title: 'Topic Created',
        })
      )
    })

    it('should show error toast on failure', async () => {
      mockCreateTopic.mockRejectedValue(new Error('Validation failed'))

      const { result } = renderHook(() => useCreateTopic(), { wrapper })

      await expect(
        result.current.mutateAsync({
          company_id: 'company-456',
          title: '',
          category: 'safety',
        })
      ).rejects.toThrow('Validation failed')

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          title: 'Error',
        })
      )
    })
  })

  describe('useUpdateTopic', () => {
    it('should update topic', async () => {
      mockUpdateTopic.mockResolvedValue({ ...mockTopic, title: 'Updated Title' })

      const { result } = renderHook(() => useUpdateTopic(), { wrapper })

      await result.current.mutateAsync({
        id: 'topic-1',
        dto: { title: 'Updated Title' },
      })

      expect(mockUpdateTopic).toHaveBeenCalledWith('topic-1', { title: 'Updated Title' })
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          title: 'Topic Updated',
        })
      )
    })
  })

  describe('useDeleteTopic', () => {
    it('should delete topic', async () => {
      mockDeleteTopic.mockResolvedValue(undefined)

      const { result } = renderHook(() => useDeleteTopic(), { wrapper })

      await result.current.mutateAsync('topic-1')

      expect(mockDeleteTopic).toHaveBeenCalledWith('topic-1')
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          title: 'Topic Deleted',
        })
      )
    })
  })
})

// =============================================
// Talk Query Hooks Tests
// =============================================

describe('Talk Query Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useToolboxTalks', () => {
    it('should fetch talks', async () => {
      mockGetTalks.mockResolvedValue([mockTalk])

      const { result } = renderHook(() => useToolboxTalks(), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetTalks).toHaveBeenCalledWith({})
      expect(result.current.data).toEqual([mockTalk])
    })

    it('should apply filters', async () => {
      mockGetTalks.mockResolvedValue([mockTalk])
      const filters = { projectId: 'project-1', status: 'completed' as const }

      renderHook(() => useToolboxTalks(filters), { wrapper })

      await waitFor(() => expect(mockGetTalks).toHaveBeenCalledWith(filters))
    })
  })

  describe('useToolboxTalk', () => {
    it('should fetch single talk', async () => {
      mockGetTalk.mockResolvedValue(mockTalk)

      const { result } = renderHook(() => useToolboxTalk('talk-1'), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetTalk).toHaveBeenCalledWith('talk-1')
    })
  })

  describe('useToolboxTalkWithDetails', () => {
    it('should fetch talk with details', async () => {
      const talkWithDetails = { ...mockTalk, attendees: [mockAttendee], topic: mockTopic }
      mockGetTalkWithDetails.mockResolvedValue(talkWithDetails)

      const { result } = renderHook(() => useToolboxTalkWithDetails('talk-1'), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetTalkWithDetails).toHaveBeenCalledWith('talk-1')
      expect(result.current.data).toEqual(talkWithDetails)
    })
  })

  describe('useUpcomingToolboxTalks', () => {
    it('should fetch upcoming talks', async () => {
      mockGetUpcomingTalks.mockResolvedValue([mockTalk])

      const { result } = renderHook(() => useUpcomingToolboxTalks('project-1', 7), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetUpcomingTalks).toHaveBeenCalledWith('project-1', 7)
    })
  })

  describe('useRecentToolboxTalks', () => {
    it('should fetch recent talks', async () => {
      mockGetRecentTalks.mockResolvedValue([mockTalk])

      const { result } = renderHook(() => useRecentToolboxTalks('project-1', 10), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetRecentTalks).toHaveBeenCalledWith('project-1', 10)
    })
  })
})

// =============================================
// Talk Mutation Hooks Tests
// =============================================

describe('Talk Mutation Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useCreateToolboxTalk', () => {
    it('should create talk', async () => {
      mockCreateTalk.mockResolvedValue(mockTalk)

      const { result } = renderHook(() => useCreateToolboxTalk(), { wrapper })

      await result.current.mutateAsync({
        company_id: 'company-456',
        project_id: 'project-1',
        topic_id: 'topic-1',
        scheduled_date: '2024-01-15',
      })

      expect(mockCreateTalk).toHaveBeenCalled()
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          title: 'Toolbox Talk Scheduled',
        })
      )
    })
  })

  describe('useStartToolboxTalk', () => {
    it('should start talk', async () => {
      mockStartTalk.mockResolvedValue({ ...mockTalk, status: 'in_progress' })

      const { result } = renderHook(() => useStartToolboxTalk(), { wrapper })

      await result.current.mutateAsync({ id: 'talk-1' })

      expect(mockStartTalk).toHaveBeenCalledWith('talk-1', undefined)
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          title: 'Toolbox Talk Started',
        })
      )
    })
  })

  describe('useCompleteToolboxTalk', () => {
    it('should complete talk', async () => {
      mockCompleteTalk.mockResolvedValue({ ...mockTalk, status: 'completed' })

      const { result } = renderHook(() => useCompleteToolboxTalk(), { wrapper })

      await result.current.mutateAsync({ id: 'talk-1', dto: { notes: 'Good session' } })

      expect(mockCompleteTalk).toHaveBeenCalledWith('talk-1', { notes: 'Good session' })
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          title: 'Toolbox Talk Completed',
        })
      )
    })
  })

  describe('useCancelToolboxTalk', () => {
    it('should cancel talk', async () => {
      mockCancelTalk.mockResolvedValue({ ...mockTalk, status: 'cancelled' })

      const { result } = renderHook(() => useCancelToolboxTalk(), { wrapper })

      await result.current.mutateAsync('talk-1')

      expect(mockCancelTalk).toHaveBeenCalledWith('talk-1')
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          title: 'Toolbox Talk Cancelled',
        })
      )
    })
  })

  describe('useDeleteToolboxTalk', () => {
    it('should delete talk', async () => {
      mockDeleteTalk.mockResolvedValue(undefined)

      const { result } = renderHook(() => useDeleteToolboxTalk(), { wrapper })

      await result.current.mutateAsync('talk-1')

      expect(mockDeleteTalk).toHaveBeenCalledWith('talk-1')
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          title: 'Toolbox Talk Deleted',
        })
      )
    })
  })
})

// =============================================
// Attendee Hooks Tests
// =============================================

describe('Attendee Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useToolboxAttendees', () => {
    it('should fetch attendees', async () => {
      mockGetAttendees.mockResolvedValue([mockAttendee])

      const { result } = renderHook(() => useToolboxAttendees('talk-1'), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetAttendees).toHaveBeenCalledWith('talk-1')
      expect(result.current.data).toEqual([mockAttendee])
    })
  })

  describe('useAddAttendee', () => {
    it('should add attendee', async () => {
      mockAddAttendee.mockResolvedValue(mockAttendee)

      const { result } = renderHook(() => useAddAttendee(), { wrapper })

      await result.current.mutateAsync({
        toolbox_talk_id: 'talk-1',
        worker_name: 'Mike Johnson',
      })

      expect(mockAddAttendee).toHaveBeenCalled()
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          title: 'Attendee Added',
        })
      )
    })
  })

  describe('useBulkAddAttendees', () => {
    it('should bulk add attendees', async () => {
      mockBulkAddAttendees.mockResolvedValue([mockAttendee, { ...mockAttendee, id: 'attendee-2' }])

      const { result } = renderHook(() => useBulkAddAttendees(), { wrapper })

      await result.current.mutateAsync({
        toolbox_talk_id: 'talk-1',
        attendees: [
          { worker_name: 'Mike Johnson' },
          { worker_name: 'Jane Doe' },
        ],
      })

      expect(mockBulkAddAttendees).toHaveBeenCalled()
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          title: 'Attendees Added',
          message: '2 attendees have been added.',
        })
      )
    })
  })

  describe('useSignInAttendee', () => {
    it('should sign in attendee with signature', async () => {
      mockSignInAttendee.mockResolvedValue({ ...mockAttendee, status: 'present' })

      const { result } = renderHook(() => useSignInAttendee(), { wrapper })

      await result.current.mutateAsync({
        attendeeId: 'attendee-1',
        talkId: 'talk-1',
        dto: { signature_data: 'base64-signature' },
      })

      expect(mockSignInAttendee).toHaveBeenCalledWith('attendee-1', { signature_data: 'base64-signature' })
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          title: 'Signed In',
        })
      )
    })
  })

  describe('useQuickSignIn', () => {
    it('should quick sign in attendee', async () => {
      mockQuickSignIn.mockResolvedValue({ ...mockAttendee, status: 'present' })

      const { result } = renderHook(() => useQuickSignIn(), { wrapper })

      await result.current.mutateAsync({ attendeeId: 'attendee-1', talkId: 'talk-1' })

      expect(mockQuickSignIn).toHaveBeenCalledWith('attendee-1')
    })
  })

  describe('useMarkAbsent', () => {
    it('should mark attendee absent', async () => {
      mockMarkAbsent.mockResolvedValue({ ...mockAttendee, status: 'absent' })

      const { result } = renderHook(() => useMarkAbsent(), { wrapper })

      await result.current.mutateAsync({
        attendeeId: 'attendee-1',
        talkId: 'talk-1',
        notes: 'Called in sick',
      })

      expect(mockMarkAbsent).toHaveBeenCalledWith('attendee-1', 'Called in sick')
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'info',
          title: 'Marked Absent',
        })
      )
    })
  })

  describe('useMarkExcused', () => {
    it('should mark attendee excused', async () => {
      mockMarkExcused.mockResolvedValue({ ...mockAttendee, status: 'excused' })

      const { result } = renderHook(() => useMarkExcused(), { wrapper })

      await result.current.mutateAsync({
        attendeeId: 'attendee-1',
        talkId: 'talk-1',
        notes: 'On another project',
      })

      expect(mockMarkExcused).toHaveBeenCalledWith('attendee-1', 'On another project')
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'info',
          title: 'Marked Excused',
        })
      )
    })
  })

  describe('useRemoveAttendee', () => {
    it('should remove attendee', async () => {
      mockRemoveAttendee.mockResolvedValue(undefined)

      const { result } = renderHook(() => useRemoveAttendee(), { wrapper })

      await result.current.mutateAsync({ attendeeId: 'attendee-1', talkId: 'talk-1' })

      expect(mockRemoveAttendee).toHaveBeenCalledWith('attendee-1')
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          title: 'Attendee Removed',
        })
      )
    })
  })

  describe('useBulkSignIn', () => {
    it('should bulk sign in all attendees', async () => {
      mockBulkSignIn.mockResolvedValue(5)

      const { result } = renderHook(() => useBulkSignIn(), { wrapper })

      await result.current.mutateAsync('talk-1')

      expect(mockBulkSignIn).toHaveBeenCalledWith('talk-1')
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          title: 'All Signed In',
          message: '5 attendees have been signed in.',
        })
      )
    })
  })
})

// =============================================
// Certification Hooks Tests
// =============================================

describe('Certification Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useToolboxCertifications', () => {
    it('should fetch certifications', async () => {
      mockGetCertifications.mockResolvedValue([mockCertification])

      const { result } = renderHook(() => useToolboxCertifications(), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetCertifications).toHaveBeenCalledWith({})
      expect(result.current.data).toEqual([mockCertification])
    })

    it('should pass filters', async () => {
      mockGetCertifications.mockResolvedValue([mockCertification])
      const filters = { companyId: 'company-1', status: 'expiring' }

      renderHook(() => useToolboxCertifications(filters), { wrapper })

      await waitFor(() => expect(mockGetCertifications).toHaveBeenCalledWith(filters))
    })
  })

  describe('useWorkerCertifications', () => {
    it('should fetch worker certifications', async () => {
      mockGetWorkerCertifications.mockResolvedValue([mockCertification])

      const { result } = renderHook(
        () => useWorkerCertifications('company-1', 'Mike Johnson'),
        { wrapper }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetWorkerCertifications).toHaveBeenCalledWith('company-1', 'Mike Johnson')
    })

    it('should not fetch when params are empty', async () => {
      renderHook(() => useWorkerCertifications('', ''), { wrapper })

      await new Promise((r) => setTimeout(r, 100))
      expect(mockGetWorkerCertifications).not.toHaveBeenCalled()
    })
  })

  describe('useExpiringCertifications', () => {
    it('should fetch expiring certifications', async () => {
      mockGetExpiringCertifications.mockResolvedValue([mockCertification])

      const { result } = renderHook(
        () => useExpiringCertifications('company-1', 30),
        { wrapper }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetExpiringCertifications).toHaveBeenCalledWith('company-1', 30)
    })
  })
})

// =============================================
// Stats Hooks Tests
// =============================================

describe('Stats Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useToolboxTalkStats', () => {
    it('should fetch project stats', async () => {
      mockGetProjectStats.mockResolvedValue(mockStats)

      const { result } = renderHook(() => useToolboxTalkStats('project-1'), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetProjectStats).toHaveBeenCalledWith('project-1')
      expect(result.current.data).toEqual(mockStats)
    })
  })

  describe('useComplianceSummary', () => {
    it('should fetch compliance summary', async () => {
      const compliance = {
        total_workers: 50,
        compliant_workers: 45,
        compliance_rate: 90,
        expiring_soon: 5,
      }
      mockGetComplianceSummary.mockResolvedValue(compliance)

      const { result } = renderHook(() => useComplianceSummary('company-1'), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetComplianceSummary).toHaveBeenCalledWith('company-1')
      expect(result.current.data).toEqual(compliance)
    })
  })

  describe('useAttendanceRate', () => {
    it('should fetch attendance rate', async () => {
      const rate = { rate: 92.5, total_expected: 100, total_present: 92 }
      mockGetAttendanceRate.mockResolvedValue(rate)

      const { result } = renderHook(() => useAttendanceRate('project-1', 30), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetAttendanceRate).toHaveBeenCalledWith('project-1', 30)
      expect(result.current.data).toEqual(rate)
    })
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
    mockGetTalks.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useToolboxTalks(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeDefined()
  })

  it('should show error toast on mutation failure', async () => {
    mockCreateTalk.mockRejectedValue(new Error('Validation failed'))

    const { result } = renderHook(() => useCreateToolboxTalk(), { wrapper })

    await expect(
      result.current.mutateAsync({
        company_id: 'company-456',
        project_id: 'project-1',
        topic_id: 'topic-1',
        scheduled_date: '',
      })
    ).rejects.toThrow('Validation failed')

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        title: 'Error',
      })
    )
  })
})
