/**
 * MobileBottomNavV2 - Enhanced mobile bottom navigation
 *
 * Features:
 * - Central camera action button (highlighted)
 * - Touch-optimized 48px+ tap targets
 * - Safe area support for notched devices
 * - Haptic feedback on interactions
 * - Active state animations
 */

import { memo, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Camera,
  ListChecks,
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBottomNavV2Props {
  onMoreClick: () => void;
}

interface NavItemConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  isAction?: boolean;
}

const navItems: NavItemConfig[] = [
  { label: 'Home', icon: LayoutDashboard, path: '/mobile/dashboard' },
  { label: 'Reports', icon: ClipboardList, path: '/mobile/daily-reports' },
  { label: 'Camera', icon: Camera, path: '/mobile/photo-progress/capture', isAction: true },
  { label: 'Punch', icon: ListChecks, path: '/mobile/punch-lists' },
];

// Trigger haptic feedback if available
function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 20, heavy: 30 };
    navigator.vibrate(patterns[style]);
  }
}

export const MobileBottomNavV2 = memo(function MobileBottomNavV2({
  onMoreClick,
}: MobileBottomNavV2Props) {
  const location = useLocation();
  // Note: useNavigate is available if programmatic navigation is needed
  const _navigate = useNavigate();

  const handleNavClick = useCallback((_path: string, isAction?: boolean) => {
    triggerHaptic(isAction ? 'medium' : 'light');
  }, []);

  const handleMoreClick = useCallback(() => {
    triggerHaptic('light');
    onMoreClick();
  }, [onMoreClick]);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Main navigation"
    >
      <div className="flex items-end justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/mobile/dashboard' && location.pathname.startsWith(item.path.split('/').slice(0, 3).join('/')));
          const Icon = item.icon;

          // Camera action button - special styling
          if (item.isAction) {
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => handleNavClick(item.path, true)}
                className="relative flex flex-col items-center justify-center -mt-4"
                aria-label="Open camera"
              >
                <div
                  className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center",
                    "bg-primary shadow-lg shadow-primary/30",
                    "transition-all duration-200 active:scale-95",
                    "hover:bg-primary/90"
                  )}
                >
                  <Icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground mt-1">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => handleNavClick(item.path)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full",
                "min-w-[64px] py-2 transition-colors duration-200",
                "active:bg-muted/50 rounded-lg mx-0.5"
              )}
              aria-label={`Navigate to ${item.label}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <div
                className={cn(
                  "relative transition-transform duration-200",
                  isActive && "scale-110"
                )}
              >
                <Icon
                  className={cn(
                    "h-6 w-6 transition-colors duration-200",
                    isActive
                      ? "text-primary stroke-[2.5px]"
                      : "text-muted-foreground"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] mt-1 transition-colors duration-200",
                  isActive ? "text-primary font-semibold" : "text-muted-foreground font-medium"
                )}
              >
                {item.label}
              </span>
              {/* Active indicator */}
              {isActive && (
                <div className="absolute bottom-1 w-1.5 h-1.5 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}

        {/* More menu button */}
        <button
          onClick={handleMoreClick}
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full",
            "min-w-[64px] py-2 transition-colors duration-200",
            "active:bg-muted/50 rounded-lg mx-0.5"
          )}
          aria-label="Open navigation menu"
        >
          <Menu className="h-6 w-6 text-muted-foreground" />
          <span className="text-[10px] mt-1 text-muted-foreground font-medium">
            More
          </span>
        </button>
      </div>
    </nav>
  );
});

export default MobileBottomNavV2;
