// File: src/components/PWAInstallPrompt.tsx
// PWA install prompt components with platform-specific instructions
// Supports iOS (manual instructions), Android, and Desktop browsers
// Includes smooth animations and timed display logic

import * as React from 'react';
import { cn } from '@/lib/utils';
import { usePWAInstall, type PWAAnalyticsCallback } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { X, Download, Plus, Smartphone, Monitor, HardHat, CheckCircle2, Info } from 'lucide-react';

/**
 * Safari share icon for iOS instructions
 */
export function ShareIcon({ className }: { className?: string }) {
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
 * Standalone iOS install instructions component
 * Can be used independently or within other components
 */
interface IOSInstallInstructionsProps {
  className?: string;
  onClose?: () => void;
  onDontShowAgain?: () => void;
  showDontShowAgain?: boolean;
  compact?: boolean;
}

export function IOSInstallInstructions({
  className,
  onClose,
  onDontShowAgain,
  showDontShowAgain = true,
  compact = false,
}: IOSInstallInstructionsProps) {
  const [dontShowAgain, setDontShowAgain] = React.useState(false);

  const handleDontShowAgain = () => {
    if (dontShowAgain && onDontShowAgain) {
      onDontShowAgain();
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {onClose && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-base">Install on iOS</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 -mt-1 -mr-1"
            onClick={onClose}
            aria-label="Close instructions"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <ol className={cn('space-y-3', compact ? 'text-xs' : 'text-sm')}>
        <li className="flex items-center gap-3">
          <span className={cn(
            'flex-shrink-0 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center font-medium text-blue-700 dark:text-blue-300',
            compact ? 'w-5 h-5 text-xs' : 'w-6 h-6 text-xs'
          )}>
            1
          </span>
          <span className="flex items-center gap-2">
            Tap the <ShareIcon className={cn('text-blue-500', compact ? 'h-3 w-3' : 'h-4 w-4')} /> Share button in Safari
          </span>
        </li>
        <li className="flex items-center gap-3">
          <span className={cn(
            'flex-shrink-0 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center font-medium text-blue-700 dark:text-blue-300',
            compact ? 'w-5 h-5 text-xs' : 'w-6 h-6 text-xs'
          )}>
            2
          </span>
          <span className="flex items-center gap-2">
            Scroll and tap <Plus className={compact ? 'h-3 w-3' : 'h-4 w-4'} /> "Add to Home Screen"
          </span>
        </li>
        <li className="flex items-center gap-3">
          <span className={cn(
            'flex-shrink-0 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center font-medium text-blue-700 dark:text-blue-300',
            compact ? 'w-5 h-5 text-xs' : 'w-6 h-6 text-xs'
          )}>
            3
          </span>
          <span>Tap "Add" in the top right to install</span>
        </li>
      </ol>

      <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
        <Info className={cn('text-amber-600 dark:text-amber-400 flex-shrink-0', compact ? 'h-3 w-3' : 'h-4 w-4')} />
        <p className={cn('text-amber-700 dark:text-amber-300', compact ? 'text-xs' : 'text-xs')}>
          You must use Safari on iOS to install web apps.
        </p>
      </div>

      {showDontShowAgain && (
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="dont-show-ios"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
            />
            <Label htmlFor="dont-show-ios" className="text-xs text-muted-foreground cursor-pointer">
              Don't show again
            </Label>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                handleDontShowAgain();
                onClose();
              }}
              className="text-muted-foreground"
            >
              Close
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

interface PWAInstallBannerProps {
  className?: string;
  /** Position of the banner */
  position?: 'top' | 'bottom';
  /** Analytics callback */
  onAnalyticsEvent?: PWAAnalyticsCallback;
}

/**
 * Floating banner that prompts users to install the PWA
 * Shows dismissible banner with "Don't show again" option
 * Includes smooth slide-in/out animations
 */
export function PWAInstallBanner({ className, position = 'bottom', onAnalyticsEvent }: PWAInstallBannerProps) {
  const {
    shouldShowBanner,
    isIOS,
    promptInstall,
    dismissPrompt,
    trackPromptShown,
  } = usePWAInstall({ onAnalyticsEvent });

  const [showIOSInstructions, setShowIOSInstructions] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = React.useState(false);
  const [dontShowAgain, setDontShowAgain] = React.useState(false);

  // Handle visibility with animation
  React.useEffect(() => {
    if (shouldShowBanner) {
      // Small delay before showing for smoother UX
      const timer = setTimeout(() => {
        setIsVisible(true);
        trackPromptShown();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [shouldShowBanner, trackPromptShown]);

  const handleDismiss = (permanent = false) => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      dismissPrompt(permanent || dontShowAgain);
      setIsAnimatingOut(false);
      setIsVisible(false);
    }, 300);
  };

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      onAnalyticsEvent?.('pwa_ios_instructions_shown', { source: 'banner' });
    } else {
      await promptInstall();
    }
  };

  // Don't render if not visible
  if (!shouldShowBanner && !isVisible) {
    return null;
  }

  if (showIOSInstructions) {
    return (
      <div
        className={cn(
          'fixed inset-x-0 z-50 p-4 safe-area-bottom transition-all duration-300 ease-out',
          position === 'top' ? 'top-0' : 'bottom-0',
          isVisible && !isAnimatingOut ? 'translate-y-0 opacity-100' : (position === 'top' ? '-translate-y-full' : 'translate-y-full') + ' opacity-0',
          className
        )}
      >
        <Card className="max-w-md mx-auto shadow-lg border-blue-200 bg-white dark:bg-gray-900 dark:border-gray-700">
          <CardContent className="p-4">
            <IOSInstallInstructions
              onClose={() => setShowIOSInstructions(false)}
              onDontShowAgain={() => handleDismiss(true)}
              showDontShowAgain={true}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'fixed inset-x-0 z-50 p-4 safe-area-bottom transition-all duration-300 ease-out',
        position === 'top' ? 'top-0' : 'bottom-0 mb-16 md:mb-0',
        isVisible && !isAnimatingOut ? 'translate-y-0 opacity-100' : (position === 'top' ? '-translate-y-full' : 'translate-y-full') + ' opacity-0',
        className
      )}
    >
      <Card className="max-w-md mx-auto shadow-lg border-blue-200 bg-white dark:bg-gray-900 dark:border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg flex-shrink-0">
              <HardHat className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base mb-1">Install JobSight</CardTitle>
              <CardDescription className="text-sm">
                Add to your home screen for quick access, offline support, and a better experience.
              </CardDescription>
              <div className="flex items-center gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={handleInstall}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Install App
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDismiss(false)}
                  className="text-muted-foreground"
                >
                  Not now
                </Button>
              </div>
              <div className="flex items-center space-x-2 mt-3">
                <Checkbox
                  id="dont-show-banner"
                  checked={dontShowAgain}
                  onCheckedChange={(checked) => setDontShowAgain(checked === true)}
                />
                <Label htmlFor="dont-show-banner" className="text-xs text-muted-foreground cursor-pointer">
                  Don't show again
                </Label>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -mt-1 -mr-1 flex-shrink-0"
              onClick={() => handleDismiss(false)}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Install button component for settings page
 * Shows installation status and provides manual install option
 */
interface PWAInstallButtonProps {
  className?: string;
  onAnalyticsEvent?: PWAAnalyticsCallback;
}

export function PWAInstallButton({ className, onAnalyticsEvent }: PWAInstallButtonProps) {
  const {
    isInstallable,
    isInstalled,
    isStandalone,
    isIOS,
    promptInstall,
    resetDismissed,
  } = usePWAInstall({ onAnalyticsEvent });

  const [showIOSInstructions, setShowIOSInstructions] = React.useState(false);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      onAnalyticsEvent?.('pwa_ios_instructions_shown', { source: 'settings' });
    } else if (isInstallable) {
      await promptInstall();
    } else {
      // Reset dismissed state so banner shows again
      resetDismissed();
    }
  };

  if (isInstalled || isStandalone) {
    return (
      <Card className={cn('border-green-200 dark:border-green-800', className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-green-800 dark:text-green-200">App Installed</p>
              <p className="text-sm text-green-600 dark:text-green-400">
                JobSight is installed on your device
              </p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Status:</strong> Running in standalone mode
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              <strong>Version:</strong> {__APP_VERSION__ || '1.0.0'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showIOSInstructions) {
    return (
      <Card className={cn('border-blue-200 dark:border-blue-800', className)}>
        <CardContent className="p-4">
          <IOSInstallInstructions
            onClose={() => setShowIOSInstructions(false)}
            showDontShowAgain={false}
          />
        </CardContent>
      </Card>
    );
  }

  // Not installable state (browser doesn't support or already dismissed)
  if (!isInstallable && !isIOS) {
    return (
      <Card className={cn('border-gray-200 dark:border-gray-700', className)}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <Monitor className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base mb-1">Install JobSight App</CardTitle>
              <CardDescription className="text-sm mb-3">
                Your browser may not support PWA installation, or you've previously dismissed the prompt.
              </CardDescription>
              <div className="space-y-2">
                <Button onClick={resetDismissed} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Show Install Prompt
                </Button>
                <p className="text-xs text-muted-foreground">
                  Supported browsers: Chrome 67+, Edge 79+, Safari 11.1+, Firefox for Android
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('border-blue-200 dark:border-blue-800', className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            {isIOS ? (
              <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            ) : (
              <Monitor className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            )}
          </div>
          <div className="flex-1">
            <CardTitle className="text-base mb-1">Install JobSight App</CardTitle>
            <CardDescription className="text-sm mb-3">
              Install our app for quick access from your home screen, offline support, and faster loading.
            </CardDescription>
            <Button onClick={handleInstall} className="gap-2">
              <Download className="h-4 w-4" />
              {isIOS ? 'How to Install' : 'Install App'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Minimal install indicator for header/nav
 */
interface PWAInstallIndicatorProps {
  className?: string;
  onAnalyticsEvent?: PWAAnalyticsCallback;
}

export function PWAInstallIndicator({ className, onAnalyticsEvent }: PWAInstallIndicatorProps) {
  const { isInstallable, isDismissed, isIOS, promptInstall, dismissPrompt } = usePWAInstall({ onAnalyticsEvent });
  const [showTooltip, setShowTooltip] = React.useState(false);

  if (!isInstallable || isDismissed) {
    return null;
  }

  const handleClick = async () => {
    if (isIOS) {
      setShowTooltip(true);
      onAnalyticsEvent?.('pwa_ios_instructions_shown', { source: 'indicator' });
    } else {
      await promptInstall();
    }
  };

  return (
    <div className={cn('relative', className)}>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClick}
        className="relative h-9 w-9"
        aria-label="Install app"
      >
        <Download className="h-5 w-5" />
        <span className="absolute top-0 right-0 h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
      </Button>

      {showTooltip && isIOS && (
        <div className="absolute top-full right-0 mt-2 w-72 p-3 bg-white dark:bg-gray-900 rounded-lg shadow-lg border z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <IOSInstallInstructions
            onClose={() => setShowTooltip(false)}
            onDontShowAgain={() => {
              dismissPrompt(true);
              setShowTooltip(false);
            }}
            showDontShowAgain={true}
            compact={true}
          />
        </div>
      )}
    </div>
  );
}

// Declare global for app version
declare const __APP_VERSION__: string | undefined;

export default PWAInstallBanner;
