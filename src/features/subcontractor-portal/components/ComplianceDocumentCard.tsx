/**
 * Compliance Document Card Component
 * Displays a single compliance document with details and actions
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  FileText,
  Calendar,
  Building2,
  DollarSign,
  Shield,
  ExternalLink,
  Download,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) {return '-'}
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(dateString: string | null): string {
  if (!dateString) {return '-'}
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
import { ExpirationBadge } from './ExpirationBadge'
import { getDocumentTypeLabel } from '../hooks/useComplianceDocuments'
import type { ComplianceDocumentWithRelations, ComplianceDocumentStatus } from '@/types/subcontractor-portal'

interface ComplianceDocumentCardProps {
  document: ComplianceDocumentWithRelations
  className?: string
}

function StatusBadge({ status }: { status: ComplianceDocumentStatus }) {
  const config: Record<ComplianceDocumentStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    pending: { variant: 'secondary', label: 'Pending Review' },
    approved: { variant: 'default', label: 'Approved' },
    rejected: { variant: 'destructive', label: 'Rejected' },
    expired: { variant: 'outline', label: 'Expired' },
  }

  const { variant, label } = config[status] || { variant: 'secondary' as const, label: status }

  return <Badge variant={variant}>{label}</Badge>
}

function DocumentTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'insurance_certificate':
      return <Shield className="h-5 w-5 text-blue-500" />
    case 'license':
      return <FileText className="h-5 w-5 text-purple-500" />
    case 'w9':
      return <FileText className="h-5 w-5 text-green-500" />
    case 'bond':
      return <DollarSign className="h-5 w-5 text-amber-500" />
    case 'safety_cert':
      return <Shield className="h-5 w-5 text-orange-500" />
    default:
      return <FileText className="h-5 w-5 text-gray-500" />
  }
}

export function ComplianceDocumentCard({ document, className }: ComplianceDocumentCardProps) {
  const isExpiredOrRejected = document.status === 'expired' || document.status === 'rejected'

  return (
    <Card className={cn(isExpiredOrRejected && 'opacity-75', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <DocumentTypeIcon type={document.document_type} />
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{document.document_name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {getDocumentTypeLabel(document.document_type)}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <StatusBadge status={document.status} />
            {document.expiration_date && (
              <ExpirationBadge expirationDate={document.expiration_date} showIcon={false} />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Document Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {document.issue_date && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span>Issued: {formatDate(document.issue_date)}</span>
            </div>
          )}
          {document.expiration_date && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span>Expires: {formatDate(document.expiration_date)}</span>
            </div>
          )}
          {document.provider_name && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{document.provider_name}</span>
            </div>
          )}
          {document.policy_number && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">#{document.policy_number}</span>
            </div>
          )}
          {document.coverage_amount && (
            <div className="flex items-center gap-2 text-muted-foreground col-span-2">
              <DollarSign className="h-3 w-3 flex-shrink-0" />
              <span>Coverage: {formatCurrency(document.coverage_amount)}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {document.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{document.description}</p>
        )}

        {/* Project Association */}
        {document.project && (
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Project:</span>
            <span className="font-medium">{document.project.name}</span>
          </div>
        )}

        {/* Rejection Notes */}
        {document.status === 'rejected' && document.rejection_notes && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">
              <strong>Rejection Reason:</strong> {document.rejection_notes}
            </p>
          </div>
        )}

        {/* Reviewed By */}
        {document.reviewed_by_user && document.reviewed_at && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <User className="h-3 w-3" />
            Reviewed by {document.reviewed_by_user.first_name} {document.reviewed_by_user.last_name} on{' '}
            {formatDate(document.reviewed_at)}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <a href={document.file_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-1" />
              View
            </a>
          </Button>
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <a href={document.file_url} download>
              <Download className="h-4 w-4 mr-1" />
              Download
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default ComplianceDocumentCard
