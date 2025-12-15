// File: src/components/ThemeToggle.tsx
// Theme toggle component with sun/moon icons and smooth transitions
// Supports light, dark, and system options with keyboard accessibility

import * as React from 'react';
import { cn } from '@/lib/utils';
import { useDarkMode } from '@/hooks/useDarkMode';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Theme } from '@/lib/theme/darkMode';

/**
 * Sun icon component
 */
function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-4 w-4', className)}
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

/**
 * Moon icon component
 */
function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-4 w-4', className)}
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

/**
 * Monitor/System icon component
 */
function MonitorIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-4 w-4', className)}
    >
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <line x1="8" x2="16" y1="21" y2="21" />
      <line x1="12" x2="12" y1="17" y2="21" />
    </svg>
  );
}

interface ThemeToggleProps {
  className?: string;
  /** Show label text */
  showLabel?: boolean;
  /** Compact mode - icon only button */
  compact?: boolean;
}

/**
 * Theme toggle component with dropdown menu
 * Allows switching between light, dark, and system themes
 */
export function ThemeToggle({
  className,
  showLabel = true,
  compact = false,
}: ThemeToggleProps) {
  const { theme, isDarkMode, setTheme } = useDarkMode();

  const getIcon = () => {
    if (theme === 'system') {
      return <MonitorIcon className="h-5 w-5" />;
    }
    return isDarkMode ? (
      <MoonIcon className="h-5 w-5" />
    ) : (
      <SunIcon className="h-5 w-5" />
    );
  };

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return 'System';
      default:
        return 'System';
    }
  };

  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'relative h-9 w-9 rounded-md transition-colors',
              className
            )}
            aria-label={`Current theme: ${getLabel()}. Click to change.`}
          >
            <SunIcon className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <MoonIcon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setTheme('light')}>
            <SunIcon className="mr-2 h-4 w-4" />
            Light
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('dark')}>
            <MoonIcon className="mr-2 h-4 w-4" />
            Dark
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('system')}>
            <MonitorIcon className="mr-2 h-4 w-4" />
            System
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <div className="flex items-center gap-3">
        {getIcon()}
        {showLabel && (
          <div className="flex flex-col">
            <span className="text-sm font-medium">Theme</span>
            <span className="text-xs text-muted-foreground">
              {getLabel()} mode
            </span>
          </div>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="min-w-[100px]">
            {getIcon()}
            <span className="ml-2">{getLabel()}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setTheme('light')}>
            <SunIcon className="mr-2 h-4 w-4" />
            Light
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('dark')}>
            <MoonIcon className="mr-2 h-4 w-4" />
            Dark
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('system')}>
            <MonitorIcon className="mr-2 h-4 w-4" />
            System
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/**
 * Simple theme switch for quick light/dark toggle
 */
interface ThemeSwitchProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeSwitch({ className, showLabel = true }: ThemeSwitchProps) {
  const { isDarkMode, toggleTheme } = useDarkMode();

  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <div className="flex items-center gap-3">
        {isDarkMode ? (
          <MoonIcon className="h-5 w-5 text-blue-400" />
        ) : (
          <SunIcon className="h-5 w-5 text-yellow-500" />
        )}
        {showLabel && (
          <div className="flex flex-col">
            <span className="text-sm font-medium">Dark Mode</span>
            <span className="text-xs text-muted-foreground">
              {isDarkMode ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        )}
      </div>
      <Switch
        checked={isDarkMode}
        onCheckedChange={toggleTheme}
        aria-label="Toggle dark mode"
      />
    </div>
  );
}

/**
 * Theme selector with radio-style buttons
 */
interface ThemeSelectorProps {
  className?: string;
}

export function ThemeSelector({ className }: ThemeSelectorProps) {
  const { theme, setTheme } = useDarkMode();

  const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <SunIcon className="h-4 w-4" /> },
    { value: 'dark', label: 'Dark', icon: <MoonIcon className="h-4 w-4" /> },
    { value: 'system', label: 'System', icon: <MonitorIcon className="h-4 w-4" /> },
  ];

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label className="text-sm font-medium">Theme</label>
      <div className="flex gap-2">
        {options.map((option) => (
          <Button
            key={option.value}
            variant={theme === option.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTheme(option.value)}
            className="flex-1"
            aria-pressed={theme === option.value}
          >
            {option.icon}
            <span className="ml-2">{option.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

export { SunIcon, MoonIcon, MonitorIcon };
