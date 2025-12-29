// File: /src/lib/auth/mfaMiddleware.ts
// MFA enforcement middleware for protected routes

import { checkMFAStatus, isRoleMFARequired, getUserMFAPreferences } from './mfa'
import type { UserProfile } from '@/types/database'

/**
 * Check if MFA is required for the current user
 */
export async function checkMFARequirement(userProfile: UserProfile | null): Promise<{
  required: boolean
  enrolled: boolean
  enforced: boolean
  reason?: string
}> {
  if (!userProfile) {
    return { required: false, enrolled: false, enforced: false }
  }

  // Check if role requires MFA
  const roleRequiresMFA = await isRoleMFARequired(userProfile.role)

  // Check current MFA enrollment status
  const { enrolled, factors: _factors } = await checkMFAStatus()

  // Check user preferences for MFA enforcement
  if (!userProfile.id) {
    throw new Error('User ID is required for MFA preferences')
  }
  const preferences = await getUserMFAPreferences(userProfile.id)

  // Determine if MFA should be enforced
  const enforced = roleRequiresMFA || preferences.mfaEnabled

  return {
    required: roleRequiresMFA,
    enrolled,
    enforced,
    reason: roleRequiresMFA ? `Your role (${userProfile.role}) requires MFA` : undefined
  }
}

/**
 * Protected route configuration
 */
export interface ProtectedRouteConfig {
  path: string
  requireMFA: boolean
  roles?: string[]
}

/**
 * Routes that require MFA
 */
export const MFA_PROTECTED_ROUTES: ProtectedRouteConfig[] = [
  // Admin routes
  { path: '/admin', requireMFA: true, roles: ['admin', 'owner'] },
  { path: '/admin/*', requireMFA: true, roles: ['admin', 'owner'] },
  { path: '/settings/company', requireMFA: true, roles: ['admin', 'owner'] },
  { path: '/settings/billing', requireMFA: true, roles: ['admin', 'owner'] },
  { path: '/settings/users', requireMFA: true, roles: ['admin', 'owner', 'office_admin'] },

  // Project management routes
  { path: '/projects/*/settings', requireMFA: true, roles: ['project_manager', 'superintendent'] },
  { path: '/projects/*/permissions', requireMFA: true, roles: ['project_manager', 'superintendent'] },

  // Financial routes
  { path: '/change-orders/*/approve', requireMFA: true, roles: ['project_manager', 'superintendent', 'owner'] },
  { path: '/invoices', requireMFA: true, roles: ['project_manager', 'office_admin', 'owner'] },
  { path: '/budget', requireMFA: true, roles: ['project_manager', 'owner'] },

  // Security-sensitive operations
  { path: '/api-keys', requireMFA: true },
  { path: '/audit-logs', requireMFA: true, roles: ['admin', 'owner'] },
  { path: '/data-export', requireMFA: true, roles: ['admin', 'owner'] },
]

/**
 * Check if a path requires MFA
 */
export function isPathMFAProtected(path: string, userRole?: string): boolean {
  return MFA_PROTECTED_ROUTES.some(route => {
    // Check path match (supports wildcards)
    const pathMatch = route.path.endsWith('*')
      ? path.startsWith(route.path.slice(0, -1))
      : path === route.path

    if (!pathMatch) {return false}

    // Check role requirements
    if (route.roles && userRole) {
      return route.roles.includes(userRole)
    }

    return route.requireMFA
  })
}

/**
 * Grace period configuration for MFA enforcement
 */
export interface MFAGracePeriod {
  enabled: boolean
  daysRemaining: number
  deadline: Date
}

/**
 * Calculate MFA grace period for new enforcement
 */
export function calculateMFAGracePeriod(
  userCreatedAt: string,
  roleChangedAt?: string
): MFAGracePeriod {
  const GRACE_PERIOD_DAYS = 7 // 7 days to set up MFA

  // Use role change date if available, otherwise use account creation date
  const startDate = roleChangedAt ? new Date(roleChangedAt) : new Date(userCreatedAt)
  const deadline = new Date(startDate)
  deadline.setDate(deadline.getDate() + GRACE_PERIOD_DAYS)

  const now = new Date()
  const daysRemaining = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

  return {
    enabled: daysRemaining > 0,
    daysRemaining,
    deadline
  }
}

/**
 * MFA enforcement result
 */
export interface MFAEnforcementResult {
  allow: boolean
  requireMFA: boolean
  redirectTo?: string
  message?: string
  gracePeriod?: MFAGracePeriod
}

/**
 * Enforce MFA for a specific route
 */
export async function enforceMFAForRoute(
  path: string,
  userProfile: UserProfile | null
): Promise<MFAEnforcementResult> {
  // No user, no access
  if (!userProfile) {
    return {
      allow: false,
      requireMFA: false,
      redirectTo: '/login',
      message: 'Authentication required'
    }
  }

  // Check if path requires MFA
  const pathRequiresMFA = isPathMFAProtected(path, userProfile.role)

  // Check if user role requires MFA
  const roleRequiresMFA = await isRoleMFARequired(userProfile.role)

  // If neither path nor role requires MFA, allow access
  if (!pathRequiresMFA && !roleRequiresMFA) {
    return { allow: true, requireMFA: false }
  }

  // Check MFA enrollment status
  const { enrolled } = await checkMFAStatus()

  // If MFA is enrolled, require verification
  if (enrolled) {
    return {
      allow: true,
      requireMFA: true,
      message: 'MFA verification required for this action'
    }
  }

  // Check grace period for new requirements
  const gracePeriod = calculateMFAGracePeriod(userProfile.created_at || new Date().toISOString())

  // If in grace period, allow access but show warning
  if (gracePeriod.enabled) {
    return {
      allow: true,
      requireMFA: false,
      gracePeriod,
      message: `MFA will be required in ${gracePeriod.daysRemaining} days`
    }
  }

  // Grace period expired, redirect to MFA setup
  return {
    allow: false,
    requireMFA: true,
    redirectTo: '/auth/mfa-setup',
    message: 'MFA setup required for your account'
  }
}

/**
 * MFA session management
 */
const MFA_SESSION_DURATION = 30 * 60 * 1000 // 30 minutes

export class MFASession {
  private static verifiedSessions = new Map<string, number>()

  /**
   * Mark a session as MFA verified
   */
  static markVerified(userId: string): void {
    this.verifiedSessions.set(userId, Date.now())
  }

  /**
   * Check if a session is still MFA verified
   */
  static isVerified(userId: string): boolean {
    const verifiedAt = this.verifiedSessions.get(userId)
    if (!verifiedAt) {return false}

    const elapsed = Date.now() - verifiedAt
    if (elapsed > MFA_SESSION_DURATION) {
      this.verifiedSessions.delete(userId)
      return false
    }

    return true
  }

  /**
   * Clear MFA verification for a user
   */
  static clearVerification(userId: string): void {
    this.verifiedSessions.delete(userId)
  }

  /**
   * Get remaining session time
   */
  static getRemainingTime(userId: string): number {
    const verifiedAt = this.verifiedSessions.get(userId)
    if (!verifiedAt) {return 0}

    const elapsed = Date.now() - verifiedAt
    const remaining = MFA_SESSION_DURATION - elapsed

    return Math.max(0, remaining)
  }
}