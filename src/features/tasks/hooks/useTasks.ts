// File: /src/features/tasks/hooks/useTasks.ts
// React Query hooks for tasks

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Task } from '@/types/database'

export function useTasks(projectId: string) {
  return useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      // TODO: Implement data fetching
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('due_date', { ascending: true })

      if (error) throw error
      return data as Task[]
    },
  })
}

// TODO: Add mutations and additional hooks
// export function useCreateTask() {}
// export function useUpdateTask() {}
// export function useMyTasks() {}
