// File: /src/components/offline/SyncProgressBar.tsx
// Linear progress bar for sync operations with detailed information

import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pause, Play, X, Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SyncManager } from '@/lib/offline/sync-manager';
import { formatDistanceToNow } from 'date-fns';

interface SyncProgressBarProps {
  className?: string;
  showDetails?: boolean;
  onCancel?: () => void;
}

/**
 * Sync progress bar component
 * Features:
 * - Linear progress bar
 * - Current item / total items counter
 * - Percentage complete
 * - Estimated time remaining
 * - Pause/Resume buttons (if supported)
 * - Cancel button
 */
export function SyncProgressBar({
  className,
  showDetails = true,
  onCancel,
}: SyncProgressBarProps) {
  const [syncState, setSyncState] = useState<{
    current: number;
    total: number;
    percentage: number;
    estimatedTimeRemaining: number | null;
    startTime: number | null;
    paused: boolean;
  }>({
    current: 0,
    total: 0,
    percentage: 0,
    estimatedTimeRemaining: null,
    startTime: null,
    paused: false,
  });

  useEffect(() => {
    // Poll sync manager for status updates
    const interval = setInterval(() => {
      const status = SyncManager.getStatus();

      if (status.currentBatch) {
        const completed = status.currentBatch.items.filter(i => i.status === 'completed').length;
        const total = status.currentBatch.items.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Calculate estimated time remaining
        let estimatedTimeRemaining: number | null = null;
        if (syncState.startTime && completed > 0) {
          const elapsed = Date.now() - syncState.startTime;
          const avgTimePerItem = elapsed / completed;
          const remaining = total - completed;
          estimatedTimeRemaining = Math.round(avgTimePerItem * remaining);
        }

        setSyncState(prev => ({
          current: completed,
          total,
          percentage,
          estimatedTimeRemaining,
          startTime: prev.startTime || Date.now(),
          paused: prev.paused,
        }));
      } else if (syncState.total > 0) {
        // Batch completed, reset
        setSyncState({
          current: 0,
          total: 0,
          percentage: 0,
          estimatedTimeRemaining: null,
          startTime: null,
          paused: false,
        });
      }
    }, 500);

    return () => clearInterval(interval);
  }, [syncState.startTime]);

  const handlePauseResume = () => {
    // This would require implementing pause/resume in SyncManager
    setSyncState(prev => ({ ...prev, paused: !prev.paused }));
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      // Default: stop sync (would need to implement in SyncManager)
      setSyncState({
        current: 0,
        total: 0,
        percentage: 0,
        estimatedTimeRemaining: null,
        startTime: null,
        paused: false,
      });
    }
  };

  const formatTimeRemaining = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Don't render if not syncing
  if (syncState.total === 0) {
    return null;
  }

  return (
    <Card className={cn('border-blue-200 bg-blue-50/50 dark:bg-blue-950/20', className)}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h4 className="font-medium text-sm" className="heading-card">Syncing Changes</h4>
            </div>
            <div className="flex items-center gap-1">
              {/* Pause/Resume button - disabled for now as it requires SyncManager support */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePauseResume}
                className="h-7 w-7 p-0"
                disabled
                title="Pause/Resume (coming soon)"
              >
                {syncState.paused ? (
                  <Play className="h-3 w-3" />
                ) : (
                  <Pause className="h-3 w-3" />
                )}
              </Button>

              {/* Cancel button */}
              {onCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  className="h-7 w-7 p-0"
                  title="Cancel sync"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <Progress value={syncState.percentage} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {syncState.current} of {syncState.total} items
              </span>
              <span className="font-medium text-primary">
                {syncState.percentage}%
              </span>
            </div>
          </div>

          {/* Details */}
          {showDetails && (
            <div className="flex items-center justify-between text-xs">
              {syncState.estimatedTimeRemaining !== null ? (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>~{formatTimeRemaining(syncState.estimatedTimeRemaining)} remaining</span>
                </div>
              ) : (
                <span className="text-muted-foreground">Calculating time remaining...</span>
              )}

              {syncState.paused && (
                <span className="text-warning font-medium">Paused</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
