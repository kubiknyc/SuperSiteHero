// File: /src/features/workflows/hooks/useWorkflowItems.ts
// React Query hooks for workflow items (RFIs, COs, Submittals)

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { WorkflowItem } from '@/types/database'

export function useWorkflowItems(projectId: string, workflowTypeId?: string) {
  return useQuery({
    queryKey: ['workflow-items', projectId, workflowTypeId],
    queryFn: async () => {
      // TODO: Implement data fetching with proper filtering
      let query = supabase
        .from('workflow_items')
        .select('*')
        .eq('project_id', projectId)

      if (workflowTypeId) {
        query = query.eq('workflow_type_id', workflowTypeId)
      }

      const { data, error } = await query
      if (error) throw error
      return data as WorkflowItem[]
    },
  })
}

// TODO: Add specific hooks for RFIs, Change Orders, Submittals
// export function useRFIs(projectId: string) {}
// export function useChangeOrders(projectId: string) {}
// export function useSubmittals(projectId: string) {}
