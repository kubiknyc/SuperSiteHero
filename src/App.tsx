// File: /src/App.tsx
// Main application component with conditional mobile/desktop rendering
// Phase 2 Performance: Implements route-based code splitting with React.lazy()

import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { TwentyFirstToolbar } from '@21st-extension/toolbar-react'
import { ReactPlugin } from '@21st-extension/react'
import { AuthProvider } from './lib/auth/AuthContext'
import { ToastProvider } from './lib/notifications/ToastContext'
import { ThemeProvider } from './lib/theme/darkMode'
import { ErrorBoundary } from './components/errors/ErrorBoundary'
import { ToastContainer } from './components/notifications/ToastContainer'
import { RouteLoadingFallback } from './components/loading/RouteLoadingFallback'
import { PWAInstallBanner } from './components/PWAInstallPrompt'
import { PWAUpdateNotification } from './components/PWAUpdateNotification'
import { KeyboardShortcutsProvider } from './components/ui/keyboard-shortcuts-provider'
import { AgentChatPanel } from './features/agent'
import { initDatabase, requestPersistentStorage } from './lib/offline/indexeddb'
import { initSyncManager } from './lib/offline/sync-manager'
import { logger } from './lib/utils/logger'
import { initWebVitalsMonitoring } from '../tests/performance/web-vitals-baseline'
import { DeviceProvider, useDevice } from './lib/device'
import { LayoutVersionProvider } from './hooks/useLayoutVersion'

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

function App() {
  // Initialize Web Vitals monitoring in production
  useEffect(() => {
    if (import.meta.env.PROD) {
      initWebVitalsMonitoring();
    }
  }, []);

  // Initialize IndexedDB for offline functionality
  useEffect(() => {
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

  return (
    <>
      <TwentyFirstToolbar
        config={{
          plugins: [ReactPlugin],
        } as any}
      />
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
                    <AppShell />

                    {/* Toast notification container - displays all toasts throughout app */}
                    <ToastContainer />

                    {/* PWA Install Banner - prompts users to install the app */}
                    <PWAInstallBanner />

                    {/* PWA Update Notification - shows toast when new version available */}
                    <PWAUpdateNotification />

                    {/* AI Agent Chat Panel - floating chat interface */}
                    <AgentChatPanel />
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
