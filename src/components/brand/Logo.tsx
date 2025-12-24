// File: src/components/brand/Logo.tsx
// JobSight Logo Component - Industrial Modern Design
// Uses actual logo files from brand package

import { cn } from '@/lib/utils';

interface LogoProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Show text alongside icon */
  showText?: boolean;
  /** Variant for different backgrounds */
  variant?: 'default' | 'light' | 'dark' | 'icon-only';
  /** Additional className */
  className?: string;
  /** Enable hover animation */
  animated?: boolean;
}

const sizeClasses = {
  sm: {
    container: 'h-6',
    icon: 'h-6',
    text: 'text-sm',
    gap: 'gap-2',
  },
  md: {
    container: 'h-8',
    icon: 'h-8',
    text: 'text-base',
    gap: 'gap-2.5',
  },
  lg: {
    container: 'h-12',
    icon: 'h-12',
    text: 'text-xl',
    gap: 'gap-3',
  },
  xl: {
    container: 'h-16',
    icon: 'h-16',
    text: 'text-2xl',
    gap: 'gap-4',
  },
  '2xl': {
    container: 'h-24',
    icon: 'h-24',
    text: 'text-4xl',
    gap: 'gap-5',
  },
};

/**
 * JobSight Logo Icon - Actual brand icon from logo package
 */
export function LogoIcon({ className, animated = false }: { className?: string; animated?: boolean }) {
  return (
    <img
      src="/jobsight-icon.png"
      alt="JobSight"
      className={cn(
        'object-contain transition-transform duration-300',
        animated && 'hover:scale-105 hover:rotate-3',
        className
      )}
    />
  );
}

/**
 * JobSight Logo Icon for dark backgrounds (white version)
 */
export function LogoIconLight({ className, animated = false }: { className?: string; animated?: boolean }) {
  return (
    <img
      src="/jobsight-icon-white.png"
      alt="JobSight"
      className={cn(
        'object-contain transition-transform duration-300',
        animated && 'hover:scale-105',
        className
      )}
    />
  );
}

/**
 * Full JobSight logo with horizontal layout (icon + text)
 */
export function Logo({
  size = 'md',
  showText = true,
  variant = 'default',
  className,
  animated = false
}: LogoProps) {
  const sizes = sizeClasses[size];
  const isIconOnly = variant === 'icon-only';
  const isDark = variant === 'dark';

  if (isIconOnly) {
    return (
      <div className={cn('flex items-center', className)}>
        <LogoIcon className={sizes.icon} animated={animated} />
      </div>
    );
  }

  // Use the horizontal logo lockup for full logo display
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <img
        src="/jobsight-logo.png"
        alt="JobSight - Construction Field Management"
        className={cn(
          sizes.container,
          'object-contain transition-all duration-300',
          animated && 'hover:scale-105',
          isDark && 'brightness-0 invert'
        )}
      />
    </div>
  );
}

/**
 * Logo specifically for the sidebar (dark background) - Professional Blueprint
 */
export function SidebarLogo({ className, animated = true }: { className?: string; animated?: boolean }) {
  return (
    <div className={cn('flex items-center gap-3 group', className)}>
      {/* Monochrome icon */}
      <div className="relative">
        <div className="relative rounded-xl p-2.5">
          <LogoIconLight
            className="h-7 w-7 drop-shadow-sm"
            animated={animated}
          />
        </div>
      </div>

      {/* Text with industrial styling */}
      <div className="relative">
        <img
          src="/jobsight-logo-white.png"
          alt="JobSight"
          className="h-8 object-contain"
        />
        <p className="text-[10px] text-disabled uppercase tracking-widest font-medium mt-0.5 letterspacing-tight">
          Field Management
        </p>
      </div>
    </div>
  );
}

/**
 * Logo for login/auth pages - Professional Blueprint
 */
export function AuthLogo({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700', className)}>
      {/* Dramatic icon presentation */}
      <div className="relative">
        {/* Outer glow rings */}
        <div className="absolute inset-0 -m-8 bg-primary/[0.18] blur-3xl rounded-full animate-pulse" />
        <div className="absolute inset-0 -m-4 border-2 border-primary/30 rounded-2xl animate-pulse" style={{ animationDelay: '0.5s' }} />

        {/* Icon container */}
        <div className="relative rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 p-6 shadow-2xl shadow-blue-600/30">
          <div className="absolute inset-0 bg-grid-white/5 rounded-2xl" />
          <LogoIconLight className="relative h-20 w-20 drop-shadow-2xl" />
        </div>
      </div>

      {/* Brand text */}
      <div className="text-center space-y-2">
        <img
          src="/jobsight-logo.png"
          alt="JobSight"
          className="h-12 object-contain mx-auto dark:brightness-0 dark:invert"
        />
        <p className="text-sm text-muted dark:text-disabled uppercase tracking-[0.2em] font-medium">
          Construction Field Management
        </p>
      </div>
    </div>
  );
}

/**
 * Compact logo for headers/navbars - Professional Blueprint
 */
export function CompactLogo({ className, animated = true }: { className?: string; animated?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5 group', className)}>
      <div className="relative">
        <LogoIcon
          className="relative h-8 w-8"
          animated={animated}
        />
      </div>
      <img
        src="/jobsight-logo.png"
        alt="JobSight"
        className="h-7 object-contain"
      />
    </div>
  );
}

/**
 * Minimal icon-only logo with optional badge
 */
export function LogoIconWithBadge({
  badge,
  className
}: {
  badge?: string;
  className?: string;
}) {
  return (
    <div className={cn('relative inline-flex', className)}>
      <LogoIcon className="h-10 w-10" />
      {badge && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow-lg">
          {badge}
        </span>
      )}
    </div>
  );
}

export default Logo;
