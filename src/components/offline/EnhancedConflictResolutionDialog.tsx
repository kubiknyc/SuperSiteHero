// File: /src/components/offline/EnhancedConflictResolutionDialog.tsx
// Enhanced conflict resolution dialog with field-level selection and preview

import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  AlertCircle,
  ArrowLeftRight,
  Cloud,
  HardDrive,
  Check,
  Clock,
  User,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  ConflictResolver,
  type FieldDiff,
  type ResolutionStrategy,
  type FieldSelection,
} from '@/lib/offline/conflict-resolver';
import { useOfflineStore, type SyncConflict } from '@/stores/offline-store';
import { logger } from '@/lib/utils/logger';
import { cn } from '@/lib/utils';

interface EnhancedConflictResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflict: SyncConflict | null;
}

/**
 * Enhanced conflict resolution dialog
 * Features:
 * - Side-by-side diff view
 * - Field-level selection (radio buttons)
 * - Preview pane showing merged result
 * - Conflict metadata display
 * - Bulk resolution strategy selector
 * - Mobile-responsive layout
 */
export function EnhancedConflictResolutionDialog({
  open,
  onOpenChange,
  conflict,
}: EnhancedConflictResolutionDialogProps) {
  const [resolving, setResolving] = useState(false);
  const [strategy, setStrategy] = useState<ResolutionStrategy>('field-level-merge');
  const [fieldSelections, setFieldSelections] = useState<Map<string, FieldSelection>>(new Map());
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
  const { resolveConflict } = useOfflineStore();

  // Calculate field diffs and merge preview
  const { diffs, preview } = useMemo(() => {
    if (!conflict) {
      return { diffs: [], preview: null };
    }

    const detectedDiffs = ConflictResolver.detectFieldDiffs(
      conflict.localData,
      conflict.serverData
    );

    const mergePreview = ConflictResolver.generateMergePreview(
      conflict.localData,
      conflict.serverData,
      strategy,
      {
        entityType: conflict.entityType,
        entityId: conflict.entityId,
        localTimestamp: conflict.localTimestamp,
        serverTimestamp: conflict.serverTimestamp,
        detectedAt: conflict.detectedAt,
      }
    );

    return { diffs: detectedDiffs, preview: mergePreview };
  }, [conflict, strategy]);

  // Get recommended strategy on mount
  useEffect(() => {
    if (conflict) {
      const recommended = ConflictResolver.getRecommendedStrategy(
        conflict.localData,
        conflict.serverData,
        {
          entityType: conflict.entityType,
          entityId: conflict.entityId,
          localTimestamp: conflict.localTimestamp,
          serverTimestamp: conflict.serverTimestamp,
          detectedAt: conflict.detectedAt,
        }
      );
      setStrategy(recommended);
    }
  }, [conflict]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open && conflict) {
      setFieldSelections(new Map());
      setExpandedFields(new Set());
    }
  }, [open, conflict]);

  if (!conflict) {return null;}

  const handleFieldSelection = (field: string, source: 'local' | 'server') => {
    const newSelections = new Map(fieldSelections);
    newSelections.set(field, { field, source });
    setFieldSelections(newSelections);
  };

  const handleBulkStrategy = (newStrategy: ResolutionStrategy) => {
    setStrategy(newStrategy);
    // Clear manual selections when changing strategy
    if (newStrategy !== 'manual') {
      setFieldSelections(new Map());
    }
  };

  const toggleFieldExpanded = (field: string) => {
    const newExpanded = new Set(expandedFields);
    if (newExpanded.has(field)) {
      newExpanded.delete(field);
    } else {
      newExpanded.add(field);
    }
    setExpandedFields(newExpanded);
  };

  const handleResolve = async () => {
    setResolving(true);
    try {
      let resolvedData: Record<string, unknown>;

      if (strategy === 'manual' && fieldSelections.size > 0) {
        // Apply manual field selections
        resolvedData = ConflictResolver.applyManualSelections(
          conflict.localData,
          conflict.serverData,
          Array.from(fieldSelections.values())
        );
      } else if (preview) {
        // Use preview's merged data
        resolvedData = preview.mergedData;
      } else {
        // Fallback to server data
        resolvedData = conflict.serverData;
      }

      // Record resolution in history
      ConflictResolver.recordResolution(
        conflict.entityType,
        conflict.entityId,
        strategy,
        strategy === 'manual' ? Array.from(fieldSelections.values()) : undefined
      );

      // Resolve conflict in store
      await resolveConflict(conflict.id, strategy === 'keep-local' ? 'local' : strategy === 'keep-server' ? 'server' : 'merge', resolvedData);
      onOpenChange(false);

      logger.log('[ConflictResolution] Conflict resolved:', {
        strategy,
        fieldSelections: fieldSelections.size,
      });
    } catch (_error) {
      logger.error('[ConflictResolution] Failed to resolve conflict:', _error);
    } finally {
      setResolving(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatValue = (value: unknown, compact = false): string => {
    if (value === null || value === undefined) {return 'Not set';}
    if (typeof value === 'boolean') {return value ? 'Yes' : 'No';}
    if (typeof value === 'object') {
      const json = JSON.stringify(value, null, compact ? 0 : 2);
      return compact && json.length > 100 ? json.substring(0, 100) + '...' : json;
    }
    const str = String(value);
    return compact && str.length > 100 ? str.substring(0, 100) + '...' : str;
  };

  const formatFieldName = (field: string): string => {
    return field
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getDiffTypeBadge = (diff: FieldDiff) => {
    switch (diff.type) {
      case 'added':
        return <Badge variant="outline" className="bg-success-light text-success-dark border-green-200">Added</Badge>;
      case 'removed':
        return <Badge variant="outline" className="bg-error-light text-error-dark border-red-200">Removed</Badge>;
      case 'modified':
        return <Badge variant="outline" className="bg-blue-50 text-primary-hover border-blue-200">Modified</Badge>;
    }
  };

  const getSelectedSource = (field: string): 'local' | 'server' | null => {
    const selection = fieldSelections.get(field);
    return selection?.source === 'local' || selection?.source === 'server' ? selection.source : null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Sync Conflict Resolution
          </DialogTitle>
          <DialogDescription>
            Choose how to resolve conflicts between your local changes and server data
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Conflict metadata */}
          <div className="flex-shrink-0 flex flex-wrap items-center gap-3 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <Badge variant="outline" className="font-mono">{conflict.entityType}</Badge>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Detected: {formatTimestamp(conflict.detectedAt)}</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1">
              <HardDrive className="h-3 w-3" />
              <span>Local: {formatTimestamp(conflict.localTimestamp)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Cloud className="h-3 w-3" />
              <span>Server: {formatTimestamp(conflict.serverTimestamp)}</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <Badge variant="secondary">
              {diffs.length} field{diffs.length !== 1 ? 's' : ''} differ
            </Badge>
            {preview && preview.conflicts.length > 0 && (
              <Badge variant="destructive" className="bg-amber-100 text-amber-800 border-amber-300">
                {preview.conflicts.length} conflict{preview.conflicts.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {/* Strategy selector */}
          <div className="flex-shrink-0 space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Resolution Strategy
            </Label>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
              <Button
                variant={strategy === 'field-level-merge' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleBulkStrategy('field-level-merge')}
                className="justify-start"
              >
                <ArrowLeftRight className="h-3 w-3 mr-2" />
                Smart Merge
              </Button>
              <Button
                variant={strategy === 'last-write-wins' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleBulkStrategy('last-write-wins')}
                className="justify-start"
              >
                <Clock className="h-3 w-3 mr-2" />
                Last Write Wins
              </Button>
              <Button
                variant={strategy === 'keep-local' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleBulkStrategy('keep-local')}
                className="justify-start"
              >
                <HardDrive className="h-3 w-3 mr-2" />
                Keep Local
              </Button>
              <Button
                variant={strategy === 'keep-server' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleBulkStrategy('keep-server')}
                className="justify-start"
              >
                <Cloud className="h-3 w-3 mr-2" />
                Keep Server
              </Button>
              <Button
                variant={strategy === 'manual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleBulkStrategy('manual')}
                className="justify-start"
              >
                <User className="h-3 w-3 mr-2" />
                Manual
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {strategy === 'field-level-merge' && 'Automatically merges non-conflicting fields, prefers local for conflicts'}
              {strategy === 'last-write-wins' && 'Uses the version with the most recent timestamp'}
              {strategy === 'keep-local' && 'Keeps all local changes, discarding server changes'}
              {strategy === 'keep-server' && 'Keeps all server changes, discarding local changes'}
              {strategy === 'manual' && 'Choose which value to keep for each field'}
            </p>
          </div>

          {/* Comparison tabs */}
          <Tabs defaultValue="fields" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="flex-shrink-0 grid w-full grid-cols-3">
              <TabsTrigger value="fields">Field-by-Field</TabsTrigger>
              <TabsTrigger value="preview">Merged Preview</TabsTrigger>
              <TabsTrigger value="raw">Raw JSON</TabsTrigger>
            </TabsList>

            {/* Field-by-field view */}
            <TabsContent value="fields" className="flex-1 overflow-hidden mt-4">
              <ScrollArea className="h-full w-full">
                <div className="space-y-3 pr-4">
                  {diffs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Check className="h-12 w-12 mx-auto mb-2 text-success" />
                      <p className="text-sm font-medium">No differences found</p>
                    </div>
                  ) : (
                    diffs.map((diff) => {
                      const isExpanded = expandedFields.has(diff.field);
                      const selectedSource = getSelectedSource(diff.field);

                      return (
                        <div
                          key={diff.field}
                          className={cn(
                            'border rounded-lg overflow-hidden transition-colors',
                            diff.canAutoMerge
                              ? 'border-green-200 bg-success-light/50 dark:border-green-800 dark:bg-green-950/20'
                              : 'border-amber-200 bg-warning-light/50 dark:border-amber-800 dark:bg-amber-950/20'
                          )}
                        >
                          {/* Field header */}
                          <div
                            className="flex items-center justify-between p-3 cursor-pointer hover:bg-black/5 dark:hover:bg-card/5"
                            onClick={() => toggleFieldExpanded(diff.field)}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 flex-shrink-0" />
                              ) : (
                                <ChevronRight className="h-4 w-4 flex-shrink-0" />
                              )}
                              <span className="font-medium text-sm truncate">{formatFieldName(diff.field)}</span>
                              {diff.canAutoMerge && (
                                <Badge variant="outline" className="bg-success-light text-success-dark border-green-300 text-xs">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  Auto-merge
                                </Badge>
                              )}
                              {getDiffTypeBadge(diff)}
                            </div>
                          </div>

                          {/* Field content */}
                          {isExpanded && (
                            <div className="border-t p-3 space-y-3">
                              {strategy === 'manual' && (
                                <RadioGroup
                                  value={selectedSource || 'server'}
                                  onValueChange={(value) => handleFieldSelection(diff.field, value as 'local' | 'server')}
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {/* Local value */}
                                    <div className="space-y-2">
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="local" id={`${diff.field}-local`} />
                                        <Label
                                          htmlFor={`${diff.field}-local`}
                                          className="flex items-center gap-1 cursor-pointer"
                                        >
                                          <HardDrive className="h-3 w-3" />
                                          <span className="font-medium">Local</span>
                                        </Label>
                                      </div>
                                      <div className="bg-warning-light dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded p-2">
                                        <pre className="text-xs whitespace-pre-wrap break-words font-mono">
                                          {formatValue(diff.localValue)}
                                        </pre>
                                      </div>
                                    </div>

                                    {/* Server value */}
                                    <div className="space-y-2">
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="server" id={`${diff.field}-server`} />
                                        <Label
                                          htmlFor={`${diff.field}-server`}
                                          className="flex items-center gap-1 cursor-pointer"
                                        >
                                          <Cloud className="h-3 w-3" />
                                          <span className="font-medium">Server</span>
                                        </Label>
                                      </div>
                                      <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded p-2">
                                        <pre className="text-xs whitespace-pre-wrap break-words font-mono">
                                          {formatValue(diff.serverValue)}
                                        </pre>
                                      </div>
                                    </div>
                                  </div>
                                </RadioGroup>
                              )}

                              {strategy !== 'manual' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {/* Local value */}
                                  <div className="space-y-1">
                                    <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <HardDrive className="h-3 w-3" />
                                      Local
                                    </Label>
                                    <div className="bg-warning-light dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded p-2">
                                      <pre className="text-xs whitespace-pre-wrap break-words font-mono">
                                        {formatValue(diff.localValue)}
                                      </pre>
                                    </div>
                                  </div>

                                  {/* Server value */}
                                  <div className="space-y-1">
                                    <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Cloud className="h-3 w-3" />
                                      Server
                                    </Label>
                                    <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded p-2">
                                      <pre className="text-xs whitespace-pre-wrap break-words font-mono">
                                        {formatValue(diff.serverValue)}
                                      </pre>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Preview tab */}
            <TabsContent value="preview" className="flex-1 overflow-hidden mt-4">
              <ScrollArea className="h-full w-full">
                <div className="space-y-3 pr-4">
                  {preview && (
                    <>
                      <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                        <h4 className="font-medium text-sm heading-card">Merge Summary</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Strategy:</span>
                            <span className="ml-2 font-medium capitalize">{preview.strategy.replace(/-/g, ' ')}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Auto-merged:</span>
                            <span className="ml-2 font-medium">{preview.autoMergedFields.length} fields</span>
                          </div>
                          {preview.manualFields.length > 0 && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Requires attention:</span>
                              <span className="ml-2 font-medium text-warning">
                                {preview.manualFields.length} field{preview.manualFields.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="bg-card border rounded-lg p-4">
                        <h4 className="font-medium text-sm mb-2 heading-card">Merged Result:</h4>
                        <pre className="text-xs whitespace-pre-wrap break-words font-mono">
                          {formatValue(preview.mergedData)}
                        </pre>
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Raw JSON tab */}
            <TabsContent value="raw" className="flex-1 overflow-hidden mt-4">
              <ScrollArea className="h-full w-full">
                <div className="space-y-3 pr-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <HardDrive className="h-3 w-3" />
                      Local Version
                    </Label>
                    <div className="bg-card border rounded-lg p-4">
                      <pre className="text-xs whitespace-pre-wrap font-mono">
                        {formatValue(conflict.localData)}
                      </pre>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Cloud className="h-3 w-3" />
                      Server Version
                    </Label>
                    <div className="bg-card border rounded-lg p-4">
                      <pre className="text-xs whitespace-pre-wrap font-mono">
                        {formatValue(conflict.serverData)}
                      </pre>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={resolving}>
            Cancel
          </Button>
          <Button onClick={handleResolve} disabled={resolving}>
            {resolving ? 'Resolving...' : 'Apply Resolution'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
