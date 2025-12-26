/**
 * Insurance Compliance Warning Component
 * Displays compliance status and payment hold warnings in payment approval flow
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertTriangle,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  Lock,
  Unlock,
  FileWarning,
} from 'lucide-react'
import { useSubcontractorComplianceStatus } from '@/features/insurance/hooks/useInsurance'
import { INSURANCE_TYPE_LABELS } from '@/types/insurance'
import { cn } from '@/lib/utils'

interface InsuranceComplianceWarningProps {
  subcontractorId: string
  subcontractorName?: string
  projectId?: string
  onApprovalBlocked?: () => void
  allowOverride?: boolean
  onOverride?: (reason: string) => void
  showDetails?: boolean
  compact?: boolean
}

export function InsuranceComplianceWarning({
  subcontractorId,
  subcontractorName,
  projectId,
  onApprovalBlocked,
  allowOverride = false,
  onOverride,
  showDetails = true,
  compact = false,
}: InsuranceComplianceWarningProps) {
  const navigate = useNavigate()
  const [showOverrideDialog, setShowOverrideDialog] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')

  const {
    data: complianceStatus,
    isLoading,
  } = useSubcontractorComplianceStatus(subcontractorId, projectId)

  // Call blocked callback if there's a payment hold
  if (complianceStatus?.payment_hold && onApprovalBlocked) {
    onApprovalBlocked()
  }

  if (isLoading) {
    return compact ? (
      <Skeleton className="h-6 w-32" />
    ) : (
      <Skeleton className="h-20 w-full" />
    )
  }

  // If no compliance status or fully compliant, show nothing or a success indicator
  if (!complianceStatus || (complianceStatus.is_compliant && !complianceStatus.payment_hold)) {
    if (compact) {
      return (
        <Badge variant="outline" className="text-success border-success">
          <ShieldCheck className="h-3 w-3 mr-1" />
          Compliant
        </Badge>
      )
    }
    return null
  }

  const handleOverride = () => {
    if (overrideReason.trim() && onOverride) {
      onOverride(overrideReason)
      setShowOverrideDialog(false)
      setOverrideReason('')
    }
  }

  const handleViewInsurance = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/insurance`)
    } else {
      navigate('/insurance')
    }
  }

  // Compact version for inline display
  if (compact) {
    if (complianceStatus.payment_hold) {
      return (
        <Badge variant="destructive" className="whitespace-nowrap">
          <Lock className="h-3 w-3 mr-1" />
          Payment Hold
        </Badge>
      )
    }

    if (!complianceStatus.is_compliant) {
      return (
        <Badge variant="secondary" className="text-warning border-warning whitespace-nowrap">
          <ShieldAlert className="h-3 w-3 mr-1" />
          Non-Compliant
        </Badge>
      )
    }

    return null
  }

  // Full warning display
  const hasExpiredCerts = complianceStatus.expired_count > 0
  const hasExpiringCerts = complianceStatus.expiring_soon_count > 0
  const hasMissingCoverage = complianceStatus.missing_insurance_types?.length > 0
  const hasInsufficientCoverage = complianceStatus.insufficient_coverage_types?.length > 0
  const hasMissingEndorsements = complianceStatus.missing_endorsements?.length > 0

  return (
    <>
      <Alert
        variant={complianceStatus.payment_hold ? 'destructive' : 'default'}
        className={cn(
          complianceStatus.payment_hold ? 'border-destructive' : 'border-warning'
        )}
      >
        <div className="flex items-start gap-3">
          {complianceStatus.payment_hold ? (
            <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />
          ) : (
            <Shield className="h-5 w-5 text-warning shrink-0" />
          )}

          <div className="flex-1 space-y-2">
            <AlertTitle className="flex items-center gap-2">
              {complianceStatus.payment_hold ? (
                <>
                  <Lock className="h-4 w-4" />
                  Payment Hold Active
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  Insurance Compliance Warning
                </>
              )}
              {subcontractorName && (
                <span className="font-normal text-muted-foreground">
                  - {subcontractorName}
                </span>
              )}
            </AlertTitle>

            <AlertDescription>
              {complianceStatus.payment_hold ? (
                <p className="text-sm">
                  This subcontractor has a payment hold due to insurance compliance issues.
                  Payment applications cannot be approved until the hold is released.
                </p>
              ) : (
                <p className="text-sm">
                  This subcontractor has insurance compliance issues that should be resolved.
                </p>
              )}

              {complianceStatus.hold_reason && (
                <p className="text-sm font-medium mt-2">
                  Hold Reason: {complianceStatus.hold_reason}
                </p>
              )}

              {showDetails && (
                <div className="mt-3 space-y-2">
                  {hasExpiredCerts && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <FileWarning className="h-4 w-4" />
                      <span>{complianceStatus.expired_count} expired certificate(s)</span>
                    </div>
                  )}

                  {hasExpiringCerts && (
                    <div className="flex items-center gap-2 text-sm text-warning">
                      <AlertTriangle className="h-4 w-4" />
                      <span>{complianceStatus.expiring_soon_count} certificate(s) expiring soon</span>
                    </div>
                  )}

                  {hasMissingCoverage && (
                    <div className="text-sm">
                      <span className="font-medium">Missing Coverage:</span>
                      <ul className="list-disc list-inside ml-2 mt-1">
                        {complianceStatus.missing_insurance_types?.map((type) => (
                          <li key={type} className="text-muted-foreground">
                            {INSURANCE_TYPE_LABELS[type as keyof typeof INSURANCE_TYPE_LABELS] || type}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {hasInsufficientCoverage && (
                    <div className="text-sm">
                      <span className="font-medium">Insufficient Coverage:</span>
                      <ul className="list-disc list-inside ml-2 mt-1">
                        {complianceStatus.insufficient_coverage_types?.map((type) => (
                          <li key={type} className="text-muted-foreground">
                            {INSURANCE_TYPE_LABELS[type as keyof typeof INSURANCE_TYPE_LABELS] || type}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {hasMissingEndorsements && (
                    <div className="text-sm">
                      <span className="font-medium">Missing Endorsements:</span>
                      <ul className="list-disc list-inside ml-2 mt-1">
                        {complianceStatus.missing_endorsements?.map((endorsement) => (
                          <li key={endorsement} className="text-muted-foreground">
                            {endorsement.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {complianceStatus.compliance_score !== undefined && (
                    <div className="flex items-center gap-2 text-sm mt-2">
                      <span className="font-medium">Compliance Score:</span>
                      <Badge
                        variant={
                          complianceStatus.compliance_score >= 90
                            ? 'default'
                            : complianceStatus.compliance_score >= 70
                              ? 'secondary'
                              : 'destructive'
                        }
                      >
                        {complianceStatus.compliance_score}%
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </AlertDescription>

            <div className="flex items-center gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={handleViewInsurance}>
                <ExternalLink className="h-4 w-4 mr-2" />
                View Insurance Details
              </Button>

              {complianceStatus.payment_hold && allowOverride && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOverrideDialog(true)}
                  className="text-warning hover:text-warning"
                >
                  <Unlock className="h-4 w-4 mr-2" />
                  Override & Approve
                </Button>
              )}
            </div>
          </div>
        </div>
      </Alert>

      {/* Override Confirmation Dialog */}
      <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Override Payment Hold
            </DialogTitle>
            <DialogDescription>
              You are about to override the payment hold for{' '}
              <strong>{subcontractorName || 'this subcontractor'}</strong>.
              This will allow the payment application to be approved despite outstanding
              insurance compliance issues.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-warning/10 border border-warning rounded-lg p-3">
              <p className="text-sm text-warning font-medium">
                This override will be logged for audit purposes.
              </p>
            </div>

            <div>
              <label htmlFor="override-reason" className="text-sm font-medium">
                Override Reason <span className="text-destructive">*</span>
              </label>
              <Textarea
                id="override-reason"
                placeholder="Enter the reason for overriding this payment hold..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOverrideDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleOverride}
              disabled={!overrideReason.trim()}
            >
              Override & Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * Hook to check if approval is blocked due to payment hold
 */
export function usePaymentApprovalBlocked(
  subcontractorId?: string,
  projectId?: string
): { isBlocked: boolean; isLoading: boolean; reason?: string } {
  const { data, isLoading } = useSubcontractorComplianceStatus(
    subcontractorId || '',
    projectId
  )

  if (!subcontractorId) {
    return { isBlocked: false, isLoading: false }
  }

  return {
    isBlocked: data?.payment_hold || false,
    isLoading,
    reason: data?.hold_reason || undefined,
  }
}
