/**
 * Safety Incidents API Service
 *
 * OSHA-compliant safety incident reporting with:
 * - Full incident lifecycle management
 * - Witness statements and photo documentation
 * - Corrective actions (linked to tasks)
 * - Automatic notifications for serious incidents
 * - Statistics and dashboard data
 */

import { supabase } from '@/lib/supabase'
import { ApiErrorClass } from '../errors'
import { sendIncidentNotification, type NotificationRecipient } from '@/lib/notifications/notification-service'
import { logger } from '@/lib/utils/logger'
import type {
  SafetyIncident,
  SafetyIncidentWithDetails,
  IncidentPerson,
  IncidentPhoto,
  IncidentCorrectiveAction,
  IncidentNotification,
  CreateIncidentDTO,
  UpdateIncidentDTO,
  CreateIncidentPersonDTO,
  CreateIncidentPhotoDTO,
  CreateCorrectiveActionDTO,
  UpdateCorrectiveActionDTO,
  IncidentFilters,
  CorrectiveActionFilters,
  IncidentStats,
  CorrectiveActionStats,
  IncidentSeverity,
  IncidentType,
  IncidentStatus,
} from '@/types/safety-incidents'

// Use 'any' cast for tables not in generated types
const db = supabase as any

// ============================================================================
// INCIDENT CRUD OPERATIONS
// ============================================================================

export const safetyIncidentsApi = {
  /**
   * Get all incidents with optional filters
   */
  async getIncidents(filters: IncidentFilters = {}): Promise<SafetyIncident[]> {
    try {
      let query = db
        .from('safety_incidents')
        .select(`
          *,
          reporter:users!safety_incidents_reported_by_fkey(
            id,
            full_name,
            email,
            avatar_url
          ),
          project:projects(id, name)
        `)
        .order('incident_date', { ascending: false })

      // Apply filters
      if (filters.project_id) {
        query = query.eq('project_id', filters.project_id)
      }
      if (filters.company_id) {
        query = query.eq('company_id', filters.company_id)
      }
      if (filters.severity) {
        if (Array.isArray(filters.severity)) {
          query = query.in('severity', filters.severity)
        } else {
          query = query.eq('severity', filters.severity)
        }
      }
      if (filters.incident_type) {
        if (Array.isArray(filters.incident_type)) {
          query = query.in('incident_type', filters.incident_type)
        } else {
          query = query.eq('incident_type', filters.incident_type)
        }
      }
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status)
        } else {
          query = query.eq('status', filters.status)
        }
      }
      if (filters.osha_recordable !== undefined) {
        query = query.eq('osha_recordable', filters.osha_recordable)
      }
      if (filters.date_from) {
        query = query.gte('incident_date', filters.date_from)
      }
      if (filters.date_to) {
        query = query.lte('incident_date', filters.date_to)
      }
      if (filters.search) {
        query = query.or(`description.ilike.%${filters.search}%,location.ilike.%${filters.search}%`)
      }
      if (!filters.include_deleted) {
        query = query.is('deleted_at', null)
      }

      const { data, error } = await query

      if (error) {throw error}
      return (data || []) as SafetyIncident[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_INCIDENTS_ERROR',
            message: 'Failed to fetch safety incidents',
            details: error,
          })
    }
  },

  /**
   * Get a single incident by ID
   */
  async getIncident(id: string): Promise<SafetyIncident> {
    try {
      const { data, error } = await db
        .from('safety_incidents')
        .select(`
          *,
          reporter:users!safety_incidents_reported_by_fkey(
            id,
            full_name,
            email,
            avatar_url
          ),
          project:projects(id, name)
        `)
        .eq('id', id)
        .single()

      if (error) {throw error}
      if (!data) {
        throw new ApiErrorClass({
          code: 'INCIDENT_NOT_FOUND',
          message: 'Safety incident not found',
        })
      }

      return data as SafetyIncident
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_INCIDENT_ERROR',
            message: 'Failed to fetch safety incident',
            details: error,
          })
    }
  },

  /**
   * Get incident with all related data
   */
  async getIncidentWithDetails(id: string): Promise<SafetyIncidentWithDetails> {
    try {
      const { data: incident, error: incidentError } = await db
        .from('safety_incidents')
        .select(`
          *,
          reporter:users!safety_incidents_reported_by_fkey(
            id,
            full_name,
            email,
            avatar_url
          ),
          project:projects(id, name)
        `)
        .eq('id', id)
        .single()

      if (incidentError) {throw incidentError}
      if (!incident) {
        throw new ApiErrorClass({
          code: 'INCIDENT_NOT_FOUND',
          message: 'Safety incident not found',
        })
      }

      // Fetch related data in parallel
      const [peopleResult, photosResult, actionsResult] = await Promise.all([
        db.from('safety_incident_people').select('*').eq('incident_id', id),
        db.from('safety_incident_photos').select(`
          *,
          uploader:users!safety_incident_photos_uploaded_by_fkey(
            id,
            full_name,
            email
          )
        `).eq('incident_id', id),
        db.from('safety_incident_corrective_actions').select(`
          *,
          assignee:users!safety_incident_corrective_actions_assigned_to_fkey(
            id,
            full_name,
            email
          ),
          linked_task:tasks(id, title, status)
        `).eq('incident_id', id),
      ])

      return {
        ...incident,
        people: peopleResult.data || [],
        photos: photosResult.data || [],
        corrective_actions: actionsResult.data || [],
      } as SafetyIncidentWithDetails
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_INCIDENT_DETAILS_ERROR',
            message: 'Failed to fetch incident details',
            details: error,
          })
    }
  },

  /**
   * Create a new incident
   */
  async createIncident(input: CreateIncidentDTO): Promise<SafetyIncident> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new ApiErrorClass({
          code: 'AUTH_REQUIRED',
          message: 'You must be logged in to report an incident',
        })
      }

      const { data, error } = await db
        .from('safety_incidents')
        .insert({
          ...input,
          reported_by: user.id,
          status: 'reported',
        })
        .select(`
          *,
          reporter:users!safety_incidents_reported_by_fkey(
            id,
            full_name,
            email,
            avatar_url
          ),
          project:projects(id, name)
        `)
        .single()

      if (error) {throw error}

      // Check if this is a serious incident that needs notifications
      if (this._isSeriousIncident(input.severity)) {
        // Trigger notifications asynchronously (don't block the response)
        this.notifyForSeriousIncident(data.id).catch(err => logger.error('[SafetyIncidents] Failed to notify serious incident:', err))
      }

      return data as SafetyIncident
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_INCIDENT_ERROR',
            message: 'Failed to create safety incident',
            details: error,
          })
    }
  },

  /**
   * Update an incident
   */
  async updateIncident(id: string, input: UpdateIncidentDTO): Promise<SafetyIncident> {
    try {
      const { data, error } = await db
        .from('safety_incidents')
        .update(input)
        .eq('id', id)
        .select(`
          *,
          reporter:users!safety_incidents_reported_by_fkey(
            id,
            full_name,
            email,
            avatar_url
          ),
          project:projects(id, name)
        `)
        .single()

      if (error) {throw error}
      if (!data) {
        throw new ApiErrorClass({
          code: 'INCIDENT_NOT_FOUND',
          message: 'Safety incident not found',
        })
      }

      return data as SafetyIncident
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_INCIDENT_ERROR',
            message: 'Failed to update safety incident',
            details: error,
          })
    }
  },

  /**
   * Soft delete an incident
   */
  async deleteIncident(id: string): Promise<void> {
    try {
      const { error } = await db
        .from('safety_incidents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {throw error}
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_INCIDENT_ERROR',
            message: 'Failed to delete safety incident',
            details: error,
          })
    }
  },

  /**
   * Close an incident
   */
  async closeIncident(id: string): Promise<SafetyIncident> {
    return this.updateIncident(id, { status: 'closed' })
  },

  /**
   * Start investigation on an incident
   */
  async startInvestigation(id: string): Promise<SafetyIncident> {
    return this.updateIncident(id, { status: 'under_investigation' })
  },

  // ============================================================================
  // PEOPLE (WITNESSES, INJURED PARTIES)
  // ============================================================================

  /**
   * Get all people involved in an incident
   */
  async getIncidentPeople(incidentId: string): Promise<IncidentPerson[]> {
    try {
      const { data, error } = await db
        .from('safety_incident_people')
        .select('*')
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: true })

      if (error) {throw error}
      return (data || []) as IncidentPerson[]
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_PEOPLE_ERROR',
        message: 'Failed to fetch incident people',
        details: error,
      })
    }
  },

  /**
   * Add a person to an incident
   */
  async addPerson(input: CreateIncidentPersonDTO): Promise<IncidentPerson> {
    try {
      const { data, error } = await db
        .from('safety_incident_people')
        .insert(input)
        .select()
        .single()

      if (error) {throw error}
      return data as IncidentPerson
    } catch (error) {
      throw new ApiErrorClass({
        code: 'ADD_PERSON_ERROR',
        message: 'Failed to add person to incident',
        details: error,
      })
    }
  },

  /**
   * Update a person record
   */
  async updatePerson(id: string, input: Partial<CreateIncidentPersonDTO>): Promise<IncidentPerson> {
    try {
      const { data, error } = await db
        .from('safety_incident_people')
        .update(input)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as IncidentPerson
    } catch (error) {
      throw new ApiErrorClass({
        code: 'UPDATE_PERSON_ERROR',
        message: 'Failed to update person',
        details: error,
      })
    }
  },

  /**
   * Remove a person from incident
   */
  async removePerson(id: string): Promise<void> {
    try {
      const { error } = await db
        .from('safety_incident_people')
        .delete()
        .eq('id', id)

      if (error) {throw error}
    } catch (error) {
      throw new ApiErrorClass({
        code: 'REMOVE_PERSON_ERROR',
        message: 'Failed to remove person',
        details: error,
      })
    }
  },

  // ============================================================================
  // PHOTOS
  // ============================================================================

  /**
   * Get all photos for an incident
   */
  async getIncidentPhotos(incidentId: string): Promise<IncidentPhoto[]> {
    try {
      const { data, error } = await db
        .from('safety_incident_photos')
        .select(`
          *,
          uploader:users!safety_incident_photos_uploaded_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: false })

      if (error) {throw error}
      return (data || []) as IncidentPhoto[]
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_PHOTOS_ERROR',
        message: 'Failed to fetch incident photos',
        details: error,
      })
    }
  },

  /**
   * Add a photo to an incident
   */
  async addPhoto(input: CreateIncidentPhotoDTO): Promise<IncidentPhoto> {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await db
        .from('safety_incident_photos')
        .insert({
          ...input,
          uploaded_by: user?.id,
        })
        .select()
        .single()

      if (error) {throw error}
      return data as IncidentPhoto
    } catch (error) {
      throw new ApiErrorClass({
        code: 'ADD_PHOTO_ERROR',
        message: 'Failed to add photo to incident',
        details: error,
      })
    }
  },

  /**
   * Update photo caption
   */
  async updatePhoto(id: string, caption: string): Promise<IncidentPhoto> {
    try {
      const { data, error } = await db
        .from('safety_incident_photos')
        .update({ caption })
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as IncidentPhoto
    } catch (error) {
      throw new ApiErrorClass({
        code: 'UPDATE_PHOTO_ERROR',
        message: 'Failed to update photo',
        details: error,
      })
    }
  },

  /**
   * Remove a photo from incident
   */
  async removePhoto(id: string): Promise<void> {
    try {
      const { error } = await db
        .from('safety_incident_photos')
        .delete()
        .eq('id', id)

      if (error) {throw error}
    } catch (error) {
      throw new ApiErrorClass({
        code: 'REMOVE_PHOTO_ERROR',
        message: 'Failed to remove photo',
        details: error,
      })
    }
  },

  /**
   * Upload a photo to storage and add to incident
   */
  async uploadPhoto(incidentId: string, file: File, caption?: string): Promise<IncidentPhoto> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new ApiErrorClass({
          code: 'AUTH_REQUIRED',
          message: 'You must be logged in to upload photos',
        })
      }

      // Generate unique filename
      const ext = file.name.split('.').pop()
      const fileName = `${incidentId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('incident-photos')
        .upload(fileName, file)

      if (uploadError) {throw uploadError}

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('incident-photos')
        .getPublicUrl(uploadData.path)

      // Create photo record
      return this.addPhoto({
        incident_id: incidentId,
        photo_url: urlData.publicUrl,
        caption,
        taken_at: new Date().toISOString(),
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPLOAD_PHOTO_ERROR',
            message: 'Failed to upload photo',
            details: error,
          })
    }
  },

  // ============================================================================
  // CORRECTIVE ACTIONS
  // ============================================================================

  /**
   * Get corrective actions with optional filters
   */
  async getCorrectiveActions(filters: CorrectiveActionFilters = {}): Promise<IncidentCorrectiveAction[]> {
    try {
      let query = db
        .from('safety_incident_corrective_actions')
        .select(`
          *,
          assignee:users!safety_incident_corrective_actions_assigned_to_fkey(
            id,
            full_name,
            email
          ),
          linked_task:tasks(id, title, status)
        `)
        .order('created_at', { ascending: false })

      if (filters.incident_id) {
        query = query.eq('incident_id', filters.incident_id)
      }
      if (filters.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to)
      }
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status)
        } else {
          query = query.eq('status', filters.status)
        }
      }
      if (filters.overdue) {
        query = query.eq('status', 'overdue')
      }

      const { data, error } = await query

      if (error) {throw error}
      return (data || []) as IncidentCorrectiveAction[]
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_ACTIONS_ERROR',
        message: 'Failed to fetch corrective actions',
        details: error,
      })
    }
  },

  /**
   * Create a corrective action
   */
  async createCorrectiveAction(input: CreateCorrectiveActionDTO): Promise<IncidentCorrectiveAction> {
    try {
      const { data, error } = await db
        .from('safety_incident_corrective_actions')
        .insert({
          ...input,
          status: 'pending',
        })
        .select(`
          *,
          assignee:users!safety_incident_corrective_actions_assigned_to_fkey(
            id,
            full_name,
            email
          )
        `)
        .single()

      if (error) {throw error}

      // Update incident status if this is the first action
      await this._updateIncidentStatusIfNeeded(input.incident_id)

      return data as IncidentCorrectiveAction
    } catch (error) {
      throw new ApiErrorClass({
        code: 'CREATE_ACTION_ERROR',
        message: 'Failed to create corrective action',
        details: error,
      })
    }
  },

  /**
   * Update a corrective action
   */
  async updateCorrectiveAction(id: string, input: UpdateCorrectiveActionDTO): Promise<IncidentCorrectiveAction> {
    try {
      const { data, error } = await db
        .from('safety_incident_corrective_actions')
        .update(input)
        .eq('id', id)
        .select(`
          *,
          assignee:users!safety_incident_corrective_actions_assigned_to_fkey(
            id,
            full_name,
            email
          )
        `)
        .single()

      if (error) {throw error}
      return data as IncidentCorrectiveAction
    } catch (error) {
      throw new ApiErrorClass({
        code: 'UPDATE_ACTION_ERROR',
        message: 'Failed to update corrective action',
        details: error,
      })
    }
  },

  /**
   * Complete a corrective action
   */
  async completeCorrectiveAction(id: string, notes?: string): Promise<IncidentCorrectiveAction> {
    return this.updateCorrectiveAction(id, {
      status: 'completed',
      completed_date: new Date().toISOString().split('T')[0],
      notes,
    })
  },

  /**
   * Delete a corrective action
   */
  async deleteCorrectiveAction(id: string): Promise<void> {
    try {
      const { error } = await db
        .from('safety_incident_corrective_actions')
        .delete()
        .eq('id', id)

      if (error) {throw error}
    } catch (error) {
      throw new ApiErrorClass({
        code: 'DELETE_ACTION_ERROR',
        message: 'Failed to delete corrective action',
        details: error,
      })
    }
  },

  /**
   * Link corrective action to a task
   */
  async linkToTask(actionId: string, taskId: string): Promise<IncidentCorrectiveAction> {
    return this.updateCorrectiveAction(actionId, { linked_task_id: taskId })
  },

  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================

  /**
   * Send notifications for a serious incident
   * Sends both email and in-app notifications to project stakeholders
   */
  async notifyForSeriousIncident(incidentId: string): Promise<void> {
    try {
      // Get incident details with project info
      const incident = await this.getIncident(incidentId)

      if (!this._isSeriousIncident(incident.severity)) {
        return // Not serious enough for notification
      }

      // Get project users to notify
      const { data: users, error: usersError } = await db.rpc(
        'get_project_users_for_notification',
        { p_project_id: incident.project_id }
      )

      if (usersError) {throw usersError}

      if (!users || users.length === 0) {
        logger.log('No users to notify for incident:', incidentId)
        return
      }

      const appUrl = import.meta.env.VITE_APP_URL || 'https://supersitehero.com'

      // Prepare notification recipients
      const recipients: NotificationRecipient[] = (users || []).map((user: any) => ({
        userId: user.user_id,
        email: user.email,
        name: user.full_name,
      }))

      // Send email notifications via the notification service
      await sendIncidentNotification(recipients, {
        incidentNumber: incident.incident_number,
        severity: incident.severity,
        incidentType: incident.incident_type,
        description: incident.description,
        location: incident.location || 'Not specified',
        incidentDate: new Date(incident.incident_date).toLocaleDateString(),
        incidentTime: incident.incident_time || 'Not specified',
        reportedBy: incident.reporter?.full_name || 'Unknown',
        projectName: incident.project?.name || 'Unknown Project',
        viewUrl: `${appUrl}/safety/${incidentId}`,
      })

      // Also create notification records in incident_notifications table for tracking
      const notificationRecords = recipients.map((user) => ({
        incident_id: incidentId,
        user_id: user.userId,
        notification_type: 'email',
        subject: `Serious Safety Incident: ${incident.incident_number}`,
        message: `A ${incident.severity.replace('_', ' ')} incident has been reported: ${incident.description.substring(0, 100)}...`,
        delivery_status: 'sent',
      }))

      if (notificationRecords.length > 0) {
        await db.from('incident_notifications').insert(notificationRecords)
      }

      logger.log(`Sent ${recipients.length} notifications for serious incident: ${incident.incident_number}`)
    } catch (error) {
      logger.error('Failed to send incident notifications:', error)
      // Don't throw - notifications are best effort
    }
  },

  /**
   * Get notifications for a user
   */
  async getNotifications(userId?: string): Promise<IncidentNotification[]> {
    try {
      let query = db
        .from('incident_notifications')
        .select(`
          *,
          incident:safety_incidents(id, incident_number, severity, description)
        `)
        .order('sent_at', { ascending: false })

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query

      if (error) {throw error}
      return (data || []) as IncidentNotification[]
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_NOTIFICATIONS_ERROR',
        message: 'Failed to fetch notifications',
        details: error,
      })
    }
  },

  /**
   * Mark notification as read
   */
  async markNotificationRead(id: string): Promise<void> {
    try {
      await db
        .from('incident_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)
    } catch (error) {
      // Non-critical, don't throw
      logger.error('Failed to mark notification as read:', error)
    }
  },

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Get incident statistics for a project or company
   */
  async getStats(projectId?: string, companyId?: string): Promise<IncidentStats> {
    try {
      let query = db
        .from('safety_incidents')
        .select('*')
        .is('deleted_at', null)

      if (projectId) {
        query = query.eq('project_id', projectId)
      }
      if (companyId) {
        query = query.eq('company_id', companyId)
      }

      const { data: incidents, error } = await query

      if (error) {throw error}

      const data = incidents || []
      const now = new Date()

      // Calculate statistics
      const stats: IncidentStats = {
        total_incidents: data.length,
        open_incidents: data.filter((i: any) => i.status !== 'closed').length,
        closed_incidents: data.filter((i: any) => i.status === 'closed').length,
        near_misses: data.filter((i: any) => i.severity === 'near_miss').length,
        first_aid_incidents: data.filter((i: any) => i.severity === 'first_aid').length,
        medical_treatment_incidents: data.filter((i: any) => i.severity === 'medical_treatment').length,
        lost_time_incidents: data.filter((i: any) => i.severity === 'lost_time').length,
        fatalities: data.filter((i: any) => i.severity === 'fatality').length,
        osha_recordable_count: data.filter((i: any) => i.osha_recordable).length,
        total_days_away: data.reduce((sum: number, i: any) => sum + (i.days_away_from_work || 0), 0),
        total_days_restricted: data.reduce((sum: number, i: any) => sum + (i.days_restricted_duty || 0), 0),
        last_incident_date: data.length > 0
          ? data.sort((a: any, b: any) => new Date(b.incident_date).getTime() - new Date(a.incident_date).getTime())[0].incident_date
          : null,
        days_since_last_incident: 0,
        by_severity: {
          near_miss: 0,
          first_aid: 0,
          medical_treatment: 0,
          lost_time: 0,
          fatality: 0,
        },
        by_type: {
          injury: 0,
          illness: 0,
          property_damage: 0,
          environmental: 0,
          near_miss: 0,
          other: 0,
        },
        by_status: {
          reported: 0,
          under_investigation: 0,
          corrective_actions: 0,
          closed: 0,
        },
        by_month: [],
      }

      // Calculate days since last incident (excluding near misses)
      const lastRealIncident = data
        .filter((i: any) => i.severity !== 'near_miss')
        .sort((a: any, b: any) => new Date(b.incident_date).getTime() - new Date(a.incident_date).getTime())[0]

      if (lastRealIncident) {
        const lastDate = new Date(lastRealIncident.incident_date)
        stats.days_since_last_incident = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      } else {
        stats.days_since_last_incident = 999 // No incidents
      }

      // Count by severity
      data.forEach((i: any) => {
        if (stats.by_severity[i.severity as IncidentSeverity] !== undefined) {
          stats.by_severity[i.severity as IncidentSeverity]++
        }
        if (stats.by_type[i.incident_type as IncidentType] !== undefined) {
          stats.by_type[i.incident_type as IncidentType]++
        }
        if (stats.by_status[i.status as IncidentStatus] !== undefined) {
          stats.by_status[i.status as IncidentStatus]++
        }
      })

      // Group by month (last 12 months)
      const monthCounts: Record<string, number> = {}
      data.forEach((i: any) => {
        const month = i.incident_date.substring(0, 7) // YYYY-MM
        monthCounts[month] = (monthCounts[month] || 0) + 1
      })

      stats.by_month = Object.entries(monthCounts)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-12)
        .map(([month, count]) => ({ month, count }))

      return stats
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_STATS_ERROR',
        message: 'Failed to fetch incident statistics',
        details: error,
      })
    }
  },

  /**
   * Get corrective action statistics
   */
  async getCorrectiveActionStats(incidentId?: string): Promise<CorrectiveActionStats> {
    try {
      let query = db.from('safety_incident_corrective_actions').select('status')

      if (incidentId) {
        query = query.eq('incident_id', incidentId)
      }

      const { data, error } = await query

      if (error) {throw error}

      const actions = data || []
      const total = actions.length
      const pending = actions.filter((a: any) => a.status === 'pending').length
      const in_progress = actions.filter((a: any) => a.status === 'in_progress').length
      const completed = actions.filter((a: any) => a.status === 'completed').length
      const overdue = actions.filter((a: any) => a.status === 'overdue').length

      return {
        total,
        pending,
        in_progress,
        completed,
        overdue,
        completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
      }
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_ACTION_STATS_ERROR',
        message: 'Failed to fetch corrective action statistics',
        details: error,
      })
    }
  },

  /**
   * Get recent incidents for dashboard
   */
  async getRecentIncidents(projectId: string, limit = 5): Promise<SafetyIncident[]> {
    try {
      const { data, error } = await db
        .from('safety_incidents')
        .select(`
          *,
          reporter:users!safety_incidents_reported_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('incident_date', { ascending: false })
        .limit(limit)

      if (error) {throw error}
      return (data || []) as SafetyIncident[]
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_RECENT_ERROR',
        message: 'Failed to fetch recent incidents',
        details: error,
      })
    }
  },

  // ============================================================================
  // OSHA 300 LOG FUNCTIONS
  // ============================================================================

  /**
   * Get OSHA 300A Annual Summary for a project or company-wide
   */
  async getOSHA300ASummary(year: number, projectId?: string): Promise<{
    project_id: string | null
    establishment_name: string
    calendar_year: number
    total_deaths: number
    total_days_away_cases: number
    total_restriction_cases: number
    total_other_cases: number
    total_days_away: number
    total_days_restriction: number
    total_injuries: number
    total_illnesses: number
    skin_disorders: number
    respiratory_conditions: number
    poisoning_cases: number
    hearing_loss_cases: number
    other_illnesses: number
    total_recordable_cases: number
  } | null> {
    try {
      let query = db
        .from('osha_300a_summary')
        .select('*')
        .eq('calendar_year', year)

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query.maybeSingle()

      if (error) {throw error}
      return data
    } catch (error) {
      // View might not exist yet - return null
      logger.warn('OSHA 300A summary fetch failed:', error)
      return null
    }
  },

  /**
   * Get next OSHA case number for a project/year
   */
  async getNextCaseNumber(projectId: string, year?: number): Promise<string> {
    try {
      const targetYear = year || new Date().getFullYear()

      const { data, error } = await db.rpc('get_next_osha_case_number', {
        p_project_id: projectId,
        p_year: targetYear,
      })

      if (error) {
        // If the function doesn't exist, generate manually
        logger.warn('get_next_osha_case_number RPC failed, generating manually:', error)

        // Fallback: count existing cases and increment
        const { count } = await db
          .from('safety_incidents')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', projectId)
          .gte('incident_date', `${targetYear}-01-01`)
          .lte('incident_date', `${targetYear}-12-31`)
          .not('case_number', 'is', null)

        const nextNum = (count || 0) + 1
        return `${targetYear}-${String(nextNum).padStart(3, '0')}`
      }

      return data || `${targetYear}-001`
    } catch (error) {
      throw new ApiErrorClass({
        code: 'GENERATE_CASE_NUMBER_ERROR',
        message: 'Failed to generate OSHA case number',
        details: error,
      })
    }
  },

  /**
   * Calculate OSHA incidence rates for a project/year
   */
  async getOSHAIncidenceRates(
    year: number,
    hoursWorked: number,
    projectId?: string
  ): Promise<{
    totalRecordableIncidentRate: number
    dartRate: number
    totalRecordableCases: number
    dartCases: number
  }> {
    try {
      const summary = await this.getOSHA300ASummary(year, projectId)

      if (!summary || hoursWorked === 0) {
        return {
          totalRecordableIncidentRate: 0,
          dartRate: 0,
          totalRecordableCases: 0,
          dartCases: 0,
        }
      }

      const totalRecordable = summary.total_recordable_cases
      const dartCases = summary.total_days_away_cases + summary.total_restriction_cases

      // OSHA formula: (N × 200,000) / EH
      // Where N = number of cases, EH = total hours worked
      // 200,000 = base for 100 FTE workers (40 hrs/week × 50 weeks)
      const trir = Number(((totalRecordable * 200000) / hoursWorked).toFixed(2))
      const dart = Number(((dartCases * 200000) / hoursWorked).toFixed(2))

      return {
        totalRecordableIncidentRate: trir,
        dartRate: dart,
        totalRecordableCases: totalRecordable,
        dartCases,
      }
    } catch (error) {
      throw new ApiErrorClass({
        code: 'CALCULATE_RATES_ERROR',
        message: 'Failed to calculate OSHA incidence rates',
        details: error,
      })
    }
  },

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Check if severity is considered serious
   */
  _isSeriousIncident(severity: IncidentSeverity): boolean {
    return ['medical_treatment', 'lost_time', 'fatality'].includes(severity)
  },

  /**
   * Update incident status based on corrective actions
   */
  async _updateIncidentStatusIfNeeded(incidentId: string): Promise<void> {
    try {
      const incident = await this.getIncident(incidentId)

      // Only update if currently under investigation
      if (incident.status === 'under_investigation') {
        await this.updateIncident(incidentId, { status: 'corrective_actions' })
      }
    } catch (error) {
      logger.error('Failed to update incident status:', error)
    }
  },
}
