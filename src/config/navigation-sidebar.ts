// File: src/config/navigation-sidebar.ts
// Comprehensive navigation configuration for the redesigned sidebar
// Contains all 60+ features organized into logical groups

import {
  LayoutDashboard,
  FolderKanban,
  MessageSquare,
  Search,
  Plus,
  Bell,
  ClipboardList,
  ListTodo,
  CircleAlert,
  Calendar,
  FileQuestion,
  FileText,
  Receipt,
  CheckSquare,
  GitBranch,
  ClipboardCheck,
  FileSearch,
  ShieldCheck,
  Shield,
  AlertTriangle,
  FileWarning,
  MessageCircle,
  ClipboardPen,
  FolderOpen,
  FileImage,
  Send,
  Hammer,
  FileKey,
  Camera,
  FolderImage,
  View,
  PenTool,
  GanttChart,
  CalendarDays,
  CalendarClock,
  Wallet,
  TrendingUp,
  CreditCard,
  Table,
  FileSignature,
  ShoppingCart,
  Users,
  Video,
  Megaphone,
  Mail,
  BarChart3,
  FileSpreadsheet,
  Clock,
  BrainCircuit,
  Settings,
  UserCog,
  Lock,
  Building2,
  Puzzle,
  HardHat,
  Briefcase,
  LucideIcon,
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

export interface SidebarNavItem {
  id: string
  path: string
  label: string
  icon: LucideIcon
  badge?: number | (() => number)
  description?: string
  keywords?: string[] // For search
}

export interface SidebarNavGroup {
  id: string
  label: string
  icon: LucideIcon
  items: SidebarNavItem[]
  defaultExpanded?: boolean
  nested?: SidebarNavGroup[] // For sub-groups like Safety Hub
}

export interface SidebarConfig {
  commandStrip: {
    search: boolean
    quickCreate: boolean
    notifications: boolean
  }
  primary: SidebarNavItem[]
  groups: SidebarNavGroup[]
  footer: {
    settings: SidebarNavItem
    admin?: SidebarNavItem
    portals: SidebarNavItem[]
  }
}

// ============================================================================
// COMPREHENSIVE NAVIGATION CONFIGURATION
// ============================================================================

export const SIDEBAR_CONFIG: SidebarConfig = {
  // Command Strip Configuration
  commandStrip: {
    search: true,
    quickCreate: true,
    notifications: true,
  },

  // Primary Navigation (Always Visible)
  primary: [
    {
      id: 'dashboard',
      path: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Overview and key metrics',
      keywords: ['home', 'overview', 'main'],
    },
    {
      id: 'projects',
      path: '/projects',
      label: 'Projects',
      icon: FolderKanban,
      description: 'All projects',
      keywords: ['jobs', 'sites'],
    },
    {
      id: 'messages',
      path: '/messages',
      label: 'Messages',
      icon: MessageSquare,
      badge: 3,
      description: 'Team messaging',
      keywords: ['chat', 'inbox', 'communication'],
    },
  ],

  // Navigation Groups
  groups: [
    // Core Operations
    {
      id: 'core-operations',
      label: 'Core Operations',
      icon: ClipboardList,
      defaultExpanded: true,
      items: [
        {
          id: 'daily-reports',
          path: '/daily-reports',
          label: 'Daily Reports',
          icon: ClipboardList,
          badge: 2,
          description: 'Daily field reports',
          keywords: ['logs', 'daily', 'field'],
        },
        {
          id: 'tasks',
          path: '/tasks',
          label: 'Tasks',
          icon: ListTodo,
          description: 'Task management',
          keywords: ['todo', 'assignments'],
        },
        {
          id: 'action-items',
          path: '/action-items',
          label: 'Action Items',
          icon: CircleAlert,
          badge: 5,
          description: 'Pending action items',
          keywords: ['actions', 'pending', 'urgent'],
        },
        {
          id: 'calendar',
          path: '/calendar',
          label: 'Calendar',
          icon: Calendar,
          description: 'Schedule and events',
          keywords: ['schedule', 'events', 'dates'],
        },
      ],
    },

    // Workflows
    {
      id: 'workflows',
      label: 'Workflows',
      icon: GitBranch,
      defaultExpanded: true,
      items: [
        {
          id: 'rfis',
          path: '/rfis',
          label: 'RFIs',
          icon: FileQuestion,
          badge: 8,
          description: 'Requests for Information',
          keywords: ['questions', 'clarification'],
        },
        {
          id: 'submittals',
          path: '/submittals',
          label: 'Submittals',
          icon: FileText,
          badge: 4,
          description: 'Document submittals',
          keywords: ['approvals', 'documents'],
        },
        {
          id: 'change-orders',
          path: '/change-orders',
          label: 'Change Orders',
          icon: Receipt,
          description: 'PCOs and change orders',
          keywords: ['changes', 'pco', 'modifications'],
        },
        {
          id: 'punch-lists',
          path: '/punch-lists',
          label: 'Punch Lists',
          icon: CheckSquare,
          badge: 12,
          description: 'Punch list items',
          keywords: ['deficiencies', 'fixes', 'closeout'],
        },
        {
          id: 'workflows',
          path: '/workflows',
          label: 'Workflows',
          icon: GitBranch,
          description: 'Custom workflows',
          keywords: ['processes', 'approvals'],
        },
      ],
    },

    // Field & Safety
    {
      id: 'field-safety',
      label: 'Field & Safety',
      icon: Shield,
      items: [
        {
          id: 'checklists',
          path: '/checklists',
          label: 'Checklists',
          icon: ClipboardCheck,
          description: 'Field checklists',
          keywords: ['forms', 'templates'],
        },
        {
          id: 'inspections',
          path: '/inspections',
          label: 'Inspections',
          icon: FileSearch,
          description: 'Quality inspections',
          keywords: ['quality', 'review'],
        },
        {
          id: 'quality-control',
          path: '/quality-control',
          label: 'Quality Control',
          icon: ShieldCheck,
          description: 'QC management',
          keywords: ['qc', 'ncr', 'defects'],
        },
        {
          id: 'safety',
          path: '/safety',
          label: 'Safety Hub',
          icon: Shield,
          description: 'Safety management',
          keywords: ['osha', 'incidents', 'jsa'],
        },
        {
          id: 'osha',
          path: '/safety/osha',
          label: 'OSHA Compliance',
          icon: AlertTriangle,
          description: 'OSHA logs and compliance',
          keywords: ['osha', '300', 'compliance'],
        },
        {
          id: 'incidents',
          path: '/safety/incidents',
          label: 'Incidents',
          icon: FileWarning,
          description: 'Safety incidents',
          keywords: ['accidents', 'injuries'],
        },
        {
          id: 'jsa',
          path: '/safety/jsa',
          label: 'JSA Forms',
          icon: ClipboardPen,
          description: 'Job Safety Analysis',
          keywords: ['jha', 'hazard'],
        },
        {
          id: 'toolbox-talks',
          path: '/safety/toolbox-talks',
          label: 'Toolbox Talks',
          icon: MessageCircle,
          description: 'Safety meetings',
          keywords: ['meetings', 'training'],
        },
        {
          id: 'site-instructions',
          path: '/site-instructions',
          label: 'Site Instructions',
          icon: FileText,
          description: 'Field instructions',
          keywords: ['directions', 'notes'],
        },
      ],
    },

    // Documents
    {
      id: 'documents',
      label: 'Documents',
      icon: FolderOpen,
      items: [
        {
          id: 'document-library',
          path: '/documents',
          label: 'Document Library',
          icon: FolderOpen,
          description: 'All project documents',
          keywords: ['files', 'library'],
        },
        {
          id: 'drawing-register',
          path: '/drawings',
          label: 'Drawing Register',
          icon: FileImage,
          description: 'Drawing management',
          keywords: ['plans', 'blueprints', 'g810'],
        },
        {
          id: 'transmittals',
          path: '/transmittals',
          label: 'Transmittals',
          icon: Send,
          description: 'Document transmittals',
          keywords: ['sending', 'delivery'],
        },
        {
          id: 'shop-drawings',
          path: '/shop-drawings',
          label: 'Shop Drawings',
          icon: Hammer,
          description: 'Shop drawing submittals',
          keywords: ['fabrication', 'details'],
        },
        {
          id: 'permits',
          path: '/permits',
          label: 'Permits',
          icon: FileKey,
          description: 'Permit tracking',
          keywords: ['licenses', 'approvals'],
        },
      ],
    },

    // Photos
    {
      id: 'photos',
      label: 'Photos',
      icon: Camera,
      items: [
        {
          id: 'photo-progress',
          path: '/photos',
          label: 'Photo Progress',
          icon: Camera,
          description: 'Progress photos',
          keywords: ['images', 'pictures'],
        },
        {
          id: 'photo-organizer',
          path: '/photo-organizer',
          label: 'Photo Organizer',
          icon: FolderImage,
          description: 'Organize photos',
          keywords: ['albums', 'organize'],
        },
        {
          id: '360-photos',
          path: '/360-photos',
          label: '360° Photos',
          icon: View,
          description: '360 degree photos',
          keywords: ['panorama', 'spherical'],
        },
        {
          id: 'drawing-markup',
          path: '/markup',
          label: 'Drawing Markup',
          icon: PenTool,
          description: 'Annotate drawings',
          keywords: ['annotation', 'redline'],
        },
      ],
    },

    // Scheduling
    {
      id: 'scheduling',
      label: 'Scheduling',
      icon: GanttChart,
      items: [
        {
          id: 'master-schedule',
          path: '/schedule',
          label: 'Master Schedule',
          icon: GanttChart,
          description: 'Project schedule',
          keywords: ['timeline', 'gantt'],
        },
        {
          id: 'gantt-charts',
          path: '/gantt',
          label: 'Gantt Charts',
          icon: GanttChart,
          description: 'Gantt view',
          keywords: ['timeline', 'dependencies'],
        },
        {
          id: 'look-ahead',
          path: '/look-ahead',
          label: 'Look-Ahead Planning',
          icon: CalendarClock,
          description: '3-week look-ahead',
          keywords: ['planning', 'upcoming'],
        },
        {
          id: 'schedule-calendar',
          path: '/schedule/calendar',
          label: 'Calendar View',
          icon: CalendarDays,
          description: 'Calendar schedule view',
          keywords: ['dates', 'events'],
        },
      ],
    },

    // Financial
    {
      id: 'financial',
      label: 'Financial',
      icon: Wallet,
      items: [
        {
          id: 'budget',
          path: '/budget',
          label: 'Budget Overview',
          icon: Wallet,
          description: 'Project budgets',
          keywords: ['costs', 'money'],
        },
        {
          id: 'cost-tracking',
          path: '/costs',
          label: 'Cost Tracking',
          icon: TrendingUp,
          description: 'Track project costs',
          keywords: ['expenses', 'spending'],
        },
        {
          id: 'payment-apps',
          path: '/payment-applications',
          label: 'Payment Apps',
          icon: CreditCard,
          description: 'G702/G703 payment apps',
          keywords: ['billing', 'invoicing', 'aia'],
        },
        {
          id: 'schedule-of-values',
          path: '/sov',
          label: 'Schedule of Values',
          icon: Table,
          description: 'SOV management',
          keywords: ['sov', 'values'],
        },
        {
          id: 'lien-waivers',
          path: '/lien-waivers',
          label: 'Lien Waivers',
          icon: FileSignature,
          description: 'Lien waiver tracking',
          keywords: ['liens', 'waivers', 'releases'],
        },
        {
          id: 'procurement',
          path: '/procurement',
          label: 'Procurement',
          icon: ShoppingCart,
          description: 'Material procurement',
          keywords: ['purchasing', 'orders', 'materials'],
        },
      ],
    },

    // Communication
    {
      id: 'communication',
      label: 'Communication',
      icon: MessageSquare,
      items: [
        {
          id: 'messaging',
          path: '/messages',
          label: 'Messaging',
          icon: MessageSquare,
          description: 'Team chat',
          keywords: ['chat', 'messages'],
        },
        {
          id: 'meetings',
          path: '/meetings',
          label: 'Meetings',
          icon: Video,
          description: 'Meeting management',
          keywords: ['calls', 'schedule'],
        },
        {
          id: 'notices',
          path: '/notices',
          label: 'Notices',
          icon: Megaphone,
          description: 'Project notices',
          keywords: ['announcements', 'alerts'],
        },
        {
          id: 'correspondence',
          path: '/correspondence',
          label: 'Correspondence',
          icon: Mail,
          description: 'Project correspondence',
          keywords: ['letters', 'emails'],
        },
      ],
    },

    // Reports
    {
      id: 'reports',
      label: 'Reports',
      icon: BarChart3,
      items: [
        {
          id: 'reports-dashboard',
          path: '/reports',
          label: 'Reports Dashboard',
          icon: BarChart3,
          description: 'All reports',
          keywords: ['analytics', 'data'],
        },
        {
          id: 'custom-reports',
          path: '/reports/custom',
          label: 'Custom Reports',
          icon: FileSpreadsheet,
          description: 'Build custom reports',
          keywords: ['builder', 'custom'],
        },
        {
          id: 'scheduled-reports',
          path: '/reports/scheduled',
          label: 'Scheduled Reports',
          icon: Clock,
          description: 'Automated reports',
          keywords: ['automated', 'recurring'],
        },
        {
          id: 'analytics',
          path: '/analytics',
          label: 'Analytics',
          icon: BrainCircuit,
          description: 'Predictive analytics',
          keywords: ['insights', 'predictions', 'ai'],
        },
      ],
    },
  ],

  // Footer Configuration
  footer: {
    settings: {
      id: 'settings',
      path: '/settings',
      label: 'Settings',
      icon: Settings,
      description: 'App settings',
      keywords: ['preferences', 'config'],
    },
    admin: {
      id: 'admin',
      path: '/admin',
      label: 'Admin',
      icon: UserCog,
      description: 'Administration',
      keywords: ['manage', 'users'],
    },
    portals: [
      {
        id: 'subcontractor-portal',
        path: '/portal/subcontractor',
        label: 'Subcontractor Portal',
        icon: HardHat,
        description: 'Subcontractor access',
        keywords: ['subs', 'external'],
      },
      {
        id: 'client-portal',
        path: '/portal/client',
        label: 'Client Portal',
        icon: Briefcase,
        description: 'Client access',
        keywords: ['owner', 'external'],
      },
    ],
  },
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all navigation items as a flat array for search
 */
export function getAllNavItems(): SidebarNavItem[] {
  const items: SidebarNavItem[] = [...SIDEBAR_CONFIG.primary]

  SIDEBAR_CONFIG.groups.forEach((group) => {
    items.push(...group.items)
  })

  items.push(SIDEBAR_CONFIG.footer.settings)
  if (SIDEBAR_CONFIG.footer.admin) {
    items.push(SIDEBAR_CONFIG.footer.admin)
  }
  items.push(...SIDEBAR_CONFIG.footer.portals)

  return items
}

/**
 * Search navigation items by keyword
 */
export function searchNavItems(query: string): SidebarNavItem[] {
  const normalizedQuery = query.toLowerCase().trim()
  if (!normalizedQuery) return []

  return getAllNavItems().filter((item) => {
    const matchLabel = item.label.toLowerCase().includes(normalizedQuery)
    const matchDescription = item.description?.toLowerCase().includes(normalizedQuery)
    const matchKeywords = item.keywords?.some((kw) =>
      kw.toLowerCase().includes(normalizedQuery)
    )
    return matchLabel || matchDescription || matchKeywords
  })
}

/**
 * Get quick create actions
 */
export function getQuickCreateActions(): SidebarNavItem[] {
  return [
    {
      id: 'new-daily-report',
      path: '/daily-reports/new',
      label: 'Daily Report',
      icon: ClipboardList,
      description: 'Create new daily report',
    },
    {
      id: 'new-rfi',
      path: '/rfis/new',
      label: 'RFI',
      icon: FileQuestion,
      description: 'Create new RFI',
    },
    {
      id: 'new-punch-item',
      path: '/punch-lists/new',
      label: 'Punch Item',
      icon: CheckSquare,
      description: 'Create new punch item',
    },
    {
      id: 'upload-photo',
      path: '/photos/upload',
      label: 'Photo',
      icon: Camera,
      description: 'Upload photo',
    },
  ]
}
