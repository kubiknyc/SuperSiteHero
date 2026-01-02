// File: /src/features/onboarding/data/tourSteps.ts
// Tour step definitions for interactive feature tours

import type { FeatureTourId } from '../stores/onboardingStore'

/**
 * Position of a tour highlight relative to the target element
 */
export type HighlightPosition =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'center'

/**
 * A single step in a feature tour
 */
export interface TourStep {
  /** Unique identifier for this step */
  id: string
  /** CSS selector for the target element to highlight */
  targetSelector: string
  /** Title for the tour step */
  title: string
  /** Description/content for the tour step */
  description: string
  /** Position of the tooltip relative to the target */
  position: HighlightPosition
  /** Optional action button text */
  actionText?: string
  /** Optional action to perform when button is clicked */
  actionType?: 'click' | 'navigate' | 'custom'
  /** Navigation path if actionType is 'navigate' */
  navigateTo?: string
  /** Whether to highlight the entire target or use a smaller spotlight */
  spotlightPadding?: number
  /** Whether this step is optional (can be skipped) */
  optional?: boolean
  /** Delay before showing this step (in ms) */
  delay?: number
  /** Video URL for tutorial */
  videoUrl?: string
}

/**
 * A complete feature tour definition
 */
export interface FeatureTour {
  /** Unique identifier for the tour */
  id: FeatureTourId
  /** Display name for the tour */
  name: string
  /** Description of what the tour covers */
  description: string
  /** Array of steps in the tour */
  steps: TourStep[]
  /** Path patterns where this tour should be triggered */
  triggerPaths: string[]
  /** Whether to auto-start the tour on first visit */
  autoStart: boolean
}

/**
 * Dashboard tour - highlights key dashboard widgets
 */
export const dashboardTour: FeatureTour = {
  id: 'dashboard',
  name: 'Dashboard Overview',
  description: 'Learn about your JobSight dashboard and key metrics',
  triggerPaths: ['/dashboard', '/'],
  autoStart: true,
  steps: [
    {
      id: 'dashboard-welcome',
      targetSelector: '[data-tour="dashboard-header"]',
      title: 'Welcome to Your Dashboard',
      description:
        'This is your central hub for managing construction projects. Here you can see an overview of all your active work and key metrics.',
      position: 'bottom',
      spotlightPadding: 16
    },
    {
      id: 'dashboard-stats',
      targetSelector: '[data-tour="stats-grid"]',
      title: 'Quick Statistics',
      description:
        'These cards show your most important metrics at a glance: pending tasks, open RFIs, punch items, and safety status. Click any card to see more details.',
      position: 'bottom',
      spotlightPadding: 24
    },
    {
      id: 'dashboard-projects',
      targetSelector: '[data-tour="active-projects"]',
      title: 'Active Projects',
      description:
        'View and access your active projects here. Each project card shows progress and health status. Click to open the full project view.',
      position: 'top',
      spotlightPadding: 16
    },
    {
      id: 'dashboard-actions',
      targetSelector: '[data-tour="action-items"]',
      title: 'Action Required',
      description:
        'This widget shows items that need your attention - overdue tasks, pending approvals, and urgent RFIs. Stay on top of your priorities here.',
      position: 'left',
      spotlightPadding: 12
    },
    {
      id: 'dashboard-navigation',
      targetSelector: '[data-tour="main-nav"]',
      title: 'Navigation',
      description:
        'Use the sidebar to navigate between different sections of JobSight. You can access projects, documents, reports, and more.',
      position: 'right',
      spotlightPadding: 8
    }
  ]
}

/**
 * Projects tour - project creation walkthrough
 */
export const projectsTour: FeatureTour = {
  id: 'projects',
  name: 'Projects Management',
  description: 'Learn how to create and manage construction projects',
  triggerPaths: ['/projects', '/projects/new'],
  autoStart: true,
  steps: [
    {
      id: 'projects-overview',
      targetSelector: '[data-tour="projects-list"]',
      title: 'Your Projects',
      description:
        'This is where all your construction projects are listed. You can filter, search, and sort projects to find what you need quickly.',
      position: 'bottom',
      spotlightPadding: 16
    },
    {
      id: 'projects-create',
      targetSelector: '[data-tour="create-project-btn"]',
      title: 'Create New Project',
      description:
        'Click here to create a new project. You will enter project details like name, address, dates, and team members.',
      position: 'bottom-left',
      actionText: 'Create Project',
      actionType: 'click',
      spotlightPadding: 8
    },
    {
      id: 'projects-filters',
      targetSelector: '[data-tour="project-filters"]',
      title: 'Filter Projects',
      description:
        'Use filters to view projects by status (active, completed, on hold), date range, or team member.',
      position: 'bottom',
      spotlightPadding: 12
    },
    {
      id: 'projects-cards',
      targetSelector: '[data-tour="project-card"]:first-child',
      title: 'Project Card',
      description:
        'Each card shows project status, progress, and key metrics. Click to open the full project detail view with all documents, tasks, and reports.',
      position: 'right',
      spotlightPadding: 8
    }
  ]
}

/**
 * Daily reports tour
 */
export const dailyReportsTour: FeatureTour = {
  id: 'daily_reports',
  name: 'Daily Reports',
  description: 'Learn how to create and submit daily field reports',
  triggerPaths: ['/daily-reports', '/projects/*/daily-reports'],
  autoStart: true,
  steps: [
    {
      id: 'daily-reports-list',
      targetSelector: '[data-tour="reports-list"]',
      title: 'Daily Reports',
      description:
        'View all daily field reports here. Reports capture weather, workforce, equipment, work completed, and any issues from each day.',
      position: 'bottom',
      spotlightPadding: 16
    },
    {
      id: 'daily-reports-create',
      targetSelector: '[data-tour="create-report-btn"]',
      title: 'Create Daily Report',
      description:
        'Click to create a new daily report. You can add photos, log weather conditions, record crew hours, and document progress.',
      position: 'bottom',
      actionText: 'New Report',
      actionType: 'click',
      spotlightPadding: 8
    },
    {
      id: 'daily-reports-weather',
      targetSelector: '[data-tour="weather-section"]',
      title: 'Weather Conditions',
      description:
        'Record weather conditions that may affect work. This is important for delay claims and schedule tracking.',
      position: 'right',
      spotlightPadding: 12
    },
    {
      id: 'daily-reports-photos',
      targetSelector: '[data-tour="photos-section"]',
      title: 'Site Photos',
      description:
        'Capture and attach photos directly from your device. Photos are automatically geotagged and timestamped for documentation.',
      position: 'top',
      spotlightPadding: 12,
      videoUrl: 'https://example.com/tutorials/photo-capture.mp4'
    }
  ]
}

/**
 * RFIs tour
 */
export const rfisTour: FeatureTour = {
  id: 'rfis',
  name: 'RFIs (Requests for Information)',
  description: 'Learn how to create and track RFIs',
  triggerPaths: ['/rfis', '/projects/*/rfis'],
  autoStart: true,
  steps: [
    {
      id: 'rfis-overview',
      targetSelector: '[data-tour="rfis-list"]',
      title: 'Request for Information',
      description:
        'RFIs are used to clarify design intent, resolve conflicts, or request additional information from architects and engineers.',
      position: 'bottom',
      spotlightPadding: 16
    },
    {
      id: 'rfis-create',
      targetSelector: '[data-tour="create-rfi-btn"]',
      title: 'Create New RFI',
      description:
        'Click to create an RFI. Include the question, reference drawings, and specify the required response date.',
      position: 'bottom-left',
      spotlightPadding: 8
    },
    {
      id: 'rfis-status',
      targetSelector: '[data-tour="rfi-status-filter"]',
      title: 'Track RFI Status',
      description:
        'Filter by status to see open, pending response, or closed RFIs. Track response times and overdue items.',
      position: 'bottom',
      spotlightPadding: 12
    },
    {
      id: 'rfis-distribution',
      targetSelector: '[data-tour="rfi-distribution"]',
      title: 'Distribution List',
      description:
        'RFIs are automatically sent to the appropriate parties based on distribution lists. Set up lists in project settings.',
      position: 'left',
      spotlightPadding: 12
    }
  ]
}

/**
 * Submittals tour
 */
export const submittalsTour: FeatureTour = {
  id: 'submittals',
  name: 'Submittals',
  description: 'Learn how to manage submittal packages',
  triggerPaths: ['/submittals', '/projects/*/submittals'],
  autoStart: true,
  steps: [
    {
      id: 'submittals-overview',
      targetSelector: '[data-tour="submittals-list"]',
      title: 'Submittal Packages',
      description:
        'Submittals are documents sent for approval before materials or equipment can be procured. Track all submittals here.',
      position: 'bottom',
      spotlightPadding: 16
    },
    {
      id: 'submittals-create',
      targetSelector: '[data-tour="create-submittal-btn"]',
      title: 'Create Submittal',
      description:
        'Create a new submittal package. Include product data, shop drawings, samples, or other documents requiring approval.',
      position: 'bottom-left',
      spotlightPadding: 8
    },
    {
      id: 'submittals-log',
      targetSelector: '[data-tour="submittal-log"]',
      title: 'Submittal Log',
      description:
        'The submittal log tracks all packages with spec sections, status, and approval dates. Export to PDF or Excel.',
      position: 'top',
      spotlightPadding: 12
    }
  ]
}

/**
 * Tasks tour
 */
export const tasksTour: FeatureTour = {
  id: 'tasks',
  name: 'Task Management',
  description: 'Learn how to create and assign tasks',
  triggerPaths: ['/tasks', '/projects/*/tasks'],
  autoStart: true,
  steps: [
    {
      id: 'tasks-overview',
      targetSelector: '[data-tour="tasks-board"]',
      title: 'Task Board',
      description:
        'View and manage all tasks in a Kanban-style board. Drag and drop to change status, or switch to list view.',
      position: 'bottom',
      spotlightPadding: 16
    },
    {
      id: 'tasks-create',
      targetSelector: '[data-tour="create-task-btn"]',
      title: 'Create Task',
      description:
        'Create new tasks and assign them to team members. Set due dates, priority, and link to related items.',
      position: 'bottom',
      spotlightPadding: 8
    },
    {
      id: 'tasks-filters',
      targetSelector: '[data-tour="task-filters"]',
      title: 'Filter Tasks',
      description:
        'Filter by assignee, status, priority, or due date. Find tasks quickly across all projects.',
      position: 'bottom',
      spotlightPadding: 12
    }
  ]
}

/**
 * Documents tour
 */
export const documentsTour: FeatureTour = {
  id: 'documents',
  name: 'Document Management',
  description: 'Learn how to organize and manage project documents',
  triggerPaths: ['/documents', '/projects/*/documents'],
  autoStart: true,
  steps: [
    {
      id: 'documents-overview',
      targetSelector: '[data-tour="documents-explorer"]',
      title: 'Document Explorer',
      description:
        'All project documents are organized here. Browse folders, search by name, or filter by document type.',
      position: 'bottom',
      spotlightPadding: 16
    },
    {
      id: 'documents-upload',
      targetSelector: '[data-tour="upload-btn"]',
      title: 'Upload Documents',
      description:
        'Upload files by clicking here or drag and drop. Supports PDFs, drawings, photos, and office documents.',
      position: 'bottom-left',
      spotlightPadding: 8
    },
    {
      id: 'documents-versions',
      targetSelector: '[data-tour="document-versions"]',
      title: 'Version Control',
      description:
        'Documents automatically track versions. View history, compare versions, and restore previous versions if needed.',
      position: 'right',
      spotlightPadding: 12
    }
  ]
}

/**
 * Safety tour
 */
export const safetyTour: FeatureTour = {
  id: 'safety',
  name: 'Safety Management',
  description: 'Learn how to track safety incidents and inspections',
  triggerPaths: ['/safety', '/projects/*/safety'],
  autoStart: true,
  steps: [
    {
      id: 'safety-dashboard',
      targetSelector: '[data-tour="safety-dashboard"]',
      title: 'Safety Dashboard',
      description:
        'Monitor safety metrics including days since last incident, inspection status, and toolbox talks.',
      position: 'bottom',
      spotlightPadding: 16
    },
    {
      id: 'safety-incident',
      targetSelector: '[data-tour="report-incident-btn"]',
      title: 'Report Incident',
      description:
        'Report safety incidents immediately. Capture details, photos, and witness statements for proper documentation.',
      position: 'bottom',
      spotlightPadding: 8
    },
    {
      id: 'safety-inspections',
      targetSelector: '[data-tour="safety-inspections"]',
      title: 'Safety Inspections',
      description:
        'Schedule and complete regular safety inspections using customizable checklists. Track findings and corrective actions.',
      position: 'top',
      spotlightPadding: 12
    }
  ]
}

/**
 * Punch lists tour
 */
export const punchListsTour: FeatureTour = {
  id: 'punch_lists',
  name: 'Punch Lists',
  description: 'Learn how to create and manage punch list items',
  triggerPaths: ['/punch-lists', '/projects/*/punch-lists'],
  autoStart: true,
  steps: [
    {
      id: 'punch-overview',
      targetSelector: '[data-tour="punch-list"]',
      title: 'Punch List Items',
      description:
        'Track deficiencies and incomplete work that needs attention before project closeout.',
      position: 'bottom',
      spotlightPadding: 16
    },
    {
      id: 'punch-create',
      targetSelector: '[data-tour="create-punch-btn"]',
      title: 'Add Punch Item',
      description:
        'Create punch items with photos, location markup, and assignment to responsible parties.',
      position: 'bottom',
      spotlightPadding: 8
    },
    {
      id: 'punch-status',
      targetSelector: '[data-tour="punch-status"]',
      title: 'Track Completion',
      description:
        'Monitor item status from open to complete. Verify fixes with photo documentation.',
      position: 'right',
      spotlightPadding: 12
    }
  ]
}

/**
 * Change orders tour
 */
export const changeOrdersTour: FeatureTour = {
  id: 'change_orders',
  name: 'Change Orders',
  description: 'Learn how to manage change orders and budget impacts',
  triggerPaths: ['/change-orders', '/projects/*/change-orders'],
  autoStart: true,
  steps: [
    {
      id: 'co-overview',
      targetSelector: '[data-tour="change-orders-list"]',
      title: 'Change Orders',
      description:
        'Track all change orders including proposed, approved, and rejected. See total budget impact at a glance.',
      position: 'bottom',
      spotlightPadding: 16
    },
    {
      id: 'co-create',
      targetSelector: '[data-tour="create-co-btn"]',
      title: 'Create Change Order',
      description:
        'Create a new change order request. Include description, cost breakdown, schedule impact, and supporting documents.',
      position: 'bottom',
      spotlightPadding: 8
    },
    {
      id: 'co-workflow',
      targetSelector: '[data-tour="co-workflow"]',
      title: 'Approval Workflow',
      description:
        'Change orders follow an approval workflow. Track status, approvers, and get notifications on updates.',
      position: 'left',
      spotlightPadding: 12
    }
  ]
}

/**
 * All available tours
 */
export const allTours: FeatureTour[] = [
  dashboardTour,
  projectsTour,
  dailyReportsTour,
  rfisTour,
  submittalsTour,
  tasksTour,
  documentsTour,
  safetyTour,
  punchListsTour,
  changeOrdersTour
]

/**
 * Get tour by ID
 */
export function getTourById(tourId: FeatureTourId): FeatureTour | undefined {
  return allTours.find(tour => tour.id === tourId)
}

/**
 * Get tour for a given path
 */
export function getTourForPath(path: string): FeatureTour | undefined {
  return allTours.find(tour =>
    tour.triggerPaths.some(pattern => {
      // Convert pattern to regex (e.g., /projects/*/rfis -> /projects/[^/]+/rfis)
      const regexPattern = pattern.replace(/\*/g, '[^/]+')
      const regex = new RegExp(`^${regexPattern}$`)
      return regex.test(path)
    })
  )
}

/**
 * Get all tour IDs
 */
export function getAllTourIds(): FeatureTourId[] {
  return allTours.map(tour => tour.id)
}
