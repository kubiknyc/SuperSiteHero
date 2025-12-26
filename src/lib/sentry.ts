/**
 * Sentry Error Tracking Configuration
 *
 * This module initializes Sentry for error monitoring in the construction
 * field management platform.
 *
 * Setup:
 * 1. Sign up at https://sentry.io/
 * 2. Create a new React project
 * 3. Get your DSN from Project Settings
 * 4. Add to .env.local: VITE_SENTRY_DSN=your_dsn_here
 * 5. Add to .env.local: VITE_SENTRY_ENVIRONMENT=development
 */

import * as Sentry from '@sentry/react';
import { logger } from './utils/logger';


// Sentry configuration
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const ENVIRONMENT = import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development';
const RELEASE = import.meta.env.VITE_APP_VERSION || '1.0.0';

/**
 * Initialize Sentry error tracking
 * Only initializes if DSN is provided
 */
export function initSentry() {
  // Only initialize if DSN is provided
  if (!SENTRY_DSN) {
    logger.info('Sentry DSN not provided. Error tracking disabled.');
    return;
  }

  // Skip initialization in development unless debugging is enabled
  // Note: env vars are strings, so check for explicit 'true'
  const debugEnabled = import.meta.env.VITE_SENTRY_DEBUG === 'true';
  if (ENVIRONMENT === 'development' && !debugEnabled) {
    logger.info('Sentry disabled in development. Set VITE_SENTRY_DEBUG=true to enable.');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    release: RELEASE,

    // Set sample rate for performance monitoring
    // 1.0 = 100% of transactions, 0.1 = 10%
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,

    // Capture unhandled promise rejections
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Mask all text and block all media by default
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Set tracePropagationTargets to control distributed tracing
    tracePropagationTargets: [
      'localhost',
      /^https:\/\/.*\.supabase\.co\//, // Track Supabase API calls
    ],

    // Session Replay (useful for debugging user issues)
    replaysSessionSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0, // Always capture replay on error

    // Filter out sensitive data
    beforeSend(event, hint) {
      // Don't send events in development unless explicitly enabled
      if (ENVIRONMENT === 'development' && !import.meta.env.VITE_SENTRY_DEBUG) {
        return null;
      }

      // Remove sensitive data from event
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['Cookie'];
      }

      // Add custom context
      if (event.user) {
        // Remove PII
        delete event.user.email;
        delete event.user.ip_address;
      }

      return event;
    },

    // Ignore common errors that aren't actionable
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'chrome-extension://',
      'moz-extension://',
      // Network errors
      'NetworkError',
      'Failed to fetch',
      // ResizeObserver loop errors (common, not actionable)
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
    ],
  });

  logger.info(`Sentry initialized for ${ENVIRONMENT} environment`);
}

/**
 * Set user context for Sentry
 * Call this after user authentication
 */
export function setSentryUser(userId: string, companyId?: string) {
  Sentry.setUser({
    id: userId,
    // Add non-PII user context
    company_id: companyId,
  });
}

/**
 * Clear user context (call on logout)
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addSentryBreadcrumb(
  message: string,
  category: string,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info',
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Capture exception manually
 */
export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    contexts: context ? { custom: context } : undefined,
  });
}

/**
 * Capture message manually
 */
export function captureMessage(
  message: string,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, any>
) {
  Sentry.captureMessage(message, {
    level,
    contexts: context ? { custom: context } : undefined,
  });
}

/**
 * Set tag for filtering in Sentry
 */
export function setSentryTag(key: string, value: string) {
  Sentry.setTag(key, value);
}

/**
 * Set context for additional debugging info
 */
export function setSentryContext(name: string, context: Record<string, any>) {
  Sentry.setContext(name, context);
}

/**
 * Start a new span for performance monitoring
 */
export function startSpan<T>(name: string, op: string, callback: () => T): T {
  return Sentry.startSpan({ name, op }, callback);
}

/**
 * Error boundary wrapper component
 * Use this to wrap parts of your app that might error
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;

/**
 * HOC to wrap routes with error boundaries
 */
export function withSentryRouting(component: React.ComponentType) {
  return Sentry.withProfiler(component);
}
