// File: /src/pages/change-orders/ChangeOrdersPage.tsx
// Change orders list and management page - V2 (uses dedicated change_orders table)

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { AppLayout } from '@/components/layout/AppLayout'
import { useMyProjects } from '@/features/projects/hooks/useProjects'
import {
  useChangeOrdersV2,
  useChangeOrderStatisticsV2,
} from '@/features/change-orders/hooks/useChangeOrdersV2'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NativeSelect as Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FileEdit,
  DollarSign,
  Clock,
  AlertCircle,
  Plus,
  Search,
  ChevronRight,
  User,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  formatChangeOrderNumber,
  getChangeTypeLabel,
  getChangeOrderStatusLabel,
  getChangeOrderStatusColor,
  type ChangeOrder,
} from '@/types/change-order'

// Status configuration for filters
const CHANGE_ORDER_STATUSES = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_estimate', label: 'Pending Estimate' },
  { value: 'estimate_complete', label: 'Estimate Complete' },
  { value: 'pending_internal_approval', label: 'Pending Internal' },
  { value: 'internally_approved', label: 'Internally Approved' },
  { value: 'pending_owner_review', label: 'Pending Owner' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'void', label: 'Void' },
]

// Change type configuration for filters
const CHANGE_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'scope_change', label: 'Scope Change' },
  { value: 'design_clarification', label: 'Design Clarification' },
  { value: 'unforeseen_condition', label: 'Unforeseen Condition' },
  { value: 'owner_request', label: 'Owner Request' },
  { value: 'value_engineering', label: 'Value Engineering' },
  { value: 'error_omission', label: 'Error/Omission' },
]

export function ChangeOrdersPage() {
  const navigate = useNavigate()
  const { data: projects } = useMyProjects()
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'pco' | 'co'>('all')

  // Use the selected project or first active project
  const activeProjectId =
    selectedProjectId || projects?.find((p) => p.status === 'active')?.id || projects?.[0]?.id

  // Build filters based on active tab
  const filters = useMemo(() => {
    const f: Record<string, any> = {}
    if (activeProjectId) {f.project_id = activeProjectId}
    if (statusFilter !== 'all') {f.status = statusFilter}
    if (typeFilter !== 'all') {f.change_type = typeFilter}
    if (searchQuery) {f.search = searchQuery}

    // PCO vs CO tab filtering
    if (activeTab === 'pco') {f.is_pco = true}
    if (activeTab === 'co') {f.is_pco = false}

    return f
  }, [activeProjectId, statusFilter, typeFilter, searchQuery, activeTab])

  // Fetch change orders using V2 hooks
  const { data: changeOrders, isLoading, error } = useChangeOrdersV2(filters)
  const { data: statistics } = useChangeOrderStatisticsV2(activeProjectId)

  // Format currency
  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) {return 'TBD'}
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Render a single change order card
  const renderChangeOrderCard = (co: ChangeOrder) => {
    const displayNumber = formatChangeOrderNumber(co)

    return (
      <div
        key={co.id}
        className="py-4 px-4 hover:bg-surface cursor-pointer rounded-lg transition-colors border-b last:border-b-0"
        onClick={() => navigate(`/change-orders/${co.id}`)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Header Row */}
            <div className="flex items-center gap-3 mb-2">
              <span className="font-semibold text-lg">{displayNumber}</span>
              <Badge className={cn('font-medium', getChangeOrderStatusColor(co.status))}>
                {getChangeOrderStatusLabel(co.status)}
              </Badge>
              {co.is_pco ? (
                <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50">
                  PCO
                </Badge>
              ) : (
                <Badge variant="outline" className="border-green-300 text-success-dark bg-success-light">
                  CO
                </Badge>
              )}
              <Badge variant="outline" className="text-secondary">
                {getChangeTypeLabel(co.change_type)}
              </Badge>
            </div>

            {/* Title */}
            <p className="text-foreground font-medium mb-2">{co.title}</p>

            {/* Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {/* Proposed Amount */}
              <div>
                <span className="text-muted">Proposed:</span>
                <p className="font-medium text-primary-hover">{formatCurrency(co.proposed_amount)}</p>
              </div>

              {/* Approved Amount (if approved) */}
              {co.approved_amount !== null && (
                <div>
                  <span className="text-muted">Approved:</span>
                  <p className="font-medium text-success-dark">{formatCurrency(co.approved_amount)}</p>
                </div>
              )}

              {/* Time Impact */}
              {(co.proposed_days > 0 || (co.approved_days && co.approved_days > 0)) && (
                <div>
                  <span className="text-muted">Days Impact:</span>
                  <p className="font-medium">
                    {co.approved_days !== null ? co.approved_days : co.proposed_days} days
                  </p>
                </div>
              )}

              {/* Date Created */}
              <div>
                <span className="text-muted">Created:</span>
                <p className="font-medium">
                  {co.date_created
                    ? format(new Date(co.date_created), 'MMM d, yyyy')
                    : format(new Date(co.created_at), 'MMM d, yyyy')}
                </p>
              </div>
            </div>

            {/* Ball-in-Court Indicator */}
            {co.ball_in_court_user && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-orange-500" />
                <span className="text-orange-700 font-medium">
                  Ball in court: {co.ball_in_court_user.full_name}
                </span>
                {co.ball_in_court_role && (
                  <Badge variant="outline" className="text-xs">
                    {co.ball_in_court_role}
                  </Badge>
                )}
              </div>
            )}

            {/* Description Preview */}
            {co.description && (
              <p className="mt-2 text-sm text-secondary line-clamp-2">{co.description}</p>
            )}
          </div>

          <ChevronRight className="h-5 w-5 text-disabled mt-2 flex-shrink-0" />
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2 heading-page">
              <FileEdit className="h-8 w-8 text-primary" />
              Change Orders
            </h1>
            <p className="text-secondary mt-1">
              PCO → CO workflow with multi-level approval
            </p>
          </div>
          {activeProjectId && (
            <Button onClick={() => navigate('/change-orders/new')} className="gap-2">
              <Plus className="h-4 w-4" />
              New Change Order
            </Button>
          )}
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-secondary mb-1">
                  <FileEdit className="h-4 w-4" />
                  <span className="text-sm">Total</span>
                </div>
                <p className="text-2xl font-bold">{statistics.total_count}</p>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-orange-700 mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">PCOs</span>
                </div>
                <p className="text-2xl font-bold text-orange-700">{statistics.pco_count}</p>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-success-light">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-success-dark mb-1">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Approved COs</span>
                </div>
                <p className="text-2xl font-bold text-success-dark">{statistics.approved_co_count}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-secondary mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">Proposed</span>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(statistics.total_proposed_amount)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-secondary mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">Approved</span>
                </div>
                <p className="text-2xl font-bold text-success">
                  {formatCurrency(statistics.total_approved_amount)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Pending Counts */}
        {statistics && (statistics.pending_internal > 0 || statistics.pending_owner > 0) && (
          <div className="flex gap-4">
            {statistics.pending_internal > 0 && (
              <Badge variant="outline" className="px-3 py-1 border-orange-300 bg-orange-50 text-orange-700">
                <Clock className="h-3 w-3 mr-1" />
                {statistics.pending_internal} pending internal approval
              </Badge>
            )}
            {statistics.pending_owner > 0 && (
              <Badge variant="outline" className="px-3 py-1 border-purple-300 bg-purple-50 text-purple-700">
                <Clock className="h-3 w-3 mr-1" />
                {statistics.pending_owner} pending owner approval
              </Badge>
            )}
          </div>
        )}

        {/* PCO vs CO Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'pco' | 'co')}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pco" className="gap-1">
              <span className="hidden sm:inline">Potential</span> PCOs
              {statistics?.pco_count ? (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {statistics.pco_count}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="co" className="gap-1">
              Approved COs
              {statistics?.approved_co_count ? (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {statistics.approved_co_count}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {/* Project selector */}
              {projects && projects.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="project-select">Project</Label>
                  <Select
                    id="project-select"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                  >
                    <option value="">All Projects</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              {/* Status filter */}
              <div className="space-y-2">
                <Label htmlFor="status-filter">Status</Label>
                <Select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  {CHANGE_ORDER_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Change Type filter */}
              <div className="space-y-2">
                <Label htmlFor="type-filter">Change Type</Label>
                <Select
                  id="type-filter"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  {CHANGE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-disabled" />
                  <Input
                    id="search"
                    type="text"
                    placeholder="Search title, number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading state */}
        {isLoading && (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-disabled mb-4" />
              <p className="text-muted">Loading change orders...</p>
            </CardContent>
          </Card>
        )}

        {/* Error state */}
        {error && (
          <Card className="border-red-200 bg-error-light">
            <CardContent className="py-8 text-center">
              <AlertCircle className="h-8 w-8 mx-auto text-error mb-4" />
              <h3 className="text-lg font-medium text-red-800 mb-2 heading-subsection">Error Loading Change Orders</h3>
              <p className="text-error">{error.message}</p>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!isLoading && !error && (!changeOrders || changeOrders.length === 0) && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <FileEdit className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2 heading-subsection">
                {activeTab === 'pco'
                  ? 'No PCOs found'
                  : activeTab === 'co'
                  ? 'No approved COs found'
                  : 'No change orders yet'}
              </h3>
              <p className="text-muted mb-6">
                {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your filters to see more results.'
                  : 'Create your first change order to track scope changes and cost adjustments.'}
              </p>
              {activeProjectId && (
                <Button onClick={() => navigate('/change-orders/new')} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Change Order
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Change Orders List */}
        {!isLoading && !error && changeOrders && changeOrders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>
                  {changeOrders.length} Change Order{changeOrders.length !== 1 ? 's' : ''}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">{changeOrders.map(renderChangeOrderCard)}</CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
