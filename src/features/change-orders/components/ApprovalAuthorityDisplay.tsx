/**
 * Approval Authority Display Component
 *
 * Displays the current user's approval authority level and shows
 * whether they can approve a specific change order amount.
 */

import { useMemo } from 'react'
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ArrowUp,
  DollarSign,
  User,
  Users,
  Building2,
  Crown,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  useCurrentUserApprovalLevel,
  useCanApproveChangeOrder,
  useRequestEscalation,
  DEFAULT_APPROVAL_LEVELS,
  type ApprovalRole,
} from '../hooks/useApprovalAuthority'

// ============================================================================
// Types
// ============================================================================

interface ApprovalAuthorityDisplayProps {
  changeOrderId?: string
  amount?: number
  showAllLevels?: boolean
  compact?: boolean
  onEscalationRequested?: () => void
}

interface ApprovalLevelCardProps {
  role: ApprovalRole
  maxAmount: number | null
  label: string
  isCurrentUser: boolean
  canApproveAmount?: boolean
  requestedAmount?: number
}

// ============================================================================
// Helper Functions
// ============================================================================

function getRoleIcon(role: ApprovalRole) {
  switch (role) {
    case 'project_manager':
      return User
    case 'senior_project_manager':
      return Users
    case 'director':
      return Building2
    case 'vp':
      return Shield
    case 'ceo':
      return Crown
    default:
      return User
  }
}

function formatCurrency(amount: number | null): string {
  if (amount === null) {return 'Unlimited'}
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function getRoleBadgeColor(role: ApprovalRole): string {
  switch (role) {
    case 'project_manager':
      return 'bg-blue-100 text-blue-700'
    case 'senior_project_manager':
      return 'bg-indigo-100 text-indigo-700'
    case 'director':
      return 'bg-purple-100 text-purple-700'
    case 'vp':
      return 'bg-orange-100 text-orange-700'
    case 'ceo':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

// ============================================================================
// Sub-Components
// ============================================================================

function ApprovalLevelCard({
  role,
  maxAmount,
  label,
  isCurrentUser,
  canApproveAmount,
  requestedAmount,
}: ApprovalLevelCardProps) {
  const RoleIcon = getRoleIcon(role)
  const badgeColor = getRoleBadgeColor(role)

  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border transition-colors',
        isCurrentUser && 'border-primary bg-primary/5',
        canApproveAmount === true && 'border-green-300 bg-green-50',
        canApproveAmount === false && 'border-gray-200 bg-gray-50'
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'p-2 rounded-full',
            isCurrentUser ? 'bg-primary/10' : 'bg-muted'
          )}
        >
          <RoleIcon
            className={cn(
              'h-4 w-4',
              isCurrentUser ? 'text-primary' : 'text-muted-foreground'
            )}
          />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{label}</span>
            {isCurrentUser && (
              <Badge variant="outline" className="text-xs">
                You
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Up to {formatCurrency(maxAmount)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {requestedAmount && canApproveAmount !== undefined && (
          <>
            {canApproveAmount ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-gray-400" />
            )}
          </>
        )}
        <Badge variant="outline" className={cn('text-xs', badgeColor)}>
          {formatCurrency(maxAmount)}
        </Badge>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function ApprovalAuthorityDisplay({
  changeOrderId,
  amount,
  showAllLevels = false,
  compact = false,
  onEscalationRequested,
}: ApprovalAuthorityDisplayProps) {
  const { data: userLevel, isLoading: levelLoading } = useCurrentUserApprovalLevel()
  const {
    data: approvalCheck,
    isLoading: checkLoading,
  } = useCanApproveChangeOrder(changeOrderId, amount)
  const requestEscalation = useRequestEscalation()

  const isLoading = levelLoading || checkLoading

  // Find required approval level for the amount
  const requiredLevel = useMemo(() => {
    if (!amount) {return null}
    return DEFAULT_APPROVAL_LEVELS.find(
      (level) => level.maxAmount === null || level.maxAmount >= amount
    )
  }, [amount])

  const handleRequestEscalation = async () => {
    if (!changeOrderId || !approvalCheck?.escalateTo) {return}

    try {
      await requestEscalation.mutateAsync({
        changeOrderId,
        amount: amount || 0,
        escalateTo: approvalCheck.escalateTo,
        reason: `Amount ${formatCurrency(amount || 0)} exceeds current approval authority`,
      })
      onEscalationRequested?.()
    } catch (error) {
      console.error('Failed to request escalation:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Compact view for inline display
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex items-center gap-2">
              {approvalCheck?.canApprove ? (
                <ShieldCheck className="h-4 w-4 text-green-600" />
              ) : (
                <ShieldAlert className="h-4 w-4 text-amber-600" />
              )}
              <span className="text-sm">
                {userLevel ? (
                  <>Authority: {formatCurrency(userLevel.maxAmount)}</>
                ) : (
                  'No approval authority'
                )}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {approvalCheck?.canApprove
                ? 'You can approve this change order'
                : `Requires ${approvalCheck?.escalateTo ? DEFAULT_APPROVAL_LEVELS.find(l => l.role === approvalCheck.escalateTo)?.roleName : 'higher'} approval`}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-5 w-5" />
          Approval Authority
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current User's Authority */}
        {userLevel && (
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Your Approval Limit</div>
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(userLevel.maxAmount)}
                </div>
              </div>
              <div className="text-right">
                <Badge className={getRoleBadgeColor(userLevel.role)}>
                  {userLevel.roleName}
                </Badge>
                {userLevel.requiresSecondApproval && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Requires 2nd approver
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Approval Check for Specific Amount */}
        {amount !== undefined && approvalCheck && (
          <Alert
            variant={approvalCheck.canApprove ? 'default' : 'destructive'}
            className={cn(
              approvalCheck.canApprove
                ? 'border-green-300 bg-green-50'
                : 'border-amber-300 bg-amber-50'
            )}
          >
            {approvalCheck.canApprove ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            )}
            <AlertTitle className={approvalCheck.canApprove ? 'text-green-800' : 'text-amber-800'}>
              {approvalCheck.canApprove ? 'Within Authority' : 'Exceeds Authority'}
            </AlertTitle>
            <AlertDescription
              className={approvalCheck.canApprove ? 'text-green-700' : 'text-amber-700'}
            >
              {approvalCheck.canApprove ? (
                <>
                  You can approve this change order for {formatCurrency(amount)}.
                  {approvalCheck.currentUserLevel?.requiresSecondApproval && (
                    <> A second approver is required.</>
                  )}
                </>
              ) : (
                <>
                  This amount ({formatCurrency(amount)}) requires{' '}
                  <strong>
                    {DEFAULT_APPROVAL_LEVELS.find(l => l.role === approvalCheck.escalateTo)?.roleName || approvalCheck.escalateTo}
                  </strong>{' '}
                  approval (up to {formatCurrency(
                    DEFAULT_APPROVAL_LEVELS.find(l => l.role === approvalCheck.escalateTo)?.maxAmount || null
                  )}).
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Escalation Button */}
        {amount !== undefined && approvalCheck && !approvalCheck.canApprove && changeOrderId && (
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleRequestEscalation}
            disabled={requestEscalation.isPending}
          >
            {requestEscalation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
            Request Escalation to{' '}
            {DEFAULT_APPROVAL_LEVELS.find(l => l.role === approvalCheck.escalateTo)?.roleName}
          </Button>
        )}

        {/* All Approval Levels */}
        {showAllLevels && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              All Approval Levels
            </div>
            <div className="space-y-2">
              {DEFAULT_APPROVAL_LEVELS.map((level) => (
                <ApprovalLevelCard
                  key={level.role}
                  role={level.role}
                  maxAmount={level.maxAmount}
                  label={level.roleName}
                  isCurrentUser={userLevel?.role === level.role}
                  canApproveAmount={
                    amount !== undefined
                      ? level.maxAmount === null || level.maxAmount >= amount
                      : undefined
                  }
                  requestedAmount={amount}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ApprovalAuthorityDisplay
