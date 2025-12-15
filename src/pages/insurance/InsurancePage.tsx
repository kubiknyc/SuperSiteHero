/**
 * Insurance Tracking Page
 * Main page for insurance certificate management and compliance monitoring
 */

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Shield,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Download,
  LayoutDashboard,
  List,
  FileCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  InsuranceComplianceDashboard,
  InsuranceCertificateCard,
  InsuranceCertificateForm,
} from '@/features/insurance/components'
import {
  useInsuranceCertificates,
  useDeleteInsuranceCertificate,
} from '@/features/insurance/hooks'
import {
  type InsuranceCertificateWithRelations,
  type ExpiringCertificate,
  type InsuranceType,
  type CertificateStatus,
  INSURANCE_TYPE_LABELS,
  CERTIFICATE_STATUS_LABELS,
} from '@/types/insurance'

type ViewMode = 'dashboard' | 'list'
type FilterStatus = CertificateStatus | 'all'
type FilterType = InsuranceType | 'all'

export function InsurancePage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [typeFilter, setTypeFilter] = useState<FilterType>('all')
  const [showFormDialog, setShowFormDialog] = useState(false)
  const [editingCertificate, setEditingCertificate] = useState<InsuranceCertificateWithRelations | undefined>(undefined)

  // Queries
  const {
    data: certificates,
    isLoading,
    refetch,
  } = useInsuranceCertificates({
    projectId,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    insuranceType: typeFilter !== 'all' ? typeFilter : undefined,
  })

  // Mutations
  const deleteCertificate = useDeleteInsuranceCertificate()

  // Filter certificates by search
  const filteredCertificates = certificates?.filter((cert) => {
    if (!searchQuery) {return true}
    const query = searchQuery.toLowerCase()
    return (
      cert.certificate_number.toLowerCase().includes(query) ||
      cert.carrier_name.toLowerCase().includes(query) ||
      cert.policy_number.toLowerCase().includes(query) ||
      cert.subcontractor?.company_name?.toLowerCase().includes(query) ||
      INSURANCE_TYPE_LABELS[cert.insurance_type].toLowerCase().includes(query)
    )
  })

  const handleViewCertificate = (cert: ExpiringCertificate) => {
    // Find the full certificate and open edit dialog
    const fullCert = certificates?.find((c) => c.id === cert.id)
    if (fullCert) {
      setEditingCertificate(fullCert)
      setShowFormDialog(true)
    }
  }

  const handleViewSubcontractor = (subcontractorId: string) => {
    navigate(`/subcontractors/${subcontractorId}`)
  }

  const handleOpenAddDialog = () => {
    setEditingCertificate(undefined)
    setShowFormDialog(true)
  }

  const handleCloseDialog = () => {
    setShowFormDialog(false)
    setEditingCertificate(undefined)
    refetch()
  }

  const handleEditCertificate = (cert: InsuranceCertificateWithRelations) => {
    setEditingCertificate(cert)
    setShowFormDialog(true)
  }

  const handleDeleteCertificate = async (cert: InsuranceCertificateWithRelations) => {
    try {
      await deleteCertificate.mutateAsync(cert.id)
      toast.success('Certificate deleted successfully')
      refetch()
    } catch {
      toast.error('Failed to delete certificate')
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Insurance Tracking
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage certificates of insurance and monitor compliance
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="border rounded-lg p-1 flex">
            <Button
              variant={viewMode === 'dashboard' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('dashboard')}
            >
              <LayoutDashboard className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button onClick={handleOpenAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Certificate
          </Button>
        </div>
      </div>

      {/* Dashboard View */}
      {viewMode === 'dashboard' && (
        <InsuranceComplianceDashboard
          onViewCertificate={handleViewCertificate}
          onViewSubcontractor={handleViewSubcontractor}
          onViewAllAlerts={() => setViewMode('list')}
        />
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <>
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search certificates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FilterStatus)}>
                    <SelectTrigger className="w-[160px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {Object.entries(CERTIFICATE_STATUS_LABELS).map(([status, label]) => (
                        <SelectItem key={status} value={status}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as FilterType)}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Insurance Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {Object.entries(INSURANCE_TYPE_LABELS).map(([type, label]) => (
                        <SelectItem key={type} value={type}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button variant="outline" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Certificates List */}
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredCertificates && filteredCertificates.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredCertificates.map((cert) => (
                <InsuranceCertificateCard
                  key={cert.id}
                  certificate={cert}
                  onEdit={handleEditCertificate}
                  onDelete={handleDeleteCertificate}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileCheck className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                <h3 className="text-lg font-medium mb-2">No certificates found</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Add your first insurance certificate to get started'}
                </p>
                <Button onClick={handleOpenAddDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Certificate
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Add/Edit Certificate Dialog */}
      <InsuranceCertificateForm
        open={showFormDialog}
        onClose={handleCloseDialog}
        certificate={editingCertificate}
        defaultProjectId={projectId}
      />
    </div>
  )
}

export default InsurancePage
