// File: /src/types/meeting-minutes.test.ts
// Tests for meeting minutes types, constants, and utility functions

import { describe, it, expect } from 'vitest'
import {
  // Types
  MeetingType,
  MeetingStatus,
  ActionItemStatus,
  AttendanceStatus,
  RSVPResponse,
  MeetingAttachmentType,
  ActionItemPriority,
  Meeting,
  MeetingAttendee,
  MeetingActionItem,
  MeetingFilters,
  ActionItemFilters,
  // Constants
  MEETING_TYPES,
  MEETING_STATUSES,
  ACTION_ITEM_STATUSES,
  ACTION_ITEM_PRIORITIES,
  // Utility functions
  getMeetingTypeLabel,
  getMeetingStatusColor,
  getActionItemStatusColor,
  getActionItemPriorityColor,
  isUpcomingMeeting,
  isActionItemOverdue,
  formatMeetingTitle,
  formatMeetingTimeRange,
} from './meeting-minutes'

describe('meeting-minutes types', () => {
  describe('MEETING_TYPES constant', () => {
    it('should have expected meeting types', () => {
      expect(MEETING_TYPES.length).toBeGreaterThan(0)

      const typeValues = MEETING_TYPES.map((t) => t.value)
      expect(typeValues).toContain('oac')
      expect(typeValues).toContain('subcontractor')
      expect(typeValues).toContain('safety')
      expect(typeValues).toContain('progress')
      expect(typeValues).toContain('preconstruction')
      expect(typeValues).toContain('kickoff')
      expect(typeValues).toContain('closeout')
      expect(typeValues).toContain('weekly')
      expect(typeValues).toContain('other')
    })

    it('should have labels and descriptions for all types', () => {
      MEETING_TYPES.forEach((type) => {
        expect(type.label).toBeDefined()
        expect(type.label.length).toBeGreaterThan(0)
        expect(type.description).toBeDefined()
        expect(type.description.length).toBeGreaterThan(0)
      })
    })
  })

  describe('MEETING_STATUSES constant', () => {
    it('should have expected statuses', () => {
      const statusValues = MEETING_STATUSES.map((s) => s.value)
      expect(statusValues).toContain('scheduled')
      expect(statusValues).toContain('in_progress')
      expect(statusValues).toContain('completed')
      expect(statusValues).toContain('minutes_draft')
      expect(statusValues).toContain('minutes_distributed')
      expect(statusValues).toContain('cancelled')
    })

    it('should have labels and colors for all statuses', () => {
      MEETING_STATUSES.forEach((status) => {
        expect(status.label).toBeDefined()
        expect(status.color).toBeDefined()
      })
    })
  })

  describe('ACTION_ITEM_STATUSES constant', () => {
    it('should have expected action item statuses', () => {
      const statusValues = ACTION_ITEM_STATUSES.map((s) => s.value)
      expect(statusValues).toContain('open')
      expect(statusValues).toContain('in_progress')
      expect(statusValues).toContain('completed')
      expect(statusValues).toContain('deferred')
      expect(statusValues).toContain('cancelled')
    })

    it('should have labels and colors for all statuses', () => {
      ACTION_ITEM_STATUSES.forEach((status) => {
        expect(status.label).toBeDefined()
        expect(status.color).toBeDefined()
      })
    })
  })

  describe('ACTION_ITEM_PRIORITIES constant', () => {
    it('should have expected priorities', () => {
      const priorityValues = ACTION_ITEM_PRIORITIES.map((p) => p.value)
      expect(priorityValues).toContain('low')
      expect(priorityValues).toContain('normal')
      expect(priorityValues).toContain('high')
      expect(priorityValues).toContain('critical')
    })

    it('should have labels and colors for all priorities', () => {
      ACTION_ITEM_PRIORITIES.forEach((priority) => {
        expect(priority.label).toBeDefined()
        expect(priority.color).toBeDefined()
      })
    })

    it('should have ascending severity order', () => {
      const values = ACTION_ITEM_PRIORITIES.map((p) => p.value)
      expect(values[0]).toBe('low')
      expect(values[values.length - 1]).toBe('critical')
    })
  })

  describe('getMeetingTypeLabel', () => {
    it('should return correct label for known types', () => {
      expect(getMeetingTypeLabel('oac')).toBe('OAC Meeting')
      expect(getMeetingTypeLabel('safety')).toBe('Safety Meeting')
      expect(getMeetingTypeLabel('kickoff')).toBe('Kickoff Meeting')
    })

    it('should return the type value for unknown types', () => {
      expect(getMeetingTypeLabel('unknown_type' as MeetingType)).toBe('unknown_type')
    })
  })

  describe('getMeetingStatusColor', () => {
    it('should return correct colors for known statuses', () => {
      expect(getMeetingStatusColor('scheduled')).toBe('blue')
      expect(getMeetingStatusColor('in_progress')).toBe('yellow')
      expect(getMeetingStatusColor('completed')).toBe('cyan')
      expect(getMeetingStatusColor('minutes_distributed')).toBe('green')
      expect(getMeetingStatusColor('cancelled')).toBe('gray')
    })

    it('should return gray for unknown statuses', () => {
      expect(getMeetingStatusColor('unknown_status' as MeetingStatus)).toBe('gray')
    })
  })

  describe('getActionItemStatusColor', () => {
    it('should return correct colors for known statuses', () => {
      expect(getActionItemStatusColor('open')).toBe('blue')
      expect(getActionItemStatusColor('in_progress')).toBe('yellow')
      expect(getActionItemStatusColor('completed')).toBe('green')
      expect(getActionItemStatusColor('deferred')).toBe('gray')
    })

    it('should return gray for unknown statuses', () => {
      expect(getActionItemStatusColor('unknown' as ActionItemStatus)).toBe('gray')
    })
  })

  describe('getActionItemPriorityColor', () => {
    it('should return correct colors for priorities', () => {
      expect(getActionItemPriorityColor('low')).toBe('green')
      expect(getActionItemPriorityColor('normal')).toBe('blue')
      expect(getActionItemPriorityColor('high')).toBe('orange')
      expect(getActionItemPriorityColor('critical')).toBe('red')
    })

    it('should return gray for unknown priorities', () => {
      expect(getActionItemPriorityColor('unknown' as ActionItemPriority)).toBe('gray')
    })
  })

  describe('isUpcomingMeeting', () => {
    it('should return true for future scheduled meetings', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      const meeting: Meeting = {
        id: '1',
        company_id: 'company-1',
        project_id: 'project-1',
        meeting_number: 1,
        meeting_type: 'oac',
        title: 'Test Meeting',
        description: null,
        meeting_date: futureDate.toISOString().split('T')[0],
        start_time: null,
        end_time: null,
        duration_minutes: null,
        location: null,
        location_type: 'in_person',
        virtual_link: null,
        organizer_id: null,
        status: 'scheduled',
        agenda: null,
        notes: null,
        decisions: null,
        minutes_document_url: null,
        minutes_pdf_url: null,
        minutes_distributed_at: null,
        previous_meeting_id: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: null,
        deleted_at: null,
      }

      expect(isUpcomingMeeting(meeting)).toBe(true)
    })

    it('should return false for past meetings', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 7)

      const meeting: Meeting = {
        id: '1',
        company_id: 'company-1',
        project_id: 'project-1',
        meeting_number: 1,
        meeting_type: 'oac',
        title: 'Test Meeting',
        description: null,
        meeting_date: pastDate.toISOString().split('T')[0],
        start_time: null,
        end_time: null,
        duration_minutes: null,
        location: null,
        location_type: 'in_person',
        virtual_link: null,
        organizer_id: null,
        status: 'scheduled',
        agenda: null,
        notes: null,
        decisions: null,
        minutes_document_url: null,
        minutes_pdf_url: null,
        minutes_distributed_at: null,
        previous_meeting_id: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: null,
        deleted_at: null,
      }

      expect(isUpcomingMeeting(meeting)).toBe(false)
    })

    it('should return false for cancelled meetings', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      const meeting: Meeting = {
        id: '1',
        company_id: 'company-1',
        project_id: 'project-1',
        meeting_number: 1,
        meeting_type: 'oac',
        title: 'Test Meeting',
        description: null,
        meeting_date: futureDate.toISOString().split('T')[0],
        start_time: null,
        end_time: null,
        duration_minutes: null,
        location: null,
        location_type: 'in_person',
        virtual_link: null,
        organizer_id: null,
        status: 'cancelled',
        agenda: null,
        notes: null,
        decisions: null,
        minutes_document_url: null,
        minutes_pdf_url: null,
        minutes_distributed_at: null,
        previous_meeting_id: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: null,
        deleted_at: null,
      }

      expect(isUpcomingMeeting(meeting)).toBe(false)
    })
  })

  describe('isActionItemOverdue', () => {
    it('should return true for past due open items', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 7)

      const item: MeetingActionItem = {
        id: '1',
        meeting_id: 'meeting-1',
        company_id: 'company-1',
        project_id: 'project-1',
        item_number: 1,
        description: 'Test action item',
        priority: 'normal',
        assigned_to_user_id: null,
        assigned_to_name: null,
        assigned_to_company: null,
        due_date: pastDate.toISOString().split('T')[0],
        completed_date: null,
        status: 'open',
        related_rfi_id: null,
        related_submittal_id: null,
        related_change_order_id: null,
        carried_from_meeting_id: null,
        carried_to_meeting_id: null,
        notes: null,
        completion_notes: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: null,
        deleted_at: null,
      }

      expect(isActionItemOverdue(item)).toBe(true)
    })

    it('should return false for future due items', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      const item: MeetingActionItem = {
        id: '1',
        meeting_id: 'meeting-1',
        company_id: 'company-1',
        project_id: 'project-1',
        item_number: 1,
        description: 'Test action item',
        priority: 'normal',
        assigned_to_user_id: null,
        assigned_to_name: null,
        assigned_to_company: null,
        due_date: futureDate.toISOString().split('T')[0],
        completed_date: null,
        status: 'open',
        related_rfi_id: null,
        related_submittal_id: null,
        related_change_order_id: null,
        carried_from_meeting_id: null,
        carried_to_meeting_id: null,
        notes: null,
        completion_notes: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: null,
        deleted_at: null,
      }

      expect(isActionItemOverdue(item)).toBe(false)
    })

    it('should return false for completed items', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 7)

      const item: MeetingActionItem = {
        id: '1',
        meeting_id: 'meeting-1',
        company_id: 'company-1',
        project_id: 'project-1',
        item_number: 1,
        description: 'Test action item',
        priority: 'normal',
        assigned_to_user_id: null,
        assigned_to_name: null,
        assigned_to_company: null,
        due_date: pastDate.toISOString().split('T')[0],
        completed_date: null,
        status: 'completed',
        related_rfi_id: null,
        related_submittal_id: null,
        related_change_order_id: null,
        carried_from_meeting_id: null,
        carried_to_meeting_id: null,
        notes: null,
        completion_notes: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: null,
        deleted_at: null,
      }

      expect(isActionItemOverdue(item)).toBe(false)
    })

    it('should return false for items without due date', () => {
      const item: MeetingActionItem = {
        id: '1',
        meeting_id: 'meeting-1',
        company_id: 'company-1',
        project_id: 'project-1',
        item_number: 1,
        description: 'Test action item',
        priority: 'normal',
        assigned_to_user_id: null,
        assigned_to_name: null,
        assigned_to_company: null,
        due_date: null,
        completed_date: null,
        status: 'open',
        related_rfi_id: null,
        related_submittal_id: null,
        related_change_order_id: null,
        carried_from_meeting_id: null,
        carried_to_meeting_id: null,
        notes: null,
        completion_notes: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: null,
        deleted_at: null,
      }

      expect(isActionItemOverdue(item)).toBe(false)
    })
  })

  describe('formatMeetingTitle', () => {
    const baseMeeting: Meeting = {
      id: '1',
      company_id: 'company-1',
      project_id: 'project-1',
      meeting_number: null,
      meeting_type: 'oac',
      title: 'Weekly Sync',
      description: null,
      meeting_date: '2024-03-15',
      start_time: null,
      end_time: null,
      duration_minutes: null,
      location: null,
      location_type: 'in_person',
      virtual_link: null,
      organizer_id: null,
      status: 'scheduled',
      agenda: null,
      notes: null,
      decisions: null,
      minutes_document_url: null,
      minutes_pdf_url: null,
      minutes_distributed_at: null,
      previous_meeting_id: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      created_by: null,
      deleted_at: null,
    }

    it('should format title with meeting number', () => {
      const meeting = { ...baseMeeting, meeting_number: 5 }
      expect(formatMeetingTitle(meeting)).toBe('OAC Meeting #5: Weekly Sync')
    })

    it('should return just title when no meeting number', () => {
      expect(formatMeetingTitle(baseMeeting)).toBe('Weekly Sync')
    })
  })

  describe('formatMeetingTimeRange', () => {
    const baseMeeting: Meeting = {
      id: '1',
      company_id: 'company-1',
      project_id: 'project-1',
      meeting_number: 1,
      meeting_type: 'oac',
      title: 'Test Meeting',
      description: null,
      meeting_date: '2024-03-15',
      start_time: null,
      end_time: null,
      duration_minutes: null,
      location: null,
      location_type: 'in_person',
      virtual_link: null,
      organizer_id: null,
      status: 'scheduled',
      agenda: null,
      notes: null,
      decisions: null,
      minutes_document_url: null,
      minutes_pdf_url: null,
      minutes_distributed_at: null,
      previous_meeting_id: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      created_by: null,
      deleted_at: null,
    }

    it('should format time range with start and end', () => {
      const meeting = { ...baseMeeting, start_time: '09:00:00', end_time: '10:30:00' }
      expect(formatMeetingTimeRange(meeting)).toBe('09:00 - 10:30')
    })

    it('should format just start time when no end time', () => {
      const meeting = { ...baseMeeting, start_time: '14:00:00' }
      expect(formatMeetingTimeRange(meeting)).toBe('14:00')
    })

    it('should return empty string when no start time', () => {
      expect(formatMeetingTimeRange(baseMeeting)).toBe('')
    })
  })

  describe('Type definitions', () => {
    it('should allow valid MeetingType values', () => {
      const types: MeetingType[] = [
        'oac',
        'subcontractor',
        'safety',
        'progress',
        'preconstruction',
        'kickoff',
        'closeout',
        'weekly',
        'schedule',
        'budget',
        'quality',
        'design',
        'other',
      ]
      expect(types).toHaveLength(13)
    })

    it('should allow valid MeetingStatus values', () => {
      const statuses: MeetingStatus[] = [
        'scheduled',
        'in_progress',
        'completed',
        'minutes_draft',
        'minutes_distributed',
        'cancelled',
      ]
      expect(statuses).toHaveLength(6)
    })

    it('should allow valid ActionItemStatus values', () => {
      const statuses: ActionItemStatus[] = [
        'open',
        'in_progress',
        'completed',
        'deferred',
        'cancelled',
      ]
      expect(statuses).toHaveLength(5)
    })

    it('should allow valid AttendanceStatus values', () => {
      const statuses: AttendanceStatus[] = [
        'invited',
        'confirmed',
        'attended',
        'absent',
        'excused',
      ]
      expect(statuses).toHaveLength(5)
    })

    it('should allow valid RSVPResponse values', () => {
      const responses: RSVPResponse[] = ['yes', 'no', 'maybe', 'pending']
      expect(responses).toHaveLength(4)
    })

    it('should allow valid MeetingAttachmentType values', () => {
      const types: MeetingAttachmentType[] = [
        'agenda',
        'minutes',
        'presentation',
        'handout',
        'photo',
        'general',
      ]
      expect(types).toHaveLength(6)
    })

    it('should allow valid ActionItemPriority values', () => {
      const priorities: ActionItemPriority[] = ['low', 'normal', 'high', 'critical']
      expect(priorities).toHaveLength(4)
    })
  })

  describe('Filter types', () => {
    it('should validate MeetingFilters structure', () => {
      const filters: MeetingFilters = {
        projectId: 'project-1',
        meetingType: 'oac',
        status: ['scheduled', 'in_progress'],
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        organizerId: 'user-1',
        search: 'test',
      }

      expect(filters.projectId).toBe('project-1')
      expect(filters.meetingType).toBe('oac')
      expect(filters.status).toContain('scheduled')
    })

    it('should validate ActionItemFilters structure', () => {
      const filters: ActionItemFilters = {
        projectId: 'project-1',
        meetingId: 'meeting-1',
        status: ['open', 'in_progress'],
        assignedTo: 'user-1',
        priority: 'high',
        dueDateFrom: '2024-01-01',
        dueDateTo: '2024-12-31',
        isOverdue: true,
        search: 'test',
      }

      expect(filters.projectId).toBe('project-1')
      expect(filters.isOverdue).toBe(true)
    })
  })
})
