/**
 * BatchUploadProgress - Batch photo upload progress indicator
 * Shows aggregate progress across all photos being uploaded
 */

import { useMemo, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Upload,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { UploadProgress } from '../../hooks/usePhotoUploadManager';

interface BatchUploadProgressProps {
  uploadProgress: Record<string, UploadProgress>;
  isUploading: boolean;
  onCancel?: () => void;
  onRetryFailed?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function BatchUploadProgress({
  uploadProgress,
  isUploading,
  onCancel,
  onRetryFailed,
  onDismiss,
  className = '',
}: BatchUploadProgressProps) {
  const [expanded, setExpanded] = useState(false);

  // Calculate aggregate statistics
  const stats = useMemo(() => {
    const entries = Object.values(uploadProgress);
    if (entries.length === 0) {return null;}

    const total = entries.length;
    const uploaded = entries.filter((p) => p.status === 'uploaded').length;
    const failed = entries.filter((p) => p.status === 'failed').length;
    const pending = entries.filter((p) => p.status === 'pending').length;
    const inProgress = entries.filter(
      (p) => p.status === 'compressing' || p.status === 'extracting' || p.status === 'uploading'
    ).length;

    // Calculate overall progress percentage
    const totalProgress = entries.reduce((sum, p) => sum + p.progress, 0);
    const overallProgress = Math.round(totalProgress / total);

    const isComplete = uploaded + failed === total && total > 0;

    return {
      total,
      uploaded,
      failed,
      pending,
      inProgress,
      overallProgress,
      isComplete,
      entries,
    };
  }, [uploadProgress]);

  // Don't render if no uploads in progress or tracked
  if (!stats || (stats.isComplete && !stats.failed && !expanded)) {
    return null;
  }

  // Get status text
  const getStatusText = () => {
    if (stats.isComplete) {
      if (stats.failed > 0) {
        return `${stats.uploaded} uploaded, ${stats.failed} failed`;
      }
      return `${stats.uploaded} photos uploaded successfully`;
    }
    if (stats.inProgress > 0) {
      return `Uploading ${stats.uploaded + 1} of ${stats.total} photos...`;
    }
    return `${stats.pending} photos pending upload`;
  };

  // Get status color
  const getStatusColor = () => {
    if (stats.isComplete && stats.failed === 0) {return 'bg-success-light border-green-200';}
    if (stats.failed > 0) {return 'bg-error-light border-red-200';}
    return 'bg-blue-50 border-blue-200';
  };

  // Get progress bar color (available for future use)
  const _getProgressColor = () => {
    if (stats.failed > 0) {return 'bg-warning';}
    if (stats.isComplete) {return 'bg-green-500';}
    return 'bg-blue-500';
  };

  return (
    <div className={`rounded-lg border p-3 ${getStatusColor()} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Status Icon */}
          {stats.isComplete && stats.failed === 0 ? (
            <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
          ) : stats.failed > 0 ? (
            <AlertCircle className="h-5 w-5 text-error flex-shrink-0" />
          ) : (
            <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />
          )}

          {/* Status Text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{getStatusText()}</p>
            {!stats.isComplete && (
              <div className="mt-1.5">
                <Progress
                  value={stats.overallProgress}
                  className="h-1.5"
                />
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Retry button for failed */}
          {stats.failed > 0 && onRetryFailed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetryFailed}
              className="h-7 px-2 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Retry
            </Button>
          )}

          {/* Cancel button when uploading */}
          {isUploading && onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-7 px-2 text-xs text-muted"
            >
              Cancel
            </Button>
          )}

          {/* Expand/collapse button */}
          {stats.total > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-7 w-7 p-0"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}

          {/* Dismiss button when complete */}
          {stats.isComplete && onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-7 w-7 p-0 text-disabled hover:text-secondary"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && stats.total > 0 && (
        <div className="mt-3 pt-3 border-t border-current/10">
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {stats.entries.map((entry) => (
              <div
                key={entry.photoId}
                className="flex items-center gap-2 text-xs"
              >
                {/* Status icon */}
                {entry.status === 'uploaded' ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                ) : entry.status === 'failed' ? (
                  <AlertCircle className="h-3.5 w-3.5 text-error" />
                ) : entry.status === 'pending' ? (
                  <Upload className="h-3.5 w-3.5 text-disabled" />
                ) : (
                  <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                )}

                {/* Photo ID (truncated) */}
                <span className="truncate flex-1 text-secondary">
                  Photo {entry.photoId.substring(0, 8)}...
                </span>

                {/* Status/Progress */}
                <span className="text-muted flex-shrink-0">
                  {entry.status === 'uploaded' ? (
                    'Done'
                  ) : entry.status === 'failed' ? (
                    <span className="text-error">{entry.error || 'Failed'}</span>
                  ) : entry.status === 'pending' ? (
                    'Waiting'
                  ) : (
                    `${entry.progress}%`
                  )}
                </span>
              </div>
            ))}
          </div>

          {/* Summary counts */}
          <div className="mt-2 pt-2 border-t border-current/10 flex items-center gap-4 text-xs text-muted">
            {stats.uploaded > 0 && (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-success" />
                {stats.uploaded} uploaded
              </span>
            )}
            {stats.inProgress > 0 && (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 text-primary animate-spin" />
                {stats.inProgress} uploading
              </span>
            )}
            {stats.pending > 0 && (
              <span className="flex items-center gap-1">
                <Upload className="h-3 w-3 text-disabled" />
                {stats.pending} pending
              </span>
            )}
            {stats.failed > 0 && (
              <span className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-error" />
                {stats.failed} failed
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default BatchUploadProgress;
