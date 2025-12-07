// File: /src/features/documents/hooks/useDocumentVersions.test.ts
// Comprehensive tests for document version control hooks

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient } from '@tanstack/react-query'
import {
  useDocumentVersionHistory,
  useLatestDocumentVersion,
  useCreateDocumentVersion,
  useRevertDocumentVersion,
  useCompareDocumentVersions,
} from './useDocuments'
import { documentsApi } from '@/lib/api/services/documents'
import { createWrapper } from '@/__tests__/utils/TestProviders'
import { faker } from '@faker-js/faker'
import type { Document } from '@/types/database'

// Mock the documents API
vi.mock('@/lib/api/services/documents', () => ({
  documentsApi: {
    getDocumentVersions: vi.fn(),
    getLatestVersion: vi.fn(),
    createDocumentVersion: vi.fn(),
    revertToVersion: vi.fn(),
    compareVersions: vi.fn(),
  },
}))

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
  file_type: 'application/pdf',
  version: '1.0',
  supersedes_document_id: null,
  document_type: 'drawing',
  status: 'current',
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
})

describe('useDocumentVersionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch document version history', async () => {
    const documentId = 'doc-123'
    const versions = [
      mockDocument({ id: 'doc-v1', version: '1.0', is_latest_version: false }),
      mockDocument({ id: 'doc-v2', version: '1.1', is_latest_version: false }),
      mockDocument({ id: 'doc-v3', version: '1.2', is_latest_version: true }),
    ]

    vi.mocked(documentsApi.getDocumentVersions).mockResolvedValue(versions)

    const { result } = renderHook(() => useDocumentVersionHistory(documentId), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(documentsApi.getDocumentVersions).toHaveBeenCalledWith(documentId)
    expect(result.current.data).toHaveLength(3)
    expect(result.current.data?.[2].is_latest_version).toBe(true)
  })

  it('should not fetch when documentId is undefined', () => {
    const { result } = renderHook(() => useDocumentVersionHistory(undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
    expect(result.current.isPending).toBe(true)
    expect(documentsApi.getDocumentVersions).not.toHaveBeenCalled()
  })

  it('should handle error when fetching versions fails', async () => {
    const documentId = 'doc-123'
    const error = new Error('Failed to fetch versions')

    vi.mocked(documentsApi.getDocumentVersions).mockRejectedValue(error)

    const { result } = renderHook(() => useDocumentVersionHistory(documentId), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeDefined()
  })
})

describe('useLatestDocumentVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch the latest version of a document', async () => {
    const documentId = 'doc-123'
    const latestVersion = mockDocument({
      id: documentId,
      version: '2.0',
      is_latest_version: true,
    })

    vi.mocked(documentsApi.getLatestVersion).mockResolvedValue(latestVersion)

    const { result } = renderHook(() => useLatestDocumentVersion(documentId), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(documentsApi.getLatestVersion).toHaveBeenCalledWith(documentId)
    expect(result.current.data?.version).toBe('2.0')
    expect(result.current.data?.is_latest_version).toBe(true)
  })

  it('should not fetch when documentId is undefined', () => {
    const { result } = renderHook(() => useLatestDocumentVersion(undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
    expect(result.current.isPending).toBe(true)
    expect(documentsApi.getLatestVersion).not.toHaveBeenCalled()
  })
})

describe('useCreateDocumentVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a new document version', async () => {
    const originalDocId = 'doc-original'
    const newFileUrl = 'https://storage.example.com/new-file.pdf'
    const versionNotes = 'Updated with new drawings'

    const newVersion = mockDocument({
      id: 'doc-new-version',
      version: '1.1',
      supersedes_document_id: originalDocId,
      is_latest_version: true,
      description: versionNotes,
    })

    vi.mocked(documentsApi.createDocumentVersion).mockResolvedValue(newVersion)

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateDocumentVersion(), {
      wrapper: createWrapper(queryClient),
    })

    const created = await result.current.mutateAsync({
      documentId: originalDocId,
      newFileUrl,
      versionNotes,
    })

    expect(documentsApi.createDocumentVersion).toHaveBeenCalledWith(
      originalDocId,
      newFileUrl,
      versionNotes
    )
    expect(created.version).toBe('1.1')
    expect(created.supersedes_document_id).toBe(originalDocId)
    expect(invalidateSpy).toHaveBeenCalled()
  })

  it('should create version without notes', async () => {
    const originalDocId = 'doc-original'
    const newFileUrl = 'https://storage.example.com/new-file.pdf'

    const newVersion = mockDocument({
      id: 'doc-new-version',
      version: '1.1',
    })

    vi.mocked(documentsApi.createDocumentVersion).mockResolvedValue(newVersion)

    const { result } = renderHook(() => useCreateDocumentVersion(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({
      documentId: originalDocId,
      newFileUrl,
    })

    expect(documentsApi.createDocumentVersion).toHaveBeenCalledWith(
      originalDocId,
      newFileUrl,
      undefined
    )
  })

  it('should handle error when creating version fails', async () => {
    const error = new Error('Failed to create version')
    vi.mocked(documentsApi.createDocumentVersion).mockRejectedValue(error)

    const { result } = renderHook(() => useCreateDocumentVersion(), {
      wrapper: createWrapper(),
    })

    await expect(
      result.current.mutateAsync({
        documentId: 'doc-123',
        newFileUrl: 'https://example.com/file.pdf',
      })
    ).rejects.toThrow('Failed to create version')
  })
})

describe('useRevertDocumentVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should revert to a previous version', async () => {
    const versionId = 'doc-v1'
    const revertedDoc = mockDocument({
      id: versionId,
      version: '1.0',
      is_latest_version: true,
      status: 'current',
    })

    vi.mocked(documentsApi.revertToVersion).mockResolvedValue(revertedDoc)

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useRevertDocumentVersion(), {
      wrapper: createWrapper(queryClient),
    })

    const reverted = await result.current.mutateAsync(versionId)

    expect(documentsApi.revertToVersion).toHaveBeenCalledWith(versionId)
    expect(reverted.is_latest_version).toBe(true)
    expect(reverted.status).toBe('current')
    expect(invalidateSpy).toHaveBeenCalled()
  })

  it('should handle error when reverting fails', async () => {
    const error = new Error('Failed to revert version')
    vi.mocked(documentsApi.revertToVersion).mockRejectedValue(error)

    const { result } = renderHook(() => useRevertDocumentVersion(), {
      wrapper: createWrapper(),
    })

    await expect(result.current.mutateAsync('doc-v1')).rejects.toThrow(
      'Failed to revert version'
    )
  })
})

describe('useCompareDocumentVersions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should compare two document versions', async () => {
    const version1Id = 'doc-v1'
    const version2Id = 'doc-v2'

    const version1 = mockDocument({
      id: version1Id,
      version: '1.0',
      file_size: 1000,
      description: 'Original version',
    })
    const version2 = mockDocument({
      id: version2Id,
      version: '2.0',
      file_size: 1500,
      description: 'Updated version',
    })

    const comparison = {
      version1,
      version2,
      differences: [
        { field: 'version', version1Value: '1.0', version2Value: '2.0' },
        { field: 'file_size', version1Value: 1000, version2Value: 1500 },
        {
          field: 'description',
          version1Value: 'Original version',
          version2Value: 'Updated version',
        },
      ],
    }

    vi.mocked(documentsApi.compareVersions).mockResolvedValue(comparison)

    const { result } = renderHook(
      () => useCompareDocumentVersions(version1Id, version2Id),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(documentsApi.compareVersions).toHaveBeenCalledWith(version1Id, version2Id)
    expect(result.current.data?.differences).toHaveLength(3)
    expect(result.current.data?.version1.version).toBe('1.0')
    expect(result.current.data?.version2.version).toBe('2.0')
  })

  it('should not fetch when either version ID is undefined', () => {
    const { result: result1 } = renderHook(
      () => useCompareDocumentVersions(undefined, 'doc-v2'),
      { wrapper: createWrapper() }
    )

    expect(result1.isFetching).toBe(false)
    expect(documentsApi.compareVersions).not.toHaveBeenCalled()

    const { result: result2 } = renderHook(
      () => useCompareDocumentVersions('doc-v1', undefined),
      { wrapper: createWrapper() }
    )

    expect(result2.isFetching).toBe(false)
  })

  it('should handle comparison with no differences', async () => {
    const version1Id = 'doc-v1'
    const version2Id = 'doc-v2'

    const version1 = mockDocument({ id: version1Id })
    const version2 = mockDocument({ id: version2Id })

    const comparison = {
      version1,
      version2,
      differences: [],
    }

    vi.mocked(documentsApi.compareVersions).mockResolvedValue(comparison)

    const { result } = renderHook(
      () => useCompareDocumentVersions(version1Id, version2Id),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.differences).toHaveLength(0)
  })
})
