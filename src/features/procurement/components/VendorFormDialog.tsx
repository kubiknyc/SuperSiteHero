/**
 * Vendor Form Dialog
 *
 * Dialog for creating and editing vendors.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Building2, Loader2, Phone, Mail, Globe, MapPin } from 'lucide-react';
import { useCreateVendor, useUpdateVendor } from '../hooks/useProcurement';
import { useAuth } from '@/lib/auth/AuthContext';
import { VENDOR_TYPE_CONFIG } from '@/types/procurement';
import type { Vendor, CreateVendorDTO, VendorType } from '@/types/procurement';

interface VendorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor?: Vendor;
  onSuccess?: (vendor: Vendor) => void;
}

interface FormData {
  name: string;
  code: string;
  vendor_type: VendorType;
  contact_name: string;
  email: string;
  phone: string;
  website: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  tax_id: string;
  payment_terms: string;
  account_number: string;
  notes: string;
  is_active: boolean;
  is_approved: boolean;
}

export function VendorFormDialog({
  open,
  onOpenChange,
  vendor,
  onSuccess,
}: VendorFormDialogProps) {
  const isEditMode = !!vendor;
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('basic');

  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();

  const isSubmitting = createVendor.isPending || updateVendor.isPending;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: '',
      code: '',
      vendor_type: 'supplier',
      contact_name: '',
      email: '',
      phone: '',
      website: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'USA',
      tax_id: '',
      payment_terms: '',
      account_number: '',
      notes: '',
      is_active: true,
      is_approved: true,
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (vendor) {
        reset({
          name: vendor.name,
          code: vendor.code || '',
          vendor_type: vendor.vendor_type,
          contact_name: vendor.contact_name || '',
          email: vendor.email || '',
          phone: vendor.phone || '',
          website: vendor.website || '',
          address_line1: vendor.address_line1 || '',
          address_line2: vendor.address_line2 || '',
          city: vendor.city || '',
          state: vendor.state || '',
          postal_code: vendor.postal_code || '',
          country: vendor.country || 'USA',
          tax_id: vendor.tax_id || '',
          payment_terms: vendor.payment_terms || '',
          account_number: vendor.account_number || '',
          notes: vendor.notes || '',
          is_active: vendor.is_active,
          is_approved: vendor.is_approved,
        });
      } else {
        reset({
          name: '',
          code: '',
          vendor_type: 'supplier',
          contact_name: '',
          email: '',
          phone: '',
          website: '',
          address_line1: '',
          address_line2: '',
          city: '',
          state: '',
          postal_code: '',
          country: 'USA',
          tax_id: '',
          payment_terms: '',
          account_number: '',
          notes: '',
          is_active: true,
          is_approved: true,
        });
      }
      setActiveTab('basic');
    }
  }, [open, vendor, reset]);

  const onSubmit = async (data: FormData) => {
    if (!userProfile?.company_id) return;

    const dto: CreateVendorDTO = {
      name: data.name.trim(),
      code: data.code || undefined,
      vendor_type: data.vendor_type,
      contact_name: data.contact_name || undefined,
      email: data.email || undefined,
      phone: data.phone || undefined,
      website: data.website || undefined,
      address_line1: data.address_line1 || undefined,
      address_line2: data.address_line2 || undefined,
      city: data.city || undefined,
      state: data.state || undefined,
      postal_code: data.postal_code || undefined,
      country: data.country || undefined,
      tax_id: data.tax_id || undefined,
      payment_terms: data.payment_terms || undefined,
      account_number: data.account_number || undefined,
      notes: data.notes || undefined,
    };

    try {
      let result: Vendor;
      if (isEditMode && vendor) {
        result = await updateVendor.mutateAsync({
          id: vendor.id,
          dto: {
            ...dto,
            is_active: data.is_active,
            is_approved: data.is_approved,
          },
        });
      } else {
        result = await createVendor.mutateAsync({
          companyId: userProfile.company_id,
          dto,
        });
      }

      onOpenChange(false);
      onSuccess?.(result);
    } catch (error) {
      console.error('Failed to save vendor:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {isEditMode ? 'Edit Vendor' : 'Add New Vendor'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update vendor information.'
              : 'Add a new vendor to your supplier list.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="business">Business</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[400px] mt-4 pr-4">
              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      Vendor Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="Company name"
                      {...register('name', { required: 'Name is required' })}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Vendor Code</Label>
                    <Input placeholder="e.g., ACE-001" {...register('code')} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Vendor Type</Label>
                  <Select
                    value={watch('vendor_type')}
                    onValueChange={(v) => setValue('vendor_type', v as VendorType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(VENDOR_TYPE_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Contact Name</Label>
                  <Input placeholder="Primary contact" {...register('contact_name')} />
                </div>

                {isEditMode && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="is_active"
                        checked={watch('is_active')}
                        onCheckedChange={(checked) => setValue('is_active', !!checked)}
                      />
                      <Label htmlFor="is_active" className="cursor-pointer">
                        Active vendor
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="is_approved"
                        checked={watch('is_approved')}
                        onCheckedChange={(checked) => setValue('is_approved', !!checked)}
                      />
                      <Label htmlFor="is_approved" className="cursor-pointer">
                        Approved vendor
                      </Label>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Contact Tab */}
              <TabsContent value="contact" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input type="email" placeholder="vendor@example.com" {...register('email')} />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone
                  </Label>
                  <Input placeholder="(555) 123-4567" {...register('phone')} />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Website
                  </Label>
                  <Input placeholder="https://vendor.com" {...register('website')} />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Address
                  </Label>
                  <Input placeholder="Street address" {...register('address_line1')} />
                  <Input placeholder="Suite, unit, etc." {...register('address_line2')} />
                  <div className="grid grid-cols-3 gap-2">
                    <Input placeholder="City" {...register('city')} />
                    <Input placeholder="State" {...register('state')} />
                    <Input placeholder="ZIP" {...register('postal_code')} />
                  </div>
                </div>
              </TabsContent>

              {/* Business Tab */}
              <TabsContent value="business" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label>Tax ID / EIN</Label>
                  <Input placeholder="XX-XXXXXXX" {...register('tax_id')} />
                </div>

                <div className="space-y-2">
                  <Label>Payment Terms</Label>
                  <Input placeholder="e.g., NET30, COD" {...register('payment_terms')} />
                </div>

                <div className="space-y-2">
                  <Label>Our Account Number</Label>
                  <Input placeholder="Account # with vendor" {...register('account_number')} />
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Additional notes about this vendor..."
                    rows={4}
                    {...register('notes')}
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
              {isEditMode ? 'Update Vendor' : 'Add Vendor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
