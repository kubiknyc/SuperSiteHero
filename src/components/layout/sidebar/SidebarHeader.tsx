// File: src/components/layout/sidebar/SidebarHeader.tsx
// Header section of the collapsible sidebar
// Contains logo, brand name, and pin button

import { cn } from '@/lib/utils'
import { Pin, PinOff } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface SidebarHeaderProps {
  isExpanded: boolean
  isPinned: boolean
  onTogglePin: () => void
}

export function SidebarHeader({
  isExpanded,
  isPinned,
  onTogglePin,
}: SidebarHeaderProps) {
  return (
    <div className="relative flex items-center h-16 px-4 border-b border-slate-800/50">
      {/* Logo */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={cn(
            'flex-shrink-0 w-10 h-10 rounded-lg',
            'bg-gradient-to-br from-blue-500 to-blue-600',
            'flex items-center justify-center',
            'shadow-lg shadow-blue-500/20'
          )}
        >
          <span className="text-white font-bold text-lg">JS</span>
        </div>

        {/* Brand text - visible when expanded */}
        <div
          className={cn(
            'overflow-hidden transition-all duration-300',
            isExpanded ? 'w-auto opacity-100' : 'w-0 opacity-0'
          )}
        >
          <h1 className="font-semibold text-white text-lg whitespace-nowrap">
            JobSight
          </h1>
          <p className="text-xs text-slate-400 whitespace-nowrap">
            Field Management
          </p>
        </div>
      </div>

      {/* Pin button - visible when expanded */}
      <div
        className={cn(
          'absolute right-3 transition-all duration-200',
          isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onTogglePin}
              className={cn(
                'p-2 rounded-lg transition-colors duration-200',
                isPinned
                  ? 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/20'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              )}
            >
              {isPinned ? (
                <Pin className="h-4 w-4" />
              ) : (
                <PinOff className="h-4 w-4" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            <p className="flex items-center gap-2">
              {isPinned ? 'Unpin sidebar' : 'Pin sidebar open'}
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-700 rounded">
                [
              </kbd>
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
