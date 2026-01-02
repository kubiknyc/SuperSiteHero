/**
 * PreQualificationForm Component
 * Comprehensive pre-qualification form for subcontractor evaluation
 */

import { useState, useCallback } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  AlertCircle,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  DollarSign,
  FileUp,
  HardHat,
  Loader2,
  Plus,
  Shield,
  Trash2,
  Upload,
  UserCheck,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import {
  RadixSelect as Select,
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  useCreatePreQualSubmission,
  usePreQualQuestionnaire,
  calculatePreQualScore,
} from '../hooks'
import type { PreQualFormValues, PreQualScoringResult } from '../types'
import { cn } from '@/lib/utils'

// Form validation schema
const preQualSchema = z.object({
  // Company Info
  companyName: z.string().min(2, 'Company name is required'),
  dbaName: z.string().optional(),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zip: z.string().min(5, 'ZIP code is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  fax: z.string().optional(),
  email: z.string().email('Valid email is required'),
  website: z.string().url().optional().or(z.literal('')),
  federalTaxId: z.string().min(9, 'Federal Tax ID is required'),
  yearsInBusiness: z.number().min(0, 'Must be 0 or greater'),
  numberOfEmployees: z.number().min(1, 'Must have at least 1 employee'),
  unionAffiliation: z.string().optional(),

  // Ownership
  ownershipType: z.enum(['sole_proprietor', 'partnership', 'corporation', 'llc', 'other']),
  ownershipTypeOther: z.string().optional(),
  principals: z.array(z.object({
    name: z.string().min(2, 'Name is required'),
    title: z.string().min(2, 'Title is required'),
    ownershipPercent: z.number().min(0).max(100),
    yearsWithCompany: z.number().min(0),
  })).min(1, 'At least one principal is required'),

  // Financial
  bondingCompany: z.string().optional(),
  bondingAgent: z.string().optional(),
  bondingLimit: z.number().optional(),
  singleProjectLimit: z.number().optional(),
  currentBondingUsed: z.number().optional(),
  bankName: z.string().optional(),
  bankContactName: z.string().optional(),
  bankContactPhone: z.string().optional(),
  creditReferences: z.array(z.object({
    companyName: z.string().min(2),
    contactName: z.string().min(2),
    phone: z.string().min(10),
    email: z.string().email().optional().or(z.literal('')),
    accountNumber: z.string().optional(),
  })),

  // Safety
  emr: z.number().min(0).max(3).nullable(),
  emrYear: z.number().min(2000).max(2100).nullable(),
  oshaRecordableRate: z.number().min(0).optional(),
  dartRate: z.number().min(0).optional(),
  osha300LogAvailable: z.boolean(),
  fatalitiesLast5Years: z.number().min(0),
  citationsLast3Years: z.number().min(0),
  safetyProgramDescription: z.string().optional(),
  safetyTrainingRequired: z.boolean(),
  ppePolicy: z.boolean(),
  substanceAbusePolicy: z.boolean(),

  // Experience
  trades: z.array(z.string()).min(1, 'Select at least one trade'),
  licensesHeld: z.array(z.object({
    type: z.string().min(2),
    number: z.string().min(2),
    state: z.string().min(2),
    expirationDate: z.string(),
    classification: z.string().optional(),
  })),
  typicalProjectSize: z.enum(['under_100k', '100k_500k', '500k_1m', '1m_5m', '5m_10m', 'over_10m']),
  largestProjectCompleted: z.number().optional(),
  references: z.array(z.object({
    projectName: z.string().min(2),
    ownerName: z.string().min(2),
    contactName: z.string().min(2),
    contactPhone: z.string().min(10),
    contactEmail: z.string().email().optional().or(z.literal('')),
    contractValue: z.number().min(0),
    completionDate: z.string(),
    scopeDescription: z.string().min(10),
    onTime: z.boolean(),
    onBudget: z.boolean(),
  })).min(3, 'At least 3 references are required'),

  // Additional
  additionalInfo: z.string().optional(),
})

interface PreQualificationFormProps {
  questionnaireId?: string
  subcontractorId: string
  onSuccess?: () => void
  onCancel?: () => void
}

const TRADES = [
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'masonry', label: 'Masonry' },
  { value: 'structural_steel', label: 'Structural Steel' },
  { value: 'carpentry', label: 'Carpentry' },
  { value: 'drywall', label: 'Drywall' },
  { value: 'painting', label: 'Painting' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'glazing', label: 'Glazing' },
  { value: 'fire_protection', label: 'Fire Protection' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'sitework', label: 'Sitework' },
  { value: 'demolition', label: 'Demolition' },
]

const PROJECT_SIZES = [
  { value: 'under_100k', label: 'Under $100,000' },
  { value: '100k_500k', label: '$100,000 - $500,000' },
  { value: '500k_1m', label: '$500,000 - $1,000,000' },
  { value: '1m_5m', label: '$1,000,000 - $5,000,000' },
  { value: '5m_10m', label: '$5,000,000 - $10,000,000' },
  { value: 'over_10m', label: 'Over $10,000,000' },
]

export function PreQualificationForm({
  questionnaireId,
  subcontractorId,
  onSuccess,
  onCancel,
}: PreQualificationFormProps) {
  const [currentSection, setCurrentSection] = useState(0)
  const [scoringResult, setScoringResult] = useState<PreQualScoringResult | null>(null)

  const { data: questionnaire } = usePreQualQuestionnaire(questionnaireId)
  const submitMutation = useCreatePreQualSubmission()

  const form = useForm<z.infer<typeof preQualSchema>>({
    resolver: zodResolver(preQualSchema),
    defaultValues: {
      companyName: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      phone: '',
      email: '',
      federalTaxId: '',
      yearsInBusiness: 0,
      numberOfEmployees: 1,
      ownershipType: 'llc',
      principals: [{ name: '', title: '', ownershipPercent: 100, yearsWithCompany: 0 }],
      creditReferences: [],
      emr: null,
      emrYear: null,
      osha300LogAvailable: false,
      fatalitiesLast5Years: 0,
      citationsLast3Years: 0,
      safetyTrainingRequired: false,
      ppePolicy: false,
      substanceAbusePolicy: false,
      trades: [],
      licensesHeld: [],
      typicalProjectSize: '100k_500k',
      references: [],
    },
  })

  const {
    fields: principalFields,
    append: appendPrincipal,
    remove: removePrincipal,
  } = useFieldArray({
    control: form.control,
    name: 'principals',
  })

  const {
    fields: referenceFields,
    append: appendReference,
    remove: removeReference,
  } = useFieldArray({
    control: form.control,
    name: 'references',
  })

  const {
    fields: licenseFields,
    append: appendLicense,
    remove: removeLicense,
  } = useFieldArray({
    control: form.control,
    name: 'licensesHeld',
  })

  const {
    fields: creditRefFields,
    append: appendCreditRef,
    remove: removeCreditRef,
  } = useFieldArray({
    control: form.control,
    name: 'creditReferences',
  })

  const sections = [
    { id: 'company', label: 'Company Information', icon: Building2 },
    { id: 'financial', label: 'Financial Capacity', icon: DollarSign },
    { id: 'safety', label: 'Safety Record', icon: HardHat },
    { id: 'experience', label: 'Experience & References', icon: UserCheck },
    { id: 'review', label: 'Review & Submit', icon: Check },
  ]

  const progress = ((currentSection + 1) / sections.length) * 100

  const onSubmit = useCallback(async (data: z.infer<typeof preQualSchema>) => {
    try {
      // Calculate score
      const scoring = calculatePreQualScore(
        data as any,
        questionnaire || { sections: [] } as any,
        {
          emr: data.emr,
          fatalitiesLast5Years: data.fatalitiesLast5Years,
          seriousViolationsLast3Years: data.citationsLast3Years,
          safetyProgramInPlace: !!data.safetyProgramDescription,
          ppePolicy: data.ppePolicy,
          substanceAbusePolicy: data.substanceAbusePolicy,
        },
        {
          yearsInBusiness: data.yearsInBusiness,
          bondingCapacity: data.bondingLimit,
          financialStatementsProvided: false,
        }
      )

      setScoringResult(scoring)

      await submitMutation.mutateAsync({
        subcontractorId,
        questionnaireId: questionnaireId || '',
        answers: Object.entries(data).map(([key, value]) => ({
          questionId: key,
          value,
          score: null,
          notes: null,
        })),
        safetyRecord: {
          emr: data.emr,
          osha300Log: data.osha300LogAvailable,
          oshaRecordableRate: data.oshaRecordableRate || null,
          dartRate: data.dartRate || null,
          fatalitiesLast5Years: data.fatalitiesLast5Years,
          seriousViolationsLast3Years: data.citationsLast3Years,
          safetyProgramInPlace: !!data.safetyProgramDescription,
          safetyTrainingRequired: data.safetyTrainingRequired,
          ppePolicy: data.ppePolicy,
          substanceAbusePolicy: data.substanceAbusePolicy,
          notes: data.safetyProgramDescription || null,
        },
        financials: {
          yearsInBusiness: data.yearsInBusiness,
          annualRevenue: null,
          creditRating: null,
          bondingCapacity: data.bondingLimit || null,
          currentBondingUsed: data.currentBondingUsed || null,
          bankReference: data.bankName || null,
          financialStatementsProvided: false,
          financialStatementDate: null,
          dAndBNumber: null,
          notes: null,
        },
        references: data.references.map((ref) => ({
          companyName: ref.ownerName,
          contactName: ref.contactName,
          contactPhone: ref.contactPhone,
          contactEmail: ref.contactEmail || null,
          projectName: ref.projectName,
          projectValue: ref.contractValue,
          projectCompletedDate: ref.completionDate,
          scope: ref.scopeDescription,
          rating: null,
          wasReferenceContacted: false,
          referenceNotes: null,
        })),
      })

      onSuccess?.()
    } catch (error) {
      console.error('Submission error:', error)
    }
  }, [submitMutation, subcontractorId, questionnaireId, questionnaire, onSuccess])

  const nextSection = useCallback(() => {
    if (currentSection < sections.length - 1) {
      setCurrentSection((prev) => prev + 1)
    }
  }, [currentSection, sections.length])

  const prevSection = useCallback(() => {
    if (currentSection > 0) {
      setCurrentSection((prev) => prev - 1)
    }
  }, [currentSection])

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{sections[currentSection].label}</span>
          <span className="text-muted-foreground">Step {currentSection + 1} of {sections.length}</span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between">
          {sections.map((section, index) => {
            const Icon = section.icon
            return (
              <button
                key={section.id}
                type="button"
                className={cn(
                  'flex flex-col items-center gap-1 p-2 rounded-lg transition-colors',
                  index === currentSection && 'bg-primary/10 text-primary',
                  index < currentSection && 'text-success',
                  index > currentSection && 'text-muted-foreground'
                )}
                onClick={() => setCurrentSection(index)}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs hidden md:inline">{section.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Section 1: Company Information */}
          {currentSection === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Company Information
                </CardTitle>
                <CardDescription>
                  Basic information about your company
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dbaName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>DBA (if applicable)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem className="col-span-2 md:col-span-2">
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="zip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone *</FormLabel>
                        <FormControl>
                          <Input {...field} type="tel" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fax</FormLabel>
                        <FormControl>
                          <Input {...field} type="tel" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="federalTaxId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Federal Tax ID *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="XX-XXXXXXX" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ownershipType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ownership Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="sole_proprietor">Sole Proprietor</SelectItem>
                            <SelectItem value="partnership">Partnership</SelectItem>
                            <SelectItem value="corporation">Corporation</SelectItem>
                            <SelectItem value="llc">LLC</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="yearsInBusiness"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Years in Business *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="numberOfEmployees"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Employees *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unionAffiliation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Union Affiliation</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="None / Local XXX" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Principals */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label>Principals / Owners *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendPrincipal({ name: '', title: '', ownershipPercent: 0, yearsWithCompany: 0 })}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Principal
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {principalFields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                        <FormField
                          control={form.control}
                          name={`principals.${index}.name`}
                          render={({ field }) => (
                            <FormItem className="col-span-4">
                              <FormLabel className={index > 0 ? 'sr-only' : ''}>Name</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`principals.${index}.title`}
                          render={({ field }) => (
                            <FormItem className="col-span-3">
                              <FormLabel className={index > 0 ? 'sr-only' : ''}>Title</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`principals.${index}.ownershipPercent`}
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel className={index > 0 ? 'sr-only' : ''}>% Ownership</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`principals.${index}.yearsWithCompany`}
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel className={index > 0 ? 'sr-only' : ''}>Years</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <div className="col-span-1">
                          {index > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removePrincipal(index)}
                            >
                              <Trash2 className="h-4 w-4 text-error" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 2: Financial Capacity */}
          {currentSection === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Capacity
                </CardTitle>
                <CardDescription>
                  Bonding capacity and financial references
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="bondingCompany"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bonding Company</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bondingAgent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bonding Agent</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="bondingLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aggregate Bonding Limit ($)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            value={field.value || ''}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="singleProjectLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Single Project Limit ($)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            value={field.value || ''}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="currentBondingUsed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Bonding Used ($)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            value={field.value || ''}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bankContactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank Contact</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bankContactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank Phone</FormLabel>
                        <FormControl>
                          <Input {...field} type="tel" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Credit References */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label>Credit References</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendCreditRef({ companyName: '', contactName: '', phone: '', email: '' })}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Reference
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {creditRefFields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                        <FormField
                          control={form.control}
                          name={`creditReferences.${index}.companyName`}
                          render={({ field }) => (
                            <FormItem className="col-span-3">
                              <FormLabel className={index > 0 ? 'sr-only' : ''}>Company</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`creditReferences.${index}.contactName`}
                          render={({ field }) => (
                            <FormItem className="col-span-3">
                              <FormLabel className={index > 0 ? 'sr-only' : ''}>Contact</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`creditReferences.${index}.phone`}
                          render={({ field }) => (
                            <FormItem className="col-span-3">
                              <FormLabel className={index > 0 ? 'sr-only' : ''}>Phone</FormLabel>
                              <FormControl>
                                <Input {...field} type="tel" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`creditReferences.${index}.email`}
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel className={index > 0 ? 'sr-only' : ''}>Email</FormLabel>
                              <FormControl>
                                <Input {...field} type="email" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <div className="col-span-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeCreditRef(index)}
                          >
                            <Trash2 className="h-4 w-4 text-error" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {creditRefFields.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No credit references added
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 3: Safety Record */}
          {currentSection === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardHat className="h-5 w-5" />
                  Safety Record
                </CardTitle>
                <CardDescription>
                  Safety metrics and program information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="emr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>EMR (Experience Modification Rate)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                          />
                        </FormControl>
                        <FormDescription>Enter value like 0.85 or 1.20</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="emrYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>EMR Year</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="oshaRecordableRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>OSHA Recordable Rate</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            value={field.value || ''}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dartRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>DART Rate</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            value={field.value || ''}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="fatalitiesLast5Years"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fatalities (Last 5 Years) *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="citationsLast3Years"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>OSHA Citations (Last 3 Years) *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="osha300LogAvailable"
                    render={({ field }) => (
                      <FormItem className="flex items-end gap-2 pb-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">OSHA 300 Log Available</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="safetyProgramDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Safety Program Description</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={3}
                            placeholder="Describe your company's safety program..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="safetyTrainingRequired"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Safety Training Required for Employees</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="ppePolicy"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Written PPE Policy</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="substanceAbusePolicy"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Substance Abuse Policy</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 4: Experience & References */}
          {currentSection === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Experience & References
                </CardTitle>
                <CardDescription>
                  Trade experience and project references
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="trades"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trades *</FormLabel>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {TRADES.map((trade) => (
                          <div key={trade.value} className="flex items-center gap-2">
                            <Checkbox
                              checked={field.value.includes(trade.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...field.value, trade.value])
                                } else {
                                  field.onChange(field.value.filter((v) => v !== trade.value))
                                }
                              }}
                            />
                            <Label className="text-sm">{trade.label}</Label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="typicalProjectSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Typical Project Size *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PROJECT_SIZES.map((size) => (
                              <SelectItem key={size.value} value={size.value}>
                                {size.label}
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
                    name="largestProjectCompleted"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Largest Project Completed ($)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            value={field.value || ''}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Project References */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <Label>Project References *</Label>
                      <p className="text-sm text-muted-foreground">Minimum 3 required</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendReference({
                        projectName: '',
                        ownerName: '',
                        contactName: '',
                        contactPhone: '',
                        contactEmail: '',
                        contractValue: 0,
                        completionDate: '',
                        scopeDescription: '',
                        onTime: true,
                        onBudget: true,
                      })}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Reference
                    </Button>
                  </div>
                  <Accordion type="single" collapsible className="w-full">
                    {referenceFields.map((field, index) => (
                      <AccordionItem key={field.id} value={`ref-${index}`}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-4">
                            <span>Reference {index + 1}: {form.watch(`references.${index}.projectName`) || 'New Reference'}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation()
                                removeReference(index)
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-error" />
                            </Button>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`references.${index}.projectName`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Project Name *</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`references.${index}.ownerName`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Owner/GC Name *</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                              control={form.control}
                              name={`references.${index}.contactName`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Contact Name *</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`references.${index}.contactPhone`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Contact Phone *</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="tel" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`references.${index}.contactEmail`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Contact Email</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="email" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`references.${index}.contractValue`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Contract Value ($) *</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="number"
                                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`references.${index}.completionDate`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Completion Date *</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="date" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={form.control}
                            name={`references.${index}.scopeDescription`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Scope Description *</FormLabel>
                                <FormControl>
                                  <Textarea {...field} rows={2} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex gap-6">
                            <FormField
                              control={form.control}
                              name={`references.${index}.onTime`}
                              render={({ field }) => (
                                <FormItem className="flex items-center gap-2">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <FormLabel className="!mt-0">Completed On Time</FormLabel>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`references.${index}.onBudget`}
                              render={({ field }) => (
                                <FormItem className="flex items-center gap-2">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <FormLabel className="!mt-0">Completed On Budget</FormLabel>
                                </FormItem>
                              )}
                            />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                  {referenceFields.length < 3 && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Minimum 3 project references are required ({referenceFields.length}/3 added)
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 5: Review & Submit */}
          {currentSection === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="h-5 w-5" />
                  Review & Submit
                </CardTitle>
                <CardDescription>
                  Review your information before submitting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {scoringResult && (
                  <Alert className={cn(
                    scoringResult.recommendation === 'approve' && 'border-success bg-success/10',
                    scoringResult.recommendation === 'conditional' && 'border-warning bg-warning/10',
                    scoringResult.recommendation === 'reject' && 'border-error bg-error/10'
                  )}>
                    <Shield className="h-4 w-4" />
                    <AlertTitle>
                      Pre-Qualification Score: {scoringResult.percentage}%
                    </AlertTitle>
                    <AlertDescription>
                      Recommendation: {scoringResult.recommendation.replace('_', ' ').toUpperCase()}
                      {scoringResult.flags.length > 0 && (
                        <ul className="mt-2 list-disc list-inside">
                          {scoringResult.flags.map((flag, i) => (
                            <li key={i} className="text-sm">{flag}</li>
                          ))}
                        </ul>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <h3 className="font-semibold">Company Information</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Company:</span>
                    <span>{form.watch('companyName')}</span>
                    <span className="text-muted-foreground">Years in Business:</span>
                    <span>{form.watch('yearsInBusiness')}</span>
                    <span className="text-muted-foreground">Employees:</span>
                    <span>{form.watch('numberOfEmployees')}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold">Financial</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Bonding Limit:</span>
                    <span>
                      {form.watch('bondingLimit')
                        ? `$${form.watch('bondingLimit')?.toLocaleString()}`
                        : 'Not provided'}
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold">Safety</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">EMR:</span>
                    <span>{form.watch('emr') ?? 'Not provided'}</span>
                    <span className="text-muted-foreground">Fatalities (5 yrs):</span>
                    <span>{form.watch('fatalitiesLast5Years')}</span>
                    <span className="text-muted-foreground">Citations (3 yrs):</span>
                    <span>{form.watch('citationsLast3Years')}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold">Experience</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Trades:</span>
                    <span>{form.watch('trades').join(', ') || 'None selected'}</span>
                    <span className="text-muted-foreground">References:</span>
                    <span>{form.watch('references').length} provided</span>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="additionalInfo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Information</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={3}
                          placeholder="Any additional information you'd like to share..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <div className="flex gap-2">
              {currentSection > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevSection}
                >
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Previous
                </Button>
              )}
              {currentSection < sections.length - 1 ? (
                <Button
                  type="button"
                  onClick={nextSection}
                >
                  Next
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Submit Pre-Qualification
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}
