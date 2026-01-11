/**
 * O&M Manual Builder Component
 *
 * Comprehensive O&M manual builder with section management,
 * drag-and-drop ordering, document uploads, and PDF generation.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useOMManualSections,
  useOMManualVersions,
  useCreateOMManualSection,
  useUpdateOMManualSection,
  useDeleteOMManualSection,
  useReorderOMManualSections,
  useGenerateOMManual,
  useInitializeOMManualSections,
  useOMManualStatistics,
} from '../hooks/useOMManual'
import {
  OM_MANUAL_SECTION_TYPES,
  type OMManualSection,
  type OMManualSectionType,
  type OMManualRecipientType,
} from '@/types/closeout-extended'
import {
  Book,
  Plus,
  GripVertical,
  CheckCircle2,
  Circle,
  Upload,
  FileText,
  Download,
  Trash2,
  Edit,
  Eye,
  Loader2,
  AlertCircle,
  RefreshCw,
  Users,
  Building,
  Archive,
  Wrench,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface OMManualBuilderProps {
  projectId: string
  className?: string
}

export function OMManualBuilder({ projectId, className }: OMManualBuilderProps) {
  const [showAddSection, setShowAddSection] = React.useState(false)
  const [editingSection, setEditingSection] = React.useState<OMManualSection | null>(null)
  const [showGenerateDialog, setShowGenerateDialog] = React.useState(false)
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null)

  // Form state for new/edit section
  const [sectionType, setSectionType] = React.useState<OMManualSectionType>('custom')
  const [sectionTitle, setSectionTitle] = React.useState('')
  const [sectionDescription, setSectionDescription] = React.useState('')

  // Generate dialog state
  const [versionLabel, setVersionLabel] = React.useState('')
  const [recipientType, setRecipientType] = React.useState<OMManualRecipientType>('owner')

  // Queries
  const { data: sections = [], isLoading } = useOMManualSections(projectId)
  const { data: versions = [] } = useOMManualVersions(projectId)
  const { data: statistics } = useOMManualStatistics(projectId)

  // Mutations
  const createSection = useCreateOMManualSection()
  const updateSection = useUpdateOMManualSection()
  const deleteSection = useDeleteOMManualSection()
  const reorderSections = useReorderOMManualSections()
  const generateManual = useGenerateOMManual()
  const initializeSections = useInitializeOMManualSections()

  // Reset form when dialog closes
  const resetForm = () => {
    setSectionType('custom')
    setSectionTitle('')
    setSectionDescription('')
    setEditingSection(null)
  }

  // Handle add section
  const handleAddSection = async () => {
    if (!sectionTitle.trim()) {
      toast.error('Please enter a section title')
      return
    }

    try {
      await createSection.mutateAsync({
        project_id: projectId,
        section_type: sectionType,
        title: sectionTitle.trim(),
        description: sectionDescription.trim() || undefined,
        sort_order: sections.length,
      })
      toast.success('Section added')
      setShowAddSection(false)
      resetForm()
    } catch {
      toast.error('Failed to add section')
    }
  }

  // Handle edit section
  const handleEditSection = async () => {
    if (!editingSection) {return}

    try {
      await updateSection.mutateAsync({
        id: editingSection.id,
        title: sectionTitle.trim(),
        description: sectionDescription.trim() || undefined,
      })
      toast.success('Section updated')
      setEditingSection(null)
      resetForm()
    } catch {
      toast.error('Failed to update section')
    }
  }

  // Handle delete section
  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this section?')) {return}

    try {
      await deleteSection.mutateAsync(sectionId)
      toast.success('Section deleted')
    } catch {
      toast.error('Failed to delete section')
    }
  }

  // Handle toggle complete
  const handleToggleComplete = async (section: OMManualSection) => {
    try {
      await updateSection.mutateAsync({
        id: section.id,
        is_complete: !section.is_complete,
      })
      toast.success(section.is_complete ? 'Section marked incomplete' : 'Section marked complete')
    } catch {
      toast.error('Failed to update section')
    }
  }

  // Handle drag and drop
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) {return}

    // Visual feedback could be added here
  }

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      return
    }

    const newOrder = [...sections]
    const [removed] = newOrder.splice(draggedIndex, 1)
    newOrder.splice(dropIndex, 0, removed)

    try {
      await reorderSections.mutateAsync({
        projectId,
        sectionIds: newOrder.map((s) => s.id),
      })
    } catch {
      toast.error('Failed to reorder sections')
    }

    setDraggedIndex(null)
  }

  // Handle generate manual
  const handleGenerateManual = async () => {
    try {
      await generateManual.mutateAsync({
        projectId,
        versionLabel: versionLabel.trim() || undefined,
        recipientType,
      })
      toast.success('Manual generation started')
      setShowGenerateDialog(false)
      setVersionLabel('')
    } catch {
      toast.error('Failed to generate manual')
    }
  }

  // Handle initialize sections
  const handleInitializeSections = async () => {
    try {
      await initializeSections.mutateAsync(projectId)
      toast.success('Default sections created')
    } catch {
      toast.error('Failed to initialize sections')
    }
  }

  // Open edit dialog
  const openEditDialog = (section: OMManualSection) => {
    setEditingSection(section)
    setSectionType(section.section_type)
    setSectionTitle(section.title)
    setSectionDescription(section.description || '')
  }

  const recipientIcons: Record<OMManualRecipientType, React.ReactNode> = {
    owner: <Building className="h-4 w-4" />,
    facility_manager: <Wrench className="h-4 w-4" />,
    contractor: <Users className="h-4 w-4" />,
    archive: <Archive className="h-4 w-4" />,
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Loading O&M Manual...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Statistics */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Book className="h-5 w-5" />
              O&M Manual Builder
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGenerateDialog(true)}
                disabled={sections.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Generate PDF
              </Button>
              <Button size="sm" onClick={() => setShowAddSection(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Progress Stats */}
          {statistics && (
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{statistics.total_sections}</div>
                <div className="text-xs text-muted-foreground">Total Sections</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">{statistics.completed_sections}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">{statistics.completion_percentage}%</div>
                <div className="text-xs text-muted-foreground">Progress</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-700">{statistics.versions_generated}</div>
                <div className="text-xs text-muted-foreground">Versions</div>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {sections.length > 0 && (
            <div className="mb-4">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${statistics?.completion_percentage || 0}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sections List */}
      {sections.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Sections Yet</h3>
            <p className="text-muted-foreground mb-4">
              Start building your O&M manual by adding sections or use the default template.
            </p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={handleInitializeSections}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Use Default Template
              </Button>
              <Button onClick={() => setShowAddSection(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Section
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Manual Sections</CardTitle>
            <p className="text-sm text-muted-foreground">
              Drag and drop to reorder sections. Click the checkbox to mark as complete.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sections.map((section, index) => (
                <div
                  key={section.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  className={cn(
                    'flex items-center gap-3 p-3 border rounded-lg bg-background transition-colors',
                    'hover:bg-muted/50 cursor-grab active:cursor-grabbing',
                    draggedIndex === index && 'opacity-50'
                  )}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />

                  <button
                    onClick={() => handleToggleComplete(section)}
                    className="flex-shrink-0"
                  >
                    {section.is_complete ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'font-medium',
                        section.is_complete && 'line-through text-muted-foreground'
                      )}>
                        {section.title}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {OM_MANUAL_SECTION_TYPES.find((t) => t.value === section.section_type)?.label || section.section_type}
                      </Badge>
                    </div>
                    {section.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {section.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {section.document_urls.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {section.document_urls.length} files
                      </Badge>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(section)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteSection(section.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Versions */}
      {versions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Generated Versions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">
                        {version.version_label || `Version ${version.version_number}`}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Generated {format(new Date(version.generated_at), 'MMM d, yyyy h:mm a')}
                        {version.recipient_type && ` - ${version.recipient_type}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        version.status === 'complete' ? 'default' :
                        version.status === 'generating' ? 'secondary' :
                        version.status === 'failed' ? 'destructive' : 'outline'
                      }
                    >
                      {version.status}
                    </Badge>
                    {version.status === 'complete' && version.document_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={version.document_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Section Dialog */}
      <Dialog
        open={showAddSection || !!editingSection}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddSection(false)
            setEditingSection(null)
            resetForm()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSection ? 'Edit Section' : 'Add Section'}
            </DialogTitle>
            <DialogDescription>
              {editingSection
                ? 'Update the section details below.'
                : 'Add a new section to your O&M manual.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!editingSection && (
              <div>
                <label className="block text-sm font-medium mb-1">Section Type</label>
                <Select value={sectionType} onValueChange={(v) => setSectionType(v as OMManualSectionType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OM_MANUAL_SECTION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                        {type.required && <span className="text-red-500 ml-1">*</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <Input
                value={sectionTitle}
                onChange={(e) => setSectionTitle(e.target.value)}
                placeholder="Section title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description (Optional)</label>
              <Textarea
                value={sectionDescription}
                onChange={(e) => setSectionDescription(e.target.value)}
                placeholder="Brief description of this section"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddSection(false)
                setEditingSection(null)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingSection ? handleEditSection : handleAddSection}
              disabled={createSection.isPending || updateSection.isPending}
            >
              {(createSection.isPending || updateSection.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingSection ? 'Save Changes' : 'Add Section'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Manual Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate O&M Manual</DialogTitle>
            <DialogDescription>
              Generate a PDF version of the O&M manual with all sections and uploaded documents.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Version Label (Optional)</label>
              <Input
                value={versionLabel}
                onChange={(e) => setVersionLabel(e.target.value)}
                placeholder="e.g., Final Draft, Owner Copy"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Recipient Type</label>
              <Select value={recipientType} onValueChange={(v) => setRecipientType(v as OMManualRecipientType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">
                    <div className="flex items-center gap-2">
                      {recipientIcons.owner}
                      Owner Copy
                    </div>
                  </SelectItem>
                  <SelectItem value="facility_manager">
                    <div className="flex items-center gap-2">
                      {recipientIcons.facility_manager}
                      Facility Manager Copy
                    </div>
                  </SelectItem>
                  <SelectItem value="contractor">
                    <div className="flex items-center gap-2">
                      {recipientIcons.contractor}
                      Contractor Copy
                    </div>
                  </SelectItem>
                  <SelectItem value="archive">
                    <div className="flex items-center gap-2">
                      {recipientIcons.archive}
                      Archive Copy
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {sections.some((s) => !s.is_complete) && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg text-yellow-800">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <strong>Warning:</strong> Some sections are not marked as complete.
                  The generated manual may be incomplete.
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerateManual}
              disabled={generateManual.isPending}
            >
              {generateManual.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Generate Manual
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default OMManualBuilder
