/**
 * Role-Based Navigation Configuration
 * Defines complete navigation structure for each user role
 */

import {
  LayoutDashboard,
  FolderKanban,
  MessageSquare,
  FileText,
  ClipboardList,
  CheckSquare,
  FileCheck,
  UserCheck,
  FileQuestion,
  ListChecks,
  Calendar,
  Cloud,
  Repeat,
  Bell,
  FileSignature,
  Shield,
  HardHat,
  DollarSign,
  Users,
  BarChart3,
  Settings,
  Hammer,
  Briefcase,
  TrendingUp,
  ClipboardCheck,
  Camera,
  Receipt,
  ShoppingCart,
  Plus,
  FolderPlus,
  UserPlus,
  AlertTriangle,
  Clock,
  type LucideIcon,
} from 'lucide-react';
import type { DefaultRole } from '@/types/permissions';
import type { NavItem, NavGroup } from '@/types/navigation';
import { UnreadMessagesBadge } from '@/features/messaging/components/UnreadMessagesBadge';
import { PendingApprovalsBadge } from '@/features/approvals/components';

// =============================================
// Quick Action Type
// =============================================

export interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  color: string;
  description?: string;
}

// =============================================
// Role Navigation Config Type
// =============================================

export interface RoleNavigationConfig {
  roleId: DefaultRole;
  defaultLandingPage: string;
  primaryItems: NavItem[];
  groups: NavGroup[];
  mobileBottomNav: NavItem[];
  quickActions: QuickAction[];
  expandedGroupsByDefault: string[];
}

// =============================================
// Shared Navigation Items
// =============================================

const createNavItem = (
  label: string,
  icon: LucideIcon,
  path: string,
  options?: Partial<NavItem>
): NavItem => ({
  label,
  icon,
  path,
  ...options,
});

// Primary items used across roles
const dashboardItem = createNavItem('Dashboard', LayoutDashboard, '/dashboard');
const projectsItem = createNavItem('Projects', FolderKanban, '/projects');
const messagesItem = createNavItem('Messages', MessageSquare, '/messages', { badge: UnreadMessagesBadge });
const documentsItem = createNavItem('Documents', FileText, '/documents');

// Field work items
const dailyReportsItem = createNavItem('Daily Reports', ClipboardList, '/daily-reports');
const tasksItem = createNavItem('Tasks', CheckSquare, '/tasks');
const inspectionsItem = createNavItem('Inspections', FileCheck, '/inspections');
const punchListsItem = createNavItem('Punch Lists', ListChecks, '/punch-lists');
const meetingsItem = createNavItem('Meetings', Calendar, '/meetings');
const weatherLogsItem = createNavItem('Weather Logs', Cloud, '/weather-logs');
const photoProgressItem = createNavItem('Photo Progress', Camera, '/photo-progress');

// Management items
const workflowsItem = createNavItem('Workflows', Repeat, '/workflows');
const approvalsItem = createNavItem('Approvals', UserCheck, '/approvals', { badge: PendingApprovalsBadge });
const changeOrdersItem = createNavItem('Change Orders', FileSignature, '/change-orders');
const rfisItem = createNavItem('RFIs', FileQuestion, '/rfis');
const checklistsItem = createNavItem('Checklists', ListChecks, '/checklists/templates');

// Administration items
const noticesItem = createNavItem('Notices', Bell, '/notices');
const siteInstructionsItem = createNavItem('Site Instructions', FileText, '/site-instructions');
const permitsItem = createNavItem('Permits', FileCheck, '/permits');
const safetyItem = createNavItem('Safety', Shield, '/safety');
const qualityControlItem = createNavItem('Quality Control', ClipboardCheck, '/quality-control');
const equipmentItem = createNavItem('Equipment', HardHat, '/equipment');
const procurementItem = createNavItem('Procurement', ShoppingCart, '/procurement');
const budgetItem = createNavItem('Budget', DollarSign, '/budget');
const invoicesItem = createNavItem('Invoices', Receipt, '/invoices');
const contactsItem = createNavItem('Contacts', Users, '/contacts');

// Reports items
const analyticsItem = createNavItem('Analytics', BarChart3, '/analytics');
const reportsItem = createNavItem('Reports', FileText, '/reports');

// =============================================
// Navigation Groups
// =============================================

const createGroup = (
  id: string,
  label: string,
  icon: LucideIcon,
  items: NavItem[],
  defaultExpanded = false
): NavGroup => ({
  id,
  label,
  icon,
  items,
  defaultExpanded,
});

// =============================================
// Owner Navigation Config
// =============================================

const ownerConfig: RoleNavigationConfig = {
  roleId: 'owner',
  defaultLandingPage: '/dashboard/owner',
  primaryItems: [
    { ...dashboardItem, path: '/dashboard/owner' },
    projectsItem,
    messagesItem,
    documentsItem,
  ],
  groups: [
    createGroup('reports', 'Reports & Analytics', TrendingUp, [analyticsItem, reportsItem], true),
    createGroup('administration', 'Administration', Settings, [
      noticesItem,
      siteInstructionsItem,
      permitsItem,
      safetyItem,
      qualityControlItem,
      equipmentItem,
      procurementItem,
      budgetItem,
      invoicesItem,
      contactsItem,
    ]),
    createGroup('management', 'Management', Briefcase, [
      workflowsItem,
      approvalsItem,
      changeOrdersItem,
      rfisItem,
      checklistsItem,
    ]),
    createGroup('field-work', 'Field Work', Hammer, [
      dailyReportsItem,
      tasksItem,
      inspectionsItem,
      punchListsItem,
      meetingsItem,
      weatherLogsItem,
      photoProgressItem,
    ]),
  ],
  mobileBottomNav: [
    { ...dashboardItem, path: '/dashboard/owner', isPrimaryMobileNav: true },
    { ...projectsItem, isPrimaryMobileNav: true },
    { ...analyticsItem, isPrimaryMobileNav: true },
    { ...messagesItem, isPrimaryMobileNav: true },
  ],
  quickActions: [
    { id: 'view-reports', label: 'View Reports', icon: BarChart3, path: '/reports', color: 'bg-purple-500' },
    { id: 'review-budget', label: 'Review Budget', icon: DollarSign, path: '/budget', color: 'bg-green-500' },
    { id: 'review-approvals', label: 'Review Approvals', icon: UserCheck, path: '/approvals', color: 'bg-blue-500' },
    { id: 'add-project', label: 'Add Project', icon: FolderPlus, path: '/projects/new', color: 'bg-orange-500' },
  ],
  expandedGroupsByDefault: ['reports'],
};

// =============================================
// Admin Navigation Config
// =============================================

const adminConfig: RoleNavigationConfig = {
  roleId: 'admin',
  defaultLandingPage: '/dashboard/admin',
  primaryItems: [
    { ...dashboardItem, path: '/dashboard/admin' },
    projectsItem,
    messagesItem,
    documentsItem,
  ],
  groups: [
    createGroup('administration', 'Administration', Settings, [
      noticesItem,
      siteInstructionsItem,
      permitsItem,
      safetyItem,
      qualityControlItem,
      equipmentItem,
      procurementItem,
      budgetItem,
      invoicesItem,
      contactsItem,
    ], true),
    createGroup('management', 'Management', Briefcase, [
      workflowsItem,
      approvalsItem,
      changeOrdersItem,
      rfisItem,
      checklistsItem,
    ]),
    createGroup('reports', 'Reports & Analytics', TrendingUp, [analyticsItem, reportsItem]),
    createGroup('field-work', 'Field Work', Hammer, [
      dailyReportsItem,
      tasksItem,
      inspectionsItem,
      punchListsItem,
      meetingsItem,
      weatherLogsItem,
      photoProgressItem,
    ]),
  ],
  mobileBottomNav: [
    { ...dashboardItem, path: '/dashboard/admin', isPrimaryMobileNav: true },
    { ...projectsItem, isPrimaryMobileNav: true },
    { ...approvalsItem, isPrimaryMobileNav: true },
    { ...messagesItem, isPrimaryMobileNav: true },
  ],
  quickActions: [
    { id: 'add-user', label: 'Add User', icon: UserPlus, path: '/settings/users', color: 'bg-blue-500' },
    { id: 'review-approvals', label: 'Review Approvals', icon: UserCheck, path: '/approvals', color: 'bg-green-500' },
    { id: 'manage-settings', label: 'Manage Settings', icon: Settings, path: '/settings', color: 'bg-gray-500' },
    { id: 'view-activity', label: 'View Activity', icon: Clock, path: '/activity', color: 'bg-purple-500' },
  ],
  expandedGroupsByDefault: ['administration'],
};

// =============================================
// Project Manager Navigation Config
// =============================================

const projectManagerConfig: RoleNavigationConfig = {
  roleId: 'project_manager',
  defaultLandingPage: '/dashboard/pm',
  primaryItems: [
    { ...dashboardItem, path: '/dashboard/pm' },
    projectsItem,
    messagesItem,
    approvalsItem,
  ],
  groups: [
    createGroup('management', 'Management', Briefcase, [
      rfisItem,
      changeOrdersItem,
      workflowsItem,
      checklistsItem,
    ], true),
    createGroup('reports', 'Reports & Analytics', TrendingUp, [analyticsItem, reportsItem]),
    createGroup('field-work', 'Field Work', Hammer, [
      dailyReportsItem,
      tasksItem,
      punchListsItem,
      inspectionsItem,
      photoProgressItem,
    ]),
    createGroup('administration', 'Administration', Settings, [
      safetyItem,
      qualityControlItem,
      procurementItem,
      budgetItem,
      contactsItem,
    ]),
  ],
  mobileBottomNav: [
    { ...dashboardItem, path: '/dashboard/pm', isPrimaryMobileNav: true },
    { ...projectsItem, isPrimaryMobileNav: true },
    { ...rfisItem, isPrimaryMobileNav: true },
    { ...approvalsItem, isPrimaryMobileNav: true },
  ],
  quickActions: [
    { id: 'create-rfi', label: 'Create RFI', icon: FileQuestion, path: '/rfis/new', color: 'bg-blue-500' },
    { id: 'create-change-order', label: 'Create Change Order', icon: FileSignature, path: '/change-orders/new', color: 'bg-orange-500' },
    { id: 'review-approvals', label: 'Review Approvals', icon: UserCheck, path: '/approvals', color: 'bg-green-500' },
    { id: 'add-task', label: 'Add Task', icon: Plus, path: '/tasks/new', color: 'bg-purple-500' },
  ],
  expandedGroupsByDefault: ['management'],
};

// =============================================
// Superintendent Navigation Config
// =============================================

const superintendentConfig: RoleNavigationConfig = {
  roleId: 'superintendent',
  defaultLandingPage: '/dashboard/superintendent',
  primaryItems: [
    { ...dashboardItem, path: '/dashboard/superintendent' },
    dailyReportsItem,
    projectsItem,
    messagesItem,
  ],
  groups: [
    createGroup('field-work', 'Field Work', Hammer, [
      tasksItem,
      photoProgressItem,
      punchListsItem,
      inspectionsItem,
      weatherLogsItem,
      meetingsItem,
    ], true),
    createGroup('safety-quality', 'Safety & Quality', Shield, [
      safetyItem,
      qualityControlItem,
    ]),
    createGroup('management', 'Management', Briefcase, [
      rfisItem,
      checklistsItem,
      procurementItem,
    ]),
  ],
  mobileBottomNav: [
    { ...dashboardItem, path: '/dashboard/superintendent', isPrimaryMobileNav: true },
    { ...dailyReportsItem, isPrimaryMobileNav: true },
    { ...photoProgressItem, label: 'Camera', isPrimaryMobileNav: true },
    { ...punchListsItem, isPrimaryMobileNav: true },
    { ...tasksItem, isPrimaryMobileNav: true },
  ],
  quickActions: [
    { id: 'daily-report', label: 'Daily Report', icon: ClipboardList, path: '/daily-reports/new', color: 'bg-green-500' },
    { id: 'take-photo', label: 'Take Photo', icon: Camera, path: '/photo-progress/capture', color: 'bg-blue-500' },
    { id: 'add-punch-item', label: 'Add Punch Item', icon: ListChecks, path: '/punch-lists/new', color: 'bg-orange-500' },
    { id: 'safety-report', label: 'Safety Report', icon: AlertTriangle, path: '/safety/new', color: 'bg-red-500' },
  ],
  expandedGroupsByDefault: ['field-work'],
};

// =============================================
// Foreman Navigation Config
// =============================================

const foremanConfig: RoleNavigationConfig = {
  roleId: 'foreman',
  defaultLandingPage: '/dashboard/foreman',
  primaryItems: [
    { ...dashboardItem, path: '/dashboard/foreman' },
    tasksItem,
    dailyReportsItem,
    messagesItem,
  ],
  groups: [
    createGroup('field-work', 'Field Work', Hammer, [
      photoProgressItem,
      punchListsItem,
      inspectionsItem,
      checklistsItem,
    ], true),
    createGroup('safety', 'Safety', Shield, [safetyItem]),
  ],
  mobileBottomNav: [
    { ...dashboardItem, path: '/dashboard/foreman', isPrimaryMobileNav: true },
    { ...tasksItem, isPrimaryMobileNav: true },
    { ...photoProgressItem, label: 'Camera', isPrimaryMobileNav: true },
    { ...messagesItem, isPrimaryMobileNav: true },
  ],
  quickActions: [
    { id: 'view-tasks', label: 'View Tasks', icon: CheckSquare, path: '/tasks', color: 'bg-blue-500' },
    { id: 'take-photo', label: 'Take Photo', icon: Camera, path: '/photo-progress/capture', color: 'bg-green-500' },
    { id: 'report-issue', label: 'Report Issue', icon: AlertTriangle, path: '/safety/new', color: 'bg-red-500' },
  ],
  expandedGroupsByDefault: ['field-work'],
};

// =============================================
// Worker Navigation Config
// =============================================

const workerConfig: RoleNavigationConfig = {
  roleId: 'worker',
  defaultLandingPage: '/dashboard/worker',
  primaryItems: [
    { ...dashboardItem, path: '/dashboard/worker' },
    tasksItem,
    messagesItem,
  ],
  groups: [], // Workers have minimal navigation - no groups
  mobileBottomNav: [
    { ...dashboardItem, path: '/dashboard/worker', isPrimaryMobileNav: true },
    { ...tasksItem, isPrimaryMobileNav: true },
    { ...messagesItem, isPrimaryMobileNav: true },
  ],
  quickActions: [
    { id: 'view-tasks', label: 'View My Tasks', icon: CheckSquare, path: '/tasks', color: 'bg-blue-500' },
    { id: 'clock-in', label: 'Clock In/Out', icon: Clock, path: '/time-tracking', color: 'bg-green-500' },
  ],
  expandedGroupsByDefault: [],
};

// =============================================
// Subcontractor Navigation Config
// =============================================

const subcontractorConfig: RoleNavigationConfig = {
  roleId: 'subcontractor',
  defaultLandingPage: '/sub/dashboard',
  primaryItems: [
    { ...dashboardItem, path: '/sub/dashboard', label: 'Dashboard' },
    createNavItem('My Projects', FolderKanban, '/sub/projects'),
    createNavItem('Submittals', FileCheck, '/sub/submittals'),
    createNavItem('Compliance', Shield, '/sub/compliance'),
  ],
  groups: [
    createGroup('field-work', 'My Work', Hammer, [
      createNavItem('Tasks', CheckSquare, '/sub/tasks'),
      createNavItem('Punch Items', ListChecks, '/sub/punch-items'),
      createNavItem('Photos', Camera, '/sub/photos'),
    ], true),
    createGroup('documents', 'Documents', FileText, [
      createNavItem('Documents', FileText, '/sub/documents'),
      createNavItem('Lien Waivers', Receipt, '/sub/lien-waivers'),
    ]),
  ],
  mobileBottomNav: [
    { ...dashboardItem, path: '/sub/dashboard', isPrimaryMobileNav: true },
    createNavItem('Submittals', FileCheck, '/sub/submittals', { isPrimaryMobileNav: true }),
    createNavItem('Tasks', CheckSquare, '/sub/tasks', { isPrimaryMobileNav: true }),
    createNavItem('Documents', FileText, '/sub/documents', { isPrimaryMobileNav: true }),
  ],
  quickActions: [
    { id: 'submit-compliance', label: 'Submit Compliance Docs', icon: Shield, path: '/sub/compliance/upload', color: 'bg-blue-500' },
    { id: 'create-submittal', label: 'Create Submittal', icon: FileCheck, path: '/sub/submittals/new', color: 'bg-green-500' },
    { id: 'view-punch-items', label: 'View Punch Items', icon: ListChecks, path: '/sub/punch-items', color: 'bg-orange-500' },
    { id: 'upload-photo', label: 'Upload Photo', icon: Camera, path: '/sub/photos/upload', color: 'bg-purple-500' },
  ],
  expandedGroupsByDefault: ['field-work'],
};

// =============================================
// Client Navigation Config
// =============================================

const clientConfig: RoleNavigationConfig = {
  roleId: 'client',
  defaultLandingPage: '/client/dashboard',
  primaryItems: [
    { ...dashboardItem, path: '/client/dashboard', label: 'Dashboard' },
    createNavItem('My Projects', FolderKanban, '/client/projects'),
    createNavItem('Progress Photos', Camera, '/client/photos'),
    createNavItem('Reports', FileText, '/client/reports'),
  ],
  groups: [
    createGroup('approvals', 'Approvals', UserCheck, [
      createNavItem('Change Orders', FileSignature, '/client/change-orders'),
    ]),
    createGroup('documents', 'Documents', FileText, [
      createNavItem('Documents', FileText, '/client/documents'),
      createNavItem('Invoices', Receipt, '/client/invoices'),
    ]),
  ],
  mobileBottomNav: [
    { ...dashboardItem, path: '/client/dashboard', isPrimaryMobileNav: true },
    createNavItem('Photos', Camera, '/client/photos', { isPrimaryMobileNav: true }),
    createNavItem('Documents', FileText, '/client/documents', { isPrimaryMobileNav: true }),
  ],
  quickActions: [
    { id: 'view-progress', label: 'View Progress', icon: Camera, path: '/client/photos', color: 'bg-blue-500' },
    { id: 'review-change-orders', label: 'Review Change Orders', icon: FileSignature, path: '/client/change-orders', color: 'bg-orange-500' },
    { id: 'download-reports', label: 'Download Reports', icon: FileText, path: '/client/reports', color: 'bg-purple-500' },
  ],
  expandedGroupsByDefault: [],
};

// =============================================
// Role Navigation Map
// =============================================

export const ROLE_NAVIGATION_CONFIGS: Record<DefaultRole, RoleNavigationConfig> = {
  owner: ownerConfig,
  admin: adminConfig,
  project_manager: projectManagerConfig,
  superintendent: superintendentConfig,
  foreman: foremanConfig,
  worker: workerConfig,
  subcontractor: subcontractorConfig,
  client: clientConfig,
};

// =============================================
// Helper Functions
// =============================================

/**
 * Get navigation config for a specific role
 */
export function getRoleNavigationConfig(role: DefaultRole): RoleNavigationConfig {
  return ROLE_NAVIGATION_CONFIGS[role] || workerConfig; // Default to worker (most restricted)
}

/**
 * Get the default landing page for a role
 */
export function getDefaultLandingPage(role: DefaultRole): string {
  return getRoleNavigationConfig(role).defaultLandingPage;
}

/**
 * Check if a role uses a portal (subcontractor or client)
 */
export function isPortalRole(role: DefaultRole): boolean {
  return role === 'subcontractor' || role === 'client';
}

/**
 * Get portal base path for portal roles
 */
export function getPortalBasePath(role: DefaultRole): string | null {
  if (role === 'subcontractor') {return '/sub';}
  if (role === 'client') {return '/client';}
  return null;
}
