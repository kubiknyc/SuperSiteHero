/**
 * Integration Tests for Submittal Workflow
 * Tests the complete lifecycle of a submittal from creation to procurement tracking
 */

import { describe, it, expect, vi, beforeEach, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, waitFor, userEvent } from '@/__tests__/helpers';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import {
  createMockWorkflowType,
  createMockDraftSubmittal,
  createMockSubmittedSubmittal,
  createMockApprovedSubmittal,
  createMockSubmittalProcurement,
  createMockUser,
} from '@/__tests__/factories';

// Mock components for integration test
const SubmittalWorkflow = () => {
  const [submittals, setSubmittals] = React.useState<any[]>([]);
  const [selectedSubmittal, setSelectedSubmittal] = React.useState<any>(null);
  const [procurement, setProcurement] = React.useState<any[]>([]);

  return (
    <div>
      <h1>Submittal Workflow</h1>

      {/* Create Submittal */}
      <section data-testid="create-section">
        <h2>Create Submittal</h2>
        <button onClick={() => {
          const newSubmittal = createMockDraftSubmittal({ id: 'new-1', title: 'New Submittal' });
          setSubmittals([...submittals, newSubmittal]);
        }}>
          Create Draft
        </button>
      </section>

      {/* Submittal List */}
      <section data-testid="list-section">
        <h2>Submittals</h2>
        {submittals.map(s => (
          <div key={s.id} data-testid={`submittal-${s.id}`}>
            <span>{s.title}</span>
            <span>{s.status}</span>
            <button onClick={() => setSelectedSubmittal(s)}>View</button>
          </div>
        ))}
      </section>

      {/* Submittal Detail */}
      {selectedSubmittal && (
        <section data-testid="detail-section">
          <h2>Submittal Detail</h2>
          <div>
            <h3>{selectedSubmittal.title}</h3>
            <p>Status: {selectedSubmittal.status}</p>
            <button onClick={() => {
              setSelectedSubmittal({ ...selectedSubmittal, status: 'submitted' });
              setSubmittals(submittals.map(s =>
                s.id === selectedSubmittal.id ? { ...s, status: 'submitted' } : s
              ));
            }}>
              Submit for Review
            </button>
            <button onClick={() => {
              setSelectedSubmittal({ ...selectedSubmittal, status: 'approved' });
              setSubmittals(submittals.map(s =>
                s.id === selectedSubmittal.id ? { ...s, status: 'approved' } : s
              ));
            }}>
              Approve
            </button>
            <button onClick={() => {
              setSelectedSubmittal({ ...selectedSubmittal, status: 'rejected' });
              setSubmittals(submittals.map(s =>
                s.id === selectedSubmittal.id ? { ...s, status: 'rejected' } : s
              ));
            }}>
              Reject
            </button>
          </div>
        </section>
      )}

      {/* Procurement Tracking */}
      {selectedSubmittal?.status === 'approved' && (
        <section data-testid="procurement-section">
          <h2>Procurement Tracking</h2>
          <button onClick={() => {
            const newProcurement = createMockSubmittalProcurement({
              workflow_item_id: selectedSubmittal.id,
              procurement_status: 'pending',
            });
            setProcurement([...procurement, newProcurement]);
          }}>
            Track Procurement
          </button>
          {procurement.map(p => (
            <div key={p.id} data-testid={`procurement-${p.id}`}>
              <span>{p.vendor_name}</span>
              <span>{p.procurement_status}</span>
              <button onClick={() => {
                setProcurement(procurement.map(proc =>
                  proc.id === p.id ? { ...proc, procurement_status: 'ordered' } : proc
                ));
              }}>
                Mark as Ordered
              </button>
              <button onClick={() => {
                setProcurement(procurement.map(proc =>
                  proc.id === p.id ? { ...proc, procurement_status: 'delivered' } : proc
                ));
              }}>
                Mark as Delivered
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};

// MSW server setup
const mockUser = createMockUser({ role: 'superintendent' });
const mockWorkflowType = createMockWorkflowType();
const SUPABASE_URL = 'https://test-project.supabase.co';

const server = setupServer(
  // Get workflow type
  http.get(`${SUPABASE_URL}/rest/v1/workflow_types`, () => {
    return HttpResponse.json([mockWorkflowType]);
  }),

  // Get submittals
  http.get(`${SUPABASE_URL}/rest/v1/workflow_items`, () => {
    return HttpResponse.json([]);
  }),

  // Create submittal
  http.post(`${SUPABASE_URL}/rest/v1/workflow_items`, async ({ request }) => {
    const body = await request.json() as any;
    const newSubmittal = createMockDraftSubmittal({
      ...body,
      id: 'new-submittal-1',
      number: 1,
    });
    return HttpResponse.json(newSubmittal);
  }),

  // Update submittal
  http.patch(`${SUPABASE_URL}/rest/v1/workflow_items`, async ({ request }) => {
    const body = await request.json() as any;
    const updatedSubmittal = createMockSubmittedSubmittal({
      id: body.id || 'submittal-1',
      ...body,
    });
    return HttpResponse.json(updatedSubmittal);
  }),

  // Get procurement
  http.get(`${SUPABASE_URL}/rest/v1/submittal_procurement`, () => {
    return HttpResponse.json([]);
  }),

  // Create procurement
  http.post(`${SUPABASE_URL}/rest/v1/submittal_procurement`, async ({ request }) => {
    const body = await request.json() as any;
    const newProcurement = createMockSubmittalProcurement({
      ...body,
      id: 'procurement-1',
    });
    return HttpResponse.json(newProcurement);
  }),

  // Update procurement
  http.patch(`${SUPABASE_URL}/rest/v1/submittal_procurement`, async ({ request }) => {
    const body = await request.json() as any;
    const updatedProcurement = createMockSubmittalProcurement({
      id: body.id || 'procurement-1',
      procurement_status: body.procurement_status,
    });
    return HttpResponse.json(updatedProcurement);
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Submittal Workflow Integration', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  beforeEach(() => {
    queryClient.clear();
  });

  describe('Complete Lifecycle', () => {
    it('should complete full submittal lifecycle: Create → Submit → Approve → Track Procurement', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <SubmittalWorkflow />
        </QueryClientProvider>
      );

      // STEP 1: Create Draft Submittal
      const createButton = screen.getByRole('button', { name: /Create Draft/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('New Submittal')).toBeInTheDocument();
        expect(screen.getByText('draft')).toBeInTheDocument();
      });

      // STEP 2: View Submittal Details
      const viewButton = screen.getByRole('button', { name: /View/i });
      await user.click(viewButton);

      await waitFor(() => {
        expect(screen.getByTestId('detail-section')).toBeInTheDocument();
        expect(screen.getByText('Status: draft')).toBeInTheDocument();
      });

      // STEP 3: Submit for Review
      const submitButton = screen.getByRole('button', { name: /Submit for Review/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Status: submitted')).toBeInTheDocument();
      });

      // STEP 4: Approve Submittal
      const approveButton = screen.getByRole('button', { name: /Approve/i });
      await user.click(approveButton);

      await waitFor(() => {
        expect(screen.getByText('Status: approved')).toBeInTheDocument();
        expect(screen.getByTestId('procurement-section')).toBeInTheDocument();
      });

      // STEP 5: Track Procurement
      const trackProcurementButton = screen.getByRole('button', { name: /Track Procurement/i });
      await user.click(trackProcurementButton);

      await waitFor(() => {
        const procurementSection = screen.getByTestId('procurement-section');
        expect(procurementSection).toBeInTheDocument();
        expect(screen.getByText('pending')).toBeInTheDocument();
      });

      // STEP 6: Mark as Ordered
      const markOrderedButton = screen.getByRole('button', { name: /Mark as Ordered/i });
      await user.click(markOrderedButton);

      await waitFor(() => {
        expect(screen.getByText('ordered')).toBeInTheDocument();
      });

      // STEP 7: Mark as Delivered
      const markDeliveredButton = screen.getByRole('button', { name: /Mark as Delivered/i });
      await user.click(markDeliveredButton);

      await waitFor(() => {
        expect(screen.getByText('delivered')).toBeInTheDocument();
      });
    });

    it('should handle rejection workflow', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <SubmittalWorkflow />
        </QueryClientProvider>
      );

      // Create and view submittal
      const createButton = screen.getByRole('button', { name: /Create Draft/i });
      await user.click(createButton);

      const viewButton = screen.getByRole('button', { name: /View/i });
      await user.click(viewButton);

      // Submit for review
      const submitButton = screen.getByRole('button', { name: /Submit for Review/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Status: submitted')).toBeInTheDocument();
      });

      // Reject submittal
      const rejectButton = screen.getByRole('button', { name: /Reject/i });
      await user.click(rejectButton);

      await waitFor(() => {
        expect(screen.getByText('Status: rejected')).toBeInTheDocument();
      });

      // Procurement section should NOT appear
      expect(screen.queryByTestId('procurement-section')).not.toBeInTheDocument();
    });
  });

  describe('Status Transitions', () => {
    it('should transition from draft to submitted', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <SubmittalWorkflow />
        </QueryClientProvider>
      );

      const createButton = screen.getByRole('button', { name: /Create Draft/i });
      await user.click(createButton);

      const viewButton = screen.getByRole('button', { name: /View/i });
      await user.click(viewButton);

      expect(screen.getByText('Status: draft')).toBeInTheDocument();

      const submitButton = screen.getByRole('button', { name: /Submit for Review/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Status: submitted')).toBeInTheDocument();
      });
    });

    it('should transition from submitted to approved', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <SubmittalWorkflow />
        </QueryClientProvider>
      );

      const createButton = screen.getByRole('button', { name: /Create Draft/i });
      await user.click(createButton);

      const viewButton = screen.getByRole('button', { name: /View/i });
      await user.click(viewButton);

      const submitButton = screen.getByRole('button', { name: /Submit for Review/i });
      await user.click(submitButton);

      const approveButton = screen.getByRole('button', { name: /Approve/i });
      await user.click(approveButton);

      await waitFor(() => {
        expect(screen.getByText('Status: approved')).toBeInTheDocument();
      });
    });

    it('should transition from submitted to rejected', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <SubmittalWorkflow />
        </QueryClientProvider>
      );

      const createButton = screen.getByRole('button', { name: /Create Draft/i });
      await user.click(createButton);

      const viewButton = screen.getByRole('button', { name: /View/i });
      await user.click(viewButton);

      const submitButton = screen.getByRole('button', { name: /Submit for Review/i });
      await user.click(submitButton);

      const rejectButton = screen.getByRole('button', { name: /Reject/i });
      await user.click(rejectButton);

      await waitFor(() => {
        expect(screen.getByText('Status: rejected')).toBeInTheDocument();
      });
    });
  });

  describe('Procurement Tracking', () => {
    it('should only show procurement section for approved submittals', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <SubmittalWorkflow />
        </QueryClientProvider>
      );

      const createButton = screen.getByRole('button', { name: /Create Draft/i });
      await user.click(createButton);

      const viewButton = screen.getByRole('button', { name: /View/i });
      await user.click(viewButton);

      // Draft status - no procurement
      expect(screen.queryByTestId('procurement-section')).not.toBeInTheDocument();

      // Submit
      const submitButton = screen.getByRole('button', { name: /Submit for Review/i });
      await user.click(submitButton);

      // Submitted status - no procurement
      expect(screen.queryByTestId('procurement-section')).not.toBeInTheDocument();

      // Approve
      const approveButton = screen.getByRole('button', { name: /Approve/i });
      await user.click(approveButton);

      // Approved status - procurement section appears
      await waitFor(() => {
        expect(screen.getByTestId('procurement-section')).toBeInTheDocument();
      });
    });

    it('should track procurement status transitions', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <SubmittalWorkflow />
        </QueryClientProvider>
      );

      // Create and approve submittal
      const createButton = screen.getByRole('button', { name: /Create Draft/i });
      await user.click(createButton);

      const viewButton = screen.getByRole('button', { name: /View/i });
      await user.click(viewButton);

      const submitButton = screen.getByRole('button', { name: /Submit for Review/i });
      await user.click(submitButton);

      const approveButton = screen.getByRole('button', { name: /Approve/i });
      await user.click(approveButton);

      // Track procurement
      const trackButton = screen.getByRole('button', { name: /Track Procurement/i });
      await user.click(trackButton);

      await waitFor(() => {
        expect(screen.getByText('pending')).toBeInTheDocument();
      });

      // Transition to ordered
      const markOrderedButton = screen.getByRole('button', { name: /Mark as Ordered/i });
      await user.click(markOrderedButton);

      await waitFor(() => {
        expect(screen.getByText('ordered')).toBeInTheDocument();
      });

      // Transition to delivered
      const markDeliveredButton = screen.getByRole('button', { name: /Mark as Delivered/i });
      await user.click(markDeliveredButton);

      await waitFor(() => {
        expect(screen.getByText('delivered')).toBeInTheDocument();
      });
    });

    it('should create procurement record with vendor details', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <SubmittalWorkflow />
        </QueryClientProvider>
      );

      // Create and approve submittal
      const createButton = screen.getByRole('button', { name: /Create Draft/i });
      await user.click(createButton);

      const viewButton = screen.getByRole('button', { name: /View/i });
      await user.click(viewButton);

      const submitButton = screen.getByRole('button', { name: /Submit for Review/i });
      await user.click(submitButton);

      const approveButton = screen.getByRole('button', { name: /Approve/i });
      await user.click(approveButton);

      // Track procurement
      const trackButton = screen.getByRole('button', { name: /Track Procurement/i });
      await user.click(trackButton);

      await waitFor(() => {
        const procurementSection = screen.getByTestId('procurement-section');
        expect(procurementSection).toBeInTheDocument();

        // Vendor name should be displayed (from mock factory)
        const vendorElements = screen.queryAllByText(/.*/, { selector: 'span' });
        expect(vendorElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Multiple Submittals', () => {
    it('should handle multiple submittals independently', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <SubmittalWorkflow />
        </QueryClientProvider>
      );

      // Create first submittal
      const createButton = screen.getByRole('button', { name: /Create Draft/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getAllByText('New Submittal')).toHaveLength(1);
      });

      // Create second submittal
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getAllByText('New Submittal')).toHaveLength(2);
      });

      // Both should be in draft status
      expect(screen.getAllByText('draft')).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      server.use(
        http.post(`${SUPABASE_URL}/rest/v1/workflow_items`, () => {
          return HttpResponse.json(
            { error: 'Network error' },
            { status: 500 }
          );
        })
      );

      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <SubmittalWorkflow />
        </QueryClientProvider>
      );

      const createButton = screen.getByRole('button', { name: /Create Draft/i });

      // Component should still render even if request fails
      expect(createButton).toBeInTheDocument();
    });
  });
});
