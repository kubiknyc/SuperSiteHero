import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import {
  useDocuments,
  useDocument,
  useDocumentVersions,
  useFolders,
  useFolder,
  useCreateDocument,
  useUpdateDocument,
  useDeleteDocument,
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder,
} from './useDocuments';
import { supabase } from '@/lib/supabase';
import { createWrapper } from '@/__tests__/utils/TestProviders';
import { faker } from '@faker-js/faker';
import type { Document, Folder } from '@/types/database';

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

// Factory for mock documents
const mockDocument = (overrides: Partial<Document> = {}): Document => ({
  id: faker.string.uuid(),
  project_id: faker.string.uuid(),
  folder_id: null,
  name: faker.system.fileName(),
  file_name: faker.system.fileName(),
  description: faker.lorem.sentence(),
  file_url: faker.internet.url(),
  file_size: faker.number.int({ min: 1000, max: 10000000 }),
  file_type: faker.helpers.arrayElement(['application/pdf', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  version: '1',
  supersedes_document_id: null,
  document_type: faker.helpers.arrayElement(['drawing', 'specification', 'contract', 'photo', 'other']),
  status: faker.helpers.arrayElement(['draft', 'in_review', 'approved', 'superseded']),
  created_by: faker.string.uuid(),
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  deleted_at: null,
  discipline: null,
  drawing_number: null,
  is_latest_version: true,
  is_pinned: false,
  issue_date: null,
  received_date: null,
  requires_approval: false,
  revision: null,
  specification_section: null,
  search_vector: null,
  ...overrides,
});

// Factory for mock folders
const mockFolder = (overrides: Partial<Folder> = {}): Folder => ({
  id: faker.string.uuid(),
  project_id: faker.string.uuid(),
  parent_folder_id: null,
  name: faker.system.directoryPath().split('/').pop() || 'Folder',
  description: faker.lorem.sentence(),
  sort_order: faker.number.int({ min: 0, max: 100 }),
  created_by: faker.string.uuid(),
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  deleted_at: null,
  ...overrides,
});

describe('useDocuments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch all documents for a project', async () => {
    const projectId = 'project-123';
    const documents = [
      mockDocument({ project_id: projectId }),
      mockDocument({ project_id: projectId }),
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: documents,
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useDocuments(projectId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data).toEqual(documents);
  });

  it('should filter documents by folder', async () => {
    const projectId = 'project-123';
    const folderId = 'folder-456';
    const folderDocuments = [
      mockDocument({ project_id: projectId, folder_id: folderId }),
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: folderDocuments,
                error: null,
              }),
            }),
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useDocuments(projectId, folderId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.[0].folder_id).toBe(folderId);
  });

  it('should filter root-level documents when folderId is null', async () => {
    const projectId = 'project-123';
    const rootDocuments = [
      mockDocument({ project_id: projectId, folder_id: null }),
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: rootDocuments,
                error: null,
              }),
            }),
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useDocuments(projectId, null), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.[0].folder_id).toBeNull();
  });

  it('should be disabled when projectId is undefined', () => {
    const { result } = renderHook(() => useDocuments(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.isPending).toBe(true);
  });
});

describe('useDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch single document by ID', async () => {
    const documentId = 'doc-123';
    const document = mockDocument({ id: documentId });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: document,
            error: null,
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useDocument(documentId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(document);
  });

  it('should be disabled when documentId is undefined', () => {
    const { result } = renderHook(() => useDocument(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.isPending).toBe(true);
  });
});

describe('useDocumentVersions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch all versions of a document', async () => {
    const documentId = 'doc-123';
    const versions = [
      mockDocument({ id: documentId, version: '3' }),
      mockDocument({ id: 'doc-456', supersedes_document_id: documentId, version: '2' }),
      mockDocument({ id: 'doc-789', supersedes_document_id: documentId, version: '1' }),
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        or: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: versions,
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useDocumentVersions(documentId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(3);
  });

  it('should be disabled when documentId is undefined', () => {
    const { result } = renderHook(() => useDocumentVersions(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.isPending).toBe(true);
  });
});

describe('useFolders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch all folders for a project', async () => {
    const projectId = 'project-123';
    const folders = [
      mockFolder({ project_id: projectId }),
      mockFolder({ project_id: projectId }),
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: folders,
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useFolders(projectId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
  });

  it('should filter folders by parent folder', async () => {
    const projectId = 'project-123';
    const parentFolderId = 'parent-folder-456';
    const childFolders = [
      mockFolder({ project_id: projectId, parent_folder_id: parentFolderId }),
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: childFolders,
                error: null,
              }),
            }),
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useFolders(projectId, parentFolderId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.[0].parent_folder_id).toBe(parentFolderId);
  });

  it('should filter root-level folders when parentFolderId is null', async () => {
    const projectId = 'project-123';
    const rootFolders = [
      mockFolder({ project_id: projectId, parent_folder_id: null }),
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: rootFolders,
                error: null,
              }),
            }),
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useFolders(projectId, null), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.[0].parent_folder_id).toBeNull();
  });
});

describe('useFolder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch single folder by ID', async () => {
    const folderId = 'folder-123';
    const folder = mockFolder({ id: folderId });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: folder,
            error: null,
          }),
        }),
      }),
    } as any);

    const { result } = renderHook(() => useFolder(folderId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(folder);
  });

  it('should be disabled when folderId is undefined', () => {
    const { result } = renderHook(() => useFolder(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.isPending).toBe(true);
  });
});

describe('useCreateDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a document', async () => {
    const input = {
      project_id: 'project-123',
      name: 'Test Document.pdf',
      file_url: 'https://example.com/doc.pdf',
      file_size: 1024,
      file_type: 'application/pdf',
      document_type: 'drawing' as const,
      status: 'draft' as const,
    };

    const createdDocument = mockDocument(input);

    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: createdDocument,
            error: null,
          }),
        }),
      }),
    } as any);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateDocument(), {
      wrapper: createWrapper(queryClient),
    });

    const created = await result.current.mutateAsync(input as any);

    expect(created).toEqual(createdDocument);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['documents'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['documents', createdDocument.project_id] });
  });

  it('should throw error when user is not authenticated', async () => {
    const originalMock = vi.mocked(await import('@/lib/auth/AuthContext')).useAuth;

    vi.mocked(await import('@/lib/auth/AuthContext')).useAuth = vi.fn(() => ({
      userProfile: null,
    })) as any;

    const { result } = renderHook(() => useCreateDocument(), {
      wrapper: createWrapper(),
    });

    await expect(result.current.mutateAsync({} as any)).rejects.toThrow('User not authenticated');

    vi.mocked(await import('@/lib/auth/AuthContext')).useAuth = originalMock;
  });
});

describe('useUpdateDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update a document', async () => {
    const documentId = 'doc-123';
    const updates = {
      name: 'Updated Document.pdf',
      status: 'approved' as const,
    };

    const updatedDocument = mockDocument({ id: documentId, ...updates });

    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: updatedDocument,
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateDocument(), {
      wrapper: createWrapper(queryClient),
    });

    const updated = await result.current.mutateAsync({ id: documentId, ...updates });

    expect(updated).toEqual(updatedDocument);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['documents', documentId] });
  });
});

describe('useDeleteDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should soft delete a document', async () => {
    const documentId = 'doc-123';

    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      }),
    } as any);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteDocument(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync(documentId);

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['documents'] });
  });
});

describe('useCreateFolder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a folder', async () => {
    const input = {
      project_id: 'project-123',
      name: 'Drawings',
      description: 'Project drawings',
      sort_order: 1,
    };

    const createdFolder = mockFolder(input);

    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: createdFolder,
            error: null,
          }),
        }),
      }),
    } as any);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateFolder(), {
      wrapper: createWrapper(queryClient),
    });

    const created = await result.current.mutateAsync(input as any);

    expect(created).toEqual(createdFolder);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['folders'] });
  });

  it('should throw error when user is not authenticated', async () => {
    const originalMock = vi.mocked(await import('@/lib/auth/AuthContext')).useAuth;

    vi.mocked(await import('@/lib/auth/AuthContext')).useAuth = vi.fn(() => ({
      userProfile: null,
    })) as any;

    const { result } = renderHook(() => useCreateFolder(), {
      wrapper: createWrapper(),
    });

    await expect(result.current.mutateAsync({} as any)).rejects.toThrow('User not authenticated');

    vi.mocked(await import('@/lib/auth/AuthContext')).useAuth = originalMock;
  });
});

describe('useUpdateFolder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update a folder', async () => {
    const folderId = 'folder-123';
    const updates = {
      name: 'Updated Folder Name',
    };

    const updatedFolder = mockFolder({ id: folderId, ...updates });

    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: updatedFolder,
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateFolder(), {
      wrapper: createWrapper(queryClient),
    });

    const updated = await result.current.mutateAsync({ id: folderId, ...updates });

    expect(updated).toEqual(updatedFolder);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['folders', folderId] });
  });
});

describe('useDeleteFolder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should soft delete a folder', async () => {
    const folderId = 'folder-123';

    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      }),
    } as any);

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteFolder(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync(folderId);

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['folders'] });
  });
});
