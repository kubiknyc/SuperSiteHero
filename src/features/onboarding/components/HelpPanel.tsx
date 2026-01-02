// File: /src/features/onboarding/components/HelpPanel.tsx
// Contextual help panel with documentation and tutorials

import React, { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  HelpCircle,
  Search,
  BookOpen,
  Play,
  MessageCircle,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Lightbulb,
  Keyboard,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useOnboardingStore } from '../stores/onboardingStore'
import { FeatureTour } from './FeatureTour'

// Help content types
interface HelpTopic {
  id: string
  title: string
  summary: string
  content?: string
  category: HelpCategory
  icon?: React.ElementType
  docsUrl?: string
  videoUrl?: string
  relatedTopics?: string[]
  keywords?: string[]
}

type HelpCategory =
  | 'getting_started'
  | 'projects'
  | 'documents'
  | 'field'
  | 'safety'
  | 'reports'
  | 'settings'
  | 'shortcuts'

// Sample help content - in production, this would come from a CMS or API
const helpTopics: HelpTopic[] = [
  // Getting Started
  {
    id: 'create-project',
    title: 'Creating a New Project',
    summary: 'Learn how to set up a new construction project with all essential details.',
    content: 'To create a new project, navigate to the Projects section and click the "Create Project" button. Fill in the project details including name, address, client information, and schedule dates. You can also add team members and set up project-specific settings.',
    category: 'getting_started',
    icon: BookOpen,
    keywords: ['project', 'create', 'new', 'setup', 'start'],
    relatedTopics: ['invite-team', 'project-settings'],
  },
  {
    id: 'invite-team',
    title: 'Inviting Team Members',
    summary: 'Add team members to your project and assign roles.',
    content: 'You can invite team members by going to Project Settings > Team. Enter their email address and select their role. They will receive an invitation email to join the project.',
    category: 'getting_started',
    icon: BookOpen,
    keywords: ['team', 'invite', 'members', 'add', 'roles'],
  },
  // Documents
  {
    id: 'upload-documents',
    title: 'Uploading Documents',
    summary: 'Upload and organize project documents including drawings, specs, and photos.',
    content: 'Drag and drop files or click the upload button to add documents. Documents are automatically organized by type and can be tagged for easy searching.',
    category: 'documents',
    icon: BookOpen,
    keywords: ['upload', 'documents', 'files', 'drawings', 'specs'],
  },
  {
    id: 'version-control',
    title: 'Document Version Control',
    summary: 'Track document revisions and access previous versions.',
    content: 'When you upload a new version of a document, the previous version is automatically archived. You can view version history and restore any previous version if needed.',
    category: 'documents',
    icon: BookOpen,
    keywords: ['version', 'revision', 'history', 'restore'],
  },
  // Field
  {
    id: 'daily-reports',
    title: 'Daily Reports',
    summary: 'Create comprehensive daily field reports with photos and weather data.',
    content: 'Daily reports capture the day\'s activities including weather conditions, workforce count, work completed, safety observations, and photos. Reports can be submitted for approval and are automatically logged.',
    category: 'field',
    icon: BookOpen,
    keywords: ['daily', 'report', 'field', 'weather', 'photos'],
  },
  {
    id: 'punch-lists',
    title: 'Punch Lists',
    summary: 'Track deficiencies and items requiring correction before closeout.',
    content: 'Create punch list items with photos and location markup. Assign items to responsible parties and track their completion status through to verification.',
    category: 'field',
    icon: BookOpen,
    keywords: ['punch', 'list', 'deficiencies', 'closeout', 'corrections'],
  },
  // Safety
  {
    id: 'safety-inspections',
    title: 'Safety Inspections',
    summary: 'Conduct and document safety inspections using customizable checklists.',
    content: 'Regular safety inspections help identify hazards and maintain a safe workplace. Use built-in checklists or create custom ones for your specific needs.',
    category: 'safety',
    icon: BookOpen,
    keywords: ['safety', 'inspection', 'checklist', 'hazard'],
  },
  {
    id: 'incident-reporting',
    title: 'Incident Reporting',
    summary: 'Report and track safety incidents with proper documentation.',
    content: 'Document incidents immediately with photos, witness statements, and corrective actions. The system helps ensure OSHA compliance and tracks incident trends.',
    category: 'safety',
    icon: BookOpen,
    keywords: ['incident', 'safety', 'accident', 'osha', 'report'],
  },
  // Shortcuts
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    summary: 'Speed up your workflow with keyboard shortcuts.',
    content: 'Use Cmd/Ctrl + K to open the command palette, Cmd/Ctrl + N for new items, and Cmd/Ctrl + S to save. Press ? to see all available shortcuts.',
    category: 'shortcuts',
    icon: Keyboard,
    keywords: ['keyboard', 'shortcuts', 'hotkeys', 'quick'],
  },
]

// Quick tips based on context
interface QuickTip {
  id: string
  title: string
  content: string
  action?: {
    label: string
    onClick: () => void
  }
}

// Help Panel Context
interface HelpPanelContextValue {
  isOpen: boolean
  openPanel: () => void
  closePanel: () => void
  togglePanel: () => void
  setContext: (context: string) => void
}

const HelpPanelContext = createContext<HelpPanelContextValue>({
  isOpen: false,
  openPanel: () => {},
  closePanel: () => {},
  togglePanel: () => {},
  setContext: () => {},
})

export function useHelpPanel() {
  return useContext(HelpPanelContext)
}

// Help Panel Provider
interface HelpPanelProviderProps {
  children: React.ReactNode
}

export function HelpPanelProvider({ children }: HelpPanelProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [context, setContext] = useState<string>('')

  const openPanel = useCallback(() => setIsOpen(true), [])
  const closePanel = useCallback(() => setIsOpen(false), [])
  const togglePanel = useCallback(() => setIsOpen(prev => !prev), [])

  return (
    <HelpPanelContext.Provider
      value={{
        isOpen,
        openPanel,
        closePanel,
        togglePanel,
        setContext,
      }}
    >
      {children}
      <HelpPanel isOpen={isOpen} onClose={closePanel} context={context} />
    </HelpPanelContext.Provider>
  )
}

// Help Panel Component
interface HelpPanelProps {
  isOpen: boolean
  onClose: () => void
  context?: string
}

export function HelpPanel({ isOpen, onClose, context }: HelpPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<HelpCategory | null>(null)
  const [showTour, setShowTour] = useState(false)
  const { completedTours } = useOnboardingStore()

  // Filter topics based on search
  const filteredTopics = searchQuery
    ? helpTopics.filter(topic =>
        topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.keywords?.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : helpTopics

  // Group topics by category
  const topicsByCategory = filteredTopics.reduce((acc, topic) => {
    if (!acc[topic.category]) {
      acc[topic.category] = []
    }
    acc[topic.category].push(topic)
    return acc
  }, {} as Record<HelpCategory, HelpTopic[]>)

  const categoryLabels: Record<HelpCategory, string> = {
    getting_started: 'Getting Started',
    projects: 'Projects',
    documents: 'Documents',
    field: 'Field Operations',
    safety: 'Safety',
    reports: 'Reports',
    settings: 'Settings',
    shortcuts: 'Shortcuts & Tips',
  }

  // Quick tips based on context or general tips
  const quickTips: QuickTip[] = [
    {
      id: 'tip-1',
      title: 'Pro tip',
      content: 'Press Cmd/Ctrl + K to quickly search and navigate anywhere in the app.',
    },
    {
      id: 'tip-2',
      title: 'Did you know?',
      content: 'You can drag and drop files directly onto any document folder to upload.',
    },
    {
      id: 'tip-3',
      title: 'Helpful shortcut',
      content: 'Press ? anywhere in the app to see all available keyboard shortcuts.',
    },
  ]

  // Reset state when panel closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setSelectedTopic(null)
      setShowTour(false)
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card border-l shadow-xl z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">Help Center</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search help topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <ScrollArea className="h-[calc(100vh-120px)]">
              <div className="p-4 space-y-6">
                {/* Selected topic detail */}
                {selectedTopic ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTopic(null)}
                      className="mb-4"
                    >
                      <ChevronRight className="w-4 h-4 mr-1 rotate-180" />
                      Back to topics
                    </Button>

                    <h3 className="text-xl font-semibold mb-2">
                      {selectedTopic.title}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {selectedTopic.summary}
                    </p>

                    {selectedTopic.content && (
                      <div className="prose prose-sm dark:prose-invert max-w-none mb-4">
                        <p>{selectedTopic.content}</p>
                      </div>
                    )}

                    {(selectedTopic.docsUrl || selectedTopic.videoUrl) && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {selectedTopic.docsUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={selectedTopic.docsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <BookOpen className="w-4 h-4 mr-2" />
                              Read documentation
                              <ExternalLink className="w-3 h-3 ml-2" />
                            </a>
                          </Button>
                        )}
                        {selectedTopic.videoUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={selectedTopic.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Watch video
                              <ExternalLink className="w-3 h-3 ml-2" />
                            </a>
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Related topics */}
                    {selectedTopic.relatedTopics && selectedTopic.relatedTopics.length > 0 && (
                      <div className="mt-6 pt-4 border-t">
                        <h4 className="text-sm font-medium mb-2">Related Topics</h4>
                        <div className="space-y-2">
                          {selectedTopic.relatedTopics.map((topicId) => {
                            const topic = helpTopics.find(t => t.id === topicId)
                            if (!topic) return null
                            return (
                              <button
                                key={topic.id}
                                onClick={() => setSelectedTopic(topic)}
                                className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-muted transition-colors text-left"
                              >
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">{topic.title}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <>
                    {/* Quick actions */}
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        className="h-auto py-4 flex flex-col items-center gap-2"
                        onClick={() => setShowTour(true)}
                      >
                        <Play className="w-5 h-5 text-primary" />
                        <span className="text-sm">Feature Tour</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto py-4 flex flex-col items-center gap-2"
                        asChild
                      >
                        <a
                          href="https://docs.jobsight.com"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <BookOpen className="w-5 h-5 text-primary" />
                          <span className="text-sm">Documentation</span>
                        </a>
                      </Button>
                    </div>

                    {/* Quick tip */}
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Lightbulb className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">
                              {quickTips[0].title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {quickTips[0].content}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Topics by category */}
                    <div className="space-y-2">
                      {Object.entries(topicsByCategory).map(([category, topics]) => (
                        <div key={category} className="border rounded-lg overflow-hidden">
                          <button
                            onClick={() =>
                              setExpandedCategory(
                                expandedCategory === category ? null : (category as HelpCategory)
                              )
                            }
                            className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/50 transition-colors"
                          >
                            <span className="font-medium text-sm">
                              {categoryLabels[category as HelpCategory]}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {topics.length}
                              </span>
                              <ChevronDown
                                className={cn(
                                  'w-4 h-4 transition-transform',
                                  expandedCategory === category && 'rotate-180'
                                )}
                              />
                            </div>
                          </button>
                          <AnimatePresence>
                            {expandedCategory === category && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="px-2 pb-2">
                                  {topics.map((topic) => (
                                    <button
                                      key={topic.id}
                                      onClick={() => setSelectedTopic(topic)}
                                      className="flex items-start gap-3 w-full p-2 rounded-lg hover:bg-muted transition-colors text-left"
                                    >
                                      <ChevronRight className="w-4 h-4 text-muted-foreground mt-0.5" />
                                      <div>
                                        <p className="text-sm font-medium">
                                          {topic.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                          {topic.summary}
                                        </p>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>

                    {/* Contact support */}
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-3">
                        Can't find what you're looking for?
                      </p>
                      <Button variant="outline" className="w-full">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Contact Support
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>

            {/* Feature tour overlay */}
            {showTour && (
              <FeatureTour
                tourId="dashboard"
                onComplete={() => setShowTour(false)}
                onSkip={() => setShowTour(false)}
              />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Floating help button
export function HelpButton() {
  const { togglePanel } = useHelpPanel()

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={togglePanel}
      className="fixed bottom-4 right-4 z-30 w-12 h-12 rounded-full shadow-lg"
      aria-label="Open help panel"
    >
      <HelpCircle className="w-5 h-5" />
    </Button>
  )
}

// "What's This?" mode component
interface WhatsThisProviderProps {
  children: React.ReactNode
}

interface WhatsThisContextValue {
  isActive: boolean
  toggleMode: () => void
  deactivate: () => void
}

const WhatsThisContext = createContext<WhatsThisContextValue>({
  isActive: false,
  toggleMode: () => {},
  deactivate: () => {},
})

export function useWhatsThis() {
  return useContext(WhatsThisContext)
}

export function WhatsThisProvider({ children }: WhatsThisProviderProps) {
  const [isActive, setIsActive] = useState(false)

  const toggleMode = useCallback(() => setIsActive(prev => !prev), [])
  const deactivate = useCallback(() => setIsActive(false), [])

  // Add cursor style when active
  useEffect(() => {
    if (isActive) {
      document.body.style.cursor = 'help'
    } else {
      document.body.style.cursor = ''
    }
    return () => {
      document.body.style.cursor = ''
    }
  }, [isActive])

  return (
    <WhatsThisContext.Provider value={{ isActive, toggleMode, deactivate }}>
      {children}
      <WhatsThisIndicator isActive={isActive} onDeactivate={deactivate} />
    </WhatsThisContext.Provider>
  )
}

function WhatsThisIndicator({
  isActive,
  onDeactivate,
}: {
  isActive: boolean
  onDeactivate: () => void
}) {
  if (!isActive) return null

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 50, opacity: 0 }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="flex items-center gap-3 px-4 py-2 bg-primary text-white rounded-full shadow-lg">
        <HelpCircle className="w-4 h-4" />
        <span className="text-sm font-medium">Click any element for help</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDeactivate}
          className="ml-2 h-6 px-2 text-white hover:text-white hover:bg-white/20"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  )
}

// WhatsThis trigger button
export function WhatsThisButton() {
  const { isActive, toggleMode } = useWhatsThis()

  return (
    <Button
      variant={isActive ? 'default' : 'outline'}
      size="sm"
      onClick={toggleMode}
      className="gap-2"
    >
      <HelpCircle className="w-4 h-4" />
      What's this?
    </Button>
  )
}

export default HelpPanel
