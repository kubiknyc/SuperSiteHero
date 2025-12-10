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
import { useDailyReportStoreV2 } from '../../store/dailyReportStoreV2';
import { useSaveDailyReportV2, useSubmitReportV2 } from '../../hooks/useDailyReportsV2';
import { quickModeFormSchema } from '../../validation/dailyReportSchemaV2';
import type { DailyReportV2 } from '@/types/daily-reports-v2';

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
    if (!draftReport) return;

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

  // Handle submit
  const handleSubmit = useCallback(() => {
    const errors = validateForm();
    if (errors.length > 0) {
      setValidationErrors(errors);
      toast.error('Please fix validation errors before submitting');
      return;
    }

    // TODO: Open signature dialog
    // For now, just submit
    if (draftReport?.id) {
      submitMutation.mutate(
        { report_id: draftReport.id, submitted_by_signature: 'pending', submitted_by_name: '' },
        {
          onSuccess: () => {
            toast.success('Report submitted for approval');
            navigate(`/projects/${projectId}/daily-reports`);
          },
          onError: () => {
            toast.error('Failed to submit report');
          },
        }
      );
    }
  }, [draftReport, validateForm, submitMutation, navigate, projectId]);

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

  // Copy from yesterday handlers
  const handleCopyWorkforceFromYesterday = useCallback(() => {
    // TODO: Implement copy from yesterday
    toast.info('Copy from yesterday - coming soon!');
  }, []);

  const handleCopyEquipmentFromYesterday = useCallback(() => {
    // TODO: Implement copy from yesterday
    toast.info('Copy from yesterday - coming soon!');
  }, []);

  // Template handlers
  const handleApplyWorkforceTemplate = useCallback(() => {
    // TODO: Implement template picker
    toast.info('Templates - coming soon!');
  }, []);

  const handleApplyEquipmentTemplate = useCallback(() => {
    // TODO: Implement template picker
    toast.info('Templates - coming soon!');
  }, []);

  if (!draftReport) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
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
              className="text-blue-600 hover:text-blue-800 text-sm underline"
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
    </div>
  );
}

export default QuickModeForm;
