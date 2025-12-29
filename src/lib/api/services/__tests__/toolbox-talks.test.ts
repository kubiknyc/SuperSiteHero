import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { supabase } from '@/lib/supabase'
import {
  toolboxTopicsApi,
  toolboxTalksApi,
  toolboxAttendeesApi,
  toolboxCertificationsApi,
  toolboxStatsApi,
} from '../toolbox-talks'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}))

describe('Toolbox Topics API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTopics', () => {
    it('should fetch topics with filters', async () => {
      const mockTopics = [
        { id: '1', title: 'Fall Protection', category: 'safety' },
        { id: '2', title: 'Ladder Safety', category: 'safety' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: mockTopics, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await toolboxTopicsApi.getTopics({ company_id: 'company-1' })

      expect(result).toHaveLength(2)
      expect(result[0].title).toBe('Fall Protection')
    })

    it('should filter by category', async () => {
      const queryResult = { data: [], error: null }
      const mockQuery: any = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        then: (resolve: any) => Promise.resolve(queryResult).then(resolve),
        catch: (reject: any) => Promise.resolve(queryResult).catch(reject),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery)

      await toolboxTopicsApi.getTopics({ company_id: 'company-1', category: 'safety' })

      expect(mockQuery.eq).toHaveBeenCalledWith('category', 'safety')
    })
  })

  describe('getTopic', () => {
    it('should fetch single topic', async () => {
      const mockTopic = { id: '1', title: 'Fall Protection' }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTopic, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await toolboxTopicsApi.getTopic('1')

      expect(result.title).toBe('Fall Protection')
    })

    it('should throw error when topic not found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await expect(toolboxTopicsApi.getTopic('999')).rejects.toThrow()
    })
  })

  describe('createTopic', () => {
    it('should create new topic', async () => {
      const mockUser = { user: { id: 'user-1' } }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: mockUser } as any)

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await toolboxTopicsApi.createTopic({
        company_id: 'company-1',
        title: 'New Topic',
        category: 'safety',
      })

      expect(result.id).toBe('1')
    })
  })

  describe('updateTopic', () => {
    it('should update topic', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await toolboxTopicsApi.updateTopic('1', { title: 'Updated Title' })

      expect(mockQuery.eq).toHaveBeenCalledWith('is_system_template', false)
    })
  })
})

describe('Toolbox Talks API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTalks', () => {
    it('should fetch talks with filters', async () => {
      const mockTalks = [
        { id: '1', status: 'scheduled', topic: { title: 'Fall Protection' } },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: mockTalks, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await toolboxTalksApi.getTalks({ project_id: 'project-1' })

      expect(result).toHaveLength(1)
    })
  })

  describe('getTalk', () => {
    it('should fetch single talk', async () => {
      const mockTalk = { id: '1', status: 'scheduled' }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTalk, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await toolboxTalksApi.getTalk('1')

      expect(result.id).toBe('1')
    })
  })

  describe('getTalkWithDetails', () => {
    it('should fetch talk with attendees', async () => {
      const mockTalk = { id: '1', status: 'scheduled' }
      const mockAttendees = [
        { id: 'a1', attendance_status: 'present' },
        { id: 'a2', attendance_status: 'present' },
      ]

      const mockTalkQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTalk, error: null }),
      }

      const mockAttendeesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockAttendees, error: null }),
      }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'toolbox_talk_attendees') {return mockAttendeesQuery as any}
        return mockTalkQuery as any
      })

      const result = await toolboxTalksApi.getTalkWithDetails('1')

      expect(result.attendees).toHaveLength(2)
      expect(result.present_count).toBe(2)
    })
  })

  describe('createTalk', () => {
    it('should create new talk', async () => {
      const mockUser = { user: { id: 'user-1' } }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: mockUser } as any)

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await toolboxTalksApi.createTalk({
        project_id: 'project-1',
        company_id: 'company-1',
        category: 'safety',
        scheduled_date: '2024-01-15',
      })

      expect(result.id).toBe('1')
    })
  })

  describe('startTalk', () => {
    it('should start talk and set status to in_progress', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1', status: 'in_progress' }, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await toolboxTalksApi.startTalk('1')

      expect(result.status).toBe('in_progress')
      expect(mockQuery.in).toHaveBeenCalledWith('status', ['scheduled', 'draft'])
    })
  })

  describe('completeTalk', () => {
    it('should complete talk', async () => {
      const mockUser = { user: { id: 'user-1' } }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: mockUser } as any)

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1', status: 'completed' }, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await toolboxTalksApi.completeTalk('1', {
        duration_minutes: 30,
        notes: 'Talk completed successfully',
      })

      expect(result.status).toBe('completed')
    })
  })

  describe('getUpcomingTalks', () => {
    it('should fetch upcoming talks', async () => {
      const mockTalks = [{ id: '1', scheduled_date: '2024-01-20' }]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTalks, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await toolboxTalksApi.getUpcomingTalks('project-1', 7)

      expect(result).toHaveLength(1)
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'scheduled')
    })
  })
})

describe('Toolbox Attendees API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAttendees', () => {
    it('should fetch attendees for talk', async () => {
      const mockAttendees = [
        { id: '1', worker_name: 'John Doe' },
        { id: '2', worker_name: 'Jane Smith' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockAttendees, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await toolboxAttendeesApi.getAttendees('talk-1')

      expect(result).toHaveLength(2)
    })
  })

  describe('addAttendee', () => {
    it('should add attendee to talk', async () => {
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await toolboxAttendeesApi.addAttendee({
        toolbox_talk_id: 'talk-1',
        worker_name: 'John Doe',
      })

      expect(result.id).toBe('1')
    })
  })

  describe('bulkAddAttendees', () => {
    it('should add multiple attendees', async () => {
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [{ id: '1' }, { id: '2' }], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await toolboxAttendeesApi.bulkAddAttendees({
        toolbox_talk_id: 'talk-1',
        attendees: [
          { worker_name: 'John Doe' },
          { worker_name: 'Jane Smith' },
        ],
      })

      expect(result).toHaveLength(2)
    })
  })

  describe('signInAttendee', () => {
    it('should sign in attendee', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { attendance_status: 'present' }, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await toolboxAttendeesApi.signInAttendee('attendee-1', {
        signature_data: 'signature-base64',
      })

      expect(result.attendance_status).toBe('present')
    })
  })

  describe('markAbsent', () => {
    it('should mark attendee as absent', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { attendance_status: 'absent' }, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await toolboxAttendeesApi.markAbsent('attendee-1', 'Sick leave')

      expect(result.attendance_status).toBe('absent')
    })
  })

  describe('bulkSignIn', () => {
    it('should sign in all expected attendees', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [{}, {}, {}], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await toolboxAttendeesApi.bulkSignIn('talk-1')

      expect(result).toBe(3)
    })
  })
})

describe('Toolbox Certifications API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCertifications', () => {
    it('should fetch certifications with status calculation', async () => {
      const mockCerts = [
        {
          id: '1',
          worker_name: 'John Doe',
          expires_date: '2024-12-31',
          topic: { title: 'Fall Protection' },
        },
      ]

      const queryResult = { data: mockCerts, error: null }
      const mockQuery: any = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        then: (resolve: any) => Promise.resolve(queryResult).then(resolve),
        catch: (reject: any) => Promise.resolve(queryResult).catch(reject),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery)

      const result = await toolboxCertificationsApi.getCertifications({})

      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty('certification_status')
    })
  })

  describe('getWorkerCertifications', () => {
    it('should fetch certifications for specific worker', async () => {
      const queryResult = { data: [], error: null }
      const mockQuery: any = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        then: (resolve: any) => Promise.resolve(queryResult).then(resolve),
        catch: (reject: any) => Promise.resolve(queryResult).catch(reject),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery)

      await toolboxCertificationsApi.getWorkerCertifications('company-1', 'John Doe')

      expect(mockQuery.ilike).toHaveBeenCalled()
      expect(mockQuery.eq).toHaveBeenCalledWith('is_current', true)
    })
  })

  describe('getExpiringCertifications', () => {
    it('should fetch certifications expiring within days', async () => {
      const queryResult = { data: [], error: null }
      const mockQuery: any = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        then: (resolve: any) => Promise.resolve(queryResult).then(resolve),
        catch: (reject: any) => Promise.resolve(queryResult).catch(reject),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery)

      await toolboxCertificationsApi.getExpiringCertifications('company-1', 30)

      expect(mockQuery.eq).toHaveBeenCalledWith('company_id', 'company-1')
      expect(mockQuery.eq).toHaveBeenCalledWith('is_current', true)
    })
  })
})

describe('Toolbox Stats API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getProjectStats', () => {
    it('should fetch project statistics', async () => {
      const mockStats = {
        total_talks: 50,
        completed_talks: 40,
        scheduled_talks: 10,
      }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStats, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await toolboxStatsApi.getProjectStats('project-1')

      expect(result.total_talks).toBe(50)
    })

    it('should return default stats when no data', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await toolboxStatsApi.getProjectStats('project-1')

      expect(result.total_talks).toBe(0)
    })
  })

  describe('getComplianceSummary', () => {
    it('should calculate compliance summary', async () => {
      const mockCerts = [
        { worker_name: 'John', certification_status: 'valid' },
        { worker_name: 'Jane', certification_status: 'expiring_soon' },
      ]

      const mockTalks = [{ id: '1', topic_id: 'topic-1' }]

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'toolbox_talks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            is: vi.fn().mockResolvedValue({ data: mockTalks, error: null }),
          } as any
        }
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: mockCerts, error: null }),
        } as any
      })

      // Mock getCertifications
      toolboxCertificationsApi.getCertifications = vi.fn().mockResolvedValue(mockCerts)

      const result = await toolboxStatsApi.getComplianceSummary('company-1')

      expect(result.total_workers).toBeGreaterThan(0)
      expect(result).toHaveProperty('compliance_percentage')
    })
  })

  describe('getAttendanceRate', () => {
    it('should calculate attendance rate', async () => {
      const mockTalks = [{ id: 'talk-1' }]
      const mockAttendees = [
        { attendance_status: 'present' },
        { attendance_status: 'present' },
        { attendance_status: 'absent' },
      ]

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'toolbox_talk_attendees') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: mockAttendees, error: null }),
          } as any
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          is: vi.fn().mockResolvedValue({ data: mockTalks, error: null }),
        } as any
      })

      const result = await toolboxStatsApi.getAttendanceRate('project-1', 30)

      expect(result).toBe(67) // 2/3 present = 67%
    })

    it('should return 100 when no talks', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await toolboxStatsApi.getAttendanceRate('project-1')

      expect(result).toBe(100)
    })
  })
})
