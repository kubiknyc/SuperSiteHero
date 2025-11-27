/**
 * Tests for document version control API methods
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { documentsApi } from './documents'
import { apiClient } from '../client'
import type { Document } from '@/types/database'

// Mock the apiClient
vi.mock('../client', () => ({
  apiClient: {
    select: vi.fn(),
    selectOne: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('Document Version Control API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockDocument: Document = {
    id: 'doc-1',
    project_id: 'project-1',
    name: 'Test Document',
    file_name: 'test.pdf',
    file_url: 'https://example.com/test.pdf',
    file_type: 'application/pdf',
    file_size: 1024000,
    document_type: 'drawing',
    folder_id: null,
    description: 'Original document',
    discipline: 'Architectural',
    drawing_number: 'A-001',
    specification_section: null,
    version: '1.0',
    revision: 'A',
    is_latest_version: true,
    is_pinned: false,
    status: 'current',
    supersedes_document_id: null,
    issue_date: '2024-01-01T00:00:00Z',
    received_date: null,
    requires_approval: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'user-1',
    deleted_at: null,
    search_vector: null,
  }

  describe('createDocumentVersion', () => {
    it('should create a new version and supersede the old one', async () => {
      const newFileUrl = 'https://example.com/test-v2.pdf'
      const versionNotes = 'Updated design'

      vi.mocked(apiClient.selectOne).mockResolvedValueOnce(mockDocument)
      vi.mocked(apiClient.update).mockResolvedValueOnce({
        ...mockDocument,
        is_latest_version: false,
        status: 'superseded',
      })
      vi.mocked(apiClient.insert).mockResolvedValueOnce({
        ...mockDocument,
        id: 'doc-2',
        version: '1.1',
        file_url: newFileUrl,
        description: versionNotes,
        is_latest_version: true,
        status: 'current',
        supersedes_document_id: 'doc-1',
      })

      const result = await documentsApi.createDocumentVersion(
        'doc-1',
        newFileUrl,
        versionNotes
      )

      // Verify old document was marked as superseded
      expect(apiClient.update).toHaveBeenCalledWith('documents', 'doc-1', {
        is_latest_version: false,
        status: 'superseded',
      })

      // Verify new document was created with incremented version
      expect(apiClient.insert).toHaveBeenCalled()
      expect(result.version).toBe('1.1')
      expect(result.file_url).toBe(newFileUrl)
      expect(result.description).toBe(versionNotes)
      expect(result.supersedes_document_id).toBe('doc-1')
    })

    it('should increment version from 1.0 to 1.1', async () => {
      const docWithVersion = { ...mockDocument, version: '1.0' }
      vi.mocked(apiClient.selectOne).mockResolvedValueOnce(docWithVersion)
      vi.mocked(apiClient.update).mockResolvedValueOnce(docWithVersion)
      vi.mocked(apiClient.insert).mockResolvedValueOnce({
        ...docWithVersion,
        id: 'doc-2',
        version: '1.1',
      })

      const result = await documentsApi.createDocumentVersion(
        'doc-1',
        'https://example.com/new.pdf'
      )

      expect(result.version).toBe('1.1')
    })

    it('should increment version from 2.5 to 2.6', async () => {
      const docWithVersion = { ...mockDocument, version: '2.5' }
      vi.mocked(apiClient.selectOne).mockResolvedValueOnce(docWithVersion)
      vi.mocked(apiClient.update).mockResolvedValueOnce(docWithVersion)
      vi.mocked(apiClient.insert).mockResolvedValueOnce({
        ...docWithVersion,
        id: 'doc-2',
        version: '2.6',
      })

      const result = await documentsApi.createDocumentVersion(
        'doc-1',
        'https://example.com/new.pdf'
      )

      expect(result.version).toBe('2.6')
    })

    it('should throw error if document ID is missing', async () => {
      await expect(
        documentsApi.createDocumentVersion('', 'https://example.com/test.pdf')
      ).rejects.toThrow('Document ID is required')
    })

    it('should throw error if file URL is missing', async () => {
      await expect(
        documentsApi.createDocumentVersion('doc-1', '')
      ).rejects.toThrow('File URL is required')
    })

    it('should use original description if no version notes provided', async () => {
      vi.mocked(apiClient.selectOne).mockResolvedValueOnce(mockDocument)
      vi.mocked(apiClient.update).mockResolvedValueOnce(mockDocument)
      vi.mocked(apiClient.insert).mockResolvedValueOnce({
        ...mockDocument,
        id: 'doc-2',
        version: '1.1',
        description: mockDocument.description,
      })

      const result = await documentsApi.createDocumentVersion(
        'doc-1',
        'https://example.com/new.pdf'
      )

      expect(result.description).toBe(mockDocument.description)
    })
  })

  describe('getDocumentVersions', () => {
    it('should retrieve all versions of a document', async () => {
      const versions = [
        { ...mockDocument, id: 'doc-1', version: '1.0', created_at: '2024-01-01' },
        { ...mockDocument, id: 'doc-2', version: '1.1', created_at: '2024-01-02' },
        { ...mockDocument, id: 'doc-3', version: '1.2', created_at: '2024-01-03' },
      ]

      vi.mocked(apiClient.selectOne).mockResolvedValueOnce(mockDocument)
      vi.mocked(apiClient.select).mockResolvedValueOnce(versions)

      const result = await documentsApi.getDocumentVersions('doc-1')

      expect(result).toHaveLength(3)
      expect(result).toEqual(versions)
    })

    it('should throw error if document ID is missing', async () => {
      await expect(documentsApi.getDocumentVersions('')).rejects.toThrow(
        'Document ID is required'
      )
    })

    it('should filter versions by project and name', async () => {
      vi.mocked(apiClient.selectOne).mockResolvedValueOnce(mockDocument)
      vi.mocked(apiClient.select).mockResolvedValueOnce([mockDocument])

      await documentsApi.getDocumentVersions('doc-1')

      expect(apiClient.select).toHaveBeenCalledWith('documents', {
        filters: [
          { column: 'project_id', operator: 'eq', value: 'project-1' },
          { column: 'name', operator: 'eq', value: 'Test Document' },
        ],
        orderBy: { column: 'created_at', ascending: true },
      })
    })
  })

  describe('getLatestVersion', () => {
    it('should return the latest version', async () => {
      const versions = [
        {
          ...mockDocument,
          id: 'doc-1',
          version: '1.0',
          is_latest_version: false,
        },
        {
          ...mockDocument,
          id: 'doc-2',
          version: '1.1',
          is_latest_version: false,
        },
        {
          ...mockDocument,
          id: 'doc-3',
          version: '1.2',
          is_latest_version: true,
        },
      ]

      vi.mocked(apiClient.selectOne).mockResolvedValueOnce(mockDocument)
      vi.mocked(apiClient.select).mockResolvedValueOnce(versions)

      const result = await documentsApi.getLatestVersion('doc-1')

      expect(result.id).toBe('doc-3')
      expect(result.version).toBe('1.2')
      expect(result.is_latest_version).toBe(true)
    })

    it('should throw error if no latest version found', async () => {
      vi.mocked(apiClient.selectOne).mockResolvedValueOnce(mockDocument)
      vi.mocked(apiClient.select).mockResolvedValueOnce([
        { ...mockDocument, is_latest_version: false },
      ])

      await expect(documentsApi.getLatestVersion('doc-1')).rejects.toThrow(
        'Latest version not found'
      )
    })
  })

  describe('revertToVersion', () => {
    it('should mark selected version as latest and mark current as superseded', async () => {
      const versions = [
        {
          ...mockDocument,
          id: 'doc-1',
          version: '1.0',
          is_latest_version: false,
        },
        {
          ...mockDocument,
          id: 'doc-2',
          version: '1.1',
          is_latest_version: true,
        },
      ]

      // First selectOne call is for getting the version document
      vi.mocked(apiClient.selectOne).mockResolvedValueOnce(versions[0])
      // Second selectOne call is from getDocumentVersions
      vi.mocked(apiClient.selectOne).mockResolvedValueOnce(mockDocument)
      // Select call is from getDocumentVersions
      vi.mocked(apiClient.select).mockResolvedValueOnce(versions)
      // First update marks current latest as superseded
      vi.mocked(apiClient.update).mockResolvedValueOnce(versions[1])
      // Second update marks selected version as latest
      vi.mocked(apiClient.update).mockResolvedValueOnce({
        ...versions[0],
        is_latest_version: true,
        status: 'current',
      })

      const result = await documentsApi.revertToVersion('doc-1')

      // Verify current latest was marked as superseded
      expect(apiClient.update).toHaveBeenCalledWith('documents', 'doc-2', {
        is_latest_version: false,
        status: 'superseded',
      })

      // Verify selected version was marked as latest
      expect(apiClient.update).toHaveBeenCalledWith('documents', 'doc-1', {
        is_latest_version: true,
        status: 'current',
      })

      expect(result.is_latest_version).toBe(true)
      expect(result.status).toBe('current')
    })

    it('should throw error if version ID is missing', async () => {
      await expect(documentsApi.revertToVersion('')).rejects.toThrow(
        'Version ID is required'
      )
    })
  })

  describe('compareVersions', () => {
    it('should compare metadata between two versions', async () => {
      const version1 = {
        ...mockDocument,
        id: 'doc-1',
        version: '1.0',
        revision: 'A',
        file_size: 1000,
        issue_date: '2024-01-01',
        description: 'Version 1',
        status: 'superseded',
      }

      const version2 = {
        ...mockDocument,
        id: 'doc-2',
        version: '1.1',
        revision: 'B',
        file_size: 2000,
        issue_date: '2024-01-02',
        description: 'Version 2',
        status: 'current',
      }

      vi.mocked(apiClient.selectOne)
        .mockResolvedValueOnce(version1)
        .mockResolvedValueOnce(version2)

      const result = await documentsApi.compareVersions('doc-1', 'doc-2')

      expect(result.version1).toEqual(version1)
      expect(result.version2).toEqual(version2)
      expect(result.differences).toHaveLength(6)
      expect(result.differences).toContainEqual({
        field: 'version',
        version1Value: '1.0',
        version2Value: '1.1',
      })
      expect(result.differences).toContainEqual({
        field: 'revision',
        version1Value: 'A',
        version2Value: 'B',
      })
      expect(result.differences).toContainEqual({
        field: 'file_size',
        version1Value: 1000,
        version2Value: 2000,
      })
    })

    it('should return empty differences if versions are identical', async () => {
      vi.mocked(apiClient.selectOne)
        .mockResolvedValueOnce(mockDocument)
        .mockResolvedValueOnce(mockDocument)

      const result = await documentsApi.compareVersions('doc-1', 'doc-1')

      expect(result.differences).toHaveLength(0)
    })

    it('should throw error if either version ID is missing', async () => {
      await expect(documentsApi.compareVersions('', 'doc-2')).rejects.toThrow()
      await expect(documentsApi.compareVersions('doc-1', '')).rejects.toThrow()
    })
  })
})
