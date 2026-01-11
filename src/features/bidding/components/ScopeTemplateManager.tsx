/**
 * ScopeTemplateManager Component
 * Manage reusable scope templates by trade with include/exclude checklists
 */

import { useState, useCallback, useMemo } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Book,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Edit,
  FileText,
  Filter,
  FolderOpen,
  GripVertical,
  Layers,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
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
} from '@/features/subcontractors/hooks'
import type { ScopeTemplateWithStats, TradeCode, TRADE_CODES } from '@/features/subcontractors/types'
import { cn } from '@/lib/utils'

// Trade codes constant
const TRADE_CODES_LIST: { value: TradeCode; label: string; division: string }[] = [
  { value: 'electrical', label: 'Electrical', division: '26' },
  { value: 'plumbing', label: 'Plumbing', division: '22' },
  { value: 'hvac', label: 'HVAC', division: '23' },
  { value: 'concrete', label: 'Concrete', division: '03' },
  { value: 'masonry', label: 'Masonry', division: '04' },
  { value: 'structural_steel', label: 'Structural Steel', division: '05' },
  { value: 'carpentry', label: 'Carpentry', division: '06' },
  { value: 'drywall', label: 'Drywall & Acoustical', division: '09' },
  { value: 'painting', label: 'Painting & Coatings', division: '09' },
  { value: 'flooring', label: 'Flooring', division: '09' },
  { value: 'roofing', label: 'Roofing', division: '07' },
  { value: 'glazing', label: 'Glazing', division: '08' },
  { value: 'fire_protection', label: 'Fire Protection', division: '21' },
  { value: 'landscaping', label: 'Landscaping', division: '32' },
  { value: 'sitework', label: 'Sitework', division: '31' },
  { value: 'demolition', label: 'Demolition', division: '02' },
  { value: 'general', label: 'General', division: '01' },
]

// Form schemas
const templateSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  description: z.string().optional(),
  tradeCode: z.string().min(1, 'Trade is required'),
  division: z.string().optional(),
  isDefault: z.boolean().default(false),
  scopeItems: z.array(z.object({
    itemNumber: z.string().min(1, 'Item number required'),
    description: z.string().min(1, 'Description required'),
    unit: z.string().optional(),
    isRequired: z.boolean().default(true),
    isAlternate: z.boolean().default(false),
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

type TemplateFormValues = z.infer<typeof templateSchema>

interface ScopeTemplateManagerProps {
  onApplyTemplate?: (templateId: string, packageId: string) => void
  selectedPackageId?: string
  mode?: 'manage' | 'select'
}

export function ScopeTemplateManager({
  onApplyTemplate,
  selectedPackageId,
  mode = 'manage',
}: ScopeTemplateManagerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTrade, setSelectedTrade] = useState<string | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null)

  const { data: library, isLoading } = useScopeTemplateLibrary()
  const { data: selectedTemplate } = useScopeTemplate(selectedTemplateId || undefined)
  const createMutation = useCreateScopeTemplate()
  const updateMutation = useUpdateScopeTemplate()
  const deleteMutation = useDeleteScopeTemplate()
  const duplicateMutation = useDuplicateScopeTemplate()
  const applyMutation = useApplyScopeTemplate()

  // Filter templates
  const filteredTemplates = useMemo(() => {
    if (!library?.templates) {return []}

    return library.templates.filter((t) => {
      if (selectedTrade && t.tradeCode !== selectedTrade) {return false}
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          t.name.toLowerCase().includes(query) ||
          t.tradeName.toLowerCase().includes(query)
        )
      }
      return true
    })
  }, [library?.templates, selectedTrade, searchQuery])

  // Handle template actions
  const handleDuplicate = useCallback(async (templateId: string, name: string) => {
    await duplicateMutation.mutateAsync({
      templateId,
      newName: `${name} (Copy)`,
    })
  }, [duplicateMutation])

  const handleDelete = useCallback(async () => {
    if (!templateToDelete) {return}
    await deleteMutation.mutateAsync(templateToDelete)
    setTemplateToDelete(null)
    setShowDeleteDialog(false)
    if (selectedTemplateId === templateToDelete) {
      setSelectedTemplateId(null)
    }
  }, [templateToDelete, deleteMutation, selectedTemplateId])

  const handleApply = useCallback(async (templateId: string) => {
    if (!selectedPackageId) {return}
    await applyMutation.mutateAsync({
      templateId,
      packageId: selectedPackageId,
    })
    onApplyTemplate?.(templateId, selectedPackageId)
  }, [selectedPackageId, applyMutation, onApplyTemplate])

  if (isLoading) {
    return <ScopeTemplateManagerLoading />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6" />
            Scope Templates
          </h2>
          <p className="text-muted-foreground">
            Manage reusable scope templates by trade
          </p>
        </div>
        {mode === 'manage' && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar - Trade Filter */}
        <Card className="lg:w-64 shrink-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Trades</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <div className="px-4 pb-4 space-y-1">
                <Button
                  variant={selectedTrade === null ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setSelectedTrade(null)}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  All Templates
                  <Badge variant="secondary" className="ml-auto">
                    {library?.templates.length || 0}
                  </Badge>
                </Button>
                <Separator className="my-2" />
                {library?.trades.map((trade) => (
                  <Button
                    key={trade.code}
                    variant={selectedTrade === trade.code ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setSelectedTrade(trade.code)}
                  >
                    {trade.name}
                    <Badge variant="outline" className="ml-auto">
                      {trade.count}
                    </Badge>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="flex-1 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Templates Grid/List */}
          {filteredTemplates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Layers className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-medium">No templates found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery
                    ? 'Try adjusting your search'
                    : 'Create your first template to get started'}
                </p>
                {mode === 'manage' && !searchQuery && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setShowCreateDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isSelected={selectedTemplateId === template.id}
                  onSelect={() => setSelectedTemplateId(template.id)}
                  onDuplicate={() => handleDuplicate(template.id, template.name)}
                  onDelete={() => {
                    setTemplateToDelete(template.id)
                    setShowDeleteDialog(true)
                  }}
                  onApply={
                    mode === 'select' && selectedPackageId
                      ? () => handleApply(template.id)
                      : undefined
                  }
                  mode={mode}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedTemplateId && selectedTemplate && (
          <Card className="lg:w-96 shrink-0">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{selectedTemplate.name}</CardTitle>
                  <CardDescription>
                    {getTradeLabel(selectedTemplate.tradeCode as TradeCode)}
                    {selectedTemplate.division && ` - Division ${selectedTemplate.division}`}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedTemplateId(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedTemplate.description && (
                <p className="text-sm text-muted-foreground">
                  {selectedTemplate.description}
                </p>
              )}

              <Tabs defaultValue="items">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="items">Items</TabsTrigger>
                  <TabsTrigger value="inclusions">Inc/Exc</TabsTrigger>
                  <TabsTrigger value="docs">Docs</TabsTrigger>
                </TabsList>

                <TabsContent value="items" className="mt-4">
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {selectedTemplate.scopeItems?.map((item, index) => (
                        <div
                          key={item.id}
                          className={cn(
                            'p-2 rounded-lg border text-sm',
                            item.isAlternate && 'border-dashed bg-muted/50'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">
                              {item.itemNumber}
                            </span>
                            {item.isRequired && (
                              <Badge variant="outline" className="text-xs">Required</Badge>
                            )}
                            {item.isAlternate && (
                              <Badge variant="secondary" className="text-xs">Alternate</Badge>
                            )}
                          </div>
                          <p className="mt-1">{item.description}</p>
                          {item.unit && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Unit: {item.unit}
                            </p>
                          )}
                        </div>
                      ))}
                      {(!selectedTemplate.scopeItems || selectedTemplate.scopeItems.length === 0) && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No scope items defined
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="inclusions" className="mt-4">
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-success mb-2">
                          Standard Inclusions
                        </h4>
                        <ul className="space-y-1">
                          {selectedTemplate.commonInclusions?.map((item, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm">
                              <Check className="h-3 w-3 text-success" />
                              {item}
                            </li>
                          ))}
                          {(!selectedTemplate.commonInclusions || selectedTemplate.commonInclusions.length === 0) && (
                            <li className="text-sm text-muted-foreground">None defined</li>
                          )}
                        </ul>
                      </div>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-medium text-error mb-2">
                          Standard Exclusions
                        </h4>
                        <ul className="space-y-1">
                          {selectedTemplate.commonExclusions?.map((item, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm">
                              <X className="h-3 w-3 text-error" />
                              {item}
                            </li>
                          ))}
                          {(!selectedTemplate.commonExclusions || selectedTemplate.commonExclusions.length === 0) && (
                            <li className="text-sm text-muted-foreground">None defined</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="docs" className="mt-4">
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium mb-2">Required Documents</h4>
                      <ul className="space-y-1">
                        {selectedTemplate.requiredDocuments?.map((doc, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <FileText className="h-3 w-3 text-muted-foreground" />
                            {doc}
                          </li>
                        ))}
                        {(!selectedTemplate.requiredDocuments || selectedTemplate.requiredDocuments.length === 0) && (
                          <li className="text-sm text-muted-foreground">None required</li>
                        )}
                      </ul>
                      {selectedTemplate.specialConditions && (
                        <>
                          <Separator className="my-4" />
                          <h4 className="text-sm font-medium mb-2">Special Conditions</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {selectedTemplate.specialConditions}
                          </p>
                        </>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>

              {mode === 'select' && selectedPackageId && (
                <Button
                  className="w-full"
                  onClick={() => handleApply(selectedTemplate.id)}
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
                      Apply to Package
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <CreateTemplateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={createMutation.mutateAsync}
        isLoading={createMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
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
  isSelected: boolean
  onSelect: () => void
  onDuplicate: () => void
  onDelete: () => void
  onApply?: () => void
  mode: 'manage' | 'select'
}

function TemplateCard({
  template,
  isSelected,
  onSelect,
  onDuplicate,
  onDelete,
  onApply,
  mode,
}: TemplateCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium truncate">{template.name}</h3>
              {template.isDefault && (
                <Star className="h-4 w-4 text-warning fill-warning" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{template.tradeName}</Badge>
              {template.division && (
                <span className="text-xs text-muted-foreground">
                  Div {template.division}
                </span>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {mode === 'select' && onApply && (
                <>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onApply() }}>
                    <Check className="h-4 w-4 mr-2" />
                    Apply to Package
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate() }}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              {mode === 'manage' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-error"
                    onClick={(e) => { e.stopPropagation(); onDelete() }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {template.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {template.description}
          </p>
        )}

        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {template.itemCount} items
          </span>
          <span className="flex items-center gap-1">
            <Book className="h-3 w-3" />
            Used {template.usageCount}x
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

interface CreateTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => Promise<any>
  isLoading: boolean
  editingTemplate?: any
}

function CreateTemplateDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  editingTemplate,
}: CreateTemplateDialogProps) {
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: editingTemplate || {
      name: '',
      description: '',
      tradeCode: '',
      division: '',
      isDefault: false,
      scopeItems: [],
      commonInclusions: [],
      commonExclusions: [],
      requiredDocuments: [],
      specialConditions: '',
    },
  })

  const {
    fields: scopeFields,
    append: appendScope,
    remove: removeScope,
  } = useFieldArray({
    control: form.control,
    name: 'scopeItems',
  })

  const [newInclusion, setNewInclusion] = useState('')
  const [newExclusion, setNewExclusion] = useState('')
  const [newDocument, setNewDocument] = useState('')

  const handleSubmit = async (data: TemplateFormValues) => {
    await onSubmit(data)
    onOpenChange(false)
    form.reset()
  }

  const addInclusion = () => {
    if (newInclusion.trim()) {
      const current = form.getValues('commonInclusions') || []
      form.setValue('commonInclusions', [...current, newInclusion.trim()])
      setNewInclusion('')
    }
  }

  const removeInclusion = (index: number) => {
    const current = form.getValues('commonInclusions') || []
    form.setValue('commonInclusions', current.filter((_, i) => i !== index))
  }

  const addExclusion = () => {
    if (newExclusion.trim()) {
      const current = form.getValues('commonExclusions') || []
      form.setValue('commonExclusions', [...current, newExclusion.trim()])
      setNewExclusion('')
    }
  }

  const removeExclusion = (index: number) => {
    const current = form.getValues('commonExclusions') || []
    form.setValue('commonExclusions', current.filter((_, i) => i !== index))
  }

  const addDocument = () => {
    if (newDocument.trim()) {
      const current = form.getValues('requiredDocuments') || []
      form.setValue('requiredDocuments', [...current, newDocument.trim()])
      setNewDocument('')
    }
  }

  const removeDocument = (index: number) => {
    const current = form.getValues('requiredDocuments') || []
    form.setValue('requiredDocuments', current.filter((_, i) => i !== index))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingTemplate ? 'Edit Template' : 'Create Scope Template'}
          </DialogTitle>
          <DialogDescription>
            Create a reusable scope template with standard items and terms
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Standard Electrical" />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select trade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TRADE_CODES_LIST.map((trade) => (
                          <SelectItem key={trade.value} value={trade.value}>
                            {trade.label} (Div {trade.division})
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
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Tabs defaultValue="items">
              <TabsList>
                <TabsTrigger value="items">Scope Items</TabsTrigger>
                <TabsTrigger value="inclusions">Inclusions/Exclusions</TabsTrigger>
                <TabsTrigger value="documents">Documents & Terms</TabsTrigger>
              </TabsList>

              <TabsContent value="items" className="mt-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Scope Items</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendScope({
                        itemNumber: `${scopeFields.length + 1}`,
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
                  <ScrollArea className="h-[200px] border rounded-lg p-2">
                    <div className="space-y-2">
                      {scopeFields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                          <FormField
                            control={form.control}
                            name={`scopeItems.${index}.itemNumber`}
                            render={({ field }) => (
                              <FormItem className="col-span-2">
                                <FormControl>
                                  <Input {...field} placeholder="#" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`scopeItems.${index}.description`}
                            render={({ field }) => (
                              <FormItem className="col-span-5">
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
                              <FormItem className="col-span-2 flex items-center gap-1">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="text-xs !mt-0">Req</FormLabel>
                              </FormItem>
                            )}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="col-span-1"
                            onClick={() => removeScope(index)}
                          >
                            <Trash2 className="h-4 w-4 text-error" />
                          </Button>
                        </div>
                      ))}
                      {scopeFields.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No scope items added yet
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>

              <TabsContent value="inclusions" className="mt-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Standard Inclusions</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newInclusion}
                        onChange={(e) => setNewInclusion(e.target.value)}
                        placeholder="Add inclusion..."
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addInclusion())}
                      />
                      <Button type="button" variant="outline" onClick={addInclusion}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <ScrollArea className="h-[150px] border rounded-lg p-2">
                      <div className="space-y-1">
                        {form.watch('commonInclusions')?.map((item, index) => (
                          <div key={index} className="flex items-center justify-between text-sm p-1 rounded hover:bg-muted">
                            <span className="flex items-center gap-1">
                              <Check className="h-3 w-3 text-success" />
                              {item}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => removeInclusion(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="space-y-2">
                    <Label>Standard Exclusions</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newExclusion}
                        onChange={(e) => setNewExclusion(e.target.value)}
                        placeholder="Add exclusion..."
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addExclusion())}
                      />
                      <Button type="button" variant="outline" onClick={addExclusion}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <ScrollArea className="h-[150px] border rounded-lg p-2">
                      <div className="space-y-1">
                        {form.watch('commonExclusions')?.map((item, index) => (
                          <div key={index} className="flex items-center justify-between text-sm p-1 rounded hover:bg-muted">
                            <span className="flex items-center gap-1">
                              <X className="h-3 w-3 text-error" />
                              {item}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => removeExclusion(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Required Documents</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newDocument}
                        onChange={(e) => setNewDocument(e.target.value)}
                        placeholder="e.g., Product Data Sheets"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDocument())}
                      />
                      <Button type="button" variant="outline" onClick={addDocument}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {form.watch('requiredDocuments')?.map((doc, index) => (
                        <Badge key={index} variant="secondary" className="gap-1">
                          {doc}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 p-0 hover:bg-transparent"
                            onClick={() => removeDocument(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
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
                          <Textarea
                            {...field}
                            rows={4}
                            placeholder="Enter any special terms and conditions..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Template'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function ScopeTemplateManagerLoading() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="flex gap-6">
        <Skeleton className="h-[400px] w-64" />
        <div className="flex-1 grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    </div>
  )
}
