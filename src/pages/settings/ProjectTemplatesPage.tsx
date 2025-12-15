/**
 * Project Templates Settings Page
 *
 * Manage project templates for standardized project creation
 */

import * as React from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Plus,
  Loader2,
  AlertCircle,
  LayoutTemplate,
  TrendingUp,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  TemplateList,
  ProjectTemplateFormDialog,
} from '@/features/project-templates/components'
import {
  useProjectTemplates,
  useRecentProjectTemplates,
  usePopularProjectTemplates,
  useCreateProjectTemplate,
  useUpdateProjectTemplate,
  useDeleteProjectTemplate,
  useDuplicateProjectTemplate,
} from '@/features/project-templates/hooks'
import { useAuth } from '@/hooks/useAuth'
import type {
  ProjectTemplate,
  TemplateCategory,
  CreateProjectTemplateInput,
  UpdateProjectTemplateInput,
} from '@/types/project-template'

export function ProjectTemplatesPage() {
  const { userProfile, user } = useAuth()
  const companyId = userProfile?.company_id

  // State
  const [selectedCategory, setSelectedCategory] = React.useState<TemplateCategory | 'all'>('all')
  const [formDialogOpen, setFormDialogOpen] = React.useState(false)
  const [editingTemplate, setEditingTemplate] = React.useState<ProjectTemplate | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)
  const [templateToDelete, setTemplateToDelete] = React.useState<ProjectTemplate | null>(null)

  // Queries
  const { data: templates, isLoading, error } = useProjectTemplates(companyId ?? undefined)
  const { data: recentTemplates } = useRecentProjectTemplates(companyId ?? undefined, 5)
  const { data: popularTemplates } = usePopularProjectTemplates(companyId ?? undefined, 5)

  // Mutations
  const createMutation = useCreateProjectTemplate()
  const updateMutation = useUpdateProjectTemplate()
  const deleteMutation = useDeleteProjectTemplate()
  const duplicateMutation = useDuplicateProjectTemplate()

  // Handlers
  const handleCreate = () => {
    setEditingTemplate(null)
    setFormDialogOpen(true)
  }

  const handleEdit = (template: ProjectTemplate) => {
    setEditingTemplate(template)
    setFormDialogOpen(true)
  }

  const handleDuplicate = async (template: ProjectTemplate) => {
    const newName = prompt('Enter a name for the duplicated template:', `${template.name} (Copy)`)
    if (!newName?.trim()) {return}

    try {
      await duplicateMutation.mutateAsync({
        templateId: template.id,
        newName: newName.trim(),
        userId: user?.id || '',
      })
      toast.success('Template duplicated successfully')
    } catch (error) {
      toast.error('Failed to duplicate template')
      console.error('Failed to duplicate template:', error)
    }
  }

  const handleDeleteClick = (template: ProjectTemplate) => {
    setTemplateToDelete(template)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) {return}

    try {
      await deleteMutation.mutateAsync(templateToDelete.id)
      toast.success('Template deleted successfully')
      setDeleteConfirmOpen(false)
      setTemplateToDelete(null)
    } catch (error) {
      toast.error('Failed to delete template')
      console.error('Failed to delete template:', error)
    }
  }

  const handleSave = async (input: CreateProjectTemplateInput | UpdateProjectTemplateInput) => {
    try {
      if (editingTemplate) {
        await updateMutation.mutateAsync({
          templateId: editingTemplate.id,
          input: input as UpdateProjectTemplateInput,
        })
        toast.success('Template updated successfully')
      } else {
        await createMutation.mutateAsync({
          input: input as CreateProjectTemplateInput,
          userId: user?.id || '',
        })
        toast.success('Template created successfully')
      }
      setFormDialogOpen(false)
      setEditingTemplate(null)
    } catch (error) {
      toast.error(editingTemplate ? 'Failed to update template' : 'Failed to create template')
      console.error('Failed to save template:', error)
    }
  }

  // Loading state
  if (!companyId) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Please log in to manage project templates.</p>
        </div>
      </AppLayout>
    )
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <p className="text-muted-foreground">Failed to load project templates</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </AppLayout>
    )
  }

  const activeTemplateCount = templates?.filter((t) => t.is_active).length || 0

  return (
    <AppLayout>
      <div className="container max-w-6xl py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Project Templates</h1>
            <p className="text-muted-foreground">
              Create and manage reusable templates for new projects
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-sm">
              {activeTemplateCount} active template{activeTemplateCount !== 1 ? 's' : ''}
            </Badge>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <LayoutTemplate className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{templates?.length || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <CardTitle className="text-sm font-medium">Most Used</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium truncate">
                {popularTemplates?.[0]?.name || 'No templates yet'}
              </p>
              {popularTemplates?.[0] && (
                <p className="text-sm text-muted-foreground">
                  Used {popularTemplates[0].usage_count} times
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-600" />
                <CardTitle className="text-sm font-medium">Recently Used</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium truncate">
                {recentTemplates?.[0]?.name || 'No recent activity'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Template Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Templates</TabsTrigger>
            <TabsTrigger value="recent">Recently Used</TabsTrigger>
            <TabsTrigger value="popular">Most Popular</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <TemplateList
              templates={templates || []}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onDelete={handleDeleteClick}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              emptyMessage="No templates created yet. Create your first template to get started."
            />
          </TabsContent>

          <TabsContent value="recent">
            {recentTemplates && recentTemplates.length > 0 ? (
              <TemplateList
                templates={recentTemplates}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDeleteClick}
                emptyMessage="No recently used templates"
              />
            ) : (
              <div className="text-center py-12 border rounded-lg bg-gray-50">
                <Clock className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500">No templates have been used recently</p>
                <p className="text-sm text-gray-400 mt-1">
                  Templates will appear here after you use them to create projects
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="popular">
            {popularTemplates && popularTemplates.length > 0 ? (
              <TemplateList
                templates={popularTemplates}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDeleteClick}
                emptyMessage="No popular templates yet"
              />
            ) : (
              <div className="text-center py-12 border rounded-lg bg-gray-50">
                <TrendingUp className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500">No templates have been used yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Popular templates will be ranked by usage count
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Form Dialog */}
        <ProjectTemplateFormDialog
          open={formDialogOpen}
          onOpenChange={setFormDialogOpen}
          template={editingTemplate}
          onSave={handleSave}
          isLoading={createMutation.isPending || updateMutation.isPending}
          companyId={companyId}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Template</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{templateToDelete?.name}"? This action
                cannot be undone. Projects created from this template will not be
                affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  )
}

export default ProjectTemplatesPage
