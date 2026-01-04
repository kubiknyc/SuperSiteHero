// File: /src/features/shop-drawings/hooks/index.ts
// Export all shop drawing hooks

export {
  // Query hooks
  useShopDrawings,
  useShopDrawing,
  useShopDrawingRevisions,
  useShopDrawingStats,
  // Mutation hooks
  useCreateShopDrawing,
  useUpdateShopDrawing,
  useDeleteShopDrawing,
  useTransitionShopDrawingStatus,
  useCreateShopDrawingRevision,
  // Types
  type ShopDrawing,
  type ShopDrawingWithDetails,
  type CreateShopDrawingDTO,
  type UpdateShopDrawingDTO,
  type ShopDrawingFilters,
  // Query keys
  shopDrawingKeys,
  // Constants
  SHOP_DRAWING_PRIORITIES,
  SHOP_DRAWING_DISCIPLINES,
  // Utility functions
  isValidShopDrawingTransition,
  isShopDrawingLocked,
  getShopDrawingNextStatusOptions,
  getRevisionLabel,
} from './useShopDrawings'
