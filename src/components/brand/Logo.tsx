// File: src/components/brand/Logo.tsx
// Reusable JobSight logo component with multiple variants
// Supports light/dark mode and different sizes

import { cn } from '@/lib/utils';

interface LogoProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Show text alongside icon */
  showText?: boolean;
  /** Variant for different backgrounds */
  variant?: 'default' | 'light' | 'dark' | 'icon-only';
  /** Additional className */
  className?: string;
}

const sizeClasses = {
  sm: {
    icon: 'w-6 h-6',
    text: 'text-sm',
    gap: 'gap-1.5',
  },
  md: {
    icon: 'w-8 h-8',
    text: 'text-base',
    gap: 'gap-2',
  },
  lg: {
    icon: 'w-10 h-10',
    text: 'text-lg',
    gap: 'gap-2.5',
  },
  xl: {
    icon: 'w-14 h-14',
    text: 'text-2xl',
    gap: 'gap-3',
  },
};

/**
 * JobSight Logo Icon - Hard hat with gear
 */
export function LogoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Gear/Cog - adapts to light/dark */}
      <circle cx="50" cy="55" r="30" className="fill-gray-200 dark:fill-gray-600 stroke-gray-300 dark:stroke-gray-500" strokeWidth="2"/>
      <circle cx="50" cy="55" r="15" className="fill-gray-100 dark:fill-gray-700 stroke-gray-300 dark:stroke-gray-500" strokeWidth="2"/>

      {/* Hard Hat - orange stays consistent */}
      <ellipse cx="50" cy="42" rx="32" ry="20" fill="#F97316"/>
      <ellipse cx="50" cy="38" rx="24" ry="12" fill="#FB923C" opacity="0.6"/>
      <path
        d="M15,50 Q15,60 25,62 L75,62 Q85,60 85,50 L85,47 Q85,42 75,45 L75,52 Q75,56 68,58 L32,58 Q25,56 25,52 L25,45 Q15,42 15,47 Z"
        fill="#EA580C"
      />
      {/* Highlight */}
      <ellipse cx="38" cy="36" rx="10" ry="6" fill="white" opacity="0.3"/>
    </svg>
  );
}

/**
 * JobSight Logo Icon for dark backgrounds (sidebar, etc.)
 */
export function LogoIconLight({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Gear/Cog - white/light for dark backgrounds */}
      <circle cx="50" cy="55" r="30" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
      <circle cx="50" cy="55" r="15" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="2"/>

      {/* Hard Hat - white for dark backgrounds */}
      <ellipse cx="50" cy="42" rx="32" ry="20" fill="white"/>
      <ellipse cx="50" cy="38" rx="24" ry="12" fill="#F9FAFB" opacity="0.8"/>
      <path
        d="M15,50 Q15,60 25,62 L75,62 Q85,60 85,50 L85,47 Q85,42 75,45 L75,52 Q75,56 68,58 L32,58 Q25,56 25,52 L25,45 Q15,42 15,47 Z"
        fill="#E5E7EB"
      />
      {/* Highlight */}
      <ellipse cx="38" cy="36" rx="10" ry="6" fill="white" opacity="0.5"/>
    </svg>
  );
}

/**
 * Full JobSight logo with icon and text
 */
export function Logo({
  size = 'md',
  showText = true,
  variant = 'default',
  className
}: LogoProps) {
  const sizes = sizeClasses[size];
  const isIconOnly = variant === 'icon-only';
  const isDark = variant === 'dark';
  const isLight = variant === 'light';

  if (isIconOnly) {
    return (
      <div className={cn('flex items-center', className)}>
        <LogoIcon className={sizes.icon} />
      </div>
    );
  }

  return (
    <div className={cn('flex items-center', sizes.gap, className)}>
      {isDark ? (
        <LogoIconLight className={sizes.icon} />
      ) : (
        <LogoIcon className={sizes.icon} />
      )}

      {showText && (
        <span className={cn('font-bold', sizes.text)}>
          <span className={cn(
            isDark ? 'text-white' : 'text-orange-500'
          )}>
            Job
          </span>
          <span className={cn(
            isDark ? 'text-white' : isLight ? 'text-white' : 'text-gray-900 dark:text-white'
          )}>
            Sight
          </span>
        </span>
      )}
    </div>
  );
}

/**
 * Logo specifically for the sidebar (dark background)
 */
export function SidebarLogo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="rounded-lg bg-orange-500 p-1.5">
        <LogoIconLight className="w-6 h-6" />
      </div>
      <div>
        <h1 className="font-bold text-lg text-white">
          <span className="text-orange-400">Job</span>
          <span>Sight</span>
        </h1>
        <p className="text-xs text-gray-400">Field Management</p>
      </div>
    </div>
  );
}

/**
 * Logo for login/auth pages
 */
export function AuthLogo({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <div className="rounded-2xl bg-orange-100 dark:bg-orange-900/30 p-4">
        <LogoIcon className="w-16 h-16" />
      </div>
      <h1 className="text-3xl font-bold">
        <span className="text-orange-500">Job</span>
        <span className="text-gray-900 dark:text-white">Sight</span>
      </h1>
    </div>
  );
}

/**
 * Compact logo for headers/navbars
 */
export function CompactLogo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <LogoIcon className="w-7 h-7" />
      <span className="font-bold text-base">
        <span className="text-orange-500">Job</span>
        <span className="text-gray-900 dark:text-white">Sight</span>
      </span>
    </div>
  );
}

export default Logo;
