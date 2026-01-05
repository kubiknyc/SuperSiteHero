/**
 * URL Mapping for Cross-Device Links
 *
 * Maps desktop URLs to mobile equivalents and vice versa.
 * Used when users share links between devices or when
 * navigating between mobile and desktop views.
 */

import { DeviceMode } from './detection';

/**
 * Route mapping configuration
 * Maps desktop routes to their mobile equivalents
 */
const ROUTE_MAPPINGS: Record<string, string> = {
  // Dashboard
  '/dashboard': '/mobile/dashboard',
  '/mobile/dashboard': '/dashboard',

  // Daily Reports
  '/daily-reports': '/mobile/daily-reports',
  '/daily-reports/new': '/mobile/daily-reports/new',
  '/mobile/daily-reports': '/daily-reports',
  '/mobile/daily-reports/new': '/daily-reports/new',

  // Photo Progress
  '/photo-progress': '/mobile/photo-progress',
  '/mobile/photo-progress': '/photo-progress',

  // Punch Lists
  '/punch-lists': '/mobile/punch-lists',
  '/punch-lists/new': '/mobile/punch-lists/new',
  '/mobile/punch-lists': '/punch-lists',
  '/mobile/punch-lists/new': '/punch-lists/new',

  // Inspections
  '/inspections': '/mobile/inspections',
  '/inspections/new': '/mobile/inspections/new',
  '/mobile/inspections': '/inspections',
  '/mobile/inspections/new': '/inspections/new',

  // Tasks
  '/tasks': '/mobile/tasks',
  '/mobile/tasks': '/tasks',

  // Projects
  '/projects': '/mobile/projects',
  '/mobile/projects': '/projects',

  // Settings
  '/settings': '/mobile/settings',
  '/mobile/settings': '/settings',
};

/**
 * Dynamic route patterns that include IDs
 */
const DYNAMIC_ROUTE_PATTERNS: Array<{
  desktopPattern: RegExp;
  mobilePattern: RegExp;
  desktopTemplate: string;
  mobileTemplate: string;
}> = [
  // Daily Reports with ID
  {
    desktopPattern: /^\/daily-reports\/(\d+)$/,
    mobilePattern: /^\/mobile\/daily-reports\/(\d+)$/,
    desktopTemplate: '/daily-reports/$1',
    mobileTemplate: '/mobile/daily-reports/$1',
  },
  // Punch Lists with ID
  {
    desktopPattern: /^\/punch-lists\/(\d+)$/,
    mobilePattern: /^\/mobile\/punch-lists\/(\d+)$/,
    desktopTemplate: '/punch-lists/$1',
    mobileTemplate: '/mobile/punch-lists/$1',
  },
  // Punch Lists edit
  {
    desktopPattern: /^\/punch-lists\/(\d+)\/edit$/,
    mobilePattern: /^\/mobile\/punch-lists\/(\d+)\/edit$/,
    desktopTemplate: '/punch-lists/$1/edit',
    mobileTemplate: '/mobile/punch-lists/$1/edit',
  },
  // Inspections with ID
  {
    desktopPattern: /^\/inspections\/(\d+)$/,
    mobilePattern: /^\/mobile\/inspections\/(\d+)$/,
    desktopTemplate: '/inspections/$1',
    mobileTemplate: '/mobile/inspections/$1',
  },
  // Tasks with ID
  {
    desktopPattern: /^\/tasks\/(\d+)$/,
    mobilePattern: /^\/mobile\/tasks\/(\d+)$/,
    desktopTemplate: '/tasks/$1',
    mobileTemplate: '/mobile/tasks/$1',
  },
  // Projects with ID
  {
    desktopPattern: /^\/projects\/([a-zA-Z0-9-]+)$/,
    mobilePattern: /^\/mobile\/projects\/([a-zA-Z0-9-]+)$/,
    desktopTemplate: '/projects/$1',
    mobileTemplate: '/mobile/projects/$1',
  },
  // Project photo progress
  {
    desktopPattern: /^\/projects\/([a-zA-Z0-9-]+)\/photo-progress$/,
    mobilePattern: /^\/mobile\/projects\/([a-zA-Z0-9-]+)\/photo-progress$/,
    desktopTemplate: '/projects/$1/photo-progress',
    mobileTemplate: '/mobile/projects/$1/photo-progress',
  },
  // Project photo capture
  {
    desktopPattern: /^\/projects\/([a-zA-Z0-9-]+)\/photo-progress\/capture$/,
    mobilePattern: /^\/mobile\/projects\/([a-zA-Z0-9-]+)\/photo-progress\/capture$/,
    desktopTemplate: '/projects/$1/photo-progress/capture',
    mobileTemplate: '/mobile/projects/$1/photo-progress/capture',
  },
];

/**
 * Features available only on desktop
 * Mobile users trying to access these will be redirected to dashboard
 */
const DESKTOP_ONLY_ROUTES = [
  '/rfis',
  '/submittals',
  '/change-orders',
  '/shop-drawings',
  '/contracts',
  '/schedule',
  '/drawings',
  '/documents',
  '/directory',
  '/reports',
  '/bid-management',
  '/closeout',
  '/forms',
  '/company-settings',
  '/admin',
];

/**
 * Check if a route is desktop-only
 */
export function isDesktopOnlyRoute(path: string): boolean {
  return DESKTOP_ONLY_ROUTES.some(route =>
    path === route || path.startsWith(`${route}/`)
  );
}

/**
 * Get the equivalent URL for the target device mode
 *
 * @param currentUrl - The current URL path
 * @param targetMode - The device mode to convert to
 * @returns The equivalent URL for the target mode, or null if no mapping exists
 */
export function mapUrlToDeviceMode(
  currentUrl: string,
  targetMode: DeviceMode
): string | null {
  // Remove query string and hash for matching
  const [path, queryAndHash] = currentUrl.split(/[?#]/, 2);
  const suffix = currentUrl.slice(path.length);

  // Check static mappings first
  const staticMapping = ROUTE_MAPPINGS[path];
  if (staticMapping) {
    const isMobileUrl = path.startsWith('/mobile/');
    const targetIsMobile = targetMode === 'mobile';

    // Only return mapping if it matches the target mode
    if (isMobileUrl !== targetIsMobile) {
      return staticMapping + suffix;
    }
    return null;
  }

  // Check dynamic patterns
  for (const pattern of DYNAMIC_ROUTE_PATTERNS) {
    const isCurrentMobile = pattern.mobilePattern.test(path);
    const isCurrentDesktop = pattern.desktopPattern.test(path);

    if (targetMode === 'mobile' && isCurrentDesktop) {
      const match = path.match(pattern.desktopPattern);
      if (match) {
        let result = pattern.mobileTemplate;
        for (let i = 1; i < match.length; i++) {
          result = result.replace(`$${i}`, match[i]);
        }
        return result + suffix;
      }
    }

    if (targetMode === 'desktop' && isCurrentMobile) {
      const match = path.match(pattern.mobilePattern);
      if (match) {
        let result = pattern.desktopTemplate;
        for (let i = 1; i < match.length; i++) {
          result = result.replace(`$${i}`, match[i]);
        }
        return result + suffix;
      }
    }
  }

  // No mapping found
  return null;
}

/**
 * Get the mobile equivalent of a desktop URL
 * If no mapping exists, returns the mobile dashboard
 */
export function getMobileUrl(desktopUrl: string): string {
  const mapped = mapUrlToDeviceMode(desktopUrl, 'mobile');
  if (mapped) return mapped;

  // If it's a desktop-only route, redirect to mobile dashboard
  if (isDesktopOnlyRoute(desktopUrl)) {
    return '/mobile/dashboard';
  }

  // If already a mobile URL, return as-is
  if (desktopUrl.startsWith('/mobile/')) {
    return desktopUrl;
  }

  // Default to mobile dashboard
  return '/mobile/dashboard';
}

/**
 * Get the desktop equivalent of a mobile URL
 * If no mapping exists, returns the desktop dashboard
 */
export function getDesktopUrl(mobileUrl: string): string {
  const mapped = mapUrlToDeviceMode(mobileUrl, 'desktop');
  if (mapped) return mapped;

  // If already a desktop URL, return as-is
  if (!mobileUrl.startsWith('/mobile/')) {
    return mobileUrl;
  }

  // Default to desktop dashboard
  return '/dashboard';
}

/**
 * Normalize a URL to the appropriate device mode
 * Used when navigating to ensure URLs match the current device
 */
export function normalizeUrlForDevice(
  url: string,
  deviceMode: DeviceMode
): string {
  if (deviceMode === 'mobile') {
    return getMobileUrl(url);
  }
  return getDesktopUrl(url);
}
