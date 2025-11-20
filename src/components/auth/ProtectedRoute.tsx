// File: /src/components/auth/ProtectedRoute.tsx
// Protected route wrapper for authenticated pages

import { Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth/AuthContext'
import { type ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()

  if (loading) {
    // TODO: Replace with proper loading component
    return <div>Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
