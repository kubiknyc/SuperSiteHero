/**
 * Client Portal API Service
 *
 * API methods for client portal functionality.
 */

import { supabase } from '@/lib/supabase'
import { fromExtended } from '@/lib/supabase-typed'
import { ApiErrorClass } from '../errors'
import type {
  ClientPortalSettings,
  ClientProjectView,
  ClientDashboardStats,
  ClientRFIView,
  ClientChangeOrderView,
  ClientDocumentView,
  ClientPhotoView,
  ClientScheduleItemView,
  UpdateClientPortalSettingsDTO,
} from '@/types/client-portal'

export const clientPortalApi = {
  // ============================================
  // Client Project Access
  // ============================================

  /**
   * Get all projects the client has access to
   */
  async getClientProjects(): Promise<ClientProjectView[]> {
    try {
      // Use .rpc() or raw query for views that aren't in the generated types
      const { data, error } = await fromExtended('client_project_summary')
        .select('*')
        .order('name')

      if (error) {throw error}
      return (data || []) as unknown as ClientProjectView[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CLIENT_PROJECTS_ERROR',
            message: 'Failed to fetch client projects',
          })
    }
  },

  /**
   * Get a single project's details for a client
   */
  async getClientProject(projectId: string): Promise<ClientProjectView | null> {
    try {
      const { data, error } = await fromExtended('client_project_summary')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {return null} // Not found
        throw error
      }
      return data as unknown as ClientProjectView
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CLIENT_PROJECT_ERROR',
            message: 'Failed to fetch client project',
          })
    }
  },

  /**
   * Get dashboard statistics for a client
   */
  async getClientDashboardStats(): Promise<ClientDashboardStats> {
    try {
      // Get project counts
      const { data: projects, error: projectsError } = await fromExtended('client_project_summary')
        .select('id, status')

      if (projectsError) {throw projectsError}

      const typedProjects = (projects || []) as unknown as Array<{ id: string; status: string }>
      const projectIds = typedProjects.map(p => p.id)

      // Get open RFIs count
      const { count: openRfis, error: rfisError } = await supabase
        .from('workflow_items')
        .select('id', { count: 'exact', head: true })
        .in('project_id', projectIds)
        .not('status', 'in', '("closed","resolved","cancelled")')

      if (rfisError) {throw rfisError}

      // Get pending change orders
      const { count: pendingCOs, error: cosError } = await supabase
        .from('workflow_items')
        .select('id', { count: 'exact', head: true })
        .in('project_id', projectIds)
        .eq('status', 'pending')

      if (cosError) {throw cosError}

      // Get upcoming milestones (next 30 days)
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

      const { count: milestones, error: milestonesError } = await supabase
        .from('schedule_items')
        .select('id', { count: 'exact', head: true })
        .in('project_id', projectIds)
        .eq('is_milestone', true)
        .gte('finish_date', new Date().toISOString())
        .lte('finish_date', thirtyDaysFromNow.toISOString())

      if (milestonesError) {throw milestonesError}

      return {
        total_projects: typedProjects.length,
        active_projects: typedProjects.filter(p => p.status === 'active').length,
        completed_projects: typedProjects.filter(p => p.status === 'completed').length,
        open_rfis: openRfis || 0,
        pending_change_orders: pendingCOs || 0,
        upcoming_milestones: milestones || 0,
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CLIENT_STATS_ERROR',
            message: 'Failed to fetch dashboard statistics',
          })
    }
  },

  // ============================================
  // Client Portal Settings (Admin)
  // ============================================

  /**
   * Get portal settings for a project
   */
  async getPortalSettings(projectId: string): Promise<ClientPortalSettings | null> {
    try {
      const { data, error } = await fromExtended('client_portal_settings')
        .select('*')
        .eq('project_id', projectId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {return null}
        throw error
      }
      return data as unknown as ClientPortalSettings
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'PORTAL_SETTINGS_ERROR',
            message: 'Failed to fetch portal settings',
          })
    }
  },

  /**
   * Update portal settings for a project
   */
  async updatePortalSettings(
    projectId: string,
    updates: UpdateClientPortalSettingsDTO
  ): Promise<ClientPortalSettings> {
    try {
      const { data, error } = await fromExtended('client_portal_settings')
        .update(updates)
        .eq('project_id', projectId)
        .select()
        .single()

      if (error) {throw error}
      return data as unknown as ClientPortalSettings
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_PORTAL_SETTINGS_ERROR',
            message: 'Failed to update portal settings',
          })
    }
  },

  // ============================================
  // Client RFIs
  // ============================================

  /**
   * Get RFIs for a project (client view)
   */
  async getClientRFIs(projectId: string): Promise<ClientRFIView[]> {
    try {
      const { data, error } = await supabase
        .from('workflow_items')
        .select('id, number, title, description, status, priority, created_at, due_date, resolution')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) {throw error}

      return (data || []).map(item => ({
        id: item.id,
        number: item.number,
        title: item.title,
        description: item.description,
        status: item.status || 'open',
        priority: item.priority,
        created_at: item.created_at,
        due_date: item.due_date,
        resolution: item.resolution,
        resolved_at: null, // Would need to track this separately
      })) as ClientRFIView[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CLIENT_RFIS_ERROR',
            message: 'Failed to fetch RFIs',
          })
    }
  },

  // ============================================
  // Client Change Orders
  // ============================================

  /**
   * Get change orders for a project (client view)
   */
  async getClientChangeOrders(projectId: string): Promise<ClientChangeOrderView[]> {
    try {
      const { data, error } = await supabase
        .from('workflow_items')
        .select('id, number, title, description, status, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) {throw error}

      return (data || []).map(item => ({
        id: item.id,
        number: item.number,
        title: item.title,
        description: item.description,
        status: item.status || 'draft',
        cost_impact: null, // Would need custom field
        schedule_impact_days: null,
        created_at: item.created_at,
        approved_at: null,
      })) as ClientChangeOrderView[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CLIENT_COS_ERROR',
            message: 'Failed to fetch change orders',
          })
    }
  },

  // ============================================
  // Client Documents
  // ============================================

  /**
   * Get documents for a project (client view)
   */
  async getClientDocuments(projectId: string): Promise<ClientDocumentView[]> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('id, name, file_url, file_type, file_size, version, created_at, document_type')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {throw error}

      return (data || []).map(doc => ({
        id: doc.id,
        name: doc.name,
        document_number: null, // Documents table doesn't have document_number
        category: doc.document_type, // Map document_type to category
        file_url: doc.file_url,
        file_type: doc.file_type,
        file_size: doc.file_size,
        version: doc.version,
        uploaded_at: doc.created_at,
      })) as ClientDocumentView[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CLIENT_DOCS_ERROR',
            message: 'Failed to fetch documents',
          })
    }
  },

  // ============================================
  // Client Photos
  // ============================================

  /**
   * Get photos for a project (client view)
   */
  async getClientPhotos(projectId: string): Promise<ClientPhotoView[]> {
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('id, file_url, thumbnail_url, caption, captured_at, latitude, longitude, photo_category')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('captured_at', { ascending: false })

      if (error) {throw error}

      return (data || []).map(photo => ({
        id: photo.id,
        photo_url: photo.file_url,
        thumbnail_url: photo.thumbnail_url,
        caption: photo.caption,
        taken_at: photo.captured_at,
        latitude: photo.latitude,
        longitude: photo.longitude,
        category: photo.photo_category,
      })) as ClientPhotoView[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CLIENT_PHOTOS_ERROR',
            message: 'Failed to fetch photos',
          })
    }
  },

  // ============================================
  // Client Schedule
  // ============================================

  /**
   * Get schedule items for a project (client view)
   */
  async getClientSchedule(projectId: string): Promise<ClientScheduleItemView[]> {
    try {
      const { data, error } = await supabase
        .from('schedule_items')
        .select('id, task_name, start_date, finish_date, duration_days, percent_complete, is_critical')
        .eq('project_id', projectId)
        .order('start_date', { ascending: true })

      if (error) {throw error}

      return (data || []).map(item => ({
        id: item.id,
        task_name: item.task_name,
        start_date: item.start_date,
        finish_date: item.finish_date,
        duration_days: item.duration_days || 1,
        percent_complete: Number(item.percent_complete) || 0,
        is_milestone: false, // Table doesn't have is_milestone column
        is_critical: item.is_critical || false,
        status: null, // Table doesn't have status column
      })) as ClientScheduleItemView[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CLIENT_SCHEDULE_ERROR',
            message: 'Failed to fetch schedule',
          })
    }
  },

  // ============================================
  // Client Invitation
  // ============================================

  /**
   * Invite a client to the portal
   * Creates user with 'client' role and assigns to projects
   */
  async inviteClient(
    email: string,
    projectIds: string[],
    invitedBy: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // This would typically involve:
      // 1. Creating a user invitation or auth invite
      // 2. Creating project_users entries for each project
      // 3. Sending an email invitation

      // For now, just add to project_users if user exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single()

      if (existingUser) {
        // Add user to projects
        const projectUserInserts = projectIds.map(projectId => ({
          project_id: projectId,
          user_id: existingUser.id,
          project_role: 'client',
          can_edit: false,
          can_delete: false,
          can_approve: false,
          assigned_by: invitedBy,
        }))

        const { error } = await supabase
          .from('project_users')
          .upsert(projectUserInserts, { onConflict: 'project_id,user_id' })

        if (error) {throw error}

        return { success: true, message: 'Client added to projects' }
      } else {
        // Would need to create invitation and send email
        return { success: false, message: 'User not found. Email invitation not yet implemented.' }
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'INVITE_CLIENT_ERROR',
            message: 'Failed to invite client',
          })
    }
  },
}
