/**
 * TransmittalForm Component
 * Form for creating and editing transmittals
 */

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Plus,
  Trash2,
  Send,
  Save,
  Building2,
  User,
  Mail,
  Phone,
  FileText,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  useCreateTransmittal,
  useUpdateTransmittal,
  useNextTransmittalNumber,
} from '../hooks/useTransmittals';
import type {
  Transmittal,
  TransmittalWithDetails,
  CreateTransmittalDTO,
  UpdateTransmittalDTO,
  TransmittalItemType,
  ItemActionRequired,
  ItemFormat,
  TransmissionMethod,
} from '@/types/transmittal';
import {
  TRANSMISSION_METHODS,
  TRANSMITTAL_ITEM_TYPES,
  ITEM_ACTIONS,
  ITEM_FORMATS,
} from '@/types/transmittal';

// Validation schema
const transmittalItemSchema = z.object({
  item_type: z.string().default('document'),
  description: z.string().min(1, 'Description is required'),
  reference_number: z.string().default(''),
  specification_section: z.string().default(''),
  drawing_number: z.string().default(''),
  copies: z.coerce.number().min(1).default(1),
  format: z.string().default('pdf'),
  action_required: z.string().default('for_information'),
  notes: z.string().default(''),
});

const transmittalFormSchema = z.object({
  // Recipient
  to_company: z.string().min(1, 'Recipient company is required'),
  to_contact: z.string().default(''),
  to_email: z.string().default(''),
  to_phone: z.string().default(''),

  // Sender
  from_company: z.string().min(1, 'Sender company is required'),
  from_contact: z.string().default(''),
  from_email: z.string().default(''),
  from_phone: z.string().default(''),

  // Content
  subject: z.string().min(1, 'Subject is required'),
  remarks: z.string().default(''),
  cover_letter: z.string().default(''),

  // Transmission
  transmission_method: z.string().default('email'),
  tracking_number: z.string().default(''),

  // Dates
  date_due: z.string().default(''),

  // Response
  response_required: z.boolean().default(false),
  response_due_date: z.string().default(''),

  // Items
  items: z.array(transmittalItemSchema).min(1, 'At least one item is required'),
});

type TransmittalFormValues = z.infer<typeof transmittalFormSchema>;

interface TransmittalFormProps {
  projectId: string;
  transmittal?: TransmittalWithDetails;
  onSuccess?: (transmittal: Transmittal) => void;
  onCancel?: () => void;
}

export function TransmittalForm({
  projectId,
  transmittal,
  onSuccess,
  onCancel,
}: TransmittalFormProps) {
  const { userProfile } = useAuth();
  const isEditing = !!transmittal;

  const createMutation = useCreateTransmittal();
  const updateMutation = useUpdateTransmittal();
  const { data: nextNumber } = useNextTransmittalNumber(projectId);

  // Default sender from user's profile
  // Note: company name would need to be fetched separately if needed
  const defaultFromCompany = '';
  const defaultFromContact = userProfile?.full_name || '';
  const defaultFromEmail = userProfile?.email || '';

  const form = useForm<TransmittalFormValues, unknown, TransmittalFormValues>({
    resolver: zodResolver(transmittalFormSchema) as never,
    defaultValues: {
      to_company: transmittal?.to_company || '',
      to_contact: transmittal?.to_contact || '',
      to_email: transmittal?.to_email || '',
      to_phone: transmittal?.to_phone || '',
      from_company: transmittal?.from_company || defaultFromCompany,
      from_contact: transmittal?.from_contact || defaultFromContact,
      from_email: transmittal?.from_email || defaultFromEmail,
      from_phone: transmittal?.from_phone || '',
      subject: transmittal?.subject || '',
      remarks: transmittal?.remarks || '',
      cover_letter: transmittal?.cover_letter || '',
      transmission_method: transmittal?.transmission_method || 'email',
      tracking_number: transmittal?.tracking_number || '',
      date_due: transmittal?.date_due || '',
      response_required: transmittal?.response_required || false,
      response_due_date: transmittal?.response_due_date || '',
      items: transmittal?.items?.map(item => ({
        item_type: item.item_type,
        description: item.description,
        reference_number: item.reference_number || '',
        specification_section: item.specification_section || '',
        drawing_number: item.drawing_number || '',
        copies: item.copies,
        format: item.format,
        action_required: item.action_required,
        notes: item.notes || '',
      })) || [
        {
          item_type: 'document',
          description: '',
          reference_number: '',
          specification_section: '',
          drawing_number: '',
          copies: 1,
          format: 'pdf',
          action_required: 'for_information',
          notes: '',
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const onSubmit = async (data: TransmittalFormValues) => {
    try {
      if (isEditing && transmittal) {
        const updateData: UpdateTransmittalDTO & { id: string } = {
          id: transmittal.id,
          to_company: data.to_company,
          to_contact: data.to_contact || undefined,
          to_email: data.to_email || undefined,
          to_phone: data.to_phone || undefined,
          from_company: data.from_company,
          from_contact: data.from_contact || undefined,
          from_email: data.from_email || undefined,
          from_phone: data.from_phone || undefined,
          subject: data.subject,
          remarks: data.remarks || undefined,
          cover_letter: data.cover_letter || undefined,
          transmission_method: data.transmission_method as TransmissionMethod,
          tracking_number: data.tracking_number || undefined,
          date_due: data.date_due || undefined,
          response_required: data.response_required,
          response_due_date: data.response_due_date || undefined,
        };

        const result = await updateMutation.mutateAsync(updateData);
        onSuccess?.(result);
      } else {
        const createData: CreateTransmittalDTO = {
          project_id: projectId,
          to_company: data.to_company,
          to_contact: data.to_contact || undefined,
          to_email: data.to_email || undefined,
          to_phone: data.to_phone || undefined,
          from_company: data.from_company,
          from_contact: data.from_contact || undefined,
          from_email: data.from_email || undefined,
          from_phone: data.from_phone || undefined,
          subject: data.subject,
          remarks: data.remarks || undefined,
          cover_letter: data.cover_letter || undefined,
          transmission_method: data.transmission_method as TransmissionMethod,
          tracking_number: data.tracking_number || undefined,
          date_due: data.date_due || undefined,
          response_required: data.response_required,
          response_due_date: data.response_due_date || undefined,
          items: data.items.map(item => ({
            item_type: item.item_type as TransmittalItemType,
            description: item.description,
            reference_number: item.reference_number || undefined,
            specification_section: item.specification_section || undefined,
            drawing_number: item.drawing_number || undefined,
            copies: item.copies,
            format: item.format as ItemFormat,
            action_required: item.action_required as ItemActionRequired,
            notes: item.notes || undefined,
          })),
        };

        const result = await createMutation.mutateAsync(createData);
        onSuccess?.(result);
      }
    } catch (error) {
      console.error('Failed to save transmittal:', error);
    }
  };

  const addItem = () => {
    append({
      item_type: 'document',
      description: '',
      reference_number: '',
      specification_section: '',
      drawing_number: '',
      copies: 1,
      format: 'pdf',
      action_required: 'for_information',
      notes: '',
    });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Header Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{isEditing ? 'Edit Transmittal' : 'New Transmittal'}</span>
              {!isEditing && nextNumber && (
                <span className="text-sm font-normal text-muted-foreground">
                  Number: {nextNumber}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter transmittal subject" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sender Section */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  From (Sender)
                </h4>

                <FormField
                  control={form.control}
                  name="from_company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="from_contact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="from_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="from_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Recipient Section */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  To (Recipient)
                </h4>

                <FormField
                  control={form.control}
                  name="to_company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company *</FormLabel>
                      <FormControl>
                        <Input placeholder="Recipient company name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="to_contact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact</FormLabel>
                      <FormControl>
                        <Input placeholder="Contact name" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="to_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@example.com" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="to_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 555-5555" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transmission Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Transmission Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="transmission_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TRANSMISSION_METHODS.map(method => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tracking_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tracking Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date_due"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Separator className="my-4" />

            <div className="flex items-center justify-between">
              <FormField
                control={form.control}
                name="response_required"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div>
                      <FormLabel className="cursor-pointer">Response Required</FormLabel>
                      <FormDescription>
                        Recipient must acknowledge or respond
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {form.watch('response_required') && (
                <FormField
                  control={form.control}
                  name="response_due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Response Due</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Items ({fields.length})
              </span>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <Card key={field.id} className="bg-muted/30">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-4">
                    <span className="font-medium">Item {index + 1}</span>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name={`items.${index}.item_type`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TRANSMITTAL_ITEM_TYPES.map(type => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`items.${index}.reference_number`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reference #</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., RFI-001" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`items.${index}.copies`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Copies</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`items.${index}.format`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Format</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ITEM_FORMATS.map(f => (
                                <SelectItem key={f.value} value={f.value}>
                                  {f.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="mt-4">
                    <FormField
                      control={form.control}
                      name={`items.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe the item being transmitted"
                              rows={2}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <FormField
                      control={form.control}
                      name={`items.${index}.action_required`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Action Required</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ITEM_ACTIONS.map(action => (
                                <SelectItem key={action.value} value={action.value}>
                                  {action.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`items.${index}.specification_section`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Spec Section</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 03 30 00" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`items.${index}.drawing_number`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Drawing #</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., A-101" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        {/* Remarks */}
        <Card>
          <CardHeader>
            <CardTitle>Remarks</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Additional remarks or notes for this transmittal"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isPending}>
            <Save className="h-4 w-4 mr-2" />
            {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Transmittal'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default TransmittalForm;
