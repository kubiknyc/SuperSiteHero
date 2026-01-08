/**
 * Endorsement Compliance Summary
 * Displays overall insurance endorsement compliance status for subcontractor
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  FileWarning,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useInsuranceComplianceSummary,
  getInsuranceTypeLabel,
  getComplianceScoreColor,
  getComplianceScoreBgColor,
} from '../hooks'

export function EndorsementComplianceSummary() {
  const { data: summary, isLoading } = useInsuranceComplianceSummary()

  if (isLoading || !summary) {
    return null
  }

  const hasIssues =
    !summary.is_fully_compliant ||
    summary.missing_endorsement_certificates.length > 0 ||
    summary.expired_count > 0

  return (
    <Card className={cn(
      'border-2',
      summary.is_fully_compliant ? 'border-green-500' :
      summary.compliance_score >= 70 ? 'border-yellow-500' :
      'border-destructive'
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {summary.is_fully_compliant ? (
              <ShieldCheck className="h-6 w-6 text-green-500" />
            ) : summary.compliance_score >= 70 ? (
              <ShieldAlert className="h-6 w-6 text-yellow-500" />
            ) : (
              <ShieldX className="h-6 w-6 text-destructive" />
            )}
            <div>
              <CardTitle>Insurance Compliance</CardTitle>
              <CardDescription>
                Endorsement verification status across all certificates
              </CardDescription>
            </div>
          </div>
          <div className={cn(
            'text-center px-4 py-2 rounded-lg',
            getComplianceScoreBgColor(summary.compliance_score)
          )}>
            <p className={cn('text-2xl font-bold', getComplianceScoreColor(summary.compliance_score))}>
              {summary.compliance_score}%
            </p>
            <p className="text-xs text-muted-foreground">Compliant</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Payment Hold Alert */}
        {summary.payment_hold_active && (
          <Alert variant="destructive">
            <DollarSign className="h-4 w-4" />
            <AlertTitle>Payment Hold Active</AlertTitle>
            <AlertDescription>
              {summary.payment_hold_reason || 'Payments are on hold due to insurance compliance issues.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Certificate Stats */}
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{summary.active_certificates}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-600">{summary.expiring_soon_count}</p>
            <p className="text-xs text-muted-foreground">Expiring Soon</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-destructive">{summary.expired_count}</p>
            <p className="text-xs text-muted-foreground">Expired</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{summary.total_certificates}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>

        {/* Endorsement Summary */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Endorsement Status</p>

          <EndorsementRow
            label="Additional Insured"
            shortLabel="AI"
            required={summary.endorsement_summary.additional_insured.required_count}
            verified={summary.endorsement_summary.additional_insured.verified_count}
            missing={summary.endorsement_summary.additional_insured.missing_count}
          />

          <EndorsementRow
            label="Waiver of Subrogation"
            shortLabel="WoS"
            required={summary.endorsement_summary.waiver_of_subrogation.required_count}
            verified={summary.endorsement_summary.waiver_of_subrogation.verified_count}
            missing={summary.endorsement_summary.waiver_of_subrogation.missing_count}
          />

          <EndorsementRow
            label="Primary & Non-Contributory"
            shortLabel="P&NC"
            required={summary.endorsement_summary.primary_noncontributory.required_count}
            verified={summary.endorsement_summary.primary_noncontributory.verified_count}
            missing={summary.endorsement_summary.primary_noncontributory.missing_count}
          />
        </div>

        {/* Issues List */}
        {hasIssues && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-destructive">Action Required</p>

            {summary.missing_insurance_types.length > 0 && (
              <div className="flex items-start gap-2 text-sm">
                <FileWarning className="h-4 w-4 text-destructive mt-0.5" />
                <span>
                  Missing insurance: {summary.missing_insurance_types.map(getInsuranceTypeLabel).join(', ')}
                </span>
              </div>
            )}

            {summary.missing_endorsement_certificates.length > 0 && (
              <div className="flex items-start gap-2 text-sm">
                <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                <span>
                  {summary.missing_endorsement_certificates.length} certificate(s) missing required endorsements
                </span>
              </div>
            )}

            {summary.insufficient_coverage.length > 0 && (
              <div className="flex items-start gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                <span>
                  {summary.insufficient_coverage.length} certificate(s) with insufficient coverage
                </span>
              </div>
            )}

            {summary.expired_count > 0 && (
              <div className="flex items-start gap-2 text-sm">
                <Clock className="h-4 w-4 text-destructive mt-0.5" />
                <span>
                  {summary.expired_count} expired certificate(s) need renewal
                </span>
              </div>
            )}
          </div>
        )}

        {/* Success State */}
        {summary.is_fully_compliant && (
          <Alert className="border-green-500">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-700">
              All insurance requirements and endorsements are verified and compliant.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

interface EndorsementRowProps {
  label: string
  shortLabel: string
  required: number
  verified: number
  missing: number
}

function EndorsementRow({ label, shortLabel, required, verified, missing }: EndorsementRowProps) {
  if (required === 0) {
    return (
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <Badge variant="outline">Not Required</Badge>
      </div>
    )
  }

  const percentage = Math.round((verified / required) * 100)

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <div className="flex items-center gap-2">
          {missing > 0 ? (
            <Badge variant="destructive" className="gap-1">
              <XCircle className="h-3 w-3" />
              {missing} missing
            </Badge>
          ) : (
            <Badge variant="default" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              All verified
            </Badge>
          )}
        </div>
      </div>
      <Progress value={percentage} className="h-1.5" />
    </div>
  )
}

export default EndorsementComplianceSummary
