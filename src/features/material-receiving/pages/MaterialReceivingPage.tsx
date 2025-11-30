/**
 * Material Receiving Page
 *
 * Main page for viewing and managing material deliveries
 */

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, Package, AlertTriangle, CheckCircle, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { MaterialReceivingCard } from '../components/MaterialReceivingCard'
import { MaterialReceivingForm } from '../components/MaterialReceivingForm'
import {
  useMaterialReceipts,
  useMaterialReceivingStats,
  useCreateMaterialReceipt,
  useDeleteMaterialReceipt,
} from '../hooks/useMaterialReceiving'
import {
  MATERIAL_STATUSES,
  MATERIAL_CONDITIONS,
  type MaterialStatus,
  type MaterialCondition,
  type MaterialReceivedFilters,
} from '@/types/material-receiving'

export function MaterialReceivingPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<MaterialStatus | 'all'>('all')
  const [conditionFilter, setConditionFilter] = useState<MaterialCondition | 'all'>('all')

  // Build filters
  const filters: MaterialReceivedFilters = {
    projectId: projectId || '',
    search: searchQuery || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    condition: conditionFilter !== 'all' ? conditionFilter : undefined,
  }

  // Queries
  const { data: materials, isLoading, error } = useMaterialReceipts(filters)
  const { data: stats } = useMaterialReceivingStats(projectId)

  // Mutations
  const createMutation = useCreateMaterialReceipt()
  const deleteMutation = useDeleteMaterialReceipt()

  const handleCreate = async (data: any) => {
    await createMutation.mutateAsync(data)
    setShowCreateDialog(false)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this material receipt?')) {
      await deleteMutation.mutateAsync({ id, projectId: projectId || '' })
    }
  }

  if (!projectId) {
    return <div>Project ID is required</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Material Receiving</h1>
          <p className="text-muted-foreground">
            Track and manage material deliveries for this project
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Log Delivery
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Deliveries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{stats?.total_deliveries || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{stats?.this_week || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Inspection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-purple-500" />
              <span className="text-2xl font-bold">{stats?.pending_inspection || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              With Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold">{stats?.with_issues || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search materials, vendors, ticket numbers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as MaterialStatus | 'all')}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {MATERIAL_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={conditionFilter}
              onValueChange={(value) => setConditionFilter(value as MaterialCondition | 'all')}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Conditions</SelectItem>
                {MATERIAL_CONDITIONS.map((condition) => (
                  <SelectItem key={condition.value} value={condition.value}>
                    {condition.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Materials List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-red-500">Error loading materials: {error.message}</p>
          </CardContent>
        </Card>
      ) : materials?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Materials Logged</h3>
            <p className="text-muted-foreground mb-4">
              Start tracking material deliveries for this project
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Log First Delivery
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials?.map((material) => (
            <MaterialReceivingCard
              key={material.id}
              material={material}
              projectId={projectId}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Material Delivery</DialogTitle>
            <DialogDescription>
              Record a new material delivery for this project
            </DialogDescription>
          </DialogHeader>
          <MaterialReceivingForm
            projectId={projectId}
            onSubmit={handleCreate}
            onCancel={() => setShowCreateDialog(false)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MaterialReceivingPage
