/**
 * Report Hooks Tests
 * Tests for standard project report hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock functions must be defined BEFORE vi.mock calls
const mockGetProjectHealthReport = vi.fn();
const mockGetDailyReportAnalytics = vi.fn();
const mockGetWorkflowSummary = vi.fn();
const mockGetPunchListReport = vi.fn();
const mockGetSafetyIncidentReport = vi.fn();
const mockGetFinancialSummary = vi.fn();
const mockGetDocumentSummary = vi.fn();

// Mock the reports API
vi.mock('@/lib/api/services/reports', () => ({
  getProjectHealthReport: (...args: unknown[]) => mockGetProjectHealthReport(...args),
  getDailyReportAnalytics: (...args: unknown[]) => mockGetDailyReportAnalytics(...args),
  getWorkflowSummary: (...args: unknown[]) => mockGetWorkflowSummary(...args),
  getPunchListReport: (...args: unknown[]) => mockGetPunchListReport(...args),
  getSafetyIncidentReport: (...args: unknown[]) => mockGetSafetyIncidentReport(...args),
  getFinancialSummary: (...args: unknown[]) => mockGetFinancialSummary(...args),
  getDocumentSummary: (...args: unknown[]) => mockGetDocumentSummary(...args),
}));

// Import after mocks
import {
  useProjectHealthReport,
  useDailyReportAnalytics,
  useWorkflowSummary,
  usePunchListReport,
  useSafetyIncidentReport,
  useFinancialSummary,
  useDocumentSummary,
} from './useReports';

// Test data
const mockProjectHealthReport = {
  projectId: 'project-123',
  projectName: 'Commercial Building A',
  overallHealth: 'good',
  scheduleVariance: -2,
  budgetVariance: 1.5,
  qualityScore: 92,
  safetyScore: 98,
  riskLevel: 'low',
  completionPercent: 65,
  milestones: [
    { name: 'Foundation Complete', status: 'completed', date: '2024-03-15' },
    { name: 'Structural Steel', status: 'in_progress', date: '2024-06-01' },
  ],
  issues: [
    { type: 'delay', description: 'Weather delay', impact: 'medium' },
  ],
  generatedAt: '2024-06-15T12:00:00Z',
};

const mockDailyReportAnalytics = {
  projectId: 'project-123',
  startDate: '2024-06-01',
  endDate: '2024-06-30',
  totalReports: 22,
  averageWorkers: 45,
  totalManHours: 7920,
  weatherDays: {
    clear: 18,
    rain: 3,
    snow: 0,
    other: 1,
  },
  activitiesCompleted: 35,
  safetyIncidents: 0,
  equipmentHours: 1250,
};

const mockWorkflowSummary = {
  projectId: 'project-123',
  workflowType: 'rfi',
  totalItems: 45,
  openItems: 12,
  closedItems: 33,
  averageResponseDays: 3.5,
  overdueItems: 2,
  byStatus: [
    { status: 'open', count: 8 },
    { status: 'answered', count: 4 },
    { status: 'closed', count: 33 },
  ],
};

const mockPunchListReport = {
  projectId: 'project-123',
  totalItems: 156,
  completedItems: 89,
  pendingItems: 67,
  byTrade: [
    { trade: 'Electrical', total: 35, completed: 20 },
    { trade: 'Plumbing', total: 28, completed: 15 },
    { trade: 'HVAC', total: 42, completed: 30 },
  ],
  byPriority: [
    { priority: 'high', count: 15 },
    { priority: 'medium', count: 85 },
    { priority: 'low', count: 56 },
  ],
  completionPercent: 57,
};

const mockSafetyIncidentReport = {
  projectId: 'project-123',
  startDate: '2024-01-01',
  endDate: '2024-06-30',
  totalIncidents: 3,
  recordableIncidents: 1,
  lostTimeIncidents: 0,
  nearMisses: 8,
  trirRate: 1.2,
  dartRate: 0.0,
  incidentsByType: [
    { type: 'slip_trip_fall', count: 2 },
    { type: 'struck_by', count: 1 },
  ],
  safetyObservations: 125,
};

const mockFinancialSummary = {
  projectId: 'project-123',
  originalContractValue: 5000000,
  currentContractValue: 5250000,
  approvedChanges: 250000,
  pendingChanges: 75000,
  billedToDate: 3150000,
  paidToDate: 2850000,
  retainageHeld: 157500,
  costToDate: 2950000,
  projectedFinalCost: 5150000,
  profitMargin: 1.9,
};

const mockDocumentSummary = {
  projectId: 'project-123',
  totalDocuments: 1250,
  byCategory: [
    { category: 'drawings', count: 350 },
    { category: 'specifications', count: 125 },
    { category: 'submittals', count: 280 },
    { category: 'rfis', count: 95 },
    { category: 'contracts', count: 45 },
  ],
  recentUploads: 28,
  pendingReview: 15,
  storageUsedMB: 4500,
};

// Helper to create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useReports hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =============================================
  // PROJECT HEALTH REPORT TESTS
  // =============================================

  describe('useProjectHealthReport', () => {
    it('should fetch project health report', async () => {
      mockGetProjectHealthReport.mockResolvedValue(mockProjectHealthReport);

      const { result } = renderHook(
        () => useProjectHealthReport('project-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGetProjectHealthReport).toHaveBeenCalledWith('project-123');
      expect(result.current.data).toEqual(mockProjectHealthReport);
    });

    it('should not fetch when projectId is undefined', () => {
      const { result } = renderHook(
        () => useProjectHealthReport(undefined),
        { wrapper: createWrapper() }
      );

      expect(result.current.isFetching).toBe(false);
      expect(mockGetProjectHealthReport).not.toHaveBeenCalled();
    });

    it('should return overall health metrics', async () => {
      mockGetProjectHealthReport.mockResolvedValue(mockProjectHealthReport);

      const { result } = renderHook(
        () => useProjectHealthReport('project-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.overallHealth).toBe('good');
      expect(result.current.data?.completionPercent).toBe(65);
      expect(result.current.data?.riskLevel).toBe('low');
    });
  });

  // =============================================
  // DAILY REPORT ANALYTICS TESTS
  // =============================================

  describe('useDailyReportAnalytics', () => {
    it('should fetch daily report analytics', async () => {
      mockGetDailyReportAnalytics.mockResolvedValue(mockDailyReportAnalytics);

      const { result } = renderHook(
        () => useDailyReportAnalytics('project-123', '2024-06-01', '2024-06-30'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGetDailyReportAnalytics).toHaveBeenCalledWith(
        'project-123',
        '2024-06-01',
        '2024-06-30'
      );
      expect(result.current.data).toEqual(mockDailyReportAnalytics);
    });

    it('should not fetch when projectId is undefined', () => {
      const { result } = renderHook(
        () => useDailyReportAnalytics(undefined, '2024-06-01', '2024-06-30'),
        { wrapper: createWrapper() }
      );

      expect(result.current.isFetching).toBe(false);
    });

    it('should not fetch when dates are undefined', () => {
      const { result } = renderHook(
        () => useDailyReportAnalytics('project-123', undefined, undefined),
        { wrapper: createWrapper() }
      );

      expect(result.current.isFetching).toBe(false);
    });

    it('should return workforce analytics', async () => {
      mockGetDailyReportAnalytics.mockResolvedValue(mockDailyReportAnalytics);

      const { result } = renderHook(
        () => useDailyReportAnalytics('project-123', '2024-06-01', '2024-06-30'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.averageWorkers).toBe(45);
      expect(result.current.data?.totalManHours).toBe(7920);
    });
  });

  // =============================================
  // WORKFLOW SUMMARY TESTS
  // =============================================

  describe('useWorkflowSummary', () => {
    it('should fetch workflow summary for RFIs', async () => {
      mockGetWorkflowSummary.mockResolvedValue(mockWorkflowSummary);

      const { result } = renderHook(
        () => useWorkflowSummary('project-123', 'rfi'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGetWorkflowSummary).toHaveBeenCalledWith('project-123', 'rfi');
      expect(result.current.data?.workflowType).toBe('rfi');
    });

    it('should not fetch when workflow type is undefined', () => {
      const { result } = renderHook(
        () => useWorkflowSummary('project-123', undefined),
        { wrapper: createWrapper() }
      );

      expect(result.current.isFetching).toBe(false);
    });

    it('should return status breakdown', async () => {
      mockGetWorkflowSummary.mockResolvedValue(mockWorkflowSummary);

      const { result } = renderHook(
        () => useWorkflowSummary('project-123', 'rfi'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.totalItems).toBe(45);
      expect(result.current.data?.openItems).toBe(12);
      expect(result.current.data?.overdueItems).toBe(2);
    });
  });

  // =============================================
  // PUNCH LIST REPORT TESTS
  // =============================================

  describe('usePunchListReport', () => {
    it('should fetch punch list report', async () => {
      mockGetPunchListReport.mockResolvedValue(mockPunchListReport);

      const { result } = renderHook(
        () => usePunchListReport('project-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGetPunchListReport).toHaveBeenCalledWith('project-123');
      expect(result.current.data).toEqual(mockPunchListReport);
    });

    it('should return trade breakdown', async () => {
      mockGetPunchListReport.mockResolvedValue(mockPunchListReport);

      const { result } = renderHook(
        () => usePunchListReport('project-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.byTrade).toHaveLength(3);
      expect(result.current.data?.completionPercent).toBe(57);
    });
  });

  // =============================================
  // SAFETY INCIDENT REPORT TESTS
  // =============================================

  describe('useSafetyIncidentReport', () => {
    it('should fetch safety incident report', async () => {
      mockGetSafetyIncidentReport.mockResolvedValue(mockSafetyIncidentReport);

      const { result } = renderHook(
        () => useSafetyIncidentReport('project-123', '2024-01-01', '2024-06-30'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGetSafetyIncidentReport).toHaveBeenCalledWith(
        'project-123',
        '2024-01-01',
        '2024-06-30'
      );
    });

    it('should return OSHA rates', async () => {
      mockGetSafetyIncidentReport.mockResolvedValue(mockSafetyIncidentReport);

      const { result } = renderHook(
        () => useSafetyIncidentReport('project-123', '2024-01-01', '2024-06-30'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.trirRate).toBe(1.2);
      expect(result.current.data?.dartRate).toBe(0.0);
      expect(result.current.data?.recordableIncidents).toBe(1);
    });
  });

  // =============================================
  // FINANCIAL SUMMARY TESTS
  // =============================================

  describe('useFinancialSummary', () => {
    it('should fetch financial summary', async () => {
      mockGetFinancialSummary.mockResolvedValue(mockFinancialSummary);

      const { result } = renderHook(
        () => useFinancialSummary('project-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGetFinancialSummary).toHaveBeenCalledWith('project-123');
      expect(result.current.data).toEqual(mockFinancialSummary);
    });

    it('should return contract values', async () => {
      mockGetFinancialSummary.mockResolvedValue(mockFinancialSummary);

      const { result } = renderHook(
        () => useFinancialSummary('project-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.originalContractValue).toBe(5000000);
      expect(result.current.data?.currentContractValue).toBe(5250000);
      expect(result.current.data?.approvedChanges).toBe(250000);
    });

    it('should return billing and payment data', async () => {
      mockGetFinancialSummary.mockResolvedValue(mockFinancialSummary);

      const { result } = renderHook(
        () => useFinancialSummary('project-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.billedToDate).toBe(3150000);
      expect(result.current.data?.paidToDate).toBe(2850000);
      expect(result.current.data?.retainageHeld).toBe(157500);
    });
  });

  // =============================================
  // DOCUMENT SUMMARY TESTS
  // =============================================

  describe('useDocumentSummary', () => {
    it('should fetch document summary', async () => {
      mockGetDocumentSummary.mockResolvedValue(mockDocumentSummary);

      const { result } = renderHook(
        () => useDocumentSummary('project-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGetDocumentSummary).toHaveBeenCalledWith('project-123');
      expect(result.current.data).toEqual(mockDocumentSummary);
    });

    it('should return category breakdown', async () => {
      mockGetDocumentSummary.mockResolvedValue(mockDocumentSummary);

      const { result } = renderHook(
        () => useDocumentSummary('project-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.byCategory).toHaveLength(5);
      expect(result.current.data?.totalDocuments).toBe(1250);
    });
  });

  // =============================================
  // QUERY KEY STRUCTURE TESTS
  // =============================================

  describe('Query Key Structure', () => {
    it('should use correct query key for project health', async () => {
      mockGetProjectHealthReport.mockResolvedValue(mockProjectHealthReport);

      const queryClient = new QueryClient();
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      renderHook(() => useProjectHealthReport('project-123'), { wrapper });

      await waitFor(() => {
        const cache = queryClient.getQueryCache();
        const queries = cache.getAll();
        const healthQuery = queries.find(q =>
          JSON.stringify(q.queryKey).includes('project-health')
        );
        expect(healthQuery).toBeDefined();
      });
    });

    it('should include date range in analytics query key', async () => {
      mockGetDailyReportAnalytics.mockResolvedValue(mockDailyReportAnalytics);

      const queryClient = new QueryClient();
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      renderHook(
        () => useDailyReportAnalytics('project-123', '2024-06-01', '2024-06-30'),
        { wrapper }
      );

      await waitFor(() => {
        const cache = queryClient.getQueryCache();
        const queries = cache.getAll();
        const analyticsQuery = queries.find(q =>
          JSON.stringify(q.queryKey).includes('daily-analytics')
        );
        expect(analyticsQuery).toBeDefined();
      });
    });
  });

  // =============================================
  // ERROR HANDLING TESTS
  // =============================================

  describe('Error Handling', () => {
    it('should handle project health report error', async () => {
      mockGetProjectHealthReport.mockRejectedValue(new Error('Failed to fetch'));

      const { result } = renderHook(
        () => useProjectHealthReport('project-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });

    it('should handle financial summary error', async () => {
      mockGetFinancialSummary.mockRejectedValue(new Error('Access denied'));

      const { result } = renderHook(
        () => useFinancialSummary('project-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
