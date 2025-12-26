// @ts-nocheck
/**
 * Material Deliveries API Service
 * Comprehensive CRUD operations for material receiving tracker
 * Matches migration 043_material_receiving.sql
 */

import { supabase } from '@/lib/supabase';
import type {
  MaterialDelivery,
  MaterialDeliveryPhoto,
  MaterialDeliveryWithPhotos,
  MaterialDeliveryWithRelations,
  CreateMaterialDeliveryDTO,
  UpdateMaterialDeliveryDTO,
  CreateMaterialDeliveryPhotoDTO,
  UpdateMaterialDeliveryPhotoDTO,
  DeliveryStatistics,
  DeliveryStatus,
  ConditionStatus,
  MaterialCategory,
} from '@/types/material-receiving';
import { logger } from '../../utils/logger';


// =====================================================
// DELIVERIES - CRUD OPERATIONS
// =====================================================

/**
 * Get all deliveries for a project with optional filtering
 */
export async function getDeliveries(
  projectId: string,
  filters?: {
    delivery_status?: DeliveryStatus | DeliveryStatus[];
    condition_status?: ConditionStatus | ConditionStatus[];
    material_category?: MaterialCategory | string;
    vendor_name?: string;
    storage_location?: string;
    date_from?: string;
    date_to?: string;
    has_issues?: boolean;
  }
): Promise<{ data: MaterialDelivery[] | null; error: any }> {
  try {
    let query = supabase
      .from('material_deliveries')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('delivery_date', { ascending: false });

    // Apply filters
    if (filters?.delivery_status) {
      if (Array.isArray(filters.delivery_status)) {
        query = query.in('delivery_status', filters.delivery_status);
      } else {
        query = query.eq('delivery_status', filters.delivery_status);
      }
    }

    if (filters?.condition_status) {
      if (Array.isArray(filters.condition_status)) {
        query = query.in('condition_status', filters.condition_status);
      } else {
        query = query.eq('condition_status', filters.condition_status);
      }
    }

    if (filters?.material_category) {
      query = query.eq('material_category', filters.material_category);
    }

    if (filters?.vendor_name) {
      query = query.ilike('vendor_name', `%${filters.vendor_name}%`);
    }

    if (filters?.storage_location) {
      query = query.ilike('storage_location', `%${filters.storage_location}%`);
    }

    if (filters?.date_from) {
      query = query.gte('delivery_date', filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte('delivery_date', filters.date_to);
    }

    if (filters?.has_issues) {
      query = query.neq('condition_status', 'good');
    }

    const { data, error } = await query;

    return { data: data as any, error };
  } catch (error) {
    logger.error('Error fetching deliveries:', error);
    return { data: null, error };
  }
}

/**
 * Get a single delivery by ID
 */
export async function getDelivery(
  deliveryId: string
): Promise<{ data: MaterialDelivery | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('material_deliveries')
      .select('*')
      .eq('id', deliveryId)
      .is('deleted_at', null)
      .single();

    return { data: data as any, error };
  } catch (error) {
    logger.error('Error fetching delivery:', error);
    return { data: null, error };
  }
}

/**
 * Get delivery with photos included
 */
export async function getDeliveryWithPhotos(
  deliveryId: string
): Promise<{ data: MaterialDeliveryWithPhotos | null; error: any }> {
  try {
    // Fetch delivery
    const { data: delivery, error: deliveryError } = await supabase
      .from('material_deliveries')
      .select('*')
      .eq('id', deliveryId)
      .is('deleted_at', null)
      .single();

    if (deliveryError || !delivery) {
      return { data: null, error: deliveryError };
    }

    // Fetch photos
    const { data: photos, error: photosError } = await supabase
      .from('material_delivery_photos')
      .select('*')
      .eq('delivery_id', deliveryId)
      .order('uploaded_at', { ascending: false });

    if (photosError) {
      return { data: null, error: photosError };
    }

    const result: MaterialDeliveryWithPhotos = {
      ...delivery,
      photos: photos || [],
    } as any;

    return { data: result, error: null };
  } catch (error) {
    logger.error('Error fetching delivery with photos:', error);
    return { data: null, error };
  }
}

/**
 * Get delivery with all relations (photos, submittal, daily report, user)
 */
export async function getDeliveryWithRelations(
  deliveryId: string
): Promise<{ data: MaterialDeliveryWithRelations | null; error: any }> {
  try {
    // Fetch delivery
    const { data: delivery, error: deliveryError } = await supabase
      .from('material_deliveries')
      .select('*')
      .eq('id', deliveryId)
      .is('deleted_at', null)
      .single();

    if (deliveryError || !delivery) {
      return { data: null, error: deliveryError };
    }

    // Fetch photos
    const { data: photos } = await supabase
      .from('material_delivery_photos')
      .select('*')
      .eq('delivery_id', deliveryId)
      .order('uploaded_at', { ascending: false});

    // Fetch submittal if linked
    let submittal = null;
    if (delivery.submittal_id) {
      const { data: submittalData } = await supabase
        .from('workflow_items')
        .select('id, title, status')
        .eq('id', delivery.submittal_id)
        .single();
      submittal = submittalData;
    }

    // Fetch daily report if linked
    let daily_report = null;
    if (delivery.daily_report_id) {
      const { data: reportData } = await supabase
        .from('daily_reports')
        .select('id, report_date')
        .eq('id', delivery.daily_report_id)
        .single();
      daily_report = reportData;
    }

    // Fetch user if linked
    let received_by_user = null;
    if (delivery.received_by_user_id) {
      const { data: userData } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('id', delivery.received_by_user_id)
        .single();
      received_by_user = userData;
    }

    const result: MaterialDeliveryWithRelations = {
      ...delivery as any,
      photos: photos || [],
      submittal,
      daily_report,
      received_by_user: received_by_user as any,
    };

    return { data: result, error: null };
  } catch (error) {
    logger.error('Error fetching delivery with relations:', error);
    return { data: null, error };
  }
}

/**
 * Create a new delivery
 */
export async function createDelivery(
  delivery: CreateMaterialDeliveryDTO,
  companyId: string
): Promise<{ data: MaterialDelivery | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('material_deliveries')
      .insert({
        ...delivery as any,
        company_id: companyId,
        delivery_status: delivery.delivery_status || 'received',
        condition_status: delivery.condition_status || 'good',
        quantity_rejected: delivery.quantity_rejected || 0,
      })
      .select()
      .single();

    return { data: data as any, error };
  } catch (error) {
    logger.error('Error creating delivery:', error);
    return { data: null, error };
  }
}

/**
 * Update an existing delivery
 */
export async function updateDelivery(
  delivery: UpdateMaterialDeliveryDTO
): Promise<{ data: MaterialDelivery | null; error: any }> {
  try {
    const { id, ...updates } = delivery;

    const { data, error } = await supabase
      .from('material_deliveries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    return { data: data as any, error };
  } catch (error) {
    logger.error('Error updating delivery:', error);
    return { data: null, error };
  }
}

/**
 * Soft delete a delivery
 */
export async function deleteDelivery(
  deliveryId: string
): Promise<{ data: MaterialDelivery | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('material_deliveries')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', deliveryId)
      .select()
      .single();

    return { data: data as any, error };
  } catch (error) {
    logger.error('Error deleting delivery:', error);
    return { data: null, error };
  }
}

// =====================================================
// PHOTOS - CRUD OPERATIONS
// =====================================================

/**
 * Get all photos for a delivery
 */
export async function getDeliveryPhotos(
  deliveryId: string
): Promise<{ data: MaterialDeliveryPhoto[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('material_delivery_photos')
      .select('*')
      .eq('delivery_id', deliveryId)
      .order('uploaded_at', { ascending: false });

    return { data: data as any, error };
  } catch (error) {
    logger.error('Error fetching delivery photos:', error);
    return { data: null, error };
  }
}

/**
 * Create a delivery photo
 */
export async function createDeliveryPhoto(
  photo: CreateMaterialDeliveryPhotoDTO
): Promise<{ data: MaterialDeliveryPhoto | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('material_delivery_photos')
      .insert(photo)
      .select()
      .single();

    return { data: data as any, error };
  } catch (error) {
    logger.error('Error creating delivery photo:', error);
    return { data: null, error };
  }
}

/**
 * Update a delivery photo
 */
export async function updateDeliveryPhoto(
  photo: UpdateMaterialDeliveryPhotoDTO
): Promise<{ data: MaterialDeliveryPhoto | null; error: any }> {
  try {
    const { id, ...updates } = photo;

    const { data, error } = await supabase
      .from('material_delivery_photos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    return { data: data as any, error };
  } catch (error) {
    logger.error('Error updating delivery photo:', error);
    return { data: null, error };
  }
}

/**
 * Delete a delivery photo
 */
export async function deleteDeliveryPhoto(
  photoId: string
): Promise<{ data: MaterialDeliveryPhoto | null; error: any }> {
  try {
    const { data, error} = await supabase
      .from('material_delivery_photos')
      .delete()
      .eq('id', photoId)
      .select()
      .single();

    return { data: data as any, error };
  } catch (error) {
    logger.error('Error deleting delivery photo:', error);
    return { data: null, error };
  }
}

// =====================================================
// SEARCH & FILTERING
// =====================================================

/**
 * Search deliveries by material, vendor, or ticket number
 */
export async function searchDeliveries(
  projectId: string,
  searchTerm: string
): Promise<{ data: MaterialDelivery[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .rpc('search_material_deliveries', {
        p_project_id: projectId,
        p_search_term: searchTerm,
      });

    return { data: data as any, error };
  } catch (error) {
    logger.error('Error searching deliveries:', error);
    return { data: null, error };
  }
}

/**
 * Get deliveries by vendor
 */
export async function getDeliveriesByVendor(
  projectId: string,
  vendorName: string
): Promise<{ data: MaterialDelivery[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('material_deliveries')
      .select('*')
      .eq('project_id', projectId)
      .ilike('vendor_name', `%${vendorName}%`)
      .is('deleted_at', null)
      .order('delivery_date', { ascending: false });

    return { data: data as any, error };
  } catch (error) {
    logger.error('Error fetching deliveries by vendor:', error);
    return { data: null, error };
  }
}

/**
 * Get deliveries by category
 */
export async function getDeliveriesByCategory(
  projectId: string,
  category: MaterialCategory | string
): Promise<{ data: MaterialDelivery[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('material_deliveries')
      .select('*')
      .eq('project_id', projectId)
      .eq('material_category', category)
      .is('deleted_at', null)
      .order('delivery_date', { ascending: false });

    return { data: data as any, error };
  } catch (error) {
    logger.error('Error fetching deliveries by category:', error);
    return { data: null, error };
  }
}

/**
 * Get deliveries by storage location
 */
export async function getDeliveriesByStorageLocation(
  projectId: string,
  storageLocation: string
): Promise<{ data: MaterialDelivery[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('material_deliveries')
      .select('*')
      .eq('project_id', projectId)
      .ilike('storage_location', `%${storageLocation}%`)
      .is('deleted_at', null)
      .order('delivery_date', { ascending: false });

    return { data: data as any, error };
  } catch (error) {
    logger.error('Error fetching deliveries by storage location:', error);
    return { data: null, error };
  }
}

/**
 * Get deliveries with issues (damaged, defective, or incorrect)
 */
export async function getDeliveriesWithIssues(
  projectId: string
): Promise<{ data: MaterialDelivery[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('material_deliveries')
      .select('*')
      .eq('project_id', projectId)
      .neq('condition_status', 'good')
      .is('deleted_at', null)
      .order('delivery_date', { ascending: false });

    return { data: data as any, error };
  } catch (error) {
    logger.error('Error fetching deliveries with issues:', error);
    return { data: null, error };
  }
}

// =====================================================
// STATISTICS & ANALYTICS
// =====================================================

/**
 * Get delivery statistics for a project
 * Uses the database function get_delivery_stats_by_project
 */
export async function getDeliveryStatistics(
  projectId: string
): Promise<{ data: DeliveryStatistics | null; error: any }> {
  try {
    const { data, error } = await supabase
      .rpc('get_delivery_stats_by_project', {
        p_project_id: projectId,
      })
      .single();

    return { data: data as any, error };
  } catch (error) {
    logger.error('Error fetching delivery statistics:', error);
    return { data: null, error };
  }
}

/**
 * Get delivery count by category for a project
 */
export async function getDeliveryCountByCategory(
  projectId: string
): Promise<{ data: { category: string; count: number }[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('material_deliveries')
      .select('material_category')
      .eq('project_id', projectId)
      .is('deleted_at', null);

    if (error || !data) {
      return { data: null, error };
    }

    // Group by category and count
    const categoryCounts = data.reduce((acc, item) => {
      const category = item.material_category || 'uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const result = Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count,
    }));

    return { data: result, error: null };
  } catch (error) {
    logger.error('Error fetching delivery count by category:', error);
    return { data: null, error };
  }
}

/**
 * Get unique vendors for a project
 */
export async function getUniqueVendors(
  projectId: string
): Promise<{ data: string[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('material_deliveries')
      .select('vendor_name')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('vendor_name');

    if (error || !data) {
      return { data: null, error };
    }

    // Get unique vendor names
    const uniqueVendors = [...new Set(data.map((d) => d.vendor_name).filter(Boolean))];

    return { data: uniqueVendors, error: null };
  } catch (error) {
    logger.error('Error fetching unique vendors:', error);
    return { data: null, error };
  }
}

/**
 * Get unique storage locations for a project
 */
export async function getUniqueStorageLocations(
  projectId: string
): Promise<{ data: string[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('material_deliveries')
      .select('storage_location')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .not('storage_location', 'is', null)
      .order('storage_location');

    if (error || !data) {
      return { data: null, error };
    }

    // Get unique storage locations
    const uniqueLocations = [...new Set(data.map((d) => d.storage_location).filter(Boolean))] as string[];

    return { data: uniqueLocations, error: null };
  } catch (error) {
    logger.error('Error fetching unique storage locations:', error);
    return { data: null, error };
  }
}

// =====================================================
// FILE UPLOAD HELPERS
// =====================================================

/**
 * Upload a delivery photo to Supabase Storage
 */
export async function uploadDeliveryPhotoFile(
  file: File,
  companyId: string,
  deliveryId: string
): Promise<{ data: { url: string } | null; error: any }> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${companyId}/${deliveryId}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('material-delivery-photos')
      .upload(fileName, file);

    if (error) {
      return { data: null, error };
    }

    const { data: urlData } = supabase.storage
      .from('material-delivery-photos')
      .getPublicUrl(fileName);

    return { data: { url: urlData.publicUrl }, error: null };
  } catch (error) {
    logger.error('Error uploading delivery photo:', error);
    return { data: null, error };
  }
}

/**
 * Delete a delivery photo file from Supabase Storage
 */
export async function deleteDeliveryPhotoFile(
  photoUrl: string
): Promise<{ data: any; error: any }> {
  try {
    // Extract file path from URL
    const url = new URL(photoUrl);
    const pathParts = url.pathname.split('/material-delivery-photos/');
    if (pathParts.length < 2) {
      return { data: null, error: new Error('Invalid photo URL') };
    }
    const filePath = pathParts[1];

    const { data, error } = await supabase.storage
      .from('material-delivery-photos')
      .remove([filePath]);

    return { data: data as any, error };
  } catch (error) {
    logger.error('Error deleting delivery photo file:', error);
    return { data: null, error };
  }
}

// =====================================================
// EXPORT TYPES (Re-export for convenience)
// =====================================================

export type {
  MaterialDelivery,
  MaterialDeliveryPhoto,
  MaterialDeliveryWithPhotos,
  MaterialDeliveryWithRelations,
  CreateMaterialDeliveryDTO,
  UpdateMaterialDeliveryDTO,
  CreateMaterialDeliveryPhotoDTO,
  UpdateMaterialDeliveryPhotoDTO,
  DeliveryStatistics,
};
