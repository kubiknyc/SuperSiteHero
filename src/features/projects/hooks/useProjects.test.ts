import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import {
  useProjects,
  useProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from './useProjects';
import { supabase } from '@/lib/supabase';
import { createWrapper } from '@/__tests__/utils/TestProviders';
import { mockProject } from '@/__tests__/utils/factories';

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

describe('useProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch all projects for user company', async () => {
    const mockProjects = [
      mockProject({ company_id: 'company-123' }),
      mockProject({ company_id: 'company-123' }),
    ];

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({ data: mockProjects, error: null });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
    } as any);

    const { result } = renderHook(() => useProjects(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockProjects);
    expect(supabase.from).toHaveBeenCalledWith('projects');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('company_id', 'company-123');
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('should handle error when fetching projects fails', async () => {
    const mockError = new Error('Database error');

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({ data: null, error: mockError });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
    } as any);

    const { result } = renderHook(() => useProjects(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(mockError);
  });
});

describe('useProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch single project by id', async () => {
    const mockProjectData = mockProject({ id: 'project-123' });

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({ data: mockProjectData, error: null });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    } as any);

    const { result } = renderHook(() => useProject('project-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockProjectData);
    expect(mockEq).toHaveBeenCalledWith('id', 'project-123');
  });

  it('should be disabled when projectId is undefined', () => {
    const { result } = renderHook(() => useProject(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
  });
});

describe('useCreateProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create project with company_id', async () => {
    const input = {
      name: 'New Construction Project',
      description: 'Test project',
      status: 'active' as const,
      start_date: '2024-01-01',
      company_id: 'company-123', // Add company_id to input
    };

    const mockCreatedProject = mockProject({
      ...input,
      company_id: 'company-123',
    });

    const mockInsert = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({ data: mockCreatedProject, error: null });

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
      select: mockSelect,
      single: mockSingle,
    } as any);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync(input);

    expect(mockInsert).toHaveBeenCalledWith({
      ...input,
      company_id: 'company-123',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['projects'], exact: false });
  });
});

describe('useUpdateProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update project and invalidate queries', async () => {
    const updates = {
      id: 'project-123',
      name: 'Updated Project Name',
      status: 'completed' as const,
    };

    const mockUpdatedProject = mockProject(updates);

    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({ data: mockUpdatedProject, error: null });

    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate,
      eq: mockEq,
      select: mockSelect,
      single: mockSingle,
    } as any);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateProject(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync(updates);

    expect(mockUpdate).toHaveBeenCalledWith({
      name: 'Updated Project Name',
      status: 'completed',
    });
    expect(mockEq).toHaveBeenCalledWith('id', 'project-123');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['projects'], exact: false });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['projects', 'project-123'], exact: false });
  });
});

describe('useDeleteProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete project and invalidate queries', async () => {
    const projectId = 'project-123';

    const mockDelete = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(supabase.from).mockReturnValue({
      delete: mockDelete,
      eq: mockEq,
    } as any);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteProject(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync(projectId);

    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', projectId);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['projects'], exact: false });
  });

  it('should handle deletion errors', async () => {
    const mockError = new Error('Delete failed');

    const mockDelete = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ error: mockError });

    vi.mocked(supabase.from).mockReturnValue({
      delete: mockDelete,
      eq: mockEq,
    } as any);

    const { result } = renderHook(() => useDeleteProject(), {
      wrapper: createWrapper(),
    });

    await expect(result.current.mutateAsync('project-123')).rejects.toThrow('Delete failed');
  });
});
