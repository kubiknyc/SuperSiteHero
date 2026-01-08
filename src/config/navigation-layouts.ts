// File: src/config/navigation-layouts.ts
// Shared navigation layout configurations for sidebar organization
// Used by both SettingsPage and the actual Sidebar component

import {
  LayoutDashboard,
  FolderKanban,
  ClipboardList,
  FileText,
  Users,
  CheckSquare,
  FileQuestion,
  Truck,
  Shield,
  Calendar,
  Camera,
  Ruler,
  Receipt,
  FileCheck,
  Building2,
  Hammer,
  HardHat,
  Clock,
  TrendingUp,
  Inbox,
  Star,
  Zap,
  Layers,
  BarChart3,
  Settings,
  LucideIcon,
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

export interface NavItem {
  path: string
  label: string
  icon: LucideIcon
  badge?: number | React.ComponentType
  description?: string
}

export interface NavGroup {
  id: string
  label: string
  icon: LucideIcon
  items: NavItem[]
  defaultExpanded?: boolean
}

export interface NavigationLayout {
  id: string
  name: string
  description: string
  primary: NavItem[]
  groups: NavGroup[]
}

// ============================================================================
// LAYOUT 1: BY WORKFLOW TYPE (Default)
// Groups by type of work: Workflows, Field Operations, Team
// ============================================================================

const WORKFLOW_TYPE_LAYOUT: NavigationLayout = {
  id: 'workflow-type',
  name: 'By Workflow Type',
  description: 'Groups items by the type of work they represent',
  primary: [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/projects', label: 'Projects', icon: FolderKanban },
    { path: '/daily-reports', label: 'Daily Reports', icon: ClipboardList, badge: 3 },
  ],
  groups: [
    {
      id: 'workflows',
      label: 'Workflows',
      icon: FileText,
      items: [
        { path: '/rfis', label: 'RFIs', icon: FileQuestion, badge: 5 },
        { path: '/submittals', label: 'Submittals', icon: FileText },
        { path: '/change-orders', label: 'Change Orders', icon: Receipt },
      ],
    },
    {
      id: 'field',
      label: 'Field Operations',
      icon: HardHat,
      items: [
        { path: '/punch-lists', label: 'Punch Lists', icon: CheckSquare },
        { path: '/safety', label: 'Safety', icon: Shield },
        { path: '/inspections', label: 'Inspections', icon: FileCheck },
      ],
    },
    {
      id: 'team',
      label: 'Team & Resources',
      icon: Users,
      items: [
        { path: '/team', label: 'Team Members', icon: Users },
        { path: '/subcontractors', label: 'Subcontractors', icon: Truck },
        { path: '/equipment', label: 'Equipment', icon: Hammer },
      ],
    },
  ],
}

// ============================================================================
// LAYOUT 2: BY FREQUENCY OF USE
// Most used items at top, less frequent below
// ============================================================================

const FREQUENCY_LAYOUT: NavigationLayout = {
  id: 'frequency',
  name: 'By Frequency',
  description: 'Most frequently used items are easily accessible at the top',
  primary: [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ],
  groups: [
    {
      id: 'daily',
      label: 'Daily Tasks',
      icon: Clock,
      items: [
        { path: '/daily-reports', label: 'Daily Reports', icon: ClipboardList, badge: 3 },
        { path: '/punch-lists', label: 'Punch Lists', icon: CheckSquare, badge: 8 },
        { path: '/photos', label: 'Photo Progress', icon: Camera },
        { path: '/safety', label: 'Safety Logs', icon: Shield },
      ],
    },
    {
      id: 'weekly',
      label: 'Weekly Reviews',
      icon: Calendar,
      items: [
        { path: '/rfis', label: 'RFIs', icon: FileQuestion, badge: 5 },
        { path: '/submittals', label: 'Submittals', icon: FileText, badge: 2 },
        { path: '/inspections', label: 'Inspections', icon: FileCheck },
        { path: '/meetings', label: 'Meetings', icon: Users },
      ],
    },
    {
      id: 'management',
      label: 'Project Management',
      icon: FolderKanban,
      items: [
        { path: '/projects', label: 'All Projects', icon: FolderKanban },
        { path: '/change-orders', label: 'Change Orders', icon: Receipt },
        { path: '/schedules', label: 'Schedules', icon: Calendar },
        { path: '/reports', label: 'Reports', icon: BarChart3 },
      ],
    },
    {
      id: 'resources',
      label: 'Resources',
      icon: Building2,
      items: [
        { path: '/team', label: 'Team', icon: Users },
        { path: '/subcontractors', label: 'Subcontractors', icon: Truck },
        { path: '/equipment', label: 'Equipment', icon: Hammer },
      ],
    },
  ],
}

// ============================================================================
// LAYOUT 3: BY PROJECT PHASE
// Organized around construction project lifecycle
// ============================================================================

const PROJECT_PHASE_LAYOUT: NavigationLayout = {
  id: 'project-phase',
  name: 'By Project Phase',
  description: 'Organized around the construction project lifecycle stages',
  primary: [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/projects', label: 'Projects', icon: FolderKanban },
  ],
  groups: [
    {
      id: 'preconstruction',
      label: 'Pre-Construction',
      icon: FileText,
      items: [
        { path: '/submittals', label: 'Submittals', icon: FileText, badge: 2 },
        { path: '/rfis', label: 'RFIs', icon: FileQuestion, badge: 5 },
        { path: '/schedules', label: 'Schedules', icon: Calendar },
        { path: '/takeoffs', label: 'Takeoffs', icon: Ruler },
      ],
    },
    {
      id: 'construction',
      label: 'Active Construction',
      icon: HardHat,
      items: [
        { path: '/daily-reports', label: 'Daily Reports', icon: ClipboardList, badge: 3 },
        { path: '/photos', label: 'Photo Progress', icon: Camera },
        { path: '/safety', label: 'Safety', icon: Shield },
        { path: '/inspections', label: 'Inspections', icon: FileCheck },
        { path: '/change-orders', label: 'Change Orders', icon: Receipt },
      ],
    },
    {
      id: 'closeout',
      label: 'Closeout',
      icon: CheckSquare,
      items: [
        { path: '/punch-lists', label: 'Punch Lists', icon: CheckSquare, badge: 8 },
        { path: '/warranties', label: 'Warranties', icon: Shield },
        { path: '/as-builts', label: 'As-Builts', icon: FileText },
        { path: '/turnover', label: 'Turnover Docs', icon: Inbox },
      ],
    },
    {
      id: 'resources',
      label: 'Resources',
      icon: Users,
      items: [
        { path: '/team', label: 'Team', icon: Users },
        { path: '/subcontractors', label: 'Subcontractors', icon: Truck },
        { path: '/equipment', label: 'Equipment', icon: Hammer },
      ],
    },
  ],
}

// ============================================================================
// LAYOUT 4: FLAT WITH FAVORITES
// Flat list with starred/favorite items at top
// ============================================================================

const FAVORITES_LAYOUT: NavigationLayout = {
  id: 'favorites',
  name: 'Flat with Favorites',
  description: 'Flat navigation with user favorites pinned at the top',
  primary: [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ],
  groups: [
    {
      id: 'favorites',
      label: 'Favorites',
      icon: Star,
      items: [
        { path: '/daily-reports', label: 'Daily Reports', icon: ClipboardList, badge: 3 },
        { path: '/punch-lists', label: 'Punch Lists', icon: CheckSquare, badge: 8 },
        { path: '/rfis', label: 'RFIs', icon: FileQuestion, badge: 5 },
      ],
    },
    {
      id: 'all',
      label: 'All Features',
      icon: Layers,
      items: [
        { path: '/projects', label: 'Projects', icon: FolderKanban },
        { path: '/submittals', label: 'Submittals', icon: FileText },
        { path: '/change-orders', label: 'Change Orders', icon: Receipt },
        { path: '/safety', label: 'Safety', icon: Shield },
        { path: '/inspections', label: 'Inspections', icon: FileCheck },
        { path: '/photos', label: 'Photos', icon: Camera },
        { path: '/schedules', label: 'Schedules', icon: Calendar },
        { path: '/meetings', label: 'Meetings', icon: Users },
        { path: '/team', label: 'Team', icon: Users },
        { path: '/subcontractors', label: 'Subcontractors', icon: Truck },
        { path: '/equipment', label: 'Equipment', icon: Hammer },
        { path: '/reports', label: 'Reports', icon: BarChart3 },
      ],
    },
  ],
}

// ============================================================================
// LAYOUT 5: BY USER ROLE / RESPONSIBILITY
// Organized by who typically uses each feature
// ============================================================================

const RESPONSIBILITY_LAYOUT: NavigationLayout = {
  id: 'responsibility',
  name: 'By Responsibility',
  description: 'Grouped by who is primarily responsible for each area',
  primary: [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/projects', label: 'Projects', icon: FolderKanban },
  ],
  groups: [
    {
      id: 'superintendent',
      label: 'Field Work',
      icon: HardHat,
      items: [
        { path: '/daily-reports', label: 'Daily Reports', icon: ClipboardList, badge: 3 },
        { path: '/safety', label: 'Safety', icon: Shield },
        { path: '/punch-lists', label: 'Punch Lists', icon: CheckSquare, badge: 8 },
        { path: '/inspections', label: 'Inspections', icon: FileCheck },
        { path: '/photos', label: 'Photos', icon: Camera },
      ],
    },
    {
      id: 'pm',
      label: 'Project Management',
      icon: TrendingUp,
      items: [
        { path: '/rfis', label: 'RFIs', icon: FileQuestion, badge: 5 },
        { path: '/submittals', label: 'Submittals', icon: FileText, badge: 2 },
        { path: '/change-orders', label: 'Change Orders', icon: Receipt },
        { path: '/schedules', label: 'Schedules', icon: Calendar },
        { path: '/meetings', label: 'Meetings', icon: Users },
      ],
    },
    {
      id: 'coordination',
      label: 'Coordination',
      icon: Users,
      items: [
        { path: '/team', label: 'Team', icon: Users },
        { path: '/subcontractors', label: 'Subcontractors', icon: Truck },
        { path: '/equipment', label: 'Equipment', icon: Hammer },
      ],
    },
    {
      id: 'reporting',
      label: 'Reports & Analytics',
      icon: BarChart3,
      items: [
        { path: '/reports', label: 'Reports', icon: BarChart3 },
        { path: '/analytics', label: 'Analytics', icon: TrendingUp },
        { path: '/exports', label: 'Exports', icon: FileText },
      ],
    },
  ],
}

// ============================================================================
// LAYOUT 6: MINIMAL / ACTION-BASED
// Focused on actions rather than categories
// ============================================================================

const ACTION_BASED_LAYOUT: NavigationLayout = {
  id: 'action-based',
  name: 'Action-Based',
  description: 'Organized by actions: Create, Review, Track, Manage',
  primary: [
    { path: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { path: '/inbox', label: 'Inbox', icon: Inbox, badge: 12 },
  ],
  groups: [
    {
      id: 'create',
      label: 'Create',
      icon: Zap,
      items: [
        { path: '/daily-reports/new', label: 'Daily Report', icon: ClipboardList },
        { path: '/rfis/new', label: 'New RFI', icon: FileQuestion },
        { path: '/photos/upload', label: 'Upload Photo', icon: Camera },
        { path: '/punch-lists/new', label: 'Punch Item', icon: CheckSquare },
      ],
    },
    {
      id: 'review',
      label: 'Review',
      icon: FileCheck,
      items: [
        { path: '/submittals', label: 'Submittals', icon: FileText, badge: 2 },
        { path: '/change-orders', label: 'Change Orders', icon: Receipt },
        { path: '/inspections', label: 'Inspections', icon: FileCheck },
        { path: '/safety', label: 'Safety Reports', icon: Shield },
      ],
    },
    {
      id: 'track',
      label: 'Track',
      icon: TrendingUp,
      items: [
        { path: '/rfis', label: 'Open RFIs', icon: FileQuestion, badge: 5 },
        { path: '/punch-lists', label: 'Punch Items', icon: CheckSquare, badge: 8 },
        { path: '/schedules', label: 'Schedule', icon: Calendar },
        { path: '/projects', label: 'Projects', icon: FolderKanban },
      ],
    },
    {
      id: 'manage',
      label: 'Manage',
      icon: Settings,
      items: [
        { path: '/team', label: 'Team', icon: Users },
        { path: '/subcontractors', label: 'Subcontractors', icon: Truck },
        { path: '/reports', label: 'Reports', icon: BarChart3 },
      ],
    },
  ],
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * All available navigation layouts
 */
export const NAVIGATION_LAYOUTS: NavigationLayout[] = [
  WORKFLOW_TYPE_LAYOUT,
  FREQUENCY_LAYOUT,
  PROJECT_PHASE_LAYOUT,
  FAVORITES_LAYOUT,
  RESPONSIBILITY_LAYOUT,
  ACTION_BASED_LAYOUT,
]

/**
 * Default layout ID
 */
export const DEFAULT_LAYOUT_ID = 'workflow-type'

/**
 * Get a layout by ID
 */
export function getLayoutById(id: string): NavigationLayout | undefined {
  return NAVIGATION_LAYOUTS.find((layout) => layout.id === id)
}

/**
 * Get the default layout
 */
export function getDefaultLayout(): NavigationLayout {
  return NAVIGATION_LAYOUTS[0]
}

/**
 * Get all layout IDs
 */
export function getLayoutIds(): string[] {
  return NAVIGATION_LAYOUTS.map((layout) => layout.id)
}
