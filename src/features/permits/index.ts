// Permits Feature

// Hooks
export * from './hooks/usePermits'

// Re-export types for convenience
export type {
  Permit,
  CreatePermitDTO,
  UpdatePermitDTO,
  PermitFilters,
  PermitStatistics,
} from '@/types/permits'

export {
  PermitStatus,
  PermitType,
  getPermitStatusLabel,
  getPermitStatusColor,
  getPermitTypeLabel,
  isPermitExpiringSoon,
  isPermitExpired,
  getDaysUntilExpiration,
  isCriticalPermit,
  getNextPermitStatusOptions,
} from '@/types/permits'
