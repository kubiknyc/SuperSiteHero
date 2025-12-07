// File: /src/lib/api/services/documents.ts
// Documents API service

import { apiClient } from '../client'
import { ApiErrorClass } from '../errors'
import type { Document, Folder } from '@/types/database'
import type { QueryOptions } from '../types'

export const documentsApi = {
  /**
   * Fetch all documents for a project
   */
  async getProjectDocuments(
    projectId: string,
    options?: QueryOptions
  ): Promise<Document[]> {
    try {
      return await apiClient.select<Document>('documents', {
        ...options,
        filters: [
          ...(options?.filters || []),
          { column: 'project_id', operator: 'eq', value: projectId },
        ],
        orderBy: options?.orderBy || { column: 'created_at', ascending: false },
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_DOCUMENTS_ERROR',
            message: 'Failed to fetch documents',
          })
    }
  },

  /**
   * Fetch a single document by ID
   */
  async getDocument(documentId: string): Promise<Document> {
    try {
      return await apiClient.selectOne<Document>('documents', documentId)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_DOCUMENT_ERROR',
            message: 'Failed to fetch document',
          })
    }
  },

  /**
   * Create a new document
   */
  async createDocument(
    data: Omit<Document, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Document> {
    try {
      if (!data.project_id) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      if (!data.file_url) {
        throw new ApiErrorClass({
          code: 'FILE_URL_REQUIRED',
          message: 'File URL is required',
        })
      }

      return await apiClient.insert<Document>('documents', {
        ...data,
        is_latest_version: true,
        status: 'current',
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_DOCUMENT_ERROR',
            message: 'Failed to create document',
          })
    }
  },

  /**
   * Update an existing document
   */
  async updateDocument(
    documentId: string,
    updates: Partial<Omit<Document, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<Document> {
    try {
      if (!documentId) {
        throw new ApiErrorClass({
          code: 'DOCUMENT_ID_REQUIRED',
          message: 'Document ID is required',
        })
      }

      return await apiClient.update<Document>('documents', documentId, updates)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_DOCUMENT_ERROR',
            message: 'Failed to update document',
          })
    }
  },

  /**
   * Delete a document (soft delete)
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      if (!documentId) {
        throw new ApiErrorClass({
          code: 'DOCUMENT_ID_REQUIRED',
          message: 'Document ID is required',
        })
      }

      await apiClient.delete('documents', documentId)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_DOCUMENT_ERROR',
            message: 'Failed to delete document',
          })
    }
  },

  /**
   * Fetch all folders for a project
   */
  async getProjectFolders(projectId: string): Promise<Folder[]> {
    try {
      return await apiClient.select<Folder>('folders', {
        filters: [{ column: 'project_id', operator: 'eq', value: projectId }],
        orderBy: { column: 'sort_order', ascending: true },
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_FOLDERS_ERROR',
            message: 'Failed to fetch folders',
          })
    }
  },

  /**
   * Create a new folder
   */
  async createFolder(
    data: Omit<Folder, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Folder> {
    try {
      if (!data.project_id) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      return await apiClient.insert<Folder>('folders', data)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_FOLDER_ERROR',
            message: 'Failed to create folder',
          })
    }
  },

  /**
   * Update a folder
   */
  async updateFolder(
    folderId: string,
    updates: Partial<Omit<Folder, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<Folder> {
    try {
      return await apiClient.update<Folder>('folders', folderId, updates)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_FOLDER_ERROR',
            message: 'Failed to update folder',
          })
    }
  },

  /**
   * Delete a folder (soft delete)
   */
  async deleteFolder(folderId: string): Promise<void> {
    try {
      await apiClient.delete('folders', folderId)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_FOLDER_ERROR',
            message: 'Failed to delete folder',
          })
    }
  },

  /**
   * Find the latest version of a document by name in a project
   * Returns null if no document with that name exists
   */
  async findDocumentByName(
    projectId: string,
    documentName: string,
    folderId?: string | null
  ): Promise<Document | null> {
    try {
      if (!projectId) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      if (!documentName) {
        throw new ApiErrorClass({
          code: 'DOCUMENT_NAME_REQUIRED',
          message: 'Document name is required',
        })
      }

      const filters: QueryOptions['filters'] = [
        { column: 'project_id', operator: 'eq', value: projectId },
        { column: 'name', operator: 'eq', value: documentName },
        { column: 'is_latest_version', operator: 'eq', value: true },
      ]

      // If folder is specified, filter by folder too
      if (folderId !== undefined) {
        filters.push({
          column: 'folder_id',
          operator: 'eq',
          value: folderId,
        })
      }

      const documents = await apiClient.select<Document>('documents', {
        filters,
        pagination: { page: 1, limit: 1 },
      })

      return documents.length > 0 ? documents[0] : null
    } catch (error) {
      // Re-throw ApiErrorClass instances to preserve the original error details
      if (error instanceof ApiErrorClass) {
        throw error
      }

      // For other errors, provide more context
      const originalMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new ApiErrorClass({
        code: 'FIND_DOCUMENT_ERROR',
        message: `Failed to find document: ${originalMessage}`,
        details: error,
      })
    }
  },

  /**
   * Create a new version of an existing document
   * This supersedes the previous version and marks the new one as latest
   */
  async createDocumentVersion(
    documentId: string,
    newFileUrl: string,
    versionNotes?: string
  ): Promise<Document> {
    try {
      if (!documentId) {
        throw new ApiErrorClass({
          code: 'DOCUMENT_ID_REQUIRED',
          message: 'Document ID is required',
        })
      }

      if (!newFileUrl) {
        throw new ApiErrorClass({
          code: 'FILE_URL_REQUIRED',
          message: 'File URL is required',
        })
      }

      // Get the existing document
      const existingDoc = await apiClient.selectOne<Document>('documents', documentId)

      // Parse version number and increment
      const currentVersion = existingDoc.version || '1.0'
      const versionParts = currentVersion.split('.')
      const majorVersion = parseInt(versionParts[0] || '1')
      const minorVersion = parseInt(versionParts[1] || '0')
      const newVersion = `${majorVersion}.${minorVersion + 1}`

      // Mark the existing document as superseded
      await apiClient.update<Document>('documents', documentId, {
        is_latest_version: false,
        status: 'superseded',
      })

      // Create new version
      const newDocument = await apiClient.insert<Document>('documents', {
        project_id: existingDoc.project_id,
        name: existingDoc.name,
        file_name: existingDoc.file_name,
        file_url: newFileUrl,
        file_type: existingDoc.file_type,
        file_size: existingDoc.file_size,
        document_type: existingDoc.document_type,
        folder_id: existingDoc.folder_id,
        description: versionNotes || existingDoc.description,
        discipline: existingDoc.discipline,
        drawing_number: existingDoc.drawing_number,
        specification_section: existingDoc.specification_section,
        version: newVersion,
        revision: existingDoc.revision,
        is_latest_version: true,
        status: 'current',
        supersedes_document_id: documentId,
        issue_date: new Date().toISOString(),
      })

      return newDocument
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_VERSION_ERROR',
            message: 'Failed to create document version',
          })
    }
  },

  /**
   * Get all versions of a document (version history)
   * Returns documents in chronological order (oldest to newest)
   */
  async getDocumentVersions(documentId: string): Promise<Document[]> {
    try {
      if (!documentId) {
        throw new ApiErrorClass({
          code: 'DOCUMENT_ID_REQUIRED',
          message: 'Document ID is required',
        })
      }

      // Get the document to find its name and project
      const document = await apiClient.selectOne<Document>('documents', documentId)

      // Find all documents with the same name and project
      // This includes the original and all versions
      const versions = await apiClient.select<Document>('documents', {
        filters: [
          { column: 'project_id', operator: 'eq', value: document.project_id },
          { column: 'name', operator: 'eq', value: document.name },
        ],
        orderBy: { column: 'created_at', ascending: true },
      })

      return versions
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_VERSIONS_ERROR',
            message: 'Failed to fetch document versions',
          })
    }
  },

  /**
   * Get the latest version of a document
   */
  async getLatestVersion(documentId: string): Promise<Document> {
    try {
      const versions = await this.getDocumentVersions(documentId)
      const latest = versions.find((v) => v.is_latest_version)

      if (!latest) {
        throw new ApiErrorClass({
          code: 'LATEST_VERSION_NOT_FOUND',
          message: 'Latest version not found',
        })
      }

      return latest
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_LATEST_VERSION_ERROR',
            message: 'Failed to fetch latest version',
          })
    }
  },

  /**
   * Revert to a previous version by making it the latest
   */
  async revertToVersion(versionId: string): Promise<Document> {
    try {
      if (!versionId) {
        throw new ApiErrorClass({
          code: 'VERSION_ID_REQUIRED',
          message: 'Version ID is required',
        })
      }

      // Get all versions to find current latest
      const versionDoc = await apiClient.selectOne<Document>('documents', versionId)
      const allVersions = await this.getDocumentVersions(versionId)

      // Mark current latest as superseded
      const currentLatest = allVersions.find((v) => v.is_latest_version)
      if (currentLatest) {
        await apiClient.update<Document>('documents', currentLatest.id, {
          is_latest_version: false,
          status: 'superseded',
        })
      }

      // Mark the selected version as latest
      const revertedDoc = await apiClient.update<Document>('documents', versionId, {
        is_latest_version: true,
        status: 'current',
      })

      return revertedDoc
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'REVERT_VERSION_ERROR',
            message: 'Failed to revert to version',
          })
    }
  },

  /**
   * Compare two document versions
   * Returns metadata comparison (actual file diff would require additional processing)
   */
  async compareVersions(
    version1Id: string,
    version2Id: string
  ): Promise<{
    version1: Document
    version2: Document
    differences: {
      field: string
      version1Value: unknown
      version2Value: unknown
    }[]
  }> {
    try {
      const version1 = await apiClient.selectOne<Document>('documents', version1Id)
      const version2 = await apiClient.selectOne<Document>('documents', version2Id)

      // Compare metadata fields
      const fieldsToCompare: (keyof Document)[] = [
        'version',
        'revision',
        'file_size',
        'issue_date',
        'description',
        'status',
      ]

      const differences = fieldsToCompare
        .filter((field) => version1[field] !== version2[field])
        .map((field) => ({
          field,
          version1Value: version1[field],
          version2Value: version2[field],
        }))

      return {
        version1,
        version2,
        differences,
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'COMPARE_VERSIONS_ERROR',
            message: 'Failed to compare versions',
          })
    }
  },
}
