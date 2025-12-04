// File: /src/features/checklists/pages/TemplatePreviewPage.tsx
// Read-only preview page for checklist templates before starting execution
// Enhancement: #2 - Template Preview

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeft,
  Play,
  Clock,
  FileText,
  CheckSquare,
  Image,
  Type,
  Hash,
  PenTool,
  Star,
} from 'lucide-react'
import { useTemplateWithItems } from '../hooks/useTemplates'
import { StartExecutionDialog } from '../components/StartExecutionDialog'
import type { ChecklistTemplateItem } from '@/types/checklists'

export function TemplatePreviewPage() {
  const { templateId } = useParams<{ templateId: string }>()
  const navigate = useNavigate()
  const [showStartDialog, setShowStartDialog] = useState(false)

  // Data hooks
  const { data: template, isLoading } = useTemplateWithItems(templateId!)

  const getItemIcon = (itemType: string) => {
    switch (itemType) {
      case 'checkbox':
        return <CheckSquare className="w-4 h-4 text-blue-600" />
      case 'text':
        return <Type className="w-4 h-4 text-purple-600" />
      case 'number':
        return <Hash className="w-4 h-4 text-green-600" />
      case 'photo':
        return <Image className="w-4 h-4 text-orange-600" />
      case 'signature':
        return <PenTool className="w-4 h-4 text-red-600" />
      default:
        return <FileText className="w-4 h-4 text-gray-600" />
    }
  }

  const groupItemsBySection = (items: ChecklistTemplateItem[]) => {
    const sectionMap = new Map<string, ChecklistTemplateItem[]>()

    items.forEach((item) => {
      const section = item.section || 'General'
      if (!sectionMap.has(section)) {
        sectionMap.set(section, [])
      }
      sectionMap.get(section)!.push(item)
    })

    return Array.from(sectionMap.entries()).map(([name, items]) => ({
      name,
      items: items.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    }))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4" />
          <p className="text-gray-600">Loading template...</p>
        </div>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Template not found</h2>
          <Button variant="outline" onClick={() => navigate('/checklists/templates')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Templates
          </Button>
        </div>
      </div>
    )
  }

  const sections = groupItemsBySection(template.template_items || [])
  const totalItems = template.template_items?.length || 0
  const requiredItems = template.template_items?.filter((item) => item.is_required).length || 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/checklists/templates')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Templates
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{template.name}</h1>
              {template.description && (
                <p className="text-gray-600 mb-3">{template.description}</p>
              )}
              <div className="flex items-center gap-3 flex-wrap">
                {template.category && <Badge variant="outline">{template.category}</Badge>}
                {template.is_system_template && (
                  <Badge className="bg-blue-100 text-blue-800">System Template</Badge>
                )}
                {template.tags &&
                  template.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
              </div>
            </div>

            <Button onClick={() => setShowStartDialog(true)} size="lg">
              <Play className="w-4 h-4 mr-2" />
              Start Checklist
            </Button>
          </div>
        </div>

        {/* Template Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Template Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{totalItems}</div>
                <div className="text-sm text-gray-600">Total Items</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{requiredItems}</div>
                <div className="text-sm text-gray-600">Required</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{sections.length}</div>
                <div className="text-sm text-gray-600">Sections</div>
              </div>
              {template.estimated_duration_minutes && (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="w-5 h-5 text-gray-600" />
                    <span className="text-3xl font-bold text-gray-600">
                      {template.estimated_duration_minutes}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">Minutes</div>
                </div>
              )}
            </div>

            {template.instructions && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Instructions
                </h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{template.instructions}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Checklist Items Preview */}
        <div className="space-y-6">
          {sections.map((section) => (
            <Card key={section.name}>
              <CardHeader>
                <CardTitle>{section.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {section.items.map((item, index) => (
                  <div
                    key={item.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">{getItemIcon(item.item_type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900">{item.label}</h3>
                          <Badge variant="outline" className="text-xs">
                            {item.item_type}
                          </Badge>
                          {item.is_required && (
                            <Badge variant="outline" className="text-xs text-red-600">
                              <Star className="w-3 h-3 mr-1" />
                              Required
                            </Badge>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                        )}

                        {/* Item-specific details */}
                        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                          {item.item_type === 'photo' && (
                            <>
                              {item.min_photos && <span>Min photos: {item.min_photos}</span>}
                              {item.max_photos && <span>Max photos: {item.max_photos}</span>}
                            </>
                          )}
                          {item.pass_fail_na_scoring && (
                            <span className="flex items-center gap-1">
                              <CheckSquare className="w-3 h-3" />
                              Pass/Fail/NA scoring
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-sm text-gray-400">#{index + 1}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty state */}
        {totalItems === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No items yet</h3>
              <p className="text-gray-600 mb-4">
                This template doesn't have any items configured yet.
              </p>
              <Button
                variant="outline"
                onClick={() => navigate(`/checklists/templates/${templateId}/items`)}
              >
                Add Items
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Start Execution Dialog */}
      {showStartDialog && template && (
        <StartExecutionDialog
          templateId={template.id}
          projectId="" // User will select project in dialog
          open={showStartDialog}
          onOpenChange={setShowStartDialog}
        />
      )}
    </div>
  )
}

export default TemplatePreviewPage
