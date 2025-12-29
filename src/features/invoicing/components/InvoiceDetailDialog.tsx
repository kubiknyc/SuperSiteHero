/**
 * Invoice Detail Dialog
 * View invoice details, line items, and payments
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  FileText,
  Send,
  Download,
  Edit,
  Plus,
  Trash2,
  DollarSign,
  Calendar,
  Building2,
  Mail,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  CreditCard,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';
import {
  useOwnerInvoiceWithDetails,
  useSendOwnerInvoice,
} from '@/features/invoicing/hooks/useOwnerInvoices';
import { LineItemFormDialog } from './LineItemFormDialog';
import { RecordPaymentDialog } from './RecordPaymentDialog';
import type { OwnerInvoiceStatus } from '@/types/owner-invoice';
import { OWNER_INVOICE_STATUSES } from '@/types/owner-invoice';

/**
 * Get status color class
 */
function getStatusColorClass(status: OwnerInvoiceStatus): string {
  switch (status) {
    case 'paid':
      return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
    case 'sent':
      return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
    case 'viewed':
      return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400';
    case 'partially_paid':
      return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'overdue':
      return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
    case 'disputed':
      return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400';
    default:
      return 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400';
  }
}

interface InvoiceDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string | undefined;
  onEdit?: () => void;
}

export function InvoiceDetailDialog({
  open,
  onOpenChange,
  invoiceId,
  onEdit,
}: InvoiceDetailDialogProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [isLineItemFormOpen, setIsLineItemFormOpen] = useState(false);
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);

  const { data: invoice, isLoading } = useOwnerInvoiceWithDetails(invoiceId);
  const sendInvoice = useSendOwnerInvoice();

  const handleSendInvoice = async () => {
    if (!invoiceId) {return;}
    try {
      await sendInvoice.mutateAsync({ id: invoiceId });
      toast.success('Invoice sent');
    } catch (error) {
      toast.error('Failed to send invoice');
    }
  };

  if (!invoiceId) {return null;}

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice Details
          </SheetTitle>
          <SheetDescription>
            View and manage invoice information
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4 mt-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : invoice ? (
          <div className="mt-6 space-y-6">
            {/* Header with status and actions */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold">{invoice.invoiceNumber}</h2>
                <Badge className={getStatusColorClass(invoice.status)}>
                  {OWNER_INVOICE_STATUSES.find((s) => s.value === invoice.status)?.label ||
                    invoice.status}
                </Badge>
              </div>
              <div className="flex gap-2">
                {invoice.status === 'draft' && (
                  <>
                    {onEdit && (
                      <Button variant="outline" size="sm" onClick={onEdit}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={handleSendInvoice}
                      disabled={sendInvoice.isPending}
                    >
                      {sendInvoice.isPending ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-1" />
                      )}
                      Send
                    </Button>
                  </>
                )}
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  PDF
                </Button>
              </div>
            </div>

            {/* Amount Summary */}
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-sm text-muted-foreground">Total</div>
                    <div className="text-xl font-bold">
                      {formatCurrency(invoice.totalAmount)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Paid</div>
                    <div className="text-xl font-bold text-green-600">
                      {formatCurrency(invoice.amountPaid)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Balance</div>
                    <div
                      className={`text-xl font-bold ${
                        invoice.balanceDue > 0 ? 'text-amber-600' : 'text-green-600'
                      }`}
                    >
                      {formatCurrency(invoice.balanceDue)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="items">
                  Line Items ({invoice.lineItems?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="payments">
                  Payments ({invoice.payments?.length || 0})
                </TabsTrigger>
              </TabsList>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Dates */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Dates
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Invoice Date</span>
                        <span>{format(new Date(invoice.invoiceDate), 'PPP')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Due Date</span>
                        <span>{format(new Date(invoice.dueDate), 'PPP')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payment Terms</span>
                        <span>{invoice.paymentTerms}</span>
                      </div>
                      {invoice.sentAt && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Sent</span>
                          <span>{format(new Date(invoice.sentAt), 'PPP')}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Bill To */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        Bill To
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <div className="font-medium">{invoice.billToName}</div>
                      {invoice.billToCompany && (
                        <div className="text-muted-foreground">{invoice.billToCompany}</div>
                      )}
                      {invoice.billToAddressLine1 && (
                        <div className="text-muted-foreground">
                          {invoice.billToAddressLine1}
                          {invoice.billToAddressLine2 && <>, {invoice.billToAddressLine2}</>}
                        </div>
                      )}
                      {(invoice.billToCity || invoice.billToState || invoice.billToZip) && (
                        <div className="text-muted-foreground">
                          {[invoice.billToCity, invoice.billToState, invoice.billToZip]
                            .filter(Boolean)
                            .join(', ')}
                        </div>
                      )}
                      {invoice.billToEmail && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {invoice.billToEmail}
                        </div>
                      )}
                      {invoice.billToPhone && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {invoice.billToPhone}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Amount Details */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      Amount Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatCurrency(invoice.subtotal)}</span>
                      </div>
                      {invoice.taxRate && invoice.taxRate > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Tax ({(invoice.taxRate * 100).toFixed(2)}%)
                          </span>
                          <span>{formatCurrency(invoice.taxAmount)}</span>
                        </div>
                      )}
                      {invoice.discountAmount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount</span>
                          <span>-{formatCurrency(invoice.discountAmount)}</span>
                        </div>
                      )}
                      {invoice.retainageAmount > 0 && (
                        <div className="flex justify-between text-amber-600">
                          <span>Retainage ({invoice.retainagePercent}%)</span>
                          <span>-{formatCurrency(invoice.retainageAmount)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-bold">
                        <span>Total</span>
                        <span>{formatCurrency(invoice.totalAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount Paid</span>
                        <span className="text-green-600">
                          -{formatCurrency(invoice.amountPaid)}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Balance Due</span>
                        <span
                          className={
                            invoice.balanceDue > 0 ? 'text-amber-600' : 'text-green-600'
                          }
                        >
                          {formatCurrency(invoice.balanceDue)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                {(invoice.publicNotes || invoice.notes) && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Notes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {invoice.publicNotes && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">
                            Invoice Notes
                          </div>
                          <p>{invoice.publicNotes}</p>
                        </div>
                      )}
                      {invoice.notes && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">
                            Internal Notes
                          </div>
                          <p className="text-muted-foreground">{invoice.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Line Items Tab */}
              <TabsContent value="items" className="mt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium">Line Items</h3>
                  {invoice.status === 'draft' && (
                    <Button size="sm" onClick={() => setIsLineItemFormOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  )}
                </div>

                {invoice.lineItems && invoice.lineItems.length > 0 ? (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right w-[80px]">Qty</TableHead>
                          <TableHead className="text-right w-[100px]">Rate</TableHead>
                          <TableHead className="text-right w-[100px]">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoice.lineItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-muted-foreground">
                              {item.lineNumber}
                            </TableCell>
                            <TableCell>
                              <div>{item.description}</div>
                              {item.costCode && (
                                <div className="text-xs text-muted-foreground">
                                  {item.costCode}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.quantity} {item.unit}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.unitPrice)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(item.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell colSpan={4} className="text-right font-medium">
                            Subtotal
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(invoice.subtotal)}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No line items</p>
                      {invoice.status === 'draft' && (
                        <Button
                          size="sm"
                          className="mt-4"
                          onClick={() => setIsLineItemFormOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Line Item
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Payments Tab */}
              <TabsContent value="payments" className="mt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium">Payments</h3>
                  {invoice.balanceDue > 0 && (
                    <Button size="sm" onClick={() => setIsPaymentFormOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Record Payment
                    </Button>
                  )}
                </div>

                {invoice.payments && invoice.payments.length > 0 ? (
                  <div className="space-y-2">
                    {invoice.payments.map((payment) => (
                      <Card key={payment.id}>
                        <CardContent className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                              <CreditCard className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <div className="font-medium">
                                {formatCurrency(payment.amount)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {format(new Date(payment.paymentDate), 'PPP')}
                                {payment.referenceNumber && ` - ${payment.referenceNumber}`}
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline">
                            {payment.paymentMethod || 'Other'}
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <DollarSign className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No payments recorded</p>
                      {invoice.balanceDue > 0 && (
                        <Button
                          size="sm"
                          className="mt-4"
                          onClick={() => setIsPaymentFormOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Record Payment
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Invoice not found</p>
          </div>
        )}

        {/* Line Item Form Dialog */}
        {invoice && (
          <LineItemFormDialog
            open={isLineItemFormOpen}
            onOpenChange={setIsLineItemFormOpen}
            invoiceId={invoice.id}
          />
        )}

        {/* Record Payment Dialog */}
        {invoice && (
          <RecordPaymentDialog
            open={isPaymentFormOpen}
            onOpenChange={setIsPaymentFormOpen}
            invoiceId={invoice.id}
            balanceDue={invoice.balanceDue}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
