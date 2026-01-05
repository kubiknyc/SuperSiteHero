// File: src/components/ui/stat-card.example.tsx
// Example usage of StatCard component

import { StatCard } from './stat-card'
import { ClipboardCheck, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'

export function StatCardExamples() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Active Tasks with target and progress */}
      <StatCard
        label="Active Tasks"
        value={24}
        target={50}
        change="+12%"
        trend="up"
        icon={ClipboardCheck}
        color="#3b82f6"
        sparklineData={[18, 22, 20, 24, 26, 24]}
        link="/tasks"
        filterLink="/tasks?status=active"
        overdueCount={3}
        overdueLink="/tasks?status=overdue"
        ariaLabel="Active Tasks: 24 out of 50, with 3 overdue"
      />

      {/* Open RFIs with overdue count */}
      <StatCard
        label="Open RFIs"
        value={12}
        change="-8%"
        trend="down"
        icon={AlertTriangle}
        color="#f59e0b"
        sparklineData={[15, 16, 14, 13, 12]}
        link="/rfis"
        filterLink="/rfis?status=open"
        overdueCount={5}
        overdueLink="/rfis?status=overdue"
      />

      {/* Pending Submittals */}
      <StatCard
        label="Pending Submittals"
        value={8}
        icon={Clock}
        color="#8b5cf6"
        link="/submittals"
        filterLink="/submittals?status=pending"
      />

      {/* Completed Punch Items */}
      <StatCard
        label="Completed Today"
        value={18}
        change="+25%"
        trend="up"
        icon={CheckCircle2}
        color="#10b981"
        sparklineData={[10, 12, 14, 15, 16, 18]}
        link="/punch-list"
        filterLink="/punch-list?status=completed&date=today"
      />
    </div>
  )
}

export default StatCardExamples
