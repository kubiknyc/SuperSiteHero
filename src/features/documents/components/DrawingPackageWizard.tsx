/**
 * Drawing Package Wizard
 * Multi-step wizard for creating and editing drawing packages
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Package,
  FileText,
  Users,
  Settings,
  Check,
  ChevronRight,
  ChevronLeft,
  Search,
  Plus,
  X,
  GripVertical,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreateDrawingPackage, useAddMultiplePackageItems } from '../hooks/useDrawingPackages';
import type {
  DrawingPackage,
  DrawingPackageType,
  DrawingPackageInsert,
  Drawing,
  DrawingDiscipline,
} from '@/types/drawing';
import { DRAWING_PACKAGE_TYPES, DRAWING_DISCIPLINES } from '@/types/drawing';

interface DrawingPackageWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  companyId: string;
  projectName?: string;
  availableDrawings: Drawing[];
  onSuccess?: (pkg: DrawingPackage) => void;
}

type WizardStep = 'basics' | 'drawings' | 'settings' | 'review';

interface WizardData {
  name: string;
  description: string;
  packageType: DrawingPackageType;
  coverSheetTitle: string;
  coverSheetSubtitle: string;
  coverSheetNotes: string;
  includeCoverSheet: boolean;
  includeToc: boolean;
  includeRevisionHistory: boolean;
  requireAcknowledgment: boolean;
  acknowledgmentDeadline: string;
  allowDownload: boolean;
  downloadExpiresAt: string;
  accessPassword: string;
  selectedDrawingIds: string[];
}

const initialData: WizardData = {
  name: '',
  description: '',
  packageType: 'construction',
  coverSheetTitle: '',
  coverSheetSubtitle: '',
  coverSheetNotes: '',
  includeCoverSheet: true,
  includeToc: true,
  includeRevisionHistory: true,
  requireAcknowledgment: false,
  acknowledgmentDeadline: '',
  allowDownload: true,
  downloadExpiresAt: '',
  accessPassword: '',
  selectedDrawingIds: [],
};

const STEPS: { id: WizardStep; label: string; icon: React.ReactNode }[] = [
  { id: 'basics', label: 'Package Info', icon: <Package className="h-4 w-4" /> },
  { id: 'drawings', label: 'Select Drawings', icon: <FileText className="h-4 w-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
  { id: 'review', label: 'Review', icon: <Check className="h-4 w-4" /> },
];

export function DrawingPackageWizard({
  open,
  onOpenChange,
  projectId,
  companyId,
  projectName,
  availableDrawings,
  onSuccess,
}: DrawingPackageWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('basics');
  const [data, setData] = useState<WizardData>(initialData);
  const [searchQuery, setSearchQuery] = useState('');
  const [disciplineFilter, setDisciplineFilter] = useState<DrawingDiscipline | 'all'>('all');

  const createPackage = useCreateDrawingPackage();
  const addItems = useAddMultiplePackageItems();

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  const updateData = useCallback((updates: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const filteredDrawings = useMemo(() => {
    return availableDrawings.filter((drawing) => {
      const matchesSearch =
        !searchQuery ||
        drawing.drawingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        drawing.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDiscipline =
        disciplineFilter === 'all' || drawing.discipline === disciplineFilter;
      return matchesSearch && matchesDiscipline;
    });
  }, [availableDrawings, searchQuery, disciplineFilter]);

  const selectedDrawings = useMemo(() => {
    return availableDrawings.filter((d) => data.selectedDrawingIds.includes(d.id));
  }, [availableDrawings, data.selectedDrawingIds]);

  const toggleDrawing = useCallback((drawingId: string) => {
    setData((prev) => {
      const isSelected = prev.selectedDrawingIds.includes(drawingId);
      return {
        ...prev,
        selectedDrawingIds: isSelected
          ? prev.selectedDrawingIds.filter((id) => id !== drawingId)
          : [...prev.selectedDrawingIds, drawingId],
      };
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    const filteredIds = filteredDrawings.map((d) => d.id);
    setData((prev) => ({
      ...prev,
      selectedDrawingIds: [...new Set([...prev.selectedDrawingIds, ...filteredIds])],
    }));
  }, [filteredDrawings]);

  const clearSelection = useCallback(() => {
    setData((prev) => ({ ...prev, selectedDrawingIds: [] }));
  }, []);

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 'basics':
        return data.name.trim().length > 0;
      case 'drawings':
        return data.selectedDrawingIds.length > 0;
      case 'settings':
        return true;
      case 'review':
        return true;
      default:
        return false;
    }
  }, [currentStep, data]);

  const handleNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id);
    }
  }, [currentStepIndex]);

  const handleBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
    }
  }, [currentStepIndex]);

  const handleCreate = useCallback(async () => {
    try {
      const packageData: DrawingPackageInsert = {
        companyId,
        projectId,
        name: data.name,
        description: data.description || undefined,
        packageType: data.packageType,
        coverSheetTitle: data.coverSheetTitle || undefined,
        coverSheetSubtitle: data.coverSheetSubtitle || undefined,
        coverSheetNotes: data.coverSheetNotes || undefined,
        includeCoverSheet: data.includeCoverSheet,
        includeToc: data.includeToc,
        includeRevisionHistory: data.includeRevisionHistory,
        requireAcknowledgment: data.requireAcknowledgment,
        acknowledgmentDeadline: data.acknowledgmentDeadline || undefined,
        allowDownload: data.allowDownload,
        downloadExpiresAt: data.downloadExpiresAt || undefined,
        accessPassword: data.accessPassword || undefined,
      };

      const pkg = await createPackage.mutateAsync(packageData);

      // Add drawings to package
      if (data.selectedDrawingIds.length > 0) {
        await addItems.mutateAsync({
          packageId: pkg.id,
          drawingIds: data.selectedDrawingIds,
        });
      }

      // Reset and close
      setData(initialData);
      setCurrentStep('basics');
      onOpenChange(false);
      onSuccess?.(pkg);
    } catch (error) {
      console.error('Failed to create package:', error);
    }
  }, [
    companyId,
    projectId,
    data,
    createPackage,
    addItems,
    onOpenChange,
    onSuccess,
  ]);

  const handleClose = useCallback(() => {
    setData(initialData);
    setCurrentStep('basics');
    onOpenChange(false);
  }, [onOpenChange]);

  const isLoading = createPackage.isPending || addItems.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Drawing Package</DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 rounded-lg">
          {STEPS.map((step, index) => {
            const isActive = step.id === currentStep;
            const isCompleted = index < currentStepIndex;
            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => index <= currentStepIndex && setCurrentStep(step.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md transition-colors',
                    isActive && 'bg-primary text-primary-foreground',
                    isCompleted && 'text-primary cursor-pointer hover:bg-muted',
                    !isActive && !isCompleted && 'text-muted-foreground cursor-not-allowed'
                  )}
                  disabled={index > currentStepIndex}
                >
                  <div
                    className={cn(
                      'flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium',
                      isActive && 'bg-primary-foreground text-primary',
                      isCompleted && 'bg-primary text-primary-foreground',
                      !isActive && !isCompleted && 'bg-muted-foreground/20'
                    )}
                  >
                    {isCompleted ? <Check className="h-3 w-3" /> : index + 1}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">{step.label}</span>
                </button>
                {index < STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <Separator />

        {/* Step Content */}
        <ScrollArea className="flex-1 px-1">
          <div className="py-4">
            {currentStep === 'basics' && (
              <BasicsStep
                data={data}
                updateData={updateData}
                projectName={projectName}
              />
            )}
            {currentStep === 'drawings' && (
              <DrawingsStep
                data={data}
                filteredDrawings={filteredDrawings}
                selectedDrawings={selectedDrawings}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                disciplineFilter={disciplineFilter}
                setDisciplineFilter={setDisciplineFilter}
                toggleDrawing={toggleDrawing}
                selectAllFiltered={selectAllFiltered}
                clearSelection={clearSelection}
              />
            )}
            {currentStep === 'settings' && (
              <SettingsStep data={data} updateData={updateData} />
            )}
            {currentStep === 'review' && (
              <ReviewStep data={data} selectedDrawings={selectedDrawings} />
            )}
          </div>
        </ScrollArea>

        <Separator />

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          {currentStepIndex > 0 && (
            <Button variant="outline" onClick={handleBack} disabled={isLoading}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
          {currentStepIndex < STEPS.length - 1 ? (
            <Button onClick={handleNext} disabled={!canProceed}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={!canProceed || isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Package
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// STEP COMPONENTS
// ============================================================================

interface BasicsStepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  projectName?: string;
}

function BasicsStep({ data, updateData, projectName }: BasicsStepProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Package Name *</Label>
          <Input
            id="name"
            value={data.name}
            onChange={(e) => updateData({ name: e.target.value })}
            placeholder="e.g., Bid Set - Phase 1"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="packageType">Package Type *</Label>
          <Select
            value={data.packageType}
            onValueChange={(value) => updateData({ packageType: value as DrawingPackageType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DRAWING_PACKAGE_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex flex-col">
                    <span>{type.label}</span>
                    <span className="text-xs text-muted-foreground">{type.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={data.description}
            onChange={(e) => updateData({ description: e.target.value })}
            placeholder="Describe the purpose of this drawing package..."
            rows={3}
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-sm font-medium">Cover Sheet Information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="coverSheetTitle">Cover Sheet Title</Label>
            <Input
              id="coverSheetTitle"
              value={data.coverSheetTitle}
              onChange={(e) => updateData({ coverSheetTitle: e.target.value })}
              placeholder={projectName || 'Project Name'}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coverSheetSubtitle">Cover Sheet Subtitle</Label>
            <Input
              id="coverSheetSubtitle"
              value={data.coverSheetSubtitle}
              onChange={(e) => updateData({ coverSheetSubtitle: e.target.value })}
              placeholder="e.g., Construction Documents"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="coverSheetNotes">Cover Sheet Notes</Label>
          <Textarea
            id="coverSheetNotes"
            value={data.coverSheetNotes}
            onChange={(e) => updateData({ coverSheetNotes: e.target.value })}
            placeholder="Additional notes to appear on the cover sheet..."
            rows={2}
          />
        </div>
      </div>
    </div>
  );
}

interface DrawingsStepProps {
  data: WizardData;
  filteredDrawings: Drawing[];
  selectedDrawings: Drawing[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  disciplineFilter: DrawingDiscipline | 'all';
  setDisciplineFilter: (discipline: DrawingDiscipline | 'all') => void;
  toggleDrawing: (id: string) => void;
  selectAllFiltered: () => void;
  clearSelection: () => void;
}

function DrawingsStep({
  data,
  filteredDrawings,
  selectedDrawings,
  searchQuery,
  setSearchQuery,
  disciplineFilter,
  setDisciplineFilter,
  toggleDrawing,
  selectAllFiltered,
  clearSelection,
}: DrawingsStepProps) {
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search drawings..."
            className="pl-9"
          />
        </div>
        <Select
          value={disciplineFilter}
          onValueChange={(value) => setDisciplineFilter(value as DrawingDiscipline | 'all')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All disciplines" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Disciplines</SelectItem>
            {DRAWING_DISCIPLINES.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Selection Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={selectAllFiltered}>
            Select All Visible
          </Button>
          {data.selectedDrawingIds.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear Selection
            </Button>
          )}
        </div>
        <Badge variant="secondary">
          {data.selectedDrawingIds.length} selected
        </Badge>
      </div>

      {/* Drawing List */}
      <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
        {filteredDrawings.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No drawings found matching your criteria
          </div>
        ) : (
          filteredDrawings.map((drawing) => {
            const isSelected = data.selectedDrawingIds.includes(drawing.id);
            const discipline = DRAWING_DISCIPLINES.find((d) => d.value === drawing.discipline);
            return (
              <label
                key={drawing.id}
                className={cn(
                  'flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors',
                  isSelected && 'bg-primary/5'
                )}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleDrawing(drawing.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">
                      {drawing.drawingNumber}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {discipline?.prefix || drawing.discipline}
                    </Badge>
                    {drawing.currentRevision && (
                      <Badge variant="secondary" className="text-xs">
                        Rev {drawing.currentRevision}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{drawing.title}</p>
                </div>
              </label>
            );
          })
        )}
      </div>

      {/* Selected Summary */}
      {selectedDrawings.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="text-sm font-medium mb-2">Selected Drawings</h4>
          <div className="flex flex-wrap gap-2">
            {selectedDrawings.map((drawing) => (
              <Badge
                key={drawing.id}
                variant="secondary"
                className="flex items-center gap-1"
              >
                {drawing.drawingNumber}
                <button
                  onClick={() => toggleDrawing(drawing.id)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface SettingsStepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
}

function SettingsStep({ data, updateData }: SettingsStepProps) {
  return (
    <div className="space-y-6">
      {/* Content Options */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Package Contents</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <Checkbox
              checked={data.includeCoverSheet}
              onCheckedChange={(checked) => updateData({ includeCoverSheet: !!checked })}
            />
            <div>
              <span className="text-sm font-medium">Include Cover Sheet</span>
              <p className="text-xs text-muted-foreground">
                Generate a cover page with project and package information
              </p>
            </div>
          </label>
          <label className="flex items-center gap-3">
            <Checkbox
              checked={data.includeToc}
              onCheckedChange={(checked) => updateData({ includeToc: !!checked })}
            />
            <div>
              <span className="text-sm font-medium">Include Table of Contents</span>
              <p className="text-xs text-muted-foreground">
                Generate a listing of all drawings in the package
              </p>
            </div>
          </label>
          <label className="flex items-center gap-3">
            <Checkbox
              checked={data.includeRevisionHistory}
              onCheckedChange={(checked) => updateData({ includeRevisionHistory: !!checked })}
            />
            <div>
              <span className="text-sm font-medium">Include Revision History</span>
              <p className="text-xs text-muted-foreground">
                Include revision history for each drawing
              </p>
            </div>
          </label>
        </div>
      </div>

      <Separator />

      {/* Distribution Options */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Distribution Settings</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <Checkbox
              checked={data.allowDownload}
              onCheckedChange={(checked) => updateData({ allowDownload: !!checked })}
            />
            <div>
              <span className="text-sm font-medium">Allow Download</span>
              <p className="text-xs text-muted-foreground">
                Recipients can download the complete package
              </p>
            </div>
          </label>
          <label className="flex items-center gap-3">
            <Checkbox
              checked={data.requireAcknowledgment}
              onCheckedChange={(checked) => updateData({ requireAcknowledgment: !!checked })}
            />
            <div>
              <span className="text-sm font-medium">Require Acknowledgment</span>
              <p className="text-xs text-muted-foreground">
                Recipients must acknowledge receipt of the package
              </p>
            </div>
          </label>
        </div>

        {data.requireAcknowledgment && (
          <div className="ml-7 space-y-2">
            <Label htmlFor="acknowledgmentDeadline">Acknowledgment Deadline</Label>
            <Input
              id="acknowledgmentDeadline"
              type="datetime-local"
              value={data.acknowledgmentDeadline}
              onChange={(e) => updateData({ acknowledgmentDeadline: e.target.value })}
            />
          </div>
        )}
      </div>

      <Separator />

      {/* Security Options */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Security</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="downloadExpiresAt">Access Expiration (optional)</Label>
            <Input
              id="downloadExpiresAt"
              type="datetime-local"
              value={data.downloadExpiresAt}
              onChange={(e) => updateData({ downloadExpiresAt: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Recipients will not be able to access the package after this date
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="accessPassword">Access Password (optional)</Label>
            <Input
              id="accessPassword"
              type="password"
              value={data.accessPassword}
              onChange={(e) => updateData({ accessPassword: e.target.value })}
              placeholder="Leave empty for no password"
            />
            <p className="text-xs text-muted-foreground">
              Recipients will need to enter this password to access the package
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ReviewStepProps {
  data: WizardData;
  selectedDrawings: Drawing[];
}

function ReviewStep({ data, selectedDrawings }: ReviewStepProps) {
  const packageType = DRAWING_PACKAGE_TYPES.find((t) => t.value === data.packageType);

  // Group drawings by discipline
  const drawingsByDiscipline = selectedDrawings.reduce((acc, drawing) => {
    const discipline = DRAWING_DISCIPLINES.find((d) => d.value === drawing.discipline);
    const label = discipline?.label || 'Other';
    if (!acc[label]) {acc[label] = [];}
    acc[label].push(drawing);
    return acc;
  }, {} as Record<string, Drawing[]>);

  return (
    <div className="space-y-6">
      {/* Package Summary */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Package Name</p>
            <p className="font-medium">{data.name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Package Type</p>
            <Badge style={{ backgroundColor: `var(--${packageType?.color}-500)` }}>
              {packageType?.label}
            </Badge>
          </div>
          {data.description && (
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">Description</p>
              <p className="text-sm">{data.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Drawings Summary */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">
          {selectedDrawings.length} Drawing{selectedDrawings.length !== 1 ? 's' : ''} Included
        </h3>
        {Object.entries(drawingsByDiscipline).map(([discipline, drawings]) => (
          <div key={discipline} className="border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{discipline}</span>
              <Badge variant="secondary">{drawings.length}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {drawings.map((d) => d.drawingNumber).join(', ')}
            </div>
          </div>
        ))}
      </div>

      {/* Settings Summary */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Package Settings</h3>
        <div className="grid gap-2 text-sm">
          <div className="flex items-center gap-2">
            {data.includeCoverSheet ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <X className="h-4 w-4 text-muted-foreground" />
            )}
            <span>Cover Sheet</span>
          </div>
          <div className="flex items-center gap-2">
            {data.includeToc ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <X className="h-4 w-4 text-muted-foreground" />
            )}
            <span>Table of Contents</span>
          </div>
          <div className="flex items-center gap-2">
            {data.includeRevisionHistory ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <X className="h-4 w-4 text-muted-foreground" />
            )}
            <span>Revision History</span>
          </div>
          <div className="flex items-center gap-2">
            {data.allowDownload ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <X className="h-4 w-4 text-muted-foreground" />
            )}
            <span>Downloads Allowed</span>
          </div>
          <div className="flex items-center gap-2">
            {data.requireAcknowledgment ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <X className="h-4 w-4 text-muted-foreground" />
            )}
            <span>
              Acknowledgment Required
              {data.acknowledgmentDeadline && ` (by ${new Date(data.acknowledgmentDeadline).toLocaleDateString()})`}
            </span>
          </div>
          {data.downloadExpiresAt && (
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-yellow-500" />
              <span>
                Access expires {new Date(data.downloadExpiresAt).toLocaleDateString()}
              </span>
            </div>
          )}
          {data.accessPassword && (
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-yellow-500" />
              <span>Password protected</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
