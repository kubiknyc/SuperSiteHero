/**
 * Daily Report Templates API Service
 *
 * Handles CRUD operations for daily report templates with support for:
 * - Personal, project, and company-wide sharing
 * - Template import/export
 * - Usage tracking
 * - Template library management
 */

import { supabase } from '@/lib/supabase';
import { ApiErrorClass } from '../errors';
import type {
  DailyReportTemplate,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  CopyTemplateRequest,
  TemplateFilters,
  TemplateWithStats,
  TemplateScope,
  WorkforceEntryV2,
  EquipmentEntryV2,
  DailyReportV2,
} from '@/types/daily-reports-v2';

// =============================================
// TEMPLATE LIBRARY API
// =============================================

export const dailyReportTemplatesApi = {
  /**
   * Get all accessible templates for the current user
   * Filters by scope, category, project, company, etc.
   */
  async getTemplates(filters?: TemplateFilters): Promise<DailyReportTemplate[]> {
    try {
      let query = (supabase as any)
        .from('daily_report_templates')
        .select('*')
        .order('usage_count', { ascending: false })
        .order('name', { ascending: true });

      // Apply filters
      if (filters?.scope && filters.scope !== 'all') {
        query = query.eq('scope', filters.scope);
      }

      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      if (filters?.project_id) {
        query = query.eq('project_id', filters.project_id);
      }

      if (filters?.company_id) {
        query = query.eq('company_id', filters.company_id);
      }

      if (filters?.created_by) {
        query = query.eq('created_by', filters.created_by);
      }

      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }

      if (filters?.tags && filters.tags.length > 0) {
        query = query.contains('tags', filters.tags);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as DailyReportTemplate[];
    } catch (error) {
      throw new ApiErrorClass({
        code: 'TEMPLATES_FETCH_ERROR',
        message: 'Failed to fetch templates',
        details: error,
      });
    }
  },

  /**
   * Get templates for a specific project (includes project and company templates)
   */
  async getProjectTemplates(projectId: string): Promise<DailyReportTemplate[]> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Get user's company
      const { data: userData } = await (supabase as any)
        .from('users')
        .select('company_id')
        .eq('id', user.user.id)
        .single();

      // Build query to get:
      // 1. Personal templates (created by this user)
      // 2. Project templates (for this project)
      // 3. Company templates (for user's company)
      // 4. Global templates (is_default = true)
      let query = (supabase as any)
        .from('daily_report_templates')
        .select('*')
        .order('usage_count', { ascending: false })
        .order('name', { ascending: true });

      const orConditions = [
        `created_by.eq.${user.user.id}`,
        `project_id.eq.${projectId}`,
        'is_default.eq.true',
      ];

      if (userData?.company_id) {
        orConditions.push(`company_id.eq.${userData.company_id}`);
      }

      query = query.or(orConditions.join(','));

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as DailyReportTemplate[];
    } catch (error) {
      throw new ApiErrorClass({
        code: 'PROJECT_TEMPLATES_ERROR',
        message: 'Failed to fetch project templates',
        details: error,
      });
    }
  },

  /**
   * Get company-wide templates
   */
  async getCompanyTemplates(companyId: string): Promise<DailyReportTemplate[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('daily_report_templates')
        .select('*')
        .eq('company_id', companyId)
        .eq('scope', 'company')
        .order('usage_count', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []) as DailyReportTemplate[];
    } catch (error) {
      throw new ApiErrorClass({
        code: 'COMPANY_TEMPLATES_ERROR',
        message: 'Failed to fetch company templates',
        details: error,
      });
    }
  },

  /**
   * Get a single template by ID
   */
  async getTemplate(templateId: string): Promise<DailyReportTemplate> {
    try {
      const { data, error } = await (supabase as any)
        .from('daily_report_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;
      return data as DailyReportTemplate;
    } catch (error) {
      throw new ApiErrorClass({
        code: 'TEMPLATE_FETCH_ERROR',
        message: 'Failed to fetch template',
        details: error,
      });
    }
  },

  /**
   * Get template with additional stats (creator info, counts)
   */
  async getTemplateWithStats(templateId: string): Promise<TemplateWithStats> {
    try {
      const { data, error } = await (supabase as any)
        .from('template_statistics')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;
      return data as TemplateWithStats;
    } catch (error) {
      throw new ApiErrorClass({
        code: 'TEMPLATE_STATS_ERROR',
        message: 'Failed to fetch template statistics',
        details: error,
      });
    }
  },

  /**
   * Create a new template
   */
  async createTemplate(request: CreateTemplateRequest): Promise<DailyReportTemplate> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Get user's company if needed for company scope
      let companyId = request.company_id;
      if (request.scope === 'company' && !companyId) {
        const { data: userData } = await (supabase as any)
          .from('users')
          .select('company_id')
          .eq('id', user.user.id)
          .single();
        companyId = userData?.company_id;
      }

      const { data, error } = await (supabase as any)
        .from('daily_report_templates')
        .insert({
          name: request.name,
          description: request.description,
          project_id: request.project_id,
          company_id: companyId,
          created_by: user.user.id,
          user_id: user.user.id,
          scope: request.scope,
          category: request.category || 'general',
          tags: request.tags || [],
          workforce_template: request.workforce_template || [],
          equipment_template: request.equipment_template || [],
          template_data: request.template_data || {},
          is_default: request.is_default || false,
          usage_count: 0,
          version: 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data as DailyReportTemplate;
    } catch (error) {
      throw new ApiErrorClass({
        code: 'TEMPLATE_CREATE_ERROR',
        message: 'Failed to create template',
        details: error,
      });
    }
  },

  /**
   * Create template from an existing daily report
   */
  async createTemplateFromReport(
    reportId: string,
    templateInfo: {
      name: string;
      description?: string;
      scope: TemplateScope;
      category?: string;
      tags?: string[];
      includeWorkforce?: boolean;
      includeEquipment?: boolean;
      includeWeather?: boolean;
      includeNotes?: boolean;
    }
  ): Promise<DailyReportTemplate> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Fetch the report with related data
      const { data: report, error: reportError } = await (supabase as any)
        .from('daily_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (reportError) throw reportError;

      // Fetch workforce and equipment if needed
      let workforceData: Partial<WorkforceEntryV2>[] = [];
      let equipmentData: Partial<EquipmentEntryV2>[] = [];

      if (templateInfo.includeWorkforce !== false) {
        const { data: workforce } = await (supabase as any)
          .from('daily_report_workforce')
          .select('*')
          .eq('daily_report_id', reportId);

        workforceData = (workforce || []).map((w: WorkforceEntryV2) => ({
          entry_type: w.entry_type,
          company_name: w.company_name,
          team_name: w.team_name,
          foreman_name: w.foreman_name,
          trade: w.trade,
          worker_count: w.worker_count,
          hours_worked: w.hours_worked,
          work_area: w.work_area,
          cost_code: w.cost_code,
          phase_code: w.phase_code,
        }));
      }

      if (templateInfo.includeEquipment !== false) {
        const { data: equipment } = await (supabase as any)
          .from('daily_report_equipment')
          .select('*')
          .eq('daily_report_id', reportId);

        equipmentData = (equipment || []).map((e: EquipmentEntryV2) => ({
          equipment_type: e.equipment_type,
          equipment_id: e.equipment_id,
          quantity: e.quantity,
          owner_type: e.owner_type,
          hours_used: e.hours_used,
          work_area: e.work_area,
          cost_code: e.cost_code,
          operator_name: e.operator_name,
        }));
      }

      // Build template data
      const templateData: Record<string, unknown> = {};

      if (templateInfo.includeWeather && report.weather_condition) {
        templateData.weather_defaults = {
          weather_condition: report.weather_condition,
        };
      }

      if (templateInfo.includeNotes) {
        templateData.default_notes = {
          work_summary: report.work_summary,
          work_planned_tomorrow: report.work_planned_tomorrow,
          observations: report.observations,
        };
      }

      templateData.default_values = {
        shift_type: report.shift_type,
        shift_start_time: report.shift_start_time,
        shift_end_time: report.shift_end_time,
        mode: report.mode,
      };

      // Get company ID for company scope
      let companyId: string | undefined;
      if (templateInfo.scope === 'company') {
        const { data: userData } = await (supabase as any)
          .from('users')
          .select('company_id')
          .eq('id', user.user.id)
          .single();
        companyId = userData?.company_id;
      }

      // Create the template
      return this.createTemplate({
        name: templateInfo.name,
        description: templateInfo.description,
        scope: templateInfo.scope,
        project_id: templateInfo.scope === 'project' ? report.project_id : undefined,
        company_id: companyId,
        category: (templateInfo.category as any) || 'general',
        tags: templateInfo.tags || [],
        workforce_template: workforceData,
        equipment_template: equipmentData,
        template_data: templateData,
      });
    } catch (error) {
      throw new ApiErrorClass({
        code: 'TEMPLATE_FROM_REPORT_ERROR',
        message: 'Failed to create template from report',
        details: error,
      });
    }
  },

  /**
   * Update an existing template
   */
  async updateTemplate(
    templateId: string,
    updates: UpdateTemplateRequest
  ): Promise<DailyReportTemplate> {
    try {
      const { data, error } = await (supabase as any)
        .from('daily_report_templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', templateId)
        .select()
        .single();

      if (error) throw error;
      return data as DailyReportTemplate;
    } catch (error) {
      throw new ApiErrorClass({
        code: 'TEMPLATE_UPDATE_ERROR',
        message: 'Failed to update template',
        details: error,
      });
    }
  },

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    try {
      const { error } = await (supabase as any)
        .from('daily_report_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
    } catch (error) {
      throw new ApiErrorClass({
        code: 'TEMPLATE_DELETE_ERROR',
        message: 'Failed to delete template',
        details: error,
      });
    }
  },

  /**
   * Copy a template with new scope/project/company
   */
  async copyTemplate(request: CopyTemplateRequest): Promise<DailyReportTemplate> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Get source template
      const sourceTemplate = await this.getTemplate(request.source_template_id);

      // Get company ID for company scope
      let companyId = request.new_company_id;
      if (request.new_scope === 'company' && !companyId) {
        const { data: userData } = await (supabase as any)
          .from('users')
          .select('company_id')
          .eq('id', user.user.id)
          .single();
        companyId = userData?.company_id;
      }

      // Create new template as copy
      const { data, error } = await (supabase as any)
        .from('daily_report_templates')
        .insert({
          name: request.new_name,
          description: sourceTemplate.description,
          project_id: request.new_project_id,
          company_id: companyId,
          created_by: user.user.id,
          user_id: user.user.id,
          scope: request.new_scope,
          category: sourceTemplate.category,
          tags: sourceTemplate.tags,
          workforce_template: sourceTemplate.workforce_template,
          equipment_template: sourceTemplate.equipment_template,
          template_data: sourceTemplate.template_data,
          is_default: false,
          usage_count: 0,
          version: 1,
          copied_from_id: request.source_template_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as DailyReportTemplate;
    } catch (error) {
      throw new ApiErrorClass({
        code: 'TEMPLATE_COPY_ERROR',
        message: 'Failed to copy template',
        details: error,
      });
    }
  },

  /**
   * Record template usage (call when applying a template)
   */
  async recordTemplateUsage(templateId: string): Promise<void> {
    try {
      const { error } = await (supabase as any).rpc('increment_template_usage', {
        template_id: templateId,
      });

      // Fallback if function doesn't exist
      if (error) {
        await (supabase as any)
          .from('daily_report_templates')
          .update({
            usage_count: (supabase as any).sql`usage_count + 1`,
            last_used_at: new Date().toISOString(),
          })
          .eq('id', templateId);
      }
    } catch (error) {
      // Non-critical error, log but don't throw
      console.warn('Failed to record template usage:', error);
    }
  },

  /**
   * Apply template to get data for a new report
   */
  async applyTemplate(templateId: string): Promise<{
    workforce: Partial<WorkforceEntryV2>[];
    equipment: Partial<EquipmentEntryV2>[];
    defaults: Record<string, unknown>;
  }> {
    try {
      const template = await this.getTemplate(templateId);

      // Record usage
      await this.recordTemplateUsage(templateId);

      // Extract defaults from template_data
      const defaults: Record<string, unknown> = {};
      if (template.template_data) {
        if (template.template_data.weather_defaults) {
          defaults.weather_condition = template.template_data.weather_defaults.weather_condition;
        }
        if (template.template_data.default_notes) {
          defaults.work_summary = template.template_data.default_notes.work_summary;
          defaults.work_planned_tomorrow = template.template_data.default_notes.work_planned_tomorrow;
          defaults.observations = template.template_data.default_notes.observations;
        }
        if (template.template_data.default_values) {
          Object.assign(defaults, template.template_data.default_values);
        }
      }

      return {
        workforce: template.workforce_template || [],
        equipment: template.equipment_template || [],
        defaults,
      };
    } catch (error) {
      throw new ApiErrorClass({
        code: 'TEMPLATE_APPLY_ERROR',
        message: 'Failed to apply template',
        details: error,
      });
    }
  },

  /**
   * Get popular templates (most used)
   */
  async getPopularTemplates(limit: number = 10): Promise<DailyReportTemplate[]> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data: userData } = await (supabase as any)
        .from('users')
        .select('company_id')
        .eq('id', user.user.id)
        .single();

      let query = (supabase as any)
        .from('daily_report_templates')
        .select('*')
        .gt('usage_count', 0)
        .order('usage_count', { ascending: false })
        .limit(limit);

      // Only get templates the user can access
      const orConditions = [
        `created_by.eq.${user.user.id}`,
        'is_default.eq.true',
        `scope.eq.personal`,
      ];

      if (userData?.company_id) {
        orConditions.push(`company_id.eq.${userData.company_id}`);
      }

      query = query.or(orConditions.join(','));

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as DailyReportTemplate[];
    } catch (error) {
      throw new ApiErrorClass({
        code: 'POPULAR_TEMPLATES_ERROR',
        message: 'Failed to fetch popular templates',
        details: error,
      });
    }
  },

  /**
   * Get recently used templates for the current user
   */
  async getRecentTemplates(limit: number = 5): Promise<DailyReportTemplate[]> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await (supabase as any)
        .from('daily_report_templates')
        .select('*')
        .eq('created_by', user.user.id)
        .not('last_used_at', 'is', null)
        .order('last_used_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as DailyReportTemplate[];
    } catch (error) {
      throw new ApiErrorClass({
        code: 'RECENT_TEMPLATES_ERROR',
        message: 'Failed to fetch recent templates',
        details: error,
      });
    }
  },

  /**
   * Search templates by name, description, or tags
   */
  async searchTemplates(query: string): Promise<DailyReportTemplate[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('daily_report_templates')
        .select('*')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .order('usage_count', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as DailyReportTemplate[];
    } catch (error) {
      throw new ApiErrorClass({
        code: 'TEMPLATE_SEARCH_ERROR',
        message: 'Failed to search templates',
        details: error,
      });
    }
  },

  /**
   * Get all unique tags from templates
   */
  async getAllTags(): Promise<string[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('daily_report_templates')
        .select('tags');

      if (error) throw error;

      // Extract and deduplicate tags
      const allTags = new Set<string>();
      (data || []).forEach((template: { tags: string[] }) => {
        (template.tags || []).forEach((tag: string) => allTags.add(tag));
      });

      return Array.from(allTags).sort();
    } catch (error) {
      throw new ApiErrorClass({
        code: 'TAGS_FETCH_ERROR',
        message: 'Failed to fetch template tags',
        details: error,
      });
    }
  },

  /**
   * Export template as JSON (for sharing outside the system)
   */
  async exportTemplate(templateId: string): Promise<string> {
    try {
      const template = await this.getTemplate(templateId);

      // Remove sensitive/internal fields
      const exportData = {
        name: template.name,
        description: template.description,
        category: template.category,
        tags: template.tags,
        workforce_template: template.workforce_template,
        equipment_template: template.equipment_template,
        template_data: template.template_data,
        version: template.version,
        exported_at: new Date().toISOString(),
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      throw new ApiErrorClass({
        code: 'TEMPLATE_EXPORT_ERROR',
        message: 'Failed to export template',
        details: error,
      });
    }
  },

  /**
   * Import template from JSON
   */
  async importTemplate(
    jsonData: string,
    options: {
      name?: string;
      scope: TemplateScope;
      project_id?: string;
      company_id?: string;
    }
  ): Promise<DailyReportTemplate> {
    try {
      const importData = JSON.parse(jsonData);

      return this.createTemplate({
        name: options.name || importData.name || 'Imported Template',
        description: importData.description,
        scope: options.scope,
        project_id: options.project_id,
        company_id: options.company_id,
        category: importData.category,
        tags: importData.tags || [],
        workforce_template: importData.workforce_template || [],
        equipment_template: importData.equipment_template || [],
        template_data: importData.template_data,
      });
    } catch (error) {
      throw new ApiErrorClass({
        code: 'TEMPLATE_IMPORT_ERROR',
        message: 'Failed to import template. Please check the JSON format.',
        details: error,
      });
    }
  },
};

export default dailyReportTemplatesApi;
