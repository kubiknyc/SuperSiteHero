/**
 * CreateBidPackageDialog Component
 * Dialog for creating new bid packages
 */

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { CalendarIcon, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { useCreateBidPackage } from '../hooks/useBidding'
import { BID_TYPES, CSI_DIVISIONS, type CreateBidPackageDTO } from '@/types/bidding'
import { toast } from 'sonner'

const formSchema = z.object({
  package_number: z.string().min(1, 'Package number is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  scope_of_work: z.string().optional(),
  division: z.string().optional(),
  estimated_value: z.coerce.number().optional(),
  bid_due_date: z.date({ message: 'Bid due date is required' }),
  bid_due_time: z.string(),
  bid_type: z.enum(['lump_sum', 'unit_price', 'cost_plus', 'gmp', 'time_and_material']),
  is_public: z.boolean(),
  requires_prequalification: z.boolean(),
  requires_bid_bond: z.boolean(),
  bid_bond_percent: z.coerce.number().min(0).max(100),
  contact_name: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface CreateBidPackageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  onSuccess?: (bidPackage: any) => void
}

export function CreateBidPackageDialog({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: CreateBidPackageDialogProps) {
  const [step, setStep] = useState(1)
  const createBidPackage = useCreateBidPackage()

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      package_number: '',
      name: '',
      description: '',
      scope_of_work: '',
      division: '',
      bid_due_date: undefined as Date | undefined,
      bid_due_time: '17:00',
      bid_type: 'lump_sum' as const,
      is_public: false,
      requires_prequalification: false,
      requires_bid_bond: false,
      bid_bond_percent: 5,
      contact_name: '',
      contact_email: '',
      contact_phone: '',
    },
  })

  const onSubmit = async (values: any) => {
    try {
      const dto: CreateBidPackageDTO = {
        project_id: projectId,
        package_number: values.package_number,
        name: values.name,
        description: values.description,
        scope_of_work: values.scope_of_work,
        division: values.division,
        estimated_value: values.estimated_value,
        bid_due_date: format(values.bid_due_date, 'yyyy-MM-dd'),
        bid_due_time: values.bid_due_time,
        bid_type: values.bid_type,
        is_public: values.is_public,
        requires_prequalification: values.requires_prequalification,
        requires_bid_bond: values.requires_bid_bond,
        bid_bond_percent: values.bid_bond_percent,
        contact_name: values.contact_name,
        contact_email: values.contact_email || undefined,
        contact_phone: values.contact_phone,
      }

      const result = await createBidPackage.mutateAsync(dto)
      toast.success('Bid package created successfully')
      onSuccess?.(result)
      onOpenChange(false)
      form.reset()
      setStep(1)
    } catch (error) {
      toast.error('Failed to create bid package')
      console.error(error)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    form.reset()
    setStep(1)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Bid Package</DialogTitle>
          <DialogDescription>
            {step === 1 && 'Enter the basic information for this bid package'}
            {step === 2 && 'Set bidding requirements and dates'}
            {step === 3 && 'Configure bid bonds and prequalification'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: Basic Information */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="package_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Package Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="BP-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="division"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CSI Division</FormLabel>
                        <RadixSelect onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select division" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CSI_DIVISIONS.map((div) => (
                              <SelectItem key={div.code} value={div.code}>
                                {div.code} - {div.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </RadixSelect>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Package Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="HVAC Installation" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief description of the bid package scope..."
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
                  name="scope_of_work"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scope of Work</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Detailed scope of work description..."
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estimated_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Value ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="100000"
                          {...field}
                          value={String(field.value || '')}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>
                        Internal estimate - not shown to bidders
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 2: Dates & Type */}
            {step === 2 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="bid_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bid Type *</FormLabel>
                      <RadixSelect onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select bid type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {BID_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex flex-col">
                                <span>{type.label}</span>
                                <span className="text-xs text-muted-foreground">{type.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </RadixSelect>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="bid_due_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Bid Due Date *</FormLabel>
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
                              disabled={(date) => date < new Date()}
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
                    name="bid_due_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bid Due Time *</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="is_public"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Public Bid</FormLabel>
                        <FormDescription>
                          Allow any subcontractor to view and submit a bid
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium heading-card">Contact Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contact_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Smith" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contact_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Phone</FormLabel>
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
                    name="contact_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="bidding@company.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Requirements */}
            {step === 3 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="requires_prequalification"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Require Prequalification</FormLabel>
                        <FormDescription>
                          Bidders must be prequalified before submitting a bid
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requires_bid_bond"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Require Bid Bond</FormLabel>
                        <FormDescription>
                          Bidders must include a bid bond with their submission
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch('requires_bid_bond') && (
                  <FormField
                    control={form.control}
                    name="bid_bond_percent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bid Bond Percentage</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            {...field}
                            value={String(field.value || '')}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormDescription>
                          Percentage of bid amount required as bid bond
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            <DialogFooter className="gap-2">
              {step > 1 && (
                <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                  Back
                </Button>
              )}
              {step < 3 ? (
                <Button type="button" onClick={() => setStep(step + 1)}>
                  Next
                </Button>
              ) : (
                <Button type="submit" disabled={createBidPackage.isPending}>
                  {createBidPackage.isPending ? 'Creating...' : 'Create Bid Package'}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
