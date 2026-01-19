/**
 * Subcontractor Portal Layout
 * Provides responsive navigation and structure for the subcontractor portal
 * Milestone 4.1: Mobile-Optimized Portal UI - Desktop sidebar, mobile bottom nav
 */

import { useState, useEffect, useRef } from 'react'
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
  CalendarClock,
  Menu,
  X,
  Bell,
  FileSignature,
  Banknote,
  Receipt,
  FileEdit,
  Shield,
  Camera,
  Users,
  Award,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MobilePortalNav } from './MobilePortalNav'
import { PortalErrorBoundary } from './PortalErrorBoundary'
import { PWAInstallBanner } from '@/components/PWAInstallPrompt'
import { useUnreadNotificationCount } from '@/features/notifications/hooks/useNotifications'

interface NavItemProps {
  to: string
  icon: React.ReactNode
  label: string
  count?: number
  warning?: boolean
  onClick?: () => void
}

function NavItem({ to, icon, label, count, warning, onClick }: NavItemProps) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
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
            warning ? 'bg-warning/10 text-warning-800' : 'bg-muted text-muted-foreground'
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
  const { data: unreadCount } = useUnreadNotificationCount()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [headerCollapsed, setHeaderCollapsed] = useState(false)
  const [lastScrollY, setLastScrollY] = useState(0)
  const mainRef = useRef<HTMLElement>(null)

  // Close mobile menu and reset scroll on route change
  useEffect(() => {
    setTimeout(() => {
      setMobileMenuOpen(false)
    }, 0)
    // Reset scroll position when navigating to a new page
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [location.pathname])

  // Collapse header on scroll down (mobile only)
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY > lastScrollY && currentScrollY > 60) {
        setHeaderCollapsed(true)
      } else if (currentScrollY < lastScrollY) {
        setHeaderCollapsed(false)
      }
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    setTimeout(() => {
      if (mobileMenuOpen) {
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = ''
      }
    }, 0)
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar - hidden on mobile */}
      <aside className="hidden md:flex w-64 border-r bg-card flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <div>
              <h2 className="heading-subsection">Subcontractor Portal</h2>
              <p className="text-xs text-muted-foreground truncate">
                {userProfile?.first_name} {userProfile?.last_name}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavItem
            to="/sub"
            icon={<LayoutDashboard className="h-4 w-4" />}
            label="Dashboard"
          />
          <NavItem
            to="/sub/projects"
            icon={<FolderOpen className="h-4 w-4" />}
            label="My Projects"
          />
          <NavItem
            to="/sub/assignments"
            icon={<ClipboardList className="h-4 w-4" />}
            label="My Assignments"
            count={(stats?.open_punch_items || 0) + (stats?.open_tasks || 0)}
          />
          <NavItem
            to="/sub/bids"
            icon={<FileText className="h-4 w-4" />}
            label="Pending Bids"
            count={stats?.pending_bids}
          />
          <NavItem
            to="/sub/punch-items"
            icon={<ClipboardList className="h-4 w-4" />}
            label="Punch Items"
            count={stats?.open_punch_items}
          />
          <NavItem
            to="/sub/tasks"
            icon={<CheckSquare className="h-4 w-4" />}
            label="Tasks"
            count={stats?.open_tasks}
          />
          {canViewDailyReports && (
            <NavItem
              to="/sub/daily-reports"
              icon={<CalendarDays className="h-4 w-4" />}
              label="Daily Reports"
            />
          )}
          <NavItem
            to="/sub/notifications"
            icon={<Bell className="h-4 w-4" />}
            label="Notifications"
            count={unreadCount}
          />
          <NavItem
            to="/sub/compliance"
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Compliance"
            count={stats?.expiring_documents}
            warning={stats?.expiring_documents ? stats.expiring_documents > 0 : false}
          />
          <NavItem
            to="/sub/lien-waivers"
            icon={<FileSignature className="h-4 w-4" />}
            label="Lien Waivers"
          />
          <NavItem
            to="/sub/retainage"
            icon={<Banknote className="h-4 w-4" />}
            label="Retainage"
          />
          <NavItem
            to="/sub/pay-apps"
            icon={<Receipt className="h-4 w-4" />}
            label="Pay Applications"
          />
          <NavItem
            to="/sub/change-orders"
            icon={<FileEdit className="h-4 w-4" />}
            label="Change Orders"
          />
          <NavItem
            to="/sub/schedule"
            icon={<CalendarClock className="h-4 w-4" />}
            label="Schedule"
          />
          <NavItem
            to="/sub/safety"
            icon={<Shield className="h-4 w-4" />}
            label="Safety"
          />
          <NavItem
            to="/sub/photos"
            icon={<Camera className="h-4 w-4" />}
            label="Photos"
          />
          <NavItem
            to="/sub/meetings"
            icon={<Users className="h-4 w-4" />}
            label="Meetings"
          />
          <NavItem
            to="/sub/certifications"
            icon={<Award className="h-4 w-4" />}
            label="Certifications"
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

      {/* Mobile Header - shown on mobile only */}
      <div className={cn(
        'md:hidden fixed top-0 left-0 right-0 z-40 bg-card border-b border-border',
        'transition-transform duration-200',
        headerCollapsed ? '-translate-y-full' : 'translate-y-0'
      )}>
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">Subcontractor Portal</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Notification Button */}
            <NavLink to="/sub/notifications" className="relative p-2">
              <Bell className="h-5 w-5 text-secondary" />
              {unreadCount !== undefined && unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-0.5 -right-0.5 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </NavLink>
            {/* Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-secondary"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Menu Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <p className="font-medium text-sm">
                  {userProfile?.first_name} {userProfile?.last_name}
                </p>
                <p className="text-xs text-muted-foreground">{userProfile?.email}</p>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Menu Navigation */}
            <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-180px)]">
              <NavItem
                to="/sub"
                icon={<LayoutDashboard className="h-4 w-4" />}
                label="Dashboard"
                onClick={() => setMobileMenuOpen(false)}
              />
              <NavItem
                to="/sub/projects"
                icon={<FolderOpen className="h-4 w-4" />}
                label="My Projects"
                onClick={() => setMobileMenuOpen(false)}
              />
              <NavItem
                to="/sub/assignments"
                icon={<ClipboardList className="h-4 w-4" />}
                label="My Assignments"
                count={(stats?.open_punch_items || 0) + (stats?.open_tasks || 0)}
                onClick={() => setMobileMenuOpen(false)}
              />
              <NavItem
                to="/sub/bids"
                icon={<FileText className="h-4 w-4" />}
                label="Pending Bids"
                count={stats?.pending_bids}
                onClick={() => setMobileMenuOpen(false)}
              />
              <NavItem
                to="/sub/punch-items"
                icon={<ClipboardList className="h-4 w-4" />}
                label="Punch Items"
                count={stats?.open_punch_items}
                onClick={() => setMobileMenuOpen(false)}
              />
              <NavItem
                to="/sub/tasks"
                icon={<CheckSquare className="h-4 w-4" />}
                label="Tasks"
                count={stats?.open_tasks}
                onClick={() => setMobileMenuOpen(false)}
              />
              {canViewDailyReports && (
                <NavItem
                  to="/sub/daily-reports"
                  icon={<CalendarDays className="h-4 w-4" />}
                  label="Daily Reports"
                  onClick={() => setMobileMenuOpen(false)}
                />
              )}
              <NavItem
                to="/sub/compliance"
                icon={<AlertTriangle className="h-4 w-4" />}
                label="Compliance"
                count={stats?.expiring_documents}
                warning={stats?.expiring_documents ? stats.expiring_documents > 0 : false}
                onClick={() => setMobileMenuOpen(false)}
              />
              <NavItem
                to="/sub/lien-waivers"
                icon={<FileSignature className="h-4 w-4" />}
                label="Lien Waivers"
                onClick={() => setMobileMenuOpen(false)}
              />
              <NavItem
                to="/sub/retainage"
                icon={<Banknote className="h-4 w-4" />}
                label="Retainage"
                onClick={() => setMobileMenuOpen(false)}
              />
              <NavItem
                to="/sub/pay-apps"
                icon={<Receipt className="h-4 w-4" />}
                label="Pay Applications"
                onClick={() => setMobileMenuOpen(false)}
              />
              <NavItem
                to="/sub/change-orders"
                icon={<FileEdit className="h-4 w-4" />}
                label="Change Orders"
                onClick={() => setMobileMenuOpen(false)}
              />
              <NavItem
                to="/sub/schedule"
                icon={<CalendarClock className="h-4 w-4" />}
                label="Schedule"
                onClick={() => setMobileMenuOpen(false)}
              />
              <NavItem
                to="/sub/safety"
                icon={<Shield className="h-4 w-4" />}
                label="Safety"
                onClick={() => setMobileMenuOpen(false)}
              />
              <NavItem
                to="/sub/photos"
                icon={<Camera className="h-4 w-4" />}
                label="Photos"
                onClick={() => setMobileMenuOpen(false)}
              />
              <NavItem
                to="/sub/meetings"
                icon={<Users className="h-4 w-4" />}
                label="Meetings"
                onClick={() => setMobileMenuOpen(false)}
              />
              <NavItem
                to="/sub/certifications"
                icon={<Award className="h-4 w-4" />}
                label="Certifications"
                onClick={() => setMobileMenuOpen(false)}
              />
              <NavItem
                to="/sub/profile"
                icon={<Building2 className="h-4 w-4" />}
                label="Profile"
                onClick={() => setMobileMenuOpen(false)}
              />
            </nav>

            {/* Menu Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-card">
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => signOut()}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main
        ref={mainRef}
        className={cn(
          'flex-1 overflow-auto',
          'md:pt-0 pt-14', // Add top padding on mobile for header
          'pb-16 md:pb-0' // Add bottom padding on mobile for nav
        )}
      >
        <PortalErrorBoundary>
          <Outlet />
        </PortalErrorBoundary>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobilePortalNav />

      {/* PWA Install Banner - mobile only */}
      <div className="md:hidden">
        <PWAInstallBanner position="bottom" />
      </div>
    </div>
  )
}

export default SubcontractorLayout
