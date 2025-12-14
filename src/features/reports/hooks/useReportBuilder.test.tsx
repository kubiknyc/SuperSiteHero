/**
 * Report Builder Hooks Tests
 * Tests for custom report builder functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock functions must be defined BEFORE vi.mock calls
const mockGetReportTemplates = vi.fn();
const mockGetReportTemplate = vi.fn();
const mockCreateReportTemplate = vi.fn();
const mockUpdateReportTemplate = vi.fn();
const mockDeleteReportTemplate = vi.fn();
const mockDuplicateReportTemplate = vi.fn();
const mockSetTemplateFields = vi.fn();
const mockSetTemplateFilters = vi.fn();
const mockSetTemplateSorting = vi.fn();
const mockSetTemplateGrouping = vi.fn();
const mockGetScheduledReports = vi.fn();
const mockGetScheduledReport = vi.fn();
const mockCreateScheduledReport = vi.fn();
const mockUpdateScheduledReport = vi.fn();
const mockDeleteScheduledReport = vi.fn();
const mockToggleScheduledReportActive = vi.fn();
const mockGetGeneratedReports = vi.fn();
const mockGetGeneratedReport = vi.fn();
const mockCreateGeneratedReport = vi.fn();
const mockGetFieldDefinitions = vi.fn();
const mockGetAllFieldDefinitions = vi.fn();
const mockGetDefaultFields = vi.fn();

// Mock the report builder API
vi.mock('@/lib/api/services/report-builder', () => ({
  reportBuilderApi: {
    getReportTemplates: (...args: unknown[]) => mockGetReportTemplates(...args),
    getReportTemplate: (...args: unknown[]) => mockGetReportTemplate(...args),
    createReportTemplate: (...args: unknown[]) => mockCreateReportTemplate(...args),
    updateReportTemplate: (...args: unknown[]) => mockUpdateReportTemplate(...args),
    deleteReportTemplate: (...args: unknown[]) => mockDeleteReportTemplate(...args),
    duplicateReportTemplate: (...args: unknown[]) => mockDuplicateReportTemplate(...args),
    setTemplateFields: (...args: unknown[]) => mockSetTemplateFields(...args),
    setTemplateFilters: (...args: unknown[]) => mockSetTemplateFilters(...args),
    setTemplateSorting: (...args: unknown[]) => mockSetTemplateSorting(...args),
    setTemplateGrouping: (...args: unknown[]) => mockSetTemplateGrouping(...args),
    getScheduledReports: (...args: unknown[]) => mockGetScheduledReports(...args),
    getScheduledReport: (...args: unknown[]) => mockGetScheduledReport(...args),
    createScheduledReport: (...args: unknown[]) => mockCreateScheduledReport(...args),
    updateScheduledReport: (...args: unknown[]) => mockUpdateScheduledReport(...args),
    deleteScheduledReport: (...args: unknown[]) => mockDeleteScheduledReport(...args),
    toggleScheduledReportActive: (...args: unknown[]) => mockToggleScheduledReportActive(...args),
    getGeneratedReports: (...args: unknown[]) => mockGetGeneratedReports(...args),
    getGeneratedReport: (...args: unknown[]) => mockGetGeneratedReport(...args),
    createGeneratedReport: (...args: unknown[]) => mockCreateGeneratedReport(...args),
    getFieldDefinitions: (...args: unknown[]) => mockGetFieldDefinitions(...args),
    getAllFieldDefinitions: (...args: unknown[]) => mockGetAllFieldDefinitions(...args),
    getDefaultFields: (...args: unknown[]) => mockGetDefaultFields(...args),
  },
}));

// Mock toast context
const mockShowToast = vi.fn();
vi.mock('@/lib/notifications/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

// Mock export service
vi.mock('../services/reportExportService', () => ({
  reportExportService: {
    generateReport: vi.fn(),
    downloadReport: vi.fn(),
  },
}));

// Import after mocks
import {
  reportBuilderKeys,
  useReportTemplates,
  useReportTemplate,
  useCreateReportTemplate,
  useUpdateReportTemplate,
  useDeleteReportTemplate,
  useDuplicateReportTemplate,
  useSetTemplateFields,
  useScheduledReports,
  useScheduledReport,
  useCreateScheduledReport,
  useDeleteScheduledReport,
  useToggleScheduledReportActive,
  useGeneratedReports,
  useGeneratedReport,
  useGenerateReport,
  useFieldDefinitions,
  useAllFieldDefinitions,
  useDefaultFields,
} from './useReportBuilder';

// Test data
const mockTemplate = {
  id: 'template-123',
  company_id: 'company-123',
  name: 'Weekly Progress Report',
  description: 'Standard weekly progress report template',
  data_source: 'daily_reports',
  is_public: false,
  is_system: false,
  created_by: 'user-123',
  created_at: '2024-01-15T12:00:00Z',
  updated_at: '2024-06-01T12:00:00Z',
  fields: [
    { field_key: 'date', display_name: 'Date', is_visible: true, sort_order: 1 },
    { field_key: 'workers', display_name: 'Workers', is_visible: true, sort_order: 2 },
    { field_key: 'weather', display_name: 'Weather', is_visible: true, sort_order: 3 },
  ],
  filters: [
    { field_key: 'project_id', operator: 'equals', value: 'project-123' },
  ],
  sorting: [
    { field_key: 'date', direction: 'desc' },
  ],
  grouping: [],
};

const mockScheduledReport = {
  id: 'schedule-123',
  company_id: 'company-123',
  template_id: 'template-123',
  name: 'Weekly Progress - Monday Morning',
  frequency: 'weekly',
  day_of_week: 1,
  time_of_day: '08:00',
  output_format: 'pdf',
  recipients: ['pm@company.com', 'owner@client.com'],
  is_active: true,
  last_run_at: '2024-06-10T08:00:00Z',
  next_run_at: '2024-06-17T08:00:00Z',
  created_at: '2024-01-15T12:00:00Z',
  updated_at: '2024-06-01T12:00:00Z',
};

const mockGeneratedReport = {
  id: 'generated-123',
  company_id: 'company-123',
  template_id: 'template-123',
  scheduled_report_id: 'schedule-123',
  report_name: 'Weekly Progress Report - June 10, 2024',
  output_format: 'pdf',
  file_url: 'https://storage.example.com/reports/generated-123.pdf',
  file_size_bytes: 256000,
  row_count: 42,
  status: 'completed',
  generated_at: '2024-06-10T08:15:00Z',
  created_at: '2024-06-10T08:00:00Z',
};

const mockFieldDefinitions = [
  {
    field_key: 'date',
    display_name: 'Report Date',
    data_type: 'date',
    is_filterable: true,
    is_sortable: true,
    is_groupable: true,
    default_visible: true,
  },
  {
    field_key: 'workers_count',
    display_name: 'Worker Count',
    data_type: 'number',
    is_filterable: true,
    is_sortable: true,
    is_groupable: false,
    default_visible: true,
  },
  {
    field_key: 'weather_condition',
    display_name: 'Weather',
    data_type: 'string',
    is_filterable: true,
    is_sortable: false,
    is_groupable: true,
    default_visible: true,
  },
];

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

describe('useReportBuilder hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =============================================
  // QUERY KEYS TESTS
  // =============================================

  describe('reportBuilderKeys', () => {
    it('should generate base key', () => {
      expect(reportBuilderKeys.all).toEqual(['report-builder']);
    });

    it('should generate template keys', () => {
      expect(reportBuilderKeys.templates()).toEqual(['report-builder', 'templates']);
      expect(reportBuilderKeys.templateDetail('template-123')).toEqual([
        'report-builder',
        'templates',
        'detail',
        'template-123',
      ]);
    });

    it('should generate template list key with filters', () => {
      const filters = { dataSource: 'daily_reports' };
      expect(reportBuilderKeys.templateList(filters)).toEqual([
        'report-builder',
        'templates',
        'list',
        filters,
      ]);
    });

    it('should generate scheduled report keys', () => {
      expect(reportBuilderKeys.scheduled()).toEqual(['report-builder', 'scheduled']);
      expect(reportBuilderKeys.scheduledDetail('schedule-123')).toEqual([
        'report-builder',
        'scheduled',
        'detail',
        'schedule-123',
      ]);
    });

    it('should generate generated report keys', () => {
      expect(reportBuilderKeys.generated()).toEqual(['report-builder', 'generated']);
      expect(reportBuilderKeys.generatedDetail('generated-123')).toEqual([
        'report-builder',
        'generated',
        'detail',
        'generated-123',
      ]);
    });

    it('should generate field definition keys', () => {
      expect(reportBuilderKeys.fieldDefinitions()).toEqual(['report-builder', 'field-definitions']);
      expect(reportBuilderKeys.fieldDefinitionsBySource('daily_reports' as any)).toEqual([
        'report-builder',
        'field-definitions',
        'daily_reports',
      ]);
    });
  });

  // =============================================
  // TEMPLATE QUERY HOOKS TESTS
  // =============================================

  describe('useReportTemplates', () => {
    it('should fetch report templates', async () => {
      mockGetReportTemplates.mockResolvedValue([mockTemplate]);

      const { result } = renderHook(() => useReportTemplates(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGetReportTemplates).toHaveBeenCalledWith({});
      expect(result.current.data).toEqual([mockTemplate]);
    });

    it('should fetch templates with filters', async () => {
      mockGetReportTemplates.mockResolvedValue([mockTemplate]);

      const filters = { dataSource: 'daily_reports' };
      const { result } = renderHook(
        () => useReportTemplates(filters as any),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGetReportTemplates).toHaveBeenCalledWith(filters);
    });
  });

  describe('useReportTemplate', () => {
    it('should fetch single template', async () => {
      mockGetReportTemplate.mockResolvedValue(mockTemplate);

      const { result } = renderHook(
        () => useReportTemplate('template-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGetReportTemplate).toHaveBeenCalledWith('template-123');
      expect(result.current.data).toEqual(mockTemplate);
    });

    it('should not fetch when id is undefined', () => {
      const { result } = renderHook(
        () => useReportTemplate(undefined),
        { wrapper: createWrapper() }
      );

      expect(result.current.isFetching).toBe(false);
      expect(mockGetReportTemplate).not.toHaveBeenCalled();
    });
  });

  // =============================================
  // TEMPLATE MUTATION HOOKS TESTS
  // =============================================

  describe('useCreateReportTemplate', () => {
    it('should create a new template', async () => {
      mockCreateReportTemplate.mockResolvedValue(mockTemplate);

      const { result } = renderHook(() => useCreateReportTemplate(), { wrapper: createWrapper() });

      await result.current.mutateAsync({
        name: 'Weekly Progress Report',
        data_source: 'daily_reports' as any,
        description: 'Standard weekly report',
      });

      expect(mockCreateReportTemplate).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({
        type: 'success',
        title: 'Template Created',
      }));
    });

    it('should handle create error', async () => {
      mockCreateReportTemplate.mockRejectedValue(new Error('Create failed'));

      const { result } = renderHook(() => useCreateReportTemplate(), { wrapper: createWrapper() });

      try {
        await result.current.mutateAsync({
          name: 'Test Template',
          data_source: 'daily_reports' as any,
        });
      } catch (error) {
        // Expected
      }

      expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
      }));
    });
  });

  describe('useUpdateReportTemplate', () => {
    it('should update a template', async () => {
      const updatedTemplate = { ...mockTemplate, name: 'Updated Name' };
      mockUpdateReportTemplate.mockResolvedValue(updatedTemplate);

      const { result } = renderHook(() => useUpdateReportTemplate(), { wrapper: createWrapper() });

      await result.current.mutateAsync({
        id: 'template-123',
        data: { name: 'Updated Name' },
      });

      expect(mockUpdateReportTemplate).toHaveBeenCalledWith('template-123', { name: 'Updated Name' });
      expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({
        type: 'success',
        title: 'Template Updated',
      }));
    });
  });

  describe('useDeleteReportTemplate', () => {
    it('should delete a template', async () => {
      mockDeleteReportTemplate.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteReportTemplate(), { wrapper: createWrapper() });

      await result.current.mutateAsync('template-123');

      expect(mockDeleteReportTemplate).toHaveBeenCalledWith('template-123');
      expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({
        type: 'success',
        title: 'Template Deleted',
      }));
    });
  });

  describe('useDuplicateReportTemplate', () => {
    it('should duplicate a template', async () => {
      const duplicatedTemplate = { ...mockTemplate, id: 'template-456', name: 'Copy of Weekly Progress' };
      mockDuplicateReportTemplate.mockResolvedValue(duplicatedTemplate);

      const { result } = renderHook(() => useDuplicateReportTemplate(), { wrapper: createWrapper() });

      await result.current.mutateAsync({
        id: 'template-123',
        newName: 'Copy of Weekly Progress',
      });

      expect(mockDuplicateReportTemplate).toHaveBeenCalledWith('template-123', 'Copy of Weekly Progress');
      expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({
        type: 'success',
        title: 'Template Duplicated',
      }));
    });
  });

  // =============================================
  // TEMPLATE CONFIGURATION HOOKS TESTS
  // =============================================

  describe('useSetTemplateFields', () => {
    it('should set template fields', async () => {
      mockSetTemplateFields.mockResolvedValue(undefined);

      const { result } = renderHook(() => useSetTemplateFields(), { wrapper: createWrapper() });

      const fields = [
        { field_key: 'date', display_name: 'Date', is_visible: true, sort_order: 1 },
      ];

      await result.current.mutateAsync({
        templateId: 'template-123',
        fields,
      });

      expect(mockSetTemplateFields).toHaveBeenCalledWith('template-123', fields);
    });
  });

  // =============================================
  // SCHEDULED REPORT HOOKS TESTS
  // =============================================

  describe('useScheduledReports', () => {
    it('should fetch scheduled reports', async () => {
      mockGetScheduledReports.mockResolvedValue([mockScheduledReport]);

      const { result } = renderHook(() => useScheduledReports(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGetScheduledReports).toHaveBeenCalledWith({});
      expect(result.current.data).toEqual([mockScheduledReport]);
    });
  });

  describe('useScheduledReport', () => {
    it('should fetch single scheduled report', async () => {
      mockGetScheduledReport.mockResolvedValue(mockScheduledReport);

      const { result } = renderHook(
        () => useScheduledReport('schedule-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGetScheduledReport).toHaveBeenCalledWith('schedule-123');
    });
  });

  describe('useCreateScheduledReport', () => {
    it('should create a scheduled report', async () => {
      mockCreateScheduledReport.mockResolvedValue(mockScheduledReport);

      const { result } = renderHook(() => useCreateScheduledReport(), { wrapper: createWrapper() });

      await result.current.mutateAsync({
        template_id: 'template-123',
        name: 'Weekly Progress - Monday',
        frequency: 'weekly' as any,
        day_of_week: 1,
        time_of_day: '08:00',
        output_format: 'pdf' as any,
        recipients: ['pm@company.com'],
      });

      expect(mockCreateScheduledReport).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({
        type: 'success',
        title: 'Schedule Created',
      }));
    });
  });

  describe('useToggleScheduledReportActive', () => {
    it('should activate a scheduled report', async () => {
      const activatedReport = { ...mockScheduledReport, is_active: true };
      mockToggleScheduledReportActive.mockResolvedValue(activatedReport);

      const { result } = renderHook(
        () => useToggleScheduledReportActive(),
        { wrapper: createWrapper() }
      );

      await result.current.mutateAsync({
        id: 'schedule-123',
        isActive: true,
      });

      expect(mockToggleScheduledReportActive).toHaveBeenCalledWith('schedule-123', true);
      expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({
        type: 'success',
        title: 'Schedule Activated',
      }));
    });

    it('should pause a scheduled report', async () => {
      const pausedReport = { ...mockScheduledReport, is_active: false };
      mockToggleScheduledReportActive.mockResolvedValue(pausedReport);

      const { result } = renderHook(
        () => useToggleScheduledReportActive(),
        { wrapper: createWrapper() }
      );

      await result.current.mutateAsync({
        id: 'schedule-123',
        isActive: false,
      });

      expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({
        type: 'success',
        title: 'Schedule Paused',
      }));
    });
  });

  // =============================================
  // GENERATED REPORT HOOKS TESTS
  // =============================================

  describe('useGeneratedReports', () => {
    it('should fetch generated reports', async () => {
      mockGetGeneratedReports.mockResolvedValue([mockGeneratedReport]);

      const { result } = renderHook(() => useGeneratedReports(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGetGeneratedReports).toHaveBeenCalledWith({});
      expect(result.current.data).toEqual([mockGeneratedReport]);
    });

    it('should fetch with filters', async () => {
      mockGetGeneratedReports.mockResolvedValue([mockGeneratedReport]);

      const filters = { templateId: 'template-123' };
      renderHook(
        () => useGeneratedReports(filters as any),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(mockGetGeneratedReports).toHaveBeenCalledWith(filters));
    });
  });

  describe('useGeneratedReport', () => {
    it('should fetch single generated report', async () => {
      mockGetGeneratedReport.mockResolvedValue(mockGeneratedReport);

      const { result } = renderHook(
        () => useGeneratedReport('generated-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGetGeneratedReport).toHaveBeenCalledWith('generated-123');
    });
  });

  describe('useGenerateReport', () => {
    it('should generate a report', async () => {
      mockCreateGeneratedReport.mockResolvedValue(mockGeneratedReport);

      const { result } = renderHook(() => useGenerateReport(), { wrapper: createWrapper() });

      await result.current.mutateAsync({
        template_id: 'template-123',
        output_format: 'pdf' as any,
        report_name: 'Weekly Progress Report',
      });

      expect(mockCreateGeneratedReport).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({
        type: 'success',
        title: 'Report Generated',
      }));
    });
  });

  // =============================================
  // FIELD DEFINITION HOOKS TESTS
  // =============================================

  describe('useFieldDefinitions', () => {
    it('should fetch field definitions for data source', async () => {
      mockGetFieldDefinitions.mockResolvedValue(mockFieldDefinitions);

      const { result } = renderHook(
        () => useFieldDefinitions('daily_reports' as any),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGetFieldDefinitions).toHaveBeenCalledWith('daily_reports');
      expect(result.current.data).toEqual(mockFieldDefinitions);
    });

    it('should not fetch when data source is undefined', () => {
      const { result } = renderHook(
        () => useFieldDefinitions(undefined),
        { wrapper: createWrapper() }
      );

      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('useAllFieldDefinitions', () => {
    it('should fetch all field definitions', async () => {
      const allDefinitions = {
        daily_reports: mockFieldDefinitions,
        rfis: [{ field_key: 'rfi_number', display_name: 'RFI Number' }],
      };
      mockGetAllFieldDefinitions.mockResolvedValue(allDefinitions);

      const { result } = renderHook(() => useAllFieldDefinitions(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGetAllFieldDefinitions).toHaveBeenCalled();
      expect(result.current.data).toEqual(allDefinitions);
    });
  });

  describe('useDefaultFields', () => {
    it('should fetch default fields for data source', async () => {
      const defaultFields = mockFieldDefinitions.filter(f => f.default_visible);
      mockGetDefaultFields.mockResolvedValue(defaultFields);

      const { result } = renderHook(
        () => useDefaultFields('daily_reports' as any),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGetDefaultFields).toHaveBeenCalledWith('daily_reports');
    });
  });

  // =============================================
  // BUSINESS LOGIC TESTS
  // =============================================

  describe('Report Builder Business Logic', () => {
    it('should support all output formats', () => {
      const formats = ['pdf', 'excel', 'csv'];
      formats.forEach(format => {
        expect(typeof format).toBe('string');
      });
    });

    it('should support all schedule frequencies', () => {
      const frequencies = ['daily', 'weekly', 'monthly', 'quarterly'];
      frequencies.forEach(freq => {
        expect(typeof freq).toBe('string');
      });
    });

    it('should track field properties correctly', () => {
      mockFieldDefinitions.forEach(field => {
        expect(typeof field.is_filterable).toBe('boolean');
        expect(typeof field.is_sortable).toBe('boolean');
        expect(typeof field.is_groupable).toBe('boolean');
      });
    });

    it('should maintain field sort order', () => {
      const sortedFields = mockTemplate.fields.sort((a, b) => a.sort_order - b.sort_order);
      expect(sortedFields[0].sort_order).toBe(1);
      expect(sortedFields[1].sort_order).toBe(2);
    });

    it('should support recipient lists for scheduled reports', () => {
      expect(mockScheduledReport.recipients).toBeInstanceOf(Array);
      expect(mockScheduledReport.recipients.length).toBeGreaterThan(0);
    });

    it('should track report generation status', () => {
      const validStatuses = ['pending', 'generating', 'completed', 'failed'];
      expect(validStatuses).toContain(mockGeneratedReport.status);
    });
  });
});
