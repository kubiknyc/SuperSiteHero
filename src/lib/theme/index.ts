// File: src/lib/theme/index.ts
// Theme system exports for dark mode support

// Core theme utilities and types
export {
  type Theme,
  type ResolvedTheme,
  getSystemTheme,
  getStoredTheme,
  setStoredTheme,
  getResolvedTheme,
  applyTheme,
  initializeTheme,
  setTheme,
  toggleTheme,
  cycleTheme,
  // React Context and Hook
  ThemeProvider,
  useTheme,
  useThemeSafe,
} from './darkMode';
