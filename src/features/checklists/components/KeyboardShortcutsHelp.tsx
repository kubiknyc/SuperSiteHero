// File: /src/features/checklists/components/KeyboardShortcutsHelp.tsx
// Help dialog showing available keyboard shortcuts
// Enhancement: #3 - Keyboard Shortcuts

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Keyboard, X } from 'lucide-react'
import type { KeyboardShortcut } from '../hooks/useKeyboardShortcuts'

interface KeyboardShortcutsHelpProps {
  shortcuts: KeyboardShortcut[]
}

export function KeyboardShortcutsHelp({ shortcuts }: KeyboardShortcutsHelpProps) {
  const [isOpen, setIsOpen] = useState(false)

  const enabledShortcuts = shortcuts.filter((s) => s.enabled !== false)

  if (enabledShortcuts.length === 0) {return null}

  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2"
      >
        <Keyboard className="w-4 h-4" />
        Shortcuts
      </Button>

      {/* Help Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Keyboard className="w-5 h-5" />
                    Keyboard Shortcuts
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Use these shortcuts to quickly fill out the checklist
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {enabledShortcuts.map((shortcut) => (
                  <div key={shortcut.key} className="flex items-center justify-between">
                    <span className="text-sm text-secondary">{shortcut.description}</span>
                    <Badge variant="outline" className="font-mono uppercase">
                      {shortcut.key === 'enter' ? '↵ Enter' : shortcut.key.toUpperCase()}
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-xs text-muted">
                  <strong>Note:</strong> Shortcuts are disabled when typing in text fields.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
