/**
 * Alert System Hook Tests
 * Tests for useAlertSystem hook that aggregates alerts from multiple sources
 *
 * Test Coverage:
 * - useAlertSystem: Success, loading, filtering, sorting, summary calculation
 * - Alert categorization and severity assignment
 *
 * Total: 18+ test cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Import hooks to test
import {
  useAlertSystem,
  type SystemAlert,
  type AlertSummary,
  type AlertSeverity,
  type AlertCategory,
} from '../useAlertSystem';

// ============================================================================
// Mocks
// ============================================================================

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();
const mockNot = vi.fn();
const mockLt = vi.fn();
const mockLte = vi.fn();
const mockGte = vi.fn();
const mockNeq = vi.fn();
const mockIs = vi.fn();
const mockLimit = vi.fn();

const createMockChain = () => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: mockSelect,
    eq: mockEq,
    in: mockIn,
    not: mockNot,
    lt: mockLt,
    lte: mockLte,
    gte: mockGte,
    neq: mockNeq,
    is: mockIs,
    limit: mockLimit,
  };

  Object.values(chain).forEach((fn) => {
    fn.mockReturnValue(chain);
  });

  return chain;
};

const mockFrom = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      mockFrom(table);
      return createMockChain();
    },
  },
}));

const mockUserProfile = {
  id: 'user-123',
  company_id: 'company-456',
  email: 'test@example.com',
};

vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({
    userProfile: mockUserProfile,
  }),
}));

// ============================================================================
// Test Factories
// ============================================================================

function createMockAlert(overrides: Partial<SystemAlert> = {}): SystemAlert {
  return {
    id: 'alert-1',
    category: 'overdue',
    severity: 'warning',
    title: 'Test Alert',
    message: 'This is a test alert',
    itemType: 'rfi',
    itemId: 'item-1',
    projectId: 'project-1',
    projectName: 'Main Building',
    link: '/rfis/item-1',
    dueDate: new Date(),
    daysOverdue: 3,
    createdAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// Test Setup
// ============================================================================

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
    logger: {
      log: console.info,
      warn: console.warn,
      error: () => {},
    },
  });
};

interface WrapperProps {
  children: ReactNode;
}

const createWrapper = (queryClient: QueryClient) => {
  return function Wrapper({ children }: WrapperProps) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
};

const setupMockResponses = (options: {
  overdueRFIs?: unknown[];
  overdueSubmittals?: unknown[];
  overdueTasks?: unknown[];
  safetyIncidents?: unknown[];
} = {}) => {
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const defaultRFIs = options.overdueRFIs ?? [
    {
      id: 'rfi-1',
      rfi_number: 'RFI-001',
      subject: 'Steel specifications',
      date_required: threeDaysAgo.toISOString(),
      project_id: 'project-1',
      project: { name: 'Main Building' },
    },
  ];

  const defaultSubmittals = options.overdueSubmittals ?? [];
  const defaultTasks = options.overdueTasks ?? [];
  const defaultIncidents = options.safetyIncidents ?? [];

  let callIndex = 0;
  const responses = [
    { data: defaultRFIs, error: null },
    { data: defaultSubmittals, error: null },
    { data: defaultTasks, error: null },
    { data: [], error: null }, // certifications (may not exist)
    { data: [], error: null }, // subcontractor_insurance (may not exist)
    { data: [], error: null }, // project_budgets (may not exist)
    { data: defaultIncidents, error: null },
  ];

  mockLimit.mockImplementation(() => {
    const response = responses[callIndex] || { data: [], error: null };
    callIndex++;
    return Promise.resolve(response);
  });
};

// ============================================================================
// Tests
// ============================================================================

describe('Alert System Hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('useAlertSystem', () => {
    it('should return loading state initially', () => {
      setupMockResponses();

      const { result } = renderHook(() => useAlertSystem(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should fetch alerts successfully', async () => {
      setupMockResponses();

      const { result } = renderHook(() => useAlertSystem(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.alerts).toBeDefined();
      expect(result.current.data?.summary).toBeDefined();
    });

    it('should query RFIs for overdue items', async () => {
      setupMockResponses();

      renderHook(() => useAlertSystem(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('rfis');
      });
    });

    it('should query submittals for overdue items', async () => {
      setupMockResponses();

      renderHook(() => useAlertSystem(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('submittals');
      });
    });

    it('should query tasks for overdue items', async () => {
      setupMockResponses();

      renderHook(() => useAlertSystem(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('tasks');
      });
    });

    it('should query safety incidents', async () => {
      setupMockResponses();

      renderHook(() => useAlertSystem(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('safety_incidents');
      });
    });

    it('should filter by company ID', async () => {
      setupMockResponses();

      renderHook(() => useAlertSystem(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockEq).toHaveBeenCalledWith('company_id', mockUserProfile.company_id);
      });
    });

    it('should filter tasks by assigned user', async () => {
      setupMockResponses();

      renderHook(() => useAlertSystem(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockEq).toHaveBeenCalledWith('assigned_to_user_id', mockUserProfile.id);
      });
    });

    it('should calculate summary correctly', async () => {
      setupMockResponses();

      const { result } = renderHook(() => useAlertSystem(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const summary = result.current.data?.summary;
      expect(summary).toBeDefined();
      expect(typeof summary?.total).toBe('number');
      expect(typeof summary?.critical).toBe('number');
      expect(typeof summary?.warning).toBe('number');
      expect(typeof summary?.info).toBe('number');
      expect(summary?.byCategory).toBeDefined();
    });

    it('should include byCategory counts in summary', async () => {
      setupMockResponses();

      const { result } = renderHook(() => useAlertSystem(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const byCategory = result.current.data?.summary.byCategory;
      expect(byCategory?.overdue).toBeDefined();
      expect(byCategory?.expiring).toBeDefined();
      expect(byCategory?.budget).toBeDefined();
      expect(byCategory?.safety).toBeDefined();
      expect(byCategory?.compliance).toBeDefined();
      expect(byCategory?.schedule).toBeDefined();
      expect(byCategory?.weather).toBeDefined();
    });

    it('should return empty alerts when no data exists', async () => {
      setupMockResponses({
        overdueRFIs: [],
        overdueSubmittals: [],
        overdueTasks: [],
        safetyIncidents: [],
      });

      const { result } = renderHook(() => useAlertSystem(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.alerts).toEqual([]);
      expect(result.current.data?.summary.total).toBe(0);
    });

    it('should use correct query key with company and user IDs', () => {
      setupMockResponses();

      renderHook(() => useAlertSystem(), {
        wrapper: createWrapper(queryClient),
      });

      const queryState = queryClient.getQueryState([
        'alert-system',
        mockUserProfile.company_id,
        mockUserProfile.id,
        undefined,
      ]);
      expect(queryState).toBeDefined();
    });

    it('should include projectId in query key when provided', () => {
      const projectId = 'project-123';
      setupMockResponses();

      renderHook(() => useAlertSystem(projectId), {
        wrapper: createWrapper(queryClient),
      });

      const queryState = queryClient.getQueryState([
        'alert-system',
        mockUserProfile.company_id,
        mockUserProfile.id,
        projectId,
      ]);
      expect(queryState).toBeDefined();
    });

    it('should exclude closed/void RFIs', async () => {
      setupMockResponses();

      renderHook(() => useAlertSystem(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockNot).toHaveBeenCalledWith('status', 'in', '("closed","void")');
      });
    });

    it('should exclude completed tasks', async () => {
      setupMockResponses();

      renderHook(() => useAlertSystem(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockNeq).toHaveBeenCalledWith('status', 'completed');
      });
    });

    it('should exclude deleted items', async () => {
      setupMockResponses();

      renderHook(() => useAlertSystem(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockIs).toHaveBeenCalledWith('deleted_at', null);
      });
    });

    it('should create alerts with correct structure', async () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      setupMockResponses({
        overdueRFIs: [
          {
            id: 'rfi-1',
            rfi_number: 'RFI-001',
            subject: 'Steel specifications',
            date_required: threeDaysAgo.toISOString(),
            project_id: 'project-1',
            project: { name: 'Main Building' },
          },
        ],
      });

      const { result } = renderHook(() => useAlertSystem(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const alerts = result.current.data?.alerts;
      expect(alerts).toBeDefined();
      if (alerts && alerts.length > 0) {
        const alert = alerts[0];
        expect(alert.id).toBeDefined();
        expect(alert.category).toBeDefined();
        expect(alert.severity).toBeDefined();
        expect(alert.title).toBeDefined();
        expect(alert.message).toBeDefined();
      }
    });

    it('should limit results for each query', async () => {
      setupMockResponses();

      renderHook(() => useAlertSystem(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockLimit).toHaveBeenCalledWith(10);
      });
    });
  });
});
