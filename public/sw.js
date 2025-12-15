/**
 * Service Worker for Push Notifications
 *
 * Handles push events, notification display, and click actions.
 * This service worker is registered by the main application.
 */

// Cache name for offline functionality
const CACHE_NAME = 'jobsight-v1';
const OFFLINE_URL = '/offline.html';

// ============================================================================
// Install Event - Cache offline page
// ============================================================================

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Cache offline page for fallback
      await cache.add(new Request(OFFLINE_URL, { cache: 'reload' }));
    })()
  );
  // Force waiting service worker to become active
  self.skipWaiting();
});

// ============================================================================
// Activate Event - Clean up old caches
// ============================================================================

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Enable navigation preload if supported
      if ('navigationPreload' in self.registration) {
        await self.registration.navigationPreload.enable();
      }
      // Claim all clients immediately
      await self.clients.claim();
    })()
  );
});

// ============================================================================
// Push Event - Handle incoming push notifications
// ============================================================================

self.addEventListener('push', (event) => {
  if (!event.data) {
    console.warn('[SW] Push event received without data');
    return;
  }

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    // Fallback for plain text
    payload = {
      title: 'JobSight Notification',
      body: event.data.text(),
    };
  }

  const {
    title = 'JobSight',
    body = '',
    icon = '/icons/icon-192x192.png',
    badge = '/icons/badge-72x72.png',
    image,
    tag,
    data = {},
    actions = [],
    requireInteraction = false,
    renotify = false,
    silent = false,
    vibrate,
  } = payload;

  // Default actions based on notification type
  const defaultActions = getDefaultActions(data.type);
  const notificationActions = actions.length > 0 ? actions : defaultActions;

  const options = {
    body,
    icon,
    badge,
    image,
    tag: tag || `jobsight-${data.type || 'notification'}-${Date.now()}`,
    data: {
      ...data,
      timestamp: Date.now(),
    },
    actions: notificationActions,
    requireInteraction,
    renotify,
    silent,
    vibrate: vibrate || [100, 50, 100],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );

  // Update badge count
  updateBadge();
});

// ============================================================================
// Notification Click Event - Handle user interaction
// ============================================================================

self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  // Close the notification
  notification.close();

  // Determine URL to open
  let targetUrl = data.url || '/';

  // Handle specific actions
  if (action) {
    switch (action) {
      case 'view':
        targetUrl = data.url || '/';
        break;
      case 'reply':
        // For RFIs, submittals, etc. - open reply dialog
        targetUrl = data.url ? `${data.url}?action=reply` : '/';
        break;
      case 'dismiss':
        // Just close the notification (already done above)
        return;
      case 'mark-read':
        // Mark notification as read via API
        markNotificationRead(data.notificationId);
        return;
      case 'acknowledge':
        // For safety incidents - acknowledge receipt
        acknowledgeIncident(data.id);
        targetUrl = data.url || '/safety/incidents';
        break;
      default:
        break;
    }
  }

  // Handle notification type-specific routing
  if (!action && data.type) {
    targetUrl = getNotificationUrl(data.type, data) || targetUrl;
  }

  event.waitUntil(
    openOrFocusWindow(targetUrl)
  );
});

// ============================================================================
// Notification Close Event - Track dismissed notifications
// ============================================================================

self.addEventListener('notificationclose', (event) => {
  const notification = event.notification;
  const data = notification.data || {};

  // Optionally track that notification was dismissed
  if (data.notificationId) {
    trackNotificationDismissal(data.notificationId);
  }
});

// ============================================================================
// Push Subscription Change Event
// ============================================================================

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        // Resubscribe with same options
        const subscription = await self.registration.pushManager.subscribe(
          event.oldSubscription.options
        );

        // Send new subscription to server
        await fetch('/api/push-subscriptions/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            oldEndpoint: event.oldSubscription?.endpoint,
            newSubscription: subscription.toJSON(),
          }),
        });
      } catch (error) {
        console.error('[SW] Failed to resubscribe:', error);
      }
    })()
  );
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get default notification actions based on type
 */
function getDefaultActions(type) {
  switch (type) {
    case 'rfi_response':
    case 'rfi_assigned':
      return [
        { action: 'view', title: 'View RFI', icon: '/icons/action-view.png' },
        { action: 'reply', title: 'Reply', icon: '/icons/action-reply.png' },
      ];

    case 'submittal_approved':
    case 'submittal_rejected':
    case 'submittal_assigned':
      return [
        { action: 'view', title: 'View Submittal', icon: '/icons/action-view.png' },
      ];

    case 'daily_report_submitted':
      return [
        { action: 'view', title: 'View Report', icon: '/icons/action-view.png' },
      ];

    case 'punch_item_assigned':
      return [
        { action: 'view', title: 'View Item', icon: '/icons/action-view.png' },
      ];

    case 'safety_incident':
      return [
        { action: 'view', title: 'View Incident', icon: '/icons/action-view.png' },
        { action: 'acknowledge', title: 'Acknowledge', icon: '/icons/action-check.png' },
      ];

    case 'payment_approved':
    case 'payment_application':
      return [
        { action: 'view', title: 'View Payment', icon: '/icons/action-view.png' },
      ];

    case 'schedule_change':
      return [
        { action: 'view', title: 'View Schedule', icon: '/icons/action-view.png' },
      ];

    default:
      return [
        { action: 'view', title: 'View', icon: '/icons/action-view.png' },
        { action: 'dismiss', title: 'Dismiss', icon: '/icons/action-dismiss.png' },
      ];
  }
}

/**
 * Get URL for notification type
 */
function getNotificationUrl(type, data) {
  const baseUrl = self.location.origin;

  switch (type) {
    case 'rfi_response':
    case 'rfi_assigned':
      return data.id ? `${baseUrl}/rfis/${data.id}` : `${baseUrl}/rfis`;

    case 'submittal_approved':
    case 'submittal_rejected':
    case 'submittal_assigned':
      return data.id ? `${baseUrl}/submittals/${data.id}` : `${baseUrl}/submittals`;

    case 'daily_report_submitted':
      return data.id ? `${baseUrl}/daily-reports/${data.id}` : `${baseUrl}/daily-reports`;

    case 'punch_item_assigned':
      return data.id ? `${baseUrl}/punch-list/${data.id}` : `${baseUrl}/punch-list`;

    case 'safety_incident':
      return data.id ? `${baseUrl}/safety/incidents/${data.id}` : `${baseUrl}/safety/incidents`;

    case 'payment_approved':
    case 'payment_application':
      return data.id ? `${baseUrl}/payments/${data.id}` : `${baseUrl}/payments`;

    case 'schedule_change':
      return `${baseUrl}/schedule`;

    case 'approval_request':
      return `${baseUrl}/approvals`;

    default:
      return data.url || `${baseUrl}/notifications`;
  }
}

/**
 * Open or focus existing window with URL
 */
async function openOrFocusWindow(url) {
  const windowClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  // Try to find an existing window with matching URL
  for (const client of windowClients) {
    if (client.url === url && 'focus' in client) {
      return client.focus();
    }
  }

  // Try to find any existing JobSight window
  for (const client of windowClients) {
    if (client.url.includes(self.location.origin) && 'focus' in client) {
      // Navigate existing window to new URL
      await client.navigate(url);
      return client.focus();
    }
  }

  // Open new window if no existing window found
  if (self.clients.openWindow) {
    return self.clients.openWindow(url);
  }
}

/**
 * Update badge count
 */
async function updateBadge() {
  if ('setAppBadge' in navigator) {
    try {
      // Get unread count from server or estimate
      const response = await fetch('/api/notifications/unread-count');
      if (response.ok) {
        const { count } = await response.json();
        if (count > 0) {
          await navigator.setAppBadge(count);
        } else {
          await navigator.clearAppBadge();
        }
      }
    } catch (error) {
      // Badge API not critical, just log
      console.warn('[SW] Failed to update badge:', error);
    }
  }
}

/**
 * Mark notification as read
 */
async function markNotificationRead(notificationId) {
  if (!notificationId) return;

  try {
    await fetch(`/api/notifications/${notificationId}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[SW] Failed to mark notification read:', error);
  }
}

/**
 * Track notification dismissal
 */
async function trackNotificationDismissal(notificationId) {
  if (!notificationId) return;

  try {
    await fetch(`/api/notifications/${notificationId}/dismiss`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Non-critical, just log
    console.warn('[SW] Failed to track dismissal:', error);
  }
}

/**
 * Acknowledge safety incident
 */
async function acknowledgeIncident(incidentId) {
  if (!incidentId) return;

  try {
    await fetch(`/api/safety/incidents/${incidentId}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[SW] Failed to acknowledge incident:', error);
  }
}

// ============================================================================
// Fetch Event - Network first with offline fallback
// ============================================================================

self.addEventListener('fetch', (event) => {
  // Only handle navigation requests with offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Try preload response first
          const preloadResponse = await event.preloadResponse;
          if (preloadResponse) {
            return preloadResponse;
          }

          // Try network
          return await fetch(event.request);
        } catch (error) {
          // Network failed, serve offline page
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(OFFLINE_URL);
          return cachedResponse;
        }
      })()
    );
  }
});

// ============================================================================
// Message Event - Communication with main thread
// ============================================================================

self.addEventListener('message', (event) => {
  const { type, data } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'GET_VERSION':
      event.ports[0]?.postMessage({ version: CACHE_NAME });
      break;

    case 'CLEAR_BADGE':
      if ('clearAppBadge' in navigator) {
        navigator.clearAppBadge();
      }
      break;

    case 'UPDATE_BADGE':
      if ('setAppBadge' in navigator && typeof data?.count === 'number') {
        if (data.count > 0) {
          navigator.setAppBadge(data.count);
        } else {
          navigator.clearAppBadge();
        }
      }
      break;

    default:
      break;
  }
});

console.log('[SW] Service worker loaded - Push notifications enabled');
