// Polished Variant 1: Professional Blueprint
// Clean, corporate-ready design with refined typography and spacing
// Fully aligned with JobSight Design System

import { Link } from 'react-router-dom'
import { TrendingUp, Users, FileText, AlertCircle, Building2, ArrowLeft, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function PolishedVariant1Professional() {
  const stats = [
    { label: 'Active Projects', value: '12', target: 15, change: '+2', trend: 'up', icon: Building2, color: '#1E40AF' },
    { label: 'Team Members', value: '48', target: 50, change: '+5', trend: 'up', icon: Users, color: '#10B981' },
    { label: 'Pending Reports', value: '8', target: 0, change: '-3', trend: 'down', icon: FileText, color: '#FBBF24' },
    { label: 'Open RFIs', value: '23', target: 15, change: '+4', trend: 'up', icon: AlertCircle, color: '#EF4444' }
  ]

  const projects = [
    { name: 'Downtown Tower', progress: 68, status: 'On Track', dueDate: 'Mar 15, 2024', budget: 92 },
    { name: 'Harbor Bridge', progress: 45, status: 'At Risk', dueDate: 'Apr 22, 2024', budget: 88 },
    { name: 'Medical Center', progress: 82, status: 'Ahead', dueDate: 'Feb 28, 2024', budget: 96 }
  ]

  const activities = [
    { user: 'Sarah Johnson', action: 'completed daily report', project: 'Downtown Tower', time: '2h ago', type: 'report' },
    { user: 'Mike Chen', action: 'uploaded 12 photos', project: 'Harbor Bridge', time: '4h ago', type: 'photos' },
    { user: 'Alex Rivera', action: 'submitted RFI #156', project: 'Medical Center', time: '5h ago', type: 'rfi' }
  ]

  return (
    <div className="min-h-screen bg-surface dark:bg-gray-950 font-sans">
      {/* Blueprint grid pattern overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-30 dark:opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(30, 64, 175, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(30, 64, 175, 0.02) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px'
        }}
        aria-hidden="true"
      />
      <div className="relative">
      {/* Header */}
      <header
        className="sticky top-0 z-50 bg-card dark:bg-background border-b border-border dark:border-border shadow-sm transition-colors"
        role="banner"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 md:px-6 md:py-4">
          <div className="flex justify-between items-center gap-4">
            <Link
              to="/blueprint-samples/variants"
              className="inline-flex items-center gap-2 text-sm font-medium text-secondary dark:text-disabled
                         hover:text-primary dark:hover:text-blue-400
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600
                         focus-visible:ring-offset-2 dark:ring-offset-gray-950
                         rounded-md px-3 py-2.5 min-h-[44px] md:min-h-0
                         transition-colors"
              aria-label="Back to Blueprint Variants"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Back to Variants</span>
            </Link>

            <div
              className="px-3 py-2 bg-blue-50 dark:bg-blue-950/30 text-primary-hover dark:text-blue-300
                         text-xs font-semibold rounded-md tracking-wide border border-blue-100 dark:border-blue-900"
              role="status"
              aria-label="Current variant"
            >
              VARIANT 1: PROFESSIONAL
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-8">
        {/* Page Title */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3 mb-3">
            {/* Blue accent bar - decorative */}
            <div
              className="w-1 h-10 bg-primary-hover dark:bg-primary rounded-sm flex-shrink-0"
              aria-hidden="true"
            />

            {/* Main heading */}
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-foreground dark:text-gray-50
                           font-['DM_Sans'] tracking-tight">
              Dashboard
            </h1>
          </div>

          {/* Welcome text */}
          <p className="text-sm text-secondary dark:text-disabled pl-0 md:pl-5">
            Welcome back, John • {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon
            const percentage = (parseInt(stat.value) / stat.target) * 100

            return (
              <button
                key={stat.label}
                type="button"
                className="group relative bg-card dark:bg-background
                           border border-border dark:border-border
                           rounded-lg p-4 md:p-6
                           transition-all duration-200
                           hover:border-blue-700 hover:shadow-lg hover:shadow-blue-700/10
                           dark:hover:border-primary dark:hover:shadow-blue-600/20
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600
                           focus-visible:ring-offset-2 dark:ring-offset-gray-950
                           min-h-[44px] md:min-h-0 text-left w-full"
                onClick={() => {/* Handle stat card click */}}
                aria-label={`${stat.label}: ${stat.value} out of ${stat.target}, ${stat.change} change`}
              >
                {/* Card header with icon and trend badge */}
                <div className="flex justify-between items-start mb-4 gap-3">
                  {/* Icon container */}
                  <div
                    className="w-12 h-12 md:w-14 md:h-14 rounded-lg flex items-center justify-center
                               border-2 flex-shrink-0"
                    style={{
                      backgroundColor: `${stat.color}10`,
                      borderColor: `${stat.color}20`
                    }}
                    aria-hidden="true"
                  >
                    <Icon
                      className="w-5 h-5 md:w-6 md:h-6"
                      style={{ color: stat.color, strokeWidth: 2 }}
                    />
                  </div>

                  {/* Trend badge */}
                  <div
                    className={cn(
                      "px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 border",
                      stat.trend === 'up'
                        ? "bg-success-light text-success-dark border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900"
                        : "bg-error-light text-error-dark border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900"
                    )}
                    aria-label={`Trend: ${stat.change}`}
                  >
                    <TrendingUp
                      className="w-3 h-3"
                      style={{ transform: stat.trend === 'down' ? 'rotate(180deg)' : 'none' }}
                      aria-hidden="true"
                    />
                    <span>{stat.change}</span>
                  </div>
                </div>

                {/* Stat details */}
                <div className="mb-4">
                  {/* Label */}
                  <p className="text-sm font-medium text-secondary dark:text-disabled mb-2">
                    {stat.label}
                  </p>

                  {/* Value and target */}
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl md:text-4xl font-semibold text-foreground dark:text-gray-50 leading-none">
                      {stat.value}
                    </p>
                    <p className="text-sm text-muted dark:text-muted font-medium">
                      / {stat.target}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="relative">
                  {/* Background track */}
                  <div className="w-full h-1.5 bg-muted dark:bg-surface rounded-full overflow-hidden">
                    {/* Progress fill */}
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: stat.color
                      }}
                      role="progressbar"
                      aria-valuenow={parseInt(stat.value)}
                      aria-valuemin={0}
                      aria-valuemax={stat.target}
                      aria-label={`Progress: ${percentage.toFixed(0)}%`}
                    />
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 md:gap-6">
          {/* Active Projects */}
          <section
            className="bg-card dark:bg-background border border-border dark:border-border
                       rounded-lg p-4 md:p-6 transition-colors"
            aria-labelledby="active-projects-heading"
          >
            {/* Section Header */}
            <div className="flex justify-between items-center mb-4 md:mb-6 gap-4">
              <h2
                id="active-projects-heading"
                className="text-base md:text-lg font-semibold text-foreground dark:text-gray-50
                           font-['DM_Sans']"
              >
                Active Projects
              </h2>

              <button
                type="button"
                className="text-sm font-medium text-primary-hover dark:text-blue-400
                           hover:text-blue-800 dark:hover:text-blue-300
                           hover:underline
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600
                           focus-visible:ring-offset-2 dark:ring-offset-gray-950
                           rounded-md px-3 py-2.5 min-h-[44px] md:min-h-0 transition-colors"
                aria-label="View all projects"
              >
                View All
              </button>
            </div>

            {/* Projects List */}
            <ul className="flex flex-col gap-3 md:gap-4 list-none">
              {projects.map((project) => (
                <li
                  key={project.name}
                  className="group p-3 md:p-4 bg-surface dark:bg-surface/50
                             border border-border dark:border-gray-700
                             rounded-lg transition-all duration-150
                             hover:bg-card dark:hover:bg-surface
                             hover:border-border dark:hover:border-gray-600
                             hover:shadow-md
                             focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2
                             dark:ring-offset-gray-950"
                >
                  {/* Make entire card clickable */}
                  <a
                    href={`#/projects/${project.name.toLowerCase().replace(/\s+/g, '-')}`}
                    className="block focus:outline-none min-h-[44px]"
                    aria-label={`View project: ${project.name}`}
                  >
                    {/* Project header */}
                    <div className="flex justify-between items-start mb-3 gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm md:text-base font-semibold text-foreground dark:text-gray-50
                                       mb-1 group-hover:text-primary-hover dark:group-hover:text-blue-400
                                       transition-colors truncate">
                          {project.name}
                        </h3>

                        {/* Project metadata */}
                        <div className="flex items-center gap-3 md:gap-4 text-xs text-secondary dark:text-disabled
                                       flex-wrap">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                            <time dateTime={project.dueDate}>{project.dueDate}</time>
                          </span>
                          <span aria-label={`Budget: ${project.budget} percent`}>
                            Budget: {project.budget}%
                          </span>
                        </div>
                      </div>

                      {/* Status badge */}
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap flex-shrink-0",
                          project.status === 'On Track' && "bg-success-light text-success-dark dark:bg-green-950/30 dark:text-green-400",
                          project.status === 'Ahead' && "bg-blue-50 text-primary-hover dark:bg-blue-950/30 dark:text-blue-400",
                          project.status === 'At Risk' && "bg-error-light text-error-dark dark:bg-red-950/30 dark:text-red-400"
                        )}
                        role="status"
                        aria-label={`Project status: ${project.status}`}
                      >
                        {project.status}
                      </span>
                    </div>

                    {/* Progress section */}
                    <div>
                      <div className="flex justify-between mb-2 text-xs">
                        <span className="text-secondary dark:text-disabled font-medium">
                          Progress
                        </span>
                        <span className="text-foreground dark:text-gray-50 font-semibold">
                          {project.progress}%
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-1.5 bg-muted dark:bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-hover dark:bg-primary rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${project.progress}%` }}
                          role="progressbar"
                          aria-valuenow={project.progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Project progress: ${project.progress}%`}
                        />
                      </div>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          {/* Recent Activity */}
          <section
            className="bg-card dark:bg-background border border-border dark:border-border
                       rounded-lg p-4 md:p-6 transition-colors"
            aria-labelledby="recent-activity-heading"
          >
            <h2
              id="recent-activity-heading"
              className="text-base md:text-lg font-semibold text-foreground dark:text-gray-50
                         font-['DM_Sans'] mb-4 md:mb-6"
            >
              Recent Activity
            </h2>

            {/* Activity Feed */}
            <div className="flex flex-col gap-4" role="feed" aria-label="Recent project activity">
              {activities.map((activity, i) => (
                <article
                  key={i}
                  className="flex gap-3 group"
                  role="article"
                >
                  {/* User avatar - initials */}
                  <div
                    className="w-8 h-8 md:w-9 md:h-9 bg-blue-50 dark:bg-blue-950/30
                               rounded-full flex items-center justify-center flex-shrink-0
                               border border-blue-100 dark:border-blue-900"
                    aria-hidden="true"
                  >
                    <span className="text-xs font-semibold text-primary-hover dark:text-blue-400">
                      {activity.user.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>

                  {/* Activity content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground dark:text-gray-50 mb-1 leading-relaxed">
                      <span className="font-semibold">{activity.user}</span>{' '}
                      <span className="text-secondary dark:text-disabled">{activity.action}</span>
                    </p>

                    <p className="text-xs text-muted dark:text-muted">
                      <span>{activity.project}</span>
                      <span className="mx-1.5" aria-hidden="true">•</span>
                      <time dateTime={activity.time}>{activity.time}</time>
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
      </div>
    </div>
  )
}
