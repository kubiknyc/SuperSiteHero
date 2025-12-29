// File: /src/components/offline/ConflictResolutionDialog.tsx
// Dialog for resolving sync conflicts between local and server data

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
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  Cloud,
  Smartphone,
  Check,
  ChevronRight,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { useOfflineStore, type SyncConflict } from '@/stores/offline-store'
import { useToast } from '@/components/ui/use-toast'
import { logger } from '@/lib/utils/logger'

interface ConflictResolutionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Render field comparison (moved outside component to avoid creating components during render)
function FieldComparison({
  field,
  localValue,
  serverValue,
}: {
  field: string
  localValue: unknown
  serverValue: unknown
}) {
  const isConflicting = JSON.stringify(localValue) !== JSON.stringify(serverValue)

  return (
    <div
      className={cn(
        'grid grid-cols-3 gap-4 py-2 border-b last:border-0',
        isConflicting && 'bg-warning/5'
      )}
    >
      <div className="font-medium text-sm capitalize">
        {field.replace(/_/g, ' ')}
        {isConflicting && (
          <AlertTriangle className="h-3 w-3 inline ml-1 text-warning" />
        )}
      </div>
      <div className="text-sm text-muted-foreground truncate">
        {String(localValue ?? '—')}
      </div>
      <div className="text-sm text-muted-foreground truncate">
        {String(serverValue ?? '—')}
      </div>
    </div>
  )
}

/**
 * Conflict Resolution Dialog
 *
 * Features:
 * - List all unresolved conflicts
 * - Side-by-side comparison of local vs server data
 * - Three resolution options: Keep Local, Keep Server, Merge
 * - Batch resolution for multiple conflicts
 * - Conflict type indicators
 */
export function ConflictResolutionDialog({
  open,
  onOpenChange,
}: ConflictResolutionDialogProps) {
  const { toast } = useToast()
  const conflicts = useOfflineStore((state) => state.conflicts)
  const resolveConflict = useOfflineStore((state) => state.resolveConflict)
  const [selectedConflict, setSelectedConflict] = useState<SyncConflict | null>(null)
  const [isResolving, setIsResolving] = useState(false)

  // Resolve a single conflict
  const handleResolve = async (
    conflict: SyncConflict,
    resolution: 'local' | 'server' | 'merge'
  ) => {
    setIsResolving(true)
    try {
      await resolveConflict(conflict.id, resolution)

      toast({
        title: 'Conflict resolved',
        description: `Data ${resolution === 'local' ? 'from your device' : resolution === 'server' ? 'from server' : 'merged'} will be used.`,
      })

      // Move to next conflict or close
      const remainingConflicts = conflicts.filter((c) => c.id !== conflict.id)
      if (remainingConflicts.length > 0) {
        setSelectedConflict(remainingConflicts[0])
      } else {
        setSelectedConflict(null)
        onOpenChange(false)
      }
    } catch (_error) {
      logger.error('[ConflictResolution] Failed to resolve:', _error)
      toast({
        title: 'Failed to resolve conflict',
        description: 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsResolving(false)
    }
  }

  // Resolve all conflicts with same resolution
  const handleResolveAll = async (resolution: 'local' | 'server') => {
    setIsResolving(true)
    try {
      for (const conflict of conflicts) {
        await resolveConflict(conflict.id, resolution)
      }

      toast({
        title: 'All conflicts resolved',
        description: `${conflicts.length} conflicts resolved using ${resolution === 'local' ? 'local' : 'server'} data.`,
      })

      onOpenChange(false)
    } catch (_error) {
      logger.error('[ConflictResolution] Failed to resolve all:', _error)
      toast({
        title: 'Failed to resolve conflicts',
        description: 'Some conflicts may not have been resolved.',
        variant: 'destructive',
      })
    } finally {
      setIsResolving(false)
    }
  }

  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  // Get entity type label
  const getEntityLabel = (type: string) => {
    const labels: Record<string, string> = {
      daily_report: 'Daily Report',
      punch_item: 'Punch Item',
      task: 'Task',
      rfi: 'RFI',
      submittal: 'Submittal',
      photo: 'Photo',
      document: 'Document',
      inspection: 'Inspection',
    }
    return labels[type] || type
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Sync Conflicts
            <Badge variant="secondary">{conflicts.length}</Badge>
          </DialogTitle>
          <DialogDescription>
            These items were modified on both your device and the server. Choose which
            version to keep.
          </DialogDescription>
        </DialogHeader>

        {conflicts.length === 0 ? (
          <div className="text-center py-8">
            <Check className="h-12 w-12 mx-auto text-success mb-4" />
            <p className="font-medium">All conflicts resolved</p>
            <p className="text-sm text-muted-foreground">
              Your data is now in sync with the server.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-[280px_1fr] gap-4 min-h-[400px]">
            {/* Conflict List */}
            <ScrollArea className="h-[400px] border rounded-lg">
              <div className="p-2 space-y-1">
                {conflicts.map((conflict) => (
                  <button
                    key={conflict.id}
                    onClick={() => setSelectedConflict(conflict)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg transition-colors',
                      selectedConflict?.id === conflict.id
                        ? 'bg-primary/10 border border-primary/20'
                        : 'hover:bg-muted'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {getEntityLabel(conflict.entityType)}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium mt-1 truncate">
                      {conflict.entityId.slice(0, 8)}...
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(conflict.detectedAt)}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>

            {/* Conflict Detail */}
            <div className="border rounded-lg overflow-hidden">
              {selectedConflict ? (
                <div className="h-full flex flex-col">
                  {/* Header */}
                  <div className="p-4 border-b bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge>{getEntityLabel(selectedConflict.entityType)}</Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          ID: {selectedConflict.entityId}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Comparison Tabs */}
                  <Tabs defaultValue="compare" className="flex-1">
                    <TabsList className="w-full justify-start rounded-none border-b">
                      <TabsTrigger value="compare">Compare</TabsTrigger>
                      <TabsTrigger value="local">Your Device</TabsTrigger>
                      <TabsTrigger value="server">Server</TabsTrigger>
                    </TabsList>

                    <TabsContent value="compare" className="m-0 p-4">
                      <div className="grid grid-cols-3 gap-4 pb-2 border-b font-medium text-sm">
                        <div>Field</div>
                        <div className="flex items-center gap-1">
                          <Smartphone className="h-4 w-4" />
                          Your Device
                        </div>
                        <div className="flex items-center gap-1">
                          <Cloud className="h-4 w-4" />
                          Server
                        </div>
                      </div>
                      <ScrollArea className="h-[200px]">
                        {Object.keys(selectedConflict.localData).map((field) => (
                          <FieldComparison
                            key={field}
                            field={field}
                            localValue={selectedConflict.localData[field]}
                            serverValue={selectedConflict.serverData[field]}
                          />
                        ))}
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="local" className="m-0 p-4">
                      <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                        <Smartphone className="h-4 w-4" />
                        Modified: {formatTime(selectedConflict.localTimestamp)}
                      </div>
                      <ScrollArea className="h-[200px]">
                        <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                          {JSON.stringify(selectedConflict.localData, null, 2)}
                        </pre>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="server" className="m-0 p-4">
                      <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                        <Cloud className="h-4 w-4" />
                        Modified: {formatTime(selectedConflict.serverTimestamp)}
                      </div>
                      <ScrollArea className="h-[200px]">
                        <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                          {JSON.stringify(selectedConflict.serverData, null, 2)}
                        </pre>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>

                  {/* Resolution Actions */}
                  <div className="p-4 border-t bg-muted/30">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleResolve(selectedConflict, 'local')}
                        disabled={isResolving}
                      >
                        <Smartphone className="h-4 w-4 mr-2" />
                        Keep Local
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleResolve(selectedConflict, 'server')}
                        disabled={isResolving}
                      >
                        <Cloud className="h-4 w-4 mr-2" />
                        Keep Server
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <ArrowRight className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Select a conflict to view details</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {conflicts.length > 1 && (
            <>
              <Button
                variant="outline"
                onClick={() => handleResolveAll('local')}
                disabled={isResolving}
              >
                Keep All Local
              </Button>
              <Button
                variant="outline"
                onClick={() => handleResolveAll('server')}
                disabled={isResolving}
              >
                Keep All Server
              </Button>
            </>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
