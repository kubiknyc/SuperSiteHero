/**
 * NCR Form Dialog
 *
 * Dialog for creating and editing Non-Conformance Reports.
 * Supports all NCR fields including classification, responsible parties,
 * and impact assessment.
 */

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, AlertTriangle, FileWarning, DollarSign, Clock, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCreateNCR, useUpdateNCR } from '../hooks/useQualityControl';
import { useProjectUsers } from '@/features/messaging/hooks/useProjectUsers';
import {
  NCRCategory,
  NCRSeverity,
  NCRType,
  ResponsiblePartyType,
  type NCRWithDetails,
  type CreateNCRDTO,
  type UpdateNCRDTO,
} from '@/types/quality-control';

// ============================================================================
// HOOKS
// ============================================================================

function useProjectSubcontractors(projectId: string | undefined) {
  return useQuery({
    queryKey: ['subcontractors', projectId],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required');}
      const { data, error } = await supabase
        .from('subcontractors')
        .select('id, company_name, trade')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('company_name');
      if (error) {throw error;}
      return data;
    },
    enabled: !!projectId,
  });
}

function useProjectCostCodes(projectId: string | undefined) {
  return useQuery({
    queryKey: ['cost-codes', projectId],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required');}
      const { data, error } = await supabase
        .from('cost_codes')
        .select('id, code, name, division')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('code');
      if (error) {throw error;}
      return data;
    },
    enabled: !!projectId,
  });
}

// ============================================================================
// CONSTANTS
// ============================================================================

const NCR_CATEGORIES: { value: NCRCategory; label: string; description: string }[] = [
  { value: NCRCategory.WORKMANSHIP, label: 'Workmanship', description: 'Work quality issues' },
  { value: NCRCategory.MATERIAL, label: 'Material', description: 'Material defects or wrong materials' },
  { value: NCRCategory.DESIGN, label: 'Design', description: 'Design errors or omissions' },
  { value: NCRCategory.DOCUMENTATION, label: 'Documentation', description: 'Missing or incorrect documentation' },
  { value: NCRCategory.PROCESS, label: 'Process', description: 'Process or procedure violations' },
];

const NCR_SEVERITIES: { value: NCRSeverity; label: string; color: string }[] = [
  { value: NCRSeverity.MINOR, label: 'Minor', color: 'text-yellow-600' },
  { value: NCRSeverity.MAJOR, label: 'Major', color: 'text-orange-600' },
  { value: NCRSeverity.CRITICAL, label: 'Critical', color: 'text-red-600' },
];

const NCR_TYPES: { value: NCRType; label: string }[] = [
  { value: NCRType.INTERNAL, label: 'Internal' },
  { value: NCRType.EXTERNAL, label: 'External' },
  { value: NCRType.SUPPLIER, label: 'Supplier' },
];

const RESPONSIBLE_PARTY_TYPES: { value: ResponsiblePartyType; label: string }[] = [
  { value: ResponsiblePartyType.SUBCONTRACTOR, label: 'Subcontractor' },
  { value: ResponsiblePartyType.SUPPLIER, label: 'Supplier' },
  { value: ResponsiblePartyType.DESIGNER, label: 'Designer' },
  { value: ResponsiblePartyType.OWNER, label: 'Owner' },
  { value: ResponsiblePartyType.GC, label: 'General Contractor' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

// ============================================================================
// COMPONENT
// ============================================================================

interface NCRFormDialogProps {
  projectId: string;
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ncr?: NCRWithDetails; // For edit mode
  onSuccess?: (ncr: NCRWithDetails) => void;
}

export function NCRFormDialog({
  projectId,
  companyId,
  open,
  onOpenChange,
  ncr,
  onSuccess,
}: NCRFormDialogProps) {
  const isEditMode = !!ncr;

  // Form state - Basic Info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<NCRCategory | ''>('');
  const [severity, setSeverity] = useState<NCRSeverity>(NCRSeverity.MAJOR);
  const [ncrType, setNCRType] = useState<NCRType>(NCRType.INTERNAL);
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');

  // Form state - Location & Reference
  const [location, setLocation] = useState('');
  const [specSection, setSpecSection] = useState('');
  const [drawingReference, setDrawingReference] = useState('');
  const [costCodeId, setCostCodeId] = useState('');

  // Form state - Responsible Party
  const [responsiblePartyType, setResponsiblePartyType] = useState<ResponsiblePartyType | ''>('');
  const [responsibleSubcontractorId, setResponsibleSubcontractorId] = useState('');
  const [responsibleUserId, setResponsibleUserId] = useState('');

  // Form state - Impact
  const [costImpact, setCostImpact] = useState(false);
  const [costImpactAmount, setCostImpactAmount] = useState('');
  const [scheduleImpact, setScheduleImpact] = useState(false);
  const [scheduleImpactDays, setScheduleImpactDays] = useState('');
  const [safetyImpact, setSafetyImpact] = useState(false);

  // Form state - Dates
  const [dateIdentified, setDateIdentified] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Mutations
  const createNCR = useCreateNCR();
  const updateNCR = useUpdateNCR();

  // Data queries
  const { data: subcontractors = [] } = useProjectSubcontractors(projectId);
  const { data: costCodes = [] } = useProjectCostCodes(projectId);
  const { data: projectUsers = [] } = useProjectUsers(projectId);

  // Filter users for responsible user selection
  const availableUsers = useMemo(() => {
    return projectUsers.map((pu) => ({
      id: pu.user?.id || '',
      name: pu.user?.full_name || pu.user?.email || 'Unknown',
      email: pu.user?.email || '',
    })).filter((u) => u.id);
  }, [projectUsers]);

  // Reset form helper - defined before effects that use it
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setSeverity(NCRSeverity.MAJOR);
    setNCRType(NCRType.INTERNAL);
    setPriority('normal');
    setLocation('');
    setSpecSection('');
    setDrawingReference('');
    setCostCodeId('');
    setResponsiblePartyType('');
    setResponsibleSubcontractorId('');
    setResponsibleUserId('');
    setCostImpact(false);
    setCostImpactAmount('');
    setScheduleImpact(false);
    setScheduleImpactDays('');
    setSafetyImpact(false);
    setDateIdentified(new Date().toISOString().split('T')[0]);
  };

  // Load NCR data for edit mode
  useEffect(() => {
    if (ncr && open) {
      setTitle(ncr.title);
      setDescription(ncr.description || '');
      setCategory((ncr.category as NCRCategory) || '');
      setSeverity(ncr.severity);
      setNCRType(ncr.ncr_type);
      setPriority(ncr.priority);
      setLocation(ncr.location || '');
      setSpecSection(ncr.spec_section || '');
      setDrawingReference(ncr.drawing_reference || '');
      setCostCodeId(ncr.cost_code_id || '');
      setResponsiblePartyType((ncr.responsible_party_type as ResponsiblePartyType) || '');
      setResponsibleSubcontractorId(ncr.responsible_subcontractor_id || '');
      setResponsibleUserId(ncr.responsible_user_id || '');
      setCostImpact(ncr.cost_impact);
      setCostImpactAmount(ncr.cost_impact_amount?.toString() || '');
      setScheduleImpact(ncr.schedule_impact);
      setScheduleImpactDays(ncr.schedule_impact_days?.toString() || '');
      setSafetyImpact(ncr.safety_impact);
      setDateIdentified(ncr.date_identified.split('T')[0]);
    }
  }, [ncr, open]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {return;}

    if (isEditMode && ncr) {
      // Update existing NCR
      const dto: UpdateNCRDTO = {
        title: title.trim(),
        description: description.trim() || undefined,
        category: category || undefined,
        severity,
        location: location.trim() || undefined,
        spec_section: specSection.trim() || undefined,
        drawing_reference: drawingReference.trim() || undefined,
        cost_code_id: costCodeId || undefined,
        responsible_party_type: responsiblePartyType || undefined,
        responsible_subcontractor_id: responsibleSubcontractorId || undefined,
        responsible_user_id: responsibleUserId || undefined,
        priority,
        cost_impact: costImpact,
        cost_impact_amount: costImpact && costImpactAmount ? parseFloat(costImpactAmount) : undefined,
        schedule_impact: scheduleImpact,
        schedule_impact_days: scheduleImpact && scheduleImpactDays ? parseInt(scheduleImpactDays) : undefined,
        safety_impact: safetyImpact,
      };

      updateNCR.mutate(
        { id: ncr.id, dto },
        {
          onSuccess: (data) => {
            onOpenChange(false);
            onSuccess?.(data);
          },
        }
      );
    } else {
      // Create new NCR
      const dto: CreateNCRDTO = {
        project_id: projectId,
        company_id: companyId,
        title: title.trim(),
        description: description.trim() || undefined,
        category: category || undefined,
        severity,
        ncr_type: ncrType,
        location: location.trim() || undefined,
        spec_section: specSection.trim() || undefined,
        drawing_reference: drawingReference.trim() || undefined,
        cost_code_id: costCodeId || undefined,
        responsible_party_type: responsiblePartyType || undefined,
        responsible_subcontractor_id: responsibleSubcontractorId || undefined,
        responsible_user_id: responsibleUserId || undefined,
        priority,
        date_identified: dateIdentified,
      };

      createNCR.mutate(dto, {
        onSuccess: (data) => {
          onOpenChange(false);
          onSuccess?.(data);
        },
      });
    }
  };

  const isSubmitting = createNCR.isPending || updateNCR.isPending;
  const canSubmit = title.trim().length > 0 && !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-red-500" />
            {isEditMode ? 'Edit NCR' : 'Create Non-Conformance Report'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the details of this non-conformance report.'
              : 'Document a non-conformance issue for tracking and resolution.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="location">Location</TabsTrigger>
              <TabsTrigger value="responsibility">Responsibility</TabsTrigger>
              <TabsTrigger value="impact">Impact</TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief description of the non-conformance"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed description of the issue, including observations and conditions..."
                  rows={4}
                />
              </div>

              {/* Category & Severity Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={category}
                    onValueChange={(v) => setCategory(v as NCRCategory)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {NCR_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <div>
                            <div>{cat.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {cat.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="severity">
                    Severity <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={severity}
                    onValueChange={(v) => setSeverity(v as NCRSeverity)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NCR_SEVERITIES.map((sev) => (
                        <SelectItem key={sev.value} value={sev.value}>
                          <span className={sev.color}>{sev.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Type & Priority Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ncrType">NCR Type</Label>
                  <Select
                    value={ncrType}
                    onValueChange={(v) => setNCRType(v as NCRType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NCR_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={priority}
                    onValueChange={(v) => setPriority(v as typeof priority)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date Identified */}
              <div className="space-y-2">
                <Label htmlFor="dateIdentified">Date Identified</Label>
                <Input
                  id="dateIdentified"
                  type="date"
                  value={dateIdentified}
                  onChange={(e) => setDateIdentified(e.target.value)}
                />
              </div>
            </TabsContent>

            {/* Location Tab */}
            <TabsContent value="location" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Building, floor, room, grid line, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specSection">Spec Section</Label>
                <Input
                  id="specSection"
                  value={specSection}
                  onChange={(e) => setSpecSection(e.target.value)}
                  placeholder="e.g., 03 30 00 - Cast-in-Place Concrete"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="drawingReference">Drawing Reference</Label>
                <Input
                  id="drawingReference"
                  value={drawingReference}
                  onChange={(e) => setDrawingReference(e.target.value)}
                  placeholder="e.g., A-101, S-201"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="costCode">Cost Code</Label>
                <Select
                  value={costCodeId || '__none__'}
                  onValueChange={(v) => setCostCodeId(v === '__none__' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select cost code..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {costCodes.map((cc) => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.code} - {cc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* Responsibility Tab */}
            <TabsContent value="responsibility" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="responsiblePartyType">Responsible Party Type</Label>
                <Select
                  value={responsiblePartyType || '__none__'}
                  onValueChange={(v) => {
                    const newValue = v === '__none__' ? '' : v;
                    setResponsiblePartyType(newValue as ResponsiblePartyType);
                    // Clear subcontractor if not selecting subcontractor type
                    if (newValue !== ResponsiblePartyType.SUBCONTRACTOR) {
                      setResponsibleSubcontractorId('');
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select party type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {RESPONSIBLE_PARTY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {responsiblePartyType === ResponsiblePartyType.SUBCONTRACTOR && (
                <div className="space-y-2">
                  <Label htmlFor="subcontractor">Subcontractor</Label>
                  <Select
                    value={responsibleSubcontractorId || '__none__'}
                    onValueChange={(v) => setResponsibleSubcontractorId(v === '__none__' ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subcontractor..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {subcontractors.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.company_name}
                          {sub.trade && ` (${sub.trade})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="responsibleUser">Assigned To</Label>
                <Select
                  value={responsibleUserId || '__none__'}
                  onValueChange={(v) => setResponsibleUserId(v === '__none__' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Unassigned</SelectItem>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Person responsible for resolving this NCR
                </p>
              </div>
            </TabsContent>

            {/* Impact Tab */}
            <TabsContent value="impact" className="space-y-4 mt-4">
              {/* Cost Impact */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="costImpact"
                    checked={costImpact}
                    onCheckedChange={(checked) => setCostImpact(checked === true)}
                  />
                  <Label
                    htmlFor="costImpact"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <DollarSign className="h-4 w-4 text-green-600" />
                    Cost Impact
                  </Label>
                </div>
                {costImpact && (
                  <div className="ml-6">
                    <Label htmlFor="costAmount" className="text-sm">
                      Estimated Cost ($)
                    </Label>
                    <Input
                      id="costAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={costImpactAmount}
                      onChange={(e) => setCostImpactAmount(e.target.value)}
                      placeholder="0.00"
                      className="mt-1 max-w-xs"
                    />
                  </div>
                )}
              </div>

              {/* Schedule Impact */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="scheduleImpact"
                    checked={scheduleImpact}
                    onCheckedChange={(checked) => setScheduleImpact(checked === true)}
                  />
                  <Label
                    htmlFor="scheduleImpact"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Clock className="h-4 w-4 text-blue-600" />
                    Schedule Impact
                  </Label>
                </div>
                {scheduleImpact && (
                  <div className="ml-6">
                    <Label htmlFor="scheduleDays" className="text-sm">
                      Estimated Delay (days)
                    </Label>
                    <Input
                      id="scheduleDays"
                      type="number"
                      min="0"
                      value={scheduleImpactDays}
                      onChange={(e) => setScheduleImpactDays(e.target.value)}
                      placeholder="0"
                      className="mt-1 max-w-xs"
                    />
                  </div>
                )}
              </div>

              {/* Safety Impact */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="safetyImpact"
                  checked={safetyImpact}
                  onCheckedChange={(checked) => setSafetyImpact(checked === true)}
                />
                <Label
                  htmlFor="safetyImpact"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  Safety Impact
                </Label>
              </div>
              {safetyImpact && (
                <p className="ml-6 text-sm text-red-600">
                  This NCR has been flagged as a safety concern.
                </p>
              )}
            </TabsContent>
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
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditMode ? 'Update NCR' : 'Create NCR'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
