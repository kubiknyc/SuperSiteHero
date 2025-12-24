/**
 * UI Design Concepts Demo
 * Different visual design directions for JobSight
 */

import { HardHat, FileText, CheckCircle, ArrowRight, Users, Calendar, Plus, BarChart3, Shield, Clock, ChevronRight } from 'lucide-react';

export function DesignConceptsDemo() {
  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="heading-page text-center">
            UI Design Concepts
          </h1>
          <p className="text-gray-600 text-center mt-2">
            Pick a design direction for JobSight. Each concept has its own personality.
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        {/* Concept 1: Modern Minimal */}
        <ConceptSection
          id="1"
          name="Modern Minimal"
          tagline="Clean, breathable, content-first"
          description="Lots of whitespace, subtle shadows, understated elegance. Lets the content speak."
        >
          <div className="bg-card rounded-2xl p-6 shadow-sm border border-gray-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center">
                  <HardHat className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-semibold text-foreground">JobSight</span>
              </div>
              <button className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800">
                New Report
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Active Projects', value: '12', change: '+2' },
                { label: 'Tasks Today', value: '8', change: '3 urgent' },
                { label: 'Team Members', value: '24', change: 'Online' },
              ].map((stat, i) => (
                <div key={i} className="p-4 bg-surface rounded-xl">
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted">{stat.label}</p>
                  <p className="text-xs text-disabled mt-1">{stat.change}</p>
                </div>
              ))}
            </div>

            {/* Cards */}
            <div className="space-y-3">
              {['Daily Report - Building A', 'Safety Inspection Due', 'RFI Response Needed'].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-border hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-gray-600" />
                    </div>
                    <span className="font-medium text-foreground">{item}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-disabled" />
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg">Primary</button>
              <button className="px-4 py-2 bg-card text-foreground text-sm font-medium rounded-lg border border-border">Secondary</button>
              <button className="px-4 py-2 text-gray-600 text-sm font-medium">Text Link</button>
            </div>
          </div>
        </ConceptSection>

        {/* Concept 2: Bold Industrial */}
        <ConceptSection
          id="2"
          name="Bold Industrial"
          tagline="Dark, powerful, construction-grade"
          description="Dark backgrounds, bold colors, strong contrasts. Built tough like the industry."
        >
          <div className="bg-slate-900 rounded-2xl p-6 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-warning rounded-lg flex items-center justify-center">
                  <HardHat className="w-5 h-5 text-slate-900" />
                </div>
                <span className="text-xl font-bold text-white tracking-tight">JOBSIGHT</span>
              </div>
              <button className="px-4 py-2 bg-warning text-slate-900 text-sm font-bold rounded-lg hover:bg-amber-400">
                + NEW REPORT
              </button>
            </div>

            {/* Stats with accent bar */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'PROJECTS', value: '12', color: 'bg-warning' },
                { label: 'TASKS', value: '8', color: 'bg-emerald-500' },
                { label: 'TEAM', value: '24', color: 'bg-blue-500' },
              ].map((stat, i) => (
                <div key={i} className="bg-slate-800 rounded-lg p-4 relative overflow-hidden">
                  <div className={`absolute top-0 left-0 right-0 h-1 ${stat.color}`} />
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-slate-400 font-semibold tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Cards */}
            <div className="space-y-2">
              {[
                { title: 'Daily Report - Building A', status: 'PENDING', statusColor: 'text-amber-500' },
                { title: 'Safety Inspection Due', status: 'URGENT', statusColor: 'text-red-500' },
                { title: 'RFI Response Needed', status: 'IN PROGRESS', statusColor: 'text-blue-500' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer border-l-4 border-warning">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-slate-400" />
                    <span className="font-semibold text-white">{item.title}</span>
                  </div>
                  <span className={`text-xs font-bold ${item.statusColor}`}>{item.status}</span>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button className="px-4 py-2 bg-warning text-slate-900 text-sm font-bold rounded-lg">PRIMARY</button>
              <button className="px-4 py-2 bg-slate-700 text-white text-sm font-bold rounded-lg border border-slate-600">SECONDARY</button>
              <button className="px-4 py-2 text-amber-500 text-sm font-bold">LINK →</button>
            </div>
          </div>
        </ConceptSection>

        {/* Concept 3: Soft Professional */}
        <ConceptSection
          id="3"
          name="Soft Professional"
          tagline="Approachable, modern, trustworthy"
          description="Rounded corners, soft shadows, calming blue palette. Professional but friendly."
        >
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-6 shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <HardHat className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="text-xl font-bold text-gray-800">JobSight</span>
                  <p className="text-xs text-muted">Field Management</p>
                </div>
              </div>
              <button className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all">
                + New Report
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Active Projects', value: '12', icon: BarChart3, color: 'text-blue-500' },
                { label: 'Tasks Today', value: '8', icon: CheckCircle, color: 'text-emerald-500' },
                { label: 'Team Online', value: '24', icon: Users, color: 'text-purple-500' },
              ].map((stat, i) => (
                <div key={i} className="bg-card/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm">
                  <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
                  <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                  <p className="text-sm text-muted">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Cards */}
            <div className="space-y-3">
              {['Daily Report - Building A', 'Safety Inspection Due', 'RFI Response Needed'].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-card rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-semibold text-gray-800">{item}</span>
                  </div>
                  <ArrowRight className="w-5 h-5 text-blue-500" />
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold rounded-xl shadow-lg">Primary</button>
              <button className="px-5 py-2.5 bg-card text-secondary text-sm font-semibold rounded-xl shadow-sm border border-border">Secondary</button>
              <button className="px-5 py-2.5 text-primary text-sm font-semibold">Learn More</button>
            </div>
          </div>
        </ConceptSection>

        {/* Concept 4: Enterprise Dashboard */}
        <ConceptSection
          id="4"
          name="Enterprise Dashboard"
          tagline="Data-driven, efficient, powerful"
          description="Dense information layout, data visualization focus, productivity-oriented."
        >
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            {/* Top bar */}
            <div className="bg-gray-900 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center">
                    <HardHat className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white font-semibold">JobSight</span>
                </div>
                <nav className="flex gap-4 text-sm">
                  <a className="text-white font-medium">Dashboard</a>
                  <a className="text-disabled hover:text-white">Projects</a>
                  <a className="text-disabled hover:text-white">Reports</a>
                  <a className="text-disabled hover:text-white">Team</a>
                </nav>
              </div>
              <button className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded">
                + New
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {/* Stats row */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Active Projects', value: '12', trend: '+2', trendUp: true },
                  { label: 'Open Tasks', value: '47', trend: '-5', trendUp: false },
                  { label: 'Team Utilization', value: '87%', trend: '+3%', trendUp: true },
                  { label: 'Due This Week', value: '8', trend: '2 urgent', trendUp: false },
                ].map((stat, i) => (
                  <div key={i} className="bg-surface rounded-lg p-3 border border-gray-100">
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <span className={`text-xs font-medium ${stat.trendUp ? 'text-emerald-600' : 'text-warning'}`}>
                        {stat.trend}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Table-like list */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="bg-surface px-4 py-2 border-b border-border">
                  <div className="grid grid-cols-4 text-xs font-semibold text-muted uppercase tracking-wider">
                    <span>Item</span>
                    <span>Project</span>
                    <span>Status</span>
                    <span>Due</span>
                  </div>
                </div>
                {[
                  { item: 'Daily Report', project: 'Building A', status: 'Pending', statusColor: 'bg-yellow-100 text-yellow-800', due: 'Today' },
                  { item: 'Safety Inspection', project: 'Site B', status: 'Urgent', statusColor: 'bg-red-100 text-red-800', due: 'Overdue' },
                  { item: 'RFI #234', project: 'Building A', status: 'In Review', statusColor: 'bg-blue-100 text-blue-800', due: 'Tomorrow' },
                ].map((row, i) => (
                  <div key={i} className="px-4 py-3 border-b border-gray-100 hover:bg-surface cursor-pointer">
                    <div className="grid grid-cols-4 text-sm">
                      <span className="font-medium text-foreground">{row.item}</span>
                      <span className="text-gray-600">{row.project}</span>
                      <span><span className={`px-2 py-0.5 rounded text-xs font-medium ${row.statusColor}`}>{row.status}</span></span>
                      <span className="text-gray-600">{row.due}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Buttons */}
              <div className="flex gap-2 mt-4">
                <button className="px-3 py-1.5 bg-emerald-500 text-white text-sm font-medium rounded">Primary</button>
                <button className="px-3 py-1.5 bg-muted text-secondary text-sm font-medium rounded border border-border">Secondary</button>
                <button className="px-3 py-1.5 text-emerald-600 text-sm font-medium">View All →</button>
              </div>
            </div>
          </div>
        </ConceptSection>

        {/* Concept 5: Vibrant Modern */}
        <ConceptSection
          id="5"
          name="Vibrant Modern"
          tagline="Colorful, energetic, engaging"
          description="Bold gradients, vibrant accents, playful but professional. Stands out from the crowd."
        >
          <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 rounded-3xl p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-card/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <HardHat className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-white">JobSight</span>
              </div>
              <button className="px-5 py-2.5 bg-card text-purple-700 text-sm font-bold rounded-xl hover:bg-purple-50 transition-colors">
                + New Report
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Projects', value: '12', icon: BarChart3 },
                { label: 'Tasks', value: '8', icon: CheckCircle },
                { label: 'Team', value: '24', icon: Users },
              ].map((stat, i) => (
                <div key={i} className="bg-card/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                  <stat.icon className="w-5 h-5 text-white/70 mb-2" />
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                  <p className="text-sm text-white/70">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Cards */}
            <div className="space-y-3">
              {[
                { title: 'Daily Report - Building A', badge: '🔥 Hot', badgeBg: 'bg-orange-500' },
                { title: 'Safety Inspection Due', badge: '⚡ Urgent', badgeBg: 'bg-red-500' },
                { title: 'RFI Response Needed', badge: '📝 New', badgeBg: 'bg-emerald-500' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-card/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-card/20 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-card/20 rounded-xl flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-semibold text-white">{item.title}</span>
                  </div>
                  <span className={`px-2 py-1 ${item.badgeBg} text-white text-xs font-bold rounded-lg`}>{item.badge}</span>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button className="px-5 py-2.5 bg-card text-purple-700 text-sm font-bold rounded-xl">Primary</button>
              <button className="px-5 py-2.5 bg-card/20 text-white text-sm font-bold rounded-xl border border-white/30">Secondary</button>
              <button className="px-5 py-2.5 text-white text-sm font-bold">Learn More →</button>
            </div>
          </div>
        </ConceptSection>

        {/* Concept 6: Clean Neutral */}
        <ConceptSection
          id="6"
          name="Clean Neutral"
          tagline="Timeless, versatile, no-nonsense"
          description="Neutral grays with a single accent color. Works everywhere, ages well."
        >
          <div className="bg-neutral-50 rounded-2xl p-6 border border-neutral-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-neutral-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center">
                  <HardHat className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-lg font-bold text-neutral-900">JobSight</span>
                  <p className="text-xs text-neutral-500">Construction Management</p>
                </div>
              </div>
              <button className="px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700">
                New Report
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mb-6">
              {[
                { label: 'Active Projects', value: '12' },
                { label: 'Open Tasks', value: '8' },
                { label: 'Team Members', value: '24' },
              ].map((stat, i) => (
                <div key={i}>
                  <p className="text-3xl font-bold text-neutral-900">{stat.value}</p>
                  <p className="text-sm text-neutral-500">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Cards */}
            <div className="space-y-2">
              {['Daily Report - Building A', 'Safety Inspection Due', 'RFI Response Needed'].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-card rounded-lg border border-neutral-200 hover:border-teal-300 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-neutral-400" />
                    <span className="font-medium text-neutral-900">{item}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-neutral-400" />
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button className="px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg">Primary</button>
              <button className="px-4 py-2 bg-card text-neutral-700 text-sm font-semibold rounded-lg border border-neutral-300">Secondary</button>
              <button className="px-4 py-2 text-teal-600 text-sm font-semibold">Text Link</button>
            </div>
          </div>
        </ConceptSection>
      </div>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-lg text-secondary mb-2">
            Which design concept appeals to you? <strong>1, 2, 3, 4, 5, or 6?</strong>
          </p>
          <p className="text-sm text-muted">
            I'll build out the full design system based on your choice.
          </p>
        </div>
      </footer>
    </div>
  );
}

function ConceptSection({
  id,
  name,
  tagline,
  description,
  children
}: {
  id: string;
  name: string;
  tagline: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-1">
          <span className="w-8 h-8 bg-gray-900 text-white rounded-lg flex items-center justify-center font-bold text-sm">
            {id}
          </span>
          <h2 className="text-2xl font-bold text-foreground" className="heading-section">{name}</h2>
        </div>
        <p className="text-lg text-secondary font-medium">{tagline}</p>
        <p className="text-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

export default DesignConceptsDemo;
