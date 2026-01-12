/**
 * RoleBasedRedirect Component
 * Redirects users to their role-appropriate dashboard
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';
import { useDefaultLandingPage } from '@/hooks/useRoleNavigation';

export function RoleBasedRedirect() {
  const { userProfile, loading } = useAuth();
  const defaultLandingPage = useDefaultLandingPage();

  // Show nothing while loading
  if (loading) {
    return null;
  }

  // If not authenticated, redirect to login
  if (!userProfile) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to role-specific dashboard
  return <Navigate to={defaultLandingPage} replace />;
}

export default RoleBasedRedirect;
