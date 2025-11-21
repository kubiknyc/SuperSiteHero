// File: /src/pages/change-orders/ChangeOrdersPage.tsx
// Change orders list and management page

import { useState, useMemo } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { useMyProjects } from '@/features/projects/hooks/useProjects'
import { useChangeOrders } from '@/features/change-orders/hooks/useChangeOrders'
import { ChangeOrdersList } from '@/features/change-orders/components/ChangeOrdersList'
import { CreateChangeOrderDialog } from '@/features/change-orders/components/CreateChangeOrderDialog'
import { Card, CardContent } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileEdit, DollarSign, Clock, AlertCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth/AuthContext'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'

export function ChangeOrdersPage() {
  const { userProfile } = useAuth()
  const { data: projects } = useMyProjects()
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Use the selected project or first active project
  const activeProjectId = selectedProjectId || projects?.find((p) => p.status === 'active')?.id || projects?.[0]?.id

  // Get the Change Order workflow type ID
  const { data: workflowType } = useQuery({
    queryKey: ['workflow-type-change-order', userProfile?.company_id],
    queryFn: async () => {
      if (!userProfile?.company_id) throw new Error('No company ID found')

      const { data, error } = await supabase
        .from('workflow_types')
        .select('id, name_singular, prefix')
        .eq('company_id', userProfile.company_id)
        .ilike('name_singular', '%change%order%')
        .single()

      if (error) throw error
      return data
    },
    enabled: !!userProfile?.company_id,
  })

  const { data: changeOrders, isLoading, error } = useChangeOrders(activeProjectId)

  // Filter change orders
  const filteredChangeOrders = useMemo(() => {
    if (!changeOrders) return []

    return changeOrders.filter((co) => {
      // Status filter
      if (statusFilter !== 'all' && co.status !== statusFilter) return false

      // Priority filter
      if (priorityFilter !== 'all' && co.priority !== priorityFilter) return false

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const title = co.title?.toLowerCase() || ''
        const description = co.description?.toLowerCase() || ''
        const number = `${co.workflow_type?.prefix || 'CO'}-${String(co.number).padStart(3, '0')}`.toLowerCase()

        if (!title.includes(query) && !description.includes(query) && !number.includes(query)) {
          return false
        }
      }

      return true
    })
  }, [changeOrders, statusFilter, priorityFilter, searchQuery])

  // Calculate statistics
  const stats = useMemo(() => {
    if (!filteredChangeOrders) return { total: 0, draft: 0, pending: 0, approved: 0, totalCost: 0 }

    const draft = filteredChangeOrders.filter((co) => co.status === 'draft').length
    const pending = filteredChangeOrders.filter((co) => co.status === 'submitted' || co.status === 'under_review').length
    const approved = filteredChangeOrders.filter((co) => co.status === 'approved').length

    const totalCost = filteredChangeOrders.reduce((sum, co) => {
      const awardedBid = co.bids?.find((b: any) => b.is_awarded)
      const cost = awardedBid?.lump_sum_cost || co.cost_impact || 0
      return sum + cost
    }, 0)

    return {
      total: filteredChangeOrders.length,
      draft,
      pending,
      approved,
      totalCost,
    }
  }, [filteredChangeOrders])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Change Orders</h1>
            <p className="text-gray-600 mt-1">
              Manage project changes, scope modifications, and cost adjustments
            </p>
          </div>
          {activeProjectId && workflowType && (
            <CreateChangeOrderDialog
              projectId={activeProjectId}
              workflowTypeId={workflowType.id}
            />
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total COs</p>
                  <p className="text-2xl font-bold mt-1">{stats.total}</p>
                </div>
                <FileEdit className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Draft</p>
                  <p className="text-2xl font-bold mt-1">{stats.draft}</p>
                </div>
                <FileEdit className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Review</p>
                  <p className="text-2xl font-bold mt-1">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Cost</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalCost)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
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
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="closed">Closed</option>
                </Select>
              </div>

              {/* Priority filter */}
              <div className="space-y-2">
                <Label htmlFor="priority-filter">Priority</Label>
                <Select
                  id="priority-filter"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  <option value="all">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </Select>
              </div>

              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  type="text"
                  placeholder="Search by title, number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading change orders...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Change Orders</h3>
              <p className="text-gray-600">{error.message}</p>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!isLoading && !error && (!filteredChangeOrders || filteredChangeOrders.length === 0) && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileEdit className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {changeOrders && changeOrders.length > 0 ? 'No matching change orders' : 'No change orders yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {changeOrders && changeOrders.length > 0
                  ? 'Try adjusting your filters to see more results.'
                  : 'Create your first change order to track scope changes and cost adjustments.'}
              </p>
              {activeProjectId && workflowType && (!changeOrders || changeOrders.length === 0) && (
                <CreateChangeOrderDialog
                  projectId={activeProjectId}
                  workflowTypeId={workflowType.id}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Change Orders List */}
        {filteredChangeOrders && filteredChangeOrders.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {filteredChangeOrders.length} Change Order{filteredChangeOrders.length !== 1 ? 's' : ''}
              </h2>
            </div>
            <ChangeOrdersList changeOrders={filteredChangeOrders} />
          </div>
        )}
      </div>
    </AppLayout>
  )
}
