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
}
