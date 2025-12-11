import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import {
  useDailyReports,
  useDailyReport,
  useCreateDailyReport,
  useUpdateDailyReport,
  useDeleteDailyReport,
} from './useDailyReports';
import { supabase } from '@/lib/supabase';
import { createWrapper } from '@/__tests__/utils/TestProviders';
import { faker } from '@faker-js/faker';
import type { DailyReport, CreateInput } from '@/types/database';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock Auth Context
vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({
    userProfile: {
      id: 'user-123',
      company_id: 'company-123',
      role: 'superintendent',
    },
  }),
}));

// Factory for mock daily reports
const mockDailyReport = (overrides: Partial<DailyReport> = {}): DailyReport => ({
  id: faker.string.uuid(),
  project_id: faker.string.uuid(),
  report_date: faker.date.recent().toISOString().split('T')[0],
  weather_condition: faker.helpers.arrayElement(['sunny', 'cloudy', 'rainy', 'windy']),
  temperature_high: faker.number.int({ min: 60, max: 95 }),
  temperature_low: faker.number.int({ min: 40, max: 70 }),
  work_completed: faker.lorem.paragraph(),
  comments: faker.lorem.paragraph(),
  reporter_id: faker.string.uuid(),
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  approved_at: null,
  approved_by: null,
  created_by: null,
  deleted_at: null,
  issues: null,
  observations: null,
  pdf_generated_at: null,
  pdf_url: null,
  precipitation: null,
  production_data: null,
  report_number: null,
  reviewer_id: null,
  status: null,
  submitted_at: null,
  total_workers: null,
  weather_delay_notes: null,
  weather_delays: null,
  weather_source: null,
  wind_speed: null,
  ...overrides,
});

describe('useDailyReports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch all daily reports for a project', async () => {
    const projectId = 'project-123';
    const mockReports = [
      mockDailyReport({ project_id: projectId }),
      mockDailyReport({ project_id: projectId }),
      mockDailyReport({ project_id: projectId }),
    ];

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockReturnThis();
    const mockLimit = vi.fn().mockResolvedValue({ data: mockReports, error: null });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
      limit: mockLimit,
    } as any);

    const { result } = renderHook(() => useDailyReports(projectId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockReports);
    expect(supabase.from).toHaveBeenCalledWith('daily_reports');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('project_id', projectId);
    expect(mockOrder).toHaveBeenCalledWith('report_date', { ascending: false });
    expect(mockLimit).toHaveBeenCalledWith(100);
  });

  it('should be disabled when projectId is undefined', () => {
    const { result } = renderHook(() => useDailyReports(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
  });

  it('should handle error when fetching reports fails', async () => {
    const projectId = 'project-123';
    const mockError = new Error('Database connection failed');

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockReturnThis();
    const mockLimit = vi.fn().mockResolvedValue({ data: null, error: mockError });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
      limit: mockLimit,
    } as any);

    const { result } = renderHook(() => useDailyReports(projectId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(mockError);
  });

  it('should return empty array when no reports exist', async () => {
    const projectId = 'project-123';

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockReturnThis();
    const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
      limit: mockLimit,
    } as any);

    const { result } = renderHook(() => useDailyReports(projectId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });
});

describe('useDailyReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch single daily report by id', async () => {
    const reportId = 'report-123';
    const mockReport = mockDailyReport({ id: reportId });

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({ data: mockReport, error: null });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    } as any);

    const { result } = renderHook(() => useDailyReport(reportId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockReport);
    expect(mockEq).toHaveBeenCalledWith('id', reportId);
    expect(mockSingle).toHaveBeenCalled();
  });

  it('should be disabled when reportId is undefined', () => {
    const { result } = renderHook(() => useDailyReport(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
  });

  it('should handle not found error', async () => {
    const reportId = 'non-existent';
    const mockError = new Error('Report not found');

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    } as any);

    const { result } = renderHook(() => useDailyReport(reportId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(mockError);
  });
});

describe('useCreateDailyReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create daily report and invalidate queries', async () => {
    const projectId = 'project-123';
    const input: CreateInput<'daily_reports'> = {
      project_id: projectId,
      report_date: '2024-01-15',
      weather_condition: 'sunny',
      temperature_high: 75,
      temperature_low: 60,
      work_completed: 'Completed foundation work',
      comments: 'Good progress today',
      reporter_id: 'user-123',
    };

    const mockCreatedReport = mockDailyReport({
      ...input,
      id: 'new-report-123',
    });

    const mockInsert = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({ data: mockCreatedReport, error: null });

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
      select: mockSelect,
      single: mockSingle,
    } as any);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateDailyReport(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync(input);

    expect(mockInsert).toHaveBeenCalledWith(input);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['daily-reports'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['daily-reports', projectId] });
  });

  it('should handle creation errors', async () => {
    const input: CreateInput<'daily_reports'> = {
      project_id: 'project-123',
      report_date: '2024-01-15',
      weather_condition: 'sunny',
      reporter_id: 'user-123',
    };

    const mockError = new Error('Duplicate report for date');

    const mockInsert = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError });

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
      select: mockSelect,
      single: mockSingle,
    } as any);

    const { result } = renderHook(() => useCreateDailyReport(), {
      wrapper: createWrapper(),
    });

    await expect(result.current.mutateAsync(input)).rejects.toThrow('Duplicate report for date');
  });
});

describe('useUpdateDailyReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update daily report and invalidate queries', async () => {
    const reportId = 'report-123';
    const projectId = 'project-123';
    const updates = {
      id: reportId,
      work_completed: 'Updated work summary',
      notes: 'Updated notes with additional details',
    };

    const mockUpdatedReport = mockDailyReport({
      ...updates,
      project_id: projectId,
    });

    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({ data: mockUpdatedReport, error: null });

    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate,
      eq: mockEq,
      select: mockSelect,
      single: mockSingle,
    } as any);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateDailyReport(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync(updates);

    const { id, ...updateData } = updates;
    expect(mockUpdate).toHaveBeenCalledWith(updateData);
    expect(mockEq).toHaveBeenCalledWith('id', reportId);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['daily-reports'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['daily-reports', reportId] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['daily-reports', projectId] });
  });

  it('should handle update conflicts', async () => {
    const updates = {
      id: 'report-123',
      work_completed: 'Conflicting update',
    };

    const mockError = new Error('Report has been modified by another user');

    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError });

    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate,
      eq: mockEq,
      select: mockSelect,
      single: mockSingle,
    } as any);

    const { result } = renderHook(() => useUpdateDailyReport(), {
      wrapper: createWrapper(),
    });

    await expect(result.current.mutateAsync(updates)).rejects.toThrow('Report has been modified by another user');
  });
});

describe('useDeleteDailyReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete daily report and invalidate queries', async () => {
    const reportId = 'report-123';

    const mockDelete = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(supabase.from).mockReturnValue({
      delete: mockDelete,
      eq: mockEq,
    } as any);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteDailyReport(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync(reportId);

    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', reportId);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['daily-reports'] });
  });

  it('should handle deletion when report has dependencies', async () => {
    const mockError = new Error('Cannot delete report with associated data');

    const mockDelete = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ error: mockError });

    vi.mocked(supabase.from).mockReturnValue({
      delete: mockDelete,
      eq: mockEq,
    } as any);

    const { result } = renderHook(() => useDeleteDailyReport(), {
      wrapper: createWrapper(),
    });

    await expect(result.current.mutateAsync('report-123')).rejects.toThrow('Cannot delete report with associated data');
  });

  it('should handle permission denied error', async () => {
    const mockError = new Error('Permission denied');

    const mockDelete = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ error: mockError });

    vi.mocked(supabase.from).mockReturnValue({
      delete: mockDelete,
      eq: mockEq,
    } as any);

    const { result } = renderHook(() => useDeleteDailyReport(), {
      wrapper: createWrapper(),
    });

    await expect(result.current.mutateAsync('report-123')).rejects.toThrow('Permission denied');
  });
});