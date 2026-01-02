// File: /src/main.tsx
// Application entry point with Phase 2 Performance monitoring and offline support

import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import App from './App.tsx'
import './index.css'
import { initWebVitals } from './lib/performance/web-vitals'
import { initSentry } from './lib/sentry'
import { initializeTheme } from './lib/theme/darkMode'
import {
  registerServiceWorker,
  requestPersistentStorage,
  isServiceWorkerSupported,
} from './lib/supabase'

// Import email test utility for browser console access
import './lib/email/test-email'

// Initialize Sentry error tracking
initSentry()

// Initialize theme system (dark mode support)
// This runs before React renders to prevent flash of wrong theme
if (typeof window !== 'undefined') {
  initializeTheme()
}

// Create React Query client for data fetching and caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data considered fresh
      gcTime: 1000 * 60 * 10, // 10 minutes - unused data kept in cache
      retry: 1,
      refetchOnWindowFocus: false, // Don't refetch on every tab switch
      // Enable network-only mode when offline
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Retry mutations when network is restored
      networkMode: 'offlineFirst',
      retry: 3,
    },
  },
})

// Initialize Web Vitals monitoring
if (typeof window !== 'undefined') {
  initWebVitals()
}

// Initialize offline support and service worker
async function initializeOfflineSupport(): Promise<void> {
  if (!isServiceWorkerSupported()) {
    console.warn('[Offline] Service workers not supported')
    return
  }

  try {
    // Register service worker and set up background sync
    const registration = await registerServiceWorker()
    if (registration) {
      // Request persistent storage to prevent data loss
      await requestPersistentStorage()

      // Set up update detection
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) {return}

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Dispatch custom event for PWAUpdateNotification to handle
            window.dispatchEvent(new CustomEvent('sw-update-available'))
          }
        })
      })
    }
  } catch (error) {
    console.error('[Offline] Failed to initialize offline support:', error)
  }
}

// Initialize offline support
if (typeof window !== 'undefined') {
  initializeOfflineSupport()
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Analytics />
      <SpeedInsights />
    </QueryClientProvider>
  </React.StrictMode>,
)
