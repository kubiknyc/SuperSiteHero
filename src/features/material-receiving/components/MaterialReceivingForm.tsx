/**
 * Material Receiving Form Component
 *
 * Form for creating and editing material receipts
 */

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import {
  MATERIAL_CONDITIONS,
  MATERIAL_STATUSES,
  type MaterialCondition,
  type MaterialStatus,
  type CreateMaterialReceivedDTO,
  type UpdateMaterialReceivedDTO,
  type MaterialReceivedWithDetails,
} from '@/types/material-receiving'
import { useMaterialVendors, useMaterialStorageLocations } from '../hooks/useMaterialReceiving'

// Form validation schema
const formSchema = z.object({
  delivery_date: z.string().min(1, 'Delivery date is required'),
  delivery_time: z.string().optional(),
  delivery_ticket_number: z.string().optional(),
  material_description: z.string().min(1, 'Material description is required'),
  quantity: z.string().optional(),
  unit: z.string().optional(),
  vendor: z.string().optional(),
  vendor_contact: z.string().optional(),
  storage_location: z.string().optional(),
  po_number: z.string().optional(),
  condition: z.enum(['good', 'damaged', 'partial', 'rejected']),
  condition_notes: z.string().optional(),
  status: z.enum(['received', 'inspected', 'stored', 'issued', 'returned']),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface MaterialReceivingFormProps {
  projectId: string
  initialData?: MaterialReceivedWithDetails
  onSubmit: (data: CreateMaterialReceivedDTO | UpdateMaterialReceivedDTO) => void
  onCancel: () => void
  isLoading?: boolean
}

export function MaterialReceivingForm({
  projectId,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: MaterialReceivingFormProps) {
  const isEditing = !!initialData
  const [showVendorSuggestions, setShowVendorSuggestions] = useState(false)
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false)

  // Get suggestions for autocomplete
  const { data: vendors = [] } = useMaterialVendors(projectId)
  const { data: locations = [] } = useMaterialStorageLocations(projectId)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      delivery_date: initialData?.delivery_date || new Date().toISOString().split('T')[0],
      delivery_time: initialData?.delivery_time || '',
      delivery_ticket_number: initialData?.delivery_ticket_number || '',
      material_description: initialData?.material_description || '',
      quantity: initialData?.quantity || '',
      unit: initialData?.unit || '',
      vendor: initialData?.vendor || '',
      vendor_contact: initialData?.vendor_contact || '',
      storage_location: initialData?.storage_location || '',
      po_number: initialData?.po_number || '',
      condition: initialData?.condition || 'good',
      condition_notes: initialData?.condition_notes || '',
      status: initialData?.status || 'received',
      notes: initialData?.notes || '',
    },
  })

  const vendorValue = watch('vendor')
  const locationValue = watch('storage_location')

  // Filter suggestions
  const filteredVendors = vendors.filter((v) =>
    v.toLowerCase().includes((vendorValue || '').toLowerCase())
  )
  const filteredLocations = locations.filter((l) =>
    l.toLowerCase().includes((locationValue || '').toLowerCase())
  )

  const handleFormSubmit = (data: FormData) => {
    if (isEditing) {
      onSubmit(data as UpdateMaterialReceivedDTO)
    } else {
      onSubmit({
        ...data,
        project_id: projectId,
      } as CreateMaterialReceivedDTO)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Delivery Information */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Information</CardTitle>
          <CardDescription>Basic delivery details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="delivery_date">Delivery Date *</Label>
              <Input
                id="delivery_date"
                type="date"
                {...register('delivery_date')}
              />
              {errors.delivery_date && (
                <p className="text-sm text-red-500">{errors.delivery_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery_time">Delivery Time</Label>
              <Input
                id="delivery_time"
                type="time"
                {...register('delivery_time')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery_ticket_number">Ticket Number</Label>
              <Input
                id="delivery_ticket_number"
                placeholder="e.g., DT-12345"
                {...register('delivery_ticket_number')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="po_number">PO Number</Label>
              <Input
                id="po_number"
                placeholder="e.g., PO-2024-001"
                {...register('po_number')}
              />
            </div>

            <div className="space-y-2 relative">
              <Label htmlFor="storage_location">Storage Location</Label>
              <Input
                id="storage_location"
                placeholder="e.g., Warehouse A, Bay 3"
                {...register('storage_location')}
                onFocus={() => setShowLocationSuggestions(true)}
                onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
              />
              {showLocationSuggestions && filteredLocations.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-auto">
                  {filteredLocations.map((location) => (
                    <button
                      key={location}
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                      onClick={() => setValue('storage_location', location)}
                    >
                      {location}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Material Details */}
      <Card>
        <CardHeader>
          <CardTitle>Material Details</CardTitle>
          <CardDescription>Description and quantity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="material_description">Material Description *</Label>
            <Textarea
              id="material_description"
              placeholder="Describe the materials received..."
              {...register('material_description')}
              rows={3}
            />
            {errors.material_description && (
              <p className="text-sm text-red-500">{errors.material_description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                placeholder="e.g., 500"
                {...register('quantity')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                placeholder="e.g., LF, EA, CY"
                {...register('unit')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vendor Information */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor Information</CardTitle>
          <CardDescription>Supplier details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 relative">
              <Label htmlFor="vendor">Vendor Name</Label>
              <Input
                id="vendor"
                placeholder="e.g., ABC Supply Co."
                {...register('vendor')}
                onFocus={() => setShowVendorSuggestions(true)}
                onBlur={() => setTimeout(() => setShowVendorSuggestions(false), 200)}
              />
              {showVendorSuggestions && filteredVendors.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-auto">
                  {filteredVendors.map((vendor) => (
                    <button
                      key={vendor}
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                      onClick={() => setValue('vendor', vendor)}
                    >
                      {vendor}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor_contact">Vendor Contact</Label>
              <Input
                id="vendor_contact"
                placeholder="e.g., John Smith, 555-1234"
                {...register('vendor_contact')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Condition & Status */}
      <Card>
        <CardHeader>
          <CardTitle>Condition & Status</CardTitle>
          <CardDescription>Material condition and tracking status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="condition">Condition *</Label>
              <Select
                value={watch('condition')}
                onValueChange={(value) => setValue('condition', value as MaterialCondition)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAL_CONDITIONS.map((condition) => (
                    <SelectItem key={condition.value} value={condition.value}>
                      {condition.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={watch('status')}
                onValueChange={(value) => setValue('status', value as MaterialStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAL_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="condition_notes">Condition Notes</Label>
            <Textarea
              id="condition_notes"
              placeholder="Note any damage or issues..."
              {...register('condition_notes')}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any other notes about this delivery..."
              {...register('notes')}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isEditing ? 'Update' : 'Log Material'}
        </Button>
      </div>
    </form>
  )
}

export default MaterialReceivingForm
