// File: src/contexts/PresenceContext.tsx
// App-wide presence context for realtime collaboration

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'
import { realtimeManager, presenceManager } from '@/lib/realtime'
import type { ConnectionState, PresenceUser } from '@/lib/realtime'
import { useAuth } from '@/hooks/useAuth'

interface PresenceContextType {
  /** Current WebSocket connection state */
  connectionState: ConnectionState
  /** Whether connected to realtime */
  isConnected: boolean
  /** Current project being viewed (if any) */
  currentProjectId: string | null
  /** Users in the current project room */
  projectUsers: PresenceUser[]
  /** Set the current project for presence tracking */
  setCurrentProject: (projectId: string | null) => void
  /** Update the current page being viewed */
  updateCurrentPage: (page: string) => void
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined)

interface PresenceProviderProps {
  children: ReactNode
}

export function PresenceProvider({ children }: PresenceProviderProps) {
  const { user, profile } = useAuth()
  const location = useLocation()

  const [connectionState, setConnectionState] = useState<ConnectionState>(
    realtimeManager.getConnectionState()
  )
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [projectUsers, setProjectUsers] = useState<PresenceUser[]>([])

  // Subscribe to connection state changes
  useEffect(() => {
    return realtimeManager.onConnectionChange(setConnectionState)
  }, [])

  // Join/leave project room when project changes
  useEffect(() => {
    if (!user || !currentProjectId) return

    const roomId = `project:${currentProjectId}`

    presenceManager.joinRoom({
      roomId,
      user: {
        id: user.id,
        email: user.email ?? '',
        name: profile?.full_name ?? user.email ?? 'Anonymous',
        avatarUrl: profile?.avatar_url ?? undefined,
      },
      initialPage: location.pathname,
      onSync: () => {
        // Update users when synced
        setProjectUsers(presenceManager.getUsers(roomId))
      },
    })

    // Subscribe to presence changes
    const unsubscribe = presenceManager.onPresenceChange(roomId, setProjectUsers)

    return () => {
      unsubscribe()
      presenceManager.leaveRoom(roomId)
    }
  }, [user, profile, currentProjectId, location.pathname])

  // Update page when location changes
  useEffect(() => {
    if (!currentProjectId) return
    presenceManager.updatePresence(`project:${currentProjectId}`, {
      currentPage: location.pathname,
    })
  }, [location.pathname, currentProjectId])

  const setCurrentProject = useCallback((projectId: string | null) => {
    setCurrentProjectId(projectId)
    if (!projectId) {
      setProjectUsers([])
    }
  }, [])

  const updateCurrentPage = useCallback(
    (page: string) => {
      if (!currentProjectId) return
      presenceManager.updatePresence(`project:${currentProjectId}`, {
        currentPage: page,
      })
    },
    [currentProjectId]
  )

  const value: PresenceContextType = {
    connectionState,
    isConnected: connectionState === 'connected',
    currentProjectId,
    projectUsers,
    setCurrentProject,
    updateCurrentPage,
  }

  return (
    <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>
  )
}

export function usePresence() {
  const context = useContext(PresenceContext)
  if (context === undefined) {
    throw new Error('usePresence must be used within a PresenceProvider')
  }
  return context
}

/**
 * Hook to automatically track presence in a project
 * Use this in project-level layouts
 */
export function useProjectPresenceTracking(projectId: string | undefined) {
  const { setCurrentProject } = usePresence()

  useEffect(() => {
    if (projectId) {
      setCurrentProject(projectId)
    }
    return () => {
      setCurrentProject(null)
    }
  }, [projectId, setCurrentProject])
}
