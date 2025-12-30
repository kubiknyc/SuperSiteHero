// File: /src/components/ConflictResolutionDialog.tsx
// Dialog component for resolving sync conflicts between local and server data

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, ArrowLeftRight, Cloud, HardDrive, Check } from 'lucide-react'
import { useOfflineStore, type SyncConflict } from '@/stores/offline-store'
import { ConflictResolver, type FieldSelection } from '@/lib/offline/conflict-resolver'
import { logger } from '@/lib/utils/logger'

interface ConflictResolutionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conflict: SyncConflict | null
}

/**
 * Dialog for resolving data sync conflicts
 * Shows server vs local version side-by-side with diff highlighting
 * Provides three resolution options: Keep Local, Keep Server, Manual Merge
 */
export function ConflictResolutionDialog({
  open,
  onOpenChange,
  conflict,
}: ConflictResolutionDialogProps) {
  const [resolving, setResolving] = useState(false)
  const [selectedResolution, setSelectedResolution] = useState<'local' | 'server' | 'merge'>('server')
  const [fieldSelections, setFieldSelections] = useState<Record<string, 'local' | 'server'>>({})
  const { resolveConflict } = useOfflineStore()

  // Initialize field selections when merge is selected
  const handleResolutionChange = useCallback((resolution: 'local' | 'server' | 'merge') => {
    setSelectedResolution(resolution)
    if (resolution === 'merge' && conflict) {
      // Initialize all fields to server by default
      const initialSelections: Record<string, 'local' | 'server'> = {}
      const allKeys = new Set([
        ...Object.keys(conflict.localData || {}),
        ...Object.keys(conflict.serverData || {}),
      ])
      allKeys.forEach((key) => {
        if (key !== 'id' && key !== 'created_at') {
          initialSelections[key] = 'server'
        }
      })
      setFieldSelections(initialSelections)
    }
  }, [conflict])

  // Update field selection
  const handleFieldSelection = useCallback((field: string, source: 'local' | 'server') => {
    setFieldSelections((prev) => ({
      ...prev,
      [field]: source,
    }))
  }, [])

  if (!conflict) {return null}

  const handleResolve = async () => {
    setResolving(true)
    try {
      let resolvedData: Record<string, unknown>

      switch (selectedResolution) {
        case 'local':
          resolvedData = conflict.localData
          break
        case 'server':
          resolvedData = conflict.serverData
          break
        case 'merge': {
          // Apply manual field selections using ConflictResolver
          const selections: FieldSelection[] = Object.entries(fieldSelections).map(
            ([field, source]) => ({
              field,
              source,
            })
          )
          resolvedData = ConflictResolver.applyManualSelections(
            conflict.localData || {},
            conflict.serverData || {},
            selections
          )
          logger.info('[ConflictResolution] Manual merge applied with selections:', selections)
          break
        }
      }

      resolveConflict(conflict.id, resolvedData)
      onOpenChange(false)
    } catch (_error) {
      logger.error('[ConflictResolution] Failed to resolve conflict:', _error)
    } finally {
      setResolving(false)
    }
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getFieldDifferences = () => {
    const differences: Array<{ field: string; local: unknown; server: unknown }> = []
    const allKeys = new Set([
      ...Object.keys(conflict.localData || {}),
      ...Object.keys(conflict.serverData || {}),
    ])

    allKeys.forEach((key) => {
      const localValue = conflict.localData?.[key]
      const serverValue = conflict.serverData?.[key]

      // Skip internal fields
      if (key === 'id' || key === 'created_at') {return}

      // Check if values differ
      if (JSON.stringify(localValue) !== JSON.stringify(serverValue)) {
        differences.push({
          field: key,
          local: localValue,
          server: serverValue,
        })
      }
    })

    return differences
  }

  const differences = getFieldDifferences()

  const renderValue = (value: unknown): string => {
    if (value === null || value === undefined) {return 'Not set'}
    if (typeof value === 'object') {return JSON.stringify(value, null, 2)}
    if (typeof value === 'boolean') {return value ? 'Yes' : 'No'}
    return String(value)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Sync Conflict Detected
          </DialogTitle>
          <DialogDescription>
            The {conflict.entityType} was modified both locally and on the server. Choose which
            version to keep.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Conflict metadata */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Badge variant="outline">{conflict.entityType}</Badge>
            <span>Detected: {formatTimestamp(conflict.detectedAt)}</span>
            <span>{differences.length} field(s) differ</span>
          </div>

          {/* Resolution options */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={selectedResolution === 'local' ? 'default' : 'outline'}
              onClick={() => handleResolutionChange('local')}
              className="flex items-center gap-2"
            >
              <HardDrive className="h-4 w-4" />
              Keep Local
            </Button>
            <Button
              variant={selectedResolution === 'server' ? 'default' : 'outline'}
              onClick={() => handleResolutionChange('server')}
              className="flex items-center gap-2"
            >
              <Cloud className="h-4 w-4" />
              Keep Server
            </Button>
            <Button
              variant={selectedResolution === 'merge' ? 'default' : 'outline'}
              onClick={() => handleResolutionChange('merge')}
              className="flex items-center gap-2"
              title="Manually select which values to keep for each field"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Manual Merge
            </Button>
          </div>

          {/* Comparison view */}
          <Tabs defaultValue="diff" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="diff">Differences</TabsTrigger>
              <TabsTrigger value="local">Local Version</TabsTrigger>
              <TabsTrigger value="server">Server Version</TabsTrigger>
            </TabsList>

            <TabsContent value="diff" className="space-y-2">
              <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                {differences.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No differences found</p>
                ) : (
                  <div className="space-y-4">
                    {differences.map((diff) => (
                      <div key={diff.field} className="space-y-2">
                        <h4 className="font-medium text-sm capitalize heading-card">
                          {diff.field.replace(/_/g, ' ')}
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <HardDrive className="h-3 w-3" /> Local
                              </p>
                              {selectedResolution === 'merge' && (
                                <button
                                  type="button"
                                  onClick={() => handleFieldSelection(diff.field, 'local')}
                                  className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-colors ${
                                    fieldSelections[diff.field] === 'local'
                                      ? 'bg-amber-500 text-white'
                                      : 'bg-muted hover:bg-muted/80'
                                  }`}
                                >
                                  {fieldSelections[diff.field] === 'local' && (
                                    <Check className="h-3 w-3" />
                                  )}
                                  Use This
                                </button>
                              )}
                            </div>
                            <div
                              className={`rounded p-2 ${
                                selectedResolution === 'merge' &&
                                fieldSelections[diff.field] === 'local'
                                  ? 'bg-amber-100 dark:bg-amber-950/40 border-2 border-amber-500'
                                  : 'bg-warning-light dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800'
                              }`}
                            >
                              <pre className="text-xs whitespace-pre-wrap break-words">
                                {renderValue(diff.local)}
                              </pre>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Cloud className="h-3 w-3" /> Server
                              </p>
                              {selectedResolution === 'merge' && (
                                <button
                                  type="button"
                                  onClick={() => handleFieldSelection(diff.field, 'server')}
                                  className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-colors ${
                                    fieldSelections[diff.field] === 'server'
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-muted hover:bg-muted/80'
                                  }`}
                                >
                                  {fieldSelections[diff.field] === 'server' && (
                                    <Check className="h-3 w-3" />
                                  )}
                                  Use This
                                </button>
                              )}
                            </div>
                            <div
                              className={`rounded p-2 ${
                                selectedResolution === 'merge' &&
                                fieldSelections[diff.field] === 'server'
                                  ? 'bg-blue-100 dark:bg-blue-950/40 border-2 border-blue-500'
                                  : 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800'
                              }`}
                            >
                              <pre className="text-xs whitespace-pre-wrap break-words">
                                {renderValue(diff.server)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              {selectedResolution === 'merge' && differences.length > 0 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>Click &quot;Use This&quot; to select which value to keep for each field</span>
                  <span>
                    {Object.values(fieldSelections).filter((v) => v === 'local').length} local,{' '}
                    {Object.values(fieldSelections).filter((v) => v === 'server').length} server
                  </span>
                </div>
              )}
            </TabsContent>

            <TabsContent value="local">
              <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                <pre className="text-xs whitespace-pre-wrap">
                  {JSON.stringify(conflict.localData, null, 2)}
                </pre>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="server">
              <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                <pre className="text-xs whitespace-pre-wrap">
                  {JSON.stringify(conflict.serverData, null, 2)}
                </pre>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Resolution preview */}
          {selectedResolution && (
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm font-medium mb-1">Resolution Preview:</p>
              <p className="text-xs text-muted-foreground">
                {selectedResolution === 'local' &&
                  'The local changes will be kept and synced to the server, overwriting the server version.'}
                {selectedResolution === 'server' &&
                  'The server changes will be kept and applied locally, discarding local changes.'}
                {selectedResolution === 'merge' &&
                  'A custom merge will be created using your selected values for each field. Select "Use This" for each field in the Differences tab.'}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={resolving}>
            Cancel
          </Button>
          <Button onClick={handleResolve} disabled={resolving}>
            {resolving ? 'Resolving...' : 'Resolve Conflict'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
