/**
 * Project Context
 *
 * Provides current project information based on URL params or selection.
 * Used by features that need project context without prop drilling.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'

interface Project {
  id: string
  name: string
  project_number?: string | null
  company_id: string
  status?: string | null
}

interface ProjectContextValue {
  currentProject: Project | null
  isLoading: boolean
  error: Error | null
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { projectId } = useParams<{ projectId?: string }>()
  const location = useLocation()
  const { userProfile } = useAuth()

  // Also check for project ID in path pattern /projects/:id
  const projectIdFromPath = useMemo(() => {
    const match = location.pathname.match(/\/projects\/([^/]+)/)
    return match ? match[1] : null
  }, [location.pathname])

  const effectiveProjectId = projectId || projectIdFromPath

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', effectiveProjectId],
    queryFn: async () => {
      if (!effectiveProjectId) return null

      const { data, error } = await supabase
        .from('projects')
        .select('id, name, project_number, company_id, status')
        .eq('id', effectiveProjectId)
        .single()

      if (error) throw error
      return data as Project
    },
    enabled: !!effectiveProjectId && !!userProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const value = useMemo(() => ({
    currentProject: project || null,
    isLoading,
    error: error as Error | null,
  }), [project, isLoading, error])

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProjectContext(): ProjectContextValue {
  const context = useContext(ProjectContext)

  // If not within a provider, return a default value (no project selected)
  if (context === undefined) {
    return {
      currentProject: null,
      isLoading: false,
      error: null,
    }
  }

  return context
}
