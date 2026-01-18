/**
 * Morning Briefing Hook Tests
 * Tests for useMorningBriefing hook and utility functions
 *
 * Test Coverage:
 * - useMorningBriefing: Success, loading, disabled states
 * - getTimeOfDayGreeting: Morning, afternoon, evening
 * - getPriorityColor: All priority levels
 *
 * Total: 20+ test cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Import hooks and utilities to test
import {
  useMorningBriefing,
  getTimeOfDayGreeting,
  getPriorityColor,
  type MorningBriefingData,
  type TodayTask,
  type PendingApproval,
  type ActiveRFI,
  type ActiveSubmittal,
  type DueItem,
} from '../useMorningBriefing';

// ============================================================================
// Mocks
// ============================================================================

// Mock Supabase client
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();
const mockNot = vi.fn();
const mockLte = vi.fn();
const mockNeq = vi.fn();
const mockIs = vi.fn();
const mockOr = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();

const createMockChain = () => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: mockSelect,
    eq: mockEq,
    in: mockIn,
    not: mockNot,
    lte: mockLte,
    neq: mockNeq,
    is: mockIs,
    or: mockOr,
    order: mockOrder,
    limit: mockLimit,
  };

  // Each method returns the chain for fluent API
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

// Mock useAuth hook
const mockUserProfile = {
  id: 'user-123',
  company_id: 'company-456',
  email: 'test@example.com',
  first_name: 'John',
  last_name: 'Doe',
};

vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({
    userProfile: mockUserProfile,
  }),
}));

// ============================================================================
// Test Factories
// ============================================================================

function createMockTask(overrides: Partial<TodayTask> = {}): TodayTask {
  return {
    id: 'task-1',
    title: 'Complete foundation inspection',
    description: 'Inspect foundation for cracks',
    priority: 'high',
    status: 'in_progress',
    dueDate: new Date().toISOString(),
    projectId: 'project-1',
    projectName: 'Main Building',
    location: 'Building A',
    estimatedHours: 2,
    isOverdue: false,
    ...overrides,
  };
}

function createMockApproval(overrides: Partial<PendingApproval> = {}): PendingApproval {
  return {
    id: 'approval-1',
    type: 'change_order',
    title: 'Foundation Repair CO',
    description: 'Additional concrete work needed',
    submittedBy: 'Jane Smith',
    submittedAt: new Date().toISOString(),
    projectId: 'project-1',
    projectName: 'Main Building',
    priority: 'high',
    value: 15000,
    ...overrides,
  };
}

function createMockRFI(overrides: Partial<ActiveRFI> = {}): ActiveRFI {
  return {
    id: 'rfi-1',
    number: 'RFI-001',
    subject: 'Steel beam specifications',
    status: 'open',
    dateRequired: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    ballInCourt: 'user-123',
    projectId: 'project-1',
    projectName: 'Main Building',
    isOverdue: false,
    daysOpen: 5,
    ...overrides,
  };
}

function createMockSubmittal(overrides: Partial<ActiveSubmittal> = {}): ActiveSubmittal {
  return {
    id: 'submittal-1',
    number: 'SUB-001',
    title: 'HVAC Equipment Submittal',
    status: 'submitted',
    requiredDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    projectId: 'project-1',
    projectName: 'Main Building',
    isOverdue: false,
    specSection: '23 00 00',
    ...overrides,
  };
}

function createMockDueItem(overrides: Partial<DueItem> = {}): DueItem {
  return {
    id: 'due-1',
    type: 'task',
    title: 'Complete inspection',
    dueDate: new Date().toISOString(),
    projectId: 'project-1',
    projectName: 'Main Building',
    priority: 'normal',
    status: 'pending',
    daysUntilDue: 0,
    isOverdue: false,
    ...overrides,
  };
}

function createMockBriefingData(
  overrides: Partial<MorningBriefingData> = {}
): MorningBriefingData {
  return {
    todaysTasks: [createMockTask()],
    pendingApprovals: [createMockApproval()],
    itemsDueToday: [createMockDueItem()],
    itemsDueSoon: [createMockDueItem({ daysUntilDue: 2 })],
    activeRFIs: [createMockRFI()],
    activeSubmittals: [createMockSubmittal()],
    weather: null,
    summary: {
      totalTasks: 1,
      overdueItems: 0,
      pendingApprovalCount: 1,
      criticalItems: 1,
    },
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

// Helper to setup mock responses
const setupMockResponses = () => {
  // Tasks
  const tasksData = [
    {
      id: 'task-1',
      title: 'Complete foundation inspection',
      description: 'Inspect foundation',
      priority: 'high',
      status: 'in_progress',
      due_date: new Date().toISOString(),
      estimated_hours: 2,
      location: 'Building A',
      project_id: 'project-1',
      project: { name: 'Main Building' },
    },
  ];

  // Change orders for approvals
  const changeOrdersData = [
    {
      id: 'co-1',
      title: 'Foundation Repair',
      description: 'Additional work',
      proposed_amount: 15000,
      status: 'pending_approval',
      created_at: new Date().toISOString(),
      project_id: 'project-1',
      project: { name: 'Main Building' },
      created_by_user: { first_name: 'Jane', last_name: 'Smith' },
    },
  ];

  // Submittals for approvals
  const submittalsApprovalData = [
    {
      id: 'sub-approval-1',
      title: 'HVAC Submittal',
      description: 'HVAC equipment',
      status: 'submitted',
      created_at: new Date().toISOString(),
      project_id: 'project-1',
      project: { name: 'Main Building' },
      submitted_by_user: { first_name: 'Bob', last_name: 'Jones' },
    },
  ];

  // RFIs
  const rfisData = [
    {
      id: 'rfi-1',
      rfi_number: 'RFI-001',
      subject: 'Steel specifications',
      status: 'open',
      date_required: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      ball_in_court: 'user-123',
      project_id: 'project-1',
      project: { name: 'Main Building' },
    },
  ];

  // Submittals
  const submittalsData = [
    {
      id: 'sub-1',
      submittal_number: 'SUB-001',
      title: 'HVAC Equipment',
      status: 'submitted',
      required_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      spec_section: '23 00 00',
      project_id: 'project-1',
      project: { name: 'Main Building' },
    },
  ];

  // Punch items
  const punchItemsData = [
    {
      id: 'punch-1',
      title: 'Fix drywall',
      priority: 'normal',
      status: 'open',
      due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      project_id: 'project-1',
      project: { name: 'Main Building' },
    },
  ];

  // Setup mock to return different data based on call order
  let callIndex = 0;
  const responses = [
    { data: tasksData, error: null },
    { data: changeOrdersData, error: null },
    { data: submittalsApprovalData, error: null },
    { data: rfisData, error: null },
    { data: submittalsData, error: null },
    { data: punchItemsData, error: null },
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

describe('Morning Briefing Hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  // ==========================================================================
  // useMorningBriefing Tests
  // ==========================================================================

  describe('useMorningBriefing', () => {
    it('should return loading state initially', () => {
      setupMockResponses();

      const { result } = renderHook(() => useMorningBriefing(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should fetch morning briefing data successfully', async () => {
      setupMockResponses();

      const { result } = renderHook(() => useMorningBriefing(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.todaysTasks).toBeDefined();
      expect(result.current.data?.pendingApprovals).toBeDefined();
      expect(result.current.data?.activeRFIs).toBeDefined();
      expect(result.current.data?.activeSubmittals).toBeDefined();
      expect(result.current.data?.summary).toBeDefined();
    });

    it('should query all required tables', async () => {
      setupMockResponses();

      renderHook(() => useMorningBriefing(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('tasks');
        expect(mockFrom).toHaveBeenCalledWith('change_orders');
        expect(mockFrom).toHaveBeenCalledWith('submittals');
        expect(mockFrom).toHaveBeenCalledWith('rfis');
        expect(mockFrom).toHaveBeenCalledWith('punch_items');
      });
    });

    it('should filter tasks by assigned user', async () => {
      setupMockResponses();

      renderHook(() => useMorningBriefing(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockEq).toHaveBeenCalledWith('assigned_to_user_id', mockUserProfile.id);
      });
    });

    it('should filter RFIs by ball_in_court', async () => {
      setupMockResponses();

      renderHook(() => useMorningBriefing(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockEq).toHaveBeenCalledWith('ball_in_court', mockUserProfile.id);
      });
    });

    it('should include summary with counts', async () => {
      setupMockResponses();

      const { result } = renderHook(() => useMorningBriefing(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const summary = result.current.data?.summary;
      expect(summary).toBeDefined();
      expect(typeof summary?.totalTasks).toBe('number');
      expect(typeof summary?.overdueItems).toBe('number');
      expect(typeof summary?.pendingApprovalCount).toBe('number');
      expect(typeof summary?.criticalItems).toBe('number');
    });

    it('should return weather as null (fetched separately)', async () => {
      setupMockResponses();

      const { result } = renderHook(() => useMorningBriefing(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.weather).toBeNull();
    });

    it('should use correct query key with user ID and project ID', () => {
      const projectId = 'project-123';
      setupMockResponses();

      renderHook(() => useMorningBriefing(projectId), {
        wrapper: createWrapper(queryClient),
      });

      const queryState = queryClient.getQueryState([
        'morning-briefing',
        mockUserProfile.id,
        projectId,
      ]);
      expect(queryState).toBeDefined();
    });

    it('should exclude completed tasks', async () => {
      setupMockResponses();

      renderHook(() => useMorningBriefing(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockNeq).toHaveBeenCalledWith('status', 'completed');
      });
    });

    it('should exclude deleted items', async () => {
      setupMockResponses();

      renderHook(() => useMorningBriefing(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockIs).toHaveBeenCalledWith('deleted_at', null);
      });
    });

    it('should order tasks by priority and due date', async () => {
      setupMockResponses();

      renderHook(() => useMorningBriefing(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockOrder).toHaveBeenCalledWith('priority', { ascending: false });
        expect(mockOrder).toHaveBeenCalledWith('due_date', { ascending: true });
      });
    });

    it('should return empty arrays when no data exists', async () => {
      // Setup empty responses
      mockLimit.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useMorningBriefing(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.todaysTasks).toEqual([]);
      expect(result.current.data?.pendingApprovals).toEqual([]);
      expect(result.current.data?.activeRFIs).toEqual([]);
    });
  });

  // ==========================================================================
  // getTimeOfDayGreeting Tests
  // ==========================================================================

  describe('getTimeOfDayGreeting', () => {
    it('should return "Good morning" before noon', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T09:00:00'));

      expect(getTimeOfDayGreeting()).toBe('Good morning');

      vi.useRealTimers();
    });

    it('should return "Good morning" at 11:59 AM', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T11:59:00'));

      expect(getTimeOfDayGreeting()).toBe('Good morning');

      vi.useRealTimers();
    });

    it('should return "Good afternoon" at noon', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T12:00:00'));

      expect(getTimeOfDayGreeting()).toBe('Good afternoon');

      vi.useRealTimers();
    });

    it('should return "Good afternoon" at 4:59 PM', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T16:59:00'));

      expect(getTimeOfDayGreeting()).toBe('Good afternoon');

      vi.useRealTimers();
    });

    it('should return "Good evening" at 5:00 PM', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T17:00:00'));

      expect(getTimeOfDayGreeting()).toBe('Good evening');

      vi.useRealTimers();
    });

    it('should return "Good evening" at 11:59 PM', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T23:59:00'));

      expect(getTimeOfDayGreeting()).toBe('Good evening');

      vi.useRealTimers();
    });

    it('should return "Good morning" at midnight', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T00:00:00'));

      expect(getTimeOfDayGreeting()).toBe('Good morning');

      vi.useRealTimers();
    });
  });

  // ==========================================================================
  // getPriorityColor Tests
  // ==========================================================================

  describe('getPriorityColor', () => {
    it('should return red classes for urgent priority', () => {
      const result = getPriorityColor('urgent');
      expect(result).toContain('text-red-600');
      expect(result).toContain('bg-red-50');
      expect(result).toContain('border-red-200');
    });

    it('should return orange classes for high priority', () => {
      const result = getPriorityColor('high');
      expect(result).toContain('text-orange-600');
      expect(result).toContain('bg-orange-50');
      expect(result).toContain('border-orange-200');
    });

    it('should return blue classes for normal priority', () => {
      const result = getPriorityColor('normal');
      expect(result).toContain('text-blue-600');
      expect(result).toContain('bg-blue-50');
      expect(result).toContain('border-blue-200');
    });

    it('should return gray classes for low priority', () => {
      const result = getPriorityColor('low');
      expect(result).toContain('text-gray-600');
      expect(result).toContain('bg-gray-50');
      expect(result).toContain('border-gray-200');
    });

    it('should return gray classes for unknown priority', () => {
      const result = getPriorityColor('unknown');
      expect(result).toContain('text-gray-600');
      expect(result).toContain('bg-gray-50');
      expect(result).toContain('border-gray-200');
    });

    it('should return gray classes for empty string', () => {
      const result = getPriorityColor('');
      expect(result).toContain('text-gray-600');
    });
  });
});
