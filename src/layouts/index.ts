/**
 * Layout Components
 *
 * Responsive layout components optimized for tablets and various screen sizes.
 */

export {
  // Master-Detail Layout
  MasterDetailLayout,
  type MasterDetailLayoutProps,

  // Responsive Grid Layout
  ResponsiveGridLayout,
  type ResponsiveGridLayoutProps,

  // Collapsible Sidebar Layout
  CollapsibleSidebarLayout,
  type CollapsibleSidebarLayoutProps,

  // Split View Layout
  SplitViewLayout,
  type SplitViewLayoutProps,

  // Tablet Form Layout
  TabletFormLayout,
  type TabletFormLayoutProps,

  // Touch-Optimized Container
  TouchOptimizedContainer,
  type TouchOptimizedContainerProps,
} from './TabletLayout';

// Dashboard Grid
export {
  DashboardGrid,
  type DashboardGridProps,
  DashboardWidget,
  type DashboardWidgetProps,
  DashboardSection,
  type DashboardSectionProps,
  QuickStatsBar,
  type QuickStatsBarProps,
  type QuickStatProps,
  type WidgetSize,
} from './DashboardGrid';
