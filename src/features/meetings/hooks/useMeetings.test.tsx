// File: /src/features/meetings/hooks/useMeetings.test.tsx
// Tests for meetings hooks

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Create mock functions before vi.mock calls
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockIs = vi.fn()
const mockOrder = vi.fn()
const mockSingle = vi.fn()

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    })),
  },
}))

import {
  useMeetings,
  useAllMeetings,
  useMeeting,
  useCreateMeeting,
  useUpdateMeeting,
  useDeleteMeeting,
  useAddActionItem,
  useUpdateActionItem,
  MEETING_TYPES,
  MEETING_STATUSES,
  ACTION_ITEM_PRIORITIES,
  ACTION_ITEM_CATEGORIES,
  ATTENDEE_REPRESENTING,
  MeetingType,
  MeetingStatus,
  MeetingAttendee,
  MeetingActionItem,
  MeetingWithDetails,
} from './useMeetings'

// Test wrapper
const createWrapper = () => {
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

// Mock meeting data
const mockMeeting: MeetingWithDetails = {
  id: 'meeting-1',
  company_id: 'company-123',
  project_id: 'project-123',
  title: 'OAC Meeting #1',
  meeting_type: 'oac_meeting',
  meeting_date: '2024-03-15',
  start_time: '09:00:00',
  end_time: '10:00:00',
  location: 'Conference Room A',
  status: 'scheduled',
  agenda: 'Test agenda',
  notes: 'Test notes',
  attendees: [
    { name: 'John Doe', company: 'Acme Corp', present: true },
  ],
  action_items: [
    {
      id: 'action-1',
      description: 'Review drawings',
      status: 'open',
      assignee: 'Jane Smith',
      dueDate: '2024-03-22',
    },
  ],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'user-123',
  deleted_at: null,
}

describe('useMeetings hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Constants', () => {
    describe('MEETING_TYPES', () => {
      it('should have expected meeting types', () => {
        expect(MEETING_TYPES.length).toBeGreaterThan(0)

        const typeValues = MEETING_TYPES.map((t) => t.value)
        expect(typeValues).toContain('oac_meeting')
        expect(typeValues).toContain('progress_meeting')
        expect(typeValues).toContain('safety_meeting')
        expect(typeValues).toContain('kickoff_meeting')
        expect(typeValues).toContain('closeout_meeting')
        expect(typeValues).toContain('subcontractor_meeting')
        expect(typeValues).toContain('other')
      })

      it('should have labels for all types', () => {
        MEETING_TYPES.forEach((type) => {
          expect(type.label).toBeDefined()
          expect(type.label.length).toBeGreaterThan(0)
        })
      })
    })

    describe('MEETING_STATUSES', () => {
      it('should have expected statuses', () => {
        const statusValues = MEETING_STATUSES.map((s) => s.value)
        expect(statusValues).toContain('scheduled')
        expect(statusValues).toContain('in_progress')
        expect(statusValues).toContain('completed')
        expect(statusValues).toContain('cancelled')
        expect(statusValues).toContain('postponed')
      })

      it('should have labels for all statuses', () => {
        MEETING_STATUSES.forEach((status) => {
          expect(status.label).toBeDefined()
        })
      })
    })

    describe('ACTION_ITEM_PRIORITIES', () => {
      it('should have expected priorities', () => {
        const priorityValues = ACTION_ITEM_PRIORITIES.map((p) => p.value)
        expect(priorityValues).toContain('high')
        expect(priorityValues).toContain('medium')
        expect(priorityValues).toContain('low')
      })

      it('should have labels and colors for all priorities', () => {
        ACTION_ITEM_PRIORITIES.forEach((priority) => {
          expect(priority.label).toBeDefined()
          expect(priority.color).toBeDefined()
        })
      })
    })

    describe('ACTION_ITEM_CATEGORIES', () => {
      it('should have expected categories', () => {
        const categoryValues = ACTION_ITEM_CATEGORIES.map((c) => c.value)
        expect(categoryValues).toContain('design')
        expect(categoryValues).toContain('schedule')
        expect(categoryValues).toContain('safety')
        expect(categoryValues).toContain('procurement')
        expect(categoryValues).toContain('quality')
        expect(categoryValues).toContain('other')
      })
    })

    describe('ATTENDEE_REPRESENTING', () => {
      it('should have expected representing options', () => {
        const repValues = ATTENDEE_REPRESENTING.map((r) => r.value)
        expect(repValues).toContain('owner')
        expect(repValues).toContain('gc')
        expect(repValues).toContain('subcontractor')
        expect(repValues).toContain('architect')
        expect(repValues).toContain('engineer')
      })
    })
  })

  describe('useMeetings hook', () => {
    it('should fetch meetings for a project', async () => {
      mockSelect.mockReturnValue({ eq: mockEq })
      mockEq.mockReturnValue({ is: mockIs })
      mockIs.mockReturnValue({ order: mockOrder })
      mockOrder.mockResolvedValue({ data: [mockMeeting], error: null })

      const { result } = renderHook(() => useMeetings('project-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toHaveLength(1)
    })

    it('should be disabled when projectId is undefined', () => {
      const { result } = renderHook(() => useMeetings(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })

    it('should handle errors', async () => {
      const testError = new Error('Database error')
      mockSelect.mockReturnValue({ eq: mockEq })
      mockEq.mockReturnValue({ is: mockIs })
      mockIs.mockReturnValue({ order: mockOrder })
      mockOrder.mockResolvedValue({ data: null, error: testError })

      const { result } = renderHook(() => useMeetings('project-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error).toBe(testError)
    })
  })

  describe('useAllMeetings hook', () => {
    it('should fetch all meetings', async () => {
      mockSelect.mockReturnValue({ is: mockIs })
      mockIs.mockReturnValue({ order: mockOrder })
      mockOrder.mockResolvedValue({
        data: [{ ...mockMeeting, projects: { id: 'project-123', name: 'Test Project' } }],
        error: null,
      })

      const { result } = renderHook(() => useAllMeetings(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toHaveLength(1)
      expect(result.current.data?.[0].projects?.name).toBe('Test Project')
    })
  })

  describe('useMeeting hook', () => {
    it('should fetch a single meeting by ID', async () => {
      mockSelect.mockReturnValue({ eq: mockEq })
      mockEq.mockReturnValue({ single: mockSingle })
      mockSingle.mockResolvedValue({
        data: { ...mockMeeting, projects: { id: 'project-123', name: 'Test Project' } },
        error: null,
      })

      const { result } = renderHook(() => useMeeting('meeting-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data?.id).toBe('meeting-1')
    })

    it('should be disabled when meetingId is undefined', () => {
      const { result } = renderHook(() => useMeeting(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useCreateMeeting hook', () => {
    it('should create a new meeting', async () => {
      mockInsert.mockReturnValue({ select: mockSelect })
      mockSelect.mockReturnValue({ single: mockSingle })
      mockSingle.mockResolvedValue({ data: mockMeeting, error: null })

      const { result } = renderHook(() => useCreateMeeting(), {
        wrapper: createWrapper(),
      })

      const newMeeting = {
        project_id: 'project-123',
        company_id: 'company-123',
        title: 'New Meeting',
        meeting_type: 'oac_meeting',
        meeting_date: '2024-03-20',
      }

      await result.current.mutateAsync(newMeeting)

      expect(mockInsert).toHaveBeenCalledWith(newMeeting)
    })
  })

  describe('useUpdateMeeting hook', () => {
    it('should update an existing meeting', async () => {
      mockUpdate.mockReturnValue({ eq: mockEq })
      mockEq.mockReturnValue({ select: mockSelect })
      mockSelect.mockReturnValue({ single: mockSingle })
      mockSingle.mockResolvedValue({ data: mockMeeting, error: null })

      const { result } = renderHook(() => useUpdateMeeting(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({
        id: 'meeting-1',
        title: 'Updated Title',
      })

      expect(mockUpdate).toHaveBeenCalledWith({ title: 'Updated Title' })
    })
  })

  describe('useDeleteMeeting hook', () => {
    it('should soft delete a meeting', async () => {
      mockUpdate.mockReturnValue({ eq: mockEq })
      mockEq.mockResolvedValue({ error: null })

      const { result } = renderHook(() => useDeleteMeeting(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync('meeting-1')

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          deleted_at: expect.any(String),
        })
      )
    })
  })

  describe('useAddActionItem hook', () => {
    it('should add action item to meeting', async () => {
      // First mock the select to get existing action items
      mockSelect.mockReturnValueOnce({ eq: mockEq })
      mockEq.mockReturnValueOnce({ single: mockSingle })
      mockSingle.mockResolvedValueOnce({
        data: { action_items: [] },
        error: null,
      })

      // Then mock the update
      mockUpdate.mockReturnValue({ eq: mockEq })
      mockEq.mockReturnValue({ select: mockSelect })
      mockSelect.mockReturnValue({ single: mockSingle })
      mockSingle.mockResolvedValueOnce({ data: mockMeeting, error: null })

      const { result } = renderHook(() => useAddActionItem(), {
        wrapper: createWrapper(),
      })

      const newActionItem = {
        description: 'New action item',
        status: 'open' as const,
        assignee: 'John Doe',
      }

      await result.current.mutateAsync({
        meetingId: 'meeting-1',
        actionItem: newActionItem,
      })

      expect(mockUpdate).toHaveBeenCalled()
    })
  })

  describe('useUpdateActionItem hook', () => {
    it('should update action item in meeting', async () => {
      // First mock the select to get existing action items
      const existingActionItems = [
        { id: 'action-1', description: 'Test', status: 'open' },
      ]
      mockSelect.mockReturnValueOnce({ eq: mockEq })
      mockEq.mockReturnValueOnce({ single: mockSingle })
      mockSingle.mockResolvedValueOnce({
        data: { action_items: existingActionItems },
        error: null,
      })

      // Then mock the update
      mockUpdate.mockReturnValue({ eq: mockEq })
      mockEq.mockReturnValue({ select: mockSelect })
      mockSelect.mockReturnValue({ single: mockSingle })
      mockSingle.mockResolvedValueOnce({ data: mockMeeting, error: null })

      const { result } = renderHook(() => useUpdateActionItem(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({
        meetingId: 'meeting-1',
        actionItemId: 'action-1',
        updates: { status: 'completed' as const },
      })

      expect(mockUpdate).toHaveBeenCalled()
    })
  })

  describe('MeetingAttendee interface', () => {
    it('should define attendee structure', () => {
      const attendee: MeetingAttendee = {
        name: 'John Doe',
        company: 'Acme Corp',
        email: 'john@acme.com',
        phone: '555-1234',
        role: 'Project Manager',
        title: 'PM',
        trade: 'General',
        representing: 'gc',
        present: true,
        required: true,
        signature: 'data:image/png;base64,...',
        signed_at: '2024-03-15T09:00:00Z',
        notes: 'Test notes',
      }

      expect(attendee.name).toBe('John Doe')
      expect(attendee.present).toBe(true)
      expect(attendee.representing).toBe('gc')
    })

    it('should allow minimal attendee', () => {
      const attendee: MeetingAttendee = {
        name: 'Jane Smith',
      }

      expect(attendee.name).toBe('Jane Smith')
    })
  })

  describe('MeetingActionItem interface', () => {
    it('should define action item structure', () => {
      const actionItem: MeetingActionItem = {
        id: 'action-1',
        description: 'Review drawings',
        assignee: 'John Doe',
        assignee_company: 'Acme Corp',
        assignee_email: 'john@acme.com',
        dueDate: '2024-03-22',
        created_at: '2024-03-15T00:00:00Z',
        completedDate: null,
        status: 'open',
        priority: 'high',
        category: 'design',
        cost_impact: false,
        schedule_impact: true,
        schedule_impact_days: 5,
        related_item_type: 'rfi',
        related_item_id: 'rfi-123',
        notes: 'Important',
      }

      expect(actionItem.id).toBe('action-1')
      expect(actionItem.status).toBe('open')
      expect(actionItem.schedule_impact).toBe(true)
    })

    it('should require only id, description, and status', () => {
      const actionItem: MeetingActionItem = {
        id: 'action-2',
        description: 'Simple task',
        status: 'open',
      }

      expect(actionItem.description).toBe('Simple task')
    })

    it('should support all status values', () => {
      const statuses: MeetingActionItem['status'][] = [
        'open',
        'in_progress',
        'completed',
        'cancelled',
      ]

      statuses.forEach((status) => {
        const item: MeetingActionItem = {
          id: 'test',
          description: 'Test',
          status,
        }
        expect(item.status).toBe(status)
      })
    })
  })
})
