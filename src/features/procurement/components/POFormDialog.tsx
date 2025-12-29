/**
 * Purchase Order Form Dialog
 *
 * Dialog for creating and editing purchase orders.
 */

import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Loader2,
  Building2,
  Package,
  DollarSign,
} from 'lucide-react';
import {
  useVendors,
  useCreatePurchaseOrder,
  useUpdatePurchaseOrder,
} from '../hooks/useProcurement';
import { useAuth } from '@/lib/auth/AuthContext';
import { MATERIAL_UNITS } from '@/types/procurement';
import type {
  PurchaseOrderWithDetails,
  CreatePurchaseOrderDTO,
  CreatePOLineItemDTO,
} from '@/types/procurement';

interface POFormDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder?: PurchaseOrderWithDetails;
  onSuccess?: (po: PurchaseOrderWithDetails) => void;
}

interface FormData {
  vendor_id: string;
  order_date: string;
  required_date: string;
  expected_delivery_date: string;
  tax_rate: string;
  shipping_amount: string;
  notes: string;
  special_instructions: string;
  line_items: {
    description: string;
    sku: string;
    quantity: string;
    unit: string;
    unit_price: string;
  }[];
}

export function POFormDialog({
  projectId,
  open,
  onOpenChange,
  purchaseOrder,
  onSuccess,
}: POFormDialogProps) {
  const isEditMode = !!purchaseOrder;
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('info');

  // Fetch vendors
  const { data: vendors = [] } = useVendors({
    company_id: userProfile?.company_id,
    is_active: true,
  });

  // Mutations
  const createPO = useCreatePurchaseOrder();
  const updatePO = useUpdatePurchaseOrder();

  const isSubmitting = createPO.isPending || updatePO.isPending;

  // Form setup
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      vendor_id: '',
      order_date: '',
      required_date: '',
      expected_delivery_date: '',
      tax_rate: '0',
      shipping_amount: '0',
      notes: '',
      special_instructions: '',
      line_items: [{ description: '', sku: '', quantity: '1', unit: 'EA', unit_price: '0' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'line_items',
  });

  const lineItems = watch('line_items');
  const taxRate = parseFloat(watch('tax_rate') || '0') / 100;
  const shippingAmount = parseFloat(watch('shipping_amount') || '0');

  // Calculate totals
  const subtotal = useMemo(() => {
    return lineItems.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      return sum + qty * price;
    }, 0);
  }, [lineItems]);

  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount + shippingAmount;

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (purchaseOrder) {
        reset({
          vendor_id: purchaseOrder.vendor_id || '',
          order_date: purchaseOrder.order_date
            ? format(new Date(purchaseOrder.order_date), 'yyyy-MM-dd')
            : '',
          required_date: purchaseOrder.required_date
            ? format(new Date(purchaseOrder.required_date), 'yyyy-MM-dd')
            : '',
          expected_delivery_date: purchaseOrder.expected_delivery_date
            ? format(new Date(purchaseOrder.expected_delivery_date), 'yyyy-MM-dd')
            : '',
          tax_rate: ((purchaseOrder.tax_rate || 0) * 100).toString(),
          shipping_amount: (purchaseOrder.shipping_amount || 0).toString(),
          notes: purchaseOrder.notes || '',
          special_instructions: purchaseOrder.special_instructions || '',
          line_items:
            purchaseOrder.line_items?.map((item) => ({
              description: item.description,
              sku: item.sku || '',
              quantity: item.quantity.toString(),
              unit: item.unit || 'EA',
              unit_price: item.unit_price.toString(),
            })) || [{ description: '', sku: '', quantity: '1', unit: 'EA', unit_price: '0' }],
        });
      } else {
        reset({
          vendor_id: '',
          order_date: '',
          required_date: '',
          expected_delivery_date: '',
          tax_rate: '0',
          shipping_amount: '0',
          notes: '',
          special_instructions: '',
          line_items: [{ description: '', sku: '', quantity: '1', unit: 'EA', unit_price: '0' }],
        });
      }
      setActiveTab('info');
    }
  }, [open, purchaseOrder, reset]);

  const onSubmit = async (data: FormData) => {
    if (!userProfile?.company_id) return;

    const lineItemDTOs: CreatePOLineItemDTO[] = data.line_items
      .filter((item) => item.description.trim())
      .map((item) => ({
        description: item.description.trim(),
        sku: item.sku || undefined,
        quantity: parseFloat(item.quantity) || 1,
        unit: item.unit || 'EA',
        unit_price: parseFloat(item.unit_price) || 0,
      }));

    const dto: CreatePurchaseOrderDTO = {
      project_id: projectId,
      vendor_id: data.vendor_id || undefined,
      order_date: data.order_date || undefined,
      required_date: data.required_date || undefined,
      expected_delivery_date: data.expected_delivery_date || undefined,
      tax_rate: parseFloat(data.tax_rate) / 100 || 0,
      shipping_amount: parseFloat(data.shipping_amount) || 0,
      notes: data.notes || undefined,
      special_instructions: data.special_instructions || undefined,
      line_items: lineItemDTOs.length > 0 ? lineItemDTOs : undefined,
    };

    try {
      let result: PurchaseOrderWithDetails;
      if (isEditMode && purchaseOrder) {
        result = await updatePO.mutateAsync({
          id: purchaseOrder.id,
          dto: {
            vendor_id: dto.vendor_id,
            order_date: dto.order_date,
            required_date: dto.required_date,
            expected_delivery_date: dto.expected_delivery_date,
            tax_rate: dto.tax_rate,
            shipping_amount: dto.shipping_amount,
            notes: dto.notes,
            special_instructions: dto.special_instructions,
          },
        });
      } else {
        result = await createPO.mutateAsync({
          companyId: userProfile.company_id,
          dto,
        });
      }

      onOpenChange(false);
      onSuccess?.(result);
    } catch (error) {
      console.error('Failed to save PO:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {isEditMode ? 'Edit Purchase Order' : 'Create Purchase Order'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the details of this purchase order.'
              : 'Create a new purchase order for materials.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Order Info</TabsTrigger>
              <TabsTrigger value="items">Line Items</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[400px] mt-4 pr-4">
              {/* Order Info Tab */}
              <TabsContent value="info" className="space-y-4 mt-0">
                {/* Vendor */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Vendor
                  </Label>
                  <Select
                    value={watch('vendor_id') || ''}
                    onValueChange={(v) => setValue('vendor_id', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a vendor..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No vendor selected</SelectItem>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.name}
                          {vendor.code && ` (${vendor.code})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Order Date</Label>
                    <Input type="date" {...register('order_date')} />
                  </div>
                  <div className="space-y-2">
                    <Label>Required By</Label>
                    <Input type="date" {...register('required_date')} />
                  </div>
                  <div className="space-y-2">
                    <Label>Expected Delivery</Label>
                    <Input type="date" {...register('expected_delivery_date')} />
                  </div>
                </div>

                {/* Tax & Shipping */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tax Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      {...register('tax_rate')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Shipping Amount ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...register('shipping_amount')}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Line Items Tab */}
              <TabsContent value="items" className="space-y-4 mt-0">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Line Items
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      append({
                        description: '',
                        sku: '',
                        quantity: '1',
                        unit: 'EA',
                        unit_price: '0',
                      })
                    }
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="p-3 border rounded-lg bg-muted/30 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Item {index + 1}</span>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Input
                          placeholder="Description *"
                          {...register(`line_items.${index}.description`)}
                        />
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <Input
                          placeholder="SKU"
                          {...register(`line_items.${index}.sku`)}
                        />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Qty"
                          {...register(`line_items.${index}.quantity`)}
                        />
                        <Select
                          value={watch(`line_items.${index}.unit`) || 'EA'}
                          onValueChange={(v) => setValue(`line_items.${index}.unit`, v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MATERIAL_UNITS.map((unit) => (
                              <SelectItem key={unit.value} value={unit.value}>
                                {unit.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Unit Price"
                          {...register(`line_items.${index}.unit_price`)}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <Separator className="my-4" />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax ({(taxRate * 100).toFixed(2)}%):</span>
                    <span>${taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping:</span>
                    <span>${shippingAmount.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-base">
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      Total:
                    </span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </TabsContent>

              {/* Notes Tab */}
              <TabsContent value="notes" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Internal notes about this purchase order..."
                    rows={4}
                    {...register('notes')}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Special Instructions</Label>
                  <Textarea
                    placeholder="Special delivery or handling instructions for the vendor..."
                    rows={4}
                    {...register('special_instructions')}
                  />
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditMode ? 'Update PO' : 'Create PO'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
