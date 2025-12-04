// File: /src/features/workflows/hooks/useWorkflowTypes.ts
// React Query hook for workflow types

import { useQuery } from '@tanstack/react-query'
import { workflowsApi } from '@/lib/api'
import { useAuth } from '@/lib/auth/AuthContext'
import type { WorkflowType } from '@/types/database'

// Fetch all workflow types for the current company
export function useWorkflowTypes() {
  const { userProfile } = useAuth()

  return useQuery<WorkflowType[]>({
    queryKey: ['workflow-types', userProfile?.company_id],
    queryFn: async () => {
      if (!userProfile?.company_id) {
        throw new Error('Company ID required')
      }
      return workflowsApi.getWorkflowTypes(userProfile.company_id)
    },
    enabled: !!userProfile?.company_id,
  })
}

// Helper to get icon for workflow type (using prefix or fallback)
export function getWorkflowTypeIcon(workflowType: WorkflowType): string {
  const prefix = workflowType.prefix?.toLowerCase()

  // Map common prefixes to icons
  switch (prefix) {
    case 'rfi':
      return '📋'
    case 'co':
    case 'change':
      return '📝'
    case 'sub':
    case 'submittal':
      return '📤'
    case 'pcco':
      return '💰'
    case 'daily':
      return '📅'
    default:
      // Fallback based on name
      const name = workflowType.name_singular?.toLowerCase() || ''
      if (name.includes('rfi') || name.includes('request')) return '📋'
      if (name.includes('change') || name.includes('order')) return '📝'
      if (name.includes('submittal')) return '📤'
      if (name.includes('punch')) return '✅'
      if (name.includes('safety')) return '🦺'
      return '📄'
  }
}
