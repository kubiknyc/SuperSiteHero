/**
 * Cost Codes Management Page
 *
 * Allows administrators to manage cost codes for the company.
 * Supports CSI MasterFormat hierarchy with CRUD operations.
 */

import { useState, useMemo, useCallback } from 'react'
import {
  Plus,
  Search,
  FolderTree,
  Edit2,
  Trash2,
  Download,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Loader2,
  Filter,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  useCostCodes,
  useCreateCostCode,
  useUpdateCostCode,
  useDeleteCostCode,
} from '@/features/cost-tracking/hooks/useCostTracking'
import { CSI_DIVISIONS, type CostType } from '@/types/cost-tracking'
import type { CostCode, CreateCostCodeDTO, UpdateCostCodeDTO } from '@/types/cost-tracking'
import { cn } from '@/lib/utils'

// Cost type options
const COST_TYPES: { value: CostType; label: string }[] = [
  { value: 'labor', label: 'Labor' },
  { value: 'material', label: 'Material' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'subcontract', label: 'Subcontract' },
  { value: 'other', label: 'Other' },
]

interface CostCodeFormData {
  code: string
  name: string
  description: string
  division: string
  section: string
  costType: CostType
  parentCodeId: string
  isActive: boolean
}

const initialFormData: CostCodeFormData = {
  code: '',
  name: '',
  description: '',
  division: '',
  section: '',
  costType: 'material',
  parentCodeId: '',
  isActive: true,
}

export function CostCodesPage() {
  const { toast } = useToast()
  const { userProfile } = useAuth()

  // State
  const [search, setSearch] = useState('')
  const [filterDivision, setFilterDivision] = useState<string>('all')
  const [showActiveOnly, setShowActiveOnly] = useState(true)
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set())

  // Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [editingCode, setEditingCode] = useState<CostCode | null>(null)
  const [deletingCode, setDeletingCode] = useState<CostCode | null>(null)
  const [formData, setFormData] = useState<CostCodeFormData>(initialFormData)

  // Queries and mutations
  const { data: costCodes = [], isLoading, error } = useCostCodes({
    companyId: userProfile?.company_id || '',
    isActive: showActiveOnly ? true : undefined,
    division: filterDivision !== 'all' ? filterDivision : undefined,
  })

  const createMutation = useCreateCostCode()
  const updateMutation = useUpdateCostCode()
  const deleteMutation = useDeleteCostCode()

  // Filter cost codes by search
  const filteredCodes = useMemo(() => {
    if (!search) {return costCodes}

    const searchLower = search.toLowerCase()
    return costCodes.filter(
      (code) =>
        code.code.toLowerCase().includes(searchLower) ||
        code.name.toLowerCase().includes(searchLower) ||
        code.description?.toLowerCase().includes(searchLower)
    )
  }, [costCodes, search])

  // Group by division
  const groupedCodes = useMemo(() => {
    const groups: Record<string, CostCode[]> = {}

    filteredCodes.forEach((code) => {
      const division = code.division || 'Other'
      if (!groups[division]) {
        groups[division] = []
      }
      groups[division].push(code)
    })

    // Sort codes within each group
    Object.values(groups).forEach((codes) => {
      codes.sort((a, b) => a.code.localeCompare(b.code))
    })

    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]))
  }, [filteredCodes])

  // Toggle division expansion
  const toggleDivision = useCallback((division: string) => {
    setExpandedDivisions((prev) => {
      const next = new Set(prev)
      if (next.has(division)) {
        next.delete(division)
      } else {
        next.add(division)
      }
      return next
    })
  }, [])

  // Open form for creating new code
  const handleCreate = useCallback(() => {
    setEditingCode(null)
    setFormData(initialFormData)
    setIsFormOpen(true)
  }, [])

  // Open form for editing existing code
  const handleEdit = useCallback((code: CostCode) => {
    setEditingCode(code)
    setFormData({
      code: code.code,
      name: code.name,
      description: code.description || '',
      division: code.division || '',
      section: code.section || '',
      costType: code.cost_type || 'material',
      parentCodeId: code.parent_code_id || '',
      isActive: code.is_active,
    })
    setIsFormOpen(true)
  }, [])

  // Open delete confirmation
  const handleDeleteClick = useCallback((code: CostCode) => {
    setDeletingCode(code)
    setIsDeleteOpen(true)
  }, [])

  // Submit form
  const handleSubmit = async () => {
    if (!userProfile?.company_id) {return}

    try {
      if (editingCode) {
        // Update existing code
        const dto: UpdateCostCodeDTO = {
          name: formData.name,
          description: formData.description || undefined,
          division: formData.division || undefined,
          section: formData.section || undefined,
          cost_type: formData.costType,
          parent_code_id: formData.parentCodeId || undefined,
          is_active: formData.isActive,
        }

        await updateMutation.mutateAsync({ id: editingCode.id, dto })
        toast({
          title: 'Cost code updated',
          description: `${formData.code} - ${formData.name} has been updated.`,
        })
      } else {
        // Create new code
        const dto: CreateCostCodeDTO = {
          company_id: userProfile.company_id,
          code: formData.code,
          name: formData.name,
          description: formData.description || undefined,
          division: formData.division || undefined,
          section: formData.section || undefined,
          cost_type: formData.costType,
          parent_code_id: formData.parentCodeId || undefined,
          is_active: formData.isActive,
        }

        await createMutation.mutateAsync(dto)
        toast({
          title: 'Cost code created',
          description: `${formData.code} - ${formData.name} has been created.`,
        })
      }

      setIsFormOpen(false)
      setFormData(initialFormData)
      setEditingCode(null)
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save cost code',
        variant: 'destructive',
      })
    }
  }

  // Delete cost code
  const handleDelete = async () => {
    if (!deletingCode) {return}

    try {
      await deleteMutation.mutateAsync(deletingCode.id)
      toast({
        title: 'Cost code deleted',
        description: `${deletingCode.code} - ${deletingCode.name} has been deleted.`,
      })
      setIsDeleteOpen(false)
      setDeletingCode(null)
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete cost code',
        variant: 'destructive',
      })
    }
  }

  // Export to CSV
  const handleExport = useCallback(() => {
    const headers = ['Code', 'Name', 'Description', 'Division', 'Section', 'Cost Type', 'Active']
    const rows = costCodes.map((code) => [
      code.code,
      code.name,
      code.description || '',
      code.division || '',
      code.section || '',
      code.cost_type || '',
      code.is_active ? 'Yes' : 'No',
    ])

    const csv = [headers, ...rows].map((row) => row.map((v) => `"${v}"`).join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cost-codes.csv'
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: 'Export complete',
      description: `Exported ${costCodes.length} cost codes to CSV.`,
    })
  }, [costCodes, toast])

  if (!userProfile?.company_id) {
    return (
      <AppLayout>
        <div className="p-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-warning mx-auto mb-4" />
                <p className="text-lg font-medium">Company Required</p>
                <p className="text-muted-foreground mt-1">
                  You need to be associated with a company to manage cost codes.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight heading-page">Cost Codes</h1>
            <p className="text-muted-foreground mt-1">
              Manage your company's cost code structure (CSI MasterFormat)
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Cost Code
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-disabled" />
                  <Input
                    placeholder="Search cost codes..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filterDivision} onValueChange={setFilterDivision}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Divisions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Divisions</SelectItem>
                    {CSI_DIVISIONS.map((div) => (
                      <SelectItem key={div.code} value={div.code}>
                        {div.code} - {div.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="active-only"
                  checked={showActiveOnly}
                  onCheckedChange={setShowActiveOnly}
                />
                <Label htmlFor="active-only" className="text-sm">
                  Active only
                </Label>
              </div>
              <div className="text-sm text-muted-foreground">
                {filteredCodes.length} of {costCodes.length} codes
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cost Codes List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              Cost Code Structure
            </CardTitle>
            <CardDescription>
              Click on a division to expand and view its cost codes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-error mx-auto mb-4" />
                <p className="text-error font-medium">Failed to load cost codes</p>
                <p className="text-muted-foreground text-sm mt-1">{error.message}</p>
              </div>
            ) : groupedCodes.length === 0 ? (
              <div className="text-center py-12">
                <FolderTree className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-lg font-medium">No cost codes found</p>
                <p className="text-muted-foreground text-sm mt-1">
                  {search ? 'Try a different search term' : 'Create your first cost code to get started'}
                </p>
                {!search && (
                  <Button onClick={handleCreate} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Cost Code
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {groupedCodes.map(([division, codes]) => {
                  const divisionInfo = CSI_DIVISIONS.find((d) => d.code === division)
                  const isExpanded = expandedDivisions.has(division)

                  return (
                    <div key={division} className="py-2">
                      {/* Division Header */}
                      <button
                        onClick={() => toggleDivision(division)}
                        className="w-full flex items-center gap-2 py-2 px-3 hover:bg-muted rounded-md transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-mono text-sm text-secondary w-8">{division}</span>
                        <span className="font-medium">
                          {divisionInfo?.name || `Division ${division}`}
                        </span>
                        <Badge variant="outline" className="ml-auto">
                          {codes.length}
                        </Badge>
                      </button>

                      {/* Cost Codes */}
                      {isExpanded && (
                        <div className="ml-8 mt-2 space-y-1">
                          {codes.map((code) => (
                            <div
                              key={code.id}
                              className={cn(
                                'flex items-center gap-3 py-2 px-3 rounded-md border',
                                !code.is_active && 'opacity-50 bg-muted'
                              )}
                            >
                              <span className="font-mono text-sm text-secondary w-24">
                                {code.code}
                              </span>
                              <span className="flex-1 truncate">{code.name}</span>
                              {code.cost_type && (
                                <Badge variant="secondary" className="capitalize">
                                  {code.cost_type}
                                </Badge>
                              )}
                              {!code.is_active && (
                                <Badge variant="outline" className="text-warning">
                                  Inactive
                                </Badge>
                              )}
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEdit(code)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-error hover:text-error"
                                  onClick={() => handleDeleteClick(code)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCode ? 'Edit Cost Code' : 'Create Cost Code'}</DialogTitle>
            <DialogDescription>
              {editingCode
                ? 'Update the cost code details below.'
                : 'Add a new cost code to your company library.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  placeholder="03 30 00"
                  value={formData.code}
                  onChange={(e) => setFormData((f) => ({ ...f, code: e.target.value }))}
                  disabled={!!editingCode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="division">Division</Label>
                <Select
                  value={formData.division}
                  onValueChange={(v) => setFormData((f) => ({ ...f, division: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    {CSI_DIVISIONS.map((div) => (
                      <SelectItem key={div.code} value={div.code}>
                        {div.code} - {div.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Cast-in-Place Concrete"
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description..."
                value={formData.description}
                onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="costType">Cost Type</Label>
                <Select
                  value={formData.costType}
                  onValueChange={(v) => setFormData((f) => ({ ...f, costType: v as CostType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COST_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="section">Section</Label>
                <Input
                  id="section"
                  placeholder="30"
                  value={formData.section}
                  onChange={(e) => setFormData((f) => ({ ...f, section: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is-active"
                checked={formData.isActive}
                onCheckedChange={(v) => setFormData((f) => ({ ...f, isActive: v }))}
              />
              <Label htmlFor="is-active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !formData.code || !formData.name || createMutation.isPending || updateMutation.isPending
              }
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingCode ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cost Code?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold">
                {deletingCode?.code} - {deletingCode?.name}
              </span>
              ? This action cannot be undone. Budget entries using this cost code may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-error hover:bg-error/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}

export default CostCodesPage
