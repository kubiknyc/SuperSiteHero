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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ChevronLeft,
  FileDown,
  Mail,
  Check,
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
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [recipientEmail, setRecipientEmail] = useState('')

  const { data: list, isLoading, refetch } = useMaterialList(listId)
  const updateList = useUpdateMaterialList()
  const exportList = useExportMaterialList()

  const handleBack = () => {
    navigate(`/projects/${projectId}/material-lists`)
  }

  const handleFinalize = async () => {
    if (!listId || !list) {return}
    await updateList.mutateAsync({
      id: listId,
      status: 'finalized',
    })
    refetch()
  }

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    if (!listId) {return}
    const result = await exportList.mutateAsync({
      material_list_id: listId,
      format,
    })
    if (result.downloadUrl) {
      window.open(result.downloadUrl, '_blank')
    }
    refetch()
  }

  const handleEmail = () => {
    setRecipientEmail('')
    setShowEmailDialog(true)
  }

  const sendEmail = async () => {
    if (!recipientEmail || !listId) {return}
    await exportList.mutateAsync({
      material_list_id: listId,
      format: 'email',
      recipient_email: recipientEmail,
    })
    setShowEmailDialog(false)
    setRecipientEmail('')
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
                  <h1 className="heading-card">{list.name}</h1>
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
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="flex-none border-b border-border bg-muted/30 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
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
            materialList={list}
            readOnly={list.status !== 'draft'}
            onExport={handleExport}
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

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Material List via Email</DialogTitle>
            <DialogDescription>
              Enter the recipient's email address to send this material list.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="recipient@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                aria-label="Recipient email address"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={sendEmail}
              disabled={!recipientEmail || !recipientEmail.includes('@')}
            >
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}

export default MaterialListDetailPage
