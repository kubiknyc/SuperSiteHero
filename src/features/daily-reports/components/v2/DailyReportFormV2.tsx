/**
 * DailyReportFormV2 - Main form component with mode toggle
 * Supports Quick Mode (fast entry) and Detailed Mode (full options)
 *
 * Tablet Optimizations:
 * - Side-by-side sections on landscape orientation
 * - Larger input fields for touch interaction
 * - Multi-column form layout on tablets
 * - Better use of horizontal space
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
import { useResponsiveLayout, useOrientation } from '@/hooks/useOrientation';
import { cn } from '@/lib/utils';
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

  const layout = useResponsiveLayout();
  const { isTouchDevice, isTablet } = useOrientation();

  const handleSwitchToDetailed = useCallback(() => {
    setFormMode('detailed');
  }, []);

  const handleSwitchToQuick = useCallback(() => {
    setFormMode('quick');
  }, []);

  // Determine layout configurations based on device
  const isTabletLandscape = layout === 'tablet-landscape';
  const isTabletOrDesktop = layout === 'tablet-portrait' || layout === 'tablet-landscape' || layout === 'desktop';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation - Optimized for tablets */}
      <div className="bg-white border-b sticky top-0 z-30">
        <div className={cn(
          'mx-auto px-4 py-3',
          // Wider container on tablets
          isTabletOrDesktop ? 'max-w-5xl tablet:px-6' : 'max-w-4xl'
        )}>
          <div className="flex items-center justify-between">
            {/* Back Button and Title */}
            <div className="flex items-center gap-3">
              {onBack && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className={cn(
                    // Larger touch target on tablets
                    isTouchDevice && 'min-h-touch min-w-touch'
                  )}
                >
                  <ChevronLeft className={cn(
                    'mr-1',
                    isTablet ? 'h-5 w-5' : 'h-4 w-4'
                  )} />
                  Back
                </Button>
              )}
              <div>
                <h1 className={cn(
                  'font-semibold',
                  // Larger title on tablets
                  isTabletOrDesktop ? 'text-xl' : 'text-lg'
                )}>
                  Daily Report
                </h1>
                {projectName && (
                  <p className={cn(
                    'text-gray-600',
                    isTabletOrDesktop ? 'text-base' : 'text-sm'
                  )}>
                    {projectName}
                  </p>
                )}
              </div>
            </div>

            {/* Mode Toggle - Larger on tablets */}
            <div className={cn(
              'flex items-center gap-2 p-1 bg-gray-100 rounded-lg',
              isTablet && 'p-1.5'
            )}>
              <button
                type="button"
                onClick={handleSwitchToQuick}
                className={cn(
                  'flex items-center gap-1.5 rounded-md font-medium transition-colors',
                  // Larger touch targets on tablets
                  isTablet ? 'px-4 py-2 text-base min-h-touch' : 'px-3 py-1.5 text-sm',
                  formMode === 'quick'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                <Zap className={isTablet ? 'h-5 w-5' : 'h-4 w-4'} />
                Quick
              </button>
              <button
                type="button"
                onClick={handleSwitchToDetailed}
                className={cn(
                  'flex items-center gap-1.5 rounded-md font-medium transition-colors',
                  isTablet ? 'px-4 py-2 text-base min-h-touch' : 'px-3 py-1.5 text-sm',
                  formMode === 'detailed'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                <FileText className={isTablet ? 'h-5 w-5' : 'h-4 w-4'} />
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
// Now with tablet-optimized layout
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
  const layout = useResponsiveLayout();
  const { isTablet, isTouchDevice } = useOrientation();

  const isTabletLandscape = layout === 'tablet-landscape';
  const isTabletOrDesktop = layout === 'tablet-portrait' || layout === 'tablet-landscape' || layout === 'desktop';

  return (
    <div className={cn(
      'mx-auto p-4',
      // Wider container and more padding on tablets
      isTabletOrDesktop ? 'max-w-5xl tablet:p-6' : 'max-w-4xl'
    )}>
      <div className={cn(
        'bg-white rounded-lg shadow-sm border text-center',
        // More padding on tablets
        isTablet ? 'p-10' : 'p-8'
      )}>
        <FileText className={cn(
          'mx-auto text-gray-400 mb-4',
          isTablet ? 'h-16 w-16' : 'h-12 w-12'
        )} />
        <h2 className={cn(
          'font-semibold mb-2',
          isTablet ? 'text-2xl' : 'text-xl'
        )}>
          Detailed Mode
        </h2>
        <p className={cn(
          'text-gray-600 mb-4',
          isTablet && 'text-lg'
        )}>
          Full form with all sections including safety incidents, inspections,
          T&M work, progress tracking, and more.
        </p>
        <p className={cn(
          'text-gray-500 mb-6',
          isTablet ? 'text-base' : 'text-sm'
        )}>
          Coming soon! For now, use Quick Mode for fast daily report entry.
        </p>
        <Button
          onClick={onSwitchToQuick}
          className={cn(
            // Larger button on tablets
            isTouchDevice && 'min-h-touch px-6'
          )}
        >
          <Zap className={isTablet ? 'h-5 w-5 mr-2' : 'h-4 w-4 mr-2'} />
          Switch to Quick Mode
        </Button>
      </div>
    </div>
  );
}

export default DailyReportFormV2;
