/**
 * RFIList Component Tests
 * Tests for the RFI table list component
 *
 * Test Coverage:
 * - Loading state display
 * - Empty state with/without filters
 * - RFI list rendering
 * - Filtering by status and priority
 * - Overdue highlighting
 * - Row click handler
 * - Action button click
 * - Date formatting
 * - Assignee display
 *
 * Total: 20+ test cases
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RFIList } from '../RFIList';
import type { RFIListProps } from '../RFIList';
import {
  createMockRFI,
  createMockRFIs,
  createMockPendingRFI,
  createMockSubmittedRFI,
  createMockHighPriorityRFI,
  createMockOverdueRFI,
  createMockUnassignedRFI,
  createMockRFIWithoutDueDate,
} from '@/__tests__/factories';

// Mock the badge components
vi.mock('../RFIStatusBadge', () => ({
  RFIStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));

vi.mock('../RFIPriorityBadge', () => ({
  RFIPriorityBadge: ({ priority }: { priority: string }) => (
    <span data-testid="priority-badge">{priority}</span>
  ),
}));

describe('RFIList', () => {
  const mockOnSelectRFI = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Loading State Tests
  // ==========================================================================

  describe('Loading State', () => {
    it('should display loading spinner when isLoading is true', () => {
      render(
        <RFIList
          rfis={[]}
          isLoading={true}
          onSelectRFI={mockOnSelectRFI}
        />
      );

      expect(screen.getByText('Loading RFIs...')).toBeInTheDocument();
      // Check for spinner via class or test ID
      const spinner = screen.getByText('Loading RFIs...').previousElementSibling;
      expect(spinner).toHaveClass('animate-spin');
    });

    it('should not display table when loading', () => {
      render(
        <RFIList
          rfis={createMockRFIs(3)}
          isLoading={true}
          onSelectRFI={mockOnSelectRFI}
        />
      );

      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Empty State Tests
  // ==========================================================================

  describe('Empty State', () => {
    it('should display empty state when no RFIs exist', () => {
      render(
        <RFIList
          rfis={[]}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
        />
      );

      expect(screen.getByText('No RFIs found')).toBeInTheDocument();
      expect(screen.getByText('Create your first RFI to get started')).toBeInTheDocument();
    });

    it('should display filter suggestion in empty state when filters are active', () => {
      render(
        <RFIList
          rfis={[]}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
          filters={{ status: 'submitted' }}
        />
      );

      expect(screen.getByText('No RFIs found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument();
    });

    it('should not display table in empty state', () => {
      render(
        <RFIList
          rfis={[]}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
        />
      );

      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // List Rendering Tests
  // ==========================================================================

  describe('List Rendering', () => {
    it('should render list of RFIs', () => {
      const rfis = createMockRFIs(3, { project_id: 'project-1' });

      render(
        <RFIList
          rfis={rfis}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
        />
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByText(/RFIs.*\(3\)/)).toBeInTheDocument();

      // Should have 3 rows (excluding header)
      const rows = screen.getAllByRole('row');
      expect(rows).toHaveLength(4); // 1 header + 3 data rows
    });

    it('should display RFI number', () => {
      const rfi = createMockRFI({ number: 42 });

      render(
        <RFIList
          rfis={[rfi]}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
        />
      );

      expect(screen.getByText('#42')).toBeInTheDocument();
    });

    it('should display RFI title', () => {
      const rfi = createMockRFI({ title: 'Foundation Detail Clarification' });

      render(
        <RFIList
          rfis={[rfi]}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
        />
      );

      expect(screen.getByText('Foundation Detail Clarification')).toBeInTheDocument();
    });

    it('should display "Untitled RFI" when title is missing', () => {
      const rfi = createMockRFI({ title: '' });

      render(
        <RFIList
          rfis={[rfi]}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
        />
      );

      expect(screen.getByText('Untitled RFI')).toBeInTheDocument();
    });

    it('should display RFI description when available', () => {
      const rfi = createMockRFI({
        title: 'Test RFI',
        description: 'This is a test description',
      });

      render(
        <RFIList
          rfis={[rfi]}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
        />
      );

      expect(screen.getByText('This is a test description')).toBeInTheDocument();
    });

    it('should display status badge', () => {
      const rfi = createMockSubmittedRFI();

      render(
        <RFIList
          rfis={[rfi]}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
        />
      );

      const badges = screen.getAllByTestId('status-badge');
      expect(badges[0]).toHaveTextContent('submitted');
    });

    it('should display priority badge', () => {
      const rfi = createMockHighPriorityRFI();

      render(
        <RFIList
          rfis={[rfi]}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
        />
      );

      const badges = screen.getAllByTestId('priority-badge');
      expect(badges[0]).toHaveTextContent('high');
    });
  });

  // ==========================================================================
  // Filtering Tests
  // ==========================================================================

  describe('Filtering', () => {
    it('should filter RFIs by status', () => {
      const rfis = [
        createMockPendingRFI({ title: 'Pending RFI' }),
        createMockSubmittedRFI({ title: 'Submitted RFI' }),
        createMockPendingRFI({ title: 'Another Pending' }),
      ];

      render(
        <RFIList
          rfis={rfis}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
          filters={{ status: 'pending' }}
        />
      );

      expect(screen.getByText('Pending RFI')).toBeInTheDocument();
      expect(screen.getByText('Another Pending')).toBeInTheDocument();
      expect(screen.queryByText('Submitted RFI')).not.toBeInTheDocument();

      // Should show count of filtered items
      expect(screen.getByText(/RFIs.*\(2\)/)).toBeInTheDocument();
    });

    it('should filter RFIs by priority', () => {
      const rfis = [
        createMockRFI({ title: 'Normal Priority', priority: 'normal' }),
        createMockHighPriorityRFI({ title: 'High Priority' }),
        createMockRFI({ title: 'Low Priority', priority: 'low' }),
      ];

      render(
        <RFIList
          rfis={rfis}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
          filters={{ priority: 'high' }}
        />
      );

      expect(screen.getByText('High Priority')).toBeInTheDocument();
      expect(screen.queryByText('Normal Priority')).not.toBeInTheDocument();
      expect(screen.queryByText('Low Priority')).not.toBeInTheDocument();
    });

    it('should filter by both status and priority', () => {
      const rfis = [
        createMockSubmittedRFI({ title: 'Match Both', priority: 'high' }),
        createMockSubmittedRFI({ title: 'Wrong Priority', priority: 'normal' }),
        createMockPendingRFI({ title: 'Wrong Status', priority: 'high' }),
      ];

      render(
        <RFIList
          rfis={rfis}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
          filters={{ status: 'submitted', priority: 'high' }}
        />
      );

      expect(screen.getByText('Match Both')).toBeInTheDocument();
      expect(screen.queryByText('Wrong Priority')).not.toBeInTheDocument();
      expect(screen.queryByText('Wrong Status')).not.toBeInTheDocument();
    });

    it('should show empty state when filters match no RFIs', () => {
      const rfis = createMockRFIs(3, { status: 'pending' });

      render(
        <RFIList
          rfis={rfis}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
          filters={{ status: 'closed' }}
        />
      );

      expect(screen.getByText('No RFIs found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Overdue Highlighting Tests
  // ==========================================================================

  describe('Overdue Highlighting', () => {
    it('should highlight overdue RFIs', () => {
      const rfi = createMockOverdueRFI({ title: 'Overdue RFI' });

      render(
        <RFIList
          rfis={[rfi]}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
        />
      );

      // Find the row and check for overdue styling
      const rows = screen.getAllByRole('row');
      const dataRow = rows.find(row => row.textContent?.includes('Overdue RFI'));
      expect(dataRow).toHaveClass('bg-red-50/50');

      expect(screen.getByText('(Overdue)')).toBeInTheDocument();
    });

    it('should not highlight RFIs with future due dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const rfi = createMockRFI({
        title: 'Future RFI',
        due_date: futureDate.toISOString().split('T')[0],
      });

      render(
        <RFIList
          rfis={[rfi]}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
        />
      );

      expect(screen.queryByText('(Overdue)')).not.toBeInTheDocument();
    });

    it('should not highlight RFIs without due dates', () => {
      const rfi = createMockRFIWithoutDueDate();

      render(
        <RFIList
          rfis={[rfi]}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
        />
      );

      expect(screen.queryByText('(Overdue)')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Date Formatting Tests
  // ==========================================================================

  describe('Date Formatting', () => {
    it('should format due date correctly', () => {
      const rfi = createMockRFI({
        due_date: '2025-12-25',
      });

      render(
        <RFIList
          rfis={[rfi]}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
        />
      );

      // date-fns format: 'MMM d, yyyy'
      expect(screen.getByText(/Dec 25, 2025/)).toBeInTheDocument();
    });

    it('should display "-" for null due date', () => {
      const rfi = createMockRFIWithoutDueDate();

      render(
        <RFIList
          rfis={[rfi]}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
        />
      );

      // Find the due date cell
      const rows = screen.getAllByRole('row');
      const dataRow = rows[1]; // First data row
      const cells = within(dataRow).getAllByRole('cell');
      const dueDateCell = cells[5]; // Due date is 6th column (0-indexed: 5)

      expect(dueDateCell).toHaveTextContent('-');
    });

    it('should format created date correctly', () => {
      const rfi = createMockRFI({
        created_at: '2025-01-15T10:30:00Z',
      });

      render(
        <RFIList
          rfis={[rfi]}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
        />
      );

      expect(screen.getByText(/Jan 15, 2025/)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Assignee Display Tests
  // ==========================================================================

  describe('Assignee Display', () => {
    it('should display "Unassigned" for empty assignees array', () => {
      const rfi = createMockUnassignedRFI();

      render(
        <RFIList
          rfis={[rfi]}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
        />
      );

      expect(screen.getByText('Unassigned')).toBeInTheDocument();
    });

    it('should display "Unassigned" for null assignees', () => {
      const rfi = createMockRFI({ assignees: null as any });

      render(
        <RFIList
          rfis={[rfi]}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
        />
      );

      expect(screen.getByText('Unassigned')).toBeInTheDocument();
    });

    it('should display single assignee truncated', () => {
      const rfi = createMockRFI({
        assignees: ['user-123-long-id'],
      });

      render(
        <RFIList
          rfis={[rfi]}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
        />
      );

      // Should truncate to 8 characters
      expect(screen.getByText('user-123')).toBeInTheDocument();
    });

    it('should display multiple assignees with count', () => {
      const rfi = createMockRFI({
        assignees: ['user-123-long', 'user-456-long', 'user-789-long'],
      });

      render(
        <RFIList
          rfis={[rfi]}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
        />
      );

      // Should show first assignee (truncated) + count
      expect(screen.getByText('user-123 +2')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Interaction Tests
  // ==========================================================================

  describe('Interactions', () => {
    it('should call onSelectRFI when row is clicked', async () => {
      const user = userEvent.setup();
      const rfi = createMockRFI({ title: 'Test RFI' });

      render(
        <RFIList
          rfis={[rfi]}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
        />
      );

      const row = screen.getByText('Test RFI').closest('tr');
      expect(row).toBeInTheDocument();

      await user.click(row!);

      expect(mockOnSelectRFI).toHaveBeenCalledTimes(1);
      expect(mockOnSelectRFI).toHaveBeenCalledWith(rfi);
    });

    it('should call onSelectRFI when action button is clicked', async () => {
      const user = userEvent.setup();
      const rfi = createMockRFI({ number: 42 });

      render(
        <RFIList
          rfis={[rfi]}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
        />
      );

      const actionButton = screen.getByLabelText(/View RFI.*42/);
      await user.click(actionButton);

      expect(mockOnSelectRFI).toHaveBeenCalledTimes(1);
      expect(mockOnSelectRFI).toHaveBeenCalledWith(rfi);
    });

    it('should not propagate click when action button is clicked', async () => {
      const user = userEvent.setup();
      const rfi = createMockRFI({ number: 42 });

      render(
        <RFIList
          rfis={[rfi]}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
        />
      );

      const actionButton = screen.getByLabelText(/View RFI.*42/);
      await user.click(actionButton);

      // Should only be called once from button, not from row
      expect(mockOnSelectRFI).toHaveBeenCalledTimes(1);
    });

    it('should apply hover styles to rows', () => {
      const rfi = createMockRFI({ title: 'Test RFI' });

      render(
        <RFIList
          rfis={[rfi]}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
        />
      );

      const row = screen.getByText('Test RFI').closest('tr');
      expect(row).toHaveClass('cursor-pointer', 'hover:bg-gray-50');
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('Accessibility', () => {
    it('should have proper table structure', () => {
      const rfis = createMockRFIs(2);

      render(
        <RFIList
          rfis={rfis}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
        />
      );

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      // Should have table headers
      expect(screen.getByRole('columnheader', { name: /RFI #/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /Title/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /Status/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /Priority/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /Assignee/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /Due Date/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /Created/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /Actions/i })).toBeInTheDocument();
    });

    it('should have accessible action buttons', () => {
      const rfi = createMockRFI({ number: 42, reference_number: 'RFI-001-42' });

      render(
        <RFIList
          rfis={[rfi]}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
        />
      );

      const actionButton = screen.getByRole('button', {
        name: /View RFI RFI-001-42/i,
      });
      expect(actionButton).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      const rfi = createMockRFI({ title: 'Test RFI' });

      render(
        <RFIList
          rfis={[rfi]}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
        />
      );

      const actionButton = screen.getByRole('button', { name: /View RFI/i });

      // Tab to button and press Enter
      await user.tab();
      expect(actionButton).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(mockOnSelectRFI).toHaveBeenCalledWith(rfi);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle invalid date gracefully', () => {
      const rfi = createMockRFI({
        due_date: 'invalid-date',
      });

      render(
        <RFIList
          rfis={[rfi]}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
        />
      );

      // Should display fallback for invalid date
      const rows = screen.getAllByRole('row');
      const dataRow = rows[1];
      const cells = within(dataRow).getAllByRole('cell');
      const dueDateCell = cells[5];

      expect(dueDateCell).toHaveTextContent('-');
    });

    it('should handle very long titles with truncation', () => {
      const longTitle = 'This is a very long RFI title that should be truncated when displayed in the table to prevent layout issues';
      const rfi = createMockRFI({ title: longTitle });

      const { container } = render(
        <RFIList
          rfis={[rfi]}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
        />
      );

      // Check that truncate class is applied
      const titleElement = container.querySelector('.truncate');
      expect(titleElement).toBeInTheDocument();
      expect(titleElement).toHaveTextContent(longTitle);
    });

    it('should handle reference_number when available', () => {
      const rfi = createMockRFI({
        number: 42,
        reference_number: 'RFI-2025-042',
      });

      render(
        <RFIList
          rfis={[rfi]}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
        />
      );

      expect(screen.getByText('RFI-2025-042')).toBeInTheDocument();
      expect(screen.queryByText('#42')).not.toBeInTheDocument();
    });

    it('should handle large number of RFIs', () => {
      const rfis = createMockRFIs(100);

      render(
        <RFIList
          rfis={rfis}
          isLoading={false}
          onSelectRFI={mockOnSelectRFI}
        />
      );

      expect(screen.getByText(/RFIs.*\(100\)/)).toBeInTheDocument();

      // Should render all rows
      const rows = screen.getAllByRole('row');
      expect(rows).toHaveLength(101); // 1 header + 100 data rows
    });
  });
});
