/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// Define mock functions BEFORE vi.mock calls (hoisting requirement)
const mockGetTemplates = vi.fn()
const mockGetTemplate = vi.fn()
const mockGetRecentTemplates = vi.fn()
const mockGetPopularTemplates = vi.fn()
const mockCreateTemplate = vi.fn()
const mockCreateTemplateFromProject = vi.fn()
const mockUpdateTemplate = vi.fn()
const mockDeleteTemplate = vi.fn()
const mockPermanentlyDeleteTemplate = vi.fn()
const mockDuplicateTemplate = vi.fn()
const mockApplyTemplateToProject = vi.fn()
const mockAddPhase = vi.fn()
const mockUpdatePhase = vi.fn()
const mockDeletePhase = vi.fn()
const mockReorderPhases = vi.fn()

// Mock the API service
vi.mock('@/lib/api/services/project-templates', () => ({
  projectTemplatesApi: {
    getTemplates: (...args: unknown[]) => mockGetTemplates(...args),
    getTemplate: (...args: unknown[]) => mockGetTemplate(...args),
    getRecentTemplates: (...args: unknown[]) => mockGetRecentTemplates(...args),
    getPopularTemplates: (...args: unknown[]) => mockGetPopularTemplates(...args),
    createTemplate: (...args: unknown[]) => mockCreateTemplate(...args),
    createTemplateFromProject: (...args: unknown[]) => mockCreateTemplateFromProject(...args),
    updateTemplate: (...args: unknown[]) => mockUpdateTemplate(...args),
    deleteTemplate: (...args: unknown[]) => mockDeleteTemplate(...args),
    permanentlyDeleteTemplate: (...args: unknown[]) => mockPermanentlyDeleteTemplate(...args),
    duplicateTemplate: (...args: unknown[]) => mockDuplicateTemplate(...args),
    applyTemplateToProject: (...args: unknown[]) => mockApplyTemplateToProject(...args),
    addPhase: (...args: unknown[]) => mockAddPhase(...args),
    updatePhase: (...args: unknown[]) => mockUpdatePhase(...args),
    deletePhase: (...args: unknown[]) => mockDeletePhase(...args),
    reorderPhases: (...args: unknown[]) => mockReorderPhases(...args),
  },
}))

import {
  projectTemplateKeys,
  useProjectTemplates,
  useProjectTemplatesByCategory,
  useActiveProjectTemplates,
  useProjectTemplate,
  useRecentProjectTemplates,
  usePopularProjectTemplates,
  useCreateProjectTemplate,
  useCreateTemplateFromProject,
  useUpdateProjectTemplate,
  useDeleteProjectTemplate,
  usePermanentlyDeleteProjectTemplate,
  useDuplicateProjectTemplate,
  useApplyTemplateToProject,
  useAddTemplatePhase,
  useUpdateTemplatePhase,
  useDeleteTemplatePhase,
  useReorderTemplatePhases,
} from './useProjectTemplates'

// Test wrapper with QueryClientProvider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

// Sample test data
const mockTemplate = {
  id: 'template-1',
  company_id: 'company-1',
  name: 'Residential Construction',
  description: 'Standard template for residential projects',
  category: 'residential',
  is_active: true,
  estimated_duration_days: 180,
  created_by: 'user-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2025-01-10T00:00:00Z',
  usage_count: 15,
  last_used_at: '2025-01-10T00:00:00Z',
}

const mockTemplateWithDetails = {
  ...mockTemplate,
  phases: [
    { id: 'phase-1', name: 'Foundation', order_index: 0, estimated_duration_days: 30 },
    { id: 'phase-2', name: 'Framing', order_index: 1, estimated_duration_days: 45 },
    { id: 'phase-3', name: 'Finishing', order_index: 2, estimated_duration_days: 60 },
  ],
  folders: [
    { id: 'folder-1', name: 'Documents', parent_id: null },
    { id: 'folder-2', name: 'Photos', parent_id: null },
  ],
}

const mockTemplates = [mockTemplate]

const mockApplyResult = {
  project_id: 'project-1',
  template_id: 'template-1',
  phases_created: 3,
  folders_created: 2,
  applied_at: '2025-01-15T00:00:00Z',
}

describe('projectTemplateKeys', () => {
  it('should generate correct query keys', () => {
    expect(projectTemplateKeys.all).toEqual(['project-templates'])
    expect(projectTemplateKeys.lists()).toEqual(['project-templates', 'list'])
    expect(projectTemplateKeys.list('company-1')).toEqual(['project-templates', 'list', 'company-1', undefined])
    expect(projectTemplateKeys.list('company-1', { category: 'residential' })).toEqual([
      'project-templates',
      'list',
      'company-1',
      { category: 'residential' },
    ])
    expect(projectTemplateKeys.details()).toEqual(['project-templates', 'detail'])
    expect(projectTemplateKeys.detail('template-1')).toEqual(['project-templates', 'detail', 'template-1'])
    expect(projectTemplateKeys.recent('company-1')).toEqual(['project-templates', 'recent', 'company-1'])
    expect(projectTemplateKeys.popular('company-1')).toEqual(['project-templates', 'popular', 'company-1'])
  })
})

describe('Query Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useProjectTemplates', () => {
    it('should fetch templates for a company', async () => {
      mockGetTemplates.mockResolvedValue(mockTemplates)

      const { result } = renderHook(() => useProjectTemplates('company-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual(mockTemplates)
      expect(mockGetTemplates).toHaveBeenCalledWith('company-1', undefined)
    })

    it('should fetch templates with filters', async () => {
      mockGetTemplates.mockResolvedValue(mockTemplates)

      const { result } = renderHook(
        () => useProjectTemplates('company-1', { category: 'residential' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockGetTemplates).toHaveBeenCalledWith('company-1', { category: 'residential' })
    })

    it('should not fetch when companyId is undefined', () => {
      const { result } = renderHook(() => useProjectTemplates(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useProjectTemplatesByCategory', () => {
    it('should fetch templates by category', async () => {
      mockGetTemplates.mockResolvedValue(mockTemplates)

      const { result } = renderHook(
        () => useProjectTemplatesByCategory('company-1', 'residential'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockGetTemplates).toHaveBeenCalledWith('company-1', { category: 'residential' })
    })
  })

  describe('useActiveProjectTemplates', () => {
    it('should fetch only active templates', async () => {
      mockGetTemplates.mockResolvedValue(mockTemplates)

      const { result } = renderHook(() => useActiveProjectTemplates('company-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockGetTemplates).toHaveBeenCalledWith('company-1', { is_active: true })
    })
  })

  describe('useProjectTemplate', () => {
    it('should fetch a single template with details', async () => {
      mockGetTemplate.mockResolvedValue(mockTemplateWithDetails)

      const { result } = renderHook(() => useProjectTemplate('template-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual(mockTemplateWithDetails)
      expect(mockGetTemplate).toHaveBeenCalledWith('template-1')
    })

    it('should not fetch when templateId is undefined', () => {
      const { result } = renderHook(() => useProjectTemplate(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useRecentProjectTemplates', () => {
    it('should fetch recent templates with default limit', async () => {
      mockGetRecentTemplates.mockResolvedValue(mockTemplates)

      const { result } = renderHook(() => useRecentProjectTemplates('company-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockGetRecentTemplates).toHaveBeenCalledWith('company-1', 5)
    })

    it('should fetch recent templates with custom limit', async () => {
      mockGetRecentTemplates.mockResolvedValue(mockTemplates)

      const { result } = renderHook(() => useRecentProjectTemplates('company-1', 10), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockGetRecentTemplates).toHaveBeenCalledWith('company-1', 10)
    })
  })

  describe('usePopularProjectTemplates', () => {
    it('should fetch popular templates', async () => {
      mockGetPopularTemplates.mockResolvedValue(mockTemplates)

      const { result } = renderHook(() => usePopularProjectTemplates('company-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockGetPopularTemplates).toHaveBeenCalledWith('company-1', 5)
    })
  })
})

describe('Mutation Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useCreateProjectTemplate', () => {
    it('should create a template', async () => {
      mockCreateTemplate.mockResolvedValue(mockTemplate)

      const { result } = renderHook(() => useCreateProjectTemplate(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        input: {
          company_id: 'company-1',
          name: 'New Template',
          category: 'commercial',
        },
        userId: 'user-1',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockCreateTemplate).toHaveBeenCalled()
    })
  })

  describe('useCreateTemplateFromProject', () => {
    it('should create template from existing project', async () => {
      mockCreateTemplateFromProject.mockResolvedValue(mockTemplate)

      const { result } = renderHook(() => useCreateTemplateFromProject(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        input: {
          source_project_id: 'project-1',
          name: 'Template from Project',
          include_phases: true,
          include_folders: true,
        },
        userId: 'user-1',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockCreateTemplateFromProject).toHaveBeenCalled()
    })
  })

  describe('useUpdateProjectTemplate', () => {
    it('should update a template', async () => {
      const updatedTemplate = { ...mockTemplate, name: 'Updated Template' }
      mockUpdateTemplate.mockResolvedValue(updatedTemplate)

      const { result } = renderHook(() => useUpdateProjectTemplate(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        templateId: 'template-1',
        input: { name: 'Updated Template' },
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockUpdateTemplate).toHaveBeenCalledWith('template-1', { name: 'Updated Template' })
    })
  })

  describe('useDeleteProjectTemplate', () => {
    it('should soft delete a template', async () => {
      mockDeleteTemplate.mockResolvedValue(undefined)

      const { result } = renderHook(() => useDeleteProjectTemplate(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('template-1')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockDeleteTemplate).toHaveBeenCalledWith('template-1')
    })
  })

  describe('usePermanentlyDeleteProjectTemplate', () => {
    it('should permanently delete a template', async () => {
      mockPermanentlyDeleteTemplate.mockResolvedValue(undefined)

      const { result } = renderHook(() => usePermanentlyDeleteProjectTemplate(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('template-1')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockPermanentlyDeleteTemplate).toHaveBeenCalledWith('template-1')
    })
  })

  describe('useDuplicateProjectTemplate', () => {
    it('should duplicate a template', async () => {
      const duplicatedTemplate = { ...mockTemplate, id: 'template-2', name: 'Template Copy' }
      mockDuplicateTemplate.mockResolvedValue(duplicatedTemplate)

      const { result } = renderHook(() => useDuplicateProjectTemplate(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        templateId: 'template-1',
        newName: 'Template Copy',
        userId: 'user-1',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockDuplicateTemplate).toHaveBeenCalledWith('template-1', 'Template Copy', 'user-1')
    })
  })

  describe('useApplyTemplateToProject', () => {
    it('should apply template to project', async () => {
      mockApplyTemplateToProject.mockResolvedValue(mockApplyResult)

      const { result } = renderHook(() => useApplyTemplateToProject(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        projectId: 'project-1',
        templateId: 'template-1',
        userId: 'user-1',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockApplyTemplateToProject).toHaveBeenCalledWith('project-1', 'template-1', 'user-1')
    })
  })
})

describe('Phase Management Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useAddTemplatePhase', () => {
    it('should add a phase to template', async () => {
      const newPhase = { id: 'phase-4', name: 'Landscaping', order_index: 3 }
      mockAddPhase.mockResolvedValue(newPhase)

      const { result } = renderHook(() => useAddTemplatePhase(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        templateId: 'template-1',
        phase: { name: 'Landscaping', estimated_duration_days: 14 },
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockAddPhase).toHaveBeenCalledWith('template-1', {
        name: 'Landscaping',
        estimated_duration_days: 14,
      })
    })
  })

  describe('useUpdateTemplatePhase', () => {
    it('should update a phase', async () => {
      const updatedPhase = { id: 'phase-1', name: 'Updated Foundation', order_index: 0 }
      mockUpdatePhase.mockResolvedValue(updatedPhase)

      const { result } = renderHook(() => useUpdateTemplatePhase(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        phaseId: 'phase-1',
        templateId: 'template-1',
        updates: { name: 'Updated Foundation' },
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockUpdatePhase).toHaveBeenCalledWith('phase-1', { name: 'Updated Foundation' })
    })
  })

  describe('useDeleteTemplatePhase', () => {
    it('should delete a phase', async () => {
      mockDeletePhase.mockResolvedValue(undefined)

      const { result } = renderHook(() => useDeleteTemplatePhase(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        phaseId: 'phase-1',
        templateId: 'template-1',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockDeletePhase).toHaveBeenCalledWith('phase-1')
    })
  })

  describe('useReorderTemplatePhases', () => {
    it('should reorder phases', async () => {
      mockReorderPhases.mockResolvedValue([
        { id: 'phase-2', order_index: 0 },
        { id: 'phase-1', order_index: 1 },
        { id: 'phase-3', order_index: 2 },
      ])

      const { result } = renderHook(() => useReorderTemplatePhases(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        templateId: 'template-1',
        phaseIds: ['phase-2', 'phase-1', 'phase-3'],
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockReorderPhases).toHaveBeenCalledWith('template-1', ['phase-2', 'phase-1', 'phase-3'])
    })
  })
})
