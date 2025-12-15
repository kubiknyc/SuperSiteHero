/**
 * Public Approval Links Hooks Tests
 *
 * Unit tests for the public approval link hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/lib/notifications/ToastContext';
import {
  usePublicApprovalLinks,
  useCreatePublicApprovalLink,
  useRevokePublicApprovalLink,
  useValidatePublicApprovalToken,
  usePublicApprovalPageData,
  useSubmitClientApprovalResponse,
  usePublicApprovalLinkManager,
  usePublicApprovalPage,
} from './usePublicApprovalLinks';
import { publicApprovalsApi } from '@/lib/api/services/public-approvals';
import type {
  PublicApprovalLink,
  PublicApprovalPageData,
  PublicLinkValidation,
  ClientApprovalResponse,
} from '@/types/approval-workflow';

// Mock the API module
vi.mock('@/lib/api/services/public-approvals', () => ({
  publicApprovalsApi: {
    createPublicApprovalLink: vi.fn(),
    getPublicApprovalLinks: vi.fn(),
    revokePublicApprovalLink: vi.fn(),
    sendApprovalLinkEmail: vi.fn(),
    getClientApprovalResponses: vi.fn(),
    validatePublicApprovalToken: vi.fn(),
    getPublicApprovalPageData: vi.fn(),
    submitClientApprovalResponse: vi.fn(),
  },
}));

// Mock toast context
vi.mock('@/lib/notifications/ToastContext', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Test data factories
const createMockLink = (overrides?: Partial<PublicApprovalLink>): PublicApprovalLink => ({
  id: 'link-1',
  approval_request_id: 'request-1',
  token: 'test_token_abc123',
  link_type: 'single_use',
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  max_uses: 1,
  current_uses: 0,
  client_email: 'client@example.com',
  client_name: 'Test Client',
  ip_restrictions: null,
  require_email_verification: false,
  created_at: new Date().toISOString(),
  created_by: 'user-1',
  last_accessed_at: null,
  revoked_at: null,
  revoked_by: null,
  access_log: [],
  ...overrides,
});

const createMockPageData = (overrides?: Partial<PublicApprovalPageData>): PublicApprovalPageData => ({
  link: createMockLink(),
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

const createMockValidation = (overrides?: Partial<PublicLinkValidation>): PublicLinkValidation => ({
  is_valid: true,
  link_id: 'link-1',
  approval_request_id: 'request-1',
  remaining_uses: 1,
  error_message: null,
  ...overrides,
});

const createMockResponse = (overrides?: Partial<ClientApprovalResponse>): ClientApprovalResponse => ({
  id: 'response-1',
  public_link_id: 'link-1',
  approval_request_id: 'request-1',
  decision: 'approved',
  comments: null,
  conditions: null,
  client_name: 'Test Client',
  client_email: 'client@example.com',
  client_company: 'Client Co',
  client_title: 'Project Manager',
  signature_data: null,
  signed_at: new Date().toISOString(),
  attachment_ids: null,
  submitted_from_ip: '127.0.0.1',
  user_agent: 'Test Browser',
  submitted_at: new Date().toISOString(),
  email_verified: false,
  verification_code: null,
  verification_sent_at: null,
  ...overrides,
});

// Test wrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('Public Approval Link Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('usePublicApprovalLinks', () => {
    it('should fetch links for an approval request', async () => {
      const mockLinks = [createMockLink(), createMockLink({ id: 'link-2' })];
      vi.mocked(publicApprovalsApi.getPublicApprovalLinks).mockResolvedValue(mockLinks);

      const { result } = renderHook(
        () => usePublicApprovalLinks('request-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockLinks);
      expect(publicApprovalsApi.getPublicApprovalLinks).toHaveBeenCalledWith('request-1');
    });

    it('should not fetch when approvalRequestId is undefined', async () => {
      const { result } = renderHook(
        () => usePublicApprovalLinks(undefined),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));

      expect(publicApprovalsApi.getPublicApprovalLinks).not.toHaveBeenCalled();
    });

    it('should handle fetch error', async () => {
      vi.mocked(publicApprovalsApi.getPublicApprovalLinks).mockRejectedValue(
        new Error('Network error')
      );

      const { result } = renderHook(
        () => usePublicApprovalLinks('request-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useCreatePublicApprovalLink', () => {
    it('should create a new approval link', async () => {
      const mockLink = createMockLink();
      vi.mocked(publicApprovalsApi.createPublicApprovalLink).mockResolvedValue(mockLink);

      const { result } = renderHook(
        () => useCreatePublicApprovalLink(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.mutateAsync({
          approval_request_id: 'request-1',
          client_email: 'client@example.com',
          link_type: 'single_use',
        });
      });

      expect(publicApprovalsApi.createPublicApprovalLink).toHaveBeenCalledWith({
        approval_request_id: 'request-1',
        client_email: 'client@example.com',
        link_type: 'single_use',
      });
    });

    it('should handle creation error', async () => {
      vi.mocked(publicApprovalsApi.createPublicApprovalLink).mockRejectedValue(
        new Error('Failed to create')
      );

      const { result } = renderHook(
        () => useCreatePublicApprovalLink(),
        { wrapper: createWrapper() }
      );

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            approval_request_id: 'request-1',
          });
        })
      ).rejects.toThrow('Failed to create');
    });
  });

  describe('useRevokePublicApprovalLink', () => {
    it('should revoke an approval link', async () => {
      vi.mocked(publicApprovalsApi.revokePublicApprovalLink).mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useRevokePublicApprovalLink(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.mutateAsync({
          linkId: 'link-1',
          approvalRequestId: 'request-1',
        });
      });

      expect(publicApprovalsApi.revokePublicApprovalLink).toHaveBeenCalledWith('link-1');
    });
  });

  describe('useValidatePublicApprovalToken', () => {
    it('should validate a token', async () => {
      const mockValidation = createMockValidation();
      vi.mocked(publicApprovalsApi.validatePublicApprovalToken).mockResolvedValue(mockValidation);

      const { result } = renderHook(
        () => useValidatePublicApprovalToken('test_token'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockValidation);
      expect(publicApprovalsApi.validatePublicApprovalToken).toHaveBeenCalledWith('test_token');
    });

    it('should return invalid validation for bad token', async () => {
      const mockValidation = createMockValidation({
        is_valid: false,
        error_message: 'Token expired',
      });
      vi.mocked(publicApprovalsApi.validatePublicApprovalToken).mockResolvedValue(mockValidation);

      const { result } = renderHook(
        () => useValidatePublicApprovalToken('expired_token'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.is_valid).toBe(false);
      expect(result.current.data?.error_message).toBe('Token expired');
    });

    it('should not validate when token is undefined', async () => {
      const { result } = renderHook(
        () => useValidatePublicApprovalToken(undefined),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));

      expect(publicApprovalsApi.validatePublicApprovalToken).not.toHaveBeenCalled();
    });
  });

  describe('usePublicApprovalPageData', () => {
    it('should fetch page data for valid token', async () => {
      const mockPageData = createMockPageData();
      vi.mocked(publicApprovalsApi.getPublicApprovalPageData).mockResolvedValue(mockPageData);

      const { result } = renderHook(
        () => usePublicApprovalPageData('valid_token'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockPageData);
      expect(result.current.data?.entity_details.name).toBe('CO-001: Additional Foundation Work');
    });

    it('should return null for invalid token', async () => {
      vi.mocked(publicApprovalsApi.getPublicApprovalPageData).mockResolvedValue(null);

      const { result } = renderHook(
        () => usePublicApprovalPageData('invalid_token'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toBeNull();
    });
  });

  describe('useSubmitClientApprovalResponse', () => {
    it('should submit approval response', async () => {
      const mockResponse = createMockResponse();
      vi.mocked(publicApprovalsApi.submitClientApprovalResponse).mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => useSubmitClientApprovalResponse(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.mutateAsync({
          input: {
            public_link_id: 'link-1',
            decision: 'approved',
            client_name: 'Test Client',
            client_email: 'client@example.com',
          },
          userAgent: 'Test Browser',
        });
      });

      expect(publicApprovalsApi.submitClientApprovalResponse).toHaveBeenCalledWith(
        {
          public_link_id: 'link-1',
          decision: 'approved',
          client_name: 'Test Client',
          client_email: 'client@example.com',
        },
        undefined,
        'Test Browser'
      );
    });

    it('should handle rejection decision', async () => {
      const mockResponse = createMockResponse({ decision: 'rejected' });
      vi.mocked(publicApprovalsApi.submitClientApprovalResponse).mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => useSubmitClientApprovalResponse(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        const response = await result.current.mutateAsync({
          input: {
            public_link_id: 'link-1',
            decision: 'rejected',
            client_name: 'Test Client',
            client_email: 'client@example.com',
            comments: 'Budget concerns',
          },
        });
        expect(response.decision).toBe('rejected');
      });
    });

    it('should handle changes_requested decision', async () => {
      const mockResponse = createMockResponse({
        decision: 'changes_requested',
        comments: 'Please revise scope',
      });
      vi.mocked(publicApprovalsApi.submitClientApprovalResponse).mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => useSubmitClientApprovalResponse(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        const response = await result.current.mutateAsync({
          input: {
            public_link_id: 'link-1',
            decision: 'changes_requested',
            client_name: 'Test Client',
            client_email: 'client@example.com',
            comments: 'Please revise scope',
          },
        });
        expect(response.decision).toBe('changes_requested');
        expect(response.comments).toBe('Please revise scope');
      });
    });

    it('should handle rate limit error', async () => {
      vi.mocked(publicApprovalsApi.submitClientApprovalResponse).mockRejectedValue(
        new Error('Too many requests. Please try again later.')
      );

      const { result } = renderHook(
        () => useSubmitClientApprovalResponse(),
        { wrapper: createWrapper() }
      );

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            input: {
              public_link_id: 'link-1',
              decision: 'approved',
              client_name: 'Test Client',
              client_email: 'client@example.com',
            },
          });
        })
      ).rejects.toThrow('Too many requests');
    });
  });

  describe('usePublicApprovalLinkManager', () => {
    it('should provide all link management operations', async () => {
      const mockLinks = [createMockLink()];
      const mockResponses = [createMockResponse()];
      vi.mocked(publicApprovalsApi.getPublicApprovalLinks).mockResolvedValue(mockLinks);
      vi.mocked(publicApprovalsApi.getClientApprovalResponses).mockResolvedValue(mockResponses);

      const { result } = renderHook(
        () => usePublicApprovalLinkManager('request-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.links).toEqual(mockLinks);
      expect(result.current.responses).toEqual(mockResponses);
      expect(typeof result.current.createLink).toBe('function');
      expect(typeof result.current.revokeLink).toBe('function');
      expect(typeof result.current.sendEmail).toBe('function');
    });

    it('should create link through manager', async () => {
      const mockLink = createMockLink();
      vi.mocked(publicApprovalsApi.getPublicApprovalLinks).mockResolvedValue([]);
      vi.mocked(publicApprovalsApi.getClientApprovalResponses).mockResolvedValue([]);
      vi.mocked(publicApprovalsApi.createPublicApprovalLink).mockResolvedValue(mockLink);

      const { result } = renderHook(
        () => usePublicApprovalLinkManager('request-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.createLink({
          client_email: 'client@example.com',
          link_type: 'single_use',
        });
      });

      expect(publicApprovalsApi.createPublicApprovalLink).toHaveBeenCalledWith({
        approval_request_id: 'request-1',
        client_email: 'client@example.com',
        link_type: 'single_use',
      });
    });
  });

  describe('usePublicApprovalPage', () => {
    it('should provide page data and submit function', async () => {
      const mockPageData = createMockPageData();
      vi.mocked(publicApprovalsApi.getPublicApprovalPageData).mockResolvedValue(mockPageData);

      const { result } = renderHook(
        () => usePublicApprovalPage('valid_token'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockPageData);
      expect(result.current.isValid).toBe(true);
      expect(typeof result.current.submitResponse).toBe('function');
    });

    it('should handle invalid token', async () => {
      vi.mocked(publicApprovalsApi.getPublicApprovalPageData).mockResolvedValue(null);

      const { result } = renderHook(
        () => usePublicApprovalPage('invalid_token'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toBeNull();
      expect(result.current.isValid).toBe(false);
    });

    it('should submit response through page hook', async () => {
      const mockPageData = createMockPageData();
      const mockResponse = createMockResponse();
      vi.mocked(publicApprovalsApi.getPublicApprovalPageData).mockResolvedValue(mockPageData);
      vi.mocked(publicApprovalsApi.submitClientApprovalResponse).mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => usePublicApprovalPage('valid_token'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.submitResponse({
          decision: 'approved',
          client_name: 'Test Client',
          client_email: 'client@example.com',
        });
      });

      // Wait for mutation state to update
      await waitFor(() => expect(result.current.submitSuccess).toBe(true));
      expect(result.current.submittedResponse).toEqual(mockResponse);
    });

    it('should throw error when submitting without valid link', async () => {
      vi.mocked(publicApprovalsApi.getPublicApprovalPageData).mockResolvedValue(null);

      const { result } = renderHook(
        () => usePublicApprovalPage('invalid_token'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        act(async () => {
          await result.current.submitResponse({
            decision: 'approved',
            client_name: 'Test Client',
            client_email: 'client@example.com',
          });
        })
      ).rejects.toThrow('Invalid approval link');
    });
  });
});

describe('Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle link with existing response', async () => {
    const existingResponse = createMockResponse();
    const mockPageData = createMockPageData({
      existing_response: existingResponse,
    });
    vi.mocked(publicApprovalsApi.getPublicApprovalPageData).mockResolvedValue(mockPageData);

    const { result } = renderHook(
      () => usePublicApprovalPage('token_with_response'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data?.existing_response).toEqual(existingResponse);
  });

  it('should handle multi-use link', async () => {
    const multiUseLink = createMockLink({
      link_type: 'multi_use',
      max_uses: 10,
      current_uses: 3,
    });
    vi.mocked(publicApprovalsApi.getPublicApprovalLinks).mockResolvedValue([multiUseLink]);

    const { result } = renderHook(
      () => usePublicApprovalLinks('request-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.[0].link_type).toBe('multi_use');
    expect(result.current.data?.[0].max_uses).toBe(10);
    expect(result.current.data?.[0].current_uses).toBe(3);
  });

  it('should handle revoked link', async () => {
    const revokedLink = createMockLink({
      revoked_at: new Date().toISOString(),
      revoked_by: 'user-1',
    });
    vi.mocked(publicApprovalsApi.getPublicApprovalLinks).mockResolvedValue([revokedLink]);

    const { result } = renderHook(
      () => usePublicApprovalLinks('request-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.[0].revoked_at).toBeDefined();
  });

  it('should handle expired link', async () => {
    const expiredLink = createMockLink({
      expires_at: new Date(Date.now() - 1000).toISOString(), // Expired 1 second ago
    });
    vi.mocked(publicApprovalsApi.getPublicApprovalLinks).mockResolvedValue([expiredLink]);

    const { result } = renderHook(
      () => usePublicApprovalLinks('request-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const expirationDate = new Date(result.current.data?.[0].expires_at || '');
    expect(expirationDate.getTime()).toBeLessThan(Date.now());
  });

  it('should handle approval with signature', async () => {
    const mockResponse = createMockResponse({
      signature_data: 'data:image/png;base64,iVBORw0KGgo...',
      signed_at: new Date().toISOString(),
    });
    vi.mocked(publicApprovalsApi.submitClientApprovalResponse).mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useSubmitClientApprovalResponse(),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      const response = await result.current.mutateAsync({
        input: {
          public_link_id: 'link-1',
          decision: 'approved',
          client_name: 'Test Client',
          client_email: 'client@example.com',
          signature_data: 'data:image/png;base64,iVBORw0KGgo...',
        },
      });
      expect(response.signature_data).toBeDefined();
      expect(response.signed_at).toBeDefined();
    });
  });

  it('should handle approval with conditions', async () => {
    const mockResponse = createMockResponse({
      decision: 'approved',
      conditions: 'Subject to final review by engineering',
    });
    vi.mocked(publicApprovalsApi.submitClientApprovalResponse).mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useSubmitClientApprovalResponse(),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      const response = await result.current.mutateAsync({
        input: {
          public_link_id: 'link-1',
          decision: 'approved',
          client_name: 'Test Client',
          client_email: 'client@example.com',
          conditions: 'Subject to final review by engineering',
        },
      });
      expect(response.conditions).toBe('Subject to final review by engineering');
    });
  });
});
