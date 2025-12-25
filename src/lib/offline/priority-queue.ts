// File: /src/lib/offline/priority-queue.ts
// Priority queue manager for selective sync prioritization

import { logger } from '@/lib/utils/logger';

/**
 * Priority levels for sync operations
 */
export type SyncPriority = 'critical' | 'high' | 'normal' | 'low';

/**
 * Sync queue item with priority
 */
export interface PrioritySyncItem {
  id: string;
  entityType: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  data: unknown;
  priority: SyncPriority;
  size: number; // Estimated size in bytes
  timestamp: number;
  retries: number;
  lastRetry?: number;
  error?: string;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
}

/**
 * Batch of items to sync together
 */
export interface SyncBatch {
  id: string;
  items: PrioritySyncItem[];
  totalSize: number;
  estimatedDuration: number; // in milliseconds
  createdAt: number;
}

/**
 * Priority configuration for different entity types
 */
const ENTITY_PRIORITY_MAP: Record<string, SyncPriority> = {
  // Critical - safety and compliance
  safety_incidents: 'critical',
  safety_observations: 'critical',
  jsa: 'critical',
  emergency_contacts: 'critical',

  // High - field operations
  punch_items: 'high',
  daily_reports: 'high',
  site_instructions: 'high',
  inspections: 'high',

  // Normal - project management
  tasks: 'normal',
  rfis: 'normal',
  submittals: 'normal',
  change_orders: 'normal',
  meetings: 'normal',

  // Low - documentation and media
  photos: 'low',
  documents: 'low',
  drawings: 'low',
  attachments: 'low',
};

/**
 * Priority queue manager
 * Manages sync operations with priority-based ordering and batching
 */
export class PriorityQueueManager {
  private queue: PrioritySyncItem[] = [];
  private processing = false;

  /**
   * Add item to priority queue
   */
  addItem(item: Omit<PrioritySyncItem, 'priority' | 'size'>): void {
    // Determine priority based on entity type
    const priority = this.determinePriority(item.entityType, item.operation);

    // Estimate size
    const size = this.estimateSize(item.data);

    const queueItem: PrioritySyncItem = {
      ...item,
      priority,
      size,
      status: 'pending',
    };

    this.queue.push(queueItem);
    this.sortQueue();

    logger.log('[PriorityQueue] Item added:', {
      id: queueItem.id,
      type: queueItem.entityType,
      priority: queueItem.priority,
      size: queueItem.size,
    });
  }

  /**
   * Add multiple items to queue
   */
  addItems(items: Array<Omit<PrioritySyncItem, 'priority' | 'size'>>): void {
    items.forEach((item) => this.addItem(item));
  }

  /**
   * Remove item from queue
   */
  removeItem(itemId: string): boolean {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter((item) => item.id !== itemId);
    return this.queue.length < initialLength;
  }

  /**
   * Update item status
   */
  updateItemStatus(
    itemId: string,
    status: PrioritySyncItem['status'],
    error?: string
  ): void {
    const item = this.queue.find((i) => i.id === itemId);
    if (item) {
      item.status = status;
      if (error) {
        item.error = error;
      }
      if (status === 'failed') {
        item.retries++;
        item.lastRetry = Date.now();
      }
    }
  }

  /**
   * Get next batch of items to sync
   * Uses priority and size-based batching
   */
  getNextBatch(maxSize: number, maxItems: number = 50): SyncBatch | null {
    // Get pending items sorted by priority
    const pendingItems = this.queue
      .filter((item) => item.status === 'pending')
      .filter((item) => {
        // Skip items with too many retries
        if (item.retries >= 5) {return false;}

        // Apply exponential backoff for failed items
        if (item.lastRetry) {
          const backoffDelay = Math.min(300000, Math.pow(2, item.retries) * 1000); // Max 5 minutes
          const timeSinceRetry = Date.now() - item.lastRetry;
          if (timeSinceRetry < backoffDelay) {return false;}
        }

        return true;
      });

    if (pendingItems.length === 0) {return null;}

    const batch: PrioritySyncItem[] = [];
    let totalSize = 0;

    // Prioritize small items first for quick wins
    const smallItems = pendingItems.filter((item) => item.size < 100000); // < 100KB
    const largeItems = pendingItems.filter((item) => item.size >= 100000);

    // Add small items first
    for (const item of smallItems) {
      if (batch.length >= maxItems || totalSize + item.size > maxSize) {break;}
      batch.push(item);
      totalSize += item.size;
    }

    // Fill remaining space with large items if there's room
    for (const item of largeItems) {
      if (batch.length >= maxItems || totalSize + item.size > maxSize) {break;}
      batch.push(item);
      totalSize += item.size;
    }

    if (batch.length === 0) {return null;}

    // Estimate duration (assume 1MB/sec upload speed)
    const estimatedDuration = (totalSize / 1000000) * 1000;

    return {
      id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      items: batch,
      totalSize,
      estimatedDuration,
      createdAt: Date.now(),
    };
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    total: number;
    pending: number;
    syncing: number;
    failed: number;
    completed: number;
    byPriority: Record<SyncPriority, number>;
    totalSize: number;
  } {
    const stats = {
      total: this.queue.length,
      pending: 0,
      syncing: 0,
      failed: 0,
      completed: 0,
      byPriority: {
        critical: 0,
        high: 0,
        normal: 0,
        low: 0,
      },
      totalSize: 0,
    };

    this.queue.forEach((item) => {
      stats[item.status]++;
      stats.byPriority[item.priority]++;
      stats.totalSize += item.size;
    });

    return stats;
  }

  /**
   * Clear completed items from queue
   */
  clearCompleted(): number {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter((item) => item.status !== 'completed');
    const removed = initialLength - this.queue.length;

    if (removed > 0) {
      logger.log(`[PriorityQueue] Cleared ${removed} completed items`);
    }

    return removed;
  }

  /**
   * Clear all items from queue
   */
  clearAll(): void {
    const count = this.queue.length;
    this.queue = [];
    logger.log(`[PriorityQueue] Cleared all ${count} items`);
  }

  /**
   * Get all items (for debugging/display)
   */
  getAllItems(): PrioritySyncItem[] {
    return [...this.queue];
  }

  /**
   * Get items by priority
   */
  getItemsByPriority(priority: SyncPriority): PrioritySyncItem[] {
    return this.queue.filter((item) => item.priority === priority);
  }

  /**
   * Get items by entity type
   */
  getItemsByEntityType(entityType: string): PrioritySyncItem[] {
    return this.queue.filter((item) => item.entityType === entityType);
  }

  /**
   * Determine priority for an item
   */
  private determinePriority(entityType: string, operation: string): SyncPriority {
    // Deletes are always high priority
    if (operation === 'delete') {return 'high';}

    // Use entity type mapping
    return ENTITY_PRIORITY_MAP[entityType] || 'normal';
  }

  /**
   * Estimate size of data in bytes
   */
  private estimateSize(data: unknown): number {
    try {
      // Rough estimate using JSON stringification
      const json = JSON.stringify(data);
      return new Blob([json]).size;
    } catch {
      // Fallback: rough estimate
      return 1000; // 1KB default
    }
  }

  /**
   * Sort queue by priority and timestamp
   */
  private sortQueue(): void {
    const priorityOrder: Record<SyncPriority, number> = {
      critical: 0,
      high: 1,
      normal: 2,
      low: 3,
    };

    this.queue.sort((a, b) => {
      // First by priority
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) {return priorityDiff;}

      // Then by timestamp (older first)
      return a.timestamp - b.timestamp;
    });
  }

  /**
   * Mark queue as processing
   */
  setProcessing(processing: boolean): void {
    this.processing = processing;
  }

  /**
   * Check if queue is processing
   */
  isProcessing(): boolean {
    return this.processing;
  }

  /**
   * Get resumable sync state (for persistence)
   */
  getResumeState(): {
    queue: PrioritySyncItem[];
    timestamp: number;
  } {
    return {
      queue: this.queue.map((item) => ({ ...item })),
      timestamp: Date.now(),
    };
  }

  /**
   * Restore from resumable state
   */
  restoreFromState(state: { queue: PrioritySyncItem[]; timestamp: number }): void {
    this.queue = state.queue.map((item) => ({
      ...item,
      status: item.status === 'syncing' ? 'pending' : item.status, // Reset syncing items to pending
    }));
    this.sortQueue();
    logger.log(`[PriorityQueue] Restored ${this.queue.length} items from state`);
  }
}

// Singleton instance
export const priorityQueue = new PriorityQueueManager();
