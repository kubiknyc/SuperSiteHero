/**
 * RFI Template Selector Component
 *
 * Allows users to browse and select from pre-defined RFI templates
 * to speed up RFI creation and ensure consistency.
 */

import { useState, useMemo } from 'react'
import {
  FileText,
  Search,
  Layers,
  Zap,
  CheckCircle2,
  Building,
  AlertTriangle,
  Clock,
  DollarSign,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  RFI_TEMPLATES,
  RFI_TEMPLATE_CATEGORIES,
  searchTemplates,
  getTemplatesByCategory,
  getAllCategories,
  type RFITemplate,
  type RFITemplateCategory,
} from '../utils/rfiTemplates'

// ============================================================================
// Types
// ============================================================================

interface RFITemplateSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectTemplate: (template: RFITemplate) => void
}

interface TemplateCardProps {
  template: RFITemplate
  onSelect: () => void
}

// ============================================================================
// Helper Functions
// ============================================================================

function getCategoryIcon(category: RFITemplateCategory) {
  switch (category) {
    case 'design_clarification':
      return FileText
    case 'conflict_coordination':
      return Layers
    case 'material_substitution':
      return Building
    case 'field_condition':
      return AlertTriangle
    case 'code_compliance':
      return CheckCircle2
    case 'shop_drawing':
      return FileText
    case 'specification':
      return FileText
    case 'owner_decision':
      return Zap
    default:
      return FileText
  }
}

function getPriorityBadge(priority: 'low' | 'normal' | 'high') {
  switch (priority) {
    case 'high':
      return { className: 'bg-red-100 text-red-700', label: 'High' }
    case 'normal':
      return { className: 'bg-blue-100 text-blue-700', label: 'Normal' }
    case 'low':
      return { className: 'bg-gray-100 text-gray-700', label: 'Low' }
  }
}

// ============================================================================
// Sub-Components
// ============================================================================

function TemplateCard({ template, onSelect }: TemplateCardProps) {
  const CategoryIcon = getCategoryIcon(template.category)
  const priorityBadge = getPriorityBadge(template.priority)
  const categoryInfo = RFI_TEMPLATE_CATEGORIES[template.category]

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left p-4 rounded-lg border transition-all',
        'hover:border-primary hover:bg-primary/5',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-muted rounded-lg">
          <CategoryIcon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="font-medium text-foreground truncate">{template.name}</h4>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {template.description}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {template.discipline}
            </Badge>
            <Badge variant="outline" className={cn('text-xs', priorityBadge.className)}>
              {priorityBadge.label}
            </Badge>
            {template.hasCostImpact && (
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">
                <DollarSign className="h-3 w-3 mr-1" />
                Cost
              </Badge>
            )}
            {template.hasScheduleImpact && (
              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700">
                <Clock className="h-3 w-3 mr-1" />
                Schedule
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

function CategoryTab({
  category,
  onSelectTemplate
}: {
  category: RFITemplateCategory
  onSelectTemplate: (template: RFITemplate) => void
}) {
  const templates = getTemplatesByCategory(category)
  const categoryInfo = RFI_TEMPLATE_CATEGORIES[category]
  const CategoryIcon = getCategoryIcon(category)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b">
        <CategoryIcon className="h-5 w-5 text-primary" />
        <div>
          <h3 className="font-medium">{categoryInfo.label}</h3>
          <p className="text-sm text-muted-foreground">{categoryInfo.description}</p>
        </div>
      </div>
      <div className="space-y-2">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onSelect={() => onSelectTemplate(template)}
          />
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function RFITemplateSelector({
  open,
  onOpenChange,
  onSelectTemplate,
}: RFITemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Filter templates based on search
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) {return RFI_TEMPLATES}
    return searchTemplates(searchQuery)
  }, [searchQuery])

  const handleSelectTemplate = (template: RFITemplate) => {
    onSelectTemplate(template)
    onOpenChange(false)
    setSearchQuery('')
    setSelectedCategory('all')
  }

  const categories = getAllCategories()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            RFI Templates
          </DialogTitle>
          <DialogDescription>
            Select a template to pre-fill your RFI with standard language and prompts
          </DialogDescription>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Template Browser */}
        {searchQuery.trim() ? (
          // Search Results
          <ScrollArea className="h-[400px] pr-4">
            {filteredTemplates.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-4">
                  {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} found
                </p>
                {filteredTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onSelect={() => handleSelectTemplate(template)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No templates match your search</p>
                <p className="text-sm text-muted-foreground mt-1">Try different keywords</p>
              </div>
            )}
          </ScrollArea>
        ) : (
          // Category Tabs
          <Tabs defaultValue="all" value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="all" className="text-xs">
                All Templates
              </TabsTrigger>
              {categories.slice(0, 4).map((category) => (
                <TabsTrigger key={category} value={category} className="text-xs">
                  {RFI_TEMPLATE_CATEGORIES[category].label}
                </TabsTrigger>
              ))}
              <TabsTrigger value="more" className="text-xs">
                More...
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[350px] mt-4 pr-4">
              <TabsContent value="all" className="mt-0">
                <div className="space-y-2">
                  {RFI_TEMPLATES.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onSelect={() => handleSelectTemplate(template)}
                    />
                  ))}
                </div>
              </TabsContent>

              {categories.map((category) => (
                <TabsContent key={category} value={category} className="mt-0">
                  <CategoryTab
                    category={category}
                    onSelectTemplate={handleSelectTemplate}
                  />
                </TabsContent>
              ))}

              <TabsContent value="more" className="mt-0">
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {categories.slice(4).map((category) => {
                    const CategoryIcon = getCategoryIcon(category)
                    const info = RFI_TEMPLATE_CATEGORIES[category]
                    const count = getTemplatesByCategory(category).length
                    return (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={cn(
                          'p-3 rounded-lg border text-left transition-colors',
                          'hover:border-primary hover:bg-primary/5'
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{info.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{count} templates</p>
                      </button>
                    )
                  })}
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            {RFI_TEMPLATES.length} templates available
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Start from Scratch
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default RFITemplateSelector
