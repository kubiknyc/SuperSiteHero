/**
 * Procurement API Service
 *
 * Manages vendors, purchase orders, line items, and receiving.
 */

import { supabase } from '@/lib/supabase';
import { ApiErrorClass } from '../errors';
import type {
  Vendor,
  PurchaseOrderWithDetails,
  POLineItem,
  POReceipt,
  VendorFilters,
  PurchaseOrderFilters,
  CreateVendorDTO,
  UpdateVendorDTO,
  CreatePurchaseOrderDTO,
  UpdatePurchaseOrderDTO,
  CreatePOLineItemDTO,
  UpdatePOLineItemDTO,
  CreatePOReceiptDTO,
  ProcurementStats,
  POStatus,
} from '@/types/procurement';

// Use any for now until types are generated
const db = supabase as any;

export const procurementApi = {
  // ============================================================================
  // VENDORS
  // ============================================================================

  vendors: {
    /**
     * Get all vendors with optional filters
     */
    async getVendors(filters: VendorFilters = {}): Promise<Vendor[]> {
      try {
        let query = db
          .from('vendors')
          .select('*')
          .is('deleted_at', null)
          .order('name');

        if (filters.company_id) {
          query = query.eq('company_id', filters.company_id);
        }

        if (filters.vendor_type) {
          query = query.eq('vendor_type', filters.vendor_type);
        }

        if (filters.is_active !== undefined) {
          query = query.eq('is_active', filters.is_active);
        }

        if (filters.is_approved !== undefined) {
          query = query.eq('is_approved', filters.is_approved);
        }

        if (filters.search) {
          query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
        }

        const { data, error } = await query;
        if (error) {throw error;}
        return data || [];
      } catch (error) {
        throw error instanceof ApiErrorClass
          ? error
          : new ApiErrorClass({
              code: 'FETCH_VENDORS_ERROR',
              message: 'Failed to fetch vendors',
              details: error,
            });
      }
    },

    /**
     * Get a single vendor
     */
    async getVendor(id: string): Promise<Vendor> {
      try {
        const { data, error } = await db
          .from('vendors')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {throw error;}
        if (!data) {throw new ApiErrorClass({ code: 'NOT_FOUND', message: 'Vendor not found' });}
        return data;
      } catch (error) {
        throw error instanceof ApiErrorClass
          ? error
          : new ApiErrorClass({
              code: 'FETCH_VENDOR_ERROR',
              message: 'Failed to fetch vendor',
              details: error,
            });
      }
    },

    /**
     * Create a new vendor
     */
    async createVendor(companyId: string, dto: CreateVendorDTO): Promise<Vendor> {
      try {
        const { data, error } = await db
          .from('vendors')
          .insert({
            company_id: companyId,
            ...dto,
          })
          .select()
          .single();

        if (error) {throw error;}
        return data;
      } catch (error) {
        throw error instanceof ApiErrorClass
          ? error
          : new ApiErrorClass({
              code: 'CREATE_VENDOR_ERROR',
              message: 'Failed to create vendor',
              details: error,
            });
      }
    },

    /**
     * Update a vendor
     */
    async updateVendor(id: string, dto: UpdateVendorDTO): Promise<Vendor> {
      try {
        const { data, error } = await db
          .from('vendors')
          .update(dto)
          .eq('id', id)
          .select()
          .single();

        if (error) {throw error;}
        return data;
      } catch (error) {
        throw error instanceof ApiErrorClass
          ? error
          : new ApiErrorClass({
              code: 'UPDATE_VENDOR_ERROR',
              message: 'Failed to update vendor',
              details: error,
            });
      }
    },

    /**
     * Soft delete a vendor
     */
    async deleteVendor(id: string): Promise<void> {
      try {
        const { error } = await db
          .from('vendors')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id);

        if (error) {throw error;}
      } catch (error) {
        throw error instanceof ApiErrorClass
          ? error
          : new ApiErrorClass({
              code: 'DELETE_VENDOR_ERROR',
              message: 'Failed to delete vendor',
              details: error,
            });
      }
    },
  },

  // ============================================================================
  // PURCHASE ORDERS
  // ============================================================================

  purchaseOrders: {
    /**
     * Get purchase orders with filters
     */
    async getPurchaseOrders(filters: PurchaseOrderFilters = {}): Promise<PurchaseOrderWithDetails[]> {
      try {
        let query = db
          .from('purchase_orders_with_details')
          .select('*')
          .order('created_at', { ascending: false });

        if (filters.project_id) {
          query = query.eq('project_id', filters.project_id);
        }

        if (filters.company_id) {
          query = query.eq('company_id', filters.company_id);
        }

        if (filters.vendor_id) {
          query = query.eq('vendor_id', filters.vendor_id);
        }

        if (filters.status) {
          if (Array.isArray(filters.status)) {
            query = query.in('status', filters.status);
          } else {
            query = query.eq('status', filters.status);
          }
        }

        if (filters.cost_code_id) {
          query = query.eq('cost_code_id', filters.cost_code_id);
        }

        if (filters.from_date) {
          query = query.gte('order_date', filters.from_date);
        }

        if (filters.to_date) {
          query = query.lte('order_date', filters.to_date);
        }

        if (filters.search) {
          query = query.or(`po_number.ilike.%${filters.search}%,vendor_name.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
        }

        const { data, error } = await query;
        if (error) {throw error;}
        return data || [];
      } catch (error) {
        throw error instanceof ApiErrorClass
          ? error
          : new ApiErrorClass({
              code: 'FETCH_POS_ERROR',
              message: 'Failed to fetch purchase orders',
              details: error,
            });
      }
    },

    /**
     * Get a single purchase order with details
     */
    async getPurchaseOrder(id: string): Promise<PurchaseOrderWithDetails> {
      try {
        const { data, error } = await db
          .from('purchase_orders_with_details')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {throw error;}
        if (!data) {throw new ApiErrorClass({ code: 'NOT_FOUND', message: 'Purchase order not found' });}

        // Fetch line items
        const { data: lineItems, error: lineError } = await db
          .from('purchase_order_line_items')
          .select('*')
          .eq('purchase_order_id', id)
          .order('line_number');

        if (lineError) {throw lineError;}

        return {
          ...data,
          line_items: lineItems || [],
        };
      } catch (error) {
        throw error instanceof ApiErrorClass
          ? error
          : new ApiErrorClass({
              code: 'FETCH_PO_ERROR',
              message: 'Failed to fetch purchase order',
              details: error,
            });
      }
    },

    /**
     * Create a new purchase order
     */
    async createPurchaseOrder(companyId: string, dto: CreatePurchaseOrderDTO): Promise<PurchaseOrderWithDetails> {
      try {
        const { line_items, ...poData } = dto;

        // Create PO (po_number is auto-generated by trigger)
        const { data: po, error: poError } = await db
          .from('purchase_orders')
          .insert({
            company_id: companyId,
            ...poData,
            status: 'draft',
          })
          .select()
          .single();

        if (poError) {throw poError;}

        // Create line items if provided
        if (line_items && line_items.length > 0) {
          const lineItemsToInsert = line_items.map((item, index) => ({
            purchase_order_id: po.id,
            line_number: index + 1,
            ...item,
          }));

          const { error: lineError } = await db
            .from('purchase_order_line_items')
            .insert(lineItemsToInsert);

          if (lineError) {
            // Rollback PO
            await db.from('purchase_orders').delete().eq('id', po.id);
            throw lineError;
          }
        }

        // Fetch complete PO
        return this.getPurchaseOrder(po.id);
      } catch (error) {
        throw error instanceof ApiErrorClass
          ? error
          : new ApiErrorClass({
              code: 'CREATE_PO_ERROR',
              message: 'Failed to create purchase order',
              details: error,
            });
      }
    },

    /**
     * Update a purchase order
     */
    async updatePurchaseOrder(id: string, dto: UpdatePurchaseOrderDTO): Promise<PurchaseOrderWithDetails> {
      try {
        const { error } = await db
          .from('purchase_orders')
          .update(dto)
          .eq('id', id);

        if (error) {throw error;}

        return this.getPurchaseOrder(id);
      } catch (error) {
        throw error instanceof ApiErrorClass
          ? error
          : new ApiErrorClass({
              code: 'UPDATE_PO_ERROR',
              message: 'Failed to update purchase order',
              details: error,
            });
      }
    },

    /**
     * Submit PO for approval
     */
    async submitForApproval(id: string): Promise<PurchaseOrderWithDetails> {
      return this.updatePurchaseOrder(id, { status: 'pending_approval' as POStatus });
    },

    /**
     * Approve a PO
     */
    async approvePO(id: string, userId: string): Promise<PurchaseOrderWithDetails> {
      try {
        const { error } = await db
          .from('purchase_orders')
          .update({
            status: 'approved',
            approved_by: userId,
            approved_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (error) {throw error;}

        return this.getPurchaseOrder(id);
      } catch (error) {
        throw error instanceof ApiErrorClass
          ? error
          : new ApiErrorClass({
              code: 'APPROVE_PO_ERROR',
              message: 'Failed to approve purchase order',
              details: error,
            });
      }
    },

    /**
     * Mark PO as ordered
     */
    async markAsOrdered(id: string): Promise<PurchaseOrderWithDetails> {
      try {
        const { error } = await db
          .from('purchase_orders')
          .update({
            status: 'ordered',
            order_date: new Date().toISOString().split('T')[0],
          })
          .eq('id', id);

        if (error) {throw error;}

        // Update all line items to 'ordered'
        await db
          .from('purchase_order_line_items')
          .update({ status: 'ordered' })
          .eq('purchase_order_id', id);

        return this.getPurchaseOrder(id);
      } catch (error) {
        throw error instanceof ApiErrorClass
          ? error
          : new ApiErrorClass({
              code: 'ORDER_PO_ERROR',
              message: 'Failed to mark PO as ordered',
              details: error,
            });
      }
    },

    /**
     * Cancel a PO
     */
    async cancelPO(id: string): Promise<PurchaseOrderWithDetails> {
      return this.updatePurchaseOrder(id, { status: 'cancelled' as POStatus });
    },

    /**
     * Close a PO
     */
    async closePO(id: string): Promise<PurchaseOrderWithDetails> {
      return this.updatePurchaseOrder(id, { status: 'closed' as POStatus });
    },

    /**
     * Soft delete a PO
     */
    async deletePO(id: string): Promise<void> {
      try {
        const { error } = await db
          .from('purchase_orders')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id);

        if (error) {throw error;}
      } catch (error) {
        throw error instanceof ApiErrorClass
          ? error
          : new ApiErrorClass({
              code: 'DELETE_PO_ERROR',
              message: 'Failed to delete purchase order',
              details: error,
            });
      }
    },
  },

  // ============================================================================
  // LINE ITEMS
  // ============================================================================

  lineItems: {
    /**
     * Get line items for a PO
     */
    async getLineItems(purchaseOrderId: string): Promise<POLineItem[]> {
      try {
        const { data, error } = await db
          .from('purchase_order_line_items')
          .select('*')
          .eq('purchase_order_id', purchaseOrderId)
          .order('line_number');

        if (error) {throw error;}
        return data || [];
      } catch (error) {
        throw error instanceof ApiErrorClass
          ? error
          : new ApiErrorClass({
              code: 'FETCH_LINE_ITEMS_ERROR',
              message: 'Failed to fetch line items',
              details: error,
            });
      }
    },

    /**
     * Add a line item
     */
    async addLineItem(purchaseOrderId: string, dto: CreatePOLineItemDTO): Promise<POLineItem> {
      try {
        // Get next line number
        const { data: existing } = await db
          .from('purchase_order_line_items')
          .select('line_number')
          .eq('purchase_order_id', purchaseOrderId)
          .order('line_number', { ascending: false })
          .limit(1);

        const nextLineNumber = existing && existing.length > 0 ? existing[0].line_number + 1 : 1;

        const { data, error } = await db
          .from('purchase_order_line_items')
          .insert({
            purchase_order_id: purchaseOrderId,
            line_number: nextLineNumber,
            ...dto,
          })
          .select()
          .single();

        if (error) {throw error;}
        return data;
      } catch (error) {
        throw error instanceof ApiErrorClass
          ? error
          : new ApiErrorClass({
              code: 'ADD_LINE_ITEM_ERROR',
              message: 'Failed to add line item',
              details: error,
            });
      }
    },

    /**
     * Update a line item
     */
    async updateLineItem(id: string, dto: UpdatePOLineItemDTO): Promise<POLineItem> {
      try {
        const { data, error } = await db
          .from('purchase_order_line_items')
          .update(dto)
          .eq('id', id)
          .select()
          .single();

        if (error) {throw error;}
        return data;
      } catch (error) {
        throw error instanceof ApiErrorClass
          ? error
          : new ApiErrorClass({
              code: 'UPDATE_LINE_ITEM_ERROR',
              message: 'Failed to update line item',
              details: error,
            });
      }
    },

    /**
     * Delete a line item
     */
    async deleteLineItem(id: string): Promise<void> {
      try {
        const { error } = await db
          .from('purchase_order_line_items')
          .delete()
          .eq('id', id);

        if (error) {throw error;}
      } catch (error) {
        throw error instanceof ApiErrorClass
          ? error
          : new ApiErrorClass({
              code: 'DELETE_LINE_ITEM_ERROR',
              message: 'Failed to delete line item',
              details: error,
            });
      }
    },
  },

  // ============================================================================
  // RECEIPTS
  // ============================================================================

  receipts: {
    /**
     * Get receipts for a line item
     */
    async getReceipts(lineItemId: string): Promise<POReceipt[]> {
      try {
        const { data, error } = await db
          .from('purchase_order_receipts')
          .select(`
            *,
            received_by_user:users!received_by(full_name)
          `)
          .eq('line_item_id', lineItemId)
          .order('receipt_date', { ascending: false });

        if (error) {throw error;}

        return (data || []).map((r: any) => ({
          ...r,
          received_by_name: r.received_by_user?.full_name || null,
        }));
      } catch (error) {
        throw error instanceof ApiErrorClass
          ? error
          : new ApiErrorClass({
              code: 'FETCH_RECEIPTS_ERROR',
              message: 'Failed to fetch receipts',
              details: error,
            });
      }
    },

    /**
     * Record a receipt
     */
    async recordReceipt(dto: CreatePOReceiptDTO, userId: string): Promise<POReceipt> {
      try {
        const { data, error } = await db
          .from('purchase_order_receipts')
          .insert({
            ...dto,
            received_by: userId,
            receipt_date: dto.receipt_date || new Date().toISOString().split('T')[0],
            condition: dto.condition || 'good',
          })
          .select()
          .single();

        if (error) {throw error;}
        return data;
      } catch (error) {
        throw error instanceof ApiErrorClass
          ? error
          : new ApiErrorClass({
              code: 'RECORD_RECEIPT_ERROR',
              message: 'Failed to record receipt',
              details: error,
            });
      }
    },
  },

  // ============================================================================
  // STATISTICS
  // ============================================================================

  stats: {
    /**
     * Get procurement statistics for a project
     */
    async getProjectStats(projectId: string): Promise<ProcurementStats> {
      try {
        const { data, error } = await db.rpc('get_procurement_stats', {
          p_project_id: projectId,
        });

        if (error) {throw error;}
        return data || {
          total_pos: 0,
          total_value: 0,
          this_month_value: 0,
          by_status: {
            draft: 0,
            pending_approval: 0,
            approved: 0,
            ordered: 0,
            partially_received: 0,
            received: 0,
            closed: 0,
            cancelled: 0,
          },
          pending_delivery: 0,
          awaiting_approval: 0,
          unique_vendors: 0,
        };
      } catch (error) {
        throw error instanceof ApiErrorClass
          ? error
          : new ApiErrorClass({
              code: 'FETCH_STATS_ERROR',
              message: 'Failed to fetch procurement statistics',
              details: error,
            });
      }
    },
  },
};
