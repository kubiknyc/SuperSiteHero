/**
 * Project Cache Settings
 *
 * Allows users to:
 * - Choose projects to cache for offline access
 * - View storage usage per project
 * - Clear cache for individual projects
 */

import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import {
  Download,
  Trash2,
  HardDrive,
  CheckCircle2,
  Loader2,
  AlertCircle,
  FolderOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useStorageQuota } from '@/stores/offline-store'
import {
  getDatabase,
  STORES,
  getAllFromStore,
  clearStore,
} from '@/lib/offline/indexeddb'
import { StorageManager } from '@/lib/offline/storage-manager'
import { supabase, supabaseUntyped } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'
import type { CachedData } from '@/types/offline'

// ============================================================================
// Types
// ============================================================================

interface CachedProject {
  id: string
  name: string
  status: 'active' | 'completed' | 'archived'
  cachedAt: number
  lastAccessedAt: number
  storageSize: number
  includesPhotos: boolean
  includesDocuments: boolean
  cachedItems: {
    daily_reports: number
    tasks: number
    rfis: number
    punch_items: number
    photos: number
    documents: number
  }
}

interface ProjectCacheSettingsProps {
  className?: string
  trigger?: React.ReactNode
}

// ============================================================================
// useCachedProjects Hook - Production Implementation
// ============================================================================

// Extended type for project cache metadata stored in IndexedDB
interface ProjectCacheMetadata {
  id: string
  projectId: string
  projectName: string
  projectStatus: 'active' | 'completed' | 'archived'
  cachedAt: number
  lastAccessedAt: number
  includesPhotos: boolean
  includesDocuments: boolean
  cachedItems: {
    daily_reports: number
    tasks: number
    rfis: number
    punch_items: number
    photos: number
    documents: number
  }
}

// Calculate storage size for cached project data
async function calculateProjectStorageSize(projectId: string): Promise<number> {
  try {
    const db = await getDatabase()
    const tx = db.transaction(STORES.CACHED_DATA, 'readonly')
    let totalSize = 0

    for await (const cursor of tx.store) {
      const entry = cursor.value as CachedData
      // Check if this cache entry belongs to the project
      if (entry.key.includes(projectId) ||
          (entry.data && typeof entry.data === 'object' &&
           (entry.data.project_id === projectId || entry.data.projectId === projectId))) {
        // Estimate size based on JSON serialization
        totalSize += new Blob([JSON.stringify(entry.data)]).size
      }
    }

    await tx.done
    return totalSize
  } catch (error) {
    logger.error('Failed to calculate project storage size:', error)
    return 0
  }
}

// Get cached project metadata from IndexedDB
async function getCachedProjectsFromDB(): Promise<CachedProject[]> {
  try {
    // Get all cached data entries
    const allCached = await getAllFromStore<CachedData>(STORES.CACHED_DATA)

    // Group by project
    const projectMap = new Map<string, {
      projectId: string
      projectName: string
      projectStatus: 'active' | 'completed' | 'archived'
      cachedAt: number
      lastAccessedAt: number
      items: CachedData[]
    }>()

    for (const entry of allCached) {
      // Try to extract project ID from the cached data
      let projectId: string | null = null
      let projectName = 'Unknown Project'
      let projectStatus: 'active' | 'completed' | 'archived' = 'active'

      if (entry.table === 'projects' && entry.data) {
        // This is a project record itself
        projectId = entry.data.id
        projectName = entry.data.name || projectName
        projectStatus = entry.data.status || projectStatus
      } else if (entry.data && typeof entry.data === 'object') {
        // Check for project_id in the data
        projectId = entry.data.project_id || entry.data.projectId
      }

      // Try to extract from key pattern: "table:project_id:..."
      if (!projectId) {
        const keyParts = entry.key.split(':')
        if (keyParts.length >= 2 && keyParts[1].length === 36) {
          // Likely a UUID
          projectId = keyParts[1]
        }
      }

      if (projectId) {
        const existing = projectMap.get(projectId) || {
          projectId,
          projectName,
          projectStatus,
          cachedAt: entry.timestamp,
          lastAccessedAt: entry.syncedAt || entry.timestamp,
          items: [],
        }

        // Update timestamps
        existing.cachedAt = Math.min(existing.cachedAt, entry.timestamp)
        existing.lastAccessedAt = Math.max(existing.lastAccessedAt, entry.syncedAt || entry.timestamp)

        // Update name/status if this is a project record
        if (entry.table === 'projects' && entry.data) {
          existing.projectName = entry.data.name || existing.projectName
          existing.projectStatus = entry.data.status || existing.projectStatus
        }

        existing.items.push(entry)
        projectMap.set(projectId, existing)
      }
    }

    // Convert map to CachedProject array
    const cachedProjects: CachedProject[] = []

    for (const [projectId, projectData] of projectMap) {
      // Count items by type
      const cachedItems = {
        daily_reports: 0,
        tasks: 0,
        rfis: 0,
        punch_items: 0,
        photos: 0,
        documents: 0,
      }

      let includesPhotos = false
      let includesDocuments = false

      for (const item of projectData.items) {
        switch (item.table) {
          case 'daily_reports':
            cachedItems.daily_reports++
            break
          case 'tasks':
            cachedItems.tasks++
            break
          case 'rfis':
            cachedItems.rfis++
            break
          case 'punch_items':
          case 'punch_lists':
            cachedItems.punch_items++
            break
          case 'photos':
          case 'project_photos':
            cachedItems.photos++
            includesPhotos = true
            break
          case 'documents':
          case 'project_documents':
            cachedItems.documents++
            includesDocuments = true
            break
        }
      }

      // Calculate storage size
      const storageSize = await calculateProjectStorageSize(projectId)

      cachedProjects.push({
        id: projectId,
        name: projectData.projectName,
        status: projectData.projectStatus,
        cachedAt: projectData.cachedAt,
        lastAccessedAt: projectData.lastAccessedAt,
        storageSize,
        includesPhotos,
        includesDocuments,
        cachedItems,
      })
    }

    // Sort by last accessed (most recent first)
    cachedProjects.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt)

    return cachedProjects
  } catch (error) {
    logger.error('Failed to get cached projects:', error)
    return []
  }
}

// Download project data for offline access
async function downloadProjectForOffline(
  projectId: string,
  options: { includePhotos: boolean; includeDocuments: boolean }
): Promise<void> {
  logger.log(`Downloading project ${projectId} for offline access`, options)

  // Fetch project data
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (projectError) {throw projectError}

  // Cache the project
  await StorageManager.cacheData(
    StorageManager.generateRecordKey('projects', projectId),
    'projects',
    project
  )

  // Fetch and cache related data
  const fetchAndCache = async (table: string, foreignKey: string = 'project_id') => {
    // Use supabaseUntyped for dynamic table names that may not be in the typed schema
    const { data, error } = await supabaseUntyped
      .from(table)
      .select('*')
      .eq(foreignKey, projectId)

    if (error) {
      logger.warn(`Failed to fetch ${table} for project ${projectId}:`, error)
      return []
    }

    // Cache each record
    for (const record of (data || []) as Array<{ id: string; [key: string]: unknown }>) {
      await StorageManager.cacheData(
        StorageManager.generateRecordKey(table, record.id),
        table,
        record
      )
    }

    return data || []
  }

  // Core project data - always download
  await Promise.all([
    fetchAndCache('daily_reports'),
    fetchAndCache('tasks'),
    fetchAndCache('rfis'),
    fetchAndCache('punch_items'),
    fetchAndCache('submittals'),
    fetchAndCache('change_orders'),
  ])

  // Optional: Photos
  if (options.includePhotos) {
    await fetchAndCache('project_photos')
  }

  // Optional: Documents
  if (options.includeDocuments) {
    await fetchAndCache('documents')
  }

  logger.log(`Project ${projectId} downloaded for offline access`)
}

// Clear cached data for a specific project
async function clearProjectCacheFromDB(projectId: string): Promise<void> {
  try {
    const db = await getDatabase()
    const tx = db.transaction(STORES.CACHED_DATA, 'readwrite')

    for await (const cursor of tx.store) {
      const entry = cursor.value as CachedData

      // Check if this entry belongs to the project
      const belongsToProject =
        entry.key.includes(projectId) ||
        (entry.data && typeof entry.data === 'object' &&
         (entry.data.project_id === projectId ||
          entry.data.projectId === projectId ||
          entry.data.id === projectId))

      if (belongsToProject) {
        await cursor.delete()
      }
    }

    await tx.done
    logger.log(`Cleared cache for project ${projectId}`)
  } catch (error) {
    logger.error('Failed to clear project cache:', error)
    throw error
  }
}

// Clear all cached project data
async function clearAllProjectCacheFromDB(): Promise<void> {
  try {
    await clearStore(STORES.CACHED_DATA)
    logger.log('Cleared all project cache')
  } catch (error) {
    logger.error('Failed to clear all project cache:', error)
    throw error
  }
}

function useCachedProjects() {
  const queryClient = useQueryClient()
  const [downloading, setDownloading] = useState<string | null>(null)

  // Query cached projects from IndexedDB
  const { data: cachedProjects = [], isLoading, refetch } = useQuery({
    queryKey: ['cachedProjects'],
    queryFn: getCachedProjectsFromDB,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  })

  // Download project mutation
  const downloadProjectMutation = useMutation({
    mutationFn: async ({ projectId, options }: {
      projectId: string
      options: { includePhotos: boolean; includeDocuments: boolean }
    }) => {
      await downloadProjectForOffline(projectId, options)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cachedProjects'] })
    },
  })

  // Clear project cache mutation
  const clearProjectMutation = useMutation({
    mutationFn: clearProjectCacheFromDB,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cachedProjects'] })
    },
  })

  // Clear all cache mutation
  const clearAllMutation = useMutation({
    mutationFn: clearAllProjectCacheFromDB,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cachedProjects'] })
    },
  })

  const downloadProject = useCallback(async (
    projectId: string,
    options: { includePhotos: boolean; includeDocuments: boolean }
  ) => {
    setDownloading(projectId)
    try {
      await downloadProjectMutation.mutateAsync({ projectId, options })
    } finally {
      setDownloading(null)
    }
  }, [downloadProjectMutation])

  const clearProjectCache = useCallback(async (projectId: string) => {
    await clearProjectMutation.mutateAsync(projectId)
  }, [clearProjectMutation])

  const clearAllCache = useCallback(async () => {
    await clearAllMutation.mutateAsync()
  }, [clearAllMutation])

  return {
    cachedProjects,
    downloading,
    isLoading,
    downloadProject,
    clearProjectCache,
    clearAllCache,
    refetch,
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) {return '0 B'}
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// ============================================================================
// Sub-Components
// ============================================================================

function StorageOverview({ quota }: { quota: any }) {
  if (!quota) {return null}

  const percentageUsed = quota.usage && quota.quota
    ? Math.round((quota.usage / quota.quota) * 100)
    : 0

  return (
    <div className="p-4 rounded-lg border bg-muted/20">
      <div className="flex items-center gap-2 mb-3">
        <HardDrive className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Storage Overview</span>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Used</span>
          <span className="font-medium">
            {formatBytes(quota.usage || 0)} of {formatBytes(quota.quota || 0)}
          </span>
        </div>

        <Progress
          value={percentageUsed}
          className={cn(
            'h-2',
            percentageUsed > 80 && 'bg-destructive/20'
          )}
        />

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{percentageUsed}% used</span>
          <span>{formatBytes((quota.quota || 0) - (quota.usage || 0))} available</span>
        </div>

        {percentageUsed > 80 && (
          <div className="flex items-center gap-2 text-xs text-warning">
            <AlertCircle className="h-3 w-3" />
            <span>Storage is running low</span>
          </div>
        )}
      </div>
    </div>
  )
}

function CachedProjectCard({
  project,
  onClearCache,
}: {
  project: CachedProject
  onClearCache: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  const totalItems = Object.values(project.cachedItems).reduce((sum, count) => sum + count, 0)

  return (
    <div className="p-3 rounded-lg border bg-muted/20">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium truncate">{project.name}</h4>
            <Badge variant="secondary" className="text-xs capitalize">
              {project.status}
            </Badge>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{formatBytes(project.storageSize)}</span>
            <span>•</span>
            <span>{totalItems} items</span>
            <span>•</span>
            <span>Cached {formatDistanceToNow(project.cachedAt, { addSuffix: true })}</span>
          </div>

          {(project.includesPhotos || project.includesDocuments) && (
            <div className="flex items-center gap-2 mt-2">
              {project.includesPhotos && (
                <Badge variant="outline" className="text-xs">
                  Photos
                </Badge>
              )}
              {project.includesDocuments && (
                <Badge variant="outline" className="text-xs">
                  Documents
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear project cache?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove all offline data for "{project.name}".
                  You'll need to re-download it to access offline.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => onClearCache(project.id)}
                >
                  Clear Cache
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Cached Items</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(project.cachedItems).map(([type, count]) => (
              count > 0 && (
                <div key={type} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground capitalize">
                    {type.replace(/_/g, ' ')}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {count}
                  </Badge>
                </div>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DownloadProjectForm({
  onDownload,
  isDownloading,
}: {
  onDownload: (options: { includePhotos: boolean; includeDocuments: boolean }) => void
  isDownloading: boolean
}) {
  const [includePhotos, setIncludePhotos] = useState(true)
  const [includeDocuments, setIncludeDocuments] = useState(true)

  return (
    <div className="p-4 rounded-lg border bg-muted/20 space-y-4">
      <div>
        <h4 className="text-sm font-medium mb-2">Download Options</h4>
        <p className="text-xs text-muted-foreground">
          Choose what to include in offline cache
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="include-photos" className="text-sm">
            Include photos
          </Label>
          <Switch
            id="include-photos"
            checked={includePhotos}
            onCheckedChange={setIncludePhotos}
            disabled={isDownloading}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="include-documents" className="text-sm">
            Include documents
          </Label>
          <Switch
            id="include-documents"
            checked={includeDocuments}
            onCheckedChange={setIncludeDocuments}
            disabled={isDownloading}
          />
        </div>
      </div>

      <Button
        className="w-full gap-2"
        onClick={() => onDownload({ includePhotos, includeDocuments })}
        disabled={isDownloading}
      >
        {isDownloading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Downloading...
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Download for Offline
          </>
        )}
      </Button>

      {(includePhotos || includeDocuments) && (
        <p className="text-xs text-muted-foreground">
          Note: Large files may take significant storage space
        </p>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function ProjectCacheSettings({ className, trigger }: ProjectCacheSettingsProps) {
  const storageQuota = useStorageQuota()
  const {
    cachedProjects,
    downloading,
    downloadProject,
    clearProjectCache,
    clearAllCache,
  } = useCachedProjects()

  const totalCachedSize = useMemo(() => {
    return cachedProjects.reduce((sum, project) => sum + project.storageSize, 0)
  }, [cachedProjects])

  const handleDownloadProject = async (projectId: string, options: {
    includePhotos: boolean
    includeDocuments: boolean
  }) => {
    try {
      await downloadProject(projectId, options)
      toast.success('Download complete', {
        description: 'Project is now available offline',
      })
    } catch {
      toast.error('Download failed', {
        description: 'Could not download project. Please try again.',
      })
    }
  }

  const handleClearCache = async (projectId: string) => {
    try {
      await clearProjectCache(projectId)
      toast.success('Cache cleared', {
        description: 'Project offline data has been removed',
      })
    } catch {
      toast.error('Clear failed', {
        description: 'Could not clear cache. Please try again.',
      })
    }
  }

  const handleClearAll = async () => {
    try {
      await clearAllCache()
      toast.success('All cache cleared', {
        description: 'All offline project data has been removed',
      })
    } catch {
      toast.error('Clear failed', {
        description: 'Could not clear all cache. Please try again.',
      })
    }
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Offline Projects</span>
            {cachedProjects.length > 0 && (
              <Badge variant="secondary">{cachedProjects.length}</Badge>
            )}
          </Button>
        )}
      </SheetTrigger>

      <SheetContent className={cn('w-[400px] sm:w-[540px]', className)}>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Offline Projects
          </SheetTitle>
          <SheetDescription>
            Manage projects cached for offline access
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-4">
          <div className="space-y-4 pr-4">
            {/* Storage Overview */}
            <StorageOverview quota={storageQuota} />

            {cachedProjects.length > 0 && (
              <>
                <Separator />

                {/* Summary Stats */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {cachedProjects.length} project{cachedProjects.length !== 1 ? 's' : ''} cached
                  </span>
                  <span className="font-medium">{formatBytes(totalCachedSize)}</span>
                </div>

                {/* Cached Projects List */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Cached Projects</h4>
                  {cachedProjects.map((project) => (
                    <CachedProjectCard
                      key={project.id}
                      project={project}
                      onClearCache={handleClearCache}
                    />
                  ))}
                </div>

                {/* Clear All Button */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      Clear All Cached Projects
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear all cached projects?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove offline data for all {cachedProjects.length} project
                        {cachedProjects.length !== 1 ? 's' : ''}, freeing up{' '}
                        {formatBytes(totalCachedSize)} of storage.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={handleClearAll}
                      >
                        Clear All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}

            {/* Empty State */}
            {cachedProjects.length === 0 && (
              <div className="text-center py-12">
                <FolderOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="font-medium text-muted-foreground">No cached projects</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Download projects to access them offline
                </p>
              </div>
            )}

            <Separator />

            {/* Download New Project Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Download Project for Offline</h4>
              <p className="text-xs text-muted-foreground">
                Select a project from the projects page and use the "Make Available Offline" button
                to download it.
              </p>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

export default ProjectCacheSettings
