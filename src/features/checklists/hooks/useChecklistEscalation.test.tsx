/**
 * Tests for Checklist Auto-Escalation Hook
 * Comprehensive testing for failed item escalation, punch item creation, and notifications
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// Mock all dependencies first
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}))

vi.mock('@/lib/notifications/notification-service', () => ({
  notificationService: {
    notifyChecklistFailedItems: vi.fn(),
  },
}))

vi.mock('@/lib/api/services/punch-lists', () => ({
  punchListsApi: {
    createPunchItem: vi.fn(),
  },
}))

vi.mock('@/lib/api/services/tasks', () => ({
  tasksApi: {
    createTask: vi.fn(),
  },
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
  },
}))

// Now import everything
import { supabase } from '@/lib/supabase'
import { notificationService } from '@/lib/notifications/notification-service'
import { punchListsApi } from '@/lib/api/services/punch-lists'
import { tasksApi } from '@/lib/api/services/tasks'
import { useChecklistEscalation, SEVERITY_THRESHOLDS } from './useChecklistEscalation'

import type {
  ChecklistExecution,
  ChecklistResponse,
  ChecklistTemplateItem,
} from '@/types/checklists'

// Test data
const mockExecution: ChecklistExecution = {
  id: 'exec-1',
  project_id: 'project-1',
  checklist_template_id: 'template-1',
  name: 'Daily Safety Inspection',
  location: 'Floor 3',
  inspector_user_id: 'inspector-1',
  inspector_name: 'John Inspector',
  score_total: 10,
  score_pass: 5,
  score_fail: 5,
  score_na: 0,
  status: 'completed',
  submitted_at: '2025-01-11T10:00:00Z',
  created_at: '2025-01-11T09:00:00Z',
  updated_at: '2025-01-11T10:00:00Z',
  created_by: 'user-1',
  deleted_at: null,
}

const mockFailedResponse: ChecklistResponse = {
  id: 'response-1',
  checklist_execution_id: 'exec-1',
  checklist_template_item_id: 'item-1',
  item_label: 'Fire extinguishers accessible',
  score_value: 'fail',
  notes: 'Blocked by equipment',
  photo_urls: [],
  created_at: '2025-01-11T09:30:00Z',
  updated_at: '2025-01-11T09:30:00Z',
}

const mockTemplateItem: ChecklistTemplateItem = {
  id: 'item-1',
  checklist_template_id: 'template-1',
  label: 'Fire extinguishers accessible',
  description: 'All fire extinguishers must be accessible',
  section: 'Fire Safety',
  order_index: 1,
  scoring_type: 'pass_fail',
  escalate_on_fail: 'punch_item',
  escalation_config: {
    title_prefix: 'Safety Issue: ',
    include_notes: true,
    priority: 'high',
    due_days: 2,
    default_trade: 'Fire Safety',
    auto_assign_to_inspector: true,
  },
  conditional_logic: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  deleted_at: null,
}

const mockProjectTeamMembers = [
  {
    user_id: 'pm-1',
    role: 'project_manager',
    users: {
      id: 'pm-1',
      email: 'pm@example.com',
      first_name: 'Alice',
      last_name: 'Manager',
    },
  },
]

const mockProject = {
  id: 'project-1',
  name: 'Construction Project Alpha',
}

// Helper to create chain mock
const createChainMock = (data: unknown, error: unknown = null) => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  then: vi.fn().mockImplementation((onFulfilled) =>
    Promise.resolve({ data, error }).then(onFulfilled)
  ),
})

describe('useChecklistEscalation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('calculateSeverityLevel', () => {
    it('should calculate critical severity for >=50% failures', () => {
      const { result } = renderHook(() => useChecklistEscalation())
      expect(result.current.calculateSeverityLevel(50)).toBe('critical')
      expect(result.current.calculateSeverityLevel(75)).toBe('critical')
    })

    it('should calculate high severity for >=30% failures', () => {
      const { result } = renderHook(() => useChecklistEscalation())
      expect(result.current.calculateSeverityLevel(30)).toBe('high')
      expect(result.current.calculateSeverityLevel(40)).toBe('high')
    })

    it('should calculate medium severity for >=15% failures', () => {
      const { result } = renderHook(() => useChecklistEscalation())
      expect(result.current.calculateSeverityLevel(15)).toBe('medium')
      expect(result.current.calculateSeverityLevel(20)).toBe('medium')
    })

    it('should calculate low severity for <15% failures', () => {
      const { result } = renderHook(() => useChecklistEscalation())
      expect(result.current.calculateSeverityLevel(5)).toBe('low')
      expect(result.current.calculateSeverityLevel(10)).toBe('low')
    })
  })

  describe('triggerEscalation', () => {
    beforeEach(() => {
      // Setup default mocks
      (supabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(createChainMock(mockProjectTeamMembers))
        .mockReturnValueOnce(createChainMock(mockProject))
        .mockReturnValueOnce(createChainMock([mockTemplateItem]))
        .mockReturnValue(createChainMock(null))

      ;(notificationService.notifyChecklistFailedItems as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
    })

    it('should not trigger escalation if failures below threshold', async () => {
      const { result } = renderHook(() => useChecklistEscalation())

      const execution = { ...mockExecution, score_fail: 0 }
      const responses: ChecklistResponse[] = []

      const escalationResult = await result.current.triggerEscalation(
        execution,
        responses,
        { minFailedItems: 1 }
      )

      expect(escalationResult.triggered).toBe(false)
      expect(escalationResult.recipientCount).toBe(0)
      expect(notificationService.notifyChecklistFailedItems).not.toHaveBeenCalled()
    })

    it('should trigger escalation and send notifications for failed items', async () => {
      const { result } = renderHook(() => useChecklistEscalation())

      const responses = [mockFailedResponse]

      const escalationResult = await result.current.triggerEscalation(
        mockExecution,
        responses,
        { minFailedItems: 1 }
      )

      await waitFor(() => {
        expect(escalationResult.triggered).toBe(true)
        expect(escalationResult.recipientCount).toBe(1)
        expect(escalationResult.severity).toBe('critical')
      })

      expect(notificationService.notifyChecklistFailedItems).toHaveBeenCalled()
    })

    it('should auto-create punch item for failed item with escalate_on_fail: punch_item', async () => {
      (punchListsApi.createPunchItem as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'punch-1',
        title: 'Safety Issue: Fire extinguishers accessible',
        project_id: 'project-1',
      })

      const { result } = renderHook(() => useChecklistEscalation())

      const responses = [mockFailedResponse]

      const escalationResult = await result.current.triggerEscalation(
        mockExecution,
        responses,
        { autoCreateItems: true }
      )

      await waitFor(() => {
        expect(escalationResult.autoCreated.punchItemsCreated).toBe(1)
      })

      expect(punchListsApi.createPunchItem).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: 'project-1',
          title: 'Safety Issue: Fire extinguishers accessible',
        }),
        expect.any(Object)
      )
    })
  })

  describe('escalateSingleItem', () => {
    beforeEach(() => {
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(createChainMock(null))
    })

    it('should create punch item for single failed item', async () => {
      (punchListsApi.createPunchItem as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'punch-1',
        title: 'Safety Issue: Fire extinguishers accessible',
      })

      const { result } = renderHook(() => useChecklistEscalation())

      const escalationResult = await result.current.escalateSingleItem(
        mockExecution,
        mockFailedResponse,
        mockTemplateItem,
        'user-1'
      )

      expect(escalationResult.created).toBe(true)
      expect(escalationResult.type).toBe('punch_item')
      expect(escalationResult.id).toBe('punch-1')
    })

    it('should not create anything if escalate_on_fail is none', async () => {
      const noneTemplateItem = {
        ...mockTemplateItem,
        escalate_on_fail: 'none' as const,
      }

      const { result } = renderHook(() => useChecklistEscalation())

      const escalationResult = await result.current.escalateSingleItem(
        mockExecution,
        mockFailedResponse,
        noneTemplateItem
      )

      expect(escalationResult.created).toBe(false)
      expect(punchListsApi.createPunchItem).not.toHaveBeenCalled()
    })
  })

  describe('SEVERITY_THRESHOLDS export', () => {
    it('should export correct threshold values', () => {
      expect(SEVERITY_THRESHOLDS).toEqual({
        critical: 50,
        high: 30,
        medium: 15,
        low: 0,
      })
    })
  })
})
