// File: src/pages/NavigationDemo.tsx
// Demo page showcasing different navigation menu organization strategies
// Use this to test and compare different categorization approaches

import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ChevronDown, ArrowLeft } from 'lucide-react'
import {
  NAVIGATION_LAYOUTS,
  type NavigationLayout,
} from '@/config/navigation-layouts'

// ============================================================================
// SIDEBAR PREVIEW COMPONENT
// ============================================================================

interface SidebarPreviewProps {
  config: NavigationLayout
  isExpanded: boolean
  expandedGroups: Set<string>
  onToggleGroup: (id: string) => void
}

function SidebarPreview({
  config,
  isExpanded,
  expandedGroups,
  onToggleGroup,
}: SidebarPreviewProps) {
  const location = useLocation()

  const isPathActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  return (
    <div
      className={cn(
        'flex flex-col h-full',
        'bg-slate-900 rounded-xl overflow-hidden',
        'border border-slate-800/50',
        'transition-all duration-300',
        isExpanded ? 'w-64' : 'w-16'
      )}
    >
      {/* Header */}
      <div className="flex items-center h-14 px-3 border-b border-slate-800/50">
        <div className="flex items-center gap-2.5">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">JS</span>
          </div>
          {isExpanded && (
            <div className="overflow-hidden">
              <h1 className="font-semibold text-white text-sm whitespace-nowrap">JobSight</h1>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-1">
        {/* Primary items */}
        <div className="space-y-0.5">
          {config.primary.map((item) => {
            const Icon = item.icon
            const isActive = isPathActive(item.path)
            return (
              <div
                key={item.path}
                className={cn(
                  'relative flex items-center gap-2.5 rounded-lg font-medium text-sm',
                  'transition-all duration-200 cursor-pointer',
                  isExpanded ? 'px-2.5 py-2' : 'px-2.5 py-2 justify-center',
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-blue-500 rounded-r-full" />
                )}
                <Icon className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-blue-400' : 'text-slate-500')} />
                {isExpanded && (
                  <>
                    <span className="flex-1 whitespace-nowrap">{item.label}</span>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/20 text-blue-400 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* Divider */}
        <div className="my-3 mx-1.5">
          <div className="h-px bg-slate-800" />
        </div>

        {/* Groups */}
        {config.groups.map((group) => (
          <div key={group.id} className="space-y-0.5">
            {/* Group header */}
            {isExpanded ? (
              <button
                onClick={() => onToggleGroup(group.id)}
                className={cn(
                  'w-full flex items-center justify-between px-2.5 py-1.5',
                  'text-[10px] font-semibold uppercase tracking-wider',
                  'text-slate-500 hover:text-slate-400',
                  'transition-colors duration-200'
                )}
              >
                <div className="flex items-center gap-2">
                  {group.icon && <group.icon className="h-3 w-3" />}
                  <span>{group.label}</span>
                </div>
                <ChevronDown
                  className={cn(
                    'h-3 w-3 transition-transform duration-200',
                    expandedGroups.has(group.id) ? 'rotate-0' : '-rotate-90'
                  )}
                />
              </button>
            ) : (
              <div className="h-1.5" />
            )}

            {/* Group items */}
            <div
              className={cn(
                'space-y-0.5 overflow-hidden transition-all duration-200',
                isExpanded && !expandedGroups.has(group.id) && 'h-0 opacity-0'
              )}
            >
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = isPathActive(item.path)
                return (
                  <div
                    key={item.path}
                    className={cn(
                      'relative flex items-center gap-2.5 rounded-lg font-medium text-sm',
                      'transition-all duration-200 cursor-pointer',
                      isExpanded ? 'px-2.5 py-1.5 ml-1.5' : 'px-2.5 py-1.5 justify-center',
                      isActive
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3 bg-blue-500 rounded-r-full" />
                    )}
                    <Icon className={cn('h-3.5 w-3.5 flex-shrink-0', isActive ? 'text-blue-400' : 'text-slate-500')} />
                    {isExpanded && (
                      <>
                        <span className="flex-1 whitespace-nowrap text-[13px]">{item.label}</span>
                        {item.badge && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/20 text-blue-400 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-800/50 p-2">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xs font-semibold text-slate-300">
            JD
          </div>
          {isExpanded && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">John Doe</p>
              <p className="text-[10px] text-slate-500 truncate">Superintendent</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN DEMO PAGE
// ============================================================================

export function NavigationDemo() {
  const [selectedVersion, setSelectedVersion] = useState(0)
  const [isExpanded, setIsExpanded] = useState(true)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(NAVIGATION_LAYOUTS[0].groups.map((g) => g.id))
  )

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleVersionChange = (index: number) => {
    setSelectedVersion(index)
    // Expand all groups for the new version
    setExpandedGroups(new Set(NAVIGATION_LAYOUTS[index].groups.map((g) => g.id)))
  }

  const currentConfig = NAVIGATION_LAYOUTS[selectedVersion]

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm font-medium">Back to Dashboard</span>
              </Link>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-700" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Navigation Menu Variants
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium',
                  'bg-gray-100 dark:bg-slate-800',
                  'text-gray-700 dark:text-gray-300',
                  'hover:bg-gray-200 dark:hover:bg-slate-700',
                  'transition-colors'
                )}
              >
                {isExpanded ? 'Collapse All' : 'Expand All'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Version Selector */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Select Organization Method
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {NAVIGATION_LAYOUTS.map((version, index) => (
              <button
                key={version.name}
                onClick={() => handleVersionChange(index)}
                className={cn(
                  'p-4 rounded-xl text-left transition-all',
                  'border-2',
                  selectedVersion === index
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-slate-900'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                      selectedVersion === index
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    )}
                  >
                    {index + 1}
                  </span>
                </div>
                <h3 className={cn(
                  'font-semibold text-sm mb-1',
                  selectedVersion === index
                    ? 'text-blue-700 dark:text-blue-400'
                    : 'text-gray-900 dark:text-white'
                )}>
                  {version.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                  {version.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Preview Area */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Sidebar Preview */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Preview: {currentConfig.name}
            </h2>
            <div className="flex gap-6">
              {/* Expanded */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Expanded</p>
                <div className="h-[600px]">
                  <SidebarPreview
                    config={currentConfig}
                    isExpanded={true}
                    expandedGroups={expandedGroups}
                    onToggleGroup={toggleGroup}
                  />
                </div>
              </div>
              {/* Collapsed */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Collapsed</p>
                <div className="h-[600px]">
                  <SidebarPreview
                    config={currentConfig}
                    isExpanded={false}
                    expandedGroups={expandedGroups}
                    onToggleGroup={toggleGroup}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Structure Details */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Structure Details
            </h2>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6">
              <div className="space-y-6">
                {/* Primary Items */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    Primary Navigation
                  </h3>
                  <div className="ml-4 space-y-1">
                    {currentConfig.primary.map((item) => (
                      <div key={item.path} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <item.icon className="h-3.5 w-3.5" />
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-800 rounded">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Groups */}
                {currentConfig.groups.map((group) => (
                  <div key={group.id}>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      {group.label}
                      <span className="text-xs text-gray-400 font-normal">
                        ({group.items.length} items)
                      </span>
                    </h3>
                    <div className="ml-4 space-y-1">
                      {group.items.map((item) => (
                        <div key={item.path} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <item.icon className="h-3.5 w-3.5" />
                          <span>{item.label}</span>
                          {item.badge && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-800 rounded">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Stats */}
                <div className="pt-4 border-t border-gray-200 dark:border-slate-800">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {currentConfig.primary.length}
                      </p>
                      <p className="text-xs text-gray-500">Primary Items</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {currentConfig.groups.length}
                      </p>
                      <p className="text-xs text-gray-500">Groups</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {currentConfig.groups.reduce((sum, g) => sum + g.items.length, 0)}
                      </p>
                      <p className="text-xs text-gray-500">Total Items</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pros & Cons */}
            <div className="mt-6 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Analysis
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
                    Strengths
                  </h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    {getStrengths(selectedVersion).map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5">+</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">
                    Considerations
                  </h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    {getConsiderations(selectedVersion).map((c, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">!</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// ANALYSIS HELPERS
// ============================================================================

function getStrengths(versionIndex: number): string[] {
  const strengths: string[][] = [
    // Version 1: By Workflow Type
    [
      'Familiar pattern for construction professionals',
      'Clear separation between document workflows and field work',
      'Scales well as features are added to each category',
    ],
    // Version 2: By Frequency
    [
      'Most-used features are immediately accessible',
      'Reduces clicks for common daily tasks',
      'Natural for users who perform routine tasks',
    ],
    // Version 3: By Project Phase
    [
      'Aligns with how construction projects actually flow',
      'Helps users find features relevant to current project stage',
      'Educational for newer team members',
    ],
    // Version 4: Flat with Favorites
    [
      'Personalized experience for each user',
      'Simple mental model - favorites + everything else',
      'Reduces cognitive load for power users',
    ],
    // Version 5: By Responsibility
    [
      'Role-based organization matches org structure',
      'Users quickly find features relevant to their job',
      'Supports permission-based feature visibility',
    ],
    // Version 6: Action-Based
    [
      'Task-oriented - focuses on what users want to DO',
      'Clean separation of create/review/track/manage',
      'Inbox-first approach handles notifications well',
    ],
  ]
  return strengths[versionIndex] || []
}

function getConsiderations(versionIndex: number): string[] {
  const considerations: string[][] = [
    // Version 1: By Workflow Type
    [
      'May not match how users think about their work',
      'Some items could logically fit in multiple categories',
      'Groups could become unbalanced as features grow',
    ],
    // Version 2: By Frequency
    [
      'Frequency varies by user role and project',
      'New users may not know what\'s "frequent"',
      'Project Management section becomes a catch-all',
    ],
    // Version 3: By Project Phase
    [
      'Users work across phases simultaneously',
      'Requires understanding of project lifecycle',
      'Some features (Team) don\'t fit phases well',
    ],
    // Version 4: Flat with Favorites
    [
      'Requires user setup/customization',
      '"All Features" list could get very long',
      'New features may go unnoticed',
    ],
    // Version 5: By Responsibility
    [
      'Users often work across responsibility areas',
      'Some features overlap roles',
      'May reinforce silos between roles',
    ],
    // Version 6: Action-Based
    [
      'Finding existing items requires knowing the action',
      'Some features don\'t fit actions cleanly',
      'May feel unfamiliar to traditional users',
    ],
  ]
  return considerations[versionIndex] || []
}

export default NavigationDemo
