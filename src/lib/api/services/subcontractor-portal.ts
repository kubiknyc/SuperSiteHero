/**
 * Subcontractor Portal API Service
 * Handles all API operations for the subcontractor portal feature
 */

import { supabase } from '@/lib/supabase'
import { ApiErrorClass } from '../errors'
import { sendEmail } from '@/lib/email/email-service'
import type {
  SubcontractorPortalAccess,
  SubcontractorPortalAccessWithRelations,
  CreatePortalAccessDTO,
  UpdatePortalAccessDTO,
  SubcontractorComplianceDocument,
  ComplianceDocumentWithRelations,
  CreateComplianceDocumentDTO,
  UpdateComplianceDocumentDTO,
  ExpiringDocument,
  SubcontractorInvitation,
  InvitationWithRelations,
  CreateInvitationDTO,
  SubcontractorBid,
  BidWithRelations,
  SubmitBidDTO,
  SubcontractorPunchItem,
  SubcontractorTask,
  UpdateItemStatusDTO,
  SubcontractorStats,
  SubcontractorProject,
  SubcontractorDashboardData,
  SubcontractorItemsFilter,
  ComplianceDocumentsFilter,
  BidsFilter,
  InvitationValidation,
  SubcontractorBasic,
} from '@/types/subcontractor-portal'

// Use 'any' type workaround for tables not in generated types
const db = supabase as any

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Get subcontractor IDs for the current user (based on email matching)
 */
async function getSubcontractorIdsForUser(userId: string): Promise<string[]> {
  const { data: user } = await supabase
    .from('users')
    .select('email')
    .eq('id', userId)
    .single()

  if (!user?.email) return []

  const { data: contacts } = await supabase
    .from('contacts')
    .select('id')
    .eq('email', user.email)

  if (!contacts || contacts.length === 0) return []

  const contactIds = contacts.map((c) => c.id)

  const { data: subcontractors } = await supabase
    .from('subcontractors')
    .select('id')
    .in('contact_id', contactIds)
    .is('deleted_at', null)

  return subcontractors?.map((s) => s.id) || []
}

/**
 * Get the primary subcontractor for the current user
 */
async function getSubcontractorForUser(userId: string): Promise<SubcontractorBasic | null> {
  const { data: user } = await supabase
    .from('users')
    .select('email')
    .eq('id', userId)
    .single()

  if (!user?.email) return null

  const { data } = await supabase
    .from('subcontractors')
    .select(`
      id,
      company_name,
      trade,
      contact_id,
      contacts!inner(email)
    `)
    .eq('contacts.email', user.email)
    .is('deleted_at', null)
    .limit(1)
    .single()

  if (!data) return null

  return {
    id: data.id,
    company_name: data.company_name,
    trade: data.trade,
    contact_id: data.contact_id,
  }
}

// =============================================
// DASHBOARD
// =============================================

export const subcontractorPortalApi = {
  /**
   * Get dashboard data for the current subcontractor user
   */
  async getDashboard(userId: string): Promise<SubcontractorDashboardData> {
    try {
      const subcontractor = await getSubcontractorForUser(userId)
      if (!subcontractor) {
        throw new ApiErrorClass({
          code: 'SUBCONTRACTOR_NOT_FOUND',
          message: 'No subcontractor record found for this user',
        })
      }

      const subcontractorIds = await getSubcontractorIdsForUser(userId)

      // Fetch all data in parallel
      const [stats, projects, pendingBids, punchItems, tasks, expiringDocs] = await Promise.all([
        this.getStats(userId),
        this.getProjects(userId),
        this.getPendingBids(userId),
        this.getPunchItems(userId, { status: ['open', 'in_progress', 'ready_for_review'] }),
        this.getTasks(userId, { status: ['pending', 'in_progress'] }),
        this.getExpiringDocuments(subcontractorIds),
      ])

      return {
        subcontractor,
        stats,
        projects,
        pending_bids: pendingBids,
        recent_punch_items: punchItems.slice(0, 10),
        recent_tasks: tasks.slice(0, 10),
        expiring_documents: expiringDocs,
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DASHBOARD_ERROR',
            message: 'Failed to fetch dashboard data',
          })
    }
  },

  /**
   * Get stats for the subcontractor
   */
  async getStats(userId: string): Promise<SubcontractorStats> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)

      if (subcontractorIds.length === 0) {
        return {
          total_projects: 0,
          pending_bids: 0,
          open_punch_items: 0,
          open_tasks: 0,
          expiring_documents: 0,
          overdue_items: 0,
        }
      }

      // Count projects
      const { count: projectCount } = await supabase
        .from('subcontractors')
        .select('project_id', { count: 'exact', head: true })
        .in('id', subcontractorIds)
        .is('deleted_at', null)

      // Count pending bids
      const { count: bidCount } = await db
        .from('change_order_bids')
        .select('id', { count: 'exact', head: true })
        .in('subcontractor_id', subcontractorIds)
        .eq('bid_status', 'pending')

      // Count open punch items
      const { count: punchCount } = await supabase
        .from('punch_items')
        .select('id', { count: 'exact', head: true })
        .in('subcontractor_id', subcontractorIds)
        .in('status', ['open', 'in_progress', 'ready_for_review'])
        .is('deleted_at', null)

      // Count open tasks
      const { count: taskCount } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .in('assigned_to_subcontractor_id', subcontractorIds)
        .in('status', ['pending', 'in_progress'])
        .is('deleted_at', null)

      // Count expiring documents (within 30 days)
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

      const { count: expiringCount } = await db
        .from('subcontractor_compliance_documents')
        .select('id', { count: 'exact', head: true })
        .in('subcontractor_id', subcontractorIds)
        .lte('expiration_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .gt('expiration_date', new Date().toISOString().split('T')[0])
        .is('deleted_at', null)

      // Count overdue items
      const today = new Date().toISOString().split('T')[0]

      const { count: overduePunchCount } = await supabase
        .from('punch_items')
        .select('id', { count: 'exact', head: true })
        .in('subcontractor_id', subcontractorIds)
        .in('status', ['open', 'in_progress'])
        .lt('due_date', today)
        .is('deleted_at', null)

      const { count: overdueTaskCount } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .in('assigned_to_subcontractor_id', subcontractorIds)
        .in('status', ['pending', 'in_progress'])
        .lt('due_date', today)
        .is('deleted_at', null)

      return {
        total_projects: projectCount || 0,
        pending_bids: bidCount || 0,
        open_punch_items: punchCount || 0,
        open_tasks: taskCount || 0,
        expiring_documents: expiringCount || 0,
        overdue_items: (overduePunchCount || 0) + (overdueTaskCount || 0),
      }
    } catch (error) {
      throw new ApiErrorClass({
        code: 'STATS_ERROR',
        message: 'Failed to fetch subcontractor stats',
      })
    }
  },

  // =============================================
  // PROJECTS
  // =============================================

  /**
   * Get all projects the subcontractor has access to
   */
  async getProjects(userId: string): Promise<SubcontractorProject[]> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)

      if (subcontractorIds.length === 0) return []

      const { data, error } = await supabase
        .from('subcontractors')
        .select(`
          id,
          trade,
          scope_of_work,
          contract_amount,
          contract_start_date,
          contract_end_date,
          project:projects(
            id,
            name,
            address,
            status
          )
        `)
        .in('id', subcontractorIds)
        .is('deleted_at', null)

      if (error) throw error

      // Transform and add counts
      const projects: SubcontractorProject[] = await Promise.all(
        (data || []).map(async (sub: any) => {
          const project = sub.project

          // Get counts
          const [punchCount, taskCount, bidCount] = await Promise.all([
            supabase
              .from('punch_items')
              .select('id', { count: 'exact', head: true })
              .eq('subcontractor_id', sub.id)
              .in('status', ['open', 'in_progress', 'ready_for_review'])
              .is('deleted_at', null),
            supabase
              .from('tasks')
              .select('id', { count: 'exact', head: true })
              .eq('assigned_to_subcontractor_id', sub.id)
              .in('status', ['pending', 'in_progress'])
              .is('deleted_at', null),
            db
              .from('change_order_bids')
              .select('id', { count: 'exact', head: true })
              .eq('subcontractor_id', sub.id)
              .eq('bid_status', 'pending'),
          ])

          // Get portal access permissions
          const { data: access } = await db
            .from('subcontractor_portal_access')
            .select('*')
            .eq('subcontractor_id', sub.id)
            .eq('user_id', userId)
            .eq('is_active', true)
            .single()

          return {
            id: project.id,
            name: project.name,
            address: project.address,
            status: project.status,
            trade: sub.trade,
            scope_of_work: sub.scope_of_work,
            contract_amount: sub.contract_amount,
            contract_start_date: sub.contract_start_date,
            contract_end_date: sub.contract_end_date,
            punch_item_count: punchCount.count || 0,
            task_count: taskCount.count || 0,
            pending_bid_count: bidCount.count || 0,
            permissions: {
              can_view_scope: access?.can_view_scope ?? true,
              can_view_documents: access?.can_view_documents ?? true,
              can_submit_bids: access?.can_submit_bids ?? true,
              can_view_schedule: access?.can_view_schedule ?? true,
              can_update_punch_items: access?.can_update_punch_items ?? true,
              can_update_tasks: access?.can_update_tasks ?? true,
              can_upload_documents: access?.can_upload_documents ?? false,
            },
          }
        })
      )

      return projects
    } catch (error) {
      throw new ApiErrorClass({
        code: 'PROJECTS_ERROR',
        message: 'Failed to fetch subcontractor projects',
      })
    }
  },

  // =============================================
  // BIDS
  // =============================================

  /**
   * Get all pending bids for the subcontractor
   */
  async getPendingBids(userId: string, filter?: BidsFilter): Promise<BidWithRelations[]> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)

      if (subcontractorIds.length === 0) return []

      let query = db
        .from('change_order_bids')
        .select(`
          *,
          subcontractor:subcontractors(id, company_name, trade),
          project:projects(id, name, address),
          workflow_item:workflow_items(id, title, item_number, workflow_type, status)
        `)
        .in('subcontractor_id', subcontractorIds)

      if (filter?.status) {
        const statuses = Array.isArray(filter.status) ? filter.status : [filter.status]
        query = query.in('bid_status', statuses)
      } else {
        query = query.eq('bid_status', 'pending')
      }

      if (filter?.project_id) {
        query = query.eq('project_id', filter.project_id)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      throw new ApiErrorClass({
        code: 'BIDS_ERROR',
        message: 'Failed to fetch pending bids',
      })
    }
  },

  /**
   * Get a single bid by ID
   */
  async getBid(bidId: string): Promise<BidWithRelations> {
    try {
      const { data, error } = await db
        .from('change_order_bids')
        .select(`
          *,
          subcontractor:subcontractors(id, company_name, trade),
          project:projects(id, name, address),
          workflow_item:workflow_items(id, title, item_number, workflow_type, status, description)
        `)
        .eq('id', bidId)
        .single()

      if (error) throw error
      if (!data) {
        throw new ApiErrorClass({
          code: 'BID_NOT_FOUND',
          message: 'Bid not found',
        })
      }

      return data
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'BID_ERROR',
            message: 'Failed to fetch bid',
          })
    }
  },

  /**
   * Submit a bid response
   */
  async submitBid(bidId: string, userId: string, data: SubmitBidDTO): Promise<SubcontractorBid> {
    try {
      const { data: bid, error } = await db
        .from('change_order_bids')
        .update({
          lump_sum_cost: data.lump_sum_cost,
          duration_days: data.duration_days,
          notes: data.notes,
          exclusions: data.exclusions,
          supporting_documents: data.supporting_documents,
          bid_status: 'submitted',
          submitted_at: new Date().toISOString(),
          submitted_by: userId,
        })
        .eq('id', bidId)
        .select()
        .single()

      if (error) throw error

      // TODO: Notify GC that bid was submitted

      return bid
    } catch (error) {
      throw new ApiErrorClass({
        code: 'SUBMIT_BID_ERROR',
        message: 'Failed to submit bid',
      })
    }
  },

  /**
   * Decline a bid
   */
  async declineBid(bidId: string, userId: string, reason?: string): Promise<SubcontractorBid> {
    try {
      const { data, error } = await db
        .from('change_order_bids')
        .update({
          bid_status: 'declined',
          notes: reason,
          submitted_at: new Date().toISOString(),
          submitted_by: userId,
        })
        .eq('id', bidId)
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      throw new ApiErrorClass({
        code: 'DECLINE_BID_ERROR',
        message: 'Failed to decline bid',
      })
    }
  },

  // =============================================
  // PUNCH ITEMS
  // =============================================

  /**
   * Get punch items assigned to the subcontractor
   */
  async getPunchItems(
    userId: string,
    filter?: SubcontractorItemsFilter
  ): Promise<SubcontractorPunchItem[]> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)

      if (subcontractorIds.length === 0) return []

      let query = supabase
        .from('punch_items')
        .select('*')
        .in('subcontractor_id', subcontractorIds)
        .is('deleted_at', null)

      if (filter?.project_id) {
        query = query.eq('project_id', filter.project_id)
      }

      if (filter?.status) {
        const statuses = Array.isArray(filter.status) ? filter.status : [filter.status]
        query = query.in('status', statuses)
      }

      if (filter?.priority) {
        const priorities = Array.isArray(filter.priority) ? filter.priority : [filter.priority]
        query = query.in('priority', priorities)
      }

      if (filter?.due_date_from) {
        query = query.gte('due_date', filter.due_date_from)
      }

      if (filter?.due_date_to) {
        query = query.lte('due_date', filter.due_date_to)
      }

      if (filter?.search) {
        query = query.or(`title.ilike.%${filter.search}%,description.ilike.%${filter.search}%`)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      return (data || []) as any[]
    } catch (error) {
      throw new ApiErrorClass({
        code: 'PUNCH_ITEMS_ERROR',
        message: 'Failed to fetch punch items',
      })
    }
  },

  /**
   * Update punch item status
   */
  async updatePunchItemStatus(
    punchItemId: string,
    userId: string,
    data: UpdateItemStatusDTO
  ): Promise<SubcontractorPunchItem> {
    try {
      const updateData: Record<string, any> = {
        status: data.status,
      }

      // Track completion
      if (data.status === 'ready_for_review' || data.status === 'completed') {
        updateData.marked_complete_by = userId
        updateData.marked_complete_at = new Date().toISOString()
      }

      const { data: item, error } = await supabase
        .from('punch_items')
        .update(updateData)
        .eq('id', punchItemId)
        .select()
        .single()

      if (error) throw error

      return item as any
    } catch (error) {
      throw new ApiErrorClass({
        code: 'UPDATE_PUNCH_ITEM_ERROR',
        message: 'Failed to update punch item status',
      })
    }
  },

  // =============================================
  // TASKS
  // =============================================

  /**
   * Get tasks assigned to the subcontractor
   */
  async getTasks(userId: string, filter?: SubcontractorItemsFilter): Promise<SubcontractorTask[]> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)

      if (subcontractorIds.length === 0) return []

      let query = supabase
        .from('tasks')
        .select('*')
        .in('assigned_to_subcontractor_id', subcontractorIds)
        .is('deleted_at', null)

      if (filter?.project_id) {
        query = query.eq('project_id', filter.project_id)
      }

      if (filter?.status) {
        const statuses = Array.isArray(filter.status) ? filter.status : [filter.status]
        query = query.in('status', statuses)
      }

      if (filter?.priority) {
        const priorities = Array.isArray(filter.priority) ? filter.priority : [filter.priority]
        query = query.in('priority', priorities)
      }

      if (filter?.due_date_from) {
        query = query.gte('due_date', filter.due_date_from)
      }

      if (filter?.due_date_to) {
        query = query.lte('due_date', filter.due_date_to)
      }

      if (filter?.search) {
        query = query.or(`title.ilike.%${filter.search}%,description.ilike.%${filter.search}%`)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      return (data || []) as any[]
    } catch (error) {
      throw new ApiErrorClass({
        code: 'TASKS_ERROR',
        message: 'Failed to fetch tasks',
      })
    }
  },

  /**
   * Update task status
   */
  async updateTaskStatus(
    taskId: string,
    userId: string,
    data: UpdateItemStatusDTO
  ): Promise<SubcontractorTask> {
    try {
      const updateData: Record<string, any> = {
        status: data.status,
      }

      // Track completion
      if (data.status === 'completed') {
        updateData.completed_date = new Date().toISOString()
      }

      const { data: task, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .select()
        .single()

      if (error) throw error

      return task as any
    } catch (error) {
      throw new ApiErrorClass({
        code: 'UPDATE_TASK_ERROR',
        message: 'Failed to update task status',
      })
    }
  },

  // =============================================
  // COMPLIANCE DOCUMENTS
  // =============================================

  /**
   * Get compliance documents for the subcontractor
   */
  async getComplianceDocuments(
    userId: string,
    filter?: ComplianceDocumentsFilter
  ): Promise<ComplianceDocumentWithRelations[]> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)

      if (subcontractorIds.length === 0) return []

      let query = db
        .from('subcontractor_compliance_documents')
        .select(`
          *,
          subcontractor:subcontractors(id, company_name, trade),
          project:projects(id, name)
        `)
        .in('subcontractor_id', subcontractorIds)
        .is('deleted_at', null)

      if (filter?.document_type) {
        const types = Array.isArray(filter.document_type)
          ? filter.document_type
          : [filter.document_type]
        query = query.in('document_type', types)
      }

      if (filter?.status) {
        const statuses = Array.isArray(filter.status) ? filter.status : [filter.status]
        query = query.in('status', statuses)
      }

      if (filter?.project_id) {
        query = query.eq('project_id', filter.project_id)
      }

      const { data, error } = await query.order('expiration_date', { ascending: true })

      if (error) throw error

      return data || []
    } catch (error) {
      throw new ApiErrorClass({
        code: 'COMPLIANCE_DOCS_ERROR',
        message: 'Failed to fetch compliance documents',
      })
    }
  },

  /**
   * Upload a new compliance document
   */
  async uploadComplianceDocument(
    userId: string,
    data: CreateComplianceDocumentDTO
  ): Promise<SubcontractorComplianceDocument> {
    try {
      const { data: doc, error } = await db
        .from('subcontractor_compliance_documents')
        .insert({
          ...data,
          uploaded_by: userId,
          status: 'pending',
        })
        .select()
        .single()

      if (error) throw error

      return doc
    } catch (error) {
      throw new ApiErrorClass({
        code: 'UPLOAD_DOC_ERROR',
        message: 'Failed to upload compliance document',
      })
    }
  },

  /**
   * Get documents expiring soon
   */
  async getExpiringDocuments(subcontractorIds: string[]): Promise<ExpiringDocument[]> {
    try {
      if (subcontractorIds.length === 0) return []

      const { data, error } = await db.rpc('check_expiring_compliance_documents')

      if (error) throw error

      // Filter to only this subcontractor's documents
      return (data || []).filter((doc: ExpiringDocument) =>
        subcontractorIds.includes(doc.subcontractor_id)
      )
    } catch (error) {
      // Return empty array if function doesn't exist yet
      return []
    }
  },

  // =============================================
  // INVITATIONS
  // =============================================

  /**
   * Create an invitation for a subcontractor user
   */
  async createInvitation(
    invitedBy: string,
    data: CreateInvitationDTO
  ): Promise<SubcontractorInvitation> {
    try {
      const { data: invitation, error } = await db
        .from('subcontractor_invitations')
        .insert({
          ...data,
          invited_by: invitedBy,
        })
        .select()
        .single()

      if (error) throw error

      // TODO: Send invitation email

      return invitation
    } catch (error) {
      throw new ApiErrorClass({
        code: 'CREATE_INVITATION_ERROR',
        message: 'Failed to create invitation',
      })
    }
  },

  /**
   * Validate an invitation token
   */
  async validateInvitation(token: string): Promise<InvitationValidation> {
    try {
      const { data, error } = await db
        .from('subcontractor_invitations')
        .select(`
          *,
          subcontractor:subcontractors(id, company_name, trade),
          project:projects(id, name, address)
        `)
        .eq('token', token)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single()

      if (error || !data) {
        return {
          is_valid: false,
          error: 'Invalid or expired invitation',
        }
      }

      return {
        is_valid: true,
        invitation: data,
        subcontractor: data.subcontractor,
        project: data.project,
      }
    } catch (error) {
      return {
        is_valid: false,
        error: 'Failed to validate invitation',
      }
    }
  },

  /**
   * Accept an invitation
   */
  async acceptInvitation(token: string, userId: string): Promise<void> {
    try {
      // Get invitation
      const { data: invitation, error: fetchError } = await db
        .from('subcontractor_invitations')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .single()

      if (fetchError || !invitation) {
        throw new ApiErrorClass({
          code: 'INVITATION_NOT_FOUND',
          message: 'Invitation not found or expired',
        })
      }

      // Update invitation status
      const { error: updateError } = await db
        .from('subcontractor_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          accepted_by: userId,
        })
        .eq('id', invitation.id)

      if (updateError) throw updateError

      // Create portal access
      const { error: accessError } = await db.from('subcontractor_portal_access').insert({
        subcontractor_id: invitation.subcontractor_id,
        user_id: userId,
        project_id: invitation.project_id,
        invited_by: invitation.invited_by,
        accepted_at: new Date().toISOString(),
      })

      if (accessError) throw accessError
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'ACCEPT_INVITATION_ERROR',
            message: 'Failed to accept invitation',
          })
    }
  },

  // =============================================
  // PORTAL ACCESS MANAGEMENT (GC SIDE)
  // =============================================

  /**
   * Get all portal access records for a project
   */
  async getPortalAccess(projectId: string): Promise<SubcontractorPortalAccessWithRelations[]> {
    try {
      const { data, error } = await db
        .from('subcontractor_portal_access')
        .select(`
          *,
          subcontractor:subcontractors(id, company_name, trade),
          user:users(id, email, first_name, last_name),
          project:projects(id, name),
          invited_by_user:users!invited_by(id, email, first_name, last_name)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      throw new ApiErrorClass({
        code: 'PORTAL_ACCESS_ERROR',
        message: 'Failed to fetch portal access records',
      })
    }
  },

  /**
   * Update portal access permissions
   */
  async updatePortalAccess(
    accessId: string,
    data: UpdatePortalAccessDTO
  ): Promise<SubcontractorPortalAccess> {
    try {
      const { data: access, error } = await db
        .from('subcontractor_portal_access')
        .update(data)
        .eq('id', accessId)
        .select()
        .single()

      if (error) throw error

      return access
    } catch (error) {
      throw new ApiErrorClass({
        code: 'UPDATE_ACCESS_ERROR',
        message: 'Failed to update portal access',
      })
    }
  },

  /**
   * Revoke portal access
   */
  async revokePortalAccess(accessId: string): Promise<void> {
    try {
      const { error } = await db
        .from('subcontractor_portal_access')
        .update({ is_active: false })
        .eq('id', accessId)

      if (error) throw error
    } catch (error) {
      throw new ApiErrorClass({
        code: 'REVOKE_ACCESS_ERROR',
        message: 'Failed to revoke portal access',
      })
    }
  },

  // =============================================
  // SCOPE OF WORK
  // =============================================

  /**
   * Get scope of work for a project
   */
  async getScope(userId: string, projectId: string): Promise<{
    scope_of_work: string | null;
    scope_document_url: string | null;
    contract_amount: number | null;
    contract_start_date: string | null;
    contract_end_date: string | null;
  } | null> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)

      if (subcontractorIds.length === 0) return null

      const { data, error } = await supabase
        .from('subcontractors')
        .select('scope_of_work, scope_document_url, contract_amount, contract_start_date, contract_end_date')
        .in('id', subcontractorIds)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .single()

      if (error) return null

      return data
    } catch (error) {
      return null
    }
  },
}

export default subcontractorPortalApi
