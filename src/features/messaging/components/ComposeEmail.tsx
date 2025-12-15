/**
 * ComposeEmail Component
 *
 * Email composition dialog/form:
 * - Rich text editor for email body
 * - Recipient input with autocomplete
 * - Attachment upload
 * - Entity linking
 * - Draft saving
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  X,
  Send,
  Paperclip,
  Link2,
  Trash2,
  Minimize2,
  Maximize2,
  ChevronDown,
  Loader2,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  Image,
} from 'lucide-react'
import {
  Button,
  Input,
  Label,
  Badge,
  Textarea,
} from '@/components/ui'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useEmailAccounts } from '../hooks/useEmailAccounts'
import { useSendEmail, useSaveDraft } from '../hooks/useEmails'
import { cn } from '@/lib/utils'
import type {
  Email,
  EmailAccount,
  EmailParticipant,
  ComposeEmailDTO,
  LinkableEntityType,
} from '@/types/email'
import {
  isValidEmail,
  parseEmailAddresses,
  formatParticipant,
  formatFileSize,
  LINKABLE_ENTITY_CONFIG,
} from '@/types/email'

interface ComposeEmailProps {
  isOpen: boolean
  onClose: () => void
  replyTo?: Email
  forwardEmail?: Email
  defaultRecipient?: EmailParticipant
  linkToEntity?: {
    entity_type: LinkableEntityType
    entity_id: string
    entity_name?: string
  }
}

export function ComposeEmail({
  isOpen,
  onClose,
  replyTo,
  forwardEmail,
  defaultRecipient,
  linkToEntity,
}: ComposeEmailProps) {
  // State
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [toInput, setToInput] = useState('')
  const [toRecipients, setToRecipients] = useState<EmailParticipant[]>([])
  const [ccRecipients, setCcRecipients] = useState<EmailParticipant[]>([])
  const [bccRecipients, setBccRecipients] = useState<EmailParticipant[]>([])
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [isMinimized, setIsMinimized] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Hooks
  const { data: accounts } = useEmailAccounts()
  const sendEmail = useSendEmail()
  const saveDraft = useSaveDraft()

  // Initialize form based on reply/forward/default
  useEffect(() => {
    if (replyTo) {
      setSubject(`Re: ${replyTo.subject}`)
      setToRecipients([{ email: replyTo.from_address, name: replyTo.from_name || '' }])
      setBody(`\n\n---\nOn ${new Date(replyTo.date_sent).toLocaleString()}, ${replyTo.from_name || replyTo.from_address} wrote:\n${replyTo.body_text || ''}`)
    } else if (forwardEmail) {
      setSubject(`Fwd: ${forwardEmail.subject}`)
      setBody(`\n\n---\nForwarded message:\nFrom: ${forwardEmail.from_name || forwardEmail.from_address}\nDate: ${new Date(forwardEmail.date_sent).toLocaleString()}\nSubject: ${forwardEmail.subject}\n\n${forwardEmail.body_text || ''}`)
    } else if (defaultRecipient) {
      setToRecipients([defaultRecipient])
    }
  }, [replyTo, forwardEmail, defaultRecipient])

  // Auto-select first account
  useEffect(() => {
    if (!selectedAccountId && accounts && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id)
    }
  }, [accounts, selectedAccountId])

  // Handle adding recipients
  const handleAddRecipient = (input: string, setter: (r: EmailParticipant[]) => void, current: EmailParticipant[]) => {
    const parsed = parseEmailAddresses(input)
    if (parsed.length > 0) {
      const newRecipients = parsed.filter(
        (p) => !current.some((c) => c.email.toLowerCase() === p.email.toLowerCase())
      )
      setter([...current, ...newRecipients])
      return ''
    }
    return input
  }

  const handleToKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      e.preventDefault()
      setToInput(handleAddRecipient(toInput, setToRecipients, toRecipients))
    }
  }

  const handleRemoveRecipient = (email: string, setter: (r: EmailParticipant[]) => void, current: EmailParticipant[]) => {
    setter(current.filter((r) => r.email !== email))
  }

  // Handle attachments
  const handleAttachmentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments((prev) => [...prev, ...files])
  }

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  // Send email
  const handleSend = async () => {
    if (!selectedAccountId || toRecipients.length === 0 || !subject.trim()) {
      return
    }

    const emailData: ComposeEmailDTO = {
      account_id: selectedAccountId,
      to: toRecipients,
      cc: ccRecipients.length > 0 ? ccRecipients : undefined,
      bcc: bccRecipients.length > 0 ? bccRecipients : undefined,
      subject,
      body_html: `<p>${body.replace(/\n/g, '<br>')}</p>`,
      body_text: body,
      attachments: attachments.length > 0 ? attachments : undefined,
      reply_to_email_id: replyTo?.id,
      link_to_entity: linkToEntity,
    }

    await sendEmail.mutateAsync(emailData)
    handleClose()
  }

  // Save draft
  const handleSaveDraft = async () => {
    if (!selectedAccountId) return

    const emailData: ComposeEmailDTO = {
      account_id: selectedAccountId,
      to: toRecipients,
      cc: ccRecipients.length > 0 ? ccRecipients : undefined,
      bcc: bccRecipients.length > 0 ? bccRecipients : undefined,
      subject,
      body_html: `<p>${body.replace(/\n/g, '<br>')}</p>`,
      body_text: body,
    }

    await saveDraft.mutateAsync(emailData)
  }

  // Close handler
  const handleClose = () => {
    // Reset form
    setToInput('')
    setToRecipients([])
    setCcRecipients([])
    setBccRecipients([])
    setShowCc(false)
    setShowBcc(false)
    setSubject('')
    setBody('')
    setAttachments([])
    setIsMinimized(false)
    onClose()
  }

  const canSend = selectedAccountId && toRecipients.length > 0 && subject.trim() && body.trim()

  if (!isOpen) return null

  // Minimized view
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 w-80 bg-background border rounded-lg shadow-lg z-50">
        <div
          onClick={() => setIsMinimized(false)}
          className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
        >
          <span className="font-medium truncate">
            {subject || 'New Message'}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Maximize2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation()
                handleClose()
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="p-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>
              {replyTo ? 'Reply' : forwardEmail ? 'Forward' : 'New Message'}
            </DialogTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setIsMinimized(true)}>
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Form */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* From Account */}
          <div className="flex items-center gap-2">
            <Label className="w-16 text-muted-foreground">From:</Label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts?.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.email_address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* To Recipients */}
          <div className="flex items-start gap-2">
            <Label className="w-16 text-muted-foreground pt-2">To:</Label>
            <div className="flex-1">
              <div className="flex flex-wrap gap-1 mb-1">
                {toRecipients.map((r) => (
                  <Badge key={r.email} variant="secondary" className="flex items-center gap-1">
                    {r.name || r.email}
                    <button
                      onClick={() => handleRemoveRecipient(r.email, setToRecipients, toRecipients)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={toInput}
                  onChange={(e) => setToInput(e.target.value)}
                  onKeyDown={handleToKeyDown}
                  onBlur={() => setToInput(handleAddRecipient(toInput, setToRecipients, toRecipients))}
                  placeholder="Enter email address"
                  className="flex-1"
                />
                <div className="flex gap-1 text-sm text-muted-foreground">
                  {!showCc && (
                    <button onClick={() => setShowCc(true)} className="hover:underline">
                      Cc
                    </button>
                  )}
                  {!showBcc && (
                    <button onClick={() => setShowBcc(true)} className="hover:underline">
                      Bcc
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CC Recipients */}
          {showCc && (
            <div className="flex items-start gap-2">
              <Label className="w-16 text-muted-foreground pt-2">Cc:</Label>
              <div className="flex-1">
                <div className="flex flex-wrap gap-1 mb-1">
                  {ccRecipients.map((r) => (
                    <Badge key={r.email} variant="secondary" className="flex items-center gap-1">
                      {r.name || r.email}
                      <button onClick={() => handleRemoveRecipient(r.email, setCcRecipients, ccRecipients)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Input
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      const input = (e.target as HTMLInputElement).value
                      handleAddRecipient(input, setCcRecipients, ccRecipients);
                      (e.target as HTMLInputElement).value = ''
                    }
                  }}
                  placeholder="Add Cc recipients"
                />
              </div>
            </div>
          )}

          {/* BCC Recipients */}
          {showBcc && (
            <div className="flex items-start gap-2">
              <Label className="w-16 text-muted-foreground pt-2">Bcc:</Label>
              <div className="flex-1">
                <div className="flex flex-wrap gap-1 mb-1">
                  {bccRecipients.map((r) => (
                    <Badge key={r.email} variant="secondary" className="flex items-center gap-1">
                      {r.name || r.email}
                      <button onClick={() => handleRemoveRecipient(r.email, setBccRecipients, bccRecipients)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Input
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      const input = (e.target as HTMLInputElement).value
                      handleAddRecipient(input, setBccRecipients, bccRecipients);
                      (e.target as HTMLInputElement).value = ''
                    }
                  }}
                  placeholder="Add Bcc recipients"
                />
              </div>
            </div>
          )}

          {/* Subject */}
          <div className="flex items-center gap-2">
            <Label className="w-16 text-muted-foreground">Subject:</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter subject"
              className="flex-1"
            />
          </div>

          {/* Entity Link */}
          {linkToEntity && (
            <div className="flex items-center gap-2">
              <Label className="w-16 text-muted-foreground">Link:</Label>
              <Badge variant="outline" className="flex items-center gap-1">
                <Link2 className="h-3 w-3" />
                {LINKABLE_ENTITY_CONFIG[linkToEntity.entity_type].label}
                {linkToEntity.entity_name && `: ${linkToEntity.entity_name}`}
              </Badge>
            </div>
          )}

          {/* Email Body */}
          <div className="flex-1">
            {/* Formatting Toolbar */}
            <div className="flex items-center gap-1 mb-2 p-1 border rounded-t-md bg-muted/30">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Bold className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Italic className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Underline className="h-4 w-4" />
              </Button>
              <div className="w-px h-4 bg-border mx-1" />
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <List className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ListOrdered className="h-4 w-4" />
              </Button>
              <div className="w-px h-4 bg-border mx-1" />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </div>

            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              className="min-h-[200px] resize-none rounded-t-none"
            />
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Attachments:</Label>
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-2 py-1 px-2">
                    <Paperclip className="h-3 w-3" />
                    <span className="truncate max-w-[150px]">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({formatFileSize(file.size)})
                    </span>
                    <button
                      onClick={() => handleRemoveAttachment(index)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleAttachmentSelect}
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleSaveDraft} disabled={saveDraft.isPending}>
              {saveDraft.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Draft
            </Button>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <Button onClick={handleSend} disabled={!canSend || sendEmail.isPending}>
            {sendEmail.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ComposeEmail
