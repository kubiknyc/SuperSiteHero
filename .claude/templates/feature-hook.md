# Feature Hook Template

Use this template when creating React Query hooks for new features.

## Pattern

```typescript
// src/features/{feature-name}/hooks/use{FeatureName}.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import { useToast } from '@/components/ui/toast'
import type { {FeatureName}, Create{FeatureName}Input, Update{FeatureName}Input } from '@/types/database'

// ============================================
// Fetch Single Item
// ============================================

export function use{FeatureName}(id?: string) {
  return useQuery({
    queryKey: ['{feature-name}', id],
    queryFn: async () => {
      if (!id) throw new Error('ID is required')

      const { data, error } = await supabase
        .from('{table_name}')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as {FeatureName}
    },
    enabled: !!id,
  })
}

// ============================================
// Fetch Collection
// ============================================

interface Use{FeatureName}sFilters {
  projectId?: string
  // Add other filters as needed
}

export function use{FeatureName}s(filters?: Use{FeatureName}sFilters) {
  return useQuery({
    queryKey: ['{feature-name}s', filters],
    queryFn: async () => {
      let query = supabase
        .from('{table_name}')
        .select('*')
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters?.projectId) {
        query = query.eq('project_id', filters.projectId)
      }

      const { data, error } = await query

      if (error) throw error
      return data as {FeatureName}[]
    },
  })
}

// ============================================
// Create Mutation
// ============================================

export function useCreate{FeatureName}() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: async (input: Create{FeatureName}Input) => {
      if (!userProfile?.company_id) {
        throw new Error('Company ID not found')
      }

      const { data, error } = await supabase
        .from('{table_name}')
        .insert({
          ...input,
          company_id: userProfile.company_id,
        })
        .select()
        .single()

      if (error) throw error
      return data as {FeatureName}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['{feature-name}s'] })
      addToast({
        title: 'Success',
        description: '{FeatureName} created successfully',
        variant: 'success',
      })
    },
    onError: (error: Error) => {
      addToast({
        title: 'Error',
        description: error.message || 'Failed to create {feature-name}',
        variant: 'destructive',
      })
    },
  })
}

// ============================================
// Update Mutation
// ============================================

export function useUpdate{FeatureName}() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: async (input: Update{FeatureName}Input) => {
      const { id, ...updates } = input

      const { data, error } = await supabase
        .from('{table_name}')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as {FeatureName}
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['{feature-name}s'] })
      queryClient.invalidateQueries({ queryKey: ['{feature-name}', data.id] })
      addToast({
        title: 'Success',
        description: '{FeatureName} updated successfully',
        variant: 'success',
      })
    },
    onError: (error: Error) => {
      addToast({
        title: 'Error',
        description: error.message || 'Failed to update {feature-name}',
        variant: 'destructive',
      })
    },
  })
}

// ============================================
// Delete Mutation
// ============================================

export function useDelete{FeatureName}() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('{table_name}')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['{feature-name}s'] })
      addToast({
        title: 'Success',
        description: '{FeatureName} deleted successfully',
        variant: 'success',
      })
    },
    onError: (error: Error) => {
      addToast({
        title: 'Error',
        description: error.message || 'Failed to delete {feature-name}',
        variant: 'destructive',
      })
    },
  })
}
```

## Usage in Component

```typescript
// Example component using the hooks
import { use{FeatureName}s, useCreate{FeatureName}, useUpdate{FeatureName}, useDelete{FeatureName} } from '@/features/{feature-name}/hooks/use{FeatureName}'

function {FeatureName}List() {
  const { data: items, isLoading, error } = use{FeatureName}s({ projectId: 'abc' })
  const createMutation = useCreate{FeatureName}()
  const updateMutation = useUpdate{FeatureName}()
  const deleteMutation = useDelete{FeatureName}()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      {items?.map(item => (
        <div key={item.id}>
          {/* Render item */}
        </div>
      ))}
    </div>
  )
}
```

## Replacements Needed

When using this template, replace:
- `{feature-name}` → kebab-case name (e.g., 'daily-report', 'rfi', 'change-order')
- `{FeatureName}` → PascalCase name (e.g., 'DailyReport', 'RFI', 'ChangeOrder')
- `{table_name}` → database table name (e.g., 'daily_reports', 'rfis', 'change_orders')
