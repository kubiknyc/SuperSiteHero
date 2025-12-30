import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { supabase } from '@/lib/supabase'
import {
  meetingsApi,
  meetingNotesApi,
  meetingActionItemsApi,
  meetingAttendeesApi,
  meetingAttachmentsApi,
} from '../meetings'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getUser: vi.fn() },
    storage: { from: vi.fn() },
  },
}))

describe('Meetings API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user123' } },
      error: null,
    } as any)
  })

  describe('getMeetings', () => {
    it('should fetch meetings with filters', async () => {
      const mockMeetings = [
        { id: '1', title: 'Project Kickoff', status: 'scheduled' },
        { id: '2', title: 'Weekly Sync', status: 'completed' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ data: mockMeetings, error: null })),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await meetingsApi.getMeetings({ project_id: 'proj1' })

      expect(result).toHaveLength(2)
      expect(mockQuery.eq).toHaveBeenCalledWith('project_id', 'proj1')
    })

    it('should apply date range filter', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ data: [], error: null })),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await meetingsApi.getMeetings({
        date_from: '2024-12-01',
        date_to: '2024-12-31',
      })

      expect(mockQuery.gte).toHaveBeenCalledWith('meeting_date', '2024-12-01')
      expect(mockQuery.lte).toHaveBeenCalledWith('meeting_date', '2024-12-31')
    })

    it('should apply search filter', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ data: [], error: null })),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await meetingsApi.getMeetings({ search: 'kickoff' })

      expect(mockQuery.or).toHaveBeenCalled()
    })
  })

  describe('createMeeting', () => {
    it('should create new meeting', async () => {
      const newMeeting = {
        project_id: 'proj1',
        title: 'Design Review',
        meeting_type: 'design_review',
        meeting_date: '2024-12-25',
        start_time: '10:00',
      }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'meet1', ...newMeeting, created_by: 'user123' },
          error: null
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await meetingsApi.createMeeting(newMeeting)

      expect(result.title).toBe('Design Review')
      expect(result.created_by).toBe('user123')
    })
  })

  describe('updateMeeting', () => {
    it('should update meeting', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: '1', status: 'completed' },
          error: null
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await meetingsApi.updateMeeting('1', { status: 'completed' })

      expect(result.status).toBe('completed')
    })
  })

  describe('publishMinutes', () => {
    it('should publish meeting minutes', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: '1', minutes_published: true },
          error: null
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await meetingsApi.publishMinutes('1')

      expect(result.minutes_published).toBe(true)
    })
  })

  describe('getMeetingWithDetails', () => {
    it('should fetch meeting with all related data', async () => {
      const mockMeeting = { id: '1', title: 'Test Meeting' }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockMeeting, error: null }),
      }

      const mockNotes = [{ id: 'note1', content: 'Note 1' }]
      const mockActionItems = [{ id: 'ai1', description: 'Action 1' }]
      const mockAttendees = [{ id: 'att1', name: 'John Doe' }]
      const mockAttachments = [{ id: 'atch1', file_name: 'file.pdf' }]

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      // Mock the related queries
      const mockNotesQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: mockNotes, error: null }) }
      const mockActionQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: mockActionItems, error: null }) }
      const mockAttendeeQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), mockResolvedValue: vi.fn().mockResolvedValue({ data: mockAttendees, error: null }) }
      mockAttendeeQuery.order.mockReturnValue({ ...mockAttendeeQuery, order: vi.fn().mockResolvedValue({ data: mockAttendees, error: null }) })
      const mockAttachQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: mockAttachments, error: null }) }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockQuery as any)
        .mockReturnValueOnce(mockNotesQuery as any)
        .mockReturnValueOnce(mockActionQuery as any)
        .mockReturnValueOnce(mockAttendeeQuery as any)
        .mockReturnValueOnce(mockAttachQuery as any)

      const result = await meetingsApi.getMeetingWithDetails('1')

      expect(result.id).toBe('1')
      expect(result.notes).toBeDefined()
      expect(result.actionItems).toBeDefined()
      expect(result.attendeesList).toBeDefined()
      expect(result.attachments).toBeDefined()
    })
  })

  describe('getUpcomingMeetings', () => {
    it('should fetch upcoming meetings', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ data: [], error: null })),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await meetingsApi.getUpcomingMeetings('proj1', 10)

      expect(mockQuery.in).toHaveBeenCalledWith('status', ['scheduled', 'in_progress'])
      expect(mockQuery.limit).toHaveBeenCalledWith(10)
    })
  })
})

describe('Meeting Notes API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createNote', () => {
    it('should create meeting note', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      } as any)

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'note1', content: 'Test note', created_by: 'user123' },
          error: null
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await meetingNotesApi.createNote({
        meeting_id: 'meet1',
        content: 'Test note',
      })

      expect(result.content).toBe('Test note')
    })
  })

  describe('reorderNotes', () => {
    it('should reorder notes', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await meetingNotesApi.reorderNotes('meet1', ['note2', 'note1', 'note3'])

      expect(mockQuery.update).toHaveBeenCalledTimes(3)
    })
  })
})

describe('Meeting Action Items API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createActionItem', () => {
    it('should create action item', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      } as any)

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'ai1', description: 'Review documents' },
          error: null
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await meetingActionItemsApi.createActionItem({
        meeting_id: 'meet1',
        description: 'Review documents',
        priority: 'high',
      })

      expect(result.description).toBe('Review documents')
    })
  })

  describe('completeActionItem', () => {
    it('should mark action item as completed', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'ai1', status: 'completed' },
          error: null
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await meetingActionItemsApi.completeActionItem('ai1')

      expect(result.status).toBe('completed')
    })
  })

  describe('convertToTask', () => {
    it('should convert action item to task', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      } as any)

      const mockActionItem = {
        id: 'ai1',
        description: 'Update documentation',
        priority: 'high',
        assignee_id: 'user456',
      }

      const mockActionQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockActionItem, error: null }),
      }

      const mockTaskQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'task1', title: 'Update documentation' },
          error: null
        }),
      }

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockActionItem, task_id: 'task1' },
          error: null
        }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockActionQuery as any)
        .mockReturnValueOnce(mockTaskQuery as any)
        .mockReturnValueOnce(mockUpdateQuery as any)

      const result = await meetingActionItemsApi.convertToTask('ai1', 'proj1')

      expect(result.task_id).toBe('task1')
    })
  })
})

describe('Meeting Attendees API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('addAttendee', () => {
    it('should add attendee to meeting', async () => {
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'att1', name: 'John Doe', email: 'john@example.com' },
          error: null
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await meetingAttendeesApi.addAttendee({
        meeting_id: 'meet1',
        name: 'John Doe',
        email: 'john@example.com',
      })

      expect(result.name).toBe('John Doe')
    })
  })

  describe('markAttendance', () => {
    it('should mark attendee as present', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'att1', attended: true, attendance_status: 'attended' },
          error: null
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await meetingAttendeesApi.markAttendance('att1', true, '09:00', '12:00')

      expect(result.attended).toBe(true)
    })
  })

  describe('addProjectUsersAsAttendees', () => {
    it('should bulk add project users as attendees', async () => {
      const mockProjectUsers = [
        { user_id: 'user1', role: 'PM', users: { id: 'user1', full_name: 'Alice', email: 'alice@example.com' } },
        { user_id: 'user2', role: 'Engineer', users: { id: 'user2', full_name: 'Bob', email: 'bob@example.com' } },
      ]

      const mockProjectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockProjectUsers, error: null }),
      }

      const mockInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: mockProjectUsers.map((pu, i) => ({ id: `att${i}`, name: (pu.users as any).full_name })),
          error: null
        }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockProjectQuery as any)
        .mockReturnValueOnce(mockInsertQuery as any)

      const result = await meetingAttendeesApi.addProjectUsersAsAttendees('meet1', 'proj1')

      expect(result).toHaveLength(2)
    })
  })
})

describe('Meeting Attachments API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('uploadAndAttach', () => {
    it('should upload file and create attachment', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      } as any)

      const mockFile = new File(['content'], 'document.pdf', { type: 'application/pdf' })

      const mockStorage = {
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/file.pdf' } }),
      }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'atch1', file_name: 'document.pdf' },
          error: null
        }),
      }

      vi.mocked(supabase.storage.from).mockReturnValue(mockStorage as any)
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await meetingAttachmentsApi.uploadAndAttach('meet1', mockFile, 'document')

      expect(result.file_name).toBe('document.pdf')
      expect(mockStorage.upload).toHaveBeenCalled()
    })
  })
})
