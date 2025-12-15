/**
 * Dashboard Types
 * Type definitions for customizable dashboards
 */

import { ComponentType, ReactElement } from 'react'

/**
 * Widget position in the grid layout
 */
export interface WidgetPosition {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Widget size constraints
 */
export interface WidgetSize {
  w: number
  h: number
}

/**
 * Widget configuration object
 */
export interface WidgetConfig {
  [key: string]: unknown
}

/**
 * Props passed to every widget component
 */
export interface WidgetProps {
  projectId: string
  widgetId: string
  config: WidgetConfig
  onConfigChange?: (config: WidgetConfig) => void
  isEditing?: boolean
  className?: string
}

/**
 * Widget category for organization
 */
export type WidgetCategory = 'safety' | 'schedule' | 'quality' | 'photos' | 'activity' | 'cost'

/**
 * Widget definition in the registry
 */
export interface WidgetDefinition {
  id: string
  name: string
  description: string
  category: WidgetCategory
  icon: ReactElement
  component: ComponentType<WidgetProps>
  defaultSize: WidgetSize
  minSize: WidgetSize
  maxSize: WidgetSize
  defaultConfig: WidgetConfig
}

/**
 * Widget preference stored in database
 */
export interface WidgetPreference {
  id: string
  layout_id: string
  widget_type: string
  widget_config: WidgetConfig
  position: WidgetPosition
  is_visible: boolean
  refresh_interval: number | null
  created_at: string
  updated_at: string
}

/**
 * Dashboard layout stored in database
 */
export interface DashboardLayout {
  id: string
  user_id: string
  project_id: string | null
  name: string
  description: string | null
  layout_config: WidgetPosition[]
  is_default: boolean
  is_shared: boolean
  created_at: string
  updated_at: string
}

/**
 * Dashboard layout with widgets
 */
export interface DashboardLayoutWithWidgets extends DashboardLayout {
  widgets: WidgetPreference[]
}

/**
 * Create layout request
 */
export interface CreateDashboardLayoutRequest {
  name: string
  description?: string
  project_id?: string | null
  is_default?: boolean
  is_shared?: boolean
  layout_config?: WidgetPosition[]
}

/**
 * Update layout request
 */
export interface UpdateDashboardLayoutRequest {
  name?: string
  description?: string
  is_default?: boolean
  is_shared?: boolean
  layout_config?: WidgetPosition[]
}

/**
 * Add widget request
 */
export interface AddWidgetRequest {
  layout_id: string
  widget_type: string
  position: WidgetPosition
  widget_config?: WidgetConfig
  refresh_interval?: number | null
}

/**
 * Update widget request
 */
export interface UpdateWidgetRequest {
  widget_config?: WidgetConfig
  position?: WidgetPosition
  is_visible?: boolean
  refresh_interval?: number | null
}

/**
 * Widget item for drag-and-drop
 */
export interface DraggableWidget {
  id: string
  widgetType: string
  position: WidgetPosition
  config: WidgetConfig
  isVisible: boolean
  refreshInterval: number | null
}

/**
 * Grid layout configuration
 */
export interface GridConfig {
  columns: number
  rowHeight: number
  gap: number
  margin: number
}

/**
 * Default grid configuration
 */
export const DEFAULT_GRID_CONFIG: GridConfig = {
  columns: 12,
  rowHeight: 80,
  gap: 16,
  margin: 16,
}
