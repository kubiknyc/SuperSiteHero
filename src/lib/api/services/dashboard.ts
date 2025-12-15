/**
 * Dashboard API Service
 * Handles all dashboard layout and widget CRUD operations
 */

import { supabase } from '@/lib/supabase'
import type {
  DashboardLayout,
  DashboardLayoutWithWidgets,
  WidgetPreference,
  CreateDashboardLayoutRequest,
  UpdateDashboardLayoutRequest,
  AddWidgetRequest,
  UpdateWidgetRequest,
  WidgetPosition,
  WidgetConfig,
} from '@/types/dashboard'

/**
 * Get all dashboard layouts for a user
 */
export async function getDashboardLayouts(
  userId: string,
  projectId?: string | null
): Promise<DashboardLayout[]> {
  let query = supabase
    .from('dashboard_layouts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (projectId) {
    query = query.or(`project_id.eq.${projectId},project_id.is.null`)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching dashboard layouts:', error)
    throw error
  }

  return data as DashboardLayout[]
}

/**
 * Get shared dashboard layouts
 */
export async function getSharedDashboardLayouts(): Promise<DashboardLayout[]> {
  const { data, error } = await supabase
    .from('dashboard_layouts')
    .select('*')
    .eq('is_shared', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching shared layouts:', error)
    throw error
  }

  return data as DashboardLayout[]
}

/**
 * Get a user's default layout for a project
 */
export async function getDefaultLayout(
  userId: string,
  projectId?: string | null
): Promise<DashboardLayoutWithWidgets | null> {
  // First try project-specific default
  if (projectId) {
    const { data: projectDefault } = await supabase
      .from('dashboard_layouts')
      .select('*')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .eq('is_default', true)
      .single()

    if (projectDefault) {
      const widgets = await getWidgetPreferences(projectDefault.id)
      return { ...projectDefault, widgets } as DashboardLayoutWithWidgets
    }
  }

  // Fall back to global default (project_id IS NULL)
  const { data: globalDefault } = await supabase
    .from('dashboard_layouts')
    .select('*')
    .eq('user_id', userId)
    .is('project_id', null)
    .eq('is_default', true)
    .single()

  if (globalDefault) {
    const widgets = await getWidgetPreferences(globalDefault.id)
    return { ...globalDefault, widgets } as DashboardLayoutWithWidgets
  }

  return null
}

/**
 * Get a specific layout by ID with widgets
 */
export async function getLayoutById(
  layoutId: string
): Promise<DashboardLayoutWithWidgets | null> {
  const { data, error } = await supabase
    .from('dashboard_layouts')
    .select('*')
    .eq('id', layoutId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw error
  }

  const widgets = await getWidgetPreferences(layoutId)
  return { ...data, widgets } as DashboardLayoutWithWidgets
}

/**
 * Create a new dashboard layout
 */
export async function createDashboardLayout(
  layout: CreateDashboardLayoutRequest
): Promise<DashboardLayout> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase
    .from('dashboard_layouts')
    .insert({
      user_id: user.id,
      name: layout.name,
      description: layout.description || null,
      project_id: layout.project_id || null,
      is_default: layout.is_default || false,
      is_shared: layout.is_shared || false,
      layout_config: layout.layout_config || [],
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating dashboard layout:', error)
    throw error
  }

  return data as DashboardLayout
}

/**
 * Update a dashboard layout
 */
export async function updateDashboardLayout(
  layoutId: string,
  updates: UpdateDashboardLayoutRequest
): Promise<DashboardLayout> {
  const { data, error } = await supabase
    .from('dashboard_layouts')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', layoutId)
    .select()
    .single()

  if (error) {
    console.error('Error updating dashboard layout:', error)
    throw error
  }

  return data as DashboardLayout
}

/**
 * Delete a dashboard layout
 */
export async function deleteDashboardLayout(layoutId: string): Promise<void> {
  const { error } = await supabase
    .from('dashboard_layouts')
    .delete()
    .eq('id', layoutId)

  if (error) {
    console.error('Error deleting dashboard layout:', error)
    throw error
  }
}

/**
 * Set a layout as default
 */
export async function setLayoutAsDefault(layoutId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('set_default_dashboard_layout', {
    p_layout_id: layoutId,
  })

  if (error) {
    console.error('Error setting default layout:', error)
    throw error
  }

  return data as boolean
}

/**
 * Clone a layout
 */
export async function cloneDashboardLayout(
  sourceLayoutId: string,
  newName?: string
): Promise<string> {
  const { data, error } = await supabase.rpc('clone_dashboard_layout', {
    p_source_layout_id: sourceLayoutId,
    p_new_name: newName || null,
  })

  if (error) {
    console.error('Error cloning dashboard layout:', error)
    throw error
  }

  return data as string
}

/**
 * Get widget preferences for a layout
 */
export async function getWidgetPreferences(
  layoutId: string
): Promise<WidgetPreference[]> {
  const { data, error } = await supabase
    .from('dashboard_widget_preferences')
    .select('*')
    .eq('layout_id', layoutId)
    .eq('is_visible', true)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching widget preferences:', error)
    throw error
  }

  return data as WidgetPreference[]
}

/**
 * Save all widget positions for a layout (bulk update)
 */
export async function saveWidgetPositions(
  layoutId: string,
  widgets: Array<{ id: string; position: WidgetPosition }>
): Promise<void> {
  // Update each widget position
  const updates = widgets.map((widget) =>
    supabase
      .from('dashboard_widget_preferences')
      .update({ position: widget.position })
      .eq('id', widget.id)
      .eq('layout_id', layoutId)
  )

  const results = await Promise.all(updates)

  // Check for errors
  const errors = results.filter((r) => r.error)
  if (errors.length > 0) {
    console.error('Error saving widget positions:', errors)
    throw new Error('Failed to save some widget positions')
  }
}

/**
 * Add a widget to a layout
 */
export async function addWidget(request: AddWidgetRequest): Promise<WidgetPreference> {
  const { data, error } = await supabase
    .from('dashboard_widget_preferences')
    .insert({
      layout_id: request.layout_id,
      widget_type: request.widget_type,
      position: request.position,
      widget_config: request.widget_config || {},
      refresh_interval: request.refresh_interval || null,
      is_visible: true,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding widget:', error)
    throw error
  }

  return data as WidgetPreference
}

/**
 * Remove a widget from a layout
 */
export async function removeWidget(widgetId: string): Promise<void> {
  const { error } = await supabase
    .from('dashboard_widget_preferences')
    .delete()
    .eq('id', widgetId)

  if (error) {
    console.error('Error removing widget:', error)
    throw error
  }
}

/**
 * Update a widget's configuration
 */
export async function updateWidgetConfig(
  widgetId: string,
  updates: UpdateWidgetRequest
): Promise<WidgetPreference> {
  const { data, error } = await supabase
    .from('dashboard_widget_preferences')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', widgetId)
    .select()
    .single()

  if (error) {
    console.error('Error updating widget config:', error)
    throw error
  }

  return data as WidgetPreference
}

/**
 * Hide a widget (soft delete)
 */
export async function hideWidget(widgetId: string): Promise<void> {
  const { error } = await supabase
    .from('dashboard_widget_preferences')
    .update({ is_visible: false })
    .eq('id', widgetId)

  if (error) {
    console.error('Error hiding widget:', error)
    throw error
  }
}

/**
 * Show a hidden widget
 */
export async function showWidget(widgetId: string): Promise<void> {
  const { error } = await supabase
    .from('dashboard_widget_preferences')
    .update({ is_visible: true })
    .eq('id', widgetId)

  if (error) {
    console.error('Error showing widget:', error)
    throw error
  }
}
