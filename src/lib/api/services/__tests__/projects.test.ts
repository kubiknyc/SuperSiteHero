import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { apiClient } from '../../client'
import { projectsApi } from '../projects'

vi.mock('../../client', () => ({
  apiClient: {
    select: vi.fn(),
    selectOne: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    query: vi.fn(),
  },
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

describe('Projects API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getProjectsByCompany', () => {
    it('should fetch all projects for a company', async () => {
      const mockProjects = [
        { id: '1', name: 'Project A', company_id: 'comp1' },
        { id: '2', name: 'Project B', company_id: 'comp1' },
      ]

      vi.mocked(apiClient.select).mockResolvedValue(mockProjects)

      const result = await projectsApi.getProjectsByCompany('comp1')

      expect(result).toHaveLength(2)
      expect(apiClient.select).toHaveBeenCalledWith('projects', expect.objectContaining({
        filters: expect.arrayContaining([
          { column: 'company_id', operator: 'eq', value: 'comp1' },
        ]),
      }))
    })
  })

  describe('getProject', () => {
    it('should fetch single project by ID', async () => {
      const mockProject = { id: 'proj1', name: 'Test Project' }

      vi.mocked(apiClient.selectOne).mockResolvedValue(mockProject)

      const result = await projectsApi.getProject('proj1')

      expect(result.name).toBe('Test Project')
      expect(apiClient.selectOne).toHaveBeenCalledWith('projects', 'proj1')
    })
  })

  describe('getUserProjects', () => {
    it('should fetch projects assigned to user', async () => {
      const mockData = [
        { project: { id: 'proj1', name: 'Project A' } },
        { project: { id: 'proj2', name: 'Project B' } },
      ]

      vi.mocked(apiClient.query).mockResolvedValue(mockData)

      const result = await projectsApi.getUserProjects('user123')

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Project A')
    })
  })

  describe('createProject', () => {
    it('should create new project', async () => {
      const newProject = {
        name: 'New Project',
        address: '123 Main St',
        project_number: 'PRJ-001',
      }

      vi.mocked(apiClient.insert)
        .mockResolvedValueOnce({ id: 'proj1', ...newProject, company_id: 'comp1' })
        .mockResolvedValueOnce({ project_id: 'proj1', user_id: 'user1' })

      const result = await projectsApi.createProject('comp1', newProject, 'user1')

      expect(result.name).toBe('New Project')
      expect(apiClient.insert).toHaveBeenCalledWith('projects', expect.objectContaining({
        ...newProject,
        company_id: 'comp1',
      }))
    })

    it('should throw error when company_id missing', async () => {
      await expect(
        projectsApi.createProject('', { name: 'Test' } as any)
      ).rejects.toThrow('Company ID is required')
    })
  })

  describe('updateProject', () => {
    it('should update project', async () => {
      vi.mocked(apiClient.update).mockResolvedValue({
        id: 'proj1',
        name: 'Updated Project',
      })

      const result = await projectsApi.updateProject('proj1', {
        name: 'Updated Project',
      })

      expect(result.name).toBe('Updated Project')
    })

    it('should throw error when project_id missing', async () => {
      await expect(
        projectsApi.updateProject('', { name: 'Test' })
      ).rejects.toThrow('Project ID is required')
    })
  })

  describe('deleteProject', () => {
    it('should delete project', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue(undefined)

      await projectsApi.deleteProject('proj1')

      expect(apiClient.delete).toHaveBeenCalledWith('projects', 'proj1')
    })

    it('should throw error when project_id missing', async () => {
      await expect(
        projectsApi.deleteProject('')
      ).rejects.toThrow('Project ID is required')
    })
  })

  describe('searchProjects', () => {
    it('should search projects by name', async () => {
      const mockProjects = [
        { id: '1', name: 'Building Project', project_number: 'B-001' },
        { id: '2', name: 'Construction Project', project_number: 'C-001' },
      ]

      vi.mocked(apiClient.select).mockResolvedValue(mockProjects)

      const result = await projectsApi.searchProjects('comp1', 'building')

      expect(result).toHaveLength(1)
      expect(result[0].name).toContain('Building')
    })

    it('should search by project number', async () => {
      const mockProjects = [
        { id: '1', name: 'Project A', project_number: 'PRJ-123' },
        { id: '2', name: 'Project B', project_number: 'PRJ-456' },
      ]

      vi.mocked(apiClient.select).mockResolvedValue(mockProjects)

      const result = await projectsApi.searchProjects('comp1', 'PRJ-123')

      expect(result).toHaveLength(1)
      expect(result[0].project_number).toBe('PRJ-123')
    })
  })
})
