// File: /src/App.tsx
// Main application component with conditional mobile/desktop rendering
// Phase 2 Performance: Implements route-based code splitting with React.lazy()

import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './lib/auth/AuthContext'
import { ToastProvider } from './lib/notifications/ToastContext'
import { ThemeProvider } from './lib/theme/darkMode'
import { ErrorBoundary } from './components/errors/ErrorBoundary'
import { ToastContainer } from './components/notifications/ToastContainer'
import { RouteLoadingFallback } from './components/loading/RouteLoadingFallback'
import { PWAInstallBanner } from './components/PWAInstallPrompt'
import { PWAUpdateNotification } from './components/PWAUpdateNotification'
import { KeyboardShortcutsProvider } from './components/ui/keyboard-shortcuts-provider'
import { BreadcrumbProvider } from './components/ui/breadcrumb'
import { AgentProvider, AgentFAB, AgentChatPanel } from './features/agent'
import { initDatabase, requestPersistentStorage } from './lib/offline/indexeddb'
import { initSyncManager } from './lib/offline/sync-manager'
import { logger } from './lib/utils/logger'
import { initWebVitalsMonitoring } from './lib/monitoring/web-vitals'
import { DeviceProvider, useDevice } from './lib/device'
import { LayoutVersionProvider } from './hooks/useLayoutVersion'
import { isMissingSupabaseConfig } from './lib/supabase'

// Import industrial theme CSS
import './styles/industrial-theme.css'

// Lazy load app shells for code splitting
const MobileApp = lazy(() => import('./MobileApp'))
const DesktopApp = lazy(() => import('./DesktopApp'))

/**
 * AppShell - Conditionally renders Mobile or Desktop app based on device mode
 */
function AppShell() {
  const { mode, isTransitioning } = useDevice()

  if (isTransitioning) {
    return <RouteLoadingFallback />
  }

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      {mode === 'mobile' ? <MobileApp /> : <DesktopApp />}
    </Suspense>
  )
}

/**
 * Configuration error display component
 * Shows when Supabase environment variables are missing
 */
function ConfigurationError() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-lg p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-white">Configuration Error</h1>
        </div>

        <p className="text-slate-300 mb-4">
          Missing Supabase environment variables. The app cannot start without database configuration.
        </p>

        <div className="bg-slate-800 rounded-md p-4 mb-4">
          <p className="text-sm text-slate-400 mb-2">Required variables in <code className="text-cyan-400">.env</code> or <code className="text-cyan-400">.env.local</code>:</p>
          <code className="block text-sm text-green-400 font-mono">
            VITE_SUPABASE_URL=https://your-project.supabase.co<br/>
            VITE_SUPABASE_ANON_KEY=your-anon-key
          </code>
        </div>

        <div className="text-sm text-slate-400">
          <p className="mb-2">To fix this:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Copy <code className="text-cyan-400">.env.example</code> to <code className="text-cyan-400">.env</code></li>
            <li>Fill in your Supabase project credentials</li>
            <li>Restart the dev server</li>
          </ol>
          <p className="mt-3">
            Or run: <code className="text-cyan-400">vercel env pull .env.local</code>
          </p>
        </div>
      </div>
    </div>
  )
}

function App() {
  // Initialize Web Vitals monitoring in production
  // Note: Hooks must be called unconditionally (before any early returns)
  useEffect(() => {
    if (isMissingSupabaseConfig) {return;}
    if (import.meta.env.PROD) {
      initWebVitalsMonitoring();
    }
  }, []);

  // Initialize IndexedDB for offline functionality
  useEffect(() => {
    if (isMissingSupabaseConfig) {return;}

    let cleanupSync: (() => void) | null = null;

    const initOfflineDatabase = async () => {
      try {
        logger.log('[App] Initializing offline database...')
        await initDatabase()
        logger.log('[App] Offline database initialized successfully')

        // Request persistent storage to prevent eviction
        const isPersistent = await requestPersistentStorage()
        if (isPersistent) {
          logger.log('[App] Persistent storage granted')
        } else {
          logger.log('[App] Persistent storage not granted - data may be evicted under storage pressure')
        }

        // Initialize background sync manager
        logger.log('[App] Initializing background sync manager...')
        cleanupSync = initSyncManager()
        logger.log('[App] Background sync manager initialized')
      } catch (_error) {
        logger.error('[App] Failed to initialize offline database:', _error)
        // Don't block app startup on IndexedDB failure
      }
    }

    initOfflineDatabase()

    // Cleanup on unmount
    return () => {
      if (cleanupSync) {
        cleanupSync()
      }
    }
  }, [])

  // Show configuration error if Supabase env vars are missing
  if (isMissingSupabaseConfig) {
    return <ConfigurationError />
  }

  return (
    <>
      {/* Temporarily disabled to debug blank page issue */}
      {/* <TwentyFirstToolbar
        config={{
          plugins: [ReactPlugin],
        } as any}
      /> */}
      <ErrorBoundary>
      <ThemeProvider defaultTheme="system">
        <BrowserRouter
          {...{
            future: {
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }
          } as any}
        >
          <ToastProvider>
            <AuthProvider>
              <DeviceProvider>
                <LayoutVersionProvider>
                  <KeyboardShortcutsProvider>
                    <BreadcrumbProvider>
                      <AgentProvider enableKeyboardShortcut={true} shortcutKey="k">
                        <AppShell />

                      {/* Toast notification container - displays all toasts throughout app */}
                        <ToastContainer />

                        {/* PWA Install Banner - prompts users to install the app */}
                        <PWAInstallBanner />

                        {/* PWA Update Notification - shows toast when new version available */}
                        <PWAUpdateNotification />

                        {/* AI Agent Floating Action Button - bottom right corner */}
                        <AgentFAB position="bottom-right" showShortcutHint={true} />

                      {/* AI Agent Chat Panel - slide-out drawer (uses external FAB) */}
                        <AgentChatPanel hideInternalFAB={true} />
                      </AgentProvider>
                    </BreadcrumbProvider>
                  </KeyboardShortcutsProvider>
                </LayoutVersionProvider>
              </DeviceProvider>
            </AuthProvider>
          </ToastProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
    </>
  )
}

export default App
