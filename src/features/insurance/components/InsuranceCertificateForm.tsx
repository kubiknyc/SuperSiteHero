/**
 * Insurance Certificate Form Component
 * Form for creating/editing insurance certificates
 */

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Upload, Shield } from 'lucide-react'
import type {
  InsuranceCertificateWithRelations,
  CreateInsuranceCertificateDTO,
  UpdateInsuranceCertificateDTO,
  InsuranceType,
} from '@/types/insurance'
import { INSURANCE_TYPE_LABELS } from '@/types/insurance'
import {
  useCreateInsuranceCertificate,
  useUpdateInsuranceCertificate,
  useUploadCertificateDocument,
} from '../hooks/useInsurance'

// Form Schema
const certificateFormSchema = z.object({
  certificate_number: z.string().min(1, 'Certificate number is required'),
  insurance_type: z.string().min(1, 'Insurance type is required'),
  carrier_name: z.string().min(1, 'Carrier name is required'),
  carrier_naic_number: z.string().optional(),
  policy_number: z.string().min(1, 'Policy number is required'),
  effective_date: z.string().min(1, 'Effective date is required'),
  expiration_date: z.string().min(1, 'Expiration date is required'),
  subcontractor_id: z.string().optional(),
  project_id: z.string().optional(),

  // Coverage Limits
  each_occurrence_limit: z.coerce.number().optional(),
  general_aggregate_limit: z.coerce.number().optional(),
  products_completed_ops_limit: z.coerce.number().optional(),
  personal_adv_injury_limit: z.coerce.number().optional(),
  damage_to_rented_premises: z.coerce.number().optional(),
  medical_expense_limit: z.coerce.number().optional(),
  combined_single_limit: z.coerce.number().optional(),
  bodily_injury_per_person: z.coerce.number().optional(),
  bodily_injury_per_accident: z.coerce.number().optional(),
  property_damage_limit: z.coerce.number().optional(),
  umbrella_each_occurrence: z.coerce.number().optional(),
  umbrella_aggregate: z.coerce.number().optional(),
  workers_comp_el_each_accident: z.coerce.number().optional(),
  workers_comp_el_disease_policy: z.coerce.number().optional(),
  workers_comp_el_disease_employee: z.coerce.number().optional(),

  // Endorsements - using optional() instead of default() for proper rhf typing
  additional_insured_required: z.boolean().optional(),
  additional_insured_verified: z.boolean().optional(),
  additional_insured_name: z.string().optional(),
  waiver_of_subrogation_required: z.boolean().optional(),
  waiver_of_subrogation_verified: z.boolean().optional(),
  primary_noncontributory_required: z.boolean().optional(),
  primary_noncontributory_verified: z.boolean().optional(),

  // Issued By
  issued_by_name: z.string().optional(),
  issued_by_email: z.string().email().optional().or(z.literal('')),
  issued_by_phone: z.string().optional(),

  // Notes
  notes: z.string().optional(),
  description_of_operations: z.string().optional(),

  // Alerts - using optional() instead of default()
  alert_days_before_expiry: z.coerce.number().optional(),
  suppress_alerts: z.boolean().optional(),
})

type CertificateFormValues = z.infer<typeof certificateFormSchema>

interface InsuranceCertificateFormProps {
  open: boolean
  onClose: () => void
  certificate?: InsuranceCertificateWithRelations
  defaultSubcontractorId?: string
  defaultProjectId?: string
  subcontractors?: Array<{ id: string; company_name: string }>
  projects?: Array<{ id: string; name: string }>
}

export function InsuranceCertificateForm({
  open,
  onClose,
  certificate,
  defaultSubcontractorId,
  defaultProjectId,
  subcontractors = [],
  projects = [],
}: InsuranceCertificateFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const isEditing = !!certificate

  const createMutation = useCreateInsuranceCertificate()
  const updateMutation = useUpdateInsuranceCertificate()
  const uploadMutation = useUploadCertificateDocument()

  const form = useForm<CertificateFormValues, unknown, CertificateFormValues>({
    resolver: zodResolver(certificateFormSchema) as never,
    defaultValues: certificate
      ? {
          certificate_number: certificate.certificate_number,
          insurance_type: certificate.insurance_type,
          carrier_name: certificate.carrier_name,
          carrier_naic_number: certificate.carrier_naic_number || '',
          policy_number: certificate.policy_number,
          effective_date: certificate.effective_date,
          expiration_date: certificate.expiration_date,
          subcontractor_id: certificate.subcontractor_id || '',
          project_id: certificate.project_id || '',
          each_occurrence_limit: certificate.each_occurrence_limit || undefined,
          general_aggregate_limit: certificate.general_aggregate_limit || undefined,
          products_completed_ops_limit: certificate.products_completed_ops_limit || undefined,
          combined_single_limit: certificate.combined_single_limit || undefined,
          umbrella_each_occurrence: certificate.umbrella_each_occurrence || undefined,
          umbrella_aggregate: certificate.umbrella_aggregate || undefined,
          workers_comp_el_each_accident: certificate.workers_comp_el_each_accident || undefined,
          additional_insured_required: certificate.additional_insured_required,
          additional_insured_verified: certificate.additional_insured_verified,
          additional_insured_name: certificate.additional_insured_name || '',
          waiver_of_subrogation_required: certificate.waiver_of_subrogation_required,
          waiver_of_subrogation_verified: certificate.waiver_of_subrogation_verified,
          primary_noncontributory_required: certificate.primary_noncontributory_required,
          primary_noncontributory_verified: certificate.primary_noncontributory_verified,
          issued_by_name: certificate.issued_by_name || '',
          issued_by_email: certificate.issued_by_email || '',
          issued_by_phone: certificate.issued_by_phone || '',
          notes: certificate.notes || '',
          description_of_operations: certificate.description_of_operations || '',
          alert_days_before_expiry: certificate.alert_days_before_expiry,
          suppress_alerts: certificate.suppress_alerts,
        }
      : {
          certificate_number: '',
          insurance_type: '',
          carrier_name: '',
          policy_number: '',
          effective_date: '',
          expiration_date: '',
          subcontractor_id: defaultSubcontractorId || '',
          project_id: defaultProjectId || '',
          additional_insured_required: true,
          additional_insured_verified: false,
          waiver_of_subrogation_required: false,
          waiver_of_subrogation_verified: false,
          primary_noncontributory_required: false,
          primary_noncontributory_verified: false,
          alert_days_before_expiry: 30,
          suppress_alerts: false,
        },
  })

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  const onSubmit = async (values: CertificateFormValues) => {
    try {
      const formData = {
        ...values,
        insurance_type: values.insurance_type as InsuranceType,
        subcontractor_id: values.subcontractor_id || null,
        project_id: values.project_id || null,
        carrier_naic_number: values.carrier_naic_number || null,
        additional_insured_name: values.additional_insured_name || null,
        issued_by_name: values.issued_by_name || null,
        issued_by_email: values.issued_by_email || null,
        issued_by_phone: values.issued_by_phone || null,
        notes: values.notes || null,
        description_of_operations: values.description_of_operations || null,
        each_occurrence_limit: values.each_occurrence_limit || null,
        general_aggregate_limit: values.general_aggregate_limit || null,
        products_completed_ops_limit: values.products_completed_ops_limit || null,
        personal_adv_injury_limit: values.personal_adv_injury_limit || null,
        damage_to_rented_premises: values.damage_to_rented_premises || null,
        medical_expense_limit: values.medical_expense_limit || null,
        combined_single_limit: values.combined_single_limit || null,
        bodily_injury_per_person: values.bodily_injury_per_person || null,
        bodily_injury_per_accident: values.bodily_injury_per_accident || null,
        property_damage_limit: values.property_damage_limit || null,
        umbrella_each_occurrence: values.umbrella_each_occurrence || null,
        umbrella_aggregate: values.umbrella_aggregate || null,
        workers_comp_el_each_accident: values.workers_comp_el_each_accident || null,
        workers_comp_el_disease_policy: values.workers_comp_el_disease_policy || null,
        workers_comp_el_disease_employee: values.workers_comp_el_disease_employee || null,
      }

      let certificateId: string

      if (isEditing) {
        const result = await updateMutation.mutateAsync({
          certificateId: certificate.id,
          updates: formData as UpdateInsuranceCertificateDTO,
        })
        certificateId = result.id
      } else {
        const result = await createMutation.mutateAsync(
          formData as Omit<CreateInsuranceCertificateDTO, 'company_id'>
        )
        certificateId = result.id
      }

      // Upload document if selected
      if (selectedFile) {
        await uploadMutation.mutateAsync({
          certificateId,
          file: selectedFile,
        })
      }

      onClose()
    } catch (error) {
      console.error('Failed to save certificate:', error)
    }
  }

  const insuranceType = form.watch('insurance_type')

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {isEditing ? 'Edit Insurance Certificate' : 'Add Insurance Certificate'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the insurance certificate details below.'
              : 'Enter the insurance certificate details. All dates should be from the certificate.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="coverage">Coverage</TabsTrigger>
                <TabsTrigger value="endorsements">Endorsements</TabsTrigger>
                <TabsTrigger value="other">Other</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                {/* Insurance Type */}
                <FormField
                  control={form.control}
                  name="insurance_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Insurance Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select insurance type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(INSURANCE_TYPE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  {/* Certificate Number */}
                  <FormField
                    control={form.control}
                    name="certificate_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Certificate Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter certificate number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Policy Number */}
                  <FormField
                    control={form.control}
                    name="policy_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Policy Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter policy number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Carrier Name */}
                  <FormField
                    control={form.control}
                    name="carrier_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Insurance Carrier *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter carrier name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* NAIC Number */}
                  <FormField
                    control={form.control}
                    name="carrier_naic_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>NAIC Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter NAIC number" {...field} />
                        </FormControl>
                        <FormDescription>Optional carrier identifier</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Effective Date */}
                  <FormField
                    control={form.control}
                    name="effective_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Effective Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Expiration Date */}
                  <FormField
                    control={form.control}
                    name="expiration_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expiration Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Subcontractor */}
                  {subcontractors.length > 0 && (
                    <FormField
                      control={form.control}
                      name="subcontractor_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subcontractor</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select subcontractor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">None</SelectItem>
                              {subcontractors.map((sub) => (
                                <SelectItem key={sub.id} value={sub.id}>
                                  {sub.company_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Project */}
                  {projects.length > 0 && (
                    <FormField
                      control={form.control}
                      name="project_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select project" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">None (Company-wide)</SelectItem>
                              {projects.map((project) => (
                                <SelectItem key={project.id} value={project.id}>
                                  {project.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {/* Document Upload */}
                <div className="border rounded-lg p-4">
                  <label className="text-sm font-medium">Certificate Document</label>
                  <div className="mt-2">
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload a PDF or image of the certificate
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="coverage" className="space-y-4 mt-4">
                {/* General Liability Limits */}
                {(insuranceType === 'general_liability' || insuranceType === '') && (
                  <>
                    <p className="text-sm font-medium text-muted-foreground">
                      General Liability Limits
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="each_occurrence_limit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Each Occurrence</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="1000000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="general_aggregate_limit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>General Aggregate</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="2000000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="products_completed_ops_limit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Products/Completed Ops</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="2000000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}

                {/* Auto Liability Limits */}
                {insuranceType === 'auto_liability' && (
                  <>
                    <p className="text-sm font-medium text-muted-foreground">
                      Auto Liability Limits
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="combined_single_limit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Combined Single Limit</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="1000000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}

                {/* Umbrella Limits */}
                {insuranceType === 'umbrella' && (
                  <>
                    <p className="text-sm font-medium text-muted-foreground">Umbrella Limits</p>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="umbrella_each_occurrence"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Each Occurrence</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="5000000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="umbrella_aggregate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Aggregate</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="5000000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}

                {/* Workers Comp Limits */}
                {insuranceType === 'workers_compensation' && (
                  <>
                    <p className="text-sm font-medium text-muted-foreground">
                      Workers Compensation - Employer&apos;s Liability
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="workers_comp_el_each_accident"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E.L. Each Accident</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="1000000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="workers_comp_el_disease_policy"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E.L. Disease - Policy Limit</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="1000000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="workers_comp_el_disease_employee"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E.L. Disease - Each Employee</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="1000000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="endorsements" className="space-y-4 mt-4">
                {/* Additional Insured */}
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Additional Insured</p>
                      <p className="text-sm text-muted-foreground">
                        Certificate holder named as additional insured
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <FormField
                      control={form.control}
                      name="additional_insured_required"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">Required</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="additional_insured_verified"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">Verified</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="additional_insured_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Insured Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Name as shown on certificate" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Waiver of Subrogation */}
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Waiver of Subrogation</p>
                      <p className="text-sm text-muted-foreground">
                        Insurer waives right to subrogate against certificate holder
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <FormField
                      control={form.control}
                      name="waiver_of_subrogation_required"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">Required</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="waiver_of_subrogation_verified"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">Verified</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Primary/Non-contributory */}
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Primary/Non-contributory</p>
                      <p className="text-sm text-muted-foreground">
                        Policy is primary and non-contributory
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <FormField
                      control={form.control}
                      name="primary_noncontributory_required"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">Required</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="primary_noncontributory_verified"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">Verified</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="other" className="space-y-4 mt-4">
                {/* Issued By */}
                <p className="text-sm font-medium text-muted-foreground">Certificate Issued By</p>
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="issued_by_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Agent/Broker name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="issued_by_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="agent@insurance.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="issued_by_phone"
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

                {/* Description of Operations */}
                <FormField
                  control={form.control}
                  name="description_of_operations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description of Operations</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter description from certificate field 15..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Copy from certificate field 15 (Description of Operations/Locations)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional notes..." rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Alert Settings */}
                <div className="border rounded-lg p-4 space-y-3">
                  <p className="font-medium">Alert Settings</p>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="alert_days_before_expiry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Days Before Expiry</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormDescription>Send alert this many days before expiration</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="suppress_alerts"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0 pt-6">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">Suppress alerts</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Update Certificate' : 'Add Certificate'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
