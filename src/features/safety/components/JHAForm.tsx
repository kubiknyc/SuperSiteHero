/**
 * JHAForm Component
 *
 * Comprehensive Job Hazard Analysis form with:
 * - Task breakdown steps
 * - Hazard identification per step
 * - Control measures hierarchy (elimination, substitution, engineering, admin, PPE)
 * - PPE requirements
 * - Responsible party assignment
 * - Worker acknowledgment signatures
 * - Template library integration
 * - Link to daily reports
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Shield,
  Calendar,
  MapPin,
  Clock,
  User,
  Users,
  Building,
  Thermometer,
  Cloud,
  Wrench,
  X,
  Plus,
  FileText,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Trash2,
  HardHat,
  Check,
  Save,
  Send,
  FileSignature,
  ClipboardList,
  Link as LinkIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  useJHATemplatesByCategory,
  useCreateJHA,
  useUpdateJHA,
  useAddJHAHazard,
  useAddJHAAcknowledgment,
  useApplyJHATemplate,
} from '../hooks/useJHA';
import { useProjectUsers } from '@/features/messaging/hooks/useProjectUsers';
import {
  COMMON_PPE,
  RISK_LEVELS,
  HAZARD_TYPES,
  type RiskLevel,
  type HazardType,
  type CreateJSAHazardDTO,
  type JSAWithDetails,
  type JobSafetyAnalysis,
} from '@/types/jsa';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface JHAFormProps {
  projectId: string;
  initialData?: JSAWithDetails;
  onSuccess?: (jha: JobSafetyAnalysis) => void;
  onCancel?: () => void;
}

interface HazardStepFormData extends CreateJSAHazardDTO {
  id?: string;
  isExpanded?: boolean;
}

interface AcknowledgmentFormData {
  worker_name: string;
  worker_company: string;
  worker_trade: string;
  worker_badge_number: string;
  signature_data: string;
  understands_hazards: boolean;
  has_questions: boolean;
  questions_notes: string;
}

// ============================================================================
// Risk Level Badge Component
// ============================================================================

function RiskLevelBadge({ level }: { level: RiskLevel }) {
  const config = RISK_LEVELS.find((r) => r.value === level);
  const colorClasses = {
    low: 'bg-green-100 text-green-800 border-green-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    critical: 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <Badge variant="outline" className={cn('font-medium', colorClasses[level])}>
      {config?.label || level}
    </Badge>
  );
}

// ============================================================================
// Hazard Step Editor Component
// ============================================================================

interface HazardStepEditorProps {
  step: HazardStepFormData;
  index: number;
  onChange: (index: number, step: HazardStepFormData) => void;
  onRemove: (index: number) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function HazardStepEditor({
  step,
  index,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: HazardStepEditorProps) {
  const [isExpanded, setIsExpanded] = useState(step.isExpanded ?? true);

  const updateField = <K extends keyof HazardStepFormData>(
    field: K,
    value: HazardStepFormData[K]
  ) => {
    onChange(index, { ...step, [field]: value });
  };

  const togglePPE = (ppe: string) => {
    const current = step.ppe_required || [];
    const updated = current.includes(ppe)
      ? current.filter((p) => p !== ppe)
      : [...current, ppe];
    updateField('ppe_required', updated);
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={onMoveUp}
                disabled={isFirst}
                className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={onMoveDown}
                disabled={isLast}
                className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg">Step {index + 1}</span>
              {step.risk_level && <RiskLevelBadge level={step.risk_level} />}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemove(index)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4 pt-0">
          {/* Step Description */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Task Step Description *</Label>
              <Textarea
                placeholder="Describe what will be done in this step"
                value={step.step_description || ''}
                onChange={(e) => updateField('step_description', e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Potential Hazard *</Label>
              <Textarea
                placeholder="What could go wrong? What hazards are present?"
                value={step.hazard_description || ''}
                onChange={(e) => updateField('hazard_description', e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Hazard Type</Label>
              <Select
                value={step.hazard_type || ''}
                onValueChange={(v) => updateField('hazard_type', v as HazardType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {HAZARD_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Risk Level *</Label>
              <Select
                value={step.risk_level || 'medium'}
                onValueChange={(v) => updateField('risk_level', v as RiskLevel)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select risk level" />
                </SelectTrigger>
                <SelectContent>
                  {RISK_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'w-2 h-2 rounded-full',
                            level.value === 'low' && 'bg-green-500',
                            level.value === 'medium' && 'bg-yellow-500',
                            level.value === 'high' && 'bg-orange-500',
                            level.value === 'critical' && 'bg-red-500'
                          )}
                        />
                        {level.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsible Party</Label>
              <Input
                placeholder="Who is responsible?"
                value={step.responsible_party || ''}
                onChange={(e) => updateField('responsible_party', e.target.value)}
              />
            </div>
          </div>

          {/* Control Measures - Hierarchy of Controls */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              Control Measures (Hierarchy of Controls)
            </Label>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  1. Elimination (Remove hazard)
                </Label>
                <Textarea
                  placeholder="Can the hazard be eliminated?"
                  value={step.elimination_controls || ''}
                  onChange={(e) => updateField('elimination_controls', e.target.value)}
                  rows={2}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  2. Substitution (Replace hazard)
                </Label>
                <Textarea
                  placeholder="Can we use something safer?"
                  value={step.substitution_controls || ''}
                  onChange={(e) => updateField('substitution_controls', e.target.value)}
                  rows={2}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  3. Engineering Controls
                </Label>
                <Textarea
                  placeholder="Guards, ventilation, barriers..."
                  value={step.engineering_controls || ''}
                  onChange={(e) => updateField('engineering_controls', e.target.value)}
                  rows={2}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2 lg:col-span-2">
                <Label className="text-xs text-muted-foreground">
                  4. Administrative Controls
                </Label>
                <Textarea
                  placeholder="Training, procedures, signage, work practices..."
                  value={step.administrative_controls || ''}
                  onChange={(e) => updateField('administrative_controls', e.target.value)}
                  rows={2}
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          {/* PPE Requirements */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <HardHat className="h-4 w-4 text-muted-foreground" />
              5. PPE Required
            </Label>
            <div className="flex flex-wrap gap-2">
              {COMMON_PPE.map((ppe) => (
                <Badge
                  key={ppe}
                  variant={(step.ppe_required || []).includes(ppe) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => togglePPE(ppe)}
                >
                  {(step.ppe_required || []).includes(ppe) && (
                    <Check className="h-3 w-3 mr-1" />
                  )}
                  {ppe}
                </Badge>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea
              placeholder="Any additional notes or instructions..."
              value={step.notes || ''}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ============================================================================
// Worker Acknowledgment Dialog
// ============================================================================

interface AcknowledgmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AcknowledgmentFormData) => void;
  isSubmitting: boolean;
}

function AcknowledgmentDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: AcknowledgmentDialogProps) {
  const [formData, setFormData] = useState<AcknowledgmentFormData>({
    worker_name: '',
    worker_company: '',
    worker_trade: '',
    worker_badge_number: '',
    signature_data: '',
    understands_hazards: true,
    has_questions: false,
    questions_notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Worker Acknowledgment
          </DialogTitle>
          <DialogDescription>
            I have been briefed on the hazards and control measures for this job.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                required
                placeholder="Full name"
                value={formData.worker_name}
                onChange={(e) =>
                  setFormData({ ...formData, worker_name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Input
                placeholder="Company name"
                value={formData.worker_company}
                onChange={(e) =>
                  setFormData({ ...formData, worker_company: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Trade</Label>
              <Input
                placeholder="e.g., Electrician, Carpenter"
                value={formData.worker_trade}
                onChange={(e) =>
                  setFormData({ ...formData, worker_trade: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Badge/ID Number</Label>
              <Input
                placeholder="Employee ID"
                value={formData.worker_badge_number}
                onChange={(e) =>
                  setFormData({ ...formData, worker_badge_number: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="understands"
                checked={formData.understands_hazards}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, understands_hazards: !!checked })
                }
              />
              <Label htmlFor="understands" className="text-sm font-normal leading-relaxed">
                I understand the hazards and control measures described in this JHA
                and will follow the safe work practices outlined.
              </Label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="hasQuestions"
                checked={formData.has_questions}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, has_questions: !!checked })
                }
              />
              <Label htmlFor="hasQuestions" className="text-sm font-normal">
                I have questions or concerns to discuss
              </Label>
            </div>

            {formData.has_questions && (
              <div className="space-y-2 pl-6">
                <Label>Questions/Concerns</Label>
                <Textarea
                  placeholder="Describe your questions or concerns..."
                  value={formData.questions_notes}
                  onChange={(e) =>
                    setFormData({ ...formData, questions_notes: e.target.value })
                  }
                  rows={2}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Digital Signature</Label>
            <div className="border rounded-md h-24 bg-muted/20 flex items-center justify-center">
              <span className="text-sm text-muted-foreground">
                Signature pad placeholder - implement with react-signature-canvas
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.worker_name}>
              {isSubmitting ? 'Signing...' : 'Sign & Acknowledge'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Main JHA Form Component
// ============================================================================

export function JHAForm({
  projectId,
  initialData,
  onSuccess,
  onCancel,
}: JHAFormProps) {
  const navigate = useNavigate();
  const isEditing = !!initialData;

  // Form state
  const [taskDescription, setTaskDescription] = useState(
    initialData?.task_description || ''
  );
  const [workLocation, setWorkLocation] = useState(
    initialData?.work_location || ''
  );
  const [scheduledDate, setScheduledDate] = useState(
    initialData?.scheduled_date || format(new Date(), 'yyyy-MM-dd')
  );
  const [startTime, setStartTime] = useState(initialData?.start_time || '');
  const [estimatedDuration, setEstimatedDuration] = useState(
    initialData?.estimated_duration || ''
  );
  const [supervisorId, setSupervisorId] = useState(
    initialData?.supervisor_id || ''
  );
  const [supervisorName, setSupervisorName] = useState(
    initialData?.supervisor_name || ''
  );
  const [foremanName, setForemanName] = useState(
    initialData?.foreman_name || ''
  );
  const [contractorCompany, setContractorCompany] = useState(
    initialData?.contractor_company || ''
  );
  const [weatherConditions, setWeatherConditions] = useState(
    initialData?.weather_conditions || ''
  );
  const [temperature, setTemperature] = useState(
    initialData?.temperature || ''
  );
  const [equipment, setEquipment] = useState<string[]>(
    initialData?.equipment_used || []
  );
  const [newEquipment, setNewEquipment] = useState('');

  // Hazard steps state
  const [hazardSteps, setHazardSteps] = useState<HazardStepFormData[]>(
    initialData?.hazards?.map((h) => ({
      id: h.id,
      step_number: h.step_number,
      step_description: h.step_description,
      hazard_description: h.hazard_description,
      hazard_type: h.hazard_type || undefined,
      risk_level: h.risk_level,
      probability: h.probability || undefined,
      severity: h.severity || undefined,
      elimination_controls: h.elimination_controls || '',
      substitution_controls: h.substitution_controls || '',
      engineering_controls: h.engineering_controls || '',
      administrative_controls: h.administrative_controls || '',
      ppe_required: h.ppe_required || [],
      responsible_party: h.responsible_party || '',
      notes: h.notes || '',
      isExpanded: false,
    })) || []
  );

  // Template dialog state
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Acknowledgment dialog state
  const [showAckDialog, setShowAckDialog] = useState(false);

  // Queries and mutations
  const { data: templateCategories } = useJHATemplatesByCategory();
  const { data: projectUsers } = useProjectUsers(projectId);
  const createMutation = useCreateJHA();
  const updateMutation = useUpdateJHA();
  const addAckMutation = useAddJHAAcknowledgment();
  const applyTemplateMutation = useApplyJHATemplate();

  const isLoading =
    createMutation.isPending ||
    updateMutation.isPending ||
    applyTemplateMutation.isPending;

  // Equipment management
  const addEquipment = () => {
    if (newEquipment.trim() && !equipment.includes(newEquipment.trim())) {
      setEquipment([...equipment, newEquipment.trim()]);
      setNewEquipment('');
    }
  };

  const removeEquipment = (item: string) => {
    setEquipment(equipment.filter((e) => e !== item));
  };

  // Hazard step management
  const addHazardStep = () => {
    setHazardSteps([
      ...hazardSteps,
      {
        step_number: hazardSteps.length + 1,
        step_description: '',
        hazard_description: '',
        risk_level: 'medium',
        ppe_required: [],
        isExpanded: true,
      },
    ]);
  };

  const updateHazardStep = (index: number, step: HazardStepFormData) => {
    const updated = [...hazardSteps];
    updated[index] = step;
    setHazardSteps(updated);
  };

  const removeHazardStep = (index: number) => {
    setHazardSteps(hazardSteps.filter((_, i) => i !== index));
  };

  const moveHazardStep = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= hazardSteps.length) return;

    const updated = [...hazardSteps];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    // Update step numbers
    updated.forEach((step, i) => {
      step.step_number = i + 1;
    });
    setHazardSteps(updated);
  };

  // Apply template
  const handleApplyTemplate = (templateId: string) => {
    const allTemplates = templateCategories?.flatMap((c) => c.templates) || [];
    const template = allTemplates.find((t) => t.id === templateId);
    if (!template) return;

    // Convert template hazards to form format
    if (template.default_hazards && template.default_hazards.length > 0) {
      const templateHazards: HazardStepFormData[] = template.default_hazards.map(
        (h, index) => ({
          step_number: index + 1,
          step_description: '',
          hazard_description: h.hazard,
          risk_level: h.risk_level,
          ppe_required: h.ppe || [],
          administrative_controls: h.controls?.join('\n') || '',
          isExpanded: true,
        })
      );
      setHazardSteps([...hazardSteps, ...templateHazards]);
    }

    setShowTemplateDialog(false);
    setSelectedTemplateId('');
  };

  // Form validation
  const isValid =
    taskDescription.trim() &&
    scheduledDate &&
    hazardSteps.length > 0 &&
    hazardSteps.every((s) => s.step_description && s.hazard_description);

  // Get highest risk level
  const getMaxRiskLevel = (): RiskLevel => {
    const riskOrder: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
    let maxRisk: RiskLevel = 'low';

    hazardSteps.forEach((step) => {
      if (step.risk_level) {
        const currentIndex = riskOrder.indexOf(step.risk_level);
        const maxIndex = riskOrder.indexOf(maxRisk);
        if (currentIndex > maxIndex) {
          maxRisk = step.risk_level;
        }
      }
    });

    return maxRisk;
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent, submitForReview = false) => {
    e.preventDefault();
    if (!isValid) return;

    try {
      const baseData = {
        project_id: projectId,
        task_description: taskDescription,
        work_location: workLocation || undefined,
        equipment_used: equipment.length > 0 ? equipment : undefined,
        scheduled_date: scheduledDate,
        start_time: startTime || undefined,
        estimated_duration: estimatedDuration || undefined,
        supervisor_id: supervisorId || undefined,
        supervisor_name: supervisorName || undefined,
        foreman_name: foremanName || undefined,
        contractor_company: contractorCompany || undefined,
        weather_conditions: weatherConditions || undefined,
        temperature: temperature || undefined,
      };

      if (isEditing) {
        const updated = await updateMutation.mutateAsync({
          id: initialData.id,
          ...baseData,
          status: submitForReview ? 'pending_review' : undefined,
        });
        onSuccess?.(updated);
      } else {
        const created = await createMutation.mutateAsync({
          ...baseData,
          hazards: hazardSteps
            .filter((h) => h.step_description && h.hazard_description)
            .map((h, index) => ({
              step_number: index + 1,
              step_description: h.step_description,
              hazard_description: h.hazard_description,
              hazard_type: h.hazard_type,
              risk_level: h.risk_level || 'medium',
              elimination_controls: h.elimination_controls,
              substitution_controls: h.substitution_controls,
              engineering_controls: h.engineering_controls,
              administrative_controls: h.administrative_controls,
              ppe_required: h.ppe_required,
              responsible_party: h.responsible_party,
              notes: h.notes,
            })),
        });
        onSuccess?.(created);
        if (!onSuccess) {
          navigate(`/projects/${projectId}/jha/${created.id}`);
        }
      }
    } catch (error) {
      console.error('Failed to save JHA:', error);
    }
  };

  // Handle acknowledgment submission
  const handleAcknowledgment = async (data: AcknowledgmentFormData) => {
    if (!initialData?.id) return;

    try {
      await addAckMutation.mutateAsync({
        jsa_id: initialData.id,
        worker_name: data.worker_name,
        worker_company: data.worker_company || undefined,
        worker_trade: data.worker_trade || undefined,
        worker_badge_number: data.worker_badge_number || undefined,
        signature_data: data.signature_data || undefined,
        understands_hazards: data.understands_hazards,
        has_questions: data.has_questions,
        questions_notes: data.questions_notes || undefined,
      });
      setShowAckDialog(false);
    } catch (error) {
      console.error('Failed to add acknowledgment:', error);
    }
  };

  const maxRisk = getMaxRiskLevel();

  return (
    <div className="space-y-6">
      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        {/* Header with risk indicator */}
        {hazardSteps.length > 0 && (
          <Alert
            variant={maxRisk === 'critical' || maxRisk === 'high' ? 'destructive' : 'default'}
            className={cn(
              maxRisk === 'low' && 'border-green-500 bg-green-50',
              maxRisk === 'medium' && 'border-yellow-500 bg-yellow-50',
              maxRisk === 'high' && 'border-orange-500 bg-orange-50',
              maxRisk === 'critical' && 'border-red-500 bg-red-50'
            )}
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center gap-2">
              <span>Overall Risk Level:</span>
              <RiskLevelBadge level={maxRisk} />
              <span className="text-muted-foreground">
                ({hazardSteps.length} hazard step{hazardSteps.length !== 1 && 's'} identified)
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Template Selection */}
        {!isEditing && templateCategories && templateCategories.length > 0 && (
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Start from Template (Optional)
              </CardTitle>
              <CardDescription>
                Apply a template to pre-fill hazards and controls for common tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowTemplateDialog(true)}
              >
                <ClipboardList className="h-4 w-4 mr-2" />
                Browse Templates
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Basic Information */}
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Task Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task" className="flex items-center gap-1">
                Task Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="task"
                placeholder="Describe the task or work activity to be performed"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                rows={3}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Work Location
                </Label>
                <Input
                  id="location"
                  placeholder="Where will the work take place?"
                  value={workLocation}
                  onChange={(e) => setWorkLocation(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contractor" className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  Contractor Company
                </Label>
                <Input
                  id="contractor"
                  placeholder="Company performing the work"
                  value={contractorCompany}
                  onChange={(e) => setContractorCompany(e.target.value)}
                />
              </div>
            </div>

            {/* Equipment */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                Equipment / Tools Used
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add equipment or tools"
                  value={newEquipment}
                  onChange={(e) => setNewEquipment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addEquipment();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addEquipment}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {equipment.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {equipment.map((item) => (
                    <Badge key={item} variant="secondary">
                      {item}
                      <button
                        type="button"
                        onClick={() => removeEquipment(item)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Scheduling */}
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-1">
                  Scheduled Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time" className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Start Time
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Estimated Duration</Label>
                <Input
                  id="duration"
                  placeholder="e.g., 4 hours, 2 days"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Responsible Parties */}
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Responsible Parties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supervisor" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Supervisor
                </Label>
                {projectUsers && projectUsers.length > 0 ? (
                  <Select
                    value={supervisorId}
                    onValueChange={(id) => {
                      setSupervisorId(id);
                      const projectUser = projectUsers.find((pu) => pu.user_id === id);
                      if (projectUser?.user) {
                        const fullName = [
                          projectUser.user.first_name,
                          projectUser.user.last_name,
                        ]
                          .filter(Boolean)
                          .join(' ');
                        setSupervisorName(fullName || '');
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supervisor" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectUsers.map((projectUser) => {
                        const fullName = projectUser.user
                          ? [projectUser.user.first_name, projectUser.user.last_name]
                              .filter(Boolean)
                              .join(' ')
                          : '';
                        return (
                          <SelectItem
                            key={projectUser.user_id}
                            value={projectUser.user_id}
                          >
                            {fullName || projectUser.user?.email || 'Unknown'}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="supervisor"
                    placeholder="Supervisor name"
                    value={supervisorName}
                    onChange={(e) => setSupervisorName(e.target.value)}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="foreman">Foreman / Crew Lead</Label>
                <Input
                  id="foreman"
                  placeholder="Foreman or crew lead name"
                  value={foremanName}
                  onChange={(e) => setForemanName(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Site Conditions */}
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              Site Conditions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="weather">Weather Conditions</Label>
                <Input
                  id="weather"
                  placeholder="e.g., Clear, sunny, 75F"
                  value={weatherConditions}
                  onChange={(e) => setWeatherConditions(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temp" className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-muted-foreground" />
                  Temperature
                </Label>
                <Input
                  id="temp"
                  placeholder="e.g., 75F / 24C"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Hazard Steps Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Hazard Analysis Steps
              </h3>
              <p className="text-sm text-muted-foreground">
                Break down the task into steps and identify hazards for each
              </p>
            </div>
            <Button type="button" onClick={addHazardStep}>
              <Plus className="h-4 w-4 mr-2" />
              Add Step
            </Button>
          </div>

          {hazardSteps.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No hazard steps added yet. Click "Add Step" to begin the hazard
                  analysis.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {hazardSteps.map((step, index) => (
                <HazardStepEditor
                  key={step.id || index}
                  step={step}
                  index={index}
                  onChange={updateHazardStep}
                  onRemove={removeHazardStep}
                  onMoveUp={() => moveHazardStep(index, 'up')}
                  onMoveDown={() => moveHazardStep(index, 'down')}
                  isFirst={index === 0}
                  isLast={index === hazardSteps.length - 1}
                />
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Form Actions */}
        <div className="flex flex-wrap justify-between gap-4">
          <div className="flex gap-2">
            {isEditing && initialData?.status === 'approved' && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAckDialog(true)}
              >
                <FileSignature className="h-4 w-4 mr-2" />
                Add Worker Acknowledgment
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel || (() => navigate(-1))}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading
                ? 'Saving...'
                : isEditing
                ? 'Save Changes'
                : 'Save as Draft'}
            </Button>
            {(!isEditing ||
              initialData?.status === 'draft' ||
              initialData?.status === 'pending_review') && (
              <Button
                type="button"
                onClick={(e) => handleSubmit(e as any, true)}
                disabled={!isValid || isLoading}
              >
                <Send className="h-4 w-4 mr-2" />
                Submit for Review
              </Button>
            )}
          </div>
        </div>
      </form>

      {/* Template Selection Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select JHA Template</DialogTitle>
            <DialogDescription>
              Choose a template to pre-populate hazards and controls
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue={templateCategories?.[0]?.category} className="w-full">
            <TabsList className="flex flex-wrap h-auto gap-1">
              {templateCategories?.map((cat) => (
                <TabsTrigger key={cat.category} value={cat.category}>
                  {cat.category} ({cat.count})
                </TabsTrigger>
              ))}
            </TabsList>

            {templateCategories?.map((cat) => (
              <TabsContent key={cat.category} value={cat.category}>
                <div className="space-y-2">
                  {cat.templates.map((template) => (
                    <Card
                      key={template.id}
                      className={cn(
                        'cursor-pointer hover:border-primary transition-colors',
                        selectedTemplateId === template.id && 'border-primary'
                      )}
                      onClick={() => setSelectedTemplateId(template.id)}
                    >
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">{template.name}</CardTitle>
                          {template.default_hazards && (
                            <Badge variant="secondary">
                              {template.default_hazards.length} hazards
                            </Badge>
                          )}
                        </div>
                        {template.description && (
                          <CardDescription className="text-xs">
                            {template.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleApplyTemplate(selectedTemplateId)}
              disabled={!selectedTemplateId}
            >
              Apply Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Acknowledgment Dialog */}
      <AcknowledgmentDialog
        open={showAckDialog}
        onOpenChange={setShowAckDialog}
        onSubmit={handleAcknowledgment}
        isSubmitting={addAckMutation.isPending}
      />
    </div>
  );
}

export default JHAForm;
