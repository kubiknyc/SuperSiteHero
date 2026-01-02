/**
 * useSelectedProject Hook
 *
 * Manages persistent project selection across pages using localStorage.
 * When a user selects a project, it remains selected as they navigate
 * through the app until they explicitly select a different project.
 */

import { useState, useCallback, useMemo } from 'react'
import { useProjects } from '@/features/projects/hooks/useProjects'

const SELECTED_PROJECT_KEY = 'jobsight_selected_project_id'

interface UseSelectedProjectReturn {
  /** Currently selected project ID */
  selectedProjectId: string
  /** Set the selected project ID (persists to localStorage) */
  setSelectedProjectId: (projectId: string) => void
  /** Clear the selected project */
  clearSelectedProject: () => void
  /** Whether projects are loading */
  isLoading: boolean
  /** List of available projects */
  projects: ReturnType<typeof useProjects>['data']
  /** The full project object for the selected project */
  selectedProject: ReturnType<typeof useProjects>['data'] extends (infer T)[] | undefined ? T | undefined : never
}

/**
 * Hook for managing persistent project selection across pages.
 *
 * @example
 * ```tsx
 * const { selectedProjectId, setSelectedProjectId, projects, isLoading } = useSelectedProject()
 *
 * return (
 *   <Select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
 *     <option value="">Select a project</option>
 *     {projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
 *   </Select>
 * )
 * ```
 */
export function useSelectedProject(): UseSelectedProjectReturn {
  const { data: projects, isLoading } = useProjects()

  // Initialize from localStorage
  const [selectedProjectId, setSelectedProjectIdState] = useState<string>(() => {
    if (typeof window === 'undefined') {
      return ''
    }
    return localStorage.getItem(SELECTED_PROJECT_KEY) || ''
  })

  // Compute whether current selection is valid
  const validatedProjectId = useMemo(() => {
    if (!projects || isLoading) {
      // While loading, keep showing the stored ID
      return selectedProjectId
    }
    // If project no longer exists, clear storage and return empty
    if (selectedProjectId && !projects.some(p => p.id === selectedProjectId)) {
      localStorage.removeItem(SELECTED_PROJECT_KEY)
      return ''
    }
    return selectedProjectId
  }, [projects, isLoading, selectedProjectId])

  // Persist to localStorage when changed
  const setSelectedProjectId = useCallback((projectId: string) => {
    setSelectedProjectIdState(projectId)
    if (projectId) {
      localStorage.setItem(SELECTED_PROJECT_KEY, projectId)
    } else {
      localStorage.removeItem(SELECTED_PROJECT_KEY)
    }
  }, [])

  const clearSelectedProject = useCallback(() => {
    setSelectedProjectIdState('')
    localStorage.removeItem(SELECTED_PROJECT_KEY)
  }, [])

  // Get the full project object
  const selectedProject = projects?.find(p => p.id === validatedProjectId)

  return {
    selectedProjectId: validatedProjectId,
    setSelectedProjectId,
    clearSelectedProject,
    isLoading,
    projects,
    selectedProject,
  }
}

export default useSelectedProject
