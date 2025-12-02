// File: /src/lib/api/services/assemblies.ts
// Assembly API service for takeoff calculations
// Manages assembly templates with formulas and variables for quantity calculations

import { apiClient } from '../client'
import { ApiErrorClass } from '../errors'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type Assembly = Database['public']['Tables']['assemblies']['Row']
type AssemblyInsert = Database['public']['Tables']['assemblies']['Insert']
type AssemblyUpdate = Database['public']['Tables']['assemblies']['Update']

export interface AssemblyFilters {
  company_id?: string
  assembly_level?: 'system' | 'company' | 'project'
  category?: string
  trade?: string
  search?: string
}

export interface AssemblyItem {
  id: string
  name: string
  description?: string
  formula?: string
  unit_of_measure: string
  quantity_formula?: string
  waste_factor?: number
  sort_order: number
}

export interface AssemblyVariable {
  name: string
  label: string
  description?: string
  default_value?: number | string
  unit?: string
  type: 'number' | 'text' | 'select'
  options?: string[]
}

export const assembliesApi = {
  /**
   * Fetch all assemblies with optional filters
   */
  async getAssemblies(filters?: AssemblyFilters): Promise<Assembly[]> {
    try {
      let query = supabase
        .from('assemblies')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters?.company_id) {
        query = query.eq('company_id', filters.company_id)
      }
      if (filters?.assembly_level) {
        query = query.eq('assembly_level', filters.assembly_level)
      }
      if (filters?.category) {
        query = query.eq('category', filters.category)
      }
      if (filters?.trade) {
        query = query.eq('trade', filters.trade)
      }
      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,assembly_number.ilike.%${filters.search}%`
        )
      }

      const { data, error } = await query

      if (error) {
        throw new ApiErrorClass({
          code: 'FETCH_ASSEMBLIES_ERROR',
          message: `Failed to fetch assemblies: ${error.message}`,
        })
      }

      return (data || []) as Assembly[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_ASSEMBLIES_ERROR',
            message: 'Failed to fetch assemblies',
          })
    }
  },

  /**
   * Fetch system-level assemblies (shared across all companies)
   */
  async getSystemAssemblies(filters?: { category?: string; trade?: string }): Promise<Assembly[]> {
    try {
      return await this.getAssemblies({
        assembly_level: 'system',
        category: filters?.category,
        trade: filters?.trade,
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_SYSTEM_ASSEMBLIES_ERROR',
            message: 'Failed to fetch system assemblies',
          })
    }
  },

  /**
   * Fetch company-level assemblies for a specific company
   */
  async getCompanyAssemblies(
    companyId: string,
    filters?: { category?: string; trade?: string }
  ): Promise<Assembly[]> {
    try {
      if (!companyId) {
        throw new ApiErrorClass({
          code: 'COMPANY_ID_REQUIRED',
          message: 'Company ID is required',
        })
      }

      return await this.getAssemblies({
        company_id: companyId,
        assembly_level: 'company',
        category: filters?.category,
        trade: filters?.trade,
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_COMPANY_ASSEMBLIES_ERROR',
            message: 'Failed to fetch company assemblies',
          })
    }
  },

  /**
   * Fetch assemblies by category
   */
  async getAssembliesByCategory(category: string, companyId?: string): Promise<Assembly[]> {
    try {
      if (!category) {
        throw new ApiErrorClass({
          code: 'CATEGORY_REQUIRED',
          message: 'Category is required',
        })
      }

      return await this.getAssemblies({
        company_id: companyId,
        category,
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_ASSEMBLIES_BY_CATEGORY_ERROR',
            message: 'Failed to fetch assemblies by category',
          })
    }
  },

  /**
   * Fetch assemblies by trade
   */
  async getAssembliesByTrade(trade: string, companyId?: string): Promise<Assembly[]> {
    try {
      if (!trade) {
        throw new ApiErrorClass({
          code: 'TRADE_REQUIRED',
          message: 'Trade is required',
        })
      }

      return await this.getAssemblies({
        company_id: companyId,
        trade,
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_ASSEMBLIES_BY_TRADE_ERROR',
            message: 'Failed to fetch assemblies by trade',
          })
    }
  },

  /**
   * Fetch a single assembly by ID
   */
  async getAssembly(assemblyId: string): Promise<Assembly> {
    try {
      if (!assemblyId) {
        throw new ApiErrorClass({
          code: 'ASSEMBLY_ID_REQUIRED',
          message: 'Assembly ID is required',
        })
      }

      return await apiClient.selectOne<Assembly>('assemblies', assemblyId)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_ASSEMBLY_ERROR',
            message: 'Failed to fetch assembly',
          })
    }
  },

  /**
   * Create a new assembly
   */
  async createAssembly(data: AssemblyInsert): Promise<Assembly> {
    try {
      if (!data.name) {
        throw new ApiErrorClass({
          code: 'ASSEMBLY_NAME_REQUIRED',
          message: 'Assembly name is required',
        })
      }

      if (!data.unit_of_measure) {
        throw new ApiErrorClass({
          code: 'UNIT_OF_MEASURE_REQUIRED',
          message: 'Unit of measure is required',
        })
      }

      if (!data.assembly_level) {
        throw new ApiErrorClass({
          code: 'ASSEMBLY_LEVEL_REQUIRED',
          message: 'Assembly level is required',
        })
      }

      return await apiClient.insert<Assembly>('assemblies', data)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_ASSEMBLY_ERROR',
            message: 'Failed to create assembly',
          })
    }
  },

  /**
   * Update an existing assembly
   */
  async updateAssembly(assemblyId: string, updates: AssemblyUpdate): Promise<Assembly> {
    try {
      if (!assemblyId) {
        throw new ApiErrorClass({
          code: 'ASSEMBLY_ID_REQUIRED',
          message: 'Assembly ID is required',
        })
      }

      return await apiClient.update<Assembly>('assemblies', assemblyId, updates)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_ASSEMBLY_ERROR',
            message: 'Failed to update assembly',
          })
    }
  },

  /**
   * Soft delete an assembly
   */
  async deleteAssembly(assemblyId: string): Promise<void> {
    try {
      if (!assemblyId) {
        throw new ApiErrorClass({
          code: 'ASSEMBLY_ID_REQUIRED',
          message: 'Assembly ID is required',
        })
      }

      await apiClient.update('assemblies', assemblyId, { deleted_at: new Date().toISOString() })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_ASSEMBLY_ERROR',
            message: 'Failed to delete assembly',
          })
    }
  },

  /**
   * Duplicate an assembly with a new name
   */
  async duplicateAssembly(assemblyId: string, newName: string, companyId?: string): Promise<Assembly> {
    try {
      if (!assemblyId) {
        throw new ApiErrorClass({
          code: 'ASSEMBLY_ID_REQUIRED',
          message: 'Assembly ID is required',
        })
      }

      if (!newName) {
        throw new ApiErrorClass({
          code: 'ASSEMBLY_NAME_REQUIRED',
          message: 'New assembly name is required',
        })
      }

      const original = await this.getAssembly(assemblyId)

      // Create new assembly with same structure
      const newAssembly: AssemblyInsert = {
        name: newName,
        description: original.description,
        assembly_level: companyId ? 'company' : original.assembly_level,
        company_id: companyId || original.company_id,
        category: original.category,
        trade: original.trade,
        unit_of_measure: original.unit_of_measure,
        items: original.items,
        variables: original.variables,
        assembly_number: null, // Generate new number or leave null
      }

      return await this.createAssembly(newAssembly)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DUPLICATE_ASSEMBLY_ERROR',
            message: 'Failed to duplicate assembly',
          })
    }
  },

  /**
   * Search assemblies by query string
   */
  async searchAssemblies(query: string, companyId?: string): Promise<Assembly[]> {
    try {
      if (!query) {
        throw new ApiErrorClass({
          code: 'SEARCH_QUERY_REQUIRED',
          message: 'Search query is required',
        })
      }

      return await this.getAssemblies({
        company_id: companyId,
        search: query,
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'SEARCH_ASSEMBLIES_ERROR',
            message: 'Failed to search assemblies',
          })
    }
  },

  /**
   * Batch create multiple assemblies
   */
  async batchCreateAssemblies(assemblies: AssemblyInsert[]): Promise<Assembly[]> {
    try {
      if (!assemblies || assemblies.length === 0) {
        throw new ApiErrorClass({
          code: 'NO_ASSEMBLIES_PROVIDED',
          message: 'No assemblies provided',
        })
      }

      // Validate all assemblies have required fields
      for (const assembly of assemblies) {
        if (!assembly.name || !assembly.unit_of_measure || !assembly.assembly_level) {
          throw new ApiErrorClass({
            code: 'INVALID_ASSEMBLY_DATA',
            message: 'All assemblies must have name, unit_of_measure, and assembly_level',
          })
        }
      }

      return await apiClient.insertMany<Assembly>('assemblies', assemblies)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'BATCH_CREATE_ASSEMBLIES_ERROR',
            message: 'Failed to batch create assemblies',
          })
    }
  },

  /**
   * Get unique categories from assemblies
   */
  async getCategories(companyId?: string): Promise<string[]> {
    try {
      let query = supabase
        .from('assemblies')
        .select('category')
        .is('deleted_at', null)
        .not('category', 'is', null)

      if (companyId) {
        query = query.eq('company_id', companyId)
      }

      const { data, error } = await query

      if (error) {
        throw new ApiErrorClass({
          code: 'FETCH_CATEGORIES_ERROR',
          message: `Failed to fetch categories: ${error.message}`,
        })
      }

      // Extract unique categories
      const categories = [...new Set((data || []).map((item) => item.category).filter(Boolean))]
      return categories as string[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_CATEGORIES_ERROR',
            message: 'Failed to fetch categories',
          })
    }
  },

  /**
   * Get unique trades from assemblies
   */
  async getTrades(companyId?: string): Promise<string[]> {
    try {
      let query = supabase
        .from('assemblies')
        .select('trade')
        .is('deleted_at', null)
        .not('trade', 'is', null)

      if (companyId) {
        query = query.eq('company_id', companyId)
      }

      const { data, error } = await query

      if (error) {
        throw new ApiErrorClass({
          code: 'FETCH_TRADES_ERROR',
          message: `Failed to fetch trades: ${error.message}`,
        })
      }

      // Extract unique trades
      const trades = [...new Set((data || []).map((item) => item.trade).filter(Boolean))]
      return trades as string[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_TRADES_ERROR',
            message: 'Failed to fetch trades',
          })
    }
  },
}
