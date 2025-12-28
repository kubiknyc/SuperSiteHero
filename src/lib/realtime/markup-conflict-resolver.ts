/**
 * Markup Conflict Resolver
 * Handles conflicts when multiple users edit the same markup simultaneously
 */

import type {
  MarkupOperation,
  MarkupData,
  TransformData,
  ConflictStrategy,
  ConflictResolutionResult,
} from './markup-sync-types';

/**
 * Resolve conflicts between two operations on the same markup
 */
export function resolveConflict(
  localOp: MarkupOperation,
  remoteOp: MarkupOperation,
  strategy: ConflictStrategy = 'last-write-wins'
): ConflictResolutionResult {
  // If operations are on different markups, no conflict
  if (localOp.markupId !== remoteOp.markupId) {
    return { resolved: true };
  }

  switch (strategy) {
    case 'last-write-wins':
      return resolveLastWriteWins(localOp, remoteOp);
    case 'merge':
      return resolveMerge(localOp, remoteOp);
    case 'reject':
      return resolveReject(localOp, remoteOp);
    default:
      return resolveLastWriteWins(localOp, remoteOp);
  }
}

/**
 * Last-write-wins conflict resolution
 * The operation with the later timestamp wins
 */
function resolveLastWriteWins(
  localOp: MarkupOperation,
  remoteOp: MarkupOperation
): ConflictResolutionResult {
  const winningOp = localOp.timestamp >= remoteOp.timestamp ? localOp : remoteOp;
  const losingOp = localOp.timestamp >= remoteOp.timestamp ? remoteOp : localOp;

  return {
    resolved: true,
    winningOperation: winningOp,
    rejectedOperations: [losingOp],
  };
}

/**
 * Merge conflict resolution
 * Attempts to merge non-conflicting properties from both operations
 */
function resolveMerge(
  localOp: MarkupOperation,
  remoteOp: MarkupOperation
): ConflictResolutionResult {
  // DELETE operations can't be merged
  if (localOp.type === 'DELETE' || remoteOp.type === 'DELETE') {
    // DELETE always wins over other operations
    const deleteOp = localOp.type === 'DELETE' ? localOp : remoteOp;
    return {
      resolved: true,
      winningOperation: deleteOp,
    };
  }

  // For TRANSFORM operations, merge the transform data
  if (localOp.type === 'TRANSFORM' && remoteOp.type === 'TRANSFORM') {
    const mergedData = mergeTransformData(
      localOp.data as TransformData,
      remoteOp.data as TransformData,
      localOp.timestamp,
      remoteOp.timestamp
    );

    return {
      resolved: true,
      mergedData,
    };
  }

  // For UPDATE operations, merge the markup data
  if (localOp.type === 'UPDATE' && remoteOp.type === 'UPDATE') {
    const mergedData = mergeMarkupData(
      localOp.data as MarkupData,
      remoteOp.data as MarkupData,
      localOp.timestamp,
      remoteOp.timestamp
    );

    return {
      resolved: true,
      mergedData,
    };
  }

  // For mixed operation types, use last-write-wins
  return resolveLastWriteWins(localOp, remoteOp);
}

/**
 * Reject conflict resolution
 * Rejects the remote operation, keeping local state
 */
function resolveReject(
  localOp: MarkupOperation,
  remoteOp: MarkupOperation
): ConflictResolutionResult {
  return {
    resolved: true,
    winningOperation: localOp,
    rejectedOperations: [remoteOp],
  };
}

/**
 * Merge transform data from two operations
 * Uses the later timestamp for conflicting properties
 */
function mergeTransformData(
  local: TransformData,
  remote: TransformData,
  localTimestamp: number,
  remoteTimestamp: number
): TransformData {
  const merged: TransformData = {};

  // List of transform properties
  const props: (keyof TransformData)[] = [
    'x', 'y', 'width', 'height', 'scaleX', 'scaleY', 'rotation', 'points'
  ];

  for (const prop of props) {
    const localVal = local[prop];
    const remoteVal = remote[prop];

    if (localVal !== undefined && remoteVal !== undefined) {
      // Both have the property, use the later one
      if (localTimestamp >= remoteTimestamp) {
        (merged as Record<string, unknown>)[prop] = localVal;
      } else {
        (merged as Record<string, unknown>)[prop] = remoteVal;
      }
    } else if (localVal !== undefined) {
      (merged as Record<string, unknown>)[prop] = localVal;
    } else if (remoteVal !== undefined) {
      (merged as Record<string, unknown>)[prop] = remoteVal;
    }
  }

  return merged;
}

/**
 * Merge markup data from two operations
 * Uses the later timestamp for conflicting properties
 */
function mergeMarkupData(
  local: MarkupData,
  remote: MarkupData,
  localTimestamp: number,
  remoteTimestamp: number
): MarkupData {
  const merged = { ...local };

  // Merge each property from remote if it exists
  for (const key of Object.keys(remote) as (keyof MarkupData)[]) {
    const localVal = local[key];
    const remoteVal = remote[key];

    if (remoteVal !== undefined) {
      if (localVal !== undefined) {
        // Both have the property, use the later one
        if (remoteTimestamp > localTimestamp) {
          (merged as Record<string, unknown>)[key] = remoteVal;
        }
      } else {
        // Only remote has it
        (merged as Record<string, unknown>)[key] = remoteVal;
      }
    }
  }

  return merged;
}

/**
 * Sort operations by timestamp
 */
export function sortOperationsByTimestamp(
  operations: MarkupOperation[]
): MarkupOperation[] {
  return [...operations].sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Filter operations by user ID (for selective undo)
 */
export function filterOperationsByUser(
  operations: MarkupOperation[],
  userId: string
): MarkupOperation[] {
  return operations.filter(op => op.userId === userId);
}

/**
 * Get the latest operation for a markup
 */
export function getLatestOperation(
  operations: MarkupOperation[],
  markupId: string
): MarkupOperation | undefined {
  const markupOps = operations
    .filter(op => op.markupId === markupId)
    .sort((a, b) => b.timestamp - a.timestamp);

  return markupOps[0];
}

/**
 * Check if an operation should be applied based on existing operations
 */
export function shouldApplyOperation(
  operation: MarkupOperation,
  existingOperations: MarkupOperation[]
): boolean {
  const latest = getLatestOperation(existingOperations, operation.markupId);

  // Always apply if no existing operations
  if (!latest) {return true;}

  // Apply if this operation is newer
  return operation.timestamp > latest.timestamp;
}

/**
 * Compress multiple operations on the same markup into a single operation
 * Useful for reducing network traffic and storage
 */
export function compressOperations(
  operations: MarkupOperation[]
): MarkupOperation[] {
  const byMarkup = new Map<string, MarkupOperation[]>();

  // Group by markup ID
  for (const op of operations) {
    const existing = byMarkup.get(op.markupId) || [];
    existing.push(op);
    byMarkup.set(op.markupId, existing);
  }

  const compressed: MarkupOperation[] = [];

  for (const [markupId, ops] of Array.from(byMarkup.entries())) {
    if (ops.length === 1) {
      compressed.push(ops[0]);
      continue;
    }

    // Sort by timestamp
    const sorted = sortOperationsByTimestamp(ops);

    // Check if any operation is DELETE
    const hasDelete = sorted.some(op => op.type === 'DELETE');
    if (hasDelete) {
      // Just keep the DELETE operation
      const deleteOp = sorted.find(op => op.type === 'DELETE')!;
      compressed.push(deleteOp);
      continue;
    }

    // Merge all operations into the latest one
    let mergedData: MarkupData = {} as MarkupData;
    for (const op of sorted) {
      if (op.data) {
        mergedData = { ...mergedData, ...(op.data as MarkupData) };
      }
    }

    const latestOp = sorted[sorted.length - 1];
    compressed.push({
      ...latestOp,
      data: mergedData,
    });
  }

  return compressed;
}

/**
 * Validate an operation before applying
 */
export function validateOperation(operation: MarkupOperation): boolean {
  // Check required fields
  if (!operation.id || !operation.markupId || !operation.userId) {
    return false;
  }

  // Check valid operation type
  const validTypes = ['CREATE', 'UPDATE', 'DELETE', 'TRANSFORM', 'BATCH'];
  if (!validTypes.includes(operation.type)) {
    return false;
  }

  // CREATE and UPDATE must have data
  if ((operation.type === 'CREATE' || operation.type === 'UPDATE') && !operation.data) {
    return false;
  }

  // TRANSFORM must have data
  if (operation.type === 'TRANSFORM' && !operation.data) {
    return false;
  }

  // BATCH must have operations array
  if (operation.type === 'BATCH' && (!operation.operations || operation.operations.length === 0)) {
    return false;
  }

  return true;
}
