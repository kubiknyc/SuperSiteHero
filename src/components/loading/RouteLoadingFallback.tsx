// File: /src/components/loading/RouteLoadingFallback.tsx
// Loading fallback component for lazy-loaded routes

import { LoadingScreen, LoadingSpinner } from '@/components/LoadingScreen'

export const RouteLoadingFallback = () => {
  return <LoadingScreen message="Loading page..." />
}

// Minimal loading fallback for smaller components
export const ComponentLoadingFallback = () => {
  return (
    <div className="flex items-center justify-center p-8">
      <LoadingSpinner size="lg" />
    </div>
  )
}
