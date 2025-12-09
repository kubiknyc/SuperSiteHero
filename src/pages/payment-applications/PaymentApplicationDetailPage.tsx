// File: /src/pages/payment-applications/PaymentApplicationDetailPage.tsx
// Payment Application detail view with G702/G703 data and Schedule of Values editor
// Implements AIA billing standards

import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  usePaymentApplication,
  useScheduleOfValues,
  usePaymentApplicationHistory,
  useSubmitPaymentApplication,
  useApprovePaymentApplication,
  useRejectPaymentApplication,
  useMarkPaymentApplicationPaid,
  useDeletePaymentApplication,
  useBulkUpdateSOVItems,
  formatCurrency,
  formatPercent,
  PAYMENT_APPLICATION_STATUSES,
} from '@/features/payment-applications/hooks/usePaymentApplications'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Send,
  DollarSign,
  FileText,
  Save,
  Trash2,
  Clock,
  Calendar,
  Building2,
  Receipt,
  History,
  Edit,
  Banknote,
  AlertTriangle,
  Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  buildG702Data,
  buildG703Data,
  downloadPaymentApplicationPDFs,
} from '@/features/payment-applications/utils/pdfExport'
import { WaiverChecklist } from '@/features/payment-applications/components'
import type { PaymentApplicationStatus, BulkUpdateSOVItemDTO } from '@/types/payment-application'

export function PaymentApplicationDetailPage() {
  const { applicationId } = useParams<{ applicationId: string }>()
  const navigate = useNavigate()

  // State
  const [isEditing, setIsEditing] = useState(false)
  const [editedItems, setEditedItems] = useState<Record<string, { this_period: number; stored: number }>>({})
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentReference, setPaymentReference] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  // Fetch data
  const { data: application, isLoading, error } = usePaymentApplication(applicationId)
  const { data: sovItems, isLoading: sovLoading } = useScheduleOfValues(applicationId)
  const { data: history } = usePaymentApplicationHistory(applicationId)

  // Mutations
  const submitMutation = useSubmitPaymentApplication()
  const approveMutation = useApprovePaymentApplication()
  const rejectMutation = useRejectPaymentApplication()
  const markPaidMutation = useMarkPaymentApplicationPaid()
  const deleteMutation = useDeletePaymentApplication()
  const bulkUpdateMutation = useBulkUpdateSOVItems()

  const isLoading2 = submitMutation.isPending || approveMutation.isPending ||
    rejectMutation.isPending || markPaidMutation.isPending || bulkUpdateMutation.isPending

  const getStatusConfig = (status: PaymentApplicationStatus) => {
    return PAYMENT_APPLICATION_STATUSES.find((s) => s.value === status)
  }

  const getStatusBadge = (status: PaymentApplicationStatus) => {
    const config = getStatusConfig(status)
    const colorMap: Record<string, string> = {
      gray: 'bg-gray-100 text-gray-700',
      blue: 'bg-blue-100 text-blue-700',
      yellow: 'bg-yellow-100 text-yellow-700',
      green: 'bg-green-100 text-green-700',
      red: 'bg-red-100 text-red-700',
      emerald: 'bg-emerald-100 text-emerald-700',
    }
    return (
      <Badge className={cn('font-medium', colorMap[config?.color || 'gray'])}>
        {config?.label || status}
      </Badge>
    )
  }

  // Handle SOV editing
  const handleItemChange = (itemId: string, field: 'this_period' | 'stored', value: number) => {
    setEditedItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }))
  }

  const handleSaveEdits = async () => {
    if (!applicationId || Object.keys(editedItems).length === 0) return

    const updates: BulkUpdateSOVItemDTO[] = Object.entries(editedItems).map(([id, values]) => ({
      id,
      work_completed_this_period: values.this_period,
      materials_stored: values.stored,
    }))

    await bulkUpdateMutation.mutateAsync({
      applicationId,
      items: updates,
    })

    setEditedItems({})
    setIsEditing(false)
  }

  const handleSubmit = async () => {
    if (!applicationId) return
    await submitMutation.mutateAsync({ id: applicationId })
  }

  const handleApprove = async () => {
    if (!applicationId) return
    await approveMutation.mutateAsync({ id: applicationId })
  }

  const handleReject = async () => {
    if (!applicationId || !rejectionReason) return
    await rejectMutation.mutateAsync({ id: applicationId, rejection_reason: rejectionReason })
    setRejectDialogOpen(false)
    setRejectionReason('')
  }

  const handleMarkPaid = async () => {
    if (!applicationId || !paymentAmount) return
    await markPaidMutation.mutateAsync({
      id: applicationId,
      payment_received_amount: parseFloat(paymentAmount),
      payment_reference: paymentReference || undefined,
    })
    setMarkPaidDialogOpen(false)
    setPaymentAmount('')
    setPaymentReference('')
  }

  const handleDelete = async () => {
    if (!applicationId) return
    if (confirm('Are you sure you want to delete this payment application?')) {
      await deleteMutation.mutateAsync(applicationId)
      navigate('/payment-applications')
    }
  }

  // Export PDF handler
  const handleExportPDF = async () => {
    if (!application || !sovItems) return

    setIsExporting(true)
    try {
      await downloadPaymentApplicationPDFs(application, sovItems)
    } catch (error) {
      console.error('Failed to export PDFs:', error)
    } finally {
      setIsExporting(false)
    }
  }

  // Calculate SOV totals
  const sovTotals = sovItems?.reduce(
    (acc, item) => ({
      scheduled_value: acc.scheduled_value + item.scheduled_value,
      work_completed_previous: acc.work_completed_previous + item.work_completed_previous,
      work_completed_this_period: acc.work_completed_this_period + item.work_completed_this_period,
      materials_stored: acc.materials_stored + item.materials_stored,
      total_completed_stored: acc.total_completed_stored + item.total_completed_stored,
      balance_to_finish: acc.balance_to_finish + item.balance_to_finish,
    }),
    {
      scheduled_value: 0,
      work_completed_previous: 0,
      work_completed_this_period: 0,
      materials_stored: 0,
      total_completed_stored: 0,
      balance_to_finish: 0,
    }
  )

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </AppLayout>
    )
  }

  if (error || !application) {
    return (
      <AppLayout>
        <div className="p-6">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-8 text-center">
              <AlertCircle className="h-8 w-8 mx-auto text-red-500 mb-4" />
              <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Application</h3>
              <p className="text-red-600">{error?.message || 'Application not found'}</p>
              <Button variant="outline" onClick={() => navigate('/payment-applications')} className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Applications
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    )
  }

  const canEdit = application.status === 'draft' || application.status === 'rejected'
  const canSubmit = application.status === 'draft'
  const canApprove = application.status === 'submitted' || application.status === 'under_review'
  const canMarkPaid = application.status === 'approved'
  const canDelete = application.status === 'draft'

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/payment-applications')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{application.display_number}</h1>
                {getStatusBadge(application.status)}
              </div>
              <p className="text-gray-600">
                Period ending {format(new Date(application.period_to), 'MMMM d, yyyy')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Export PDF Button */}
            <Button
              variant="outline"
              onClick={handleExportPDF}
              disabled={isExporting || !sovItems || sovItems.length === 0}
              className="gap-2"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export PDF
            </Button>

            {canEdit && !isEditing && (
              <Button variant="outline" onClick={() => setIsEditing(true)} className="gap-2">
                <Edit className="h-4 w-4" />
                Edit SOV
              </Button>
            )}
            {isEditing && (
              <>
                <Button variant="outline" onClick={() => { setIsEditing(false); setEditedItems({}) }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdits}
                  disabled={Object.keys(editedItems).length === 0 || isLoading2}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </>
            )}
            {canSubmit && !isEditing && (
              <Button onClick={handleSubmit} disabled={isLoading2} className="gap-2">
                <Send className="h-4 w-4" />
                Submit
              </Button>
            )}
            {canApprove && (
              <>
                <Button variant="outline" onClick={() => setRejectDialogOpen(true)} disabled={isLoading2} className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
                <Button onClick={handleApprove} disabled={isLoading2} className="gap-2 bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-4 w-4" />
                  Approve
                </Button>
              </>
            )}
            {canMarkPaid && (
              <Button onClick={() => setMarkPaidDialogOpen(true)} disabled={isLoading2} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <Banknote className="h-4 w-4" />
                Mark Paid
              </Button>
            )}
            {canDelete && (
              <Button variant="ghost" size="sm" onClick={handleDelete} disabled={isLoading2} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Rejection Warning */}
        {application.status === 'rejected' && application.rejection_reason && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-800">Application Rejected</h4>
                  <p className="text-red-700 mt-1">{application.rejection_reason}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* G702 Summary - Contract Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-green-600" />
              AIA G702 - Application and Certificate for Payment
            </CardTitle>
            <CardDescription>Contract summary and payment calculation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Contract Sums */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700 border-b pb-2">Contract Summary</h4>
                <div className="flex justify-between">
                  <span className="text-gray-600">Original Contract Sum:</span>
                  <span className="font-medium">{formatCurrency(application.original_contract_sum)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Net Change Orders:</span>
                  <span className={cn('font-medium', application.net_change_orders >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {application.net_change_orders >= 0 ? '+' : ''}{formatCurrency(application.net_change_orders)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Contract Sum to Date:</span>
                  <span className="font-bold">{formatCurrency(application.contract_sum_to_date)}</span>
                </div>
              </div>

              {/* Work Completed */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700 border-b pb-2">Work Completed</h4>
                <div className="flex justify-between">
                  <span className="text-gray-600">Previous Applications:</span>
                  <span className="font-medium">{formatCurrency(application.total_completed_previous)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">This Period:</span>
                  <span className="font-medium text-blue-600">{formatCurrency(application.total_completed_this_period)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Materials Stored:</span>
                  <span className="font-medium">{formatCurrency(application.total_materials_stored)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Total Completed & Stored:</span>
                  <span className="font-bold">{formatCurrency(application.total_completed_and_stored)}</span>
                </div>
              </div>

              {/* Payment Calculation */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700 border-b pb-2">Payment Calculation</h4>
                <div className="flex justify-between">
                  <span className="text-gray-600">Retainage ({formatPercent(application.retainage_percent)}):</span>
                  <span className="font-medium text-red-600">-{formatCurrency(application.total_retainage)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Earned Less Retainage:</span>
                  <span className="font-medium">{formatCurrency(application.total_earned_less_retainage)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Less Previous Payments:</span>
                  <span className="font-medium text-red-600">-{formatCurrency(application.less_previous_certificates)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 bg-green-50 -mx-3 px-3 py-2 rounded">
                  <span className="font-bold text-green-800">Current Payment Due:</span>
                  <span className="font-bold text-green-700 text-lg">{formatCurrency(application.current_payment_due)}</span>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Project Completion</span>
                <span className="text-sm font-bold">{formatPercent(application.percent_complete)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-600 h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(application.percent_complete || 0, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-sm text-gray-500">
                <span>Balance to Finish: {formatCurrency(application.balance_to_finish)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* G703 Schedule of Values */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              AIA G703 - Schedule of Values
            </CardTitle>
            <CardDescription>Line-by-line breakdown of contract work</CardDescription>
          </CardHeader>
          <CardContent>
            {sovLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : !sovItems || sovItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p>No schedule of values items yet.</p>
                {canEdit && (
                  <Button variant="outline" className="mt-4">
                    Add Line Items
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-2 font-medium">#</th>
                      <th className="text-left p-2 font-medium">Description</th>
                      <th className="text-right p-2 font-medium">Scheduled Value</th>
                      <th className="text-right p-2 font-medium">Previous</th>
                      <th className="text-right p-2 font-medium">This Period</th>
                      <th className="text-right p-2 font-medium">Materials</th>
                      <th className="text-right p-2 font-medium">Total</th>
                      <th className="text-right p-2 font-medium">%</th>
                      <th className="text-right p-2 font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sovItems.map((item) => {
                      const edited = editedItems[item.id]
                      const thisPeriod = edited?.this_period ?? item.work_completed_this_period
                      const stored = edited?.stored ?? item.materials_stored
                      const total = item.work_completed_previous + thisPeriod + stored
                      const pct = item.total_scheduled_value > 0 ? (total / item.total_scheduled_value) * 100 : 0
                      const balance = item.total_scheduled_value - total

                      return (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">{item.item_number}</td>
                          <td className="p-2">
                            <div>{item.description}</div>
                            {item.cost_code && (
                              <div className="text-xs text-gray-500">{item.cost_code}</div>
                            )}
                          </td>
                          <td className="p-2 text-right">{formatCurrency(item.total_scheduled_value)}</td>
                          <td className="p-2 text-right text-gray-600">{formatCurrency(item.work_completed_previous)}</td>
                          <td className="p-2 text-right">
                            {isEditing ? (
                              <Input
                                type="number"
                                value={thisPeriod}
                                onChange={(e) => handleItemChange(item.id, 'this_period', parseFloat(e.target.value) || 0)}
                                className="w-24 text-right"
                              />
                            ) : (
                              <span className="text-blue-600 font-medium">{formatCurrency(thisPeriod)}</span>
                            )}
                          </td>
                          <td className="p-2 text-right">
                            {isEditing ? (
                              <Input
                                type="number"
                                value={stored}
                                onChange={(e) => handleItemChange(item.id, 'stored', parseFloat(e.target.value) || 0)}
                                className="w-24 text-right"
                              />
                            ) : (
                              formatCurrency(stored)
                            )}
                          </td>
                          <td className="p-2 text-right font-medium">{formatCurrency(total)}</td>
                          <td className="p-2 text-right">{pct.toFixed(1)}%</td>
                          <td className="p-2 text-right text-gray-600">{formatCurrency(balance)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 bg-gray-100 font-bold">
                      <td className="p-2" colSpan={2}>TOTALS</td>
                      <td className="p-2 text-right">{formatCurrency(sovTotals?.scheduled_value || 0)}</td>
                      <td className="p-2 text-right">{formatCurrency(sovTotals?.work_completed_previous || 0)}</td>
                      <td className="p-2 text-right text-blue-600">{formatCurrency(sovTotals?.work_completed_this_period || 0)}</td>
                      <td className="p-2 text-right">{formatCurrency(sovTotals?.materials_stored || 0)}</td>
                      <td className="p-2 text-right">{formatCurrency(sovTotals?.total_completed_stored || 0)}</td>
                      <td className="p-2 text-right">
                        {sovTotals && sovTotals.scheduled_value > 0
                          ? ((sovTotals.total_completed_stored / sovTotals.scheduled_value) * 100).toFixed(1)
                          : 0}%
                      </td>
                      <td className="p-2 text-right">{formatCurrency(sovTotals?.balance_to_finish || 0)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lien Waiver Checklist */}
        {application.project_id && applicationId && (
          <WaiverChecklist
            paymentApplicationId={applicationId}
            projectId={application.project_id}
            applicationNumber={application.application_number}
            currentPaymentDue={application.current_payment_due}
            status={application.status}
          />
        )}

        {/* History Timeline */}
        {history && history.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-gray-600" />
                History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {history.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-gray-400 mt-2" />
                    <div>
                      <p className="text-sm">
                        <span className="font-medium capitalize">{entry.action.replace(/_/g, ' ')}</span>
                        {entry.field_changed && (
                          <span className="text-gray-500"> - {entry.field_changed}</span>
                        )}
                        {entry.old_value && entry.new_value && (
                          <span className="text-gray-500">: {entry.old_value} → {entry.new_value}</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(entry.changed_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payment Application</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this application.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this application is being rejected..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                disabled={!rejectionReason || rejectMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {rejectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Reject Application
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mark Paid Dialog */}
      <Dialog open={markPaidDialogOpen} onOpenChange={setMarkPaidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record the payment received for this application.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="payment-amount">Amount Received</Label>
              <Input
                id="payment-amount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder={application?.current_payment_due?.toString() || '0'}
              />
              <p className="text-xs text-gray-500 mt-1">
                Expected: {formatCurrency(application?.current_payment_due)}
              </p>
            </div>
            <div>
              <Label htmlFor="payment-reference">Reference (Check #, Wire Ref, etc.)</Label>
              <Input
                id="payment-reference"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Check #12345"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMarkPaidDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleMarkPaid}
                disabled={!paymentAmount || markPaidMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {markPaidMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Record Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}

export default PaymentApplicationDetailPage
