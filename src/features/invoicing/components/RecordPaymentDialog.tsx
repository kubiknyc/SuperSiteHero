/**
 * Record Payment Dialog
 * Record a payment against an invoice
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { CalendarIcon, Loader2, DollarSign } from 'lucide-react';
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
import { cn, formatCurrency } from '@/lib/utils';
import { useRecordPayment } from '@/features/invoicing/hooks/useOwnerInvoices';
import { PAYMENT_METHODS } from '@/types/owner-invoice';

const formSchema = z.object({
  paymentDate: z.date(),
  amount: z.string().min(1, 'Amount is required'),
  paymentMethod: z.string().optional(),
  referenceNumber: z.string().optional(),
  depositedToAccount: z.string().optional(),
  depositedAt: z.date().optional().nullable(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  balanceDue: number;
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  invoiceId,
  balanceDue,
}: RecordPaymentDialogProps) {
  const recordPayment = useRecordPayment();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paymentDate: new Date(),
      amount: balanceDue.toFixed(2),
      paymentMethod: '',
      referenceNumber: '',
      depositedToAccount: '',
      depositedAt: null,
      notes: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    const amount = parseFloat(data.amount);
    if (amount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    try {
      await recordPayment.mutateAsync({
        invoiceId,
        paymentDate: format(data.paymentDate, 'yyyy-MM-dd'),
        amount,
        paymentMethod: data.paymentMethod as 'check' | 'wire' | 'ach' | 'credit_card' | 'cash' | 'other' | undefined,
        referenceNumber: data.referenceNumber || undefined,
        depositedToAccount: data.depositedToAccount || undefined,
        depositedAt: data.depositedAt ? format(data.depositedAt, 'yyyy-MM-dd') : undefined,
        notes: data.notes || undefined,
      });
      toast.success('Payment recorded');
      form.reset();
      onOpenChange(false);
    } catch (_error) {
      toast.error('Failed to record payment');
    }
  };

  // Quick amount buttons
  const handleQuickAmount = (amount: number) => {
    form.setValue('amount', amount.toFixed(2));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Record Payment
          </DialogTitle>
          <DialogDescription>
            Record a payment received for this invoice
          </DialogDescription>
        </DialogHeader>

        {/* Balance Due Banner */}
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="text-sm text-amber-700 dark:text-amber-400">Balance Due</div>
          <div className="text-2xl font-bold text-amber-900 dark:text-amber-300">
            {formatCurrency(balanceDue)}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Payment Date *</FormLabel>
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
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PAYMENT_METHODS.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-9"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quick Amount Buttons */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(balanceDue)}
              >
                Full Balance
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(balanceDue * 0.5)}
              >
                50%
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(balanceDue * 0.25)}
              >
                25%
              </Button>
            </div>

            <FormField
              control={form.control}
              name="referenceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Check #, Wire Ref, etc." {...field} />
                  </FormControl>
                  <FormDescription>
                    Check number, wire reference, or transaction ID
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="depositedToAccount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deposited To</FormLabel>
                    <FormControl>
                      <Input placeholder="Account name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="depositedAt"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Deposit Date</FormLabel>
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
                              <span>Not deposited</span>
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

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Payment notes..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={recordPayment.isPending}>
                {recordPayment.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Record Payment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
