/**
 * Safety Incidents API Service Tests
 */

import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)

// Use vi.hoisted to define mocks that will be used in vi.mock (which is hoisted)
const { mockSupabaseChain, mockAuth, mockStorage } = vi.hoisted(() => {
  const mockAuth = {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    }),
  }

  const mockStorage = {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: 'test/photo.jpg' }, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/photo.jpg' } }),
    }),
  }

  const mockSupabaseChain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    rpc: vi.fn(),
    then: vi.fn(function(this: any, onFulfilled: any) {
      return Promise.resolve({ data: [], error: null }).then(onFulfilled)
    }),
  }

  return { mockSupabaseChain, mockAuth, mockStorage }
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => mockSupabaseChain),
    auth: mockAuth,
    storage: mockStorage,
    rpc: vi.fn(),
  },
}))

import { safetyIncidentsApi } from './safety-incidents'

describe('safetyIncidentsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset Supabase mock chain
    mockSupabaseChain.select.mockReturnThis()
    mockSupabaseChain.insert.mockReturnThis()
    mockSupabaseChain.update.mockReturnThis()
    mockSupabaseChain.delete.mockReturnThis()
    mockSupabaseChain.eq.mockReturnThis()
    mockSupabaseChain.in.mockReturnThis()
    mockSupabaseChain.is.mockReturnThis()
    mockSupabaseChain.gte.mockReturnThis()
    mockSupabaseChain.lte.mockReturnThis()
    mockSupabaseChain.or.mockReturnThis()
    mockSupabaseChain.order.mockReturnThis()
    mockSupabaseChain.limit.mockReturnThis()
    mockSupabaseChain.single.mockReturnThis()
    mockSupabaseChain.then.mockImplementation(function(this: any, onFulfilled: any) {
      return Promise.resolve({ data: [], error: null }).then(onFulfilled)
    })
  })

  // ============================================================================
  // INCIDENT CRUD TESTS
  // ============================================================================

  describe('getIncidents', () => {
    const mockIncidents = [
      {
        id: 'incident-1',
        incident_number: 'INC-2025-0001',
        severity: 'near_miss',
        incident_type: 'near_miss',
        status: 'reported',
        description: 'Test incident',
        incident_date: '2025-11-28',
        project_id: 'project-1',
        company_id: 'company-1',
      },
    ]

    it('should fetch all incidents', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockIncidents, error: null }).then(onFulfilled)
      )

      const result = await safetyIncidentsApi.getIncidents()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('incident-1')
      expect(mockSupabaseChain.order).toHaveBeenCalledWith('incident_date', { ascending: false })
    })

    it('should apply project filter', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockIncidents, error: null }).then(onFulfilled)
      )

      await safetyIncidentsApi.getIncidents({ project_id: 'project-1' })

      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('project_id', 'project-1')
    })

    it('should apply severity filter with array', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockIncidents, error: null }).then(onFulfilled)
      )

      await safetyIncidentsApi.getIncidents({ severity: ['near_miss', 'first_aid'] })

      expect(mockSupabaseChain.in).toHaveBeenCalledWith('severity', ['near_miss', 'first_aid'])
    })

    it('should apply date range filters', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockIncidents, error: null }).then(onFulfilled)
      )

      await safetyIncidentsApi.getIncidents({
        date_from: '2025-01-01',
        date_to: '2025-12-31',
      })

      expect(mockSupabaseChain.gte).toHaveBeenCalledWith('incident_date', '2025-01-01')
      expect(mockSupabaseChain.lte).toHaveBeenCalledWith('incident_date', '2025-12-31')
    })

    it('should exclude deleted incidents by default', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockIncidents, error: null }).then(onFulfilled)
      )

      await safetyIncidentsApi.getIncidents()

      expect(mockSupabaseChain.is).toHaveBeenCalledWith('deleted_at', null)
    })

    it('should handle database errors', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Database error' } }).then(onFulfilled)
      )

      await expect(safetyIncidentsApi.getIncidents()).rejects.toThrow()
    })
  })

  describe('getIncident', () => {
    const mockIncident = {
      id: 'incident-1',
      incident_number: 'INC-2025-0001',
      severity: 'lost_time',
      status: 'under_investigation',
    }

    it('should fetch single incident by ID', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockIncident, error: null }).then(onFulfilled)
      )

      const result = await safetyIncidentsApi.getIncident('incident-1')

      expect(result.id).toBe('incident-1')
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', 'incident-1')
    })

    it('should throw error when incident not found', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      )

      await expect(safetyIncidentsApi.getIncident('not-found')).rejects.toThrow('Safety incident not found')
    })
  })

  describe('createIncident', () => {
    const newIncident = {
      project_id: 'project-1',
      company_id: 'company-1',
      incident_date: '2025-11-28',
      description: 'Worker slipped on wet floor',
      severity: 'first_aid' as const,
      incident_type: 'injury' as const,
    }

    const createdIncident = {
      id: 'new-incident-1',
      incident_number: 'INC-2025-0001',
      ...newIncident,
      status: 'reported',
      reported_by: 'user-1',
    }

    it('should create a new incident', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: createdIncident, error: null }).then(onFulfilled)
      )

      const result = await safetyIncidentsApi.createIncident(newIncident)

      expect(result.id).toBe('new-incident-1')
      expect(result.incident_number).toBe('INC-2025-0001')
      expect(mockSupabaseChain.insert).toHaveBeenCalled()
    })

    it('should throw error when not authenticated', async () => {
      mockAuth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      await expect(safetyIncidentsApi.createIncident(newIncident)).rejects.toThrow(
        'You must be logged in to report an incident'
      )
    })
  })

  describe('updateIncident', () => {
    it('should update an incident', async () => {
      const updatedIncident = {
        id: 'incident-1',
        status: 'under_investigation',
        root_cause: 'Wet floor from recent cleaning',
      }

      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: updatedIncident, error: null }).then(onFulfilled)
      )

      const result = await safetyIncidentsApi.updateIncident('incident-1', {
        status: 'under_investigation',
        root_cause: 'Wet floor from recent cleaning',
      })

      expect(result.status).toBe('under_investigation')
      expect(mockSupabaseChain.update).toHaveBeenCalled()
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', 'incident-1')
    })
  })

  describe('deleteIncident', () => {
    it('should soft delete an incident', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      )

      await safetyIncidentsApi.deleteIncident('incident-1')

      expect(mockSupabaseChain.update).toHaveBeenCalled()
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', 'incident-1')
    })
  })

  // ============================================================================
  // PEOPLE TESTS
  // ============================================================================

  describe('getIncidentPeople', () => {
    const mockPeople = [
      {
        id: 'person-1',
        incident_id: 'incident-1',
        person_type: 'witness',
        name: 'John Doe',
        statement: 'I saw the incident happen',
      },
    ]

    it('should fetch people for an incident', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockPeople, error: null }).then(onFulfilled)
      )

      const result = await safetyIncidentsApi.getIncidentPeople('incident-1')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('John Doe')
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('incident_id', 'incident-1')
    })
  })

  describe('addPerson', () => {
    it('should add a person to an incident', async () => {
      const newPerson = {
        incident_id: 'incident-1',
        person_type: 'witness' as const,
        name: 'Jane Smith',
        statement: 'Witness statement',
      }

      const createdPerson = { id: 'person-1', ...newPerson }

      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: createdPerson, error: null }).then(onFulfilled)
      )

      const result = await safetyIncidentsApi.addPerson(newPerson)

      expect(result.id).toBe('person-1')
      expect(result.name).toBe('Jane Smith')
    })
  })

  // ============================================================================
  // PHOTOS TESTS
  // ============================================================================

  describe('getIncidentPhotos', () => {
    const mockPhotos = [
      {
        id: 'photo-1',
        incident_id: 'incident-1',
        photo_url: 'https://example.com/photo1.jpg',
        caption: 'Scene photo',
      },
    ]

    it('should fetch photos for an incident', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockPhotos, error: null }).then(onFulfilled)
      )

      const result = await safetyIncidentsApi.getIncidentPhotos('incident-1')

      expect(result).toHaveLength(1)
      expect(result[0].photo_url).toBe('https://example.com/photo1.jpg')
    })
  })

  describe('addPhoto', () => {
    it('should add a photo to an incident', async () => {
      const newPhoto = {
        incident_id: 'incident-1',
        photo_url: 'https://example.com/new-photo.jpg',
        caption: 'New photo',
      }

      const createdPhoto = { id: 'photo-1', ...newPhoto, uploaded_by: 'user-1' }

      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: createdPhoto, error: null }).then(onFulfilled)
      )

      const result = await safetyIncidentsApi.addPhoto(newPhoto)

      expect(result.id).toBe('photo-1')
    })
  })

  // ============================================================================
  // CORRECTIVE ACTIONS TESTS
  // ============================================================================

  describe('getCorrectiveActions', () => {
    const mockActions = [
      {
        id: 'action-1',
        incident_id: 'incident-1',
        description: 'Install warning signs',
        status: 'pending',
        due_date: '2025-12-01',
      },
    ]

    it('should fetch corrective actions', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockActions, error: null }).then(onFulfilled)
      )

      const result = await safetyIncidentsApi.getCorrectiveActions()

      expect(result).toHaveLength(1)
      expect(result[0].description).toBe('Install warning signs')
    })

    it('should filter by incident ID', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockActions, error: null }).then(onFulfilled)
      )

      await safetyIncidentsApi.getCorrectiveActions({ incident_id: 'incident-1' })

      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('incident_id', 'incident-1')
    })

    it('should filter by status', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockActions, error: null }).then(onFulfilled)
      )

      await safetyIncidentsApi.getCorrectiveActions({ status: 'pending' })

      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('status', 'pending')
    })
  })

  describe('createCorrectiveAction', () => {
    it('should create a corrective action', async () => {
      const newAction = {
        incident_id: 'incident-1',
        description: 'Install non-slip mats',
        due_date: '2025-12-15',
      }

      const createdAction = { id: 'action-1', ...newAction, status: 'pending' }

      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: createdAction, error: null }).then(onFulfilled)
      )

      const result = await safetyIncidentsApi.createCorrectiveAction(newAction)

      expect(result.id).toBe('action-1')
      expect(result.status).toBe('pending')
    })
  })

  describe('completeCorrectiveAction', () => {
    it('should mark action as completed', async () => {
      const completedAction = {
        id: 'action-1',
        status: 'completed',
        completed_date: '2025-11-28',
      }

      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: completedAction, error: null }).then(onFulfilled)
      )

      const result = await safetyIncidentsApi.completeCorrectiveAction('action-1', 'Work completed')

      expect(result.status).toBe('completed')
    })
  })

  // ============================================================================
  // STATISTICS TESTS
  // ============================================================================

  describe('getStats', () => {
    const mockIncidentsForStats = [
      { severity: 'near_miss', incident_type: 'near_miss', status: 'closed', osha_recordable: false, days_away_from_work: 0, days_restricted_duty: 0, incident_date: '2025-11-01' },
      { severity: 'first_aid', incident_type: 'injury', status: 'closed', osha_recordable: false, days_away_from_work: 0, days_restricted_duty: 0, incident_date: '2025-11-15' },
      { severity: 'lost_time', incident_type: 'injury', status: 'under_investigation', osha_recordable: true, days_away_from_work: 5, days_restricted_duty: 2, incident_date: '2025-11-20' },
    ]

    it('should calculate incident statistics', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockIncidentsForStats, error: null }).then(onFulfilled)
      )

      const stats = await safetyIncidentsApi.getStats('project-1')

      expect(stats.total_incidents).toBe(3)
      expect(stats.near_misses).toBe(1)
      expect(stats.first_aid_incidents).toBe(1)
      expect(stats.lost_time_incidents).toBe(1)
      expect(stats.osha_recordable_count).toBe(1)
      expect(stats.total_days_away).toBe(5)
      expect(stats.total_days_restricted).toBe(2)
      expect(stats.closed_incidents).toBe(2)
      expect(stats.open_incidents).toBe(1)
    })

    it('should calculate days since last incident', async () => {
      const recentIncidents = [
        { severity: 'first_aid', incident_type: 'injury', status: 'closed', osha_recordable: false, days_away_from_work: 0, days_restricted_duty: 0, incident_date: new Date().toISOString().split('T')[0] },
      ]

      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: recentIncidents, error: null }).then(onFulfilled)
      )

      const stats = await safetyIncidentsApi.getStats('project-1')

      expect(stats.days_since_last_incident).toBe(0)
    })
  })

  describe('getCorrectiveActionStats', () => {
    const mockActionsForStats = [
      { status: 'pending' },
      { status: 'pending' },
      { status: 'in_progress' },
      { status: 'completed' },
      { status: 'overdue' },
    ]

    it('should calculate corrective action statistics', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockActionsForStats, error: null }).then(onFulfilled)
      )

      const stats = await safetyIncidentsApi.getCorrectiveActionStats()

      expect(stats.total).toBe(5)
      expect(stats.pending).toBe(2)
      expect(stats.in_progress).toBe(1)
      expect(stats.completed).toBe(1)
      expect(stats.overdue).toBe(1)
      expect(stats.completion_rate).toBe(20) // 1/5 = 20%
    })
  })

  // ============================================================================
  // HELPER METHOD TESTS
  // ============================================================================

  describe('_isSeriousIncident', () => {
    it('should return true for medical_treatment', () => {
      expect(safetyIncidentsApi._isSeriousIncident('medical_treatment')).toBe(true)
    })

    it('should return true for lost_time', () => {
      expect(safetyIncidentsApi._isSeriousIncident('lost_time')).toBe(true)
    })

    it('should return true for fatality', () => {
      expect(safetyIncidentsApi._isSeriousIncident('fatality')).toBe(true)
    })

    it('should return false for near_miss', () => {
      expect(safetyIncidentsApi._isSeriousIncident('near_miss')).toBe(false)
    })

    it('should return false for first_aid', () => {
      expect(safetyIncidentsApi._isSeriousIncident('first_aid')).toBe(false)
    })
  })
})
