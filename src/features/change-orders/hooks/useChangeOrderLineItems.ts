/**
 * Change Order Line Items Hook
 *
 * Provides CRUD operations for category-based line items with
 * quantity, unit price, and markup calculations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  LineItemBreakdown,
  LineItemCategory,
  CreateLineItemDTO,
  calculateLineItemTotal,
} from '../types/changeOrder';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const lineItemKeys = {
  all: ['change-order-line-items'] as const,
  list: (changeOrderId: string) => [...lineItemKeys.all, 'list', changeOrderId] as const,
  summary: (changeOrderId: string) => [...lineItemKeys.all, 'summary', changeOrderId] as const,
};

// =============================================================================
// TYPES
// =============================================================================

interface LineItemSummary {
  subtotal: number;
  totalMarkup: number;
  grandTotal: number;
  byCategory: {
    category: LineItemCategory;
    count: number;
    subtotal: number;
    markup: number;
    total: number;
  }[];
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function mapToLineItemBreakdown(row: any): LineItemBreakdown {
  return {
    id: row.id,
    change_order_id: row.change_order_id,
    item_number: row.item_number || 1,
    category: row.category as LineItemCategory,
    description: row.description,
    cost_code: row.cost_code,
    cost_code_id: row.cost_code_id,
    quantity: row.quantity || 0,
    unit: row.unit || 'LS',
    unit_price: row.unit_price || 0,
    extended_price: row.extended_price || 0,
    markup_percent: row.markup_percent || 0,
    markup_amount: row.markup_amount || 0,
    total_amount: row.total_amount || 0,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function calculateSummary(items: LineItemBreakdown[]): LineItemSummary {
  const byCategory = new Map<LineItemCategory, { count: number; subtotal: number; markup: number; total: number }>();

  // Initialize all categories
  Object.values(LineItemCategory).forEach((cat) => {
    byCategory.set(cat, { count: 0, subtotal: 0, markup: 0, total: 0 });
  });

  // Aggregate by category
  items.forEach((item) => {
    const cat = byCategory.get(item.category)!;
    cat.count += 1;
    cat.subtotal += item.extended_price;
    cat.markup += item.markup_amount;
    cat.total += item.total_amount;
  });

  // Calculate totals
  let subtotal = 0;
  let totalMarkup = 0;
  let grandTotal = 0;

  items.forEach((item) => {
    subtotal += item.extended_price;
    totalMarkup += item.markup_amount;
    grandTotal += item.total_amount;
  });

  return {
    subtotal,
    totalMarkup,
    grandTotal,
    byCategory: Object.values(LineItemCategory)
      .map((category) => ({
        category,
        ...byCategory.get(category)!,
      }))
      .filter((c) => c.count > 0),
  };
}

// =============================================================================
// QUERY HOOKS
// =============================================================================

/**
 * Fetch line items for a change order
 */
export function useChangeOrderLineItems(changeOrderId: string | undefined) {
  return useQuery({
    queryKey: lineItemKeys.list(changeOrderId || ''),
    queryFn: async () => {
      if (!changeOrderId) {throw new Error('Change Order ID required');}

      const { data, error } = await supabase
        .from('change_order_line_items')
        .select('*')
        .eq('change_order_id', changeOrderId)
        .is('deleted_at', null)
        .order('item_number', { ascending: true });

      if (error) {throw error;}

      return (data || []).map(mapToLineItemBreakdown);
    },
    enabled: !!changeOrderId,
    staleTime: 30000,
  });
}

/**
 * Get summary of line items by category
 */
export function useLineItemSummary(changeOrderId: string | undefined) {
  const { data: items } = useChangeOrderLineItems(changeOrderId);

  return useQuery({
    queryKey: lineItemKeys.summary(changeOrderId || ''),
    queryFn: () => {
      if (!items) {return null;}
      return calculateSummary(items);
    },
    enabled: !!items,
    staleTime: 30000,
  });
}

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/**
 * Add a new line item
 */
export function useAddLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      changeOrderId,
      item,
    }: {
      changeOrderId: string;
      item: CreateLineItemDTO;
    }) => {
      // Get next item number
      const { data: existingItems } = await supabase
        .from('change_order_line_items')
        .select('item_number')
        .eq('change_order_id', changeOrderId)
        .is('deleted_at', null)
        .order('item_number', { ascending: false })
        .limit(1);

      const nextItemNumber = existingItems && existingItems.length > 0
        ? (existingItems[0].item_number || 0) + 1
        : 1;

      // Calculate totals
      const { extendedPrice, markupAmount, total } = calculateLineItemTotal(
        item.quantity,
        item.unit_price,
        item.markup_percent || 0
      );

      const { data, error } = await supabase
        .from('change_order_line_items')
        .insert({
          change_order_id: changeOrderId,
          item_number: nextItemNumber,
          category: item.category,
          description: item.description,
          cost_code: item.cost_code,
          cost_code_id: item.cost_code_id,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          extended_price: extendedPrice,
          markup_percent: item.markup_percent || 0,
          markup_amount: markupAmount,
          total_amount: total,
          notes: item.notes,
        })
        .select()
        .single();

      if (error) {throw error;}

      // Update change order proposed amount
      await updateChangeOrderTotal(changeOrderId);

      return mapToLineItemBreakdown(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: lineItemKeys.list(data.change_order_id) });
      queryClient.invalidateQueries({ queryKey: ['change-orders-v2'] });
      queryClient.invalidateQueries({ queryKey: ['change-order', data.change_order_id] });
    },
  });
}

/**
 * Update a line item
 */
export function useUpdateLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      changeOrderId,
      item,
    }: {
      id: string;
      changeOrderId: string;
      item: Partial<CreateLineItemDTO>;
    }) => {
      // Get current item to merge values
      const { data: currentItem, error: fetchError } = await supabase
        .from('change_order_line_items')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {throw fetchError;}

      // Merge with updates
      const quantity = item.quantity ?? currentItem.quantity ?? 0;
      const unitPrice = item.unit_price ?? currentItem.unit_price ?? 0;
      const markupPercent = item.markup_percent ?? currentItem.markup_percent ?? 0;

      // Calculate totals
      const { extendedPrice, markupAmount, total } = calculateLineItemTotal(
        quantity,
        unitPrice,
        markupPercent
      );

      const { data, error } = await supabase
        .from('change_order_line_items')
        .update({
          ...(item.category && { category: item.category }),
          ...(item.description && { description: item.description }),
          ...(item.cost_code !== undefined && { cost_code: item.cost_code }),
          ...(item.cost_code_id !== undefined && { cost_code_id: item.cost_code_id }),
          quantity,
          ...(item.unit && { unit: item.unit }),
          unit_price: unitPrice,
          extended_price: extendedPrice,
          markup_percent: markupPercent,
          markup_amount: markupAmount,
          total_amount: total,
          ...(item.notes !== undefined && { notes: item.notes }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {throw error;}

      // Update change order proposed amount
      await updateChangeOrderTotal(changeOrderId);

      return mapToLineItemBreakdown(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: lineItemKeys.list(data.change_order_id) });
      queryClient.invalidateQueries({ queryKey: ['change-orders-v2'] });
      queryClient.invalidateQueries({ queryKey: ['change-order', data.change_order_id] });
    },
  });
}

/**
 * Delete a line item
 */
export function useDeleteLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      changeOrderId,
    }: {
      id: string;
      changeOrderId: string;
    }) => {
      const { error } = await supabase
        .from('change_order_line_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {throw error;}

      // Renumber remaining items
      await renumberLineItems(changeOrderId);

      // Update change order proposed amount
      await updateChangeOrderTotal(changeOrderId);

      return { id, changeOrderId };
    },
    onSuccess: (_, { changeOrderId }) => {
      queryClient.invalidateQueries({ queryKey: lineItemKeys.list(changeOrderId) });
      queryClient.invalidateQueries({ queryKey: ['change-orders-v2'] });
      queryClient.invalidateQueries({ queryKey: ['change-order', changeOrderId] });
    },
  });
}

/**
 * Reorder line items
 */
export function useReorderLineItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      changeOrderId,
      itemIds,
    }: {
      changeOrderId: string;
      itemIds: string[];
    }) => {
      // Update each item's item_number based on position in array
      const updates = itemIds.map((id, index) =>
        supabase
          .from('change_order_line_items')
          .update({ item_number: index + 1 })
          .eq('id', id)
      );

      await Promise.all(updates);

      return { changeOrderId };
    },
    onSuccess: (_, { changeOrderId }) => {
      queryClient.invalidateQueries({ queryKey: lineItemKeys.list(changeOrderId) });
    },
  });
}

/**
 * Duplicate a line item
 */
export function useDuplicateLineItem() {
  const queryClient = useQueryClient();
  const addLineItem = useAddLineItem();

  return useMutation({
    mutationFn: async ({
      id,
      changeOrderId,
    }: {
      id: string;
      changeOrderId: string;
    }) => {
      // Fetch original item
      const { data: original, error: fetchError } = await supabase
        .from('change_order_line_items')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {throw fetchError;}

      // Create duplicate
      const duplicateData: CreateLineItemDTO = {
        category: original.category as LineItemCategory,
        description: `${original.description} (Copy)`,
        cost_code: original.cost_code,
        cost_code_id: original.cost_code_id,
        quantity: original.quantity,
        unit: original.unit,
        unit_price: original.unit_price,
        markup_percent: original.markup_percent,
        notes: original.notes,
      };

      return addLineItem.mutateAsync({ changeOrderId, item: duplicateData });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: lineItemKeys.list(data.change_order_id) });
    },
  });
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Renumber line items after deletion
 */
async function renumberLineItems(changeOrderId: string): Promise<void> {
  const { data: items } = await supabase
    .from('change_order_line_items')
    .select('id')
    .eq('change_order_id', changeOrderId)
    .is('deleted_at', null)
    .order('item_number', { ascending: true });

  if (!items) {return;}

  const updates = items.map((item, index) =>
    supabase
      .from('change_order_line_items')
      .update({ item_number: index + 1 })
      .eq('id', item.id)
  );

  await Promise.all(updates);
}

/**
 * Update change order total from line items
 */
async function updateChangeOrderTotal(changeOrderId: string): Promise<void> {
  const { data: items } = await supabase
    .from('change_order_line_items')
    .select('total_amount')
    .eq('change_order_id', changeOrderId)
    .is('deleted_at', null);

  if (!items) {return;}

  const total = items.reduce((sum, item) => sum + (item.total_amount || 0), 0);

  await supabase
    .from('change_orders')
    .update({ proposed_amount: total })
    .eq('id', changeOrderId);
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  calculateSummary,
  mapToLineItemBreakdown,
};
