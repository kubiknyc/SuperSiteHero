import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/**
 * MSW Worker for Browser Environment
 *
 * This worker intercepts HTTP requests during development or browser-based testing.
 *
 * Usage in browser:
 * ```typescript
 * import { worker } from '@/__tests__/mocks/browser';
 *
 * // Start the worker
 * worker.start();
 *
 * // Or start with options
 * worker.start({
 *   onUnhandledRequest: 'bypass', // Don't warn about unhandled requests
 * });
 * ```
 *
 * To enable in development, add to your main.tsx:
 * ```typescript
 * if (import.meta.env.DEV) {
 *   const { worker } = await import('./__tests__/mocks/browser');
 *   await worker.start({ onUnhandledRequest: 'bypass' });
 * }
 * ```
 */
export const worker = setupWorker(...handlers);
