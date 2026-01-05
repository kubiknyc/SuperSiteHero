import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { NavItem } from '../../types/navigation';

interface NavigationGroupProps {
  /** Group identifier for localStorage */
  id: string;

  /** Group label */
  label: string;

  /** Group icon */
  icon: LucideIcon;

  /** Navigation items in the group */
  items: NavItem[];

  /** Whether group should be expanded by default */
  defaultExpanded?: boolean;

  /** Callback when a nav item is clicked */
  onItemClick?: (item: NavItem) => void;
}

export function NavigationGroup({
  id,
  label,
  icon: Icon,
  items,
  defaultExpanded = false,
  onItemClick,
}: NavigationGroupProps) {
  const location = useLocation();
  const hasAutoExpandedRef = useRef(false);

  // Load expanded state from localStorage
  const [isExpanded, setIsExpanded] = useState(() => {
    const stored = localStorage.getItem(`nav-group-${id}`);
    if (stored !== null) {
      return stored === 'true';
    }
    return defaultExpanded;
  });

  // Auto-expand if current route is in this group
  useEffect(() => {
    const isCurrentRouteInGroup = items.some(
      (item) => location.pathname === item.path
    );

    if (isCurrentRouteInGroup && !isExpanded && !hasAutoExpandedRef.current) {
      hasAutoExpandedRef.current = true;
      // Defer state update to avoid synchronous setState in effect
      setTimeout(() => {
        setIsExpanded(true);
      }, 0);
    }
  }, [location.pathname, items, isExpanded]);

  // Save expanded state to localStorage
  const toggleExpanded = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    localStorage.setItem(`nav-group-${id}`, String(newState));
  };

  return (
    <div className="space-y-1">
      {/* Group Header - uses explicit colors for dark sidebar */}
      <button
        onClick={toggleExpanded}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          'text-gray-300 hover:bg-gray-800 hover:text-white',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900'
        )}
        aria-expanded={isExpanded}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        <span className="flex-1 text-left">{label}</span>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
        )}
      </button>

      {/* Group Items - uses explicit colors for dark sidebar with industrial styling */}
      {isExpanded && (
        <div className="ml-4 space-y-1 border-l-[4px] border-gray-700/40 pl-4">
          {items.map((item) => {
            const isActive = location.pathname === item.path;
            const ItemIcon = item.icon;
            const Badge = item.badge;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => onItemClick?.(item)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-primary/20 to-primary/10 text-white border-l-[4px] border-primary shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.07] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] border-l-[4px] border-transparent',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <ItemIcon className={cn(
                  "h-4 w-4 flex-shrink-0 transition-colors",
                  isActive ? "text-primary" : "text-gray-500"
                )} />
                <span className="flex-1">{item.label}</span>
                {Badge && (
                  <span className="flex-shrink-0">
                    <Badge />
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
