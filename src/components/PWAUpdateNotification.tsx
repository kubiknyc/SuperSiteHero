// File: /src/components/PWAUpdateNotification.tsx
// PWA Update Notification component - Shows toast when new version is available

import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/lib/notifications/ToastContext';
import { logger } from '@/lib/utils/logger';

/**
 * PWAUpdateNotification
 *
 * Listens for service worker update events and displays a toast notification
 * when a new version of the app is available. Users can click to refresh
 * and get the latest version.
 */
export function PWAUpdateNotification() {
  const { info } = useToast();
  const [hasShownNotification, setHasShownNotification] = useState(false);

  const handleUpdate = useCallback(() => {
    // Don't show multiple notifications
    if (hasShownNotification) {return;}

    setHasShownNotification(true);
    logger.log('[PWAUpdate] New version available, showing notification');

    info(
      'Update Available',
      'A new version of JobSight is ready. Click to refresh.',
      {
        duration: 0, // Persistent until user acts
        action: {
          label: 'Refresh Now',
          onClick: () => {
            logger.log('[PWAUpdate] User clicked refresh');

            // Tell the waiting service worker to skip waiting and take control
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
            }

            // Reload the page to get the new version
            window.location.reload();
          },
        },
      }
    );
  }, [info, hasShownNotification]);

  useEffect(() => {
    // Listen for the custom event dispatched from main.tsx
    const handleCustomEvent = () => {
      handleUpdate();
    };

    window.addEventListener('sw-update-available', handleCustomEvent);

    // Also listen for controller change (new SW took control)
    const handleControllerChange = () => {
      logger.log('[PWAUpdate] Controller changed, reloading for new version');
      // Only reload if we're expecting an update
      if (hasShownNotification) {
        window.location.reload();
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    }

    return () => {
      window.removeEventListener('sw-update-available', handleCustomEvent);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      }
    };
  }, [handleUpdate, hasShownNotification]);

  // This component doesn't render anything - it just manages the notification
  return null;
}
