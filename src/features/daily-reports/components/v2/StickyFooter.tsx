/**
 * StickyFooter - Save/Submit action buttons
 * Always visible at bottom of screen for easy access
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Save,
  Send,
  Loader2,
  Check,
  AlertCircle,
  Cloud,
  CloudOff,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useDailyReportStoreV2 } from '../../store/dailyReportStoreV2';

interface StickyFooterProps {
  onSave: () => Promise<void>;
  onSubmit: () => void;
  isSaving?: boolean;
  isSubmitting?: boolean;
  validationErrors?: string[];
  disabled?: boolean;
}

export function StickyFooter({
  onSave,
  onSubmit,
  isSaving = false,
  isSubmitting = false,
  validationErrors = [],
  disabled = false,
}: StickyFooterProps) {
  const syncStatus = useDailyReportStoreV2((state) => state.syncStatus);
  const draftReport = useDailyReportStoreV2((state) => state.draftReport);

  const [showErrors, setShowErrors] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Listen for online/offline events
  useState(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  });

  const getSyncStatusBadge = () => {
    switch (syncStatus) {
      case 'success':
        return (
          <Badge variant="outline" className="bg-success-light text-success-dark border-green-200">
            <Check className="h-3 w-3 mr-1" />
            Saved
          </Badge>
        );
      case 'idle':
        return (
          <Badge variant="outline" className="bg-warning-light text-yellow-700 border-yellow-200">
            <Cloud className="h-3 w-3 mr-1" />
            Pending Sync
          </Badge>
        );
      case 'syncing':
        return (
          <Badge variant="outline" className="bg-blue-50 text-primary-hover border-blue-200">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Syncing...
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="outline" className="bg-error-light text-error-dark border-red-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Sync Error
          </Badge>
        );
      default:
        return null;
    }
  };

  const canSubmit =
    draftReport?.status === 'draft' &&
    validationErrors.length === 0 &&
    !isSubmitting &&
    !isSaving;

  return (
    <div className="sticky bottom-0 z-20 bg-card border-t shadow-lg">
      {/* Validation Errors */}
      {validationErrors.length > 0 && showErrors && (
        <div className="p-3 bg-error-light border-b border-red-100">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-error mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-error-dark">Please fix the following issues:</p>
              <ul className="mt-1 text-sm text-error list-disc list-inside">
                {validationErrors.slice(0, 3).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
                {validationErrors.length > 3 && (
                  <li>...and {validationErrors.length - 3} more</li>
                )}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setShowErrors(false)}
              className="text-error hover:text-error-dark"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left side: Status indicators */}
          <div className="flex items-center gap-3">
            {/* Online/Offline */}
            {isOnline ? (
              <div className="flex items-center gap-1 text-success text-sm">
                <Wifi className="h-4 w-4" />
                <span className="hidden sm:inline">Online</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-orange-600 text-sm">
                <WifiOff className="h-4 w-4" />
                <span className="hidden sm:inline">Offline</span>
              </div>
            )}

            {/* Sync Status */}
            {getSyncStatusBadge()}

            {/* Validation Errors Count */}
            {validationErrors.length > 0 && (
              <button
                type="button"
                onClick={() => setShowErrors(!showErrors)}
                className="flex items-center gap-1 text-error text-sm hover:underline"
              >
                <AlertCircle className="h-4 w-4" />
                {validationErrors.length} {validationErrors.length === 1 ? 'issue' : 'issues'}
              </button>
            )}
          </div>

          {/* Right side: Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onSave}
              disabled={isSaving || disabled}
              className="min-w-[100px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </>
              )}
            </Button>

            <Button
              type="button"
              onClick={onSubmit}
              disabled={!canSubmit}
              className="min-w-[120px] bg-success hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Report
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Offline Warning */}
        {!isOnline && (
          <div className="mt-2 text-sm text-orange-600 bg-orange-50 px-3 py-2 rounded">
            You're offline. Changes will be saved locally and synced when you're back online.
          </div>
        )}
      </div>
    </div>
  );
}

export default StickyFooter;
