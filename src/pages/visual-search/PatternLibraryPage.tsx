// File: /src/pages/visual-search/PatternLibraryPage.tsx
// Pattern Library page for managing saved visual search patterns

import { useState, useMemo, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  useVisualSearchPatterns,
  useDeletePattern,
} from '@/features/visual-search/hooks'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  Button,
  Card,
  CardContent,
  Input,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui'
import {
  Search,
  ChevronLeft,
  Target,
  Clock,
  TrendingUp,
  SortAsc,
  Trash2,
  Play,
  Library,
  MoreVertical,
  Calendar,
  Hash,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VisualSearchPattern } from '@/types/drawing-sheets'

type SortOption = 'most_used' | 'recent' | 'name'

const SORT_OPTIONS: { value: SortOption; label: string; icon: React.ReactNode }[] = [
  { value: 'most_used', label: 'Most Used', icon: <TrendingUp className="h-4 w-4" /> },
  { value: 'recent', label: 'Recently Created', icon: <Clock className="h-4 w-4" /> },
  { value: 'name', label: 'Name (A-Z)', icon: <SortAsc className="h-4 w-4" /> },
]

interface PatternCardProps {
  pattern: VisualSearchPattern
  onSearch: (pattern: VisualSearchPattern) => void
  onDelete: (pattern: VisualSearchPattern) => void
}

function PatternCard({ pattern, onSearch, onDelete }: PatternCardProps) {
  const formattedDate = new Date(pattern.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const lastUsedDate = pattern.last_used_at
    ? new Date(pattern.last_used_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : 'Never'

  return (
    <Card className="group overflow-hidden border-border/60 hover:border-primary/40 hover:shadow-lg transition-all duration-300">
      {/* Pattern thumbnail */}
      <div className="relative aspect-square bg-gradient-to-br from-muted via-muted/80 to-muted/50 overflow-hidden">
        {pattern.pattern_image_url ? (
          <img
            src={pattern.pattern_image_url}
            alt={pattern.name}
            className="w-full h-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Target className="h-16 w-16 text-muted-foreground/20" />
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Quick action buttons */}
        <div className="absolute bottom-3 inset-x-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
          <Button
            size="sm"
            className="flex-1 h-9 shadow-lg"
            onClick={() => onSearch(pattern)}
          >
            <Play className="h-3.5 w-3.5 mr-1.5" />
            Search
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-9 w-9 p-0 shadow-lg"
                  onClick={() => onDelete(pattern)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete pattern</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Usage badge */}
        <div className="absolute top-3 right-3">
          <Badge
            variant="secondary"
            className="bg-black/40 text-white border-0 backdrop-blur-sm font-mono text-xs"
          >
            {pattern.usage_count} uses
          </Badge>
        </div>
      </div>

      {/* Pattern info */}
      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-medium text-sm truncate" title={pattern.name}>
            {pattern.name}
          </h3>
          {pattern.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {pattern.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            <span>Last: {lastUsedDate}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Tolerance:</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/70 rounded-full"
                style={{ width: `${pattern.match_tolerance * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {Math.round(pattern.match_tolerance * 100)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PatternCardSkeleton() {
  return (
    <Card className="overflow-hidden border-border/60">
      <Skeleton className="aspect-square" />
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
      </CardContent>
    </Card>
  )
}

export function PatternLibraryPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { userProfile } = useAuth()

  // State
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('most_used')
  const [patternToDelete, setPatternToDelete] = useState<VisualSearchPattern | null>(null)

  // Queries
  const { data: patterns, isLoading } = useVisualSearchPatterns(projectId)

  // Mutations
  const deletePattern = useDeletePattern()

  // Filtered and sorted patterns
  const displayedPatterns = useMemo(() => {
    if (!patterns) {return []}

    let result = [...patterns]

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term)
      )
    }

    // Sort
    switch (sortBy) {
      case 'most_used':
        result.sort((a, b) => b.usage_count - a.usage_count)
        break
      case 'recent':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name))
        break
    }

    return result
  }, [patterns, searchTerm, sortBy])

  // Stats
  const stats = useMemo(() => {
    if (!patterns) {return { total: 0, totalUses: 0, avgTolerance: 0 }}
    return {
      total: patterns.length,
      totalUses: patterns.reduce((sum, p) => sum + p.usage_count, 0),
      avgTolerance:
        patterns.length > 0
          ? patterns.reduce((sum, p) => sum + p.match_tolerance, 0) / patterns.length
          : 0,
    }
  }, [patterns])

  // Handlers
  const handleSearch = useCallback(
    (pattern: VisualSearchPattern) => {
      navigate(`/projects/${projectId}/visual-search?patternId=${pattern.id}`)
    },
    [navigate, projectId]
  )

  const handleDelete = useCallback((pattern: VisualSearchPattern) => {
    setPatternToDelete(pattern)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!patternToDelete) {return}
    try {
      await deletePattern.mutateAsync(patternToDelete.id)
    } catch (error) {
      console.error('Failed to delete pattern:', error)
    } finally {
      setPatternToDelete(null)
    }
  }, [patternToDelete, deletePattern])

  return (
    <AppLayout>
      <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header */}
        <div className="flex-none border-b border-border/60 bg-background/95 backdrop-blur-sm">
          <div className="px-6 py-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                {/* Back link */}
                <Link
                  to={`/projects/${projectId}/visual-search`}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to Visual Search
                </Link>

                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                    <Library className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h1 className="heading-page">Pattern Library</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Manage your saved visual search patterns
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-2xl font-semibold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Patterns</p>
                </div>
                <div className="w-px h-10 bg-border/60" />
                <div className="text-right">
                  <p className="text-2xl font-semibold">{stats.totalUses}</p>
                  <p className="text-xs text-muted-foreground">Total Searches</p>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 mt-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search patterns by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-background/50 border-border/50"
                />
              </div>

              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-[180px] bg-background/50 border-border/50">
                  <div className="flex items-center gap-2">
                    {SORT_OPTIONS.find((o) => o.value === sortBy)?.icon}
                    <SelectValue placeholder="Sort by" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        {option.icon}
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <PatternCardSkeleton key={i} />
              ))}
            </div>
          ) : displayedPatterns.length > 0 ? (
            <div className="space-y-4">
              {/* Results count */}
              <p className="text-sm text-muted-foreground">
                {searchTerm
                  ? `${displayedPatterns.length} pattern${displayedPatterns.length !== 1 ? 's' : ''} found`
                  : `${displayedPatterns.length} pattern${displayedPatterns.length !== 1 ? 's' : ''}`}
              </p>

              {/* Pattern grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
                {displayedPatterns.map((pattern) => (
                  <PatternCard
                    key={pattern.id}
                    pattern={pattern}
                    onSearch={handleSearch}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] text-center">
              <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-6">
                <Library className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-lg font-medium mb-2">
                {searchTerm ? 'No patterns found' : 'No patterns yet'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                {searchTerm
                  ? 'Try adjusting your search term'
                  : 'Create your first pattern by selecting a region in the Visual Search tool.'}
              </p>
              {!searchTerm && (
                <Link to={`/projects/${projectId}/visual-search`}>
                  <Button>
                    <Target className="h-4 w-4 mr-2" />
                    Go to Visual Search
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Delete confirmation dialog */}
        <AlertDialog open={!!patternToDelete} onOpenChange={() => setPatternToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Pattern</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{patternToDelete?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deletePattern.isPending ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  )
}

export default PatternLibraryPage
