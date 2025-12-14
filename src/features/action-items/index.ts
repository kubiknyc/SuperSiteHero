/**
 * Action Items Feature
 *
 * Cross-meeting action item management with pipeline to tasks, RFIs, and constraints.
 * Provides dashboard for tracking action items across multiple meetings.
 */

// Components
export { ActionItemsDashboard } from './components'

// Hooks
export {
  actionItemKeys,
  useActionItems,
  useProjectActionItems,
  useActionItem,
  useActionItemSummary,
  useActionItemsByAssignee,
  useOverdueActionItems,
  useActionItemsDueSoon,
  useEscalatedActionItems,
  useActionItemStatusCounts,
  useCreateActionItem,
  useUpdateActionItem,
  useDeleteActionItem,
  useUpdateActionItemStatus,
  useResolveActionItem,
  useConvertToTask,
  useLinkActionItem,
  useUnlinkActionItem,
  useCarryoverActionItems,
} from './hooks'
