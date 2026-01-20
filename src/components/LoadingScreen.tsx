/**
 * Branded loading screen for JobSight - REDESIGNED
 * Industrial modern aesthetic with dramatic animations
 * Uses actual JobSight logo from brand package
 */

import { LogoIcon } from '@/components/brand/Logo';

interface LoadingScreenProps {
  message?: string;
  className?: string;
}

/**
 * Full-screen loading component with dramatic industrial presentation
 */
export function LoadingScreen({ message = 'Loading JobSight...', className }: LoadingScreenProps) {
  return (
    <div className={`fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 ${className || ''}`}>
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(30, 64, 175, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(30, 64, 175, 0.3) 1px, transparent 1px)
            `,
            // Note: Cannot use CSS variables in inline backgroundImage animations.
            // This rgba(30, 64, 175, 0.3) matches --primary (hsl 217 70% 38%) for consistency.
            // Browser limitation: CSS custom properties don't work inside linear-gradient() in inline styles.
            backgroundSize: '40px 40px',
            animation: 'gridSlide 20s linear infinite',
          }}
        />
      </div>

      {/* Main loading content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo with dramatic glow effect */}
        <div className="relative">
          {/* Outer glow rings */}
          <div
            className="absolute inset-0 -m-12 bg-primary dark:bg-primary/20 blur-3xl rounded-full"
            style={{
              animation: 'pulseGlow 3s ease-in-out infinite',
            }}
          />
          <div
            className="absolute inset-0 -m-8 bg-primary dark:bg-primary/30 blur-2xl rounded-full"
            style={{
              animation: 'pulseGlow 3s ease-in-out infinite 0.5s',
            }}
          />

          {/* Logo container with construction loader animation */}
          <div
            className="relative rounded-2xl bg-gradient-to-br from-primary via-primary-700 to-primary-800 p-8 shadow-2xl shadow-primary/50 dark:from-primary dark:via-primary-700 dark:to-primary-800 dark:shadow-primary/50"
            style={{
              animation: 'construct 2s ease-in-out infinite',
            }}
          >
            <div className="absolute inset-0 bg-grid-white/5 rounded-2xl" />
            <LogoIcon className="relative w-24 h-24 drop-shadow-2xl" />
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-12 w-64 h-1 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary-500 rounded-full dark:from-primary dark:to-primary-500"
            style={{
              animation: 'progressSlide 1.5s ease-in-out infinite',
            }}
          />
        </div>

        {/* Loading message */}
        {message && (
          <p
            className="mt-8 text-white text-lg font-semibold uppercase tracking-wide"
            style={{
              animation: 'fadeInUp 0.6s ease-out',
            }}
          >
            {message}
          </p>
        )}

        {/* Construction-themed status dots */}
        <div className="flex items-center gap-2 mt-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-primary dark:bg-primary rounded-full"
              style={{
                animation: `bounce 1.4s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>

        {/* Tagline */}
        <p
          className="mt-6 text-disabled text-sm uppercase tracking-[0.2em] font-medium"
          style={{
            animation: 'fadeInUp 0.8s ease-out 0.2s both',
          }}
        >
          Construction Field Management
        </p>
      </div>

      {/* Inline styles for animations */}
      <style>{`
        @keyframes gridSlide {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(40px, 40px);
          }
        }

        @keyframes pulseGlow {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.1);
          }
        }

        @keyframes construct {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          25% {
            transform: translateY(-8px) rotate(2deg);
          }
          50% {
            transform: translateY(0) rotate(0deg);
          }
          75% {
            transform: translateY(-8px) rotate(-2deg);
          }
        }

        @keyframes progressSlide {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Inline loading spinner with Professional Blueprint branding
 */
export function LoadingSpinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
  };

  return (
    <div className={`${sizeClasses[size]} ${className || ''}`}>
      <svg
        className="animate-spin text-primary dark:text-primary-400"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
}

/**
 * Glass morphism loading overlay
 */
export function LoadingOverlay({ message, show }: { message?: string; show: boolean }) {
  if (!show) {return null;}

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-md">
      <div className="bg-card/90 dark:bg-background/90 backdrop-blur-xl rounded-2xl p-10 shadow-2xl border border-white/20 dark:border-gray-700/50 flex flex-col items-center max-w-sm">
        {/* Mini logo with glow */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-primary dark:bg-primary/20 blur-xl rounded-full" />
          <div className="relative rounded-xl bg-gradient-to-br from-primary to-primary-700 p-3 shadow-lg shadow-primary/30 dark:from-primary dark:to-primary-700 dark:shadow-primary/30">
            <LogoIcon className="w-12 h-12" />
          </div>
        </div>

        {/* Spinner */}
        <LoadingSpinner size="lg" className="mb-4" />

        {/* Message */}
        {message && (
          <p className="text-secondary dark:text-gray-300 font-semibold text-center">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Minimal inline loader for buttons
 */
export function ButtonLoader({ className }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-1 ${className || ''}`}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 bg-current rounded-full"
          style={{
            animation: `bounce 1.4s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  );
}

export default LoadingScreen;
