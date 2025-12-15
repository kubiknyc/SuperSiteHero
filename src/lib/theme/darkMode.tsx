// File: src/lib/theme/darkMode.ts
// Theme management system for dark mode support
// Handles theme detection, switching, persistence, and CSS property management

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'jobsight-theme';

/**
 * Get the system's preferred color scheme
 */
export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Get the stored theme preference from localStorage
 */
export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return null;
}

/**
 * Store the theme preference in localStorage
 */
export function setStoredTheme(theme: Theme): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

/**
 * Get the resolved theme (accounting for 'system' preference)
 */
export function getResolvedTheme(theme: Theme): ResolvedTheme {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
}

/**
 * Apply the theme to the document
 * Adds or removes the 'dark' class from the <html> element
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') {
    return;
  }

  const resolvedTheme = getResolvedTheme(theme);
  const root = document.documentElement;

  // Add transition class for smooth theme switching
  root.style.setProperty('--theme-transition', 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease');

  // Remove existing theme classes
  root.classList.remove('light', 'dark');

  // Add the resolved theme class
  root.classList.add(resolvedTheme);

  // Update color-scheme for native browser elements
  root.style.colorScheme = resolvedTheme;

  // Update the meta theme-color for mobile browsers
  updateMetaThemeColor(resolvedTheme);
}

/**
 * Update the meta theme-color tag for mobile browsers
 */
function updateMetaThemeColor(theme: ResolvedTheme): void {
  // Update main meta tag
  let metaThemeColor = document.querySelector('meta[name="theme-color"]:not([media])');
  if (!metaThemeColor) {
    metaThemeColor = document.createElement('meta');
    metaThemeColor.setAttribute('name', 'theme-color');
    document.head.appendChild(metaThemeColor);
  }
  metaThemeColor.setAttribute('content', theme === 'dark' ? '#0a0a0a' : '#ffffff');

  // Update media-specific meta tags for Safari
  let metaLight = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: light)"]');
  let metaDark = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]');

  if (!metaLight) {
    metaLight = document.createElement('meta');
    metaLight.setAttribute('name', 'theme-color');
    metaLight.setAttribute('media', '(prefers-color-scheme: light)');
    metaLight.setAttribute('content', '#ffffff');
    document.head.appendChild(metaLight);
  }

  if (!metaDark) {
    metaDark = document.createElement('meta');
    metaDark.setAttribute('name', 'theme-color');
    metaDark.setAttribute('media', '(prefers-color-scheme: dark)');
    metaDark.setAttribute('content', '#0a0a0a');
    document.head.appendChild(metaDark);
  }
}

/**
 * Initialize the theme system
 * Sets up the initial theme and system preference listener
 * Returns a cleanup function for the event listener
 */
export function initializeTheme(): () => void {
  // Get the stored theme or default to 'system'
  const storedTheme = getStoredTheme() || 'system';

  // Apply the initial theme
  applyTheme(storedTheme);

  // Listen for system preference changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handleChange = () => {
    const currentTheme = getStoredTheme() || 'system';
    if (currentTheme === 'system') {
      applyTheme('system');
    }
  };

  // Use addEventListener for modern browsers
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleChange);
  } else {
    // Fallback for older browsers
    mediaQuery.addListener(handleChange);
  }

  // Return cleanup function
  return () => {
    if (mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener('change', handleChange);
    } else {
      mediaQuery.removeListener(handleChange);
    }
  };
}

/**
 * Set the theme and persist it
 */
export function setTheme(theme: Theme): void {
  setStoredTheme(theme);
  applyTheme(theme);
}

/**
 * Toggle between light and dark themes
 * If current theme is 'system', toggles based on current system preference
 */
export function toggleTheme(): Theme {
  const currentTheme = getStoredTheme() || 'system';
  const resolvedTheme = getResolvedTheme(currentTheme);
  const newTheme: Theme = resolvedTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
  return newTheme;
}

/**
 * Cycle through themes: light -> dark -> system -> light
 */
export function cycleTheme(): Theme {
  const currentTheme = getStoredTheme() || 'system';
  let newTheme: Theme;

  switch (currentTheme) {
    case 'light':
      newTheme = 'dark';
      break;
    case 'dark':
      newTheme = 'system';
      break;
    case 'system':
    default:
      newTheme = 'light';
      break;
  }

  setTheme(newTheme);
  return newTheme;
}

// ============================================================================
// React Context and Hook for Theme Management
// ============================================================================

interface ThemeContextValue {
  /** The current theme setting (light, dark, or system) */
  theme: Theme;
  /** The resolved theme (always light or dark, accounting for system preference) */
  resolvedTheme: ResolvedTheme;
  /** Set the theme to a specific value */
  setTheme: (theme: Theme) => void;
  /** Toggle between light and dark (ignores system) */
  toggleTheme: () => void;
  /** Cycle through: light -> dark -> system -> light */
  cycleTheme: () => void;
  /** Whether the theme system is mounted (useful for SSR) */
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  /** Default theme to use if no stored preference exists */
  defaultTheme?: Theme;
  /** Storage key for persisting theme preference */
  storageKey?: string;
}

/**
 * Theme Provider component
 * Wraps the application to provide theme context
 */
export function ThemeProvider({
  children,
  defaultTheme = 'system',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') {
      return defaultTheme;
    }
    return getStoredTheme() || defaultTheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    return getResolvedTheme(theme);
  });

  const [mounted, setMounted] = useState(false);

  // Handle system theme changes
  useEffect(() => {
    setMounted(true);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      if (theme === 'system') {
        const newResolved = getSystemTheme();
        setResolvedTheme(newResolved);
        applyTheme('system');
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [theme]);

  // Apply theme when it changes
  useEffect(() => {
    applyTheme(theme);
    setResolvedTheme(getResolvedTheme(theme));
  }, [theme]);

  const handleSetTheme = useCallback((newTheme: Theme) => {
    setStoredTheme(newTheme);
    setThemeState(newTheme);
  }, []);

  const handleToggleTheme = useCallback(() => {
    const newTheme: Theme = resolvedTheme === 'dark' ? 'light' : 'dark';
    handleSetTheme(newTheme);
  }, [resolvedTheme, handleSetTheme]);

  const handleCycleTheme = useCallback(() => {
    let newTheme: Theme;
    switch (theme) {
      case 'light':
        newTheme = 'dark';
        break;
      case 'dark':
        newTheme = 'system';
        break;
      case 'system':
      default:
        newTheme = 'light';
        break;
    }
    handleSetTheme(newTheme);
  }, [theme, handleSetTheme]);

  const value: ThemeContextValue = {
    theme,
    resolvedTheme,
    setTheme: handleSetTheme,
    toggleTheme: handleToggleTheme,
    cycleTheme: handleCycleTheme,
    mounted,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * useTheme hook
 * Access theme state and controls from any component
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * useThemeSafe hook
 * Safe version that returns defaults when used outside ThemeProvider
 */
export function useThemeSafe(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    return {
      theme: 'system',
      resolvedTheme: 'light',
      setTheme: () => {},
      toggleTheme: () => {},
      cycleTheme: () => {},
      mounted: false,
    };
  }
  return context;
}
