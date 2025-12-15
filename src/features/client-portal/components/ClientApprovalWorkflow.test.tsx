/**
 * Client Approval Workflow Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClientApprovalWorkflow } from './ClientApprovalWorkflow';
import type { PublicApprovalPageData, SubmitClientApprovalInput } from '@/types/approval-workflow';

// Mock data factory
const createMockPageData = (overrides?: Partial<PublicApprovalPageData>): PublicApprovalPageData => ({
  link: {
    id: 'link-1',
    approval_request_id: 'request-1',
    token: 'test_token',
    link_type: 'single_use',
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    max_uses: 1,
    current_uses: 0,
    client_email: null,
    client_name: null,
    ip_restrictions: null,
    require_email_verification: false,
    created_at: new Date().toISOString(),
    created_by: 'user-1',
    last_accessed_at: null,
    revoked_at: null,
    revoked_by: null,
    access_log: [],
  },
  request: {
    id: 'request-1',
    workflow_id: 'workflow-1',
    entity_type: 'change_order',
    entity_id: 'co-1',
    current_step: 1,
    status: 'pending',
    conditions: null,
    initiated_by: 'user-1',
    initiated_at: new Date().toISOString(),
    completed_at: null,
    project_id: 'project-1',
  },
  workflow: {
    id: 'workflow-1',
    name: 'Change Order Approval',
    description: 'Standard change order approval workflow',
    company_id: 'company-1',
    workflow_type: 'change_order',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  entity_details: {
    type: 'change_order',
    name: 'CO-001: Additional Foundation Work',
    description: 'Extra work required due to soil conditions',
    reference_number: 'CO-001',
    amount: 25000,
    attachments: [],
  },
  project: {
    id: 'project-1',
    name: 'Test Project',
    company_name: 'Test Company',
  },
  ...overrides,
});

describe('ClientApprovalWorkflow', () => {
  let mockOnSubmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSubmit = vi.fn().mockResolvedValue(undefined);
  });

  describe('Rendering', () => {
    it('should render entity details', () => {
      const data = createMockPageData();
      render(<ClientApprovalWorkflow data={data} onSubmit={mockOnSubmit} />);

      expect(screen.getByText('CO-001: Additional Foundation Work')).toBeInTheDocument();
      expect(screen.getByText('Test Company')).toBeInTheDocument();
      expect(screen.getByText('Project: Test Project')).toBeInTheDocument();
    });

    it('should render decision buttons', () => {
      const data = createMockPageData();
      render(<ClientApprovalWorkflow data={data} onSubmit={mockOnSubmit} />);

      expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /request changes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
    });

    it('should render form fields', () => {
      const data = createMockPageData();
      render(<ClientApprovalWorkflow data={data} onSubmit={mockOnSubmit} />);

      expect(screen.getByPlaceholderText(/john smith/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/john@example.com/i)).toBeInTheDocument();
    });

    it('should display pending approval status', () => {
      const data = createMockPageData();
      render(<ClientApprovalWorkflow data={data} onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Pending Approval')).toBeInTheDocument();
    });

    it('should display expiration date', () => {
      const data = createMockPageData();
      render(<ClientApprovalWorkflow data={data} onSubmit={mockOnSubmit} />);

      expect(screen.getByText(/expires on/i)).toBeInTheDocument();
    });

    it('should display single-use link notice', () => {
      const data = createMockPageData();
      render(<ClientApprovalWorkflow data={data} onSubmit={mockOnSubmit} />);

      expect(screen.getByText(/single-use link/i)).toBeInTheDocument();
    });

    it('should show amount for change orders', () => {
      const data = createMockPageData();
      render(<ClientApprovalWorkflow data={data} onSubmit={mockOnSubmit} />);

      expect(screen.getByText('$25,000')).toBeInTheDocument();
    });

    it('should show reference number', () => {
      const data = createMockPageData();
      render(<ClientApprovalWorkflow data={data} onSubmit={mockOnSubmit} />);

      expect(screen.getByText('CO-001')).toBeInTheDocument();
    });
  });

  describe('Pre-populated Fields', () => {
    it('should pre-fill client name from link', () => {
      const data = createMockPageData({
        link: {
          ...createMockPageData().link,
          client_name: 'John Client',
        },
      });
      render(<ClientApprovalWorkflow data={data} onSubmit={mockOnSubmit} />);

      const nameInput = screen.getByPlaceholderText(/john smith/i) as HTMLInputElement;
      expect(nameInput.value).toBe('John Client');
    });

    it('should pre-fill client email from link', () => {
      const data = createMockPageData({
        link: {
          ...createMockPageData().link,
          client_email: 'john@client.com',
        },
      });
      render(<ClientApprovalWorkflow data={data} onSubmit={mockOnSubmit} />);

      const emailInput = screen.getByPlaceholderText(/john@example.com/i) as HTMLInputElement;
      expect(emailInput.value).toBe('john@client.com');
    });
  });

  describe('Existing Response', () => {
    it('should show existing response when already submitted', () => {
      const data = createMockPageData({
        existing_response: {
          id: 'response-1',
          public_link_id: 'link-1',
          approval_request_id: 'request-1',
          decision: 'approved',
          comments: 'Looks good!',
          conditions: null,
          client_name: 'Test Client',
          client_email: 'client@test.com',
          client_company: null,
          client_title: null,
          signature_data: null,
          signed_at: null,
          attachment_ids: null,
          submitted_from_ip: null,
          user_agent: null,
          submitted_at: new Date().toISOString(),
          email_verified: false,
          verification_code: null,
          verification_sent_at: null,
        },
      });
      render(<ClientApprovalWorkflow data={data} onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Response Already Submitted')).toBeInTheDocument();
      expect(screen.getByText('approved')).toBeInTheDocument();
      expect(screen.getByText('Looks good!')).toBeInTheDocument();
    });

    it('should not show form when existing response exists', () => {
      const data = createMockPageData({
        existing_response: {
          id: 'response-1',
          public_link_id: 'link-1',
          approval_request_id: 'request-1',
          decision: 'rejected',
          comments: 'Not acceptable',
          conditions: null,
          client_name: 'Test Client',
          client_email: 'client@test.com',
          client_company: null,
          client_title: null,
          signature_data: null,
          signed_at: null,
          attachment_ids: null,
          submitted_from_ip: null,
          user_agent: null,
          submitted_at: new Date().toISOString(),
          email_verified: false,
          verification_code: null,
          verification_sent_at: null,
        },
      });
      render(<ClientApprovalWorkflow data={data} onSubmit={mockOnSubmit} />);

      expect(screen.queryByRole('button', { name: /submit response/i })).not.toBeInTheDocument();
    });
  });

  describe('Decision Selection', () => {
    it('should select approval decision when clicked', async () => {
      const user = userEvent.setup();
      const data = createMockPageData();
      render(<ClientApprovalWorkflow data={data} onSubmit={mockOnSubmit} />);

      const approveButton = screen.getAllByRole('button').find(
        (btn) => btn.textContent?.includes('Approve') && !btn.textContent?.includes('Request')
      );
      await user.click(approveButton!);

      // Should apply selected style (green border)
      expect(approveButton).toHaveClass('border-green-500');
    });

    it('should select rejection decision when clicked', async () => {
      const user = userEvent.setup();
      const data = createMockPageData();
      render(<ClientApprovalWorkflow data={data} onSubmit={mockOnSubmit} />);

      const rejectButton = screen.getByRole('button', { name: /^reject$/i });
      await user.click(rejectButton);

      expect(rejectButton).toHaveClass('border-red-500');
    });

    it('should select changes requested decision when clicked', async () => {
      const user = userEvent.setup();
      const data = createMockPageData();
      render(<ClientApprovalWorkflow data={data} onSubmit={mockOnSubmit} />);

      const changesButton = screen.getByRole('button', { name: /request changes/i });
      await user.click(changesButton);

      expect(changesButton).toHaveClass('border-yellow-500');
    });

    it('should show conditions field for approved decision', async () => {
      const user = userEvent.setup();
      const data = createMockPageData();
      render(<ClientApprovalWorkflow data={data} onSubmit={mockOnSubmit} />);

      const approveButton = screen.getAllByRole('button').find(
        (btn) => btn.textContent?.includes('Approve') && !btn.textContent?.includes('Request')
      );
      await user.click(approveButton!);

      expect(screen.getByText(/conditions \(optional\)/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show error when submitting without decision', async () => {
      const user = userEvent.setup();
      const data = createMockPageData();
      render(<ClientApprovalWorkflow data={data} onSubmit={mockOnSubmit} />);

      // Fill required fields but no decision
      await user.type(screen.getByPlaceholderText(/john smith/i), 'Test User');
      await user.type(screen.getByPlaceholderText(/john@example.com/i), 'test@example.com');

      // Submit button should be disabled without decision
      const submitButton = screen.getByRole('button', { name: /submit response/i });
      expect(submitButton).toBeDisabled();
    });

    it('should show error for empty name', async () => {
      const user = userEvent.setup();
      const data = createMockPageData();
      render(<ClientApprovalWorkflow data={data} onSubmit={mockOnSubmit} />);

      // Select decision
      const approveButton = screen.getAllByRole('button').find(
        (btn) => btn.textContent?.includes('Approve') && !btn.textContent?.includes('Request')
      );
      await user.click(approveButton!);

      // Fill email but not name
      await user.type(screen.getByPlaceholderText(/john@example.com/i), 'test@example.com');

      // Submit
      const submitButton = screen.getByRole('button', { name: /submit response/i });
      await user.click(submitButton);

      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });

    it('should show error for invalid email', async () => {
      const user = userEvent.setup();
      const data = createMockPageData();
      render(<ClientApprovalWorkflow data={data} onSubmit={mockOnSubmit} />);

      // Select decision
      const approveButton = screen.getAllByRole('button').find(
        (btn) => btn.textContent?.includes('Approve') && !btn.textContent?.includes('Request')
      );
      await user.click(approveButton!);

      // Fill invalid email
      await user.type(screen.getByPlaceholderText(/john smith/i), 'Test User');
      await user.type(screen.getByPlaceholderText(/john@example.com/i), 'invalid-email');

      // Submit
      const submitButton = screen.getByRole('button', { name: /submit response/i });
      await user.click(submitButton);

      expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
    });

    it('should require comments for changes requested', async () => {
      const user = userEvent.setup();
      const data = createMockPageData();
      render(<ClientApprovalWorkflow data={data} onSubmit={mockOnSubmit} />);

      // Select changes requested
      const changesButton = screen.getByRole('button', { name: /request changes/i });
      await user.click(changesButton);

      // Fill required fields but no comments
      await user.type(screen.getByPlaceholderText(/john smith/i), 'Test User');
      await user.type(screen.getByPlaceholderText(/john@example.com/i), 'test@example.com');

      // Submit
      const submitButton = screen.getByRole('button', { name: /submit response/i });
      await user.click(submitButton);

      expect(screen.getByText(/describe the changes/i)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should submit approval successfully', async () => {
      const user = userEvent.setup();
      const data = createMockPageData();
      render(<ClientApprovalWorkflow data={data} onSubmit={mockOnSubmit} />);

      // Select approve
      const approveButton = screen.getAllByRole('button').find(
        (btn) => btn.textContent?.includes('Approve') && !btn.textContent?.includes('Request')
      );
      await user.click(approveButton!);

      // Fill form
      await user.type(screen.getByPlaceholderText(/john smith/i), 'Test User');
      await user.type(screen.getByPlaceholderText(/john@example.com/i), 'test@example.com');

      // Submit
      const submitButton = screen.getByRole('button', { name: /submit response/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            public_link_id: 'link-1',
            decision: 'approved',
            client_name: 'Test User',
            client_email: 'test@example.com',
          })
        );
      });
    });

    it('should submit with conditions', async () => {
      const user = userEvent.setup();
      const data = createMockPageData();
      render(<ClientApprovalWorkflow data={data} onSubmit={mockOnSubmit} />);

      // Select approve
      const approveButton = screen.getAllByRole('button').find(
        (btn) => btn.textContent?.includes('Approve') && !btn.textContent?.includes('Request')
      );
      await user.click(approveButton!);

      // Fill form
      await user.type(screen.getByPlaceholderText(/john smith/i), 'Test User');
      await user.type(screen.getByPlaceholderText(/john@example.com/i), 'test@example.com');
      await user.type(screen.getByPlaceholderText(/conditions/i), 'Subject to review');

      // Submit
      const submitButton = screen.getByRole('button', { name: /submit response/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            decision: 'approved',
            conditions: 'Subject to review',
          })
        );
      });
    });

    it('should submit rejection with comments', async () => {
      const user = userEvent.setup();
      const data = createMockPageData();
      render(<ClientApprovalWorkflow data={data} onSubmit={mockOnSubmit} />);

      // Select reject
      const rejectButton = screen.getByRole('button', { name: /^reject$/i });
      await user.click(rejectButton);

      // Fill form
      await user.type(screen.getByPlaceholderText(/john smith/i), 'Test User');
      await user.type(screen.getByPlaceholderText(/john@example.com/i), 'test@example.com');
      await user.type(screen.getByRole('textbox', { name: /comments/i }), 'Cannot approve this');

      // Submit
      const submitButton = screen.getByRole('button', { name: /submit response/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            decision: 'rejected',
            comments: 'Cannot approve this',
          })
        );
      });
    });

    it('should disable form while submitting', async () => {
      const user = userEvent.setup();
      const data = createMockPageData();

      // Make submit slow
      mockOnSubmit.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 1000)));

      render(<ClientApprovalWorkflow data={data} onSubmit={mockOnSubmit} isSubmitting />);

      // Form inputs should be disabled
      expect(screen.getByPlaceholderText(/john smith/i)).toBeDisabled();
      expect(screen.getByPlaceholderText(/john@example.com/i)).toBeDisabled();
    });

    it('should show loading state while submitting', () => {
      const data = createMockPageData();
      render(<ClientApprovalWorkflow data={data} onSubmit={mockOnSubmit} isSubmitting />);

      expect(screen.getByText(/submitting/i)).toBeInTheDocument();
    });
  });

  describe('Signature Capture', () => {
    it('should render signature canvas', () => {
      const data = createMockPageData();
      render(<ClientApprovalWorkflow data={data} onSubmit={mockOnSubmit} />);

      expect(screen.getByText(/signature \(optional\)/i)).toBeInTheDocument();
    });

    it('should have clear signature button', () => {
      const data = createMockPageData();
      render(<ClientApprovalWorkflow data={data} onSubmit={mockOnSubmit} />);

      expect(screen.getByRole('button', { name: /clear signature/i })).toBeInTheDocument();
    });
  });

  describe('Attachments', () => {
    it('should display attachments when provided', () => {
      const data = createMockPageData({
        entity_details: {
          ...createMockPageData().entity_details,
          attachments: [
            { id: '1', name: 'Document.pdf', url: '/docs/1.pdf', type: 'application/pdf' },
            { id: '2', name: 'Drawing.dwg', url: '/docs/2.dwg', type: 'application/dwg' },
          ],
        },
      });
      render(<ClientApprovalWorkflow data={data} onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Document.pdf')).toBeInTheDocument();
      expect(screen.getByText('Drawing.dwg')).toBeInTheDocument();
    });

    it('should not show attachments section when empty', () => {
      const data = createMockPageData({
        entity_details: {
          ...createMockPageData().entity_details,
          attachments: [],
        },
      });
      render(<ClientApprovalWorkflow data={data} onSubmit={mockOnSubmit} />);

      expect(screen.queryByText('Attachments')).not.toBeInTheDocument();
    });
  });
});
