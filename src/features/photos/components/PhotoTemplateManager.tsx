/**
 * PhotoTemplateManager Component
 * Manages photo location templates for a project
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Camera,
  Plus,
  Pencil,
  Trash2,
  Copy,
  GripVertical,
  MapPin,
  Clock,
  Building2,
  Layers,
  Settings,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import {
  usePhotoTemplates,
  useCreatePhotoTemplate,
  useUpdatePhotoTemplate,
  useDeletePhotoTemplate,
  useDuplicatePhotoTemplate,
} from '../hooks/usePhotoTemplates';
import type {
  PhotoLocationTemplate,
  PhotoLocationTemplateInsert,
  PhotoLocationTemplateUpdate,
  PhotoFrequency,
  PhotoCategory,
} from '@/types/photo-templates';
import {
  PHOTO_FREQUENCIES,
  PHOTO_CATEGORIES,
  REQUIRED_ANGLES,
  DAYS_OF_WEEK,
} from '@/types/photo-templates';
import { cn } from '@/lib/utils';

const templateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  building: z.string().optional(),
  floor: z.string().optional(),
  area: z.string().optional(),
  gridReference: z.string().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  gpsRadiusMeters: z.number().min(1).max(1000).optional(),
  isRequired: z.boolean(),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'milestone', 'on_demand']),
  dayOfWeek: z.number().min(0).max(6).optional().nullable(),
  dayOfMonth: z.number().min(1).max(31).optional().nullable(),
  category: z.enum(['progress', 'safety', 'quality', 'weather', 'milestone', 'closeout', 'other']),
  photoInstructions: z.string().optional(),
  requiredAngle: z.string().optional(),
  minPhotosRequired: z.number().min(1).max(10),
  isActive: z.boolean(),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface PhotoTemplateManagerProps {
  projectId: string;
  className?: string;
}

export function PhotoTemplateManager({ projectId, className }: PhotoTemplateManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PhotoLocationTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<PhotoLocationTemplate | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['progress']));

  const { data: templates, isLoading } = usePhotoTemplates({ projectId, isActive: undefined });
  const createMutation = useCreatePhotoTemplate();
  const updateMutation = useUpdatePhotoTemplate();
  const deleteMutation = useDeletePhotoTemplate();
  const duplicateMutation = useDuplicatePhotoTemplate();

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      description: '',
      building: '',
      floor: '',
      area: '',
      isRequired: true,
      frequency: 'daily',
      category: 'progress',
      minPhotosRequired: 1,
      isActive: true,
    },
  });

  const handleCreate = () => {
    setEditingTemplate(null);
    form.reset({
      name: '',
      description: '',
      building: '',
      floor: '',
      area: '',
      isRequired: true,
      frequency: 'daily',
      category: 'progress',
      minPhotosRequired: 1,
      isActive: true,
    });
    setDialogOpen(true);
  };

  const handleEdit = (template: PhotoLocationTemplate) => {
    setEditingTemplate(template);
    form.reset({
      name: template.name,
      description: template.description || '',
      building: template.building || '',
      floor: template.floor || '',
      area: template.area || '',
      gridReference: template.gridReference || '',
      latitude: template.latitude || null,
      longitude: template.longitude || null,
      gpsRadiusMeters: template.gpsRadiusMeters || 50,
      isRequired: template.isRequired,
      frequency: template.frequency,
      dayOfWeek: template.dayOfWeek ?? null,
      dayOfMonth: template.dayOfMonth ?? null,
      category: template.category,
      photoInstructions: template.photoInstructions || '',
      requiredAngle: template.requiredAngle || '',
      minPhotosRequired: template.minPhotosRequired,
      isActive: template.isActive,
    });
    setDialogOpen(true);
  };

  const handleDuplicate = async (template: PhotoLocationTemplate) => {
    await duplicateMutation.mutateAsync({
      templateId: template.id,
      newName: `${template.name} (Copy)`,
    });
  };

  const handleDelete = (template: PhotoLocationTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;
    await deleteMutation.mutateAsync(templateToDelete.id);
    setDeleteDialogOpen(false);
    setTemplateToDelete(null);
  };

  const onSubmit = async (data: TemplateFormData) => {
    if (editingTemplate) {
      await updateMutation.mutateAsync({
        id: editingTemplate.id,
        updates: data as PhotoLocationTemplateUpdate,
      });
    } else {
      await createMutation.mutateAsync({
        ...data,
        projectId,
      } as PhotoLocationTemplateInsert);
    }
    setDialogOpen(false);
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Group templates by category
  const templatesByCategory = (templates || []).reduce(
    (acc, template) => {
      const category = template.category || 'other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(template);
      return acc;
    },
    {} as Record<string, PhotoLocationTemplate[]>
  );

  const frequency = form.watch('frequency');

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Photo Location Templates
          </CardTitle>
          <Button onClick={handleCreate}>
            <Plus className="mr-1 h-4 w-4" />
            Add Location
          </Button>
        </CardHeader>

        <CardContent>
          {!templates || templates.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <MapPin className="mx-auto h-12 w-12 opacity-50" />
              <p className="mt-2">No photo locations configured</p>
              <p className="text-sm">Add locations to require daily progress photos</p>
              <Button className="mt-4" onClick={handleCreate}>
                <Plus className="mr-1 h-4 w-4" />
                Add First Location
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {PHOTO_CATEGORIES.map((cat) => {
                const categoryTemplates = templatesByCategory[cat.value] || [];
                if (categoryTemplates.length === 0) return null;

                const isExpanded = expandedCategories.has(cat.value);

                return (
                  <Collapsible
                    key={cat.value}
                    open={isExpanded}
                    onOpenChange={() => toggleCategory(cat.value)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-between px-2 py-1.5 h-auto"
                      >
                        <span className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span className="font-medium">{cat.label}</span>
                          <Badge variant="secondary">{categoryTemplates.length}</Badge>
                        </span>
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-2 pl-6">
                      {categoryTemplates.map((template) => (
                        <TemplateCard
                          key={template.id}
                          template={template}
                          onEdit={handleEdit}
                          onDuplicate={handleDuplicate}
                          onDelete={handleDelete}
                        />
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Photo Location' : 'Add Photo Location'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Location Name *</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder="e.g., North Elevation, Main Entry"
                />
                {form.formState.errors.name && (
                  <p className="mt-1 text-sm text-red-600">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...form.register('description')}
                  placeholder="Additional details about this location"
                  rows={2}
                />
              </div>
            </div>

            {/* Location Details */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Location Details
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="building">Building</Label>
                  <Input
                    id="building"
                    {...form.register('building')}
                    placeholder="Building A"
                  />
                </div>
                <div>
                  <Label htmlFor="floor">Floor</Label>
                  <Input id="floor" {...form.register('floor')} placeholder="Level 2" />
                </div>
                <div>
                  <Label htmlFor="area">Area</Label>
                  <Input id="area" {...form.register('area')} placeholder="Lobby" />
                </div>
                <div>
                  <Label htmlFor="gridReference">Grid Reference</Label>
                  <Input
                    id="gridReference"
                    {...form.register('gridReference')}
                    placeholder="A-3"
                  />
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Schedule
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Frequency</Label>
                  <Select
                    value={form.watch('frequency')}
                    onValueChange={(v: string) => form.setValue('frequency', v as PhotoFrequency)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PHOTO_FREQUENCIES.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Category</Label>
                  <Select
                    value={form.watch('category')}
                    onValueChange={(v: string) => form.setValue('category', v as PhotoCategory)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PHOTO_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {frequency === 'weekly' && (
                  <div>
                    <Label>Day of Week</Label>
                    <Select
                      value={String(form.watch('dayOfWeek') ?? '')}
                      onValueChange={(v: string) => form.setValue('dayOfWeek', parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((d) => (
                          <SelectItem key={d.value} value={String(d.value)}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {frequency === 'monthly' && (
                  <div>
                    <Label>Day of Month</Label>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      {...form.register('dayOfMonth', { valueAsNumber: true })}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Photo Instructions
              </h4>
              <div>
                <Label htmlFor="photoInstructions">Instructions for Photographer</Label>
                <Textarea
                  id="photoInstructions"
                  {...form.register('photoInstructions')}
                  placeholder="e.g., Take photo from northwest corner, include full building height"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Required Angle</Label>
                  <Select
                    value={form.watch('requiredAngle') || ''}
                    onValueChange={(v: string) => form.setValue('requiredAngle', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any angle" />
                    </SelectTrigger>
                    <SelectContent>
                      {REQUIRED_ANGLES.map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Min Photos Required</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    {...form.register('minPhotosRequired', { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>

            {/* Toggles */}
            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.watch('isRequired')}
                    onCheckedChange={(v) => form.setValue('isRequired', v)}
                  />
                  <Label>Required</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.watch('isActive')}
                    onCheckedChange={(v) => form.setValue('isActive', v)}
                  />
                  <Label>Active</Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : editingTemplate
                    ? 'Update'
                    : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photo Location?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete "{templateToDelete?.name}" and all its associated requirements.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface TemplateCardProps {
  template: PhotoLocationTemplate;
  onEdit: (template: PhotoLocationTemplate) => void;
  onDuplicate: (template: PhotoLocationTemplate) => void;
  onDelete: (template: PhotoLocationTemplate) => void;
}

function TemplateCard({ template, onEdit, onDuplicate, onDelete }: TemplateCardProps) {
  const frequencyLabel =
    PHOTO_FREQUENCIES.find((f) => f.value === template.frequency)?.label || template.frequency;

  const locationParts = [template.building, template.floor, template.area]
    .filter(Boolean)
    .join(' › ');

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border p-3',
        !template.isActive && 'opacity-50 bg-gray-50'
      )}
    >
      <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{template.name}</span>
          {template.isRequired && (
            <Badge variant="outline" className="text-xs">
              Required
            </Badge>
          )}
          {!template.isActive && (
            <Badge variant="secondary" className="text-xs">
              Inactive
            </Badge>
          )}
        </div>
        {locationParts && (
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
            <Building2 className="h-3 w-3" />
            {locationParts}
          </p>
        )}
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {frequencyLabel}
          {template.minPhotosRequired > 1 && ` • ${template.minPhotosRequired} photos`}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" onClick={() => onEdit(template)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => onDuplicate(template)}>
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="text-red-600"
          onClick={() => onDelete(template)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default PhotoTemplateManager;
