/**
 * OSHA 300/300A Hook
 *
 * React Query hooks for OSHA 300 Log and 300A Annual Summary management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
import { useToast } from '@/lib/notifications/ToastContext';
import type {
  OSHA300Entry,
  OSHA300ASummary,
  OSHAEmployeeHours,
  OSHAEstablishment,
  OSHAYearlyStats,
  OSHADashboardData,
  MonthlyTrend,
  CreateOSHA300EntryDTO,
  UpdateOSHA300EntryDTO,
  CreateOSHA300ASummaryDTO,
  CertifyOSHA300ASummaryDTO,
  UpdateEmployeeHoursDTO,
  OSHA300Filters,
  OSHA300AFilters,
  OSHACaseClassification,
  InjuryIllnessType,
  BodyPart,
  calculateTRIR,
  calculateDARTRate,
  calculateLTIR,
  calculateSeverityRate,
  generateCaseNumber,
} from '@/types/osha-300';

// Use any type workaround for tables not in generated types yet
const db = supabase as any;

// ============================================================================
// Query Keys
// ============================================================================

export const osha300Keys = {
  all: ['osha-300'] as const,
  // OSHA 300 Log entries
  entries: (filters?: OSHA300Filters) => [...osha300Keys.all, 'entries', filters] as const,
  entry: (id: string) => [...osha300Keys.all, 'entry', id] as const,
  yearEntries: (year: number, companyId: string) =>
    [...osha300Keys.all, 'year-entries', year, companyId] as const,
  // OSHA 300A Summaries
  summaries: (filters?: OSHA300AFilters) => [...osha300Keys.all, 'summaries', filters] as const,
  summary: (id: string) => [...osha300Keys.all, 'summary', id] as const,
  yearSummary: (year: number, companyId: string) =>
    [...osha300Keys.all, 'year-summary', year, companyId] as const,
  // Employee hours
  employeeHours: (year: number, companyId: string) =>
    [...osha300Keys.all, 'employee-hours', year, companyId] as const,
  // Establishments
  establishments: (companyId: string) => [...osha300Keys.all, 'establishments', companyId] as const,
  // Statistics
  yearlyStats: (year: number, companyId: string) =>
    [...osha300Keys.all, 'stats', year, companyId] as const,
  dashboard: (companyId: string) => [...osha300Keys.all, 'dashboard', companyId] as const,
  trends: (companyId: string, years?: number) =>
    [...osha300Keys.all, 'trends', companyId, years] as const,
  nextCaseNumber: (year: number, companyId: string) =>
    [...osha300Keys.all, 'next-case', year, companyId] as const,
};

// ============================================================================
// OSHA 300 Log Query Hooks
// ============================================================================

/**
 * Fetch OSHA 300 entries with filters
 */
export function useOSHA300Entries(filters: OSHA300Filters = {}) {
  const { userProfile } = useAuth();

  return useQuery({
    queryKey: osha300Keys.entries(filters),
    queryFn: async (): Promise<OSHA300Entry[]> => {
      const companyId = filters.company_id || userProfile?.company_id;
      if (!companyId) throw new Error('No company context');

      let query = db
        .from('osha_300_entries')
        .select('*')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('date_of_injury', { ascending: false });

      if (filters.establishment_id) {
        query = query.eq('establishment_id', filters.establishment_id);
      }
      if (filters.year) {
        query = query.eq('year', filters.year);
      }
      if (filters.case_classification) {
        query = query.eq('case_classification', filters.case_classification);
      }
      if (filters.injury_illness_type) {
        query = query.eq('injury_illness_type', filters.injury_illness_type);
      }
      if (filters.date_from) {
        query = query.gte('date_of_injury', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('date_of_injury', filters.date_to);
      }
      if (typeof filters.is_active === 'boolean') {
        query = query.eq('is_active', filters.is_active);
      }
      if (filters.search) {
        query = query.or(`
          case_number.ilike.%${filters.search}%,
          employee_name.ilike.%${filters.search}%,
          injury_description.ilike.%${filters.search}%
        `);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!(filters.company_id || userProfile?.company_id),
  });
}

/**
 * Fetch a single OSHA 300 entry
 */
export function useOSHA300Entry(id: string) {
  return useQuery({
    queryKey: osha300Keys.entry(id),
    queryFn: async (): Promise<OSHA300Entry> => {
      const { data, error } = await db
        .from('osha_300_entries')
        .select(`
          *,
          incident:incident_reports(id, incident_number, incident_date),
          osha_301:osha_301_forms(id, form_number)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

/**
 * Fetch entries for a specific year
 */
export function useOSHA300YearEntries(year: number) {
  const { userProfile } = useAuth();

  return useQuery({
    queryKey: osha300Keys.yearEntries(year, userProfile?.company_id || ''),
    queryFn: async (): Promise<OSHA300Entry[]> => {
      if (!userProfile?.company_id) throw new Error('No company context');

      const { data, error } = await db
        .from('osha_300_entries')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .eq('year', year)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('case_number');

      if (error) throw error;
      return data || [];
    },
    enabled: !!userProfile?.company_id && !!year,
  });
}

/**
 * Get next case number for a year
 */
export function useNextCaseNumber(year: number) {
  const { userProfile } = useAuth();

  return useQuery({
    queryKey: osha300Keys.nextCaseNumber(year, userProfile?.company_id || ''),
    queryFn: async (): Promise<string> => {
      if (!userProfile?.company_id) throw new Error('No company context');

      const { data, error } = await db
        .from('osha_300_entries')
        .select('case_number')
        .eq('company_id', userProfile.company_id)
        .eq('year', year)
        .order('case_number', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextSequence = 1;
      if (data && data.length > 0) {
        const lastNumber = data[0].case_number;
        const match = lastNumber.match(/-(\d+)$/);
        if (match) {
          nextSequence = parseInt(match[1], 10) + 1;
        }
      }

      return generateCaseNumber(year, nextSequence);
    },
    enabled: !!userProfile?.company_id && !!year,
  });
}

// ============================================================================
// OSHA 300A Summary Query Hooks
// ============================================================================

/**
 * Fetch OSHA 300A summaries
 */
export function useOSHA300ASummaries(filters: OSHA300AFilters = {}) {
  const { userProfile } = useAuth();

  return useQuery({
    queryKey: osha300Keys.summaries(filters),
    queryFn: async (): Promise<OSHA300ASummary[]> => {
      const companyId = filters.company_id || userProfile?.company_id;
      if (!companyId) throw new Error('No company context');

      let query = db
        .from('osha_300a_summaries')
        .select('*')
        .eq('company_id', companyId)
        .order('year', { ascending: false });

      if (filters.establishment_id) {
        query = query.eq('establishment_id', filters.establishment_id);
      }
      if (filters.year) {
        query = query.eq('year', filters.year);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!(filters.company_id || userProfile?.company_id),
  });
}

/**
 * Fetch a single OSHA 300A summary
 */
export function useOSHA300ASummary(id: string) {
  return useQuery({
    queryKey: osha300Keys.summary(id),
    queryFn: async (): Promise<OSHA300ASummary> => {
      const { data, error } = await db
        .from('osha_300a_summaries')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

/**
 * Fetch or generate summary for a specific year
 */
export function useOSHA300AYearSummary(year: number) {
  const { userProfile } = useAuth();

  return useQuery({
    queryKey: osha300Keys.yearSummary(year, userProfile?.company_id || ''),
    queryFn: async (): Promise<OSHA300ASummary | null> => {
      if (!userProfile?.company_id) throw new Error('No company context');

      // Try to get existing summary
      const { data: existing, error: existingError } = await db
        .from('osha_300a_summaries')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .eq('year', year)
        .maybeSingle();

      if (existingError) throw existingError;
      if (existing) return existing;

      // No existing summary - return null (use calculateYearSummary to generate)
      return null;
    },
    enabled: !!userProfile?.company_id && !!year,
  });
}

/**
 * Calculate summary data from entries (for preview or generation)
 */
export function useCalculateYearSummary(year: number) {
  const { userProfile } = useAuth();

  return useQuery({
    queryKey: [...osha300Keys.yearSummary(year, userProfile?.company_id || ''), 'calculate'],
    queryFn: async (): Promise<Partial<OSHA300ASummary>> => {
      if (!userProfile?.company_id) throw new Error('No company context');

      // Get all entries for the year
      const { data: entries, error: entriesError } = await db
        .from('osha_300_entries')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .eq('year', year)
        .eq('is_active', true)
        .is('deleted_at', null);

      if (entriesError) throw entriesError;

      // Get employee hours for the year
      const { data: hours, error: hoursError } = await db
        .from('osha_employee_hours')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .eq('year', year)
        .maybeSingle();

      if (hoursError) throw hoursError;

      // Calculate totals
      let total_deaths = 0;
      let total_days_away = 0;
      let total_job_transfer_restriction = 0;
      let total_other_recordable = 0;
      let total_days_away_from_work = 0;
      let total_days_job_transfer_restriction = 0;
      let total_injuries = 0;
      let total_skin_disorders = 0;
      let total_respiratory_conditions = 0;
      let total_poisonings = 0;
      let total_hearing_loss = 0;
      let total_other_illnesses = 0;

      (entries || []).forEach((entry: OSHA300Entry) => {
        // Classification counts
        switch (entry.case_classification) {
          case 'death':
            total_deaths++;
            break;
          case 'days_away':
            total_days_away++;
            break;
          case 'job_transfer_restriction':
            total_job_transfer_restriction++;
            break;
          case 'other_recordable':
            total_other_recordable++;
            break;
        }

        // Days counts
        total_days_away_from_work += entry.days_away_from_work || 0;
        total_days_job_transfer_restriction += entry.days_job_transfer_restriction || 0;

        // Injury/Illness type counts
        switch (entry.injury_illness_type) {
          case 'injury':
            total_injuries++;
            break;
          case 'skin_disorder':
            total_skin_disorders++;
            break;
          case 'respiratory_condition':
            total_respiratory_conditions++;
            break;
          case 'poisoning':
            total_poisonings++;
            break;
          case 'hearing_loss':
            total_hearing_loss++;
            break;
          case 'all_other_illnesses':
            total_other_illnesses++;
            break;
        }
      });

      const total_cases =
        total_deaths + total_days_away + total_job_transfer_restriction + total_other_recordable;
      const average_annual_employees = hours?.average_employees || 0;
      const total_hours_worked = hours?.total_hours_worked || 0;

      // Calculate rates
      const trir = calculateTRIR(total_cases, total_hours_worked);
      const dart_rate = calculateDARTRate(
        total_days_away,
        total_job_transfer_restriction,
        total_hours_worked
      );
      const ltir = calculateLTIR(total_deaths, total_days_away, total_hours_worked);
      const severity_rate = calculateSeverityRate(
        total_days_away_from_work,
        total_days_job_transfer_restriction,
        total_hours_worked
      );

      return {
        year,
        average_annual_employees,
        total_hours_worked,
        total_deaths,
        total_days_away,
        total_job_transfer_restriction,
        total_other_recordable,
        total_cases,
        total_days_away_from_work,
        total_days_job_transfer_restriction,
        total_injuries,
        total_skin_disorders,
        total_respiratory_conditions,
        total_poisonings,
        total_hearing_loss,
        total_other_illnesses,
        trir,
        dart_rate,
        ltir,
        severity_rate,
      };
    },
    enabled: !!userProfile?.company_id && !!year,
  });
}

/**
 * Fetch employee hours data
 */
export function useEmployeeHours(year: number) {
  const { userProfile } = useAuth();

  return useQuery({
    queryKey: osha300Keys.employeeHours(year, userProfile?.company_id || ''),
    queryFn: async (): Promise<OSHAEmployeeHours | null> => {
      if (!userProfile?.company_id) throw new Error('No company context');

      const { data, error } = await db
        .from('osha_employee_hours')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .eq('year', year)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userProfile?.company_id && !!year,
  });
}

/**
 * Fetch establishments
 */
export function useEstablishments() {
  const { userProfile } = useAuth();

  return useQuery({
    queryKey: osha300Keys.establishments(userProfile?.company_id || ''),
    queryFn: async (): Promise<OSHAEstablishment[]> => {
      if (!userProfile?.company_id) throw new Error('No company context');

      const { data, error } = await db
        .from('osha_establishments')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!userProfile?.company_id,
  });
}

/**
 * Fetch OSHA dashboard data
 */
export function useOSHADashboard() {
  const { userProfile } = useAuth();
  const currentYear = new Date().getFullYear();

  return useQuery({
    queryKey: osha300Keys.dashboard(userProfile?.company_id || ''),
    queryFn: async (): Promise<OSHADashboardData> => {
      if (!userProfile?.company_id) throw new Error('No company context');

      // Get current year entries
      const { data: currentEntries, error: currentError } = await db
        .from('osha_300_entries')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .eq('year', currentYear)
        .eq('is_active', true)
        .is('deleted_at', null);

      if (currentError) throw currentError;

      // Get previous year entries
      const { data: previousEntries, error: previousError } = await db
        .from('osha_300_entries')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .eq('year', currentYear - 1)
        .eq('is_active', true)
        .is('deleted_at', null);

      if (previousError) throw previousError;

      // Get hours for both years
      const { data: currentHours } = await db
        .from('osha_employee_hours')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .eq('year', currentYear)
        .maybeSingle();

      const { data: previousHours } = await db
        .from('osha_employee_hours')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .eq('year', currentYear - 1)
        .maybeSingle();

      // Calculate statistics
      const calculateStats = (
        entries: OSHA300Entry[],
        hours: OSHAEmployeeHours | null
      ): OSHAYearlyStats => {
        const stats: OSHAYearlyStats = {
          year: currentYear,
          total_cases: entries.length,
          deaths: 0,
          days_away_cases: 0,
          job_transfer_restriction_cases: 0,
          other_recordable_cases: 0,
          total_days_away: 0,
          total_days_restricted: 0,
          injuries: 0,
          illnesses: 0,
          trir: null,
          dart_rate: null,
          ltir: null,
        };

        entries.forEach((entry) => {
          switch (entry.case_classification) {
            case 'death':
              stats.deaths++;
              break;
            case 'days_away':
              stats.days_away_cases++;
              break;
            case 'job_transfer_restriction':
              stats.job_transfer_restriction_cases++;
              break;
            case 'other_recordable':
              stats.other_recordable_cases++;
              break;
          }

          stats.total_days_away += entry.days_away_from_work || 0;
          stats.total_days_restricted += entry.days_job_transfer_restriction || 0;

          if (entry.injury_illness_type === 'injury') {
            stats.injuries++;
          } else {
            stats.illnesses++;
          }
        });

        const totalHours = hours?.total_hours_worked || 0;
        stats.trir = calculateTRIR(stats.total_cases, totalHours);
        stats.dart_rate = calculateDARTRate(
          stats.days_away_cases,
          stats.job_transfer_restriction_cases,
          totalHours
        );
        stats.ltir = calculateLTIR(stats.deaths, stats.days_away_cases, totalHours);

        return stats;
      };

      // Calculate monthly trends
      const monthlyTrends: MonthlyTrend[] = [];
      for (let month = 1; month <= 12; month++) {
        const monthEntries = (currentEntries || []).filter((e: OSHA300Entry) => {
          const entryDate = new Date(e.date_of_injury);
          return entryDate.getMonth() + 1 === month;
        });

        monthlyTrends.push({
          month,
          year: currentYear,
          cases: monthEntries.length,
          days_away: monthEntries.reduce(
            (sum: number, e: OSHA300Entry) => sum + (e.days_away_from_work || 0),
            0
          ),
          days_restricted: monthEntries.reduce(
            (sum: number, e: OSHA300Entry) => sum + (e.days_job_transfer_restriction || 0),
            0
          ),
        });
      }

      // Calculate breakdowns
      const casesByClassification: Record<OSHACaseClassification, number> = {
        death: 0,
        days_away: 0,
        job_transfer_restriction: 0,
        other_recordable: 0,
      };

      const casesByInjuryType: Record<InjuryIllnessType, number> = {
        injury: 0,
        skin_disorder: 0,
        respiratory_condition: 0,
        poisoning: 0,
        hearing_loss: 0,
        all_other_illnesses: 0,
      };

      const casesByBodyPart: Partial<Record<BodyPart, number>> = {};

      (currentEntries || []).forEach((entry: OSHA300Entry) => {
        casesByClassification[entry.case_classification]++;
        casesByInjuryType[entry.injury_illness_type]++;
        if (entry.body_part_affected) {
          casesByBodyPart[entry.body_part_affected] =
            (casesByBodyPart[entry.body_part_affected] || 0) + 1;
        }
      });

      return {
        current_year_stats: calculateStats(currentEntries || [], currentHours),
        previous_year_stats: previousEntries
          ? calculateStats(previousEntries, previousHours)
          : null,
        monthly_trends: monthlyTrends,
        cases_by_classification: casesByClassification,
        cases_by_injury_type: casesByInjuryType,
        cases_by_body_part: casesByBodyPart as Record<BodyPart, number>,
        recent_cases: (currentEntries || []).slice(0, 5),
      };
    },
    enabled: !!userProfile?.company_id,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create OSHA 300 entry
 */
export function useCreateOSHA300Entry() {
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (dto: CreateOSHA300EntryDTO): Promise<OSHA300Entry> => {
      // Get next case number
      const { data: existing } = await db
        .from('osha_300_entries')
        .select('case_number')
        .eq('company_id', dto.company_id)
        .eq('year', dto.year)
        .order('case_number', { ascending: false })
        .limit(1);

      let nextSequence = 1;
      if (existing && existing.length > 0) {
        const match = existing[0].case_number.match(/-(\d+)$/);
        if (match) {
          nextSequence = parseInt(match[1], 10) + 1;
        }
      }

      const caseNumber = generateCaseNumber(dto.year, nextSequence);

      const { data, error } = await db
        .from('osha_300_entries')
        .insert({
          ...dto,
          case_number: caseNumber,
          entry_date: new Date().toISOString().split('T')[0],
          is_active: true,
          created_by: userProfile?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: osha300Keys.all });
      showToast({
        type: 'success',
        title: 'Entry Added',
        message: `OSHA 300 entry ${data.case_number} has been recorded.`,
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to create entry',
      });
    },
  });
}

/**
 * Update OSHA 300 entry
 */
export function useUpdateOSHA300Entry() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      dto,
    }: {
      id: string;
      dto: UpdateOSHA300EntryDTO;
    }): Promise<OSHA300Entry> => {
      const { data, error } = await db
        .from('osha_300_entries')
        .update(dto)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: osha300Keys.all });
      queryClient.invalidateQueries({ queryKey: osha300Keys.entry(data.id) });
      showToast({
        type: 'success',
        title: 'Entry Updated',
        message: 'OSHA 300 entry has been updated.',
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to update entry',
      });
    },
  });
}

/**
 * Delete OSHA 300 entry (soft delete)
 */
export function useDeleteOSHA300Entry() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await db
        .from('osha_300_entries')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: osha300Keys.all });
      showToast({
        type: 'success',
        title: 'Entry Deleted',
        message: 'OSHA 300 entry has been removed.',
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to delete entry',
      });
    },
  });
}

/**
 * Generate/Create OSHA 300A summary from log entries
 */
export function useGenerateOSHA300ASummary() {
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (dto: CreateOSHA300ASummaryDTO): Promise<OSHA300ASummary> => {
      // Calculate totals from entries
      const { data: entries } = await db
        .from('osha_300_entries')
        .select('*')
        .eq('company_id', dto.company_id)
        .eq('year', dto.year)
        .eq('is_active', true)
        .is('deleted_at', null);

      let total_deaths = 0;
      let total_days_away = 0;
      let total_job_transfer_restriction = 0;
      let total_other_recordable = 0;
      let total_days_away_from_work = 0;
      let total_days_job_transfer_restriction = 0;
      let total_injuries = 0;
      let total_skin_disorders = 0;
      let total_respiratory_conditions = 0;
      let total_poisonings = 0;
      let total_hearing_loss = 0;
      let total_other_illnesses = 0;

      (entries || []).forEach((entry: OSHA300Entry) => {
        switch (entry.case_classification) {
          case 'death':
            total_deaths++;
            break;
          case 'days_away':
            total_days_away++;
            break;
          case 'job_transfer_restriction':
            total_job_transfer_restriction++;
            break;
          case 'other_recordable':
            total_other_recordable++;
            break;
        }

        total_days_away_from_work += entry.days_away_from_work || 0;
        total_days_job_transfer_restriction += entry.days_job_transfer_restriction || 0;

        switch (entry.injury_illness_type) {
          case 'injury':
            total_injuries++;
            break;
          case 'skin_disorder':
            total_skin_disorders++;
            break;
          case 'respiratory_condition':
            total_respiratory_conditions++;
            break;
          case 'poisoning':
            total_poisonings++;
            break;
          case 'hearing_loss':
            total_hearing_loss++;
            break;
          case 'all_other_illnesses':
            total_other_illnesses++;
            break;
        }
      });

      const total_cases =
        total_deaths + total_days_away + total_job_transfer_restriction + total_other_recordable;

      // Calculate rates
      const trir = calculateTRIR(total_cases, dto.total_hours_worked);
      const dart_rate = calculateDARTRate(
        total_days_away,
        total_job_transfer_restriction,
        dto.total_hours_worked
      );
      const ltir = calculateLTIR(total_deaths, total_days_away, dto.total_hours_worked);
      const severity_rate = calculateSeverityRate(
        total_days_away_from_work,
        total_days_job_transfer_restriction,
        dto.total_hours_worked
      );

      const { data, error } = await db
        .from('osha_300a_summaries')
        .insert({
          ...dto,
          total_deaths,
          total_days_away,
          total_job_transfer_restriction,
          total_other_recordable,
          total_cases,
          total_days_away_from_work,
          total_days_job_transfer_restriction,
          total_injuries,
          total_skin_disorders,
          total_respiratory_conditions,
          total_poisonings,
          total_hearing_loss,
          total_other_illnesses,
          trir,
          dart_rate,
          ltir,
          severity_rate,
          status: 'draft',
          created_by: userProfile?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: osha300Keys.all });
      showToast({
        type: 'success',
        title: 'Summary Generated',
        message: `OSHA 300A summary for ${data.year} has been generated.`,
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to generate summary',
      });
    },
  });
}

/**
 * Certify OSHA 300A summary
 */
export function useCertifyOSHA300ASummary() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      dto,
    }: {
      id: string;
      dto: CertifyOSHA300ASummaryDTO;
    }): Promise<OSHA300ASummary> => {
      const { data, error } = await db
        .from('osha_300a_summaries')
        .update({
          ...dto,
          certified: true,
          certification_date: new Date().toISOString().split('T')[0],
          status: 'certified',
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: osha300Keys.all });
      queryClient.invalidateQueries({ queryKey: osha300Keys.summary(data.id) });
      showToast({
        type: 'success',
        title: 'Summary Certified',
        message: `OSHA 300A summary for ${data.year} has been certified.`,
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to certify summary',
      });
    },
  });
}

/**
 * Mark summary as posted
 */
export function usePostOSHA300ASummary() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (id: string): Promise<OSHA300ASummary> => {
      const { data, error } = await db
        .from('osha_300a_summaries')
        .update({
          status: 'posted',
          posting_start_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: osha300Keys.all });
      showToast({
        type: 'success',
        title: 'Summary Posted',
        message: `OSHA 300A summary for ${data.year} is now posted.`,
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to mark as posted',
      });
    },
  });
}

/**
 * Update employee hours
 */
export function useUpdateEmployeeHours() {
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (dto: UpdateEmployeeHoursDTO): Promise<OSHAEmployeeHours> => {
      if (!userProfile?.company_id) throw new Error('No company context');

      // Upsert employee hours
      const { data, error } = await db
        .from('osha_employee_hours')
        .upsert(
          {
            company_id: userProfile.company_id,
            year: dto.year,
            average_employees: dto.average_employees,
            total_hours_worked: dto.total_hours_worked,
            monthly_data: dto.monthly_data || null,
            notes: dto.notes || null,
            created_by: userProfile.id,
          },
          { onConflict: 'company_id,year' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: osha300Keys.employeeHours(data.year, '') });
      queryClient.invalidateQueries({ queryKey: osha300Keys.dashboard('') });
      showToast({
        type: 'success',
        title: 'Hours Updated',
        message: `Employee hours for ${data.year} have been updated.`,
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to update employee hours',
      });
    },
  });
}
