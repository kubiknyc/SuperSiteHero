// File: /src/pages/material-lists/MaterialListDetailPage.tsx
// Material List detail page - view and edit a single material list

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { MaterialListTable, MaterialListGenerator } from '@/features/material-lists'
import { useMaterialList, useUpdateMaterialList, useExportMaterialList } from '@/features/material-lists/hooks'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ChevronLeft,
  Save,
  FileDown,
  Mail,
  Check,
  MoreVertical,
  Settings,
} from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-500',
  finalized: 'bg-blue-500',
  exported: 'bg-green-500',
  ordered: 'bg-purple-500',
}

export function MaterialListDetailPage() {
  const { projectId, listId } = useParams<{ projectId: string; listId: string }>()
  const navigate = useNavigate()
  const [showWasteEditor, setShowWasteEditor] = useState(false)

  const { data: list, isLoading, refetch } = useMaterialList(listId)
  const updateList = useUpdateMaterialList()
  const exportList = useExportMaterialList()

  const handleBack = () => {
    navigate(`/projects/${projectId}/material-lists`)
  }

  const handleFinalize = async () => {
    if (!listId || !list) return
    await updateList.mutateAsync({
      id: listId,
      status: 'finalized',
    })
    refetch()
  }

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    if (!listId) return
    const result = await exportList.mutateAsync({
      material_list_id: listId,
      format,
    })
    if (result.downloadUrl) {
      window.open(result.downloadUrl, '_blank')
    }
    refetch()
  }

  const handleEmail = async () => {
    const email = prompt('Enter recipient email:')
    if (!email || !listId) return
    await exportList.mutateAsync({
      material_list_id: listId,
      format: 'email',
      recipient_email: email,
    })
    refetch()
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col h-full p-4">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="flex-1" />
        </div>
      </AppLayout>
    )
  }

  if (!list) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-muted-foreground mb-4">Material list not found</p>
          <Button onClick={handleBack}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Lists
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-none border-b border-border bg-background p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{list.name}</h1>
                  <Badge
                    className={`${STATUS_COLORS[list.status] || 'bg-gray-500'} text-white`}
                  >
                    {list.status}
                  </Badge>
                </div>
                {list.description && (
                  <p className="text-sm text-muted-foreground">{list.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {list.status === 'draft' && (
                <Button onClick={handleFinalize}>
                  <Check className="h-4 w-4 mr-2" />
                  Finalize
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <FileDown className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport('pdf')}>
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('excel')}>
                    Export as Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleEmail}>
                    <Mail className="h-4 w-4 mr-2" />
                    Send via Email
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowWasteEditor(!showWasteEditor)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="flex-none border-b border-border bg-muted/30 p-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-background rounded-lg p-3 border">
              <div className="text-sm text-muted-foreground">Line Items</div>
              <div className="text-2xl font-bold">{list.totals.total_line_items}</div>
            </div>
            <div className="bg-background rounded-lg p-3 border">
              <div className="text-sm text-muted-foreground">Total Quantity</div>
              <div className="text-2xl font-bold">{list.totals.total_items}</div>
            </div>
            <div className="bg-background rounded-lg p-3 border">
              <div className="text-sm text-muted-foreground">Categories</div>
              <div className="text-2xl font-bold">
                {Object.keys(list.totals.by_category || {}).length}
              </div>
            </div>
            <div className="bg-background rounded-lg p-3 border">
              <div className="text-sm text-muted-foreground">Exports</div>
              <div className="text-2xl font-bold">{list.export_history.length}</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <MaterialListTable
            items={list.items}
            wasteFactors={list.waste_factors}
            editable={list.status === 'draft'}
            showWasteEditor={showWasteEditor}
          />
        </div>

        {/* Export History */}
        {list.export_history.length > 0 && (
          <div className="flex-none border-t border-border p-4">
            <h3 className="font-semibold mb-2">Export History</h3>
            <div className="flex gap-2 flex-wrap">
              {list.export_history.slice(0, 5).map((exp, idx) => (
                <Badge key={idx} variant="outline">
                  {exp.format.toUpperCase()} - {new Date(exp.exported_at).toLocaleDateString()}
                </Badge>
              ))}
              {list.export_history.length > 5 && (
                <Badge variant="outline">
                  +{list.export_history.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default MaterialListDetailPage
