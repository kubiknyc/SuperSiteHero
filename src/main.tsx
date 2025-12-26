// File: /src/main.tsx
// Application entry point with Phase 2 Performance monitoring

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
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

// Initialize Web Vitals monitoring
if (typeof window !== 'undefined') {
  initWebVitals()
}

// Service Worker registration monitoring
// VitePWA handles auto-registration, but we add logging for debugging
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.ready
    .then((registration) => {
      console.log('[SW] Service worker ready:', registration.scope)

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        console.log('[SW] New service worker installing...')

        newWorker?.addEventListener('statechange', () => {
          console.log('[SW] Service worker state:', newWorker.state)
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SW] New version available! Refresh to update.')
          }
        })
      })
    })
    .catch((error) => {
      console.error('[SW] Service worker registration failed:', error)
    })
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
