// File: /src/features/takeoffs/hooks/useAssemblies.ts
// React Query hooks for assembly data fetching and mutations

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { assembliesApi, type AssemblyFilters } from '@/lib/api/services/assemblies'
import type { Database } from '@/types/database'
import toast from 'react-hot-toast'

type AssemblyInsert = Database['public']['Tables']['assemblies']['Insert']
type AssemblyUpdate = Database['public']['Tables']['assemblies']['Update']

/**
 * Fetch all assemblies with optional filters
 */
export function useAssemblies(filters?: AssemblyFilters) {
  return useQuery({
    queryKey: ['assemblies', filters],
    queryFn: () => assembliesApi.getAssemblies(filters),
  })
}

/**
 * Fetch system-level assemblies (shared across all companies)
 */
export function useSystemAssemblies(filters?: { category?: string; trade?: string }) {
  return useQuery({
    queryKey: ['assemblies', 'system', filters],
    queryFn: () => assembliesApi.getSystemAssemblies(filters),
  })
}

/**
 * Fetch company-level assemblies for a specific company
 */
export function useCompanyAssemblies(
  companyId: string | undefined,
  filters?: { category?: string; trade?: string }
) {
  return useQuery({
    queryKey: ['assemblies', 'company', companyId, filters],
    queryFn: async () => {
      if (!companyId) {throw new Error('Company ID required')}
      return assembliesApi.getCompanyAssemblies(companyId, filters)
    },
    enabled: !!companyId,
  })
}

/**
 * Fetch assemblies by category
 */
export function useAssembliesByCategory(category: string | undefined, companyId?: string) {
  return useQuery({
    queryKey: ['assemblies', 'category', category, companyId],
    queryFn: async () => {
      if (!category) {throw new Error('Category required')}
      return assembliesApi.getAssembliesByCategory(category, companyId)
    },
    enabled: !!category,
  })
}

/**
 * Fetch assemblies by trade
 */
export function useAssembliesByTrade(trade: string | undefined, companyId?: string) {
  return useQuery({
    queryKey: ['assemblies', 'trade', trade, companyId],
    queryFn: async () => {
      if (!trade) {throw new Error('Trade required')}
      return assembliesApi.getAssembliesByTrade(trade, companyId)
    },
    enabled: !!trade,
  })
}

/**
 * Fetch a single assembly by ID
 */
export function useAssembly(assemblyId: string | undefined) {
  return useQuery({
    queryKey: ['assemblies', assemblyId],
    queryFn: async () => {
      if (!assemblyId) {throw new Error('Assembly ID required')}
      return assembliesApi.getAssembly(assemblyId)
    },
    enabled: !!assemblyId,
  })
}

/**
 * Create a new assembly
 */
export function useCreateAssembly() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: AssemblyInsert) => assembliesApi.createAssembly(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assemblies'], exact: false })
      toast.success('Assembly created successfully')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create assembly')
    },
  })
}

/**
 * Update an assembly
 */
export function useUpdateAssembly() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<AssemblyUpdate> & { id: string }) =>
      assembliesApi.updateAssembly(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assemblies'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['assemblies', data.id] })
      toast.success('Assembly updated successfully')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update assembly')
    },
  })
}

/**
 * Delete an assembly (soft delete)
 */
export function useDeleteAssembly() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (assemblyId: string) => assembliesApi.deleteAssembly(assemblyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assemblies'], exact: false })
      toast.success('Assembly deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete assembly')
    },
  })
}

/**
 * Duplicate an assembly with a new name
 */
export function useDuplicateAssembly() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      assemblyId,
      newName,
      companyId,
    }: {
      assemblyId: string
      newName: string
      companyId?: string
    }) => assembliesApi.duplicateAssembly(assemblyId, newName, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assemblies'], exact: false })
      toast.success('Assembly duplicated successfully')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to duplicate assembly')
    },
  })
}

/**
 * Search assemblies by query string
 */
export function useSearchAssemblies(query: string | undefined, companyId?: string) {
  return useQuery({
    queryKey: ['assemblies', 'search', query, companyId],
    queryFn: async () => {
      if (!query) {throw new Error('Search query required')}
      return assembliesApi.searchAssemblies(query, companyId)
    },
    enabled: !!query && query.length > 0,
  })
}

/**
 * Batch create multiple assemblies
 */
export function useBatchCreateAssemblies() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (assemblies: AssemblyInsert[]) =>
      assembliesApi.batchCreateAssemblies(assemblies),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assemblies'], exact: false })
      toast.success('Assemblies created successfully')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create assemblies')
    },
  })
}

/**
 * Get unique categories from assemblies
 */
export function useAssemblyCategories(companyId?: string) {
  return useQuery({
    queryKey: ['assemblies', 'categories', companyId],
    queryFn: () => assembliesApi.getCategories(companyId),
  })
}

/**
 * Get unique trades from assemblies
 */
export function useAssemblyTrades(companyId?: string) {
  return useQuery({
    queryKey: ['assemblies', 'trades', companyId],
    queryFn: () => assembliesApi.getTrades(companyId),
  })
}
