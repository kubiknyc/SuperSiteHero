/**
 * Subcontractor Portal Layout
 * Provides navigation and structure for the subcontractor portal
 */

import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useSubcontractorStats, useCanViewDailyReports } from '../hooks'
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  CheckSquare,
  FolderOpen,
  AlertTriangle,
  Building2,
  LogOut,
  CalendarDays,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/AuthContext'
import { Button } from '@/components/ui/button'

interface NavItemProps {
  to: string
  icon: React.ReactNode
  label: string
  count?: number
  warning?: boolean
}

function NavItem({ to, icon, label, count, warning }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )
      }
    >
      {icon}
      <span className="flex-1">{label}</span>
      {count !== undefined && count > 0 && (
        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            warning ? 'bg-amber-100 text-amber-800' : 'bg-muted text-muted-foreground'
          )}
        >
          {count}
        </span>
      )}
    </NavLink>
  )
}

export function SubcontractorLayout() {
  const { userProfile, signOut } = useAuth()
  const { data: stats } = useSubcontractorStats()
  const { data: canViewDailyReports } = useCanViewDailyReports()
  const location = useLocation()

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <div>
              <h2 className="font-semibold text-sm">Subcontractor Portal</h2>
              <p className="text-xs text-muted-foreground truncate">
                {userProfile?.first_name} {userProfile?.last_name}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <NavItem
            to="/portal"
            icon={<LayoutDashboard className="h-4 w-4" />}
            label="Dashboard"
          />
          <NavItem
            to="/portal/projects"
            icon={<FolderOpen className="h-4 w-4" />}
            label="My Projects"
          />
          <NavItem
            to="/portal/bids"
            icon={<FileText className="h-4 w-4" />}
            label="Pending Bids"
            count={stats?.pending_bids}
          />
          <NavItem
            to="/portal/punch-items"
            icon={<ClipboardList className="h-4 w-4" />}
            label="Punch Items"
            count={stats?.open_punch_items}
          />
          <NavItem
            to="/portal/tasks"
            icon={<CheckSquare className="h-4 w-4" />}
            label="Tasks"
            count={stats?.open_tasks}
          />
          {canViewDailyReports && (
            <NavItem
              to="/portal/daily-reports"
              icon={<CalendarDays className="h-4 w-4" />}
              label="Daily Reports"
            />
          )}
          <NavItem
            to="/portal/compliance"
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Compliance"
            count={stats?.expiring_documents}
            warning={stats?.expiring_documents ? stats.expiring_documents > 0 : false}
          />
        </nav>

        {/* Footer */}
        <div className="p-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}

export default SubcontractorLayout
