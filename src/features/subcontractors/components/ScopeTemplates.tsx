/**
 * ScopeTemplates Component
 * Template library for bid package scope items by trade
 */

import { useState, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Edit,
  FileText,
  Folder,
  GripVertical,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  useScopeTemplateLibrary,
  useScopeTemplate,
  useCreateScopeTemplate,
  useUpdateScopeTemplate,
  useDeleteScopeTemplate,
  useDuplicateScopeTemplate,
  useApplyScopeTemplate,
  useAddTemplateItem,
  useUpdateTemplateItem,
  useDeleteTemplateItem,
  getTradeLabel,
} from '../hooks'
import { TRADE_CODES } from '@/features/bidding/types/bidding'
import type { ScopeTemplateWithStats, ScopeTemplateFormValues } from '../types'
import { cn } from '@/lib/utils'

// Form schema
const templateSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  description: z.string().optional(),
  tradeCode: z.string().min(1, 'Trade is required'),
  division: z.string().optional(),
  scopeItems: z.array(z.object({
    itemNumber: z.string().min(1, 'Item number is required'),
    description: z.string().min(2, 'Description is required'),
    unit: z.string().optional(),
    isRequired: z.boolean(),
    isAlternate: z.boolean(),
    alternateGroup: z.string().optional(),
    estimatedQuantity: z.number().optional(),
    estimatedUnitPrice: z.number().optional(),
    notes: z.string().optional(),
  })),
  commonInclusions: z.array(z.string()),
  commonExclusions: z.array(z.string()),
  requiredDocuments: z.array(z.string()),
  specialConditions: z.string().optional(),
})

interface ScopeTemplatesProps {
  onApplyTemplate?: (templateId: string, packageId: string) => void
  bidPackageId?: string
}

export function ScopeTemplates({ onApplyTemplate, bidPackageId }: ScopeTemplatesProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTrade, setSelectedTrade] = useState<string>('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [showApplyDialog, setShowApplyDialog] = useState<string | null>(null)

  const { data: library, isLoading } = useScopeTemplateLibrary()
  const createMutation = useCreateScopeTemplate()
  const deleteMutation = useDeleteScopeTemplate()
  const duplicateMutation = useDuplicateScopeTemplate()
  const applyMutation = useApplyScopeTemplate()

  // Filter templates
  const filteredTemplates = library?.templates.filter((t) => {
    if (selectedTrade !== 'all' && t.tradeCode !== selectedTrade) {return false}
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) {return false}
    return true
  }) || []

  // Handle apply template
  const handleApplyTemplate = useCallback(async (templateId: string) => {
    if (!bidPackageId) {return}

    await applyMutation.mutateAsync({
      templateId,
      packageId: bidPackageId,
    })

    setShowApplyDialog(null)
    onApplyTemplate?.(templateId, bidPackageId)
  }, [bidPackageId, applyMutation, onApplyTemplate])

  // Handle duplicate
  const handleDuplicate = useCallback(async (template: ScopeTemplateWithStats) => {
    await duplicateMutation.mutateAsync({
      templateId: template.id,
      newName: `${template.name} (Copy)`,
    })
  }, [duplicateMutation])

  // Handle delete
  const handleDelete = useCallback(async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {return}
    await deleteMutation.mutateAsync(templateId)
  }, [deleteMutation])

  if (isLoading) {
    return <ScopeTemplatesLoading />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Scope Templates
          </h2>
          <p className="text-muted-foreground">
            {library?.templates.length || 0} templates across {library?.trades.length || 0} trades
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedTrade} onValueChange={setSelectedTrade}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by trade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trades</SelectItem>
            {library?.trades.map((trade) => (
              <SelectItem key={trade.code} value={trade.code}>
                {trade.name} ({trade.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      {selectedTrade === 'all' ? (
        <div className="space-y-8">
          {library?.trades.map((trade) => {
            const tradeTemplates = filteredTemplates.filter((t) => t.tradeCode === trade.code)
            if (tradeTemplates.length === 0) {return null}

            return (
              <div key={trade.code}>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Folder className="h-5 w-5" />
                  {trade.name}
                  <Badge variant="secondary">{tradeTemplates.length}</Badge>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tradeTemplates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onView={() => setSelectedTemplateId(template.id)}
                      onApply={() => setShowApplyDialog(template.id)}
                      onDuplicate={() => handleDuplicate(template)}
                      onDelete={() => handleDelete(template.id)}
                      canApply={!!bidPackageId}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onView={() => setSelectedTemplateId(template.id)}
              onApply={() => setShowApplyDialog(template.id)}
              onDuplicate={() => handleDuplicate(template)}
              onDelete={() => handleDelete(template.id)}
              canApply={!!bidPackageId}
            />
          ))}
        </div>
      )}

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No templates found</p>
          <p className="text-sm mt-1">Create a new template to get started</p>
        </div>
      )}

      {/* Create Template Dialog */}
      <CreateTemplateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={async (data) => {
          await createMutation.mutateAsync({
            name: data.name,
            description: data.description,
            tradeCode: data.tradeCode as any,
            division: data.division,
            scopeItems: data.scopeItems,
            commonInclusions: data.commonInclusions,
            commonExclusions: data.commonExclusions,
            requiredDocuments: data.requiredDocuments,
            specialConditions: data.specialConditions,
          })
          setShowCreateDialog(false)
        }}
        isLoading={createMutation.isPending}
      />

      {/* View Template Sheet */}
      <TemplateDetailSheet
        templateId={selectedTemplateId}
        open={!!selectedTemplateId}
        onOpenChange={(open) => !open && setSelectedTemplateId(null)}
        onApply={() => selectedTemplateId && setShowApplyDialog(selectedTemplateId)}
        canApply={!!bidPackageId}
      />

      {/* Apply Template Dialog */}
      <Dialog open={!!showApplyDialog} onOpenChange={(open) => !open && setShowApplyDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Template to Bid Package</DialogTitle>
            <DialogDescription>
              This will add the template's scope items, inclusions, and exclusions to the bid package.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox id="include-items" defaultChecked />
              <Label htmlFor="include-items">Include scope items</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="include-exclusions" defaultChecked />
              <Label htmlFor="include-exclusions">Include standard exclusions</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="include-inclusions" defaultChecked />
              <Label htmlFor="include-inclusions">Include standard inclusions</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="include-documents" defaultChecked />
              <Label htmlFor="include-documents">Include required documents list</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplyDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => showApplyDialog && handleApplyTemplate(showApplyDialog)}
              disabled={applyMutation.isPending}
            >
              {applyMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Apply Template
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =============================================
// Sub-components
// =============================================

interface TemplateCardProps {
  template: ScopeTemplateWithStats
  onView: () => void
  onApply: () => void
  onDuplicate: () => void
  onDelete: () => void
  canApply: boolean
}

function TemplateCard({
  template,
  onView,
  onApply,
  onDuplicate,
  onDelete,
  canApply,
}: TemplateCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              {template.name}
              {template.isDefault && (
                <Star className="h-4 w-4 fill-warning text-warning" />
              )}
            </CardTitle>
            <CardDescription className="line-clamp-2 mt-1">
              {template.description || 'No description'}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onView}>
                <FileText className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              {canApply && (
                <DropdownMenuItem onClick={onApply}>
                  <Check className="h-4 w-4 mr-2" />
                  Apply to Package
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-error">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm">
          <Badge variant="outline">{template.tradeName}</Badge>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span>{template.itemCount} items</span>
            <span>{template.usageCount} uses</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface CreateTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: z.infer<typeof templateSchema>) => Promise<void>
  isLoading: boolean
}

function CreateTemplateDialog({ open, onOpenChange, onSubmit, isLoading }: CreateTemplateDialogProps) {
  const form = useForm<z.infer<typeof templateSchema>>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      description: '',
      tradeCode: '',
      scopeItems: [],
      commonInclusions: [],
      commonExclusions: [],
      requiredDocuments: [],
    },
  })

  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
    control: form.control,
    name: 'scopeItems',
  })

  const [newInclusion, setNewInclusion] = useState('')
  const [newExclusion, setNewExclusion] = useState('')
  const [newDocument, setNewDocument] = useState('')

  const inclusions = form.watch('commonInclusions')
  const exclusions = form.watch('commonExclusions')
  const documents = form.watch('requiredDocuments')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Create Scope Template</DialogTitle>
          <DialogDescription>
            Create a reusable scope template for bid packages
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Standard Electrical Scope" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tradeCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trade *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select trade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TRADE_CODES.map((trade) => (
                            <SelectItem key={trade.value} value={trade.value}>
                              {trade.label}
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} placeholder="Describe this template..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Scope Items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label>Scope Items</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendItem({
                      itemNumber: String(itemFields.length + 1),
                      description: '',
                      unit: '',
                      isRequired: true,
                      isAlternate: false,
                    })}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
                <div className="space-y-2">
                  {itemFields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-1">
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      </div>
                      <FormField
                        control={form.control}
                        name={`scopeItems.${index}.itemNumber`}
                        render={({ field }) => (
                          <FormItem className="col-span-1">
                            <FormControl>
                              <Input {...field} placeholder="#" className="text-center" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`scopeItems.${index}.description`}
                        render={({ field }) => (
                          <FormItem className="col-span-6">
                            <FormControl>
                              <Input {...field} placeholder="Description" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`scopeItems.${index}.unit`}
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormControl>
                              <Input {...field} placeholder="Unit" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`scopeItems.${index}.isRequired`}
                        render={({ field }) => (
                          <FormItem className="col-span-1 flex items-center justify-center">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4 text-error" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {itemFields.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No scope items added yet
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Inclusions */}
              <div>
                <Label className="mb-2 block">Standard Inclusions</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newInclusion}
                    onChange={(e) => setNewInclusion(e.target.value)}
                    placeholder="Add inclusion..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (newInclusion.trim()) {
                          form.setValue('commonInclusions', [...inclusions, newInclusion.trim()])
                          setNewInclusion('')
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (newInclusion.trim()) {
                        form.setValue('commonInclusions', [...inclusions, newInclusion.trim()])
                        setNewInclusion('')
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {inclusions.map((item, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {item}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => form.setValue('commonInclusions', inclusions.filter((_, i) => i !== index))}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Exclusions */}
              <div>
                <Label className="mb-2 block">Standard Exclusions</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newExclusion}
                    onChange={(e) => setNewExclusion(e.target.value)}
                    placeholder="Add exclusion..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (newExclusion.trim()) {
                          form.setValue('commonExclusions', [...exclusions, newExclusion.trim()])
                          setNewExclusion('')
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (newExclusion.trim()) {
                        form.setValue('commonExclusions', [...exclusions, newExclusion.trim()])
                        setNewExclusion('')
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {exclusions.map((item, index) => (
                    <Badge key={index} variant="outline" className="gap-1 border-warning">
                      {item}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => form.setValue('commonExclusions', exclusions.filter((_, i) => i !== index))}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Required Documents */}
              <div>
                <Label className="mb-2 block">Required Documents</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newDocument}
                    onChange={(e) => setNewDocument(e.target.value)}
                    placeholder="Add required document..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (newDocument.trim()) {
                          form.setValue('requiredDocuments', [...documents, newDocument.trim()])
                          setNewDocument('')
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (newDocument.trim()) {
                        form.setValue('requiredDocuments', [...documents, newDocument.trim()])
                        setNewDocument('')
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {documents.map((item, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {item}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => form.setValue('requiredDocuments', documents.filter((_, i) => i !== index))}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              <FormField
                control={form.control}
                name="specialConditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Special Conditions</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} placeholder="Any special conditions or notes..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Create Template
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

interface TemplateDetailSheetProps {
  templateId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: () => void
  canApply: boolean
}

function TemplateDetailSheet({
  templateId,
  open,
  onOpenChange,
  onApply,
  canApply,
}: TemplateDetailSheetProps) {
  const { data: template, isLoading } = useScopeTemplate(templateId || undefined)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{template?.name || 'Template Details'}</SheetTitle>
          <SheetDescription>
            {template?.description || 'View template scope items and settings'}
          </SheetDescription>
        </SheetHeader>
        {isLoading ? (
          <div className="space-y-4 mt-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : template ? (
          <ScrollArea className="h-[calc(100vh-200px)] mt-6 pr-4">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Badge>{getTradeLabel(template.tradeCode as any)}</Badge>
                {template.division && <Badge variant="outline">Division {template.division}</Badge>}
                {template.isDefault && <Badge variant="secondary">Default</Badge>}
              </div>

              {/* Scope Items */}
              <div>
                <h4 className="font-medium mb-3">Scope Items ({template.scopeItems?.length || 0})</h4>
                {template.scopeItems && template.scopeItems.length > 0 ? (
                  <div className="space-y-2">
                    {template.scopeItems.map((item, index) => (
                      <div key={item.id || index} className="flex items-start gap-3 text-sm">
                        <span className="font-mono text-muted-foreground w-8">{item.itemNumber}</span>
                        <div className="flex-1">
                          <p>{item.description}</p>
                          {item.unit && <p className="text-xs text-muted-foreground">Unit: {item.unit}</p>}
                        </div>
                        {item.isAlternate && <Badge variant="outline" className="text-xs">Alt</Badge>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No scope items defined</p>
                )}
              </div>

              <Separator />

              {/* Inclusions */}
              {template.commonInclusions && template.commonInclusions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Standard Inclusions</h4>
                  <ul className="space-y-1">
                    {template.commonInclusions.map((item, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Exclusions */}
              {template.commonExclusions && template.commonExclusions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Standard Exclusions</h4>
                  <ul className="space-y-1">
                    {template.commonExclusions.map((item, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <X className="h-4 w-4 text-error shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Required Documents */}
              {template.requiredDocuments && template.requiredDocuments.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Required Documents</h4>
                  <ul className="space-y-1">
                    {template.requiredDocuments.map((item, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <FileText className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Special Conditions */}
              {template.specialConditions && (
                <div>
                  <h4 className="font-medium mb-3">Special Conditions</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {template.specialConditions}
                  </p>
                </div>
              )}

              {canApply && (
                <Button className="w-full" onClick={onApply}>
                  <Check className="h-4 w-4 mr-2" />
                  Apply to Bid Package
                </Button>
              )}
            </div>
          </ScrollArea>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function ScopeTemplatesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32 mt-2" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-48" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-6 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
