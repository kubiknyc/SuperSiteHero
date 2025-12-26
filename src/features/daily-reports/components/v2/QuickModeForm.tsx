/**
 * QuickModeForm - Single-page quick entry form for daily reports
 * Designed for 3-5 minute completion time
 * All sections are collapsible accordion-style
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { HeaderBar } from './HeaderBar';
import { WorkSummarySection } from './WorkSummarySection';
import { WorkforceGrid } from './WorkforceGrid';
import { EquipmentGrid } from './EquipmentGrid';
import { DelayEntrySection } from './DelayEntry';
import { StickyFooter } from './StickyFooter';
import { SignatureCapture } from '../SignatureCapture';
import { TemplateSelectorModal } from './TemplateSelectorModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PenTool } from 'lucide-react';
import { useDailyReportStoreV2 } from '../../store/dailyReportStoreV2';
import { useSaveDailyReportV2, useSubmitReportV2, useTemplates } from '../../hooks/useDailyReportsV2';
import { quickModeFormSchema } from '../../validation/dailyReportSchemaV2';
import { copyFromPreviousDay, applyTemplate } from '../../services/templateService';
import type { DailyReportV2, DailyReportTemplate } from '@/types/daily-reports-v2';
import { logger } from '../../../../lib/utils/logger';


interface QuickModeFormProps {
  projectId: string;
  reportDate: string;
  existingReport?: DailyReportV2;
  onSwitchToDetailed?: () => void;
}

export function QuickModeForm({
  projectId,
  reportDate,
  existingReport,
  onSwitchToDetailed,
}: QuickModeFormProps) {
  const navigate = useNavigate();

  // Store
  const draftReport = useDailyReportStoreV2((state) => state.draftReport);
  const workforce = useDailyReportStoreV2((state) => state.workforce);
  const equipment = useDailyReportStoreV2((state) => state.equipment);
  const delays = useDailyReportStoreV2((state) => state.delays);
  const expandedSections = useDailyReportStoreV2((state) => state.expandedSections);
  const toggleSection = useDailyReportStoreV2((state) => state.toggleSection);
  const initializeDraft = useDailyReportStoreV2((state) => state.initializeDraft);
  const initializeFromExisting = useDailyReportStoreV2((state) => state.initializeFromExisting);
  const setSyncStatus = useDailyReportStoreV2((state) => state.setSyncStatus);

  // Mutations
  const saveMutation = useSaveDailyReportV2();
  const submitMutation = useSubmitReportV2();

  // Local state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [signerName, setSignerName] = useState('');
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateModalType, setTemplateModalType] = useState<'workforce' | 'equipment' | 'both'>('both');
  const [isCopyingFromYesterday, setIsCopyingFromYesterday] = useState(false);

  // Fetch templates for the project
  const { data: templates = [] } = useTemplates(projectId);

  // Initialize draft on mount
  useEffect(() => {
    if (existingReport) {
      initializeFromExisting(existingReport);
    } else if (!draftReport || draftReport.project_id !== projectId || draftReport.report_date !== reportDate) {
      initializeDraft(projectId, reportDate);
    }
  }, [projectId, reportDate, existingReport, draftReport, initializeDraft, initializeFromExisting]);

  // Validate form
  const validateForm = useCallback((): string[] => {
    if (!draftReport) {
      return [];  // Return empty array when draft not ready yet
    }

    const formData = {
      work_summary: draftReport.work_summary,
      work_planned_tomorrow: draftReport.work_planned_tomorrow,
      weather_condition: draftReport.weather_condition,
      temperature_high: draftReport.temperature_high,
    };

    const result = quickModeFormSchema.safeParse(formData);
    if (!result.success && result.error?.issues) {
      return result.error.issues.map((e: { message: string }) => e.message);
    }

    // Additional validation
    const errors: string[] = [];

    const safeWorkforce = workforce || [];
    if (safeWorkforce.length === 0) {
      errors.push('At least one workforce entry is required');
    }

    const workersWithoutCount = safeWorkforce.filter((w) => !w.worker_count || w.worker_count < 1);
    if (workersWithoutCount.length > 0) {
      errors.push('All workforce entries must have at least 1 worker');
    }

    return errors;
  }, [draftReport, workforce]);

  // Update validation errors when form changes
  useEffect(() => {
    const errors = validateForm();
    setValidationErrors(errors);
  }, [validateForm]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!draftReport) {return;}

    setSyncStatus('syncing');
    try {
      await saveMutation.mutateAsync({
        reportId: draftReport.id,
        data: {
          report: draftReport,
          workforce,
          equipment,
          delays,
        },
      });
      setSyncStatus('success');
      toast.success('Report saved successfully');
    } catch (error) {
      setSyncStatus('error');
      toast.error('Failed to save report');
      throw error;
    }
  }, [draftReport, workforce, equipment, delays, saveMutation, setSyncStatus]);

  // Handle submit - opens signature dialog
  const handleSubmit = useCallback(() => {
    const errors = validateForm();
    if (errors.length > 0) {
      setValidationErrors(errors);
      toast.error('Please fix validation errors before submitting');
      return;
    }

    // Open signature dialog instead of immediate submit
    setSignatureDialogOpen(true);
  }, [validateForm]);

  // Handle actual submission after signature captured
  const handleConfirmSubmit = useCallback(() => {
    if (!signature || !signerName.trim()) {
      toast.error('Please provide your signature and name');
      return;
    }

    if (draftReport?.id) {
      submitMutation.mutate(
        {
          report_id: draftReport.id,
          submitted_by_signature: signature,
          submitted_by_name: signerName.trim(),
        },
        {
          onSuccess: () => {
            setSignatureDialogOpen(false);
            setSignature(null);
            setSignerName('');
            toast.success('Report submitted for approval');
            navigate(`/projects/${projectId}/daily-reports`);
          },
          onError: () => {
            toast.error('Failed to submit report');
          },
        }
      );
    }
  }, [draftReport, signature, signerName, submitMutation, navigate, projectId]);

  // Handle signature dialog close
  const handleSignatureDialogClose = useCallback(() => {
    setSignatureDialogOpen(false);
    setSignature(null);
    setSignerName('');
  }, []);

  // Section toggle handlers
  const handleToggleWorkSummary = useCallback(
    () => toggleSection('workSummary'),
    [toggleSection]
  );
  const handleToggleWorkforce = useCallback(
    () => toggleSection('workforce'),
    [toggleSection]
  );
  const handleToggleEquipment = useCallback(
    () => toggleSection('equipment'),
    [toggleSection]
  );
  const handleToggleDelays = useCallback(
    () => toggleSection('delays'),
    [toggleSection]
  );

  // Store actions for applying data
  const applyPreviousDayData = useDailyReportStoreV2((state) => state.applyPreviousDayData);
  const applyTemplateToStore = useDailyReportStoreV2((state) => state.applyTemplate);

  // Copy from yesterday handlers
  const handleCopyWorkforceFromYesterday = useCallback(async () => {
    if (!draftReport || isCopyingFromYesterday) {return;}

    setIsCopyingFromYesterday(true);
    try {
      const data = await copyFromPreviousDay(projectId, reportDate);
      if (data && data.workforce.length > 0) {
        applyPreviousDayData({ workforce: data.workforce as any });
        toast.success(`Copied ${data.workforce.length} workforce entries from yesterday`);
      } else {
        toast.info('No workforce entries found from yesterday');
      }
    } catch (error) {
      logger.error('Failed to copy from yesterday:', error);
      toast.error('Failed to copy workforce from yesterday');
    } finally {
      setIsCopyingFromYesterday(false);
    }
  }, [draftReport, isCopyingFromYesterday, projectId, reportDate, applyPreviousDayData]);

  const handleCopyEquipmentFromYesterday = useCallback(async () => {
    if (!draftReport || isCopyingFromYesterday) {return;}

    setIsCopyingFromYesterday(true);
    try {
      const data = await copyFromPreviousDay(projectId, reportDate);
      if (data && data.equipment.length > 0) {
        applyPreviousDayData({ equipment: data.equipment as any });
        toast.success(`Copied ${data.equipment.length} equipment entries from yesterday`);
      } else {
        toast.info('No equipment entries found from yesterday');
      }
    } catch (error) {
      logger.error('Failed to copy from yesterday:', error);
      toast.error('Failed to copy equipment from yesterday');
    } finally {
      setIsCopyingFromYesterday(false);
    }
  }, [draftReport, isCopyingFromYesterday, projectId, reportDate, applyPreviousDayData]);

  // Template handlers
  const handleApplyWorkforceTemplate = useCallback(() => {
    setTemplateModalType('workforce');
    setTemplateModalOpen(true);
  }, []);

  const handleApplyEquipmentTemplate = useCallback(() => {
    setTemplateModalType('equipment');
    setTemplateModalOpen(true);
  }, []);

  // Handle template selection from modal
  const handleTemplateSelect = useCallback((template: DailyReportTemplate) => {
    const templateData = applyTemplate(template);

    if (templateModalType === 'workforce' && templateData.workforce.length > 0) {
      applyTemplateToStore({ workforce: templateData.workforce });
      toast.success(`Applied ${templateData.workforce.length} workforce entries from template "${template.name}"`);
    } else if (templateModalType === 'equipment' && templateData.equipment.length > 0) {
      applyTemplateToStore({ equipment: templateData.equipment });
      toast.success(`Applied ${templateData.equipment.length} equipment entries from template "${template.name}"`);
    } else if (templateModalType === 'both') {
      applyTemplateToStore(templateData);
      const counts = [];
      if (templateData.workforce.length > 0) {counts.push(`${templateData.workforce.length} workforce`);}
      if (templateData.equipment.length > 0) {counts.push(`${templateData.equipment.length} equipment`);}
      toast.success(`Applied ${counts.join(' and ')} entries from template "${template.name}"`);
    } else {
      toast.info('Template has no entries for the selected type');
    }

    setTemplateModalOpen(false);
  }, [templateModalType, applyTemplateToStore]);

  if (!draftReport) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* Sticky Header */}
      <HeaderBar />

      {/* Form Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Work Summary Section */}
        <WorkSummarySection
          expanded={expandedSections.workSummary}
          onToggle={handleToggleWorkSummary}
        />

        {/* Workforce Grid */}
        <WorkforceGrid
          expanded={expandedSections.workforce}
          onToggle={handleToggleWorkforce}
          onCopyFromYesterday={handleCopyWorkforceFromYesterday}
          onApplyTemplate={handleApplyWorkforceTemplate}
        />

        {/* Equipment Grid */}
        <EquipmentGrid
          expanded={expandedSections.equipment}
          onToggle={handleToggleEquipment}
          onCopyFromYesterday={handleCopyEquipmentFromYesterday}
          onApplyTemplate={handleApplyEquipmentTemplate}
        />

        {/* Delays Section */}
        <DelayEntrySection
          expanded={expandedSections.delays}
          onToggle={handleToggleDelays}
        />

        {/* Mode Switch Link */}
        {onSwitchToDetailed && (
          <div className="text-center py-4">
            <button
              type="button"
              onClick={onSwitchToDetailed}
              className="text-primary hover:text-blue-800 text-sm underline"
            >
              Need more options? Switch to Detailed Mode
            </button>
          </div>
        )}
      </div>

      {/* Sticky Footer */}
      <StickyFooter
        onSave={handleSave}
        onSubmit={handleSubmit}
        isSaving={saveMutation.isPending}
        isSubmitting={submitMutation.isPending}
        validationErrors={validationErrors}
        disabled={draftReport.status !== 'draft'}
      />

      {/* Signature Dialog */}
      <Dialog open={signatureDialogOpen} onOpenChange={setSignatureDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              Submit Report
            </DialogTitle>
            <DialogDescription>
              Sign below to submit this daily report for approval.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Your Name *</Label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <SignatureCapture
              label="Your Signature *"
              onSave={(sig) => setSignature(sig)}
              onClear={() => setSignature(null)}
              existingSignature={signature || undefined}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleSignatureDialogClose}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSubmit}
              disabled={!signature || !signerName.trim() || submitMutation.isPending}
            >
              {submitMutation.isPending ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Selector Modal */}
      <TemplateSelectorModal
        open={templateModalOpen}
        onOpenChange={setTemplateModalOpen}
        templates={templates}
        filterType={templateModalType}
        onSelect={handleTemplateSelect}
      />
    </div>
  );
}

export default QuickModeForm;
