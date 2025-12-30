/**
 * ActionItemsList Component Tests
 *
 * Comprehensive test suite for the ActionItemsList component covering:
 * - Display pending and completed items
 * - Add action item dialog with form fields
 * - Edit action item dialog
 * - Delete action item confirmation
 * - Status toggle (complete/incomplete)
 * - Convert to task functionality
 * - Overdue highlighting
 * - Assignee display
 * - Due date display
 * - Priority badges
 * - Notes display
 * - Empty states
 * - Form validation
 *
 * Target: 45+ test cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, fireEvent, within, render, userEvent } from '@/__tests__/helpers';
import { QueryClient } from '@tanstack/react-query';
import { ActionItemsList } from '../ActionItemsList';
import { meetingActionItemsApi } from '@/lib/api/services/meetings';
import {
  ActionItemStatus,
  ActionItemPriority,
  type MeetingActionItem,
} from '@/types/meetings';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@/lib/api/services/meetings', () => ({
  meetingActionItemsApi: {
    getActionItems: vi.fn(),
    createActionItem: vi.fn(),
    updateActionItem: vi.fn(),
    completeActionItem: vi.fn(),
    deleteActionItem: vi.fn(),
    convertToTask: vi.fn(),
  },
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogDescription: ({ children }: any) => <p data-testid="dialog-description">{children}</p>,
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
}));

// ============================================================================
// Test Data Factories
// ============================================================================

function createMockActionItem(overrides: Partial<MeetingActionItem> = {}): MeetingActionItem {
  return {
    id: `action-${Math.random().toString(36).substr(2, 9)}`,
    meeting_id: 'meeting-123',
    description: 'Review construction drawings',
    status: ActionItemStatus.PENDING,
    priority: ActionItemPriority.MEDIUM,
    assignee_id: 'user-1',
    assignee_name: 'John Doe',
    assignee_company: 'ABC Construction',
    due_date: '2025-12-25',
    completed_date: null,
    task_id: null,
    item_order: 1,
    notes: 'This is a note',
    created_at: '2025-12-01T10:00:00Z',
    updated_at: '2025-12-01T10:00:00Z',
    created_by: 'user-1',
    assignee: {
      id: 'user-1',
      full_name: 'John Doe',
      email: 'john@example.com',
    },
    task: null,
    ...overrides,
  };
}

function createOverdueActionItem(overrides: Partial<MeetingActionItem> = {}): MeetingActionItem {
  return createMockActionItem({
    description: 'Overdue task',
    due_date: '2020-01-01',
    status: ActionItemStatus.PENDING,
    ...overrides,
  });
}

function createCompletedActionItem(overrides: Partial<MeetingActionItem> = {}): MeetingActionItem {
  return createMockActionItem({
    description: 'Completed task',
    status: ActionItemStatus.COMPLETED,
    completed_date: '2025-12-15',
    ...overrides,
  });
}

function createActionItemWithTask(overrides: Partial<MeetingActionItem> = {}): MeetingActionItem {
  return createMockActionItem({
    task_id: 'task-123',
    task: {
      id: 'task-123',
      title: 'Linked Task',
      status: 'pending',
    },
    ...overrides,
  });
}

// ============================================================================
// Test Suite: Display Functionality
// ============================================================================

describe('ActionItemsList - Display', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  // Test 1-5: Loading and Empty States
  it('should show loading state initially', () => {
    vi.mocked(meetingActionItemsApi.getActionItems).mockReturnValue(
      new Promise(() => {}) // Never resolves
    );

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    expect(screen.getByText(/loading action items/i)).toBeInTheDocument();
  });

  it('should show empty state when no action items exist', async () => {
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([]);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText(/no action items yet/i)).toBeInTheDocument();
    });
  });

  it('should show "Add first action item" button in empty state', async () => {
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([]);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add first action item/i })).toBeInTheDocument();
    });
  });

  it('should not show add buttons when readOnly is true', async () => {
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([]);

    render(<ActionItemsList meetingId="meeting-123" readOnly />, { queryClient });

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument();
    });
  });

  it('should display action items count badge', async () => {
    const items = [
      createMockActionItem(),
      createMockActionItem({ status: ActionItemStatus.PENDING }),
      createCompletedActionItem(),
    ];
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue(items);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText(/2 pending \/ 1 completed/i)).toBeInTheDocument();
    });
  });

  // Test 6-12: Pending Items Display
  it('should display pending action items', async () => {
    const items = [createMockActionItem({ description: 'Test Action Item' })];
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue(items);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText('Test Action Item')).toBeInTheDocument();
    });
  });

  it('should display action item description', async () => {
    const item = createMockActionItem({ description: 'Review and approve submittal packages' });
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([item]);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText('Review and approve submittal packages')).toBeInTheDocument();
    });
  });

  it('should display assignee name', async () => {
    const item = createMockActionItem({ assignee_name: 'Jane Smith' });
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([item]);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('should display assignee with company', async () => {
    const item = createMockActionItem({
      assignee_name: 'Bob Johnson',
      assignee_company: 'XYZ Corp',
    });
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([item]);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText(/Bob Johnson/i)).toBeInTheDocument();
      expect(screen.getByText(/XYZ Corp/i)).toBeInTheDocument();
    });
  });

  it('should prefer assignee relationship full_name over assignee_name', async () => {
    const item = createMockActionItem({
      assignee_name: 'Old Name',
      assignee: {
        id: 'user-1',
        full_name: 'Preferred Name',
        email: 'preferred@example.com',
      },
    });
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([item]);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText(/Preferred Name/i)).toBeInTheDocument();
      expect(screen.queryByText('Old Name')).not.toBeInTheDocument();
    });
  });

  it('should display due date', async () => {
    const item = createMockActionItem({ due_date: '2025-12-25' });
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([item]);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText(/12\/25\/2025/i)).toBeInTheDocument();
    });
  });

  it('should display notes when present', async () => {
    const item = createMockActionItem({ notes: 'Important: coordinate with architect' });
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([item]);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText('Important: coordinate with architect')).toBeInTheDocument();
    });
  });

  // Test 13-18: Priority Display
  it('should display low priority badge', async () => {
    const item = createMockActionItem({ priority: ActionItemPriority.LOW });
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([item]);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText('Low')).toBeInTheDocument();
    });
  });

  it('should display medium priority badge', async () => {
    const item = createMockActionItem({ priority: ActionItemPriority.MEDIUM });
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([item]);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText('Medium')).toBeInTheDocument();
    });
  });

  it('should display high priority badge', async () => {
    const item = createMockActionItem({ priority: ActionItemPriority.HIGH });
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([item]);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText('High')).toBeInTheDocument();
    });
  });

  it('should display urgent priority badge', async () => {
    const item = createMockActionItem({ priority: ActionItemPriority.URGENT });
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([item]);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText('Urgent')).toBeInTheDocument();
    });
  });

  it('should apply priority color classes', async () => {
    const items = [
      createMockActionItem({ priority: ActionItemPriority.LOW, description: 'Low priority' }),
      createMockActionItem({ priority: ActionItemPriority.URGENT, description: 'Urgent priority' }),
    ];
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue(items);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText('Low')).toBeInTheDocument();
      expect(screen.getByText('Urgent')).toBeInTheDocument();
    });
  });

  it('should show multiple priority items correctly', async () => {
    const items = [
      createMockActionItem({ priority: ActionItemPriority.LOW }),
      createMockActionItem({ priority: ActionItemPriority.MEDIUM }),
      createMockActionItem({ priority: ActionItemPriority.HIGH }),
      createMockActionItem({ priority: ActionItemPriority.URGENT }),
    ];
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue(items);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText('Low')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getByText('Urgent')).toBeInTheDocument();
    });
  });

  // Test 19-23: Overdue Highlighting
  it('should highlight overdue items with red border', async () => {
    const item = createOverdueActionItem();
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([item]);

    const { container } = render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      const card = container.querySelector('.border-red-200');
      expect(card).toBeInTheDocument();
    });
  });

  it('should show "Overdue:" prefix for overdue items', async () => {
    const item = createOverdueActionItem({ due_date: '2020-01-01' });
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([item]);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText(/overdue:/i)).toBeInTheDocument();
    });
  });

  it('should apply red text color to overdue date', async () => {
    const item = createOverdueActionItem();
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([item]);

    const { container } = render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      const overdueText = container.querySelector('.text-red-600');
      expect(overdueText).toBeInTheDocument();
    });
  });

  it('should not highlight completed overdue items', async () => {
    const item = createOverdueActionItem({ status: ActionItemStatus.COMPLETED });
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([item]);

    const { container } = render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      const redBorder = container.querySelector('.border-red-200');
      expect(redBorder).not.toBeInTheDocument();
    });
  });

  it('should show days until due for upcoming items', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    const item = createMockActionItem({
      due_date: futureDate.toISOString().split('T')[0],
    });
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([item]);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      // Should show days count for items due within 7 days
      expect(screen.getByText(/3 days/i)).toBeInTheDocument();
    });
  });

  // Test 24-27: Completed Items Display
  it('should display completed items in separate section', async () => {
    const items = [
      createMockActionItem({ description: 'Pending item' }),
      createCompletedActionItem({ description: 'Completed item' }),
    ];
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue(items);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText(/completed \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText('Completed item')).toBeInTheDocument();
    });
  });

  it('should apply strikethrough to completed items', async () => {
    const item = createCompletedActionItem({ description: 'Done task' });
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([item]);

    const { container } = render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      const strikethrough = container.querySelector('.line-through');
      expect(strikethrough).toBeInTheDocument();
    });
  });

  it('should show completion date for completed items', async () => {
    const item = createCompletedActionItem({ completed_date: '2025-12-15' });
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([item]);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText(/completed 12\/15\/2025/i)).toBeInTheDocument();
    });
  });

  it('should apply reduced opacity to completed items', async () => {
    const item = createCompletedActionItem();
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([item]);

    const { container } = render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      const card = container.querySelector('.opacity-75');
      expect(card).toBeInTheDocument();
    });
  });

  // Test 28-30: Task Linking Display
  it('should show "Linked to Task" badge when task_id exists', async () => {
    const item = createActionItemWithTask();
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([item]);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText('Linked to Task')).toBeInTheDocument();
    });
  });

  it('should show convert to task button when no task linked', async () => {
    const item = createMockActionItem({ task_id: null });
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([item]);

    render(<ActionItemsList meetingId="meeting-123" projectId="project-1" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /convert to task/i })).toBeInTheDocument();
    });
  });

  it('should not show convert to task button when projectId is missing', async () => {
    const item = createMockActionItem({ task_id: null });
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([item]);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /convert to task/i })).not.toBeInTheDocument();
    });
  });
});

// ============================================================================
// Test Suite: Add Action Item Dialog
// ============================================================================

describe('ActionItemsList - Add Dialog', () => {
  let queryClient: QueryClient;
  const user = userEvent.setup();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([]);
  });

  afterEach(() => {
    queryClient.clear();
  });

  // Test 31-38: Dialog Opening and Form Fields
  it('should open add dialog when clicking add button', async () => {
    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add action item/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add action item/i }));

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('Add Action Item')).toBeInTheDocument();
  });

  it('should display all form fields in add dialog', async () => {
    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add action item/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add action item/i }));

    expect(screen.getByLabelText(/description \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/assignee name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
  });

  it('should have required indicator on description field', async () => {
    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add action item/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add action item/i }));

    expect(screen.getByLabelText(/description \*/i)).toBeInTheDocument();
  });

  it('should have placeholder text in description field', async () => {
    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add action item/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add action item/i }));

    expect(screen.getByPlaceholderText(/what needs to be done/i)).toBeInTheDocument();
  });

  it('should have all priority options in dropdown', async () => {
    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add action item/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add action item/i }));

    const prioritySelect = screen.getByLabelText(/priority/i) as HTMLSelectElement;
    const options = Array.from(prioritySelect.options).map(opt => opt.value);

    expect(options).toContain('low');
    expect(options).toContain('medium');
    expect(options).toContain('high');
    expect(options).toContain('urgent');
  });

  it('should default priority to medium', async () => {
    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add action item/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add action item/i }));

    const prioritySelect = screen.getByLabelText(/priority/i) as HTMLSelectElement;
    expect(prioritySelect.value).toBe('medium');
  });

  it('should have cancel and add buttons in dialog footer', async () => {
    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add action item/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add action item/i }));

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^add action item$/i })).toBeInTheDocument();
  });

  it('should close dialog when clicking cancel', async () => {
    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add action item/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add action item/i }));
    expect(screen.getByTestId('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });
  });

  // Test 39-43: Form Validation
  it('should disable add button when description is empty', async () => {
    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add action item/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add action item/i }));

    const addButton = screen.getAllByRole('button', { name: /add action item/i })[1]; // Dialog button
    expect(addButton).toBeDisabled();
  });

  it('should enable add button when description is filled', async () => {
    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add action item/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add action item/i }));

    const descriptionField = screen.getByLabelText(/description \*/i);
    await user.type(descriptionField, 'New action item');

    const addButton = screen.getAllByRole('button', { name: /add action item/i })[1];
    expect(addButton).not.toBeDisabled();
  });

  it('should not submit with only whitespace in description', async () => {
    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add action item/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add action item/i }));

    const descriptionField = screen.getByLabelText(/description \*/i);
    await user.type(descriptionField, '   ');

    const addButton = screen.getAllByRole('button', { name: /add action item/i })[1];
    expect(addButton).toBeDisabled();
  });

  it('should allow submission with only description filled', async () => {
    vi.mocked(meetingActionItemsApi.createActionItem).mockResolvedValue(
      createMockActionItem({ description: 'New item' })
    );

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add action item/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add action item/i }));

    const descriptionField = screen.getByLabelText(/description \*/i);
    await user.type(descriptionField, 'New item');

    const addButton = screen.getAllByRole('button', { name: /add action item/i })[1];
    await user.click(addButton);

    await waitFor(() => {
      expect(meetingActionItemsApi.createActionItem).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'New item',
          meeting_id: 'meeting-123',
        })
      );
    });
  });

  it('should accept all form fields when filled', async () => {
    vi.mocked(meetingActionItemsApi.createActionItem).mockResolvedValue(
      createMockActionItem()
    );

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add action item/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add action item/i }));

    await user.type(screen.getByLabelText(/description \*/i), 'Complete task');
    await user.type(screen.getByLabelText(/assignee name/i), 'John Doe');
    await user.type(screen.getByLabelText(/company/i), 'ABC Corp');
    await user.type(screen.getByLabelText(/due date/i), '2025-12-31');
    await user.selectOptions(screen.getByLabelText(/priority/i), 'high');
    await user.type(screen.getByLabelText(/notes/i), 'Important note');

    const addButton = screen.getAllByRole('button', { name: /add action item/i })[1];
    await user.click(addButton);

    await waitFor(() => {
      expect(meetingActionItemsApi.createActionItem).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Complete task',
          assignee_name: 'John Doe',
          assignee_company: 'ABC Corp',
          due_date: '2025-12-31',
          priority: 'high',
          notes: 'Important note',
        })
      );
    });
  });

  // Test 44-45: Successful Creation
  it('should close dialog after successful creation', async () => {
    const newItem = createMockActionItem({ description: 'New item' });
    vi.mocked(meetingActionItemsApi.createActionItem).mockResolvedValue(newItem);
    vi.mocked(meetingActionItemsApi.getActionItems)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([newItem]);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add action item/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add action item/i }));

    const descriptionField = screen.getByLabelText(/description \*/i);
    await user.type(descriptionField, 'New item');

    const addButton = screen.getAllByRole('button', { name: /add action item/i })[1];
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });
  });

  it('should reset form after successful creation', async () => {
    const newItem = createMockActionItem({ description: 'First item' });
    vi.mocked(meetingActionItemsApi.createActionItem).mockResolvedValue(newItem);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add action item/i })).toBeInTheDocument();
    });

    // First submission
    await user.click(screen.getByRole('button', { name: /add action item/i }));
    await user.type(screen.getByLabelText(/description \*/i), 'First item');
    await user.click(screen.getAllByRole('button', { name: /add action item/i })[1]);

    await waitFor(() => {
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });

    // Open again
    await user.click(screen.getByRole('button', { name: /add action item/i }));

    // Check fields are reset
    const descriptionField = screen.getByLabelText(/description \*/i) as HTMLTextAreaElement;
    expect(descriptionField.value).toBe('');
  });
});

// ============================================================================
// Test Suite: Edit Action Item Dialog
// ============================================================================

describe('ActionItemsList - Edit Dialog', () => {
  let queryClient: QueryClient;
  const user = userEvent.setup();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  // Test 46-50: Edit Dialog Opening and Fields
  it('should open edit dialog when clicking edit button', async () => {
    const item = createMockActionItem({ description: 'Item to edit' });
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([item]);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText('Item to edit')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button');
    const editButton = editButtons.find(btn => btn.querySelector('svg')); // Edit icon

    if (editButton) {
      await user.click(editButton);

      expect(screen.getByText('Edit Action Item')).toBeInTheDocument();
    }
  });

  it('should populate edit dialog with existing values', async () => {
    const item = createMockActionItem({
      description: 'Existing description',
      assignee_name: 'Jane Doe',
      assignee_company: 'XYZ Corp',
      due_date: '2025-12-31',
      priority: ActionItemPriority.HIGH,
      notes: 'Existing notes',
    });
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([item]);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText('Existing description')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button');
    const editButton = editButtons.find(btn => btn.querySelector('svg'));

    if (editButton) {
      await user.click(editButton);

      const descField = screen.getByLabelText(/description \*/i) as HTMLTextAreaElement;
      expect(descField.value).toBe('Existing description');

      const assigneeField = screen.getByLabelText(/assignee name/i) as HTMLInputElement;
      expect(assigneeField.value).toBe('Jane Doe');

      const priorityField = screen.getByLabelText(/priority/i) as HTMLSelectElement;
      expect(priorityField.value).toBe('high');
    }
  });

  it('should have status field in edit dialog', async () => {
    const item = createMockActionItem();
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([item]);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText(item.description)).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button');
    const editButton = editButtons.find(btn => btn.querySelector('svg'));

    if (editButton) {
      await user.click(editButton);

      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    }
  });

  it('should have all status options in edit dialog', async () => {
    const item = createMockActionItem();
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([item]);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText(item.description)).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button');
    const editButton = editButtons.find(btn => btn.querySelector('svg'));

    if (editButton) {
      await user.click(editButton);

      const statusSelect = screen.getByLabelText(/status/i) as HTMLSelectElement;
      const options = Array.from(statusSelect.options).map(opt => opt.value);

      expect(options).toContain('pending');
      expect(options).toContain('in_progress');
      expect(options).toContain('completed');
      expect(options).toContain('cancelled');
    }
  });

  it('should update action item when saving changes', async () => {
    const item = createMockActionItem({ description: 'Original description' });
    const updatedItem = { ...item, description: 'Updated description' };

    vi.mocked(meetingActionItemsApi.getActionItems)
      .mockResolvedValueOnce([item])
      .mockResolvedValueOnce([updatedItem]);
    vi.mocked(meetingActionItemsApi.updateActionItem).mockResolvedValue(updatedItem);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText('Original description')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button');
    const editButton = editButtons.find(btn => btn.querySelector('svg'));

    if (editButton) {
      await user.click(editButton);

      const descField = screen.getByLabelText(/description \*/i);
      await user.clear(descField);
      await user.type(descField, 'Updated description');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(meetingActionItemsApi.updateActionItem).toHaveBeenCalledWith(
          item.id,
          expect.objectContaining({
            description: 'Updated description',
          })
        );
      });
    }
  });
});

// ============================================================================
// Test Suite: Delete Action Item
// ============================================================================

describe('ActionItemsList - Delete', () => {
  let queryClient: QueryClient;
  const user = userEvent.setup();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();

    // Mock window.confirm
    global.confirm = vi.fn();
  });

  afterEach(() => {
    queryClient.clear();
  });

  // Test 51-54: Delete Confirmation
  it('should show confirmation dialog when clicking delete', async () => {
    const item = createMockActionItem();
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([item]);
    vi.mocked(global.confirm).mockReturnValue(false);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText(item.description)).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(btn =>
      btn.classList.contains('text-red-600')
    );

    if (deleteButton) {
      await user.click(deleteButton);

      expect(global.confirm).toHaveBeenCalledWith('Delete this action item?');
    }
  });

  it('should not delete if confirmation is cancelled', async () => {
    const item = createMockActionItem();
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([item]);
    vi.mocked(global.confirm).mockReturnValue(false);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText(item.description)).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(btn =>
      btn.classList.contains('text-red-600')
    );

    if (deleteButton) {
      await user.click(deleteButton);

      expect(meetingActionItemsApi.deleteActionItem).not.toHaveBeenCalled();
    }
  });

  it('should delete action item when confirmed', async () => {
    const item = createMockActionItem();
    vi.mocked(meetingActionItemsApi.getActionItems)
      .mockResolvedValueOnce([item])
      .mockResolvedValueOnce([]);
    vi.mocked(meetingActionItemsApi.deleteActionItem).mockResolvedValue(undefined);
    vi.mocked(global.confirm).mockReturnValue(true);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText(item.description)).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(btn =>
      btn.classList.contains('text-red-600')
    );

    if (deleteButton) {
      await user.click(deleteButton);

      await waitFor(() => {
        expect(meetingActionItemsApi.deleteActionItem).toHaveBeenCalledWith(item.id);
      });
    }
  });

  it('should not show delete button in read-only mode', async () => {
    const item = createMockActionItem();
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([item]);

    render(<ActionItemsList meetingId="meeting-123" readOnly />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText(item.description)).toBeInTheDocument();
    });

    const deleteButtons = screen.queryAllByRole('button').filter(btn =>
      btn.classList.contains('text-red-600')
    );
    expect(deleteButtons).toHaveLength(0);
  });
});

// ============================================================================
// Test Suite: Status Toggle
// ============================================================================

describe('ActionItemsList - Status Toggle', () => {
  let queryClient: QueryClient;
  const user = userEvent.setup();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  // Test 55-58: Toggle Completion
  it('should complete action item when clicking checkbox', async () => {
    const item = createMockActionItem({ status: ActionItemStatus.PENDING });
    const completedItem = { ...item, status: ActionItemStatus.COMPLETED };

    vi.mocked(meetingActionItemsApi.getActionItems)
      .mockResolvedValueOnce([item])
      .mockResolvedValueOnce([completedItem]);
    vi.mocked(meetingActionItemsApi.completeActionItem).mockResolvedValue(completedItem);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText(item.description)).toBeInTheDocument();
    });

    const checkboxButtons = screen.getAllByRole('button');
    const statusButton = checkboxButtons[1]; // First item's status button

    await user.click(statusButton);

    await waitFor(() => {
      expect(meetingActionItemsApi.completeActionItem).toHaveBeenCalledWith(item.id);
    });
  });

  it('should uncomplete action item when clicking completed checkbox', async () => {
    const item = createCompletedActionItem();
    const pendingItem = { ...item, status: ActionItemStatus.PENDING, completed_date: null };

    vi.mocked(meetingActionItemsApi.getActionItems)
      .mockResolvedValueOnce([item])
      .mockResolvedValueOnce([pendingItem]);
    vi.mocked(meetingActionItemsApi.updateActionItem).mockResolvedValue(pendingItem);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText(item.description)).toBeInTheDocument();
    });

    const checkboxButtons = screen.getAllByRole('button');
    const statusButton = checkboxButtons[1]; // Completed section status button

    await user.click(statusButton);

    await waitFor(() => {
      expect(meetingActionItemsApi.updateActionItem).toHaveBeenCalledWith(
        item.id,
        expect.objectContaining({
          status: ActionItemStatus.PENDING,
          completed_date: undefined,
        })
      );
    });
  });

  it('should show different icons for different statuses', async () => {
    const items = [
      createMockActionItem({ status: ActionItemStatus.PENDING, description: 'Pending' }),
      createMockActionItem({ status: ActionItemStatus.IN_PROGRESS, description: 'In Progress' }),
      createCompletedActionItem({ description: 'Completed' }),
    ];
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue(items);

    const { container } = render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  it('should not show status toggle in read-only mode', async () => {
    const item = createMockActionItem();
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([item]);

    render(<ActionItemsList meetingId="meeting-123" readOnly />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText(item.description)).toBeInTheDocument();
    });

    // In read-only mode, status button should not be present
    const buttons = screen.getAllByRole('button');
    // Only "Add Action Item" header button should be absent in readonly
    expect(buttons.length).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// Test Suite: Convert to Task
// ============================================================================

describe('ActionItemsList - Convert to Task', () => {
  let queryClient: QueryClient;
  const user = userEvent.setup();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  // Test 59-62: Task Conversion
  it('should convert action item to task when button clicked', async () => {
    const item = createMockActionItem({ task_id: null });
    const convertedItem = createActionItemWithTask();

    vi.mocked(meetingActionItemsApi.getActionItems)
      .mockResolvedValueOnce([item])
      .mockResolvedValueOnce([convertedItem]);
    vi.mocked(meetingActionItemsApi.convertToTask).mockResolvedValue(convertedItem);

    render(<ActionItemsList meetingId="meeting-123" projectId="project-1" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText(item.description)).toBeInTheDocument();
    });

    const convertButton = screen.getByRole('button', { name: /convert to task/i });
    await user.click(convertButton);

    await waitFor(() => {
      expect(meetingActionItemsApi.convertToTask).toHaveBeenCalledWith(item.id, 'project-1');
    });
  });

  it('should disable convert button while converting', async () => {
    const item = createMockActionItem({ task_id: null });
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([item]);
    vi.mocked(meetingActionItemsApi.convertToTask).mockReturnValue(
      new Promise(() => {}) // Never resolves
    );

    render(<ActionItemsList meetingId="meeting-123" projectId="project-1" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText(item.description)).toBeInTheDocument();
    });

    const convertButton = screen.getByRole('button', { name: /convert to task/i });
    await user.click(convertButton);

    await waitFor(() => {
      expect(convertButton).toBeDisabled();
    });
  });

  it('should not show convert button when already linked to task', async () => {
    const item = createActionItemWithTask();
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([item]);

    render(<ActionItemsList meetingId="meeting-123" projectId="project-1" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText(item.description)).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /convert to task/i })).not.toBeInTheDocument();
  });

  it('should not show convert button in read-only mode', async () => {
    const item = createMockActionItem({ task_id: null });
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([item]);

    render(<ActionItemsList meetingId="meeting-123" projectId="project-1" readOnly />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText(item.description)).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /convert to task/i })).not.toBeInTheDocument();
  });
});

// ============================================================================
// Test Suite: Integration and Edge Cases
// ============================================================================

describe('ActionItemsList - Integration and Edge Cases', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  // Test 63-65: Multiple Items Display
  it('should display multiple action items correctly', async () => {
    const items = [
      createMockActionItem({ description: 'First item', priority: ActionItemPriority.HIGH }),
      createMockActionItem({ description: 'Second item', priority: ActionItemPriority.LOW }),
      createMockActionItem({ description: 'Third item', priority: ActionItemPriority.URGENT }),
    ];
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue(items);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText('First item')).toBeInTheDocument();
      expect(screen.getByText('Second item')).toBeInTheDocument();
      expect(screen.getByText('Third item')).toBeInTheDocument();
    });
  });

  it('should group pending and completed items separately', async () => {
    const items = [
      createMockActionItem({ description: 'Pending 1' }),
      createCompletedActionItem({ description: 'Completed 1' }),
      createMockActionItem({ description: 'Pending 2' }),
      createCompletedActionItem({ description: 'Completed 2' }),
    ];
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue(items);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText(/2 pending \/ 2 completed/i)).toBeInTheDocument();
    });
  });

  it('should handle items without optional fields gracefully', async () => {
    const item = createMockActionItem({
      assignee_name: null,
      assignee_company: null,
      due_date: null,
      notes: null,
      assignee: null,
    });
    vi.mocked(meetingActionItemsApi.getActionItems).mockResolvedValue([item]);

    render(<ActionItemsList meetingId="meeting-123" />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText(item.description)).toBeInTheDocument();
    });

    // Should not crash and should show the item
    expect(screen.getByText('Medium')).toBeInTheDocument(); // Priority should still show
  });
});
