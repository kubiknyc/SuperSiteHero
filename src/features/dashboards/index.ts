/**
 * Dashboards Feature
 *
 * Role-based dashboard views for construction project management:
 * - Superintendent: Field operations focus
 * - Project Manager: Project oversight focus
 * - Executive: Portfolio-level overview
 */

export {
  SuperintendentDashboard,
  ProjectManagerDashboard,
  ExecutiveDashboard,
  DashboardSelector,
} from './components'

export { useDashboardView } from './components/DashboardSelector'
export type { DashboardView } from './components/DashboardSelector'

// Dashboard Data Hooks
export * from './hooks'
