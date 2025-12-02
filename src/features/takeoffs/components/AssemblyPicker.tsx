// File: /src/features/takeoffs/components/AssemblyPicker.tsx
// Dialog for selecting and applying assemblies to measurements

import { useState, useMemo } from 'react'
import { Search, Package, ChevronRight, X, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useSystemAssemblies, useCompanyAssemblies } from '../hooks/useAssemblies'
import { useAuth } from '@/lib/auth/AuthContext'
import type { Database } from '@/types/database'

type Assembly = Database['public']['Tables']['assemblies']['Row']

export interface AssemblyPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId?: string
  onSelect: (assembly: Assembly) => void
  onCreateNew?: () => void
}

/**
 * AssemblyPicker Component
 *
 * Allows users to select assemblies to apply to measurements.
 * Features:
 * - Search assemblies by name/category
 * - Filter by category/trade
 * - View assembly details
 * - Create new assembly
 */
export function AssemblyPicker({
  open,
  onOpenChange,
  projectId,
  onSelect,
  onCreateNew,
}: AssemblyPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const { userProfile } = useAuth()

  // Fetch assemblies at different levels
  const { data: systemAssemblies = [] } = useSystemAssemblies()
  const { data: companyAssemblies = [] } = useCompanyAssemblies(userProfile?.company_id || undefined)
  // Note: Project-level assemblies would require a separate API endpoint
  const projectAssemblies: Assembly[] = []

  // Combine all assemblies
  const allAssemblies = useMemo(
    () => [...systemAssemblies, ...companyAssemblies, ...projectAssemblies],
    [systemAssemblies, companyAssemblies, projectAssemblies]
  )

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>()
    allAssemblies.forEach((a) => {
      if (a.category) cats.add(a.category)
    })
    return Array.from(cats).sort()
  }, [allAssemblies])

  // Filter assemblies
  const filteredAssemblies = useMemo(() => {
    let filtered = allAssemblies

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.category?.toLowerCase().includes(query) ||
          a.trade?.toLowerCase().includes(query)
      )
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter((a) => a.category === selectedCategory)
    }

    return filtered
  }, [allAssemblies, searchQuery, selectedCategory])

  // Group by assembly_level
  const groupedAssemblies = useMemo(() => {
    const groups: Record<string, Assembly[]> = {
      project: [],
      company: [],
      system: [],
    }

    filteredAssemblies.forEach((a) => {
      if (a.assembly_level) {
        groups[a.assembly_level].push(a)
      }
    })

    return groups
  }, [filteredAssemblies])

  const handleSelect = (assembly: Assembly) => {
    onSelect(assembly)
    onOpenChange(false)
    setSearchQuery('')
    setSelectedCategory(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Select Assembly
          </DialogTitle>
          <DialogDescription>
            Choose a predefined assembly to apply to measurements
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search assemblies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              <Button
                variant={selectedCategory === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                All
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          )}

          {/* Assembly List */}
          <div className="max-h-[400px] overflow-auto space-y-4">
            {/* Project Assemblies */}
            {groupedAssemblies.project.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground px-2">
                  Project Assemblies
                </div>
                <div className="space-y-1">
                  {groupedAssemblies.project.map((assembly) => (
                    <AssemblyItem
                      key={assembly.id}
                      assembly={assembly}
                      onSelect={() => handleSelect(assembly)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Company Assemblies */}
            {groupedAssemblies.company.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground px-2">
                  Company Assemblies
                </div>
                <div className="space-y-1">
                  {groupedAssemblies.company.map((assembly) => (
                    <AssemblyItem
                      key={assembly.id}
                      assembly={assembly}
                      onSelect={() => handleSelect(assembly)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* System Assemblies */}
            {groupedAssemblies.system.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground px-2">
                  System Assemblies
                </div>
                <div className="space-y-1">
                  {groupedAssemblies.system.map((assembly) => (
                    <AssemblyItem
                      key={assembly.id}
                      assembly={assembly}
                      onSelect={() => handleSelect(assembly)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {filteredAssemblies.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery || selectedCategory ? (
                  <div>
                    <p className="mb-2">No assemblies found</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery('')
                        setSelectedCategory(null)
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p className="mb-2">No assemblies available</p>
                    {onCreateNew && (
                      <Button variant="outline" size="sm" onClick={onCreateNew}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Assembly
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          {onCreateNew && (
            <Button variant="secondary" onClick={onCreateNew}>
              <Plus className="w-4 h-4 mr-2" />
              New Assembly
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Assembly Item Component
interface AssemblyItemProps {
  assembly: Assembly
  onSelect: () => void
}

function AssemblyItem({ assembly, onSelect }: AssemblyItemProps) {
  const itemCount = Array.isArray(assembly.items) ? assembly.items.length : 0

  return (
    <button
      onClick={onSelect}
      className="w-full p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium mb-1">{assembly.name}</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {assembly.category && <Badge variant="outline">{assembly.category}</Badge>}
            {assembly.trade && <Badge variant="outline">{assembly.trade}</Badge>}
            <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
      </div>
    </button>
  )
}
