/**
 * Change Order Approval Authority Hook
 *
 * Provides role-based approval limits for change orders.
 * Determines who can approve based on amount thresholds.
 */

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'

// ============================================================================
// Types
// ============================================================================

export interface ApprovalAuthorityLevel {
  id: string
  role: ApprovalRole
  roleName: string
  maxAmount: number | null // null means unlimited
  requiresSecondApproval: boolean
  secondApprovalThreshold: number | null
  canApproveOwnRequests: boolean
}

export type ApprovalRole =
  | 'project_manager'
  | 'senior_project_manager'
  | 'operations_manager'
  | 'director'
  | 'vp_operations'
  | 'cfo'
  | 'ceo'

export interface ApprovalCheck {
  canApprove: boolean
  reason: string
  requiresEscalation: boolean
  escalateTo: ApprovalRole | null
  currentUserLevel: ApprovalAuthorityLevel | null
}

export interface ChangeOrderApprovalRequest {
  changeOrderId: string
  amount: number
  requestedBy: string
  currentStatus: string
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_APPROVAL_LEVELS: ApprovalAuthorityLevel[] = [
  {
    id: 'pm',
    role: 'project_manager',
    roleName: 'Project Manager',
    maxAmount: 5000,
    requiresSecondApproval: false,
    secondApprovalThreshold: null,
    canApproveOwnRequests: false,
  },
  {
    id: 'spm',
    role: 'senior_project_manager',
    roleName: 'Senior Project Manager',
    maxAmount: 25000,
    requiresSecondApproval: true,
    secondApprovalThreshold: 15000,
    canApproveOwnRequests: false,
  },
  {
    id: 'om',
    role: 'operations_manager',
    roleName: 'Operations Manager',
    maxAmount: 50000,
    requiresSecondApproval: true,
    secondApprovalThreshold: 35000,
    canApproveOwnRequests: false,
  },
  {
    id: 'dir',
    role: 'director',
    roleName: 'Director',
    maxAmount: 100000,
    requiresSecondApproval: true,
    secondApprovalThreshold: 75000,
    canApproveOwnRequests: false,
  },
  {
    id: 'vp',
    role: 'vp_operations',
    roleName: 'VP Operations',
    maxAmount: 250000,
    requiresSecondApproval: true,
    secondApprovalThreshold: 150000,
    canApproveOwnRequests: true,
  },
  {
    id: 'cfo',
    role: 'cfo',
    roleName: 'CFO',
    maxAmount: 500000,
    requiresSecondApproval: false,
    secondApprovalThreshold: null,
    canApproveOwnRequests: true,
  },
  {
    id: 'ceo',
    role: 'ceo',
    roleName: 'CEO',
    maxAmount: null, // Unlimited
    requiresSecondApproval: false,
    secondApprovalThreshold: null,
    canApproveOwnRequests: true,
  },
]

// Role hierarchy for escalation
const ROLE_HIERARCHY: ApprovalRole[] = [
  'project_manager',
  'senior_project_manager',
  'operations_manager',
  'director',
  'vp_operations',
  'cfo',
  'ceo',
]

// ============================================================================
// Helper Functions
// ============================================================================

function getNextEscalationRole(currentRole: ApprovalRole): ApprovalRole | null {
  const currentIndex = ROLE_HIERARCHY.indexOf(currentRole)
  if (currentIndex === -1 || currentIndex >= ROLE_HIERARCHY.length - 1) {
    return null
  }
  return ROLE_HIERARCHY[currentIndex + 1]
}

function findApprovalLevel(
  amount: number,
  levels: ApprovalAuthorityLevel[]
): ApprovalAuthorityLevel | null {
  // Find the lowest level that can approve this amount
  for (const level of levels) {
    if (level.maxAmount === null || amount <= level.maxAmount) {
      return level
    }
  }
  return null
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Get approval authority levels for a company
 */
export function useApprovalLevels(companyId: string | undefined) {
  return useQuery({
    queryKey: ['approval-levels', companyId],
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID required')

      // Try to fetch custom levels from database
      const { data, error } = await supabase
        .from('company_settings')
        .select('value')
        .eq('company_id', companyId)
        .eq('key', 'change_order_approval_levels')
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      // Return custom levels if found, otherwise use defaults
      if (data?.value) {
        return data.value as ApprovalAuthorityLevel[]
      }
      return DEFAULT_APPROVAL_LEVELS
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  })
}

/**
 * Get current user's approval authority level
 */
export function useCurrentUserApprovalLevel() {
  const { userProfile } = useAuth()
  const { data: levels } = useApprovalLevels(userProfile?.company_id)

  return useMemo(() => {
    if (!userProfile || !levels) return null

    // Map user's actual role to approval role
    const roleMapping: Record<string, ApprovalRole> = {
      admin: 'ceo',
      manager: 'operations_manager',
      field_user: 'project_manager',
      viewer: 'project_manager',
    }

    const approvalRole = roleMapping[userProfile.role || 'viewer'] || 'project_manager'
    return levels.find(l => l.role === approvalRole) || levels[0]
  }, [userProfile, levels])
}

/**
 * Check if user can approve a specific change order
 */
export function useCanApproveChangeOrder(
  changeOrderId: string | undefined,
  amount: number | undefined
) {
  const { userProfile } = useAuth()
  const currentLevel = useCurrentUserApprovalLevel()
  const { data: levels } = useApprovalLevels(userProfile?.company_id)

  return useMemo((): ApprovalCheck => {
    if (!currentLevel || amount === undefined) {
      return {
        canApprove: false,
        reason: 'Unable to determine approval authority',
        requiresEscalation: false,
        escalateTo: null,
        currentUserLevel: null,
      }
    }

    // Check if amount exceeds user's authority
    if (currentLevel.maxAmount !== null && amount > currentLevel.maxAmount) {
      const requiredLevel = findApprovalLevel(amount, levels || DEFAULT_APPROVAL_LEVELS)
      return {
        canApprove: false,
        reason: `Amount ${formatCurrency(amount)} exceeds your approval limit of ${formatCurrency(currentLevel.maxAmount)}`,
        requiresEscalation: true,
        escalateTo: requiredLevel?.role || getNextEscalationRole(currentLevel.role),
        currentUserLevel: currentLevel,
      }
    }

    // Check if second approval is required
    if (
      currentLevel.requiresSecondApproval &&
      currentLevel.secondApprovalThreshold !== null &&
      amount > currentLevel.secondApprovalThreshold
    ) {
      return {
        canApprove: true,
        reason: `You can approve, but amounts over ${formatCurrency(currentLevel.secondApprovalThreshold)} require a second approval`,
        requiresEscalation: false,
        escalateTo: null,
        currentUserLevel: currentLevel,
      }
    }

    return {
      canApprove: true,
      reason: 'You have authority to approve this change order',
      requiresEscalation: false,
      escalateTo: null,
      currentUserLevel: currentLevel,
    }
  }, [currentLevel, amount, levels])
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Request approval escalation
 */
export function useRequestEscalation() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      changeOrderId,
      amount,
      escalateTo,
      reason,
    }: {
      changeOrderId: string
      amount: number
      escalateTo: ApprovalRole
      reason?: string
    }) => {
      if (!userProfile?.id) {
        throw new Error('User must be authenticated')
      }

      // Get current metadata
      const { data: co, error: fetchError } = await supabase
        .from('change_orders')
        .select('metadata')
        .eq('id', changeOrderId)
        .single()

      if (fetchError) throw fetchError

      const now = new Date().toISOString()
      const updatedMetadata = {
        ...(co.metadata || {}),
        escalationRequested: true,
        escalationRequestedAt: now,
        escalationRequestedBy: userProfile.id,
        escalateTo,
        escalationReason: reason || `Amount ${formatCurrency(amount)} requires higher approval authority`,
        escalationHistory: [
          ...((co.metadata as any)?.escalationHistory || []),
          {
            timestamp: now,
            from: userProfile.id,
            to: escalateTo,
            amount,
            reason,
          },
        ],
      }

      const { error } = await supabase
        .from('change_orders')
        .update({
          metadata: updatedMetadata,
          status: 'pending_escalation',
        })
        .eq('id', changeOrderId)

      if (error) throw error

      return { changeOrderId, escalateTo }
    },
    onSuccess: (_, { changeOrderId }) => {
      queryClient.invalidateQueries({ queryKey: ['change-orders'] })
      queryClient.invalidateQueries({ queryKey: ['change-order', changeOrderId] })
    },
  })
}

/**
 * Record approval with authority check
 */
export function useApproveWithAuthorityCheck() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()
  const currentLevel = useCurrentUserApprovalLevel()

  return useMutation({
    mutationFn: async ({
      changeOrderId,
      amount,
      notes,
    }: {
      changeOrderId: string
      amount: number
      notes?: string
    }) => {
      if (!userProfile?.id || !currentLevel) {
        throw new Error('User must be authenticated with approval authority')
      }

      // Verify authority
      if (currentLevel.maxAmount !== null && amount > currentLevel.maxAmount) {
        throw new Error(
          `Approval amount ${formatCurrency(amount)} exceeds your limit of ${formatCurrency(currentLevel.maxAmount)}`
        )
      }

      // Get current metadata
      const { data: co, error: fetchError } = await supabase
        .from('change_orders')
        .select('metadata, approved_amount')
        .eq('id', changeOrderId)
        .single()

      if (fetchError) throw fetchError

      const now = new Date().toISOString()
      const needsSecondApproval =
        currentLevel.requiresSecondApproval &&
        currentLevel.secondApprovalThreshold !== null &&
        amount > currentLevel.secondApprovalThreshold

      const updatedMetadata = {
        ...(co.metadata || {}),
        approvalHistory: [
          ...((co.metadata as any)?.approvalHistory || []),
          {
            timestamp: now,
            approvedBy: userProfile.id,
            approverRole: currentLevel.role,
            amount,
            notes,
            isFirstApproval: needsSecondApproval,
          },
        ],
        ...(needsSecondApproval
          ? {
              pendingSecondApproval: true,
              firstApprovalAt: now,
              firstApprovalBy: userProfile.id,
            }
          : {
              fullyApproved: true,
              finalApprovalAt: now,
              finalApprovalBy: userProfile.id,
            }),
      }

      const { error } = await supabase
        .from('change_orders')
        .update({
          metadata: updatedMetadata,
          approved_amount: amount,
          status: needsSecondApproval ? 'pending_second_approval' : 'approved',
          date_internal_approved: now,
        })
        .eq('id', changeOrderId)

      if (error) throw error

      return { changeOrderId, needsSecondApproval }
    },
    onSuccess: (_, { changeOrderId }) => {
      queryClient.invalidateQueries({ queryKey: ['change-orders'] })
      queryClient.invalidateQueries({ queryKey: ['change-order', changeOrderId] })
    },
  })
}

// ============================================================================
// Exports
// ============================================================================

export {
  getNextEscalationRole,
  findApprovalLevel,
  formatCurrency,
  ROLE_HIERARCHY,
}
