// File: /src/features/cost-estimates/hooks/index.ts
// Export all cost estimates hooks

export {
  // Query hooks
  useProjectEstimates,
  useEstimate,
  useEstimateItems,

  // Mutation hooks - Estimates
  useCreateEstimate,
  useUpdateEstimate,
  useDeleteEstimate,
  useDuplicateEstimate,

  // Mutation hooks - Items
  useAddEstimateItem,
  useUpdateEstimateItem,
  useDeleteEstimateItem,

  // Special mutations
  useCreateEstimateFromTakeoff,

  // Optimistic update helpers
  useOptimisticEstimateUpdate,
  useOptimisticItemUpdate,

  // Query keys
  costEstimateKeys,
} from './useCostEstimates'
