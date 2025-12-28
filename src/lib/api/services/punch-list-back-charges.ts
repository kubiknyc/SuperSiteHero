/**
 * Punch List Back-Charges API Service
 *
 * API service for managing back-charges on punch list items.
 * Provides CRUD operations, status workflow transitions, and
 * summary/statistics functions.
 */

import { supabase } from '@/lib/supabase';
import { ApiErrorClass } from '../errors';

import type {
  PunchItemBackCharge,
  PunchItemBackChargeDetailed,
  PunchItemBackChargeHistory,
  BackChargesBySubcontractor,
  BackChargesByProject,
  ProjectBackChargeStats,
  CreateBackChargeDTO,
  UpdateBackChargeDTO,
  ApproveBackChargeDTO,
  DisputeBackChargeDTO,
  ResolveDisputeDTO,
  ApplyBackChargeDTO,
  BackChargeFilters,
} from '@/types/punch-list-back-charge';

// Using extended Database types for tables not yet in generated types
const db: any = supabase;

// ============================================================================
// BACK-CHARGES CRUD
// ============================================================================

export const punchListBackChargesApi = {
  /**
   * Get all back-charges with filters
   */
  async getBackCharges(filters: BackChargeFilters): Promise<PunchItemBackChargeDetailed[]> {
    let query = db
      .from('punch_item_back_charges_detailed')
      .select('*')
      .eq('project_id', filters.projectId)
      .order('back_charge_number', { ascending: false });

    if (filters.punchItemId) {
      query = query.eq('punch_item_id', filters.punchItemId);
    }
    if (filters.subcontractorId) {
      query = query.eq('subcontractor_id', filters.subcontractorId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.reason) {
      query = query.eq('reason', filters.reason);
    }
    if (filters.startDate) {
      query = query.gte('date_initiated', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('date_initiated', filters.endDate);
    }
    if (filters.minAmount) {
      query = query.gte('total_amount', filters.minAmount);
    }
    if (filters.maxAmount) {
      query = query.lte('total_amount', filters.maxAmount);
    }

    const { data, error } = await query;

    if (error) {
      // View might not exist, fall back to base table with joins
      return this.getBackChargesWithJoin(filters);
    }

    return data || [];
  },

  /**
   * Fallback method using explicit joins
   */
  async getBackChargesWithJoin(filters: BackChargeFilters): Promise<PunchItemBackChargeDetailed[]> {
    let query = db
      .from('punch_item_back_charges')
      .select(`
        *,
        punch_items!inner(number, title, trade, building, floor, room, status),
        subcontractors(name),
        cost_codes(name, division),
        initiated_by_user:users!punch_item_back_charges_initiated_by_fkey(full_name),
        approved_by_user:users!punch_item_back_charges_approved_by_fkey(full_name)
      `)
      .eq('project_id', filters.projectId)
      .is('deleted_at', null)
      .order('back_charge_number', { ascending: false });

    if (filters.punchItemId) {
      query = query.eq('punch_item_id', filters.punchItemId);
    }
    if (filters.subcontractorId) {
      query = query.eq('subcontractor_id', filters.subcontractorId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.reason) {
      query = query.eq('reason', filters.reason);
    }

    const { data, error } = await query;

    if (error) {
      throw new ApiErrorClass(error.message, 'FETCH_ERROR');
    }

    // Transform to PunchItemBackChargeDetailed
    return (data || []).map((item: any) => ({
      ...item,
      punch_number: item.punch_items?.number,
      punch_title: item.punch_items?.title,
      punch_trade: item.punch_items?.trade,
      building: item.punch_items?.building,
      floor: item.punch_items?.floor,
      room: item.punch_items?.room,
      punch_status: item.punch_items?.status,
      subcontractor_display_name: item.subcontractors?.name || item.subcontractor_name,
      cost_code_name: item.cost_codes?.name,
      cost_code_division: item.cost_codes?.division,
      initiated_by_name: item.initiated_by_user?.full_name,
      approved_by_name: item.approved_by_user?.full_name,
    }));
  },

  /**
   * Get a single back-charge by ID
   */
  async getBackCharge(id: string): Promise<PunchItemBackChargeDetailed> {
    const { data, error } = await db
      .from('punch_item_back_charges')
      .select(`
        *,
        punch_items!inner(number, title, trade, building, floor, room, status),
        subcontractors(name),
        cost_codes(name, division),
        initiated_by_user:users!punch_item_back_charges_initiated_by_fkey(full_name),
        approved_by_user:users!punch_item_back_charges_approved_by_fkey(full_name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      throw new ApiErrorClass(error.message, 'FETCH_ERROR');
    }

    const item = data as any;
    return {
      ...item,
      punch_number: item.punch_items?.number,
      punch_title: item.punch_items?.title,
      punch_trade: item.punch_items?.trade,
      building: item.punch_items?.building,
      floor: item.punch_items?.floor,
      room: item.punch_items?.room,
      punch_status: item.punch_items?.status,
      subcontractor_display_name: item.subcontractors?.name || item.subcontractor_name,
      cost_code_name: item.cost_codes?.name,
      cost_code_division: item.cost_codes?.division,
      initiated_by_name: item.initiated_by_user?.full_name,
      approved_by_name: item.approved_by_user?.full_name,
    };
  },

  /**
   * Get back-charges for a specific punch item
   */
  async getBackChargesForPunchItem(punchItemId: string): Promise<PunchItemBackCharge[]> {
    const { data, error } = await db.rpc('get_punch_item_back_charges', {
      p_punch_item_id: punchItemId,
    });

    if (error) {
      throw new ApiErrorClass(error.message, 'FETCH_ERROR');
    }

    return data || [];
  },

  /**
   * Create a new back-charge
   */
  async createBackCharge(dto: CreateBackChargeDTO): Promise<PunchItemBackCharge> {
    const { data: user } = await supabase.auth.getUser();

    // Get next back charge number
    const { data: numberData } = await db.rpc('get_next_back_charge_number', {
      p_project_id: dto.project_id,
    });

    const backChargeNumber = numberData || 1;

    const { data, error } = await db
      .from('punch_item_back_charges')
      .insert({
        punch_item_id: dto.punch_item_id,
        project_id: dto.project_id,
        company_id: dto.company_id,
        back_charge_number: backChargeNumber,
        subcontractor_id: dto.subcontractor_id || null,
        subcontractor_name: dto.subcontractor_name || null,
        reason: dto.reason,
        reason_other: dto.reason_other || null,
        description: dto.description || null,
        cost_code_id: dto.cost_code_id || null,
        cost_code: dto.cost_code || null,
        labor_hours: dto.labor_hours || 0,
        labor_rate: dto.labor_rate || 0,
        labor_amount: dto.labor_amount || 0,
        material_amount: dto.material_amount || 0,
        equipment_amount: dto.equipment_amount || 0,
        subcontract_amount: dto.subcontract_amount || 0,
        other_amount: dto.other_amount || 0,
        markup_percent: dto.markup_percent || 0,
        attachments: dto.attachments || [],
        status: 'initiated',
        initiated_by: user?.user?.id || null,
        created_by: user?.user?.id || null,
      })
      .select()
      .single();

    if (error) {
      throw new ApiErrorClass(error.message, 'CREATE_ERROR');
    }

    return data;
  },

  /**
   * Update a back-charge
   */
  async updateBackCharge(id: string, dto: UpdateBackChargeDTO): Promise<PunchItemBackCharge> {
    const { data, error } = await db
      .from('punch_item_back_charges')
      .update({
        ...(dto.subcontractor_id !== undefined && { subcontractor_id: dto.subcontractor_id }),
        ...(dto.subcontractor_name !== undefined && { subcontractor_name: dto.subcontractor_name }),
        ...(dto.reason !== undefined && { reason: dto.reason }),
        ...(dto.reason_other !== undefined && { reason_other: dto.reason_other }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.cost_code_id !== undefined && { cost_code_id: dto.cost_code_id }),
        ...(dto.cost_code !== undefined && { cost_code: dto.cost_code }),
        ...(dto.labor_hours !== undefined && { labor_hours: dto.labor_hours }),
        ...(dto.labor_rate !== undefined && { labor_rate: dto.labor_rate }),
        ...(dto.labor_amount !== undefined && { labor_amount: dto.labor_amount }),
        ...(dto.material_amount !== undefined && { material_amount: dto.material_amount }),
        ...(dto.equipment_amount !== undefined && { equipment_amount: dto.equipment_amount }),
        ...(dto.subcontract_amount !== undefined && { subcontract_amount: dto.subcontract_amount }),
        ...(dto.other_amount !== undefined && { other_amount: dto.other_amount }),
        ...(dto.markup_percent !== undefined && { markup_percent: dto.markup_percent }),
        ...(dto.attachments !== undefined && { attachments: dto.attachments }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.approval_notes !== undefined && { approval_notes: dto.approval_notes }),
        ...(dto.dispute_reason !== undefined && { dispute_reason: dto.dispute_reason }),
        ...(dto.dispute_response !== undefined && { dispute_response: dto.dispute_response }),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new ApiErrorClass(error.message, 'UPDATE_ERROR');
    }

    return data;
  },

  /**
   * Soft delete a back-charge
   */
  async deleteBackCharge(id: string): Promise<void> {
    const { error } = await db
      .from('punch_item_back_charges')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      throw new ApiErrorClass(error.message, 'DELETE_ERROR');
    }
  },

  // ============================================================================
  // WORKFLOW TRANSITIONS
  // ============================================================================

  /**
   * Submit for estimation complete
   */
  async markEstimated(id: string): Promise<PunchItemBackCharge> {
    return this.updateBackCharge(id, { status: 'estimated' });
  },

  /**
   * Submit for approval
   */
  async submitForApproval(id: string): Promise<PunchItemBackCharge> {
    return this.updateBackCharge(id, { status: 'pending_approval' });
  },

  /**
   * Approve back-charge
   */
  async approveBackCharge(id: string, dto: ApproveBackChargeDTO = {}): Promise<PunchItemBackCharge> {
    const { data: user } = await supabase.auth.getUser();

    const { data, error } = await db
      .from('punch_item_back_charges')
      .update({
        status: 'approved',
        approval_notes: dto.approval_notes || null,
        approved_by: user?.user?.id || null,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new ApiErrorClass(error.message, 'UPDATE_ERROR');
    }

    return data;
  },

  /**
   * Send to subcontractor
   */
  async sendToSubcontractor(id: string): Promise<PunchItemBackCharge> {
    const { data, error } = await db
      .from('punch_item_back_charges')
      .update({
        status: 'sent_to_sub',
        date_sent_to_sub: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new ApiErrorClass(error.message, 'UPDATE_ERROR');
    }

    return data;
  },

  /**
   * Mark as disputed
   */
  async disputeBackCharge(id: string, dto: DisputeBackChargeDTO): Promise<PunchItemBackCharge> {
    const { data, error } = await db
      .from('punch_item_back_charges')
      .update({
        status: 'disputed',
        dispute_reason: dto.dispute_reason,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new ApiErrorClass(error.message, 'UPDATE_ERROR');
    }

    return data;
  },

  /**
   * Resolve dispute
   */
  async resolveDispute(id: string, dto: ResolveDisputeDTO): Promise<PunchItemBackCharge> {
    const { data: user } = await supabase.auth.getUser();

    const updateData: any = {
      status: 'resolved',
      dispute_response: dto.dispute_response,
      dispute_resolved_by: user?.user?.id || null,
      dispute_resolved_at: new Date().toISOString(),
    };

    // If amount was adjusted, update cost fields
    if (dto.adjusted_amount !== undefined) {
      updateData.other_amount = dto.adjusted_amount;
      // Total will be recalculated by trigger
    }

    const { data, error } = await db
      .from('punch_item_back_charges')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new ApiErrorClass(error.message, 'UPDATE_ERROR');
    }

    return data;
  },

  /**
   * Apply to payment/invoice
   */
  async applyToPayment(id: string, dto: ApplyBackChargeDTO = {}): Promise<PunchItemBackCharge> {
    const { data: user } = await supabase.auth.getUser();

    const { data, error } = await db
      .from('punch_item_back_charges')
      .update({
        status: 'applied',
        applied_to_invoice_id: dto.applied_to_invoice_id || null,
        applied_at: new Date().toISOString(),
        applied_by: user?.user?.id || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new ApiErrorClass(error.message, 'UPDATE_ERROR');
    }

    return data;
  },

  /**
   * Void back-charge
   */
  async voidBackCharge(id: string, reason?: string): Promise<PunchItemBackCharge> {
    const { data, error } = await db
      .from('punch_item_back_charges')
      .update({
        status: 'voided',
        approval_notes: reason || 'Voided',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new ApiErrorClass(error.message, 'UPDATE_ERROR');
    }

    return data;
  },

  // ============================================================================
  // HISTORY
  // ============================================================================

  /**
   * Get history for a back-charge
   */
  async getBackChargeHistory(backChargeId: string): Promise<PunchItemBackChargeHistory[]> {
    const { data, error } = await db
      .from('punch_item_back_charge_history')
      .select(`
        *,
        changed_by_user:users!punch_item_back_charge_history_changed_by_fkey(full_name, email)
      `)
      .eq('back_charge_id', backChargeId)
      .order('changed_at', { ascending: false });

    if (error) {
      throw new ApiErrorClass(error.message, 'FETCH_ERROR');
    }

    return (data || []).map((item: any) => ({
      ...item,
      changed_by_user: item.changed_by_user,
    }));
  },

  // ============================================================================
  // SUMMARIES & STATISTICS
  // ============================================================================

  /**
   * Get back-charges summary by subcontractor
   */
  async getBackChargesBySubcontractor(projectId: string): Promise<BackChargesBySubcontractor[]> {
    const { data, error } = await db
      .from('back_charges_by_subcontractor')
      .select('*')
      .eq('project_id', projectId);

    if (error) {
      throw new ApiErrorClass(error.message, 'FETCH_ERROR');
    }

    return data || [];
  },

  /**
   * Get back-charges summary by project
   */
  async getBackChargesByProject(projectId: string): Promise<BackChargesByProject | null> {
    const { data, error } = await db
      .from('back_charges_by_project')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new ApiErrorClass(error.message, 'FETCH_ERROR');
    }

    return data || null;
  },

  /**
   * Get project back-charge statistics
   */
  async getProjectBackChargeStats(projectId: string): Promise<ProjectBackChargeStats | null> {
    const { data, error } = await db.rpc('get_project_back_charge_stats', {
      p_project_id: projectId,
    });

    if (error) {
      throw new ApiErrorClass(error.message, 'FETCH_ERROR');
    }

    if (!data || data.length === 0) {
      return null;
    }

    return data[0];
  },
};

// Export as default
export default punchListBackChargesApi;
