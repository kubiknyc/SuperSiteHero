/**
 * SendInvitationDialog Component
 * Dialog for sending bid invitations to subcontractors
 */

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Building2, Mail, Phone, Plus, Search, User, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { useSendBidInvitation, useBulkSendInvitations } from '../hooks/useBidding'
import type { CreateBidInvitationDTO } from '@/types/bidding'
import { toast } from 'sonner'
import { logger } from '../../../lib/utils/logger';


const formSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  contact_name: z.string().optional(),
  contact_email: z.string().email('Valid email is required'),
  contact_phone: z.string().optional(),
  invitation_method: z.enum(['email', 'portal', 'fax', 'mail', 'phone']),
})

interface Subcontractor {
  id: string
  company_name: string
  contact_name?: string
  email?: string
  phone?: string
  trades?: string[]
}

interface SendInvitationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bidPackageId: string
  existingSubcontractors?: Subcontractor[]
  alreadyInvitedIds?: string[]
  onSuccess?: () => void
}

export function SendInvitationDialog({
  open,
  onOpenChange,
  bidPackageId,
  existingSubcontractors = [],
  alreadyInvitedIds = [],
  onSuccess,
}: SendInvitationDialogProps) {
  const [activeTab, setActiveTab] = useState('manual')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSubs, setSelectedSubs] = useState<string[]>([])

  const sendInvitation = useSendBidInvitation()
  const bulkSendInvitations = useBulkSendInvitations()

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      company_name: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      invitation_method: 'email' as const,
    },
  })

  const availableSubs = existingSubcontractors.filter(
    (sub) => !alreadyInvitedIds.includes(sub.id)
  )

  const filteredSubs = availableSubs.filter((sub) => {
    if (!searchTerm) {return true}
    const search = searchTerm.toLowerCase()
    return (
      sub.company_name.toLowerCase().includes(search) ||
      sub.contact_name?.toLowerCase().includes(search) ||
      sub.trades?.some((t) => t.toLowerCase().includes(search))
    )
  })

  const handleManualSubmit = async (values: any) => {
    try {
      const dto: CreateBidInvitationDTO = {
        bid_package_id: bidPackageId,
        company_name: values.company_name,
        contact_name: values.contact_name,
        contact_email: values.contact_email,
        contact_phone: values.contact_phone,
        invitation_method: values.invitation_method,
      }

      await sendInvitation.mutateAsync(dto)
      toast.success('Invitation sent successfully')
      form.reset()
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      toast.error('Failed to send invitation')
      logger.error(error)
    }
  }

  const handleBulkInvite = async () => {
    if (selectedSubs.length === 0) {
      toast.error('Select at least one subcontractor')
      return
    }

    try {
      const invitations = selectedSubs.map((subId) => {
        const sub = existingSubcontractors.find((s) => s.id === subId)
        return {
          subcontractor_id: subId,
          company_name: sub?.company_name,
          contact_name: sub?.contact_name,
          contact_email: sub?.email || '',
          invitation_method: 'email' as const,
        }
      })

      await bulkSendInvitations.mutateAsync({ packageId: bidPackageId, invitations })
      toast.success(`${selectedSubs.length} invitation(s) sent successfully`)
      setSelectedSubs([])
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      toast.error('Failed to send invitations')
      logger.error(error)
    }
  }

  const toggleSubSelection = (subId: string) => {
    setSelectedSubs((prev) =>
      prev.includes(subId) ? prev.filter((id) => id !== subId) : [...prev, subId]
    )
  }

  const selectAll = () => {
    setSelectedSubs(filteredSubs.map((s) => s.id))
  }

  const clearSelection = () => {
    setSelectedSubs([])
  }

  const handleClose = () => {
    onOpenChange(false)
    form.reset()
    setSelectedSubs([])
    setSearchTerm('')
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Send Bid Invitations</DialogTitle>
          <DialogDescription>
            Invite subcontractors to bid on this package
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">
              From Directory ({availableSubs.length})
            </TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          </TabsList>

          {/* Existing Subcontractors Tab */}
          <TabsContent value="existing" className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or trade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              {selectedSubs.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Clear ({selectedSubs.length})
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All
              </Button>
            </div>

            <ScrollArea className="h-[300px] border rounded-md">
              {filteredSubs.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  No available subcontractors found
                </div>
              ) : (
                <div className="divide-y">
                  {filteredSubs.map((sub) => (
                    <div
                      key={sub.id}
                      className={`flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer ${
                        selectedSubs.includes(sub.id) ? 'bg-muted' : ''
                      }`}
                      onClick={() => toggleSubSelection(sub.id)}
                    >
                      <Checkbox
                        checked={selectedSubs.includes(sub.id)}
                        onCheckedChange={() => toggleSubSelection(sub.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{sub.company_name}</span>
                        </div>
                        {sub.contact_name && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="w-3 h-3" />
                            {sub.contact_name}
                          </div>
                        )}
                        {sub.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            {sub.email}
                          </div>
                        )}
                      </div>
                      {sub.trades && sub.trades.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {sub.trades.slice(0, 2).map((trade) => (
                            <Badge key={trade} variant="secondary" className="text-xs">
                              {trade}
                            </Badge>
                          ))}
                          {sub.trades.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{sub.trades.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleBulkInvite}
                disabled={selectedSubs.length === 0 || bulkSendInvitations.isPending}
              >
                {bulkSendInvitations.isPending
                  ? 'Sending...'
                  : `Send ${selectedSubs.length} Invitation${selectedSubs.length !== 1 ? 's' : ''}`}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* Manual Entry Tab */}
          <TabsContent value="manual">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleManualSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="ABC Construction" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contact_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="invitation_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Send Via</FormLabel>
                        <RadixSelect onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="portal">Portal Only</SelectItem>
                            <SelectItem value="fax">Fax</SelectItem>
                            <SelectItem value="mail">Mail</SelectItem>
                            <SelectItem value="phone">Phone</SelectItem>
                          </SelectContent>
                        </RadixSelect>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="contact_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="bidding@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contact_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={sendInvitation.isPending}>
                    {sendInvitation.isPending ? 'Sending...' : 'Send Invitation'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
