/**
 * Remediation Tracking API Service
 * API service for tracking remediation of issues from inspections and checklists
 * Aligned with migration 123_inspection_punch_auto_link.sql
 */

import { supabase } from '@/lib/supabase';
import type {
  RemediationTracking,
  RemediationTrackingWithPunchItem,
  AutoLinkConfiguration,
  AutoLinkSettings,
  RemediationSourceType,
  RemediationStatus,
  CreatePunchFromInspectionDTO,
  CreatePunchFromChecklistDTO,
  UpdateRemediationStatusDTO,
  VerifyRemediationDTO,
  UpdateAutoLinkConfigDTO,
  RemediationFilters,
  RemediationStats,
} from '@/types/remediation-tracking';

// =============================================================================
// REMEDIATION TRACKING API
// =============================================================================

export const remediationTrackingApi = {
  /**
   * Get remediation tracking by source
   */
  async getBySource(
    sourceType: RemediationSourceType,
    sourceId: string
  ): Promise<RemediationTrackingWithPunchItem[]> {
    const { data, error } = await supabase
      .from('remediation_tracking')
      .select(`
        *,
        punch_item:punch_items(
          id,
          title,
          description,
          status,
          priority,
          due_date,
          assigned_to,
          trade,
          location_notes
        )
      `)
      .eq('source_type', sourceType)
      .eq('source_id', sourceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as RemediationTrackingWithPunchItem[];
  },

  /**
   * Get remediation tracking by punch item
   */
  async getByPunchItem(punchItemId: string): Promise<RemediationTracking | null> {
    const { data, error } = await supabase
      .from('remediation_tracking')
      .select('*')
      .eq('punch_item_id', punchItemId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  /**
   * Get all remediation records with filters
   */
  async getRemediation(filters: RemediationFilters): Promise<RemediationTrackingWithPunchItem[]> {
    let query = supabase
      .from('remediation_tracking')
      .select(`
        *,
        punch_item:punch_items(
          id,
          title,
          description,
          status,
          priority,
          due_date,
          assigned_to,
          trade,
          location_notes
        )
      `)
      .order('created_at', { ascending: false });

    if (filters.project_id) {
      query = query.eq('project_id', filters.project_id);
    }

    if (filters.source_type) {
      query = query.eq('source_type', filters.source_type);
    }

    if (filters.source_id) {
      query = query.eq('source_id', filters.source_id);
    }

    if (filters.punch_item_id) {
      query = query.eq('punch_item_id', filters.punch_item_id);
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }

    if (filters.auto_generated !== undefined) {
      query = query.eq('auto_generated', filters.auto_generated);
    }

    if (filters.verified_by) {
      query = query.eq('verified_by', filters.verified_by);
    }

    if (filters.created_after) {
      query = query.gte('created_at', filters.created_after);
    }

    if (filters.created_before) {
      query = query.lte('created_at', filters.created_before);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as RemediationTrackingWithPunchItem[];
  },

  /**
   * Update remediation status
   */
  async updateStatus(
    id: string,
    dto: UpdateRemediationStatusDTO
  ): Promise<RemediationTracking> {
    const { data, error } = await supabase
      .from('remediation_tracking')
      .update({
        status: dto.status,
        verification_notes: dto.verification_notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Verify remediation
   */
  async verify(id: string, dto: VerifyRemediationDTO): Promise<RemediationTracking> {
    const { data: user } = await supabase.auth.getUser();

    const status: RemediationStatus = dto.passed ? 'verified' : 'failed';

    const { data, error } = await supabase
      .from('remediation_tracking')
      .update({
        status,
        verified_by: user?.user?.id,
        verified_at: new Date().toISOString(),
        verification_notes: dto.verification_notes || null,
        updated_at: new Date().toISOString(),
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
  async getStats(projectId: string): Promise<RemediationStats> {
    const { data, error } = await supabase
      .from('remediation_tracking')
      .select('status, source_type, auto_generated, created_at')
      .eq('project_id', projectId);

    if (error) throw error;

    const items = data || [];

    const byStatus: Record<RemediationStatus, number> = {
      pending: 0,
      in_progress: 0,
      resolved: 0,
      verified: 0,
      failed: 0,
    };

    const bySourceType: Record<RemediationSourceType, number> = {
      inspection: 0,
      checklist: 0,
      safety_observation: 0,
      equipment_inspection: 0,
    };

    let autoGeneratedCount = 0;
    let pendingVerification = 0;

    items.forEach((item: { status: string; source_type: string; auto_generated: boolean }) => {
      byStatus[item.status as RemediationStatus]++;
      bySourceType[item.source_type as RemediationSourceType]++;
      if (item.auto_generated) autoGeneratedCount++;
      if (item.status === 'resolved') pendingVerification++;
    });

    return {
      total: items.length,
      by_status: byStatus,
      by_source_type: bySourceType,
      pending_verification: pendingVerification,
      auto_generated_count: autoGeneratedCount,
      average_resolution_days: null, // Would need more complex calculation
    };
  },
};

// =============================================================================
// AUTO-CREATE PUNCH ITEMS API
// =============================================================================

export const autoCreatePunchApi = {
  /**
   * Create punch item from failed inspection
   */
  async createFromInspection(dto: CreatePunchFromInspectionDTO): Promise<string> {
    const { data: user } = await supabase.auth.getUser();

    const { data, error } = await supabase.rpc('create_punch_from_inspection', {
      p_inspection_id: dto.inspection_id,
      p_created_by: user?.user?.id,
    });

    if (error) throw error;
    return data as string;
  },

  /**
   * Create punch item from failed checklist item
   */
  async createFromChecklist(dto: CreatePunchFromChecklistDTO): Promise<string> {
    const { data: user } = await supabase.auth.getUser();

    const { data, error } = await supabase.rpc('create_punch_from_checklist_item', {
      p_execution_id: dto.execution_id,
      p_response_id: dto.response_id,
      p_template_item_id: dto.template_item_id,
      p_created_by: user?.user?.id,
    });

    if (error) throw error;
    return data as string;
  },

  /**
   * Batch create punch items from multiple failed checklist items
   */
  async batchCreateFromChecklist(
    executionId: string,
    failedItems: Array<{ responseId: string; templateItemId: string }>
  ): Promise<string[]> {
    const punchIds: string[] = [];

    for (const item of failedItems) {
      try {
        const punchId = await this.createFromChecklist({
          execution_id: executionId,
          response_id: item.responseId,
          template_item_id: item.templateItemId,
        });
        punchIds.push(punchId);
      } catch (error) {
        console.error(`Failed to create punch item for response ${item.responseId}:`, error);
      }
    }

    return punchIds;
  },
};

// =============================================================================
// AUTO-LINK CONFIGURATION API
// =============================================================================

export const autoLinkConfigApi = {
  /**
   * Get configuration for a source type
   */
  async getConfig(sourceType: RemediationSourceType): Promise<AutoLinkSettings | null> {
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
      .from('auto_link_configurations')
      .select('config_value')
      .eq('company_id', userData.company_id)
      .eq('source_type', sourceType)
      .eq('config_key', 'default_settings')
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data?.config_value as AutoLinkSettings || null;
  },

  /**
   * Get all configurations
   */
  async getAllConfigs(): Promise<AutoLinkConfiguration[]> {
    const { data, error } = await supabase
      .from('auto_link_configurations')
      .select('*')
      .eq('config_key', 'default_settings')
      .order('source_type', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Update configuration
   */
  async updateConfig(
    sourceType: RemediationSourceType,
    dto: UpdateAutoLinkConfigDTO
  ): Promise<AutoLinkConfiguration> {
    const { data: user } = await supabase.auth.getUser();
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user?.user?.id)
      .single();

    if (!userData?.company_id) {
      throw new Error('User company not found');
    }

    // Get current config
    const currentConfig = await this.getConfig(sourceType);

    // Merge with updates
    const newConfigValue: AutoLinkSettings = {
      auto_create_punch: dto.auto_create_punch ?? currentConfig?.auto_create_punch ?? true,
      copy_photos: dto.copy_photos ?? currentConfig?.copy_photos ?? true,
      default_priority: dto.default_priority ?? currentConfig?.default_priority ?? 'high',
      default_trade: dto.default_trade ?? currentConfig?.default_trade ?? 'General',
      notify_assignee: dto.notify_assignee ?? currentConfig?.notify_assignee ?? true,
      due_days_offset: dto.due_days_offset ?? currentConfig?.due_days_offset ?? 3,
    };

    const { data, error } = await supabase
      .from('auto_link_configurations')
      .upsert({
        company_id: userData.company_id,
        source_type: sourceType,
        config_key: 'default_settings',
        config_value: newConfigValue,
        is_active: dto.is_active ?? true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'company_id,source_type,config_key',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// =============================================================================
// COMBINED EXPORT
// =============================================================================

export const remediationService = {
  tracking: remediationTrackingApi,
  autoCreate: autoCreatePunchApi,
  config: autoLinkConfigApi,
};
