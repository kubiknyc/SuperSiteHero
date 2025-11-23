import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn (className merger)', () => {
  it('should merge simple class names', () => {
    const result = cn('foo', 'bar');
    expect(result).toBe('foo bar');
  });

  it('should handle conditional classes with objects', () => {
    const result = cn('foo', { bar: true, baz: false });
    expect(result).toBe('foo bar');
  });

  it('should handle arrays of classes', () => {
    const result = cn(['foo', 'bar'], 'baz');
    expect(result).toBe('foo bar baz');
  });

  it('should merge Tailwind classes with proper precedence', () => {
    // Later classes should override earlier ones
    const result = cn('p-4', 'p-8');
    expect(result).toBe('p-8');
  });

  it('should handle conflicting Tailwind classes', () => {
    const result = cn('text-red-500', 'text-blue-500');
    expect(result).toBe('text-blue-500');
  });

  it('should preserve non-conflicting Tailwind classes', () => {
    const result = cn('text-red-500 font-bold', 'text-blue-500');
    expect(result).toBe('font-bold text-blue-500');
  });

  it('should handle undefined and null values', () => {
    const result = cn('foo', undefined, null, 'bar');
    expect(result).toBe('foo bar');
  });

  it('should handle empty strings', () => {
    const result = cn('foo', '', 'bar');
    expect(result).toBe('foo bar');
  });

  it('should handle complex Tailwind utilities', () => {
    const result = cn(
      'px-4 py-2',
      'hover:bg-gray-100',
      'focus:outline-none focus:ring-2'
    );
    expect(result).toContain('px-4');
    expect(result).toContain('py-2');
    expect(result).toContain('hover:bg-gray-100');
    expect(result).toContain('focus:outline-none');
    expect(result).toContain('focus:ring-2');
  });

  it('should handle responsive Tailwind classes', () => {
    const result = cn('md:p-4', 'lg:p-8');
    expect(result).toContain('md:p-4');
    expect(result).toContain('lg:p-8');
  });

  it('should override conflicting responsive classes', () => {
    const result = cn('md:text-red-500', 'md:text-blue-500');
    expect(result).toBe('md:text-blue-500');
  });

  it('should handle multiple conditional objects', () => {
    const isActive = true;
    const isDisabled = false;
    const result = cn(
      'base-class',
      { 'active-class': isActive },
      { 'disabled-class': isDisabled }
    );
    expect(result).toBe('base-class active-class');
  });

  it('should handle nested arrays', () => {
    const result = cn(['foo', ['bar', 'baz']], 'qux');
    expect(result).toBe('foo bar baz qux');
  });

  it('should handle variant pattern common in UI libraries', () => {
    const variant = 'primary';
    const size = 'lg';
    const result = cn(
      'button-base',
      variant === 'primary' && 'bg-blue-500 text-white',
      size === 'lg' && 'px-6 py-3 text-lg'
    );
    expect(result).toContain('button-base');
    expect(result).toContain('bg-blue-500');
    expect(result).toContain('text-white');
    expect(result).toContain('px-6');
    expect(result).toContain('py-3');
    expect(result).toContain('text-lg');
  });

  it('should handle no arguments', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('should handle only falsy values', () => {
    const result = cn(false, null, undefined, '');
    expect(result).toBe('');
  });

  it('should handle dark mode classes', () => {
    const result = cn('bg-white dark:bg-gray-800', 'text-black dark:text-white');
    expect(result).toContain('bg-white');
    expect(result).toContain('dark:bg-gray-800');
    expect(result).toContain('text-black');
    expect(result).toContain('dark:text-white');
  });

  it('should handle arbitrary values in Tailwind', () => {
    const result = cn('text-[#1da1f2]', 'text-[#ff0000]');
    expect(result).toBe('text-[#ff0000]');
  });

  it('should handle important modifier', () => {
    const result = cn('!text-red-500', 'text-blue-500');
    expect(result).toContain('!text-red-500');
    expect(result).toContain('text-blue-500');
  });

  it('should merge classes from component variants pattern', () => {
    const variants = {
      variant: {
        default: 'bg-gray-100',
        primary: 'bg-blue-500',
        destructive: 'bg-red-500',
      },
      size: {
        sm: 'px-2 py-1 text-sm',
        md: 'px-4 py-2',
        lg: 'px-6 py-3 text-lg',
      },
    };

    const result = cn(
      'base-button',
      variants.variant.primary,
      variants.size.lg
    );

    expect(result).toContain('base-button');
    expect(result).toContain('bg-blue-500');
    expect(result).toContain('px-6');
    expect(result).toContain('py-3');
    expect(result).toContain('text-lg');
  });
});
