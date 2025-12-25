/**
 * Projects API Service Tests
 *
 * Tests project management operations including search and user assignments.
 */

import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { projectsApi } from './projects'
import { apiClient } from '../client'
import { ApiErrorClass } from '../errors'
import { logger } from '@/lib/utils/logger'
import type { Project } from '@/types/database'

// Mock the API client
vi.mock('../client', () => ({
  apiClient: {
    select: vi.fn(),
    selectOne: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    query: vi.fn(),
  },
}))

// Mock the logger
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('projectsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getProjectsByCompany', () => {
    const companyId = 'company-123'
    const mockProjects: Project[] = [
      {
        id: 'project-1',
        company_id: companyId,
        name: 'Test Project',
        address: '123 Main St',
        project_number: 'PRJ-001',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      } as Project,
    ]

    it('should fetch company projects with default ordering', async () => {
      vi.mocked(apiClient.select).mockResolvedValue(mockProjects)

      const result = await projectsApi.getProjectsByCompany(companyId)

      expect(apiClient.select).toHaveBeenCalledWith('projects', {
        filters: [{ column: 'company_id', operator: 'eq', value: companyId }],
        orderBy: { column: 'created_at', ascending: false },
      })
      expect(result).toEqual(mockProjects)
    })

    it('should fetch company projects with custom options', async () => {
      vi.mocked(apiClient.select).mockResolvedValue(mockProjects)

      await projectsApi.getProjectsByCompany(companyId, {
        filters: [{ column: 'status', operator: 'eq', value: 'active' }],
        orderBy: { column: 'name', ascending: true },
      })

      expect(apiClient.select).toHaveBeenCalledWith('projects', {
        filters: [
          { column: 'status', operator: 'eq', value: 'active' },
          { column: 'company_id', operator: 'eq', value: companyId },
        ],
        orderBy: { column: 'name', ascending: true },
      })
    })

    it('should wrap non-API errors', async () => {
      vi.mocked(apiClient.select).mockRejectedValue(new Error('Database error'))

      await expect(
        projectsApi.getProjectsByCompany(companyId)
      ).rejects.toThrow(ApiErrorClass)
      await expect(
        projectsApi.getProjectsByCompany(companyId)
      ).rejects.toThrow('Failed to fetch projects')
    })

    it('should preserve API errors', async () => {
      const apiError = new ApiErrorClass({
        code: 'CUSTOM_ERROR',
        message: 'Custom error',
      })
      vi.mocked(apiClient.select).mockRejectedValue(apiError)

      await expect(
        projectsApi.getProjectsByCompany(companyId)
      ).rejects.toThrow(apiError)
    })
  })

  describe('getProject', () => {
    const projectId = 'project-123'
    const mockProject: Project = {
      id: projectId,
      company_id: 'company-123',
      name: 'Test Project',
      address: '123 Main St',
      project_number: 'PRJ-001',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    } as Project

    it('should fetch a single project', async () => {
      vi.mocked(apiClient.selectOne).mockResolvedValue(mockProject)

      const result = await projectsApi.getProject(projectId)

      expect(apiClient.selectOne).toHaveBeenCalledWith('projects', projectId)
      expect(result).toEqual(mockProject)
    })

    it('should wrap errors', async () => {
      vi.mocked(apiClient.selectOne).mockRejectedValue(new Error('Not found'))

      await expect(projectsApi.getProject(projectId)).rejects.toThrow(
        ApiErrorClass
      )
      await expect(projectsApi.getProject(projectId)).rejects.toThrow(
        'Failed to fetch project'
      )
    })
  })

  describe('getUserProjects', () => {
    const userId = 'user-123'
    const mockProjects: Project[] = [
      {
        id: 'project-1',
        name: 'Project 1',
        company_id: 'company-123',
      } as Project,
      {
        id: 'project-2',
        name: 'Project 2',
        company_id: 'company-123',
      } as Project,
    ]

    it('should fetch user projects with join query', async () => {
      const mockQueryData = mockProjects.map((project) => ({ project }))
      vi.mocked(apiClient.query).mockResolvedValue(mockQueryData)

      const result = await projectsApi.getUserProjects(userId)

      expect(apiClient.query).toHaveBeenCalledWith(
        'project_users',
        expect.any(Function)
      )
      expect(result).toEqual(mockProjects)
    })

    it('should filter out null projects from join', async () => {
      const mockQueryData = [
        { project: mockProjects[0] },
        { project: null }, // Orphaned relationship
        { project: mockProjects[1] },
      ]
      vi.mocked(apiClient.query).mockResolvedValue(mockQueryData)

      const result = await projectsApi.getUserProjects(userId)

      expect(result).toEqual(mockProjects)
      expect(result).toHaveLength(2)
    })

    it('should return empty array if user has no projects', async () => {
      vi.mocked(apiClient.query).mockResolvedValue([])

      const result = await projectsApi.getUserProjects(userId)

      expect(result).toEqual([])
    })

    it('should wrap errors', async () => {
      vi.mocked(apiClient.query).mockRejectedValue(new Error('Query failed'))

      await expect(projectsApi.getUserProjects(userId)).rejects.toThrow(
        ApiErrorClass
      )
      await expect(projectsApi.getUserProjects(userId)).rejects.toThrow(
        'Failed to fetch your projects'
      )
    })
  })

  describe('createProject', () => {
    const companyId = 'company-123'
    const userId = 'user-123'
    const validProjectData = {
      name: 'New Project',
      address: '456 Oak Ave',
      project_number: 'PRJ-002',
    }

    it('should create a project without user assignment', async () => {
      const mockCreated = {
        id: 'project-new',
        company_id: companyId,
        ...validProjectData,
      } as Project
      vi.mocked(apiClient.insert).mockResolvedValue(mockCreated)

      const result = await projectsApi.createProject(
        companyId,
        validProjectData as any
      )

      expect(apiClient.insert).toHaveBeenCalledWith('projects', {
        ...validProjectData,
        company_id: companyId,
      })
      expect(result).toEqual(mockCreated)
    })

    it('should create a project and assign user', async () => {
      const mockCreated = {
        id: 'project-new',
        company_id: companyId,
        ...validProjectData,
      } as Project
      vi.mocked(apiClient.insert)
        .mockResolvedValueOnce(mockCreated) // Project creation
        .mockResolvedValueOnce({}) // User assignment

      const result = await projectsApi.createProject(
        companyId,
        validProjectData as any,
        userId
      )

      expect(apiClient.insert).toHaveBeenCalledTimes(2)
      expect(apiClient.insert).toHaveBeenNthCalledWith(1, 'projects', {
        ...validProjectData,
        company_id: companyId,
      })
      expect(apiClient.insert).toHaveBeenNthCalledWith(2, 'project_users', {
        project_id: 'project-new',
        user_id: userId,
      })
      expect(result).toEqual(mockCreated)
    })

    it('should not fail if user assignment fails', async () => {
      const mockCreated = {
        id: 'project-new',
        company_id: companyId,
        ...validProjectData,
      } as Project
      vi.mocked(apiClient.insert)
        .mockResolvedValueOnce(mockCreated) // Project creation succeeds
        .mockRejectedValueOnce(new Error('Assignment failed')) // User assignment fails

      const result = await projectsApi.createProject(
        companyId,
        validProjectData as any,
        userId
      )

      // Project should still be created despite user assignment failure
      expect(result).toEqual(mockCreated)
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to assign user to project:',
        expect.any(Error)
      )
    })

    it('should throw error if companyId is missing', async () => {
      await expect(
        projectsApi.createProject('', validProjectData as any)
      ).rejects.toThrow('Company ID is required')
      expect(apiClient.insert).not.toHaveBeenCalled()
    })

    it('should wrap project creation errors', async () => {
      vi.mocked(apiClient.insert).mockRejectedValue(
        new Error('Creation failed')
      )

      await expect(
        projectsApi.createProject(companyId, validProjectData as any)
      ).rejects.toThrow('Failed to create project')
    })
  })

  describe('updateProject', () => {
    const projectId = 'project-123'
    const updates = {
      name: 'Updated Name',
      address: 'New Address',
      status: 'active',
    }

    it('should update a project', async () => {
      const mockUpdated = { id: projectId, ...updates } as Project
      vi.mocked(apiClient.update).mockResolvedValue(mockUpdated)

      const result = await projectsApi.updateProject(projectId, updates)

      expect(apiClient.update).toHaveBeenCalledWith(
        'projects',
        projectId,
        updates
      )
      expect(result).toEqual(mockUpdated)
    })

    it('should throw error if projectId is missing', async () => {
      await expect(projectsApi.updateProject('', updates)).rejects.toThrow(
        'Project ID is required'
      )
      expect(apiClient.update).not.toHaveBeenCalled()
    })

    it('should wrap errors', async () => {
      vi.mocked(apiClient.update).mockRejectedValue(new Error('Update failed'))

      await expect(
        projectsApi.updateProject(projectId, updates)
      ).rejects.toThrow('Failed to update project')
    })
  })

  describe('deleteProject', () => {
    const projectId = 'project-123'

    it('should delete a project', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue(undefined)

      await projectsApi.deleteProject(projectId)

      expect(apiClient.delete).toHaveBeenCalledWith('projects', projectId)
    })

    it('should throw error if projectId is missing', async () => {
      await expect(projectsApi.deleteProject('')).rejects.toThrow(
        'Project ID is required'
      )
      expect(apiClient.delete).not.toHaveBeenCalled()
    })

    it('should wrap errors', async () => {
      vi.mocked(apiClient.delete).mockRejectedValue(new Error('Delete failed'))

      await expect(projectsApi.deleteProject(projectId)).rejects.toThrow(
        'Failed to delete project'
      )
    })
  })

  describe('searchProjects', () => {
    const companyId = 'company-123'
    const mockProjects: Project[] = [
      {
        id: 'project-1',
        company_id: companyId,
        name: 'Downtown Office Building',
        address: '123 Main Street',
        project_number: 'PRJ-001',
      } as Project,
      {
        id: 'project-2',
        company_id: companyId,
        name: 'Suburban Shopping Center',
        address: '456 Oak Avenue',
        project_number: 'PRJ-002',
      } as Project,
      {
        id: 'project-3',
        company_id: companyId,
        name: 'Industrial Warehouse',
        address: '789 Pine Lane',
        project_number: 'PRJ-003',
      } as Project,
    ]

    it('should search projects by name', async () => {
      vi.mocked(apiClient.select).mockResolvedValue(mockProjects)

      const result = await projectsApi.searchProjects(companyId, 'office')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Downtown Office Building')
    })

    it('should search projects by address', async () => {
      vi.mocked(apiClient.select).mockResolvedValue(mockProjects)

      const result = await projectsApi.searchProjects(companyId, 'oak')

      expect(result).toHaveLength(1)
      expect(result[0].address).toBe('456 Oak Avenue')
    })

    it('should search projects by project number', async () => {
      vi.mocked(apiClient.select).mockResolvedValue(mockProjects)

      const result = await projectsApi.searchProjects(companyId, 'PRJ-002')

      expect(result).toHaveLength(1)
      expect(result[0].project_number).toBe('PRJ-002')
    })

    it('should be case-insensitive', async () => {
      vi.mocked(apiClient.select).mockResolvedValue(mockProjects)

      const result = await projectsApi.searchProjects(companyId, 'OFFICE')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Downtown Office Building')
    })

    it('should return multiple matches', async () => {
      vi.mocked(apiClient.select).mockResolvedValue(mockProjects)

      // Search for "pr" which matches all project numbers
      const result = await projectsApi.searchProjects(companyId, 'pr')

      expect(result).toHaveLength(3)
    })

    it('should return empty array if no matches', async () => {
      vi.mocked(apiClient.select).mockResolvedValue(mockProjects)

      const result = await projectsApi.searchProjects(
        companyId,
        'nonexistent'
      )

      expect(result).toEqual([])
    })

    it('should handle projects with null fields', async () => {
      const projectsWithNulls: Project[] = [
        {
          id: 'project-1',
          company_id: companyId,
          name: null,
          address: 'Main Street',
          project_number: null,
        } as any,
      ]
      vi.mocked(apiClient.select).mockResolvedValue(projectsWithNulls)

      const result = await projectsApi.searchProjects(companyId, 'main')

      expect(result).toHaveLength(1)
    })

    it('should filter by company_id', async () => {
      vi.mocked(apiClient.select).mockResolvedValue(mockProjects)

      await projectsApi.searchProjects(companyId, 'office')

      expect(apiClient.select).toHaveBeenCalledWith('projects', {
        filters: [{ column: 'company_id', operator: 'eq', value: companyId }],
      })
    })

    it('should wrap errors', async () => {
      vi.mocked(apiClient.select).mockRejectedValue(new Error('Search failed'))

      await expect(
        projectsApi.searchProjects(companyId, 'office')
      ).rejects.toThrow('Failed to search projects')
    })
  })

  describe('edge cases', () => {
    it('should handle empty result sets', async () => {
      vi.mocked(apiClient.select).mockResolvedValue([])

      const result = await projectsApi.getProjectsByCompany('company-123')

      expect(result).toEqual([])
    })

    it('should handle very large project lists', async () => {
      const largeList = Array.from({ length: 1000 }, (_, i) => ({
        id: `project-${i}`,
        company_id: 'company-123',
        name: `Project ${i}`,
      })) as Project[]
      vi.mocked(apiClient.select).mockResolvedValue(largeList)

      const result = await projectsApi.searchProjects('company-123', 'project')

      expect(result).toHaveLength(1000)
    })

    it('should handle special characters in search', async () => {
      const mockProjects: Project[] = [
        {
          id: 'project-1',
          company_id: 'company-123',
          name: 'Test (Special) Project',
          address: '123 Main St.',
        } as Project,
      ]
      vi.mocked(apiClient.select).mockResolvedValue(mockProjects)

      const result = await projectsApi.searchProjects('company-123', '(special)')

      expect(result).toHaveLength(1)
    })
  })
})
