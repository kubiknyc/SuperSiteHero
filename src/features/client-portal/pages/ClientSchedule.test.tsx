/**
 * ClientSchedule Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TestProviders } from '@/__tests__/utils/TestProviders'
import { ClientSchedule } from './ClientSchedule'
import type { ClientScheduleItemView } from '@/types/client-portal'

// Mock useParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ projectId: 'proj-123' }),
  }
})

// Mock the hooks
const mockUseClientSchedule = vi.fn()

vi.mock('../hooks/useClientPortal', () => ({
  useClientSchedule: () => mockUseClientSchedule(),
}))

// Create mock schedule item data
const createMockScheduleItem = (
  overrides: Partial<ClientScheduleItemView> = {}
): ClientScheduleItemView => ({
  id: 'item-123',
  task_name: 'Foundation Work',
  start_date: '2025-01-15',
  finish_date: '2025-02-15',
  duration_days: 30,
  percent_complete: 50,
  is_milestone: false,
  is_critical: false,
  status: 'in_progress',
  ...overrides,
})

function renderPage() {
  return render(
    <TestProviders>
      <ClientSchedule />
    </TestProviders>
  )
}

describe('ClientSchedule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-02-01'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Loading State', () => {
    it('should show loading skeletons', () => {
      mockUseClientSchedule.mockReturnValue({
        data: undefined,
        isLoading: true,
      })

      const { container } = renderPage()

      const skeletons = container.querySelectorAll('.animate-pulse, [class*="skeleton"]')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no schedule items', () => {
      mockUseClientSchedule.mockReturnValue({
        data: [],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('No Schedule Available')).toBeInTheDocument()
      expect(screen.getByText(/Schedule information will appear here/)).toBeInTheDocument()
    })
  })

  describe('Page Header', () => {
    it('should display page title', () => {
      mockUseClientSchedule.mockReturnValue({
        data: [createMockScheduleItem()],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Project Schedule')).toBeInTheDocument()
    })

    it('should display page description', () => {
      mockUseClientSchedule.mockReturnValue({
        data: [createMockScheduleItem()],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Track project timeline and milestones.')).toBeInTheDocument()
    })
  })

  describe('Overall Progress', () => {
    it('should display overall progress percentage', () => {
      mockUseClientSchedule.mockReturnValue({
        data: [
          createMockScheduleItem({ id: 'item-progress-1', percent_complete: 100 }),
          createMockScheduleItem({ id: 'item-progress-2', percent_complete: 50 }),
        ],
        isLoading: false,
      })

      renderPage()

      // 75% appears in overall progress section
      const progressText = screen.getAllByText('75%')
      expect(progressText.length).toBeGreaterThan(0)
    })

    it('should display tasks completion count', () => {
      mockUseClientSchedule.mockReturnValue({
        data: [
          createMockScheduleItem({ id: 'item-count-1', percent_complete: 100 }),
          createMockScheduleItem({ id: 'item-count-2', percent_complete: 100 }),
          createMockScheduleItem({ id: 'item-count-3', percent_complete: 50 }),
        ],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText(/2 of 3 tasks complete/)).toBeInTheDocument()
    })

    it('should show 0% when no tasks', () => {
      mockUseClientSchedule.mockReturnValue({
        data: [createMockScheduleItem({ is_milestone: true })],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('0%')).toBeInTheDocument()
    })
  })

  describe('Milestones', () => {
    it('should display milestones section', () => {
      mockUseClientSchedule.mockReturnValue({
        data: [
          createMockScheduleItem({ id: 'milestone-1', is_milestone: true, task_name: 'Project Kickoff' }),
        ],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText(/All Milestones/)).toBeInTheDocument()
    })

    it('should display milestone name', () => {
      mockUseClientSchedule.mockReturnValue({
        data: [
          createMockScheduleItem({ id: 'milestone-2', is_milestone: true, task_name: 'Substantial Completion' }),
        ],
        isLoading: false,
      })

      renderPage()

      // Milestone name may appear in multiple sections (Upcoming and All Milestones)
      const milestoneElements = screen.getAllByText('Substantial Completion')
      expect(milestoneElements.length).toBeGreaterThan(0)
    })

    it('should show upcoming milestones section', () => {
      mockUseClientSchedule.mockReturnValue({
        data: [
          createMockScheduleItem({
            id: 'milestone-upcoming',
            is_milestone: true,
            task_name: 'Upcoming Milestone',
            finish_date: '2025-02-15',
            percent_complete: 0
          }),
        ],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Upcoming Milestones')).toBeInTheDocument()
    })
  })

  describe('Schedule Items', () => {
    it('should display task name', () => {
      mockUseClientSchedule.mockReturnValue({
        data: [createMockScheduleItem({ id: 'item-task-name', task_name: 'Concrete Pour' })],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Concrete Pour')).toBeInTheDocument()
    })

    it('should display duration', () => {
      mockUseClientSchedule.mockReturnValue({
        data: [createMockScheduleItem({ id: 'item-duration', duration_days: 14 })],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('14 days')).toBeInTheDocument()
    })

    it('should display progress percentage', () => {
      mockUseClientSchedule.mockReturnValue({
        data: [createMockScheduleItem({ id: 'item-progress', percent_complete: 75 })],
        isLoading: false,
      })

      renderPage()

      // 75% appears in both overall progress (averaged) and individual task
      const progressElements = screen.getAllByText('75%')
      expect(progressElements.length).toBeGreaterThan(0)
    })
  })

  describe('Task Status', () => {
    it('should show Complete status for 100% done', () => {
      mockUseClientSchedule.mockReturnValue({
        data: [createMockScheduleItem({ id: 'item-complete', percent_complete: 100 })],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Complete')).toBeInTheDocument()
    })

    it('should show In Progress status for ongoing tasks', () => {
      mockUseClientSchedule.mockReturnValue({
        data: [createMockScheduleItem({
          id: 'item-in-progress',
          percent_complete: 50,
          start_date: '2025-01-01',
          finish_date: '2025-03-01'
        })],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('In Progress')).toBeInTheDocument()
    })

    it('should show Overdue status for past due incomplete tasks', () => {
      mockUseClientSchedule.mockReturnValue({
        data: [createMockScheduleItem({
          id: 'item-overdue',
          percent_complete: 50,
          start_date: '2025-01-01',
          finish_date: '2025-01-15' // Past due based on our fake date of 2025-02-01
        })],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Overdue')).toBeInTheDocument()
    })

    it('should show Not Started status for future tasks', () => {
      mockUseClientSchedule.mockReturnValue({
        data: [createMockScheduleItem({
          id: 'item-not-started',
          percent_complete: 0,
          start_date: '2025-03-01',
          finish_date: '2025-04-01'
        })],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Not Started')).toBeInTheDocument()
    })
  })

  describe('Critical Path Indicator', () => {
    it('should show critical path indicator for critical tasks', () => {
      mockUseClientSchedule.mockReturnValue({
        data: [createMockScheduleItem({ id: 'item-critical', is_critical: true })],
        isLoading: false,
      })

      renderPage()

      // Check for the title attribute on the wrapper span
      const criticalIndicator = screen.getByTitle('Critical Path')
      expect(criticalIndicator).toBeInTheDocument()
    })
  })

  describe('Multiple Items', () => {
    it('should display all schedule items', () => {
      mockUseClientSchedule.mockReturnValue({
        data: [
          createMockScheduleItem({ id: 'item-1', task_name: 'Task Alpha' }),
          createMockScheduleItem({ id: 'item-2', task_name: 'Task Beta' }),
          createMockScheduleItem({ id: 'item-3', task_name: 'Task Gamma' }),
        ],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Task Alpha')).toBeInTheDocument()
      expect(screen.getByText('Task Beta')).toBeInTheDocument()
      expect(screen.getByText('Task Gamma')).toBeInTheDocument()
    })

    it('should show correct task count', () => {
      mockUseClientSchedule.mockReturnValue({
        data: [
          createMockScheduleItem({ id: 'item-1' }),
          createMockScheduleItem({ id: 'item-2' }),
          createMockScheduleItem({ id: 'item-3' }),
        ],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText(/Schedule Items \(3\)/)).toBeInTheDocument()
    })
  })
})
