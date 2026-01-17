/**
 * InviteSubcontractorDialog Component
 * Dialog for GCs to invite subcontractors to the portal
 */

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import { useCreateInvitation } from '../hooks/useInvitations'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building2, Mail, Loader2 } from 'lucide-react'

interface InviteSubcontractorDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Subcontractor {
  id: string
  company_name: string
  trade: string
  contact: {
    email: string
  } | null
}

export function InviteSubcontractorDialog({
  projectId,
  open,
  onOpenChange,
}: InviteSubcontractorDialogProps) {
  const { user } = useAuth()
  const createInvitation = useCreateInvitation()

  const [selectedSubcontractorId, setSelectedSubcontractorId] = useState<string>('')
  const [email, setEmail] = useState('')

  // Fetch subcontractors for this project
  const { data: subcontractors = [], isLoading: loadingSubcontractors } = useQuery({
    queryKey: ['project-subcontractors-for-invite', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subcontractors')
        .select(`
          id,
          company_name,
          trade,
          contact:contacts(email)
        `)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('company_name')

      if (error) { throw error }
      return (data || []) as Subcontractor[]
    },
    enabled: !!projectId && open,
  })

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      // Use setTimeout to avoid synchronous state update in effect
      setTimeout(() => {
        setSelectedSubcontractorId('')
        setEmail('')
      }, 0)
    }
  }, [open])

  // Update email when subcontractor is selected
  useEffect(() => {
    if (selectedSubcontractorId) {
      const sub = subcontractors.find((s) => s.id === selectedSubcontractorId)
      if (sub?.contact?.email) {
        // Use setTimeout to avoid synchronous state update in effect
        setTimeout(() => setEmail(sub.contact.email), 0)
      }
    }
  }, [selectedSubcontractorId, subcontractors])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedSubcontractorId || !email.trim() || !user?.id) {
      return
    }

    createInvitation.mutate(
      {
        invitedBy: user.id,
        data: {
          subcontractor_id: selectedSubcontractorId,
          project_id: projectId,
          email: email.trim(),
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      }
    )
  }

  const selectedSubcontractor = subcontractors.find(
    (s) => s.id === selectedSubcontractorId
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 heading-card">
            <Building2 className="h-5 w-5" />
            Invite Subcontractor to Portal
          </DialogTitle>
          <DialogDescription>
            Send an invitation email to allow a subcontractor to access the portal
            and view their assigned work.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Subcontractor Selection */}
          <div className="space-y-2">
            <Label htmlFor="subcontractor">Subcontractor *</Label>
            {loadingSubcontractors ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading subcontractors...
              </div>
            ) : subcontractors.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No subcontractors found for this project. Add subcontractors first.
              </p>
            ) : (
              <RadixSelect
                value={selectedSubcontractorId}
                onValueChange={setSelectedSubcontractorId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a subcontractor..." />
                </SelectTrigger>
                <SelectContent>
                  {subcontractors.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      <span className="flex items-center gap-2">
                        <span>{sub.company_name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({sub.trade})
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </RadixSelect>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="subcontractor@example.com"
                className="pl-10"
                required
              />
            </div>
            {selectedSubcontractor?.contact?.email && email !== selectedSubcontractor.contact.email && (
              <p className="text-xs text-muted-foreground">
                Contact email: {selectedSubcontractor.contact.email}
              </p>
            )}
          </div>

          {/* Info Box */}
          {selectedSubcontractorId && (
            <div className="rounded-lg bg-primary/10 p-3 text-sm text-primary-800">
              <p className="heading-subsection">What happens next?</p>
              <ul className="mt-1 list-disc list-inside text-xs space-y-0.5">
                <li>An invitation email will be sent to the specified address</li>
                <li>The recipient can create an account or sign in</li>
                <li>Once accepted, they can access their portal dashboard</li>
                <li>They will see punch items and tasks assigned to them</li>
              </ul>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createInvitation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !selectedSubcontractorId ||
                !email.trim() ||
                createInvitation.isPending ||
                subcontractors.length === 0
              }
            >
              {createInvitation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default InviteSubcontractorDialog
