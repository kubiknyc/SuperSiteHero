/**
 * Meetings API Service Tests
 *
 * Comprehensive tests for meetings management including CRUD operations,
 * notes, action items, attendees, attachments, and filtering.
 */

import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)

// Mock Supabase - use vi.hoisted to make these available to vi.mock
const {
  mockFrom,
  mockSelect,
  mockInsert,
  mockUpdate,
  mockDelete,
  mockEq,
  mockIs,
  mockOrder,
  mockSingle,
  mockIn,
  mockGte,
  mockLte,
  mockOr,
  mockLimit,
  mockAuthGetUser,
  mockStorageFrom,
  mockUpload,
  mockGetPublicUrl,
} = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
  mockEq: vi.fn(),
  mockIs: vi.fn(),
  mockOrder: vi.fn(),
  mockSingle: vi.fn(),
  mockIn: vi.fn(),
  mockGte: vi.fn(),
  mockLte: vi.fn(),
  mockOr: vi.fn(),
  mockLimit: vi.fn(),
  mockAuthGetUser: vi.fn(),
  mockStorageFrom: vi.fn(),
  mockUpload: vi.fn(),
  mockGetPublicUrl: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    auth: {
      getUser: mockAuthGetUser,
    },
    storage: {
      from: mockStorageFrom,
    },
  },
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

import { meetingsApi, meetingNotesApi, meetingActionItemsApi, meetingAttendeesApi, meetingAttachmentsApi } from './meetings'

describe('meetingsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default chainable mock setup
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    })

    mockSelect.mockReturnValue({
      eq: mockEq,
      is: mockIs,
      order: mockOrder,
      single: mockSingle,
    })

    mockEq.mockReturnValue({
      eq: mockEq,
      is: mockIs,
      in: mockIn,
      gte: mockGte,
      lte: mockLte,
      or: mockOr,
      order: mockOrder,
      single: mockSingle,
      select: mockSelect,
    })

    mockIs.mockReturnValue({
      eq: mockEq,
      gte: mockGte,
      in: mockIn,
      order: mockOrder,
      limit: mockLimit,
    })

    mockOrder.mockReturnValue({
      eq: mockEq,
      in: mockIn,
      limit: mockLimit,
    })

    mockGte.mockReturnValue({
      lte: mockLte,
      order: mockOrder,
    })

    mockLte.mockReturnValue({
      order: mockOrder,
    })

    mockOr.mockReturnValue({
      order: mockOrder,
    })

    mockIn.mockReturnValue({
      order: mockOrder,
      limit: mockLimit,
    })

    mockLimit.mockReturnValue({
      eq: mockEq,
    })

    mockInsert.mockReturnValue({
      select: mockSelect,
    })

    mockUpdate.mockReturnValue({
      eq: mockEq,
    })

    mockDelete.mockReturnValue({
      eq: mockEq,
    })

    mockAuthGetUser.mockResolvedValue({
      user: { id: 'test-user-id' },
    })
  })

  describe('getMeetings', () => {
    it('should get all meetings with default filters', async () => {
      const mockMeetings = [
        { id: '1', title: 'Meeting 1', meeting_date: '2025-01-15' },
        { id: '2', title: 'Meeting 2', meeting_date: '2025-01-14' },
      ]

      mockOrder.mockResolvedValue({ data: mockMeetings, error: null })

      const result = await meetingsApi.getMeetings({})

      expect(mockFrom).toHaveBeenCalledWith('meetings')
      expect(mockIs).toHaveBeenCalledWith('deleted_at', null)
      expect(mockOrder).toHaveBeenCalledWith('meeting_date', { ascending: false })
      expect(result).toEqual(mockMeetings)
    })

    it('should filter meetings by project_id', async () => {
      mockEq.mockResolvedValue({ data: [], error: null })

      await meetingsApi.getMeetings({ project_id: 'project-123' })

      expect(mockEq).toHaveBeenCalledWith('project_id', 'project-123')
    })

    it('should filter meetings by meeting_type', async () => {
      mockEq.mockResolvedValue({ data: [], error: null })

      await meetingsApi.getMeetings({ meeting_type: 'safety' })

      expect(mockEq).toHaveBeenCalledWith('meeting_type', 'safety')
    })

    it('should filter meetings by status', async () => {
      mockEq.mockResolvedValue({ data: [], error: null })

      await meetingsApi.getMeetings({ status: 'completed' })

      expect(mockEq).toHaveBeenCalledWith('status', 'completed')
    })

    it('should filter meetings by date range', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null })

      await meetingsApi.getMeetings({
        date_from: '2025-01-01',
        date_to: '2025-01-31',
      })

      expect(mockGte).toHaveBeenCalledWith('meeting_date', '2025-01-01')
      expect(mockLte).toHaveBeenCalledWith('meeting_date', '2025-01-31')
    })

    it('should search meetings by title and description', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null })

      await meetingsApi.getMeetings({ search: 'safety' })

      expect(mockOr).toHaveBeenCalledWith('title.ilike.%safety%,description.ilike.%safety%')
    })

    it('should handle database errors', async () => {
      const mockError = new Error('Database error')
      mockOrder.mockResolvedValue({ data: null, error: mockError })

      await expect(meetingsApi.getMeetings({})).rejects.toThrow('Database error')
    })

    it('should return empty array when no data', async () => {
      mockOrder.mockResolvedValue({ data: null, error: null })

      const result = await meetingsApi.getMeetings({})

      expect(result).toEqual([])
    })
  })

  describe('getMeetingById', () => {
    it('should get a single meeting by ID', async () => {
      const mockMeeting = {
        id: 'meeting-123',
        title: 'Project Kickoff',
        meeting_date: '2025-01-15',
      }

      mockSingle.mockResolvedValue({ data: mockMeeting, error: null })

      const result = await meetingsApi.getMeetingById('meeting-123')

      expect(mockFrom).toHaveBeenCalledWith('meetings')
      expect(mockEq).toHaveBeenCalledWith('id', 'meeting-123')
      expect(mockSingle).toHaveBeenCalled()
      expect(result).toEqual(mockMeeting)
    })

    it('should handle not found error', async () => {
      const mockError = new Error('Not found')
      mockSingle.mockResolvedValue({ data: null, error: mockError })

      await expect(meetingsApi.getMeetingById('nonexistent')).rejects.toThrow('Not found')
    })
  })

  describe('getMeetingWithDetails', () => {
    it('should get meeting with all related data', async () => {
      const mockMeeting = { id: 'meeting-123', title: 'Test Meeting' }
      const mockNotes = [{ id: '1', content: 'Note 1' }]
      const mockActionItems = [{ id: '1', description: 'Task 1' }]
      const mockAttendees = [{ id: '1', name: 'John Doe' }]
      const mockAttachments = [{ id: '1', file_name: 'doc.pdf' }]

      mockSingle.mockResolvedValueOnce({ data: mockMeeting, error: null })
      mockOrder.mockResolvedValueOnce({ data: mockNotes, error: null })
      mockOrder.mockResolvedValueOnce({ data: mockActionItems, error: null })
      mockOrder.mockResolvedValueOnce({ data: mockAttendees, error: null })
      mockOrder.mockResolvedValueOnce({ data: mockAttachments, error: null })

      const result = await meetingsApi.getMeetingWithDetails('meeting-123')

      expect(result.notes).toEqual(mockNotes)
      expect(result.actionItems).toEqual(mockActionItems)
      expect(result.attendeesList).toEqual(mockAttendees)
      expect(result.attachments).toEqual(mockAttachments)
    })
  })

  describe('createMeeting', () => {
    it('should create a new meeting with required fields', async () => {
      const mockMeeting = {
        id: 'new-meeting',
        title: 'New Meeting',
        project_id: 'project-123',
        meeting_date: '2025-01-15',
        status: 'scheduled',
      }

      mockSingle.mockResolvedValue({ data: mockMeeting, error: null })

      const dto = {
        project_id: 'project-123',
        title: 'New Meeting',
        meeting_type: 'coordination' as const,
        meeting_date: '2025-01-15',
      }

      const result = await meetingsApi.createMeeting(dto)

      expect(mockFrom).toHaveBeenCalledWith('meetings')
      expect(mockInsert).toHaveBeenCalled()
      expect(mockAuthGetUser).toHaveBeenCalled()
      expect(result).toEqual(mockMeeting)
    })

    it('should create meeting with all optional fields', async () => {
      const mockMeeting = { id: 'new-meeting' }
      mockSingle.mockResolvedValue({ data: mockMeeting, error: null })

      const dto = {
        project_id: 'project-123',
        title: 'Detailed Meeting',
        description: 'Meeting description',
        meeting_type: 'safety' as const,
        status: 'scheduled' as const,
        location: 'Conference Room A',
        location_type: 'onsite' as const,
        virtual_meeting_link: 'https://zoom.us/j/123',
        meeting_date: '2025-01-15',
        start_time: '09:00',
        end_time: '10:00',
        duration_minutes: 60,
        template_id: 'template-123',
        is_recurring: true,
        recurrence_rule: 'FREQ=WEEKLY',
      }

      await meetingsApi.createMeeting(dto)

      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall.description).toBe('Meeting description')
      expect(insertCall.location).toBe('Conference Room A')
      expect(insertCall.virtual_meeting_link).toBe('https://zoom.us/j/123')
      expect(insertCall.is_recurring).toBe(true)
    })

    it('should handle creation errors', async () => {
      const mockError = new Error('Creation failed')
      mockSingle.mockResolvedValue({ data: null, error: mockError })

      const dto = {
        project_id: 'project-123',
        title: 'Test',
        meeting_type: 'coordination' as const,
        meeting_date: '2025-01-15',
      }

      await expect(meetingsApi.createMeeting(dto)).rejects.toThrow('Creation failed')
    })
  })

  describe('updateMeeting', () => {
    it('should update meeting fields', async () => {
      const mockUpdated = { id: 'meeting-123', title: 'Updated Title' }
      mockSingle.mockResolvedValue({ data: mockUpdated, error: null })

      const result = await meetingsApi.updateMeeting('meeting-123', {
        title: 'Updated Title',
        description: 'Updated description',
      })

      expect(mockFrom).toHaveBeenCalledWith('meetings')
      expect(mockUpdate).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith('id', 'meeting-123')
      expect(result).toEqual(mockUpdated)
    })

    it('should update timestamp', async () => {
      mockSingle.mockResolvedValue({ data: {}, error: null })

      await meetingsApi.updateMeeting('meeting-123', { title: 'Test' })

      const updateCall = mockUpdate.mock.calls[0][0]
      expect(updateCall.updated_at).toBeDefined()
    })
  })

  describe('publishMinutes', () => {
    it('should publish meeting minutes', async () => {
      const mockPublished = { id: 'meeting-123', minutes_published: true }
      mockSingle.mockResolvedValue({ data: mockPublished, error: null })

      const result = await meetingsApi.publishMinutes('meeting-123')

      const updateCall = mockUpdate.mock.calls[0][0]
      expect(updateCall.minutes_published).toBe(true)
      expect(result).toEqual(mockPublished)
    })
  })

  describe('deleteMeeting', () => {
    it('should soft delete meeting', async () => {
      mockEq.mockResolvedValue({ data: null, error: null })

      await meetingsApi.deleteMeeting('meeting-123')

      expect(mockFrom).toHaveBeenCalledWith('meetings')
      const updateCall = mockUpdate.mock.calls[0][0]
      expect(updateCall.deleted_at).toBeDefined()
      expect(mockEq).toHaveBeenCalledWith('id', 'meeting-123')
    })

    it('should handle deletion errors', async () => {
      const mockError = new Error('Deletion failed')
      mockEq.mockResolvedValue({ data: null, error: mockError })

      await expect(meetingsApi.deleteMeeting('meeting-123')).rejects.toThrow('Deletion failed')
    })
  })

  describe('getUpcomingMeetings', () => {
    it('should get upcoming meetings with default limit', async () => {
      const mockMeetings = [
        { id: '1', meeting_date: '2025-01-20' },
        { id: '2', meeting_date: '2025-01-21' },
      ]

      mockLimit.mockResolvedValue({ data: mockMeetings, error: null })

      const result = await meetingsApi.getUpcomingMeetings()

      expect(mockIn).toHaveBeenCalledWith('status', ['scheduled', 'in_progress'])
      expect(mockLimit).toHaveBeenCalledWith(5)
      expect(result).toEqual(mockMeetings)
    })

    it('should filter by project_id', async () => {
      mockLimit.mockResolvedValue({ data: [], error: null })

      await meetingsApi.getUpcomingMeetings('project-123', 10)

      expect(mockEq).toHaveBeenCalledWith('project_id', 'project-123')
      expect(mockLimit).toHaveBeenCalledWith(10)
    })

    it('should only include future meetings', async () => {
      mockLimit.mockResolvedValue({ data: [], error: null })

      await meetingsApi.getUpcomingMeetings()

      expect(mockGte).toHaveBeenCalled()
      const gteCall = mockGte.mock.calls[0]
      expect(gteCall[0]).toBe('meeting_date')
      // Should be today's date
      expect(gteCall[1]).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })
})

describe('meetingNotesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ eq: mockEq, order: mockOrder, select: mockSelect, single: mockSingle })
    mockOrder.mockReturnValue({ eq: mockEq })
    mockInsert.mockReturnValue({ select: mockSelect })
    mockUpdate.mockReturnValue({ eq: mockEq })
    mockDelete.mockReturnValue({ eq: mockEq })
    mockAuthGetUser.mockResolvedValue({ user: { id: 'test-user-id' } })
  })

  describe('getNotes', () => {
    it('should get notes for a meeting', async () => {
      const mockNotes = [
        { id: '1', content: 'Note 1', note_order: 0 },
        { id: '2', content: 'Note 2', note_order: 1 },
      ]

      mockOrder.mockResolvedValue({ data: mockNotes, error: null })

      const result = await meetingNotesApi.getNotes('meeting-123')

      expect(mockFrom).toHaveBeenCalledWith('meeting_notes')
      expect(mockEq).toHaveBeenCalledWith('meeting_id', 'meeting-123')
      expect(mockOrder).toHaveBeenCalledWith('note_order', { ascending: true })
      expect(result).toEqual(mockNotes)
    })
  })

  describe('createNote', () => {
    it('should create a note with required fields', async () => {
      const mockNote = { id: 'note-1', content: 'Test note' }
      mockSingle.mockResolvedValue({ data: mockNote, error: null })

      const result = await meetingNotesApi.createNote({
        meeting_id: 'meeting-123',
        content: 'Test note',
      })

      expect(mockFrom).toHaveBeenCalledWith('meeting_notes')
      expect(mockInsert).toHaveBeenCalled()
      expect(result).toEqual(mockNote)
    })

    it('should create note with all fields', async () => {
      mockSingle.mockResolvedValue({ data: {}, error: null })

      await meetingNotesApi.createNote({
        meeting_id: 'meeting-123',
        section_title: 'Discussion',
        content: 'Important points',
        note_order: 1,
        note_type: 'decision',
      })

      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall.section_title).toBe('Discussion')
      expect(insertCall.note_type).toBe('decision')
      expect(insertCall.note_order).toBe(1)
    })
  })

  describe('updateNote', () => {
    it('should update note content', async () => {
      const mockUpdated = { id: 'note-1', content: 'Updated' }
      mockSingle.mockResolvedValue({ data: mockUpdated, error: null })

      const result = await meetingNotesApi.updateNote('note-1', {
        content: 'Updated',
      })

      expect(mockEq).toHaveBeenCalledWith('id', 'note-1')
      expect(result).toEqual(mockUpdated)
    })
  })

  describe('deleteNote', () => {
    it('should delete a note', async () => {
      mockEq.mockResolvedValue({ data: null, error: null })

      await meetingNotesApi.deleteNote('note-1')

      expect(mockFrom).toHaveBeenCalledWith('meeting_notes')
      expect(mockDelete).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith('id', 'note-1')
    })
  })

  describe('reorderNotes', () => {
    it('should reorder notes', async () => {
      mockEq.mockResolvedValue({ data: null, error: null })

      await meetingNotesApi.reorderNotes('meeting-123', ['note-3', 'note-1', 'note-2'])

      expect(mockUpdate).toHaveBeenCalledTimes(3)
      expect(mockUpdate).toHaveBeenNthCalledWith(1, { note_order: 0 })
      expect(mockUpdate).toHaveBeenNthCalledWith(2, { note_order: 1 })
      expect(mockUpdate).toHaveBeenNthCalledWith(3, { note_order: 2 })
    })
  })
})

describe('meetingActionItemsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({
      eq: mockEq,
      order: mockOrder,
      select: mockSelect,
      single: mockSingle,
      lte: mockLte,
      lt: mockLt,
      not: mockNot,
    })
    mockOrder.mockReturnValue({ nullsFirst: mockLimit })
    mockLimit.mockResolvedValue({ data: [], error: null })
    mockInsert.mockReturnValue({ select: mockSelect })
    mockUpdate.mockReturnValue({ eq: mockEq })
    mockDelete.mockReturnValue({ eq: mockEq })
    mockAuthGetUser.mockResolvedValue({ user: { id: 'test-user-id' } })
  })

  const mockLt = vi.fn()
  const mockNot = vi.fn()

  describe('getActionItems', () => {
    it('should get action items for a meeting', async () => {
      const mockItems = [
        { id: '1', description: 'Task 1', item_order: 0 },
        { id: '2', description: 'Task 2', item_order: 1 },
      ]

      mockLimit.mockResolvedValue({ data: mockItems, error: null })

      const result = await meetingActionItemsApi.getActionItems('meeting-123')

      expect(mockFrom).toHaveBeenCalledWith('meeting_action_items')
      expect(mockEq).toHaveBeenCalledWith('meeting_id', 'meeting-123')
      expect(result).toEqual(mockItems)
    })
  })

  describe('createActionItem', () => {
    it('should create action item with defaults', async () => {
      const mockItem = { id: 'item-1', description: 'New task', status: 'pending' }
      mockSingle.mockResolvedValue({ data: mockItem, error: null })

      const result = await meetingActionItemsApi.createActionItem({
        meeting_id: 'meeting-123',
        description: 'New task',
      })

      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall.status).toBe('pending')
      expect(insertCall.priority).toBe('medium')
      expect(result).toEqual(mockItem)
    })
  })

  describe('completeActionItem', () => {
    it('should complete action item and set completion date', async () => {
      const mockCompleted = { id: 'item-1', status: 'completed' }
      mockSingle.mockResolvedValue({ data: mockCompleted, error: null })

      await meetingActionItemsApi.completeActionItem('item-1')

      const updateCall = mockUpdate.mock.calls[0][0]
      expect(updateCall.status).toBe('completed')
      expect(updateCall.completed_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('convertToTask', () => {
    it('should convert action item to task', async () => {
      const mockActionItem = {
        id: 'item-1',
        description: 'Task description',
        priority: 'high',
        status: 'pending',
      }
      const mockTask = { id: 'task-1', title: 'Task description' }

      mockSingle.mockResolvedValueOnce({ data: mockActionItem, error: null })
      mockSingle.mockResolvedValueOnce({ data: mockTask, error: null })
      mockSingle.mockResolvedValueOnce({ data: { ...mockActionItem, task_id: 'task-1' }, error: null })

      const result = await meetingActionItemsApi.convertToTask('item-1', 'project-123')

      expect(mockFrom).toHaveBeenCalledWith('meeting_action_items')
      expect(mockFrom).toHaveBeenCalledWith('tasks')
      expect(result.task_id).toBe('task-1')
    })
  })
})

describe('meetingAttendeesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ eq: mockEq, order: mockOrder, select: mockSelect, single: mockSingle })
    mockOrder.mockReturnValue({ order: mockOrder })
    mockInsert.mockReturnValue({ select: mockSelect })
    mockUpdate.mockReturnValue({ eq: mockEq })
    mockDelete.mockReturnValue({ eq: mockEq })
  })

  describe('getAttendees', () => {
    it('should get attendees ordered by required then name', async () => {
      const mockAttendees = [
        { id: '1', name: 'Required User', is_required: true },
        { id: '2', name: 'Optional User', is_required: false },
      ]

      mockOrder.mockResolvedValue({ data: mockAttendees, error: null })

      const result = await meetingAttendeesApi.getAttendees('meeting-123')

      expect(mockEq).toHaveBeenCalledWith('meeting_id', 'meeting-123')
      expect(mockOrder).toHaveBeenCalledWith('is_required', { ascending: false })
      expect(mockOrder).toHaveBeenCalledWith('name', { ascending: true })
      expect(result).toEqual(mockAttendees)
    })
  })

  describe('addAttendee', () => {
    it('should add attendee with default status', async () => {
      const mockAttendee = { id: 'att-1', name: 'John Doe', attendance_status: 'invited' }
      mockSingle.mockResolvedValue({ data: mockAttendee, error: null })

      const result = await meetingAttendeesApi.addAttendee({
        meeting_id: 'meeting-123',
        name: 'John Doe',
      })

      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall.attendance_status).toBe('invited')
      expect(insertCall.is_required).toBe(false)
      expect(result).toEqual(mockAttendee)
    })
  })

  describe('markAttendance', () => {
    it('should mark attendee as attended', async () => {
      mockSingle.mockResolvedValue({ data: {}, error: null })

      await meetingAttendeesApi.markAttendance('att-1', true, '09:00', '10:00')

      const updateCall = mockUpdate.mock.calls[0][0]
      expect(updateCall.attended).toBe(true)
      expect(updateCall.attendance_status).toBe('attended')
      expect(updateCall.arrival_time).toBe('09:00')
      expect(updateCall.departure_time).toBe('10:00')
    })

    it('should mark attendee as absent', async () => {
      mockSingle.mockResolvedValue({ data: {}, error: null })

      await meetingAttendeesApi.markAttendance('att-1', false)

      const updateCall = mockUpdate.mock.calls[0][0]
      expect(updateCall.attended).toBe(false)
      expect(updateCall.attendance_status).toBe('absent')
    })
  })

  describe('removeAttendee', () => {
    it('should delete attendee', async () => {
      mockEq.mockResolvedValue({ data: null, error: null })

      await meetingAttendeesApi.removeAttendee('att-1')

      expect(mockDelete).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith('id', 'att-1')
    })
  })

  describe('addProjectUsersAsAttendees', () => {
    it('should add all project users as attendees', async () => {
      const mockProjectUsers = [
        { user_id: 'user-1', role: 'PM', users: { full_name: 'John PM', email: 'john@test.com' } },
        { user_id: 'user-2', role: 'Engineer', users: { full_name: 'Jane Engineer', email: 'jane@test.com' } },
      ]
      const mockAttendees = [
        { id: 'att-1', name: 'John PM' },
        { id: 'att-2', name: 'Jane Engineer' },
      ]

      mockEq.mockResolvedValueOnce({ data: mockProjectUsers, error: null })
      mockSelect.mockResolvedValueOnce({ data: mockAttendees, error: null })

      const result = await meetingAttendeesApi.addProjectUsersAsAttendees('meeting-123', 'project-123')

      expect(mockFrom).toHaveBeenCalledWith('project_users')
      expect(mockFrom).toHaveBeenCalledWith('meeting_attendees')
      expect(mockInsert).toHaveBeenCalled()
      expect(result).toEqual(mockAttendees)
    })

    it('should return empty array if no project users', async () => {
      mockEq.mockResolvedValue({ data: [], error: null })

      const result = await meetingAttendeesApi.addProjectUsersAsAttendees('meeting-123', 'project-123')

      expect(result).toEqual([])
      expect(mockInsert).not.toHaveBeenCalled()
    })
  })
})

describe('meetingAttachmentsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      delete: mockDelete,
    })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ eq: mockEq, order: mockOrder, select: mockSelect, single: mockSingle })
    mockOrder.mockResolvedValue({ data: [], error: null })
    mockInsert.mockReturnValue({ select: mockSelect })
    mockDelete.mockReturnValue({ eq: mockEq })
    mockAuthGetUser.mockResolvedValue({ user: { id: 'test-user-id' } })

    mockStorageFrom.mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    })
  })

  describe('getAttachments', () => {
    it('should get attachments ordered by created_at desc', async () => {
      const mockAttachments = [
        { id: '1', file_name: 'doc1.pdf', created_at: '2025-01-15T10:00:00Z' },
        { id: '2', file_name: 'doc2.pdf', created_at: '2025-01-14T10:00:00Z' },
      ]

      mockOrder.mockResolvedValue({ data: mockAttachments, error: null })

      const result = await meetingAttachmentsApi.getAttachments('meeting-123')

      expect(mockEq).toHaveBeenCalledWith('meeting_id', 'meeting-123')
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result).toEqual(mockAttachments)
    })
  })

  describe('addAttachment', () => {
    it('should add attachment with default type', async () => {
      const mockAttachment = {
        id: 'att-1',
        file_name: 'document.pdf',
        attachment_type: 'document',
      }
      mockSingle.mockResolvedValue({ data: mockAttachment, error: null })

      const result = await meetingAttachmentsApi.addAttachment({
        meeting_id: 'meeting-123',
        file_name: 'document.pdf',
        file_url: 'https://example.com/doc.pdf',
      })

      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall.attachment_type).toBe('document')
      expect(insertCall.uploaded_by).toBe('test-user-id')
      expect(result).toEqual(mockAttachment)
    })
  })

  describe('deleteAttachment', () => {
    it('should delete attachment', async () => {
      mockEq.mockResolvedValue({ data: null, error: null })

      await meetingAttachmentsApi.deleteAttachment('att-1')

      expect(mockDelete).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith('id', 'att-1')
    })
  })

  describe('uploadAndAttach', () => {
    it('should upload file and create attachment record', async () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const mockUrl = 'https://storage.example.com/meetings/meeting-123/12345-test.pdf'
      const mockAttachment = { id: 'att-1', file_name: 'test.pdf' }

      mockUpload.mockResolvedValue({ error: null })
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: mockUrl } })
      mockSingle.mockResolvedValue({ data: mockAttachment, error: null })

      const result = await meetingAttachmentsApi.uploadAndAttach(
        'meeting-123',
        mockFile,
        'agenda',
        'Meeting agenda'
      )

      expect(mockStorageFrom).toHaveBeenCalledWith('documents')
      expect(mockUpload).toHaveBeenCalled()
      expect(mockGetPublicUrl).toHaveBeenCalled()
      expect(mockInsert).toHaveBeenCalled()

      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall.file_url).toBe(mockUrl)
      expect(insertCall.file_size).toBe(mockFile.size)
      expect(insertCall.file_type).toBe('application/pdf')
      expect(insertCall.attachment_type).toBe('agenda')
      expect(insertCall.description).toBe('Meeting agenda')
      expect(result).toEqual(mockAttachment)
    })

    it('should handle upload errors', async () => {
      const mockFile = new File(['content'], 'test.pdf')
      const mockError = new Error('Upload failed')

      mockUpload.mockResolvedValue({ error: mockError })

      await expect(
        meetingAttachmentsApi.uploadAndAttach('meeting-123', mockFile)
      ).rejects.toThrow('Upload failed')
    })

    it('should require authentication', async () => {
      mockAuthGetUser.mockResolvedValue({ user: null })
      const mockFile = new File(['content'], 'test.pdf')

      await expect(
        meetingAttachmentsApi.uploadAndAttach('meeting-123', mockFile)
      ).rejects.toThrow('Not authenticated')
    })
  })
})
