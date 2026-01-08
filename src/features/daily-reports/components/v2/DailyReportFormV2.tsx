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
import {
  Zap,
  FileText,
  ChevronLeft,
} from 'lucide-react';
import { QuickModeForm } from './QuickModeForm';
import { DetailedModeForm } from './DetailedModeForm';
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
  const _isTabletLandscape = layout === 'tablet-landscape';
  const isTabletOrDesktop = layout === 'tablet-portrait' || layout === 'tablet-landscape' || layout === 'desktop';

  return (
    <div className="min-h-screen bg-surface">
      {/* Top Navigation - Optimized for tablets */}
      <div className="bg-card border-b sticky top-0 z-30">
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
                    'text-secondary',
                    isTabletOrDesktop ? 'text-base' : 'text-sm'
                  )}>
                    {projectName}
                  </p>
                )}
              </div>
            </div>

            {/* Mode Toggle - Larger on tablets */}
            <div className={cn(
              'flex items-center gap-2 p-1 bg-muted rounded-lg',
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
                    ? 'bg-card text-primary shadow-sm'
                    : 'text-secondary hover:text-foreground'
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
                    ? 'bg-card text-primary shadow-sm'
                    : 'text-secondary hover:text-foreground'
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

export default DailyReportFormV2;
