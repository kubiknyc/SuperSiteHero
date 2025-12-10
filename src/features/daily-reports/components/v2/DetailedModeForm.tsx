/**
 * DetailedModeForm - Full detailed entry form for daily reports
 * Extends Quick Mode with additional construction-industry sections
 * for comprehensive documentation, OSHA compliance, and claims defense
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// Quick Mode sections (reused)
import { HeaderBar } from './HeaderBar';
import { WorkSummarySection } from './WorkSummarySection';
import { WorkforceGrid } from './WorkforceGrid';
import { EquipmentGrid } from './EquipmentGrid';
import { DelayEntrySection } from './DelayEntry';
import { StickyFooter } from './StickyFooter';

// Detailed Mode sections
import { SafetyIncidentsSection } from './SafetyIncidentsSection';
import { InspectionsSection } from './InspectionsSection';
import { TMWorkSection } from './TMWorkSection';
import { ProgressSection } from './ProgressSection';
import { DeliveriesSection } from './DeliveriesSection';
import { VisitorsSection } from './VisitorsSection';
import { PhotosSection } from './PhotosSection';

// Store and hooks
import { useDailyReportStoreV2 } from '../../store/dailyReportStoreV2';
import { useSaveDailyReportV2, useSubmitReportV2 } from '../../hooks/useDailyReportsV2';
import { detailedModeFormSchema } from '../../validation/dailyReportSchemaV2';
import type { DailyReportV2 } from '@/types/daily-reports-v2';

interface DetailedModeFormProps {
  projectId: string;
  reportDate: string;
  existingReport?: DailyReportV2;
  onSwitchToQuick?: () => void;
}

export function DetailedModeForm({
  projectId,
  reportDate,
  existingReport,
  onSwitchToQuick,
}: DetailedModeFormProps) {
  const navigate = useNavigate();

  // Store state
  const draftReport = useDailyReportStoreV2((state) => state.draftReport);
  const workforce = useDailyReportStoreV2((state) => state.workforce);
  const equipment = useDailyReportStoreV2((state) => state.equipment);
  const delays = useDailyReportStoreV2((state) => state.delays);
  const safetyIncidents = useDailyReportStoreV2((state) => state.safetyIncidents);
  const inspections = useDailyReportStoreV2((state) => state.inspections);
  const tmWork = useDailyReportStoreV2((state) => state.tmWork);
  const progress = useDailyReportStoreV2((state) => state.progress);
  const deliveries = useDailyReportStoreV2((state) => state.deliveries);
  const visitors = useDailyReportStoreV2((state) => state.visitors);
  const photos = useDailyReportStoreV2((state) => state.photos);
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
  const validateForm = useCallback(() => {
    if (!draftReport) {
      return ['No draft report found'];
    }

    const errors: string[] = [];

    // Basic validation
    if (!draftReport.work_summary?.trim()) {
      errors.push('Work summary is required');
    }

    if (workforce.length === 0) {
      errors.push('At least one workforce entry is required');
    }

    const workersWithoutCount = workforce.filter((w) => !w.worker_count || w.worker_count < 1);
    if (workersWithoutCount.length > 0) {
      errors.push('All workforce entries must have at least 1 worker');
    }

    // Safety incident validation
    const incompleteIncidents = safetyIncidents.filter((i) => !i.description?.trim());
    if (incompleteIncidents.length > 0) {
      errors.push('All safety incidents must have a description');
    }

    // T&M work validation
    const tmWithoutDescription = tmWork.filter((t) => !t.description?.trim());
    if (tmWithoutDescription.length > 0) {
      errors.push('All T&M work entries must have a description');
    }

    return errors;
  }, [draftReport, workforce, safetyIncidents, tmWork]);

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
          report: { ...draftReport, mode: 'detailed' },
          workforce,
          equipment,
          delays,
          safety_incidents: safetyIncidents,
          inspections,
          tm_work: tmWork,
          progress,
          deliveries,
          visitors,
          photos,
        },
      });
      setSyncStatus('success');
      toast.success('Report saved successfully');
    } catch (error) {
      setSyncStatus('error');
      toast.error('Failed to save report');
      throw error;
    }
  }, [
    draftReport,
    workforce,
    equipment,
    delays,
    safetyIncidents,
    inspections,
    tmWork,
    progress,
    deliveries,
    visitors,
    photos,
    saveMutation,
    setSyncStatus,
  ]);

  // Handle submit
  const handleSubmit = useCallback(() => {
    const errors = validateForm();
    if (errors.length > 0) {
      setValidationErrors(errors);
      toast.error('Please fix validation errors before submitting');
      return;
    }

    // TODO: Open signature dialog
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

  // Section toggle handlers - Quick Mode sections
  const handleToggleWorkSummary = useCallback(() => toggleSection('workSummary'), [toggleSection]);
  const handleToggleWorkforce = useCallback(() => toggleSection('workforce'), [toggleSection]);
  const handleToggleEquipment = useCallback(() => toggleSection('equipment'), [toggleSection]);
  const handleToggleDelays = useCallback(() => toggleSection('delays'), [toggleSection]);

  // Section toggle handlers - Detailed Mode sections
  const handleToggleSafety = useCallback(() => toggleSection('safety'), [toggleSection]);
  const handleToggleInspections = useCallback(() => toggleSection('inspections'), [toggleSection]);
  const handleToggleTMWork = useCallback(() => toggleSection('tmWork'), [toggleSection]);
  const handleToggleProgress = useCallback(() => toggleSection('progress'), [toggleSection]);
  const handleToggleDeliveries = useCallback(() => toggleSection('deliveries'), [toggleSection]);
  const handleToggleVisitors = useCallback(() => toggleSection('visitors'), [toggleSection]);
  const handleTogglePhotos = useCallback(() => toggleSection('photos'), [toggleSection]);

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
        {/* === Quick Mode Sections (always visible) === */}

        {/* Work Summary Section */}
        <WorkSummarySection
          expanded={expandedSections.workSummary}
          onToggle={handleToggleWorkSummary}
        />

        {/* Workforce Grid */}
        <WorkforceGrid
          expanded={expandedSections.workforce}
          onToggle={handleToggleWorkforce}
        />

        {/* Equipment Grid */}
        <EquipmentGrid
          expanded={expandedSections.equipment}
          onToggle={handleToggleEquipment}
        />

        {/* Delays Section */}
        <DelayEntrySection
          expanded={expandedSections.delays}
          onToggle={handleToggleDelays}
        />

        {/* === Detailed Mode Sections === */}

        {/* Safety Incidents Section */}
        <SafetyIncidentsSection
          expanded={expandedSections.safety}
          onToggle={handleToggleSafety}
        />

        {/* Inspections Section */}
        <InspectionsSection
          expanded={expandedSections.inspections}
          onToggle={handleToggleInspections}
        />

        {/* T&M Work Section */}
        <TMWorkSection
          expanded={expandedSections.tmWork}
          onToggle={handleToggleTMWork}
        />

        {/* Progress Section */}
        <ProgressSection
          expanded={expandedSections.progress}
          onToggle={handleToggleProgress}
        />

        {/* Deliveries Section */}
        <DeliveriesSection
          expanded={expandedSections.deliveries}
          onToggle={handleToggleDeliveries}
        />

        {/* Visitors Section */}
        <VisitorsSection
          expanded={expandedSections.visitors}
          onToggle={handleToggleVisitors}
        />

        {/* Photos Section */}
        <PhotosSection
          expanded={expandedSections.photos}
          onToggle={handleTogglePhotos}
        />

        {/* Mode Switch Link */}
        {onSwitchToQuick && (
          <div className="text-center py-4">
            <button
              type="button"
              onClick={onSwitchToQuick}
              className="text-blue-600 hover:text-blue-800 text-sm underline"
            >
              Need faster entry? Switch to Quick Mode
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

export default DetailedModeForm;
