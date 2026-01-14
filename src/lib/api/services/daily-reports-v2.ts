/**
 * Daily Reports V2 API Service
 * Complete API for enhanced daily report system
 */

import { supabase } from '@/lib/supabase';
import { ApiErrorClass } from '../errors';
import type {
  DailyReportV2,
  WorkforceEntryV2,
  EquipmentEntryV2,
  DelayEntry,
  SafetyIncident,
  InspectionEntry,
  TMWorkEntry,
  ProgressEntry,
  DeliveryEntryV2,
  VisitorEntryV2,
  PhotoEntryV2,
  DailyReportTemplate,
  CreateDailyReportV2Request,
  SubmitReportRequest,
  ApproveReportRequest,
  RequestChangesRequest,
  CopyFromPreviousDayRequest,
} from '@/types/daily-reports-v2';
import type { PostgrestError } from '@supabase/supabase-js';

// =============================================
// TYPE HELPERS
// =============================================

/**
 * Helper type for Supabase query result data
 * Represents the data returned from a Supabase query
 */
type SupabaseQueryResult<T> = {
  data: T | null;
  error: PostgrestError | null;
};

/**
 * Type for source report from copyFromPreviousDay
 */
interface SourceReportResult {
  id: string;
}

/**
 * Type for daily report with full related data
 */
interface DailyReportWithRelated extends DailyReportV2 {
  workforce: WorkforceEntryV2[];
  equipment: EquipmentEntryV2[];
  delays: DelayEntry[];
  safety_incidents: SafetyIncident[];
  inspections: InspectionEntry[];
  tm_work: TMWorkEntry[];
  progress: ProgressEntry[];
  deliveries: DeliveryEntryV2[];
  visitors: VisitorEntryV2[];
  photos: PhotoEntryV2[];
}

/**
 * Type for workforce entry data from copy operation
 * Omits fields that will be regenerated on insert
 */
type WorkforceEntryCopyData = Omit<WorkforceEntryV2, 'id' | 'daily_report_id' | 'created_at'> & {
  id?: undefined;
  daily_report_id?: undefined;
  created_at?: undefined;
};

/**
 * Type for equipment entry data from copy operation
 * Omits fields that will be regenerated on insert
 */
type EquipmentEntryCopyData = Omit<EquipmentEntryV2, 'id' | 'daily_report_id' | 'created_at'> & {
  id?: undefined;
  daily_report_id?: undefined;
  created_at?: undefined;
};

// =============================================
// DAILY REPORTS CORE
// =============================================

export const dailyReportsV2Api = {
  /**
   * Fetch daily reports for a project with full related data
   */
  async getProjectReports(
    projectId: string,
    options?: {
      startDate?: string;
      endDate?: string;
      status?: string[];
      includeRelated?: boolean;
    }
  ): Promise<DailyReportV2[]> {
    try {
      let query = supabase
        .from('daily_reports')
        .select(`
          *,
          project:projects(id, name)
        `)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('report_date', { ascending: false });

      if (options?.startDate) {
        query = query.gte('report_date', options.startDate);
      }
      if (options?.endDate) {
        query = query.lte('report_date', options.endDate);
      }
      if (options?.status && options.status.length > 0) {
        query = query.in('status', options.status);
      }

      const { data, error } = await query;

      if (error) {throw error;}
      return (data ?? []) as unknown as DailyReportV2[];
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_REPORTS_ERROR',
        message: 'Failed to fetch daily reports',
        details: error,
      });
    }
  },

  /**
   * Fetch a single daily report with all related data
   */
  async getReportWithRelated(reportId: string): Promise<DailyReportWithRelated> {
    try {
      // Fetch main report
      const { data: report, error: reportError }: SupabaseQueryResult<DailyReportV2> = await supabase
        .from('daily_reports')
        .select(`
          *,
          project:projects(id, name)
        `)
        .eq('id', reportId)
        .single();

      if (reportError) {throw reportError;}

      // Fetch all related data in parallel
      const [
        workforceResult,
        equipmentResult,
        delaysResult,
        safetyIncidentsResult,
        inspectionsResult,
        tmWorkResult,
        progressResult,
        deliveriesResult,
        visitorsResult,
        photosResult,
      ] = await Promise.all([
        supabase.from('daily_report_workforce').select('*').eq('daily_report_id', reportId) as Promise<SupabaseQueryResult<WorkforceEntryV2[]>>,
        supabase.from('daily_report_equipment').select('*').eq('daily_report_id', reportId) as Promise<SupabaseQueryResult<EquipmentEntryV2[]>>,
        supabase.from('daily_report_delays').select('*').eq('daily_report_id', reportId) as Promise<SupabaseQueryResult<DelayEntry[]>>,
        supabase.from('daily_report_safety_incidents').select('*').eq('daily_report_id', reportId) as Promise<SupabaseQueryResult<SafetyIncident[]>>,
        supabase.from('daily_report_inspections').select('*').eq('daily_report_id', reportId) as Promise<SupabaseQueryResult<InspectionEntry[]>>,
        supabase.from('daily_report_tm_work').select('*').eq('daily_report_id', reportId) as Promise<SupabaseQueryResult<TMWorkEntry[]>>,
        supabase.from('daily_report_progress').select('*').eq('daily_report_id', reportId) as Promise<SupabaseQueryResult<ProgressEntry[]>>,
        supabase.from('daily_report_deliveries').select('*').eq('daily_report_id', reportId) as Promise<SupabaseQueryResult<DeliveryEntryV2[]>>,
        supabase.from('daily_report_visitors').select('*').eq('daily_report_id', reportId) as Promise<SupabaseQueryResult<VisitorEntryV2[]>>,
        supabase.from('daily_report_photos').select('*').eq('daily_report_id', reportId) as Promise<SupabaseQueryResult<PhotoEntryV2[]>>,
      ]);

      const result: DailyReportWithRelated = {
        ...(report as DailyReportV2),
        workforce: workforceResult.data ?? [],
        equipment: equipmentResult.data ?? [],
        delays: delaysResult.data ?? [],
        safety_incidents: safetyIncidentsResult.data ?? [],
        inspections: inspectionsResult.data ?? [],
        tm_work: tmWorkResult.data ?? [],
        progress: progressResult.data ?? [],
        deliveries: deliveriesResult.data ?? [],
        visitors: visitorsResult.data ?? [],
        photos: photosResult.data ?? [],
      };

      return result;
    } catch (error) {
      throw new ApiErrorClass({
        code: 'FETCH_REPORT_ERROR',
        message: 'Failed to fetch daily report',
        details: error,
      });
    }
  },

  /**
   * Create a new daily report
   */
  async createReport(request: CreateDailyReportV2Request): Promise<DailyReportV2> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {throw new Error('Not authenticated');}

      const { data, error } = await supabase
        .from('daily_reports')
        .insert({
          project_id: request.project_id,
          report_date: request.report_date,
          reporter_id: user.user.id,
          mode: request.mode ?? 'quick',
          shift_start_time: request.shift_start_time,
          shift_end_time: request.shift_end_time,
          shift_type: request.shift_type ?? 'regular',
          status: 'draft',
        })
        .select()
        .single();

      if (error) {throw error;}
      return data as unknown as DailyReportV2;
    } catch (error) {
      throw new ApiErrorClass({
        code: 'CREATE_REPORT_ERROR',
        message: 'Failed to create daily report',
        details: error,
      });
    }
  },

  /**
   * Update daily report
   */
  async updateReport(
    reportId: string,
    updates: Partial<DailyReportV2>
  ): Promise<DailyReportV2> {
    try {
      const { data, error } = await supabase
        .from('daily_reports')
        .update(updates)
        .eq('id', reportId)
        .select()
        .single();

      if (error) {throw error;}
      return data as unknown as DailyReportV2;
    } catch (error) {
      throw new ApiErrorClass({
        code: 'UPDATE_REPORT_ERROR',
        message: 'Failed to update daily report',
        details: error,
      });
    }
  },

  /**
   * Submit report for approval
   */
  async submitReport(request: SubmitReportRequest): Promise<DailyReportV2> {
    try {
      const { data, error } = await supabase
        .from('daily_reports')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          submitted_by_signature: request.submitted_by_signature,
          submitted_by_name: request.submitted_by_name,
        })
        .eq('id', request.report_id)
        .select()
        .single();

      if (error) {throw error;}
      return data as unknown as DailyReportV2;
    } catch (error) {
      throw new ApiErrorClass({
        code: 'SUBMIT_REPORT_ERROR',
        message: 'Failed to submit daily report',
        details: error,
      });
    }
  },

  /**
   * Approve report
   */
  async approveReport(request: ApproveReportRequest): Promise<DailyReportV2> {
    try {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('daily_reports')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.user?.id,
          approved_by_signature: request.approved_by_signature,
          approved_by_name: request.approved_by_name,
          approval_comments: request.approval_comments,
        })
        .eq('id', request.report_id)
        .select()
        .single();

      if (error) {throw error;}
      return data as unknown as DailyReportV2;
    } catch (error) {
      throw new ApiErrorClass({
        code: 'APPROVE_REPORT_ERROR',
        message: 'Failed to approve daily report',
        details: error,
      });
    }
  },

  /**
   * Request changes on report
   */
  async requestChanges(request: RequestChangesRequest): Promise<DailyReportV2> {
    try {
      const { data, error } = await supabase
        .from('daily_reports')
        .update({
          status: 'changes_requested',
          rejection_reason: request.reason,
        })
        .eq('id', request.report_id)
        .select()
        .single();

      if (error) {throw error;}
      return data as unknown as DailyReportV2;
    } catch (error) {
      throw new ApiErrorClass({
        code: 'REQUEST_CHANGES_ERROR',
        message: 'Failed to request changes',
        details: error,
      });
    }
  },

  /**
   * Lock report (after approval period)
   */
  async lockReport(reportId: string): Promise<DailyReportV2> {
    try {
      const { data, error} = await supabase
        .from('daily_reports')
        .update({
          status: 'locked',
          locked_at: new Date().toISOString(),
        })
        .eq('id', reportId)
        .select()
        .single();

      if (error) {throw error;}
      return data as unknown as DailyReportV2;
    } catch (error) {
      throw new ApiErrorClass({
        code: 'LOCK_REPORT_ERROR',
        message: 'Failed to lock daily report',
        details: error,
      });
    }
  },

  /**
   * Copy data from previous day's report
   */
  async copyFromPreviousDay(request: CopyFromPreviousDayRequest): Promise<{
    workforce: WorkforceEntryV2[];
    equipment: EquipmentEntryV2[];
  }> {
    try {
      // Find the source report
      const { data: sourceReports, error: sourceError }: SupabaseQueryResult<SourceReportResult[]> = await supabase
        .from('daily_reports')
        .select('id')
        .eq('project_id', request.project_id)
        .eq('report_date', request.source_date)
        .is('deleted_at', null)
        .limit(1);

      if (sourceError) {throw sourceError;}
      if (!sourceReports || sourceReports.length === 0) {
        return { workforce: [], equipment: [] };
      }

      const sourceReportId = sourceReports[0].id;
      const results: { workforce: WorkforceEntryV2[]; equipment: EquipmentEntryV2[] } = {
        workforce: [],
        equipment: [],
      };

      // Copy workforce if requested
      if (request.copy_workforce !== false) {
        const { data: workforce }: SupabaseQueryResult<WorkforceEntryV2[]> = await supabase
          .from('daily_report_workforce')
          .select('*')
          .eq('daily_report_id', sourceReportId);

        if (workforce) {
          results.workforce = workforce.map((w: WorkforceEntryV2): WorkforceEntryCopyData => ({
            ...w,
            id: undefined, // Will be generated on insert
            daily_report_id: undefined, // Will be set on insert
            created_at: undefined,
          })) as WorkforceEntryV2[];
        }
      }

      // Copy equipment if requested
      if (request.copy_equipment !== false) {
        const { data: equipment }: SupabaseQueryResult<EquipmentEntryV2[]> = await supabase
          .from('daily_report_equipment')
          .select('*')
          .eq('daily_report_id', sourceReportId);

        if (equipment) {
          results.equipment = equipment.map((e: EquipmentEntryV2): EquipmentEntryCopyData => ({
            ...e,
            id: undefined,
            daily_report_id: undefined,
            created_at: undefined,
          })) as EquipmentEntryV2[];
        }
      }

      return results;
    } catch (error) {
      throw new ApiErrorClass({
        code: 'COPY_FROM_PREVIOUS_ERROR',
        message: 'Failed to copy from previous day',
        details: error,
      });
    }
  },

  /**
   * Delete report (soft delete)
   */
  async deleteReport(reportId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('daily_reports')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', reportId);

      if (error) {throw error;}
    } catch (error) {
      throw new ApiErrorClass({
        code: 'DELETE_REPORT_ERROR',
        message: 'Failed to delete daily report',
        details: error,
      });
    }
  },
};

// =============================================
// WORKFORCE API
// =============================================

export const workforceApi = {
  async upsert(entries: WorkforceEntryV2[]): Promise<WorkforceEntryV2[]> {
    if (entries.length === 0) {return [];}

    const { data, error }: SupabaseQueryResult<WorkforceEntryV2[]> = await supabase
      .from('daily_report_workforce')
      .upsert(entries, { onConflict: 'id' })
      .select();

    if (error) {throw new ApiErrorClass({ code: 'WORKFORCE_UPSERT_ERROR', message: error.message });}
    return data ?? [];
  },

  async delete(id: string): Promise<void> {
    const { error }: SupabaseQueryResult<null> = await supabase
      .from('daily_report_workforce')
      .delete()
      .eq('id', id);

    if (error) {throw new ApiErrorClass({ code: 'WORKFORCE_DELETE_ERROR', message: error.message });}
  },

  async deleteByReportId(reportId: string): Promise<void> {
    const { error }: SupabaseQueryResult<null> = await supabase
      .from('daily_report_workforce')
      .delete()
      .eq('daily_report_id', reportId);

    if (error) {throw new ApiErrorClass({ code: 'WORKFORCE_DELETE_ERROR', message: error.message });}
  },
};

// =============================================
// EQUIPMENT API
// =============================================

export const equipmentApi = {
  async upsert(entries: EquipmentEntryV2[]): Promise<EquipmentEntryV2[]> {
    if (entries.length === 0) {return [];}

    const { data, error }: SupabaseQueryResult<EquipmentEntryV2[]> = await supabase
      .from('daily_report_equipment')
      .upsert(entries, { onConflict: 'id' })
      .select();

    if (error) {throw new ApiErrorClass({ code: 'EQUIPMENT_UPSERT_ERROR', message: error.message });}
    return data ?? [];
  },

  async delete(id: string): Promise<void> {
    const { error }: SupabaseQueryResult<null> = await supabase
      .from('daily_report_equipment')
      .delete()
      .eq('id', id);

    if (error) {throw new ApiErrorClass({ code: 'EQUIPMENT_DELETE_ERROR', message: error.message });}
  },
};

// =============================================
// DELAYS API (Critical)
// =============================================

export const delaysApi = {
  async getByReportId(reportId: string): Promise<DelayEntry[]> {
    const { data, error }: SupabaseQueryResult<DelayEntry[]> = await supabase
      .from('daily_report_delays')
      .select('*')
      .eq('daily_report_id', reportId)
      .order('created_at', { ascending: false });

    if (error) {throw new ApiErrorClass({ code: 'DELAYS_FETCH_ERROR', message: error.message });}
    return data ?? [];
  },

  async upsert(entries: DelayEntry[]): Promise<DelayEntry[]> {
    if (entries.length === 0) {return [];}

    const { data, error }: SupabaseQueryResult<DelayEntry[]> = await supabase
      .from('daily_report_delays')
      .upsert(entries, { onConflict: 'id' })
      .select();

    if (error) {throw new ApiErrorClass({ code: 'DELAYS_UPSERT_ERROR', message: error.message });}
    return data ?? [];
  },

  async delete(id: string): Promise<void> {
    const { error }: SupabaseQueryResult<null> = await supabase
      .from('daily_report_delays')
      .delete()
      .eq('id', id);

    if (error) {throw new ApiErrorClass({ code: 'DELAYS_DELETE_ERROR', message: error.message });}
  },

  /**
   * Get all delays for a project within date range (for reports)
   */
  async getProjectDelays(
    projectId: string,
    startDate: string,
    endDate: string
  ): Promise<DelayEntry[]> {
    const { data, error }: SupabaseQueryResult<DelayEntry[]> = await supabase
      .from('daily_report_delays')
      .select(`
        *,
        daily_report:daily_reports!inner(project_id, report_date)
      `)
      .eq('daily_report.project_id', projectId)
      .gte('daily_report.report_date', startDate)
      .lte('daily_report.report_date', endDate)
      .order('created_at', { ascending: false });

    if (error) {throw new ApiErrorClass({ code: 'PROJECT_DELAYS_ERROR', message: error.message });}
    return data ?? [];
  },
};

// =============================================
// SAFETY INCIDENTS API
// =============================================

export const safetyIncidentsApi = {
  async getByReportId(reportId: string): Promise<SafetyIncident[]> {
    const { data, error }: SupabaseQueryResult<SafetyIncident[]> = await supabase
      .from('daily_report_safety_incidents')
      .select('*')
      .eq('daily_report_id', reportId)
      .order('incident_time', { ascending: true });

    if (error) {throw new ApiErrorClass({ code: 'SAFETY_FETCH_ERROR', message: error.message });}
    return data ?? [];
  },

  async upsert(entries: SafetyIncident[]): Promise<SafetyIncident[]> {
    if (entries.length === 0) {return [];}

    const { data, error }: SupabaseQueryResult<SafetyIncident[]> = await supabase
      .from('daily_report_safety_incidents')
      .upsert(entries, { onConflict: 'id' })
      .select();

    if (error) {throw new ApiErrorClass({ code: 'SAFETY_UPSERT_ERROR', message: error.message });}
    return data ?? [];
  },

  async delete(id: string): Promise<void> {
    const { error }: SupabaseQueryResult<null> = await supabase
      .from('daily_report_safety_incidents')
      .delete()
      .eq('id', id);

    if (error) {throw new ApiErrorClass({ code: 'SAFETY_DELETE_ERROR', message: error.message });}
  },

  /**
   * Get OSHA-reportable incidents for a project
   */
  async getOshaIncidents(projectId: string): Promise<SafetyIncident[]> {
    const { data, error }: SupabaseQueryResult<SafetyIncident[]> = await supabase
      .from('daily_report_safety_incidents')
      .select(`
        *,
        daily_report:daily_reports!inner(project_id, report_date)
      `)
      .eq('daily_report.project_id', projectId)
      .eq('osha_reportable', true)
      .order('created_at', { ascending: false });

    if (error) {throw new ApiErrorClass({ code: 'OSHA_INCIDENTS_ERROR', message: error.message });}
    return data ?? [];
  },
};

// =============================================
// INSPECTIONS API
// =============================================

export const inspectionsApi = {
  async getByReportId(reportId: string): Promise<InspectionEntry[]> {
    const { data, error }: SupabaseQueryResult<InspectionEntry[]> = await supabase
      .from('daily_report_inspections')
      .select('*')
      .eq('daily_report_id', reportId)
      .order('inspection_time', { ascending: true });

    if (error) {throw new ApiErrorClass({ code: 'INSPECTIONS_FETCH_ERROR', message: error.message });}
    return data ?? [];
  },

  async upsert(entries: InspectionEntry[]): Promise<InspectionEntry[]> {
    if (entries.length === 0) {return [];}

    const { data, error }: SupabaseQueryResult<InspectionEntry[]> = await supabase
      .from('daily_report_inspections')
      .upsert(entries, { onConflict: 'id' })
      .select();

    if (error) {throw new ApiErrorClass({ code: 'INSPECTIONS_UPSERT_ERROR', message: error.message });}
    return data ?? [];
  },

  async delete(id: string): Promise<void> {
    const { error }: SupabaseQueryResult<null> = await supabase
      .from('daily_report_inspections')
      .delete()
      .eq('id', id);

    if (error) {throw new ApiErrorClass({ code: 'INSPECTIONS_DELETE_ERROR', message: error.message });}
  },
};

// =============================================
// T&M WORK API
// =============================================

export const tmWorkApi = {
  async getByReportId(reportId: string): Promise<TMWorkEntry[]> {
    const { data, error }: SupabaseQueryResult<TMWorkEntry[]> = await supabase
      .from('daily_report_tm_work')
      .select('*')
      .eq('daily_report_id', reportId)
      .order('created_at', { ascending: false });

    if (error) {throw new ApiErrorClass({ code: 'TM_WORK_FETCH_ERROR', message: error.message });}
    return data ?? [];
  },

  async upsert(entries: TMWorkEntry[]): Promise<TMWorkEntry[]> {
    if (entries.length === 0) {return [];}

    const { data, error }: SupabaseQueryResult<TMWorkEntry[]> = await supabase
      .from('daily_report_tm_work')
      .upsert(entries, { onConflict: 'id' })
      .select();

    if (error) {throw new ApiErrorClass({ code: 'TM_WORK_UPSERT_ERROR', message: error.message });}
    return data ?? [];
  },

  async delete(id: string): Promise<void> {
    const { error }: SupabaseQueryResult<null> = await supabase
      .from('daily_report_tm_work')
      .delete()
      .eq('id', id);

    if (error) {throw new ApiErrorClass({ code: 'TM_WORK_DELETE_ERROR', message: error.message });}
  },
};

// =============================================
// PROGRESS API
// =============================================

export const progressApi = {
  async getByReportId(reportId: string): Promise<ProgressEntry[]> {
    const { data, error }: SupabaseQueryResult<ProgressEntry[]> = await supabase
      .from('daily_report_progress')
      .select('*')
      .eq('daily_report_id', reportId)
      .order('activity_name', { ascending: true });

    if (error) {throw new ApiErrorClass({ code: 'PROGRESS_FETCH_ERROR', message: error.message });}
    return data ?? [];
  },

  async upsert(entries: ProgressEntry[]): Promise<ProgressEntry[]> {
    if (entries.length === 0) {return [];}

    const { data, error }: SupabaseQueryResult<ProgressEntry[]> = await supabase
      .from('daily_report_progress')
      .upsert(entries, { onConflict: 'id' })
      .select();

    if (error) {throw new ApiErrorClass({ code: 'PROGRESS_UPSERT_ERROR', message: error.message });}
    return data ?? [];
  },

  async delete(id: string): Promise<void> {
    const { error }: SupabaseQueryResult<null> = await supabase
      .from('daily_report_progress')
      .delete()
      .eq('id', id);

    if (error) {throw new ApiErrorClass({ code: 'PROGRESS_DELETE_ERROR', message: error.message });}
  },
};

// =============================================
// DELIVERIES API
// =============================================

export const deliveriesApi = {
  async upsert(entries: DeliveryEntryV2[]): Promise<DeliveryEntryV2[]> {
    if (entries.length === 0) {return [];}

    const { data, error }: SupabaseQueryResult<DeliveryEntryV2[]> = await supabase
      .from('daily_report_deliveries')
      .upsert(entries, { onConflict: 'id' })
      .select();

    if (error) {throw new ApiErrorClass({ code: 'DELIVERIES_UPSERT_ERROR', message: error.message });}
    return data ?? [];
  },

  async delete(id: string): Promise<void> {
    const { error }: SupabaseQueryResult<null> = await supabase
      .from('daily_report_deliveries')
      .delete()
      .eq('id', id);

    if (error) {throw new ApiErrorClass({ code: 'DELIVERIES_DELETE_ERROR', message: error.message });}
  },
};

// =============================================
// VISITORS API
// =============================================

export const visitorsApi = {
  async upsert(entries: VisitorEntryV2[]): Promise<VisitorEntryV2[]> {
    if (entries.length === 0) {return [];}

    const { data, error }: SupabaseQueryResult<VisitorEntryV2[]> = await supabase
      .from('daily_report_visitors')
      .upsert(entries, { onConflict: 'id' })
      .select();

    if (error) {throw new ApiErrorClass({ code: 'VISITORS_UPSERT_ERROR', message: error.message });}
    return data ?? [];
  },

  async delete(id: string): Promise<void> {
    const { error }: SupabaseQueryResult<null> = await supabase
      .from('daily_report_visitors')
      .delete()
      .eq('id', id);

    if (error) {throw new ApiErrorClass({ code: 'VISITORS_DELETE_ERROR', message: error.message });}
  },
};

// =============================================
// PHOTOS API
// =============================================

export const photosApi = {
  async getByReportId(reportId: string): Promise<PhotoEntryV2[]> {
    const { data, error }: SupabaseQueryResult<PhotoEntryV2[]> = await supabase
      .from('daily_report_photos')
      .select('*')
      .eq('daily_report_id', reportId)
      .order('taken_at', { ascending: false });

    if (error) {throw new ApiErrorClass({ code: 'PHOTOS_FETCH_ERROR', message: error.message });}
    return data ?? [];
  },

  async upsert(entries: PhotoEntryV2[]): Promise<PhotoEntryV2[]> {
    if (entries.length === 0) {return [];}

    const { data, error }: SupabaseQueryResult<PhotoEntryV2[]> = await supabase
      .from('daily_report_photos')
      .upsert(entries, { onConflict: 'id' })
      .select();

    if (error) {throw new ApiErrorClass({ code: 'PHOTOS_UPSERT_ERROR', message: error.message });}
    return data ?? [];
  },

  async delete(id: string): Promise<void> {
    const { error }: SupabaseQueryResult<null> = await supabase
      .from('daily_report_photos')
      .delete()
      .eq('id', id);

    if (error) {throw new ApiErrorClass({ code: 'PHOTOS_DELETE_ERROR', message: error.message });}
  },

  async updateStatus(id: string, status: PhotoEntryV2['upload_status']): Promise<void> {
    const { error }: SupabaseQueryResult<null> = await supabase
      .from('daily_report_photos')
      .update({ upload_status: status })
      .eq('id', id);

    if (error) {throw new ApiErrorClass({ code: 'PHOTOS_STATUS_ERROR', message: error.message });}
  },
};

// =============================================
// TEMPLATES API
// =============================================

export const templatesApi = {
  async getForProject(projectId: string): Promise<DailyReportTemplate[]> {
    const { data: user } = await supabase.auth.getUser();

    const { data, error }: SupabaseQueryResult<DailyReportTemplate[]> = await supabase
      .from('daily_report_templates')
      .select('*')
      .or(`project_id.eq.${projectId},user_id.eq.${user.user?.id}`)
      .order('name', { ascending: true });

    if (error) {throw new ApiErrorClass({ code: 'TEMPLATES_FETCH_ERROR', message: error.message });}
    return data ?? [];
  },

  async create(template: Omit<DailyReportTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<DailyReportTemplate> {
    const { data, error }: SupabaseQueryResult<DailyReportTemplate> = await supabase
      .from('daily_report_templates')
      .insert(template)
      .select()
      .single();

    if (error) {throw new ApiErrorClass({ code: 'TEMPLATE_CREATE_ERROR', message: error.message });}
    if (!data) {throw new ApiErrorClass({ code: 'TEMPLATE_CREATE_ERROR', message: 'No data returned' });}
    return data;
  },

  async update(id: string, updates: Partial<DailyReportTemplate>): Promise<DailyReportTemplate> {
    const { data, error }: SupabaseQueryResult<DailyReportTemplate> = await supabase
      .from('daily_report_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {throw new ApiErrorClass({ code: 'TEMPLATE_UPDATE_ERROR', message: error.message });}
    if (!data) {throw new ApiErrorClass({ code: 'TEMPLATE_UPDATE_ERROR', message: 'No data returned' });}
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error }: SupabaseQueryResult<null> = await supabase
      .from('daily_report_templates')
      .delete()
      .eq('id', id);

    if (error) {throw new ApiErrorClass({ code: 'TEMPLATE_DELETE_ERROR', message: error.message });}
  },
};

// =============================================
// BATCH SAVE (for form submission)
// =============================================

/**
 * Save all report data at once
 * Used for form submission to ensure all related data is saved atomically
 */
export async function saveReportWithAllData(
  reportId: string,
  data: {
    report: Partial<DailyReportV2>;
    workforce?: WorkforceEntryV2[];
    equipment?: EquipmentEntryV2[];
    delays?: DelayEntry[];
    safety_incidents?: SafetyIncident[];
    inspections?: InspectionEntry[];
    tm_work?: TMWorkEntry[];
    progress?: ProgressEntry[];
    deliveries?: DeliveryEntryV2[];
    visitors?: VisitorEntryV2[];
    photos?: PhotoEntryV2[];
  }
): Promise<void> {
  // Update main report
  await dailyReportsV2Api.updateReport(reportId, data.report);

  // Save all related data in parallel
  await Promise.all([
    data.workforce && workforceApi.upsert(data.workforce.map(w => ({ ...w, daily_report_id: reportId }))),
    data.equipment && equipmentApi.upsert(data.equipment.map(e => ({ ...e, daily_report_id: reportId }))),
    data.delays && delaysApi.upsert(data.delays.map(d => ({ ...d, daily_report_id: reportId }))),
    data.safety_incidents && safetyIncidentsApi.upsert(data.safety_incidents.map(s => ({ ...s, daily_report_id: reportId }))),
    data.inspections && inspectionsApi.upsert(data.inspections.map(i => ({ ...i, daily_report_id: reportId }))),
    data.tm_work && tmWorkApi.upsert(data.tm_work.map(t => ({ ...t, daily_report_id: reportId }))),
    data.progress && progressApi.upsert(data.progress.map(p => ({ ...p, daily_report_id: reportId }))),
    data.deliveries && deliveriesApi.upsert(data.deliveries.map(d => ({ ...d, daily_report_id: reportId }))),
    data.visitors && visitorsApi.upsert(data.visitors.map(v => ({ ...v, daily_report_id: reportId }))),
    data.photos && photosApi.upsert(data.photos.map(p => ({ ...p, daily_report_id: reportId }))),
  ]);
}
