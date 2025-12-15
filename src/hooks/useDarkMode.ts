// File: src/hooks/useDarkMode.ts
// React hook for managing dark mode state

import { useCallback, useEffect, useState } from 'react';
import {
  Theme,
  getStoredTheme,
  getResolvedTheme,
  setTheme,
  initializeTheme,
  toggleTheme as toggleThemeUtil,
  cycleTheme as cycleThemeUtil,
} from '@/lib/theme/darkMode';

interface UseDarkModeReturn {
  /** Current theme setting (light, dark, or system) */
  theme: Theme;
  /** Resolved theme after applying system preference */
  resolvedTheme: 'light' | 'dark';
  /** Whether dark mode is currently active */
  isDarkMode: boolean;
  /** Set the theme to a specific value */
  setTheme: (theme: Theme) => void;
  /** Toggle between light and dark modes */
  toggleTheme: () => void;
  /** Cycle through light -> dark -> system */
  cycleTheme: () => void;
}

/**
 * Hook for managing dark mode state
 * Handles theme detection, switching, and localStorage persistence
 *
 * @example
 * ```tsx
 * const { isDarkMode, theme, setTheme, toggleTheme, cycleTheme } = useDarkMode()
 *
 * return (
 *   <button onClick={toggleTheme}>
 *     {isDarkMode ? 'Switch to Light' : 'Switch to Dark'}
 *   </button>
 * )
 * ```
 */
export function useDarkMode(): UseDarkModeReturn {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Get initial theme from storage or default to system
    return getStoredTheme() || 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    const storedTheme = getStoredTheme() || 'system';
    return getResolvedTheme(storedTheme);
  });

  // Initialize theme system and listen for system preference changes
  useEffect(() => {
    const cleanup = initializeTheme();

    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemChange = () => {
      const currentTheme = getStoredTheme() || 'system';
      setResolvedTheme(getResolvedTheme(currentTheme));
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemChange);
    } else {
      mediaQuery.addListener(handleSystemChange);
    }

    return () => {
      cleanup();
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemChange);
      } else {
        mediaQuery.removeListener(handleSystemChange);
      }
    };
  }, []);

  // Update resolved theme when theme changes
  useEffect(() => {
    setResolvedTheme(getResolvedTheme(theme));
  }, [theme]);

  const handleSetTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    setThemeState(newTheme);
    setResolvedTheme(getResolvedTheme(newTheme));
  }, []);

  const handleToggleTheme = useCallback(() => {
    const newTheme = toggleThemeUtil();
    setThemeState(newTheme);
    setResolvedTheme(getResolvedTheme(newTheme));
  }, []);

  const handleCycleTheme = useCallback(() => {
    const newTheme = cycleThemeUtil();
    setThemeState(newTheme);
    setResolvedTheme(getResolvedTheme(newTheme));
  }, []);

  return {
    theme,
    resolvedTheme,
    isDarkMode: resolvedTheme === 'dark',
    setTheme: handleSetTheme,
    toggleTheme: handleToggleTheme,
    cycleTheme: handleCycleTheme,
  };
}

export default useDarkMode;
