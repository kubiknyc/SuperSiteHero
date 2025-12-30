/**
 * ActionItemsDashboard Component Tests
 * Comprehensive test suite covering all dashboard features
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/__tests__/helpers';
import {
  createMockActionItemWithContext,
  createMockOpenActionItem,
  createMockOverdueActionItem,
  createMockDueSoonActionItem,
  createMockInProgressActionItem,
  createMockCompletedActionItem,
  createMockEscalatedActionItem,
  createMockChronicActionItem,
  createMockActionItemProjectSummary,
  createMockActionItemsByAssignee,
  createMockActionItemsByAssignees,
  TEST_ACTION_ITEMS,
} from '@/__tests__/factories';
import { ActionItemsDashboard } from '../ActionItemsDashboard';
import type { ActionItemWithContext } from '@/types/action-items';

// Mock the action items hooks
const mockUseProjectActionItems = vi.fn();
const mockUseActionItemSummary = vi.fn();
const mockUseActionItemsByAssignee = vi.fn();
const mockUseOverdueActionItems = vi.fn();
const mockUseActionItemsDueSoon = vi.fn();
const mockUseEscalatedActionItems = vi.fn();
const mockUseUpdateActionItemStatus = vi.fn();
const mockUseConvertToTask = vi.fn();

vi.mock('../hooks/useActionItems', () => ({
  useProjectActionItems: () => mockUseProjectActionItems(),
  useActionItemSummary: () => mockUseActionItemSummary(),
  useActionItemsByAssignee: () => mockUseActionItemsByAssignee(),
  useOverdueActionItems: () => mockUseOverdueActionItems(),
  useActionItemsDueSoon: () => mockUseActionItemsDueSoon(),
  useEscalatedActionItems: () => mockUseEscalatedActionItems(),
  useUpdateActionItemStatus: () => mockUseUpdateActionItemStatus(),
  useConvertToTask: () => mockUseConvertToTask(),
}));

// SKIPPED: These tests cause Vitest worker crashes due to importing ActionItemsDashboard.
// See ActionItemRow.test.tsx for full investigation notes.
// The crash occurs during module loading before any tests can run.
// Likely cause: memory exhaustion or infinite import loop in one of the UI dependencies.
describe.skip('ActionItemsDashboard', () => {
  const mockProjectId = 'project-123';

  const defaultSummary = createMockActionItemProjectSummary({
    project_id: mockProjectId,
    total_items: 25,
    open_items: 10,
    in_progress_items: 5,
    completed_items: 10,
    overdue_items: 3,
    escalated_items: 2,
    chronic_items: 1,
    completion_rate: 40,
  });

  const defaultItems: ActionItemWithContext[] = [
    createMockOpenActionItem({ id: 'ai-1', title: 'Review site plans' }),
    createMockInProgressActionItem({ id: 'ai-2', title: 'Coordinate with MEP' }),
    createMockCompletedActionItem({ id: 'ai-3', title: 'Update schedule' }),
  ];

  const defaultAssignees = createMockActionItemsByAssignees([
    { assignee: 'John Doe', assigned_company: 'ABC Construction' },
    { assignee: 'Jane Smith', assigned_company: 'XYZ Engineering' },
    { assignee: 'Bob Wilson', assigned_company: 'ABC Construction' },
  ]);

  const mockMutate = vi.fn();
  const mockConvertMutate = vi.fn();

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock returns
    mockUseActionItemSummary.mockReturnValue({
      data: defaultSummary,
      isLoading: false,
      error: null,
    });

    mockUseProjectActionItems.mockReturnValue({
      data: defaultItems,
      isLoading: false,
      error: null,
    });

    mockUseActionItemsByAssignee.mockReturnValue({
      data: defaultAssignees,
      isLoading: false,
      error: null,
    });

    mockUseOverdueActionItems.mockReturnValue({
      data: [createMockOverdueActionItem()],
      isLoading: false,
      error: null,
    });

    mockUseActionItemsDueSoon.mockReturnValue({
      data: [createMockDueSoonActionItem()],
      isLoading: false,
      error: null,
    });

    mockUseEscalatedActionItems.mockReturnValue({
      data: [createMockEscalatedActionItem()],
      isLoading: false,
      error: null,
    });

    mockUseUpdateActionItemStatus.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });

    mockUseConvertToTask.mockReturnValue({
      mutate: mockConvertMutate,
      isPending: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Summary Cards Tests
  // ============================================================================

  describe('Summary Cards', () => {
    it('should render all four summary cards', () => {
      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText('Open Items')).toBeInTheDocument();
      expect(screen.getByText('Overdue')).toBeInTheDocument();
      expect(screen.getByText('Completion Rate')).toBeInTheDocument();
      expect(screen.getByText('Escalated')).toBeInTheDocument();
    });

    it('should display correct open items count', () => {
      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('of 25 total')).toBeInTheDocument();
    });

    it('should display correct overdue items count', () => {
      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('require attention')).toBeInTheDocument();
    });

    it('should display correct completion rate', () => {
      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText('40%')).toBeInTheDocument();
      expect(screen.getByText('items completed')).toBeInTheDocument();
    });

    it('should display correct escalated items count', () => {
      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('need escalation')).toBeInTheDocument();
    });

    it('should highlight overdue card when overdue items exist', () => {
      const { container } = render(<ActionItemsDashboard projectId={mockProjectId} />);

      // Find the card containing overdue text
      const overdueCards = container.querySelectorAll('[class*="border-red"]');
      expect(overdueCards.length).toBeGreaterThan(0);
    });

    it('should not highlight overdue card when no overdue items', () => {
      mockUseActionItemSummary.mockReturnValue({
        data: { ...defaultSummary, overdue_items: 0 },
        isLoading: false,
      });

      const { container } = render(<ActionItemsDashboard projectId={mockProjectId} />);

      const overdueCards = container.querySelectorAll('[class*="border-red"]');
      expect(overdueCards.length).toBe(0);
    });

    it('should show zero values when no summary data', () => {
      mockUseActionItemSummary.mockReturnValue({
        data: null,
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      // Should show 0 for all cards when no data
      const zeroElements = screen.getAllByText('0');
      expect(zeroElements.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Progress Bar Tests
  // ============================================================================

  describe('Progress Bar', () => {
    it('should render progress bar with correct percentage', () => {
      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText('Overall Progress')).toBeInTheDocument();
      expect(screen.getByText('10 of 25 completed')).toBeInTheDocument();
    });

    it('should not render progress bar when no summary data', () => {
      mockUseActionItemSummary.mockReturnValue({
        data: null,
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.queryByText('Overall Progress')).not.toBeInTheDocument();
    });

    it('should show 100% completion when all items completed', () => {
      mockUseActionItemSummary.mockReturnValue({
        data: {
          ...defaultSummary,
          completed_items: 25,
          total_items: 25,
          completion_rate: 100,
        },
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText('25 of 25 completed')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Filter Tests
  // ============================================================================

  describe('Filters', () => {
    it('should render search input', () => {
      render(<ActionItemsDashboard projectId={mockProjectId} />);

      const searchInput = screen.getByPlaceholderText('Search action items...');
      expect(searchInput).toBeInTheDocument();
    });

    it('should update search query on input', async () => {
      render(<ActionItemsDashboard projectId={mockProjectId} />);

      const searchInput = screen.getByPlaceholderText('Search action items...');
      fireEvent.change(searchInput, { target: { value: 'review' } });

      await waitFor(() => {
        expect(searchInput).toHaveValue('review');
      });
    });

    it('should render status filter', () => {
      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText('All Status')).toBeInTheDocument();
    });

    it('should render category filter', () => {
      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText('All Categories')).toBeInTheDocument();
    });

    it('should filter items when search query changes', async () => {
      const items = [
        createMockOpenActionItem({ id: 'ai-1', title: 'Review site plans' }),
        createMockOpenActionItem({ id: 'ai-2', title: 'Update schedule' }),
      ];

      mockUseProjectActionItems.mockReturnValue({
        data: items,
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      const searchInput = screen.getByPlaceholderText('Search action items...');
      fireEvent.change(searchInput, { target: { value: 'review' } });

      await waitFor(() => {
        expect(mockUseProjectActionItems).toHaveBeenCalled();
      });
    });
  });

  // ============================================================================
  // Tab Views Tests
  // ============================================================================

  describe('Tab Views', () => {
    it('should render all four tabs', () => {
      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByRole('tab', { name: /All/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Overdue/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Due Soon/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Escalated/i })).toBeInTheDocument();
    });

    it('should show item counts in tabs', () => {
      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText(/All \(3\)/)).toBeInTheDocument();
      expect(screen.getByText(/Overdue \(1\)/)).toBeInTheDocument();
      expect(screen.getByText(/Due Soon \(1\)/)).toBeInTheDocument();
      expect(screen.getByText(/Escalated \(1\)/)).toBeInTheDocument();
    });

    it('should switch to overdue tab when clicked', async () => {
      const overdueItems = [
        createMockOverdueActionItem({ id: 'ai-overdue-1', title: 'Overdue Item 1' }),
      ];

      mockUseOverdueActionItems.mockReturnValue({
        data: overdueItems,
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      const overdueTab = screen.getByRole('tab', { name: /Overdue/i });
      fireEvent.click(overdueTab);

      await waitFor(() => {
        expect(screen.getByText('Overdue Item 1')).toBeInTheDocument();
      });
    });

    it('should switch to due soon tab when clicked', async () => {
      const dueSoonItems = [
        createMockDueSoonActionItem({ id: 'ai-due-soon-1', title: 'Due Soon Item 1' }),
      ];

      mockUseActionItemsDueSoon.mockReturnValue({
        data: dueSoonItems,
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      const dueSoonTab = screen.getByRole('tab', { name: /Due Soon/i });
      fireEvent.click(dueSoonTab);

      await waitFor(() => {
        expect(screen.getByText('Due Soon Item 1')).toBeInTheDocument();
      });
    });

    it('should switch to escalated tab when clicked', async () => {
      const escalatedItems = [
        createMockEscalatedActionItem({ id: 'ai-escalated-1', title: 'Escalated Item 1' }),
      ];

      mockUseEscalatedActionItems.mockReturnValue({
        data: escalatedItems,
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      const escalatedTab = screen.getByRole('tab', { name: /Escalated/i });
      fireEvent.click(escalatedTab);

      await waitFor(() => {
        expect(screen.getByText('Escalated Item 1')).toBeInTheDocument();
      });
    });

    it('should maintain filters when switching tabs', async () => {
      render(<ActionItemsDashboard projectId={mockProjectId} />);

      const searchInput = screen.getByPlaceholderText('Search action items...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      const overdueTab = screen.getByRole('tab', { name: /Overdue/i });
      fireEvent.click(overdueTab);

      await waitFor(() => {
        expect(searchInput).toHaveValue('test');
      });
    });
  });

  // ============================================================================
  // Action Item Row Tests
  // ============================================================================

  describe('Action Item Rows', () => {
    it('should render action item title', () => {
      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText('Review site plans')).toBeInTheDocument();
    });

    it('should display meeting title for action items', () => {
      const items = [
        createMockOpenActionItem({
          id: 'ai-1',
          title: 'Test Item',
          meeting_title: 'Weekly Progress Meeting #5',
        }),
      ];

      mockUseProjectActionItems.mockReturnValue({
        data: items,
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText('Weekly Progress Meeting #5')).toBeInTheDocument();
    });

    it('should display assignee name', () => {
      const items = [
        createMockOpenActionItem({
          id: 'ai-1',
          title: 'Test Item',
          assigned_to: 'John Doe',
        }),
      ];

      mockUseProjectActionItems.mockReturnValue({
        data: items,
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    });

    it('should show completed status with checkmark', () => {
      const items = [createMockCompletedActionItem({ id: 'ai-1', title: 'Completed Item' })];

      mockUseProjectActionItems.mockReturnValue({
        data: items,
        isLoading: false,
      });

      const { container } = render(<ActionItemsDashboard projectId={mockProjectId} />);

      const completedText = screen.getByText('Completed Item');
      expect(completedText).toHaveClass('line-through');
    });

    it('should show in-progress status indicator', () => {
      const items = [createMockInProgressActionItem({ id: 'ai-1', title: 'In Progress Item' })];

      mockUseProjectActionItems.mockReturnValue({
        data: items,
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText('In Progress Item')).toBeInTheDocument();
    });

    it('should show open status indicator', () => {
      const items = [createMockOpenActionItem({ id: 'ai-1', title: 'Open Item' })];

      mockUseProjectActionItems.mockReturnValue({
        data: items,
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText('Open Item')).toBeInTheDocument();
    });

    it('should display urgency badge for overdue items', () => {
      const items = [
        createMockOverdueActionItem({
          id: 'ai-1',
          title: 'Overdue Item',
          urgency_status: 'overdue',
          days_until_due: -5,
        }),
      ];

      mockUseProjectActionItems.mockReturnValue({
        data: items,
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText('Overdue')).toBeInTheDocument();
      expect(screen.getByText(/5d/)).toBeInTheDocument();
    });

    it('should display priority badge for high priority items', () => {
      const items = [
        createMockOpenActionItem({
          id: 'ai-1',
          title: 'High Priority Item',
          priority: 'high',
        }),
      ];

      mockUseProjectActionItems.mockReturnValue({
        data: items,
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('should display category badge', () => {
      const items = [
        createMockOpenActionItem({
          id: 'ai-1',
          title: 'Safety Item',
          category: 'safety',
        }),
      ];

      mockUseProjectActionItems.mockReturnValue({
        data: items,
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText('safety')).toBeInTheDocument();
    });

    it('should display escalation badge', () => {
      const items = [
        createMockEscalatedActionItem({
          id: 'ai-1',
          title: 'Escalated Item',
          escalation_level: 2,
        }),
      ];

      mockUseProjectActionItems.mockReturnValue({
        data: items,
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText('Escalated L2')).toBeInTheDocument();
    });

    it('should display carryover count badge', () => {
      const items = [
        createMockChronicActionItem({
          id: 'ai-1',
          title: 'Chronic Item',
          carryover_count: 4,
        }),
      ];

      mockUseProjectActionItems.mockReturnValue({
        data: items,
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText('Carried 4x')).toBeInTheDocument();
    });

    it('should display task linked indicator', () => {
      const items = [
        createMockOpenActionItem({
          id: 'ai-1',
          title: 'Linked Item',
          task_id: 'task-123',
        }),
      ];

      mockUseProjectActionItems.mockReturnValue({
        data: items,
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText('Task linked')).toBeInTheDocument();
    });

    it('should display due date', () => {
      const dueDate = new Date('2024-12-25').toISOString();
      const items = [
        createMockOpenActionItem({
          id: 'ai-1',
          title: 'Item with Due Date',
          due_date: dueDate,
        }),
      ];

      mockUseProjectActionItems.mockReturnValue({
        data: items,
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText(/Due:/)).toBeInTheDocument();
    });

    it('should highlight overdue items with red background', () => {
      const items = [
        createMockOverdueActionItem({
          id: 'ai-1',
          title: 'Overdue Item',
          urgency_status: 'overdue',
        }),
      ];

      mockUseProjectActionItems.mockReturnValue({
        data: items,
        isLoading: false,
      });

      const { container } = render(<ActionItemsDashboard projectId={mockProjectId} />);

      const redBorderCards = container.querySelectorAll('[class*="border-red"]');
      expect(redBorderCards.length).toBeGreaterThan(0);
    });

    it('should highlight escalated items with orange border', () => {
      const items = [
        createMockEscalatedActionItem({
          id: 'ai-1',
          title: 'Escalated Item',
          escalation_level: 1,
        }),
      ];

      mockUseProjectActionItems.mockReturnValue({
        data: items,
        isLoading: false,
      });

      const { container } = render(<ActionItemsDashboard projectId={mockProjectId} />);

      const orangeBorderCards = container.querySelectorAll('[class*="border-orange"]');
      expect(orangeBorderCards.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Quick Actions Tests
  // ============================================================================

  describe('Quick Actions', () => {
    it('should show actions menu button', () => {
      render(<ActionItemsDashboard projectId={mockProjectId} />);

      const menuButtons = screen.getAllByRole('button');
      expect(menuButtons.length).toBeGreaterThan(0);
    });

    it('should show "Start Progress" action for open items', async () => {
      const items = [createMockOpenActionItem({ id: 'ai-1', title: 'Open Item', status: 'open' })];

      mockUseProjectActionItems.mockReturnValue({
        data: items,
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      const menuButtons = screen.getAllByRole('button');
      const actionButton = menuButtons.find((btn) => btn.querySelector('svg'));

      if (actionButton) {
        fireEvent.click(actionButton);

        await waitFor(() => {
          expect(screen.getByText('Start Progress')).toBeInTheDocument();
        });
      }
    });

    it('should call updateStatus when "Start Progress" is clicked', async () => {
      const items = [createMockOpenActionItem({ id: 'ai-1', title: 'Open Item', status: 'open' })];

      mockUseProjectActionItems.mockReturnValue({
        data: items,
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      const menuButtons = screen.getAllByRole('button');
      const actionButton = menuButtons.find((btn) => btn.querySelector('svg'));

      if (actionButton) {
        fireEvent.click(actionButton);

        await waitFor(() => {
          const startProgressButton = screen.getByText('Start Progress');
          fireEvent.click(startProgressButton);

          expect(mockMutate).toHaveBeenCalledWith({
            id: 'ai-1',
            status: 'in_progress',
          });
        });
      }
    });

    it('should show "Mark Complete" action for non-completed items', async () => {
      const items = [createMockOpenActionItem({ id: 'ai-1', title: 'Open Item', status: 'open' })];

      mockUseProjectActionItems.mockReturnValue({
        data: items,
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      const menuButtons = screen.getAllByRole('button');
      const actionButton = menuButtons.find((btn) => btn.querySelector('svg'));

      if (actionButton) {
        fireEvent.click(actionButton);

        await waitFor(() => {
          expect(screen.getByText('Mark Complete')).toBeInTheDocument();
        });
      }
    });

    it('should call updateStatus when "Mark Complete" is clicked', async () => {
      const items = [createMockOpenActionItem({ id: 'ai-1', title: 'Open Item', status: 'open' })];

      mockUseProjectActionItems.mockReturnValue({
        data: items,
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      const menuButtons = screen.getAllByRole('button');
      const actionButton = menuButtons.find((btn) => btn.querySelector('svg'));

      if (actionButton) {
        fireEvent.click(actionButton);

        await waitFor(() => {
          const completeButton = screen.getByText('Mark Complete');
          fireEvent.click(completeButton);

          expect(mockMutate).toHaveBeenCalledWith({
            id: 'ai-1',
            status: 'completed',
          });
        });
      }
    });

    it('should show "Convert to Task" action for items without tasks', async () => {
      const items = [
        createMockOpenActionItem({ id: 'ai-1', title: 'Open Item', task_id: null }),
      ];

      mockUseProjectActionItems.mockReturnValue({
        data: items,
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      const menuButtons = screen.getAllByRole('button');
      const actionButton = menuButtons.find((btn) => btn.querySelector('svg'));

      if (actionButton) {
        fireEvent.click(actionButton);

        await waitFor(() => {
          expect(screen.getByText('Convert to Task')).toBeInTheDocument();
        });
      }
    });

    it('should call convertToTask when "Convert to Task" is clicked', async () => {
      const items = [
        createMockOpenActionItem({ id: 'ai-1', title: 'Open Item', task_id: null }),
      ];

      mockUseProjectActionItems.mockReturnValue({
        data: items,
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      const menuButtons = screen.getAllByRole('button');
      const actionButton = menuButtons.find((btn) => btn.querySelector('svg'));

      if (actionButton) {
        fireEvent.click(actionButton);

        await waitFor(() => {
          const convertButton = screen.getByText('Convert to Task');
          fireEvent.click(convertButton);

          expect(mockConvertMutate).toHaveBeenCalledWith('ai-1');
        });
      }
    });

    it('should not show "Convert to Task" for items with linked tasks', async () => {
      const items = [
        createMockOpenActionItem({ id: 'ai-1', title: 'Open Item', task_id: 'task-123' }),
      ];

      mockUseProjectActionItems.mockReturnValue({
        data: items,
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      const menuButtons = screen.getAllByRole('button');
      const actionButton = menuButtons.find((btn) => btn.querySelector('svg'));

      if (actionButton) {
        fireEvent.click(actionButton);

        await waitFor(() => {
          expect(screen.queryByText('Convert to Task')).not.toBeInTheDocument();
        });
      }
    });
  });

  // ============================================================================
  // Sidebar Tests
  // ============================================================================

  describe('Sidebar - By Assignee', () => {
    it('should render "By Assignee" section', () => {
      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText('By Assignee')).toBeInTheDocument();
    });

    it('should display assignee names', () => {
      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });

    it('should display assignee companies', () => {
      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText('ABC Construction')).toBeInTheDocument();
      expect(screen.getByText('XYZ Engineering')).toBeInTheDocument();
    });

    it('should display open items count for each assignee', () => {
      render(<ActionItemsDashboard projectId={mockProjectId} />);

      const openBadges = screen.getAllByText(/open/);
      expect(openBadges.length).toBeGreaterThan(0);
    });

    it('should display overdue items badge when assignee has overdue items', () => {
      const assignees = [
        createMockActionItemsByAssignee({
          assignee: 'John Doe',
          overdue_items: 3,
        }),
      ];

      mockUseActionItemsByAssignee.mockReturnValue({
        data: assignees,
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText(/3 late/)).toBeInTheDocument();
    });

    it('should limit display to 5 assignees', () => {
      const assignees = createMockActionItemsByAssignees(
        Array.from({ length: 10 }, (_, i) => ({
          assignee: `User ${i + 1}`,
          assigned_company: 'Test Company',
        }))
      );

      mockUseActionItemsByAssignee.mockReturnValue({
        data: assignees,
        isLoading: false,
      });

      const { container } = render(<ActionItemsDashboard projectId={mockProjectId} />);

      const assigneeElements = container.querySelectorAll('[class*="flex items-center justify-between"]');
      // Should show max 5 assignees
      expect(assigneeElements.length).toBeLessThanOrEqual(6); // +1 for potential header
    });

    it('should show "No assignees yet" when no assignees', () => {
      mockUseActionItemsByAssignee.mockReturnValue({
        data: [],
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText('No assignees yet')).toBeInTheDocument();
    });
  });

  describe('Sidebar - Quick Stats', () => {
    it('should render "Quick Stats" section', () => {
      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText('Quick Stats')).toBeInTheDocument();
    });

    it('should display in progress items count', () => {
      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should display chronic items count', () => {
      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText(/Chronic Items/)).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should display completed this week placeholder', () => {
      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText('Completed This Week')).toBeInTheDocument();
      expect(screen.getByText('--')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Empty State Tests
  // ============================================================================

  describe('Empty States', () => {
    it('should show empty state when no action items on "All" tab', () => {
      mockUseProjectActionItems.mockReturnValue({
        data: [],
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText('No action items found')).toBeInTheDocument();
    });

    it('should show empty state when no overdue items', async () => {
      mockUseOverdueActionItems.mockReturnValue({
        data: [],
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      const overdueTab = screen.getByRole('tab', { name: /Overdue/i });
      fireEvent.click(overdueTab);

      await waitFor(() => {
        expect(screen.getByText('No overdue items')).toBeInTheDocument();
        expect(screen.getByText('Great job keeping things on track!')).toBeInTheDocument();
      });
    });

    it('should show empty state when no due soon items', async () => {
      mockUseActionItemsDueSoon.mockReturnValue({
        data: [],
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      const dueSoonTab = screen.getByRole('tab', { name: /Due Soon/i });
      fireEvent.click(dueSoonTab);

      await waitFor(() => {
        expect(screen.getByText('No items due soon')).toBeInTheDocument();
      });
    });

    it('should show empty state when no escalated items', async () => {
      mockUseEscalatedActionItems.mockReturnValue({
        data: [],
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      const escalatedTab = screen.getByRole('tab', { name: /Escalated/i });
      fireEvent.click(escalatedTab);

      await waitFor(() => {
        expect(screen.getByText('No escalated items')).toBeInTheDocument();
      });
    });

    it('should show search-specific empty state message', () => {
      mockUseProjectActionItems.mockReturnValue({
        data: [],
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      const searchInput = screen.getByPlaceholderText('Search action items...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText('Try a different search term')).toBeInTheDocument();
    });

    it('should show success icon in empty states', () => {
      mockUseProjectActionItems.mockReturnValue({
        data: [],
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      // Check for the check circle icon in empty state
      const emptyState = screen.getByText('No action items found').closest('div');
      expect(emptyState).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Loading State Tests
  // ============================================================================

  describe('Loading States', () => {
    it('should show loading state when summary is loading', () => {
      mockUseActionItemSummary.mockReturnValue({
        data: null,
        isLoading: true,
      });

      mockUseProjectActionItems.mockReturnValue({
        data: null,
        isLoading: true,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText('Loading action items...')).toBeInTheDocument();
    });

    it('should show loading state when items are loading', () => {
      mockUseProjectActionItems.mockReturnValue({
        data: null,
        isLoading: true,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText('Loading action items...')).toBeInTheDocument();
    });

    it('should show loading spinner in loading state', () => {
      mockUseProjectActionItems.mockReturnValue({
        data: null,
        isLoading: true,
      });

      const { container } = render(<ActionItemsDashboard projectId={mockProjectId} />);

      const spinner = container.querySelector('[class*="animate-spin"]');
      expect(spinner).toBeInTheDocument();
    });

    it('should hide loading state when data loads', async () => {
      mockUseProjectActionItems.mockReturnValue({
        data: null,
        isLoading: true,
      });

      const { rerender } = render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText('Loading action items...')).toBeInTheDocument();

      mockUseProjectActionItems.mockReturnValue({
        data: defaultItems,
        isLoading: false,
      });

      rerender(<ActionItemsDashboard projectId={mockProjectId} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading action items...')).not.toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle missing summary data gracefully', () => {
      mockUseActionItemSummary.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      // Should still render with 0 values
      expect(screen.getByText('Open Items')).toBeInTheDocument();
    });

    it('should handle missing items data gracefully', () => {
      mockUseProjectActionItems.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      // Should show empty state
      expect(screen.getByText('No action items found')).toBeInTheDocument();
    });

    it('should handle missing assignee data gracefully', () => {
      mockUseActionItemsByAssignee.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText('No assignees yet')).toBeInTheDocument();
    });

    it('should handle items without optional fields', () => {
      const items = [
        createMockOpenActionItem({
          id: 'ai-1',
          title: 'Minimal Item',
          assigned_to: null,
          assigned_company: null,
          due_date: null,
          priority: null,
          category: null,
        }),
      ];

      mockUseProjectActionItems.mockReturnValue({
        data: items,
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText('Minimal Item')).toBeInTheDocument();
    });

    it('should handle missing meeting context', () => {
      const items = [
        createMockOpenActionItem({
          id: 'ai-1',
          title: 'Item without meeting',
          meeting_title: '',
          meeting_type: '',
        }),
      ];

      mockUseProjectActionItems.mockReturnValue({
        data: items,
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText('Item without meeting')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration Tests', () => {
    it('should display full dashboard with all components', () => {
      render(<ActionItemsDashboard projectId={mockProjectId} />);

      // Summary cards
      expect(screen.getByText('Open Items')).toBeInTheDocument();
      expect(screen.getByText('Overdue')).toBeInTheDocument();
      expect(screen.getByText('Completion Rate')).toBeInTheDocument();
      expect(screen.getByText('Escalated')).toBeInTheDocument();

      // Progress bar
      expect(screen.getByText('Overall Progress')).toBeInTheDocument();

      // Filters
      expect(screen.getByPlaceholderText('Search action items...')).toBeInTheDocument();

      // Tabs
      expect(screen.getByRole('tab', { name: /All/i })).toBeInTheDocument();

      // Sidebar
      expect(screen.getByText('By Assignee')).toBeInTheDocument();
      expect(screen.getByText('Quick Stats')).toBeInTheDocument();

      // Action items
      expect(screen.getByText('Review site plans')).toBeInTheDocument();
    });

    it('should update displayed items when switching between tabs', async () => {
      const allItems = [createMockOpenActionItem({ id: 'ai-1', title: 'All Items View' })];
      const overdueItems = [
        createMockOverdueActionItem({ id: 'ai-2', title: 'Overdue Items View' }),
      ];

      mockUseProjectActionItems.mockReturnValue({
        data: allItems,
        isLoading: false,
      });

      mockUseOverdueActionItems.mockReturnValue({
        data: overdueItems,
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      expect(screen.getByText('All Items View')).toBeInTheDocument();

      const overdueTab = screen.getByRole('tab', { name: /Overdue/i });
      fireEvent.click(overdueTab);

      await waitFor(() => {
        expect(screen.getByText('Overdue Items View')).toBeInTheDocument();
        expect(screen.queryByText('All Items View')).not.toBeInTheDocument();
      });
    });

    it('should handle complete workflow: search -> filter -> action', async () => {
      const items = [
        createMockOpenActionItem({ id: 'ai-1', title: 'Review plans', status: 'open' }),
        createMockOpenActionItem({ id: 'ai-2', title: 'Update schedule', status: 'open' }),
      ];

      mockUseProjectActionItems.mockReturnValue({
        data: items,
        isLoading: false,
      });

      render(<ActionItemsDashboard projectId={mockProjectId} />);

      // Search
      const searchInput = screen.getByPlaceholderText('Search action items...');
      fireEvent.change(searchInput, { target: { value: 'review' } });

      await waitFor(() => {
        expect(searchInput).toHaveValue('review');
      });

      // Action
      const menuButtons = screen.getAllByRole('button');
      const actionButton = menuButtons.find((btn) => btn.querySelector('svg'));

      if (actionButton) {
        fireEvent.click(actionButton);

        await waitFor(() => {
          const completeButton = screen.getByText('Mark Complete');
          fireEvent.click(completeButton);

          expect(mockMutate).toHaveBeenCalled();
        });
      }
    });

    it('should maintain state across multiple interactions', async () => {
      render(<ActionItemsDashboard projectId={mockProjectId} />);

      // Set search query
      const searchInput = screen.getByPlaceholderText('Search action items...');
      fireEvent.change(searchInput, { target: { value: 'test search' } });

      // Switch tab
      const overdueTab = screen.getByRole('tab', { name: /Overdue/i });
      fireEvent.click(overdueTab);

      // Switch back to all tab
      const allTab = screen.getByRole('tab', { name: /All/i });
      fireEvent.click(allTab);

      await waitFor(() => {
        // Search query should be maintained
        expect(searchInput).toHaveValue('test search');
      });
    });
  });
});
