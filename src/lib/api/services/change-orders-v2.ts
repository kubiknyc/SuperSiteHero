// @ts-nocheck
/**
 * Change Orders API Service - V2
 * For dedicated change_orders table with enhanced PCO/CO workflow
 *
 * Note: Uses type assertions until database types are regenerated
 * to include change_orders, change_order_items, change_order_attachments,
 * and change_order_history tables from migration 052.
 */

import { supabase } from '../../supabase';
import { changeOrderBudgetIntegration } from './change-order-budget-integration';
import type {
  ChangeOrder,
  ChangeOrderItem,
  ChangeOrderAttachment,
  ChangeOrderHistory,
  CreateChangeOrderDTO,
  UpdateChangeOrderDTO,
  CreateChangeOrderItemDTO,
  UpdateChangeOrderItemDTO,
  CreateChangeOrderAttachmentDTO,
  ChangeOrderFilters,
  ChangeOrderStatistics,
  SubmitEstimateDTO,
  InternalApprovalDTO,
  OwnerApprovalDTO,
} from '../../../types/change-order';

// Type assertion helper for tables not yet in database types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// =============================================================================
// CHANGE ORDERS API
// =============================================================================

export const changeOrdersApiV2 = {
  /**
   * Get all change orders with optional filters
   */
  async getChangeOrders(filters: ChangeOrderFilters = {}): Promise<ChangeOrder[]> {
    let query = db
      .from('change_orders')
      .select(`
        *,
        initiated_by_user:users!change_orders_initiated_by_fkey(id, full_name, email),
        assigned_to_user:users!change_orders_assigned_to_fkey(id, full_name, email),
        ball_in_court_user:users!change_orders_ball_in_court_fkey(id, full_name, email),
        related_rfi:rfis(id, rfi_number, subject),
        related_submittal:submittals(id, submittal_number, title),
        project:projects(id, name, project_number)
      `)
      .is('deleted_at', null)
      .order('pco_number', { ascending: false });

    if (filters.project_id) {
      query = query.eq('project_id', filters.project_id);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.change_type) {
      query = query.eq('change_type', filters.change_type);
    }
    if (filters.is_pco !== undefined) {
      query = query.eq('is_pco', filters.is_pco);
    }
    if (filters.ball_in_court) {
      query = query.eq('ball_in_court', filters.ball_in_court);
    }
    if (filters.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to);
    }
    if (filters.initiated_by) {
      query = query.eq('initiated_by', filters.initiated_by);
    }
    if (filters.subcontractor_id) {
      query = query.eq('subcontractor_id', filters.subcontractor_id);
    }
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }
    if (filters.from_date) {
      query = query.gte('date_created', filters.from_date);
    }
    if (filters.to_date) {
      query = query.lte('date_created', filters.to_date);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Get a single change order by ID
   */
  async getChangeOrderById(id: string): Promise<ChangeOrder | null> {
    const { data, error } = await db
      .from('change_orders')
      .select(`
        *,
        items:change_order_items(*, cost_code:cost_codes(id, code, description)),
        attachments:change_order_attachments(*),
        initiated_by_user:users!change_orders_initiated_by_fkey(id, full_name, email),
        assigned_to_user:users!change_orders_assigned_to_fkey(id, full_name, email),
        ball_in_court_user:users!change_orders_ball_in_court_fkey(id, full_name, email),
        estimator:users!change_orders_estimator_id_fkey(id, full_name, email),
        related_rfi:rfis(id, rfi_number, subject, status),
        related_submittal:submittals(id, submittal_number, title, review_status),
        project:projects(id, name, project_number)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  /**
   * Create a new change order (PCO)
   */
  async createChangeOrder(dto: CreateChangeOrderDTO): Promise<ChangeOrder> {
    // Get next PCO number for project
    const { data: nextNumber } = await db
      .rpc('get_next_pco_number', { p_project_id: dto.project_id });

    const { data: user } = await supabase.auth.getUser();
    const userId = user?.user?.id;

    // Get company_id from project
    const { data: project } = await db
      .from('projects')
      .select('company_id')
      .eq('id', dto.project_id)
      .single();

    if (!project) throw new Error('Project not found');

    const { data, error } = await db
      .from('change_orders')
      .insert({
        ...dto,
        company_id: project.company_id,
        pco_number: nextNumber || 1,
        is_pco: true,
        status: 'draft',
        internal_approval_status: 'pending',
        owner_approval_status: 'pending',
        initiated_by: userId,
        created_by: userId,
        ball_in_court: dto.assigned_to || dto.estimator_id || userId,
        ball_in_court_role: dto.estimator_id ? 'estimating' : 'pm',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update a change order
   */
  async updateChangeOrder(id: string, dto: UpdateChangeOrderDTO): Promise<ChangeOrder> {
    const { data, error } = await db
      .from('change_orders')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Soft delete a change order
   */
  async deleteChangeOrder(id: string): Promise<void> {
    const { error } = await db
      .from('change_orders')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Submit estimate (move to pending internal approval)
   */
  async submitEstimate(id: string, dto: SubmitEstimateDTO): Promise<ChangeOrder> {
    // Create items if provided
    if (dto.items && dto.items.length > 0) {
      for (let i = 0; i < dto.items.length; i++) {
        await changeOrderItemsApiV2.addItem(id, { ...dto.items[i], item_number: i + 1 });
      }
    }

    const { data, error } = await db
      .from('change_orders')
      .update({
        proposed_amount: dto.proposed_amount,
        proposed_days: dto.proposed_days || 0,
        status: 'pending_internal_approval',
        date_estimated: new Date().toISOString(),
        ball_in_court_role: 'pm',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Process internal approval
   */
  async processInternalApproval(id: string, dto: InternalApprovalDTO): Promise<ChangeOrder> {
    const { data: user } = await supabase.auth.getUser();
    const userId = user?.user?.id;
    const { data: userInfo } = await db
      .from('users')
      .select('full_name')
      .eq('id', userId)
      .single();

    const newStatus = dto.approved ? 'internally_approved' : 'rejected';

    const { data, error } = await db
      .from('change_orders')
      .update({
        status: newStatus,
        internal_approval_status: dto.approved ? 'approved' : 'rejected',
        date_internal_approved: new Date().toISOString(),
        internal_approver_id: userId,
        internal_approver_name: userInfo?.full_name,
        owner_comments: dto.comments,
        ball_in_court_role: dto.approved ? 'owner' : 'pm',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Submit to owner
   */
  async submitToOwner(id: string): Promise<ChangeOrder> {
    const { data, error } = await db
      .from('change_orders')
      .update({
        status: 'pending_owner_review',
        date_owner_submitted: new Date().toISOString(),
        ball_in_court_role: 'owner',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Process owner approval (convert PCO to CO)
   * Automatically adjusts project budgets when approved.
   */
  async processOwnerApproval(id: string, dto: OwnerApprovalDTO): Promise<ChangeOrder> {
    if (!dto.approved) {
      // Rejected
      const { data, error } = await db
        .from('change_orders')
        .update({
          status: 'rejected',
          owner_approval_status: 'rejected',
          owner_comments: dto.comments,
          ball_in_court_role: 'pm',
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    // Get change order to get project_id
    const { data: co } = await db
      .from('change_orders')
      .select('project_id')
      .eq('id', id)
      .single();

    if (!co) throw new Error('Change order not found');

    // Get next CO number
    const { data: nextCoNumber } = await db
      .rpc('get_next_co_number', { p_project_id: co.project_id });

    const { data, error } = await db
      .from('change_orders')
      .update({
        status: 'approved',
        is_pco: false,
        co_number: nextCoNumber || 1,
        owner_approval_status: 'approved',
        approved_amount: dto.approved_amount,
        approved_days: dto.approved_days,
        owner_comments: dto.comments,
        owner_approver_name: dto.approver_name,
        owner_signature_url: dto.signature_url,
        date_owner_approved: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // AUTO-ADJUST BUDGET: Apply budget adjustments after successful approval
    try {
      const hasProcessed = await changeOrderBudgetIntegration.hasBeenProcessed(id);
      if (!hasProcessed && dto.approved_amount) {
        const budgetResult = await changeOrderBudgetIntegration.applyBudgetAdjustments(
          id,
          dto.approved_amount
        );
        console.log(`Budget adjusted for CO-${data.co_number}:`, {
          total: budgetResult.total_adjusted,
          costCodes: budgetResult.adjustments.length,
          created: budgetResult.created_budgets,
          updated: budgetResult.updated_budgets,
        });
      }
    } catch (budgetError) {
      // Log but don't fail the approval if budget adjustment fails
      console.error('Failed to apply budget adjustments:', budgetError);
      // Could optionally notify admin or create an alert here
    }

    return data;
  },

  /**
   * Execute change order (final step)
   */
  async executeChangeOrder(id: string): Promise<ChangeOrder> {
    const { data, error } = await db
      .from('change_orders')
      .update({
        date_executed: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Void a change order
   * Reverses budget adjustments if the CO was already approved.
   */
  async voidChangeOrder(id: string, reason?: string): Promise<ChangeOrder> {
    // Check if this CO was approved (has budget adjustments to reverse)
    const { data: existingCO } = await db
      .from('change_orders')
      .select('status, co_number')
      .eq('id', id)
      .single();

    const wasApproved = existingCO?.status === 'approved';

    const { data, error } = await db
      .from('change_orders')
      .update({
        status: 'void',
        owner_comments: reason,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // REVERSE BUDGET: If CO was approved, reverse the budget adjustments
    if (wasApproved) {
      try {
        const hasProcessed = await changeOrderBudgetIntegration.hasBeenProcessed(id);
        if (hasProcessed) {
          const reverseResult = await changeOrderBudgetIntegration.reverseBudgetAdjustments(id);
          console.log(`Budget reversed for voided CO-${existingCO.co_number}:`, {
            total: Math.abs(reverseResult.total_adjusted),
            costCodes: reverseResult.adjustments.length,
          });
        }
      } catch (budgetError) {
        console.error('Failed to reverse budget adjustments:', budgetError);
      }
    }

    return data;
  },

  /**
   * Update ball-in-court
   */
  async updateBallInCourt(id: string, userId: string, role: string): Promise<ChangeOrder> {
    const { data, error } = await db
      .from('change_orders')
      .update({
        ball_in_court: userId,
        ball_in_court_role: role,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get statistics for a project
   */
  async getStatistics(projectId: string): Promise<ChangeOrderStatistics> {
    const { data: changeOrders, error } = await db
      .from('change_orders')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null);

    if (error) throw error;

    const stats: ChangeOrderStatistics = {
      total_count: changeOrders?.length || 0,
      pco_count: 0,
      approved_co_count: 0,
      by_status: {},
      by_type: {},
      total_proposed_amount: 0,
      total_approved_amount: 0,
      total_proposed_days: 0,
      total_approved_days: 0,
      pending_internal: 0,
      pending_owner: 0,
    };

    changeOrders?.forEach(co => {
      if (co.is_pco) stats.pco_count++;
      if (co.status === 'approved') stats.approved_co_count++;

      stats.by_status[co.status] = (stats.by_status[co.status] || 0) + 1;
      stats.by_type[co.change_type] = (stats.by_type[co.change_type] || 0) + 1;

      stats.total_proposed_amount += co.proposed_amount || 0;
      stats.total_approved_amount += co.approved_amount || 0;
      stats.total_proposed_days += co.proposed_days || 0;
      stats.total_approved_days += co.approved_days || 0;

      if (co.status === 'pending_internal_approval') stats.pending_internal++;
      if (co.status === 'pending_owner_review') stats.pending_owner++;
    });

    return stats;
  },
};

// =============================================================================
// CHANGE ORDER ITEMS API
// =============================================================================

export const changeOrderItemsApiV2 = {
  /**
   * Get items for a change order
   */
  async getItems(changeOrderId: string): Promise<ChangeOrderItem[]> {
    const { data, error } = await db
      .from('change_order_items')
      .select('*, cost_code:cost_codes(id, code, description)')
      .eq('change_order_id', changeOrderId)
      .order('item_number');

    if (error) throw error;
    return data || [];
  },

  /**
   * Add item to change order
   */
  async addItem(changeOrderId: string, dto: CreateChangeOrderItemDTO & { item_number?: number }): Promise<ChangeOrderItem> {
    // Get next item number if not provided
    let itemNumber = dto.item_number;
    if (!itemNumber) {
      const { data: existing } = await supabase
        .from('change_order_items')
        .select('item_number')
        .eq('change_order_id', changeOrderId)
        .order('item_number', { ascending: false })
        .limit(1);

      itemNumber = (existing?.[0]?.item_number || 0) + 1;
    }

    // Calculate total
    const total = calculateItemTotal(dto);

    const { data, error } = await db
      .from('change_order_items')
      .insert({
        ...dto,
        change_order_id: changeOrderId,
        item_number: itemNumber,
        total_amount: total,
        markup_amount: dto.markup_percent
          ? ((dto.labor_amount || 0) + (dto.material_amount || 0) + (dto.equipment_amount || 0) + (dto.subcontract_amount || 0) + (dto.other_amount || 0)) * (dto.markup_percent / 100)
          : null,
      })
      .select()
      .single();

    if (error) throw error;

    // Recalculate change order total
    await recalculateChangeOrderTotal(changeOrderId);

    return data;
  },

  /**
   * Update item
   */
  async updateItem(id: string, dto: UpdateChangeOrderItemDTO): Promise<ChangeOrderItem> {
    const total = calculateItemTotal(dto);

    const { data, error } = await db
      .from('change_order_items')
      .update({
        ...dto,
        total_amount: total,
        markup_amount: dto.markup_percent
          ? ((dto.labor_amount || 0) + (dto.material_amount || 0) + (dto.equipment_amount || 0) + (dto.subcontract_amount || 0) + (dto.other_amount || 0)) * (dto.markup_percent / 100)
          : null,
      })
      .eq('id', id)
      .select('*, change_order_id')
      .single();

    if (error) throw error;

    // Recalculate change order total
    await recalculateChangeOrderTotal(data.change_order_id);

    return data;
  },

  /**
   * Delete item
   */
  async deleteItem(id: string): Promise<void> {
    // Get change_order_id first
    const { data: item } = await db
      .from('change_order_items')
      .select('change_order_id')
      .eq('id', id)
      .single();

    const { error } = await db
      .from('change_order_items')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Recalculate change order total
    if (item) {
      await recalculateChangeOrderTotal(item.change_order_id);
    }
  },

  /**
   * Reorder items
   */
  async reorderItems(changeOrderId: string, itemIds: string[]): Promise<void> {
    for (let i = 0; i < itemIds.length; i++) {
      await supabase
        .from('change_order_items')
        .update({ item_number: i + 1 })
        .eq('id', itemIds[i]);
    }
  },
};

// =============================================================================
// CHANGE ORDER ATTACHMENTS API
// =============================================================================

export const changeOrderAttachmentsApiV2 = {
  /**
   * Get attachments for a change order
   */
  async getAttachments(changeOrderId: string): Promise<ChangeOrderAttachment[]> {
    const { data, error } = await db
      .from('change_order_attachments')
      .select('*')
      .eq('change_order_id', changeOrderId)
      .order('created_at');

    if (error) throw error;
    return data || [];
  },

  /**
   * Add attachment
   */
  async addAttachment(changeOrderId: string, dto: CreateChangeOrderAttachmentDTO): Promise<ChangeOrderAttachment> {
    const { data: user } = await supabase.auth.getUser();

    const { data, error } = await db
      .from('change_order_attachments')
      .insert({
        ...dto,
        change_order_id: changeOrderId,
        uploaded_by: user?.user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete attachment
   */
  async deleteAttachment(id: string): Promise<void> {
    const { error } = await db
      .from('change_order_attachments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// =============================================================================
// CHANGE ORDER HISTORY API
// =============================================================================

export const changeOrderHistoryApiV2 = {
  /**
   * Get history for a change order
   */
  async getHistory(changeOrderId: string): Promise<ChangeOrderHistory[]> {
    const { data, error } = await db
      .from('change_order_history')
      .select('*, changed_by_user:users(id, full_name, email)')
      .eq('change_order_id', changeOrderId)
      .order('changed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function calculateItemTotal(item: Partial<CreateChangeOrderItemDTO>): number {
  const direct =
    (item.labor_amount || 0) +
    (item.material_amount || 0) +
    (item.equipment_amount || 0) +
    (item.subcontract_amount || 0) +
    (item.other_amount || 0);

  const unitBased = (item.quantity || 0) * (item.unit_cost || 0);
  const base = Math.max(direct, unitBased);

  const markup = item.markup_percent ? base * (item.markup_percent / 100) : 0;

  return base + markup;
}

async function recalculateChangeOrderTotal(changeOrderId: string): Promise<void> {
  // Get all items
  const { data: items } = await supabase
    .from('change_order_items')
    .select('total_amount')
    .eq('change_order_id', changeOrderId);

  const total = items?.reduce((sum, item) => sum + (item.total_amount || 0), 0) || 0;

  // Update change order
  await supabase
    .from('change_orders')
    .update({ proposed_amount: total })
    .eq('id', changeOrderId);
}

// Default export
export default {
  changeOrders: changeOrdersApiV2,
  items: changeOrderItemsApiV2,
  attachments: changeOrderAttachmentsApiV2,
  history: changeOrderHistoryApiV2,
};
