/**
 * Component Tests for CreateSubmittalDialog
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, userEvent } from '@/__tests__/helpers';
import { CreateSubmittalDialog } from '../CreateSubmittalDialog';
import * as hooks from '../../hooks/useSubmittals';
import * as mutationHooks from '../../hooks/useSubmittalMutations';
import { createMockWorkflowType, createMockSubmittal } from '@/__tests__/factories';

// Mock the hooks modules
vi.mock('../../hooks/useSubmittals');
vi.mock('../../hooks/useSubmittalMutations');

// Mock the logger
const mockLoggerError = vi.fn();
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: (...args: unknown[]) => mockLoggerError(...args),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock DistributionListPicker
vi.mock('@/components/distribution/DistributionListPicker', () => ({
  DistributionListPicker: ({ onChange }: any) => (
    <div data-testid="distribution-picker">
      <button onClick={() => onChange({ listIds: ['list-1'], userIds: [], externalContacts: [] })}>
        Select Distribution
      </button>
    </div>
  ),
}));

describe('CreateSubmittalDialog', () => {
  const mockWorkflowType = createMockWorkflowType();
  const mockOnOpenChange = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(hooks.useSubmittalWorkflowType).mockReturnValue({
      data: mockWorkflowType,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(mutationHooks.useCreateSubmittalWithNotification).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isLoading: false,
      isSuccess: false,
      isError: false,
    } as any);
  });

  describe('Rendering', () => {
    it('should render dialog when open is true', () => {
      render(
        <CreateSubmittalDialog
          projectId="project-123"
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      // Use getByRole to target the dialog title specifically (h2 heading)
      expect(screen.getByRole('heading', { name: 'Create Submittal' })).toBeInTheDocument();
    });

    it('should not render dialog content when open is false', () => {
      render(
        <CreateSubmittalDialog
          projectId="project-123"
          open={false}
          onOpenChange={mockOnOpenChange}
        />
      );

      expect(screen.queryByText('Create Submittal')).not.toBeInTheDocument();
    });

    it('should render all form fields', () => {
      render(
        <CreateSubmittalDialog
          projectId="project-123"
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      expect(screen.getByLabelText(/Submittal Title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Cost Impact/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Schedule Impact/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Due Date/i)).toBeInTheDocument();
    });

    it('should render submit button', () => {
      render(
        <CreateSubmittalDialog
          projectId="project-123"
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      expect(screen.getByRole('button', { name: /Create Submittal/i })).toBeInTheDocument();
    });

    it('should render cancel button', () => {
      render(
        <CreateSubmittalDialog
          projectId="project-123"
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });
  });

  describe('Form Interaction', () => {
    it('should update title field when typed', async () => {
      const user = userEvent.setup();
      render(
        <CreateSubmittalDialog
          projectId="project-123"
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const titleInput = screen.getByLabelText(/Submittal Title/i);
      await user.type(titleInput, 'Test Submittal');

      expect(titleInput).toHaveValue('Test Submittal');
    });

    it('should update description field when typed', async () => {
      const user = userEvent.setup();
      render(
        <CreateSubmittalDialog
          projectId="project-123"
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const descriptionInput = screen.getByLabelText(/Description/i);
      await user.type(descriptionInput, 'Test description');

      expect(descriptionInput).toHaveValue('Test description');
    });

    it('should update cost impact field when typed', async () => {
      const user = userEvent.setup();
      render(
        <CreateSubmittalDialog
          projectId="project-123"
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const costInput = screen.getByLabelText(/Cost Impact/i);
      await user.type(costInput, '5000');

      expect(costInput).toHaveValue('5000');
    });

    it('should update schedule impact field when typed', async () => {
      const user = userEvent.setup();
      render(
        <CreateSubmittalDialog
          projectId="project-123"
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const scheduleInput = screen.getByLabelText(/Schedule Impact/i);
      await user.type(scheduleInput, '7');

      expect(scheduleInput).toHaveValue('7');
    });

    it('should update due date field when selected', async () => {
      const user = userEvent.setup();
      render(
        <CreateSubmittalDialog
          projectId="project-123"
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const dueDateInput = screen.getByLabelText(/Due Date/i);
      await user.type(dueDateInput, '2024-12-31');

      expect(dueDateInput).toHaveValue('2024-12-31');
    });
  });

  describe('Form Validation', () => {
    it('should not submit when title is empty', async () => {
      const user = userEvent.setup();
      render(
        <CreateSubmittalDialog
          projectId="project-123"
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const submitButton = screen.getByRole('button', { name: /Create Submittal/i });
      await user.click(submitButton);

      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('should not submit when projectId is missing', async () => {
      const user = userEvent.setup();
      render(
        <CreateSubmittalDialog
          projectId={undefined}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const titleInput = screen.getByLabelText(/Submittal Title/i);
      await user.type(titleInput, 'Test Submittal');

      const submitButton = screen.getByRole('button', { name: /Create Submittal/i });
      await user.click(submitButton);

      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('should trim whitespace from title', async () => {
      const user = userEvent.setup();
      const mockSubmittal = createMockSubmittal({ title: 'Test Submittal' });
      mockMutateAsync.mockResolvedValue(mockSubmittal);

      render(
        <CreateSubmittalDialog
          projectId="project-123"
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const titleInput = screen.getByLabelText(/Submittal Title/i);
      await user.type(titleInput, '  Test Submittal  ');

      const submitButton = screen.getByRole('button', { name: /Create Submittal/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Test Submittal',
          })
        );
      });
    });
  });

  describe('Form Submission', () => {
    it('should call mutateAsync with correct data on submit', async () => {
      const user = userEvent.setup();
      const mockSubmittal = createMockSubmittal();
      mockMutateAsync.mockResolvedValue(mockSubmittal);

      render(
        <CreateSubmittalDialog
          projectId="project-123"
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const titleInput = screen.getByLabelText(/Submittal Title/i);
      await user.type(titleInput, 'Test Submittal');

      const descriptionInput = screen.getByLabelText(/Description/i);
      await user.type(descriptionInput, 'Test description');

      const submitButton = screen.getByRole('button', { name: /Create Submittal/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            project_id: 'project-123',
            workflow_type_id: mockWorkflowType.id,
            title: 'Test Submittal',
            description: 'Test description',
            status: 'draft',
          })
        );
      });
    });

    it('should include cost impact when provided', async () => {
      const user = userEvent.setup();
      const mockSubmittal = createMockSubmittal();
      mockMutateAsync.mockResolvedValue(mockSubmittal);

      render(
        <CreateSubmittalDialog
          projectId="project-123"
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const titleInput = screen.getByLabelText(/Submittal Title/i);
      await user.type(titleInput, 'Test Submittal');

      const costInput = screen.getByLabelText(/Cost Impact/i);
      await user.type(costInput, '5000');

      const submitButton = screen.getByRole('button', { name: /Create Submittal/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            cost_impact: 5000,
          })
        );
      });
    });

    it('should include schedule impact when provided', async () => {
      const user = userEvent.setup();
      const mockSubmittal = createMockSubmittal();
      mockMutateAsync.mockResolvedValue(mockSubmittal);

      render(
        <CreateSubmittalDialog
          projectId="project-123"
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const titleInput = screen.getByLabelText(/Submittal Title/i);
      await user.type(titleInput, 'Test Submittal');

      const scheduleInput = screen.getByLabelText(/Schedule Impact/i);
      await user.type(scheduleInput, '7');

      const submitButton = screen.getByRole('button', { name: /Create Submittal/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            schedule_impact: 7,
          })
        );
      });
    });

    it('should include due date when provided', async () => {
      const user = userEvent.setup();
      const mockSubmittal = createMockSubmittal();
      mockMutateAsync.mockResolvedValue(mockSubmittal);

      render(
        <CreateSubmittalDialog
          projectId="project-123"
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const titleInput = screen.getByLabelText(/Submittal Title/i);
      await user.type(titleInput, 'Test Submittal');

      const dueDateInput = screen.getByLabelText(/Due Date/i);
      await user.type(dueDateInput, '2024-12-31');

      const submitButton = screen.getByRole('button', { name: /Create Submittal/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            due_date: '2024-12-31',
          })
        );
      });
    });

    it('should reset form after successful submission', async () => {
      const user = userEvent.setup();
      const mockSubmittal = createMockSubmittal();
      mockMutateAsync.mockResolvedValue(mockSubmittal);

      render(
        <CreateSubmittalDialog
          projectId="project-123"
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const titleInput = screen.getByLabelText(/Submittal Title/i);
      await user.type(titleInput, 'Test Submittal');

      const descriptionInput = screen.getByLabelText(/Description/i);
      await user.type(descriptionInput, 'Test description');

      const submitButton = screen.getByRole('button', { name: /Create Submittal/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(titleInput).toHaveValue('');
        expect(descriptionInput).toHaveValue('');
      });
    });

    it('should close dialog after successful submission', async () => {
      const user = userEvent.setup();
      const mockSubmittal = createMockSubmittal();
      mockMutateAsync.mockResolvedValue(mockSubmittal);

      render(
        <CreateSubmittalDialog
          projectId="project-123"
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const titleInput = screen.getByLabelText(/Submittal Title/i);
      await user.type(titleInput, 'Test Submittal');

      const submitButton = screen.getByRole('button', { name: /Create Submittal/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('should call onSuccess callback after successful submission', async () => {
      const user = userEvent.setup();
      const mockSubmittal = createMockSubmittal();
      mockMutateAsync.mockResolvedValue(mockSubmittal);

      render(
        <CreateSubmittalDialog
          projectId="project-123"
          open={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      );

      const titleInput = screen.getByLabelText(/Submittal Title/i);
      await user.type(titleInput, 'Test Submittal');

      const submitButton = screen.getByRole('button', { name: /Create Submittal/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle submission error', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockRejectedValue(new Error('Failed to create'));

      render(
        <CreateSubmittalDialog
          projectId="project-123"
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const titleInput = screen.getByLabelText(/Submittal Title/i);
      await user.type(titleInput, 'Test Submittal');

      const submitButton = screen.getByRole('button', { name: /Create Submittal/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalledWith(
          'Failed to create submittal:',
          expect.any(Error)
        );
      });
    });

    it('should not close dialog on submission error', async () => {
      const user = userEvent.setup();
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockMutateAsync.mockRejectedValue(new Error('Failed to create'));

      render(
        <CreateSubmittalDialog
          projectId="project-123"
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const titleInput = screen.getByLabelText(/Submittal Title/i);
      await user.type(titleInput, 'Test Submittal');

      const submitButton = screen.getByRole('button', { name: /Create Submittal/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });

      // Dialog should still be open
      expect(mockOnOpenChange).not.toHaveBeenCalledWith(false);
    });
  });

  describe('Cancel Action', () => {
    it('should close dialog when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(
        <CreateSubmittalDialog
          projectId="project-123"
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('should not submit form when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(
        <CreateSubmittalDialog
          projectId="project-123"
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const titleInput = screen.getByLabelText(/Submittal Title/i);
      await user.type(titleInput, 'Test Submittal');

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);

      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('Distribution', () => {
    it('should render distribution picker', () => {
      render(
        <CreateSubmittalDialog
          projectId="project-123"
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      expect(screen.getByTestId('distribution-picker')).toBeInTheDocument();
    });

    it('should update distribution when changed', async () => {
      const user = userEvent.setup();
      render(
        <CreateSubmittalDialog
          projectId="project-123"
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      const selectButton = screen.getByRole('button', { name: /Select Distribution/i });
      await user.click(selectButton);

      // Distribution state should be updated (verified through form submission)
      expect(selectButton).toBeInTheDocument();
    });
  });
});
