/**
 * Dashboard Layout Hooks
 * React Query hooks for dashboard layout management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import * as dashboardApi from '@/lib/api/services/dashboard'
import type {
  CreateDashboardLayoutRequest,
  UpdateDashboardLayoutRequest,
  AddWidgetRequest,
  UpdateWidgetRequest,
  WidgetPosition,
} from '@/types/dashboard'

/**
 * Query key factory for dashboard
 */
export const dashboardKeys = {
  all: ['dashboard'] as const,
  layouts: (userId?: string) => [...dashboardKeys.all, 'layouts', userId] as const,
  layout: (layoutId: string) => [...dashboardKeys.all, 'layout', layoutId] as const,
  defaultLayout: (userId?: string, projectId?: string | null) =>
    [...dashboardKeys.all, 'default', userId, projectId] as const,
  sharedLayouts: () => [...dashboardKeys.all, 'shared'] as const,
  widgets: (layoutId: string) => [...dashboardKeys.all, 'widgets', layoutId] as const,
}

/**
 * Hook to get all dashboard layouts for the current user
 */
export function useDashboardLayouts(options?: {
  projectId?: string | null
  enabled?: boolean
}) {
  return useQuery({
    queryKey: dashboardKeys.layouts(options?.projectId ?? undefined),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {throw new Error('Not authenticated')}
      return dashboardApi.getDashboardLayouts(user.id, options?.projectId)
    },
    enabled: options?.enabled !== false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to get the user's default layout for a project
 */
export function useDefaultLayout(options?: {
  projectId?: string | null
  enabled?: boolean
}) {
  return useQuery({
    queryKey: dashboardKeys.defaultLayout(undefined, options?.projectId),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {throw new Error('Not authenticated')}
      return dashboardApi.getDefaultLayout(user.id, options?.projectId)
    },
    enabled: options?.enabled !== false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to get a specific layout by ID
 */
export function useLayoutById(layoutId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.layout(layoutId || ''),
    queryFn: () => dashboardApi.getLayoutById(layoutId!),
    enabled: enabled && !!layoutId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to get shared layouts
 */
export function useSharedLayouts(enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.sharedLayouts(),
    queryFn: dashboardApi.getSharedDashboardLayouts,
    enabled,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

/**
 * Hook to get widget preferences for a layout
 */
export function useWidgetPreferences(layoutId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.widgets(layoutId || ''),
    queryFn: () => dashboardApi.getWidgetPreferences(layoutId!),
    enabled: enabled && !!layoutId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to create a new layout
 */
export function useCreateLayout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (layout: CreateDashboardLayoutRequest) =>
      dashboardApi.createDashboardLayout(layout),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
    },
  })
}

/**
 * Hook to update a layout
 */
export function useUpdateLayout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      layoutId,
      updates,
    }: {
      layoutId: string
      updates: UpdateDashboardLayoutRequest
    }) => dashboardApi.updateDashboardLayout(layoutId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.layout(data.id) })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.layouts() })
    },
  })
}

/**
 * Hook to delete a layout
 */
export function useDeleteLayout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (layoutId: string) => dashboardApi.deleteDashboardLayout(layoutId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
    },
  })
}

/**
 * Hook to set a layout as default
 */
export function useSetDefaultLayout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (layoutId: string) => dashboardApi.setLayoutAsDefault(layoutId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
    },
  })
}

/**
 * Hook to clone a layout
 */
export function useCloneLayout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      sourceLayoutId,
      newName,
    }: {
      sourceLayoutId: string
      newName?: string
    }) => dashboardApi.cloneDashboardLayout(sourceLayoutId, newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
    },
  })
}

/**
 * Hook to save widget positions (bulk update)
 */
export function useSaveWidgetPositions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      layoutId,
      widgets,
    }: {
      layoutId: string
      widgets: Array<{ id: string; position: WidgetPosition }>
    }) => dashboardApi.saveWidgetPositions(layoutId, widgets),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.widgets(variables.layoutId),
      })
    },
  })
}

/**
 * Hook to add a widget to a layout
 */
export function useAddWidget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: AddWidgetRequest) => dashboardApi.addWidget(request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.widgets(data.layout_id),
      })
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.layout(data.layout_id),
      })
    },
  })
}

/**
 * Hook to remove a widget from a layout
 */
export function useRemoveWidget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      widgetId,
      layoutId,
    }: {
      widgetId: string
      layoutId: string
    }) => dashboardApi.removeWidget(widgetId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.widgets(variables.layoutId),
      })
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.layout(variables.layoutId),
      })
    },
  })
}

/**
 * Hook to update a widget's configuration
 */
export function useUpdateWidgetConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      widgetId,
      updates,
    }: {
      widgetId: string
      updates: UpdateWidgetRequest
    }) => dashboardApi.updateWidgetConfig(widgetId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.widgets(data.layout_id),
      })
    },
  })
}
