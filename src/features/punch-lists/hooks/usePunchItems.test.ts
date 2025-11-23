import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import {
  usePunchItems,
  usePunchItem,
  useCreatePunchItem,
  useUpdatePunchItem,
  useDeletePunchItem,
  useUpdatePunchItemStatus,
} from './usePunchItems';
import { supabase } from '@/lib/supabase';
import { createWrapper } from '@/__tests__/utils/TestProviders';
import { faker } from '@faker-js/faker';
import type { PunchItem } from '@/types/database';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock Auth Context
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

// Factory for mock punch items
const mockPunchItem = (overrides: Partial<PunchItem> = {}): PunchItem => ({
  id: faker.string.uuid(),
  project_id: faker.string.uuid(),
  location: faker.location.buildingNumber() + ' ' + faker.location.street(),
  description: faker.lorem.sentence(),
  status: faker.helpers.arrayElement(['open', 'in_progress', 'completed', 'verified', 'rejected']),
  priority: faker.helpers.arrayElement(['low', 'medium', 'high', 'critical']),
  trade: faker.helpers.arrayElement(['Electrical', 'Plumbing', 'HVAC', 'Drywall', 'Painting']),
  assigned_to: faker.string.uuid(),
  marked_complete_by: null,
  marked_complete_at: null,
  verified_by: null,
  verified_at: null,
  due_date: faker.date.future().toISOString().split('T')[0],
  photo_urls: [],
  notes: faker.lorem.paragraph(),
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  deleted_at: null,
  ...overrides,
});

describe('usePunchItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch all punch items for a project', async () => {
    const projectId = 'project-123';
    const punchItems = [
      mockPunchItem({ project_id: projectId }),
      mockPunchItem({ project_id: projectId }),
      mockPunchItem({ project_id: projectId }),
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: punchItems,
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => usePunchItems(projectId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(3);
    expect(result.current.data).toEqual(punchItems);
    expect(supabase.from).toHaveBeenCalledWith('punch_items');
  });

  it('should be disabled when projectId is undefined', () => {
    const { result } = renderHook(() => usePunchItems(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.isPending).toBe(true);
  });

  it('should filter out soft-deleted punch items', async () => {
    const projectId = 'project-123';
    const activePunchItems = [
      mockPunchItem({ project_id: projectId, deleted_at: null }),
      mockPunchItem({ project_id: projectId, deleted_at: null }),
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: activePunchItems,
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => usePunchItems(projectId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.every(item => item.deleted_at === null)).toBe(true);
  });

  it('should handle error when fetching punch items fails', async () => {
    const projectId = 'project-123';
    const mockError = new Error('Database error');

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => usePunchItems(projectId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(mockError);
  });
});

describe('usePunchItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch single punch item by ID', async () => {
    const punchItemId = 'punch-123';
    const punchItem = mockPunchItem({ id: punchItemId });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: punchItem,
            error: null,
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => usePunchItem(punchItemId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(punchItem);
  });

  it('should be disabled when punchItemId is undefined', () => {
    const { result } = renderHook(() => usePunchItem(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.isPending).toBe(true);
  });

  it('should handle error when punch item not found', async () => {
    const punchItemId = 'non-existent';
    const mockError = new Error('Punch item not found');

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => usePunchItem(punchItemId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(mockError);
  });
});

describe('useCreatePunchItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a punch item', async () => {
    const input = {
      project_id: 'project-123',
      location: '2nd Floor Lobby',
      description: 'Fix drywall crack',
      status: 'open' as const,
      priority: 'medium' as const,
      trade: 'Drywall',
      assigned_to: 'user-456',
    };

    const createdPunchItem = mockPunchItem(input);

    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: createdPunchItem,
            error: null,
          }),
        }),
      }),
    } as any);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreatePunchItem(), {
      wrapper: createWrapper(queryClient),
    });

    const created = await result.current.mutateAsync(input as any);

    expect(created).toEqual(createdPunchItem);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['punch-items'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['punch-items', createdPunchItem.project_id] });
  });

  it('should throw error when user is not authenticated', async () => {
    const originalMock = vi.mocked(await import('@/lib/auth/AuthContext')).useAuth;

    vi.mocked(await import('@/lib/auth/AuthContext')).useAuth = vi.fn(() => ({
      userProfile: null,
    })) as any;

    const { result } = renderHook(() => useCreatePunchItem(), {
      wrapper: createWrapper(),
    });

    await expect(result.current.mutateAsync({} as any)).rejects.toThrow('User not authenticated');

    vi.mocked(await import('@/lib/auth/AuthContext')).useAuth = originalMock;
  });

  it('should set marked_complete_by and verified_by to null on creation', async () => {
    const input = {
      project_id: 'project-123',
      location: 'Test Location',
      description: 'Test description',
      status: 'open' as const,
      priority: 'low' as const,
    };

    const createdPunchItem = mockPunchItem({
      ...input,
      marked_complete_by: null,
      verified_by: null,
    });

    const insertSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: createdPunchItem,
          error: null,
        }),
      }),
    });

    vi.mocked(supabase.from).mockReturnValue({
      insert: insertSpy,
    } as any);

    const { result } = renderHook(() => useCreatePunchItem(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync(input as any);

    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        marked_complete_by: null,
        verified_by: null,
      })
    );
  });
});

describe('useUpdatePunchItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update a punch item', async () => {
    const punchItemId = 'punch-123';
    const updates = {
      description: 'Updated description',
      priority: 'high' as const,
    };

    const updatedPunchItem = mockPunchItem({ id: punchItemId, ...updates });

    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: updatedPunchItem,
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdatePunchItem(), {
      wrapper: createWrapper(queryClient),
    });

    const updated = await result.current.mutateAsync({ id: punchItemId, ...updates });

    expect(updated).toEqual(updatedPunchItem);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['punch-items', punchItemId] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['punch-items', updatedPunchItem.project_id] });
  });

  it('should handle update errors', async () => {
    const mockError = new Error('Update failed');

    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useUpdatePunchItem(), {
      wrapper: createWrapper(),
    });

    await expect(result.current.mutateAsync({ id: 'punch-123' })).rejects.toThrow('Update failed');
  });
});

describe('useDeletePunchItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should soft delete a punch item', async () => {
    const punchItemId = 'punch-123';

    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      }),
    } as any);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeletePunchItem(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync(punchItemId);

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['punch-items'] });
  });

  it('should set deleted_at timestamp', async () => {
    const punchItemId = 'punch-123';
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        error: null,
      }),
    });

    vi.mocked(supabase.from).mockReturnValue({
      update: updateSpy,
    } as any);

    const { result } = renderHook(() => useDeletePunchItem(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync(punchItemId);

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        deleted_at: expect.any(String),
      })
    );
  });
});

describe('useUpdatePunchItemStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update status to completed and track who completed it', async () => {
    const punchItemId = 'punch-123';
    const updatedPunchItem = mockPunchItem({
      id: punchItemId,
      status: 'completed',
      marked_complete_by: mockUserProfile.id,
      marked_complete_at: expect.any(String),
    });

    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: updatedPunchItem,
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useUpdatePunchItemStatus(), {
      wrapper: createWrapper(),
    });

    const updated = await result.current.mutateAsync({
      punchItemId,
      status: 'completed',
    });

    expect(updated.status).toBe('completed');
    expect(updated.marked_complete_by).toBe(mockUserProfile.id);
  });

  it('should update status to verified and track who verified it', async () => {
    const punchItemId = 'punch-123';
    const updatedPunchItem = mockPunchItem({
      id: punchItemId,
      status: 'verified',
      verified_by: mockUserProfile.id,
      verified_at: expect.any(String),
    });

    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: updatedPunchItem,
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useUpdatePunchItemStatus(), {
      wrapper: createWrapper(),
    });

    const updated = await result.current.mutateAsync({
      punchItemId,
      status: 'verified',
    });

    expect(updated.status).toBe('verified');
    expect(updated.verified_by).toBe(mockUserProfile.id);
  });

  it('should update status without tracking user for other statuses', async () => {
    const punchItemId = 'punch-123';
    const updatedPunchItem = mockPunchItem({
      id: punchItemId,
      status: 'in_progress',
    });

    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: updatedPunchItem,
            error: null,
          }),
        }),
      }),
    });

    vi.mocked(supabase.from).mockReturnValue({
      update: updateSpy,
    } as any);

    const { result } = renderHook(() => useUpdatePunchItemStatus(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      punchItemId,
      status: 'in_progress',
    });

    // Should not include marked_complete_by or verified_by fields
    expect(updateSpy).toHaveBeenCalledWith({
      status: 'in_progress',
    });
  });

  it('should invalidate relevant queries after status update', async () => {
    const punchItemId = 'punch-123';
    const projectId = 'project-456';
    const updatedPunchItem = mockPunchItem({
      id: punchItemId,
      project_id: projectId,
      status: 'completed',
    });

    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: updatedPunchItem,
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdatePunchItemStatus(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({
      punchItemId,
      status: 'completed',
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['punch-items'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['punch-items', punchItemId] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['punch-items', projectId] });
  });
});
