/**
 * Safety Observations API Service
 *
 * API service for Safety Observation Cards feature including:
 * - CRUD operations for observations
 * - Photo management
 * - Comment/activity tracking
 * - Gamification points and leaderboard
 * - Statistics and analytics
 * - Notification management
 */

import { supabase } from '@/lib/supabase'
import { ApiErrorClass } from '../errors'
import { logger } from '@/lib/utils/logger'
import type {
  SafetyObservation,
  SafetyObservationWithDetails,
  ObservationPhoto,
  ObservationComment,
  ObserverPoints,
  LeaderboardEntry,
  CreateObservationDTO,
  UpdateObservationDTO,
  CreateObservationPhotoDTO,
  CreateObservationCommentDTO,
  ObservationFilters,
  LeaderboardFilters,
  ObservationStats,
  LeadingIndicators,
  SafetyObservationType,
  SafetyObservationCategory,
  SafetyObservationStatus,
  ObservationSeverity,
} from '@/types/safety-observations'

// Use 'any' cast for tables not in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// ============================================================================
// OBSERVATION CRUD OPERATIONS
// ============================================================================

export const safetyObservationsApi = {
  /**
   * Get all observations with optional filters
   */
  async getObservations(filters: ObservationFilters = {}): Promise<SafetyObservation[]> {
    try {
      let query = db
        .from('safety_observations')
        .select(`
          *,
          observer:auth.users!safety_observations_observer_id_fkey(
            id,
            raw_user_meta_data->full_name,
            email
          ),
          assignee:auth.users!safety_observations_assigned_to_fkey(
            id,
            raw_user_meta_data->full_name,
            email
          ),
          project:projects(id, name)
        `)
        .order('observed_at', { ascending: false })

      // Apply filters
      if (filters.project_id) {
        query = query.eq('project_id', filters.project_id)
      }
      if (filters.company_id) {
        query = query.eq('company_id', filters.company_id)
      }
      if (filters.observer_id) {
        query = query.eq('observer_id', filters.observer_id)
      }
      if (filters.observation_type) {
        if (Array.isArray(filters.observation_type)) {
          query = query.in('observation_type', filters.observation_type)
        } else {
          query = query.eq('observation_type', filters.observation_type)
        }
      }
      if (filters.category) {
        if (Array.isArray(filters.category)) {
          query = query.in('category', filters.category)
        } else {
          query = query.eq('category', filters.category)
        }
      }
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status)
        } else {
          query = query.eq('status', filters.status)
        }
      }
      if (filters.severity) {
        if (Array.isArray(filters.severity)) {
          query = query.in('severity', filters.severity)
        } else {
          query = query.eq('severity', filters.severity)
        }
      }
      if (filters.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to)
      }
      if (filters.date_from) {
        query = query.gte('observed_at', filters.date_from)
      }
      if (filters.date_to) {
        query = query.lte('observed_at', filters.date_to)
      }
      if (filters.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,location.ilike.%${filters.search}%`
        )
      }
      if (!filters.include_deleted) {
        query = query.is('deleted_at', null)
      }

      const { data, error } = await query

      if (error) throw error
      return (data || []) as SafetyObservation[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_OBSERVATIONS_ERROR',
            message: 'Failed to fetch safety observations',
            details: error,
          })
    }
  },

  /**
   * Get a single observation by ID
   */
  async getObservation(id: string): Promise<SafetyObservation> {
    try {
      const { data, error } = await db
        .from('safety_observations')
        .select(`
          *,
          observer:auth.users!safety_observations_observer_id_fkey(
            id,
            raw_user_meta_data->full_name,
            email
          ),
          assignee:auth.users!safety_observations_assigned_to_fkey(
            id,
            raw_user_meta_data->full_name,
            email
          ),
          project:projects(id, name)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      if (!data) {
        throw new ApiErrorClass({
          code: 'OBSERVATION_NOT_FOUND',
          message: 'Safety observation not found',
        })
      }

      return data as SafetyObservation
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_OBSERVATION_ERROR',
            message: 'Failed to fetch safety observation',
            details: error,
          })
    }
  },

  /**
   * Get observation with all related data
   */
  async getObservationWithDetails(id: string): Promise<SafetyObservationWithDetails> {
    try {
      const { data: observation, error: observationError } = await db
        .from('safety_observations')
        .select(`
          *,
          observer:auth.users!safety_observations_observer_id_fkey(
            id,
            raw_user_meta_data->full_name,
            email
          ),
          assignee:auth.users!safety_observations_assigned_to_fkey(
            id,
            raw_user_meta_data->full_name,
            email
          ),
          project:projects(id, name)
        `)
        .eq('id', id)
        .single()

      if (observationError) throw observationError
      if (!observation) {
        throw new ApiErrorClass({
          code: 'OBSERVATION_NOT_FOUND',
          message: 'Safety observation not found',
        })
      }

      // Fetch related data in parallel
      const [photosResult, commentsResult] = await Promise.all([
        db
          .from('safety_observation_photos')
          .select(`
            *,
            uploader:auth.users!safety_observation_photos_uploaded_by_fkey(
              id,
              raw_user_meta_data->full_name,
              email
            )
          `)
          .eq('observation_id', id)
          .order('created_at', { ascending: false }),
        db
          .from('safety_observation_comments')
          .select(`
            *,
            user:auth.users!safety_observation_comments_user_id_fkey(
              id,
              raw_user_meta_data->full_name,
              email
            )
          `)
          .eq('observation_id', id)
          .order('created_at', { ascending: true }),
      ])

      return {
        ...observation,
        photos: photosResult.data || [],
        comments: commentsResult.data || [],
      } as SafetyObservationWithDetails
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_OBSERVATION_DETAILS_ERROR',
            message: 'Failed to fetch observation details',
            details: error,
          })
    }
  },

  /**
   * Create a new observation
   */
  async createObservation(input: CreateObservationDTO): Promise<SafetyObservation> {
    try {
      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new ApiErrorClass({
          code: 'AUTH_REQUIRED',
          message: 'You must be logged in to submit an observation',
        })
      }

      const { data, error } = await db
        .from('safety_observations')
        .insert({
          ...input,
          observer_id: user.id,
          status: 'submitted',
          severity: input.severity || 'low',
          observed_at: input.observed_at || new Date().toISOString(),
        })
        .select(`
          *,
          observer:auth.users!safety_observations_observer_id_fkey(
            id,
            raw_user_meta_data->full_name,
            email
          ),
          project:projects(id, name)
        `)
        .single()

      if (error) throw error

      // Check if this is a critical observation that needs notifications
      if (this._isCriticalObservation(input.severity || 'low', input.observation_type)) {
        this.notifyForCriticalObservation(data.id).catch((err) =>
          logger.error('[SafetyObservations] Failed to notify critical observation:', err)
        )
      }

      return data as SafetyObservation
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_OBSERVATION_ERROR',
            message: 'Failed to create safety observation',
            details: error,
          })
    }
  },

  /**
   * Update an observation
   */
  async updateObservation(id: string, input: UpdateObservationDTO): Promise<SafetyObservation> {
    try {
      const updateData: Record<string, unknown> = { ...input }

      // If marking as resolved, set resolved timestamp
      if (input.status === 'resolved' && !input.resolution_notes) {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        updateData.resolved_at = new Date().toISOString()
        updateData.resolved_by = user?.id
      }

      const { data, error } = await db
        .from('safety_observations')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          observer:auth.users!safety_observations_observer_id_fkey(
            id,
            raw_user_meta_data->full_name,
            email
          ),
          assignee:auth.users!safety_observations_assigned_to_fkey(
            id,
            raw_user_meta_data->full_name,
            email
          ),
          project:projects(id, name)
        `)
        .single()

      if (error) throw error
      if (!data) {
        throw new ApiErrorClass({
          code: 'OBSERVATION_NOT_FOUND',
          message: 'Safety observation not found',
        })
      }

      return data as SafetyObservation
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_OBSERVATION_ERROR',
            message: 'Failed to update safety observation',
            details: error,
          })
    }
  },

  /**
   * Soft delete an observation
   */
  async deleteObservation(id: string): Promise<void> {
    try {
      const { error } = await db
        .from('safety_observations')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_OBSERVATION_ERROR',
            message: 'Failed to delete safety observation',
            details: error,
          })
    }
  },

  /**
   * Acknowledge an observation
   */
  async acknowledgeObservation(id: string): Promise<SafetyObservation> {
    return this.updateObservation(id, { status: 'acknowledged' })
  },

  /**
   * Mark observation as requiring action
   */
  async requireAction(
    id: string,
    assignedTo: string,
    dueDate?: string,
    correctiveAction?: string
  ): Promise<SafetyObservation> {
    return this.updateObservation(id, {
      status: 'action_required',
      assigned_to: assignedTo,
      due_date: dueDate,
      corrective_action: correctiveAction,
    })
  },

  /**
   * Resolve an observation
   */
  async resolveObservation(id: string, resolutionNotes: string): Promise<SafetyObservation> {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data, error } = await db
      .from('safety_observations')
      .update({
        status: 'resolved',
        resolution_notes: resolutionNotes,
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id,
      })
      .eq('id', id)
      .select(`
        *,
        observer:auth.users!safety_observations_observer_id_fkey(
          id,
          raw_user_meta_data->full_name,
          email
        ),
        project:projects(id, name)
      `)
      .single()

    if (error) throw error
    return data as SafetyObservation
  },

  /**
   * Close an observation
   */
  async closeObservation(id: string): Promise<SafetyObservation> {
    return this.updateObservation(id, { status: 'closed' })
  },

  // ============================================================================
  // PHOTOS
  // ============================================================================

  /**
   * Get photos for an observation
   */
  async getObservationPhotos(observationId: string): Promise<ObservationPhoto[]> {
    try {
      const { data, error } = await db
        .from('safety_observation_photos')
        .select(`
          *,
          uploader:auth.users!safety_observation_photos_uploaded_by_fkey(
            id,
            raw_user_meta_data->full_name,
            email
          )
        `)
        .eq('observation_id', observationId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []) as ObservationPhoto[]
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_PHOTOS_ERROR',
        message: 'Failed to fetch observation photos',
        details: error,
      })
    }
  },

  /**
   * Add a photo to an observation
   */
  async addPhoto(input: CreateObservationPhotoDTO): Promise<ObservationPhoto> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data, error } = await db
        .from('safety_observation_photos')
        .insert({
          ...input,
          uploaded_by: user?.id,
        })
        .select()
        .single()

      if (error) throw error

      // Also update the observation's photo_urls array
      const { data: observation } = await db
        .from('safety_observations')
        .select('photo_urls')
        .eq('id', input.observation_id)
        .single()

      const currentUrls = observation?.photo_urls || []
      await db
        .from('safety_observations')
        .update({ photo_urls: [...currentUrls, input.photo_url] })
        .eq('id', input.observation_id)

      return data as ObservationPhoto
    } catch (error) {
      throw new ApiErrorClass({
        code: 'ADD_PHOTO_ERROR',
        message: 'Failed to add photo to observation',
        details: error,
      })
    }
  },

  /**
   * Upload a photo to storage and add to observation
   */
  async uploadPhoto(
    observationId: string,
    file: File,
    caption?: string
  ): Promise<ObservationPhoto> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        throw new ApiErrorClass({
          code: 'AUTH_REQUIRED',
          message: 'You must be logged in to upload photos',
        })
      }

      // Generate unique filename
      const ext = file.name.split('.').pop()
      const fileName = `${observationId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('observation-photos')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage.from('observation-photos').getPublicUrl(uploadData.path)

      // Create photo record
      return this.addPhoto({
        observation_id: observationId,
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

  /**
   * Remove a photo
   */
  async removePhoto(photoId: string): Promise<void> {
    try {
      const { error } = await db.from('safety_observation_photos').delete().eq('id', photoId)

      if (error) throw error
    } catch (error) {
      throw new ApiErrorClass({
        code: 'REMOVE_PHOTO_ERROR',
        message: 'Failed to remove photo',
        details: error,
      })
    }
  },

  // ============================================================================
  // COMMENTS
  // ============================================================================

  /**
   * Get comments for an observation
   */
  async getObservationComments(observationId: string): Promise<ObservationComment[]> {
    try {
      const { data, error } = await db
        .from('safety_observation_comments')
        .select(`
          *,
          user:auth.users!safety_observation_comments_user_id_fkey(
            id,
            raw_user_meta_data->full_name,
            email
          )
        `)
        .eq('observation_id', observationId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data || []) as ObservationComment[]
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_COMMENTS_ERROR',
        message: 'Failed to fetch observation comments',
        details: error,
      })
    }
  },

  /**
   * Add a comment to an observation
   */
  async addComment(input: CreateObservationCommentDTO): Promise<ObservationComment> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        throw new ApiErrorClass({
          code: 'AUTH_REQUIRED',
          message: 'You must be logged in to add comments',
        })
      }

      const { data, error } = await db
        .from('safety_observation_comments')
        .insert({
          ...input,
          user_id: user.id,
          is_system_message: false,
        })
        .select(`
          *,
          user:auth.users!safety_observation_comments_user_id_fkey(
            id,
            raw_user_meta_data->full_name,
            email
          )
        `)
        .single()

      if (error) throw error
      return data as ObservationComment
    } catch (error) {
      throw new ApiErrorClass({
        code: 'ADD_COMMENT_ERROR',
        message: 'Failed to add comment',
        details: error,
      })
    }
  },

  // ============================================================================
  // LEADERBOARD & POINTS
  // ============================================================================

  /**
   * Get observer points for current user
   */
  async getMyPoints(projectId?: string): Promise<ObserverPoints | null> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return null

      let query = db.from('safety_observer_points').select('*').eq('user_id', user.id)

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query.maybeSingle()

      if (error) throw error
      return data as ObserverPoints | null
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_POINTS_ERROR',
        message: 'Failed to fetch observer points',
        details: error,
      })
    }
  },

  /**
   * Get leaderboard
   */
  async getLeaderboard(filters: LeaderboardFilters = {}): Promise<LeaderboardEntry[]> {
    try {
      let query = db.from('safety_observer_leaderboard').select('*')

      if (filters.project_id) {
        query = query.eq('project_id', filters.project_id)
      }
      if (filters.company_id) {
        query = query.eq('company_id', filters.company_id)
      }

      // Order by appropriate points field based on time period
      switch (filters.time_period) {
        case 'monthly':
          query = query.order('monthly_points', { ascending: false })
          break
        case 'yearly':
          query = query.order('yearly_points', { ascending: false })
          break
        default:
          query = query.order('total_points', { ascending: false })
      }

      if (filters.limit) {
        query = query.limit(filters.limit)
      }

      const { data, error } = await query

      if (error) throw error
      return (data || []) as LeaderboardEntry[]
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_LEADERBOARD_ERROR',
        message: 'Failed to fetch leaderboard',
        details: error,
      })
    }
  },

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Get observation statistics
   */
  async getStats(projectId?: string, companyId?: string): Promise<ObservationStats> {
    try {
      let query = db.from('safety_observations').select('*').is('deleted_at', null)

      if (projectId) {
        query = query.eq('project_id', projectId)
      }
      if (companyId) {
        query = query.eq('company_id', companyId)
      }

      const { data: observations, error } = await query

      if (error) throw error

      const data = observations || []
      const now = new Date()
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      // Initialize category counts
      const byCategory: Record<SafetyObservationCategory, number> = {
        ppe: 0,
        housekeeping: 0,
        equipment: 0,
        procedures: 0,
        ergonomics: 0,
        fall_protection: 0,
        electrical: 0,
        excavation: 0,
        confined_space: 0,
        fire_prevention: 0,
        traffic_control: 0,
        chemical_handling: 0,
        communication: 0,
        training: 0,
        leadership: 0,
        other: 0,
      }

      // Initialize type counts
      const byType: Record<SafetyObservationType, number> = {
        safe_behavior: 0,
        unsafe_condition: 0,
        near_miss: 0,
        best_practice: 0,
      }

      // Initialize status counts
      const byStatus: Record<SafetyObservationStatus, number> = {
        submitted: 0,
        acknowledged: 0,
        action_required: 0,
        in_progress: 0,
        resolved: 0,
        closed: 0,
      }

      // Process observations
      data.forEach((obs: SafetyObservation) => {
        if (byCategory[obs.category] !== undefined) {
          byCategory[obs.category]++
        }
        if (byType[obs.observation_type] !== undefined) {
          byType[obs.observation_type]++
        }
        if (byStatus[obs.status] !== undefined) {
          byStatus[obs.status]++
        }
      })

      // Calculate trends (last 30 days by day)
      const trends: { date: string; count: number }[] = []
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dateStr = date.toISOString().split('T')[0]
        const count = data.filter(
          (obs: SafetyObservation) => obs.observed_at.split('T')[0] === dateStr
        ).length
        trends.push({ date: dateStr, count })
      }

      const stats: ObservationStats = {
        total_observations: data.length,
        safe_behavior_count: byType.safe_behavior,
        unsafe_condition_count: byType.unsafe_condition,
        near_miss_count: byType.near_miss,
        best_practice_count: byType.best_practice,
        pending_count: byStatus.submitted + byStatus.acknowledged,
        action_required_count: byStatus.action_required + byStatus.in_progress,
        resolved_count: byStatus.resolved + byStatus.closed,
        critical_count: data.filter((obs: SafetyObservation) => obs.severity === 'critical').length,
        high_severity_count: data.filter((obs: SafetyObservation) => obs.severity === 'high').length,
        last_7_days: data.filter(
          (obs: SafetyObservation) => new Date(obs.observed_at) >= sevenDaysAgo
        ).length,
        last_30_days: data.filter(
          (obs: SafetyObservation) => new Date(obs.observed_at) >= thirtyDaysAgo
        ).length,
        total_points_awarded: data.reduce(
          (sum: number, obs: SafetyObservation) => sum + (obs.points_awarded || 0),
          0
        ),
        by_category: byCategory,
        by_type: byType,
        by_status: byStatus,
        trends,
      }

      return stats
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_STATS_ERROR',
        message: 'Failed to fetch observation statistics',
        details: error,
      })
    }
  },

  /**
   * Get leading indicators for safety performance
   */
  async getLeadingIndicators(projectId?: string, companyId?: string): Promise<LeadingIndicators> {
    try {
      const stats = await this.getStats(projectId, companyId)

      // Get additional data for indicators
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      // Get unique observers in last 30 days
      let observersQuery = db
        .from('safety_observations')
        .select('observer_id')
        .gte('observed_at', thirtyDaysAgo)
        .is('deleted_at', null)

      if (projectId) {
        observersQuery = observersQuery.eq('project_id', projectId)
      }

      const { data: observers } = await observersQuery

      const uniqueObservers = new Set((observers || []).map((o: { observer_id: string }) => o.observer_id)).size

      // Get total project/company users (rough estimate)
      let usersCount = 100 // Default estimate

      // Calculate positive observation ratio
      const positiveCount = stats.safe_behavior_count + stats.best_practice_count
      const totalCount = stats.total_observations
      const positiveRatio = totalCount > 0 ? (positiveCount / totalCount) * 100 : 0

      // Calculate corrective action closure rate
      const actionTotal = stats.action_required_count + stats.resolved_count
      const closureRate = actionTotal > 0 ? (stats.resolved_count / actionTotal) * 100 : 0

      // Category breakdown with trends
      const categoryBreakdown = Object.entries(stats.by_category)
        .map(([category, count]) => ({
          category: category as SafetyObservationCategory,
          count,
          trend: 'stable' as 'up' | 'down' | 'stable', // Would need historical data for real trends
        }))
        .filter((c) => c.count > 0)
        .sort((a, b) => b.count - a.count)

      const indicators: LeadingIndicators = {
        observation_rate: totalCount / Math.max(uniqueObservers, 1),
        positive_observation_ratio: positiveRatio,
        corrective_action_closure_rate: closureRate,
        average_resolution_time: 5, // Would need to calculate from actual data
        participation_rate: (uniqueObservers / usersCount) * 100,
        category_breakdown: categoryBreakdown,
      }

      return indicators
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_INDICATORS_ERROR',
        message: 'Failed to fetch leading indicators',
        details: error,
      })
    }
  },

  /**
   * Get recent observations for dashboard
   */
  async getRecentObservations(projectId: string, limit = 5): Promise<SafetyObservation[]> {
    try {
      const { data, error } = await db
        .from('safety_observations')
        .select(`
          *,
          observer:auth.users!safety_observations_observer_id_fkey(
            id,
            raw_user_meta_data->full_name,
            email
          )
        `)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('observed_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return (data || []) as SafetyObservation[]
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_RECENT_ERROR',
        message: 'Failed to fetch recent observations',
        details: error,
      })
    }
  },

  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================

  /**
   * Send notifications for a critical observation
   */
  async notifyForCriticalObservation(observationId: string): Promise<void> {
    try {
      const observation = await this.getObservation(observationId)

      if (!this._isCriticalObservation(observation.severity, observation.observation_type)) {
        return
      }

      // Get safety team and supervisors to notify
      const { data: users, error: usersError } = await db.rpc('get_project_users_for_notification', {
        p_project_id: observation.project_id,
      })

      if (usersError) throw usersError

      if (!users || users.length === 0) {
        logger.log('No users to notify for observation:', observationId)
        return
      }

      // Create notification records
      const notificationRecords = (users || []).map((user: { user_id: string }) => ({
        observation_id: observationId,
        user_id: user.user_id,
        notification_type: 'in_app',
        subject: `Critical Safety Observation: ${observation.observation_number}`,
        message: `A ${observation.severity} ${observation.observation_type.replace('_', ' ')} observation has been reported: ${observation.title}`,
        delivery_status: 'sent',
      }))

      if (notificationRecords.length > 0) {
        await db.from('safety_observation_notifications').insert(notificationRecords)
      }

      logger.log(
        `Sent ${notificationRecords.length} notifications for critical observation: ${observation.observation_number}`
      )
    } catch (error) {
      logger.error('Failed to send observation notifications:', error)
    }
  },

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Check if observation is critical and needs immediate notification
   */
  _isCriticalObservation(
    severity: ObservationSeverity,
    type: SafetyObservationType
  ): boolean {
    // Critical or high severity always notifies
    if (['critical', 'high'].includes(severity)) {
      return true
    }
    // Near misses with medium severity also notify
    if (type === 'near_miss' && severity === 'medium') {
      return true
    }
    return false
  },
}
