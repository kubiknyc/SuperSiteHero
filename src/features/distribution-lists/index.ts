/**
 * Distribution Lists Feature
 *
 * Provides reusable distribution lists for RFIs, Submittals, Transmittals, etc.
 * Supports both internal users and external contacts.
 */

// Hooks
export * from './hooks'

// Components
export * from './components'

// Re-export types for convenience
export type {
  DistributionList,
  DistributionListWithCount,
  DistributionListWithMembers,
  DistributionListMember,
  DistributionListMemberWithUser,
  DistributionListType,
  MemberRole,
  DistributionSelection,
  ResolvedRecipient,
  CreateDistributionListDTO,
  UpdateDistributionListDTO,
  CreateDistributionListMemberDTO,
} from '@/types/distribution-list'

export {
  DISTRIBUTION_LIST_TYPES,
  MEMBER_ROLES,
  getMemberDisplayName,
  getMemberEmail,
  getListTypeLabel,
  deduplicateRecipients,
} from '@/types/distribution-list'
