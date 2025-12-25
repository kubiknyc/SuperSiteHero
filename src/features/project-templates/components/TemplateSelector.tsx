/**
 * Template Selector Component
 *
 * A dropdown/dialog for selecting a project template during project creation.
 * Shows recent templates, popular templates, and allows browsing all templates.
 */

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import {
  Building2,
  Home,
  Factory,
  Hammer,
  Route,
  School,
  Settings,
  Check,
  ChevronsUpDown,
  LayoutTemplate,
  Clock,
  TrendingUp,
  Sparkles,
  X,
  Search,
} from 'lucide-react'
import {
  useProjectTemplates,
  useRecentProjectTemplates,
  usePopularProjectTemplates,
} from '../hooks/useProjectTemplates'
import type { ProjectTemplate, TemplateCategory } from '@/types/project-template'
import { cn } from '@/lib/utils'

// Category icon mapping
const CATEGORY_ICONS: Record<TemplateCategory, React.ComponentType<{ className?: string }>> = {
  commercial: Building2,
  residential: Home,
  industrial: Factory,
  renovation: Hammer,
  civil: Route,
  institutional: School,
  custom: Settings,
}

interface TemplateSelectorProps {
  companyId: string | undefined
  value?: string | null
  onSelect: (template: ProjectTemplate | null) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

/**
 * Compact dropdown selector for templates
 */
export function TemplateSelector({
  companyId,
  value,
  onSelect,
  disabled,
  placeholder = 'Select a template (optional)',
  className,
}: TemplateSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  const { data: templates } = useProjectTemplates(companyId)
  const { data: recentTemplates } = useRecentProjectTemplates(companyId, 3)

  const selectedTemplate = templates?.find((t) => t.id === value)

  // Filter templates by search
  const filteredTemplates = React.useMemo(() => {
    if (!templates) {return []}
    if (!search.trim()) {return templates.slice(0, 8)}

    const query = search.toLowerCase()
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
    )
  }, [templates, search])

  const handleSelect = (template: ProjectTemplate) => {
    onSelect(template)
    setOpen(false)
    setDialogOpen(false)
    setSearch('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect(null)
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn('w-full justify-between', className)}
          >
            {selectedTemplate ? (
              <div className="flex items-center gap-2">
                {selectedTemplate.category && (
                  <CategoryIcon category={selectedTemplate.category} className="h-4 w-4" />
                )}
                <span className="truncate">{selectedTemplate.name}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <div className="flex items-center gap-1">
              {selectedTemplate && (
                <X
                  className="h-4 w-4 text-muted-foreground hover:text-foreground"
                  onClick={handleClear}
                />
              )}
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8"
              />
            </div>
          </div>

          <ScrollArea className="h-[300px]">
            <div className="p-2">
              {/* Recent Templates */}
              {!search && recentTemplates && recentTemplates.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-muted-foreground px-2 mb-1">
                    Recently Used
                  </p>
                  {recentTemplates.map((template) => (
                    <TemplateItem
                      key={template.id}
                      template={template}
                      isSelected={value === template.id}
                      onSelect={() => handleSelect(template)}
                    />
                  ))}
                </div>
              )}

              {/* All/Filtered Templates */}
              <div>
                <p className="text-xs font-medium text-muted-foreground px-2 mb-1">
                  {search ? 'Search Results' : 'All Templates'}
                </p>
                {filteredTemplates.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-2 py-4 text-center">
                    No templates found
                  </p>
                ) : (
                  filteredTemplates.map((template) => (
                    <TemplateItem
                      key={template.id}
                      template={template}
                      isSelected={value === template.id}
                      onSelect={() => handleSelect(template)}
                    />
                  ))
                )}
              </div>

              {/* Browse All Link */}
              {templates && templates.length > 8 && !search && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 text-primary"
                  onClick={() => {
                    setOpen(false)
                    setDialogOpen(true)
                  }}
                >
                  <LayoutTemplate className="h-4 w-4 mr-2" />
                  Browse all {templates.length} templates...
                </Button>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Full Template Browser Dialog */}
      <TemplateBrowserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        companyId={companyId}
        selectedId={value}
        onSelect={handleSelect}
      />
    </>
  )
}

/**
 * Template item in dropdown list
 */
function TemplateItem({
  template,
  isSelected,
  onSelect,
}: {
  template: ProjectTemplate
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted text-left',
        isSelected && 'bg-muted'
      )}
    >
      {template.category && (
        <CategoryIcon category={template.category} className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <span className="truncate flex-1">{template.name}</span>
      {template.usage_count > 0 && (
        <Badge variant="secondary" className="text-xs shrink-0">
          {template.usage_count}x
        </Badge>
      )}
      {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
    </button>
  )
}

/**
 * Category icon component
 */
function CategoryIcon({
  category,
  className,
}: {
  category: TemplateCategory
  className?: string
}) {
  const Icon = CATEGORY_ICONS[category] || Settings
  return <Icon className={className} />
}

/**
 * Full template browser dialog for viewing all templates
 */
interface TemplateBrowserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string | undefined
  selectedId?: string | null
  onSelect: (template: ProjectTemplate) => void
}

function TemplateBrowserDialog({
  open,
  onOpenChange,
  companyId,
  selectedId,
  onSelect,
}: TemplateBrowserDialogProps) {
  const [search, setSearch] = React.useState('')
  const [selectedCategory, setSelectedCategory] = React.useState<TemplateCategory | 'all'>('all')

  const { data: templates } = useProjectTemplates(companyId)
  const { data: recentTemplates } = useRecentProjectTemplates(companyId, 5)
  const { data: popularTemplates } = usePopularProjectTemplates(companyId, 5)

  // Filter templates
  const filteredTemplates = React.useMemo(() => {
    let result = templates || []

    if (selectedCategory !== 'all') {
      result = result.filter((t) => t.category === selectedCategory)
    }

    if (search.trim()) {
      const query = search.toLowerCase()
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query)
      )
    }

    return result
  }, [templates, selectedCategory, search])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Choose a Project Template</DialogTitle>
          <DialogDescription>
            Start with a template to pre-configure folders, workflows, and settings
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-6 mt-4">
          {/* Sidebar */}
          <div className="w-48 space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Quick Picks</p>
              <Button
                variant={selectedCategory === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                className="w-full justify-start"
                onClick={() => setSelectedCategory('all')}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                All Templates
              </Button>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Categories</p>
              {Object.entries(CATEGORY_ICONS).map(([cat, Icon]) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'secondary' : 'ghost'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setSelectedCategory(cat as TemplateCategory)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[400px]">
              {/* Recent/Popular sections when showing all */}
              {selectedCategory === 'all' && !search && (
                <>
                  {recentTemplates && recentTemplates.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-medium heading-subsection">Recently Used</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {recentTemplates.slice(0, 4).map((template) => (
                          <BrowserTemplateCard
                            key={template.id}
                            template={template}
                            isSelected={selectedId === template.id}
                            onSelect={() => onSelect(template)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {popularTemplates && popularTemplates.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-medium heading-subsection">Most Popular</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {popularTemplates.slice(0, 4).map((template) => (
                          <BrowserTemplateCard
                            key={template.id}
                            template={template}
                            isSelected={selectedId === template.id}
                            onSelect={() => onSelect(template)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* All filtered templates */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium heading-subsection">
                    {selectedCategory === 'all'
                      ? 'All Templates'
                      : `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Templates`}
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {filteredTemplates.length}
                  </Badge>
                </div>

                {filteredTemplates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No templates found
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {filteredTemplates.map((template) => (
                      <BrowserTemplateCard
                        key={template.id}
                        template={template}
                        isSelected={selectedId === template.id}
                        onSelect={() => onSelect(template)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Template card for browser dialog
 */
function BrowserTemplateCard({
  template,
  isSelected,
  onSelect,
}: {
  template: ProjectTemplate
  isSelected: boolean
  onSelect: () => void
}) {
  const category = template.category || 'custom'
  const Icon = CATEGORY_ICONS[category]

  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-md transition-all',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={onSelect}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-muted shrink-0">
            <Icon className="h-4 w-4 text-secondary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm truncate heading-card">{template.name}</h4>
              {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
            </div>
            {template.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {template.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                {category}
              </Badge>
              {template.usage_count > 0 && (
                <span className="text-xs text-muted-foreground">
                  Used {template.usage_count}x
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default TemplateSelector
