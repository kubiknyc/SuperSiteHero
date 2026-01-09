/**
 * Subcontractor Certifications Page
 * Track equipment & labor certifications - P2-3 Feature
 */

import { useState, useMemo } from 'react'
import {
  useSubcontractorCertifications,
  useCertificationSummary,
  getCertificationTypeLabel,
  getCertificationStatusBadgeVariant,
  getCertificationStatusLabel,
  formatCertificationDate,
  getExpirationStatusText,
  filterCertificationsByStatus,
  filterCertificationsByType,
  groupCertificationsByType,
  groupCertificationsByHolder,
  sortCertificationsByExpiration,
  getCertificationHealthScore,
  getHealthScoreColor,
  type SubcontractorCertification,
  type CertificationType,
} from '@/features/subcontractor-portal/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Award,
  Shield,
  Heart,
  Wrench,
  AlertTriangle,
  FileText,
  Calendar,
  User,
  Building,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Users,
  List,
  LayoutGrid,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type StatusFilter = 'all' | 'valid' | 'expiring' | 'expired' | 'pending'
type TypeFilter = CertificationType | 'all'
type ViewMode = 'list' | 'by-type' | 'by-holder'

// Certification type options for filter
const TYPE_OPTIONS: Array<{ value: TypeFilter; label: string }> = [
  { value: 'all', label: 'All Types' },
  { value: 'equipment_operator', label: 'Equipment Operator' },
  { value: 'safety_training', label: 'Safety Training' },
  { value: 'first_aid', label: 'First Aid/CPR' },
  { value: 'trade_license', label: 'Trade License' },
  { value: 'professional', label: 'Professional' },
  { value: 'hazmat', label: 'Hazmat' },
  { value: 'confined_space', label: 'Confined Space' },
  { value: 'fall_protection', label: 'Fall Protection' },
  { value: 'welding', label: 'Welding' },
  { value: 'other', label: 'Other' },
]

// Get icon for certification type
function getCertificationIcon(type: CertificationType) {
  switch (type) {
    case 'equipment_operator':
      return <Wrench className="h-4 w-4" />
    case 'safety_training':
      return <Shield className="h-4 w-4" />
    case 'first_aid':
      return <Heart className="h-4 w-4" />
    case 'trade_license':
      return <Wrench className="h-4 w-4" />
    case 'professional':
      return <Award className="h-4 w-4" />
    case 'hazmat':
      return <AlertTriangle className="h-4 w-4" />
    case 'confined_space':
      return <Building className="h-4 w-4" />
    case 'fall_protection':
      return <Shield className="h-4 w-4" />
    case 'welding':
      return <Wrench className="h-4 w-4" />
    default:
      return <FileText className="h-4 w-4" />
  }
}

export default function SubcontractorCertificationsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  const { data: certifications = [], isLoading } = useSubcontractorCertifications()
  const { data: summary } = useCertificationSummary()

  // Filter certifications
  const filteredCertifications = useMemo(() => {
    let filtered = filterCertificationsByStatus(certifications, statusFilter)
    filtered = filterCertificationsByType(filtered, typeFilter)
    return sortCertificationsByExpiration(filtered)
  }, [certifications, statusFilter, typeFilter])

  // Group by type
  const certsByType = useMemo(
    () => groupCertificationsByType(filteredCertifications),
    [filteredCertifications]
  )

  // Group by holder
  const certsByHolder = useMemo(
    () => groupCertificationsByHolder(filteredCertifications),
    [filteredCertifications]
  )

  // Calculate health score
  const healthScore = useMemo(
    () => getCertificationHealthScore(certifications),
    [certifications]
  )

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" />
            Certifications
          </h1>
          <p className="text-muted-foreground mt-1">
            Track equipment operator and labor certifications
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total</span>
              </div>
              <p className="text-2xl font-bold mt-1">{summary.total_certifications}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm text-muted-foreground">Valid</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-green-600">{summary.valid_count}</p>
            </CardContent>
          </Card>
          <Card className={summary.expiring_soon_count > 0 ? 'border-yellow-500' : ''}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className={cn(
                  'h-4 w-4',
                  summary.expiring_soon_count > 0 ? 'text-yellow-600' : 'text-muted-foreground'
                )} />
                <span className="text-sm text-muted-foreground">Expiring Soon</span>
              </div>
              <p className={cn(
                'text-2xl font-bold mt-1',
                summary.expiring_soon_count > 0 && 'text-yellow-600'
              )}>{summary.expiring_soon_count}</p>
            </CardContent>
          </Card>
          <Card className={summary.expired_count > 0 ? 'border-destructive' : ''}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <XCircle className={cn(
                  'h-4 w-4',
                  summary.expired_count > 0 ? 'text-destructive' : 'text-muted-foreground'
                )} />
                <span className="text-sm text-muted-foreground">Expired</span>
              </div>
              <p className={cn(
                'text-2xl font-bold mt-1',
                summary.expired_count > 0 && 'text-destructive'
              )}>{summary.expired_count}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Health Score</span>
                <span className={cn('text-lg font-bold', getHealthScoreColor(healthScore))}>
                  {healthScore}%
                </span>
              </div>
              <Progress
                value={healthScore}
                className="mt-2 h-2"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and View Controls */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Status Filter */}
            <div className="flex flex-wrap gap-2">
              {(['all', 'valid', 'expiring', 'expired', 'pending'] as const).map((filter) => (
                <Button
                  key={filter}
                  variant={statusFilter === filter ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(filter)}
                >
                  {filter === 'all' && 'All'}
                  {filter === 'valid' && 'Valid'}
                  {filter === 'expiring' && 'Expiring'}
                  {filter === 'expired' && 'Expired'}
                  {filter === 'pending' && 'Pending'}
                </Button>
              ))}
            </div>

            <div className="flex-1" />

            {/* Type Filter */}
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as TypeFilter)}
            >
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="flex gap-1 border rounded-md p-1">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8 w-8 p-0"
                title="List View"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'by-type' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('by-type')}
                className="h-8 w-8 p-0"
                title="Group by Type"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'by-holder' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('by-holder')}
                className="h-8 w-8 p-0"
                title="Group by Holder"
              >
                <Users className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Loading certifications...</div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredCertifications.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Certifications Found</h3>
              <p className="text-muted-foreground">
                {statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your filters to see more certifications.'
                  : 'Certifications for your team will appear here.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List View */}
      {!isLoading && filteredCertifications.length > 0 && viewMode === 'list' && (
        <div className="space-y-3">
          {filteredCertifications.map((cert) => (
            <CertificationCard key={cert.id} certification={cert} />
          ))}
        </div>
      )}

      {/* Group by Type View */}
      {!isLoading && filteredCertifications.length > 0 && viewMode === 'by-type' && (
        <div className="space-y-6">
          {Object.entries(certsByType).map(([type, certs]) => (
            <div key={type}>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                {getCertificationIcon(type as CertificationType)}
                {getCertificationTypeLabel(type as CertificationType)}
                <Badge variant="secondary">{certs.length}</Badge>
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                {certs.map((cert) => (
                  <CertificationCard key={cert.id} certification={cert} compact />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Group by Holder View */}
      {!isLoading && filteredCertifications.length > 0 && viewMode === 'by-holder' && (
        <div className="space-y-6">
          {Object.entries(certsByHolder).map(([holder, certs]) => (
            <Card key={holder}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  {holder}
                </CardTitle>
                <CardDescription>
                  {certs.length} certification(s)
                  {certs[0]?.holder_title && ` - ${certs[0].holder_title}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {certs.map((cert) => (
                    <CertificationCard key={cert.id} certification={cert} compact />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// Certification Card Component
interface CertificationCardProps {
  certification: SubcontractorCertification
  compact?: boolean
}

function CertificationCard({ certification: cert, compact = false }: CertificationCardProps) {
  const expirationText = getExpirationStatusText(cert)

  return (
    <Card className={cn(
      cert.status === 'expired' && 'border-destructive',
      cert.status === 'expiring_soon' && 'border-yellow-500'
    )}>
      <CardContent className={cn('pt-4', compact && 'p-3')}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              cert.status === 'valid' ? 'bg-green-100' :
              cert.status === 'expiring_soon' ? 'bg-yellow-100' :
              cert.status === 'expired' ? 'bg-red-100' : 'bg-muted'
            )}>
              {getCertificationIcon(cert.certification_type)}
            </div>
            <div>
              <h4 className={cn('font-medium', compact && 'text-sm')}>
                {cert.certification_name}
              </h4>
              <div className={cn(
                'text-muted-foreground mt-1 space-y-1',
                compact ? 'text-xs' : 'text-sm'
              )}>
                <p className="flex items-center gap-1">
                  <Award className="h-3 w-3" />
                  {getCertificationTypeLabel(cert.certification_type)}
                </p>
                {!compact && (
                  <>
                    <p className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {cert.holder_name}
                      {cert.holder_title && ` - ${cert.holder_title}`}
                    </p>
                    {cert.issuing_authority && (
                      <p className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {cert.issuing_authority}
                      </p>
                    )}
                    {cert.certificate_number && (
                      <p className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        #{cert.certificate_number}
                      </p>
                    )}
                  </>
                )}
                <p className={cn(
                  'flex items-center gap-1',
                  cert.status === 'expired' && 'text-destructive',
                  cert.status === 'expiring_soon' && 'text-yellow-600'
                )}>
                  <Calendar className="h-3 w-3" />
                  {expirationText}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={getCertificationStatusBadgeVariant(cert.status)}>
              {getCertificationStatusLabel(cert.status)}
            </Badge>
            {cert.document_url && (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="h-7 text-xs gap-1"
              >
                <a href={cert.document_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3" />
                  View
                </a>
              </Button>
            )}
          </div>
        </div>
        {!compact && cert.verified_at && cert.verified_by_name && (
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-600" />
            Verified by {cert.verified_by_name} on {formatCertificationDate(cert.verified_at)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
