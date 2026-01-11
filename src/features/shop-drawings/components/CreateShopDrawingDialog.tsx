// File: /src/features/shop-drawings/components/CreateShopDrawingDialog.tsx
// Dialog for creating a new shop drawing

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { CSISpecPicker, getSpecSectionTitle } from '@/components/ui/csi-spec-picker'
import { Loader2, FileText, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useCreateShopDrawing, SHOP_DRAWING_DISCIPLINES, SHOP_DRAWING_PRIORITIES } from '../hooks'
import type { ShopDrawingDiscipline, ShopDrawingPriority } from '@/types/submittal'

// Hook to fetch subcontractors
function useProjectSubcontractors(projectId: string | undefined) {
  return useQuery({
    queryKey: ['subcontractors', projectId],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}
      const { data, error } = await supabase
        .from('subcontractors')
        .select('id, company_name, trade')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('company_name')
      if (error) {throw error}
      return data
    },
    enabled: !!projectId,
  })
}

// Hook to fetch project users for reviewer selection
function useProjectUsers(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-users', projectId],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}
      const { data, error } = await supabase
        .from('project_users')
        .select(`
          user_id,
          project_role,
          user:user_id (
            id,
            full_name,
            email
          )
        `)
        .eq('project_id', projectId)
      if (error) {throw error}
      return data
    },
    enabled: !!projectId,
  })
}

interface CreateShopDrawingDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateShopDrawingDialog({
  projectId,
  open,
  onOpenChange,
  onSuccess,
}: CreateShopDrawingDialogProps) {
  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [specSection, setSpecSection] = useState('')
  const [specSectionTitle, setSpecSectionTitle] = useState('')
  const [discipline, setDiscipline] = useState<ShopDrawingDiscipline>('Structural')
  const [priority, setPriority] = useState<ShopDrawingPriority>('standard')
  const [longLeadItem, setLongLeadItem] = useState(false)
  const [subcontractorId, setSubcontractorId] = useState('')
  const [reviewerId, setReviewerId] = useState('')
  const [dateRequired, setDateRequired] = useState('')
  const [daysForReview, setDaysForReview] = useState('14')

  // Hooks
  const createShopDrawing = useCreateShopDrawing()
  const { data: subcontractors } = useProjectSubcontractors(projectId)
  const { data: projectUsers } = useProjectUsers(projectId)

  const handleSpecSectionChange = (code: string, customTitle?: string) => {
    setSpecSection(code)
    setSpecSectionTitle(customTitle || getSpecSectionTitle(code))
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setSpecSection('')
    setSpecSectionTitle('')
    setDiscipline('Structural')
    setPriority('standard')
    setLongLeadItem(false)
    setSubcontractorId('')
    setReviewerId('')
    setDateRequired('')
    setDaysForReview('14')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.error('Title is required')
      return
    }

    if (!specSection) {
      toast.error('Spec section is required')
      return
    }

    try {
      await createShopDrawing.mutateAsync({
        project_id: projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        spec_section: specSection,
        spec_section_title: specSectionTitle || undefined,
        discipline,
        priority,
        long_lead_item: longLeadItem,
        subcontractor_id: subcontractorId || undefined,
        reviewer_id: reviewerId || undefined,
        date_required: dateRequired || undefined,
        days_for_review: parseInt(daysForReview) || 14,
      })

      toast.success('Shop drawing created successfully')
      resetForm()
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast.error('Failed to create shop drawing: ' + (error as Error).message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Create Shop Drawing
            </DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              disabled={createShopDrawing.isPending}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Structural Steel Details - Level 2"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discipline">Discipline *</Label>
                <Select
                  id="discipline"
                  value={discipline}
                  onValueChange={(value) => setDiscipline(value as ShopDrawingDiscipline)}
                >
                  {SHOP_DRAWING_DISCIPLINES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label} ({d.prefix})
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed description of the shop drawing..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Spec Section *</Label>
              <CSISpecPicker
                value={specSection}
                onChange={handleSpecSectionChange}
                placeholder="Select or enter spec section..."
              />
              {specSectionTitle && (
                <p className="text-xs text-muted-foreground">{specSectionTitle}</p>
              )}
            </div>
          </div>

          {/* Priority and Lead Time */}
          <div className="space-y-4 rounded-lg border p-4">
            <h4 className="font-medium">Priority & Scheduling</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  id="priority"
                  value={priority}
                  onValueChange={(value) => setPriority(value as ShopDrawingPriority)}
                >
                  {SHOP_DRAWING_PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-required">Date Required</Label>
                <Input
                  id="date-required"
                  type="date"
                  value={dateRequired}
                  onChange={(e) => setDateRequired(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="days-for-review">Days for Review</Label>
                <Input
                  id="days-for-review"
                  type="number"
                  min="1"
                  max="90"
                  value={daysForReview}
                  onChange={(e) => setDaysForReview(e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2 pt-8">
                <Checkbox
                  id="long-lead-item"
                  checked={longLeadItem}
                  onCheckedChange={(checked) => setLongLeadItem(checked === true)}
                />
                <Label htmlFor="long-lead-item" className="cursor-pointer font-normal">
                  Long Lead Item (extended procurement time)
                </Label>
              </div>
            </div>
          </div>

          {/* Assignment */}
          <div className="space-y-4 rounded-lg border p-4">
            <h4 className="font-medium">Assignment</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="subcontractor">Subcontractor</Label>
                <Select
                  id="subcontractor"
                  value={subcontractorId}
                  onValueChange={setSubcontractorId}
                >
                  <option value="">Select subcontractor...</option>
                  {subcontractors?.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.company_name} {sub.trade && `(${sub.trade})`}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reviewer">Reviewer</Label>
                <Select
                  id="reviewer"
                  value={reviewerId}
                  onValueChange={setReviewerId}
                >
                  <option value="">Select reviewer...</option>
                  {projectUsers?.map((pu) => (
                    <option key={pu.user_id} value={pu.user_id}>
                      {pu.user?.full_name || pu.user?.email} ({pu.project_role})
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createShopDrawing.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createShopDrawing.isPending}>
              {createShopDrawing.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Shop Drawing
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
