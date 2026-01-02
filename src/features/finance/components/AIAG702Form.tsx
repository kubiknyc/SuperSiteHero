/**
 * AIA G702 Form Component
 *
 * Application and Certificate for Payment
 * Industry-standard payment application form with:
 * - Contractor and project information
 * - Current payment due calculation
 * - Retainage tracking
 * - Signature fields
 * - Print-ready layout
 */

import { useState, useMemo, useRef } from 'react'
import {
  Printer,
  Download,
  Save,
  Send,
  Check,
  X,
  AlertTriangle,
  FileText,
  Edit2,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import {
  usePaymentApplication,
  useUpdatePaymentApplication,
  useSubmitPaymentApplication,
  useApprovePaymentApplication,
  useMarkApplicationPaid,
  useRejectPaymentApplication,
  useAddSignature,
} from '../hooks/usePaymentApplications'
import type { AIAG702 } from '../types/sov'

// ============================================================================
// TYPES
// ============================================================================

interface AIAG702FormProps {
  applicationId: string
  projectName?: string
  projectNumber?: string
  projectAddress?: string
  ownerName?: string
  ownerAddress?: string
  architectName?: string
  contractorName?: string
  contractorAddress?: string
  contractDate?: string
  isEditable?: boolean
  onViewG703?: () => void
  className?: string
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(date: string | null | undefined): string {
  if (!date) return ''
  try {
    return format(parseISO(date), 'MMMM d, yyyy')
  } catch {
    return date
  }
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'draft':
      return { label: 'Draft', variant: 'secondary' as const, color: 'text-gray-600' }
    case 'submitted':
      return { label: 'Submitted', variant: 'default' as const, color: 'text-blue-600' }
    case 'approved':
      return { label: 'Approved', variant: 'default' as const, color: 'text-green-600' }
    case 'paid':
      return { label: 'Paid', variant: 'default' as const, color: 'text-green-700' }
    case 'rejected':
      return { label: 'Rejected', variant: 'destructive' as const, color: 'text-red-600' }
    default:
      return { label: status, variant: 'outline' as const, color: 'text-gray-600' }
  }
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface FormRowProps {
  label: string
  value: string | number
  isCurrency?: boolean
  isTotal?: boolean
  lineNumber?: string
  className?: string
}

function FormRow({ label, value, isCurrency = false, isTotal = false, lineNumber, className }: FormRowProps) {
  const displayValue = isCurrency ? formatCurrency(typeof value === 'number' ? value : 0) : value

  return (
    <div className={cn(
      'grid grid-cols-12 gap-4 py-2 border-b border-gray-200',
      isTotal && 'bg-gray-50 font-bold',
      className
    )}>
      <div className="col-span-1 text-sm text-gray-500">{lineNumber}</div>
      <div className="col-span-7 text-sm">{label}</div>
      <div className={cn('col-span-4 text-right font-mono', isTotal && 'text-lg')}>
        {displayValue}
      </div>
    </div>
  )
}

interface SignatureBlockProps {
  title: string
  name?: string | null
  signatureUrl?: string | null
  date?: string | null
  onSign?: () => void
  canSign?: boolean
}

function SignatureBlock({ title, name, signatureUrl, date, onSign, canSign }: SignatureBlockProps) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <h4 className="font-medium text-sm text-gray-700">{title}</h4>
      <div className="h-16 border-b border-gray-300 flex items-end justify-center">
        {signatureUrl ? (
          <img src={signatureUrl} alt="Signature" className="max-h-14 object-contain" />
        ) : canSign ? (
          <Button variant="ghost" size="sm" onClick={onSign}>
            <Edit2 className="h-4 w-4 mr-2" />
            Sign
          </Button>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-500">Name:</span>
          <span className="ml-2">{name || '_______________'}</span>
        </div>
        <div>
          <span className="text-gray-500">Date:</span>
          <span className="ml-2">{date ? formatDate(date) : '_______________'}</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AIAG702Form({
  applicationId,
  projectName = '',
  projectNumber = '',
  projectAddress = '',
  ownerName = '',
  ownerAddress = '',
  architectName = '',
  contractorName = '',
  contractorAddress = '',
  contractDate = '',
  isEditable = true,
  onViewG703,
  className,
}: AIAG702FormProps) {
  const { data: application, isLoading, error, refetch } = usePaymentApplication(applicationId)
  const updateApplication = useUpdatePaymentApplication()
  const submitApplication = useSubmitPaymentApplication()
  const approveApplication = useApprovePaymentApplication()
  const markPaid = useMarkApplicationPaid()
  const rejectApplication = useRejectPaymentApplication()
  const addSignature = useAddSignature()

  const printRef = useRef<HTMLDivElement>(null)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [certificationAmount, setCertificationAmount] = useState('')
  const [checkNumber, setCheckNumber] = useState('')
  const [paymentDate, setPaymentDate] = useState('')

  // Handle print
  const handlePrint = () => {
    window.print()
  }

  // Handle submit
  const handleSubmit = async () => {
    await submitApplication.mutateAsync(applicationId)
  }

  // Handle approve
  const handleApprove = async () => {
    await approveApplication.mutateAsync({
      id: applicationId,
      certificationAmount: certificationAmount ? parseFloat(certificationAmount) : undefined,
      architectName,
    })
    setShowApproveDialog(false)
    setCertificationAmount('')
  }

  // Handle reject
  const handleReject = async () => {
    if (!rejectReason.trim()) return
    await rejectApplication.mutateAsync({
      id: applicationId,
      reason: rejectReason.trim(),
    })
    setShowRejectDialog(false)
    setRejectReason('')
  }

  // Handle mark paid
  const handleMarkPaid = async () => {
    await markPaid.mutateAsync({
      id: applicationId,
      checkNumber: checkNumber.trim() || undefined,
      paymentDate: paymentDate || undefined,
    })
    setShowPaymentDialog(false)
    setCheckNumber('')
    setPaymentDate('')
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error || !application) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <p className="text-lg font-medium">Error loading application</p>
          <p className="text-sm text-muted-foreground mb-4">
            {error?.message || 'Application not found'}
          </p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const statusConfig = getStatusConfig(application.status)
  const canEdit = isEditable && application.status === 'draft'
  const canSubmit = application.status === 'draft'
  const canApprove = application.status === 'submitted'
  const canReject = application.status === 'submitted'
  const canMarkPaid = application.status === 'approved'

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header Actions */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Application #{application.application_number}</h2>
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        </div>
        <div className="flex gap-2">
          {onViewG703 && (
            <Button variant="outline" onClick={onViewG703}>
              <FileText className="h-4 w-4 mr-2" />
              View G703
            </Button>
          )}
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          {canSubmit && (
            <Button onClick={handleSubmit} disabled={submitApplication.isPending}>
              <Send className="h-4 w-4 mr-2" />
              {submitApplication.isPending ? 'Submitting...' : 'Submit'}
            </Button>
          )}
          {canApprove && (
            <Button onClick={() => setShowApproveDialog(true)} className="bg-green-600 hover:bg-green-700">
              <Check className="h-4 w-4 mr-2" />
              Approve
            </Button>
          )}
          {canReject && (
            <Button variant="destructive" onClick={() => setShowRejectDialog(true)}>
              <X className="h-4 w-4 mr-2" />
              Reject
            </Button>
          )}
          {canMarkPaid && (
            <Button onClick={() => setShowPaymentDialog(true)} className="bg-green-600 hover:bg-green-700">
              <Check className="h-4 w-4 mr-2" />
              Mark Paid
            </Button>
          )}
        </div>
      </div>

      {/* Rejection Notice */}
      {application.status === 'rejected' && application.rejection_reason && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Application Rejected</p>
              <p className="text-sm text-red-700">{application.rejection_reason}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AIA G702 Form */}
      <Card ref={printRef} className="print:shadow-none print:border-0">
        <CardContent className="p-8">
          {/* Form Header */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold">APPLICATION AND CERTIFICATE FOR PAYMENT</h1>
            <p className="text-sm text-gray-600">AIA DOCUMENT G702</p>
          </div>

          {/* Project Information Grid */}
          <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
            <div className="space-y-4">
              <div>
                <Label className="text-gray-600">TO OWNER:</Label>
                <p className="font-medium">{ownerName}</p>
                <p className="text-gray-600">{ownerAddress}</p>
              </div>
              <div>
                <Label className="text-gray-600">FROM CONTRACTOR:</Label>
                <p className="font-medium">{contractorName}</p>
                <p className="text-gray-600">{contractorAddress}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-600">PROJECT:</Label>
                <p className="font-medium">{projectName}</p>
                <p className="text-gray-600">{projectAddress}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600">Application No:</Label>
                  <p className="font-medium">{application.application_number}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Period To:</Label>
                  <p className="font-medium">{formatDate(application.period_to)}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Project No:</Label>
                  <p className="font-medium">{projectNumber}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Contract Date:</Label>
                  <p className="font-medium">{formatDate(contractDate)}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Contractor's Application */}
          <div className="mb-6">
            <h3 className="font-bold mb-4">CONTRACTOR'S APPLICATION FOR PAYMENT</h3>
            <p className="text-sm text-gray-600 mb-4">
              Application is made for payment, as shown below, in connection with the Contract.
              Continuation Sheet, AIA Document G703, is attached.
            </p>

            <div className="space-y-1 border rounded-lg p-4">
              <FormRow
                lineNumber="1."
                label="ORIGINAL CONTRACT SUM"
                value={application.original_contract_sum}
                isCurrency
              />
              <FormRow
                lineNumber="2."
                label="Net change by Change Orders"
                value={application.net_change_by_change_orders}
                isCurrency
              />
              <FormRow
                lineNumber="3."
                label="CONTRACT SUM TO DATE (Line 1 + 2)"
                value={application.contract_sum_to_date}
                isCurrency
                isTotal
              />
              <FormRow
                lineNumber="4."
                label="TOTAL COMPLETED & STORED TO DATE (Column G on G703)"
                value={application.total_completed_and_stored_to_date}
                isCurrency
              />
              <FormRow
                lineNumber="5."
                label="RETAINAGE:"
                value=""
              />
              <div className="pl-8 space-y-1">
                <FormRow
                  lineNumber="a."
                  label="From work completed"
                  value={application.retainage_from_work_completed}
                  isCurrency
                />
                <FormRow
                  lineNumber="b."
                  label="From stored materials"
                  value={application.retainage_from_stored_materials}
                  isCurrency
                />
                <FormRow
                  lineNumber=""
                  label="Total Retainage (Lines 5a + 5b)"
                  value={application.total_retainage}
                  isCurrency
                  isTotal
                />
              </div>
              <FormRow
                lineNumber="6."
                label="TOTAL EARNED LESS RETAINAGE (Line 4 Less Line 5 Total)"
                value={application.total_earned_less_retainage}
                isCurrency
                isTotal
              />
              <FormRow
                lineNumber="7."
                label="LESS PREVIOUS CERTIFICATES FOR PAYMENT (Line 6 from prior Certificate)"
                value={application.less_previous_certificates}
                isCurrency
              />
              <FormRow
                lineNumber="8."
                label="CURRENT PAYMENT DUE"
                value={application.current_payment_due}
                isCurrency
                isTotal
                className="bg-blue-50"
              />
              <FormRow
                lineNumber="9."
                label="BALANCE TO FINISH, INCLUDING RETAINAGE (Line 3 less Line 6)"
                value={application.balance_to_finish_including_retainage}
                isCurrency
              />
            </div>
          </div>

          <Separator className="my-6" />

          {/* Change Order Summary */}
          <div className="mb-6">
            <h3 className="font-bold mb-4">CHANGE ORDER SUMMARY</h3>
            <div className="grid grid-cols-4 gap-4 text-sm border rounded-lg p-4">
              <div></div>
              <div className="text-center font-medium">ADDITIONS</div>
              <div className="text-center font-medium">DEDUCTIONS</div>
              <div className="text-center font-medium">NET CHANGES</div>
              <div>Total changes approved in previous months</div>
              <div className="text-center font-mono">$0.00</div>
              <div className="text-center font-mono">$0.00</div>
              <div className="text-center font-mono">$0.00</div>
              <div>Total approved this Month</div>
              <div className="text-center font-mono">$0.00</div>
              <div className="text-center font-mono">$0.00</div>
              <div className="text-center font-mono">$0.00</div>
              <div className="font-bold">TOTALS</div>
              <div className="text-center font-mono font-bold">$0.00</div>
              <div className="text-center font-mono font-bold">$0.00</div>
              <div className="text-center font-mono font-bold">
                {formatCurrency(application.net_change_by_change_orders)}
              </div>
              <div className="col-span-4 text-center pt-2 border-t font-bold">
                NET CHANGES by Change Order: {formatCurrency(application.net_change_by_change_orders)}
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-6">
              <SignatureBlock
                title="CONTRACTOR"
                name={application.contractor_name}
                signatureUrl={application.contractor_signature_url}
                date={application.contractor_signature_date}
                canSign={canEdit}
              />
              <SignatureBlock
                title="NOTARY PUBLIC (if required)"
                name={application.notarized ? 'Notarized' : undefined}
                date={application.notary_date}
                canSign={false}
              />
              {application.notarized && (
                <div className="text-sm text-gray-600">
                  <p>State of: {application.notary_state}</p>
                  <p>County of: {application.notary_county}</p>
                </div>
              )}
            </div>
            <div className="space-y-6">
              <div className="border rounded-lg p-4">
                <h4 className="font-bold mb-4">ARCHITECT'S CERTIFICATE FOR PAYMENT</h4>
                <p className="text-sm text-gray-600 mb-4">
                  In accordance with the Contract Documents, based on on-site observations and the data
                  comprising the application, the Architect certifies to the Owner that to the best of
                  the Architect's knowledge, information and belief the Work has progressed as indicated,
                  the quality of the Work is in accordance with the Contract Documents, and the
                  Contractor is entitled to payment of the AMOUNT CERTIFIED.
                </p>
                <div className="bg-gray-50 rounded-lg p-4 text-center mb-4">
                  <p className="text-sm text-gray-600">AMOUNT CERTIFIED</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(application.architect_certification_amount || application.current_payment_due)}
                  </p>
                </div>
              </div>
              <SignatureBlock
                title="ARCHITECT"
                name={application.architect_name || architectName}
                signatureUrl={application.architect_signature_url}
                date={application.architect_signature_date}
                canSign={canApprove}
              />
            </div>
          </div>

          {/* Payment Information (if paid) */}
          {application.status === 'paid' && (
            <>
              <Separator className="my-6" />
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-bold text-green-800 mb-2">Payment Recorded</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Date Paid:</span>
                    <span className="ml-2 font-medium">{formatDate(application.date_paid)}</span>
                  </div>
                  {application.check_number && (
                    <div>
                      <span className="text-gray-600">Check Number:</span>
                      <span className="ml-2 font-medium">{application.check_number}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-600">Amount:</span>
                    <span className="ml-2 font-medium">{formatCurrency(application.current_payment_due)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Payment Application</DialogTitle>
            <DialogDescription>
              Certify this application for payment. You may adjust the certified amount if necessary.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Requested Amount</Label>
              <p className="text-2xl font-bold">{formatCurrency(application.current_payment_due)}</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="certification">Certified Amount (optional adjustment)</Label>
              <Input
                id="certification"
                type="number"
                step="0.01"
                placeholder={String(application.current_payment_due)}
                value={certificationAmount}
                onChange={(e) => setCertificationAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={approveApplication.isPending} className="bg-green-600 hover:bg-green-700">
              {approveApplication.isPending ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Payment Application</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this application.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={!rejectReason.trim() || rejectApplication.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {rejectApplication.isPending ? 'Rejecting...' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Enter payment details for this application.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Amount Due</Label>
              <p className="text-2xl font-bold">{formatCurrency(application.current_payment_due)}</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="check-number">Check Number (optional)</Label>
              <Input
                id="check-number"
                placeholder="Enter check number"
                value={checkNumber}
                onChange={(e) => setCheckNumber(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payment-date">Payment Date</Label>
              <Input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkPaid} disabled={markPaid.isPending} className="bg-green-600 hover:bg-green-700">
              {markPaid.isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AIAG702Form
