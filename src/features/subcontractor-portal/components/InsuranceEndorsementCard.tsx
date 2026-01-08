/**
 * Insurance Endorsement Card
 * Displays insurance certificate with endorsement verification status
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Calendar,
  Building2,
  FileText,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Info,
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import {
  getInsuranceTypeLabel,
  getEndorsementTypeLabel,
  getEndorsementTypeShortLabel,
  getEndorsementStatusBadgeVariant,
  getCertificateStatusBadgeVariant,
  getCertificateStatusLabel,
  formatCoverageAmount,
  isCertificateExpired,
  getDaysUntilExpiration,
} from '../hooks'
import type { SubcontractorInsuranceCertificate, EndorsementRequirement } from '@/types/subcontractor-portal'

interface InsuranceEndorsementCardProps {
  certificate: SubcontractorInsuranceCertificate
  onViewDocument?: () => void
}

export function InsuranceEndorsementCard({
  certificate,
  onViewDocument,
}: InsuranceEndorsementCardProps) {
  const isExpired = isCertificateExpired(certificate.expiration_date)
  const daysUntilExpiry = getDaysUntilExpiration(certificate.expiration_date)
  const isExpiringSoon = !isExpired && daysUntilExpiry <= 30

  // Calculate endorsement compliance
  const requiredEndorsements = certificate.endorsements.filter((e) => e.required)
  const verifiedEndorsements = requiredEndorsements.filter((e) => e.verified)
  const endorsementProgress =
    requiredEndorsements.length > 0
      ? Math.round((verifiedEndorsements.length / requiredEndorsements.length) * 100)
      : 100

  const getStatusIcon = () => {
    if (isExpired) {return <ShieldX className="h-5 w-5 text-destructive" />}
    if (!certificate.has_all_required_endorsements) {return <ShieldAlert className="h-5 w-5 text-yellow-500" />}
    return <ShieldCheck className="h-5 w-5 text-green-500" />
  }

  return (
    <Card className={
      isExpired ? 'border-destructive' :
      !certificate.has_all_required_endorsements ? 'border-yellow-500' :
      ''
    }>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <div>
              <CardTitle className="text-lg">
                {getInsuranceTypeLabel(certificate.insurance_type)}
              </CardTitle>
              <CardDescription>
                {certificate.carrier_name} • Policy #{certificate.policy_number}
              </CardDescription>
            </div>
          </div>
          <Badge variant={getCertificateStatusBadgeVariant(certificate.status)}>
            {getCertificateStatusLabel(certificate.status)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Expiration Warning */}
        {(isExpired || isExpiringSoon) && (
          <Alert variant={isExpired ? 'destructive' : 'default'} className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {isExpired
                ? `Certificate expired ${Math.abs(daysUntilExpiry)} days ago`
                : `Certificate expires in ${daysUntilExpiry} days`}
            </AlertDescription>
          </Alert>
        )}

        {/* Dates & Coverage */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Effective</p>
              <p>{format(new Date(certificate.effective_date), 'MMM d, yyyy')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Expires</p>
              <p className={isExpired ? 'text-destructive font-semibold' : isExpiringSoon ? 'text-yellow-600 font-semibold' : ''}>
                {format(new Date(certificate.expiration_date), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
        </div>

        {/* Coverage Limits */}
        {certificate.each_occurrence_limit && (
          <div className="text-sm">
            <span className="text-muted-foreground">Each Occurrence: </span>
            <span className="font-semibold">{formatCoverageAmount(certificate.each_occurrence_limit)}</span>
            {certificate.general_aggregate_limit && (
              <>
                <span className="text-muted-foreground"> / Aggregate: </span>
                <span className="font-semibold">{formatCoverageAmount(certificate.general_aggregate_limit)}</span>
              </>
            )}
          </div>
        )}

        {/* Project Association */}
        {certificate.project_name && (
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span>{certificate.project_name}</span>
          </div>
        )}

        {/* Endorsement Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Required Endorsements</p>
            {requiredEndorsements.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {verifiedEndorsements.length}/{requiredEndorsements.length} verified
              </span>
            )}
          </div>

          {requiredEndorsements.length > 0 ? (
            <>
              <Progress value={endorsementProgress} className="h-2" />
              <div className="flex flex-wrap gap-2 mt-2">
                <TooltipProvider>
                  {certificate.endorsements.map((endorsement) => (
                    <EndorsementBadge key={endorsement.type} endorsement={endorsement} />
                  ))}
                </TooltipProvider>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No endorsements required</p>
          )}
        </div>

        {/* Missing Endorsements Warning */}
        {certificate.missing_endorsements.length > 0 && (
          <Alert variant="destructive" className="py-2">
            <XCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Missing:</strong> {certificate.missing_endorsements.join(', ')}
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        {certificate.certificate_url && (
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (onViewDocument) {
                  onViewDocument()
                } else {
                  window.open(certificate.certificate_url!, '_blank')
                }
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Certificate
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface EndorsementBadgeProps {
  endorsement: EndorsementRequirement
}

function EndorsementBadge({ endorsement }: EndorsementBadgeProps) {
  const getIcon = () => {
    switch (endorsement.status) {
      case 'verified':
        return <CheckCircle className="h-3 w-3" />
      case 'missing':
        return <XCircle className="h-3 w-3" />
      case 'required':
        return <Clock className="h-3 w-3" />
      default:
        return null
    }
  }

  if (endorsement.status === 'not_required') {
    return null
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={getEndorsementStatusBadgeVariant(endorsement.status)}
          className="gap-1 cursor-help"
        >
          {getIcon()}
          {getEndorsementTypeShortLabel(endorsement.type)}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{getEndorsementTypeLabel(endorsement.type)}</p>
        <p className="text-xs text-muted-foreground">
          {endorsement.status === 'verified' && 'Verified on certificate'}
          {endorsement.status === 'missing' && 'Required but not verified'}
          {endorsement.status === 'required' && 'Required - pending verification'}
        </p>
        {endorsement.type === 'additional_insured' && endorsement.additional_insured_name && (
          <p className="text-xs mt-1">Named: {endorsement.additional_insured_name}</p>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

export default InsuranceEndorsementCard
