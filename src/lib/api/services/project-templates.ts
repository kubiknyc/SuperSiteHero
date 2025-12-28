/**
 * Project Templates API Service
 *
 * Manages project template CRUD operations and template application
 */

import { supabase } from '@/lib/supabase'
import { ApiErrorClass } from '../errors'
import type {
  ProjectTemplate,
  ProjectTemplateWithDetails,
  ProjectTemplatePhase,
  ProjectTemplateChecklist,
  ProjectTemplateWorkflow,
  ProjectTemplateDistributionList,
  CreateProjectTemplateInput,
  UpdateProjectTemplateInput,
  CreateTemplateFromProjectInput,
  ProjectTemplateFilters,
  ApplyTemplateResult,
  TemplateFolderStructure,
} from '@/types/project-template'
import { logger } from '../../utils/logger';


const db = supabase as any

export const projectTemplatesApi = {
  // ============================================================================
  // Read Operations
  // ============================================================================

  /**
   * Fetch all templates for a company with optional filters
   */
  async getTemplates(
    companyId: string,
    filters?: ProjectTemplateFilters
  ): Promise<ProjectTemplate[]> {
    try {
      if (!companyId) {
        throw new ApiErrorClass({
          code: 'COMPANY_ID_REQUIRED',
          message: 'Company ID is required',
        })
      }

      let query = db
        .from('project_templates')
        .select('*')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('usage_count', { ascending: false })

      if (filters?.category) {
        query = query.eq('category', filters.category)
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active)
      }

      if (filters?.visibility) {
        query = query.eq('visibility', filters.visibility)
      }

      if (filters?.created_by) {
        query = query.eq('created_by', filters.created_by)
      }

      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        )
      }

      if (filters?.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags)
      }

      const { data, error } = await query

      if (error) {throw error}

      return (data || []) as ProjectTemplate[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_TEMPLATES_ERROR',
            message: 'Failed to fetch project templates',
            details: error,
          })
    }
  },

  /**
   * Fetch a single template with all related data
   */
  async getTemplate(templateId: string): Promise<ProjectTemplateWithDetails> {
    try {
      if (!templateId) {
        throw new ApiErrorClass({
          code: 'TEMPLATE_ID_REQUIRED',
          message: 'Template ID is required',
        })
      }

      // Fetch main template
      const { data: template, error: templateError } = await db
        .from('project_templates')
        .select(
          `
          *,
          created_by_user:users!created_by(
            id,
            first_name,
            last_name,
            email
          )
        `
        )
        .eq('id', templateId)
        .single()

      if (templateError) {throw templateError}
      if (!template) {
        throw new ApiErrorClass({
          code: 'TEMPLATE_NOT_FOUND',
          message: 'Project template not found',
        })
      }

      // Fetch phases
      const { data: phases, error: phasesError } = await db
        .from('project_template_phases')
        .select('*')
        .eq('template_id', templateId)
        .order('phase_order')

      if (phasesError) {throw phasesError}

      // Fetch checklist associations
      const { data: checklists, error: checklistsError } = await db
        .from('project_template_checklists')
        .select(
          `
          *,
          checklist_template:checklist_templates(id, name, category)
        `
        )
        .eq('template_id', templateId)

      if (checklistsError) {throw checklistsError}

      // Fetch workflow associations
      const { data: workflows, error: workflowsError } = await db
        .from('project_template_workflows')
        .select(
          `
          *,
          workflow:approval_workflows(id, name, workflow_type)
        `
        )
        .eq('template_id', templateId)

      if (workflowsError) {throw workflowsError}

      // Fetch distribution lists
      const { data: distributionLists, error: listsError } = await db
        .from('project_template_distribution_lists')
        .select('*')
        .eq('template_id', templateId)

      if (listsError) {throw listsError}

      return {
        ...template,
        phases: phases || [],
        checklists: checklists || [],
        workflows: workflows || [],
        distribution_lists: distributionLists || [],
      } as ProjectTemplateWithDetails
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_TEMPLATE_ERROR',
            message: 'Failed to fetch project template',
            details: error,
          })
    }
  },

  /**
   * Fetch recently used templates
   */
  async getRecentTemplates(
    companyId: string,
    limit: number = 5
  ): Promise<ProjectTemplate[]> {
    try {
      const { data, error } = await db
        .from('project_templates')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .not('last_used_at', 'is', null)
        .order('last_used_at', { ascending: false })
        .limit(limit)

      if (error) {throw error}

      return (data || []) as ProjectTemplate[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_RECENT_TEMPLATES_ERROR',
            message: 'Failed to fetch recent templates',
            details: error,
          })
    }
  },

  /**
   * Fetch most popular templates by usage count
   */
  async getPopularTemplates(
    companyId: string,
    limit: number = 5
  ): Promise<ProjectTemplate[]> {
    try {
      const { data, error } = await db
        .from('project_templates')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('usage_count', { ascending: false })
        .limit(limit)

      if (error) {throw error}

      return (data || []) as ProjectTemplate[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_POPULAR_TEMPLATES_ERROR',
            message: 'Failed to fetch popular templates',
            details: error,
          })
    }
  },

  // ============================================================================
  // Create Operations
  // ============================================================================

  /**
   * Create a new project template
   */
  async createTemplate(
    input: CreateProjectTemplateInput,
    userId: string
  ): Promise<ProjectTemplate> {
    try {
      // Validate input
      if (!input.company_id) {
        throw new ApiErrorClass({
          code: 'COMPANY_ID_REQUIRED',
          message: 'Company ID is required',
        })
      }

      if (!input.name?.trim()) {
        throw new ApiErrorClass({
          code: 'NAME_REQUIRED',
          message: 'Template name is required',
        })
      }

      // Create template
      const { data: template, error: templateError } = await db
        .from('project_templates')
        .insert({
          company_id: input.company_id,
          name: input.name.trim(),
          description: input.description || null,
          category: input.category || null,
          tags: input.tags || null,
          visibility: input.visibility || 'company',
          icon: input.icon || null,
          color: input.color || null,
          default_settings: input.default_settings || {},
          folder_structure: input.folder_structure || [],
          default_roles: input.default_roles || [],
          numbering_config: input.numbering_config || {},
          notification_rules: input.notification_rules || [],
          enabled_features: input.enabled_features || {},
          custom_fields: input.custom_fields || [],
          created_by: userId,
        })
        .select()
        .single()

      if (templateError) {throw templateError}

      // Create phases if provided
      if (input.phases && input.phases.length > 0) {
        const phasesToInsert = input.phases.map((phase, index) => ({
          template_id: template.id,
          name: phase.name,
          description: phase.description || null,
          phase_order: index + 1,
          estimated_duration_days: phase.estimated_duration_days || null,
        }))

        const { error: phasesError } = await db
          .from('project_template_phases')
          .insert(phasesToInsert)

        if (phasesError) {
          // Rollback: delete the template
          await db.from('project_templates').delete().eq('id', template.id)
          throw phasesError
        }
      }

      // Associate checklists if provided
      if (input.checklist_template_ids && input.checklist_template_ids.length > 0) {
        const checklistsToInsert = input.checklist_template_ids.map((id) => ({
          template_id: template.id,
          checklist_template_id: id,
          is_required: true,
          auto_create: true,
          trigger_phase: 'project_start',
        }))

        const { error: checklistsError } = await db
          .from('project_template_checklists')
          .insert(checklistsToInsert)

        if (checklistsError) {throw checklistsError}
      }

      // Associate workflows if provided
      if (input.workflow_associations && input.workflow_associations.length > 0) {
        const workflowsToInsert = input.workflow_associations.map((w) => ({
          template_id: template.id,
          workflow_id: w.workflow_id,
          workflow_type: w.workflow_type,
          is_default: true,
        }))

        const { error: workflowsError } = await db
          .from('project_template_workflows')
          .insert(workflowsToInsert)

        if (workflowsError) {throw workflowsError}
      }

      return template as ProjectTemplate
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_TEMPLATE_ERROR',
            message: 'Failed to create project template',
            details: error,
          })
    }
  },

  /**
   * Create a template from an existing project
   */
  async createTemplateFromProject(
    input: CreateTemplateFromProjectInput,
    userId: string
  ): Promise<ProjectTemplate> {
    try {
      if (!input.project_id) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      if (!input.name?.trim()) {
        throw new ApiErrorClass({
          code: 'NAME_REQUIRED',
          message: 'Template name is required',
        })
      }

      // Fetch project details
      const { data: project, error: projectError } = await db
        .from('projects')
        .select('*')
        .eq('id', input.project_id)
        .single()

      if (projectError) {throw projectError}
      if (!project) {
        throw new ApiErrorClass({
          code: 'PROJECT_NOT_FOUND',
          message: 'Project not found',
        })
      }

      // Build template configuration
      const templateConfig: CreateProjectTemplateInput = {
        company_id: project.company_id,
        name: input.name.trim(),
        description: input.description || null,
        category: input.category || null,
        visibility: input.visibility || 'company',
      }

      // Include settings if requested
      if (input.include_settings !== false) {
        templateConfig.default_settings = {
          weather_units: project.weather_units,
        }
        templateConfig.enabled_features = project.features_enabled || {}
      }

      // Include folder structure if requested
      if (input.include_folder_structure !== false) {
        const { data: folders } = await db
          .from('folders')
          .select('*')
          .eq('project_id', input.project_id)
          .is('deleted_at', null)
          .order('sort_order')

        if (folders && folders.length > 0) {
          templateConfig.folder_structure = transformFoldersToStructure(folders)
        }
      }

      return this.createTemplate(templateConfig, userId)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_TEMPLATE_FROM_PROJECT_ERROR',
            message: 'Failed to create template from project',
            details: error,
          })
    }
  },

  /**
   * Duplicate an existing template
   */
  async duplicateTemplate(
    templateId: string,
    newName: string,
    userId: string
  ): Promise<ProjectTemplate> {
    try {
      if (!templateId) {
        throw new ApiErrorClass({
          code: 'TEMPLATE_ID_REQUIRED',
          message: 'Template ID is required',
        })
      }

      if (!newName?.trim()) {
        throw new ApiErrorClass({
          code: 'NAME_REQUIRED',
          message: 'New template name is required',
        })
      }

      const template = await this.getTemplate(templateId)

      return this.createTemplate(
        {
          company_id: template.company_id,
          name: newName.trim(),
          description: template.description,
          category: template.category,
          tags: template.tags,
          visibility: template.visibility,
          icon: template.icon,
          color: template.color,
          default_settings: template.default_settings,
          folder_structure: template.folder_structure,
          default_roles: template.default_roles,
          numbering_config: template.numbering_config,
          notification_rules: template.notification_rules,
          enabled_features: template.enabled_features,
          custom_fields: template.custom_fields,
          phases: template.phases?.map((p) => ({
            name: p.name,
            description: p.description,
            estimated_duration_days: p.estimated_duration_days,
          })),
        },
        userId
      )
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DUPLICATE_TEMPLATE_ERROR',
            message: 'Failed to duplicate template',
            details: error,
          })
    }
  },

  // ============================================================================
  // Update Operations
  // ============================================================================

  /**
   * Update an existing template
   */
  async updateTemplate(
    templateId: string,
    input: UpdateProjectTemplateInput
  ): Promise<ProjectTemplate> {
    try {
      if (!templateId) {
        throw new ApiErrorClass({
          code: 'TEMPLATE_ID_REQUIRED',
          message: 'Template ID is required',
        })
      }

      // Build update object
      const updates: Record<string, unknown> = {}
      if (input.name !== undefined) {updates.name = input.name.trim()}
      if (input.description !== undefined) {updates.description = input.description}
      if (input.category !== undefined) {updates.category = input.category}
      if (input.tags !== undefined) {updates.tags = input.tags}
      if (input.visibility !== undefined) {updates.visibility = input.visibility}
      if (input.icon !== undefined) {updates.icon = input.icon}
      if (input.color !== undefined) {updates.color = input.color}
      if (input.is_active !== undefined) {updates.is_active = input.is_active}
      if (input.default_settings !== undefined)
        {updates.default_settings = input.default_settings}
      if (input.folder_structure !== undefined)
        {updates.folder_structure = input.folder_structure}
      if (input.default_roles !== undefined)
        {updates.default_roles = input.default_roles}
      if (input.numbering_config !== undefined)
        {updates.numbering_config = input.numbering_config}
      if (input.notification_rules !== undefined)
        {updates.notification_rules = input.notification_rules}
      if (input.enabled_features !== undefined)
        {updates.enabled_features = input.enabled_features}
      if (input.custom_fields !== undefined)
        {updates.custom_fields = input.custom_fields}

      if (Object.keys(updates).length === 0) {
        throw new ApiErrorClass({
          code: 'NO_UPDATES',
          message: 'No updates provided',
        })
      }

      const { data, error } = await db
        .from('project_templates')
        .update(updates)
        .eq('id', templateId)
        .select()
        .single()

      if (error) {throw error}

      return data as ProjectTemplate
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_TEMPLATE_ERROR',
            message: 'Failed to update project template',
            details: error,
          })
    }
  },

  /**
   * Increment template usage count (called when template is applied)
   */
  async incrementUsage(templateId: string): Promise<void> {
    try {
      const { error } = await db.rpc('increment_template_usage', {
        p_template_id: templateId,
      })

      if (error) {throw error}
    } catch (error) {
      // Non-critical error - don't throw, just log
      logger.error('Failed to increment template usage:', error)
    }
  },

  // ============================================================================
  // Delete Operations
  // ============================================================================

  /**
   * Soft delete a template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    try {
      if (!templateId) {
        throw new ApiErrorClass({
          code: 'TEMPLATE_ID_REQUIRED',
          message: 'Template ID is required',
        })
      }

      const { error } = await db
        .from('project_templates')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', templateId)

      if (error) {throw error}
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_TEMPLATE_ERROR',
            message: 'Failed to delete project template',
            details: error,
          })
    }
  },

  /**
   * Permanently delete a template (admin only)
   */
  async permanentlyDeleteTemplate(templateId: string): Promise<void> {
    try {
      if (!templateId) {
        throw new ApiErrorClass({
          code: 'TEMPLATE_ID_REQUIRED',
          message: 'Template ID is required',
        })
      }

      const { error } = await db
        .from('project_templates')
        .delete()
        .eq('id', templateId)

      if (error) {throw error}
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'PERMANENT_DELETE_TEMPLATE_ERROR',
            message: 'Failed to permanently delete project template',
            details: error,
          })
    }
  },

  // ============================================================================
  // Template Application
  // ============================================================================

  /**
   * Apply a template to a project
   * Creates folders, assigns workflows, creates checklists, etc.
   */
  async applyTemplateToProject(
    projectId: string,
    templateId: string,
    userId: string
  ): Promise<ApplyTemplateResult> {
    const result: ApplyTemplateResult = {
      success: true,
      project_id: projectId,
      template_id: templateId,
      folders_created: 0,
      workflows_assigned: 0,
      checklists_created: 0,
      phases_created: 0,
      errors: [],
    }

    try {
      if (!projectId || !templateId) {
        throw new ApiErrorClass({
          code: 'INVALID_INPUT',
          message: 'Project ID and Template ID are required',
        })
      }

      const template = await this.getTemplate(templateId)

      // 1. Update project with template reference
      const { error: projectUpdateError } = await db
        .from('projects')
        .update({ template_id: templateId })
        .eq('id', projectId)

      if (projectUpdateError) {
        result.errors.push(`Failed to link template to project: ${projectUpdateError.message}`)
      }

      // 2. Create folder structure
      if (template.folder_structure && template.folder_structure.length > 0) {
        try {
          result.folders_created = await createFoldersFromStructure(
            projectId,
            template.folder_structure,
            userId
          )
        } catch (error) {
          result.errors.push(
            `Failed to create folders: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        }
      }

      // 3. Apply enabled features to project
      if (template.enabled_features && Object.keys(template.enabled_features).length > 0) {
        const { error: featuresError } = await db
          .from('projects')
          .update({ features_enabled: template.enabled_features })
          .eq('id', projectId)

        if (featuresError) {
          result.errors.push(`Failed to apply features: ${featuresError.message}`)
        }
      }

      // 4. Apply default settings
      if (template.default_settings?.weather_units) {
        const { error: settingsError } = await db
          .from('projects')
          .update({ weather_units: template.default_settings.weather_units })
          .eq('id', projectId)

        if (settingsError) {
          result.errors.push(`Failed to apply settings: ${settingsError.message}`)
        }
      }

      // 5. Create checklists from templates
      if (template.checklists && template.checklists.length > 0) {
        for (const assoc of template.checklists) {
          if (!assoc.auto_create) {continue}

          try {
            const { error: checklistError } = await db.from('checklists').insert({
              project_id: projectId,
              template_id: assoc.checklist_template_id,
              name: assoc.checklist_template?.name || 'Untitled Checklist',
              category: assoc.checklist_template?.category || null,
              status: 'not_started',
              created_by: userId,
            })

            if (checklistError) {
              result.errors.push(
                `Failed to create checklist: ${checklistError.message}`
              )
            } else {
              result.checklists_created++
            }
          } catch (error) {
            result.errors.push(
              `Failed to create checklist: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
          }
        }
      }

      // 6. Track workflow associations
      result.workflows_assigned = template.workflows?.length || 0

      // 7. Track phases
      result.phases_created = template.phases?.length || 0

      // 8. Increment usage count
      await this.incrementUsage(templateId)

      result.success = result.errors.length === 0
    } catch (error) {
      result.success = false
      result.errors.push(
        error instanceof Error ? error.message : 'Unknown error during template application'
      )
    }

    return result
  },

  // ============================================================================
  // Phase Management
  // ============================================================================

  /**
   * Add a phase to a template
   */
  async addPhase(
    templateId: string,
    phase: { name: string; description?: string; estimated_duration_days?: number }
  ): Promise<ProjectTemplatePhase> {
    try {
      // Get max phase order
      const { data: existingPhases } = await db
        .from('project_template_phases')
        .select('phase_order')
        .eq('template_id', templateId)
        .order('phase_order', { ascending: false })
        .limit(1)

      const nextOrder = existingPhases?.[0]?.phase_order
        ? existingPhases[0].phase_order + 1
        : 1

      const { data, error } = await db
        .from('project_template_phases')
        .insert({
          template_id: templateId,
          name: phase.name,
          description: phase.description || null,
          phase_order: nextOrder,
          estimated_duration_days: phase.estimated_duration_days || null,
        })
        .select()
        .single()

      if (error) {throw error}

      return data as ProjectTemplatePhase
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'ADD_PHASE_ERROR',
            message: 'Failed to add phase to template',
            details: error,
          })
    }
  },

  /**
   * Update a phase
   */
  async updatePhase(
    phaseId: string,
    updates: { name?: string; description?: string; estimated_duration_days?: number }
  ): Promise<ProjectTemplatePhase> {
    try {
      const { data, error } = await db
        .from('project_template_phases')
        .update(updates)
        .eq('id', phaseId)
        .select()
        .single()

      if (error) {throw error}

      return data as ProjectTemplatePhase
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_PHASE_ERROR',
            message: 'Failed to update phase',
            details: error,
          })
    }
  },

  /**
   * Delete a phase
   */
  async deletePhase(phaseId: string): Promise<void> {
    try {
      const { error } = await db
        .from('project_template_phases')
        .delete()
        .eq('id', phaseId)

      if (error) {throw error}
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_PHASE_ERROR',
            message: 'Failed to delete phase',
            details: error,
          })
    }
  },

  /**
   * Reorder phases
   */
  async reorderPhases(
    templateId: string,
    phaseIds: string[]
  ): Promise<void> {
    try {
      for (let i = 0; i < phaseIds.length; i++) {
        await db
          .from('project_template_phases')
          .update({ phase_order: i + 1 })
          .eq('id', phaseIds[i])
          .eq('template_id', templateId)
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'REORDER_PHASES_ERROR',
            message: 'Failed to reorder phases',
            details: error,
          })
    }
  },
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Transform flat folder rows to hierarchical structure
 */
function transformFoldersToStructure(
  folders: Array<{
    id: string
    name: string
    description?: string
    parent_folder_id?: string
    sort_order?: number
  }>
): TemplateFolderStructure[] {
  const folderMap = new Map<string, TemplateFolderStructure>()
  const rootFolders: TemplateFolderStructure[] = []

  // First pass: create map
  folders.forEach((folder) => {
    folderMap.set(folder.id, {
      id: folder.id,
      name: folder.name,
      description: folder.description,
      sort_order: folder.sort_order || 0,
      parent_id: folder.parent_folder_id,
      children: [],
    })
  })

  // Second pass: build hierarchy
  folders.forEach((folder) => {
    const folderNode = folderMap.get(folder.id)!
    if (folder.parent_folder_id) {
      const parent = folderMap.get(folder.parent_folder_id)
      if (parent) {
        parent.children = parent.children || []
        parent.children.push(folderNode)
      }
    } else {
      rootFolders.push(folderNode)
    }
  })

  // Sort by sort_order
  const sortFolders = (folders: TemplateFolderStructure[]) => {
    folders.sort((a, b) => a.sort_order - b.sort_order)
    folders.forEach((f) => {
      if (f.children && f.children.length > 0) {
        sortFolders(f.children)
      }
    })
  }

  sortFolders(rootFolders)

  return rootFolders
}

/**
 * Create folders from structure recursively
 */
async function createFoldersFromStructure(
  projectId: string,
  structure: TemplateFolderStructure[],
  userId: string,
  parentId?: string
): Promise<number> {
  let count = 0

  for (const folderDef of structure) {
    try {
      const { data: folder, error } = await db
        .from('folders')
        .insert({
          project_id: projectId,
          parent_folder_id: parentId || null,
          name: folderDef.name,
          description: folderDef.description || null,
          sort_order: folderDef.sort_order,
          created_by: userId,
        })
        .select()
        .single()

      if (error) {
        logger.error('Error creating folder:', error)
        continue
      }

      count++

      // Recursively create children
      if (folderDef.children && folderDef.children.length > 0) {
        count += await createFoldersFromStructure(
          projectId,
          folderDef.children,
          userId,
          folder.id
        )
      }
    } catch (error) {
      logger.error('Error creating folder:', error)
    }
  }

  return count
}

export default projectTemplatesApi
