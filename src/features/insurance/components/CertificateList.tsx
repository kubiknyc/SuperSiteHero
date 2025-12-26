/**
 * Certificate List Component
 * Displays a sortable/filterable table of insurance certificates
 */

import { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search,
  SortAsc,
  SortDesc,
  MoreVertical,
  Edit,
  Trash2,
  Ban,
  ExternalLink,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react'
import {
  useInsuranceCertificates,
  useDeleteInsuranceCertificate,
  useVoidInsuranceCertificate,
} from '../hooks/useInsurance'
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
import { useToast } from '@/components/ui/use-toast'

interface CertificateListProps {
  projectId?: string
  subcontractorId?: string
  onEdit?: (certificate: InsuranceCertificateWithRelations) => void
  onViewDocument?: (certificate: InsuranceCertificateWithRelations) => void
  showSubcontractor?: boolean
  showProject?: boolean
}

type SortField = 'expiration_date' | 'insurance_type' | 'carrier_name' | 'status'
type SortDirection = 'asc' | 'desc'

const statusConfig: Record<CertificateStatus, { icon: typeof CheckCircle; color: string }> = {
  active: { icon: CheckCircle, color: 'text-success' },
  expiring_soon: { icon: Clock, color: 'text-warning' },
  expired: { icon: AlertTriangle, color: 'text-error' },
  pending_renewal: { icon: Clock, color: 'text-primary' },
  void: { icon: XCircle, color: 'text-muted-foreground' },
}

export function CertificateList({
  projectId,
  subcontractorId,
  onEdit,
  onViewDocument,
  showSubcontractor = true,
  showProject = false,
}: CertificateListProps) {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<CertificateStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<InsuranceType | 'all'>('all')
  const [sortField, setSortField] = useState<SortField>('expiration_date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const { data: certificates, isLoading } = useInsuranceCertificates({
    projectId,
    subcontractorId,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    insuranceType: typeFilter !== 'all' ? typeFilter : undefined,
  })

  const deleteMutation = useDeleteInsuranceCertificate()
  const voidMutation = useVoidInsuranceCertificate()

  const filteredAndSorted = useMemo(() => {
    if (!certificates) {return []}

    let filtered = certificates

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (cert) =>
          cert.carrier_name.toLowerCase().includes(searchLower) ||
          cert.certificate_number.toLowerCase().includes(searchLower) ||
          cert.policy_number.toLowerCase().includes(searchLower) ||
          cert.subcontractor?.company_name?.toLowerCase().includes(searchLower) ||
          INSURANCE_TYPE_LABELS[cert.insurance_type].toLowerCase().includes(searchLower)
      )
    }

    // Sort
    return [...filtered].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'expiration_date':
          comparison = new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime()
          break
        case 'insurance_type':
          comparison = INSURANCE_TYPE_LABELS[a.insurance_type].localeCompare(
            INSURANCE_TYPE_LABELS[b.insurance_type]
          )
          break
        case 'carrier_name':
          comparison = a.carrier_name.localeCompare(b.carrier_name)
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [certificates, search, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleDelete = async (cert: InsuranceCertificateWithRelations) => {
    if (!confirm('Are you sure you want to delete this certificate?')) {return}
    try {
      await deleteMutation.mutateAsync(cert.id)
      toast({ title: 'Certificate deleted', description: 'The certificate has been removed.' })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete certificate.',
        variant: 'destructive',
      })
    }
  }

  const handleVoid = async (cert: InsuranceCertificateWithRelations) => {
    const reason = prompt('Enter reason for voiding this certificate:')
    if (!reason) {return}
    try {
      await voidMutation.mutateAsync({ certificateId: cert.id, reason })
      toast({ title: 'Certificate voided', description: 'The certificate has been marked as void.' })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to void certificate.',
        variant: 'destructive',
      })
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {return null}
    return sortDirection === 'asc' ? (
      <SortAsc className="h-4 w-4 ml-1" />
    ) : (
      <SortDesc className="h-4 w-4 ml-1" />
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="border rounded-lg">
          <Skeleton className="h-12 w-full" />
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search certificates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as CertificateStatus | 'all')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="pending_renewal">Pending Renewal</SelectItem>
            <SelectItem value="void">Void</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as InsuranceType | 'all')}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="general_liability">General Liability</SelectItem>
            <SelectItem value="auto_liability">Auto Liability</SelectItem>
            <SelectItem value="workers_compensation">Workers' Comp</SelectItem>
            <SelectItem value="umbrella">Umbrella</SelectItem>
            <SelectItem value="professional_liability">Professional Liability</SelectItem>
            <SelectItem value="builders_risk">Builder's Risk</SelectItem>
            <SelectItem value="pollution">Pollution</SelectItem>
            <SelectItem value="cyber">Cyber</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead
                className="cursor-pointer hover:bg-muted"
                onClick={() => handleSort('insurance_type')}
              >
                <div className="flex items-center">
                  Type
                  <SortIcon field="insurance_type" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted"
                onClick={() => handleSort('carrier_name')}
              >
                <div className="flex items-center">
                  Carrier
                  <SortIcon field="carrier_name" />
                </div>
              </TableHead>
              {showSubcontractor && <TableHead>Subcontractor</TableHead>}
              {showProject && <TableHead>Project</TableHead>}
              <TableHead>Policy #</TableHead>
              <TableHead>Coverage</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted"
                onClick={() => handleSort('expiration_date')}
              >
                <div className="flex items-center">
                  Expiration
                  <SortIcon field="expiration_date" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center">
                  Status
                  <SortIcon field="status" />
                </div>
              </TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showSubcontractor && showProject ? 9 : showSubcontractor || showProject ? 8 : 7} className="text-center py-8">
                  <div className="flex flex-col items-center text-muted-foreground">
                    <FileCheck className="h-8 w-8 mb-2" />
                    <p>No certificates found</p>
                    {search && <p className="text-sm">Try adjusting your search or filters</p>}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSorted.map((cert) => {
                const daysUntilExpiry = getDaysUntilExpiry(cert.expiration_date)
                const StatusIcon = statusConfig[cert.status].icon

                return (
                  <TableRow key={cert.id} className="hover:bg-muted/50">
                    <TableCell>
                      <span className="font-medium">{INSURANCE_TYPE_LABELS[cert.insurance_type]}</span>
                    </TableCell>
                    <TableCell>{cert.carrier_name}</TableCell>
                    {showSubcontractor && (
                      <TableCell>
                        {cert.subcontractor?.company_name || '-'}
                      </TableCell>
                    )}
                    {showProject && (
                      <TableCell>
                        {cert.project?.name || '-'}
                      </TableCell>
                    )}
                    <TableCell className="font-mono text-sm">{cert.policy_number}</TableCell>
                    <TableCell>
                      {cert.each_occurrence_limit
                        ? formatInsuranceLimit(cert.each_occurrence_limit)
                        : cert.combined_single_limit
                          ? formatInsuranceLimit(cert.combined_single_limit)
                          : '-'}
                    </TableCell>
                    <TableCell>
                      <div
                        className={cn(
                          'whitespace-nowrap',
                          daysUntilExpiry < 0
                            ? 'text-error font-medium'
                            : daysUntilExpiry <= 30
                              ? 'text-warning'
                              : ''
                        )}
                      >
                        {formatDate(cert.expiration_date)}
                        {daysUntilExpiry >= 0 && daysUntilExpiry <= 30 && (
                          <span className="text-xs ml-1">({daysUntilExpiry}d)</span>
                        )}
                        {daysUntilExpiry < 0 && (
                          <span className="text-xs ml-1">({Math.abs(daysUntilExpiry)}d ago)</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          cert.status === 'active'
                            ? 'default'
                            : cert.status === 'expired'
                              ? 'destructive'
                              : 'secondary'
                        }
                        className="whitespace-nowrap"
                      >
                        <StatusIcon className={cn('h-3 w-3 mr-1', statusConfig[cert.status].color)} />
                        {CERTIFICATE_STATUS_LABELS[cert.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {cert.certificate_url && (
                            <DropdownMenuItem onClick={() => onViewDocument?.(cert)}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Document
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => onEdit?.(cert)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {cert.status !== 'void' && (
                            <DropdownMenuItem
                              onClick={() => handleVoid(cert)}
                              className="text-warning"
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Void
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDelete(cert)}
                            className="text-error"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredAndSorted.length} of {certificates?.length || 0} certificates
      </div>
    </div>
  )
}
