/**
 * DailyReportFormV2 - Main form component with mode toggle
 * Supports Quick Mode (fast entry) and Detailed Mode (full options)
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  FileText,
  ChevronLeft,
} from 'lucide-react';
import { QuickModeForm } from './QuickModeForm';
import { useDailyReportStoreV2 } from '../../store/dailyReportStoreV2';
import type { DailyReportV2, FormMode } from '@/types/daily-reports-v2';

interface DailyReportFormV2Props {
  projectId: string;
  projectName?: string;
  reportDate: string;
  existingReport?: DailyReportV2;
  onBack?: () => void;
}

export function DailyReportFormV2({
  projectId,
  projectName,
  reportDate,
  existingReport,
  onBack,
}: DailyReportFormV2Props) {
  const [formMode, setFormMode] = useState<FormMode>(
    existingReport?.mode || 'quick'
  );

  const handleSwitchToDetailed = useCallback(() => {
    setFormMode('detailed');
  }, []);

  const handleSwitchToQuick = useCallback(() => {
    setFormMode('quick');
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Back Button and Title */}
            <div className="flex items-center gap-3">
              {onBack && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}
              <div>
                <h1 className="font-semibold text-lg">Daily Report</h1>
                {projectName && (
                  <p className="text-sm text-gray-600">{projectName}</p>
                )}
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
              <button
                type="button"
                onClick={handleSwitchToQuick}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  formMode === 'quick'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Zap className="h-4 w-4" />
                Quick
              </button>
              <button
                type="button"
                onClick={handleSwitchToDetailed}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  formMode === 'detailed'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileText className="h-4 w-4" />
                Detailed
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      {formMode === 'quick' ? (
        <QuickModeForm
          projectId={projectId}
          reportDate={reportDate}
          existingReport={existingReport}
          onSwitchToDetailed={handleSwitchToDetailed}
        />
      ) : (
        <DetailedModeForm
          projectId={projectId}
          reportDate={reportDate}
          existingReport={existingReport}
          onSwitchToQuick={handleSwitchToQuick}
        />
      )}
    </div>
  );
}

// Placeholder for detailed mode - will be implemented in Phase 2
function DetailedModeForm({
  projectId,
  reportDate,
  existingReport,
  onSwitchToQuick,
}: {
  projectId: string;
  reportDate: string;
  existingReport?: DailyReportV2;
  onSwitchToQuick: () => void;
}) {
  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Detailed Mode</h2>
        <p className="text-gray-600 mb-4">
          Full form with all sections including safety incidents, inspections,
          T&M work, progress tracking, and more.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Coming soon! For now, use Quick Mode for fast daily report entry.
        </p>
        <Button onClick={onSwitchToQuick}>
          <Zap className="h-4 w-4 mr-2" />
          Switch to Quick Mode
        </Button>
      </div>
    </div>
  );
}

export default DailyReportFormV2;
