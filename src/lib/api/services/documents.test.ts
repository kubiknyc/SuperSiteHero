/**
 * Documents API Service Tests
 *
 * Tests document and folder management operations including version control.
 */

import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { documentsApi } from './documents'
import { apiClient } from '../client'
import { ApiErrorClass } from '../errors'
import type { Document, Folder } from '@/types/database'

// Mock the API client
vi.mock('../client', () => ({
  apiClient: {
    select: vi.fn(),
    selectOne: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('documentsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getProjectDocuments', () => {
    const projectId = 'project-123'
    const mockDocuments: Document[] = [
      {
        id: 'doc-1',
        project_id: projectId,
        name: 'Test Document',
        file_name: 'test.pdf',
        file_url: 'https://example.com/test.pdf',
        file_type: 'application/pdf',
        file_size: 1024,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      } as Document,
    ]

    it('should fetch project documents with default ordering', async () => {
      vi.mocked(apiClient.select).mockResolvedValue(mockDocuments)

      const result = await documentsApi.getProjectDocuments(projectId)

      expect(apiClient.select).toHaveBeenCalledWith('documents', {
        filters: [{ column: 'project_id', operator: 'eq', value: projectId }],
        orderBy: { column: 'created_at', ascending: false },
      })
      expect(result).toEqual(mockDocuments)
    })

    it('should fetch project documents with custom options', async () => {
      vi.mocked(apiClient.select).mockResolvedValue(mockDocuments)

      await documentsApi.getProjectDocuments(projectId, {
        filters: [{ column: 'document_type', operator: 'eq', value: 'drawing' }],
        orderBy: { column: 'name', ascending: true },
      })

      expect(apiClient.select).toHaveBeenCalledWith('documents', {
        filters: [
          { column: 'document_type', operator: 'eq', value: 'drawing' },
          { column: 'project_id', operator: 'eq', value: projectId },
        ],
        orderBy: { column: 'name', ascending: true },
      })
    })

    it('should wrap non-API errors in ApiErrorClass', async () => {
      vi.mocked(apiClient.select).mockRejectedValue(new Error('Database error'))

      await expect(documentsApi.getProjectDocuments(projectId)).rejects.toThrow(
        ApiErrorClass
      )
      await expect(documentsApi.getProjectDocuments(projectId)).rejects.toThrow(
        'Failed to fetch documents'
      )
    })

    it('should preserve API errors', async () => {
      const apiError = new ApiErrorClass({
        code: 'CUSTOM_ERROR',
        message: 'Custom error message',
      })
      vi.mocked(apiClient.select).mockRejectedValue(apiError)

      await expect(documentsApi.getProjectDocuments(projectId)).rejects.toThrow(
        apiError
      )
    })
  })

  describe('getDocument', () => {
    const documentId = 'doc-123'
    const mockDocument: Document = {
      id: documentId,
      project_id: 'project-123',
      name: 'Test Document',
      file_name: 'test.pdf',
      file_url: 'https://example.com/test.pdf',
      file_type: 'application/pdf',
      file_size: 1024,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    } as Document

    it('should fetch a single document', async () => {
      vi.mocked(apiClient.selectOne).mockResolvedValue(mockDocument)

      const result = await documentsApi.getDocument(documentId)

      expect(apiClient.selectOne).toHaveBeenCalledWith('documents', documentId)
      expect(result).toEqual(mockDocument)
    })

    it('should wrap errors in ApiErrorClass', async () => {
      vi.mocked(apiClient.selectOne).mockRejectedValue(new Error('Not found'))

      await expect(documentsApi.getDocument(documentId)).rejects.toThrow(
        ApiErrorClass
      )
    })
  })

  describe('createDocument', () => {
    const validDocumentData = {
      project_id: 'project-123',
      name: 'New Document',
      file_name: 'new.pdf',
      file_url: 'https://example.com/new.pdf',
      file_type: 'application/pdf',
      file_size: 2048,
    }

    it('should create a document with default status and version flags', async () => {
      const mockCreatedDoc = { id: 'doc-new', ...validDocumentData } as Document
      vi.mocked(apiClient.insert).mockResolvedValue(mockCreatedDoc)

      const result = await documentsApi.createDocument(validDocumentData)

      expect(apiClient.insert).toHaveBeenCalledWith('documents', {
        ...validDocumentData,
        is_latest_version: true,
        status: 'current',
      })
      expect(result).toEqual(mockCreatedDoc)
    })

    it('should throw error if project_id is missing', async () => {
      const invalidData = { ...validDocumentData, project_id: '' }

      await expect(documentsApi.createDocument(invalidData)).rejects.toThrow(
        'Project ID is required'
      )
      expect(apiClient.insert).not.toHaveBeenCalled()
    })

    it('should throw error if file_url is missing', async () => {
      const invalidData = { ...validDocumentData, file_url: '' }

      await expect(documentsApi.createDocument(invalidData)).rejects.toThrow(
        'File URL is required'
      )
      expect(apiClient.insert).not.toHaveBeenCalled()
    })

    it('should wrap API errors', async () => {
      vi.mocked(apiClient.insert).mockRejectedValue(new Error('Database error'))

      await expect(
        documentsApi.createDocument(validDocumentData)
      ).rejects.toThrow('Failed to create document')
    })
  })

  describe('updateDocument', () => {
    const documentId = 'doc-123'
    const updates = { name: 'Updated Name', description: 'New description' }

    it('should update a document', async () => {
      const mockUpdated = { id: documentId, ...updates } as Document
      vi.mocked(apiClient.update).mockResolvedValue(mockUpdated)

      const result = await documentsApi.updateDocument(documentId, updates)

      expect(apiClient.update).toHaveBeenCalledWith(
        'documents',
        documentId,
        updates
      )
      expect(result).toEqual(mockUpdated)
    })

    it('should throw error if document_id is missing', async () => {
      await expect(documentsApi.updateDocument('', updates)).rejects.toThrow(
        'Document ID is required'
      )
      expect(apiClient.update).not.toHaveBeenCalled()
    })

    it('should wrap API errors', async () => {
      vi.mocked(apiClient.update).mockRejectedValue(new Error('Update failed'))

      await expect(
        documentsApi.updateDocument(documentId, updates)
      ).rejects.toThrow('Failed to update document')
    })
  })

  describe('deleteDocument', () => {
    const documentId = 'doc-123'

    it('should delete a document', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue(undefined)

      await documentsApi.deleteDocument(documentId)

      expect(apiClient.delete).toHaveBeenCalledWith('documents', documentId)
    })

    it('should throw error if document_id is missing', async () => {
      await expect(documentsApi.deleteDocument('')).rejects.toThrow(
        'Document ID is required'
      )
      expect(apiClient.delete).not.toHaveBeenCalled()
    })

    it('should wrap API errors', async () => {
      vi.mocked(apiClient.delete).mockRejectedValue(new Error('Delete failed'))

      await expect(documentsApi.deleteDocument(documentId)).rejects.toThrow(
        'Failed to delete document'
      )
    })
  })

  describe('getProjectFolders', () => {
    const projectId = 'project-123'
    const mockFolders: Folder[] = [
      {
        id: 'folder-1',
        project_id: projectId,
        name: 'Drawings',
        sort_order: 1,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      } as Folder,
    ]

    it('should fetch project folders ordered by sort_order', async () => {
      vi.mocked(apiClient.select).mockResolvedValue(mockFolders)

      const result = await documentsApi.getProjectFolders(projectId)

      expect(apiClient.select).toHaveBeenCalledWith('folders', {
        filters: [{ column: 'project_id', operator: 'eq', value: projectId }],
        orderBy: { column: 'sort_order', ascending: true },
      })
      expect(result).toEqual(mockFolders)
    })

    it('should wrap errors', async () => {
      vi.mocked(apiClient.select).mockRejectedValue(new Error('Fetch failed'))

      await expect(documentsApi.getProjectFolders(projectId)).rejects.toThrow(
        'Failed to fetch folders'
      )
    })
  })

  describe('createFolder', () => {
    const validFolderData = {
      project_id: 'project-123',
      name: 'New Folder',
      sort_order: 1,
    }

    it('should create a folder', async () => {
      const mockCreated = { id: 'folder-new', ...validFolderData } as Folder
      vi.mocked(apiClient.insert).mockResolvedValue(mockCreated)

      const result = await documentsApi.createFolder(validFolderData)

      expect(apiClient.insert).toHaveBeenCalledWith('folders', validFolderData)
      expect(result).toEqual(mockCreated)
    })

    it('should throw error if project_id is missing', async () => {
      const invalidData = { ...validFolderData, project_id: '' }

      await expect(documentsApi.createFolder(invalidData)).rejects.toThrow(
        'Project ID is required'
      )
      expect(apiClient.insert).not.toHaveBeenCalled()
    })

    it('should wrap API errors', async () => {
      vi.mocked(apiClient.insert).mockRejectedValue(new Error('Create failed'))

      await expect(documentsApi.createFolder(validFolderData)).rejects.toThrow(
        'Failed to create folder'
      )
    })
  })

  describe('updateFolder', () => {
    const folderId = 'folder-123'
    const updates = { name: 'Updated Folder', sort_order: 2 }

    it('should update a folder', async () => {
      const mockUpdated = { id: folderId, ...updates } as Folder
      vi.mocked(apiClient.update).mockResolvedValue(mockUpdated)

      const result = await documentsApi.updateFolder(folderId, updates)

      expect(apiClient.update).toHaveBeenCalledWith('folders', folderId, updates)
      expect(result).toEqual(mockUpdated)
    })

    it('should wrap errors', async () => {
      vi.mocked(apiClient.update).mockRejectedValue(new Error('Update failed'))

      await expect(documentsApi.updateFolder(folderId, updates)).rejects.toThrow(
        'Failed to update folder'
      )
    })
  })

  describe('deleteFolder', () => {
    const folderId = 'folder-123'

    it('should delete a folder', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue(undefined)

      await documentsApi.deleteFolder(folderId)

      expect(apiClient.delete).toHaveBeenCalledWith('folders', folderId)
    })

    it('should wrap errors', async () => {
      vi.mocked(apiClient.delete).mockRejectedValue(new Error('Delete failed'))

      await expect(documentsApi.deleteFolder(folderId)).rejects.toThrow(
        'Failed to delete folder'
      )
    })
  })

  describe('findDocumentByName', () => {
    const projectId = 'project-123'
    const documentName = 'test.pdf'
    const mockDocument: Document = {
      id: 'doc-1',
      project_id: projectId,
      name: documentName,
      is_latest_version: true,
    } as Document

    it('should find a document by name without folder filter', async () => {
      vi.mocked(apiClient.select).mockResolvedValue([mockDocument])

      const result = await documentsApi.findDocumentByName(
        projectId,
        documentName
      )

      expect(apiClient.select).toHaveBeenCalledWith('documents', {
        filters: [
          { column: 'project_id', operator: 'eq', value: projectId },
          { column: 'name', operator: 'eq', value: documentName },
          { column: 'is_latest_version', operator: 'eq', value: true },
        ],
        pagination: { page: 1, limit: 1 },
      })
      expect(result).toEqual(mockDocument)
    })

    it('should find a document by name with folder filter', async () => {
      const folderId = 'folder-123'
      vi.mocked(apiClient.select).mockResolvedValue([mockDocument])

      await documentsApi.findDocumentByName(projectId, documentName, folderId)

      expect(apiClient.select).toHaveBeenCalledWith('documents', {
        filters: [
          { column: 'project_id', operator: 'eq', value: projectId },
          { column: 'name', operator: 'eq', value: documentName },
          { column: 'is_latest_version', operator: 'eq', value: true },
          { column: 'folder_id', operator: 'eq', value: folderId },
        ],
        pagination: { page: 1, limit: 1 },
      })
    })

    it('should find a document by name with null folder filter', async () => {
      vi.mocked(apiClient.select).mockResolvedValue([mockDocument])

      await documentsApi.findDocumentByName(projectId, documentName, null)

      expect(apiClient.select).toHaveBeenCalledWith('documents', {
        filters: [
          { column: 'project_id', operator: 'eq', value: projectId },
          { column: 'name', operator: 'eq', value: documentName },
          { column: 'is_latest_version', operator: 'eq', value: true },
          { column: 'folder_id', operator: 'eq', value: null },
        ],
        pagination: { page: 1, limit: 1 },
      })
    })

    it('should return null if document not found', async () => {
      vi.mocked(apiClient.select).mockResolvedValue([])

      const result = await documentsApi.findDocumentByName(
        projectId,
        documentName
      )

      expect(result).toBeNull()
    })

    it('should throw error if projectId is missing', async () => {
      await expect(
        documentsApi.findDocumentByName('', documentName)
      ).rejects.toThrow('Project ID is required')
    })

    it('should throw error if documentName is missing', async () => {
      await expect(documentsApi.findDocumentByName(projectId, '')).rejects.toThrow(
        'Document name is required'
      )
    })

    it('should wrap API errors with context', async () => {
      vi.mocked(apiClient.select).mockRejectedValue(new Error('DB error'))

      await expect(
        documentsApi.findDocumentByName(projectId, documentName)
      ).rejects.toThrow('Failed to find document: DB error')
    })
  })

  describe('createDocumentVersion', () => {
    const documentId = 'doc-123'
    const newFileUrl = 'https://example.com/v2.pdf'
    const versionNotes = 'Updated with changes'
    const existingDoc: Document = {
      id: documentId,
      project_id: 'project-123',
      name: 'test.pdf',
      file_name: 'test.pdf',
      file_url: 'https://example.com/v1.pdf',
      file_type: 'application/pdf',
      file_size: 1024,
      version: '1.0',
      is_latest_version: true,
      status: 'current',
    } as Document

    it('should create a new version with incremented version number', async () => {
      vi.mocked(apiClient.selectOne).mockResolvedValue(existingDoc)
      vi.mocked(apiClient.update).mockResolvedValue({
        ...existingDoc,
        is_latest_version: false,
        status: 'superseded',
      })
      const newDoc = { ...existingDoc, version: '1.1' } as Document
      vi.mocked(apiClient.insert).mockResolvedValue(newDoc)

      const result = await documentsApi.createDocumentVersion(
        documentId,
        newFileUrl,
        versionNotes
      )

      // Should mark existing as superseded
      expect(apiClient.update).toHaveBeenCalledWith('documents', documentId, {
        is_latest_version: false,
        status: 'superseded',
      })

      // Should create new version
      expect(apiClient.insert).toHaveBeenCalledWith(
        'documents',
        expect.objectContaining({
          project_id: existingDoc.project_id,
          name: existingDoc.name,
          file_url: newFileUrl,
          version: '1.1',
          is_latest_version: true,
          status: 'current',
          supersedes_document_id: documentId,
          description: versionNotes,
        })
      )
      expect(result).toEqual(newDoc)
    })

    it('should handle version increments correctly', async () => {
      const doc25 = { ...existingDoc, version: '2.5' } as Document
      vi.mocked(apiClient.selectOne).mockResolvedValue(doc25)
      vi.mocked(apiClient.update).mockResolvedValue(doc25)
      vi.mocked(apiClient.insert).mockResolvedValue({
        ...doc25,
        version: '2.6',
      } as Document)

      await documentsApi.createDocumentVersion(documentId, newFileUrl)

      expect(apiClient.insert).toHaveBeenCalledWith(
        'documents',
        expect.objectContaining({
          version: '2.6',
        })
      )
    })

    it('should default to version 1.1 if no version exists', async () => {
      const noVersionDoc = { ...existingDoc, version: undefined } as Document
      vi.mocked(apiClient.selectOne).mockResolvedValue(noVersionDoc)
      vi.mocked(apiClient.update).mockResolvedValue(noVersionDoc)
      vi.mocked(apiClient.insert).mockResolvedValue({
        ...noVersionDoc,
        version: '1.1',
      } as Document)

      await documentsApi.createDocumentVersion(documentId, newFileUrl)

      expect(apiClient.insert).toHaveBeenCalledWith(
        'documents',
        expect.objectContaining({
          version: '1.1',
        })
      )
    })

    it('should throw error if documentId is missing', async () => {
      await expect(
        documentsApi.createDocumentVersion('', newFileUrl)
      ).rejects.toThrow('Document ID is required')
    })

    it('should throw error if newFileUrl is missing', async () => {
      await expect(
        documentsApi.createDocumentVersion(documentId, '')
      ).rejects.toThrow('File URL is required')
    })

    it('should wrap errors', async () => {
      vi.mocked(apiClient.selectOne).mockRejectedValue(new Error('Not found'))

      await expect(
        documentsApi.createDocumentVersion(documentId, newFileUrl)
      ).rejects.toThrow('Failed to create document version')
    })
  })

  describe('getDocumentVersions', () => {
    const documentId = 'doc-123'
    const mockDocument: Document = {
      id: documentId,
      project_id: 'project-123',
      name: 'test.pdf',
    } as Document

    const mockVersions: Document[] = [
      { ...mockDocument, version: '1.0', created_at: '2024-01-01' } as Document,
      { ...mockDocument, version: '1.1', created_at: '2024-01-02' } as Document,
      { ...mockDocument, version: '1.2', created_at: '2024-01-03' } as Document,
    ]

    it('should fetch all versions in chronological order', async () => {
      vi.mocked(apiClient.selectOne).mockResolvedValue(mockDocument)
      vi.mocked(apiClient.select).mockResolvedValue(mockVersions)

      const result = await documentsApi.getDocumentVersions(documentId)

      expect(apiClient.selectOne).toHaveBeenCalledWith('documents', documentId)
      expect(apiClient.select).toHaveBeenCalledWith('documents', {
        filters: [
          { column: 'project_id', operator: 'eq', value: 'project-123' },
          { column: 'name', operator: 'eq', value: 'test.pdf' },
        ],
        orderBy: { column: 'created_at', ascending: true },
      })
      expect(result).toEqual(mockVersions)
    })

    it('should throw error if documentId is missing', async () => {
      await expect(documentsApi.getDocumentVersions('')).rejects.toThrow(
        'Document ID is required'
      )
    })

    it('should wrap errors', async () => {
      vi.mocked(apiClient.selectOne).mockRejectedValue(new Error('Not found'))

      await expect(
        documentsApi.getDocumentVersions(documentId)
      ).rejects.toThrow('Failed to fetch document versions')
    })
  })

  describe('getLatestVersion', () => {
    const documentId = 'doc-123'
    const mockVersions: Document[] = [
      {
        id: 'v1',
        version: '1.0',
        is_latest_version: false,
      } as Document,
      {
        id: 'v2',
        version: '1.1',
        is_latest_version: true,
      } as Document,
    ]

    it('should return the latest version', async () => {
      vi.spyOn(documentsApi, 'getDocumentVersions').mockResolvedValue(
        mockVersions
      )

      const result = await documentsApi.getLatestVersion(documentId)

      expect(result).toEqual(mockVersions[1])
    })

    it('should throw error if no latest version found', async () => {
      const noLatestVersions = mockVersions.map((v) => ({
        ...v,
        is_latest_version: false,
      }))
      vi.spyOn(documentsApi, 'getDocumentVersions').mockResolvedValue(
        noLatestVersions
      )

      await expect(documentsApi.getLatestVersion(documentId)).rejects.toThrow(
        'Latest version not found'
      )
    })

    it('should wrap errors', async () => {
      vi.spyOn(documentsApi, 'getDocumentVersions').mockRejectedValue(
        new Error('Fetch failed')
      )

      await expect(documentsApi.getLatestVersion(documentId)).rejects.toThrow(
        'Failed to fetch latest version'
      )
    })
  })

  describe('revertToVersion', () => {
    const versionId = 'doc-v1'
    const mockVersionDoc: Document = {
      id: versionId,
      project_id: 'project-123',
      name: 'test.pdf',
      version: '1.0',
    } as Document

    const mockAllVersions: Document[] = [
      { ...mockVersionDoc, id: versionId, is_latest_version: false },
      {
        ...mockVersionDoc,
        id: 'doc-v2',
        version: '1.1',
        is_latest_version: true,
      },
    ] as Document[]

    it('should revert to a previous version', async () => {
      vi.mocked(apiClient.selectOne).mockResolvedValue(mockVersionDoc)
      vi.spyOn(documentsApi, 'getDocumentVersions').mockResolvedValue(
        mockAllVersions
      )
      vi.mocked(apiClient.update).mockResolvedValue({
        ...mockVersionDoc,
        is_latest_version: true,
        status: 'current',
      })

      const result = await documentsApi.revertToVersion(versionId)

      // Should mark current latest as superseded
      expect(apiClient.update).toHaveBeenCalledWith('documents', 'doc-v2', {
        is_latest_version: false,
        status: 'superseded',
      })

      // Should mark selected version as latest
      expect(apiClient.update).toHaveBeenCalledWith('documents', versionId, {
        is_latest_version: true,
        status: 'current',
      })

      expect(result.is_latest_version).toBe(true)
      expect(result.status).toBe('current')
    })

    it('should handle case with no current latest version', async () => {
      const noLatestVersions = mockAllVersions.map((v) => ({
        ...v,
        is_latest_version: false,
      }))
      vi.mocked(apiClient.selectOne).mockResolvedValue(mockVersionDoc)
      vi.spyOn(documentsApi, 'getDocumentVersions').mockResolvedValue(
        noLatestVersions
      )
      vi.mocked(apiClient.update).mockResolvedValue({
        ...mockVersionDoc,
        is_latest_version: true,
      })

      await documentsApi.revertToVersion(versionId)

      // Should still mark selected version as latest
      expect(apiClient.update).toHaveBeenCalledWith('documents', versionId, {
        is_latest_version: true,
        status: 'current',
      })
    })

    it('should throw error if versionId is missing', async () => {
      await expect(documentsApi.revertToVersion('')).rejects.toThrow(
        'Version ID is required'
      )
    })

    it('should wrap errors', async () => {
      vi.mocked(apiClient.selectOne).mockRejectedValue(new Error('Not found'))

      await expect(documentsApi.revertToVersion(versionId)).rejects.toThrow(
        'Failed to revert to version'
      )
    })
  })

  describe('compareVersions', () => {
    const version1: Document = {
      id: 'v1',
      version: '1.0',
      revision: 'A',
      file_size: 1024,
      issue_date: '2024-01-01',
      description: 'Original',
      status: 'superseded',
    } as Document

    const version2: Document = {
      id: 'v2',
      version: '1.1',
      revision: 'B',
      file_size: 2048,
      issue_date: '2024-01-02',
      description: 'Updated',
      status: 'current',
    } as Document

    it('should compare two versions and return differences', async () => {
      vi.mocked(apiClient.selectOne)
        .mockResolvedValueOnce(version1)
        .mockResolvedValueOnce(version2)

      const result = await documentsApi.compareVersions('v1', 'v2')

      expect(result.version1).toEqual(version1)
      expect(result.version2).toEqual(version2)
      expect(result.differences).toHaveLength(6)
      expect(result.differences).toEqual(
        expect.arrayContaining([
          {
            field: 'version',
            version1Value: '1.0',
            version2Value: '1.1',
          },
          {
            field: 'revision',
            version1Value: 'A',
            version2Value: 'B',
          },
          {
            field: 'file_size',
            version1Value: 1024,
            version2Value: 2048,
          },
          {
            field: 'issue_date',
            version1Value: '2024-01-01',
            version2Value: '2024-01-02',
          },
          {
            field: 'description',
            version1Value: 'Original',
            version2Value: 'Updated',
          },
          {
            field: 'status',
            version1Value: 'superseded',
            version2Value: 'current',
          },
        ])
      )
    })

    it('should return empty differences if versions are identical', async () => {
      vi.mocked(apiClient.selectOne)
        .mockResolvedValueOnce(version1)
        .mockResolvedValueOnce(version1)

      const result = await documentsApi.compareVersions('v1', 'v1')

      expect(result.differences).toHaveLength(0)
    })

    it('should wrap errors', async () => {
      vi.mocked(apiClient.selectOne).mockRejectedValue(new Error('Not found'))

      await expect(documentsApi.compareVersions('v1', 'v2')).rejects.toThrow(
        'Failed to compare versions'
      )
    })
  })
})
