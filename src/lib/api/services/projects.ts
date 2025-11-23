// File: /src/lib/api/services/projects.ts
// Projects API service

import { apiClient } from '../client'
import { ApiErrorClass } from '../errors'
import type { Project } from '@/types/database'
import type { QueryOptions } from '../types'

export const projectsApi = {
  /**
   * Fetch all projects for a company
   */
  async getProjectsByCompany(
    companyId: string,
    options?: QueryOptions
  ): Promise<Project[]> {
    try {
      return await apiClient.select<Project>('projects', {
        ...options,
        filters: [
          ...(options?.filters || []),
          { column: 'company_id', operator: 'eq', value: companyId },
        ],
        orderBy: options?.orderBy || { column: 'created_at', ascending: false },
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_PROJECTS_ERROR',
            message: 'Failed to fetch projects',
          })
    }
  },

  /**
   * Fetch a single project by ID
   */
  async getProject(projectId: string): Promise<Project> {
    try {
      return await apiClient.selectOne<Project>('projects', projectId)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_PROJECT_ERROR',
            message: 'Failed to fetch project',
          })
    }
  },

  /**
   * Fetch projects assigned to a user
   */
  async getUserProjects(userId: string): Promise<Project[]> {
    try {
      const assignments = await apiClient.select('project_assignments', {
        filters: [{ column: 'user_id', operator: 'eq', value: userId }],
        select: 'project:projects(*)',
      })

      // Extract projects from joined data
      return assignments.map((a: any) => a.project).filter(Boolean) as Project[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_USER_PROJECTS_ERROR',
            message: 'Failed to fetch your projects',
          })
    }
  },

  /**
   * Create a new project
   */
  async createProject(
    companyId: string,
    data: Omit<Project, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Project> {
    try {
      if (!companyId) {
        throw new ApiErrorClass({
          code: 'COMPANY_ID_REQUIRED',
          message: 'Company ID is required',
        })
      }

      return await apiClient.insert<Project>('projects', {
        ...data,
        company_id: companyId,
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_PROJECT_ERROR',
            message: 'Failed to create project',
          })
    }
  },

  /**
   * Update an existing project
   */
  async updateProject(
    projectId: string,
    updates: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<Project> {
    try {
      if (!projectId) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      return await apiClient.update<Project>('projects', projectId, updates)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_PROJECT_ERROR',
            message: 'Failed to update project',
          })
    }
  },

  /**
   * Delete a project
   */
  async deleteProject(projectId: string): Promise<void> {
    try {
      if (!projectId) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      await apiClient.delete('projects', projectId)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_PROJECT_ERROR',
            message: 'Failed to delete project',
          })
    }
  },

  /**
   * Search projects by name or address
   */
  async searchProjects(
    companyId: string,
    query: string
  ): Promise<Project[]> {
    try {
      const projects = await apiClient.select<Project>('projects', {
        filters: [
          { column: 'company_id', operator: 'eq', value: companyId },
        ],
      })

      const searchLower = query.toLowerCase()
      return projects.filter(
        (p) =>
          p.name?.toLowerCase().includes(searchLower) ||
          p.address?.toLowerCase().includes(searchLower) ||
          p.project_number?.toLowerCase().includes(searchLower)
      )
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'SEARCH_PROJECTS_ERROR',
            message: 'Failed to search projects',
          })
    }
  },
}
