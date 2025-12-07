/**
 * useProjectUsers Hook
 *
 * Fetches all users assigned to a specific project for messaging.
 * Used to show project members in conversation creation dialogs.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ProjectUserWithDetails {
  id: string
  user_id: string
  project_id: string
  project_role: string | null
  user: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
    avatar_url: string | null
    company?: {
      id: string
      name: string
    } | null
  } | null
}

async function fetchProjectUsers(projectId: string): Promise<ProjectUserWithDetails[]> {
  const { data, error } = await supabase
    .from('project_users')
    .select(`
      id,
      user_id,
      project_id,
      project_role,
      user:users!project_users_user_id_fkey(
        id,
        first_name,
        last_name,
        email,
        avatar_url,
        company:companies(
          id,
          name
        )
      )
    `)
    .eq('project_id', projectId)
    .order('user_id')

  if (error) throw error
  return (data || []) as ProjectUserWithDetails[]
}

export function useProjectUsers(projectId: string | undefined) {
  return useQuery<ProjectUserWithDetails[]>({
    queryKey: ['messaging', 'project-users', projectId],
    queryFn: () => {
      if (!projectId) throw new Error('Project ID required')
      return fetchProjectUsers(projectId)
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes - project membership changes infrequently
  })
}
