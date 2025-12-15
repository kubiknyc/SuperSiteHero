/**
 * Widget Registry
 * Central registry for all dashboard widgets
 */

import { createElement } from 'react'
import {
  Cloud,
  ClipboardCheck,
  HardHat,
  CalendarCheck,
  Camera,
  Activity,
  Flag,
  DollarSign,
} from 'lucide-react'
import type { WidgetDefinition, WidgetCategory } from '@/types/dashboard'

// Import widget components
import { WeatherWidget } from './WeatherWidget'
import { PunchItemsWidget } from './PunchItemsWidget'
import { SafetyAlertsWidget } from './SafetyAlertsWidget'
import { InspectionScheduleWidget } from './InspectionScheduleWidget'
import { PhotoCarouselWidget } from './PhotoCarouselWidget'
import { RecentActivityWidget } from './RecentActivityWidget'
import { ScheduleMilestonesWidget } from './ScheduleMilestonesWidget'
import { CostSummaryWidget } from './CostSummaryWidget'

/**
 * Widget definitions registry
 */
export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = {
  weather: {
    id: 'weather',
    name: 'Weather',
    description: 'Current weather conditions and forecast for the project location',
    category: 'safety',
    icon: createElement(Cloud, { className: 'h-5 w-5' }),
    component: WeatherWidget,
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    maxSize: { w: 6, h: 4 },
    defaultConfig: {},
  },
  punch_items: {
    id: 'punch_items',
    name: 'Punch Items',
    description: 'Open and in-progress punch items with priority breakdown',
    category: 'quality',
    icon: createElement(ClipboardCheck, { className: 'h-5 w-5' }),
    component: PunchItemsWidget,
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    maxSize: { w: 6, h: 4 },
    defaultConfig: {},
  },
  safety_alerts: {
    id: 'safety_alerts',
    name: 'Safety Alerts',
    description: 'Recent safety observations requiring attention',
    category: 'safety',
    icon: createElement(HardHat, { className: 'h-5 w-5' }),
    component: SafetyAlertsWidget,
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 6, h: 6 },
    defaultConfig: {},
  },
  inspection_schedule: {
    id: 'inspection_schedule',
    name: 'Inspection Schedule',
    description: "Today's scheduled inspections",
    category: 'quality',
    icon: createElement(CalendarCheck, { className: 'h-5 w-5' }),
    component: InspectionScheduleWidget,
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 6, h: 6 },
    defaultConfig: {},
  },
  photo_carousel: {
    id: 'photo_carousel',
    name: 'Recent Photos',
    description: 'Latest project photos in a carousel view',
    category: 'photos',
    icon: createElement(Camera, { className: 'h-5 w-5' }),
    component: PhotoCarouselWidget,
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 8, h: 6 },
    defaultConfig: {},
  },
  recent_activity: {
    id: 'recent_activity',
    name: 'Recent Activity',
    description: 'Latest project updates and activities',
    category: 'activity',
    icon: createElement(Activity, { className: 'h-5 w-5' }),
    component: RecentActivityWidget,
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 6, h: 6 },
    defaultConfig: {},
  },
  schedule_milestones: {
    id: 'schedule_milestones',
    name: 'Milestones',
    description: 'Upcoming project milestones',
    category: 'schedule',
    icon: createElement(Flag, { className: 'h-5 w-5' }),
    component: ScheduleMilestonesWidget,
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 6, h: 6 },
    defaultConfig: {},
  },
  cost_summary: {
    id: 'cost_summary',
    name: 'Cost Summary',
    description: 'Budget vs actual cost overview',
    category: 'cost',
    icon: createElement(DollarSign, { className: 'h-5 w-5' }),
    component: CostSummaryWidget,
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 6, h: 5 },
    defaultConfig: {},
  },
}

/**
 * Get a widget definition by ID
 */
export function getWidget(widgetId: string): WidgetDefinition | undefined {
  return WIDGET_REGISTRY[widgetId]
}

/**
 * Get all widgets for a specific category
 */
export function getWidgetsByCategory(category: WidgetCategory): WidgetDefinition[] {
  return Object.values(WIDGET_REGISTRY).filter((widget) => widget.category === category)
}

/**
 * Get all available widgets
 */
export function getAllWidgets(): WidgetDefinition[] {
  return Object.values(WIDGET_REGISTRY)
}

/**
 * Get all widget categories with their widgets
 */
export function getWidgetCategories(): Array<{
  category: WidgetCategory
  label: string
  widgets: WidgetDefinition[]
}> {
  const categoryLabels: Record<WidgetCategory, string> = {
    safety: 'Safety',
    schedule: 'Schedule',
    quality: 'Quality',
    photos: 'Photos',
    activity: 'Activity',
    cost: 'Cost',
  }

  const categories: WidgetCategory[] = ['safety', 'schedule', 'quality', 'photos', 'activity', 'cost']

  return categories.map((category) => ({
    category,
    label: categoryLabels[category],
    widgets: getWidgetsByCategory(category),
  }))
}

/**
 * Check if a widget type exists
 */
export function isValidWidgetType(widgetType: string): boolean {
  return widgetType in WIDGET_REGISTRY
}

/**
 * Get default widget layout for a new dashboard
 */
export function getDefaultWidgetLayout(): Array<{
  widgetType: string
  position: { x: number; y: number; w: number; h: number }
}> {
  return [
    { widgetType: 'weather', position: { x: 0, y: 0, w: 4, h: 3 } },
    { widgetType: 'punch_items', position: { x: 4, y: 0, w: 4, h: 3 } },
    { widgetType: 'safety_alerts', position: { x: 8, y: 0, w: 4, h: 3 } },
    { widgetType: 'inspection_schedule', position: { x: 0, y: 3, w: 4, h: 4 } },
    { widgetType: 'schedule_milestones', position: { x: 4, y: 3, w: 4, h: 4 } },
    { widgetType: 'recent_activity', position: { x: 8, y: 3, w: 4, h: 4 } },
  ]
}
