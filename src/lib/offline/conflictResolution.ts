/**
 * Conflict Resolution Module
 * Handles data conflicts when offline changes conflict with server changes
 */

export interface ConflictInfo<T = any> {
  id: string;
  entityType: string;
  entityId: string;
  localVersion: T;
  serverVersion: T;
  localTimestamp: number;
  serverTimestamp: number;
  detectedAt: number;
  resolved: boolean;
  resolution?: 'local' | 'server' | 'merge';
}

export type ConflictResolutionStrategy = 'last-write-wins' | 'server-wins' | 'local-wins' | 'manual';

export interface ConflictResolutionOptions {
  strategy?: ConflictResolutionStrategy;
  onConflict?: (conflict: ConflictInfo) => void;
  onResolved?: (conflict: ConflictInfo, resolution: any) => void;
}

/**
 * Detect if there's a conflict between local and server versions
 */
export function detectConflict<T extends Record<string, any>>(
  localVersion: T,
  serverVersion: T,
  localTimestamp: number,
  serverTimestamp: number
): boolean {
  // No conflict if timestamps match
  if (localTimestamp === serverTimestamp) {
    return false;
  }

  // Check if server was modified after local change was made
  if (serverTimestamp > localTimestamp) {
    // Check if actual data is different (not just timestamps)
    return hasDataChanged(localVersion, serverVersion);
  }

  return false;
}

/**
 * Check if data has actually changed (ignoring metadata fields)
 */
function hasDataChanged<T extends Record<string, any>>(
  local: T,
  server: T
): boolean {
  const metadataFields = ['updated_at', 'created_at', 'id', 'version'];

  // Get all keys from both objects
  const allKeys = new Set([
    ...Object.keys(local),
    ...Object.keys(server),
  ]);

  // Check if any non-metadata field is different
  for (const key of allKeys) {
    if (metadataFields.includes(key)) {continue;}

    const localValue = local[key];
    const serverValue = server[key];

    // Deep comparison for objects/arrays
    if (typeof localValue === 'object' && typeof serverValue === 'object') {
      if (JSON.stringify(localValue) !== JSON.stringify(serverValue)) {
        return true;
      }
    } else if (localValue !== serverValue) {
      return true;
    }
  }

  return false;
}

/**
 * Resolve conflict using specified strategy
 */
export async function resolveConflict<T extends Record<string, any>>(
  conflict: ConflictInfo<T>,
  strategy: ConflictResolutionStrategy = 'last-write-wins'
): Promise<T> {
  switch (strategy) {
    case 'last-write-wins':
      return lastWriteWins(conflict);

    case 'server-wins':
      return conflict.serverVersion;

    case 'local-wins':
      return conflict.localVersion;

    case 'manual':
      // For manual resolution, return null and let UI handle it
      throw new Error('Manual resolution required - use UI dialog');

    default:
      return lastWriteWins(conflict);
  }
}

/**
 * Last-write-wins resolution strategy
 * Uses the version with the most recent timestamp
 */
function lastWriteWins<T>(conflict: ConflictInfo<T>): T {
  return conflict.serverTimestamp > conflict.localTimestamp
    ? conflict.serverVersion
    : conflict.localVersion;
}

/**
 * Merge two versions with field-level resolution
 * Local non-null values take precedence over server values
 */
export function mergeVersions<T extends Record<string, any>>(
  local: T,
  server: T,
  options: {
    localPrecedence?: string[]; // Fields where local always wins
    serverPrecedence?: string[]; // Fields where server always wins
  } = {}
): T {
  const merged = { ...server };

  const { localPrecedence = [], serverPrecedence = [] } = options;

  // Start with server data as base
  Object.keys(local).forEach((key) => {
    const localValue = local[key];
    const serverValue = server[key];

    // Skip if server has explicit precedence
    if (serverPrecedence.includes(key)) {
      return;
    }

    // Use local if it has explicit precedence
    if (localPrecedence.includes(key)) {
      merged[key] = localValue;
      return;
    }

    // Use local value if it's not null/undefined and server is
    if ((localValue !== null && localValue !== undefined) &&
        (serverValue === null || serverValue === undefined)) {
      merged[key] = localValue;
      return;
    }

    // For other cases, prefer local if it's newer (implicit from local write)
    if (localValue !== null && localValue !== undefined) {
      merged[key] = localValue;
    }
  });

  return merged as T;
}

/**
 * Create a conflict info object
 */
export function createConflictInfo<T>(
  entityType: string,
  entityId: string,
  localVersion: T,
  serverVersion: T,
  localTimestamp: number,
  serverTimestamp: number
): ConflictInfo<T> {
  return {
    id: `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    entityType,
    entityId,
    localVersion,
    serverVersion,
    localTimestamp,
    serverTimestamp,
    detectedAt: Date.now(),
    resolved: false,
  };
}

/**
 * Get a human-readable diff between two versions
 */
export function getConflictDiff<T extends Record<string, any>>(
  local: T,
  server: T
): Array<{
  field: string;
  localValue: any;
  serverValue: any;
  isDifferent: boolean;
}> {
  const allKeys = new Set([
    ...Object.keys(local),
    ...Object.keys(server),
  ]);

  const diff: Array<{
    field: string;
    localValue: any;
    serverValue: any;
    isDifferent: boolean;
  }> = [];

  allKeys.forEach((key) => {
    const localValue = local[key];
    const serverValue = server[key];
    const isDifferent = JSON.stringify(localValue) !== JSON.stringify(serverValue);

    diff.push({
      field: key,
      localValue,
      serverValue,
      isDifferent,
    });
  });

  return diff.filter(d => d.isDifferent);
}

export default {
  detectConflict,
  resolveConflict,
  mergeVersions,
  createConflictInfo,
  getConflictDiff,
};
