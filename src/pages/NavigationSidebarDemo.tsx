// File: src/pages/NavigationSidebarDemo.tsx
// Demo page for the new Modern Minimal Navigation Sidebar

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { NavigationSidebar } from '@/components/layout/sidebar'
import { Moon, Sun, Palette } from 'lucide-react'

export function NavigationSidebarDemo() {
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [notificationCount, setNotificationCount] = useState(5)

  const handleThemeToggle = useCallback(() => {
    setIsDarkMode((prev) => !prev)
    document.documentElement.classList.toggle('dark')
  }, [])

  const handleLogout = useCallback(() => {
    console.log('Logout clicked')
  }, [])

  const handleSearchTrigger = useCallback(() => {
    console.log('Search triggered - would open command palette')
  }, [])

  // Demo user
  const demoUser = {
    name: 'Alex Johnson',
    email: 'alex.johnson@construction.co',
    role: 'Superintendent',
  }

  return (
    <div className={cn('flex h-screen', isDarkMode && 'dark')}>
      {/* Navigation Sidebar */}
      <NavigationSidebar
        user={demoUser}
        isAdmin={true}
        isDarkMode={isDarkMode}
        onThemeToggle={handleThemeToggle}
        onLogout={handleLogout}
        onSearchTrigger={handleSearchTrigger}
        notificationCount={notificationCount}
      />

      {/* Main Content Area */}
      <main
        className={cn(
          'flex-1 overflow-auto',
          'bg-gradient-to-br from-slate-100 to-slate-200',
          'dark:from-slate-900 dark:to-slate-950'
        )}
      >
        {/* Demo Controls */}
        <div className="p-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-slate-100 mb-2">
              Navigation Sidebar Demo
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
              Modern Minimal redesign with all 60+ features organized into
              logical groups.
            </p>

            {/* Controls Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Demo Controls
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Theme Toggle */}
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                    Theme
                  </label>
                  <button
                    onClick={handleThemeToggle}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg',
                      'bg-slate-100 dark:bg-slate-700',
                      'text-slate-700 dark:text-slate-300',
                      'hover:bg-slate-200 dark:hover:bg-slate-600',
                      'transition-colors'
                    )}
                  >
                    {isDarkMode ? (
                      <>
                        <Moon className="h-4 w-4" />
                        Dark Mode
                      </>
                    ) : (
                      <>
                        <Sun className="h-4 w-4" />
                        Light Mode
                      </>
                    )}
                  </button>
                </div>

                {/* Notification Count */}
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                    Notification Count
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setNotificationCount((c) => Math.max(0, c - 1))}
                      className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                    >
                      -
                    </button>
                    <span className="px-4 py-2 min-w-[3rem] text-center font-mono text-slate-900 dark:text-slate-100">
                      {notificationCount}
                    </span>
                    <button
                      onClick={() => setNotificationCount((c) => c + 1)}
                      className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Features Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Features
              </h2>

              <ul className="space-y-3 text-slate-600 dark:text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>
                    <strong className="text-slate-900 dark:text-slate-200">
                      Zone-based layout:
                    </strong>{' '}
                    Command Strip (search + actions), Navigation Canvas, User
                    Dock
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>
                    <strong className="text-slate-900 dark:text-slate-200">
                      60+ features:
                    </strong>{' '}
                    All app features organized into 10 logical groups
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>
                    <strong className="text-slate-900 dark:text-slate-200">
                      Framer Motion animations:
                    </strong>{' '}
                    Spring physics, staggered reveals, micro-interactions
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>
                    <strong className="text-slate-900 dark:text-slate-200">
                      Collapsible:
                    </strong>{' '}
                    Click toggle button or use ⌘B keyboard shortcut
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>
                    <strong className="text-slate-900 dark:text-slate-200">
                      Tooltips:
                    </strong>{' '}
                    Full labels shown on hover when collapsed
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>
                    <strong className="text-slate-900 dark:text-slate-200">
                      Quick Create:
                    </strong>{' '}
                    Fast access to create daily reports, RFIs, punch items
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>
                    <strong className="text-slate-900 dark:text-slate-200">
                      User Dock:
                    </strong>{' '}
                    Profile, settings, admin panel, portal links
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>
                    <strong className="text-slate-900 dark:text-slate-200">
                      Reduced motion support:
                    </strong>{' '}
                    Respects prefers-reduced-motion
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>
                    <strong className="text-slate-900 dark:text-slate-200">
                      State persistence:
                    </strong>{' '}
                    Expanded groups saved to localStorage
                  </span>
                </li>
              </ul>
            </div>

            {/* Typography Reference */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mt-8">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Typography System
              </h2>

              <div className="space-y-4">
                <div>
                  <span className="text-[11px] font-display font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Group Headers (DM Sans, 11px, uppercase)
                  </span>
                </div>
                <div>
                  <span className="text-sm font-display font-medium text-slate-200">
                    Nav Labels (DM Sans, 14px, medium)
                  </span>
                </div>
                <div>
                  <span className="font-mono text-[10px] font-medium tabular-nums text-blue-400">
                    12 Badge Numbers (JetBrains Mono, 10px)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default NavigationSidebarDemo
