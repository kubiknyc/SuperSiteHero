/**
 * Permits API Service
 *
 * Supabase API service for the Permits Tracking system
 * Building permits tracking with status workflow and renewal management
 */

import { supabase } from '@/lib/supabase'
import type {
  Permit,
  CreatePermitDTO,
  UpdatePermitDTO,
  PermitFilters,
  PermitStatistics,
  PermitStatus,
  PermitType,
} from '@/types/permits'

// ============================================================================
// PERMITS API
// ============================================================================

export const permitsApi = {
  /**
   * Get all permits with filters
   */
  async getPermits(filters: PermitFilters = {}): Promise<Permit[]> {
    let query = supabase
      .from('permits')
      .select(`
        *,
        project:projects(id, name, project_number),
        created_by_user:users!permits_created_by_fkey(id, full_name, email)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters.project_id) {
      query = query.eq('project_id', filters.project_id)
    }

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.permit_type) {
      query = query.eq('permit_type', filters.permit_type)
    }

    if (filters.issuing_agency) {
      query = query.ilike('issuing_agency', `%${filters.issuing_agency}%`)
    }

    if (filters.requires_inspections !== undefined) {
      query = query.eq('requires_inspections', filters.requires_inspections)
    }

    if (filters.work_cannot_proceed_without !== undefined) {
      query = query.eq('work_cannot_proceed_without', filters.work_cannot_proceed_without)
    }

    if (filters.expiring_before) {
      query = query.lte('expiration_date', filters.expiring_before)
    }

    if (filters.expiring_within_days) {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + filters.expiring_within_days)
      query = query.lte('expiration_date', futureDate.toISOString().split('T')[0])
      query = query.gte('expiration_date', new Date().toISOString().split('T')[0])
    }

    if (filters.search) {
      query = query.or(`permit_name.ilike.%${filters.search}%,permit_number.ilike.%${filters.search}%,issuing_agency.ilike.%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) {throw error}
    return (data || []) as Permit[]
  },

  /**
   * Get a single permit by ID
   */
  async getPermitById(id: string): Promise<Permit> {
    const { data, error } = await supabase
      .from('permits')
      .select(`
        *,
        project:projects(id, name, project_number),
        created_by_user:users!permits_created_by_fkey(id, full_name, email)
      `)
      .eq('id', id)
      .single()

    if (error) {throw error}
    return data as Permit
  },

  /**
   * Get permits for a project
   */
  async getProjectPermits(projectId: string): Promise<Permit[]> {
    const { data, error } = await supabase
      .from('permits')
      .select(`
        *,
        created_by_user:users!permits_created_by_fkey(id, full_name, email)
      `)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {throw error}
    return (data || []) as Permit[]
  },

  /**
   * Create a new permit
   */
  async createPermit(dto: CreatePermitDTO): Promise<Permit> {
    const { data: user } = await supabase.auth.getUser()

    const permitData = {
      project_id: dto.project_id,
      permit_name: dto.permit_name,
      permit_type: dto.permit_type,
      permit_number: dto.permit_number || null,
      status: dto.status || 'pending',
      permit_document_url: dto.permit_document_url || null,
      application_date: dto.application_date || null,
      issue_date: dto.issue_date || null,
      expiration_date: dto.expiration_date || null,
      renewal_date: dto.renewal_date || null,
      renewal_reminder_days_before: dto.renewal_reminder_days_before || 30,
      issuing_agency: dto.issuing_agency || null,
      agency_contact: dto.agency_contact || null,
      agency_phone: dto.agency_phone || null,
      work_cannot_proceed_without: dto.work_cannot_proceed_without || false,
      requires_inspections: dto.requires_inspections || false,
      notes: dto.notes || null,
      created_by: user?.user?.id,
    }

    const { data, error } = await supabase
      .from('permits')
      .insert(permitData)
      .select(`
        *,
        project:projects(id, name, project_number),
        created_by_user:users!permits_created_by_fkey(id, full_name, email)
      `)
      .single()

    if (error) {throw error}
    return data as Permit
  },

  /**
   * Update a permit
   */
  async updatePermit(id: string, dto: UpdatePermitDTO): Promise<Permit> {
    const { data, error } = await supabase
      .from('permits')
      .update({
        ...dto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        project:projects(id, name, project_number),
        created_by_user:users!permits_created_by_fkey(id, full_name, email)
      `)
      .single()

    if (error) {throw error}
    return data as Permit
  },

  /**
   * Update permit status
   */
  async updatePermitStatus(id: string, status: PermitStatus | string): Promise<Permit> {
    return this.updatePermit(id, { status })
  },

  /**
   * Soft delete a permit
   */
  async deletePermit(id: string): Promise<void> {
    const { error } = await supabase
      .from('permits')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {throw error}
  },

  /**
   * Mark renewal reminder as sent
   */
  async markRenewalReminderSent(id: string): Promise<Permit> {
    return this.updatePermit(id, { renewal_reminder_sent: true })
  },

  /**
   * Get expiring permits (within specified days)
   */
  async getExpiringPermits(projectId: string | undefined, withinDays: number = 30): Promise<Permit[]> {
    const today = new Date().toISOString().split('T')[0]
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + withinDays)

    let query = supabase
      .from('permits')
      .select(`
        *,
        project:projects(id, name, project_number),
        created_by_user:users!permits_created_by_fkey(id, full_name, email)
      `)
      .is('deleted_at', null)
      .gte('expiration_date', today)
      .lte('expiration_date', futureDate.toISOString().split('T')[0])
      .not('status', 'in', '("closed","revoked")')
      .order('expiration_date', { ascending: true })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query

    if (error) {throw error}
    return (data || []) as Permit[]
  },

  /**
   * Get expired permits
   */
  async getExpiredPermits(projectId?: string): Promise<Permit[]> {
    const today = new Date().toISOString().split('T')[0]

    let query = supabase
      .from('permits')
      .select(`
        *,
        project:projects(id, name, project_number),
        created_by_user:users!permits_created_by_fkey(id, full_name, email)
      `)
      .is('deleted_at', null)
      .lt('expiration_date', today)
      .not('status', 'in', '("closed","renewed")')
      .order('expiration_date', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query

    if (error) {throw error}
    return (data || []) as Permit[]
  },

  /**
   * Get critical permits (work cannot proceed without)
   */
  async getCriticalPermits(projectId: string): Promise<Permit[]> {
    const { data, error } = await supabase
      .from('permits')
      .select(`
        *,
        created_by_user:users!permits_created_by_fkey(id, full_name, email)
      `)
      .eq('project_id', projectId)
      .eq('work_cannot_proceed_without', true)
      .is('deleted_at', null)
      .not('status', 'in', '("closed","issued","active")')
      .order('created_at', { ascending: false })

    if (error) {throw error}
    return (data || []) as Permit[]
  },

  /**
   * Get permits requiring inspections
   */
  async getPermitsRequiringInspections(projectId: string): Promise<Permit[]> {
    const { data, error } = await supabase
      .from('permits')
      .select(`
        *,
        created_by_user:users!permits_created_by_fkey(id, full_name, email)
      `)
      .eq('project_id', projectId)
      .eq('requires_inspections', true)
      .is('deleted_at', null)
      .in('status', ['issued', 'active'])
      .order('created_at', { ascending: false })

    if (error) {throw error}
    return (data || []) as Permit[]
  },

  /**
   * Get permit statistics for a project
   */
  async getPermitStatistics(projectId: string): Promise<PermitStatistics> {
    const { data: permits, error } = await supabase
      .from('permits')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null)

    if (error) {throw error}

    const today = new Date()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const stats: PermitStatistics = {
      total: permits?.length || 0,
      by_status: {},
      by_type: {},
      expiring_soon: 0,
      expired: 0,
      critical_permits: 0,
    }

    if (!permits) {return stats}

    for (const permit of permits) {
      // Count by status
      const status = permit.status || 'unknown'
      stats.by_status[status] = (stats.by_status[status] || 0) + 1

      // Count by type
      const type = permit.permit_type || 'unknown'
      stats.by_type[type] = (stats.by_type[type] || 0) + 1

      // Count expiring soon (within 30 days)
      if (permit.expiration_date) {
        const expDate = new Date(permit.expiration_date)
        if (expDate > today && expDate <= thirtyDaysFromNow) {
          stats.expiring_soon++
        }
        // Count expired
        if (expDate < today && permit.status !== 'closed' && permit.status !== 'renewed') {
          stats.expired++
        }
      }

      // Count critical permits that aren't active
      if (permit.work_cannot_proceed_without &&
          permit.status !== 'issued' &&
          permit.status !== 'active' &&
          permit.status !== 'closed') {
        stats.critical_permits++
      }
    }

    return stats
  },

  /**
   * Get permits needing renewal reminders
   */
  async getPermitsNeedingRenewalReminder(): Promise<Permit[]> {
    const today = new Date()

    // Get permits where expiration_date - renewal_reminder_days_before <= today
    // and renewal_reminder_sent is false
    const { data, error } = await supabase
      .from('permits')
      .select(`
        *,
        project:projects(id, name, project_number)
      `)
      .is('deleted_at', null)
      .eq('renewal_reminder_sent', false)
      .not('expiration_date', 'is', null)
      .gte('expiration_date', today.toISOString().split('T')[0])
      .in('status', ['issued', 'active'])

    if (error) {throw error}

    // Filter in JS since the date math is complex
    return (data || []).filter(permit => {
      if (!permit.expiration_date) {return false}
      const expDate = new Date(permit.expiration_date)
      const reminderDays = permit.renewal_reminder_days_before || 30
      const reminderDate = new Date(expDate)
      reminderDate.setDate(reminderDate.getDate() - reminderDays)
      return today >= reminderDate
    }) as Permit[]
  },

  /**
   * Get permits by status
   */
  async getPermitsByStatus(projectId: string, status: PermitStatus | string): Promise<Permit[]> {
    const { data, error } = await supabase
      .from('permits')
      .select(`
        *,
        created_by_user:users!permits_created_by_fkey(id, full_name, email)
      `)
      .eq('project_id', projectId)
      .eq('status', status)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {throw error}
    return (data || []) as Permit[]
  },

  /**
   * Get permits by type
   */
  async getPermitsByType(projectId: string, permitType: PermitType | string): Promise<Permit[]> {
    const { data, error } = await supabase
      .from('permits')
      .select(`
        *,
        created_by_user:users!permits_created_by_fkey(id, full_name, email)
      `)
      .eq('project_id', projectId)
      .eq('permit_type', permitType)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {throw error}
    return (data || []) as Permit[]
  },
}

// Export as default
export default permitsApi
