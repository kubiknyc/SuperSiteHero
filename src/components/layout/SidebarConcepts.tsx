// File: /src/components/layout/SidebarConcepts.tsx
// Three distinct sidebar navigation concepts for JobSight
// Each concept has a unique aesthetic and interaction pattern

import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { LogoIconLight } from '@/components/brand'
import { primaryNavItems, navigationGroups } from '@/config/navigation'
import {
  ChevronRight,
  Search,
  Plus,
  Sparkles,
} from 'lucide-react'

// =============================================================================
// CONCEPT 1: "Command Center" - Minimal Rail with Floating Panels
// =============================================================================
// - Ultra-thin 56px rail with just icons
// - Hovering an icon reveals a floating panel with sub-items
// - Clean, futuristic, maximizes content space
// - Inspired by Figma/Linear command palettes

export function SidebarConcept1() {
  const location = useLocation()
  const [activePanel, setActivePanel] = useState<string | null>(null)

  return (
    <div className="fixed inset-y-0 left-0 z-50 flex">
      {/* Ultra-thin rail */}
      <aside className="w-14 flex flex-col bg-zinc-950 border-r border-zinc-800/50">
        {/* Logo */}
        <div className="h-14 flex items-center justify-center border-b border-zinc-800/50">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <LogoIconLight className="h-5 w-5 text-white" />
          </div>
        </div>

        {/* Quick search */}
        <button className="h-12 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800/50 transition-colors">
          <Search className="h-4 w-4" />
        </button>

        {/* Primary nav */}
        <nav className="flex-1 py-2 space-y-1">
          {primaryNavItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'h-10 mx-2 flex items-center justify-center rounded-lg transition-all',
                  isActive
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'text-zinc-500 hover:text-white hover:bg-zinc-800/50'
                )}
              >
                <Icon className="h-5 w-5" />
              </Link>
            )
          })}

          {/* Divider */}
          <div className="h-px mx-3 my-3 bg-zinc-800" />

          {/* Module groups - hover to reveal panel */}
          {navigationGroups.map((group) => {
            const Icon = group.icon
            const isOpen = activePanel === group.id
            return (
              <div
                key={group.id}
                className="relative"
                onMouseEnter={() => setActivePanel(group.id)}
                onMouseLeave={() => setActivePanel(null)}
              >
                <button
                  className={cn(
                    'h-10 mx-2 w-10 flex items-center justify-center rounded-lg transition-all',
                    isOpen
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-500 hover:text-white hover:bg-zinc-800/50'
                  )}
                >
                  <Icon className="h-5 w-5" />
                </button>

                {/* Floating panel */}
                {isOpen && (
                  <div className="absolute left-full top-0 ml-2 w-56 bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl shadow-black/50 overflow-hidden animate-in slide-in-from-left-2 duration-200">
                    <div className="px-3 py-2 border-b border-zinc-800">
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        {group.label}
                      </span>
                    </div>
                    <div className="py-1">
                      {group.items.map((subItem) => {
                        const SubIcon = subItem.icon
                        return (
                          <Link
                            key={subItem.path}
                            to={subItem.path}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
                          >
                            <SubIcon className="h-4 w-4" />
                            {subItem.label}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Quick action */}
        <div className="p-2 border-t border-zinc-800/50">
          <button className="w-full h-10 flex items-center justify-center rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-colors">
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </aside>
    </div>
  )
}

// =============================================================================
// CONCEPT 2: "Blueprint" - Industrial Construction Aesthetic
// =============================================================================
// - Technical, grid-like design reminiscent of architectural drawings
// - Monospace typography, measurement markers
// - Color-coded sections by category
// - Feels like a professional construction tool

export function SidebarConcept2() {
  const location = useLocation()
  const [expandedGroup, setExpandedGroup] = useState<string | null>('field-work')

  const categoryColors = {
    field: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    management: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
    admin: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
    reports: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  }

  return (
    <aside className="fixed inset-y-0 left-0 w-64 z-50 flex flex-col bg-slate-950 border-r border-slate-800/50 font-mono">
      {/* Blueprint grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgb(148 163 184) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(148 163 184) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
        }}
      />

      {/* Header */}
      <div className="relative h-16 flex items-center gap-3 px-4 border-b border-slate-800/50">
        <div className="w-10 h-10 rounded bg-amber-500 flex items-center justify-center">
          <LogoIconLight className="h-6 w-6 text-slate-950" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white tracking-tight">JOBSIGHT</h1>
          <p className="text-[10px] text-slate-500 tracking-widest">FIELD MGMT v2.0</p>
        </div>
        {/* Measurement marker */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-slate-800 flex">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex-1 border-r border-slate-800 relative">
              <div className="absolute -bottom-1 right-0 w-px h-2 bg-slate-700" />
            </div>
          ))}
        </div>
      </div>

      {/* Primary navigation */}
      <div className="px-3 py-4">
        <div className="text-[9px] text-slate-600 uppercase tracking-[0.2em] mb-2 px-2">
          ── Primary ──
        </div>
        <div className="space-y-0.5">
          {primaryNavItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded text-xs transition-all',
                  isActive
                    ? 'bg-amber-500/15 text-amber-400 border-l-2 border-amber-500'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-l-2 border-transparent'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="uppercase tracking-wider">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Module sections */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-3">
        {navigationGroups.map((group) => {
          const Icon = group.icon
          const colors = categoryColors[group.category as keyof typeof categoryColors] || categoryColors.field
          const isExpanded = expandedGroup === group.id

          return (
            <div key={group.id} className={cn('rounded-lg border', colors.border, colors.bg)}>
              <button
                onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
              >
                <Icon className={cn('h-4 w-4', colors.text)} />
                <span className={cn('flex-1 text-[11px] font-semibold uppercase tracking-wider', colors.text)}>
                  {group.label}
                </span>
                <ChevronRight
                  className={cn(
                    'h-3 w-3 transition-transform',
                    colors.text,
                    isExpanded && 'rotate-90'
                  )}
                />
              </button>

              {isExpanded && (
                <div className="px-2 pb-2 space-y-0.5">
                  {group.items.map((item) => {
                    const SubIcon = item.icon
                    const isActive = location.pathname === item.path
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-2 rounded text-[11px] transition-colors',
                          isActive
                            ? 'bg-white/10 text-white'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        )}
                      >
                        <SubIcon className="h-3.5 w-3.5" />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer with coordinates */}
      <div className="px-4 py-3 border-t border-slate-800/50 text-[10px] text-slate-600 font-mono">
        <div className="flex justify-between">
          <span>LAT 40.7128°</span>
          <span>LON -74.0060°</span>
        </div>
      </div>
    </aside>
  )
}

// =============================================================================
// CONCEPT 3: "Smart Nav" - AI-Powered Adaptive Navigation
// =============================================================================
// - Shows recently used and suggested items at top
// - Collapsible "All Modules" section for full access
// - Search-first approach
// - Modern, clean, with subtle AI hints

export function SidebarConcept3() {
  const location = useLocation()
  const [showAllModules, setShowAllModules] = useState(false)

  // Simulated recent/suggested items
  const recentItems = [
    primaryNavItems[0], // Dashboard
    navigationGroups[0].items[0], // Daily Reports
    navigationGroups[1].items[0], // Workflows
  ]

  const suggestedItems = [
    navigationGroups[0].items[3], // Punch Lists
    navigationGroups[2].items[3], // Safety
  ]

  return (
    <aside className="fixed inset-y-0 left-0 w-72 z-50 flex flex-col bg-gradient-to-b from-gray-900 to-gray-950">
      {/* Gradient accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-500" />

      {/* Header */}
      <div className="p-5 flex items-center gap-3">
        <div className="relative">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <LogoIconLight className="h-6 w-6 text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center">
            <Sparkles className="h-2.5 w-2.5 text-gray-900" />
          </div>
        </div>
        <div>
          <h1 className="font-semibold text-white">JobSight</h1>
          <p className="text-xs text-gray-500">Smart Field Management</p>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 mb-4">
        <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gray-800/50 border border-gray-700/50 text-sm text-gray-400 hover:bg-gray-800 hover:border-gray-600 transition-all">
          <Search className="h-4 w-4" />
          <span>Search anything...</span>
          <kbd className="ml-auto px-2 py-0.5 rounded bg-gray-700 text-[10px] text-gray-400">⌘K</kbd>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-6">
        {/* Recent */}
        <div>
          <div className="flex items-center gap-2 px-3 mb-2">
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Recent</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>
          <div className="space-y-0.5">
            {recentItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
                    isActive
                      ? 'bg-violet-500/15 text-violet-300'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  )}
                >
                  <Icon className={cn('h-5 w-5', isActive && 'text-violet-400')} />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>

        {/* AI Suggested */}
        <div>
          <div className="flex items-center gap-2 px-3 mb-2">
            <Sparkles className="h-3 w-3 text-amber-400" />
            <span className="text-[11px] font-medium text-amber-400/80 uppercase tracking-wider">Suggested</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>
          <div className="space-y-0.5">
            {suggestedItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all group"
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                  <span className="ml-auto text-[10px] text-amber-400/60 opacity-0 group-hover:opacity-100 transition-opacity">
                    AI pick
                  </span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* All Modules (collapsible) */}
        <div>
          <button
            onClick={() => setShowAllModules(!showAllModules)}
            className="flex items-center gap-2 px-3 py-2 w-full text-left"
          >
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">All Modules</span>
            <div className="flex-1 h-px bg-gray-800" />
            <ChevronRight
              className={cn(
                'h-4 w-4 text-gray-600 transition-transform',
                showAllModules && 'rotate-90'
              )}
            />
          </button>

          {showAllModules && (
            <div className="mt-2 space-y-4 animate-in slide-in-from-top-2 duration-200">
              {navigationGroups.map((group) => (
                <div key={group.id}>
                  <div className="px-3 mb-1">
                    <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                      {group.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {group.items.map((item) => {
                      const Icon = item.icon
                      const isActive = location.pathname === item.path
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={cn(
                            'flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl text-center transition-all',
                            isActive
                              ? 'bg-violet-500/15 text-violet-300'
                              : 'text-gray-500 hover:text-white hover:bg-gray-800/50'
                          )}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="text-[10px] leading-tight">{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Quick action footer */}
      <div className="p-4 border-t border-gray-800/50">
        <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-medium hover:from-violet-500 hover:to-fuchsia-500 transition-all shadow-lg shadow-violet-500/25">
          <Plus className="h-4 w-4" />
          Quick Action
        </button>
      </div>
    </aside>
  )
}

// =============================================================================
// Demo page to preview all concepts
// =============================================================================
export function SidebarConceptsDemo() {
  const [activeConcept, setActiveConcept] = useState<1 | 2 | 3>(1)

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Concept selector */}
      <div className="fixed top-4 right-4 z-[100] flex gap-2 p-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl">
        {[1, 2, 3].map((num) => (
          <button
            key={num}
            onClick={() => setActiveConcept(num as 1 | 2 | 3)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeConcept === num
                ? 'bg-primary text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            Concept {num}
          </button>
        ))}
      </div>

      {/* Render active concept */}
      {activeConcept === 1 && <SidebarConcept1 />}
      {activeConcept === 2 && <SidebarConcept2 />}
      {activeConcept === 3 && <SidebarConcept3 />}

      {/* Content area placeholder */}
      <div
        className={cn(
          'min-h-screen p-8 transition-all duration-300',
          activeConcept === 1 && 'ml-14',
          activeConcept === 2 && 'ml-64',
          activeConcept === 3 && 'ml-72'
        )}
      >
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Sidebar Concept {activeConcept}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            {activeConcept === 1 && 'Command Center: Ultra-minimal rail with floating hover panels. Maximum content space, modern feel.'}
            {activeConcept === 2 && 'Blueprint: Industrial construction aesthetic with technical styling, grid patterns, and color-coded sections.'}
            {activeConcept === 3 && 'Smart Nav: AI-powered adaptive navigation with recent items, suggestions, and search-first approach.'}
          </p>

          {/* Mock content cards */}
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-100 dark:bg-gray-700/50 rounded w-full mb-2" />
                <div className="h-3 bg-gray-100 dark:bg-gray-700/50 rounded w-5/6" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
