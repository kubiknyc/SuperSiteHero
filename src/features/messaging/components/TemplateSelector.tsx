/**
 * TemplateSelector Component
 * Dropdown/dialog for browsing and selecting message templates
 */

import { useState, useMemo } from 'react'
import {
  Search,
  FileText,
  Star,
  ChevronDown,
  Sparkles,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useMessageTemplates } from '../hooks/useMessageTemplates'
import type { MessageTemplate, TemplateSubstitution } from '../services/messageTemplates'

// ============================================================================
// Types
// ============================================================================

export interface TemplateSelectorProps {
  /** Callback when template is selected */
  onSelect: (content: string, template: MessageTemplate) => void
  /** Optional category filter */
  category?: string
  /** Trigger button className */
  className?: string
  /** Compact mode (icon only) */
  compact?: boolean
}

// ============================================================================
// Subcomponents
// ============================================================================

/**
 * Template item in list
 */
function TemplateItem({
  template,
  onSelect,
  searchQuery,
}: {
  template: MessageTemplate
  onSelect: () => void
  searchQuery: string
}) {
  // Highlight search terms
  const highlightText = (text: string) => {
    if (!searchQuery) {return text}

    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)

    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left p-3 border-b border-border dark:border-border',
        'hover:bg-surface dark:hover:bg-surface/50 transition-colors',
        'focus:outline-none focus:bg-surface dark:focus:bg-surface/50'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded bg-info-light text-primary-hover dark:bg-blue-900/30 dark:text-blue-400">
          <FileText className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-foreground dark:text-gray-100 truncate heading-card">
              {highlightText(template.name)}
            </h4>
            {template.category && (
              <Badge variant="secondary" className="text-xs">
                {template.category}
              </Badge>
            )}
            {template.is_shared && (
              <Badge variant="outline" className="text-xs">
                Shared
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted dark:text-disabled line-clamp-2">
            {highlightText(template.content)}
          </p>
          {template.variables && template.variables.length > 0 && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              <span className="text-xs text-disabled">Variables:</span>
              {template.variables.slice(0, 3).map(v => (
                <code key={v} className="text-xs bg-muted dark:bg-surface px-1 rounded">
                  {`{${v}}`}
                </code>
              ))}
              {template.variables.length > 3 && (
                <span className="text-xs text-disabled">
                  +{template.variables.length - 3} more
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 mt-1 text-xs text-disabled">
            {template.usage_count > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3" />
                Used {template.usage_count} times
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function TemplateSelector({
  onSelect,
  category: initialCategory,
  className,
  compact = false,
}: TemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    initialCategory || null
  )

  const {
    templates,
    categories,
    isLoading,
    filterByCategory,
  } = useMessageTemplates({
    autoLoad: true,
    category: selectedCategory || undefined,
  })

  // Filter templates by search query
  const filteredTemplates = useMemo(() => {
    if (!searchQuery) {return templates}

    const query = searchQuery.toLowerCase()
    return templates.filter(
      t =>
        t.name.toLowerCase().includes(query) ||
        t.content.toLowerCase().includes(query) ||
        t.category?.toLowerCase().includes(query)
    )
  }, [templates, searchQuery])

  // Handle template selection
  const handleSelectTemplate = (template: MessageTemplate) => {
    // If template has variables, we'll pass it through as-is
    // The parent component can handle variable substitution
    onSelect(template.content, template)
    setIsOpen(false)
    setSearchQuery('')
  }

  // Handle category filter
  const handleCategoryChange = (value: string) => {
    const category = value === 'all' ? null : value
    setSelectedCategory(category)
    filterByCategory(category)
  }

  return (
    <>
      {/* Trigger Button */}
      <Button
        type="button"
        variant="outline"
        size={compact ? 'icon' : 'sm'}
        onClick={() => setIsOpen(true)}
        className={cn('gap-2', className)}
        title="Insert template"
      >
        <Sparkles className="w-4 h-4" />
        {!compact && <span>Templates</span>}
      </Button>

      {/* Template Browser Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Message Templates</DialogTitle>
            <DialogDescription>
              Select a template to insert into your message. Templates with variables will
              need to be filled in.
            </DialogDescription>
          </DialogHeader>

          {/* Search and Filter */}
          <div className="px-6 pb-4 space-y-3 border-b border-border dark:border-border">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-disabled" />
              <Input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-disabled hover:text-secondary"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
              <Select
                value={selectedCategory || 'all'}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Templates List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading && (
              <div className="p-8 text-center text-muted">
                Loading templates...
              </div>
            )}

            {!isLoading && filteredTemplates.length === 0 && (
              <div className="p-8 text-center">
                <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-secondary mb-3" />
                <p className="text-muted dark:text-disabled mb-1">
                  {searchQuery ? 'No templates match your search' : 'No templates yet'}
                </p>
                <p className="text-sm text-disabled dark:text-muted">
                  {searchQuery
                    ? 'Try a different search term'
                    : 'Create templates to reuse common messages'}
                </p>
              </div>
            )}

            {!isLoading && filteredTemplates.length > 0 && (
              <div>
                {filteredTemplates.map(template => (
                  <TemplateItem
                    key={template.id}
                    template={template}
                    onSelect={() => handleSelectTemplate(template)}
                    searchQuery={searchQuery}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-border dark:border-border bg-surface dark:bg-background/50">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>
                {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
                {selectedCategory && ` in ${selectedCategory}`}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
