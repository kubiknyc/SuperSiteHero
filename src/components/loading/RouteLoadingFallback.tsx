// File: /src/components/loading/RouteLoadingFallback.tsx
// Loading fallback component for lazy-loaded routes

import { Loader2 } from 'lucide-react'

export const RouteLoadingFallback = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
        <p className="mt-4 text-sm text-gray-600">Loading...</p>
      </div>
    </div>
  )
}

// Minimal loading fallback for smaller components
export const ComponentLoadingFallback = () => {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  )
}
