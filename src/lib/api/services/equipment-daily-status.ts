/**
 * Equipment Daily Status API Service
 * API service for equipment status tracking within daily reports
 * Aligned with migration 122_equipment_daily_status.sql
 */

import { supabase } from '@/lib/supabase';
import type {
  EquipmentDailyStatus,
  EquipmentDailyStatusWithEquipment,
  EquipmentChecklistTemplate,
  EquipmentMaintenanceAlert,
  EquipmentDailyStatusSummary,
  CreateEquipmentDailyStatusDTO,
  UpdateEquipmentDailyStatusDTO,
  CompleteChecklistDTO,
  CreateChecklistTemplateDTO,
  UpdateChecklistTemplateDTO,
  EquipmentDailyStatusFilters,
} from '@/types/equipment-daily-status';

// =============================================================================
// EQUIPMENT DAILY STATUS API
// =============================================================================

export const equipmentDailyStatusApi = {
  /**
   * Get equipment status records for a daily report
   */
  async getStatusByReport(dailyReportId: string): Promise<EquipmentDailyStatusWithEquipment[]> {
    const { data, error } = await supabase
      .from('equipment_daily_status')
      .select(`
        *,
        equipment:equipment(
          id,
          equipment_number,
          name,
          equipment_type,
          make,
          model,
          status,
          current_hours,
          hourly_cost,
          image_url
        )
      `)
      .eq('daily_report_id', dailyReportId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as EquipmentDailyStatusWithEquipment[];
  },

  /**
   * Get equipment status by ID
   */
  async getStatusById(id: string): Promise<EquipmentDailyStatusWithEquipment> {
    const { data, error } = await supabase
      .from('equipment_daily_status')
      .select(`
        *,
        equipment:equipment(
          id,
          equipment_number,
          name,
          equipment_type,
          make,
          model,
          status,
          current_hours,
          hourly_cost,
          image_url
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as EquipmentDailyStatusWithEquipment;
  },

  /**
   * Get equipment status records with filters
   */
  async getStatus(filters: EquipmentDailyStatusFilters): Promise<EquipmentDailyStatusWithEquipment[]> {
    let query = supabase
      .from('equipment_daily_status')
      .select(`
        *,
        equipment:equipment(
          id,
          equipment_number,
          name,
          equipment_type,
          make,
          model,
          status,
          current_hours,
          hourly_cost,
          image_url
        )
      `)
      .order('created_at', { ascending: true });

    if (filters.daily_report_id) {
      query = query.eq('daily_report_id', filters.daily_report_id);
    }

    if (filters.project_id) {
      query = query.eq('project_id', filters.project_id);
    }

    if (filters.equipment_id) {
      query = query.eq('equipment_id', filters.equipment_id);
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }

    if (filters.checklist_completed !== undefined) {
      query = query.eq('checklist_completed', filters.checklist_completed);
    }

    if (filters.requires_maintenance !== undefined) {
      query = query.eq('requires_maintenance', filters.requires_maintenance);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as EquipmentDailyStatusWithEquipment[];
  },

  /**
   * Create equipment daily status entry
   */
  async createStatus(dto: CreateEquipmentDailyStatusDTO): Promise<EquipmentDailyStatus> {
    const { data: user } = await supabase.auth.getUser();
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user?.user?.id)
      .single();

    if (!userData?.company_id) {
      throw new Error('User company not found');
    }

    const { data, error } = await supabase
      .from('equipment_daily_status')
      .insert({
        ...dto,
        company_id: userData.company_id,
        status: dto.status || 'not_checked',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update equipment daily status
   */
  async updateStatus(id: string, dto: UpdateEquipmentDailyStatusDTO): Promise<EquipmentDailyStatus> {
    const { data, error } = await supabase
      .from('equipment_daily_status')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Complete checklist for equipment
   */
  async completeChecklist(id: string, dto: CompleteChecklistDTO): Promise<EquipmentDailyStatus> {
    const { data: user } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('equipment_daily_status')
      .update({
        inspection_items: dto.inspection_items,
        status: dto.status,
        checklist_completed: true,
        checklist_completed_at: new Date().toISOString(),
        checklist_completed_by: user?.user?.id,
        issues_found: dto.issues_found || null,
        issue_severity: dto.issue_severity || null,
        requires_maintenance: dto.requires_maintenance || false,
        maintenance_notes: dto.maintenance_notes || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete equipment daily status entry
   */
  async deleteStatus(id: string): Promise<void> {
    const { error } = await supabase
      .from('equipment_daily_status')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Get summary for a daily report
   */
  async getSummary(dailyReportId: string): Promise<EquipmentDailyStatusSummary> {
    const { data, error } = await supabase.rpc('get_daily_report_equipment_summary', {
      p_daily_report_id: dailyReportId,
    });

    if (error) throw error;
    return data as EquipmentDailyStatusSummary;
  },

  /**
   * Copy equipment from previous day's report
   */
  async copyFromPreviousDay(dailyReportId: string, projectId: string): Promise<number> {
    const { data: user } = await supabase.auth.getUser();

    const { data, error } = await supabase.rpc('copy_equipment_from_previous_day', {
      p_daily_report_id: dailyReportId,
      p_project_id: projectId,
      p_user_id: user?.user?.id,
    });

    if (error) throw error;
    return data as number;
  },

  /**
   * Get maintenance alerts for a project
   */
  async getMaintenanceAlerts(projectId: string): Promise<EquipmentMaintenanceAlert[]> {
    const { data, error } = await supabase.rpc('get_equipment_maintenance_alerts', {
      p_project_id: projectId,
    });

    if (error) throw error;
    return (data || []) as EquipmentMaintenanceAlert[];
  },

  /**
   * Batch create equipment status entries for multiple equipment
   */
  async batchCreateStatus(
    dailyReportId: string,
    projectId: string,
    equipmentIds: string[]
  ): Promise<EquipmentDailyStatus[]> {
    const { data: user } = await supabase.auth.getUser();
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user?.user?.id)
      .single();

    if (!userData?.company_id) {
      throw new Error('User company not found');
    }

    const entries = equipmentIds.map((equipmentId) => ({
      equipment_id: equipmentId,
      daily_report_id: dailyReportId,
      project_id: projectId,
      company_id: userData.company_id,
      status: 'not_checked' as const,
    }));

    const { data, error } = await supabase
      .from('equipment_daily_status')
      .insert(entries)
      .select();

    if (error) throw error;
    return data;
  },
};

// =============================================================================
// EQUIPMENT CHECKLIST TEMPLATES API
// =============================================================================

export const equipmentChecklistTemplatesApi = {
  /**
   * Get all checklist templates for a company
   */
  async getTemplates(): Promise<EquipmentChecklistTemplate[]> {
    const { data, error } = await supabase
      .from('equipment_checklist_templates')
      .select('*')
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get template by ID
   */
  async getTemplateById(id: string): Promise<EquipmentChecklistTemplate> {
    const { data, error } = await supabase
      .from('equipment_checklist_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get template for a specific equipment type
   */
  async getTemplateForEquipmentType(
    equipmentType: string
  ): Promise<EquipmentChecklistTemplate | null> {
    // First try to find a template specific to this equipment type
    let { data } = await supabase
      .from('equipment_checklist_templates')
      .select('*')
      .eq('equipment_type', equipmentType)
      .eq('is_active', true)
      .limit(1)
      .single();

    // If not found, get the default template
    if (!data) {
      const { data: defaultTemplate } = await supabase
        .from('equipment_checklist_templates')
        .select('*')
        .is('equipment_type', null)
        .eq('is_default', true)
        .eq('is_active', true)
        .limit(1)
        .single();

      data = defaultTemplate;
    }

    return data || null;
  },

  /**
   * Create a new checklist template
   */
  async createTemplate(dto: CreateChecklistTemplateDTO): Promise<EquipmentChecklistTemplate> {
    const { data: user } = await supabase.auth.getUser();
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user?.user?.id)
      .single();

    if (!userData?.company_id) {
      throw new Error('User company not found');
    }

    const { data, error } = await supabase
      .from('equipment_checklist_templates')
      .insert({
        company_id: userData.company_id,
        name: dto.name,
        description: dto.description || null,
        equipment_type: dto.equipment_type || null,
        items: dto.items,
        is_default: dto.is_default || false,
        created_by: user?.user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update a checklist template
   */
  async updateTemplate(
    id: string,
    dto: UpdateChecklistTemplateDTO
  ): Promise<EquipmentChecklistTemplate> {
    const { data, error } = await supabase
      .from('equipment_checklist_templates')
      .update({
        ...dto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a checklist template
   */
  async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('equipment_checklist_templates')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  },
};

// =============================================================================
// COMBINED EXPORT
// =============================================================================

export const equipmentDailyStatusService = {
  status: equipmentDailyStatusApi,
  templates: equipmentChecklistTemplatesApi,
};
