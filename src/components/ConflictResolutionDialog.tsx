// File: /src/components/ConflictResolutionDialog.tsx
// Dialog component for resolving sync conflicts between local and server data

import { useState } from 'react'
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
import { AlertCircle, ArrowLeftRight, Cloud, HardDrive } from 'lucide-react'
import { useOfflineStore, type SyncConflict } from '@/stores/offline-store'
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
  const { resolveConflict } = useOfflineStore()

  if (!conflict) {return null}

  const handleResolve = async () => {
    setResolving(true)
    try {
      let resolvedData: any

      switch (selectedResolution) {
        case 'local':
          resolvedData = conflict.localData
          break
        case 'server':
          resolvedData = conflict.serverData
          break
        case 'merge':
          // For merge, user would need to manually edit - for now use server data
          // In a full implementation, this would open a merge editor
          resolvedData = conflict.serverData
          logger.warn('[ConflictResolution] Manual merge not yet implemented, using server data')
          break
      }

      resolveConflict(conflict.id, resolvedData)
      onOpenChange(false)
    } catch (error) {
      logger.error('[ConflictResolution] Failed to resolve conflict:', error)
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
    const differences: Array<{ field: string; local: any; server: any }> = []
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

  const renderValue = (value: any): string => {
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
              onClick={() => setSelectedResolution('local')}
              className="flex items-center gap-2"
            >
              <HardDrive className="h-4 w-4" />
              Keep Local
            </Button>
            <Button
              variant={selectedResolution === 'server' ? 'default' : 'outline'}
              onClick={() => setSelectedResolution('server')}
              className="flex items-center gap-2"
            >
              <Cloud className="h-4 w-4" />
              Keep Server
            </Button>
            <Button
              variant={selectedResolution === 'merge' ? 'default' : 'outline'}
              onClick={() => setSelectedResolution('merge')}
              className="flex items-center gap-2"
              disabled
              title="Manual merge coming soon"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Merge (Soon)
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
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <HardDrive className="h-3 w-3" /> Local
                            </p>
                            <div className="bg-warning-light dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded p-2">
                              <pre className="text-xs whitespace-pre-wrap break-words">
                                {renderValue(diff.local)}
                              </pre>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Cloud className="h-3 w-3" /> Server
                            </p>
                            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded p-2">
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
                  'You will manually merge the changes (not yet implemented - using server version).'}
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
