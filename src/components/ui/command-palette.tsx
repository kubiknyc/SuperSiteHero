/**
 * Command Palette (Cmd+K Global Search)
 * Provides quick navigation and search across all features
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  Search,
  FileText,
  ClipboardList,
  AlertCircle,
  ListChecks,
  DollarSign,
  Building2,
  Users,
  Calendar,
  Settings,
  Plus,
  ChevronRight,
  Command,
  ArrowRight,
  Loader2,
  Shield,
  FolderOpen,
  Clock,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type EntityType = 'project' | 'task' | 'rfi' | 'submittal' | 'change_order' | 'punch_item' | 'document' | 'daily_report' | 'contact' | 'safety'

interface SearchResult {
  id: string
  type: EntityType
  title: string
  subtitle?: string
  projectName?: string
  status?: string
  icon: React.ComponentType<{ className?: string }>
  link: string
}

interface RecentSearch {
  query: string
  timestamp: number
}

// Type filter configuration
const TYPE_FILTERS: Array<{ value: EntityType | 'all'; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: 'all', label: 'All', icon: Search },
  { value: 'project', label: 'Projects', icon: Building2 },
  { value: 'task', label: 'Tasks', icon: ClipboardList },
  { value: 'rfi', label: 'RFIs', icon: AlertCircle },
  { value: 'submittal', label: 'Submittals', icon: FileText },
  { value: 'change_order', label: 'Change Orders', icon: DollarSign },
  { value: 'punch_item', label: 'Punch Items', icon: ListChecks },
  { value: 'safety', label: 'Safety', icon: Shield },
]

// Local storage key for recent searches
const RECENT_SEARCHES_KEY = 'jobsight-recent-searches'
const MAX_RECENT_SEARCHES = 5

interface QuickAction {
  id: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  link: string
  shortcut?: string
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'new-task',
    label: 'Create New Task',
    description: 'Add a new task to a project',
    icon: Plus,
    link: '/tasks/new',
    shortcut: 'T',
  },
  {
    id: 'new-rfi',
    label: 'Create New RFI',
    description: 'Submit a new RFI',
    icon: Plus,
    link: '/rfis/new',
    shortcut: 'R',
  },
  {
    id: 'new-daily-report',
    label: 'Create Daily Report',
    description: 'Log today\'s progress',
    icon: Plus,
    link: '/daily-reports/new',
    shortcut: 'D',
  },
  {
    id: 'projects',
    label: 'View All Projects',
    description: 'Browse all projects',
    icon: Building2,
    link: '/projects',
  },
  {
    id: 'tasks',
    label: 'View All Tasks',
    description: 'Browse all tasks',
    icon: ClipboardList,
    link: '/tasks',
  },
  {
    id: 'rfis',
    label: 'View All RFIs',
    description: 'Browse all RFIs',
    icon: AlertCircle,
    link: '/rfis',
  },
  {
    id: 'punch-lists',
    label: 'View Punch Lists',
    description: 'Browse punch items',
    icon: ListChecks,
    link: '/punch-lists',
  },
  {
    id: 'safety',
    label: 'Safety Dashboard',
    description: 'View safety incidents',
    icon: Shield,
    link: '/safety',
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Configure your preferences',
    icon: Settings,
    link: '/settings',
  },
]

const TYPE_LABELS: Record<string, string> = {
  project: 'Project',
  task: 'Task',
  rfi: 'RFI',
  submittal: 'Submittal',
  change_order: 'Change Order',
  punch_item: 'Punch Item',
  document: 'Document',
  daily_report: 'Daily Report',
  contact: 'Contact',
  safety: 'Safety Incident',
}

// Helper functions for recent searches
function getRecentSearches(): RecentSearch[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveRecentSearch(query: string) {
  if (!query || query.length < 2) {return}
  try {
    const recent = getRecentSearches().filter((s) => s.query !== query)
    const updated = [{ query, timestamp: Date.now() }, ...recent].slice(0, MAX_RECENT_SEARCHES)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
  } catch {
    // Ignore localStorage errors
  }
}

function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY)
  } catch {
    // Ignore localStorage errors
  }
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [typeFilter, setTypeFilter] = useState<EntityType | 'all'>('all')
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([])
  const prevOpenRef = useRef(open)
  const prevItemsLengthRef = useRef(0)

  // Handle dialog open/close state changes
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      // Dialog just opened - reset state
      setQuery('')
      setSelectedIndex(0)
      setTypeFilter('all')
      setRecentSearches(getRecentSearches())
    }
    prevOpenRef.current = open
  }, [open])

  // Search across all entities
  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['global-search', query, typeFilter, userProfile?.company_id],
    queryFn: async (): Promise<SearchResult[]> => {
      if (!query || query.length < 2) {return []}
      if (!userProfile?.company_id) {return []}

      const searchTerm = `%${query}%`
      const results: SearchResult[] = []
      const shouldSearch = (type: EntityType) => typeFilter === 'all' || typeFilter === type

      // Search in parallel - only search types that match filter
      const [
        projectsRes,
        tasksRes,
        rfisRes,
        submittalsRes,
        coRes,
        punchRes,
        safetyRes,
      ] = await Promise.all([
        // Projects
        shouldSearch('project')
          ? supabase
              .from('projects')
              .select('id, name, status, project_number')
              .eq('company_id', userProfile.company_id)
              .ilike('name', searchTerm)
              .limit(typeFilter === 'project' ? 15 : 5)
          : Promise.resolve({ data: [] }),

        // Tasks
        shouldSearch('task')
          ? supabase
              .from('tasks')
              .select('id, title, status, project_id, projects(name)')
              .ilike('title', searchTerm)
              .is('deleted_at', null)
              .limit(typeFilter === 'task' ? 15 : 5)
          : Promise.resolve({ data: [] }),

        // RFIs
        shouldSearch('rfi')
          ? supabase
              .from('rfis')
              .select('id, subject, status, rfi_number, project_id, projects(name)')
              .eq('company_id', userProfile.company_id)
              .ilike('subject', searchTerm)
              .is('deleted_at', null)
              .limit(typeFilter === 'rfi' ? 15 : 5)
          : Promise.resolve({ data: [] }),

        // Submittals
        shouldSearch('submittal')
          ? supabase
              .from('submittals')
              .select('id, title, status, submittal_number, project_id, projects(name)')
              .eq('company_id', userProfile.company_id)
              .ilike('title', searchTerm)
              .is('deleted_at', null)
              .limit(typeFilter === 'submittal' ? 15 : 5)
          : Promise.resolve({ data: [] }),

        // Change Orders
        shouldSearch('change_order')
          ? supabase
              .from('change_orders')
              .select('id, title, status, pco_number, project_id, projects(name)')
              .ilike('title', searchTerm)
              .is('deleted_at', null)
              .limit(typeFilter === 'change_order' ? 15 : 5)
          : Promise.resolve({ data: [] }),

        // Punch Items
        shouldSearch('punch_item')
          ? supabase
              .from('punch_items')
              .select('id, title, status, item_number, project_id, projects(name)')
              .ilike('title', searchTerm)
              .is('deleted_at', null)
              .limit(typeFilter === 'punch_item' ? 15 : 5)
          : Promise.resolve({ data: [] }),

        // Safety Incidents
        shouldSearch('safety')
          ? supabase
              .from('safety_incidents')
              .select('id, title, status, incident_date, project_id, projects(name)')
              .eq('company_id', userProfile.company_id)
              .ilike('title', searchTerm)
              .is('deleted_at', null)
              .limit(typeFilter === 'safety' ? 15 : 5)
          : Promise.resolve({ data: [] }),
      ])

      // Process projects
      projectsRes.data?.forEach((p) => {
        results.push({
          id: p.id,
          type: 'project',
          title: p.name,
          subtitle: p.project_number ? `#${p.project_number}` : undefined,
          status: p.status ?? undefined,
          icon: Building2,
          link: `/projects/${p.id}`,
        })
      })

      // Process tasks
      tasksRes.data?.forEach((t: any) => {
        results.push({
          id: t.id,
          type: 'task',
          title: t.title,
          projectName: t.projects?.name,
          status: t.status,
          icon: ClipboardList,
          link: `/tasks/${t.id}`,
        })
      })

      // Process RFIs
      rfisRes.data?.forEach((r: any) => {
        results.push({
          id: r.id,
          type: 'rfi',
          title: r.subject,
          subtitle: r.rfi_number ? `RFI-${r.rfi_number}` : undefined,
          projectName: r.projects?.name,
          status: r.status,
          icon: AlertCircle,
          link: `/rfis/${r.id}`,
        })
      })

      // Process Submittals
      submittalsRes.data?.forEach((s: any) => {
        results.push({
          id: s.id,
          type: 'submittal',
          title: s.title,
          subtitle: s.submittal_number ? `SUB-${s.submittal_number}` : undefined,
          projectName: s.projects?.name,
          status: s.status,
          icon: FileText,
          link: `/submittals/${s.id}`,
        })
      })

      // Process Change Orders
      coRes.data?.forEach((c: any) => {
        results.push({
          id: c.id,
          type: 'change_order',
          title: c.title,
          subtitle: c.pco_number ? `PCO-${c.pco_number}` : undefined,
          projectName: c.projects?.name,
          status: c.status,
          icon: DollarSign,
          link: `/change-orders/${c.id}`,
        })
      })

      // Process Punch Items
      punchRes.data?.forEach((p: any) => {
        results.push({
          id: p.id,
          type: 'punch_item',
          title: p.title,
          subtitle: p.item_number ? `#${p.item_number}` : undefined,
          projectName: p.projects?.name,
          status: p.status,
          icon: ListChecks,
          link: `/punch-lists/${p.id}`,
        })
      })

      // Process Safety Incidents
      safetyRes.data?.forEach((s: any) => {
        results.push({
          id: s.id,
          type: 'safety',
          title: s.title,
          subtitle: s.incident_date ? `Incident: ${s.incident_date}` : undefined,
          projectName: s.projects?.name,
          status: s.status,
          icon: Shield,
          link: `/safety/incidents/${s.id}`,
        })
      })

      return results
    },
    enabled: open && query.length >= 2,
    staleTime: 1000 * 30, // 30 seconds
  })

  // Filter quick actions based on query
  const filteredActions = useMemo(() => {
    if (!query) {return QUICK_ACTIONS}
    const lowerQuery = query.toLowerCase()
    return QUICK_ACTIONS.filter(
      (action) =>
        action.label.toLowerCase().includes(lowerQuery) ||
        action.description.toLowerCase().includes(lowerQuery)
    )
  }, [query])

  // Combined items for navigation
  const allItems = useMemo(() => {
    const items: Array<{ type: 'action' | 'result'; data: QuickAction | SearchResult }> = []

    // Add search results first if we have a query
    if (searchResults && searchResults.length > 0) {
      searchResults.forEach((result) => {
        items.push({ type: 'result', data: result })
      })
    }

    // Add filtered actions
    filteredActions.forEach((action) => {
      items.push({ type: 'action', data: action })
    })

    return items
  }, [searchResults, filteredActions])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) {return}

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => Math.min(prev + 1, allItems.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Enter': {
          e.preventDefault()
          const selected = allItems[selectedIndex]
          if (selected) {
            const link = selected.type === 'action'
              ? (selected.data as QuickAction).link
              : (selected.data as SearchResult).link
            // Save search for search results
            if (selected.type === 'result' && query) {
              saveRecentSearch(query)
            }
            navigate(link)
            onOpenChange(false)
          }
          break
        }
        case 'Escape':
          e.preventDefault()
          onOpenChange(false)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, selectedIndex, allItems, navigate, onOpenChange, query])

  // Save search to recent when selecting a result
  const handleSelectWithSave = useCallback((link: string, searchQuery?: string) => {
    if (searchQuery) {
      saveRecentSearch(searchQuery)
      setRecentSearches(getRecentSearches())
    }
    navigate(link)
    onOpenChange(false)
  }, [navigate, onOpenChange])

  // Handle recent search click
  const handleRecentSearchClick = useCallback((recentQuery: string) => {
    setQuery(recentQuery)
  }, [])

  // Clear recent searches
  const handleClearRecent = useCallback(() => {
    clearRecentSearches()
    setRecentSearches([])
  }, [])

  // Reset selected index when items change
  useEffect(() => {
    if (prevItemsLengthRef.current !== allItems.length) {
      setSelectedIndex(0)
      prevItemsLengthRef.current = allItems.length
    }
  }, [allItems.length])

  const handleSelect = useCallback((link: string) => {
    navigate(link)
    onOpenChange(false)
  }, [navigate, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center border-b px-4">
          <Search className="h-5 w-5 text-muted-foreground mr-3" />
          <Input
            placeholder="Search projects, tasks, RFIs, or type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 text-base py-6"
            autoFocus
          />
          {searching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        {/* Type Filters */}
        <div className="flex items-center gap-1 px-3 py-2 border-b overflow-x-auto scrollbar-hide">
          {TYPE_FILTERS.map((filter) => {
            const Icon = filter.icon
            const isActive = typeFilter === filter.value
            return (
              <Button
                key={filter.value}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-7 text-xs gap-1.5 shrink-0",
                  isActive && "bg-primary text-primary-foreground"
                )}
                onClick={() => setTypeFilter(filter.value)}
              >
                <Icon className="h-3 w-3" aria-hidden="true" />
                {filter.label}
              </Button>
            )
          })}
        </div>

        {/* Results */}
        <ScrollArea className="max-h-[400px]">
          <div className="p-2">
            {/* Recent Searches - show when query is empty */}
            {!query && recentSearches.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between px-3 py-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Recent Searches
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-muted-foreground hover:text-foreground"
                    onClick={handleClearRecent}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                </div>
                {recentSearches.map((recent, index) => (
                  <button
                    key={`recent-${index}`}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors hover:bg-muted"
                    onClick={() => handleRecentSearchClick(recent.query)}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm">{recent.query}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Search Results */}
            {searchResults && searchResults.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground px-3 py-2">
                  Search Results
                </p>
                {searchResults.map((result, index) => {
                  const Icon = result.icon
                  const isSelected = selectedIndex === index

                  return (
                    <button
                      key={`result-${result.id}`}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                        isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                      )}
                      onClick={() => handleSelectWithSave(result.link, query)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <div className={cn(
                        'flex items-center justify-center w-9 h-9 rounded-lg',
                        isSelected ? 'bg-primary/20' : 'bg-muted'
                      )}>
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{result.title}</span>
                          {result.subtitle && (
                            <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                          )}
                        </div>
                        {result.projectName && (
                          <p className="text-xs text-muted-foreground truncate">
                            {result.projectName}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {TYPE_LABELS[result.type]}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )
                })}
              </div>
            )}

            {/* Quick Actions */}
            <div>
              <p className="text-xs font-medium text-muted-foreground px-3 py-2">
                {query ? 'Actions' : 'Quick Actions'}
              </p>
              {filteredActions.map((action, index) => {
                const Icon = action.icon
                const adjustedIndex = (searchResults?.length || 0) + index
                const isSelected = selectedIndex === adjustedIndex

                return (
                  <button
                    key={action.id}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                      isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                    )}
                    onClick={() => handleSelect(action.link)}
                    onMouseEnter={() => setSelectedIndex(adjustedIndex)}
                  >
                    <div className={cn(
                      'flex items-center justify-center w-9 h-9 rounded-lg',
                      isSelected ? 'bg-primary/20' : 'bg-muted'
                    )}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{action.label}</p>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    </div>
                    {action.shortcut && (
                      <kbd className="hidden sm:flex h-6 items-center gap-1 rounded border bg-muted px-2 font-mono text-xs text-muted-foreground">
                        <Command className="h-3 w-3" />
                        {action.shortcut}
                      </kbd>
                    )}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                )
              })}
            </div>

            {/* No results */}
            {query && query.length >= 2 && !searching && searchResults?.length === 0 && filteredActions.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No results found for "{query}"</p>
                <p className="text-xs mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1.5 py-0.5">↑</kbd>
              <kbd className="rounded border bg-muted px-1.5 py-0.5">↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1.5 py-0.5">↵</kbd>
              to select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1.5 py-0.5">esc</kbd>
              to close
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Hook to manage command palette state
 */
export function useCommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return { open, setOpen }
}

export default CommandPalette
