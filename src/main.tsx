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

// Import email test utility for browser console access
import './lib/email/test-email'

// Initialize Sentry error tracking
initSentry()

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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Analytics />
      <SpeedInsights />
    </QueryClientProvider>
  </React.StrictMode>,
)
