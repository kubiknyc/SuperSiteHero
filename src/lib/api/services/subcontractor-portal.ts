/**
 * Subcontractor Portal API Service
 * Handles all API operations for the subcontractor portal feature
 */

import { supabase } from '@/lib/supabase'
import { ApiErrorClass } from '../errors'
import {
  sendBidSubmittedNotification,
  sendPortalInvitationNotification,
  type NotificationRecipient,
} from '@/lib/notifications/notification-service'
import { logger } from '@/lib/utils/logger'
import type {
  SubcontractorPortalAccess,
  SubcontractorPortalAccessWithRelations,
  UpdatePortalAccessDTO,
  SubcontractorComplianceDocument,
  ComplianceDocumentWithRelations,
  CreateComplianceDocumentDTO,
  ExpiringDocument,
  SubcontractorInvitation,
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
  SubcontractorRFI,
  SubcontractorDocument,
  SubcontractorPayment,
  SubcontractorLienWaiver,
  SubcontractorLienWaiverFilters,
  SignLienWaiverDTO,
  LienWaiverSummary,
  SubcontractorRetainageInfo,
  RetainageRelease,
  RetainageSummary,
  SubcontractorInsuranceCertificate,
  SubcontractorInsuranceRequirement,
  SubcontractorInsuranceComplianceSummary,
  EndorsementRequirement,
  EndorsementStatus,
  InsuranceType,
  SubcontractorPayApplication,
  SubcontractorPayAppLineItem,
  PayApplicationSummary,
  SubcontractorChangeOrder,
  SubcontractorChangeOrderItem,
  ChangeOrderSummary,
  ChangeOrderStatus,
  ChangeOrderType,
  SubcontractorScheduleActivity,
  ScheduleChangeNotification,
  ScheduleSummary,
  ScheduleActivityStatus,
  SubcontractorSafetyIncident,
  SubcontractorCorrectiveAction,
  SubcontractorToolboxTalk,
  SubcontractorSafetyMetrics,
  SafetyComplianceSummary,
  SafetyIncidentSeverity,
  SafetyIncidentStatus,
  SubcontractorPhoto,
  SubcontractorPhotoFilters,
  PhotoSummary,
  PhotoCategory,
  SubcontractorMeeting,
  SubcontractorActionItem,
  MeetingAttachment,
  MeetingSummary,
  MeetingStatus,
  ActionItemStatus,
  SubcontractorCertification,
  CertificationSummary,
  CertificationType,
  CertificationStatusType,
  CreateCertificationDTO,
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

  if (!user?.email) {return []}

  const { data: contacts } = await supabase
    .from('contacts')
    .select('id')
    .eq('email', user.email)

  if (!contacts || contacts.length === 0) {return []}

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

  if (!user?.email) {return null}

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

  if (!data) {return null}

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
   * Get assignment counts for tabs (RFIs, Documents, Payments)
   * Used by MyAssignments component to show tab counts
   */
  async getAssignmentCounts(userId: string): Promise<{
    rfis: number
    documents: number
    payments: number
  }> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)

      if (subcontractorIds.length === 0) {
        return { rfis: 0, documents: 0, payments: 0 }
      }

      // Get project IDs for this subcontractor
      const { data: subcontractorProjects } = await supabase
        .from('subcontractors')
        .select('project_id')
        .in('id', subcontractorIds)
        .is('deleted_at', null)

      const projectIds = subcontractorProjects?.map(s => s.project_id) || []

      // Count RFIs where ball_in_court_role is 'subcontractor' on subcontractor's projects
      const { count: rfiCount } = await supabase
        .from('rfis')
        .select('id', { count: 'exact', head: true })
        .in('project_id', projectIds)
        .eq('ball_in_court_role', 'subcontractor')
        .in('status', ['draft', 'submitted', 'pending', 'open'])
        .is('deleted_at', null)

      // Count shared documents for this user
      const { count: docCount } = await db
        .from('document_shares')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_user_id', userId)

      // Count pending payment applications for subcontractor's projects
      const { count: paymentCount } = await db
        .from('payment_applications')
        .select('id', { count: 'exact', head: true })
        .in('project_id', projectIds)
        .in('status', ['draft', 'submitted', 'under_review'])
        .is('deleted_at', null)

      return {
        rfis: rfiCount || 0,
        documents: docCount || 0,
        payments: paymentCount || 0,
      }
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch assignment counts:', error)
      return { rfis: 0, documents: 0, payments: 0 }
    }
  },

  // =============================================
  // RFIs (For Subcontractor Response)
  // =============================================

  /**
   * Get RFIs where ball is in subcontractor's court
   */
  async getSubcontractorRFIs(userId: string): Promise<SubcontractorRFI[]> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)

      if (subcontractorIds.length === 0) {return []}

      // Get project IDs for this subcontractor
      const { data: subcontractorProjects } = await supabase
        .from('subcontractors')
        .select('project_id')
        .in('id', subcontractorIds)
        .is('deleted_at', null)

      const projectIds = subcontractorProjects?.map(s => s.project_id) || []

      if (projectIds.length === 0) {return []}

      const { data, error } = await supabase
        .from('rfis')
        .select(`
          id,
          rfi_number,
          title,
          description,
          status,
          priority,
          ball_in_court_role,
          due_date,
          date_initiated,
          project_id,
          created_at,
          project:projects(id, name)
        `)
        .in('project_id', projectIds)
        .eq('ball_in_court_role', 'subcontractor')
        .in('status', ['draft', 'submitted', 'pending', 'open'])
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {throw error}

      return (data || []).map((rfi: any) => ({
        id: rfi.id,
        rfi_number: rfi.rfi_number,
        title: rfi.title,
        description: rfi.description,
        status: rfi.status,
        priority: rfi.priority,
        ball_in_court_role: rfi.ball_in_court_role,
        due_date: rfi.due_date,
        date_initiated: rfi.date_initiated,
        project_id: rfi.project_id,
        project_name: rfi.project?.name || 'Unknown Project',
        created_at: rfi.created_at,
      }))
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch RFIs:', error)
      return []
    }
  },

  // =============================================
  // SHARED DOCUMENTS
  // =============================================

  /**
   * Get documents shared with the subcontractor user
   */
  async getSubcontractorDocuments(userId: string): Promise<SubcontractorDocument[]> {
    try {
      const { data, error } = await db
        .from('document_shares')
        .select(`
          id,
          document_id,
          shared_at,
          can_download,
          can_edit,
          expires_at,
          document:documents(
            id,
            name,
            file_type,
            file_size,
            file_url,
            category,
            project_id,
            project:projects(id, name)
          )
        `)
        .eq('recipient_user_id', userId)
        .order('shared_at', { ascending: false })

      if (error) {throw error}

      return (data || [])
        .filter((share: any) => share.document)
        .map((share: any) => ({
          id: share.id,
          document_id: share.document_id,
          name: share.document.name,
          file_type: share.document.file_type,
          file_size: share.document.file_size,
          file_url: share.document.file_url,
          category: share.document.category,
          project_id: share.document.project_id,
          project_name: share.document.project?.name || 'Unknown Project',
          shared_at: share.shared_at,
          can_download: share.can_download,
          can_edit: share.can_edit,
          expires_at: share.expires_at,
        }))
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch documents:', error)
      return []
    }
  },

  // =============================================
  // PAYMENT APPLICATIONS
  // =============================================

  /**
   * Get payment applications for the subcontractor's projects
   */
  async getSubcontractorPayments(userId: string): Promise<SubcontractorPayment[]> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)

      if (subcontractorIds.length === 0) {return []}

      // Get project IDs for this subcontractor
      const { data: subcontractorProjects } = await supabase
        .from('subcontractors')
        .select('project_id')
        .in('id', subcontractorIds)
        .is('deleted_at', null)

      const projectIds = subcontractorProjects?.map(s => s.project_id) || []

      if (projectIds.length === 0) {return []}

      const { data, error } = await db
        .from('payment_applications')
        .select(`
          id,
          application_number,
          period_from,
          period_to,
          status,
          scheduled_value,
          work_completed_this_period,
          total_completed_to_date,
          retainage_amount,
          current_payment_due,
          submitted_at,
          approved_at,
          project_id,
          created_at,
          project:projects(id, name)
        `)
        .in('project_id', projectIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {throw error}

      return (data || []).map((payment: any) => ({
        id: payment.id,
        application_number: payment.application_number,
        period_from: payment.period_from,
        period_to: payment.period_to,
        status: payment.status,
        scheduled_value: payment.scheduled_value,
        work_completed_this_period: payment.work_completed_this_period,
        total_completed_to_date: payment.total_completed_to_date,
        retainage_amount: payment.retainage_amount,
        current_payment_due: payment.current_payment_due,
        submitted_at: payment.submitted_at,
        approved_at: payment.approved_at,
        project_id: payment.project_id,
        project_name: payment.project?.name || 'Unknown Project',
        created_at: payment.created_at,
      }))
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch payments:', error)
      return []
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
    } catch (_error) {
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

      if (subcontractorIds.length === 0) {return []}

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

      if (error) {throw error}

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
    } catch (_error) {
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

      if (subcontractorIds.length === 0) {return []}

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

      if (error) {throw error}

      return data || []
    } catch (_error) {
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

      if (error) {throw error}
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

      if (error) {throw error}

      // Notify GC/Project Managers that bid was submitted
      try {
        // Fetch full bid details with relations for notification
        const { data: fullBid } = await db
          .from('change_order_bids')
          .select(`
            *,
            subcontractor:subcontractors(id, company_name),
            project:projects(id, name),
            workflow_item:workflow_items(id, item_number, title)
          `)
          .eq('id', bidId)
          .single()

        if (fullBid && fullBid.project) {
          // Get project managers to notify
          const { data: projectUsers } = await supabase
            .from('project_users')
            .select('user_id, users(id, email, full_name)')
            .eq('project_id', fullBid.project_id)
            .in('role', ['project_manager', 'owner', 'admin'])

          const recipients: NotificationRecipient[] = (projectUsers || [])
            .filter((pu: any) => pu.users?.email)
            .map((pu: any) => ({
              userId: pu.user_id,
              email: pu.users.email,
              name: pu.users.full_name,
            }))

          if (recipients.length > 0) {
            const formatCurrency = (val: number) =>
              new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)

            await sendBidSubmittedNotification(recipients, {
              subcontractorName: fullBid.subcontractor?.company_name || 'Unknown',
              projectName: fullBid.project?.name || 'Unknown Project',
              changeOrderNumber: fullBid.workflow_item?.item_number || 'N/A',
              changeOrderTitle: fullBid.workflow_item?.title || 'Change Order',
              bidAmount: formatCurrency(data.lump_sum_cost || 0),
              durationDays: data.duration_days,
              submittedAt: new Date().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              }),
              viewUrl: `${import.meta.env.VITE_APP_URL || 'https://JobSight.com'}/change-orders/${fullBid.workflow_item_id}`,
            })
          }
        }
      } catch (notifyError) {
        // Don't fail the bid submission if notification fails
        logger.error('[SubcontractorPortal] Failed to send bid notification:', notifyError)
      }

      return bid
    } catch (_error) {
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

      if (error) {throw error}

      return data
    } catch (_error) {
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

      if (subcontractorIds.length === 0) {return []}

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

      if (error) {throw error}

      // Get photo counts for each punch item
      const punchItemIds = (data || []).map((item: any) => item.id)
      const photoCountsMap: Record<string, number> = {}

      if (punchItemIds.length > 0) {
        const { data: photoCounts } = await supabase
          .from('photos')
          .select('punch_item_id')
          .in('punch_item_id', punchItemIds)
          .is('deleted_at', null)

        // Count photos per punch item
        if (photoCounts) {
          photoCounts.forEach((photo: { punch_item_id: string }) => {
            if (photo.punch_item_id) {
              photoCountsMap[photo.punch_item_id] = (photoCountsMap[photo.punch_item_id] || 0) + 1
            }
          })
        }
      }

      // Add photo_count to each punch item
      return (data || []).map((item: any) => ({
        ...item,
        photo_count: photoCountsMap[item.id] || 0,
      })) as any[]
    } catch (_error) {
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

      if (error) {throw error}

      return item as any
    } catch (_error) {
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

      if (subcontractorIds.length === 0) {return []}

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

      if (error) {throw error}

      return (data || []) as any[]
    } catch (_error) {
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

      if (error) {throw error}

      return task as any
    } catch (_error) {
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

      if (subcontractorIds.length === 0) {return []}

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

      if (error) {throw error}

      return data || []
    } catch (_error) {
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

      if (error) {throw error}

      return doc
    } catch (_error) {
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
      if (subcontractorIds.length === 0) {return []}

      const { data, error } = await db.rpc('check_expiring_compliance_documents')

      if (error) {throw error}

      // Filter to only this subcontractor's documents
      return (data || []).filter((doc: ExpiringDocument) =>
        subcontractorIds.includes(doc.subcontractor_id)
      )
    } catch (_error) {
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

      if (error) {throw error}

      // Send invitation email
      try {
        // Fetch related data for email
        const [subcontractorResult, projectResult, inviterResult] = await Promise.all([
          db.from('subcontractors').select('company_name').eq('id', data.subcontractor_id).single(),
          db.from('projects').select('name').eq('id', data.project_id).single(),
          db.from('profiles').select('full_name').eq('id', invitedBy).single(),
        ])

        const subcontractorName = subcontractorResult.data?.company_name || 'Subcontractor'
        const projectName = projectResult.data?.name || 'Project'
        const inviterName = inviterResult.data?.full_name || 'Team'

        // Build invitation URL
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : process.env.VITE_APP_URL || ''
        const invitationUrl = `${baseUrl}/portal/invite/${invitation.token}`

        // Send the invitation email
        await sendPortalInvitationNotification(data.email, {
          companyName: subcontractorName,
          projectName,
          invitedBy: inviterName,
          accessLevel: 'Subcontractor Portal',
          expiresAt: new Date(invitation.expires_at).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }),
          invitationUrl,
        })
      } catch (emailError) {
        // Log but don't fail - invitation was created successfully
        logger.error('[SubcontractorPortal] Failed to send invitation email:', emailError)
      }

      return invitation
    } catch (_error) {
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
    } catch (_error) {
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

      if (updateError) {throw updateError}

      // Create portal access
      const { error: accessError } = await db.from('subcontractor_portal_access').insert({
        subcontractor_id: invitation.subcontractor_id,
        user_id: userId,
        project_id: invitation.project_id,
        invited_by: invitation.invited_by,
        accepted_at: new Date().toISOString(),
      })

      if (accessError) {throw accessError}
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

      if (error) {throw error}

      return data || []
    } catch (_error) {
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

      if (error) {throw error}

      return access
    } catch (_error) {
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

      if (error) {throw error}
    } catch (_error) {
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

      if (subcontractorIds.length === 0) {return null}

      const { data, error } = await supabase
        .from('subcontractors')
        .select('scope_of_work, scope_document_url, contract_amount, contract_start_date, contract_end_date')
        .in('id', subcontractorIds)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .single()

      if (error) {return null}

      return data
    } catch (_error) {
      return null
    }
  },

  // =============================================
  // DAILY REPORTS (READ-ONLY)
  // =============================================

  /**
   * Get daily reports accessible to the subcontractor
   */
  async getDailyReports(
    userId: string,
    filter?: {
      projectId?: string;
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<SubcontractorDailyReport[]> {
    try {
      const subcontractor = await getSubcontractorForUser(userId)
      if (!subcontractor) {
        return []
      }

      const { data, error } = await db.rpc('get_subcontractor_daily_reports', {
        p_subcontractor_id: subcontractor.id,
        p_project_id: filter?.projectId || null,
        p_date_from: filter?.dateFrom || null,
        p_date_to: filter?.dateTo || null,
        p_limit: filter?.limit || 50,
        p_offset: filter?.offset || 0,
      })

      if (error) {
        throw new ApiErrorClass({ code: '500', message: 'Failed to fetch daily reports', status: 500, details: error })
      }

      return data || []
    } catch (error) {
      if (error instanceof ApiErrorClass) {throw error}
      throw new ApiErrorClass({ code: '500', message: 'Failed to fetch daily reports', status: 500, details: error })
    }
  },

  /**
   * Get single daily report detail
   */
  async getDailyReport(userId: string, reportId: string): Promise<SubcontractorDailyReportDetail | null> {
    try {
      const subcontractor = await getSubcontractorForUser(userId)
      if (!subcontractor) {
        return null
      }

      const { data, error } = await db.rpc('get_subcontractor_daily_report_detail', {
        p_subcontractor_id: subcontractor.id,
        p_report_id: reportId,
      })

      if (error) {
        throw new ApiErrorClass({ code: '500', message: 'Failed to fetch daily report detail', status: 500, details: error })
      }

      if (!data || data.length === 0) {
        return null
      }

      // Get related data in parallel
      const [workforce, equipment, photos] = await Promise.all([
        this.getDailyReportWorkforce(userId, reportId),
        this.getDailyReportEquipment(userId, reportId),
        this.getDailyReportPhotos(userId, reportId),
      ])

      return {
        ...data[0],
        workforce,
        equipment,
        photos,
      }
    } catch (error) {
      if (error instanceof ApiErrorClass) {throw error}
      throw new ApiErrorClass({ code: '500', message: 'Failed to fetch daily report detail', status: 500, details: error })
    }
  },

  /**
   * Get workforce entries for a daily report
   */
  async getDailyReportWorkforce(userId: string, reportId: string): Promise<SubcontractorDailyReportWorkforce[]> {
    try {
      const subcontractor = await getSubcontractorForUser(userId)
      if (!subcontractor) {
        return []
      }

      const { data, error } = await db.rpc('get_subcontractor_daily_report_workforce', {
        p_subcontractor_id: subcontractor.id,
        p_report_id: reportId,
      })

      if (error) {
        throw new ApiErrorClass({ code: '500', message: 'Failed to fetch workforce data', status: 500, details: error })
      }

      return data || []
    } catch (error) {
      if (error instanceof ApiErrorClass) {throw error}
      throw new ApiErrorClass({ code: '500', message: 'Failed to fetch workforce data', status: 500, details: error })
    }
  },

  /**
   * Get equipment entries for a daily report
   */
  async getDailyReportEquipment(userId: string, reportId: string): Promise<SubcontractorDailyReportEquipment[]> {
    try {
      const subcontractor = await getSubcontractorForUser(userId)
      if (!subcontractor) {
        return []
      }

      const { data, error } = await db.rpc('get_subcontractor_daily_report_equipment', {
        p_subcontractor_id: subcontractor.id,
        p_report_id: reportId,
      })

      if (error) {
        throw new ApiErrorClass({ code: '500', message: 'Failed to fetch equipment data', status: 500, details: error })
      }

      return data || []
    } catch (error) {
      if (error instanceof ApiErrorClass) {throw error}
      throw new ApiErrorClass({ code: '500', message: 'Failed to fetch equipment data', status: 500, details: error })
    }
  },

  /**
   * Get photos for a daily report
   */
  async getDailyReportPhotos(userId: string, reportId: string): Promise<SubcontractorDailyReportPhoto[]> {
    try {
      const subcontractor = await getSubcontractorForUser(userId)
      if (!subcontractor) {
        return []
      }

      const { data, error } = await db.rpc('get_subcontractor_daily_report_photos', {
        p_subcontractor_id: subcontractor.id,
        p_report_id: reportId,
      })

      if (error) {
        throw new ApiErrorClass({ code: '500', message: 'Failed to fetch photos', status: 500, details: error })
      }

      return data || []
    } catch (error) {
      if (error instanceof ApiErrorClass) {throw error}
      throw new ApiErrorClass({ code: '500', message: 'Failed to fetch photos', status: 500, details: error })
    }
  },

  /**
   * Check if subcontractor has access to view daily reports for any project
   */
  async canViewDailyReports(userId: string): Promise<boolean> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)
      if (subcontractorIds.length === 0) {
        return false
      }

      const { data, error } = await supabase
        .from('subcontractor_portal_access')
        .select('id')
        .in('subcontractor_id', subcontractorIds)
        .eq('is_active', true)
        .eq('can_view_daily_reports', true)
        .limit(1)

      return !error && data && data.length > 0
    } catch (_error) {
      return false
    }
  },

  // =============================================
  // RFIS (FOR SUBCONTRACTOR RESPONSE)
  // =============================================

  /**
   * Get RFIs assigned to the subcontractor (ball in their court)
   */
  async getRFIs(userId: string): Promise<SubcontractorRFI[]> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)
      if (subcontractorIds.length === 0) {return []}

      // Get projects for these subcontractors
      const { data: subs } = await supabase
        .from('subcontractors')
        .select('project_id')
        .in('id', subcontractorIds)
        .is('deleted_at', null)

      if (!subs || subs.length === 0) {return []}

      const projectIds = [...new Set(subs.map(s => s.project_id))]

      // Get RFIs where ball_in_court_role is 'subcontractor' or assigned to user
      const { data, error } = await db
        .from('rfis')
        .select(`
          id,
          rfi_number,
          title,
          description,
          status,
          priority,
          due_date,
          project_id,
          ball_in_court_role,
          ball_in_court_user_id,
          assigned_to_user_id,
          question,
          created_at,
          updated_at,
          project:projects(name)
        `)
        .in('project_id', projectIds)
        .or(`ball_in_court_role.eq.subcontractor,assigned_to_user_id.eq.${userId}`)
        .in('status', ['open', 'responded'])
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {throw error}

      return (data || []).map((rfi: any) => ({
        ...rfi,
        project_name: rfi.project?.name || 'Unknown Project',
      }))
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch RFIs:', error)
      throw new ApiErrorClass({
        code: 'RFIS_ERROR',
        message: 'Failed to fetch RFIs',
      })
    }
  },

  // =============================================
  // SHARED DOCUMENTS
  // =============================================

  /**
   * Get documents shared with the subcontractor
   */
  async getDocuments(userId: string): Promise<SubcontractorDocument[]> {
    try {
      // Query document_shares where recipient_user_id = userId
      const { data, error } = await db
        .from('document_shares')
        .select(`
          id,
          document_id,
          can_download,
          can_edit,
          expires_at,
          created_at,
          document:documents(
            id,
            name,
            file_type,
            file_size,
            file_url,
            category,
            project_id,
            project:projects(name)
          ),
          shared_by:users!shared_by(full_name)
        `)
        .eq('recipient_user_id', userId)
        .is('revoked_at', null)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('created_at', { ascending: false })

      if (error) {throw error}

      return (data || []).map((share: any) => ({
        id: share.id,
        document_id: share.document_id,
        name: share.document?.name || 'Unknown Document',
        file_type: share.document?.file_type,
        file_size: share.document?.file_size,
        file_url: share.document?.file_url || '',
        category: share.document?.category,
        project_id: share.document?.project_id,
        project_name: share.document?.project?.name || 'Unknown Project',
        shared_at: share.created_at,
        shared_by_name: share.shared_by?.full_name,
        can_download: share.can_download ?? true,
        can_edit: share.can_edit ?? false,
        expires_at: share.expires_at,
      }))
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch documents:', error)
      throw new ApiErrorClass({
        code: 'DOCUMENTS_ERROR',
        message: 'Failed to fetch shared documents',
      })
    }
  },

  // =============================================
  // PAYMENT APPLICATIONS
  // =============================================

  /**
   * Get payment applications for the subcontractor
   */
  async getPayments(userId: string): Promise<SubcontractorPayment[]> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)
      if (subcontractorIds.length === 0) {return []}

      // Get projects for these subcontractors
      const { data: subs } = await supabase
        .from('subcontractors')
        .select('project_id')
        .in('id', subcontractorIds)
        .is('deleted_at', null)

      if (!subs || subs.length === 0) {return []}

      const projectIds = [...new Set(subs.map(s => s.project_id))]

      // Fetch payment applications for these projects
      const { data, error } = await db
        .from('payment_applications')
        .select(`
          id,
          application_number,
          period_from,
          period_to,
          status,
          scheduled_value,
          work_completed_to_date,
          previous_payments,
          current_payment_due,
          retainage_held,
          project_id,
          submitted_at,
          approved_at,
          paid_at,
          created_at,
          project:projects(name)
        `)
        .in('project_id', projectIds)
        .in('subcontractor_id', subcontractorIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {throw error}

      return (data || []).map((payment: any) => ({
        ...payment,
        project_name: payment.project?.name || 'Unknown Project',
      }))
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch payments:', error)
      throw new ApiErrorClass({
        code: 'PAYMENTS_ERROR',
        message: 'Failed to fetch payment applications',
      })
    }
  },

  // =============================================
  // LIEN WAIVERS (SUBCONTRACTOR PORTAL)
  // =============================================

  /**
   * Get lien waivers requiring subcontractor action
   */
  async getLienWaivers(
    userId: string,
    filter?: SubcontractorLienWaiverFilters
  ): Promise<SubcontractorLienWaiver[]> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)
      if (subcontractorIds.length === 0) {return []}

      let query = db
        .from('lien_waivers')
        .select(`
          id,
          waiver_number,
          waiver_type,
          status,
          payment_amount,
          through_date,
          due_date,
          sent_at,
          received_at,
          signed_at,
          signed_by,
          signed_by_title,
          signature_url,
          document_url,
          notes,
          rejection_reason,
          project_id,
          subcontractor_id,
          payment_application_id,
          created_at,
          updated_at,
          project:projects(id, name),
          payment_application:payment_applications(id, application_number)
        `)
        .in('subcontractor_id', subcontractorIds)
        .is('deleted_at', null)
        .in('status', ['pending', 'sent', 'received', 'under_review', 'approved', 'rejected'])
        .order('created_at', { ascending: false })

      if (filter?.project_id) {
        query = query.eq('project_id', filter.project_id)
      }

      if (filter?.status) {
        const statuses = Array.isArray(filter.status) ? filter.status : [filter.status]
        query = query.in('status', statuses)
      }

      if (filter?.waiver_type) {
        const types = Array.isArray(filter.waiver_type) ? filter.waiver_type : [filter.waiver_type]
        query = query.in('waiver_type', types)
      }

      const { data, error } = await query

      if (error) {throw error}

      return (data || []).map((waiver: any) => ({
        id: waiver.id,
        waiver_number: waiver.waiver_number,
        waiver_type: waiver.waiver_type,
        status: waiver.status,
        payment_application_id: waiver.payment_application_id,
        payment_application_number: waiver.payment_application?.application_number || null,
        payment_amount: waiver.payment_amount || 0,
        through_date: waiver.through_date,
        due_date: waiver.due_date,
        sent_at: waiver.sent_at,
        received_at: waiver.received_at,
        signed_at: waiver.signed_at,
        project_id: waiver.project_id,
        project_name: waiver.project?.name || 'Unknown Project',
        subcontractor_id: waiver.subcontractor_id,
        signed_by_name: waiver.signed_by,
        signed_by_title: waiver.signed_by_title,
        signature_url: waiver.signature_url,
        document_url: waiver.document_url,
        notes: waiver.notes,
        rejection_reason: waiver.rejection_reason,
        created_at: waiver.created_at,
        updated_at: waiver.updated_at,
      }))
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch lien waivers:', error)
      throw new ApiErrorClass({
        code: 'LIEN_WAIVERS_ERROR',
        message: 'Failed to fetch lien waivers',
      })
    }
  },

  /**
   * Get pending lien waivers awaiting signature
   */
  async getPendingLienWaivers(userId: string): Promise<SubcontractorLienWaiver[]> {
    return this.getLienWaivers(userId, { status: ['pending', 'sent'] })
  },

  /**
   * Get lien waiver summary for dashboard
   */
  async getLienWaiverSummary(userId: string): Promise<LienWaiverSummary> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)
      if (subcontractorIds.length === 0) {
        return {
          pending_count: 0,
          awaiting_signature_count: 0,
          signed_count: 0,
          approved_count: 0,
          total_waived_amount: 0,
          overdue_count: 0,
        }
      }

      const { data: waivers, error } = await db
        .from('lien_waivers')
        .select('id, status, payment_amount, due_date')
        .in('subcontractor_id', subcontractorIds)
        .is('deleted_at', null)

      if (error) {throw error}

      const today = new Date().toISOString().split('T')[0]

      const summary: LienWaiverSummary = {
        pending_count: 0,
        awaiting_signature_count: 0,
        signed_count: 0,
        approved_count: 0,
        total_waived_amount: 0,
        overdue_count: 0,
      }

      for (const waiver of (waivers || [])) {
        if (waiver.status === 'pending') {
          summary.pending_count++
        }
        if (waiver.status === 'sent') {
          summary.awaiting_signature_count++
        }
        if (waiver.status === 'received' || waiver.status === 'under_review') {
          summary.signed_count++
        }
        if (waiver.status === 'approved') {
          summary.approved_count++
          summary.total_waived_amount += waiver.payment_amount || 0
        }
        if (waiver.due_date && waiver.due_date < today &&
            ['pending', 'sent'].includes(waiver.status)) {
          summary.overdue_count++
        }
      }

      return summary
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch lien waiver summary:', error)
      return {
        pending_count: 0,
        awaiting_signature_count: 0,
        signed_count: 0,
        approved_count: 0,
        total_waived_amount: 0,
        overdue_count: 0,
      }
    }
  },

  /**
   * Sign a lien waiver
   */
  async signLienWaiver(
    waiverId: string,
    userId: string,
    data: SignLienWaiverDTO
  ): Promise<SubcontractorLienWaiver> {
    try {
      // Verify the waiver belongs to this subcontractor
      const subcontractorIds = await getSubcontractorIdsForUser(userId)

      const { data: existing, error: fetchError } = await db
        .from('lien_waivers')
        .select('id, subcontractor_id, status')
        .eq('id', waiverId)
        .single()

      if (fetchError || !existing) {
        throw new ApiErrorClass({
          code: 'WAIVER_NOT_FOUND',
          message: 'Lien waiver not found',
        })
      }

      if (!subcontractorIds.includes(existing.subcontractor_id)) {
        throw new ApiErrorClass({
          code: 'UNAUTHORIZED',
          message: 'You are not authorized to sign this waiver',
        })
      }

      if (!['pending', 'sent'].includes(existing.status)) {
        throw new ApiErrorClass({
          code: 'INVALID_STATUS',
          message: 'This waiver cannot be signed in its current status',
        })
      }

      // Update the waiver with signature
      const { data: waiver, error } = await db
        .from('lien_waivers')
        .update({
          status: 'received',
          signed_by: data.signed_by_name,
          signed_by_title: data.signed_by_title,
          signature_url: data.signature_url,
          signed_at: new Date().toISOString(),
          received_at: new Date().toISOString(),
          notary_name: data.notary_name,
          notary_date: data.notary_date,
        })
        .eq('id', waiverId)
        .select(`
          *,
          project:projects(id, name),
          payment_application:payment_applications(id, application_number)
        `)
        .single()

      if (error) {throw error}

      // Log to history
      await db.from('lien_waiver_history').insert({
        lien_waiver_id: waiverId,
        action: 'signed',
        notes: `Signed by ${data.signed_by_name} (${data.signed_by_title})`,
        changed_by: userId,
      })

      return {
        id: waiver.id,
        waiver_number: waiver.waiver_number,
        waiver_type: waiver.waiver_type,
        status: waiver.status,
        payment_application_id: waiver.payment_application_id,
        payment_application_number: waiver.payment_application?.application_number || null,
        payment_amount: waiver.payment_amount || 0,
        through_date: waiver.through_date,
        due_date: waiver.due_date,
        sent_at: waiver.sent_at,
        received_at: waiver.received_at,
        signed_at: waiver.signed_at,
        project_id: waiver.project_id,
        project_name: waiver.project?.name || 'Unknown Project',
        subcontractor_id: waiver.subcontractor_id,
        signed_by_name: waiver.signed_by,
        signed_by_title: waiver.signed_by_title,
        signature_url: waiver.signature_url,
        document_url: waiver.document_url,
        notes: waiver.notes,
        rejection_reason: waiver.rejection_reason,
        created_at: waiver.created_at,
        updated_at: waiver.updated_at,
      }
    } catch (error) {
      if (error instanceof ApiErrorClass) {throw error}
      logger.error('[SubcontractorPortal] Failed to sign lien waiver:', error)
      throw new ApiErrorClass({
        code: 'SIGN_WAIVER_ERROR',
        message: 'Failed to sign lien waiver',
      })
    }
  },

  // =============================================
  // RETAINAGE TRACKING (SUBCONTRACTOR PORTAL)
  // =============================================

  /**
   * Get retainage info for all subcontractor's contracts
   */
  async getRetainageInfo(userId: string): Promise<SubcontractorRetainageInfo[]> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)
      if (subcontractorIds.length === 0) {return []}

      // Query subcontracts with retainage info
      const { data, error } = await db
        .from('subcontracts')
        .select(`
          id,
          contract_number,
          project_id,
          subcontractor_id,
          original_value,
          current_value,
          retention_percent,
          retention_held,
          retention_released,
          total_billed,
          total_paid,
          status,
          substantial_completion_date,
          final_completion_date,
          warranty_expiration_date,
          created_at,
          updated_at,
          project:projects(id, name)
        `)
        .in('subcontractor_id', subcontractorIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {throw error}

      // Get pending lien waiver counts for each subcontract
      const subcontractIds = (data || []).map((s: any) => s.id)
      const lienWaiverCounts: Record<string, number> = {}

      if (subcontractIds.length > 0) {
        const { data: waivers } = await db
          .from('lien_waivers')
          .select('subcontract_id')
          .in('subcontract_id', subcontractIds)
          .in('status', ['pending', 'sent'])
          .is('deleted_at', null)

        for (const waiver of (waivers || [])) {
          if (waiver.subcontract_id) {
            lienWaiverCounts[waiver.subcontract_id] = (lienWaiverCounts[waiver.subcontract_id] || 0) + 1
          }
        }
      }

      return (data || []).map((contract: any) => {
        const currentValue = contract.current_value || contract.original_value || 0
        const totalBilled = contract.total_billed || 0
        const percentComplete = currentValue > 0 ? (totalBilled / currentValue) * 100 : 0

        return {
          id: contract.id,
          contract_number: contract.contract_number || 'N/A',
          project_id: contract.project_id,
          project_name: contract.project?.name || 'Unknown Project',
          original_contract_value: contract.original_value || 0,
          current_contract_value: currentValue,
          approved_change_orders: (contract.current_value || 0) - (contract.original_value || 0),
          total_billed: totalBilled,
          total_paid: contract.total_paid || 0,
          percent_complete: Math.round(percentComplete * 10) / 10,
          retention_percent: contract.retention_percent || 10,
          retention_held: contract.retention_held || 0,
          retention_released: contract.retention_released || 0,
          retention_balance: (contract.retention_held || 0) - (contract.retention_released || 0),
          substantial_completion_date: contract.substantial_completion_date,
          final_completion_date: contract.final_completion_date,
          warranty_expiration_date: contract.warranty_expiration_date,
          pending_lien_waivers: lienWaiverCounts[contract.id] || 0,
          status: contract.status || 'active',
          created_at: contract.created_at,
          updated_at: contract.updated_at,
        }
      })
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch retainage info:', error)
      throw new ApiErrorClass({
        code: 'RETAINAGE_ERROR',
        message: 'Failed to fetch retainage information',
      })
    }
  },

  /**
   * Get retainage releases for a specific contract
   */
  async getRetainageReleases(
    userId: string,
    subcontractId: string
  ): Promise<RetainageRelease[]> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)
      if (subcontractorIds.length === 0) {return []}

      // Verify the subcontract belongs to this subcontractor
      const { data: contract, error: contractError } = await db
        .from('subcontracts')
        .select('id, subcontractor_id')
        .eq('id', subcontractId)
        .single()

      if (contractError || !contract) {
        throw new ApiErrorClass({
          code: 'CONTRACT_NOT_FOUND',
          message: 'Subcontract not found',
        })
      }

      if (!subcontractorIds.includes(contract.subcontractor_id)) {
        throw new ApiErrorClass({
          code: 'UNAUTHORIZED',
          message: 'You are not authorized to view this contract',
        })
      }

      const { data, error } = await db
        .from('retainage_releases')
        .select(`
          id,
          subcontract_id,
          release_type,
          amount,
          release_date,
          approved_by,
          notes,
          lien_waiver_required,
          lien_waiver_received,
          lien_waiver_id,
          status,
          created_at,
          approved_by_user:users!approved_by(full_name)
        `)
        .eq('subcontract_id', subcontractId)
        .order('release_date', { ascending: false })

      if (error) {throw error}

      return (data || []).map((release: any) => ({
        id: release.id,
        subcontract_id: release.subcontract_id,
        release_type: release.release_type,
        amount: release.amount || 0,
        release_date: release.release_date,
        approved_by: release.approved_by,
        approved_by_name: release.approved_by_user?.full_name || null,
        notes: release.notes,
        lien_waiver_required: release.lien_waiver_required ?? true,
        lien_waiver_received: release.lien_waiver_received ?? false,
        lien_waiver_id: release.lien_waiver_id,
        status: release.status || 'pending',
        created_at: release.created_at,
      }))
    } catch (error) {
      if (error instanceof ApiErrorClass) {throw error}
      logger.error('[SubcontractorPortal] Failed to fetch retainage releases:', error)
      throw new ApiErrorClass({
        code: 'RELEASES_ERROR',
        message: 'Failed to fetch retainage releases',
      })
    }
  },

  /**
   * Get retainage summary for dashboard
   */
  async getRetainageSummary(userId: string): Promise<RetainageSummary> {
    try {
      const retainageInfo = await this.getRetainageInfo(userId)

      const summary: RetainageSummary = {
        total_contracts: retainageInfo.length,
        total_retention_held: 0,
        total_retention_released: 0,
        total_retention_balance: 0,
        pending_releases: 0,
        contracts_at_substantial: 0,
        contracts_at_final: 0,
      }

      for (const contract of retainageInfo) {
        summary.total_retention_held += contract.retention_held
        summary.total_retention_released += contract.retention_released
        summary.total_retention_balance += contract.retention_balance

        if (contract.status === 'substantial_completion') {
          summary.contracts_at_substantial++
        }
        if (contract.status === 'final_completion') {
          summary.contracts_at_final++
        }
        if (contract.pending_lien_waivers > 0) {
          summary.pending_releases++
        }
      }

      return summary
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch retainage summary:', error)
      return {
        total_contracts: 0,
        total_retention_held: 0,
        total_retention_released: 0,
        total_retention_balance: 0,
        pending_releases: 0,
        contracts_at_substantial: 0,
        contracts_at_final: 0,
      }
    }
  },

  // =============================================
  // INSURANCE ENDORSEMENT VERIFICATION (P0-3)
  // =============================================

  /**
   * Get insurance certificates with endorsement status for subcontractor
   */
  async getInsuranceCertificates(
    userId: string
  ): Promise<SubcontractorInsuranceCertificate[]> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)
      if (subcontractorIds.length === 0) {return []}

      const { data, error } = await db
        .from('insurance_certificates')
        .select(`
          id,
          certificate_number,
          insurance_type,
          carrier_name,
          policy_number,
          effective_date,
          expiration_date,
          status,
          each_occurrence_limit,
          general_aggregate_limit,
          products_completed_ops_limit,
          combined_single_limit,
          umbrella_each_occurrence,
          umbrella_aggregate,
          workers_comp_el_each_accident,
          additional_insured_required,
          additional_insured_verified,
          additional_insured_name,
          waiver_of_subrogation_required,
          waiver_of_subrogation_verified,
          primary_noncontributory_required,
          primary_noncontributory_verified,
          project_id,
          certificate_url,
          created_at,
          updated_at,
          project:projects(id, name)
        `)
        .in('subcontractor_id', subcontractorIds)
        .is('deleted_at', null)
        .neq('status', 'void')
        .order('expiration_date', { ascending: true })

      if (error) {throw error}

      return (data || []).map((cert: any) => {
        const endorsements: EndorsementRequirement[] = [
          {
            type: 'additional_insured',
            required: cert.additional_insured_required ?? false,
            verified: cert.additional_insured_verified ?? false,
            status: getEndorsementStatus(cert.additional_insured_required, cert.additional_insured_verified),
            additional_insured_name: cert.additional_insured_name,
          },
          {
            type: 'waiver_of_subrogation',
            required: cert.waiver_of_subrogation_required ?? false,
            verified: cert.waiver_of_subrogation_verified ?? false,
            status: getEndorsementStatus(cert.waiver_of_subrogation_required, cert.waiver_of_subrogation_verified),
          },
          {
            type: 'primary_noncontributory',
            required: cert.primary_noncontributory_required ?? false,
            verified: cert.primary_noncontributory_verified ?? false,
            status: getEndorsementStatus(cert.primary_noncontributory_required, cert.primary_noncontributory_verified),
          },
        ]

        const missingEndorsements = endorsements
          .filter((e) => e.status === 'missing')
          .map((e) => getEndorsementLabel(e.type))

        return {
          id: cert.id,
          certificate_number: cert.certificate_number,
          insurance_type: cert.insurance_type,
          carrier_name: cert.carrier_name || 'Unknown Carrier',
          policy_number: cert.policy_number || 'N/A',
          effective_date: cert.effective_date,
          expiration_date: cert.expiration_date,
          status: cert.status,
          each_occurrence_limit: cert.each_occurrence_limit,
          general_aggregate_limit: cert.general_aggregate_limit,
          products_completed_ops_limit: cert.products_completed_ops_limit,
          combined_single_limit: cert.combined_single_limit,
          umbrella_each_occurrence: cert.umbrella_each_occurrence,
          umbrella_aggregate: cert.umbrella_aggregate,
          workers_comp_el_each_accident: cert.workers_comp_el_each_accident,
          endorsements,
          has_all_required_endorsements: missingEndorsements.length === 0,
          missing_endorsements: missingEndorsements,
          project_id: cert.project_id,
          project_name: cert.project?.name || null,
          certificate_url: cert.certificate_url,
          created_at: cert.created_at,
          updated_at: cert.updated_at,
        }
      })
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch insurance certificates:', error)
      throw new ApiErrorClass({
        code: 'INSURANCE_CERTIFICATES_ERROR',
        message: 'Failed to fetch insurance certificates',
      })
    }
  },

  /**
   * Get project insurance requirements for subcontractor
   */
  async getInsuranceRequirements(userId: string): Promise<SubcontractorInsuranceRequirement[]> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)
      if (subcontractorIds.length === 0) {return []}

      // Get projects the subcontractor has access to
      const { data: accessData } = await db
        .from('subcontractor_portal_access')
        .select('project_id')
        .in('subcontractor_id', subcontractorIds)
        .eq('is_active', true)

      const projectIds = (accessData || []).map((a: any) => a.project_id)
      if (projectIds.length === 0) {return []}

      // Get project insurance requirements
      const { data, error } = await db
        .from('project_insurance_requirements')
        .select(`
          id,
          project_id,
          insurance_type,
          is_required,
          min_each_occurrence,
          min_aggregate,
          min_umbrella,
          additional_insured_required,
          waiver_of_subrogation_required,
          primary_noncontributory_required,
          notes,
          project:projects(id, name)
        `)
        .in('project_id', projectIds)
        .eq('is_required', true)

      if (error) {throw error}

      // Get subcontractor's certificates to check compliance
      const certificates = await this.getInsuranceCertificates(userId)

      return (data || []).map((req: any) => {
        // Find matching certificate
        const matchingCert = certificates.find((cert) =>
          cert.insurance_type === req.insurance_type &&
          cert.status === 'active' &&
          (!req.project_id || cert.project_id === req.project_id || cert.project_id === null)
        )

        let isCompliant = !!matchingCert
        let complianceGap: string | null = null

        if (!matchingCert) {
          complianceGap = `Missing ${getInsuranceTypeLabel(req.insurance_type)} certificate`
        } else {
          // Check coverage amounts
          if (req.min_each_occurrence && (matchingCert.each_occurrence_limit || 0) < req.min_each_occurrence) {
            isCompliant = false
            complianceGap = `Each occurrence limit ($${(matchingCert.each_occurrence_limit || 0).toLocaleString()}) below minimum ($${req.min_each_occurrence.toLocaleString()})`
          }

          // Check endorsements
          if (isCompliant) {
            const missingEndorsements: string[] = []
            if (req.additional_insured_required) {
              const aiEndorsement = matchingCert.endorsements.find((e) => e.type === 'additional_insured')
              if (!aiEndorsement?.verified) {missingEndorsements.push('Additional Insured')}
            }
            if (req.waiver_of_subrogation_required) {
              const wosEndorsement = matchingCert.endorsements.find((e) => e.type === 'waiver_of_subrogation')
              if (!wosEndorsement?.verified) {missingEndorsements.push('Waiver of Subrogation')}
            }
            if (req.primary_noncontributory_required) {
              const pncEndorsement = matchingCert.endorsements.find((e) => e.type === 'primary_noncontributory')
              if (!pncEndorsement?.verified) {missingEndorsements.push('Primary & Non-Contributory')}
            }

            if (missingEndorsements.length > 0) {
              isCompliant = false
              complianceGap = `Missing endorsements: ${missingEndorsements.join(', ')}`
            }
          }
        }

        return {
          id: req.id,
          project_id: req.project_id,
          project_name: req.project?.name || 'Unknown Project',
          insurance_type: req.insurance_type,
          min_each_occurrence: req.min_each_occurrence,
          min_general_aggregate: req.min_aggregate,
          min_umbrella: req.min_umbrella,
          additional_insured_required: req.additional_insured_required ?? false,
          waiver_of_subrogation_required: req.waiver_of_subrogation_required ?? false,
          primary_noncontributory_required: req.primary_noncontributory_required ?? false,
          is_compliant: isCompliant,
          compliance_gap: complianceGap,
          matching_certificate_id: matchingCert?.id || null,
        }
      })
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch insurance requirements:', error)
      throw new ApiErrorClass({
        code: 'INSURANCE_REQUIREMENTS_ERROR',
        message: 'Failed to fetch insurance requirements',
      })
    }
  },

  /**
   * Get insurance compliance summary for subcontractor dashboard
   */
  async getInsuranceComplianceSummary(userId: string): Promise<SubcontractorInsuranceComplianceSummary> {
    try {
      const certificates = await this.getInsuranceCertificates(userId)
      const requirements = await this.getInsuranceRequirements(userId)

      const today = new Date()
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(today.getDate() + 30)

      // Count certificate statuses
      const activeCerts = certificates.filter((c) => c.status === 'active')
      const expiringSoon = certificates.filter((c) => {
        const expDate = new Date(c.expiration_date)
        return expDate > today && expDate <= thirtyDaysFromNow
      })
      const expired = certificates.filter((c) => new Date(c.expiration_date) < today)

      // Calculate endorsement summary
      const endorsementSummary = {
        additional_insured: { required_count: 0, verified_count: 0, missing_count: 0 },
        waiver_of_subrogation: { required_count: 0, verified_count: 0, missing_count: 0 },
        primary_noncontributory: { required_count: 0, verified_count: 0, missing_count: 0 },
      }

      for (const cert of certificates) {
        for (const endorsement of cert.endorsements) {
          const summary = endorsementSummary[endorsement.type]
          if (endorsement.required) {
            summary.required_count++
            if (endorsement.verified) {
              summary.verified_count++
            } else {
              summary.missing_count++
            }
          }
        }
      }

      // Find gaps
      const nonCompliantReqs = requirements.filter((r) => !r.is_compliant)
      const missingInsuranceTypes = [...new Set(
        nonCompliantReqs
          .filter((r) => r.compliance_gap?.includes('Missing'))
          .map((r) => r.insurance_type)
      )] as InsuranceType[]

      const insufficientCoverage = nonCompliantReqs
        .filter((r) => r.compliance_gap?.includes('limit') || r.compliance_gap?.includes('below'))
        .map((r) => ({
          insurance_type: r.insurance_type,
          required_amount: r.min_each_occurrence || 0,
          current_amount: 0, // Would need to look up from matching cert
          gap_description: r.compliance_gap || '',
        }))

      const missingEndorsementCerts = certificates
        .filter((c) => !c.has_all_required_endorsements)
        .map((c) => ({
          certificate_id: c.id,
          insurance_type: c.insurance_type,
          missing_endorsements: c.missing_endorsements,
        }))

      // Calculate compliance score
      const totalRequirements = requirements.length
      const compliantRequirements = requirements.filter((r) => r.is_compliant).length
      const complianceScore = totalRequirements > 0
        ? Math.round((compliantRequirements / totalRequirements) * 100)
        : 100

      // Check for payment hold (query compliance status table)
      let paymentHoldActive = false
      let paymentHoldReason: string | null = null

      const subcontractorIds = await getSubcontractorIdsForUser(userId)
      if (subcontractorIds.length > 0) {
        const { data: complianceStatus } = await db
          .from('subcontractor_compliance_status')
          .select('payment_hold, hold_reason')
          .in('subcontractor_id', subcontractorIds)
          .eq('payment_hold', true)
          .limit(1)
          .single()

        if (complianceStatus) {
          paymentHoldActive = complianceStatus.payment_hold
          paymentHoldReason = complianceStatus.hold_reason
        }
      }

      return {
        is_fully_compliant: complianceScore === 100 && missingEndorsementCerts.length === 0,
        compliance_score: complianceScore,
        total_certificates: certificates.length,
        active_certificates: activeCerts.length,
        expiring_soon_count: expiringSoon.length,
        expired_count: expired.length,
        endorsement_summary: endorsementSummary,
        missing_insurance_types: missingInsuranceTypes,
        insufficient_coverage: insufficientCoverage,
        missing_endorsement_certificates: missingEndorsementCerts,
        payment_hold_active: paymentHoldActive,
        payment_hold_reason: paymentHoldReason,
      }
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch insurance compliance summary:', error)
      return {
        is_fully_compliant: false,
        compliance_score: 0,
        total_certificates: 0,
        active_certificates: 0,
        expiring_soon_count: 0,
        expired_count: 0,
        endorsement_summary: {
          additional_insured: { required_count: 0, verified_count: 0, missing_count: 0 },
          waiver_of_subrogation: { required_count: 0, verified_count: 0, missing_count: 0 },
          primary_noncontributory: { required_count: 0, verified_count: 0, missing_count: 0 },
        },
        missing_insurance_types: [],
        insufficient_coverage: [],
        missing_endorsement_certificates: [],
        payment_hold_active: false,
        payment_hold_reason: null,
      }
    }
  },

  // =============================================
  // PAY APPLICATION LINE ITEMS (P1)
  // =============================================

  /**
   * Get all pay applications for the subcontractor with line items
   */
  async getPayApplications(userId: string): Promise<SubcontractorPayApplication[]> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)
      if (subcontractorIds.length === 0) {
        return []
      }

      // Get pay applications where the subcontractor is the applicant
      const { data: applications, error } = await db
        .from('payment_applications')
        .select(`
          id,
          application_number,
          period_to,
          project_id,
          original_contract_sum,
          net_change_orders,
          contract_sum_to_date,
          total_completed_previous,
          total_completed_this_period,
          total_materials_stored,
          total_completed_and_stored,
          retainage_percent,
          retainage_from_completed,
          retainage_from_stored,
          total_retainage,
          retainage_release,
          total_earned_less_retainage,
          less_previous_certificates,
          current_payment_due,
          balance_to_finish,
          percent_complete,
          status,
          submitted_at,
          approved_at,
          paid_at,
          payment_received_amount,
          payment_reference,
          rejection_reason,
          created_at,
          updated_at,
          projects:project_id (
            name,
            address
          )
        `)
        .in('subcontractor_id', subcontractorIds)
        .is('deleted_at', null)
        .order('period_to', { ascending: false })

      if (error) {
        logger.error('[SubcontractorPortal] Failed to fetch pay applications:', error)
        throw new ApiErrorClass('Failed to fetch pay applications', 500)
      }

      // Fetch line items for all applications
      const applicationIds = (applications || []).map((app: any) => app.id)
      let lineItemsMap: Record<string, SubcontractorPayAppLineItem[]> = {}

      if (applicationIds.length > 0) {
        const { data: lineItems, error: lineItemsError } = await db
          .from('schedule_of_values')
          .select(`
            id,
            payment_application_id,
            item_number,
            description,
            cost_code,
            cost_code_id,
            scheduled_value,
            change_order_adjustments,
            total_scheduled_value,
            work_completed_previous,
            work_completed_this_period,
            materials_stored,
            total_completed_stored,
            percent_complete,
            balance_to_finish,
            retainage_percent,
            retainage_amount,
            sort_order,
            notes
          `)
          .in('payment_application_id', applicationIds)
          .order('sort_order', { ascending: true })

        if (lineItemsError) {
          logger.error('[SubcontractorPortal] Failed to fetch SOV items:', lineItemsError)
        } else {
          // Group line items by application
          (lineItems || []).forEach((item: any) => {
            if (!lineItemsMap[item.payment_application_id]) {
              lineItemsMap[item.payment_application_id] = []
            }
            lineItemsMap[item.payment_application_id].push({
              id: item.id,
              item_number: item.item_number || '',
              description: item.description || '',
              cost_code: item.cost_code,
              cost_code_id: item.cost_code_id,
              scheduled_value: Number(item.scheduled_value) || 0,
              change_order_adjustments: Number(item.change_order_adjustments) || 0,
              total_scheduled_value: Number(item.total_scheduled_value) || 0,
              work_completed_previous: Number(item.work_completed_previous) || 0,
              work_completed_this_period: Number(item.work_completed_this_period) || 0,
              materials_stored: Number(item.materials_stored) || 0,
              total_completed_stored: Number(item.total_completed_stored) || 0,
              percent_complete: Number(item.percent_complete) || 0,
              balance_to_finish: Number(item.balance_to_finish) || 0,
              retainage_percent: item.retainage_percent != null ? Number(item.retainage_percent) : null,
              retainage_amount: Number(item.retainage_amount) || 0,
              sort_order: item.sort_order || 0,
              notes: item.notes,
            })
          })
        }
      }

      return (applications || []).map((app: any) => ({
        id: app.id,
        application_number: app.application_number,
        period_to: app.period_to,
        project_id: app.project_id,
        project_name: app.projects?.name || 'Unknown Project',
        project_address: app.projects?.address || null,
        original_contract_sum: Number(app.original_contract_sum) || 0,
        net_change_orders: Number(app.net_change_orders) || 0,
        contract_sum_to_date: Number(app.contract_sum_to_date) || 0,
        total_completed_previous: Number(app.total_completed_previous) || 0,
        total_completed_this_period: Number(app.total_completed_this_period) || 0,
        total_materials_stored: Number(app.total_materials_stored) || 0,
        total_completed_and_stored: Number(app.total_completed_and_stored) || 0,
        retainage_percent: Number(app.retainage_percent) || 0,
        retainage_from_completed: Number(app.retainage_from_completed) || 0,
        retainage_from_stored: Number(app.retainage_from_stored) || 0,
        total_retainage: Number(app.total_retainage) || 0,
        retainage_release: Number(app.retainage_release) || 0,
        total_earned_less_retainage: Number(app.total_earned_less_retainage) || 0,
        less_previous_certificates: Number(app.less_previous_certificates) || 0,
        current_payment_due: Number(app.current_payment_due) || 0,
        balance_to_finish: Number(app.balance_to_finish) || 0,
        percent_complete: Number(app.percent_complete) || 0,
        status: app.status,
        submitted_at: app.submitted_at,
        approved_at: app.approved_at,
        paid_at: app.paid_at,
        payment_received_amount: app.payment_received_amount != null ? Number(app.payment_received_amount) : null,
        payment_reference: app.payment_reference,
        rejection_reason: app.rejection_reason,
        line_items: lineItemsMap[app.id] || [],
        created_at: app.created_at,
        updated_at: app.updated_at,
      }))
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch pay applications:', error)
      return []
    }
  },

  /**
   * Get a single pay application by ID with line items
   */
  async getPayApplication(userId: string, applicationId: string): Promise<SubcontractorPayApplication | null> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)
      if (subcontractorIds.length === 0) {
        return null
      }

      const { data: app, error } = await db
        .from('payment_applications')
        .select(`
          id,
          application_number,
          period_to,
          project_id,
          original_contract_sum,
          net_change_orders,
          contract_sum_to_date,
          total_completed_previous,
          total_completed_this_period,
          total_materials_stored,
          total_completed_and_stored,
          retainage_percent,
          retainage_from_completed,
          retainage_from_stored,
          total_retainage,
          retainage_release,
          total_earned_less_retainage,
          less_previous_certificates,
          current_payment_due,
          balance_to_finish,
          percent_complete,
          status,
          submitted_at,
          approved_at,
          paid_at,
          payment_received_amount,
          payment_reference,
          rejection_reason,
          created_at,
          updated_at,
          projects:project_id (
            name,
            address
          )
        `)
        .eq('id', applicationId)
        .in('subcontractor_id', subcontractorIds)
        .is('deleted_at', null)
        .single()

      if (error || !app) {
        return null
      }

      // Fetch line items
      const { data: lineItems } = await db
        .from('schedule_of_values')
        .select(`
          id,
          item_number,
          description,
          cost_code,
          cost_code_id,
          scheduled_value,
          change_order_adjustments,
          total_scheduled_value,
          work_completed_previous,
          work_completed_this_period,
          materials_stored,
          total_completed_stored,
          percent_complete,
          balance_to_finish,
          retainage_percent,
          retainage_amount,
          sort_order,
          notes
        `)
        .eq('payment_application_id', applicationId)
        .order('sort_order', { ascending: true })

      return {
        id: app.id,
        application_number: app.application_number,
        period_to: app.period_to,
        project_id: app.project_id,
        project_name: app.projects?.name || 'Unknown Project',
        project_address: app.projects?.address || null,
        original_contract_sum: Number(app.original_contract_sum) || 0,
        net_change_orders: Number(app.net_change_orders) || 0,
        contract_sum_to_date: Number(app.contract_sum_to_date) || 0,
        total_completed_previous: Number(app.total_completed_previous) || 0,
        total_completed_this_period: Number(app.total_completed_this_period) || 0,
        total_materials_stored: Number(app.total_materials_stored) || 0,
        total_completed_and_stored: Number(app.total_completed_and_stored) || 0,
        retainage_percent: Number(app.retainage_percent) || 0,
        retainage_from_completed: Number(app.retainage_from_completed) || 0,
        retainage_from_stored: Number(app.retainage_from_stored) || 0,
        total_retainage: Number(app.total_retainage) || 0,
        retainage_release: Number(app.retainage_release) || 0,
        total_earned_less_retainage: Number(app.total_earned_less_retainage) || 0,
        less_previous_certificates: Number(app.less_previous_certificates) || 0,
        current_payment_due: Number(app.current_payment_due) || 0,
        balance_to_finish: Number(app.balance_to_finish) || 0,
        percent_complete: Number(app.percent_complete) || 0,
        status: app.status,
        submitted_at: app.submitted_at,
        approved_at: app.approved_at,
        paid_at: app.paid_at,
        payment_received_amount: app.payment_received_amount != null ? Number(app.payment_received_amount) : null,
        payment_reference: app.payment_reference,
        rejection_reason: app.rejection_reason,
        line_items: (lineItems || []).map((item: any) => ({
          id: item.id,
          item_number: item.item_number || '',
          description: item.description || '',
          cost_code: item.cost_code,
          cost_code_id: item.cost_code_id,
          scheduled_value: Number(item.scheduled_value) || 0,
          change_order_adjustments: Number(item.change_order_adjustments) || 0,
          total_scheduled_value: Number(item.total_scheduled_value) || 0,
          work_completed_previous: Number(item.work_completed_previous) || 0,
          work_completed_this_period: Number(item.work_completed_this_period) || 0,
          materials_stored: Number(item.materials_stored) || 0,
          total_completed_stored: Number(item.total_completed_stored) || 0,
          percent_complete: Number(item.percent_complete) || 0,
          balance_to_finish: Number(item.balance_to_finish) || 0,
          retainage_percent: item.retainage_percent != null ? Number(item.retainage_percent) : null,
          retainage_amount: Number(item.retainage_amount) || 0,
          sort_order: item.sort_order || 0,
          notes: item.notes,
        })),
        created_at: app.created_at,
        updated_at: app.updated_at,
      }
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch pay application:', error)
      return null
    }
  },

  /**
   * Get pay application summary for the subcontractor
   */
  async getPayApplicationSummary(userId: string): Promise<PayApplicationSummary> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)
      if (subcontractorIds.length === 0) {
        return {
          total_applications: 0,
          total_billed: 0,
          total_received: 0,
          total_outstanding: 0,
          total_retainage_held: 0,
          pending_approval_count: 0,
          pending_approval_amount: 0,
        }
      }

      const { data: applications, error } = await db
        .from('payment_applications')
        .select(`
          id,
          status,
          total_completed_and_stored,
          current_payment_due,
          total_retainage,
          payment_received_amount
        `)
        .in('subcontractor_id', subcontractorIds)
        .is('deleted_at', null)

      if (error) {
        logger.error('[SubcontractorPortal] Failed to fetch pay app summary:', error)
        throw new ApiErrorClass('Failed to fetch pay application summary', 500)
      }

      const apps = applications || []

      const totalBilled = apps.reduce((sum: number, app: any) =>
        sum + (Number(app.total_completed_and_stored) || 0), 0)

      const totalReceived = apps.reduce((sum: number, app: any) =>
        sum + (Number(app.payment_received_amount) || 0), 0)

      const totalRetainage = apps.reduce((sum: number, app: any) =>
        sum + (Number(app.total_retainage) || 0), 0)

      const pendingApps = apps.filter((app: any) =>
        ['submitted', 'under_review'].includes(app.status))

      const pendingAmount = pendingApps.reduce((sum: number, app: any) =>
        sum + (Number(app.current_payment_due) || 0), 0)

      return {
        total_applications: apps.length,
        total_billed: totalBilled,
        total_received: totalReceived,
        total_outstanding: totalBilled - totalReceived - totalRetainage,
        total_retainage_held: totalRetainage,
        pending_approval_count: pendingApps.length,
        pending_approval_amount: pendingAmount,
      }
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch pay application summary:', error)
      return {
        total_applications: 0,
        total_billed: 0,
        total_received: 0,
        total_outstanding: 0,
        total_retainage_held: 0,
        pending_approval_count: 0,
        pending_approval_amount: 0,
      }
    }
  },

  // =============================================
  // CHANGE ORDER IMPACT DISPLAY (P1-2)
  // =============================================

  /**
   * Get all change orders impacting the subcontractor
   */
  async getChangeOrders(userId: string): Promise<SubcontractorChangeOrder[]> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)
      if (subcontractorIds.length === 0) {
        return []
      }

      // Get change orders where the subcontractor is linked
      const { data: changeOrders, error } = await db
        .from('change_orders')
        .select(`
          id,
          pco_number,
          co_number,
          is_pco,
          title,
          description,
          change_type,
          status,
          project_id,
          proposed_amount,
          approved_amount,
          proposed_days,
          approved_days,
          original_contract_amount,
          previous_changes_amount,
          revised_contract_amount,
          created_at,
          submitted_at,
          internally_approved_at,
          owner_approved_at,
          justification,
          owner_comments,
          rejection_reason,
          related_rfi_id,
          related_submittal_id,
          projects:project_id (
            name
          )
        `)
        .in('subcontractor_id', subcontractorIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {
        logger.error('[SubcontractorPortal] Failed to fetch change orders:', error)
        throw new ApiErrorClass('Failed to fetch change orders', 500)
      }

      // Get line item counts
      const coIds = (changeOrders || []).map((co: any) => co.id)
      let itemCountMap: Record<string, number> = {}

      if (coIds.length > 0) {
        const { data: itemCounts } = await db
          .from('change_order_items')
          .select('change_order_id')
          .in('change_order_id', coIds)

        if (itemCounts) {
          itemCounts.forEach((item: any) => {
            itemCountMap[item.change_order_id] = (itemCountMap[item.change_order_id] || 0) + 1
          })
        }
      }

      // Get related RFI/Submittal numbers
      const rfiIds = (changeOrders || []).filter((co: any) => co.related_rfi_id).map((co: any) => co.related_rfi_id)
      const submittalIds = (changeOrders || []).filter((co: any) => co.related_submittal_id).map((co: any) => co.related_submittal_id)

      let rfiNumberMap: Record<string, string> = {}
      let submittalNumberMap: Record<string, string> = {}

      if (rfiIds.length > 0) {
        const { data: rfis } = await db
          .from('rfis')
          .select('id, rfi_number')
          .in('id', rfiIds)
        if (rfis) {
          rfis.forEach((rfi: any) => {
            rfiNumberMap[rfi.id] = rfi.rfi_number
          })
        }
      }

      if (submittalIds.length > 0) {
        const { data: submittals } = await db
          .from('submittals')
          .select('id, submittal_number')
          .in('id', submittalIds)
        if (submittals) {
          submittals.forEach((s: any) => {
            submittalNumberMap[s.id] = s.submittal_number
          })
        }
      }

      return (changeOrders || []).map((co: any) => ({
        id: co.id,
        pco_number: co.pco_number,
        co_number: co.co_number,
        is_pco: co.is_pco,
        title: co.title || '',
        description: co.description,
        change_type: co.change_type,
        status: co.status,
        project_id: co.project_id,
        project_name: co.projects?.name || 'Unknown Project',
        proposed_amount: Number(co.proposed_amount) || 0,
        approved_amount: co.approved_amount != null ? Number(co.approved_amount) : null,
        proposed_days: co.proposed_days,
        approved_days: co.approved_days,
        original_contract_amount: co.original_contract_amount != null ? Number(co.original_contract_amount) : null,
        previous_changes_amount: co.previous_changes_amount != null ? Number(co.previous_changes_amount) : null,
        revised_contract_amount: co.revised_contract_amount != null ? Number(co.revised_contract_amount) : null,
        created_at: co.created_at,
        submitted_at: co.submitted_at,
        internally_approved_at: co.internally_approved_at,
        owner_approved_at: co.owner_approved_at,
        line_item_count: itemCountMap[co.id] || 0,
        related_rfi_number: co.related_rfi_id ? rfiNumberMap[co.related_rfi_id] || null : null,
        related_submittal_number: co.related_submittal_id ? submittalNumberMap[co.related_submittal_id] || null : null,
        justification: co.justification,
        owner_comments: co.owner_comments,
        rejection_reason: co.rejection_reason,
      }))
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch change orders:', error)
      return []
    }
  },

  /**
   * Get change order line items
   */
  async getChangeOrderItems(userId: string, changeOrderId: string): Promise<SubcontractorChangeOrderItem[]> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)
      if (subcontractorIds.length === 0) {
        return []
      }

      // Verify the change order belongs to the subcontractor
      const { data: co } = await db
        .from('change_orders')
        .select('id')
        .eq('id', changeOrderId)
        .in('subcontractor_id', subcontractorIds)
        .single()

      if (!co) {
        return []
      }

      const { data: items, error } = await db
        .from('change_order_items')
        .select(`
          id,
          item_number,
          description,
          cost_code,
          quantity,
          unit,
          unit_price,
          labor_amount,
          material_amount,
          equipment_amount,
          subcontract_amount,
          other_amount,
          markup_percent,
          markup_amount,
          total_amount,
          notes
        `)
        .eq('change_order_id', changeOrderId)
        .order('item_number', { ascending: true })

      if (error) {
        logger.error('[SubcontractorPortal] Failed to fetch change order items:', error)
        return []
      }

      return (items || []).map((item: any) => ({
        id: item.id,
        item_number: item.item_number || 0,
        description: item.description || '',
        cost_code: item.cost_code,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        labor_amount: Number(item.labor_amount) || 0,
        material_amount: Number(item.material_amount) || 0,
        equipment_amount: Number(item.equipment_amount) || 0,
        subcontract_amount: Number(item.subcontract_amount) || 0,
        other_amount: Number(item.other_amount) || 0,
        markup_percent: item.markup_percent,
        markup_amount: Number(item.markup_amount) || 0,
        total_amount: Number(item.total_amount) || 0,
        notes: item.notes,
      }))
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch change order items:', error)
      return []
    }
  },

  /**
   * Get change order summary for the subcontractor
   */
  async getChangeOrderSummary(userId: string): Promise<ChangeOrderSummary> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)
      if (subcontractorIds.length === 0) {
        return {
          total_count: 0,
          pending_count: 0,
          approved_count: 0,
          rejected_count: 0,
          total_proposed_amount: 0,
          total_approved_amount: 0,
          net_contract_impact: 0,
          total_days_impact: 0,
        }
      }

      const { data: changeOrders, error } = await db
        .from('change_orders')
        .select(`
          id,
          status,
          proposed_amount,
          approved_amount,
          approved_days
        `)
        .in('subcontractor_id', subcontractorIds)
        .is('deleted_at', null)

      if (error) {
        logger.error('[SubcontractorPortal] Failed to fetch change order summary:', error)
        throw new ApiErrorClass('Failed to fetch change order summary', 500)
      }

      const orders = changeOrders || []
      const pendingStatuses = ['pending_estimate', 'estimate_complete', 'pending_internal_approval', 'internally_approved', 'pending_owner_review']

      const pendingOrders = orders.filter((co: any) => pendingStatuses.includes(co.status))
      const approvedOrders = orders.filter((co: any) => co.status === 'approved')
      const rejectedOrders = orders.filter((co: any) => ['rejected', 'void'].includes(co.status))

      const totalProposed = orders.reduce((sum: number, co: any) =>
        sum + (Number(co.proposed_amount) || 0), 0)

      const totalApproved = approvedOrders.reduce((sum: number, co: any) =>
        sum + (Number(co.approved_amount) || 0), 0)

      const totalDays = approvedOrders.reduce((sum: number, co: any) =>
        sum + (co.approved_days || 0), 0)

      return {
        total_count: orders.length,
        pending_count: pendingOrders.length,
        approved_count: approvedOrders.length,
        rejected_count: rejectedOrders.length,
        total_proposed_amount: totalProposed,
        total_approved_amount: totalApproved,
        net_contract_impact: totalApproved,
        total_days_impact: totalDays,
      }
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch change order summary:', error)
      return {
        total_count: 0,
        pending_count: 0,
        approved_count: 0,
        rejected_count: 0,
        total_proposed_amount: 0,
        total_approved_amount: 0,
        net_contract_impact: 0,
        total_days_impact: 0,
      }
    }
  },

  // =============================================
  // SCHEDULE NOTIFICATIONS (P1-3)
  // =============================================

  /**
   * Get schedule activities assigned to the subcontractor
   */
  async getScheduleActivities(userId: string): Promise<SubcontractorScheduleActivity[]> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)
      if (subcontractorIds.length === 0) {
        return []
      }

      const today = new Date()
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

      // Get schedule activities where the subcontractor is assigned
      const { data: activities, error } = await db
        .from('schedule_activities')
        .select(`
          id,
          activity_id,
          activity_name,
          wbs_code,
          project_id,
          planned_start,
          planned_finish,
          actual_start,
          actual_finish,
          baseline_start,
          baseline_finish,
          status,
          percent_complete,
          is_milestone,
          is_critical,
          is_on_critical_path,
          responsible_party,
          notes,
          created_at,
          updated_at,
          projects:project_id (
            name
          )
        `)
        .in('subcontractor_id', subcontractorIds)
        .is('deleted_at', null)
        .order('planned_start', { ascending: true })

      if (error) {
        logger.error('[SubcontractorPortal] Failed to fetch schedule activities:', error)
        throw new ApiErrorClass('Failed to fetch schedule activities', 500)
      }

      return (activities || []).map((activity: any) => {
        const plannedFinish = activity.planned_finish ? new Date(activity.planned_finish) : null
        const baselineFinish = activity.baseline_finish ? new Date(activity.baseline_finish) : null
        const plannedStart = activity.planned_start ? new Date(activity.planned_start) : null
        const baselineStart = activity.baseline_start ? new Date(activity.baseline_start) : null

        // Calculate variances in days
        let startVariance: number | null = null
        let finishVariance: number | null = null

        if (plannedStart && baselineStart) {
          startVariance = Math.round((plannedStart.getTime() - baselineStart.getTime()) / (1000 * 60 * 60 * 24))
        }
        if (plannedFinish && baselineFinish) {
          finishVariance = Math.round((plannedFinish.getTime() - baselineFinish.getTime()) / (1000 * 60 * 60 * 24))
        }

        // Determine if overdue or upcoming
        const isOverdue = plannedFinish && plannedFinish < today && activity.status !== 'completed'
        const isUpcoming = plannedStart && plannedStart >= today && plannedStart <= weekFromNow

        return {
          id: activity.id,
          activity_id: activity.activity_id,
          activity_name: activity.activity_name || '',
          wbs_code: activity.wbs_code,
          project_id: activity.project_id,
          project_name: activity.projects?.name || 'Unknown Project',
          planned_start: activity.planned_start,
          planned_finish: activity.planned_finish,
          actual_start: activity.actual_start,
          actual_finish: activity.actual_finish,
          baseline_start: activity.baseline_start,
          baseline_finish: activity.baseline_finish,
          status: activity.status || 'not_started',
          percent_complete: Number(activity.percent_complete) || 0,
          start_variance: startVariance,
          finish_variance: finishVariance,
          is_milestone: activity.is_milestone || false,
          is_critical: activity.is_critical || false,
          is_on_critical_path: activity.is_on_critical_path || false,
          is_overdue: isOverdue,
          is_upcoming: isUpcoming,
          responsible_party: activity.responsible_party,
          notes: activity.notes,
          created_at: activity.created_at,
          updated_at: activity.updated_at,
        }
      })
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch schedule activities:', error)
      return []
    }
  },

  /**
   * Get schedule change notifications for the subcontractor
   */
  async getScheduleChangeNotifications(userId: string): Promise<ScheduleChangeNotification[]> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)
      if (subcontractorIds.length === 0) {
        return []
      }

      // Get notifications related to schedule activities for this subcontractor
      const { data: notifications, error } = await db
        .from('notifications')
        .select(`
          id,
          type,
          title,
          message,
          related_to_id,
          related_to_type,
          is_read,
          created_at,
          users:user_id (
            first_name,
            last_name
          )
        `)
        .eq('user_id', userId)
        .in('type', ['schedule_change', 'schedule_activity_updated', 'task_due', 'schedule_delay'])
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        logger.error('[SubcontractorPortal] Failed to fetch schedule notifications:', error)
        return []
      }

      // For each notification, get the related activity details
      const activityIds = (notifications || [])
        .filter((n: any) => n.related_to_id && n.related_to_type === 'schedule_activity')
        .map((n: any) => n.related_to_id)

      let activityMap: Record<string, any> = {}
      if (activityIds.length > 0) {
        const { data: activities } = await db
          .from('schedule_activities')
          .select('id, activity_name, project_id, is_on_critical_path, projects:project_id (name)')
          .in('id', activityIds)

        if (activities) {
          activities.forEach((a: any) => {
            activityMap[a.id] = a
          })
        }
      }

      return (notifications || []).map((n: any) => {
        const activity = activityMap[n.related_to_id] || {}

        // Parse change type from notification type or message
        let changeType: 'date_change' | 'status_change' | 'delay' | 'assignment' | 'completion' = 'date_change'
        if (n.type === 'schedule_delay') changeType = 'delay'
        else if (n.message?.toLowerCase().includes('status')) changeType = 'status_change'
        else if (n.message?.toLowerCase().includes('complete')) changeType = 'completion'
        else if (n.message?.toLowerCase().includes('assign')) changeType = 'assignment'

        return {
          id: n.id,
          activity_id: n.related_to_id || '',
          activity_name: activity.activity_name || n.title || 'Unknown Activity',
          project_id: activity.project_id || '',
          project_name: activity.projects?.name || '',
          change_type: changeType,
          field_changed: null,
          old_value: null,
          new_value: null,
          description: n.message || n.title || '',
          days_impact: null,
          is_critical_path_impact: activity.is_on_critical_path || false,
          changed_at: n.created_at,
          changed_by_name: n.users ? `${n.users.first_name || ''} ${n.users.last_name || ''}`.trim() : null,
          is_read: n.is_read || false,
        }
      })
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch schedule notifications:', error)
      return []
    }
  },

  /**
   * Get schedule summary for dashboard
   */
  async getScheduleSummary(userId: string): Promise<ScheduleSummary> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)
      if (subcontractorIds.length === 0) {
        return {
          total_activities: 0,
          activities_this_week: 0,
          overdue_count: 0,
          delayed_count: 0,
          on_critical_path_count: 0,
          upcoming_milestones: 0,
          percent_complete_avg: 0,
          unread_changes: 0,
        }
      }

      const today = new Date()
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
      const todayStr = today.toISOString().split('T')[0]
      const weekFromNowStr = weekFromNow.toISOString().split('T')[0]

      // Get all activities for summary calculations
      const { data: activities, error } = await db
        .from('schedule_activities')
        .select(`
          id,
          status,
          percent_complete,
          planned_start,
          planned_finish,
          is_milestone,
          is_on_critical_path
        `)
        .in('subcontractor_id', subcontractorIds)
        .is('deleted_at', null)

      if (error) {
        logger.error('[SubcontractorPortal] Failed to fetch schedule summary:', error)
        throw new ApiErrorClass('Failed to fetch schedule summary', 500)
      }

      // Get unread notification count
      const { count: unreadCount } = await db
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('type', ['schedule_change', 'schedule_activity_updated', 'schedule_delay'])
        .eq('is_read', false)

      const acts = activities || []

      // Calculate summary
      const overdueActs = acts.filter((a: any) => {
        if (a.status === 'completed') return false
        const plannedFinish = a.planned_finish ? new Date(a.planned_finish) : null
        return plannedFinish && plannedFinish < today
      })

      const delayedActs = acts.filter((a: any) => a.status === 'delayed')

      const thisWeekActs = acts.filter((a: any) => {
        const plannedStart = a.planned_start ? new Date(a.planned_start) : null
        return plannedStart && plannedStart >= today && plannedStart <= weekFromNow
      })

      const criticalPathActs = acts.filter((a: any) => a.is_on_critical_path)

      const upcomingMilestones = acts.filter((a: any) => {
        if (!a.is_milestone || a.status === 'completed') return false
        const plannedFinish = a.planned_finish ? new Date(a.planned_finish) : null
        return plannedFinish && plannedFinish >= today && plannedFinish <= weekFromNow
      })

      const totalPercent = acts.reduce((sum: number, a: any) => sum + (Number(a.percent_complete) || 0), 0)
      const avgPercent = acts.length > 0 ? totalPercent / acts.length : 0

      return {
        total_activities: acts.length,
        activities_this_week: thisWeekActs.length,
        overdue_count: overdueActs.length,
        delayed_count: delayedActs.length,
        on_critical_path_count: criticalPathActs.length,
        upcoming_milestones: upcomingMilestones.length,
        percent_complete_avg: Math.round(avgPercent),
        unread_changes: unreadCount || 0,
      }
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch schedule summary:', error)
      return {
        total_activities: 0,
        activities_this_week: 0,
        overdue_count: 0,
        delayed_count: 0,
        on_critical_path_count: 0,
        upcoming_milestones: 0,
        percent_complete_avg: 0,
        unread_changes: 0,
      }
    }
  },

  /**
   * Mark schedule notification as read
   */
  async markScheduleNotificationRead(userId: string, notificationId: string): Promise<boolean> {
    try {
      const { error } = await db
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', userId)

      if (error) {
        logger.error('[SubcontractorPortal] Failed to mark notification as read:', error)
        return false
      }
      return true
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to mark notification as read:', error)
      return false
    }
  },

  // =============================================
  // P1-4: SAFETY COMPLIANCE DASHBOARD
  // =============================================

  /**
   * Get safety incidents involving the subcontractor
   */
  async getSafetyIncidents(userId: string): Promise<SubcontractorSafetyIncident[]> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)
      if (subcontractorIds.length === 0) {
        return []
      }

      // Get projects where this subcontractor is assigned
      const { data: projectAccess } = await db
        .from('subcontractor_portal_access')
        .select('project_id')
        .in('subcontractor_id', subcontractorIds)
        .eq('access_status', 'active')

      if (!projectAccess || projectAccess.length === 0) {
        return []
      }

      const projectIds = projectAccess.map((p: any) => p.project_id)

      // Get incidents from these projects
      const { data: incidents, error } = await db
        .from('safety_incidents')
        .select(`
          id,
          incident_number,
          project_id,
          incident_date,
          incident_time,
          location,
          severity,
          status,
          type,
          title,
          description,
          is_osha_recordable,
          days_away_count,
          days_transfer_restriction,
          created_at,
          closed_at,
          projects:project_id (name)
        `)
        .in('project_id', projectIds)
        .order('incident_date', { ascending: false })
        .limit(50)

      if (error) {
        logger.error('[SubcontractorPortal] Failed to fetch safety incidents:', error)
        return []
      }

      return (incidents || []).map((inc: any) => ({
        id: inc.id,
        incident_number: inc.incident_number,
        project_id: inc.project_id,
        project_name: inc.projects?.name || '',
        incident_date: inc.incident_date,
        incident_time: inc.incident_time,
        location: inc.location,
        severity: inc.severity as SafetyIncidentSeverity,
        status: inc.status as SafetyIncidentStatus,
        type: inc.type || 'other',
        title: inc.title || inc.description?.substring(0, 50) || 'Incident',
        description: inc.description || '',
        is_osha_recordable: inc.is_osha_recordable || false,
        days_away: inc.days_away_count || 0,
        days_restricted: inc.days_transfer_restriction || 0,
        reported_at: inc.created_at,
        closed_at: inc.closed_at,
      }))
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch safety incidents:', error)
      return []
    }
  },

  /**
   * Get corrective actions assigned to the subcontractor
   */
  async getCorrectiveActions(userId: string): Promise<SubcontractorCorrectiveAction[]> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)
      if (subcontractorIds.length === 0) {
        return []
      }

      // Get projects where this subcontractor is assigned
      const { data: projectAccess } = await db
        .from('subcontractor_portal_access')
        .select('project_id')
        .in('subcontractor_id', subcontractorIds)
        .eq('access_status', 'active')

      if (!projectAccess || projectAccess.length === 0) {
        return []
      }

      const projectIds = projectAccess.map((p: any) => p.project_id)

      // Get incidents from these projects to find corrective actions
      const { data: incidents } = await db
        .from('safety_incidents')
        .select('id, incident_number, project_id, projects:project_id (name)')
        .in('project_id', projectIds)

      if (!incidents || incidents.length === 0) {
        return []
      }

      const incidentIds = incidents.map((i: any) => i.id)
      const incidentMap: Record<string, any> = {}
      incidents.forEach((i: any) => {
        incidentMap[i.id] = i
      })

      // Get corrective actions for these incidents
      const { data: actions, error } = await db
        .from('safety_incident_corrective_actions')
        .select(`
          id,
          incident_id,
          description,
          status,
          priority,
          due_date,
          completed_date,
          created_at,
          updated_at,
          assigned_to:assigned_to_id (first_name, last_name)
        `)
        .in('incident_id', incidentIds)
        .order('due_date', { ascending: true, nullsFirst: false })

      if (error) {
        logger.error('[SubcontractorPortal] Failed to fetch corrective actions:', error)
        return []
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      return (actions || []).map((action: any) => {
        const incident = incidentMap[action.incident_id] || {}
        const dueDate = action.due_date ? new Date(action.due_date) : null
        const isOverdue = dueDate && dueDate < today && action.status !== 'completed' && action.status !== 'verified'

        return {
          id: action.id,
          incident_id: action.incident_id,
          incident_number: incident.incident_number || '',
          project_id: incident.project_id || '',
          project_name: incident.projects?.name || '',
          description: action.description || '',
          status: action.status || 'pending',
          priority: action.priority || 'medium',
          assigned_to_name: action.assigned_to
            ? `${action.assigned_to.first_name || ''} ${action.assigned_to.last_name || ''}`.trim()
            : null,
          due_date: action.due_date,
          completed_date: action.completed_date,
          created_at: action.created_at,
          updated_at: action.updated_at,
          is_overdue: isOverdue || false,
        }
      })
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch corrective actions:', error)
      return []
    }
  },

  /**
   * Get toolbox talks/safety training for projects
   */
  async getToolboxTalks(userId: string): Promise<SubcontractorToolboxTalk[]> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)
      if (subcontractorIds.length === 0) {
        return []
      }

      // Get projects where this subcontractor is assigned
      const { data: projectAccess } = await db
        .from('subcontractor_portal_access')
        .select('project_id')
        .in('subcontractor_id', subcontractorIds)
        .eq('access_status', 'active')

      if (!projectAccess || projectAccess.length === 0) {
        return []
      }

      const projectIds = projectAccess.map((p: any) => p.project_id)

      // Get toolbox talks from these projects
      const { data: talks, error } = await db
        .from('toolbox_talks')
        .select(`
          id,
          project_id,
          topic,
          description,
          conducted_by,
          conducted_at,
          duration_minutes,
          attendees_count,
          projects:project_id (name)
        `)
        .in('project_id', projectIds)
        .order('conducted_at', { ascending: false })
        .limit(25)

      if (error) {
        logger.error('[SubcontractorPortal] Failed to fetch toolbox talks:', error)
        return []
      }

      return (talks || []).map((talk: any) => ({
        id: talk.id,
        project_id: talk.project_id,
        project_name: talk.projects?.name || '',
        topic: talk.topic || 'Safety Talk',
        description: talk.description,
        conducted_by: talk.conducted_by || 'Unknown',
        conducted_at: talk.conducted_at,
        duration_minutes: talk.duration_minutes,
        attendees_count: talk.attendees_count || 0,
        subcontractor_attendees_count: 0, // Would need attendance tracking by subcontractor
      }))
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch toolbox talks:', error)
      return []
    }
  },

  /**
   * Get safety metrics for the subcontractor
   */
  async getSafetyMetrics(userId: string): Promise<SubcontractorSafetyMetrics> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)

      // Get projects where this subcontractor is assigned
      const { data: projectAccess } = await db
        .from('subcontractor_portal_access')
        .select('project_id')
        .in('subcontractor_id', subcontractorIds)
        .eq('access_status', 'active')

      const projectIds = (projectAccess || []).map((p: any) => p.project_id)

      // Set date range for YTD
      const now = new Date()
      const yearStart = new Date(now.getFullYear(), 0, 1)
      const yearStartStr = yearStart.toISOString().split('T')[0]
      const nowStr = now.toISOString().split('T')[0]

      // Get incidents for these projects YTD
      const { data: incidents } = await db
        .from('safety_incidents')
        .select('id, severity, is_osha_recordable, incident_date, days_away_count')
        .in('project_id', projectIds)
        .gte('incident_date', yearStartStr)
        .lte('incident_date', nowStr)

      const allIncidents = incidents || []
      const recordableIncidents = allIncidents.filter((i: any) => i.is_osha_recordable)
      const lostTimeIncidents = allIncidents.filter((i: any) =>
        i.severity === 'lost_time' || i.severity === 'fatality' || (i.days_away_count && i.days_away_count > 0)
      )

      // Get the most recent incident
      const { data: lastIncident } = await db
        .from('safety_incidents')
        .select('incident_date')
        .in('project_id', projectIds)
        .order('incident_date', { ascending: false })
        .limit(1)
        .single()

      // Calculate days since last incident
      let daysSinceLastIncident: number | null = null
      if (lastIncident?.incident_date) {
        const lastDate = new Date(lastIncident.incident_date)
        daysSinceLastIncident = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      }

      // Get last recordable incident
      const { data: lastRecordable } = await db
        .from('safety_incidents')
        .select('incident_date')
        .in('project_id', projectIds)
        .eq('is_osha_recordable', true)
        .order('incident_date', { ascending: false })
        .limit(1)
        .single()

      let daysSinceLastRecordable: number | null = null
      if (lastRecordable?.incident_date) {
        const lastDate = new Date(lastRecordable.incident_date)
        daysSinceLastRecordable = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      }

      // Note: TRIR, DART, LTIR calculations require hours worked data
      // which would need to be tracked separately. For now, return null for rates.
      return {
        trir: null,
        dart: null,
        ltir: null,
        emr: null,
        total_incidents: allIncidents.length,
        recordable_incidents: recordableIncidents.length,
        lost_time_incidents: lostTimeIncidents.length,
        days_since_last_incident: daysSinceLastIncident,
        days_since_last_recordable: daysSinceLastRecordable,
        hours_worked: null,
        period_start: yearStartStr,
        period_end: nowStr,
      }
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch safety metrics:', error)
      return {
        trir: null,
        dart: null,
        ltir: null,
        emr: null,
        total_incidents: 0,
        recordable_incidents: 0,
        lost_time_incidents: 0,
        days_since_last_incident: null,
        days_since_last_recordable: null,
        hours_worked: null,
        period_start: '',
        period_end: '',
      }
    }
  },

  /**
   * Get safety compliance summary for dashboard
   */
  async getSafetyComplianceSummary(userId: string): Promise<SafetyComplianceSummary> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)

      // Get projects
      const { data: projectAccess } = await db
        .from('subcontractor_portal_access')
        .select('project_id')
        .in('subcontractor_id', subcontractorIds)
        .eq('access_status', 'active')

      const projectIds = (projectAccess || []).map((p: any) => p.project_id)

      // Date calculations
      const now = new Date()
      const yearStart = new Date(now.getFullYear(), 0, 1)
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const yearStartStr = yearStart.toISOString().split('T')[0]
      const monthStartStr = monthStart.toISOString().split('T')[0]
      const nowStr = now.toISOString().split('T')[0]

      // Get YTD incidents
      const { data: ytdIncidents } = await db
        .from('safety_incidents')
        .select('id, is_osha_recordable, incident_date')
        .in('project_id', projectIds)
        .gte('incident_date', yearStartStr)
        .lte('incident_date', nowStr)

      const incidentsYtd = (ytdIncidents || []).length
      const recordableYtd = (ytdIncidents || []).filter((i: any) => i.is_osha_recordable).length

      // Days since last incident
      const { data: lastIncident } = await db
        .from('safety_incidents')
        .select('incident_date')
        .in('project_id', projectIds)
        .order('incident_date', { ascending: false })
        .limit(1)
        .single()

      let daysSinceLast: number | null = null
      if (lastIncident?.incident_date) {
        const lastDate = new Date(lastIncident.incident_date)
        daysSinceLast = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      }

      // Get corrective actions
      const { data: incidents } = await db
        .from('safety_incidents')
        .select('id')
        .in('project_id', projectIds)

      const incidentIds = (incidents || []).map((i: any) => i.id)

      let openActions = 0
      let overdueActions = 0

      if (incidentIds.length > 0) {
        const { data: actions } = await db
          .from('safety_incident_corrective_actions')
          .select('id, status, due_date')
          .in('incident_id', incidentIds)
          .in('status', ['pending', 'in_progress'])

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        openActions = (actions || []).length
        overdueActions = (actions || []).filter((a: any) => {
          const dueDate = a.due_date ? new Date(a.due_date) : null
          return dueDate && dueDate < today
        }).length
      }

      // Get toolbox talks this month
      const { data: monthTalks } = await db
        .from('toolbox_talks')
        .select('id')
        .in('project_id', projectIds)
        .gte('conducted_at', monthStartStr)

      const talksThisMonth = (monthTalks || []).length

      // Get safety certs from compliance documents
      const { data: safetyCerts } = await db
        .from('subcontractor_compliance_documents')
        .select('id, status, expiration_date')
        .in('subcontractor_id', subcontractorIds)
        .eq('document_type', 'safety_cert')

      const today = new Date()
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

      let validCerts = 0
      let expiringCerts = 0
      let expiredCerts = 0

      (safetyCerts || []).forEach((cert: any) => {
        if (cert.status === 'approved') {
          const expDate = cert.expiration_date ? new Date(cert.expiration_date) : null
          if (!expDate || expDate > thirtyDaysFromNow) {
            validCerts++
          } else if (expDate > today) {
            expiringCerts++
          } else {
            expiredCerts++
          }
        } else if (cert.status === 'expired' || (cert.expiration_date && new Date(cert.expiration_date) < today)) {
          expiredCerts++
        }
      })

      // Calculate compliance score (simplified)
      let score = 100

      // Deduct for incidents (up to 30 points)
      score -= Math.min(30, recordableYtd * 15)

      // Deduct for open corrective actions (up to 20 points)
      score -= Math.min(20, openActions * 5)

      // Deduct for overdue actions (up to 20 points)
      score -= Math.min(20, overdueActions * 10)

      // Deduct for expired certs (up to 15 points)
      score -= Math.min(15, expiredCerts * 15)

      // Bonus for days since incident (up to 15 points)
      if (daysSinceLast !== null) {
        if (daysSinceLast >= 365) score = Math.min(100, score + 15)
        else if (daysSinceLast >= 180) score = Math.min(100, score + 10)
        else if (daysSinceLast >= 90) score = Math.min(100, score + 5)
      }

      score = Math.max(0, score)

      // Determine status thresholds
      const trirStatus: 'good' | 'warning' | 'critical' | 'unknown' = 'unknown'
      const dartStatus: 'good' | 'warning' | 'critical' | 'unknown' = 'unknown'

      return {
        compliance_score: Math.round(score),
        incidents_ytd: incidentsYtd,
        recordable_incidents_ytd: recordableYtd,
        days_since_last_incident: daysSinceLast,
        open_corrective_actions: openActions,
        overdue_corrective_actions: overdueActions,
        toolbox_talks_this_month: talksThisMonth,
        training_compliance_percent: 100, // Would need training tracking
        safety_certs_valid: validCerts,
        safety_certs_expiring: expiringCerts,
        safety_certs_expired: expiredCerts,
        trir_status: trirStatus,
        dart_status: dartStatus,
      }
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch safety compliance summary:', error)
      return {
        compliance_score: 0,
        incidents_ytd: 0,
        recordable_incidents_ytd: 0,
        days_since_last_incident: null,
        open_corrective_actions: 0,
        overdue_corrective_actions: 0,
        toolbox_talks_this_month: 0,
        training_compliance_percent: 0,
        safety_certs_valid: 0,
        safety_certs_expiring: 0,
        safety_certs_expired: 0,
        trir_status: 'unknown',
        dart_status: 'unknown',
      }
    }
  },

  // =============================================
  // P2-1: PHOTO DOCUMENTATION ACCESS
  // =============================================

  /**
   * Get photos from the subcontractor's projects
   */
  async getProjectPhotos(userId: string, filters?: SubcontractorPhotoFilters): Promise<SubcontractorPhoto[]> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)
      if (subcontractorIds.length === 0) {
        return []
      }

      // Get projects where this subcontractor is assigned
      const { data: projectAccess } = await db
        .from('subcontractor_portal_access')
        .select('project_id')
        .in('subcontractor_id', subcontractorIds)
        .eq('access_status', 'active')

      if (!projectAccess || projectAccess.length === 0) {
        return []
      }

      let projectIds = projectAccess.map((p: any) => p.project_id)

      // Filter by specific project if provided
      if (filters?.project_id) {
        if (!projectIds.includes(filters.project_id)) {
          return []
        }
        projectIds = [filters.project_id]
      }

      // Build query for photos
      let query = db
        .from('photos')
        .select(`
          id,
          project_id,
          photo_url,
          thumbnail_url,
          caption,
          category,
          location,
          area,
          taken_at,
          created_at,
          tags,
          width,
          height,
          projects:project_id (name),
          users:uploaded_by (first_name, last_name)
        `)
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters?.category) {
        query = query.eq('category', filters.category)
      }
      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from)
      }
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to)
      }
      if (filters?.search) {
        query = query.or(`caption.ilike.%${filters.search}%,location.ilike.%${filters.search}%`)
      }

      const { data: photos, error } = await query.limit(100)

      if (error) {
        logger.error('[SubcontractorPortal] Failed to fetch photos:', error)
        return []
      }

      return (photos || []).map((photo: any) => ({
        id: photo.id,
        project_id: photo.project_id,
        project_name: photo.projects?.name || '',
        photo_url: photo.photo_url,
        thumbnail_url: photo.thumbnail_url,
        caption: photo.caption,
        category: photo.category as PhotoCategory | null,
        location: photo.location,
        area: photo.area,
        taken_at: photo.taken_at,
        uploaded_at: photo.created_at,
        uploaded_by_name: photo.users
          ? `${photo.users.first_name || ''} ${photo.users.last_name || ''}`.trim()
          : null,
        tags: photo.tags || [],
        width: photo.width,
        height: photo.height,
      }))
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch photos:', error)
      return []
    }
  },

  /**
   * Get photo summary for dashboard
   */
  async getPhotoSummary(userId: string): Promise<PhotoSummary> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)

      // Get projects
      const { data: projectAccess } = await db
        .from('subcontractor_portal_access')
        .select('project_id')
        .in('subcontractor_id', subcontractorIds)
        .eq('access_status', 'active')

      const projectIds = (projectAccess || []).map((p: any) => p.project_id)

      if (projectIds.length === 0) {
        return {
          total_photos: 0,
          photos_this_week: 0,
          photos_this_month: 0,
          photos_by_category: {},
          photos_by_project: [],
          recent_photos: [],
        }
      }

      // Get all photos for these projects
      const { data: allPhotos } = await db
        .from('photos')
        .select('id, project_id, category, created_at')
        .in('project_id', projectIds)

      const photos = allPhotos || []
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      // Calculate stats
      const photosThisWeek = photos.filter((p: any) => new Date(p.created_at) >= weekAgo).length
      const photosThisMonth = photos.filter((p: any) => new Date(p.created_at) >= monthAgo).length

      // Count by category
      const photosByCategory: Record<string, number> = {}
      photos.forEach((p: any) => {
        const cat = p.category || 'general'
        photosByCategory[cat] = (photosByCategory[cat] || 0) + 1
      })

      // Count by project with names
      const { data: projects } = await db
        .from('projects')
        .select('id, name')
        .in('id', projectIds)

      const projectMap: Record<string, string> = {}
      ;(projects || []).forEach((p: any) => {
        projectMap[p.id] = p.name
      })

      const projectCounts: Record<string, number> = {}
      photos.forEach((p: any) => {
        projectCounts[p.project_id] = (projectCounts[p.project_id] || 0) + 1
      })

      const photosByProject = Object.entries(projectCounts).map(([projectId, count]) => ({
        project_id: projectId,
        project_name: projectMap[projectId] || 'Unknown Project',
        count,
      }))

      // Get recent photos
      const recentPhotos = await this.getProjectPhotos(userId, {})
      const recent = recentPhotos.slice(0, 6)

      return {
        total_photos: photos.length,
        photos_this_week: photosThisWeek,
        photos_this_month: photosThisMonth,
        photos_by_category: photosByCategory,
        photos_by_project: photosByProject,
        recent_photos: recent,
      }
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch photo summary:', error)
      return {
        total_photos: 0,
        photos_this_week: 0,
        photos_this_month: 0,
        photos_by_category: {},
        photos_by_project: [],
        recent_photos: [],
      }
    }
  },

  // =============================================
  // P2-2: MEETING MINUTES & ACTION ITEMS
  // =============================================

  /**
   * Get meetings for the subcontractor's projects
   */
  async getMeetings(userId: string): Promise<SubcontractorMeeting[]> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)
      if (subcontractorIds.length === 0) {
        return []
      }

      // Get projects
      const { data: projectAccess } = await db
        .from('subcontractor_portal_access')
        .select('project_id')
        .in('subcontractor_id', subcontractorIds)
        .eq('access_status', 'active')

      if (!projectAccess || projectAccess.length === 0) {
        return []
      }

      const projectIds = projectAccess.map((p: any) => p.project_id)

      // Get meetings from these projects
      const { data: meetings, error } = await db
        .from('meetings')
        .select(`
          id,
          project_id,
          title,
          meeting_type,
          description,
          scheduled_date,
          scheduled_time,
          duration_minutes,
          location,
          is_virtual,
          meeting_link,
          status,
          agenda,
          minutes_summary,
          projects:project_id (name)
        `)
        .in('project_id', projectIds)
        .order('scheduled_date', { ascending: false })
        .limit(50)

      if (error) {
        logger.error('[SubcontractorPortal] Failed to fetch meetings:', error)
        return []
      }

      // Get attendee counts and attachment counts for each meeting
      const meetingIds = (meetings || []).map((m: any) => m.id)

      const { data: attendees } = await db
        .from('meeting_attendees')
        .select('meeting_id, attended')
        .in('meeting_id', meetingIds)

      const { data: attachments } = await db
        .from('meeting_attachments')
        .select('meeting_id')
        .in('meeting_id', meetingIds)

      // Build attendee and attachment counts
      const attendeeCounts: Record<string, { total: number; attended: number }> = {}
      ;(attendees || []).forEach((a: any) => {
        if (!attendeeCounts[a.meeting_id]) {
          attendeeCounts[a.meeting_id] = { total: 0, attended: 0 }
        }
        attendeeCounts[a.meeting_id].total++
        if (a.attended) attendeeCounts[a.meeting_id].attended++
      })

      const attachmentCounts: Record<string, number> = {}
      ;(attachments || []).forEach((a: any) => {
        attachmentCounts[a.meeting_id] = (attachmentCounts[a.meeting_id] || 0) + 1
      })

      return (meetings || []).map((m: any) => ({
        id: m.id,
        project_id: m.project_id,
        project_name: m.projects?.name || '',
        title: m.title || 'Untitled Meeting',
        meeting_type: m.meeting_type || 'general',
        description: m.description,
        scheduled_date: m.scheduled_date,
        scheduled_time: m.scheduled_time,
        duration_minutes: m.duration_minutes,
        location: m.location,
        is_virtual: m.is_virtual || false,
        meeting_link: m.meeting_link,
        status: (m.status || 'scheduled') as MeetingStatus,
        total_attendees: attendeeCounts[m.id]?.total || 0,
        subcontractor_attended: attendeeCounts[m.id]?.attended > 0 || false,
        agenda: m.agenda,
        minutes_summary: m.minutes_summary,
        attachments_count: attachmentCounts[m.id] || 0,
      }))
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch meetings:', error)
      return []
    }
  },

  /**
   * Get action items assigned to the subcontractor
   */
  async getActionItems(userId: string): Promise<SubcontractorActionItem[]> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)
      if (subcontractorIds.length === 0) {
        return []
      }

      // Get projects
      const { data: projectAccess } = await db
        .from('subcontractor_portal_access')
        .select('project_id')
        .in('subcontractor_id', subcontractorIds)
        .eq('access_status', 'active')

      if (!projectAccess || projectAccess.length === 0) {
        return []
      }

      const projectIds = projectAccess.map((p: any) => p.project_id)

      // Get meetings from these projects
      const { data: meetings } = await db
        .from('meetings')
        .select('id, title, project_id, projects:project_id (name)')
        .in('project_id', projectIds)

      if (!meetings || meetings.length === 0) {
        return []
      }

      const meetingIds = meetings.map((m: any) => m.id)
      const meetingMap: Record<string, any> = {}
      meetings.forEach((m: any) => {
        meetingMap[m.id] = m
      })

      // Get action items from these meetings
      const { data: actionItems, error } = await db
        .from('meeting_action_items')
        .select(`
          id,
          meeting_id,
          description,
          status,
          priority,
          due_date,
          completed_date,
          created_at,
          assigned_to:assigned_to_id (first_name, last_name)
        `)
        .in('meeting_id', meetingIds)
        .order('due_date', { ascending: true, nullsFirst: false })

      if (error) {
        logger.error('[SubcontractorPortal] Failed to fetch action items:', error)
        return []
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      return (actionItems || []).map((item: any) => {
        const meeting = meetingMap[item.meeting_id] || {}
        const dueDate = item.due_date ? new Date(item.due_date) : null
        const isOverdue = dueDate && dueDate < today && item.status !== 'completed' && item.status !== 'cancelled'

        return {
          id: item.id,
          meeting_id: item.meeting_id,
          meeting_title: meeting.title || 'Unknown Meeting',
          project_id: meeting.project_id || '',
          project_name: meeting.projects?.name || '',
          description: item.description || '',
          status: (item.status || 'pending') as ActionItemStatus,
          priority: (item.priority || 'medium') as any,
          assigned_to_name: item.assigned_to
            ? `${item.assigned_to.first_name || ''} ${item.assigned_to.last_name || ''}`.trim()
            : null,
          is_assigned_to_subcontractor: true, // Simplified - would need more logic
          due_date: item.due_date,
          completed_date: item.completed_date,
          created_at: item.created_at,
          is_overdue: isOverdue || false,
        }
      })
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch action items:', error)
      return []
    }
  },

  /**
   * Get meeting attachments
   */
  async getMeetingAttachments(userId: string, meetingId: string): Promise<MeetingAttachment[]> {
    try {
      const { data: attachments, error } = await db
        .from('meeting_attachments')
        .select('id, meeting_id, file_name, file_url, file_type, file_size, created_at')
        .eq('meeting_id', meetingId)

      if (error) {
        logger.error('[SubcontractorPortal] Failed to fetch meeting attachments:', error)
        return []
      }

      return (attachments || []).map((a: any) => ({
        id: a.id,
        meeting_id: a.meeting_id,
        file_name: a.file_name || 'Attachment',
        file_url: a.file_url,
        file_type: a.file_type,
        file_size: a.file_size,
        uploaded_at: a.created_at,
      }))
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch meeting attachments:', error)
      return []
    }
  },

  /**
   * Get meeting summary for dashboard
   */
  async getMeetingSummary(userId: string): Promise<MeetingSummary> {
    try {
      const meetings = await this.getMeetings(userId)
      const actionItems = await this.getActionItems(userId)

      const now = new Date()
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      const upcoming = meetings.filter(m =>
        m.status === 'scheduled' && new Date(m.scheduled_date) >= now
      ).length

      const thisMonth = meetings.filter(m =>
        new Date(m.scheduled_date) >= monthAgo
      ).length

      const openItems = actionItems.filter(a =>
        a.status === 'pending' || a.status === 'in_progress'
      ).length

      const overdueItems = actionItems.filter(a => a.is_overdue).length

      const completedItems = actionItems.filter(a =>
        a.status === 'completed'
      ).length

      return {
        total_meetings: meetings.length,
        upcoming_meetings: upcoming,
        meetings_this_month: thisMonth,
        open_action_items: openItems,
        overdue_action_items: overdueItems,
        completed_action_items: completedItems,
      }
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch meeting summary:', error)
      return {
        total_meetings: 0,
        upcoming_meetings: 0,
        meetings_this_month: 0,
        open_action_items: 0,
        overdue_action_items: 0,
        completed_action_items: 0,
      }
    }
  },

  /**
   * Mark an action item as complete
   */
  async markActionItemComplete(userId: string, itemId: string): Promise<boolean> {
    try {
      const { error } = await db
        .from('meeting_action_items')
        .update({
          status: 'completed',
          completed_date: new Date().toISOString(),
        })
        .eq('id', itemId)

      if (error) {
        logger.error('[SubcontractorPortal] Failed to mark action item complete:', error)
        return false
      }
      return true
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to mark action item complete:', error)
      return false
    }
  },

  // =============================================
  // P2-3: EQUIPMENT & LABOR CERTIFICATIONS
  // =============================================

  /**
   * Get certifications for the subcontractor
   */
  async getCertifications(userId: string): Promise<SubcontractorCertification[]> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)
      if (subcontractorIds.length === 0) {
        return []
      }

      // Get certifications from subcontractor_certifications table
      const { data: certifications, error } = await db
        .from('subcontractor_certifications')
        .select(`
          id,
          subcontractor_id,
          certification_type,
          certification_name,
          issuing_authority,
          certificate_number,
          holder_name,
          holder_title,
          issue_date,
          expiration_date,
          document_url,
          document_name,
          status,
          verified_at,
          created_at,
          updated_at,
          verified_by:verified_by_id (first_name, last_name)
        `)
        .in('subcontractor_id', subcontractorIds)
        .order('expiration_date', { ascending: true, nullsFirst: false })

      if (error) {
        // Table might not exist, try compliance documents as fallback
        logger.warn('[SubcontractorPortal] subcontractor_certifications table not found, using compliance documents')
        return await this.getCertificationsFromComplianceDocs(subcontractorIds)
      }

      const today = new Date()
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

      return (certifications || []).map((cert: any) => {
        const expDate = cert.expiration_date ? new Date(cert.expiration_date) : null
        let status: CertificationStatusType = cert.status || 'pending_verification'

        // Override status based on expiration
        if (expDate) {
          if (expDate < today) {
            status = 'expired'
          } else if (expDate < thirtyDaysFromNow) {
            status = 'expiring_soon'
          } else if (cert.verified_at) {
            status = 'valid'
          }
        } else if (cert.verified_at) {
          status = 'valid'
        }

        return {
          id: cert.id,
          subcontractor_id: cert.subcontractor_id,
          certification_type: (cert.certification_type || 'other') as CertificationType,
          certification_name: cert.certification_name || 'Certification',
          issuing_authority: cert.issuing_authority,
          certificate_number: cert.certificate_number,
          holder_name: cert.holder_name || 'Unknown',
          holder_title: cert.holder_title,
          issue_date: cert.issue_date,
          expiration_date: cert.expiration_date,
          document_url: cert.document_url,
          document_name: cert.document_name,
          status,
          verified_at: cert.verified_at,
          verified_by_name: cert.verified_by
            ? `${cert.verified_by.first_name || ''} ${cert.verified_by.last_name || ''}`.trim()
            : null,
          created_at: cert.created_at,
          updated_at: cert.updated_at,
        }
      })
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch certifications:', error)
      return []
    }
  },

  /**
   * Fallback: Get certifications from compliance documents
   */
  async getCertificationsFromComplianceDocs(subcontractorIds: string[]): Promise<SubcontractorCertification[]> {
    try {
      const { data: docs, error } = await db
        .from('subcontractor_compliance_documents')
        .select('*')
        .in('subcontractor_id', subcontractorIds)
        .eq('document_type', 'safety_cert')

      if (error) {
        return []
      }

      const today = new Date()
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

      return (docs || []).map((doc: any) => {
        const expDate = doc.expiration_date ? new Date(doc.expiration_date) : null
        let status: CertificationStatusType = 'pending_verification'

        if (expDate) {
          if (expDate < today) {
            status = 'expired'
          } else if (expDate < thirtyDaysFromNow) {
            status = 'expiring_soon'
          } else if (doc.status === 'approved') {
            status = 'valid'
          }
        } else if (doc.status === 'approved') {
          status = 'valid'
        }

        return {
          id: doc.id,
          subcontractor_id: doc.subcontractor_id,
          certification_type: 'safety_training' as CertificationType,
          certification_name: doc.document_name || 'Safety Certification',
          issuing_authority: null,
          certificate_number: null,
          holder_name: 'Company',
          holder_title: null,
          issue_date: doc.issue_date,
          expiration_date: doc.expiration_date,
          document_url: doc.file_url,
          document_name: doc.document_name,
          status,
          verified_at: doc.verified_at,
          verified_by_name: null,
          created_at: doc.created_at,
          updated_at: doc.updated_at,
        }
      })
    } catch (error) {
      return []
    }
  },

  /**
   * Get certification summary for dashboard
   */
  async getCertificationSummary(userId: string): Promise<CertificationSummary> {
    try {
      const certifications = await this.getCertifications(userId)

      const validCount = certifications.filter(c => c.status === 'valid').length
      const expiringSoonCount = certifications.filter(c => c.status === 'expiring_soon').length
      const expiredCount = certifications.filter(c => c.status === 'expired').length
      const pendingCount = certifications.filter(c => c.status === 'pending_verification').length

      // Count by type
      const byType: Record<string, number> = {}
      certifications.forEach(c => {
        byType[c.certification_type] = (byType[c.certification_type] || 0) + 1
      })

      // Get expiring within 30 days
      const today = new Date()
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
      const expiringWithin30 = certifications.filter(c => {
        if (!c.expiration_date) return false
        const expDate = new Date(c.expiration_date)
        return expDate >= today && expDate <= thirtyDaysFromNow
      })

      return {
        total_certifications: certifications.length,
        valid_count: validCount,
        expiring_soon_count: expiringSoonCount,
        expired_count: expiredCount,
        pending_verification_count: pendingCount,
        certifications_by_type: byType,
        expiring_within_30_days: expiringWithin30,
      }
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to fetch certification summary:', error)
      return {
        total_certifications: 0,
        valid_count: 0,
        expiring_soon_count: 0,
        expired_count: 0,
        pending_verification_count: 0,
        certifications_by_type: {},
        expiring_within_30_days: [],
      }
    }
  },

  /**
   * Upload a new certification
   */
  async uploadCertification(userId: string, data: CreateCertificationDTO): Promise<SubcontractorCertification | null> {
    try {
      const subcontractorIds = await getSubcontractorIdsForUser(userId)
      if (subcontractorIds.length === 0) {
        return null
      }

      const subcontractorId = subcontractorIds[0]

      const { data: cert, error } = await db
        .from('subcontractor_certifications')
        .insert({
          subcontractor_id: subcontractorId,
          certification_type: data.certification_type,
          certification_name: data.certification_name,
          issuing_authority: data.issuing_authority,
          certificate_number: data.certificate_number,
          holder_name: data.holder_name,
          holder_title: data.holder_title,
          issue_date: data.issue_date,
          expiration_date: data.expiration_date,
          document_url: data.document_url,
          document_name: data.document_name,
          status: 'pending_verification',
        })
        .select()
        .single()

      if (error) {
        logger.error('[SubcontractorPortal] Failed to upload certification:', error)
        return null
      }

      return {
        id: cert.id,
        subcontractor_id: cert.subcontractor_id,
        certification_type: cert.certification_type,
        certification_name: cert.certification_name,
        issuing_authority: cert.issuing_authority,
        certificate_number: cert.certificate_number,
        holder_name: cert.holder_name,
        holder_title: cert.holder_title,
        issue_date: cert.issue_date,
        expiration_date: cert.expiration_date,
        document_url: cert.document_url,
        document_name: cert.document_name,
        status: 'pending_verification',
        verified_at: null,
        verified_by_name: null,
        created_at: cert.created_at,
        updated_at: cert.updated_at,
      }
    } catch (error) {
      logger.error('[SubcontractorPortal] Failed to upload certification:', error)
      return null
    }
  },
}

// =============================================
// INSURANCE ENDORSEMENT HELPER FUNCTIONS
// =============================================

function getEndorsementStatus(required: boolean, verified: boolean): EndorsementStatus {
  if (!required) {return 'not_required'}
  if (verified) {return 'verified'}
  return 'missing'
}

function getEndorsementLabel(type: string): string {
  const labels: Record<string, string> = {
    additional_insured: 'Additional Insured',
    waiver_of_subrogation: 'Waiver of Subrogation',
    primary_noncontributory: 'Primary & Non-Contributory',
  }
  return labels[type] || type
}

function getInsuranceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    general_liability: 'General Liability',
    auto_liability: 'Auto Liability',
    workers_compensation: "Workers' Compensation",
    umbrella: 'Umbrella/Excess',
    professional_liability: 'Professional Liability',
    builders_risk: "Builder's Risk",
    pollution: 'Pollution',
    cyber: 'Cyber Liability',
    other: 'Other',
  }
  return labels[type] || type
}

// =============================================
// DAILY REPORT TYPES FOR SUBCONTRACTOR PORTAL
// =============================================

export interface SubcontractorDailyReport {
  id: string;
  project_id: string;
  project_name: string;
  project_number: string;
  report_date: string;
  reporter_name: string;
  shift_type: string;
  total_hours: number | null;
  weather_condition: string | null;
  temperature_high: number | null;
  temperature_low: number | null;
  work_summary: string | null;
  overall_progress_percentage: number | null;
  schedule_status: string | null;
  status: string;
  submitted_at: string | null;
  approved_at: string | null;
  workforce_count: number;
  equipment_count: number;
  deliveries_count: number;
  photos_count: number;
  created_at: string;
}

export interface SubcontractorDailyReportDetail extends SubcontractorDailyReport {
  shift_start_time: string | null;
  shift_end_time: string | null;
  wind_speed: number | null;
  precipitation: number | null;
  work_completed: string | null;
  work_planned_tomorrow: string | null;
  issues: string | null;
  observations: string | null;
  submitted_by_name: string | null;
  approved_by_name: string | null;
  workforce: SubcontractorDailyReportWorkforce[];
  equipment: SubcontractorDailyReportEquipment[];
  photos: SubcontractorDailyReportPhoto[];
}

export interface SubcontractorDailyReportWorkforce {
  id: string;
  crew_name: string | null;
  trade: string | null;
  headcount: number | null;
  hours_worked: number | null;
  work_description: string | null;
  company_name: string | null;
}

export interface SubcontractorDailyReportEquipment {
  id: string;
  equipment_name: string | null;
  equipment_type: string | null;
  ownership_type: string | null;
  hours_used: number | null;
  operator_name: string | null;
  notes: string | null;
}

export interface SubcontractorDailyReportPhoto {
  id: string;
  photo_url: string;
  caption: string | null;
  category: string | null;
  taken_at: string | null;
  location: string | null;
}

export default subcontractorPortalApi
