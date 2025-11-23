import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import {
  useTasks,
  useTask,
  useMyTasks,
  useCreateTask,
} from './useTasks';
import { supabase } from '@/lib/supabase';
import { createWrapper } from '@/__tests__/utils/TestProviders';
import { faker } from '@faker-js/faker';
import type { Task, CreateInput } from '@/types/database';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock Auth Context with user profile
const mockUserProfile = {
  id: 'user-123',
  company_id: 'company-123',
  role: 'superintendent',
};

vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({
    userProfile: mockUserProfile,
  }),
}));

// Factory for mock tasks
const mockTask = (overrides: Partial<Task> = {}): Task => ({
  id: faker.string.uuid(),
  project_id: faker.string.uuid(),
  title: faker.lorem.sentence(),
  description: faker.lorem.paragraph(),
  status: faker.helpers.arrayElement(['pending', 'in_progress', 'completed', 'cancelled']),
  priority: faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent']),
  assigned_to_user_id: faker.string.uuid(),
  assigned_to_subcontractor_id: null,
  due_date: faker.date.future().toISOString().split('T')[0],
  start_date: faker.date.recent().toISOString().split('T')[0],
  completed_date: null,
  estimated_hours: faker.number.int({ min: 1, max: 40 }),
  actual_hours: null,
  dependencies: [],
  created_by: faker.string.uuid(),
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  deleted_at: null,
  ...overrides,
});

describe('useTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch all active tasks for a project', async () => {
    const projectId = 'project-123';
    const mockTasksList = [
      mockTask({ project_id: projectId, deleted_at: null }),
      mockTask({ project_id: projectId, deleted_at: null }),
      mockTask({ project_id: projectId, deleted_at: null }),
    ];

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockIs = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({ data: mockTasksList, error: null });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      is: mockIs,
      order: mockOrder,
    } as any);

    const { result } = renderHook(() => useTasks(projectId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockTasksList);
    expect(supabase.from).toHaveBeenCalledWith('tasks');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('project_id', projectId);
    expect(mockIs).toHaveBeenCalledWith('deleted_at', null);
    expect(mockOrder).toHaveBeenCalledWith('due_date', { ascending: true });
  });

  it('should be disabled when projectId is undefined', () => {
    const { result } = renderHook(() => useTasks(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.isPending).toBe(true);
  });

  it('should handle error when fetching tasks fails', async () => {
    const projectId = 'project-123';
    const mockError = new Error('Network error');

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockIs = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({ data: null, error: mockError });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      is: mockIs,
      order: mockOrder,
    } as any);

    const { result } = renderHook(() => useTasks(projectId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(mockError);
  });

  it('should filter out soft-deleted tasks', async () => {
    const projectId = 'project-123';
    const activeTasks = [
      mockTask({ project_id: projectId, deleted_at: null }),
      mockTask({ project_id: projectId, deleted_at: null }),
    ];

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockIs = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({ data: activeTasks, error: null });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      is: mockIs,
      order: mockOrder,
    } as any);

    const { result } = renderHook(() => useTasks(projectId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockIs).toHaveBeenCalledWith('deleted_at', null);
    expect(result.current.data).toHaveLength(2);
    result.current.data?.forEach(task => {
      expect(task.deleted_at).toBeNull();
    });
  });
});

describe('useTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch single task by id', async () => {
    const taskId = 'task-123';
    const mockTaskData = mockTask({ id: taskId });

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({ data: mockTaskData, error: null });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    } as any);

    const { result } = renderHook(() => useTask(taskId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockTaskData);
    expect(mockEq).toHaveBeenCalledWith('id', taskId);
    expect(mockSingle).toHaveBeenCalled();
  });

  it('should be disabled when taskId is undefined', () => {
    const { result } = renderHook(() => useTask(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.isPending).toBe(true);
  });

  it('should handle task not found error', async () => {
    const taskId = 'non-existent-task';
    const mockError = new Error('Task not found');

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    } as any);

    const { result } = renderHook(() => useTask(taskId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(mockError);
  });
});

describe('useMyTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch tasks assigned to current user', async () => {
    const myTasks = [
      mockTask({ assigned_to_user_id: mockUserProfile.id, deleted_at: null }),
      mockTask({ assigned_to_user_id: mockUserProfile.id, deleted_at: null }),
    ];

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockIs = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({ data: myTasks, error: null });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      is: mockIs,
      order: mockOrder,
    } as any);

    const { result } = renderHook(() => useMyTasks(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(myTasks);
    expect(mockEq).toHaveBeenCalledWith('assigned_to_user_id', mockUserProfile.id);
    expect(mockIs).toHaveBeenCalledWith('deleted_at', null);
    expect(mockOrder).toHaveBeenCalledWith('due_date', { ascending: true });
  });

  it('should filter by project when projectId provided', async () => {
    const projectId = 'project-123';
    const myProjectTasks = [
      mockTask({
        assigned_to_user_id: mockUserProfile.id,
        project_id: projectId,
        deleted_at: null
      }),
    ];

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn(() => ({
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: myProjectTasks, error: null }),
    }));
    const mockIs = vi.fn().mockReturnThis();

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      is: mockIs,
    } as any);

    const { result } = renderHook(() => useMyTasks(projectId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(myProjectTasks);
    expect(mockEq).toHaveBeenCalledWith('assigned_to_user_id', mockUserProfile.id);
  });

  it('should return empty array when user has no tasks', async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockIs = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      is: mockIs,
      order: mockOrder,
    } as any);

    const { result } = renderHook(() => useMyTasks(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });
});

describe('useCreateTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create task with user profile', async () => {
    const input: CreateInput<Task> = {
      project_id: 'project-123',
      title: 'Install electrical wiring',
      description: 'Complete electrical installation in building A',
      status: 'pending',
      priority: 'high',
      assigned_to_user_id: 'worker-456',
      due_date: '2024-02-01',
      start_date: '2024-01-20',
      tags: ['electrical', 'urgent'],
      estimated_hours: 8,
    };

    const mockCreatedTask = mockTask({
      ...input,
      id: 'new-task-123',
      created_by: mockUserProfile.id,
    });

    const mockInsert = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({ data: mockCreatedTask, error: null });

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
      select: mockSelect,
      single: mockSingle,
    } as any);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateTask(), {
      wrapper: createWrapper(queryClient),
    });

    const createdTask = await result.current.mutateAsync(input);

    expect(mockInsert).toHaveBeenCalledWith({
      ...input,
      created_by: mockUserProfile.id,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tasks'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tasks', createdTask.project_id] });
  });

  it('should handle validation errors', async () => {
    const invalidInput: CreateInput<Task> = {
      project_id: 'project-123',
      title: '', // Invalid: empty title
      status: 'pending',
      priority: 'medium',
    };

    const mockError = new Error('Title is required');

    const mockInsert = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError });

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
      select: mockSelect,
      single: mockSingle,
    } as any);

    const { result } = renderHook(() => useCreateTask(), {
      wrapper: createWrapper(),
    });

    await expect(result.current.mutateAsync(invalidInput)).rejects.toThrow('Title is required');
  });

  it('should handle duplicate task creation', async () => {
    const input: CreateInput<Task> = {
      project_id: 'project-123',
      title: 'Duplicate task',
      status: 'pending',
      priority: 'medium',
    };

    const mockError = new Error('Task with this title already exists');

    const mockInsert = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError });

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
      select: mockSelect,
      single: mockSingle,
    } as any);

    const { result } = renderHook(() => useCreateTask(), {
      wrapper: createWrapper(),
    });

    await expect(result.current.mutateAsync(input)).rejects.toThrow('Task with this title already exists');
  });

  it('should throw error when user profile is not available', async () => {
    // Temporarily replace the auth mock
    const originalMock = vi.mocked(await import('@/lib/auth/AuthContext')).useAuth;

    vi.mocked(await import('@/lib/auth/AuthContext')).useAuth = vi.fn(() => ({
      userProfile: null,
    })) as any;

    const input: CreateInput<Task> = {
      project_id: 'project-123',
      title: 'Test task',
      status: 'pending',
      priority: 'medium',
    };

    const { result } = renderHook(() => useCreateTask(), {
      wrapper: createWrapper(),
    });

    await expect(result.current.mutateAsync(input)).rejects.toThrow('User profile required');

    // Restore original mock
    vi.mocked(await import('@/lib/auth/AuthContext')).useAuth = originalMock;
  });
});