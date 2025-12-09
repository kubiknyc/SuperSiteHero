/**
 * Company Users API Service
 *
 * User management operations for company administrators.
 */

import { supabase } from '@/lib/supabase'
import type { Tables, TablesUpdate } from '@/types/database'
import { logger } from '@/lib/utils/logger'

export type UserProfile = Tables<'users'>
export type UserUpdate = TablesUpdate<'users'>

export type UserRole = 'owner' | 'admin' | 'project_manager' | 'superintendent' | 'foreman' | 'worker'

export const USER_ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'owner', label: 'Owner', description: 'Full access to all features' },
  { value: 'admin', label: 'Admin', description: 'Manage company settings and users' },
  { value: 'project_manager', label: 'Project Manager', description: 'Manage assigned projects' },
  { value: 'superintendent', label: 'Superintendent', description: 'Field operations and daily reports' },
  { value: 'foreman', label: 'Foreman', description: 'Team and task management' },
  { value: 'worker', label: 'Worker', description: 'View assigned tasks and submit reports' },
]

export interface InviteUserData {
  email: string
  firstName?: string
  lastName?: string
  role: UserRole
}

export const companyUsersApi = {
  /**
   * Get all users in a company
   */
  async getCompanyUsers(companyId: string): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('[CompanyUsersApi] Failed to fetch users:', error)
      throw error
    }

    return data || []
  },

  /**
   * Get a single user by ID
   */
  async getUser(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      logger.error('[CompanyUsersApi] Failed to fetch user:', error)
      throw error
    }

    return data
  },

  /**
   * Update user role
   */
  async updateUserRole(userId: string, role: UserRole): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('users')
      .update({
        role,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      logger.error('[CompanyUsersApi] Failed to update user role:', error)
      throw error
    }

    return data
  },

  /**
   * Activate or deactivate a user
   */
  async setUserActive(userId: string, isActive: boolean): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('users')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      logger.error('[CompanyUsersApi] Failed to update user status:', error)
      throw error
    }

    return data
  },

  /**
   * Invite a new user to the company
   * This creates an invitation that sends an email to the user
   */
  async inviteUser(companyId: string, invitedBy: string, data: InviteUserData): Promise<void> {
    // Use Supabase Auth admin invite
    const { error } = await supabase.auth.admin.inviteUserByEmail(data.email, {
      data: {
        company_id: companyId,
        role: data.role,
        first_name: data.firstName,
        last_name: data.lastName,
        invited_by: invitedBy,
      },
    })

    if (error) {
      // If admin invite fails (requires service role), fall back to edge function
      logger.warn('[CompanyUsersApi] Admin invite failed, trying edge function:', error)

      const { error: fnError } = await supabase.functions.invoke('invite-user', {
        body: {
          email: data.email,
          company_id: companyId,
          role: data.role,
          first_name: data.firstName,
          last_name: data.lastName,
          invited_by: invitedBy,
        },
      })

      if (fnError) {
        logger.error('[CompanyUsersApi] Failed to invite user:', fnError)
        throw fnError
      }
    }
  },

  /**
   * Update user profile
   */
  async updateUser(userId: string, updates: UserUpdate): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      logger.error('[CompanyUsersApi] Failed to update user:', error)
      throw error
    }

    return data
  },

  /**
   * Soft delete a user (set deleted_at)
   */
  async deleteUser(userId: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false,
      })
      .eq('id', userId)

    if (error) {
      logger.error('[CompanyUsersApi] Failed to delete user:', error)
      throw error
    }
  },
}

export default companyUsersApi
