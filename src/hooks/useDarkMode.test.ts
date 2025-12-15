// File: src/hooks/useDarkMode.test.ts
// Tests for dark mode hook

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDarkMode } from './useDarkMode';

describe('useDarkMode', () => {
  const THEME_STORAGE_KEY = 'jobsight-theme';

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.removeItem(THEME_STORAGE_KEY);
    // Clear document classes
    document.documentElement.classList.remove('dark', 'light');
  });

  afterEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    document.documentElement.classList.remove('dark', 'light');
  });

  it('should default to system theme when no preference is stored', () => {
    const { result } = renderHook(() => useDarkMode());

    expect(result.current.theme).toBe('system');
  });

  it('should restore stored theme preference', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    const { result } = renderHook(() => useDarkMode());

    expect(result.current.theme).toBe('dark');
    expect(result.current.isDarkMode).toBe(true);
  });

  it('should set theme to dark', () => {
    const { result } = renderHook(() => useDarkMode());

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.theme).toBe('dark');
    expect(result.current.isDarkMode).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('should set theme to light', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const { result } = renderHook(() => useDarkMode());

    act(() => {
      result.current.setTheme('light');
    });

    expect(result.current.theme).toBe('light');
    expect(result.current.isDarkMode).toBe(false);
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  it('should toggle theme from light to dark', () => {
    const { result } = renderHook(() => useDarkMode());

    // Set to light first
    act(() => {
      result.current.setTheme('light');
    });

    expect(result.current.isDarkMode).toBe(false);

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.isDarkMode).toBe(true);
  });

  it('should toggle theme from dark to light', () => {
    const { result } = renderHook(() => useDarkMode());

    // Set to dark first
    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.isDarkMode).toBe(true);

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.isDarkMode).toBe(false);
  });

  it('should cycle through themes starting from light', () => {
    const { result } = renderHook(() => useDarkMode());

    // Set to light
    act(() => {
      result.current.setTheme('light');
    });
    expect(result.current.theme).toBe('light');

    // Cycle: light -> dark
    act(() => {
      result.current.cycleTheme();
    });
    expect(result.current.theme).toBe('dark');

    // Cycle: dark -> system
    act(() => {
      result.current.cycleTheme();
    });
    expect(result.current.theme).toBe('system');

    // Cycle: system -> light
    act(() => {
      result.current.cycleTheme();
    });
    expect(result.current.theme).toBe('light');
  });

  it('should persist theme preference to localStorage', () => {
    const { result } = renderHook(() => useDarkMode());

    act(() => {
      result.current.setTheme('dark');
    });

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('should provide resolvedTheme for dark mode', () => {
    const { result } = renderHook(() => useDarkMode());

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.resolvedTheme).toBe('dark');
    expect(result.current.isDarkMode).toBe(true);
  });

  it('should provide resolvedTheme for light mode', () => {
    const { result } = renderHook(() => useDarkMode());

    act(() => {
      result.current.setTheme('light');
    });

    expect(result.current.resolvedTheme).toBe('light');
    expect(result.current.isDarkMode).toBe(false);
  });
});
