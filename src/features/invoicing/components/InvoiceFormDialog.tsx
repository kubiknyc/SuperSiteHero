/**
 * Invoice Form Dialog
 * Create or edit an owner invoice
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { CalendarIcon, Loader2, Building2, User, Mail, Phone, MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  useCreateOwnerInvoice,
  useUpdateOwnerInvoice,
} from '@/features/invoicing/hooks/useOwnerInvoices';
import type { OwnerInvoice } from '@/types/owner-invoice';
import { PAYMENT_TERMS_OPTIONS } from '@/types/owner-invoice';

const formSchema = z.object({
  invoiceDate: z.date(),
  dueDate: z.date(),
  paymentTerms: z.string().default('net_30'),
  billToName: z.string().min(1, 'Bill to name is required'),
  billToCompany: z.string().optional(),
  billToEmail: z.string().email().optional().or(z.literal('')),
  billToPhone: z.string().optional(),
  billToAddressLine1: z.string().optional(),
  billToAddressLine2: z.string().optional(),
  billToCity: z.string().optional(),
  billToState: z.string().optional(),
  billToZip: z.string().optional(),
  taxRate: z.string().optional(),
  retainagePercent: z.string().optional(),
  poNumber: z.string().optional(),
  contractNumber: z.string().optional(),
  projectPeriodFrom: z.date().optional().nullable(),
  projectPeriodTo: z.date().optional().nullable(),
  publicNotes: z.string().optional(),
  termsAndConditions: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface InvoiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  invoice?: OwnerInvoice | null;
}

export function InvoiceFormDialog({
  open,
  onOpenChange,
  projectId,
  invoice,
}: InvoiceFormDialogProps) {
  const isEditing = !!invoice;
  const [activeTab, setActiveTab] = useState('billing');

  const createInvoice = useCreateOwnerInvoice();
  const updateInvoice = useUpdateOwnerInvoice();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      invoiceDate: new Date(),
      dueDate: addDays(new Date(), 30),
      paymentTerms: 'net_30',
      billToName: '',
      billToCompany: '',
      billToEmail: '',
      billToPhone: '',
      billToAddressLine1: '',
      billToAddressLine2: '',
      billToCity: '',
      billToState: '',
      billToZip: '',
      taxRate: '0',
      retainagePercent: '0',
      poNumber: '',
      contractNumber: '',
      projectPeriodFrom: null,
      projectPeriodTo: null,
      publicNotes: '',
      termsAndConditions: '',
      notes: '',
    },
  });

  // Update form when invoice changes
  useEffect(() => {
    if (invoice) {
      form.reset({
        invoiceDate: new Date(invoice.invoiceDate),
        dueDate: new Date(invoice.dueDate),
        paymentTerms: invoice.paymentTerms || 'net_30',
        billToName: invoice.billToName,
        billToCompany: invoice.billToCompany || '',
        billToEmail: invoice.billToEmail || '',
        billToPhone: invoice.billToPhone || '',
        billToAddressLine1: invoice.billToAddressLine1 || '',
        billToAddressLine2: invoice.billToAddressLine2 || '',
        billToCity: invoice.billToCity || '',
        billToState: invoice.billToState || '',
        billToZip: invoice.billToZip || '',
        taxRate: String(invoice.taxRate || 0),
        retainagePercent: String(invoice.retainagePercent || 0),
        poNumber: invoice.poNumber || '',
        contractNumber: invoice.contractNumber || '',
        projectPeriodFrom: invoice.projectPeriodFrom
          ? new Date(invoice.projectPeriodFrom)
          : null,
        projectPeriodTo: invoice.projectPeriodTo
          ? new Date(invoice.projectPeriodTo)
          : null,
        publicNotes: invoice.publicNotes || '',
        termsAndConditions: invoice.termsAndConditions || '',
        notes: invoice.notes || '',
      });
    } else {
      form.reset();
    }
  }, [invoice, form]);

  // Update due date when payment terms change
  const watchPaymentTerms = form.watch('paymentTerms');
  const watchInvoiceDate = form.watch('invoiceDate');

  useEffect(() => {
    const term = PAYMENT_TERMS_OPTIONS.find((t) => t.value === watchPaymentTerms);
    if (term && watchInvoiceDate) {
      form.setValue('dueDate', addDays(watchInvoiceDate, term.days));
    }
  }, [watchPaymentTerms, watchInvoiceDate, form]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing && invoice) {
        await updateInvoice.mutateAsync({
          id: invoice.id,
          dto: {
            invoiceDate: format(data.invoiceDate, 'yyyy-MM-dd'),
            dueDate: format(data.dueDate, 'yyyy-MM-dd'),
            paymentTerms: data.paymentTerms,
            billToName: data.billToName,
            billToCompany: data.billToCompany,
            billToEmail: data.billToEmail,
            billToPhone: data.billToPhone,
            billToAddressLine1: data.billToAddressLine1,
            billToAddressLine2: data.billToAddressLine2,
            billToCity: data.billToCity,
            billToState: data.billToState,
            billToZip: data.billToZip,
            taxRate: parseFloat(data.taxRate || '0') / 100,
            retainagePercent: parseFloat(data.retainagePercent || '0'),
            poNumber: data.poNumber,
            contractNumber: data.contractNumber,
            projectPeriodFrom: data.projectPeriodFrom
              ? format(data.projectPeriodFrom, 'yyyy-MM-dd')
              : undefined,
            projectPeriodTo: data.projectPeriodTo
              ? format(data.projectPeriodTo, 'yyyy-MM-dd')
              : undefined,
            publicNotes: data.publicNotes,
            termsAndConditions: data.termsAndConditions,
            notes: data.notes,
          },
        });
        toast.success('Invoice updated');
      } else {
        await createInvoice.mutateAsync({
          projectId,
          invoiceDate: format(data.invoiceDate, 'yyyy-MM-dd'),
          dueDate: format(data.dueDate, 'yyyy-MM-dd'),
          paymentTerms: data.paymentTerms,
          billToName: data.billToName,
          billToCompany: data.billToCompany,
          billToEmail: data.billToEmail,
          billToAddressLine1: data.billToAddressLine1,
          billToCity: data.billToCity,
          billToState: data.billToState,
          billToZip: data.billToZip,
          taxRate: parseFloat(data.taxRate || '0') / 100,
          retainagePercent: parseFloat(data.retainagePercent || '0'),
          poNumber: data.poNumber,
          contractNumber: data.contractNumber,
          projectPeriodFrom: data.projectPeriodFrom
            ? format(data.projectPeriodFrom, 'yyyy-MM-dd')
            : undefined,
          projectPeriodTo: data.projectPeriodTo
            ? format(data.projectPeriodTo, 'yyyy-MM-dd')
            : undefined,
          publicNotes: data.publicNotes,
          termsAndConditions: data.termsAndConditions,
          notes: data.notes,
        });
        toast.success('Invoice created');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditing ? 'Failed to update invoice' : 'Failed to create invoice');
    }
  };

  const isSubmitting = createInvoice.isPending || updateInvoice.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Invoice' : 'Create Invoice'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the invoice details below'
              : 'Fill in the details to create a new invoice'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="billing">Billing</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>

              {/* Billing Tab */}
              <TabsContent value="billing" className="space-y-4 mt-4">
                {/* Invoice Date and Due Date */}
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="invoiceDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Invoice Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'PPP')
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Terms</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select terms" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PAYMENT_TERMS_OPTIONS.map((term) => (
                              <SelectItem key={term.value} value={term.value}>
                                {term.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Due Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'PPP')
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Bill To Section */}
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Bill To
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="billToName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="John Smith" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="billToCompany"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company</FormLabel>
                          <FormControl>
                            <Input placeholder="ABC Properties LLC" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="billToEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="billToPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="billToAddressLine1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main Street" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="billToAddressLine2"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Suite 100" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="billToCity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="New York" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="billToState"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input placeholder="NY" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="billToZip"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP</FormLabel>
                          <FormControl>
                            <Input placeholder="10001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="poNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PO Number</FormLabel>
                        <FormControl>
                          <Input placeholder="PO-12345" {...field} />
                        </FormControl>
                        <FormDescription>Client's purchase order number</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contractNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contract Number</FormLabel>
                        <FormControl>
                          <Input placeholder="CTR-2025-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="taxRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax Rate (%)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="8.25" {...field} />
                        </FormControl>
                        <FormDescription>Enter as percentage (e.g., 8.25 for 8.25%)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="retainagePercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Retainage (%)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="10" {...field} />
                        </FormControl>
                        <FormDescription>Percentage withheld until completion</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="projectPeriodFrom"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Billing Period From</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'PPP')
                                ) : (
                                  <span>Start date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value || undefined}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="projectPeriodTo"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Billing Period To</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'PPP')
                                ) : (
                                  <span>End date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value || undefined}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Notes Tab */}
              <TabsContent value="notes" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="publicNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Public Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Notes shown on the invoice to the client..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        These notes will appear on the invoice
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="termsAndConditions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Terms & Conditions</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Payment terms, late fees, etc..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Internal Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Internal notes (not shown to client)..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>For internal use only</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? 'Save Changes' : 'Create Invoice'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
