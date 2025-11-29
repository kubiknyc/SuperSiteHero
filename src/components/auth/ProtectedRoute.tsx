// File: /src/components/auth/ProtectedRoute.tsx
// Protected route wrapper for authenticated pages

import { Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth/AuthContext'
import { type ReactNode } from 'react'
import { RouteLoadingFallback } from '@/components/loading/RouteLoadingFallback'

interface ProtectedRouteProps {
  children: ReactNode
  /**
   * Optional role required to access this route.
   * If specified, user must have this role to access.
   */
  requiredRole?: string
  /**
   * Optional array of allowed roles.
   * If specified, user must have one of these roles to access.
   */
  allowedRoles?: string[]
}

export function ProtectedRoute({ children, requiredRole, allowedRoles }: ProtectedRouteProps) {
  const { user, userProfile, loading } = useAuth()

  if (loading) {
    return <RouteLoadingFallback />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Check role-based access
  if (requiredRole || allowedRoles) {
    const userRole = userProfile?.role

    // If requiredRole is specified, check exact match
    if (requiredRole && userRole !== requiredRole) {
      // Redirect to appropriate page based on role
      if (userRole === 'subcontractor') {
        return <Navigate to="/portal" replace />
      }
      return <Navigate to="/" replace />
    }

    // If allowedRoles is specified, check if user's role is in the list
    if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
      // Redirect to appropriate page based on role
      if (userRole === 'subcontractor') {
        return <Navigate to="/portal" replace />
      }
      return <Navigate to="/" replace />
    }
  }

  return <>{children}</>
}
