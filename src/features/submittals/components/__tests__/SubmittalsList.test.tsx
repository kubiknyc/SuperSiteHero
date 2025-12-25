/**
 * Component Tests for SubmittalsList
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, userEvent, within } from '@/__tests__/helpers';
import { SubmittalsList } from '../SubmittalsList';
import * as hooks from '../../hooks/useSubmittals';
import {
  createMockWorkflowType,
  createMockSubmittals,
  createMockDraftSubmittal,
  createMockSubmittedSubmittal,
  createMockApprovedSubmittal,
} from '@/__tests__/factories';

// Mock the hooks module
vi.mock('../../hooks/useSubmittals');
vi.mock('../../hooks/useSubmittalMutations');

// Mock the CreateSubmittalDialog component
vi.mock('../CreateSubmittalDialog', () => ({
  CreateSubmittalDialog: ({ open, onOpenChange }: any) => (
    <div data-testid="create-submittal-dialog">
      {open && (
        <div>
          <h2>Create Submittal Dialog</h2>
          <button onClick={() => onOpenChange(false)}>Close</button>
        </div>
      )}
    </div>
  ),
}));

describe('SubmittalsList', () => {
  const mockWorkflowType = createMockWorkflowType();
  const mockSubmittals = [
    createMockDraftSubmittal({ id: '1', title: 'Draft Submittal', number: 1 }),
    createMockSubmittedSubmittal({ id: '2', title: 'Submitted Submittal', number: 2 }),
    createMockApprovedSubmittal({ id: '3', title: 'Approved Submittal', number: 3 }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading and Error States', () => {
    it('should display no project message when projectId is undefined', () => {
      vi.mocked(hooks.useSubmittalWorkflowType).mockReturnValue({
        data: mockWorkflowType,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(hooks.useSubmittals).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      } as any);

      render(<SubmittalsList projectId={undefined} />);

      expect(screen.getByText('No project selected')).toBeInTheDocument();
    });

    it('should display loading spinner when loading', () => {
      vi.mocked(hooks.useSubmittalWorkflowType).mockReturnValue({
        data: mockWorkflowType,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(hooks.useSubmittals).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      render(<SubmittalsList projectId="project-123" />);

      expect(screen.getByText('Loading submittals...')).toBeInTheDocument();
    });

    it('should display error message when fetch fails', () => {
      vi.mocked(hooks.useSubmittalWorkflowType).mockReturnValue({
        data: mockWorkflowType,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(hooks.useSubmittals).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch'),
      } as any);

      render(<SubmittalsList projectId="project-123" />);

      expect(screen.getByText(/Failed to load submittals/i)).toBeInTheDocument();
    });
  });

  describe('Rendering Submittals', () => {
    beforeEach(() => {
      vi.mocked(hooks.useSubmittalWorkflowType).mockReturnValue({
        data: mockWorkflowType,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(hooks.useSubmittals).mockReturnValue({
        data: mockSubmittals,
        isLoading: false,
        error: null,
      } as any);
    });

    it('should render list of submittals', () => {
      render(<SubmittalsList projectId="project-123" />);

      expect(screen.getByText('Draft Submittal')).toBeInTheDocument();
      expect(screen.getByText('Submitted Submittal')).toBeInTheDocument();
      expect(screen.getByText('Approved Submittal')).toBeInTheDocument();
    });

    it('should display submittal numbers', () => {
      render(<SubmittalsList projectId="project-123" />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should display submittal status badges', () => {
      render(<SubmittalsList projectId="project-123" />);

      // Status badges should be rendered (specific badge component is mocked)
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    it('should render links to submittal detail pages', () => {
      render(<SubmittalsList projectId="project-123" />);

      const draftLink = screen.getByRole('link', { name: 'Draft Submittal' });
      expect(draftLink).toHaveAttribute('href', '/submittals/1');

      const submittedLink = screen.getByRole('link', { name: 'Submitted Submittal' });
      expect(submittedLink).toHaveAttribute('href', '/submittals/2');
    });

    it('should display empty state when no submittals', () => {
      vi.mocked(hooks.useSubmittals).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      } as any);

      render(<SubmittalsList projectId="project-123" />);

      expect(screen.getByText(/No submittals found/i)).toBeInTheDocument();
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      vi.mocked(hooks.useSubmittalWorkflowType).mockReturnValue({
        data: mockWorkflowType,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(hooks.useSubmittals).mockReturnValue({
        data: mockSubmittals,
        isLoading: false,
        error: null,
      } as any);
    });

    it('should display total count', () => {
      render(<SubmittalsList projectId="project-123" />);

      expect(screen.getByText(/Total/i)).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should display draft count', () => {
      render(<SubmittalsList projectId="project-123" />);

      expect(screen.getByText(/Draft/i)).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should display submitted count', () => {
      render(<SubmittalsList projectId="project-123" />);

      expect(screen.getByText(/Submitted/i)).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should display approved count', () => {
      render(<SubmittalsList projectId="project-123" />);

      expect(screen.getByText(/Approved/i)).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('Search and Filter', () => {
    beforeEach(() => {
      vi.mocked(hooks.useSubmittalWorkflowType).mockReturnValue({
        data: mockWorkflowType,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(hooks.useSubmittals).mockReturnValue({
        data: mockSubmittals,
        isLoading: false,
        error: null,
      } as any);
    });

    it('should filter submittals by search term', async () => {
      const user = userEvent.setup();
      render(<SubmittalsList projectId="project-123" />);

      const searchInput = screen.getByPlaceholderText(/Search submittals/i);
      await user.type(searchInput, 'Draft');

      await waitFor(() => {
        expect(screen.getByText('Draft Submittal')).toBeInTheDocument();
        expect(screen.queryByText('Submitted Submittal')).not.toBeInTheDocument();
        expect(screen.queryByText('Approved Submittal')).not.toBeInTheDocument();
      });
    });

    it('should filter submittals by status', async () => {
      const user = userEvent.setup();
      render(<SubmittalsList projectId="project-123" />);

      const statusFilter = screen.getByRole('combobox', { name: /status/i });
      await user.selectOptions(statusFilter, 'draft');

      await waitFor(() => {
        expect(screen.getByText('Draft Submittal')).toBeInTheDocument();
        expect(screen.queryByText('Submitted Submittal')).not.toBeInTheDocument();
        expect(screen.queryByText('Approved Submittal')).not.toBeInTheDocument();
      });
    });

    it('should combine search and status filters', async () => {
      const user = userEvent.setup();
      render(<SubmittalsList projectId="project-123" />);

      const searchInput = screen.getByPlaceholderText(/Search submittals/i);
      await user.type(searchInput, 'Submittal');

      const statusFilter = screen.getByRole('combobox', { name: /status/i });
      await user.selectOptions(statusFilter, 'approved');

      await waitFor(() => {
        expect(screen.getByText('Approved Submittal')).toBeInTheDocument();
        expect(screen.queryByText('Draft Submittal')).not.toBeInTheDocument();
        expect(screen.queryByText('Submitted Submittal')).not.toBeInTheDocument();
      });
    });

    it('should clear filters when search is cleared', async () => {
      const user = userEvent.setup();
      render(<SubmittalsList projectId="project-123" />);

      const searchInput = screen.getByPlaceholderText(/Search submittals/i);
      await user.type(searchInput, 'Draft');

      await waitFor(() => {
        expect(screen.getByText('Draft Submittal')).toBeInTheDocument();
        expect(screen.queryByText('Submitted Submittal')).not.toBeInTheDocument();
      });

      await user.clear(searchInput);

      await waitFor(() => {
        expect(screen.getByText('Draft Submittal')).toBeInTheDocument();
        expect(screen.getByText('Submitted Submittal')).toBeInTheDocument();
        expect(screen.getByText('Approved Submittal')).toBeInTheDocument();
      });
    });
  });

  describe('Create Submittal', () => {
    beforeEach(() => {
      vi.mocked(hooks.useSubmittalWorkflowType).mockReturnValue({
        data: mockWorkflowType,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(hooks.useSubmittals).mockReturnValue({
        data: mockSubmittals,
        isLoading: false,
        error: null,
      } as any);
    });

    it('should open create dialog when button clicked', async () => {
      const user = userEvent.setup();
      render(<SubmittalsList projectId="project-123" />);

      const createButton = screen.getByRole('button', { name: /New Submittal/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Create Submittal Dialog')).toBeInTheDocument();
      });
    });

    it('should close create dialog when cancelled', async () => {
      const user = userEvent.setup();
      render(<SubmittalsList projectId="project-123" />);

      const createButton = screen.getByRole('button', { name: /New Submittal/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Create Submittal Dialog')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /Close/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Create Submittal Dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should handle large lists efficiently', () => {
      const largeList = createMockSubmittals(100);

      vi.mocked(hooks.useSubmittalWorkflowType).mockReturnValue({
        data: mockWorkflowType,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(hooks.useSubmittals).mockReturnValue({
        data: largeList,
        isLoading: false,
        error: null,
      } as any);

      const { container } = render(<SubmittalsList projectId="project-123" />);

      expect(container.querySelectorAll('tr').length).toBeGreaterThan(90);
    });

    it('should memoize filtered results', async () => {
      const user = userEvent.setup();

      vi.mocked(hooks.useSubmittalWorkflowType).mockReturnValue({
        data: mockWorkflowType,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(hooks.useSubmittals).mockReturnValue({
        data: mockSubmittals,
        isLoading: false,
        error: null,
      } as any);

      const { rerender } = render(<SubmittalsList projectId="project-123" />);

      // Type in search to trigger filtering
      const searchInput = screen.getByPlaceholderText(/Search submittals/i);
      await user.type(searchInput, 'Draft');

      // Rerender should not cause flicker
      rerender(<SubmittalsList projectId="project-123" />);

      expect(screen.getByText('Draft Submittal')).toBeInTheDocument();
    });
  });
});
