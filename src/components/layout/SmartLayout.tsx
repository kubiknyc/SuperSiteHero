// File: /src/components/layout/SmartLayout.tsx
// Unified layout component that switches between v1 and v2 based on user preference
// Provides a seamless transition experience between layout versions

import { type ReactNode } from 'react'
import { useLayoutVersion } from '@/hooks/useLayoutVersion'
import { AppLayout } from './AppLayout'
import { AppLayoutV2 } from './AppLayoutV2'

interface SmartLayoutProps {
  children: ReactNode
  /** Override the auto-detected page title (v2 only) */
  title?: string
  /** Override the auto-detected subtitle (v2 only) */
  subtitle?: string
  /** Show inline stats in header (v2 only, default: true on dashboard) */
  showHeaderStats?: boolean
  /** Hide the sticky header (v2 only) */
  hideHeader?: boolean
}

/**
 * SmartLayout - Automatically switches between v1 and v2 layouts
 *
 * Usage:
 * Replace `<AppLayout>` with `<SmartLayout>` in your pages.
 * The layout will automatically switch based on the user's preference.
 *
 * To switch layouts:
 * - Add `?layout=v2` to the URL to use the new layout
 * - Add `?layout=v1` to the URL to use the classic layout
 * - Or use the LayoutVersionToggle component in settings
 */
export function SmartLayout({
  children,
  title,
  subtitle,
  showHeaderStats,
  hideHeader,
}: SmartLayoutProps) {
  const { isV2 } = useLayoutVersion()

  if (isV2) {
    return (
      <AppLayoutV2
        title={title}
        subtitle={subtitle}
        showHeaderStats={showHeaderStats}
        hideHeader={hideHeader}
      >
        {children}
      </AppLayoutV2>
    )
  }

  // V1 layout (classic)
  return <AppLayout>{children}</AppLayout>
}

/**
 * Hook to get layout-aware wrapper component
 * Useful for conditionally rendering layout-specific content
 */
export function useSmartLayout() {
  const { isV2, layoutVersion, toggleLayoutVersion } = useLayoutVersion()

  return {
    isV2,
    layoutVersion,
    toggleLayoutVersion,
    // Helper to get the appropriate layout component
    Layout: isV2 ? AppLayoutV2 : AppLayout,
  }
}
