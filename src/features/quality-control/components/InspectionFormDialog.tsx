/**
 * Inspection Form Dialog
 *
 * Dialog for creating and editing QC Inspections.
 * Supports inspection type selection, scheduling, and reference linking.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useCreateInspection,
  useUpdateInspection,
} from '@/features/quality-control/hooks';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  InspectionType,
  InspectionCategory,
  type CreateInspectionDTO,
  type QCInspectionWithDetails,
} from '@/types/quality-control';
import {
  ClipboardCheck,
  Calendar,
  MapPin,
  FileText,
  User,
  Loader2,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface InspectionFormDialogProps {
  projectId: string;
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inspection?: QCInspectionWithDetails; // For edit mode
  onSuccess?: (inspection: QCInspectionWithDetails) => void;
}

interface FormData {
  title: string;
  description: string;
  inspection_type: InspectionType;
  category: InspectionCategory | '';
  location: string;
  spec_section: string;
  drawing_reference: string;
  cost_code_id: string;
  inspection_date: string;
  inspector_id: string;
  witness_required: boolean;
  witness_id: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const INSPECTION_TYPES: { value: InspectionType; label: string; description: string }[] = [
  { value: InspectionType.PRE_WORK, label: 'Pre-Work', description: 'Before work begins' },
  { value: InspectionType.IN_PROCESS, label: 'In-Process', description: 'During work execution' },
  { value: InspectionType.FINAL, label: 'Final', description: 'Upon work completion' },
  { value: InspectionType.MOCK_UP, label: 'Mock-Up', description: 'Sample/prototype review' },
  { value: InspectionType.FIRST_ARTICLE, label: 'First Article', description: 'First item inspection' },
  { value: InspectionType.RECEIVING, label: 'Receiving', description: 'Material receiving inspection' },
];

const INSPECTION_CATEGORIES: { value: InspectionCategory; label: string }[] = [
  { value: InspectionCategory.STRUCTURAL, label: 'Structural' },
  { value: InspectionCategory.MECHANICAL, label: 'Mechanical' },
  { value: InspectionCategory.ELECTRICAL, label: 'Electrical' },
  { value: InspectionCategory.PLUMBING, label: 'Plumbing' },
  { value: InspectionCategory.ARCHITECTURAL, label: 'Architectural' },
  { value: InspectionCategory.CIVIL, label: 'Civil' },
];

// ============================================================================
// HELPER HOOKS
// ============================================================================

function useProjectUsers(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-users', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          user_id,
          role,
          user_profiles!inner (
            id,
            full_name,
            email
          )
        `)
        .eq('project_id', projectId);

      if (error) {throw error;}
      return data?.map((m) => ({
        id: (m.user_profiles as { id: string }).id,
        full_name: (m.user_profiles as { full_name: string | null }).full_name || 'Unknown',
        email: (m.user_profiles as { email: string | null }).email || '',
        role: m.role,
      })) || [];
    },
    enabled: !!projectId,
  });
}

function useProjectCostCodes(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-cost-codes', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_codes')
        .select('id, code, name, division')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('code');

      if (error) {throw error;}
      return data || [];
    },
    enabled: !!projectId,
  });
}

// ============================================================================
// COMPONENT
// ============================================================================

export function InspectionFormDialog({
  projectId,
  companyId,
  open,
  onOpenChange,
  inspection,
  onSuccess,
}: InspectionFormDialogProps) {
  const isEditMode = !!inspection;
  const [activeTab, setActiveTab] = useState('basic');

  // Fetch related data
  const { data: users = [] } = useProjectUsers(projectId);
  const { data: costCodes = [] } = useProjectCostCodes(projectId);

  // Mutations
  const createInspection = useCreateInspection();
  const updateInspection = useUpdateInspection();

  const isSubmitting = createInspection.isPending || updateInspection.isPending;

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      title: '',
      description: '',
      inspection_type: InspectionType.IN_PROCESS,
      category: '',
      location: '',
      spec_section: '',
      drawing_reference: '',
      cost_code_id: '',
      inspection_date: format(new Date(), 'yyyy-MM-dd'),
      inspector_id: '',
      witness_required: false,
      witness_id: '',
    },
  });

  const witnessRequired = watch('witness_required');
  const inspectionType = watch('inspection_type');

  // Reset form when dialog opens or inspection changes
  useEffect(() => {
    if (open) {
      if (inspection) {
        reset({
          title: inspection.title || '',
          description: inspection.description || '',
          inspection_type: inspection.inspection_type as InspectionType,
          category: (inspection.category as InspectionCategory) || '',
          location: inspection.location || '',
          spec_section: inspection.spec_section || '',
          drawing_reference: inspection.drawing_reference || '',
          cost_code_id: inspection.cost_code_id || '',
          inspection_date: inspection.inspection_date
            ? format(new Date(inspection.inspection_date), 'yyyy-MM-dd')
            : format(new Date(), 'yyyy-MM-dd'),
          inspector_id: inspection.inspector_id || '',
          witness_required: inspection.witness_required || false,
          witness_id: inspection.witness_id || '',
        });
      } else {
        reset({
          title: '',
          description: '',
          inspection_type: InspectionType.IN_PROCESS,
          category: '',
          location: '',
          spec_section: '',
          drawing_reference: '',
          cost_code_id: '',
          inspection_date: format(new Date(), 'yyyy-MM-dd'),
          inspector_id: '',
          witness_required: false,
          witness_id: '',
        });
      }
      setActiveTab('basic');
    }
  }, [open, inspection, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const dto: CreateInspectionDTO = {
        project_id: projectId,
        company_id: companyId,
        title: data.title,
        description: data.description || undefined,
        inspection_type: data.inspection_type,
        category: data.category || undefined,
        location: data.location || undefined,
        spec_section: data.spec_section || undefined,
        drawing_reference: data.drawing_reference || undefined,
        cost_code_id: data.cost_code_id || undefined,
        inspection_date: data.inspection_date || undefined,
        inspector_id: data.inspector_id || undefined,
        witness_required: data.witness_required,
        witness_id: data.witness_required && data.witness_id ? data.witness_id : undefined,
      };

      let result: QCInspectionWithDetails;
      if (isEditMode && inspection) {
        result = await updateInspection.mutateAsync({
          id: inspection.id,
          dto: {
            title: dto.title,
            description: dto.description,
            inspection_type: dto.inspection_type,
            category: dto.category,
            location: dto.location,
            spec_section: dto.spec_section,
            drawing_reference: dto.drawing_reference,
            cost_code_id: dto.cost_code_id,
            inspection_date: dto.inspection_date,
            inspector_id: dto.inspector_id,
            witness_required: dto.witness_required,
            witness_id: dto.witness_id,
          },
        });
      } else {
        result = await createInspection.mutateAsync(dto);
      }

      onOpenChange(false);
      onSuccess?.(result);
    } catch (error) {
      console.error('Failed to save inspection:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            {isEditMode ? 'Edit Inspection' : 'Schedule New Inspection'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="assignment">Assignment</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[400px] mt-4 pr-4">
              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-4 mt-0">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Inspection Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    {...register('title', { required: 'Title is required' })}
                    placeholder="e.g., Concrete Pour Inspection - Level 3"
                  />
                  {errors.title && (
                    <p className="text-sm text-destructive">{errors.title.message}</p>
                  )}
                </div>

                {/* Type */}
                <div className="space-y-2">
                  <Label>
                    Inspection Type <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={inspectionType}
                    onValueChange={(v) => setValue('inspection_type', v as InspectionType)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {INSPECTION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex flex-col">
                            <span>{type.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {type.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={watch('category') || ''}
                    onValueChange={(v) => setValue('category', v as InspectionCategory)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {INSPECTION_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...register('description')}
                    placeholder="Describe what will be inspected and any special requirements..."
                    rows={4}
                  />
                </div>

                {/* Inspection Date */}
                <div className="space-y-2">
                  <Label htmlFor="inspection_date" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Inspection Date
                  </Label>
                  <Input
                    id="inspection_date"
                    type="date"
                    {...register('inspection_date')}
                  />
                </div>
              </TabsContent>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-4 mt-0">
                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location
                  </Label>
                  <Input
                    id="location"
                    {...register('location')}
                    placeholder="e.g., Building A, Level 3, Grid Line C-5"
                  />
                </div>

                {/* Spec Section */}
                <div className="space-y-2">
                  <Label htmlFor="spec_section" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Specification Section
                  </Label>
                  <Input
                    id="spec_section"
                    {...register('spec_section')}
                    placeholder="e.g., 03 30 00 - Cast-in-Place Concrete"
                  />
                </div>

                {/* Drawing Reference */}
                <div className="space-y-2">
                  <Label htmlFor="drawing_reference">Drawing Reference</Label>
                  <Input
                    id="drawing_reference"
                    {...register('drawing_reference')}
                    placeholder="e.g., S-301, A-102"
                  />
                </div>

                {/* Cost Code */}
                <div className="space-y-2">
                  <Label>Cost Code</Label>
                  <Select
                    value={watch('cost_code_id') || ''}
                    onValueChange={(v) => setValue('cost_code_id', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select cost code..." />
                    </SelectTrigger>
                    <SelectContent>
                      {costCodes.map((cc) => (
                        <SelectItem key={cc.id} value={cc.id}>
                          {cc.code} - {cc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              {/* Assignment Tab */}
              <TabsContent value="assignment" className="space-y-4 mt-0">
                {/* Inspector */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Inspector
                  </Label>
                  <Select
                    value={watch('inspector_id') || ''}
                    onValueChange={(v) => setValue('inspector_id', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select inspector..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex flex-col">
                            <span>{user.full_name}</span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Witness Required */}
                <div className="flex items-center space-x-2 py-2">
                  <Checkbox
                    id="witness_required"
                    checked={witnessRequired}
                    onCheckedChange={(checked) => setValue('witness_required', !!checked)}
                  />
                  <Label htmlFor="witness_required" className="cursor-pointer">
                    Witness Required
                  </Label>
                </div>

                {/* Witness Selection */}
                {witnessRequired && (
                  <div className="space-y-2 pl-6">
                    <Label>Witness</Label>
                    <Select
                      value={watch('witness_id') || ''}
                      onValueChange={(v) => setValue('witness_id', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select witness..." />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex flex-col">
                              <span>{user.full_name}</span>
                              <span className="text-xs text-muted-foreground">{user.email}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditMode ? 'Update Inspection' : 'Schedule Inspection'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default InspectionFormDialog;
