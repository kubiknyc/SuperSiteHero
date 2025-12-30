/**
 * Line Item Form Dialog
 * Add or edit invoice line items
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateLineItem } from '@/features/invoicing/hooks/useOwnerInvoices';
import { LINE_ITEM_UNITS } from '@/types/owner-invoice';

const formSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.string().min(1, 'Quantity is required'),
  unit: z.string().optional(),
  unitPrice: z.string().min(1, 'Unit price is required'),
  costCode: z.string().optional(),
  isTaxable: z.boolean().default(true),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface LineItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
}

export function LineItemFormDialog({
  open,
  onOpenChange,
  invoiceId,
}: LineItemFormDialogProps) {
  const createLineItem = useCreateLineItem();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
      quantity: '1',
      unit: 'LS',
      unitPrice: '',
      costCode: '',
      isTaxable: true,
      notes: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await createLineItem.mutateAsync({
        invoiceId,
        description: data.description,
        quantity: parseFloat(data.quantity),
        unit: data.unit || undefined,
        unitPrice: parseFloat(data.unitPrice),
        costCode: data.costCode || undefined,
        isTaxable: data.isTaxable,
        notes: data.notes || undefined,
      });
      toast.success('Line item added');
      form.reset();
      onOpenChange(false);
    } catch (_error) {
      toast.error('Failed to add line item');
    }
  };

  // Calculate amount preview
  const quantity = parseFloat(form.watch('quantity') || '0');
  const unitPrice = parseFloat(form.watch('unitPrice') || '0');
  const amount = quantity * unitPrice;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Line Item</DialogTitle>
          <DialogDescription>
            Add a new line item to this invoice
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Concrete work for foundation..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LINE_ITEM_UNITS.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
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
                name="unitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Price *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Amount Preview */}
            {amount > 0 && (
              <div className="p-3 bg-muted rounded-md text-center">
                <div className="text-sm text-muted-foreground">Line Total</div>
                <div className="text-xl font-bold">
                  ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="costCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost Code</FormLabel>
                  <FormControl>
                    <Input placeholder="03 30 00" {...field} />
                  </FormControl>
                  <FormDescription>Optional CSI cost code</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isTaxable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Taxable</FormLabel>
                    <FormDescription>
                      Apply tax to this line item
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes..."
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
              <Button type="submit" disabled={createLineItem.isPending}>
                {createLineItem.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Add Line Item
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
