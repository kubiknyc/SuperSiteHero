// File: /src/pages/payment-applications/PaymentApplicationsPage.tsx
// Payment Applications list page with project filtering and status overview
// Implements AIA G702/G703 billing workflow

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { AppLayout } from '@/components/layout/AppLayout'
import { useProjects } from '@/features/projects/hooks/useProjects'
import {
  useProjectPaymentApplications,
  useProjectPaymentSummary,
  formatCurrency,
  formatPercent,
  getStatusColor,
  PAYMENT_APPLICATION_STATUSES,
} from '@/features/payment-applications/hooks/usePaymentApplications'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import {
  Plus,
  AlertCircle,
  Loader2,
  Search,
  FileText,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  ChevronRight,
  TrendingUp,
  Banknote,
  Receipt,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PaymentApplicationStatus, PaymentApplicationWithDetails } from '@/types/payment-application'

export function PaymentApplicationsPage() {
  const navigate = useNavigate()
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<PaymentApplicationStatus | 'all'>('all')

  // Fetch data
  const { data: projects, isLoading: projectsLoading } = useProjects()
  const { data: applications, isLoading: applicationsLoading, error } = useProjectPaymentApplications(
    selectedProjectId || undefined
  )
  const summary = useProjectPaymentSummary(selectedProjectId || undefined)

  // Filter applications
  const filteredApplications = useMemo(() => {
    if (!applications) {return []}

    return applications.filter((app) => {
      // Search filter
      const matchesSearch =
        !searchTerm ||
        app.display_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.notes?.toLowerCase().includes(searchTerm.toLowerCase())

      // Status filter
      const matchesStatus = statusFilter === 'all' || app.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [applications, searchTerm, statusFilter])

  // Group by status for quick stats
  const statusCounts = useMemo(() => {
    if (!applications) {return {}}
    return applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }, [applications])

  const getStatusBadge = (status: PaymentApplicationStatus) => {
    const config = PAYMENT_APPLICATION_STATUSES.find((s) => s.value === status)
    const colorMap: Record<string, string> = {
      gray: 'bg-muted text-secondary',
      blue: 'bg-info-light text-primary-hover',
      yellow: 'bg-warning-light text-yellow-700',
      green: 'bg-success-light text-success-dark',
      red: 'bg-error-light text-error-dark',
      emerald: 'bg-emerald-100 text-emerald-700',
    }
    return (
      <Badge className={cn('font-medium', colorMap[config?.color || 'gray'])}>
        {config?.label || status}
      </Badge>
    )
  }

  const renderApplicationCard = (app: PaymentApplicationWithDetails) => {
    return (
      <div
        key={app.id}
        className="py-4 px-4 hover:bg-surface cursor-pointer rounded-lg transition-colors border-b last:border-b-0"
        onClick={() => navigate(`/payment-applications/${app.id}`)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-semibold text-lg">{app.display_number}</span>
              {getStatusBadge(app.status)}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {/* Period */}
              <div>
                <span className="text-muted">Period To:</span>
                <p className="font-medium">{format(new Date(app.period_to), 'MMM d, yyyy')}</p>
              </div>

              {/* Current Payment Due */}
              <div>
                <span className="text-muted">Payment Due:</span>
                <p className="font-medium text-success-dark">{formatCurrency(app.current_payment_due)}</p>
              </div>

              {/* Percent Complete */}
              <div>
                <span className="text-muted">% Complete:</span>
                <p className="font-medium">{formatPercent(app.percent_complete)}</p>
              </div>

              {/* Contract Sum */}
              <div>
                <span className="text-muted">Contract Sum:</span>
                <p className="font-medium">{formatCurrency(app.contract_sum_to_date)}</p>
              </div>
            </div>

            {app.status === 'paid' && app.payment_received_amount && (
              <div className="mt-2 text-sm text-emerald-600 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Paid: {formatCurrency(app.payment_received_amount)}
                {app.payment_reference && ` (${app.payment_reference})`}
              </div>
            )}

            {app.status === 'rejected' && app.rejection_reason && (
              <div className="mt-2 text-sm text-error">
                Rejection reason: {app.rejection_reason}
              </div>
            )}
          </div>

          <ChevronRight className="h-5 w-5 text-disabled mt-2" />
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2 heading-page">
              <Receipt className="h-7 w-7 text-success" />
              Payment Applications
            </h1>
            <p className="text-secondary mt-1">
              AIA G702/G703 billing workflow
            </p>
          </div>

          <Button
            onClick={() => navigate('/payment-applications/new')}
            disabled={!selectedProjectId}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Application
          </Button>
        </div>

        {/* Project Selector */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="project-select" className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4" />
                  Select Project
                </Label>
                <Select
                  id="project-select"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  disabled={projectsLoading}
                >
                  <option value="">Select a project...</option>
                  {projects?.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {selectedProjectId && summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-secondary mb-1">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">Total Applications</span>
                </div>
                <p className="text-2xl font-bold">{summary.total_applications}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-secondary mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">Total Billed</span>
                </div>
                <p className="text-2xl font-bold text-primary">{formatCurrency(summary.total_billed)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-secondary mb-1">
                  <Banknote className="h-4 w-4" />
                  <span className="text-sm">Total Received</span>
                </div>
                <p className="text-2xl font-bold text-success">{formatCurrency(summary.total_received)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-secondary mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Outstanding</span>
                </div>
                <p className="text-2xl font-bold text-warning">{formatCurrency(summary.total_outstanding)}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Retainage Info */}
        {selectedProjectId && summary && summary.total_retainage_held > 0 && (
          <Card className="border-amber-200 bg-warning-light">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-warning" />
                  <span className="font-medium text-amber-800">Retainage Held</span>
                </div>
                <span className="text-xl font-bold text-amber-700">
                  {formatCurrency(summary.total_retainage_held)}
                </span>
              </div>
              <p className="text-sm text-warning mt-1">
                {formatPercent(summary.percent_billed)} of contract billed
              </p>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        {selectedProjectId && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-disabled" />
                    <Input
                      type="text"
                      placeholder="Search applications..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div className="w-full md:w-48">
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as PaymentApplicationStatus | 'all')}
                  >
                    <option value="all">All Statuses</option>
                    {PAYMENT_APPLICATION_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label} ({statusCounts[status.value] || 0})
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Applications List */}
        {!selectedProjectId ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2 heading-subsection">Select a Project</h3>
              <p className="text-muted">
                Choose a project above to view and manage payment applications
              </p>
            </CardContent>
          </Card>
        ) : applicationsLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-disabled mb-4" />
              <p className="text-muted">Loading payment applications...</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border-red-200 bg-error-light">
            <CardContent className="py-8 text-center">
              <AlertCircle className="h-8 w-8 mx-auto text-error mb-4" />
              <h3 className="text-lg font-medium text-red-800 mb-2 heading-subsection">Error Loading Applications</h3>
              <p className="text-error">{error.message}</p>
            </CardContent>
          </Card>
        ) : filteredApplications.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Receipt className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2 heading-subsection">No Payment Applications</h3>
              <p className="text-muted mb-4">
                {searchTerm || statusFilter !== 'all'
                  ? 'No applications match your filters'
                  : 'Create your first payment application to start billing'}
              </p>
              <Button onClick={() => navigate('/payment-applications/new')} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Application
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Payment Applications ({filteredApplications.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {filteredApplications.map(renderApplicationCard)}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}

export default PaymentApplicationsPage
