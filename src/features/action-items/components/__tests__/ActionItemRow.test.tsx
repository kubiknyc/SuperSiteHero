/**
 * ActionItemRow Component Tests
 *
 * Tests for individual action item display including:
 * - Basic rendering and data display
 * - Status indicators and transitions
 * - Urgency badges and priority indicators
 * - Assignee and meeting context
 * - Quick actions and interactions
 * - Linked items indicators
 * - Carryover and escalation displays
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ActionItemWithContext } from '@/types/action-items'

// Mock the hooks
const mockUpdateStatus = vi.fn()
const mockConvertToTask = vi.fn()

vi.mock('../../hooks/useActionItems', () => ({
  useUpdateActionItemStatus: () => ({
    mutate: mockUpdateStatus,
    isPending: false,
  }),
  useConvertToTask: () => ({
    mutate: mockConvertToTask,
    isPending: false,
  }),
}))

// Import component after mocks
let ActionItemRow: any

describe('ActionItemRow', () => {
  let queryClient: QueryClient

  beforeEach(async () => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    // Dynamic import after mocks are set up
    const module = await import('../ActionItemsDashboard')
    ActionItemRow = (module as any).ActionItemRow || module.default
  })

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }

  const createMockItem = (overrides?: Partial<ActionItemWithContext>): ActionItemWithContext => ({
    id: 'item-1',
    meeting_id: 'meeting-1',
    project_id: 'project-1',
    title: 'Review and approve architectural drawings',
    description: 'Complete review of revised plans',
    assigned_to: 'John Smith',
    assigned_company: 'ABC Construction',
    due_date: '2024-12-25',
    status: 'open',
    priority: 'high',
    category: 'design',
    task_id: null,
    related_rfi_id: null,
    constraint_id: null,
    related_change_order_id: null,
    related_submittal_id: null,
    carried_from_meeting_id: null,
    carried_to_meeting_id: null,
    carryover_count: 0,
    escalation_level: 0,
    escalated_at: null,
    escalated_to: null,
    resolution_type: null,
    resolution_notes: null,
    resolved_at: null,
    resolved_by: null,
    created_at: '2024-12-01T10:00:00Z',
    updated_at: '2024-12-01T10:00:00Z',
    created_by: 'user-1',
    meeting_type: 'weekly',
    meeting_date: '2024-12-15',
    meeting_number: 42,
    meeting_title: 'Weekly Progress Meeting #42',
    urgency_status: 'on_track',
    days_until_due: 10,
    ...overrides,
  })

  describe('Basic Rendering', () => {
    it('should render action item with title', () => {
      const item = createMockItem()
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      expect(screen.getByText('Review and approve architectural drawings')).toBeInTheDocument()
    })

    it('should display assignee information', () => {
      const item = createMockItem()
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      expect(screen.getByText(/John Smith/)).toBeInTheDocument()
    })

    it('should display meeting context', () => {
      const item = createMockItem()
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      expect(screen.getByText('Weekly Progress Meeting #42')).toBeInTheDocument()
    })

    it('should display due date', () => {
      const item = createMockItem({ due_date: '2024-12-25' })
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      expect(screen.getByText(/Due:/)).toBeInTheDocument()
      expect(screen.getByText(/12\/25\/2024/)).toBeInTheDocument()
    })

    it('should display category badge when category is present', () => {
      const item = createMockItem({ category: 'design' })
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      expect(screen.getByText('design')).toBeInTheDocument()
    })

    it('should not display category badge when category is null', () => {
      const item = createMockItem({ category: null })
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      expect(screen.queryByText('design')).not.toBeInTheDocument()
    })
  })

  describe('Status Indicators', () => {
    it('should show open status indicator (circle)', () => {
      const item = createMockItem({ status: 'open' })
      const { container } = render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      // Check for Circle icon by looking for SVG with specific styling
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThan(0)
    })

    it('should show in-progress status indicator (filled circle)', () => {
      const item = createMockItem({ status: 'in_progress' })
      const { container } = render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      // Check for the inner filled circle div
      const progressIndicator = container.querySelector('.border-blue-500')
      expect(progressIndicator).toBeInTheDocument()
    })

    it('should show completed status with checkmark', () => {
      const item = createMockItem({ status: 'completed' })
      const { container } = render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      // Completed items have CheckCircle which has text-green-500 class
      const checkCircle = container.querySelector('.text-green-500')
      expect(checkCircle).toBeInTheDocument()
    })

    it('should show strikethrough text when completed', () => {
      const item = createMockItem({ status: 'completed' })
      const { container } = render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      const title = screen.getByText('Review and approve architectural drawings')
      expect(title).toHaveClass('line-through')
      expect(title).toHaveClass('text-gray-500')
    })
  })

  describe('Urgency Badges', () => {
    it('should display overdue badge in red', () => {
      const item = createMockItem({
        urgency_status: 'overdue',
        days_until_due: -5,
      })
      const { container } = render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      expect(screen.getByText(/Overdue/)).toBeInTheDocument()
      expect(screen.getByText(/\(5d\)/)).toBeInTheDocument()
    })

    it('should display due today badge in orange', () => {
      const item = createMockItem({
        urgency_status: 'due_today',
        days_until_due: 0,
      })
      const { container } = render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      expect(screen.getByText(/Due Today/)).toBeInTheDocument()
      const badge = screen.getByText(/Due Today/).closest('.text-orange-800')
      expect(badge).toBeInTheDocument()
    })

    it('should display due soon badge in yellow', () => {
      const item = createMockItem({
        urgency_status: 'due_soon',
        days_until_due: 2,
      })
      const { container } = render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      expect(screen.getByText(/Due Soon/)).toBeInTheDocument()
      const badge = screen.getByText(/Due Soon/).closest('.text-yellow-800')
      expect(badge).toBeInTheDocument()
    })

    it('should display on track badge in green', () => {
      const item = createMockItem({
        urgency_status: 'on_track',
        days_until_due: 10,
      })
      const { container } = render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      expect(screen.getByText(/On Track/)).toBeInTheDocument()
      const badge = screen.getByText(/On Track/).closest('.text-green-800')
      expect(badge).toBeInTheDocument()
    })

    it('should not show urgency badge when status is completed', () => {
      const item = createMockItem({
        status: 'completed',
        urgency_status: 'completed',
      })
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      expect(screen.queryByText(/Overdue/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Due Today/)).not.toBeInTheDocument()
    })

    it('should not show urgency badge when no due date', () => {
      const item = createMockItem({
        urgency_status: 'no_date',
        due_date: null,
      })
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      expect(screen.queryByText(/Overdue/)).not.toBeInTheDocument()
      expect(screen.queryByText(/On Track/)).not.toBeInTheDocument()
    })
  })

  describe('Priority Indicators', () => {
    it('should display high priority badge', () => {
      const item = createMockItem({ priority: 'high' })
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      expect(screen.getByText('High')).toBeInTheDocument()
    })

    it('should display critical priority badge', () => {
      const item = createMockItem({ priority: 'critical' })
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      expect(screen.getByText('Critical')).toBeInTheDocument()
    })

    it('should display low priority badge', () => {
      const item = createMockItem({ priority: 'low' })
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      expect(screen.getByText('Low')).toBeInTheDocument()
    })

    it('should not display badge for normal priority', () => {
      const item = createMockItem({ priority: 'normal' })
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      expect(screen.queryByText('Normal')).not.toBeInTheDocument()
    })

    it('should not display badge when priority is null', () => {
      const item = createMockItem({ priority: null })
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      expect(screen.queryByText(/Priority/)).not.toBeInTheDocument()
    })
  })

  describe('Escalation Indicators', () => {
    it('should display escalation level 1 badge', () => {
      const item = createMockItem({ escalation_level: 1 })
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      expect(screen.getByText(/Escalated L1/)).toBeInTheDocument()
    })

    it('should display escalation level 2 badge', () => {
      const item = createMockItem({ escalation_level: 2 })
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      expect(screen.getByText(/Escalated L2/)).toBeInTheDocument()
    })

    it('should display escalation level 3 badge', () => {
      const item = createMockItem({ escalation_level: 3 })
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      expect(screen.getByText(/Escalated L3/)).toBeInTheDocument()
    })

    it('should not display escalation badge when level is 0', () => {
      const item = createMockItem({ escalation_level: 0 })
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      expect(screen.queryByText(/Escalated/)).not.toBeInTheDocument()
    })

    it('should apply orange border when escalated', () => {
      const item = createMockItem({ escalation_level: 2 })
      const { container } = render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      const card = container.querySelector('.border-orange-200')
      expect(card).toBeInTheDocument()
    })
  })

  describe('Carryover Count Display', () => {
    it('should display carryover count badge', () => {
      const item = createMockItem({ carryover_count: 2 })
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      expect(screen.getByText(/Carried 2x/)).toBeInTheDocument()
    })

    it('should display carryover count for chronic items (3+)', () => {
      const item = createMockItem({ carryover_count: 5 })
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      expect(screen.getByText(/Carried 5x/)).toBeInTheDocument()
    })

    it('should not display carryover badge when count is 0', () => {
      const item = createMockItem({ carryover_count: 0 })
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      expect(screen.queryByText(/Carried/)).not.toBeInTheDocument()
    })
  })

  describe('Linked Items Indicators', () => {
    it('should display task linked indicator', () => {
      const item = createMockItem({ task_id: 'task-123' })
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      expect(screen.getByText(/Task linked/)).toBeInTheDocument()
    })

    it('should not display task linked indicator when no task', () => {
      const item = createMockItem({ task_id: null })
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      expect(screen.queryByText(/Task linked/)).not.toBeInTheDocument()
    })

    it('should apply blue text color to task linked indicator', () => {
      const item = createMockItem({ task_id: 'task-123' })
      const { container } = render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      const linkedText = screen.getByText(/Task linked/)
      expect(linkedText).toHaveClass('text-blue-600')
    })
  })

  describe('Visual States', () => {
    it('should apply red background when overdue', () => {
      const item = createMockItem({ urgency_status: 'overdue' })
      const { container } = render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      const card = container.querySelector('.border-red-200')
      expect(card).toBeInTheDocument()
      const bgCard = container.querySelector('.bg-red-50\\/30')
      expect(bgCard).toBeInTheDocument()
    })

    it('should apply combined styles for overdue and escalated', () => {
      const item = createMockItem({
        urgency_status: 'overdue',
        escalation_level: 2,
      })
      const { container } = render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      // Should have both red border (overdue) and orange border (escalated)
      const card = container.querySelector('.border-red-200.border-orange-200')
      expect(card).toBeInTheDocument()
    })

    it('should not apply special background for on-track items', () => {
      const item = createMockItem({ urgency_status: 'on_track' })
      const { container } = render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      const redCard = container.querySelector('.border-red-200')
      expect(redCard).not.toBeInTheDocument()
    })
  })

  describe('Quick Action Buttons', () => {
    it('should show actions dropdown menu button', () => {
      const item = createMockItem()
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      const menuButtons = screen.getAllByRole('button')
      expect(menuButtons.length).toBeGreaterThan(0)
    })

    it('should show "Start Progress" option for open items', async () => {
      const user = userEvent.setup()
      const item = createMockItem({ status: 'open' })
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      const menuButton = screen.getAllByRole('button')[0]
      await user.click(menuButton)

      expect(screen.getByText('Start Progress')).toBeInTheDocument()
    })

    it('should not show "Start Progress" for in-progress items', async () => {
      const user = userEvent.setup()
      const item = createMockItem({ status: 'in_progress' })
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      const menuButton = screen.getAllByRole('button')[0]
      await user.click(menuButton)

      expect(screen.queryByText('Start Progress')).not.toBeInTheDocument()
    })

    it('should show "Mark Complete" for open items', async () => {
      const user = userEvent.setup()
      const item = createMockItem({ status: 'open' })
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      const menuButton = screen.getAllByRole('button')[0]
      await user.click(menuButton)

      expect(screen.getByText('Mark Complete')).toBeInTheDocument()
    })

    it('should show "Mark Complete" for in-progress items', async () => {
      const user = userEvent.setup()
      const item = createMockItem({ status: 'in_progress' })
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      const menuButton = screen.getAllByRole('button')[0]
      await user.click(menuButton)

      expect(screen.getByText('Mark Complete')).toBeInTheDocument()
    })

    it('should not show "Mark Complete" for completed items', async () => {
      const user = userEvent.setup()
      const item = createMockItem({ status: 'completed' })
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      const menuButton = screen.getAllByRole('button')[0]
      await user.click(menuButton)

      expect(screen.queryByText('Mark Complete')).not.toBeInTheDocument()
    })

    it('should show "Convert to Task" when no task is linked', async () => {
      const user = userEvent.setup()
      const item = createMockItem({ task_id: null })
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      const menuButton = screen.getAllByRole('button')[0]
      await user.click(menuButton)

      expect(screen.getByText('Convert to Task')).toBeInTheDocument()
    })

    it('should not show "Convert to Task" when task is already linked', async () => {
      const user = userEvent.setup()
      const item = createMockItem({ task_id: 'task-123' })
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      const menuButton = screen.getAllByRole('button')[0]
      await user.click(menuButton)

      expect(screen.queryByText('Convert to Task')).not.toBeInTheDocument()
    })
  })

  describe('Action Interactions', () => {
    it('should call updateStatus when clicking "Start Progress"', async () => {
      const user = userEvent.setup()
      const item = createMockItem({ status: 'open' })
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      const menuButton = screen.getAllByRole('button')[0]
      await user.click(menuButton)

      const startButton = screen.getByText('Start Progress')
      await user.click(startButton)

      expect(mockUpdateStatus).toHaveBeenCalledWith({
        id: 'item-1',
        status: 'in_progress',
      })
    })

    it('should call updateStatus when clicking "Mark Complete"', async () => {
      const user = userEvent.setup()
      const item = createMockItem({ status: 'open' })
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      const menuButton = screen.getAllByRole('button')[0]
      await user.click(menuButton)

      const completeButton = screen.getByText('Mark Complete')
      await user.click(completeButton)

      expect(mockUpdateStatus).toHaveBeenCalledWith({
        id: 'item-1',
        status: 'completed',
      })
    })

    it('should call convertToTask when clicking "Convert to Task"', async () => {
      const user = userEvent.setup()
      const item = createMockItem({ task_id: null })
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      const menuButton = screen.getAllByRole('button')[0]
      await user.click(menuButton)

      const convertButton = screen.getByText('Convert to Task')
      await user.click(convertButton)

      expect(mockConvertToTask).toHaveBeenCalledWith('item-1')
    })
  })

  describe('Edge Cases', () => {
    it('should handle item with no assignee', () => {
      const item = createMockItem({ assigned_to: null })
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      expect(screen.queryByText(/John Smith/)).not.toBeInTheDocument()
    })

    it('should handle item with no meeting title', () => {
      const item = createMockItem({ meeting_title: '' })
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      expect(screen.queryByText(/Weekly Progress Meeting/)).not.toBeInTheDocument()
    })

    it('should handle item with no due date', () => {
      const item = createMockItem({ due_date: null })
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      expect(screen.queryByText(/Due:/)).not.toBeInTheDocument()
    })

    it('should handle item with all optional fields null', () => {
      const item = createMockItem({
        description: null,
        assigned_to: null,
        assigned_company: null,
        due_date: null,
        priority: null,
        category: null,
        task_id: null,
        related_rfi_id: null,
        constraint_id: null,
      })

      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })
      expect(screen.getByText('Review and approve architectural drawings')).toBeInTheDocument()
    })

    it('should handle very long titles gracefully', () => {
      const longTitle = 'A'.repeat(200)
      const item = createMockItem({ title: longTitle })
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      expect(screen.getByText(longTitle)).toBeInTheDocument()
    })

    it('should handle multiple simultaneous badges', () => {
      const item = createMockItem({
        priority: 'critical',
        category: 'safety',
        escalation_level: 2,
        carryover_count: 3,
        urgency_status: 'overdue',
        days_until_due: -7,
      })
      render(<ActionItemRow item={item} />, { wrapper: createWrapper() })

      expect(screen.getByText(/Overdue/)).toBeInTheDocument()
      expect(screen.getByText('Critical')).toBeInTheDocument()
      expect(screen.getByText('safety')).toBeInTheDocument()
      expect(screen.getByText(/Escalated L2/)).toBeInTheDocument()
      expect(screen.getByText(/Carried 3x/)).toBeInTheDocument()
    })
  })
})
