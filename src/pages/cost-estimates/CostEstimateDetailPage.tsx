// File: /src/pages/cost-estimates/CostEstimateDetailPage.tsx
// Detail page for viewing and editing a single cost estimate with line items

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui'
import { ArrowLeft, Plus, Pencil, FileDown, Printer } from 'lucide-react'
import {
  useEstimate,
  useUpdateEstimate,
  useAddEstimateItem,
  useUpdateEstimateItem,
  useDeleteEstimateItem,
} from '@/features/cost-estimates/hooks'
import {
  CostEstimateForm,
  EstimateItemsTable,
  EstimateItemForm,
  EstimateSummaryCard,
} from '@/features/cost-estimates/components'
import type {
  CostEstimateInsert,
  CostEstimateUpdate,
  CostEstimateItem,
  CostEstimateItemInsert,
  CostEstimateItemUpdate
} from '@/types/database-extensions'
import { downloadCostEstimatePDF } from '@/features/cost-estimates/utils/pdfExport'
import { useProject } from '@/features/projects/hooks/useProjects'
import { useToast } from '@/lib/notifications/ToastContext'

export function CostEstimateDetailPage() {
  const { projectId, estimateId } = useParams<{ projectId: string; estimateId: string }>()
  const navigate = useNavigate()
  const { success, error: showError } = useToast()

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CostEstimateItem | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  // Queries and mutations
  const { data: estimate, isLoading } = useEstimate(estimateId)
  const { data: project } = useProject(projectId)
  const updateMutation = useUpdateEstimate()
  const addItemMutation = useAddEstimateItem()
  const updateItemMutation = useUpdateEstimateItem()
  const deleteItemMutation = useDeleteEstimateItem()

  const handleUpdateEstimate = (data: CostEstimateInsert | CostEstimateUpdate) => {
    if (!estimateId) {return}

    // Only CostEstimateUpdate is valid for updating
    const updateData = data as CostEstimateUpdate

    updateMutation.mutate({
      estimateId,
      updates: updateData,
    }, {
      onSuccess: () => {
        setIsEditDialogOpen(false)
      }
    })
  }

  const handleAddItem = (data: CostEstimateItemInsert | CostEstimateItemUpdate) => {
    if (!estimateId) {return}

    // Only CostEstimateItemInsert is valid for creation
    const insertData = data as CostEstimateItemInsert

    // SECURITY FIX: takeoff_item_id is now nullable - don't generate fake UUIDs
    // Leave it null for manually created items
    addItemMutation.mutate(insertData, {
      onSuccess: () => {
        setIsAddItemDialogOpen(false)
      }
    })
  }

  const handleUpdateItem = (data: CostEstimateItemInsert | CostEstimateItemUpdate) => {
    if (!editingItem || !estimateId) {return}

    // Only CostEstimateItemUpdate is valid for updating
    const updateData = data as CostEstimateItemUpdate

    updateItemMutation.mutate({
      itemId: editingItem.id,
      updates: updateData,
      estimateId,
    }, {
      onSuccess: () => {
        setEditingItem(null)
      }
    })
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!estimateId) {return}

    await deleteItemMutation.mutateAsync({ itemId, estimateId })
  }

  const handleEditItem = (item: CostEstimateItem) => {
    setEditingItem(item)
  }

  const handleExportPDF = async () => {
    if (!estimate || !projectId) {return}

    setIsExporting(true)
    try {
      await downloadCostEstimatePDF({
        estimate: {
          ...estimate,
          items: estimate.items || [],
        },
        projectInfo: project ? {
          name: project.name,
          number: project.project_number || undefined,
          address: project.address || undefined,
        } : undefined,
        projectId,
      })
      success('PDF exported', 'Cost estimate PDF has been downloaded.')
    } catch (error) {
      console.error('Error exporting PDF:', error)
      showError('Export failed', 'Failed to export PDF. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <p>Loading estimate...</p>
      </div>
    )
  }

  if (!estimate) {
    return (
      <div className="container mx-auto py-6">
        <p>Estimate not found</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/projects/${projectId}/cost-estimates`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Estimates
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{estimate.name}</h1>
            {estimate.description && (
              <p className="text-muted-foreground">{estimate.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={handleExportPDF} disabled={isExporting}>
            <FileDown className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </Button>
          <Button onClick={() => setIsEditDialogOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit Estimate
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Estimate Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              <Button onClick={() => setIsAddItemDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent>
              <EstimateItemsTable
                items={estimate.items || []}
                onEditItem={handleEditItem}
                onDeleteItem={handleDeleteItem}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          <EstimateSummaryCard estimate={estimate} />

          {/* Additional Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Created:</span>
                <p className="font-medium">
                  {new Date(estimate.created_at!).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Last Updated:</span>
                <p className="font-medium">
                  {new Date(estimate.updated_at!).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Line Items:</span>
                <p className="font-medium">{estimate.items?.length || 0} items</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Estimate Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Cost Estimate</DialogTitle>
          </DialogHeader>
          <CostEstimateForm
            projectId={projectId!}
            estimate={estimate}
            onSubmit={handleUpdateEstimate}
            onCancel={() => setIsEditDialogOpen(false)}
            isSubmitting={updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <EstimateItemForm
        estimateId={estimateId!}
        isOpen={isAddItemDialogOpen}
        onSubmit={handleAddItem}
        onCancel={() => setIsAddItemDialogOpen(false)}
        isSubmitting={addItemMutation.isPending}
        defaultLaborRate={estimate.labor_rate ? Number(estimate.labor_rate) : 0}
      />

      {/* Edit Item Dialog */}
      {editingItem && (
        <EstimateItemForm
          estimateId={estimateId!}
          item={editingItem}
          isOpen={!!editingItem}
          onSubmit={handleUpdateItem}
          onCancel={() => setEditingItem(null)}
          isSubmitting={updateItemMutation.isPending}
          defaultLaborRate={estimate.labor_rate ? Number(estimate.labor_rate) : 0}
        />
      )}
    </div>
  )
}
