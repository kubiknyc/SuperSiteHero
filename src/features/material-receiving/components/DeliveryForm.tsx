/**
 * Material Delivery Form Component
 * Comprehensive form for creating and editing material deliveries
 */

import { useEffect, useState } from 'react';
import { useForm, Control, FieldPath, ControllerRenderProps, FieldValues, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
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
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  CalendarIcon,
  Loader2,
  Upload,
  X,
  AlertCircle,
} from 'lucide-react';
import type {
  MaterialDelivery,
  CreateMaterialDeliveryDTO,
  DeliveryStatus,
  ConditionStatus,
  MaterialCategory,
  UnitOfMeasure,
} from '@/types/material-receiving';
import {
  DELIVERY_STATUSES,
  CONDITION_STATUSES,
  MATERIAL_CATEGORIES,
  UNITS_OF_MEASURE,
} from '@/types/material-receiving';

// Form validation schema
const deliveryFormSchema = z.object({
  // Required fields
  delivery_date: z.date({
    message: 'Delivery date is required',
  }),
  vendor_name: z.string().min(1, 'Vendor name is required').max(255),
  material_name: z.string().min(1, 'Material name is required').max(255),
  quantity_delivered: z.coerce.number().positive('Quantity must be greater than 0'),
  unit_of_measure: z.string().min(1, 'Unit of measure is required'),
  delivery_status: z.enum(['scheduled', 'received', 'partially_received', 'rejected', 'back_ordered']),
  condition_status: z.enum(['good', 'damaged', 'defective', 'incorrect']),

  // Optional fields
  delivery_time: z.string().optional(),
  delivery_ticket_number: z.string().max(100).optional(),
  purchase_order_number: z.string().max(100).optional(),
  material_category: z.string().optional(),
  material_description: z.string().max(1000).optional(),
  vendor_contact_name: z.string().max(255).optional(),
  vendor_contact_phone: z.string().max(50).optional(),
  vendor_contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
  quantity_ordered: z.coerce.number().positive().optional().or(z.literal('')),
  quantity_rejected: z.coerce.number().min(0).optional().or(z.literal('')),
  storage_location: z.string().max(255).optional(),
  storage_bin_number: z.string().max(100).optional(),
  unit_cost: z.coerce.number().positive().optional().or(z.literal('')),
  total_cost: z.coerce.number().positive().optional().or(z.literal('')),
  condition_notes: z.string().max(2000).optional(),
  received_by_name: z.string().max(255).optional(),
  notes: z.string().max(2000).optional(),
  submittal_id: z.string().uuid().optional().or(z.literal('')),
  daily_report_id: z.string().uuid().optional().or(z.literal('')),
});

type DeliveryFormValues = z.infer<typeof deliveryFormSchema>;

// Type alias for form control to simplify usage throughout the component
type DeliveryFormControl = Control<DeliveryFormValues>;

// Type for field names in the form
type DeliveryFormFieldName = FieldPath<DeliveryFormValues>;

// Helper type for render function field props
type FormFieldRenderProps<TName extends DeliveryFormFieldName> = {
  field: ControllerRenderProps<DeliveryFormValues, TName>;
};

interface DeliveryFormProps {
  projectId: string;
  delivery?: MaterialDelivery;
  onSubmit: (data: CreateMaterialDeliveryDTO) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function DeliveryForm({
  projectId,
  delivery,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: DeliveryFormProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const isEditing = !!delivery;

  const form = useForm<DeliveryFormValues>({
    // @ts-expect-error - React Hook Form resolver type inference with z.coerce.number() causes type mismatch
    resolver: zodResolver(deliveryFormSchema),
    defaultValues: delivery
      ? {
          delivery_date: new Date(delivery.delivery_date),
          delivery_time: delivery.delivery_time || undefined,
          delivery_ticket_number: delivery.delivery_ticket_number || undefined,
          purchase_order_number: delivery.purchase_order_number || undefined,
          vendor_name: delivery.vendor_name,
          vendor_contact_name: delivery.vendor_contact_name || undefined,
          vendor_contact_phone: delivery.vendor_contact_phone || undefined,
          vendor_contact_email: delivery.vendor_contact_email || undefined,
          material_name: delivery.material_name,
          material_category: delivery.material_category || undefined,
          material_description: delivery.material_description || undefined,
          quantity_delivered: delivery.quantity_delivered,
          quantity_ordered: delivery.quantity_ordered || undefined,
          quantity_rejected: delivery.quantity_rejected || 0,
          unit_of_measure: delivery.unit_of_measure,
          unit_cost: delivery.unit_cost || undefined,
          total_cost: delivery.total_cost || undefined,
          delivery_status: delivery.delivery_status,
          condition_status: delivery.condition_status,
          condition_notes: delivery.condition_notes || undefined,
          storage_location: delivery.storage_location || undefined,
          storage_bin_number: delivery.storage_bin_number || undefined,
          received_by_name: delivery.received_by_name || undefined,
          notes: delivery.notes || undefined,
          submittal_id: delivery.submittal_id || undefined,
          daily_report_id: delivery.daily_report_id || undefined,
        }
      : {
          delivery_date: new Date(),
          delivery_status: 'received',
          condition_status: 'good',
          quantity_delivered: 0,
          unit_of_measure: 'ea',
          vendor_name: '',
          material_name: '',
          quantity_rejected: 0,
        },
  });

  // Auto-calculate total cost when unit cost or quantity changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'unit_cost' || name === 'quantity_delivered') {
        const unitCost = value.unit_cost as number | undefined;
        const quantity = value.quantity_delivered as number | undefined;
        if (unitCost && quantity && unitCost > 0 && quantity > 0) {
          form.setValue('total_cost', unitCost * quantity);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setSelectedFiles((prev) => [...prev, ...Array.from(files)]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFormSubmit = async (values: DeliveryFormValues) => {
    const submitData: CreateMaterialDeliveryDTO = {
      project_id: projectId,
      delivery_date: format(values.delivery_date, 'yyyy-MM-dd'),
      delivery_time: values.delivery_time || undefined,
      delivery_ticket_number: values.delivery_ticket_number || undefined,
      purchase_order_number: values.purchase_order_number || undefined,
      vendor_name: values.vendor_name,
      vendor_contact_name: values.vendor_contact_name || undefined,
      vendor_contact_phone: values.vendor_contact_phone || undefined,
      vendor_contact_email: values.vendor_contact_email || undefined,
      material_name: values.material_name,
      material_category: (values.material_category as MaterialCategory) || undefined,
      material_description: values.material_description || undefined,
      quantity_delivered: values.quantity_delivered,
      quantity_ordered: values.quantity_ordered || undefined,
      quantity_rejected: values.quantity_rejected || 0,
      unit_of_measure: values.unit_of_measure as UnitOfMeasure,
      unit_cost: values.unit_cost || undefined,
      total_cost: values.total_cost || undefined,
      delivery_status: values.delivery_status as DeliveryStatus,
      condition_status: values.condition_status as ConditionStatus,
      condition_notes: values.condition_notes || undefined,
      storage_location: values.storage_location || undefined,
      storage_bin_number: values.storage_bin_number || undefined,
      received_by_name: values.received_by_name || undefined,
      notes: values.notes || undefined,
      submittal_id: values.submittal_id || undefined,
      daily_report_id: values.daily_report_id || undefined,
    };

    await onSubmit(submitData);
  };

  const hasIssues =
    form.watch('condition_status') !== 'good' || (form.watch('quantity_rejected') || 0) > 0;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit as any)} className="space-y-6">
        {/* Delivery Information */}
        <Card>
          <CardHeader>
            <CardTitle>Delivery Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control as any}
              name="delivery_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Delivery Date *</FormLabel>
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
                          {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="delivery_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="delivery_ticket_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ticket Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., TKT-12345" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="purchase_order_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purchase Order #</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., PO-12345" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="delivery_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Status *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DELIVERY_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="received_by_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Received By</FormLabel>
                  <FormControl>
                    <Input placeholder="Name of receiver" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Vendor Information */}
        <Card>
          <CardHeader>
            <CardTitle>Vendor Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control as any}
              name="vendor_name"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Vendor Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., ABC Supply Co." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="vendor_contact_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Contact person" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="vendor_contact_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Phone</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="(555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="vendor_contact_email"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Contact Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="contact@vendor.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Material Information */}
        <Card>
          <CardHeader>
            <CardTitle>Material Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control as any}
              name="material_name"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Material Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 2x4 Lumber, Concrete Mix, Steel Beams" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="material_category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MATERIAL_CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="material_description"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detailed material description, specifications, grade, etc."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Quantity & Cost */}
        <Card>
          <CardHeader>
            <CardTitle>Quantity & Cost</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control as any}
              name="quantity_delivered"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity Delivered *</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="unit_of_measure"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit of Measure *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {UNITS_OF_MEASURE.map((unit) => (
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
              control={form.control as any}
              name="quantity_ordered"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity Ordered</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="Optional" {...field} />
                  </FormControl>
                  <FormDescription>Original quantity ordered</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="quantity_rejected"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity Rejected</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="unit_cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit Cost</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Cost per unit</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="total_cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Cost</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Auto-calculated from unit cost � quantity</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Condition & Quality */}
        <Card>
          <CardHeader>
            <CardTitle>Condition & Quality</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control as any}
              name="condition_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition Status *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CONDITION_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {hasIssues && (
              <div className="rounded-md bg-warning-light border border-yellow-200 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <strong>Issues Detected:</strong> Material has condition issues or rejected items.
                    Please provide detailed notes below.
                  </div>
                </div>
              </div>
            )}

            <FormField
              control={form.control as any}
              name="condition_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe any damage, defects, or quality issues..."
                      className="resize-none min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Storage Information */}
        <Card>
          <CardHeader>
            <CardTitle>Storage Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control as any}
              name="storage_location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Storage Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Yard A, Warehouse 2, Zone B" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="storage_bin_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bin/Rack Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., A-12, Rack 5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Photos */}
        <Card>
          <CardHeader>
            <CardTitle>Photos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="photo-upload"
              />
              <label htmlFor="photo-upload">
                <Button type="button" variant="outline" className="w-full" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Photos
                  </span>
                </Button>
              </label>
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Selected Photos ({selectedFiles.length})</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-24 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control as any}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional information about this delivery..."
                      className="resize-none min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Update Delivery' : 'Create Delivery'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default DeliveryForm;
