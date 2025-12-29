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
} from 'lucide-react';
import type { NavItem, NavGroup } from '../types/navigation';
import { UnreadMessagesBadge } from '@/features/messaging/components/UnreadMessagesBadge';
import { PendingApprovalsBadge } from '@/features/approvals/components';

/**
 * Primary navigation items (not grouped, always visible)
 */
export const primaryNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/',
    category: 'main',
    isPrimaryMobileNav: true,
  },
  {
    label: 'Projects',
    icon: FolderKanban,
    path: '/projects',
    category: 'main',
    isPrimaryMobileNav: true,
  },
  {
    label: 'Messages',
    icon: MessageSquare,
    path: '/messages',
    category: 'main',
    badge: UnreadMessagesBadge,
    isPrimaryMobileNav: true,
  },
  {
    label: 'Documents',
    icon: FileText,
    path: '/documents',
    category: 'main',
    isPrimaryMobileNav: false,
  },
];

/**
 * Field Work navigation group
 */
export const fieldWorkGroup: NavGroup = {
  id: 'field-work',
  label: 'Field Work',
  icon: Hammer,
  category: 'field',
  defaultExpanded: false,
  items: [
    {
      label: 'Daily Reports',
      icon: ClipboardList,
      path: '/daily-reports',
      category: 'field',
      isPrimaryMobileNav: true, // Also in bottom nav as "Reports"
    },
    {
      label: 'Tasks',
      icon: CheckSquare,
      path: '/tasks',
      category: 'field',
    },
    {
      label: 'Inspections',
      icon: FileCheck,
      path: '/inspections',
      category: 'field',
    },
    {
      label: 'Punch Lists',
      icon: ListChecks,
      path: '/punch-lists',
      category: 'field',
    },
    {
      label: 'Meetings',
      icon: Calendar,
      path: '/meetings',
      category: 'field',
    },
    {
      label: 'Weather Logs',
      icon: Cloud,
      path: '/weather-logs',
      category: 'field',
    },
    {
      label: 'Photo Progress',
      icon: Camera,
      path: '/photo-progress',
      category: 'field',
    },
  ],
};

/**
 * Project Management navigation group
 */
export const managementGroup: NavGroup = {
  id: 'management',
  label: 'Management',
  icon: Briefcase,
  category: 'management',
  defaultExpanded: false,
  items: [
    {
      label: 'Workflows',
      icon: Repeat,
      path: '/workflows',
      category: 'management',
    },
    {
      label: 'Approvals',
      icon: UserCheck,
      path: '/approvals',
      category: 'management',
      badge: PendingApprovalsBadge,
    },
    {
      label: 'Change Orders',
      icon: FileSignature,
      path: '/change-orders',
      category: 'management',
    },
    {
      label: 'RFIs',
      icon: FileQuestion,
      path: '/rfis',
      category: 'management',
    },
    {
      label: 'Checklists',
      icon: ListChecks,
      path: '/checklists/templates',
      category: 'management',
    },
  ],
};

/**
 * Administration navigation group
 */
export const administrationGroup: NavGroup = {
  id: 'administration',
  label: 'Administration',
  icon: Settings,
  category: 'admin',
  defaultExpanded: false,
  items: [
    {
      label: 'Notices',
      icon: Bell,
      path: '/notices',
      category: 'admin',
    },
    {
      label: 'Site Instructions',
      icon: FileText,
      path: '/site-instructions',
      category: 'admin',
    },
    {
      label: 'Permits',
      icon: FileCheck,
      path: '/permits',
      category: 'admin',
    },
    {
      label: 'Safety',
      icon: Shield,
      path: '/safety',
      category: 'admin',
    },
    {
      label: 'Quality Control',
      icon: ClipboardCheck,
      path: '/quality-control',
      category: 'admin',
    },
    {
      label: 'Equipment',
      icon: HardHat,
      path: '/equipment',
      category: 'admin',
    },
    {
      label: 'Budget',
      icon: DollarSign,
      path: '/budget',
      category: 'admin',
    },
    {
      label: 'Invoices',
      icon: Receipt,
      path: '/invoices',
      category: 'admin',
    },
    {
      label: 'Contacts',
      icon: Users,
      path: '/contacts',
      category: 'admin',
    },
  ],
};

/**
 * Reports & Analytics navigation group
 */
export const reportsGroup: NavGroup = {
  id: 'reports',
  label: 'Reports & Analytics',
  icon: TrendingUp,
  category: 'reports',
  defaultExpanded: false,
  items: [
    {
      label: 'Analytics',
      icon: BarChart3,
      path: '/analytics',
      category: 'reports',
    },
    {
      label: 'Reports',
      icon: FileText,
      path: '/reports',
      category: 'reports',
    },
  ],
};

/**
 * All navigation groups in order
 */
export const navigationGroups: NavGroup[] = [
  fieldWorkGroup,
  managementGroup,
  administrationGroup,
  reportsGroup,
];

/**
 * All navigation items (flattened from groups + primary items)
 */
export const allNavItems: NavItem[] = [
  ...primaryNavItems,
  ...navigationGroups.flatMap((group) => group.items),
];

/**
 * Mobile bottom navigation items (primary + daily reports)
 */
export const mobileBottomNavItems: NavItem[] = allNavItems.filter(
  (item) => item.isPrimaryMobileNav
);

/**
 * Get navigation items for mobile drawer, organized by category
 */
export function getMobileDrawerSections() {
  return [
    {
      title: 'Main',
      items: primaryNavItems,
    },
    {
      title: 'Field Work',
      items: fieldWorkGroup.items,
    },
    {
      title: 'Project Management',
      items: managementGroup.items,
    },
    {
      title: 'Administration',
      items: administrationGroup.items,
    },
  ];
}

/**
 * Search navigation items by query
 */
export function searchNavItems(query: string): NavItem[] {
  const lowerQuery = query.toLowerCase().trim();

  if (!lowerQuery) {
    return allNavItems;
  }

  return allNavItems.filter((item) =>
    item.label.toLowerCase().includes(lowerQuery) ||
    item.path.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get navigation item by path
 */
export function getNavItemByPath(path: string): NavItem | undefined {
  return allNavItems.find((item) => item.path === path);
}
