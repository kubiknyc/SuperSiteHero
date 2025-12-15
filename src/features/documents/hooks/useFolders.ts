// File: /src/features/documents/hooks/useFolders.ts
// React Query hooks for folder management

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import type { Database } from '@/types/database'

type Folder = Database['public']['Tables']['folders']['Row']
type FolderInsert = Database['public']['Tables']['folders']['Insert']

export function useFolders(projectId: string | undefined) {
  return useQuery({
    queryKey: ['folders', projectId],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}

      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })

      if (error) {throw error}
      return data as Folder[]
    },
    enabled: !!projectId,
  })
}

export function useCreateFolder() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (input: Omit<FolderInsert, 'created_by'>) => {
      if (!userProfile?.id) {throw new Error('User must be authenticated')}

      const { data, error } = await supabase
        .from('folders')
        .insert({ ...input, created_by: userProfile.id })
        .select()
        .single()

      if (error) {throw error}
      return data as Folder
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['folders', data.project_id] })
    },
  })
}
