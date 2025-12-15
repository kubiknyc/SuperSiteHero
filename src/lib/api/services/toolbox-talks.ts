/**
 * Toolbox Talks API Service
 *
 * Safety briefing / toolbox talk management with:
 * - Topic library management
 * - Talk scheduling and completion
 * - Digital sign-in attendance tracking
 * - Worker certification tracking
 * - Compliance statistics
 */

import { supabase } from '@/lib/supabase'
import { ApiErrorClass } from '../errors'
import type {
  ToolboxTalkTopic,
  ToolboxTalk,
  ToolboxTalkWithDetails,
  ToolboxTalkAttendee,
  ToolboxTalkCertification,
  CertificationWithStatus,
  ToolboxTalkStats,
  ComplianceSummary,
  CreateToolboxTopicDTO,
  UpdateToolboxTopicDTO,
  CreateToolboxTalkDTO,
  UpdateToolboxTalkDTO,
  StartToolboxTalkDTO,
  CompleteToolboxTalkDTO,
  CreateToolboxAttendeeDTO,
  SignInAttendeeDTO,
  UpdateToolboxAttendeeDTO,
  BulkAddAttendeesDTO,
  ToolboxTalkFilters,
  ToolboxTopicFilters,
  CertificationFilters,
  CertificationStatus,
} from '@/types/toolbox-talks'

// Use 'any' cast for tables not in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// ============================================================================
// TOPIC LIBRARY OPERATIONS
// ============================================================================

export const toolboxTopicsApi = {
  /**
   * Get all topics with optional filters
   */
  async getTopics(filters: ToolboxTopicFilters = {}): Promise<ToolboxTalkTopic[]> {
    try {
      let query = db
        .from('toolbox_talk_topics')
        .select('*')
        .is('deleted_at', null)
        .order('times_used', { ascending: false })

      // Apply filters
      if (filters.company_id) {
        if (filters.include_system_templates !== false) {
          // Include company topics AND system templates
          query = query.or(`company_id.eq.${filters.company_id},is_system_template.eq.true`)
        } else {
          query = query.eq('company_id', filters.company_id)
        }
      } else if (filters.include_system_templates !== false) {
        // If no company_id, only show system templates
        query = query.eq('is_system_template', true)
      }

      if (filters.category) {
        query = query.eq('category', filters.category)
      }
      if (filters.requires_certification !== undefined) {
        query = query.eq('requires_certification', filters.requires_certification)
      }
      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active)
      }
      if (filters.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        )
      }

      const { data, error } = await query

      if (error) {throw error}
      return (data || []) as ToolboxTalkTopic[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_TOPICS_ERROR',
            message: 'Failed to fetch toolbox talk topics',
            details: error,
          })
    }
  },

  /**
   * Get a single topic by ID
   */
  async getTopic(id: string): Promise<ToolboxTalkTopic> {
    try {
      const { data, error } = await db
        .from('toolbox_talk_topics')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {throw error}
      if (!data) {
        throw new ApiErrorClass({
          code: 'TOPIC_NOT_FOUND',
          message: 'Toolbox talk topic not found',
        })
      }

      return data as ToolboxTalkTopic
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_TOPIC_ERROR',
            message: 'Failed to fetch toolbox talk topic',
            details: error,
          })
    }
  },

  /**
   * Create a new topic
   */
  async createTopic(dto: CreateToolboxTopicDTO): Promise<ToolboxTalkTopic> {
    try {
      const { data: user } = await supabase.auth.getUser()

      const { data, error } = await db.from('toolbox_talk_topics').insert({
        company_id: dto.company_id,
        title: dto.title,
        description: dto.description || null,
        category: dto.category,
        talking_points: dto.talking_points || [],
        discussion_questions: dto.discussion_questions || [],
        resources: dto.resources || [],
        requires_certification: dto.requires_certification || false,
        certification_valid_days: dto.certification_valid_days || 365,
        estimated_duration: dto.estimated_duration || 15,
        osha_standard: dto.osha_standard || null,
        regulation_references: dto.regulation_references || null,
        is_system_template: false,
        is_active: true,
        created_by: user?.user?.id || null,
      }).select().single()

      if (error) {throw error}
      return data as ToolboxTalkTopic
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_TOPIC_ERROR',
            message: 'Failed to create toolbox talk topic',
            details: error,
          })
    }
  },

  /**
   * Update a topic
   */
  async updateTopic(id: string, dto: UpdateToolboxTopicDTO): Promise<ToolboxTalkTopic> {
    try {
      const { data, error } = await db
        .from('toolbox_talk_topics')
        .update(dto)
        .eq('id', id)
        .eq('is_system_template', false) // Can't edit system templates
        .select()
        .single()

      if (error) {throw error}
      if (!data) {
        throw new ApiErrorClass({
          code: 'TOPIC_NOT_FOUND',
          message: 'Topic not found or is a system template',
        })
      }

      return data as ToolboxTalkTopic
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_TOPIC_ERROR',
            message: 'Failed to update toolbox talk topic',
            details: error,
          })
    }
  },

  /**
   * Soft delete a topic
   */
  async deleteTopic(id: string): Promise<void> {
    try {
      const { error } = await db
        .from('toolbox_talk_topics')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('is_system_template', false) // Can't delete system templates

      if (error) {throw error}
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_TOPIC_ERROR',
            message: 'Failed to delete toolbox talk topic',
            details: error,
          })
    }
  },

  /**
   * Get topics by category
   */
  async getTopicsByCategory(
    companyId: string | null
  ): Promise<Record<string, ToolboxTalkTopic[]>> {
    try {
      const topics = await this.getTopics({
        company_id: companyId || undefined,
        is_active: true,
        include_system_templates: true,
      })

      // Group by category
      return topics.reduce(
        (acc, topic) => {
          if (!acc[topic.category]) {
            acc[topic.category] = []
          }
          acc[topic.category].push(topic)
          return acc
        },
        {} as Record<string, ToolboxTalkTopic[]>
      )
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_TOPICS_BY_CATEGORY_ERROR',
            message: 'Failed to fetch topics by category',
            details: error,
          })
    }
  },
}

// ============================================================================
// TOOLBOX TALK CRUD OPERATIONS
// ============================================================================

export const toolboxTalksApi = {
  /**
   * Get all toolbox talks with optional filters
   */
  async getTalks(filters: ToolboxTalkFilters = {}): Promise<ToolboxTalk[]> {
    try {
      let query = db
        .from('toolbox_talks')
        .select(`
          *,
          topic:toolbox_talk_topics(id, title, category, requires_certification),
          presenter:users!toolbox_talks_presenter_id_fkey(
            id,
            full_name,
            email,
            avatar_url
          ),
          project:projects(id, name)
        `)
        .order('scheduled_date', { ascending: false })

      // Apply filters
      if (filters.project_id) {
        query = query.eq('project_id', filters.project_id)
      }
      if (filters.company_id) {
        query = query.eq('company_id', filters.company_id)
      }
      if (filters.topic_id) {
        query = query.eq('topic_id', filters.topic_id)
      }
      if (filters.category) {
        query = query.eq('category', filters.category)
      }
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.presenter_id) {
        query = query.eq('presenter_id', filters.presenter_id)
      }
      if (filters.date_from) {
        query = query.gte('scheduled_date', filters.date_from)
      }
      if (filters.date_to) {
        query = query.lte('scheduled_date', filters.date_to)
      }
      if (filters.search) {
        query = query.or(
          `talk_number.ilike.%${filters.search}%,custom_topic_title.ilike.%${filters.search}%,location.ilike.%${filters.search}%`
        )
      }
      if (!filters.include_deleted) {
        query = query.is('deleted_at', null)
      }

      const { data, error } = await query

      if (error) {throw error}
      return (data || []) as ToolboxTalk[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_TALKS_ERROR',
            message: 'Failed to fetch toolbox talks',
            details: error,
          })
    }
  },

  /**
   * Get a single toolbox talk by ID
   */
  async getTalk(id: string): Promise<ToolboxTalk> {
    try {
      const { data, error } = await db
        .from('toolbox_talks')
        .select(`
          *,
          topic:toolbox_talk_topics(id, title, category, requires_certification, talking_points, discussion_questions),
          presenter:users!toolbox_talks_presenter_id_fkey(
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
          code: 'TALK_NOT_FOUND',
          message: 'Toolbox talk not found',
        })
      }

      return data as ToolboxTalk
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_TALK_ERROR',
            message: 'Failed to fetch toolbox talk',
            details: error,
          })
    }
  },

  /**
   * Get toolbox talk with all details including attendees
   */
  async getTalkWithDetails(id: string): Promise<ToolboxTalkWithDetails> {
    try {
      // Fetch talk and attendees in parallel
      const [talkResult, attendeesResult] = await Promise.all([
        db
          .from('toolbox_talks')
          .select(`
            *,
            topic:toolbox_talk_topics(*),
            presenter:users!toolbox_talks_presenter_id_fkey(
              id,
              full_name,
              email,
              avatar_url
            ),
            project:projects(id, name)
          `)
          .eq('id', id)
          .single(),
        db
          .from('toolbox_talk_attendees')
          .select(`
            *,
            user:users(id, full_name, email, avatar_url)
          `)
          .eq('toolbox_talk_id', id)
          .order('worker_name'),
      ])

      if (talkResult.error) {throw talkResult.error}
      if (!talkResult.data) {
        throw new ApiErrorClass({
          code: 'TALK_NOT_FOUND',
          message: 'Toolbox talk not found',
        })
      }

      const attendees = (attendeesResult.data || []) as ToolboxTalkAttendee[]
      const presentCount = attendees.filter((a) => a.attendance_status === 'present').length

      return {
        ...talkResult.data,
        attendees,
        attendance_count: attendees.length,
        present_count: presentCount,
      } as ToolboxTalkWithDetails
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_TALK_DETAILS_ERROR',
            message: 'Failed to fetch toolbox talk details',
            details: error,
          })
    }
  },

  /**
   * Create a new toolbox talk
   */
  async createTalk(dto: CreateToolboxTalkDTO): Promise<ToolboxTalk> {
    try {
      const { data: user } = await supabase.auth.getUser()

      const { data, error } = await db.from('toolbox_talks').insert({
        project_id: dto.project_id,
        company_id: dto.company_id,
        topic_id: dto.topic_id || null,
        custom_topic_title: dto.custom_topic_title || null,
        custom_topic_description: dto.custom_topic_description || null,
        category: dto.category,
        scheduled_date: dto.scheduled_date,
        scheduled_time: dto.scheduled_time || null,
        location: dto.location || null,
        status: 'scheduled',
        presenter_id: dto.presenter_id || null,
        presenter_name: dto.presenter_name || null,
        presenter_title: dto.presenter_title || null,
        related_incident_id: dto.related_incident_id || null,
        created_by: user?.user?.id || null,
      }).select(`
        *,
        topic:toolbox_talk_topics(id, title, category),
        project:projects(id, name)
      `).single()

      if (error) {throw error}
      return data as ToolboxTalk
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_TALK_ERROR',
            message: 'Failed to create toolbox talk',
            details: error,
          })
    }
  },

  /**
   * Update a toolbox talk
   */
  async updateTalk(id: string, dto: UpdateToolboxTalkDTO): Promise<ToolboxTalk> {
    try {
      const { data, error } = await db
        .from('toolbox_talks')
        .update(dto)
        .eq('id', id)
        .select(`
          *,
          topic:toolbox_talk_topics(id, title, category),
          project:projects(id, name)
        `)
        .single()

      if (error) {throw error}
      if (!data) {
        throw new ApiErrorClass({
          code: 'TALK_NOT_FOUND',
          message: 'Toolbox talk not found',
        })
      }

      return data as ToolboxTalk
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_TALK_ERROR',
            message: 'Failed to update toolbox talk',
            details: error,
          })
    }
  },

  /**
   * Start a toolbox talk (change status to in_progress)
   */
  async startTalk(id: string, dto: StartToolboxTalkDTO = {}): Promise<ToolboxTalk> {
    try {
      const { data, error } = await db
        .from('toolbox_talks')
        .update({
          status: 'in_progress',
          actual_start_time: dto.actual_start_time || new Date().toISOString(),
          weather_conditions: dto.weather_conditions || null,
          site_conditions: dto.site_conditions || null,
        })
        .eq('id', id)
        .in('status', ['scheduled', 'draft'])
        .select()
        .single()

      if (error) {throw error}
      if (!data) {
        throw new ApiErrorClass({
          code: 'CANNOT_START_TALK',
          message: 'Cannot start talk - it may already be in progress or completed',
        })
      }

      return data as ToolboxTalk
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'START_TALK_ERROR',
            message: 'Failed to start toolbox talk',
            details: error,
          })
    }
  },

  /**
   * Complete a toolbox talk
   */
  async completeTalk(id: string, dto: CompleteToolboxTalkDTO = {}): Promise<ToolboxTalk> {
    try {
      const { data: user } = await supabase.auth.getUser()
      const now = new Date().toISOString()

      const { data, error } = await db
        .from('toolbox_talks')
        .update({
          status: 'completed',
          actual_end_time: dto.actual_end_time || now,
          duration_minutes: dto.duration_minutes || null,
          talking_points_covered: dto.talking_points_covered || [],
          notes: dto.notes || null,
          hazards_discussed: dto.hazards_discussed || null,
          completed_at: now,
          completed_by: user?.user?.id || null,
        })
        .eq('id', id)
        .in('status', ['in_progress', 'scheduled'])
        .select()
        .single()

      if (error) {throw error}
      if (!data) {
        throw new ApiErrorClass({
          code: 'CANNOT_COMPLETE_TALK',
          message: 'Cannot complete talk - it may already be completed or cancelled',
        })
      }

      return data as ToolboxTalk
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'COMPLETE_TALK_ERROR',
            message: 'Failed to complete toolbox talk',
            details: error,
          })
    }
  },

  /**
   * Cancel a toolbox talk
   */
  async cancelTalk(id: string): Promise<ToolboxTalk> {
    try {
      const { data, error } = await db
        .from('toolbox_talks')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .neq('status', 'completed')
        .select()
        .single()

      if (error) {throw error}
      if (!data) {
        throw new ApiErrorClass({
          code: 'CANNOT_CANCEL_TALK',
          message: 'Cannot cancel a completed talk',
        })
      }

      return data as ToolboxTalk
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CANCEL_TALK_ERROR',
            message: 'Failed to cancel toolbox talk',
            details: error,
          })
    }
  },

  /**
   * Soft delete a toolbox talk
   */
  async deleteTalk(id: string): Promise<void> {
    try {
      const { error } = await db
        .from('toolbox_talks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {throw error}
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_TALK_ERROR',
            message: 'Failed to delete toolbox talk',
            details: error,
          })
    }
  },

  /**
   * Get upcoming scheduled talks for a project
   */
  async getUpcomingTalks(projectId: string, days = 7): Promise<ToolboxTalk[]> {
    try {
      const today = new Date().toISOString().split('T')[0]
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + days)
      const endDateStr = endDate.toISOString().split('T')[0]

      const { data, error } = await db
        .from('toolbox_talks')
        .select(`
          *,
          topic:toolbox_talk_topics(id, title, category),
          presenter:users!toolbox_talks_presenter_id_fkey(id, full_name)
        `)
        .eq('project_id', projectId)
        .eq('status', 'scheduled')
        .gte('scheduled_date', today)
        .lte('scheduled_date', endDateStr)
        .is('deleted_at', null)
        .order('scheduled_date')

      if (error) {throw error}
      return (data || []) as ToolboxTalk[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_UPCOMING_TALKS_ERROR',
            message: 'Failed to fetch upcoming toolbox talks',
            details: error,
          })
    }
  },

  /**
   * Get recent completed talks for a project
   */
  async getRecentTalks(projectId: string, limit = 10): Promise<ToolboxTalk[]> {
    try {
      const { data, error } = await db
        .from('toolbox_talks')
        .select(`
          *,
          topic:toolbox_talk_topics(id, title, category)
        `)
        .eq('project_id', projectId)
        .eq('status', 'completed')
        .is('deleted_at', null)
        .order('completed_at', { ascending: false })
        .limit(limit)

      if (error) {throw error}
      return (data || []) as ToolboxTalk[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_RECENT_TALKS_ERROR',
            message: 'Failed to fetch recent toolbox talks',
            details: error,
          })
    }
  },
}

// ============================================================================
// ATTENDANCE OPERATIONS
// ============================================================================

export const toolboxAttendeesApi = {
  /**
   * Get attendees for a toolbox talk
   */
  async getAttendees(toolboxTalkId: string): Promise<ToolboxTalkAttendee[]> {
    try {
      const { data, error } = await db
        .from('toolbox_talk_attendees')
        .select(`
          *,
          user:users(id, full_name, email, avatar_url)
        `)
        .eq('toolbox_talk_id', toolboxTalkId)
        .order('worker_name')

      if (error) {throw error}
      return (data || []) as ToolboxTalkAttendee[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_ATTENDEES_ERROR',
            message: 'Failed to fetch attendees',
            details: error,
          })
    }
  },

  /**
   * Add an attendee to a toolbox talk
   */
  async addAttendee(dto: CreateToolboxAttendeeDTO): Promise<ToolboxTalkAttendee> {
    try {
      const { data, error } = await db.from('toolbox_talk_attendees').insert({
        toolbox_talk_id: dto.toolbox_talk_id,
        user_id: dto.user_id || null,
        worker_name: dto.worker_name,
        worker_company: dto.worker_company || null,
        worker_trade: dto.worker_trade || null,
        worker_badge_number: dto.worker_badge_number || null,
        attendance_status: dto.attendance_status || 'expected',
      }).select().single()

      if (error) {throw error}
      return data as ToolboxTalkAttendee
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'ADD_ATTENDEE_ERROR',
            message: 'Failed to add attendee',
            details: error,
          })
    }
  },

  /**
   * Bulk add attendees
   */
  async bulkAddAttendees(dto: BulkAddAttendeesDTO): Promise<ToolboxTalkAttendee[]> {
    try {
      const records = dto.attendees.map((a) => ({
        toolbox_talk_id: dto.toolbox_talk_id,
        user_id: a.user_id || null,
        worker_name: a.worker_name,
        worker_company: a.worker_company || null,
        worker_trade: a.worker_trade || null,
        worker_badge_number: a.worker_badge_number || null,
        attendance_status: 'expected',
      }))

      const { data, error } = await db
        .from('toolbox_talk_attendees')
        .insert(records)
        .select()

      if (error) {throw error}
      return (data || []) as ToolboxTalkAttendee[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'BULK_ADD_ATTENDEES_ERROR',
            message: 'Failed to bulk add attendees',
            details: error,
          })
    }
  },

  /**
   * Sign in an attendee (mark as present with signature)
   */
  async signInAttendee(
    attendeeId: string,
    dto: SignInAttendeeDTO = {}
  ): Promise<ToolboxTalkAttendee> {
    try {
      const { data, error } = await db
        .from('toolbox_talk_attendees')
        .update({
          attendance_status: 'present',
          signed_in_at: new Date().toISOString(),
          signature_data: dto.signature_data || null,
          signed_via: dto.signed_via || 'app',
          device_info: dto.device_info || null,
        })
        .eq('id', attendeeId)
        .select()
        .single()

      if (error) {throw error}
      return data as ToolboxTalkAttendee
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'SIGN_IN_ATTENDEE_ERROR',
            message: 'Failed to sign in attendee',
            details: error,
          })
    }
  },

  /**
   * Quick sign-in (mark present without signature)
   */
  async quickSignIn(attendeeId: string): Promise<ToolboxTalkAttendee> {
    return this.signInAttendee(attendeeId, { signed_via: 'app' })
  },

  /**
   * Update an attendee
   */
  async updateAttendee(
    attendeeId: string,
    dto: UpdateToolboxAttendeeDTO
  ): Promise<ToolboxTalkAttendee> {
    try {
      const { data, error } = await db
        .from('toolbox_talk_attendees')
        .update(dto)
        .eq('id', attendeeId)
        .select()
        .single()

      if (error) {throw error}
      return data as ToolboxTalkAttendee
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_ATTENDEE_ERROR',
            message: 'Failed to update attendee',
            details: error,
          })
    }
  },

  /**
   * Mark attendee as absent
   */
  async markAbsent(attendeeId: string, notes?: string): Promise<ToolboxTalkAttendee> {
    return this.updateAttendee(attendeeId, {
      attendance_status: 'absent',
      notes: notes || null,
    })
  },

  /**
   * Mark attendee as excused
   */
  async markExcused(attendeeId: string, notes?: string): Promise<ToolboxTalkAttendee> {
    return this.updateAttendee(attendeeId, {
      attendance_status: 'excused',
      notes: notes || null,
    })
  },

  /**
   * Remove an attendee
   */
  async removeAttendee(attendeeId: string): Promise<void> {
    try {
      const { error } = await db
        .from('toolbox_talk_attendees')
        .delete()
        .eq('id', attendeeId)

      if (error) {throw error}
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'REMOVE_ATTENDEE_ERROR',
            message: 'Failed to remove attendee',
            details: error,
          })
    }
  },

  /**
   * Bulk sign in all expected attendees
   */
  async bulkSignIn(toolboxTalkId: string): Promise<number> {
    try {
      const { data, error } = await db
        .from('toolbox_talk_attendees')
        .update({
          attendance_status: 'present',
          signed_in_at: new Date().toISOString(),
          signed_via: 'app',
        })
        .eq('toolbox_talk_id', toolboxTalkId)
        .eq('attendance_status', 'expected')
        .select()

      if (error) {throw error}
      return (data || []).length
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'BULK_SIGN_IN_ERROR',
            message: 'Failed to bulk sign in attendees',
            details: error,
          })
    }
  },
}

// ============================================================================
// CERTIFICATION OPERATIONS
// ============================================================================

export const toolboxCertificationsApi = {
  /**
   * Get certifications with optional filters
   */
  async getCertifications(
    filters: CertificationFilters = {}
  ): Promise<CertificationWithStatus[]> {
    try {
      let query = db
        .from('toolbox_talk_certifications')
        .select(`
          *,
          topic:toolbox_talk_topics(id, title, category)
        `)
        .order('expires_date', { ascending: true })

      if (filters.company_id) {
        query = query.eq('company_id', filters.company_id)
      }
      if (filters.worker_name) {
        query = query.ilike('worker_name', `%${filters.worker_name}%`)
      }
      if (filters.topic_id) {
        query = query.eq('topic_id', filters.topic_id)
      }
      if (filters.is_current !== undefined) {
        query = query.eq('is_current', filters.is_current)
      }

      const { data, error } = await query

      if (error) {throw error}

      // Calculate certification status
      const today = new Date()
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

      const certificationsWithStatus = (data || []).map((cert: ToolboxTalkCertification) => {
        let certificationStatus: CertificationStatus = 'valid'
        let daysUntilExpiry: number | null = null

        if (cert.expires_date) {
          const expiryDate = new Date(cert.expires_date)
          daysUntilExpiry = Math.ceil(
            (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          )

          if (expiryDate < today) {
            certificationStatus = 'expired'
          } else if (expiryDate <= thirtyDaysFromNow) {
            certificationStatus = 'expiring_soon'
          }
        }

        return {
          ...cert,
          certification_status: certificationStatus,
          days_until_expiry: daysUntilExpiry,
        }
      }) as CertificationWithStatus[]

      // Filter by status if requested
      if (filters.status) {
        return certificationsWithStatus.filter(
          (c) => c.certification_status === filters.status
        )
      }
      if (filters.expiring_within_days !== undefined) {
        return certificationsWithStatus.filter(
          (c) =>
            c.days_until_expiry !== null &&
            c.days_until_expiry <= filters.expiring_within_days! &&
            c.days_until_expiry > 0
        )
      }

      return certificationsWithStatus
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_CERTIFICATIONS_ERROR',
            message: 'Failed to fetch certifications',
            details: error,
          })
    }
  },

  /**
   * Get certifications for a specific worker
   */
  async getWorkerCertifications(
    companyId: string,
    workerName: string
  ): Promise<CertificationWithStatus[]> {
    return this.getCertifications({
      company_id: companyId,
      worker_name: workerName,
      is_current: true,
    })
  },

  /**
   * Get expiring certifications
   */
  async getExpiringCertifications(
    companyId: string,
    days = 30
  ): Promise<CertificationWithStatus[]> {
    return this.getCertifications({
      company_id: companyId,
      is_current: true,
      expiring_within_days: days,
    })
  },

  /**
   * Get expired certifications
   */
  async getExpiredCertifications(companyId: string): Promise<CertificationWithStatus[]> {
    return this.getCertifications({
      company_id: companyId,
      is_current: true,
      status: 'expired',
    })
  },
}

// ============================================================================
// STATISTICS & COMPLIANCE
// ============================================================================

export const toolboxStatsApi = {
  /**
   * Get toolbox talk statistics for a project
   */
  async getProjectStats(projectId: string): Promise<ToolboxTalkStats> {
    try {
      const { data, error } = await db
        .from('toolbox_talk_stats')
        .select('*')
        .eq('project_id', projectId)
        .single()

      if (error && error.code !== 'PGRST116') {throw error}

      return (
        data || {
          project_id: projectId,
          total_talks: 0,
          completed_talks: 0,
          scheduled_talks: 0,
          cancelled_talks: 0,
          avg_duration: null,
          total_attendees: 0,
          last_completed_date: null,
        }
      ) as ToolboxTalkStats
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_PROJECT_STATS_ERROR',
            message: 'Failed to fetch project statistics',
            details: error,
          })
    }
  },

  /**
   * Get compliance summary for a company
   */
  async getComplianceSummary(companyId: string): Promise<ComplianceSummary> {
    try {
      // Get certification stats
      const certs = await toolboxCertificationsApi.getCertifications({
        company_id: companyId,
        is_current: true,
      })

      // Get unique workers
      const workerSet = new Set(certs.map((c) => c.worker_name))
      const validCerts = certs.filter((c) => c.certification_status === 'valid')
      const expiringCerts = certs.filter((c) => c.certification_status === 'expiring_soon')
      const expiredCerts = certs.filter((c) => c.certification_status === 'expired')

      // Get this month's talks
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { data: monthTalks, error: talksError } = await db
        .from('toolbox_talks')
        .select('id, topic_id')
        .eq('company_id', companyId)
        .eq('status', 'completed')
        .gte('completed_at', startOfMonth.toISOString())
        .is('deleted_at', null)

      if (talksError) {throw talksError}

      const uniqueTopics = new Set((monthTalks || []).map((t: { topic_id: string }) => t.topic_id))

      const workersWithCurrentCerts = new Set(
        validCerts.map((c) => c.worker_name)
      ).size
      const totalWorkers = workerSet.size

      return {
        total_workers: totalWorkers,
        workers_with_current_certs: workersWithCurrentCerts,
        workers_with_expiring_certs: new Set(expiringCerts.map((c) => c.worker_name)).size,
        workers_with_expired_certs: new Set(expiredCerts.map((c) => c.worker_name)).size,
        compliance_percentage:
          totalWorkers > 0
            ? Math.round((workersWithCurrentCerts / totalWorkers) * 100)
            : 100,
        topics_covered_this_month: uniqueTopics.size,
        talks_this_month: (monthTalks || []).length,
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_COMPLIANCE_SUMMARY_ERROR',
            message: 'Failed to fetch compliance summary',
            details: error,
          })
    }
  },

  /**
   * Get attendance rate for a project
   */
  async getAttendanceRate(projectId: string, days = 30): Promise<number> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data: talks, error: talksError } = await db
        .from('toolbox_talks')
        .select('id')
        .eq('project_id', projectId)
        .eq('status', 'completed')
        .gte('completed_at', startDate.toISOString())
        .is('deleted_at', null)

      if (talksError) {throw talksError}
      if (!talks || talks.length === 0) {return 100}

      const talkIds = talks.map((t: { id: string }) => t.id)

      const { data: attendees, error: attendeesError } = await db
        .from('toolbox_talk_attendees')
        .select('attendance_status')
        .in('toolbox_talk_id', talkIds)

      if (attendeesError) {throw attendeesError}
      if (!attendees || attendees.length === 0) {return 100}

      const presentCount = attendees.filter(
        (a: { attendance_status: string }) => a.attendance_status === 'present'
      ).length

      return Math.round((presentCount / attendees.length) * 100)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_ATTENDANCE_RATE_ERROR',
            message: 'Failed to fetch attendance rate',
            details: error,
          })
    }
  },
}
