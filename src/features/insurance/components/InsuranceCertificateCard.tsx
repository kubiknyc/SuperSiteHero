/**
 * Insurance Certificate Card Component
 * Displays a single insurance certificate in card format
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Shield,
  FileText,
  MoreVertical,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink,
  Edit,
  Trash2,
  Ban,
} from 'lucide-react'
import type {
  InsuranceCertificateWithRelations,
  CertificateStatus,
  InsuranceType,
} from '@/types/insurance'
import {
  INSURANCE_TYPE_LABELS,
  CERTIFICATE_STATUS_LABELS,
  formatInsuranceLimit,
  getDaysUntilExpiry,
} from '@/types/insurance'
import { cn } from '@/lib/utils'

interface InsuranceCertificateCardProps {
  certificate: InsuranceCertificateWithRelations
  onEdit?: (certificate: InsuranceCertificateWithRelations) => void
  onDelete?: (certificate: InsuranceCertificateWithRelations) => void
  onVoid?: (certificate: InsuranceCertificateWithRelations) => void
  onViewDocument?: (certificate: InsuranceCertificateWithRelations) => void
  compact?: boolean
}

const statusConfig: Record<
  CertificateStatus,
  { icon: typeof CheckCircle; color: string; bg: string }
> = {
  active: { icon: CheckCircle, color: 'text-success', bg: 'bg-success-light' },
  expiring_soon: { icon: Clock, color: 'text-warning', bg: 'bg-warning-light' },
  expired: { icon: AlertTriangle, color: 'text-error', bg: 'bg-error-light' },
  pending_renewal: { icon: Clock, color: 'text-primary', bg: 'bg-blue-50' },
  void: { icon: XCircle, color: 'text-secondary', bg: 'bg-surface' },
}

export function InsuranceCertificateCard({
  certificate,
  onEdit,
  onDelete,
  onVoid,
  onViewDocument,
  compact = false,
}: InsuranceCertificateCardProps) {
  const daysUntilExpiry = getDaysUntilExpiry(certificate.expiration_date)
  const StatusIcon = statusConfig[certificate.status].icon
  const statusColors = statusConfig[certificate.status]

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (compact) {
    return (
      <Card className={cn('transition-shadow hover:shadow-md', statusColors.bg)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className={cn('h-5 w-5', statusColors.color)} />
              <div>
                <p className="font-medium text-sm">
                  {INSURANCE_TYPE_LABELS[certificate.insurance_type]}
                </p>
                <p className="text-xs text-muted-foreground">{certificate.carrier_name}</p>
              </div>
            </div>
            <div className="text-right">
              <Badge
                variant={
                  certificate.status === 'active'
                    ? 'default'
                    : certificate.status === 'expired'
                      ? 'destructive'
                      : 'secondary'
                }
              >
                {CERTIFICATE_STATUS_LABELS[certificate.status]}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">
                Exp: {formatDate(certificate.expiration_date)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('transition-shadow hover:shadow-md', statusColors.bg)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', statusColors.bg)}>
              <Shield className={cn('h-5 w-5', statusColors.color)} />
            </div>
            <div>
              <CardTitle className="text-lg">
                {INSURANCE_TYPE_LABELS[certificate.insurance_type]}
              </CardTitle>
              <CardDescription>{certificate.carrier_name}</CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant={
                certificate.status === 'active'
                  ? 'default'
                  : certificate.status === 'expired'
                    ? 'destructive'
                    : 'secondary'
              }
            >
              <StatusIcon className="h-3 w-3 mr-1" />
              {CERTIFICATE_STATUS_LABELS[certificate.status]}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {certificate.certificate_url && (
                  <DropdownMenuItem onClick={() => onViewDocument?.(certificate)}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Document
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onEdit?.(certificate)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {certificate.status !== 'void' && (
                  <DropdownMenuItem
                    onClick={() => onVoid?.(certificate)}
                    className="text-warning"
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Void Certificate
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onDelete?.(certificate)} className="text-error">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Certificate Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Certificate #</p>
            <p className="font-medium">{certificate.certificate_number}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Policy #</p>
            <p className="font-medium">{certificate.policy_number}</p>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Effective Date</p>
            <p className="font-medium">{formatDate(certificate.effective_date)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Expiration Date</p>
            <p className={cn('font-medium', daysUntilExpiry < 30 && 'text-warning')}>
              {formatDate(certificate.expiration_date)}
              {daysUntilExpiry >= 0 && daysUntilExpiry <= 30 && (
                <span className="text-xs ml-1">({daysUntilExpiry} days)</span>
              )}
            </p>
          </div>
        </div>

        {/* Coverage Limits */}
        <div className="border-t pt-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">COVERAGE LIMITS</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {certificate.each_occurrence_limit && (
              <div>
                <p className="text-muted-foreground text-xs">Each Occurrence</p>
                <p className="font-medium">
                  {formatInsuranceLimit(certificate.each_occurrence_limit)}
                </p>
              </div>
            )}
            {certificate.general_aggregate_limit && (
              <div>
                <p className="text-muted-foreground text-xs">General Aggregate</p>
                <p className="font-medium">
                  {formatInsuranceLimit(certificate.general_aggregate_limit)}
                </p>
              </div>
            )}
            {certificate.umbrella_each_occurrence && (
              <div>
                <p className="text-muted-foreground text-xs">Umbrella</p>
                <p className="font-medium">
                  {formatInsuranceLimit(certificate.umbrella_each_occurrence)}
                </p>
              </div>
            )}
            {certificate.combined_single_limit && (
              <div>
                <p className="text-muted-foreground text-xs">Combined Single Limit</p>
                <p className="font-medium">
                  {formatInsuranceLimit(certificate.combined_single_limit)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Endorsements */}
        <div className="border-t pt-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">ENDORSEMENTS</p>
          <div className="flex flex-wrap gap-2">
            {certificate.additional_insured_required && (
              <Badge
                variant={certificate.additional_insured_verified ? 'default' : 'outline'}
                className="text-xs"
              >
                {certificate.additional_insured_verified ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <AlertTriangle className="h-3 w-3 mr-1" />
                )}
                Additional Insured
              </Badge>
            )}
            {certificate.waiver_of_subrogation_required && (
              <Badge
                variant={certificate.waiver_of_subrogation_verified ? 'default' : 'outline'}
                className="text-xs"
              >
                {certificate.waiver_of_subrogation_verified ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <AlertTriangle className="h-3 w-3 mr-1" />
                )}
                Waiver of Subrogation
              </Badge>
            )}
            {certificate.primary_noncontributory_required && (
              <Badge
                variant={certificate.primary_noncontributory_verified ? 'default' : 'outline'}
                className="text-xs"
              >
                {certificate.primary_noncontributory_verified ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <AlertTriangle className="h-3 w-3 mr-1" />
                )}
                Primary/Non-Contributory
              </Badge>
            )}
          </div>
        </div>

        {/* Subcontractor Info */}
        {certificate.subcontractor && (
          <div className="border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">SUBCONTRACTOR</p>
            <p className="text-sm font-medium">{certificate.subcontractor.company_name}</p>
            {certificate.subcontractor.contact_name && (
              <p className="text-xs text-muted-foreground">
                {certificate.subcontractor.contact_name}
              </p>
            )}
          </div>
        )}

        {/* Document Link */}
        {certificate.certificate_url && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onViewDocument?.(certificate)}
          >
            <FileText className="h-4 w-4 mr-2" />
            View Certificate Document
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
