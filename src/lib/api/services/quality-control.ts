/**
 * Quality Control API Service
 *
 * API service for managing Non-Conformance Reports (NCRs) and QC Inspections.
 * Provides CRUD operations, status workflow transitions, and summary/statistics functions.
 */

import { supabase } from '@/lib/supabase';
import { ApiErrorClass } from '../errors';

import type {
  NonConformanceReport,
  NCRWithDetails,
  NCRHistory,
  QCInspection,
  QCInspectionWithDetails,
  QCChecklistItem,
  CreateNCRDTO,
  UpdateNCRDTO,
  CreateInspectionDTO,
  UpdateInspectionDTO,
  NCRFilters,
  InspectionFilters,
  NCRStatus,
  NCRSummaryByStatus,
  NCRSummaryBySeverity,
  ProjectQCStats,
} from '@/types/quality-control';

// Using extended Database types for tables not yet in generated types
const db: any = supabase;

// ============================================================================
// NON-CONFORMANCE REPORTS (NCR) CRUD
// ============================================================================

export const qualityControlApi = {
  ncr: {
    /**
     * Get all NCRs with filters
     */
    async getNCRs(filters: NCRFilters): Promise<NCRWithDetails[]> {
      let query = db
        .from('non_conformance_reports')
        .select(`
          *,
          responsible_subcontractor:subcontractors(id, company_name),
          responsible_user:users!non_conformance_reports_responsible_user_id_fkey(id, full_name, email),
          created_by_user:users!non_conformance_reports_created_by_fkey(id, full_name),
          corrective_action_by_user:users!non_conformance_reports_corrective_action_by_fkey(id, full_name),
          verified_by_user:users!non_conformance_reports_verified_by_fkey(id, full_name)
        `)
        .eq('project_id', filters.projectId)
        .is('deleted_at', null)
        .order('ncr_number', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.responsibleSubcontractorId) {
        query = query.eq('responsible_subcontractor_id', filters.responsibleSubcontractorId);
      }
      if (filters.responsiblePartyId) {
        query = query.eq('responsible_subcontractor_id', filters.responsiblePartyId);
      }
      if (filters.specSection) {
        query = query.ilike('spec_section', `%${filters.specSection}%`);
      }
      if (filters.startDate || filters.dateFrom) {
        query = query.gte('date_identified', filters.startDate || filters.dateFrom);
      }
      if (filters.endDate || filters.dateTo) {
        query = query.lte('date_identified', filters.endDate || filters.dateTo);
      }
      const searchTerm = filters.searchTerm || filters.search;
      if (searchTerm) {
        query = query.or(
          `title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,ncr_number.eq.${parseInt(searchTerm) || 0}`
        );
      }

      const { data, error } = await query;

      if (error) {
        throw new ApiErrorClass(error.message, 'FETCH_ERROR');
      }

      return (data || []).map((item: any) => ({
        ...item,
        responsible_party_name: item.responsible_subcontractor?.company_name,
        assigned_to_name: item.responsible_user?.full_name,
        assigned_to_email: item.responsible_user?.email,
        created_by_name: item.created_by_user?.full_name,
        due_date: item.corrective_action_due_date,
      }));
    },

    /**
     * Get a single NCR by ID with full details
     */
    async getNCR(id: string): Promise<NCRWithDetails> {
      const { data, error } = await db
        .from('non_conformance_reports')
        .select(`
          *,
          responsible_subcontractor:subcontractors(id, company_name),
          responsible_user:users!non_conformance_reports_responsible_user_id_fkey(id, full_name, email),
          created_by_user:users!non_conformance_reports_created_by_fkey(id, full_name),
          corrective_action_by_user:users!non_conformance_reports_corrective_action_by_fkey(id, full_name),
          verified_by_user:users!non_conformance_reports_verified_by_fkey(id, full_name)
        `)
        .eq('id', id)
        .single();

      if (error) {
        throw new ApiErrorClass(error.message, 'FETCH_ERROR');
      }

      return {
        ...data,
        responsible_party_name: data.responsible_subcontractor?.company_name,
        assigned_to_name: data.responsible_user?.full_name,
        assigned_to_email: data.responsible_user?.email,
        created_by_name: data.created_by_user?.full_name,
        due_date: data.corrective_action_due_date,
      };
    },

    /**
     * Create a new NCR
     * Fields aligned with migration 155_quality_control_module.sql
     */
    async createNCR(dto: CreateNCRDTO): Promise<NonConformanceReport> {
      const { data: user } = await supabase.auth.getUser();

      // NCR number is auto-generated by trigger
      const { data, error } = await db
        .from('non_conformance_reports')
        .insert({
          project_id: dto.project_id,
          company_id: dto.company_id,
          title: dto.title,
          description: dto.description || null,
          category: dto.category || null,
          severity: dto.severity || 'minor',
          ncr_type: dto.ncr_type || 'internal',
          location: dto.location || null,
          spec_section: dto.spec_section || null,
          drawing_reference: dto.drawing_reference || null,
          cost_code_id: dto.cost_code_id || null,
          responsible_party_type: dto.responsible_party_type || null,
          responsible_subcontractor_id: dto.responsible_subcontractor_id || null,
          responsible_user_id: dto.responsible_user_id || null,
          priority: dto.priority || 'normal',
          date_identified: dto.date_identified || new Date().toISOString().split('T')[0],
          photo_urls: dto.photo_urls || [],
          status: 'open',
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
     * Update an NCR
     * Fields aligned with migration 155_quality_control_module.sql
     */
    async updateNCR(id: string, dto: UpdateNCRDTO): Promise<NonConformanceReport> {
      const updateData: Record<string, any> = { updated_at: new Date().toISOString() };

      // Map DTO fields to update data - aligned with database schema
      if (dto.title !== undefined) {updateData.title = dto.title;}
      if (dto.description !== undefined) {updateData.description = dto.description;}
      if (dto.category !== undefined) {updateData.category = dto.category;}
      if (dto.severity !== undefined) {updateData.severity = dto.severity;}
      if (dto.location !== undefined) {updateData.location = dto.location;}
      if (dto.spec_section !== undefined) {updateData.spec_section = dto.spec_section;}
      if (dto.drawing_reference !== undefined) {updateData.drawing_reference = dto.drawing_reference;}
      if (dto.cost_code_id !== undefined) {updateData.cost_code_id = dto.cost_code_id;}
      if (dto.responsible_party_type !== undefined) {updateData.responsible_party_type = dto.responsible_party_type;}
      if (dto.responsible_subcontractor_id !== undefined) {updateData.responsible_subcontractor_id = dto.responsible_subcontractor_id;}
      if (dto.responsible_user_id !== undefined) {updateData.responsible_user_id = dto.responsible_user_id;}
      if (dto.status !== undefined) {updateData.status = dto.status;}
      if (dto.priority !== undefined) {updateData.priority = dto.priority;}
      if (dto.root_cause_category !== undefined) {updateData.root_cause_category = dto.root_cause_category;}
      if (dto.root_cause_description !== undefined) {updateData.root_cause_description = dto.root_cause_description;}
      if (dto.five_whys_analysis !== undefined) {updateData.five_whys_analysis = dto.five_whys_analysis;}
      if (dto.corrective_action !== undefined) {updateData.corrective_action = dto.corrective_action;}
      if (dto.corrective_action_due_date !== undefined) {updateData.corrective_action_due_date = dto.corrective_action_due_date;}
      if (dto.preventive_action !== undefined) {updateData.preventive_action = dto.preventive_action;}
      if (dto.disposition !== undefined) {updateData.disposition = dto.disposition;}
      if (dto.disposition_notes !== undefined) {updateData.disposition_notes = dto.disposition_notes;}
      if (dto.cost_impact !== undefined) {updateData.cost_impact = dto.cost_impact;}
      if (dto.cost_impact_amount !== undefined) {updateData.cost_impact_amount = dto.cost_impact_amount;}
      if (dto.schedule_impact !== undefined) {updateData.schedule_impact = dto.schedule_impact;}
      if (dto.schedule_impact_days !== undefined) {updateData.schedule_impact_days = dto.schedule_impact_days;}
      if (dto.safety_impact !== undefined) {updateData.safety_impact = dto.safety_impact;}
      if (dto.photo_urls !== undefined) {updateData.photo_urls = dto.photo_urls;}
      if (dto.document_urls !== undefined) {updateData.document_urls = dto.document_urls;}

      const { data, error } = await db
        .from('non_conformance_reports')
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
     * Soft delete an NCR
     */
    async deleteNCR(id: string): Promise<void> {
      const { error } = await db
        .from('non_conformance_reports')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        throw new ApiErrorClass(error.message, 'DELETE_ERROR');
      }
    },

    // ============================================================================
    // NCR WORKFLOW TRANSITIONS
    // ============================================================================

    /**
     * Transition NCR to a new status
     * Status values: open, under_review, corrective_action, verification, resolved, closed, voided
     */
    async transitionStatus(id: string, newStatus: NCRStatus | string, notes?: string): Promise<NonConformanceReport> {
      const { data: user } = await supabase.auth.getUser();
      const updateData: Record<string, any> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      // Handle status-specific fields
      if (newStatus === 'closed' || newStatus === 'resolved') {
        updateData.date_closed = new Date().toISOString().split('T')[0];
      }

      if (newStatus === 'verification') {
        updateData.verified_by = user?.user?.id || null;
        updateData.verified_at = new Date().toISOString();
      }

      if (notes) {
        updateData.verification_notes = notes;
      }

      const { data, error } = await db
        .from('non_conformance_reports')
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
     * Start review on NCR (under_review)
     */
    async startReview(id: string): Promise<NonConformanceReport> {
      return this.transitionStatus(id, 'under_review');
    },

    /**
     * Start investigation on NCR (alias for startReview)
     */
    async startInvestigation(id: string): Promise<NonConformanceReport> {
      return this.transitionStatus(id, 'under_review');
    },

    /**
     * Mark corrective action in progress
     */
    async startCorrectiveAction(id: string, action: string): Promise<NonConformanceReport> {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await db
        .from('non_conformance_reports')
        .update({
          status: 'corrective_action',
          corrective_action: action,
          corrective_action_by: user?.user?.id || null,
          updated_at: new Date().toISOString(),
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
     * Submit NCR for verification
     */
    async submitForVerification(id: string): Promise<NonConformanceReport> {
      return this.transitionStatus(id, 'verification');
    },

    /**
     * Resolve NCR after verification
     */
    async resolveNCR(id: string, notes?: string): Promise<NonConformanceReport> {
      return this.transitionStatus(id, 'resolved', notes);
    },

    /**
     * Verify and close NCR (marks as resolved/verified)
     */
    async verifyAndClose(id: string, notes?: string): Promise<NonConformanceReport> {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await db
        .from('non_conformance_reports')
        .update({
          status: 'resolved',
          verified_by: user?.user?.id || null,
          verified_at: new Date().toISOString(),
          verification_notes: notes || null,
          updated_at: new Date().toISOString(),
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
     * Close NCR
     */
    async closeNCR(id: string, disposition?: string): Promise<NonConformanceReport> {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await db
        .from('non_conformance_reports')
        .update({
          status: 'closed',
          disposition: disposition || null,
          date_closed: new Date().toISOString().split('T')[0],
          closed_by: user?.user?.id || null,
          updated_at: new Date().toISOString(),
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
     * Reopen a closed NCR
     */
    async reopenNCR(id: string, reason?: string): Promise<NonConformanceReport> {
      const updateData: Record<string, any> = {
        status: 'open',
        date_closed: null,
        closed_by: null,
        updated_at: new Date().toISOString(),
      };

      if (reason) {
        const { data: current } = await db
          .from('non_conformance_reports')
          .select('corrective_action')
          .eq('id', id)
          .single();

        const existingNotes = current?.corrective_action || '';
        updateData.corrective_action = existingNotes
          ? `${existingNotes}\n\n[REOPENED ${new Date().toISOString()}] ${reason}`
          : `[REOPENED] ${reason}`;
      }

      const { data, error } = await db
        .from('non_conformance_reports')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new ApiErrorClass(error.message, 'UPDATE_ERROR');
      }

      return data;
    },

    // ============================================================================
    // NCR HISTORY
    // ============================================================================

    /**
     * Get history for an NCR
     */
    async getNCRHistory(ncrId: string): Promise<NCRHistory[]> {
      const { data, error } = await db
        .from('ncr_history')
        .select(`
          *,
          changed_by_user:users!ncr_history_changed_by_fkey(full_name, email)
        `)
        .eq('ncr_id', ncrId)
        .order('changed_at', { ascending: false });

      if (error) {
        throw new ApiErrorClass(error.message, 'FETCH_ERROR');
      }

      return (data || []).map((item: any) => ({
        ...item,
        changed_by_name: item.changed_by_user?.full_name,
        changed_by_email: item.changed_by_user?.email,
      }));
    },
  },

  // ============================================================================
  // QC INSPECTIONS CRUD
  // ============================================================================

  inspections: {
    /**
     * Get all inspections with filters
     */
    async getInspections(filters: InspectionFilters): Promise<QCInspectionWithDetails[]> {
      let query = db
        .from('qc_inspections')
        .select(`
          *,
          inspector_user:users!qc_inspections_inspector_id_fkey(id, full_name, email),
          subcontractor:subcontractors(id, name),
          created_by_user:users!qc_inspections_created_by_fkey(id, full_name)
        `)
        .eq('project_id', filters.projectId)
        .is('deleted_at', null)
        .order('inspection_date', { ascending: false });

      if (filters.inspectionType) {
        query = query.eq('inspection_type', filters.inspectionType);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.result) {
        query = query.eq('result', filters.result);
      }
      if (filters.inspectorId) {
        query = query.eq('inspector_id', filters.inspectorId);
      }
      if (filters.subcontractorId) {
        query = query.eq('subcontractor_id', filters.subcontractorId);
      }
      if (filters.startDate) {
        query = query.gte('inspection_date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('inspection_date', filters.endDate);
      }
      if (filters.searchTerm) {
        query = query.or(
          `title.ilike.%${filters.searchTerm}%,location.ilike.%${filters.searchTerm}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        throw new ApiErrorClass(error.message, 'FETCH_ERROR');
      }

      return (data || []).map((item: any) => ({
        ...item,
        inspector_name: item.inspector_user?.full_name,
        inspector_email: item.inspector_user?.email,
        subcontractor_name: item.subcontractor?.name,
        created_by_name: item.created_by_user?.full_name,
      }));
    },

    /**
     * Get a single inspection by ID with full details
     */
    async getInspection(id: string): Promise<QCInspectionWithDetails> {
      const { data, error } = await db
        .from('qc_inspections')
        .select(`
          *,
          inspector_user:users!qc_inspections_inspector_id_fkey(id, full_name, email),
          subcontractor:subcontractors(id, name),
          created_by_user:users!qc_inspections_created_by_fkey(id, full_name)
        `)
        .eq('id', id)
        .single();

      if (error) {
        throw new ApiErrorClass(error.message, 'FETCH_ERROR');
      }

      return {
        ...data,
        inspector_name: data.inspector_user?.full_name,
        inspector_email: data.inspector_user?.email,
        subcontractor_name: data.subcontractor?.name,
        created_by_name: data.created_by_user?.full_name,
      };
    },

    /**
     * Get checklist items for an inspection
     */
    async getChecklistItems(inspectionId: string): Promise<QCChecklistItem[]> {
      const { data, error } = await db
        .from('qc_checklist_items')
        .select('*')
        .eq('inspection_id', inspectionId)
        .order('sort_order', { ascending: true });

      if (error) {
        throw new ApiErrorClass(error.message, 'FETCH_ERROR');
      }

      return data || [];
    },

    /**
     * Create a new inspection
     * Fields aligned with migration 155_quality_control_module.sql
     */
    async createInspection(dto: CreateInspectionDTO): Promise<QCInspection> {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await db
        .from('qc_inspections')
        .insert({
          project_id: dto.project_id,
          company_id: dto.company_id,
          inspection_type: dto.inspection_type,
          title: dto.title,
          description: dto.description || null,
          category: dto.category || null,
          location: dto.location || null,
          spec_section: dto.spec_section || null,
          drawing_reference: dto.drawing_reference || null,
          cost_code_id: dto.cost_code_id || null,
          daily_report_id: dto.daily_report_id || null,
          inspector_id: dto.inspector_id || user?.user?.id || null,
          witness_required: dto.witness_required || false,
          witness_id: dto.witness_id || null,
          checklist_template_id: dto.checklist_template_id || null,
          inspection_date: dto.inspection_date || new Date().toISOString().split('T')[0],
          photo_urls: dto.photo_urls || [],
          status: 'pending',
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
     * Update an inspection
     * Fields aligned with migration 155_quality_control_module.sql
     */
    async updateInspection(id: string, dto: UpdateInspectionDTO): Promise<QCInspection> {
      const updateData: Record<string, any> = { updated_at: new Date().toISOString() };

      if (dto.title !== undefined) {updateData.title = dto.title;}
      if (dto.description !== undefined) {updateData.description = dto.description;}
      if (dto.inspection_type !== undefined) {updateData.inspection_type = dto.inspection_type;}
      if (dto.category !== undefined) {updateData.category = dto.category;}
      if (dto.location !== undefined) {updateData.location = dto.location;}
      if (dto.spec_section !== undefined) {updateData.spec_section = dto.spec_section;}
      if (dto.drawing_reference !== undefined) {updateData.drawing_reference = dto.drawing_reference;}
      if (dto.cost_code_id !== undefined) {updateData.cost_code_id = dto.cost_code_id;}
      if (dto.inspector_id !== undefined) {updateData.inspector_id = dto.inspector_id;}
      if (dto.witness_required !== undefined) {updateData.witness_required = dto.witness_required;}
      if (dto.witness_id !== undefined) {updateData.witness_id = dto.witness_id;}
      if (dto.inspection_date !== undefined) {updateData.inspection_date = dto.inspection_date;}
      if (dto.status !== undefined) {updateData.status = dto.status;}
      if (dto.pass_fail_items !== undefined) {updateData.pass_fail_items = dto.pass_fail_items;}
      if (dto.overall_result !== undefined) {updateData.overall_result = dto.overall_result;}
      if (dto.ncr_required !== undefined) {updateData.ncr_required = dto.ncr_required;}
      if (dto.ncr_id !== undefined) {updateData.ncr_id = dto.ncr_id;}
      if (dto.reinspection_required !== undefined) {updateData.reinspection_required = dto.reinspection_required;}
      if (dto.reinspection_date !== undefined) {updateData.reinspection_date = dto.reinspection_date;}
      if (dto.notes !== undefined) {updateData.notes = dto.notes;}
      if (dto.photo_urls !== undefined) {updateData.photo_urls = dto.photo_urls;}
      if (dto.document_urls !== undefined) {updateData.document_urls = dto.document_urls;}

      const { data, error } = await db
        .from('qc_inspections')
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
     * Soft delete an inspection
     */
    async deleteInspection(id: string): Promise<void> {
      const { error } = await db
        .from('qc_inspections')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        throw new ApiErrorClass(error.message, 'DELETE_ERROR');
      }
    },

    // ============================================================================
    // INSPECTION WORKFLOW
    // ============================================================================

    /**
     * Start an inspection
     */
    async startInspection(id: string): Promise<QCInspection> {
      const { data, error } = await db
        .from('qc_inspections')
        .update({
          status: 'in_progress',
          inspection_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
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
     * Complete an inspection with result
     * Status values: pending, in_progress, passed, failed, conditional
     * Overall result: pass, fail, conditional
     */
    async completeInspection(
      id: string,
      result: 'pass' | 'fail' | 'conditional',
      notes?: string
    ): Promise<QCInspection> {
      // Map result to status
      const statusMap: Record<string, string> = {
        pass: 'passed',
        fail: 'failed',
        conditional: 'conditional',
      };

      const { data: _user } = await supabase.auth.getUser();
      const { data, error } = await db
        .from('qc_inspections')
        .update({
          status: statusMap[result] || 'passed',
          overall_result: result,
          notes: notes || null,
          inspector_signed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
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
     * Mark inspection as failed (shorthand for completeInspection with fail)
     */
    async failInspection(id: string, notes?: string, ncrRequired?: boolean): Promise<QCInspection> {
      const { data, error } = await db
        .from('qc_inspections')
        .update({
          status: 'failed',
          overall_result: 'fail',
          ncr_required: ncrRequired ?? true,
          notes: notes || null,
          updated_at: new Date().toISOString(),
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
     * Cancel an inspection
     */
    async cancelInspection(id: string, reason?: string): Promise<QCInspection> {
      const { data, error } = await db
        .from('qc_inspections')
        .update({
          status: 'cancelled',
          notes: reason || null,
          updated_at: new Date().toISOString(),
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
    // CHECKLIST ITEMS
    // ============================================================================

    /**
     * Update a checklist item
     */
    async updateChecklistItem(
      id: string,
      result: 'pending' | 'pass' | 'fail' | 'na',
      notes?: string
    ): Promise<QCChecklistItem> {
      const { data, error } = await db
        .from('qc_checklist_items')
        .update({
          result,
          notes: notes || null,
          updated_at: new Date().toISOString(),
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
     * Batch update checklist items
     */
    async batchUpdateChecklistItems(
      updates: Array<{ id: string; status: 'pending' | 'pass' | 'fail' | 'na'; notes?: string }>
    ): Promise<QCChecklistItem[]> {
      const results: QCChecklistItem[] = [];

      for (const update of updates) {
        const result = await this.updateChecklistItem(update.id, update.status, update.notes);
        results.push(result);
      }

      return results;
    },
  },

  // ============================================================================
  // STATISTICS & SUMMARIES
  // ============================================================================

  stats: {
    /**
     * Get NCR summary by status for a project
     */
    async getNCRSummaryByStatus(projectId: string): Promise<NCRSummaryByStatus[]> {
      const { data, error } = await db
        .from('ncr_summary_by_status')
        .select('*')
        .eq('project_id', projectId);

      if (error) {
        // View might not exist, calculate manually
        return this.calculateNCRSummaryByStatus(projectId);
      }

      return data || [];
    },

    /**
     * Calculate NCR summary by status (fallback)
     */
    async calculateNCRSummaryByStatus(projectId: string): Promise<NCRSummaryByStatus[]> {
      const { data, error } = await db
        .from('non_conformance_reports')
        .select('status')
        .eq('project_id', projectId)
        .is('deleted_at', null);

      if (error) {
        throw new ApiErrorClass(error.message, 'FETCH_ERROR');
      }

      const counts: Record<string, number> = {};
      (data || []).forEach((item: any) => {
        counts[item.status] = (counts[item.status] || 0) + 1;
      });

      return Object.entries(counts).map(([status, count]) => ({
        project_id: projectId,
        status: status as NCRStatus,
        count,
      }));
    },

    /**
     * Get NCR summary by severity for a project
     */
    async getNCRSummaryBySeverity(projectId: string): Promise<NCRSummaryBySeverity[]> {
      const { data, error } = await db
        .from('ncr_summary_by_severity')
        .select('*')
        .eq('project_id', projectId);

      if (error) {
        // View might not exist, calculate manually
        return this.calculateNCRSummaryBySeverity(projectId);
      }

      return data || [];
    },

    /**
     * Calculate NCR summary by severity (fallback)
     */
    async calculateNCRSummaryBySeverity(projectId: string): Promise<NCRSummaryBySeverity[]> {
      const { data, error } = await db
        .from('non_conformance_reports')
        .select('severity')
        .eq('project_id', projectId)
        .is('deleted_at', null);

      if (error) {
        throw new ApiErrorClass(error.message, 'FETCH_ERROR');
      }

      const counts: Record<string, number> = {};
      (data || []).forEach((item: any) => {
        counts[item.severity] = (counts[item.severity] || 0) + 1;
      });

      return Object.entries(counts).map(([severity, count]) => ({
        project_id: projectId,
        severity: severity as any,
        count,
      }));
    },

    /**
     * Get comprehensive QC statistics for a project
     */
    async getProjectQCStats(projectId: string): Promise<ProjectQCStats> {
      // Get NCR counts
      const { data: ncrs, error: ncrError } = await db
        .from('non_conformance_reports')
        .select('id, status, severity, date_identified, date_closed')
        .eq('project_id', projectId)
        .is('deleted_at', null);

      if (ncrError) {
        throw new ApiErrorClass(ncrError.message, 'FETCH_ERROR');
      }

      // Get inspection counts
      const { data: inspections, error: inspError } = await db
        .from('qc_inspections')
        .select('id, status, result')
        .eq('project_id', projectId)
        .is('deleted_at', null);

      if (inspError) {
        throw new ApiErrorClass(inspError.message, 'FETCH_ERROR');
      }

      const ncrList = ncrs || [];
      const inspList = inspections || [];

      const openNCRs = ncrList.filter((n: any) => !['closed', 'verified'].includes(n.status));
      const criticalNCRs = ncrList.filter((n: any) => n.severity === 'critical' && !['closed', 'verified'].includes(n.status));
      const closedNCRs = ncrList.filter((n: any) => ['closed', 'verified'].includes(n.status));

      // Calculate average days to close
      const closedWithDates = closedNCRs.filter((n: any) => n.date_identified && n.date_closed);
      let avgDaysToClose = 0;
      if (closedWithDates.length > 0) {
        const totalDays = closedWithDates.reduce((sum: number, n: any) => {
          const start = new Date(n.date_identified);
          const end = new Date(n.date_closed);
          return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        }, 0);
        avgDaysToClose = Math.round(totalDays / closedWithDates.length);
      }

      const completedInspections = inspList.filter((i: any) => i.status === 'completed');
      const passedInspections = completedInspections.filter((i: any) => i.result === 'pass');
      const failedInspections = completedInspections.filter((i: any) => i.result === 'fail');

      const passRate = completedInspections.length > 0
        ? Math.round((passedInspections.length / completedInspections.length) * 100)
        : 0;

      return {
        project_id: projectId,
        total_ncrs: ncrList.length,
        open_ncrs: openNCRs.length,
        critical_ncrs: criticalNCRs.length,
        closed_ncrs: closedNCRs.length,
        avg_days_to_close: avgDaysToClose,
        total_inspections: inspList.length,
        completed_inspections: completedInspections.length,
        passed_inspections: passedInspections.length,
        failed_inspections: failedInspections.length,
        inspection_pass_rate: passRate,
      };
    },
  },
};

// Export as default
export default qualityControlApi;
