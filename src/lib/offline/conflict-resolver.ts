// File: /src/lib/offline/conflict-resolver.ts
// Advanced conflict resolution utility with field-level diff detection and auto-merge strategies

import { logger } from '@/lib/utils/logger';

/**
 * Field-level difference detected between local and server data
 */
export interface FieldDiff {
  field: string;
  localValue: unknown;
  serverValue: unknown;
  type: 'modified' | 'added' | 'removed';
  canAutoMerge: boolean;
}

/**
 * Conflict resolution strategy
 */
export type ResolutionStrategy =
  | 'last-write-wins'
  | 'field-level-merge'
  | 'manual'
  | 'keep-local'
  | 'keep-server';

/**
 * Conflict metadata for tracking
 */
export interface ConflictMetadata {
  entityType: string;
  entityId: string;
  localTimestamp: number;
  serverTimestamp: number;
  localUser?: string;
  serverUser?: string;
  detectedAt: number;
}

/**
 * Merged result preview
 */
export interface MergePreview {
  strategy: ResolutionStrategy;
  mergedData: Record<string, unknown>;
  conflicts: FieldDiff[];
  autoMergedFields: string[];
  manualFields: string[];
}

/**
 * Field-level selection for manual resolution
 */
export interface FieldSelection {
  field: string;
  source: 'local' | 'server' | 'custom';
  customValue?: unknown;
}

/**
 * Conflict resolution history entry
 */
export interface ConflictHistoryEntry {
  id: string;
  entityType: string;
  entityId: string;
  strategy: ResolutionStrategy;
  timestamp: number;
  resolvedBy?: string;
  fieldSelections?: FieldSelection[];
}

/**
 * Fields that should always use server value in auto-merge
 */
const SERVER_PRIORITY_FIELDS = new Set([
  'id',
  'created_at',
  'company_id', // Security: never override company_id
  'project_id', // Security: never override project_id
]);

/**
 * Fields that should always use local value in auto-merge
 */
const LOCAL_PRIORITY_FIELDS = new Set([
  'updated_at', // Use local timestamp for updates
]);

/**
 * Conflict Resolver Utility
 * Provides advanced conflict detection and resolution strategies
 */
export class ConflictResolver {
  private static conflictHistory: ConflictHistoryEntry[] = [];

  /**
   * Detect field-level differences between local and server data
   */
  static detectFieldDiffs(
    localData: Record<string, unknown>,
    serverData: Record<string, unknown>
  ): FieldDiff[] {
    const diffs: FieldDiff[] = [];
    const allKeys = new Set([...Object.keys(localData), ...Object.keys(serverData)]);

    allKeys.forEach((key) => {
      const localValue = localData[key];
      const serverValue = serverData[key];

      // Skip comparison for identical values
      if (this.areValuesEqual(localValue, serverValue)) {
        return;
      }

      // Determine diff type
      let type: FieldDiff['type'];
      if (localValue !== undefined && serverValue === undefined) {
        type = 'added';
      } else if (localValue === undefined && serverValue !== undefined) {
        type = 'removed';
      } else {
        type = 'modified';
      }

      // Determine if can auto-merge
      const canAutoMerge = this.canAutoMergeField(key, localValue, serverValue);

      diffs.push({
        field: key,
        localValue,
        serverValue,
        type,
        canAutoMerge,
      });
    });

    return diffs;
  }

  /**
   * Check if two values are equal (deep comparison for objects/arrays)
   */
  private static areValuesEqual(a: unknown, b: unknown): boolean {
    // Handle null/undefined
    if (a === b) {return true;}
    if (a === null || b === null) {return false;}
    if (a === undefined || b === undefined) {return false;}

    // Handle primitives
    if (typeof a !== 'object' || typeof b !== 'object') {
      return a === b;
    }

    // Handle objects/arrays with JSON comparison (simple but effective)
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }

  /**
   * Determine if a field can be auto-merged
   */
  private static canAutoMergeField(
    field: string,
    localValue: unknown,
    serverValue: unknown
  ): boolean {
    // Always auto-merge server priority fields
    if (SERVER_PRIORITY_FIELDS.has(field)) {return true;}

    // Always auto-merge local priority fields
    if (LOCAL_PRIORITY_FIELDS.has(field)) {return true;}

    // Can auto-merge if one value is null/undefined and other is set
    if ((localValue === null || localValue === undefined) && serverValue !== null && serverValue !== undefined) {
      return true;
    }
    if ((serverValue === null || serverValue === undefined) && localValue !== null && localValue !== undefined) {
      return true;
    }

    // Cannot auto-merge if both values are set and different
    return false;
  }

  /**
   * Apply last-write-wins strategy
   * Uses timestamp to determine which version to keep
   */
  static applyLastWriteWins(
    localData: Record<string, unknown>,
    serverData: Record<string, unknown>,
    localTimestamp: number,
    serverTimestamp: number
  ): Record<string, unknown> {
    // Newer timestamp wins
    if (localTimestamp > serverTimestamp) {
      logger.log('[ConflictResolver] Last-write-wins: keeping local (newer)');
      return { ...localData };
    } else {
      logger.log('[ConflictResolver] Last-write-wins: keeping server (newer)');
      return { ...serverData };
    }
  }

  /**
   * Apply field-level merge strategy
   * Automatically merges non-conflicting fields, keeps local for conflicts
   */
  static applyFieldLevelMerge(
    localData: Record<string, unknown>,
    serverData: Record<string, unknown>,
    diffs: FieldDiff[]
  ): Record<string, unknown> {
    const merged: Record<string, unknown> = { ...serverData }; // Start with server data

    // Apply field-level merge rules
    diffs.forEach((diff) => {
      if (diff.canAutoMerge) {
        // Auto-merge logic
        if (SERVER_PRIORITY_FIELDS.has(diff.field)) {
          // Keep server value for server-priority fields
          merged[diff.field] = diff.serverValue;
        } else if (LOCAL_PRIORITY_FIELDS.has(diff.field)) {
          // Keep local value for local-priority fields
          merged[diff.field] = diff.localValue;
        } else if (diff.localValue !== null && diff.localValue !== undefined) {
          // If local has a value and server doesn't, use local
          merged[diff.field] = diff.localValue;
        }
        // Otherwise keep server value (already in merged)
      } else {
        // For non-auto-mergeable fields, prefer local changes
        merged[diff.field] = diff.localValue;
      }
    });

    // Add any local fields not in diffs (new fields)
    Object.keys(localData).forEach((key) => {
      if (!(key in merged)) {
        merged[key] = localData[key];
      }
    });

    logger.log('[ConflictResolver] Field-level merge completed');
    return merged;
  }

  /**
   * Apply manual field selections
   */
  static applyManualSelections(
    localData: Record<string, unknown>,
    serverData: Record<string, unknown>,
    selections: FieldSelection[]
  ): Record<string, unknown> {
    const merged: Record<string, unknown> = { ...serverData }; // Start with server as base

    selections.forEach((selection) => {
      switch (selection.source) {
        case 'local':
          merged[selection.field] = localData[selection.field];
          break;
        case 'server':
          merged[selection.field] = serverData[selection.field];
          break;
        case 'custom':
          merged[selection.field] = selection.customValue;
          break;
      }
    });

    logger.log('[ConflictResolver] Manual selections applied');
    return merged;
  }

  /**
   * Generate merge preview for user review
   */
  static generateMergePreview(
    localData: Record<string, unknown>,
    serverData: Record<string, unknown>,
    strategy: ResolutionStrategy,
    metadata: ConflictMetadata
  ): MergePreview {
    const diffs = this.detectFieldDiffs(localData, serverData);
    const conflicts = diffs.filter((d) => !d.canAutoMerge);
    const autoMergedFields = diffs.filter((d) => d.canAutoMerge).map((d) => d.field);
    const manualFields = conflicts.map((d) => d.field);

    let mergedData: Record<string, unknown>;

    switch (strategy) {
      case 'last-write-wins':
        mergedData = this.applyLastWriteWins(
          localData,
          serverData,
          metadata.localTimestamp,
          metadata.serverTimestamp
        );
        break;
      case 'field-level-merge':
        mergedData = this.applyFieldLevelMerge(localData, serverData, diffs);
        break;
      case 'keep-local':
        mergedData = { ...localData };
        break;
      case 'keep-server':
        mergedData = { ...serverData };
        break;
      case 'manual':
        // For manual, start with field-level merge as base
        mergedData = this.applyFieldLevelMerge(localData, serverData, diffs);
        break;
      default:
        mergedData = { ...serverData };
    }

    return {
      strategy,
      mergedData,
      conflicts,
      autoMergedFields,
      manualFields,
    };
  }

  /**
   * Record conflict resolution in history
   */
  static recordResolution(
    entityType: string,
    entityId: string,
    strategy: ResolutionStrategy,
    fieldSelections?: FieldSelection[],
    resolvedBy?: string
  ): void {
    const entry: ConflictHistoryEntry = {
      id: `resolution-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      entityType,
      entityId,
      strategy,
      timestamp: Date.now(),
      resolvedBy,
      fieldSelections,
    };

    this.conflictHistory.push(entry);

    // Keep only last 100 entries
    if (this.conflictHistory.length > 100) {
      this.conflictHistory = this.conflictHistory.slice(-100);
    }

    logger.log('[ConflictResolver] Resolution recorded:', entry);
  }

  /**
   * Get conflict resolution history
   */
  static getHistory(entityType?: string, entityId?: string): ConflictHistoryEntry[] {
    let history = [...this.conflictHistory];

    if (entityType) {
      history = history.filter((entry) => entry.entityType === entityType);
    }

    if (entityId) {
      history = history.filter((entry) => entry.entityId === entityId);
    }

    return history.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clear conflict history
   */
  static clearHistory(): void {
    this.conflictHistory = [];
    logger.log('[ConflictResolver] History cleared');
  }

  /**
   * Get recommended strategy based on conflict analysis
   */
  static getRecommendedStrategy(
    localData: Record<string, unknown>,
    serverData: Record<string, unknown>,
    _metadata: ConflictMetadata
  ): ResolutionStrategy {
    const diffs = this.detectFieldDiffs(localData, serverData);
    const conflicts = diffs.filter((d) => !d.canAutoMerge);

    // If no conflicts, use field-level merge
    if (conflicts.length === 0) {
      return 'field-level-merge';
    }

    // If only a few conflicts, suggest manual resolution
    if (conflicts.length <= 3) {
      return 'manual';
    }

    // Otherwise, use last-write-wins
    return 'last-write-wins';
  }
}
