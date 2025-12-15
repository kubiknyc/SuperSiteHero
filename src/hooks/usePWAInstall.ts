// File: src/hooks/usePWAInstall.ts
// Hook for managing PWA installation prompts and state
// Enhanced with timed display, page view tracking, and analytics

import { useCallback, useEffect, useState, useRef } from 'react';

const PWA_DISMISSED_KEY = 'jobsight-pwa-dismissed';
const PWA_DISMISSED_TIMESTAMP_KEY = 'jobsight-pwa-dismissed-at';
const PWA_INSTALLED_KEY = 'jobsight-pwa-installed';
const PWA_PAGE_VIEWS_KEY = 'jobsight-pwa-page-views';
const PWA_FIRST_VISIT_KEY = 'jobsight-pwa-first-visit';

// Configuration constants
const DISMISSAL_EXPIRY_DAYS = 7;
const SHOW_AFTER_SECONDS = 30;
const SHOW_AFTER_PAGE_VIEWS = 3;

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/** Analytics event types for PWA installation tracking */
export type PWAAnalyticsEvent =
  | 'pwa_prompt_shown'
  | 'pwa_prompt_dismissed'
  | 'pwa_install_accepted'
  | 'pwa_install_declined'
  | 'pwa_ios_instructions_shown';

/** Analytics callback for tracking PWA events */
export type PWAAnalyticsCallback = (event: PWAAnalyticsEvent, data?: Record<string, unknown>) => void;

interface UsePWAInstallOptions {
  /** Callback for analytics tracking */
  onAnalyticsEvent?: PWAAnalyticsCallback;
  /** Delay in seconds before showing banner (default: 30) */
  showAfterSeconds?: number;
  /** Number of page views before showing banner (default: 3) */
  showAfterPageViews?: number;
  /** Days to hide banner after dismissal (default: 7) */
  dismissalExpiryDays?: number;
}

interface UsePWAInstallReturn {
  /** Whether the install prompt is available */
  isInstallable: boolean;
  /** Whether the app is already installed */
  isInstalled: boolean;
  /** Whether the user has dismissed the install prompt */
  isDismissed: boolean;
  /** Whether we're on iOS (needs special instructions) */
  isIOS: boolean;
  /** Whether we're on Android */
  isAndroid: boolean;
  /** Whether the app is running in standalone mode (installed) */
  isStandalone: boolean;
  /** Whether to show the banner based on timing/page view criteria */
  shouldShowBanner: boolean;
  /** Current page view count */
  pageViewCount: number;
  /** Trigger the install prompt */
  promptInstall: () => Promise<boolean>;
  /** Dismiss the install prompt */
  dismissPrompt: (permanent?: boolean) => void;
  /** Reset the dismissed state to show prompt again */
  resetDismissed: () => void;
  /** Track that the prompt was shown (for analytics) */
  trackPromptShown: () => void;
}

/**
 * Detect if the device is iOS
 */
function detectIOS(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  const userAgent = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
}

/**
 * Detect if the device is Android
 */
function detectAndroid(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  const userAgent = navigator.userAgent.toLowerCase();
  return /android/.test(userAgent);
}

/**
 * Detect if the app is running in standalone mode (installed as PWA)
 */
function detectStandalone(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  // Check for display-mode: standalone
  const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
  // Check for iOS standalone mode
  const isIOSStandalone = (navigator as { standalone?: boolean }).standalone === true;
  // Check for Android TWA
  const referrer = document.referrer;
  const isTWA = referrer.includes('android-app://');

  return isStandaloneMedia || isIOSStandalone || isTWA;
}

/**
 * Check if dismissal has expired (past the expiry days threshold)
 */
function isDismissalExpired(dismissalExpiryDays: number): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const dismissedAt = localStorage.getItem(PWA_DISMISSED_TIMESTAMP_KEY);
  if (!dismissedAt) {
    return true;
  }
  const dismissedTime = parseInt(dismissedAt, 10);
  const expiryTime = dismissalExpiryDays * 24 * 60 * 60 * 1000;
  return Date.now() - dismissedTime > expiryTime;
}

/**
 * Get and increment page view count
 */
function getPageViewCount(): number {
  if (typeof window === 'undefined') {
    return 0;
  }
  const count = parseInt(localStorage.getItem(PWA_PAGE_VIEWS_KEY) || '0', 10);
  return count;
}

/**
 * Increment page view count
 */
function incrementPageViews(): number {
  if (typeof window === 'undefined') {
    return 0;
  }
  const count = getPageViewCount() + 1;
  localStorage.setItem(PWA_PAGE_VIEWS_KEY, count.toString());
  return count;
}

/**
 * Get first visit timestamp
 */
function getFirstVisitTime(): number {
  if (typeof window === 'undefined') {
    return Date.now();
  }
  const stored = localStorage.getItem(PWA_FIRST_VISIT_KEY);
  if (stored) {
    return parseInt(stored, 10);
  }
  const now = Date.now();
  localStorage.setItem(PWA_FIRST_VISIT_KEY, now.toString());
  return now;
}

/**
 * Hook for managing PWA installation
 *
 * @example
 * ```tsx
 * const {
 *   isInstallable,
 *   isInstalled,
 *   isDismissed,
 *   isIOS,
 *   shouldShowBanner,
 *   promptInstall,
 *   dismissPrompt,
 * } = usePWAInstall({
 *   onAnalyticsEvent: (event, data) => {
 *     // Send to your analytics provider
 *     analytics.track(event, data);
 *   }
 * });
 *
 * if (isInstallable && shouldShowBanner && !isDismissed) {
 *   return <PWAInstallBanner onInstall={promptInstall} onDismiss={dismissPrompt} />;
 * }
 * ```
 */
export function usePWAInstall(options: UsePWAInstallOptions = {}): UsePWAInstallReturn {
  const {
    onAnalyticsEvent,
    showAfterSeconds = SHOW_AFTER_SECONDS,
    showAfterPageViews = SHOW_AFTER_PAGE_VIEWS,
    dismissalExpiryDays = DISMISSAL_EXPIRY_DAYS,
  } = options;

  const analyticsCallbackRef = useRef(onAnalyticsEvent);
  analyticsCallbackRef.current = onAnalyticsEvent;

  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return localStorage.getItem(PWA_INSTALLED_KEY) === 'true' || detectStandalone();
  });
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    const permanentlyDismissed = localStorage.getItem(PWA_DISMISSED_KEY) === 'true';
    // Check if dismissal has expired
    if (permanentlyDismissed) {
      return true;
    }
    const dismissedAt = localStorage.getItem(PWA_DISMISSED_TIMESTAMP_KEY);
    if (dismissedAt && !isDismissalExpired(dismissalExpiryDays)) {
      return true;
    }
    return false;
  });
  const [pageViewCount, setPageViewCount] = useState<number>(() => getPageViewCount());
  const [timeElapsed, setTimeElapsed] = useState<boolean>(false);
  const [hasTrackedPromptShown, setHasTrackedPromptShown] = useState(false);

  const isIOS = detectIOS();
  const isAndroid = detectAndroid();
  const isStandalone = detectStandalone();

  // Track page views and timing
  useEffect(() => {
    // Increment page views on mount
    const newCount = incrementPageViews();
    setPageViewCount(newCount);

    // Set up timer for showing banner
    const firstVisit = getFirstVisitTime();
    const elapsed = (Date.now() - firstVisit) / 1000;

    if (elapsed >= showAfterSeconds) {
      setTimeElapsed(true);
    } else {
      const remainingTime = (showAfterSeconds - elapsed) * 1000;
      const timer = setTimeout(() => {
        setTimeElapsed(true);
      }, remainingTime);
      return () => clearTimeout(timer);
    }
  }, [showAfterSeconds]);

  // Listen for the beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Store the event for later use
      setInstallPromptEvent(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPromptEvent(null);
      localStorage.setItem(PWA_INSTALLED_KEY, 'true');
      analyticsCallbackRef.current?.('pwa_install_accepted', {
        platform: isIOS ? 'ios' : isAndroid ? 'android' : 'desktop',
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if already in standalone mode
    if (detectStandalone()) {
      setIsInstalled(true);
      localStorage.setItem(PWA_INSTALLED_KEY, 'true');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isIOS, isAndroid]);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!installPromptEvent) {
      return false;
    }

    try {
      // Show the install prompt
      await installPromptEvent.prompt();

      // Wait for the user to respond to the prompt
      const choiceResult = await installPromptEvent.userChoice;

      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        localStorage.setItem(PWA_INSTALLED_KEY, 'true');
        setInstallPromptEvent(null);
        analyticsCallbackRef.current?.('pwa_install_accepted', {
          platform: choiceResult.platform,
        });
        return true;
      } else {
        analyticsCallbackRef.current?.('pwa_install_declined', {
          platform: choiceResult.platform,
        });
      }

      return false;
    } catch (error) {
      console.error('Error prompting install:', error);
      return false;
    }
  }, [installPromptEvent]);

  const dismissPrompt = useCallback((permanent = false) => {
    setIsDismissed(true);
    if (permanent) {
      localStorage.setItem(PWA_DISMISSED_KEY, 'true');
    } else {
      localStorage.setItem(PWA_DISMISSED_TIMESTAMP_KEY, Date.now().toString());
    }
    analyticsCallbackRef.current?.('pwa_prompt_dismissed', {
      permanent,
      platform: isIOS ? 'ios' : isAndroid ? 'android' : 'desktop',
    });
  }, [isIOS, isAndroid]);

  const resetDismissed = useCallback(() => {
    setIsDismissed(false);
    localStorage.removeItem(PWA_DISMISSED_KEY);
    localStorage.removeItem(PWA_DISMISSED_TIMESTAMP_KEY);
  }, []);

  const trackPromptShown = useCallback(() => {
    if (!hasTrackedPromptShown) {
      setHasTrackedPromptShown(true);
      analyticsCallbackRef.current?.('pwa_prompt_shown', {
        platform: isIOS ? 'ios' : isAndroid ? 'android' : 'desktop',
        pageViews: pageViewCount,
      });
    }
  }, [hasTrackedPromptShown, isIOS, isAndroid, pageViewCount]);

  // Determine if installable
  // On iOS, we show manual instructions instead
  const isInstallable = !isInstalled && (!!installPromptEvent || isIOS) && !isStandalone;

  // Determine if banner should be shown based on timing criteria
  const shouldShowBanner = isInstallable && !isDismissed && (timeElapsed || pageViewCount >= showAfterPageViews);

  return {
    isInstallable,
    isInstalled,
    isDismissed,
    isIOS,
    isAndroid,
    isStandalone,
    shouldShowBanner,
    pageViewCount,
    promptInstall,
    dismissPrompt,
    resetDismissed,
    trackPromptShown,
  };
}

export default usePWAInstall;
