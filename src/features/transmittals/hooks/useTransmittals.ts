/**
 * Transmittals Hooks
 * React Query hooks for managing document transmittals
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
import type {
  Transmittal,
  TransmittalWithDetails,
  TransmittalWithItems,
  TransmittalItem,
  TransmittalAttachment,
  CreateTransmittalDTO,
  UpdateTransmittalDTO,
  CreateTransmittalItemDTO,
  UpdateTransmittalItemDTO,
  TransmittalFilters,
  TransmittalStatus,
} from '@/types/transmittal';

// Use any type workaround for tables not in generated types yet
const db = supabase as any;

// Query keys
export const transmittalKeys = {
  all: ['transmittals'] as const,
  lists: (filters?: TransmittalFilters) => [...transmittalKeys.all, 'list', filters] as const,
  list: (id: string) => [...transmittalKeys.all, 'detail', id] as const,
  items: (transmittalId: string) => [...transmittalKeys.all, 'items', transmittalId] as const,
  attachments: (transmittalId: string) => [...transmittalKeys.all, 'attachments', transmittalId] as const,
  nextNumber: (projectId: string) => [...transmittalKeys.all, 'next-number', projectId] as const,
};

/**
 * Fetch transmittals with optional filters
 */
export function useTransmittals(filters?: TransmittalFilters) {
  return useQuery({
    queryKey: transmittalKeys.lists(filters),
    queryFn: async (): Promise<TransmittalWithDetails[]> => {
      let query = db
        .from('transmittals')
        .select(`
          *,
          project:projects(id, name, project_number),
          items:transmittal_items(count),
          created_by_user:profiles!transmittals_created_by_fkey(id, full_name, email)
        `)
        .order('created_at', { ascending: false });

      // Project filter
      if (filters?.projectId) {
        query = query.eq('project_id', filters.projectId);
      }

      // Status filter
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      // To company filter
      if (filters?.toCompany) {
        query = query.ilike('to_company', `%${filters.toCompany}%`);
      }

      // Date range filters
      if (filters?.fromDate) {
        query = query.gte('date_sent', filters.fromDate);
      }
      if (filters?.toDate) {
        query = query.lte('date_sent', filters.toDate);
      }

      // Response required filter
      if (filters?.responseRequired !== undefined) {
        query = query.eq('response_required', filters.responseRequired);
      }

      // Search filter
      if (filters?.search) {
        query = query.or(`
          transmittal_number.ilike.%${filters.search}%,
          subject.ilike.%${filters.search}%,
          to_company.ilike.%${filters.search}%
        `);
      }

      const { data, error } = await query;

      if (error) {throw error;}

      // Transform count from array to number
      return (data || []).map((t: any) => ({
        ...t,
        item_count: t.items?.[0]?.count || 0,
        items: [], // Will be loaded separately for detail view
        attachments: [],
      }));
    },
    enabled: true,
  });
}

/**
 * Fetch a single transmittal with all details
 */
export function useTransmittal(transmittalId: string) {
  return useQuery({
    queryKey: transmittalKeys.list(transmittalId),
    queryFn: async (): Promise<TransmittalWithDetails> => {
      const { data, error } = await db
        .from('transmittals')
        .select(`
          *,
          project:projects(id, name, project_number),
          created_by_user:profiles!transmittals_created_by_fkey(id, full_name, email),
          sent_by_user:profiles!transmittals_sent_by_fkey(id, full_name, email),
          distribution_list:distribution_lists(id, name),
          items:transmittal_items(*),
          attachments:transmittal_attachments(*)
        `)
        .eq('id', transmittalId)
        .single();

      if (error) {throw error;}
      return data as TransmittalWithDetails;
    },
    enabled: !!transmittalId,
  });
}

/**
 * Fetch items for a transmittal
 */
export function useTransmittalItems(transmittalId: string) {
  return useQuery({
    queryKey: transmittalKeys.items(transmittalId),
    queryFn: async (): Promise<TransmittalItem[]> => {
      const { data, error } = await db
        .from('transmittal_items')
        .select('*')
        .eq('transmittal_id', transmittalId)
        .order('item_number');

      if (error) {throw error;}
      return (data || []) as TransmittalItem[];
    },
    enabled: !!transmittalId,
  });
}

/**
 * Fetch attachments for a transmittal
 */
export function useTransmittalAttachments(transmittalId: string) {
  return useQuery({
    queryKey: transmittalKeys.attachments(transmittalId),
    queryFn: async (): Promise<TransmittalAttachment[]> => {
      const { data, error } = await db
        .from('transmittal_attachments')
        .select(`
          *,
          uploaded_by_user:profiles!transmittal_attachments_uploaded_by_fkey(id, full_name)
        `)
        .eq('transmittal_id', transmittalId)
        .order('uploaded_at');

      if (error) {throw error;}
      return (data || []) as TransmittalAttachment[];
    },
    enabled: !!transmittalId,
  });
}

/**
 * Get next transmittal number preview
 */
export function useNextTransmittalNumber(projectId: string) {
  const { userProfile } = useAuth();

  return useQuery({
    queryKey: transmittalKeys.nextNumber(projectId),
    queryFn: async (): Promise<string> => {
      if (!userProfile?.company_id) {throw new Error('No company context');}

      const { data, error } = await db.rpc('get_next_transmittal_number', {
        p_company_id: userProfile.company_id,
        p_project_id: projectId,
      });

      if (error) {throw error;}
      return data as string;
    },
    enabled: !!projectId && !!userProfile?.company_id,
  });
}

/**
 * Create a new transmittal
 */
export function useCreateTransmittal() {
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();

  return useMutation({
    mutationFn: async (dto: CreateTransmittalDTO): Promise<Transmittal> => {
      if (!userProfile?.company_id) {throw new Error('No company context');}

      // Create the transmittal
      const { data: transmittal, error: transmittalError } = await db
        .from('transmittals')
        .insert({
          company_id: userProfile.company_id,
          project_id: dto.project_id,
          transmittal_number: dto.transmittal_number || null, // Let trigger auto-generate
          date_sent: dto.date_sent || null,
          date_due: dto.date_due || null,
          from_company: dto.from_company,
          from_contact: dto.from_contact || null,
          from_email: dto.from_email || null,
          from_phone: dto.from_phone || null,
          to_company: dto.to_company,
          to_contact: dto.to_contact || null,
          to_email: dto.to_email || null,
          to_phone: dto.to_phone || null,
          subject: dto.subject,
          remarks: dto.remarks || null,
          cover_letter: dto.cover_letter || null,
          transmission_method: dto.transmission_method || 'email',
          tracking_number: dto.tracking_number || null,
          distribution_list_id: dto.distribution_list_id || null,
          cc_list: dto.cc_list || null,
          cc_external: dto.cc_external || null,
          response_required: dto.response_required || false,
          response_due_date: dto.response_due_date || null,
          status: 'draft',
          created_by: userProfile.id,
        })
        .select()
        .single();

      if (transmittalError) {throw transmittalError;}

      // Add items if provided
      if (dto.items && dto.items.length > 0) {
        const itemInserts = dto.items.map((item, index) => ({
          transmittal_id: transmittal.id,
          item_number: index + 1,
          item_type: item.item_type,
          reference_id: item.reference_id || null,
          reference_number: item.reference_number || null,
          description: item.description,
          specification_section: item.specification_section || null,
          drawing_number: item.drawing_number || null,
          copies: item.copies || 1,
          format: item.format || 'pdf',
          action_required: item.action_required || 'for_information',
          notes: item.notes || null,
        }));

        const { error: itemsError } = await db
          .from('transmittal_items')
          .insert(itemInserts);

        if (itemsError) {throw itemsError;}
      }

      return transmittal as Transmittal;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: transmittalKeys.all });
      queryClient.invalidateQueries({ queryKey: transmittalKeys.nextNumber(data.project_id) });
    },
  });
}

/**
 * Update a transmittal
 */
export function useUpdateTransmittal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...dto
    }: UpdateTransmittalDTO & { id: string }): Promise<Transmittal> => {
      const { data, error } = await db
        .from('transmittals')
        .update(dto)
        .eq('id', id)
        .select()
        .single();

      if (error) {throw error;}
      return data as Transmittal;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: transmittalKeys.all });
      queryClient.invalidateQueries({ queryKey: transmittalKeys.list(data.id) });
    },
  });
}

/**
 * Send a transmittal (change status to sent)
 */
export function useSendTransmittal() {
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();

  return useMutation({
    mutationFn: async (transmittalId: string): Promise<Transmittal> => {
      const { data, error } = await db
        .from('transmittals')
        .update({
          status: 'sent',
          sent_by: userProfile?.id,
          sent_at: new Date().toISOString(),
          date_sent: new Date().toISOString().split('T')[0],
        })
        .eq('id', transmittalId)
        .eq('status', 'draft') // Can only send drafts
        .select()
        .single();

      if (error) {throw error;}
      return data as Transmittal;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: transmittalKeys.all });
      queryClient.invalidateQueries({ queryKey: transmittalKeys.list(data.id) });
    },
  });
}

/**
 * Mark transmittal as received
 */
export function useReceiveTransmittal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      receivedBy,
      receivedDate,
    }: {
      id: string;
      receivedBy: string;
      receivedDate?: string;
    }): Promise<Transmittal> => {
      const { data, error } = await db
        .from('transmittals')
        .update({
          status: 'received',
          received_by: receivedBy,
          received_date: receivedDate || new Date().toISOString().split('T')[0],
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {throw error;}
      return data as Transmittal;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: transmittalKeys.all });
      queryClient.invalidateQueries({ queryKey: transmittalKeys.list(data.id) });
    },
  });
}

/**
 * Acknowledge transmittal
 */
export function useAcknowledgeTransmittal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      notes,
      signature,
    }: {
      id: string;
      notes?: string;
      signature?: string;
    }): Promise<Transmittal> => {
      const { data, error } = await db
        .from('transmittals')
        .update({
          status: 'acknowledged',
          acknowledgment_notes: notes || null,
          acknowledgment_signature: signature || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {throw error;}
      return data as Transmittal;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: transmittalKeys.all });
      queryClient.invalidateQueries({ queryKey: transmittalKeys.list(data.id) });
    },
  });
}

/**
 * Void a transmittal
 */
export function useVoidTransmittal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<Transmittal> => {
      const { data, error } = await db
        .from('transmittals')
        .update({ status: 'void' })
        .eq('id', id)
        .select()
        .single();

      if (error) {throw error;}
      return data as Transmittal;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: transmittalKeys.all });
      queryClient.invalidateQueries({ queryKey: transmittalKeys.list(data.id) });
    },
  });
}

/**
 * Delete a transmittal (drafts only)
 */
export function useDeleteTransmittal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await db
        .from('transmittals')
        .delete()
        .eq('id', id)
        .eq('status', 'draft'); // Can only delete drafts

      if (error) {throw error;}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transmittalKeys.all });
    },
  });
}

/**
 * Add an item to a transmittal
 */
export function useAddTransmittalItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateTransmittalItemDTO & { transmittal_id: string }): Promise<TransmittalItem> => {
      const { data, error } = await db
        .from('transmittal_items')
        .insert({
          transmittal_id: dto.transmittal_id,
          item_type: dto.item_type,
          reference_id: dto.reference_id || null,
          reference_number: dto.reference_number || null,
          description: dto.description,
          specification_section: dto.specification_section || null,
          drawing_number: dto.drawing_number || null,
          copies: dto.copies || 1,
          format: dto.format || 'pdf',
          action_required: dto.action_required || 'for_information',
          notes: dto.notes || null,
        })
        .select()
        .single();

      if (error) {throw error;}
      return data as TransmittalItem;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: transmittalKeys.items(variables.transmittal_id) });
      queryClient.invalidateQueries({ queryKey: transmittalKeys.list(variables.transmittal_id) });
      queryClient.invalidateQueries({ queryKey: transmittalKeys.lists() });
    },
  });
}

/**
 * Update a transmittal item
 */
export function useUpdateTransmittalItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      transmittal_id,
      ...dto
    }: UpdateTransmittalItemDTO & { id: string; transmittal_id: string }): Promise<TransmittalItem> => {
      const { data, error } = await db
        .from('transmittal_items')
        .update(dto)
        .eq('id', id)
        .select()
        .single();

      if (error) {throw error;}
      return data as TransmittalItem;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: transmittalKeys.items(variables.transmittal_id) });
      queryClient.invalidateQueries({ queryKey: transmittalKeys.list(variables.transmittal_id) });
    },
  });
}

/**
 * Remove an item from a transmittal
 */
export function useRemoveTransmittalItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, transmittalId }: { itemId: string; transmittalId: string }): Promise<void> => {
      const { error } = await db
        .from('transmittal_items')
        .delete()
        .eq('id', itemId);

      if (error) {throw error;}
    },
    onSuccess: (_, { transmittalId }) => {
      queryClient.invalidateQueries({ queryKey: transmittalKeys.items(transmittalId) });
      queryClient.invalidateQueries({ queryKey: transmittalKeys.list(transmittalId) });
      queryClient.invalidateQueries({ queryKey: transmittalKeys.lists() });
    },
  });
}

/**
 * Upload attachment to a transmittal
 */
export function useUploadTransmittalAttachment() {
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();

  return useMutation({
    mutationFn: async ({
      transmittalId,
      itemId,
      file,
    }: {
      transmittalId: string;
      itemId?: string;
      file: File;
    }): Promise<TransmittalAttachment> => {
      // Upload file to storage
      const filePath = `transmittals/${transmittalId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) {throw uploadError;}

      // Create attachment record
      const { data, error } = await db
        .from('transmittal_attachments')
        .insert({
          transmittal_id: transmittalId,
          item_id: itemId || null,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: userProfile?.id,
        })
        .select()
        .single();

      if (error) {throw error;}
      return data as TransmittalAttachment;
    },
    onSuccess: (_, { transmittalId }) => {
      queryClient.invalidateQueries({ queryKey: transmittalKeys.attachments(transmittalId) });
      queryClient.invalidateQueries({ queryKey: transmittalKeys.list(transmittalId) });
    },
  });
}

/**
 * Delete an attachment
 */
export function useDeleteTransmittalAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      attachmentId,
      transmittalId,
      filePath,
    }: {
      attachmentId: string;
      transmittalId: string;
      filePath: string;
    }): Promise<void> => {
      // Delete from storage
      await supabase.storage.from('documents').remove([filePath]);

      // Delete record
      const { error } = await db
        .from('transmittal_attachments')
        .delete()
        .eq('id', attachmentId);

      if (error) {throw error;}
    },
    onSuccess: (_, { transmittalId }) => {
      queryClient.invalidateQueries({ queryKey: transmittalKeys.attachments(transmittalId) });
      queryClient.invalidateQueries({ queryKey: transmittalKeys.list(transmittalId) });
    },
  });
}

/**
 * Get transmittal statistics for a project
 */
export function useTransmittalStats(projectId: string) {
  return useQuery({
    queryKey: [...transmittalKeys.all, 'stats', projectId],
    queryFn: async () => {
      const { data, error } = await db
        .from('transmittals')
        .select('status')
        .eq('project_id', projectId);

      if (error) {throw error;}

      const stats = {
        total: data?.length || 0,
        draft: 0,
        sent: 0,
        received: 0,
        acknowledged: 0,
        void: 0,
      };

      (data || []).forEach((t: { status: TransmittalStatus }) => {
        stats[t.status]++;
      });

      return stats;
    },
    enabled: !!projectId,
  });
}
