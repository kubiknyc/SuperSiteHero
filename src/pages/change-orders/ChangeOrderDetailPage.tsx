// File: /src/pages/change-orders/ChangeOrderDetailPage.tsx
// Detail view for a single change order - V2 (uses dedicated change_orders table)

import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  useChangeOrderV2,
  useChangeOrderItems,
  useChangeOrderAttachments,
  useChangeOrderHistory,
  useUpdateChangeOrderV2,
  useSubmitEstimate,
  useProcessInternalApproval,
  useSubmitToOwner,
  useProcessOwnerApproval,
  useVoidChangeOrder,
  useUpdateChangeOrderSignature,
} from '@/features/change-orders/hooks/useChangeOrdersV2'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  ArrowLeft,
  FileEdit,
  DollarSign,
  Clock,
  User,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  Paperclip,
  History,
  ChevronRight,
  Send,
  Ban,
  AlertTriangle,
  Target,
  Package,
  Plus,
  Trash2,
  Download,
  PenTool,
  FileSignature,
} from 'lucide-react'
import { DocumentSignatureDialog, type SignatureData } from '@/components/shared'
import { downloadChangeOrderPDF } from '@/features/change-orders/utils/pdfExport'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { ChangeOrder, ChangeOrderItem, ChangeOrderHistory as COHistory } from '@/types/change-order'
import {
  formatChangeOrderNumber,
  getChangeTypeLabel,
  getChangeOrderStatusLabel,
  getChangeOrderStatusColor,
  ChangeOrderStatus,
  canEditChangeOrder,
  canSubmitForApproval,
  canApproveInternally,
  canSendToOwner,
} from '@/types/change-order'

export function ChangeOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { userProfile } = useAuth()

  // V2 hooks
  const { data: changeOrder, isLoading, error } = useChangeOrderV2(id)
  const { data: items } = useChangeOrderItems(id)
  const { data: attachments } = useChangeOrderAttachments(id)
  const { data: history } = useChangeOrderHistory(id)

  // Mutation hooks
  const updateChangeOrder = useUpdateChangeOrderV2()
  const submitEstimate = useSubmitEstimate()
  const processInternalApproval = useProcessInternalApproval()
  const submitToOwner = useSubmitToOwner()
  const processOwnerApproval = useProcessOwnerApproval()
  const voidChangeOrder = useVoidChangeOrder()
  const updateSignature = useUpdateChangeOrderSignature()

  // Local state
  const [activeTab, setActiveTab] = useState('details')
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [approvalComments, setApprovalComments] = useState('')
  const [ownerApprovalAmount, setOwnerApprovalAmount] = useState('')
  const [ownerApprovalDays, setOwnerApprovalDays] = useState('')

  // Signature dialog state
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false)

  // Format currency
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) {return 'TBD'}
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Get status step number for workflow
  const getStatusStep = (status: string): number => {
    const steps: Record<string, number> = {
      draft: 1,
      pending_estimate: 1,
      estimate_complete: 2,
      pending_internal_approval: 3,
      internally_approved: 4,
      pending_owner_review: 5,
      approved: 6,
      rejected: 0,
      void: 0,
    }
    return steps[status] || 0
  }

  // Action handlers
  const handleSubmitForInternalApproval = async () => {
    if (!changeOrder) {return}
    try {
      await submitEstimate.mutateAsync({
        id: changeOrder.id,
        proposed_amount: changeOrder.proposed_amount,
        proposed_days: changeOrder.proposed_days,
      })
    } catch (e) {
      console.error('Failed to submit estimate:', e)
    }
  }

  const handleInternalApproval = async (approved: boolean) => {
    if (!changeOrder) {return}
    try {
      await processInternalApproval.mutateAsync({
        id: changeOrder.id,
        approved,
        comments: approvalComments,
      })
      setApprovalComments('')
      setShowApprovalDialog(false)
    } catch (e) {
      console.error('Failed to process internal approval:', e)
    }
  }

  const handleSubmitToOwner = async () => {
    if (!changeOrder) {return}
    try {
      await submitToOwner.mutateAsync(changeOrder.id)
    } catch (e) {
      console.error('Failed to submit to owner:', e)
    }
  }

  const handleOwnerApproval = async (approved: boolean) => {
    if (!changeOrder) {return}
    try {
      await processOwnerApproval.mutateAsync({
        id: changeOrder.id,
        approved,
        approved_amount: approved ? parseFloat(ownerApprovalAmount) || changeOrder.proposed_amount : undefined,
        approved_days: approved ? parseInt(ownerApprovalDays) || changeOrder.proposed_days : undefined,
        comments: approvalComments,
      })
      setApprovalComments('')
      setOwnerApprovalAmount('')
      setOwnerApprovalDays('')
      setShowApprovalDialog(false)
    } catch (e) {
      console.error('Failed to process owner approval:', e)
    }
  }

  const handleVoid = async () => {
    if (!changeOrder || !confirm('Are you sure you want to void this change order?')) {return}
    try {
      await voidChangeOrder.mutateAsync({ id: changeOrder.id, reason: 'Voided by user' })
    } catch (e) {
      console.error('Failed to void change order:', e)
    }
  }

  const handleDownloadPDF = async () => {
    if (!changeOrder) {return}
    try {
      await downloadChangeOrderPDF({
        changeOrder,
        items: items || [],
        projectId: changeOrder.project_id,
        projectInfo: changeOrder.project ? {
          name: changeOrder.project.name,
          number: changeOrder.project.number || undefined,
        } : undefined,
      })
      toast.success('Change order PDF downloaded')
    } catch (e) {
      console.error('Failed to download PDF:', e)
      toast.error('Failed to download PDF')
    }
  }

  // Signature handlers
  const handleSignatureComplete = async (data: SignatureData) => {
    if (!changeOrder) {return}

    await updateSignature.mutateAsync({
      id: changeOrder.id,
      signatureUrl: data.signatureUrl,
      signerName: data.signedBy,
      signatureDate: data.signedAt,
    })
    toast.success('Signature saved')
  }

  const handleSignatureRemove = async () => {
    if (!changeOrder) {return}

    await updateSignature.mutateAsync({
      id: changeOrder.id,
      signatureUrl: null,
      signerName: undefined,
      signatureDate: null,
    })
    toast.success('Signature removed')
  }

  // Loading state
  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Loading change order...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Error state
  if (error || !changeOrder) {
    return (
      <AppLayout>
        <div className="p-6">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-8 text-center">
              <AlertCircle className="h-8 w-8 mx-auto text-red-500 mb-4" />
              <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Change Order</h3>
              <p className="text-red-600 mb-6">{error?.message || 'Change order not found'}</p>
              <Link to="/change-orders">
                <Button>Back to Change Orders</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    )
  }

  const displayNumber = formatChangeOrderNumber(changeOrder)
  const currentStep = getStatusStep(changeOrder.status)
  const isEditable = canEditChangeOrder(changeOrder)
  const canSubmit = canSubmitForApproval(changeOrder)
  const canApproveInt = canApproveInternally(changeOrder)
  const canSendOwner = canSendToOwner(changeOrder)
  const isPendingOwner = changeOrder.status === ChangeOrderStatus.PENDING_OWNER_REVIEW

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Link to="/change-orders">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">{displayNumber}</h1>
                <Badge className={cn('font-medium', getChangeOrderStatusColor(changeOrder.status))}>
                  {getChangeOrderStatusLabel(changeOrder.status)}
                </Badge>
                {changeOrder.is_pco ? (
                  <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50">
                    PCO
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">
                    Approved CO
                  </Badge>
                )}
              </div>
              <p className="text-gray-600 mt-1">{changeOrder.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            {isEditable && (
              <Button variant="outline" size="sm" onClick={() => navigate(`/change-orders/${id}/edit`)}>
                <FileEdit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
            {changeOrder.status !== 'void' && changeOrder.status !== 'approved' && (
              <Button variant="outline" size="sm" className="text-red-600 border-red-200" onClick={handleVoid}>
                <Ban className="w-4 h-4 mr-2" />
                Void
              </Button>
            )}
          </div>
        </div>

        {/* Workflow Progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-700">Workflow Progress</h3>
              {changeOrder.ball_in_court_user && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-orange-500" />
                  <span className="text-sm text-orange-700 font-medium">
                    Ball in court: {changeOrder.ball_in_court_user.full_name}
                  </span>
                  {changeOrder.ball_in_court_role && (
                    <Badge variant="outline" className="text-xs capitalize">
                      {changeOrder.ball_in_court_role}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-between">
              {[
                { step: 1, label: 'Draft' },
                { step: 2, label: 'Estimate' },
                { step: 3, label: 'Internal Review' },
                { step: 4, label: 'Internal Approved' },
                { step: 5, label: 'Owner Review' },
                { step: 6, label: 'Approved' },
              ].map((s, i) => (
                <div key={s.step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                        currentStep >= s.step
                          ? 'bg-primary text-white dark:bg-primary'
                          : 'bg-gray-200 text-gray-500 dark:bg-gray-700'
                      )}
                    >
                      {currentStep > s.step ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        s.step
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-xs mt-1 text-center',
                        currentStep >= s.step ? 'text-primary font-medium dark:text-primary-400' : 'text-gray-500'
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < 5 && (
                    <div
                      className={cn(
                        'flex-1 h-1 mx-2',
                        currentStep > s.step ? 'bg-primary dark:bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                      )}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Action Buttons based on Status */}
            <div className="mt-6 flex gap-3 justify-end border-t pt-4">
              {canSubmit && (
                <Button onClick={handleSubmitForInternalApproval} disabled={submitEstimate.isPending}>
                  <Send className="h-4 w-4 mr-2" />
                  Submit for Internal Approval
                </Button>
              )}
              {canApproveInt && (
                <>
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-200"
                    onClick={() => handleInternalApproval(false)}
                    disabled={processInternalApproval.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleInternalApproval(true)}
                    disabled={processInternalApproval.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Internally
                  </Button>
                </>
              )}
              {canSendOwner && (
                <Button onClick={handleSubmitToOwner} disabled={submitToOwner.isPending}>
                  <Send className="h-4 w-4 mr-2" />
                  Submit to Owner
                </Button>
              )}
              {isPendingOwner && (
                <>
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-200"
                    onClick={() => handleOwnerApproval(false)}
                    disabled={processOwnerApproval.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Owner Reject
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => setShowApprovalDialog(true)}
                    disabled={processOwnerApproval.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Owner Approve
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Owner Approval Dialog */}
        {showApprovalDialog && isPendingOwner && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-800">Owner Approval</CardTitle>
              <CardDescription>Enter approved amounts and sign</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Approved Amount</Label>
                  <Input
                    type="number"
                    value={ownerApprovalAmount}
                    onChange={(e) => setOwnerApprovalAmount(e.target.value)}
                    placeholder={String(changeOrder.proposed_amount)}
                  />
                </div>
                <div>
                  <Label>Approved Days</Label>
                  <Input
                    type="number"
                    value={ownerApprovalDays}
                    onChange={(e) => setOwnerApprovalDays(e.target.value)}
                    placeholder={String(changeOrder.proposed_days)}
                  />
                </div>
              </div>
              <div>
                <Label>Comments</Label>
                <Textarea
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  placeholder="Optional approval comments..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleOwnerApproval(true)}
                  disabled={processOwnerApproval.isPending}
                >
                  Confirm Approval
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="details">
              <FileText className="h-4 w-4 mr-2" />
              Details
            </TabsTrigger>
            <TabsTrigger value="items">
              <Package className="h-4 w-4 mr-2" />
              Line Items ({items?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="attachments">
              <Paperclip className="h-4 w-4 mr-2" />
              Attachments ({attachments?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              History ({history?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Info */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Change Order Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-gray-600">Title</Label>
                      <p className="text-lg font-medium mt-1">{changeOrder.title}</p>
                    </div>
                    {changeOrder.description && (
                      <div>
                        <Label className="text-gray-600">Description</Label>
                        <p className="mt-1 whitespace-pre-wrap">{changeOrder.description}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-600">Change Type</Label>
                        <Badge variant="outline" className="mt-1">
                          {getChangeTypeLabel(changeOrder.change_type)}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-gray-600">Pricing Method</Label>
                        <Badge variant="outline" className="mt-1 capitalize">
                          {changeOrder.pricing_method?.replace('_', ' ') || 'Lump Sum'}
                        </Badge>
                      </div>
                    </div>
                    {changeOrder.justification && (
                      <div>
                        <Label className="text-gray-600">Justification</Label>
                        <p className="mt-1">{changeOrder.justification}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Cost Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Cost Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-primary-50 rounded-lg dark:bg-primary-950/20">
                        <p className="text-sm text-primary font-medium dark:text-primary-400">Proposed Amount</p>
                        <p className="text-2xl font-bold text-primary-700 dark:text-primary-300">
                          {formatCurrency(changeOrder.proposed_amount)}
                        </p>
                      </div>
                      {changeOrder.approved_amount !== null && (
                        <div className="p-4 bg-green-50 rounded-lg">
                          <p className="text-sm text-green-600 font-medium">Approved Amount</p>
                          <p className="text-2xl font-bold text-green-700">
                            {formatCurrency(changeOrder.approved_amount)}
                          </p>
                        </div>
                      )}
                      <div className="p-4 bg-amber-50 rounded-lg">
                        <p className="text-sm text-amber-600 font-medium">Proposed Days</p>
                        <p className="text-2xl font-bold text-amber-700">{changeOrder.proposed_days}</p>
                      </div>
                      {changeOrder.approved_days !== null && (
                        <div className="p-4 bg-green-50 rounded-lg">
                          <p className="text-sm text-green-600 font-medium">Approved Days</p>
                          <p className="text-2xl font-bold text-green-700">{changeOrder.approved_days}</p>
                        </div>
                      )}
                    </div>

                    {/* Contract Tracking */}
                    {changeOrder.original_contract_amount && (
                      <div className="mt-6 pt-4 border-t">
                        <h4 className="font-medium text-gray-700 mb-3">Contract Tracking</h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Original Contract</p>
                            <p className="font-medium">{formatCurrency(changeOrder.original_contract_amount)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Previous Changes</p>
                            <p className="font-medium">{formatCurrency(changeOrder.previous_changes_amount)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Revised Contract</p>
                            <p className="font-medium">{formatCurrency(changeOrder.revised_contract_amount)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Related Items */}
                <Card>
                  <CardHeader>
                    <CardTitle>Related Items</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {changeOrder.related_rfi && (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <FileText className="h-4 w-4 text-primary dark:text-primary-400" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">RFI-{changeOrder.related_rfi.rfi_number}</p>
                          <p className="text-xs text-gray-500">{changeOrder.related_rfi.subject}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    )}
                    {changeOrder.related_submittal && (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <Package className="h-4 w-4 text-purple-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{changeOrder.related_submittal.submittal_number}</p>
                          <p className="text-xs text-gray-500">{changeOrder.related_submittal.title}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    )}
                    {!changeOrder.related_rfi && !changeOrder.related_submittal && (
                      <p className="text-sm text-gray-500 text-center py-2">No related items</p>
                    )}
                  </CardContent>
                </Card>

                {/* People */}
                <Card>
                  <CardHeader>
                    <CardTitle>People</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {changeOrder.initiated_by_user && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Initiated By</p>
                          <p className="text-sm font-medium">{changeOrder.initiated_by_user.full_name}</p>
                        </div>
                      </div>
                    )}
                    {changeOrder.assigned_to_user && (
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Assigned To</p>
                          <p className="text-sm font-medium">{changeOrder.assigned_to_user.full_name}</p>
                        </div>
                      </div>
                    )}
                    {changeOrder.internal_approver_name && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <div>
                          <p className="text-xs text-gray-500">Internal Approver</p>
                          <p className="text-sm font-medium">{changeOrder.internal_approver_name}</p>
                        </div>
                      </div>
                    )}
                    {changeOrder.owner_approver_name && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="text-xs text-gray-500">Owner Approver</p>
                          <p className="text-sm font-medium">{changeOrder.owner_approver_name}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Dates */}
                <Card>
                  <CardHeader>
                    <CardTitle>Key Dates</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Created</p>
                        <p className="text-sm">{format(new Date(changeOrder.created_at), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                    {changeOrder.date_estimated && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary-400 dark:text-primary-400" />
                        <div>
                          <p className="text-xs text-gray-500">Estimated</p>
                          <p className="text-sm">{format(new Date(changeOrder.date_estimated), 'MMM d, yyyy')}</p>
                        </div>
                      </div>
                    )}
                    {changeOrder.date_internal_approved && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-purple-400" />
                        <div>
                          <p className="text-xs text-gray-500">Internal Approved</p>
                          <p className="text-sm">{format(new Date(changeOrder.date_internal_approved), 'MMM d, yyyy')}</p>
                        </div>
                      </div>
                    )}
                    {changeOrder.date_owner_approved && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-green-400" />
                        <div>
                          <p className="text-xs text-gray-500">Owner Approved</p>
                          <p className="text-sm">{format(new Date(changeOrder.date_owner_approved), 'MMM d, yyyy')}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Owner Signature */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileSignature className="h-5 w-5 text-indigo-600" />
                      Owner Signature
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Status</span>
                        {changeOrder.owner_signature_url ? (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Signed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>

                      {changeOrder.owner_signature_url ? (
                        <div className="space-y-2">
                          <div className="border rounded-lg p-3 bg-gray-50">
                            <img
                              src={changeOrder.owner_signature_url}
                              alt="Owner signature"
                              className="max-h-16 mx-auto"
                            />
                          </div>
                          {changeOrder.owner_approver_name && (
                            <p className="text-xs text-gray-500 text-center">
                              Signed by: {changeOrder.owner_approver_name}
                            </p>
                          )}
                          {changeOrder.date_owner_approved && (
                            <p className="text-xs text-gray-500 text-center">
                              {format(new Date(changeOrder.date_owner_approved), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="border-2 border-dashed rounded-lg p-4 text-center bg-gray-50">
                          <PenTool className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500">Awaiting owner signature</p>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setSignatureDialogOpen(true)}
                        disabled={changeOrder.status !== 'pending_owner_review' && changeOrder.status !== 'internally_approved'}
                      >
                        <PenTool className="h-4 w-4 mr-2" />
                        {changeOrder.owner_signature_url ? 'Update Signature' : 'Add Owner Signature'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Line Items Tab */}
          <TabsContent value="items">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Line Items</CardTitle>
                  {isEditable && (
                    <Button size="sm" onClick={() => navigate(`/change-orders/${id}/items/new`)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {items && items.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2">#</th>
                          <th className="text-left py-2 px-2">Description</th>
                          <th className="text-left py-2 px-2">Cost Code</th>
                          <th className="text-right py-2 px-2">Labor</th>
                          <th className="text-right py-2 px-2">Material</th>
                          <th className="text-right py-2 px-2">Equipment</th>
                          <th className="text-right py-2 px-2">Sub</th>
                          <th className="text-right py-2 px-2">Markup</th>
                          <th className="text-right py-2 px-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item: ChangeOrderItem) => (
                          <tr key={item.id} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-2">{item.item_number}</td>
                            <td className="py-2 px-2">{item.description}</td>
                            <td className="py-2 px-2">{item.cost_code || '-'}</td>
                            <td className="py-2 px-2 text-right">{formatCurrency(item.labor_amount)}</td>
                            <td className="py-2 px-2 text-right">{formatCurrency(item.material_amount)}</td>
                            <td className="py-2 px-2 text-right">{formatCurrency(item.equipment_amount)}</td>
                            <td className="py-2 px-2 text-right">{formatCurrency(item.subcontract_amount)}</td>
                            <td className="py-2 px-2 text-right">{formatCurrency(item.markup_amount)}</td>
                            <td className="py-2 px-2 text-right font-medium">{formatCurrency(item.total_amount)}</td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 font-medium">
                          <td colSpan={8} className="py-2 px-2 text-right">Total:</td>
                          <td className="py-2 px-2 text-right">
                            {formatCurrency(items.reduce((sum: number, i: ChangeOrderItem) => sum + (i.total_amount || 0), 0))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No line items yet</p>
                    {isEditable && (
                      <Button className="mt-4" onClick={() => navigate(`/change-orders/${id}/items/new`)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Item
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attachments Tab */}
          <TabsContent value="attachments">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Attachments</CardTitle>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {attachments && attachments.length > 0 ? (
                  <div className="space-y-2">
                    {attachments.map((att) => (
                      <div key={att.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Paperclip className="h-5 w-5 text-gray-400" />
                        <div className="flex-1">
                          <p className="font-medium">{att.file_name}</p>
                          {att.description && <p className="text-sm text-gray-500">{att.description}</p>}
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a href={att.file_url} target="_blank" rel="noopener noreferrer">
                            View
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Paperclip className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No attachments yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Change History</CardTitle>
              </CardHeader>
              <CardContent>
                {history && history.length > 0 ? (
                  <div className="space-y-4">
                    {history.map((entry: COHistory) => (
                      <div key={entry.id} className="flex gap-4 pb-4 border-b last:border-0">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center dark:bg-primary-950">
                            <History className="h-4 w-4 text-primary dark:text-primary-400" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{entry.action}</span>
                            {entry.field_changed && (
                              <Badge variant="outline" className="text-xs">
                                {entry.field_changed}
                              </Badge>
                            )}
                          </div>
                          {entry.old_value && entry.new_value && (
                            <p className="text-sm text-gray-600 mt-1">
                              Changed from "{entry.old_value}" to "{entry.new_value}"
                            </p>
                          )}
                          {entry.notes && <p className="text-sm text-gray-500 mt-1">{entry.notes}</p>}
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                            <span>{entry.changed_by_user?.full_name || 'System'}</span>
                            <span>•</span>
                            <span>{format(new Date(entry.changed_at), 'MMM d, yyyy h:mm a')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <History className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No history recorded yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Owner Signature Dialog */}
      <DocumentSignatureDialog
        open={signatureDialogOpen}
        onOpenChange={setSignatureDialogOpen}
        documentType="change_order"
        documentId={id || ''}
        documentName={displayNumber}
        role="owner"
        roleLabel="Owner"
        defaultSignerName={changeOrder.owner_approver_name || ''}
        existingSignature={changeOrder.owner_signature_url}
        onSignatureComplete={handleSignatureComplete}
        onSignatureRemove={handleSignatureRemove}
        requireSignerInfo={true}
        allowDocuSign={true}
      />
    </AppLayout>
  )
}

export default ChangeOrderDetailPage
