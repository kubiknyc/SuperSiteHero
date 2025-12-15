// File: src/components/iOSInstallInstructions.tsx
// Standalone iOS PWA installation instructions component
// Provides step-by-step visual guide for installing on iOS Safari

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { X, Plus, Smartphone, Info, ArrowDown, ChevronRight } from 'lucide-react';

/**
 * Safari share icon matching the iOS share button appearance
 */
export function SafariShareIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-4 w-4', className)}
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" x2="12" y1="2" y2="15" />
    </svg>
  );
}

/**
 * Add to Home Screen icon
 */
function AddToHomeScreenIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-4 w-4', className)}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

interface IOSInstallInstructionsPageProps {
  className?: string;
  onClose?: () => void;
  showAsCard?: boolean;
  appName?: string;
}

/**
 * Full-page iOS installation instructions
 * Provides detailed step-by-step visual guide
 */
export function IOSInstallInstructionsPage({
  className,
  onClose,
  showAsCard = true,
  appName = 'JobSight',
}: IOSInstallInstructionsPageProps) {
  const steps = [
    {
      step: 1,
      title: 'Tap the Share Button',
      description: 'Look for the share button at the bottom of Safari (or top on iPad)',
      icon: SafariShareIcon,
      iconColor: 'text-blue-500',
      details: 'The share button looks like a square with an arrow pointing up.',
    },
    {
      step: 2,
      title: 'Scroll to Find "Add to Home Screen"',
      description: 'In the share sheet, scroll down through the options',
      icon: ArrowDown,
      iconColor: 'text-gray-500',
      details: 'You may need to scroll past the app suggestions to find this option.',
    },
    {
      step: 3,
      title: 'Tap "Add to Home Screen"',
      description: 'Look for the option with a plus icon',
      icon: AddToHomeScreenIcon,
      iconColor: 'text-gray-700',
      details: 'This will open a dialog to customize the app name.',
    },
    {
      step: 4,
      title: 'Tap "Add"',
      description: 'Tap the Add button in the top right corner',
      icon: Plus,
      iconColor: 'text-blue-500',
      details: `${appName} will be added to your home screen.`,
    },
  ];

  const content = (
    <div className={cn('space-y-6', className)}>
      {onClose && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-xl">
              <Smartphone className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Install {appName} on iOS</h2>
              <p className="text-sm text-muted-foreground">Follow these steps in Safari</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Safari Requirement Notice */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
        <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium text-amber-800 dark:text-amber-200">Safari Required</p>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Web apps can only be installed using Safari on iOS. If you're using a different browser,
            please open this page in Safari.
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div
              key={step.step}
              className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
            >
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-700 dark:text-blue-300 font-semibold text-sm">
                  {step.step}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={cn('h-5 w-5', step.iconColor)} />
                  <h3 className="font-medium">{step.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                <p className="text-xs text-muted-foreground/80 italic">{step.details}</p>
              </div>
              {index < steps.length - 1 && (
                <div className="hidden sm:flex items-center">
                  <ChevronRight className="h-5 w-5 text-gray-300" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Benefits */}
      <div className="border-t pt-4">
        <h3 className="font-medium mb-3">Why Install?</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            Quick access from your home screen
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            Works offline with cached data
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            Full-screen experience without browser UI
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            Faster loading and better performance
          </li>
        </ul>
      </div>
    </div>
  );

  if (showAsCard) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardContent className="p-6">
          {content}
        </CardContent>
      </Card>
    );
  }

  return content;
}

/**
 * Compact iOS instructions for tooltips/popovers
 */
interface IOSInstallInstructionsCompactProps {
  className?: string;
  onClose?: () => void;
  onDontShowAgain?: () => void;
}

export function IOSInstallInstructionsCompact({
  className,
  onClose,
  onDontShowAgain,
}: IOSInstallInstructionsCompactProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Install on iOS</p>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <ol className="space-y-2 text-xs">
        <li className="flex items-center gap-2">
          <span className="w-4 h-4 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-700 dark:text-blue-300 text-[10px] font-medium">
            1
          </span>
          <span className="flex items-center gap-1">
            Tap <SafariShareIcon className="h-3 w-3 text-blue-500" /> Share
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span className="w-4 h-4 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-700 dark:text-blue-300 text-[10px] font-medium">
            2
          </span>
          <span className="flex items-center gap-1">
            Tap <Plus className="h-3 w-3" /> "Add to Home Screen"
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span className="w-4 h-4 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-700 dark:text-blue-300 text-[10px] font-medium">
            3
          </span>
          <span>Tap "Add"</span>
        </li>
      </ol>

      {onDontShowAgain && (
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs"
          onClick={onDontShowAgain}
        >
          Don't show again
        </Button>
      )}
    </div>
  );
}

/**
 * Modal/Dialog version of iOS instructions
 */
interface IOSInstallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appName?: string;
}

export function IOSInstallModal({
  open,
  onOpenChange,
  appName = 'JobSight',
}: IOSInstallModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <IOSInstallInstructionsPage
          onClose={() => onOpenChange(false)}
          showAsCard={true}
          appName={appName}
        />
      </div>
    </div>
  );
}

export default IOSInstallInstructionsPage;
