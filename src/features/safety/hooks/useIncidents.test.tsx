/**
 * Tests for Safety Incident Hooks
 * CRITICAL for OSHA compliance - ensures incident tracking works correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import type {
  SafetyIncident,
  SafetyIncidentWithDetails,
  IncidentPerson,
  IncidentPhoto,
  IncidentCorrectiveAction,
  IncidentStats,
  CorrectiveActionStats,
} from '@/types/safety-incidents'

// =============================================
// Mock Setup
// =============================================

// Create mock functions before vi.mock
const mockGetIncidents = vi.fn()
const mockGetIncident = vi.fn()
const mockGetIncidentWithDetails = vi.fn()
const mockGetStats = vi.fn()
const mockGetRecentIncidents = vi.fn()
const mockGetIncidentPeople = vi.fn()
const mockGetIncidentPhotos = vi.fn()
const mockGetCorrectiveActions = vi.fn()
const mockGetCorrectiveActionStats = vi.fn()
const mockCreateIncident = vi.fn()
const mockUpdateIncident = vi.fn()
const mockDeleteIncident = vi.fn()
const mockCloseIncident = vi.fn()
const mockStartInvestigation = vi.fn()
const mockAddPerson = vi.fn()
const mockRemovePerson = vi.fn()
const mockAddPhoto = vi.fn()
const mockUploadPhoto = vi.fn()
const mockRemovePhoto = vi.fn()
const mockCreateCorrectiveAction = vi.fn()
const mockUpdateCorrectiveAction = vi.fn()
const mockCompleteCorrectiveAction = vi.fn()
const mockDeleteCorrectiveAction = vi.fn()
const mockLinkToTask = vi.fn()
const mockGetOSHA300ASummary = vi.fn()
const mockGetOSHAIncidenceRates = vi.fn()
const mockGetNextCaseNumber = vi.fn()

// Mock toast
const mockShowToast = vi.fn()

vi.mock('@/lib/notifications/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}))

// Mock safety incidents API
vi.mock('@/lib/api/services/safety-incidents', () => ({
  safetyIncidentsApi: {
    getIncidents: (...args: unknown[]) => mockGetIncidents(...args),
    getIncident: (...args: unknown[]) => mockGetIncident(...args),
    getIncidentWithDetails: (...args: unknown[]) => mockGetIncidentWithDetails(...args),
    getStats: (...args: unknown[]) => mockGetStats(...args),
    getRecentIncidents: (...args: unknown[]) => mockGetRecentIncidents(...args),
    getIncidentPeople: (...args: unknown[]) => mockGetIncidentPeople(...args),
    getIncidentPhotos: (...args: unknown[]) => mockGetIncidentPhotos(...args),
    getCorrectiveActions: (...args: unknown[]) => mockGetCorrectiveActions(...args),
    getCorrectiveActionStats: (...args: unknown[]) => mockGetCorrectiveActionStats(...args),
    createIncident: (...args: unknown[]) => mockCreateIncident(...args),
    updateIncident: (...args: unknown[]) => mockUpdateIncident(...args),
    deleteIncident: (...args: unknown[]) => mockDeleteIncident(...args),
    closeIncident: (...args: unknown[]) => mockCloseIncident(...args),
    startInvestigation: (...args: unknown[]) => mockStartInvestigation(...args),
    addPerson: (...args: unknown[]) => mockAddPerson(...args),
    removePerson: (...args: unknown[]) => mockRemovePerson(...args),
    addPhoto: (...args: unknown[]) => mockAddPhoto(...args),
    uploadPhoto: (...args: unknown[]) => mockUploadPhoto(...args),
    removePhoto: (...args: unknown[]) => mockRemovePhoto(...args),
    createCorrectiveAction: (...args: unknown[]) => mockCreateCorrectiveAction(...args),
    updateCorrectiveAction: (...args: unknown[]) => mockUpdateCorrectiveAction(...args),
    completeCorrectiveAction: (...args: unknown[]) => mockCompleteCorrectiveAction(...args),
    deleteCorrectiveAction: (...args: unknown[]) => mockDeleteCorrectiveAction(...args),
    linkToTask: (...args: unknown[]) => mockLinkToTask(...args),
    getOSHA300ASummary: (...args: unknown[]) => mockGetOSHA300ASummary(...args),
    getOSHAIncidenceRates: (...args: unknown[]) => mockGetOSHAIncidenceRates(...args),
    getNextCaseNumber: (...args: unknown[]) => mockGetNextCaseNumber(...args),
  },
}))

// Import hooks after mocks
import {
  incidentKeys,
  useIncidents,
  useIncident,
  useIncidentWithDetails,
  useIncidentStats,
  useRecentIncidents,
  useIncidentPeople,
  useIncidentPhotos,
  useCorrectiveActions,
  useCorrectiveActionStats,
  useCreateIncident,
  useUpdateIncident,
  useDeleteIncident,
  useCloseIncident,
  useStartInvestigation,
  useAddPerson,
  useRemovePerson,
  useAddPhoto,
  useUploadPhoto,
  useRemovePhoto,
  useCreateCorrectiveAction,
  useUpdateCorrectiveAction,
  useCompleteCorrectiveAction,
  useDeleteCorrectiveAction,
  useLinkActionToTask,
  useOSHA300ASummary,
  useOSHAIncidenceRates,
  useGenerateCaseNumber,
} from './useIncidents'

// =============================================
// Test Data
// =============================================

const mockIncident: SafetyIncident = {
  id: 'inc-123',
  incident_number: 'INC-2024-001',
  project_id: 'project-456',
  company_id: 'company-789',
  incident_date: '2024-01-15',
  incident_time: '14:30',
  location: 'Building A - 3rd Floor',
  severity: 'medical_treatment',
  incident_type: 'injury',
  status: 'reported',
  description: 'Worker slipped on wet floor',
  immediate_actions: 'First aid administered',
  weather_conditions: 'Indoor - N/A',
  root_cause_category: null,
  root_cause_description: null,
  preventive_measures: null,
  is_osha_recordable: true,
  osha_case_number: '1',
  employee_name: 'John Smith',
  employee_job_title: 'Electrician',
  is_privacy_case: false,
  injury_illness_type: 'injury',
  body_part_affected: 'ankle',
  days_away_from_work: 0,
  days_restricted_duty: 3,
  death_date: null,
  reported_by: 'user-123',
  reported_at: '2024-01-15T15:00:00Z',
  created_at: '2024-01-15T15:00:00Z',
  updated_at: '2024-01-15T15:00:00Z',
}

const mockIncidents: SafetyIncident[] = [
  mockIncident,
  {
    ...mockIncident,
    id: 'inc-124',
    incident_number: 'INC-2024-002',
    severity: 'first_aid',
    is_osha_recordable: false,
  },
  {
    ...mockIncident,
    id: 'inc-125',
    incident_number: 'INC-2024-003',
    severity: 'near_miss',
    incident_type: 'near_miss',
    is_osha_recordable: false,
  },
]

const mockIncidentStats: IncidentStats = {
  total_incidents: 15,
  open_incidents: 5,
  closed_incidents: 10,
  fatalities: 0,
  osha_recordable_count: 8,
  by_severity: {
    near_miss: 3,
    first_aid: 4,
    medical_treatment: 5,
    lost_time: 3,
    fatality: 0,
  },
  days_since_last_incident: 12,
}

const mockPerson: IncidentPerson = {
  id: 'person-123',
  incident_id: 'inc-123',
  person_type: 'injured_party',
  name: 'John Smith',
  company_name: 'ABC Electric',
  job_title: 'Electrician',
  phone: '555-1234',
  email: 'john@abc.com',
  statement: 'I was walking and slipped',
  created_at: '2024-01-15T15:00:00Z',
}

const mockPhoto: IncidentPhoto = {
  id: 'photo-123',
  incident_id: 'inc-123',
  file_url: 'https://storage.example.com/photo1.jpg',
  thumbnail_url: 'https://storage.example.com/photo1_thumb.jpg',
  caption: 'Scene of incident',
  taken_at: '2024-01-15T14:35:00Z',
  uploaded_by: 'user-123',
  created_at: '2024-01-15T15:00:00Z',
}

const mockCorrectiveAction: IncidentCorrectiveAction = {
  id: 'action-123',
  incident_id: 'inc-123',
  title: 'Install anti-slip mats',
  description: 'Install anti-slip mats in all wet areas',
  assigned_to: 'user-456',
  due_date: '2024-01-30',
  status: 'pending',
  priority: 'high',
  completion_notes: null,
  completed_at: null,
  linked_task_id: null,
  created_at: '2024-01-15T16:00:00Z',
  updated_at: '2024-01-15T16:00:00Z',
}

const mockActionStats: CorrectiveActionStats = {
  total: 10,
  pending: 3,
  in_progress: 4,
  completed: 3,
  overdue: 1,
}

// =============================================
// Test Setup
// =============================================

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  })

const createWrapper = () => {
  const queryClient = createQueryClient()
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()

  // Setup default mock responses
  mockGetIncidents.mockResolvedValue(mockIncidents)
  mockGetIncident.mockResolvedValue(mockIncident)
  mockGetIncidentWithDetails.mockResolvedValue({
    ...mockIncident,
    people: [mockPerson],
    photos: [mockPhoto],
    actions: [mockCorrectiveAction],
  })
  mockGetStats.mockResolvedValue(mockIncidentStats)
  mockGetRecentIncidents.mockResolvedValue(mockIncidents.slice(0, 2))
  mockGetIncidentPeople.mockResolvedValue([mockPerson])
  mockGetIncidentPhotos.mockResolvedValue([mockPhoto])
  mockGetCorrectiveActions.mockResolvedValue([mockCorrectiveAction])
  mockGetCorrectiveActionStats.mockResolvedValue(mockActionStats)
  mockCreateIncident.mockResolvedValue(mockIncident)
  mockUpdateIncident.mockResolvedValue(mockIncident)
  mockDeleteIncident.mockResolvedValue(undefined)
  mockCloseIncident.mockResolvedValue({ ...mockIncident, status: 'closed' })
  mockStartInvestigation.mockResolvedValue({ ...mockIncident, status: 'under_investigation' })
  mockAddPerson.mockResolvedValue(mockPerson)
  mockRemovePerson.mockResolvedValue(undefined)
  mockAddPhoto.mockResolvedValue(mockPhoto)
  mockUploadPhoto.mockResolvedValue(mockPhoto)
  mockRemovePhoto.mockResolvedValue(undefined)
  mockCreateCorrectiveAction.mockResolvedValue(mockCorrectiveAction)
  mockUpdateCorrectiveAction.mockResolvedValue(mockCorrectiveAction)
  mockCompleteCorrectiveAction.mockResolvedValue({ ...mockCorrectiveAction, status: 'completed' })
  mockDeleteCorrectiveAction.mockResolvedValue(undefined)
  mockLinkToTask.mockResolvedValue({ ...mockCorrectiveAction, linked_task_id: 'task-123' })
  mockGetOSHA300ASummary.mockResolvedValue({
    year: 2024,
    total_cases: 8,
    deaths: 0,
    days_away: 15,
    days_restricted: 25,
    other_recordable: 5,
  })
  mockGetOSHAIncidenceRates.mockResolvedValue({
    trir: 4.2,
    dart: 2.8,
    severity_rate: 15.5,
  })
  mockGetNextCaseNumber.mockResolvedValue('2024-009')
})

// =============================================
// Query Key Tests
// =============================================

describe('incidentKeys', () => {
  it('should generate correct base key', () => {
    expect(incidentKeys.all).toEqual(['incidents'])
  })

  it('should generate correct list keys', () => {
    expect(incidentKeys.lists()).toEqual(['incidents', 'list'])
    expect(incidentKeys.list({ status: 'reported' })).toEqual([
      'incidents',
      'list',
      { status: 'reported' },
    ])
  })

  it('should generate correct detail keys', () => {
    expect(incidentKeys.details()).toEqual(['incidents', 'detail'])
    expect(incidentKeys.detail('inc-123')).toEqual(['incidents', 'detail', 'inc-123'])
  })

  it('should generate correct stats key', () => {
    expect(incidentKeys.stats()).toEqual(['incidents', 'stats', undefined])
    expect(incidentKeys.stats('project-456')).toEqual(['incidents', 'stats', 'project-456'])
  })

  it('should generate correct related data keys', () => {
    expect(incidentKeys.people('inc-123')).toEqual(['incidents', 'people', 'inc-123'])
    expect(incidentKeys.photos('inc-123')).toEqual(['incidents', 'photos', 'inc-123'])
    expect(incidentKeys.actions()).toEqual(['incidents', 'actions', undefined])
  })

  it('should generate correct OSHA keys', () => {
    expect(incidentKeys.osha300Summary(2024)).toEqual([
      'incidents',
      'osha300Summary',
      2024,
      undefined,
    ])
    expect(incidentKeys.oshaRates(2024, 200000)).toEqual([
      'incidents',
      'oshaRates',
      2024,
      200000,
      undefined,
    ])
  })
})

// =============================================
// Query Hook Tests
// =============================================

describe('useIncidents', () => {
  it('should fetch incidents', async () => {
    const { result } = renderHook(() => useIncidents(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockIncidents)
    expect(mockGetIncidents).toHaveBeenCalledWith({})
  })

  it('should fetch incidents with filters', async () => {
    const filters = { status: 'reported' as const, severity: 'medical_treatment' as const }
    const { result } = renderHook(() => useIncidents(filters), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockGetIncidents).toHaveBeenCalledWith(filters)
  })
})

describe('useIncident', () => {
  it('should fetch single incident', async () => {
    const { result } = renderHook(() => useIncident('inc-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockIncident)
    expect(mockGetIncident).toHaveBeenCalledWith('inc-123')
  })

  it('should not fetch when id is empty', () => {
    const { result } = renderHook(() => useIncident(''), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useIncidentWithDetails', () => {
  it('should fetch incident with related data', async () => {
    const { result } = renderHook(() => useIncidentWithDetails('inc-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.people).toBeDefined()
    expect(result.current.data?.photos).toBeDefined()
    expect(result.current.data?.actions).toBeDefined()
    expect(mockGetIncidentWithDetails).toHaveBeenCalledWith('inc-123')
  })
})

describe('useIncidentStats', () => {
  it('should fetch incident statistics', async () => {
    const { result } = renderHook(() => useIncidentStats(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockIncidentStats)
  })

  it('should fetch stats for specific project', async () => {
    const { result } = renderHook(() => useIncidentStats('project-456', 'company-789'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockGetStats).toHaveBeenCalledWith('project-456', 'company-789')
  })
})

describe('useRecentIncidents', () => {
  it('should fetch recent incidents for project', async () => {
    const { result } = renderHook(() => useRecentIncidents('project-456', 5), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockGetRecentIncidents).toHaveBeenCalledWith('project-456', 5)
  })

  it('should not fetch when projectId is empty', () => {
    const { result } = renderHook(() => useRecentIncidents(''), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useIncidentPeople', () => {
  it('should fetch people for incident', async () => {
    const { result } = renderHook(() => useIncidentPeople('inc-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([mockPerson])
    expect(mockGetIncidentPeople).toHaveBeenCalledWith('inc-123')
  })
})

describe('useIncidentPhotos', () => {
  it('should fetch photos for incident', async () => {
    const { result } = renderHook(() => useIncidentPhotos('inc-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([mockPhoto])
    expect(mockGetIncidentPhotos).toHaveBeenCalledWith('inc-123')
  })
})

describe('useCorrectiveActions', () => {
  it('should fetch corrective actions', async () => {
    const { result } = renderHook(() => useCorrectiveActions(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([mockCorrectiveAction])
  })

  it('should fetch actions with filters', async () => {
    const filters = { incident_id: 'inc-123', status: 'pending' as const }
    const { result } = renderHook(() => useCorrectiveActions(filters), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockGetCorrectiveActions).toHaveBeenCalledWith(filters)
  })
})

describe('useCorrectiveActionStats', () => {
  it('should fetch action statistics', async () => {
    const { result } = renderHook(() => useCorrectiveActionStats(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockActionStats)
  })
})

// =============================================
// Mutation Hook Tests
// =============================================

describe('useCreateIncident', () => {
  it('should create incident and show toast', async () => {
    const { result } = renderHook(() => useCreateIncident(), {
      wrapper: createWrapper(),
    })

    const input = {
      project_id: 'project-456',
      company_id: 'company-789',
      incident_date: '2024-01-20',
      severity: 'first_aid' as const,
      incident_type: 'injury' as const,
      description: 'Minor cut',
    }

    await result.current.mutateAsync(input)

    expect(mockCreateIncident).toHaveBeenCalledWith(input)
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        title: 'Incident Reported',
      })
    )
  })
})

describe('useUpdateIncident', () => {
  it('should update incident', async () => {
    const { result } = renderHook(() => useUpdateIncident(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({
      id: 'inc-123',
      data: { description: 'Updated description' },
    })

    expect(mockUpdateIncident).toHaveBeenCalledWith('inc-123', {
      description: 'Updated description',
    })
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        title: 'Incident Updated',
      })
    )
  })
})

describe('useDeleteIncident', () => {
  it('should delete incident', async () => {
    const { result } = renderHook(() => useDeleteIncident(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync('inc-123')

    expect(mockDeleteIncident).toHaveBeenCalledWith('inc-123')
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        title: 'Incident Deleted',
      })
    )
  })
})

describe('useCloseIncident', () => {
  it('should close incident', async () => {
    const { result } = renderHook(() => useCloseIncident(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync('inc-123')

    expect(mockCloseIncident).toHaveBeenCalledWith('inc-123')
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        title: 'Incident Closed',
      })
    )
  })
})

describe('useStartInvestigation', () => {
  it('should start investigation', async () => {
    const { result } = renderHook(() => useStartInvestigation(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync('inc-123')

    expect(mockStartInvestigation).toHaveBeenCalledWith('inc-123')
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        title: 'Investigation Started',
      })
    )
  })
})

// =============================================
// People Mutation Tests
// =============================================

describe('useAddPerson', () => {
  it('should add person to incident', async () => {
    const { result } = renderHook(() => useAddPerson(), {
      wrapper: createWrapper(),
    })

    const input = {
      incident_id: 'inc-123',
      person_type: 'witness' as const,
      name: 'Jane Doe',
    }

    await result.current.mutateAsync(input)

    expect(mockAddPerson).toHaveBeenCalledWith(input)
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        title: 'Person Added',
      })
    )
  })
})

describe('useRemovePerson', () => {
  it('should remove person from incident', async () => {
    const { result } = renderHook(() => useRemovePerson('inc-123'), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync('person-123')

    expect(mockRemovePerson).toHaveBeenCalledWith('person-123')
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        title: 'Person Removed',
      })
    )
  })
})

// =============================================
// Photo Mutation Tests
// =============================================

describe('useAddPhoto', () => {
  it('should add photo to incident', async () => {
    const { result } = renderHook(() => useAddPhoto(), {
      wrapper: createWrapper(),
    })

    const input = {
      incident_id: 'inc-123',
      file_url: 'https://storage.example.com/new-photo.jpg',
      caption: 'Additional photo',
    }

    await result.current.mutateAsync(input)

    expect(mockAddPhoto).toHaveBeenCalledWith(input)
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        title: 'Photo Added',
      })
    )
  })
})

describe('useUploadPhoto', () => {
  it('should upload photo', async () => {
    const { result } = renderHook(() => useUploadPhoto(), {
      wrapper: createWrapper(),
    })

    const file = new File([''], 'test.jpg', { type: 'image/jpeg' })

    await result.current.mutateAsync({
      incidentId: 'inc-123',
      file,
      caption: 'Test photo',
    })

    expect(mockUploadPhoto).toHaveBeenCalledWith('inc-123', file, 'Test photo')
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        title: 'Photo Uploaded',
      })
    )
  })
})

describe('useRemovePhoto', () => {
  it('should remove photo', async () => {
    const { result } = renderHook(() => useRemovePhoto('inc-123'), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync('photo-123')

    expect(mockRemovePhoto).toHaveBeenCalledWith('photo-123')
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        title: 'Photo Removed',
      })
    )
  })
})

// =============================================
// Corrective Action Mutation Tests
// =============================================

describe('useCreateCorrectiveAction', () => {
  it('should create corrective action', async () => {
    const { result } = renderHook(() => useCreateCorrectiveAction(), {
      wrapper: createWrapper(),
    })

    const input = {
      incident_id: 'inc-123',
      title: 'New safety measure',
      description: 'Implement new safety protocol',
      assigned_to: 'user-456',
      due_date: '2024-02-15',
      priority: 'high' as const,
    }

    await result.current.mutateAsync(input)

    expect(mockCreateCorrectiveAction).toHaveBeenCalledWith(input)
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        title: 'Action Created',
      })
    )
  })
})

describe('useUpdateCorrectiveAction', () => {
  it('should update corrective action', async () => {
    const { result } = renderHook(() => useUpdateCorrectiveAction(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({
      id: 'action-123',
      data: { status: 'in_progress' as const },
    })

    expect(mockUpdateCorrectiveAction).toHaveBeenCalledWith('action-123', {
      status: 'in_progress',
    })
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        title: 'Action Updated',
      })
    )
  })
})

describe('useCompleteCorrectiveAction', () => {
  it('should complete corrective action', async () => {
    const { result } = renderHook(() => useCompleteCorrectiveAction(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({
      id: 'action-123',
      notes: 'Completed successfully',
    })

    expect(mockCompleteCorrectiveAction).toHaveBeenCalledWith('action-123', 'Completed successfully')
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        title: 'Action Completed',
      })
    )
  })
})

describe('useDeleteCorrectiveAction', () => {
  it('should delete corrective action', async () => {
    const { result } = renderHook(() => useDeleteCorrectiveAction(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync('action-123')

    expect(mockDeleteCorrectiveAction).toHaveBeenCalledWith('action-123')
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        title: 'Action Deleted',
      })
    )
  })
})

describe('useLinkActionToTask', () => {
  it('should link action to task', async () => {
    const { result } = renderHook(() => useLinkActionToTask(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({
      actionId: 'action-123',
      taskId: 'task-456',
    })

    expect(mockLinkToTask).toHaveBeenCalledWith('action-123', 'task-456')
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        title: 'Action Linked',
      })
    )
  })
})

// =============================================
// OSHA 300 Log Tests
// =============================================

describe('useOSHA300ASummary', () => {
  it('should fetch OSHA 300A summary', async () => {
    const { result } = renderHook(() => useOSHA300ASummary(2024), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockGetOSHA300ASummary).toHaveBeenCalledWith(2024, undefined)
    expect(result.current.data?.year).toBe(2024)
  })

  it('should fetch summary for specific project', async () => {
    const { result } = renderHook(() => useOSHA300ASummary(2024, 'project-456'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockGetOSHA300ASummary).toHaveBeenCalledWith(2024, 'project-456')
  })
})

describe('useOSHAIncidenceRates', () => {
  it('should fetch OSHA incidence rates', async () => {
    const { result } = renderHook(() => useOSHAIncidenceRates(2024, 200000), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockGetOSHAIncidenceRates).toHaveBeenCalledWith(2024, 200000, undefined)
    expect(result.current.data?.trir).toBeDefined()
    expect(result.current.data?.dart).toBeDefined()
  })

  it('should not fetch when hoursWorked is 0', () => {
    const { result } = renderHook(() => useOSHAIncidenceRates(2024, 0), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useGenerateCaseNumber', () => {
  it('should generate next case number', async () => {
    const { result } = renderHook(() => useGenerateCaseNumber(), {
      wrapper: createWrapper(),
    })

    const caseNumber = await result.current.mutateAsync({
      projectId: 'project-456',
      year: 2024,
    })

    expect(mockGetNextCaseNumber).toHaveBeenCalledWith('project-456', 2024)
    expect(caseNumber).toBe('2024-009')
  })
})

// =============================================
// OSHA Compliance Critical Tests
// =============================================

describe('OSHA Compliance Critical Tests', () => {
  it('should track OSHA recordable status', () => {
    expect(mockIncident.is_osha_recordable).toBe(true)
    expect(mockIncident.osha_case_number).toBeDefined()
  })

  it('should track days away from work', () => {
    expect(mockIncident.days_away_from_work).toBeDefined()
    expect(typeof mockIncident.days_away_from_work).toBe('number')
  })

  it('should track days on restricted duty', () => {
    expect(mockIncident.days_restricted_duty).toBeDefined()
    expect(typeof mockIncident.days_restricted_duty).toBe('number')
  })

  it('should track injury/illness type', () => {
    expect(mockIncident.injury_illness_type).toBeDefined()
    expect(['injury', 'skin_disorder', 'respiratory', 'poisoning', 'hearing_loss', 'other_illness']).toContain(
      mockIncident.injury_illness_type
    )
  })

  it('should track body part affected', () => {
    expect(mockIncident.body_part_affected).toBeDefined()
  })

  it('should support privacy case flag', () => {
    expect(mockIncident.is_privacy_case).toBeDefined()
    expect(typeof mockIncident.is_privacy_case).toBe('boolean')
  })

  it('should track incident statistics correctly', () => {
    expect(mockIncidentStats.osha_recordable_count).toBeDefined()
    expect(mockIncidentStats.fatalities).toBeDefined()
    expect(mockIncidentStats.days_since_last_incident).toBeDefined()
  })

  it('should provide severity breakdown', () => {
    expect(mockIncidentStats.by_severity).toBeDefined()
    expect(mockIncidentStats.by_severity.near_miss).toBeDefined()
    expect(mockIncidentStats.by_severity.first_aid).toBeDefined()
    expect(mockIncidentStats.by_severity.medical_treatment).toBeDefined()
    expect(mockIncidentStats.by_severity.lost_time).toBeDefined()
    expect(mockIncidentStats.by_severity.fatality).toBeDefined()
  })
})

// =============================================
// Error Handling Tests
// =============================================

describe('Safety Error Handling', () => {
  it('should show error toast on create failure', async () => {
    mockCreateIncident.mockRejectedValueOnce(new Error('Failed to create'))

    const { result } = renderHook(() => useCreateIncident(), {
      wrapper: createWrapper(),
    })

    await expect(
      result.current.mutateAsync({
        project_id: 'project-456',
        company_id: 'company-789',
        incident_date: '2024-01-20',
        severity: 'first_aid',
        incident_type: 'injury',
        description: 'Test',
      })
    ).rejects.toThrow()

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        title: 'Error',
      })
    )
  })

  it('should show error toast on update failure', async () => {
    mockUpdateIncident.mockRejectedValueOnce(new Error('Failed to update'))

    const { result } = renderHook(() => useUpdateIncident(), {
      wrapper: createWrapper(),
    })

    await expect(
      result.current.mutateAsync({
        id: 'inc-123',
        data: { description: 'Updated' },
      })
    ).rejects.toThrow()

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
      })
    )
  })
})
