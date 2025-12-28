/**
 * useCompanyId Hook
 *
 * A simple hook to get the current user's company ID from the auth context.
 * This is a convenience wrapper around the AuthContext for easy access
 * to company_id throughout the application.
 */

import { useAuth } from '@/lib/auth/AuthContext';

/**
 * Returns the current user's company ID.
 * Returns undefined if the user is not authenticated or doesn't have a company.
 */
export function useCompanyId(): string | undefined {
  const { userProfile } = useAuth();
  return userProfile?.company_id ?? undefined;
}
