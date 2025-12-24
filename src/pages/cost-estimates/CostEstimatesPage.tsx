// File: /src/pages/cost-estimates/CostEstimatesPage.tsx
// Main page displaying list of cost estimates for a project

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Input,
  Label,
} from '@/components/ui'
import { Plus, FileText, Copy, Trash2, Eye } from 'lucide-react'
import {
  useProjectEstimates,
  useCreateEstimate,
  useDeleteEstimate,
  useDuplicateEstimate,
} from '@/features/cost-estimates/hooks'
import { CostEstimateForm } from '@/features/cost-estimates/components'
import { useAuth } from '@/lib/auth/AuthContext'
import type { CostEstimateInsert, CostEstimateUpdate } from '@/types/database-extensions'

export function CostEstimatesPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false)
  const [duplicateEstimateId, setDuplicateEstimateId] = useState<string | null>(null)
  const [duplicateName, setDuplicateName] = useState('')

  // Queries and mutations
  const { data: estimates, isLoading } = useProjectEstimates(projectId)
  const createMutation = useCreateEstimate()
  const deleteMutation = useDeleteEstimate()
  const duplicateMutation = useDuplicateEstimate()

  const handleCreateEstimate = (data: CostEstimateInsert | CostEstimateUpdate) => {
    if (!user) {return}

    // Only CostEstimateInsert is valid for creation
    const insertData = data as CostEstimateInsert

    createMutation.mutate({
      ...insertData,
      created_by: user.id,
      project_id: projectId!,
    }, {
      onSuccess: () => {
        setIsCreateDialogOpen(false)
      }
    })
  }

  const handleViewEstimate = (estimateId: string) => {
    navigate(`/projects/${projectId}/cost-estimates/${estimateId}`)
  }

  const handleDuplicateClick = (estimateId: string, currentName: string) => {
    setDuplicateEstimateId(estimateId)
    setDuplicateName(`${currentName} (Copy)`)
    setIsDuplicateDialogOpen(true)
  }

  const handleConfirmDuplicate = () => {
    if (!duplicateEstimateId || !duplicateName.trim()) {return}

    duplicateMutation.mutate(
      { estimateId: duplicateEstimateId, newName: duplicateName },
      {
        onSuccess: () => {
          setIsDuplicateDialogOpen(false)
          setDuplicateEstimateId(null)
          setDuplicateName('')
        },
      }
    )
  }

  const handleDeleteEstimate = async (estimateId: string) => {
    if (!projectId) {return}
    await deleteMutation.mutateAsync({ estimateId, projectId })
  }

  const formatCurrency = (value: number | string | null | undefined) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    if (numValue === null || numValue === undefined || isNaN(numValue)) {return '$0.00'}
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numValue)
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) {return 'N/A'}
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500'
      case 'invoiced':
        return 'bg-blue-500'
      case 'archived':
        return 'bg-gray-500'
      case 'draft':
      default:
        return 'bg-warning'
    }
  }

  if (!projectId) {
    return <div>Project ID is required</div>
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" className="heading-page">Cost Estimates</h1>
          <p className="text-muted-foreground">
            Create and manage cost estimates for your project
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Estimate
        </Button>
      </div>

      {/* Estimates List */}
      <Card>
        <CardHeader>
          <CardTitle>All Estimates</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading estimates...</p>
            </div>
          ) : !estimates || estimates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                No cost estimates yet. Create your first estimate to get started.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Estimate
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Material Cost</TableHead>
                    <TableHead className="text-right">Labor Cost</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estimates.map((estimate) => (
                    <TableRow key={estimate.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium" onClick={() => handleViewEstimate(estimate.id)}>
                        <div>
                          <p>{estimate.name}</p>
                          {estimate.description && (
                            <p className="text-sm text-muted-foreground">{estimate.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell onClick={() => handleViewEstimate(estimate.id)}>
                        <Badge className={getStatusColor(estimate.status)}>
                          {estimate.status || 'draft'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={() => handleViewEstimate(estimate.id)}>
                        {formatCurrency(estimate.total_material_cost)}
                      </TableCell>
                      <TableCell className="text-right" onClick={() => handleViewEstimate(estimate.id)}>
                        {formatCurrency(estimate.total_labor_cost)}
                      </TableCell>
                      <TableCell className="text-right font-semibold" onClick={() => handleViewEstimate(estimate.id)}>
                        {formatCurrency(estimate.total_cost)}
                      </TableCell>
                      <TableCell onClick={() => handleViewEstimate(estimate.id)}>
                        {formatDate(estimate.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewEstimate(estimate.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicateClick(estimate.id, estimate.name)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-error" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Estimate</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{estimate.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteEstimate(estimate.id)}
                                  className="bg-red-500 hover:bg-error"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Estimate Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Cost Estimate</DialogTitle>
          </DialogHeader>
          <CostEstimateForm
            projectId={projectId}
            onSubmit={handleCreateEstimate}
            onCancel={() => setIsCreateDialogOpen(false)}
            isSubmitting={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Duplicate Estimate Dialog */}
      <Dialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Estimate</DialogTitle>
            <DialogDescription>
              Enter a name for the duplicated estimate
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="duplicate-name">Estimate Name</Label>
              <Input
                id="duplicate-name"
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                placeholder="Enter estimate name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDuplicateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDuplicate}
              disabled={!duplicateName.trim() || duplicateMutation.isPending}
            >
              {duplicateMutation.isPending ? 'Duplicating...' : 'Duplicate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
