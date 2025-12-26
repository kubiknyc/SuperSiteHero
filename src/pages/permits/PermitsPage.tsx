import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  FileCheck,
  Plus,
  Search,
  AlertTriangle,
  Calendar,
  Clock,
  Building2,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import {
  usePermits,
  usePermitStatistics,
  useCreatePermit,
} from '@/features/permits/hooks/usePermits'
import { useMyProjects } from '@/features/projects/hooks/useProjects'
import {
  PermitStatus,
  PermitType,
  getPermitStatusColor,
  getPermitStatusLabel,
  getPermitTypeLabel,
  getDaysUntilExpiration,
  isPermitExpired,
  isPermitExpiringSoon,
} from '@/types/permits'
import { logger } from '../../lib/utils/logger';


export function PermitsPage() {
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('project') || undefined
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // Form state for new permit
  const [newPermit, setNewPermit] = useState({
    project_id: projectId || '',
    permit_name: '',
    permit_type: PermitType.BUILDING,
    permit_number: '',
    status: PermitStatus.PENDING,
    issuing_agency: '',
    application_date: '',
    expiration_date: '',
    work_cannot_proceed_without: false,
    requires_inspections: false,
    notes: '',
  })

  const { data: permits, isLoading } = usePermits({
    project_id: projectId,
    status: statusFilter || undefined,
    permit_type: typeFilter || undefined,
    search: search || undefined,
  })
  const { data: projects } = useMyProjects()
  const { data: stats } = usePermitStatistics(projectId || '')
  const createPermit = useCreatePermit()

  const handleCreatePermit = async () => {
    if (!newPermit.permit_name || !newPermit.project_id) {return}

    try {
      await createPermit.mutateAsync({
        project_id: newPermit.project_id,
        permit_name: newPermit.permit_name,
        permit_type: newPermit.permit_type,
        permit_number: newPermit.permit_number || undefined,
        status: newPermit.status,
        issuing_agency: newPermit.issuing_agency || undefined,
        application_date: newPermit.application_date || undefined,
        expiration_date: newPermit.expiration_date || undefined,
        work_cannot_proceed_without: newPermit.work_cannot_proceed_without,
        requires_inspections: newPermit.requires_inspections,
        notes: newPermit.notes || undefined,
      })
      setShowCreateDialog(false)
      setNewPermit({
        project_id: projectId || '',
        permit_name: '',
        permit_type: PermitType.BUILDING,
        permit_number: '',
        status: PermitStatus.PENDING,
        issuing_agency: '',
        application_date: '',
        expiration_date: '',
        work_cannot_proceed_without: false,
        requires_inspections: false,
        notes: '',
      })
    } catch (error) {
      logger.error('Failed to create permit:', error)
    }
  }

  // Filter permits by search
  const filteredPermits = permits?.filter(permit => {
    if (search) {
      const searchLower = search.toLowerCase()
      return (
        permit.permit_name.toLowerCase().includes(searchLower) ||
        permit.permit_number?.toLowerCase().includes(searchLower) ||
        permit.issuing_agency?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 heading-page">
              <FileCheck className="h-6 w-6" />
              Permits
            </h1>
            <p className="text-muted mt-1">
              Track building permits, approvals, and renewals
            </p>
          </div>
          <Button className="gap-2" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4" />
            Add Permit
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-info-light rounded-lg">
                  <FileCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted">Total Permits</p>
                  <p className="text-2xl font-bold">{stats?.total || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success-light rounded-lg">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted">Active/Issued</p>
                  <p className="text-2xl font-bold">
                    {(stats?.by_status?.['active'] || 0) + (stats?.by_status?.['issued'] || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning-light rounded-lg">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted">Expiring Soon</p>
                  <p className="text-2xl font-bold">{stats?.expiring_soon || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-error-light rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-error" />
                </div>
                <div>
                  <p className="text-sm text-muted">Critical Pending</p>
                  <p className="text-2xl font-bold">{stats?.critical_permits || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-disabled" />
            <Input
              placeholder="Search permits..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="applied">Applied</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="issued">Issued</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="renewed">Renewed</option>
            <option value="revoked">Revoked</option>
            <option value="closed">Closed</option>
          </select>
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="building">Building</option>
            <option value="demolition">Demolition</option>
            <option value="electrical">Electrical</option>
            <option value="plumbing">Plumbing</option>
            <option value="mechanical">Mechanical</option>
            <option value="fire">Fire</option>
            <option value="grading">Grading</option>
            <option value="excavation">Excavation</option>
            <option value="encroachment">Encroachment</option>
            <option value="signage">Signage</option>
            <option value="environmental">Environmental</option>
            <option value="stormwater">Stormwater</option>
            <option value="temporary">Temporary</option>
            <option value="occupancy">Certificate of Occupancy</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Permits List */}
        <Card>
          <CardHeader>
            <CardTitle>Permits List</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted">Loading permits...</div>
            ) : filteredPermits?.length === 0 ? (
              <div className="text-center py-8">
                <FileCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-muted">No permits found</p>
                <p className="text-sm text-disabled">Add permits to get started</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredPermits?.map((permit) => {
                  const daysUntilExpiration = getDaysUntilExpiration(permit)
                  const expired = isPermitExpired(permit)
                  const expiringSoon = isPermitExpiringSoon(permit)

                  return (
                    <Link
                      key={permit.id}
                      to={`/permits/${permit.id}`}
                      className="block py-4 hover:bg-surface px-2 -mx-2 rounded cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${
                            permit.work_cannot_proceed_without
                              ? 'bg-error-light'
                              : 'bg-muted'
                          }`}>
                            <FileCheck className={`h-6 w-6 ${
                              permit.work_cannot_proceed_without
                                ? 'text-error'
                                : 'text-secondary'
                            }`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium heading-subsection">{permit.permit_name}</h3>
                              {permit.work_cannot_proceed_without && (
                                <AlertCircle className="h-4 w-4 text-error" aria-label="Critical - Work cannot proceed without this permit" />
                              )}
                            </div>
                            <p className="text-sm text-muted">
                              {permit.permit_number && `#${permit.permit_number}`}
                              {permit.permit_number && permit.issuing_agency && ' | '}
                              {permit.issuing_agency}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {getPermitTypeLabel(permit.permit_type)}
                              </Badge>
                              {permit.project && (
                                <span className="text-xs text-disabled flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {permit.project.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            {permit.expiration_date && (
                              <p className={`text-sm flex items-center gap-1 ${
                                expired ? 'text-error' : expiringSoon ? 'text-warning' : 'text-muted'
                              }`}>
                                <Calendar className="h-3 w-3" />
                                {expired ? 'Expired' : expiringSoon ? `${daysUntilExpiration} days left` : new Date(permit.expiration_date).toLocaleDateString()}
                              </p>
                            )}
                            {permit.requires_inspections && (
                              <p className="text-xs text-disabled">Requires inspections</p>
                            )}
                          </div>
                          <Badge className={getPermitStatusColor(permit.status)}>
                            {getPermitStatusLabel(permit.status)}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Permit Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Permit</DialogTitle>
              <DialogDescription>
                Create a new permit to track for your project.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="project">Project *</Label>
                <select
                  id="project"
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={newPermit.project_id}
                  onChange={(e) => setNewPermit({ ...newPermit, project_id: e.target.value })}
                >
                  <option value="">Select Project</option>
                  {projects?.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="permit_name">Permit Name *</Label>
                <Input
                  id="permit_name"
                  placeholder="e.g., Building Permit - Phase 1"
                  value={newPermit.permit_name}
                  onChange={(e) => setNewPermit({ ...newPermit, permit_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="permit_type">Permit Type</Label>
                  <select
                    id="permit_type"
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    value={newPermit.permit_type}
                    onChange={(e) => setNewPermit({ ...newPermit, permit_type: e.target.value as PermitType })}
                  >
                    {Object.values(PermitType).map(type => (
                      <option key={type} value={type}>{getPermitTypeLabel(type)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="permit_number">Permit Number</Label>
                  <Input
                    id="permit_number"
                    placeholder="e.g., BLD-2024-0001"
                    value={newPermit.permit_number}
                    onChange={(e) => setNewPermit({ ...newPermit, permit_number: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="issuing_agency">Issuing Agency</Label>
                <Input
                  id="issuing_agency"
                  placeholder="e.g., City Planning Department"
                  value={newPermit.issuing_agency}
                  onChange={(e) => setNewPermit({ ...newPermit, issuing_agency: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="application_date">Application Date</Label>
                  <Input
                    id="application_date"
                    type="date"
                    value={newPermit.application_date}
                    onChange={(e) => setNewPermit({ ...newPermit, application_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiration_date">Expiration Date</Label>
                  <Input
                    id="expiration_date"
                    type="date"
                    value={newPermit.expiration_date}
                    onChange={(e) => setNewPermit({ ...newPermit, expiration_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newPermit.work_cannot_proceed_without}
                    onChange={(e) => setNewPermit({ ...newPermit, work_cannot_proceed_without: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Critical - Work cannot proceed without</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newPermit.requires_inspections}
                    onChange={(e) => setNewPermit({ ...newPermit, requires_inspections: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Requires inspections</span>
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreatePermit}
                disabled={!newPermit.permit_name || !newPermit.project_id || createPermit.isPending}
              >
                {createPermit.isPending ? 'Creating...' : 'Create Permit'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}

export default PermitsPage
