/**
 * MobileHeader - Header component for mobile app
 *
 * Features:
 * - Hamburger menu button
 * - App logo/title
 * - Project selector (compact)
 * - Notifications button
 */

import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Bell, ChevronDown } from 'lucide-react';
import { useSelectedProject } from '../../hooks/useSelectedProject';
import { useUnreadNotificationCount } from '../../features/notifications/hooks/useNotifications';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface MobileHeaderProps {
  onMenuClick: () => void;
}

export const MobileHeader = memo(function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  const { selectedProject } = useSelectedProject();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();

  return (
    <header className="sticky top-0 z-40 bg-background border-b border-border safe-area-top">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left: Menu button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="min-w-[44px] min-h-[44px] -ml-2"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Center: Logo and project selector */}
        <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">J</span>
            </div>
            <span className="font-semibold text-foreground hidden xs:inline">JobSight</span>
          </Link>

          {/* Project selector (if project is selected) */}
          {selectedProject && (
            <button
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md",
                "bg-muted/50 hover:bg-muted transition-colors",
                "text-sm text-muted-foreground",
                "max-w-[120px] truncate"
              )}
            >
              <span className="truncate">{selectedProject.name}</span>
              <ChevronDown className="h-3 w-3 flex-shrink-0" />
            </button>
          )}
        </div>

        {/* Right: Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="min-w-[44px] min-h-[44px] -mr-2 relative"
          aria-label="Notifications"
          asChild
        >
          <Link to="/messages">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
            )}
          </Link>
        </Button>
      </div>
    </header>
  );
});

export default MobileHeader;
