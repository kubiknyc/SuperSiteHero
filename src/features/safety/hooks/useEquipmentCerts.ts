/**
 * Equipment Certifications Hook
 *
 * React Query hooks for managing operator certifications for equipment
 * including cranes, forklifts, scaffolds, and other certified equipment.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
import { useToast } from '@/lib/notifications/ToastContext';
import type {
  EquipmentCertification,
  CertificationWithOperator,
  CertificationStats,
  OperatorCertificationSummary,
  CertificationAlert,
  CreateEquipmentCertificationDTO,
  UpdateEquipmentCertificationDTO,
  CertificationFilters,
  CertificationType,
  CertificationStatus,
  calculateCertificationStatus,
  calculateDaysUntilExpiry,
} from '@/types/equipment-certifications';

// Use any type workaround for tables not in generated types yet
const db = supabase as any;

// ============================================================================
// Query Keys
// ============================================================================

export const certificationKeys = {
  all: ['equipment-certifications'] as const,
  lists: (filters?: CertificationFilters) => [...certificationKeys.all, 'list', filters] as const,
  detail: (id: string) => [...certificationKeys.all, 'detail', id] as const,
  operator: (operatorId: string) => [...certificationKeys.all, 'operator', operatorId] as const,
  operatorByName: (name: string) => [...certificationKeys.all, 'operator-name', name] as const,
  equipment: (equipmentId: string) => [...certificationKeys.all, 'equipment', equipmentId] as const,
  expiring: (days: number) => [...certificationKeys.all, 'expiring', days] as const,
  stats: (companyId: string) => [...certificationKeys.all, 'stats', companyId] as const,
  alerts: (companyId: string) => [...certificationKeys.all, 'alerts', companyId] as const,
  operatorSummaries: (companyId: string) => [...certificationKeys.all, 'operator-summaries', companyId] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch certifications with optional filters
 */
export function useCertifications(filters: CertificationFilters = {}) {
  const { userProfile } = useAuth();

  return useQuery({
    queryKey: certificationKeys.lists(filters),
    queryFn: async (): Promise<CertificationWithOperator[]> => {
      const companyId = filters.company_id || userProfile?.company_id;
      if (!companyId) {throw new Error('No company context');}

      let query = db
        .from('equipment_certifications')
        .select(`
          *,
          operator:profiles!equipment_certifications_operator_id_fkey(
            id, full_name, email, phone
          ),
          equipment:equipment!equipment_certifications_equipment_id_fkey(
            id, name, equipment_number
          ),
          verified_by_user:profiles!equipment_certifications_verified_by_fkey(
            id, full_name
          )
        `)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('expiration_date', { ascending: true, nullsFirst: false });

      if (filters.operator_id) {
        query = query.eq('operator_id', filters.operator_id);
      }
      if (filters.operator_name) {
        query = query.ilike('operator_name', `%${filters.operator_name}%`);
      }
      if (filters.certification_type) {
        const types = Array.isArray(filters.certification_type)
          ? filters.certification_type
          : [filters.certification_type];
        query = query.in('certification_type', types);
      }
      if (filters.equipment_id) {
        query = query.eq('equipment_id', filters.equipment_id);
      }
      if (typeof filters.is_active === 'boolean') {
        query = query.eq('is_active', filters.is_active);
      }
      if (filters.expiring_within_days) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + filters.expiring_within_days);
        query = query.lte('expiration_date', futureDate.toISOString().split('T')[0]);
        query = query.gte('expiration_date', new Date().toISOString().split('T')[0]);
      }
      if (filters.search) {
        query = query.or(`
          operator_name.ilike.%${filters.search}%,
          certification_name.ilike.%${filters.search}%,
          certification_number.ilike.%${filters.search}%
        `);
      }

      const { data, error } = await query;
      if (error) {throw error;}

      // Add computed status and days until expiry
      return (data || []).map((cert: any) => ({
        ...cert,
        status: calculateCertificationStatus(cert.expiration_date),
        days_until_expiry: calculateDaysUntilExpiry(cert.expiration_date),
      }));
    },
    enabled: !!(filters.company_id || userProfile?.company_id),
  });
}

/**
 * Fetch a single certification
 */
export function useCertification(id: string) {
  return useQuery({
    queryKey: certificationKeys.detail(id),
    queryFn: async (): Promise<CertificationWithOperator> => {
      const { data, error } = await db
        .from('equipment_certifications')
        .select(`
          *,
          operator:profiles!equipment_certifications_operator_id_fkey(
            id, full_name, email, phone, trade, company_name
          ),
          equipment:equipment!equipment_certifications_equipment_id_fkey(
            id, name, equipment_number, make, model
          ),
          verified_by_user:profiles!equipment_certifications_verified_by_fkey(
            id, full_name
          ),
          created_by_user:profiles!equipment_certifications_created_by_fkey(
            id, full_name
          )
        `)
        .eq('id', id)
        .single();

      if (error) {throw error;}

      return {
        ...data,
        status: calculateCertificationStatus(data.expiration_date),
        days_until_expiry: calculateDaysUntilExpiry(data.expiration_date),
      };
    },
    enabled: !!id,
  });
}

/**
 * Fetch certifications for an operator
 */
export function useOperatorCertifications(operatorId: string) {
  return useQuery({
    queryKey: certificationKeys.operator(operatorId),
    queryFn: async (): Promise<CertificationWithOperator[]> => {
      const { data, error } = await db
        .from('equipment_certifications')
        .select(`
          *,
          equipment:equipment!equipment_certifications_equipment_id_fkey(
            id, name, equipment_number
          )
        `)
        .eq('operator_id', operatorId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('expiration_date', { ascending: true, nullsFirst: false });

      if (error) {throw error;}

      return (data || []).map((cert: any) => ({
        ...cert,
        status: calculateCertificationStatus(cert.expiration_date),
        days_until_expiry: calculateDaysUntilExpiry(cert.expiration_date),
      }));
    },
    enabled: !!operatorId,
  });
}

/**
 * Fetch certifications expiring within specified days
 */
export function useExpiringCertifications(days: number = 30) {
  const { userProfile } = useAuth();

  return useQuery({
    queryKey: certificationKeys.expiring(days),
    queryFn: async (): Promise<CertificationWithOperator[]> => {
      if (!userProfile?.company_id) {throw new Error('No company context');}

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const { data, error } = await db
        .from('equipment_certifications')
        .select(`
          *,
          operator:profiles!equipment_certifications_operator_id_fkey(
            id, full_name, email, phone
          )
        `)
        .eq('company_id', userProfile.company_id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .lte('expiration_date', futureDate.toISOString().split('T')[0])
        .gte('expiration_date', new Date().toISOString().split('T')[0])
        .order('expiration_date', { ascending: true });

      if (error) {throw error;}

      return (data || []).map((cert: any) => ({
        ...cert,
        status: calculateCertificationStatus(cert.expiration_date),
        days_until_expiry: calculateDaysUntilExpiry(cert.expiration_date),
      }));
    },
    enabled: !!userProfile?.company_id,
  });
}

/**
 * Fetch certification statistics
 */
export function useCertificationStats(companyId?: string) {
  const { userProfile } = useAuth();
  const effectiveCompanyId = companyId || userProfile?.company_id;

  return useQuery({
    queryKey: certificationKeys.stats(effectiveCompanyId || ''),
    queryFn: async (): Promise<CertificationStats> => {
      if (!effectiveCompanyId) {throw new Error('No company context');}

      const { data: certs, error } = await db
        .from('equipment_certifications')
        .select('*')
        .eq('company_id', effectiveCompanyId)
        .eq('is_active', true)
        .is('deleted_at', null);

      if (error) {throw error;}

      const now = new Date();
      const in30Days = new Date();
      in30Days.setDate(now.getDate() + 30);
      const in60Days = new Date();
      in60Days.setDate(now.getDate() + 60);
      const in90Days = new Date();
      in90Days.setDate(now.getDate() + 90);

      const stats: CertificationStats = {
        total_certifications: certs?.length || 0,
        active_certifications: certs?.length || 0,
        valid_count: 0,
        expiring_soon_count: 0,
        expired_count: 0,
        pending_count: 0,
        by_type: {} as Record<CertificationType, number>,
        operators_with_certifications: 0,
        average_certifications_per_operator: 0,
        expiring_30_days: [],
        expiring_60_days: [],
        expiring_90_days: [],
      };

      const operatorSet = new Set<string>();

      (certs || []).forEach((cert: EquipmentCertification) => {
        const status = calculateCertificationStatus(cert.expiration_date);
        const daysUntil = calculateDaysUntilExpiry(cert.expiration_date);

        switch (status) {
          case 'valid':
            stats.valid_count++;
            break;
          case 'expiring_soon':
            stats.expiring_soon_count++;
            break;
          case 'expired':
            stats.expired_count++;
            break;
          case 'pending':
            stats.pending_count++;
            break;
        }

        // Count by type
        const type = cert.certification_type;
        stats.by_type[type] = (stats.by_type[type] || 0) + 1;

        // Track operators
        if (cert.operator_id) {
          operatorSet.add(cert.operator_id);
        } else {
          operatorSet.add(cert.operator_name);
        }

        // Expiring alerts
        if (daysUntil !== null && daysUntil >= 0) {
          const certWithStatus = { ...cert, status, days_until_expiry: daysUntil };
          if (daysUntil <= 30) {
            stats.expiring_30_days.push(certWithStatus);
          } else if (daysUntil <= 60) {
            stats.expiring_60_days.push(certWithStatus);
          } else if (daysUntil <= 90) {
            stats.expiring_90_days.push(certWithStatus);
          }
        }
      });

      stats.operators_with_certifications = operatorSet.size;
      stats.average_certifications_per_operator = operatorSet.size > 0
        ? Math.round((stats.total_certifications / operatorSet.size) * 10) / 10
        : 0;

      // Sort expiring lists by date
      stats.expiring_30_days.sort((a, b) =>
        (a.days_until_expiry || 0) - (b.days_until_expiry || 0)
      );
      stats.expiring_60_days.sort((a, b) =>
        (a.days_until_expiry || 0) - (b.days_until_expiry || 0)
      );
      stats.expiring_90_days.sort((a, b) =>
        (a.days_until_expiry || 0) - (b.days_until_expiry || 0)
      );

      return stats;
    },
    enabled: !!effectiveCompanyId,
  });
}

/**
 * Fetch operator certification summaries
 */
export function useOperatorCertificationSummaries(companyId?: string) {
  const { userProfile } = useAuth();
  const effectiveCompanyId = companyId || userProfile?.company_id;

  return useQuery({
    queryKey: certificationKeys.operatorSummaries(effectiveCompanyId || ''),
    queryFn: async (): Promise<OperatorCertificationSummary[]> => {
      if (!effectiveCompanyId) {throw new Error('No company context');}

      const { data: certs, error } = await db
        .from('equipment_certifications')
        .select('*')
        .eq('company_id', effectiveCompanyId)
        .eq('is_active', true)
        .is('deleted_at', null);

      if (error) {throw error;}

      // Group by operator
      const operatorMap = new Map<string, OperatorCertificationSummary>();

      (certs || []).forEach((cert: EquipmentCertification) => {
        const key = cert.operator_id || cert.operator_name;
        const status = calculateCertificationStatus(cert.expiration_date);

        if (!operatorMap.has(key)) {
          operatorMap.set(key, {
            operator_id: cert.operator_id,
            operator_name: cert.operator_name,
            operator_company: cert.operator_company,
            total_certifications: 0,
            valid_certifications: 0,
            expiring_certifications: 0,
            expired_certifications: 0,
            certification_types: [],
            next_expiration: null,
          });
        }

        const summary = operatorMap.get(key)!;
        summary.total_certifications++;

        if (status === 'valid') {summary.valid_certifications++;}
        else if (status === 'expiring_soon') {summary.expiring_certifications++;}
        else if (status === 'expired') {summary.expired_certifications++;}

        if (!summary.certification_types.includes(cert.certification_type)) {
          summary.certification_types.push(cert.certification_type);
        }

        if (cert.expiration_date && status !== 'expired') {
          if (!summary.next_expiration || cert.expiration_date < summary.next_expiration) {
            summary.next_expiration = cert.expiration_date;
          }
        }
      });

      return Array.from(operatorMap.values()).sort((a, b) =>
        a.operator_name.localeCompare(b.operator_name)
      );
    },
    enabled: !!effectiveCompanyId,
  });
}

/**
 * Fetch certification alerts
 */
export function useCertificationAlerts(companyId?: string) {
  const { userProfile } = useAuth();
  const effectiveCompanyId = companyId || userProfile?.company_id;

  return useQuery({
    queryKey: certificationKeys.alerts(effectiveCompanyId || ''),
    queryFn: async (): Promise<CertificationAlert[]> => {
      if (!effectiveCompanyId) {throw new Error('No company context');}

      const { data: alerts, error } = await db
        .from('certification_alerts')
        .select(`
          *,
          certification:equipment_certifications(
            *,
            operator:profiles!equipment_certifications_operator_id_fkey(
              id, full_name, email
            )
          )
        `)
        .eq('company_id', effectiveCompanyId)
        .eq('acknowledged', false)
        .order('days_until_expiry', { ascending: true });

      if (error) {throw error;}
      return alerts || [];
    },
    enabled: !!effectiveCompanyId,
  });
}

/**
 * Check if operator can operate specific equipment
 */
export function useCanOperateEquipment(
  operatorId: string,
  equipmentId: string
) {
  return useQuery({
    queryKey: [...certificationKeys.operator(operatorId), 'can-operate', equipmentId],
    queryFn: async () => {
      // Get required certifications for equipment
      const { data: requirements, error: reqError } = await db
        .from('equipment_certification_requirements')
        .select('certification_type')
        .eq('equipment_id', equipmentId)
        .eq('is_required', true);

      if (reqError) {throw reqError;}

      if (!requirements || requirements.length === 0) {
        return { authorized: true, missing: [], expired: [] };
      }

      // Get operator's certifications
      const { data: operatorCerts, error: certError } = await db
        .from('equipment_certifications')
        .select('certification_type, expiration_date, is_active')
        .eq('operator_id', operatorId)
        .eq('is_active', true)
        .is('deleted_at', null);

      if (certError) {throw certError;}

      const requiredTypes = requirements.map((r: any) => r.certification_type);
      const validCerts = (operatorCerts || []).filter(
        (c: any) => calculateCertificationStatus(c.expiration_date) === 'valid'
      );
      const validCertTypes = new Set(validCerts.map((c: any) => c.certification_type));

      const expiredCerts = (operatorCerts || []).filter(
        (c: any) => calculateCertificationStatus(c.expiration_date) === 'expired'
      );
      const expiredCertTypes = new Set(expiredCerts.map((c: any) => c.certification_type));

      const missing = requiredTypes.filter(
        (type: CertificationType) => !validCertTypes.has(type) && !expiredCertTypes.has(type)
      );
      const expired = requiredTypes.filter(
        (type: CertificationType) => expiredCertTypes.has(type) && !validCertTypes.has(type)
      );

      return {
        authorized: missing.length === 0 && expired.length === 0,
        missing,
        expired,
      };
    },
    enabled: !!operatorId && !!equipmentId,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new certification
 */
export function useCreateCertification() {
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (dto: CreateEquipmentCertificationDTO): Promise<EquipmentCertification> => {
      const { data, error } = await db
        .from('equipment_certifications')
        .insert({
          ...dto,
          created_by: userProfile?.id,
          is_active: true,
        })
        .select()
        .single();

      if (error) {throw error;}
      return data as EquipmentCertification;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: certificationKeys.all });
      showToast({
        type: 'success',
        title: 'Certification Added',
        message: `${data.certification_name} certification for ${data.operator_name} has been recorded.`,
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to add certification',
      });
    },
  });
}

/**
 * Update a certification
 */
export function useUpdateCertification() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      dto,
    }: {
      id: string;
      dto: UpdateEquipmentCertificationDTO;
    }): Promise<EquipmentCertification> => {
      const { data, error } = await db
        .from('equipment_certifications')
        .update(dto)
        .eq('id', id)
        .select()
        .single();

      if (error) {throw error;}
      return data as EquipmentCertification;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: certificationKeys.all });
      queryClient.invalidateQueries({ queryKey: certificationKeys.detail(data.id) });
      showToast({
        type: 'success',
        title: 'Certification Updated',
        message: 'The certification has been updated.',
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to update certification',
      });
    },
  });
}

/**
 * Verify a certification
 */
export function useVerifyCertification() {
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (id: string): Promise<EquipmentCertification> => {
      const { data, error } = await db
        .from('equipment_certifications')
        .update({
          verified: true,
          verified_by: userProfile?.id,
          verified_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {throw error;}
      return data as EquipmentCertification;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: certificationKeys.all });
      queryClient.invalidateQueries({ queryKey: certificationKeys.detail(data.id) });
      showToast({
        type: 'success',
        title: 'Certification Verified',
        message: `${data.certification_name} has been verified.`,
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to verify certification',
      });
    },
  });
}

/**
 * Upload certification document
 */
export function useUploadCertificationDocument() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      certificationId,
      file,
    }: {
      certificationId: string;
      file: File;
    }): Promise<EquipmentCertification> => {
      // Upload file to storage
      const filePath = `certifications/${certificationId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) {throw uploadError;}

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Update certification with document URL
      const { data, error } = await db
        .from('equipment_certifications')
        .update({
          document_url: urlData.publicUrl,
          document_file_name: file.name,
        })
        .eq('id', certificationId)
        .select()
        .single();

      if (error) {throw error;}
      return data as EquipmentCertification;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: certificationKeys.detail(data.id) });
      showToast({
        type: 'success',
        title: 'Document Uploaded',
        message: 'Certification document has been uploaded.',
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to upload document',
      });
    },
  });
}

/**
 * Delete (soft delete) a certification
 */
export function useDeleteCertification() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await db
        .from('equipment_certifications')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {throw error;}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certificationKeys.all });
      showToast({
        type: 'success',
        title: 'Certification Deleted',
        message: 'The certification has been removed.',
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to delete certification',
      });
    },
  });
}

/**
 * Acknowledge a certification alert
 */
export function useAcknowledgeCertificationAlert() {
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();

  return useMutation({
    mutationFn: async (alertId: string): Promise<void> => {
      const { error } = await db
        .from('certification_alerts')
        .update({
          acknowledged: true,
          acknowledged_by: userProfile?.id,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) {throw error;}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certificationKeys.alerts('') });
    },
  });
}

/**
 * Send renewal reminder
 */
export function useSendRenewalReminder() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (certificationId: string): Promise<void> => {
      // First, fetch the certification details for the notification
      const { data: certification, error: fetchError } = await db
        .from('equipment_certifications')
        .select(`
          *,
          operator:profiles!equipment_certifications_operator_id_fkey(
            id, full_name, email
          ),
          equipment:equipment!equipment_certifications_equipment_id_fkey(
            id, name, equipment_number
          )
        `)
        .eq('id', certificationId)
        .single();

      if (fetchError) {throw fetchError;}
      if (!certification) {throw new Error('Certification not found');}

      // Update reminder sent flag
      const { error } = await db
        .from('equipment_certifications')
        .update({
          renewal_reminder_sent: true,
          renewal_reminder_date: new Date().toISOString(),
        })
        .eq('id', certificationId);

      if (error) {throw error;}

      // Get operator ID for notification
      const operatorId = certification.operator?.id || certification.operator_id;
      if (!operatorId) {
        console.warn('No operator ID for certification reminder');
        return;
      }

      // Calculate days until expiry
      const expirationDate = certification.expiration_date ? new Date(certification.expiration_date) : null;
      const daysUntilExpiry = expirationDate
        ? Math.ceil((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

      // Trigger notification via edge function
      const { error: notificationError } = await supabase.functions.invoke('send-notification', {
        body: {
          user_id: operatorId,
          type: 'equipment_certification_expiring',
          title: 'Certification Renewal Reminder',
          message: `Your ${certification.certification_type.replace(/_/g, ' ')} certification${
            certification.equipment?.name ? ` for ${certification.equipment.name}` : ''
          }${daysUntilExpiry !== null ? ` expires in ${daysUntilExpiry} days` : ' is expiring soon'}. Please renew it before it expires.`,
          channels: ['in_app', 'email'],
          related_to_type: 'equipment_certification',
          related_to_id: certificationId,
          action_url: `/safety/certifications/${certificationId}`,
          metadata: {
            certification_type: certification.certification_type,
            expiration_date: certification.expiration_date,
            days_until_expiry: daysUntilExpiry,
            equipment_name: certification.equipment?.name,
            equipment_number: certification.equipment?.equipment_number,
          },
          email_template: 'certification_renewal_reminder',
        },
      });

      if (notificationError) {
        console.error('Failed to send notification:', notificationError);
        // Don't throw - the reminder flag was already updated
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certificationKeys.all });
      showToast({
        type: 'success',
        title: 'Reminder Sent',
        message: 'Renewal reminder has been sent.',
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to send reminder',
      });
    },
  });
}
