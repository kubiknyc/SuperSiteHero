/**
 * Drawing Packages API Service
 * Handles drawing package CRUD, distribution, and tracking operations
 */

import { supabase } from '../../supabase';
import type {
  DrawingPackage,
  DrawingPackageInsert,
  DrawingPackageUpdate,
  DrawingPackageItem,
  DrawingPackageItemInsert,
  DrawingPackageItemUpdate,
  DrawingPackageRecipient,
  DrawingPackageRecipientInsert,
  DrawingPackageRecipientUpdate,
  DrawingPackageActivity,
  DrawingPackageStatistics,
  DrawingPackageFilters,
  DrawingPackageType,
} from '../../../types/drawing';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseQuery = any;

// Helper to access tables that may not be in the generated types yet
function fromTable(tableName: string): AnySupabaseQuery {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from(tableName);
}

function callRpc(fnName: string, params?: Record<string, unknown>): AnySupabaseQuery {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).rpc(fnName, params);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = obj[key];
  }
  return result;
}

function toCamelCase<T>(obj: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = obj[key];
  }
  return result as T;
}

function transformPackage(row: Record<string, unknown>): DrawingPackage {
  const pkg = toCamelCase<DrawingPackage>(row);
  if (row.items && Array.isArray(row.items)) {
    pkg.items = (row.items as Record<string, unknown>[]).map(transformPackageItem);
  }
  if (row.recipients && Array.isArray(row.recipients)) {
    pkg.recipients = (row.recipients as Record<string, unknown>[]).map(transformRecipient);
  }
  return pkg;
}

function transformPackageItem(row: Record<string, unknown>): DrawingPackageItem {
  const item = toCamelCase<DrawingPackageItem>(row);
  if (row.drawing) {
    item.drawing = toCamelCase(row.drawing as Record<string, unknown>);
  }
  if (row.revision) {
    item.revision = toCamelCase(row.revision as Record<string, unknown>);
  }
  return item;
}

function transformRecipient(row: Record<string, unknown>): DrawingPackageRecipient {
  return toCamelCase<DrawingPackageRecipient>(row);
}

function transformActivity(row: Record<string, unknown>): DrawingPackageActivity {
  return toCamelCase<DrawingPackageActivity>(row);
}

// Generate a secure access token
function generateAccessToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// ============================================================================
// DRAWING PACKAGES
// ============================================================================

export async function getDrawingPackages(filters: DrawingPackageFilters): Promise<DrawingPackage[]> {
  let query = fromTable('drawing_packages')
    .select(`
      *,
      created_by_user:user_profiles!drawing_packages_created_by_fkey(full_name),
      approved_by_user:user_profiles!drawing_packages_approved_by_fkey(full_name)
    `)
    .eq('project_id', filters.projectId)
    .order('created_at', { ascending: false });

  if (!filters.includeArchived) {
    query = query.is('deleted_at', null);
  }

  if (filters.packageType) {
    query = query.eq('package_type', filters.packageType);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,package_number.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) {throw error;}

  return ((data as Record<string, unknown>[]) || []).map((row) => {
    const pkg = transformPackage(row);
    if (row.created_by_user) {
      pkg.createdByName = (row.created_by_user as { full_name?: string }).full_name;
    }
    if (row.approved_by_user) {
      pkg.approvedByName = (row.approved_by_user as { full_name?: string }).full_name;
    }
    return pkg;
  });
}

export async function getDrawingPackage(id: string): Promise<DrawingPackage | null> {
  const { data, error } = await fromTable('drawing_packages')
    .select(`
      *,
      created_by_user:user_profiles!drawing_packages_created_by_fkey(full_name),
      approved_by_user:user_profiles!drawing_packages_approved_by_fkey(full_name),
      items:drawing_package_items(
        *,
        drawing:drawings(*),
        revision:drawing_revisions(*),
        added_by_user:user_profiles!drawing_package_items_added_by_fkey(full_name)
      ),
      recipients:drawing_package_recipients(
        *,
        sent_by_user:user_profiles!drawing_package_recipients_sent_by_fkey(full_name)
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {return null;}
    throw error;
  }

  const pkg = transformPackage(data as Record<string, unknown>);
  if (data.created_by_user) {
    pkg.createdByName = (data.created_by_user as { full_name?: string }).full_name;
  }
  if (data.approved_by_user) {
    pkg.approvedByName = (data.approved_by_user as { full_name?: string }).full_name;
  }

  // Get statistics
  const statistics = await getPackageStatistics(id);
  pkg.statistics = statistics;

  return pkg;
}

export async function createDrawingPackage(packageData: DrawingPackageInsert): Promise<DrawingPackage> {
  const { data: user } = await supabase.auth.getUser();

  // Generate package number if not provided
  let packageNumber = packageData.packageNumber;
  if (!packageNumber) {
    const { data: numData, error: numError } = await callRpc('generate_package_number', {
      p_project_id: packageData.projectId,
      p_package_type: packageData.packageType,
    });
    if (numError) {throw numError;}
    packageNumber = numData;
  }

  const insertData = {
    ...toSnakeCase(packageData as unknown as Record<string, unknown>),
    package_number: packageNumber,
    created_by: user?.user?.id,
    status: 'draft',
  };

  const { data, error } = await fromTable('drawing_packages')
    .insert(insertData)
    .select()
    .single();

  if (error) {throw error;}

  // Log activity
  await logPackageActivity(data.id, 'created', 'Drawing package created', {}, user?.user?.id);

  return transformPackage(data as Record<string, unknown>);
}

export async function updateDrawingPackage(id: string, updates: DrawingPackageUpdate): Promise<DrawingPackage> {
  const { data: user } = await supabase.auth.getUser();

  const { data, error } = await fromTable('drawing_packages')
    .update(toSnakeCase(updates as unknown as Record<string, unknown>))
    .eq('id', id)
    .select()
    .single();

  if (error) {throw error;}

  // Log activity
  await logPackageActivity(id, 'updated', 'Drawing package updated', { updates }, user?.user?.id);

  return transformPackage(data as Record<string, unknown>);
}

export async function deleteDrawingPackage(id: string): Promise<void> {
  const { data: user } = await supabase.auth.getUser();

  const { error } = await fromTable('drawing_packages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {throw error;}

  // Log activity
  await logPackageActivity(id, 'deleted', 'Drawing package deleted', {}, user?.user?.id);
}

export async function approveDrawingPackage(id: string, notes?: string): Promise<DrawingPackage> {
  const { data: user } = await supabase.auth.getUser();

  const { data, error } = await fromTable('drawing_packages')
    .update({
      status: 'approved',
      approved_by: user?.user?.id,
      approved_at: new Date().toISOString(),
      approval_notes: notes,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {throw error;}

  // Log activity
  await logPackageActivity(id, 'approved', 'Drawing package approved', { notes }, user?.user?.id);

  return transformPackage(data as Record<string, unknown>);
}

export async function createNewVersion(id: string): Promise<DrawingPackage> {
  const original = await getDrawingPackage(id);
  if (!original) {throw new Error('Package not found');}

  const { data: user } = await supabase.auth.getUser();

  // Mark original as superseded
  await fromTable('drawing_packages')
    .update({ status: 'superseded' })
    .eq('id', id);

  // Create new version
  const newPackage = await createDrawingPackage({
    companyId: original.companyId,
    projectId: original.projectId,
    name: original.name,
    description: original.description,
    packageType: original.packageType,
    coverSheetTitle: original.coverSheetTitle,
    coverSheetSubtitle: original.coverSheetSubtitle,
    coverSheetLogoUrl: original.coverSheetLogoUrl,
    coverSheetNotes: original.coverSheetNotes,
    includeCoverSheet: original.includeCoverSheet,
    includeToc: original.includeToc,
    includeRevisionHistory: original.includeRevisionHistory,
    requireAcknowledgment: original.requireAcknowledgment,
    allowDownload: original.allowDownload,
  });

  // Update version number and link to previous
  await fromTable('drawing_packages')
    .update({
      version: original.version + 1,
      supersedes_package_id: id,
    })
    .eq('id', newPackage.id);

  // Copy items to new package
  if (original.items && original.items.length > 0) {
    for (const item of original.items) {
      await addItemToPackage({
        packageId: newPackage.id,
        drawingId: item.drawingId,
        revisionId: item.revisionId,
        sortOrder: item.sortOrder,
        sectionName: item.sectionName,
        displayNumber: item.displayNumber,
        displayTitle: item.displayTitle,
        isIncluded: item.isIncluded,
        notes: item.notes,
      });
    }
  }

  // Log activity
  await logPackageActivity(newPackage.id, 'version_created', `New version created from v${original.version}`, { previousVersionId: id }, user?.user?.id);

  return getDrawingPackage(newPackage.id) as Promise<DrawingPackage>;
}

// ============================================================================
// PACKAGE ITEMS
// ============================================================================

export async function getPackageItems(packageId: string): Promise<DrawingPackageItem[]> {
  const { data, error } = await fromTable('drawing_package_items')
    .select(`
      *,
      drawing:drawings(*),
      revision:drawing_revisions(*),
      added_by_user:user_profiles!drawing_package_items_added_by_fkey(full_name)
    `)
    .eq('package_id', packageId)
    .order('sort_order', { ascending: true });

  if (error) {throw error;}

  return ((data as Record<string, unknown>[]) || []).map((row) => {
    const item = transformPackageItem(row);
    if (row.added_by_user) {
      item.addedByName = (row.added_by_user as { full_name?: string }).full_name;
    }
    return item;
  });
}

export async function addItemToPackage(item: DrawingPackageItemInsert): Promise<DrawingPackageItem> {
  const { data: user } = await supabase.auth.getUser();

  // Get max sort order if not provided
  let sortOrder = item.sortOrder;
  if (sortOrder === undefined) {
    const { data: maxData } = await fromTable('drawing_package_items')
      .select('sort_order')
      .eq('package_id', item.packageId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    sortOrder = maxData ? (maxData.sort_order || 0) + 1 : 0;
  }

  const insertData = {
    ...toSnakeCase(item as unknown as Record<string, unknown>),
    sort_order: sortOrder,
    added_by: user?.user?.id,
  };

  const { data, error } = await fromTable('drawing_package_items')
    .insert(insertData)
    .select()
    .single();

  if (error) {throw error;}

  // Log activity
  await logPackageActivity(item.packageId, 'item_added', 'Drawing added to package', { drawingId: item.drawingId }, user?.user?.id);

  return transformPackageItem(data as Record<string, unknown>);
}

export async function addMultipleItemsToPackage(
  packageId: string,
  drawingIds: string[]
): Promise<DrawingPackageItem[]> {
  const { data: user } = await supabase.auth.getUser();

  // Get max sort order
  const { data: maxData } = await fromTable('drawing_package_items')
    .select('sort_order')
    .eq('package_id', packageId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  let sortOrder = maxData ? (maxData.sort_order || 0) + 1 : 0;

  const items: DrawingPackageItemInsert[] = drawingIds.map((drawingId) => ({
    packageId,
    drawingId,
    sortOrder: sortOrder++,
    isIncluded: true,
  }));

  const insertData = items.map((item) => ({
    ...toSnakeCase(item as unknown as Record<string, unknown>),
    added_by: user?.user?.id,
  }));

  const { data, error } = await fromTable('drawing_package_items')
    .insert(insertData)
    .select();

  if (error) {throw error;}

  // Log activity
  await logPackageActivity(packageId, 'items_added', `${drawingIds.length} drawings added to package`, { drawingIds }, user?.user?.id);

  return ((data as Record<string, unknown>[]) || []).map(transformPackageItem);
}

export async function updatePackageItem(id: string, updates: DrawingPackageItemUpdate): Promise<DrawingPackageItem> {
  const { data, error } = await fromTable('drawing_package_items')
    .update(toSnakeCase(updates as unknown as Record<string, unknown>))
    .eq('id', id)
    .select()
    .single();

  if (error) {throw error;}
  return transformPackageItem(data as Record<string, unknown>);
}

export async function removeItemFromPackage(id: string): Promise<void> {
  const { data: user } = await supabase.auth.getUser();

  // Get item info before deleting
  const { data: item } = await fromTable('drawing_package_items')
    .select('package_id, drawing_id')
    .eq('id', id)
    .single();

  const { error } = await fromTable('drawing_package_items')
    .delete()
    .eq('id', id);

  if (error) {throw error;}

  if (item) {
    await logPackageActivity(item.package_id, 'item_removed', 'Drawing removed from package', { drawingId: item.drawing_id }, user?.user?.id);
  }
}

export async function reorderPackageItems(packageId: string, itemIds: string[]): Promise<void> {
  // Update sort order for each item
  const updates = itemIds.map((id, index) =>
    fromTable('drawing_package_items')
      .update({ sort_order: index })
      .eq('id', id)
  );

  await Promise.all(updates);
}

// ============================================================================
// PACKAGE RECIPIENTS
// ============================================================================

export async function getPackageRecipients(packageId: string): Promise<DrawingPackageRecipient[]> {
  const { data, error } = await fromTable('drawing_package_recipients')
    .select(`
      *,
      sent_by_user:user_profiles!drawing_package_recipients_sent_by_fkey(full_name)
    `)
    .eq('package_id', packageId)
    .order('created_at', { ascending: false });

  if (error) {throw error;}

  return ((data as Record<string, unknown>[]) || []).map((row) => {
    const recipient = transformRecipient(row);
    if (row.sent_by_user) {
      recipient.sentByName = (row.sent_by_user as { full_name?: string }).full_name;
    }
    return recipient;
  });
}

export async function addRecipientToPackage(recipient: DrawingPackageRecipientInsert): Promise<DrawingPackageRecipient> {
  const insertData = {
    ...toSnakeCase(recipient as unknown as Record<string, unknown>),
    access_token: generateAccessToken(),
    access_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  };

  const { data, error } = await fromTable('drawing_package_recipients')
    .insert(insertData)
    .select()
    .single();

  if (error) {throw error;}
  return transformRecipient(data as Record<string, unknown>);
}

export async function addMultipleRecipientsToPackage(
  packageId: string,
  recipients: Omit<DrawingPackageRecipientInsert, 'packageId'>[]
): Promise<DrawingPackageRecipient[]> {
  const insertData = recipients.map((r) => ({
    ...toSnakeCase({ ...r, packageId } as unknown as Record<string, unknown>),
    access_token: generateAccessToken(),
    access_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }));

  const { data, error } = await fromTable('drawing_package_recipients')
    .insert(insertData)
    .select();

  if (error) {throw error;}
  return ((data as Record<string, unknown>[]) || []).map(transformRecipient);
}

export async function updatePackageRecipient(id: string, updates: DrawingPackageRecipientUpdate): Promise<DrawingPackageRecipient> {
  const { data, error } = await fromTable('drawing_package_recipients')
    .update(toSnakeCase(updates as unknown as Record<string, unknown>))
    .eq('id', id)
    .select()
    .single();

  if (error) {throw error;}
  return transformRecipient(data as Record<string, unknown>);
}

export async function removeRecipientFromPackage(id: string): Promise<void> {
  const { error } = await fromTable('drawing_package_recipients')
    .delete()
    .eq('id', id);

  if (error) {throw error;}
}

export async function markRecipientAsSent(id: string): Promise<DrawingPackageRecipient> {
  const { data: user } = await supabase.auth.getUser();

  const { data, error } = await fromTable('drawing_package_recipients')
    .update({
      sent_at: new Date().toISOString(),
      sent_by: user?.user?.id,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {throw error;}
  return transformRecipient(data as Record<string, unknown>);
}

export async function recordRecipientAccess(accessToken: string): Promise<DrawingPackageRecipient | null> {
  const { data: recipient, error: findError } = await fromTable('drawing_package_recipients')
    .select('*')
    .eq('access_token', accessToken)
    .single();

  if (findError) {
    if (findError.code === 'PGRST116') {return null;}
    throw findError;
  }

  // Check if token is expired
  if (recipient.access_token_expires_at && new Date(recipient.access_token_expires_at) < new Date()) {
    return null;
  }

  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = {
    last_accessed_at: now,
    access_count: (recipient.access_count || 0) + 1,
  };

  if (!recipient.first_accessed_at) {
    updateData.first_accessed_at = now;
  }

  const { data, error } = await fromTable('drawing_package_recipients')
    .update(updateData)
    .eq('id', recipient.id)
    .select()
    .single();

  if (error) {throw error;}

  // Log activity
  await logPackageActivity(
    recipient.package_id,
    'accessed',
    'Package accessed by recipient',
    { recipientEmail: recipient.recipient_email },
    null,
    recipient.id
  );

  return transformRecipient(data as Record<string, unknown>);
}

export async function recordRecipientDownload(accessToken: string): Promise<DrawingPackageRecipient | null> {
  const { data: recipient, error: findError } = await fromTable('drawing_package_recipients')
    .select('*')
    .eq('access_token', accessToken)
    .single();

  if (findError) {
    if (findError.code === 'PGRST116') {return null;}
    throw findError;
  }

  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = {
    downloaded_at: recipient.downloaded_at || now,
    download_count: (recipient.download_count || 0) + 1,
  };

  const { data, error } = await fromTable('drawing_package_recipients')
    .update(updateData)
    .eq('id', recipient.id)
    .select()
    .single();

  if (error) {throw error;}

  // Log activity
  await logPackageActivity(
    recipient.package_id,
    'downloaded',
    'Package downloaded by recipient',
    { recipientEmail: recipient.recipient_email },
    null,
    recipient.id
  );

  return transformRecipient(data as Record<string, unknown>);
}

export async function recordRecipientAcknowledgment(
  accessToken: string,
  notes?: string,
  ipAddress?: string
): Promise<DrawingPackageRecipient | null> {
  const { data: recipient, error: findError } = await fromTable('drawing_package_recipients')
    .select('*')
    .eq('access_token', accessToken)
    .single();

  if (findError) {
    if (findError.code === 'PGRST116') {return null;}
    throw findError;
  }

  const { data, error } = await fromTable('drawing_package_recipients')
    .update({
      acknowledged_at: new Date().toISOString(),
      acknowledgment_notes: notes,
      acknowledgment_ip: ipAddress,
    })
    .eq('id', recipient.id)
    .select()
    .single();

  if (error) {throw error;}

  // Log activity
  await logPackageActivity(
    recipient.package_id,
    'acknowledged',
    'Package acknowledged by recipient',
    { recipientEmail: recipient.recipient_email, notes },
    null,
    recipient.id
  );

  return transformRecipient(data as Record<string, unknown>);
}

// ============================================================================
// DISTRIBUTION
// ============================================================================

export async function distributePackage(packageId: string, recipientIds?: string[]): Promise<void> {
  const { data: user } = await supabase.auth.getUser();

  // Get recipients to distribute to
  let query = fromTable('drawing_package_recipients')
    .select('*')
    .eq('package_id', packageId)
    .is('sent_at', null);

  if (recipientIds && recipientIds.length > 0) {
    query = query.in('id', recipientIds);
  }

  const { data: recipients, error: fetchError } = await query;
  if (fetchError) {throw fetchError;}

  // Mark all as sent
  const now = new Date().toISOString();
  for (const recipient of recipients || []) {
    await fromTable('drawing_package_recipients')
      .update({
        sent_at: now,
        sent_by: user?.user?.id,
      })
      .eq('id', recipient.id);
  }

  // Update package status
  await fromTable('drawing_packages')
    .update({ status: 'distributed' })
    .eq('id', packageId);

  // Log activity
  await logPackageActivity(
    packageId,
    'distributed',
    `Package distributed to ${(recipients || []).length} recipients`,
    { recipientCount: (recipients || []).length },
    user?.user?.id
  );
}

export async function generateShareableLink(packageId: string, expiresInDays: number = 30): Promise<string> {
  const accessToken = generateAccessToken();
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

  // Create a "link" recipient
  await fromTable('drawing_package_recipients')
    .insert({
      package_id: packageId,
      recipient_email: 'shareable-link@generated',
      recipient_name: 'Shareable Link',
      distribution_method: 'link',
      access_token: accessToken,
      access_token_expires_at: expiresAt,
      send_reminder: false,
    });

  const baseUrl = import.meta.env.VITE_APP_URL || 'https://app.jobsight.co';
  return `${baseUrl}/packages/view/${accessToken}`;
}

// ============================================================================
// ACTIVITY & STATISTICS
// ============================================================================

export async function getPackageActivity(packageId: string, limit: number = 50): Promise<DrawingPackageActivity[]> {
  const { data, error } = await fromTable('drawing_package_activity')
    .select(`
      *,
      performed_by_user:user_profiles!drawing_package_activity_performed_by_fkey(full_name),
      recipient:drawing_package_recipients(recipient_email)
    `)
    .eq('package_id', packageId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {throw error;}

  return ((data as Record<string, unknown>[]) || []).map((row) => {
    const activity = transformActivity(row);
    if (row.performed_by_user) {
      activity.performedByName = (row.performed_by_user as { full_name?: string }).full_name;
    }
    if (row.recipient) {
      activity.recipientEmail = (row.recipient as { recipient_email?: string }).recipient_email;
    }
    return activity;
  });
}

export async function getPackageStatistics(packageId: string): Promise<DrawingPackageStatistics> {
  const { data, error } = await callRpc('get_package_statistics', {
    p_package_id: packageId,
  });

  if (error) {throw error;}

  if (!data || data.length === 0) {
    return {
      totalDrawings: 0,
      includedDrawings: 0,
      totalRecipients: 0,
      sentCount: 0,
      accessedCount: 0,
      downloadedCount: 0,
      acknowledgedCount: 0,
      pendingAcknowledgments: 0,
    };
  }

  const row = data[0];
  return {
    totalDrawings: row.total_drawings,
    includedDrawings: row.included_drawings,
    totalRecipients: row.total_recipients,
    sentCount: row.sent_count,
    accessedCount: row.accessed_count,
    downloadedCount: row.downloaded_count,
    acknowledgedCount: row.acknowledged_count,
    pendingAcknowledgments: row.pending_acknowledgments,
  };
}

async function logPackageActivity(
  packageId: string,
  activityType: string,
  description: string,
  metadata: Record<string, unknown> = {},
  performedBy?: string | null,
  recipientId?: string | null
): Promise<void> {
  await fromTable('drawing_package_activity')
    .insert({
      package_id: packageId,
      recipient_id: recipientId,
      activity_type: activityType,
      activity_description: description,
      activity_metadata: metadata,
      performed_by: performedBy,
    });
}

// ============================================================================
// EXPORT API OBJECT
// ============================================================================

export const drawingPackagesApi = {
  // Packages
  getDrawingPackages,
  getDrawingPackage,
  createDrawingPackage,
  updateDrawingPackage,
  deleteDrawingPackage,
  approveDrawingPackage,
  createNewVersion,

  // Items
  getPackageItems,
  addItemToPackage,
  addMultipleItemsToPackage,
  updatePackageItem,
  removeItemFromPackage,
  reorderPackageItems,

  // Recipients
  getPackageRecipients,
  addRecipientToPackage,
  addMultipleRecipientsToPackage,
  updatePackageRecipient,
  removeRecipientFromPackage,
  markRecipientAsSent,
  recordRecipientAccess,
  recordRecipientDownload,
  recordRecipientAcknowledgment,

  // Distribution
  distributePackage,
  generateShareableLink,

  // Activity & Statistics
  getPackageActivity,
  getPackageStatistics,
};
