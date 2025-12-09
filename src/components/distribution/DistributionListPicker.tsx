/**
 * DistributionListPicker Component
 * Reusable component for selecting recipients from saved lists or ad-hoc
 */

import { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  ListPlus,
  Mail,
  Building,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useProjectDistributionLists } from '@/features/distribution-lists/hooks/useDistributionLists';
import { useProjectUsers } from '@/features/messaging/hooks/useProjectUsers';
import type {
  DistributionListWithCount,
  DistributionSelection,
  ResolvedRecipient,
  DistributionListType,
} from '@/types/distribution-list';

interface DistributionListPickerProps {
  projectId: string;
  listType?: DistributionListType;
  value: DistributionSelection;
  onChange: (selection: DistributionSelection) => void;
  disabled?: boolean;
  showRoles?: boolean;
  label?: string;
  description?: string;
  className?: string;
}

interface ExternalContact {
  email: string;
  name?: string;
  company?: string;
}

export function DistributionListPicker({
  projectId,
  listType,
  value,
  onChange,
  disabled,
  showRoles = false,
  label = 'Distribution List',
  description = 'Add team members who should receive copies.',
  className,
}: DistributionListPickerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'lists' | 'users' | 'external'>('users');
  const [searchFilter, setSearchFilter] = useState('');
  const [newExternalEmail, setNewExternalEmail] = useState('');
  const [newExternalName, setNewExternalName] = useState('');

  // Fetch available lists and project users
  const { data: lists, isLoading: isLoadingLists } = useProjectDistributionLists(
    projectId,
    listType
  );
  const { data: projectUsers, isLoading: isLoadingUsers } = useProjectUsers(projectId);

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!projectUsers) return [];
    if (!searchFilter) return projectUsers;

    const lowerFilter = searchFilter.toLowerCase();
    return projectUsers.filter((pu) => {
      if (!pu.user) return false;
      const fullName = [pu.user.first_name, pu.user.last_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return (
        fullName.includes(lowerFilter) ||
        pu.user.email.toLowerCase().includes(lowerFilter) ||
        pu.user.company?.name?.toLowerCase().includes(lowerFilter)
      );
    });
  }, [projectUsers, searchFilter]);

  // Filter lists based on search
  const filteredLists = useMemo(() => {
    if (!lists) return [];
    if (!searchFilter) return lists;

    const lowerFilter = searchFilter.toLowerCase();
    return lists.filter(
      (list) =>
        list.name.toLowerCase().includes(lowerFilter) ||
        list.description?.toLowerCase().includes(lowerFilter)
    );
  }, [lists, searchFilter]);

  // Get selected recipients for display
  const selectedRecipients = useMemo((): ResolvedRecipient[] => {
    const recipients: ResolvedRecipient[] = [];

    // From ad-hoc users
    value.userIds.forEach((userId) => {
      const pu = projectUsers?.find((p) => p.user_id === userId);
      if (pu?.user) {
        recipients.push({
          id: userId,
          type: 'user',
          user_id: userId,
          email: pu.user.email,
          name: [pu.user.first_name, pu.user.last_name].filter(Boolean).join(' ') || pu.user.email,
          company: pu.user.company?.name,
          avatar_url: pu.user.avatar_url,
          source: 'adhoc',
        });
      }
    });

    // From external contacts
    value.externalContacts.forEach((contact, index) => {
      recipients.push({
        id: `external-${index}-${contact.email}`,
        type: 'external',
        email: contact.email,
        name: contact.name || contact.email,
        company: contact.company,
        source: 'adhoc',
      });
    });

    return recipients;
  }, [value, projectUsers]);

  // Toggle user selection
  const toggleUser = (userId: string) => {
    const newUserIds = value.userIds.includes(userId)
      ? value.userIds.filter((id) => id !== userId)
      : [...value.userIds, userId];
    onChange({ ...value, userIds: newUserIds });
  };

  // Toggle list selection
  const toggleList = (listId: string) => {
    const newListIds = value.listIds.includes(listId)
      ? value.listIds.filter((id) => id !== listId)
      : [...value.listIds, listId];
    onChange({ ...value, listIds: newListIds });
  };

  // Add external contact
  const addExternalContact = () => {
    if (!newExternalEmail.trim()) return;

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newExternalEmail.trim())) return;

    // Check for duplicates
    const exists = value.externalContacts.some(
      (c) => c.email.toLowerCase() === newExternalEmail.trim().toLowerCase()
    );
    if (exists) return;

    const newContact: ExternalContact = {
      email: newExternalEmail.trim(),
      name: newExternalName.trim() || undefined,
    };

    onChange({
      ...value,
      externalContacts: [...value.externalContacts, newContact],
    });

    setNewExternalEmail('');
    setNewExternalName('');
  };

  // Remove recipient
  const removeRecipient = (recipient: ResolvedRecipient) => {
    if (recipient.type === 'user' && recipient.user_id) {
      onChange({
        ...value,
        userIds: value.userIds.filter((id) => id !== recipient.user_id),
      });
    } else if (recipient.type === 'external') {
      onChange({
        ...value,
        externalContacts: value.externalContacts.filter(
          (c) => c.email.toLowerCase() !== recipient.email.toLowerCase()
        ),
      });
    }
  };

  const totalCount = selectedRecipients.length + value.listIds.length;

  return (
    <Collapsible
      open={isExpanded}
      onOpenChange={setIsExpanded}
      className={cn('space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg', className)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-blue-800">
          <Users className="h-4 w-4" />
          <span className="font-medium text-sm">{label}</span>
          {totalCount > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {totalCount}
            </Badge>
          )}
        </div>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className="text-xs"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Hide
              </>
            ) : (
              <>
                <UserPlus className="h-3 w-3 mr-1" />
                Add Recipients
              </>
            )}
          </Button>
        </CollapsibleTrigger>
      </div>

      <p className="text-xs text-blue-700">{description}</p>

      {/* Selected recipients display */}
      {(selectedRecipients.length > 0 || value.listIds.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {/* Selected lists */}
          {value.listIds.map((listId) => {
            const list = lists?.find((l) => l.id === listId);
            if (!list) return null;
            return (
              <div
                key={listId}
                className="flex items-center gap-1 bg-purple-100 border border-purple-200 rounded-full pl-2 pr-1 py-1"
              >
                <ListPlus className="h-3 w-3 text-purple-600" />
                <span className="text-sm text-purple-900">{list.name}</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-purple-300 text-purple-700">
                  {list.member_count}
                </Badge>
                <button
                  type="button"
                  onClick={() => toggleList(listId)}
                  className="text-purple-400 hover:text-purple-600 ml-1 p-0.5"
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}

          {/* Selected individual recipients */}
          {selectedRecipients.map((recipient) => (
            <div
              key={recipient.id}
              className={cn(
                'flex items-center gap-1 rounded-full pl-1 pr-2 py-1',
                recipient.type === 'user'
                  ? 'bg-white border border-blue-200'
                  : 'bg-green-50 border border-green-200'
              )}
            >
              {recipient.type === 'user' ? (
                recipient.avatar_url ? (
                  <img
                    src={recipient.avatar_url}
                    alt=""
                    className="h-5 w-5 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px] text-blue-600">
                    {recipient.name.charAt(0) || '?'}
                  </div>
                )
              ) : (
                <Mail className="h-4 w-4 text-green-600 ml-0.5" />
              )}
              <span
                className={cn(
                  'text-sm',
                  recipient.type === 'user' ? 'text-blue-900' : 'text-green-900'
                )}
              >
                {recipient.name}
              </span>
              <button
                type="button"
                onClick={() => removeRecipient(recipient)}
                className={cn(
                  'ml-1',
                  recipient.type === 'user'
                    ? 'text-blue-400 hover:text-blue-600'
                    : 'text-green-400 hover:text-green-600'
                )}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search lists, members, or emails..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-9 bg-white"
            disabled={disabled}
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              Team ({filteredUsers.length})
            </TabsTrigger>
            <TabsTrigger value="lists" className="text-xs">
              <ListPlus className="h-3 w-3 mr-1" />
              Lists ({filteredLists.length})
            </TabsTrigger>
            <TabsTrigger value="external" className="text-xs">
              <Mail className="h-3 w-3 mr-1" />
              External
            </TabsTrigger>
          </TabsList>

          {/* Team Members Tab */}
          <TabsContent value="users" className="mt-2">
            <ScrollArea className="h-[200px] bg-white border rounded-lg">
              {isLoadingUsers ? (
                <div className="p-4 space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  {searchFilter ? 'No matching members found' : 'No members in this project'}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredUsers.map((pu) => {
                    if (!pu.user) return null;
                    const isSelected = value.userIds.includes(pu.user_id);
                    const fullName = [pu.user.first_name, pu.user.last_name]
                      .filter(Boolean)
                      .join(' ');

                    return (
                      <button
                        key={pu.user_id}
                        type="button"
                        onClick={() => toggleUser(pu.user_id)}
                        disabled={disabled}
                        className={cn(
                          'w-full flex items-center gap-3 p-2 text-left hover:bg-muted/50',
                          isSelected && 'bg-blue-50'
                        )}
                      >
                        {pu.user.avatar_url ? (
                          <img
                            src={pu.user.avatar_url}
                            alt=""
                            className="h-7 w-7 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs">
                            {fullName.charAt(0) || '?'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {fullName || 'Unknown User'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {pu.user.company?.name || pu.user.email}
                          </p>
                        </div>
                        {pu.project_role && (
                          <span className="text-xs text-muted-foreground capitalize px-2 py-0.5 bg-muted rounded">
                            {pu.project_role.replace('_', ' ')}
                          </span>
                        )}
                        {isSelected && (
                          <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Saved Lists Tab */}
          <TabsContent value="lists" className="mt-2">
            <ScrollArea className="h-[200px] bg-white border rounded-lg">
              {isLoadingLists ? (
                <div className="p-4 space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : filteredLists.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  {searchFilter ? 'No matching lists found' : 'No distribution lists available'}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredLists.map((list) => {
                    const isSelected = value.listIds.includes(list.id);
                    return (
                      <button
                        key={list.id}
                        type="button"
                        onClick={() => toggleList(list.id)}
                        disabled={disabled}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50',
                          isSelected && 'bg-purple-50'
                        )}
                      >
                        <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                          <ListPlus className="h-4 w-4 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{list.name}</p>
                            {list.is_default && (
                              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {list.member_count} members
                            {list.description && ` - ${list.description}`}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            list.project_id ? 'border-blue-200 text-blue-700' : 'border-gray-200'
                          )}
                        >
                          {list.project_id ? 'Project' : 'Company'}
                        </Badge>
                        {isSelected && (
                          <Check className="h-4 w-4 text-purple-600 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* External Tab */}
          <TabsContent value="external" className="mt-2">
            <div className="bg-white border rounded-lg p-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                Add external email addresses for people not in the system.
              </p>
              <div className="flex gap-2">
                <div className="flex-1 space-y-2">
                  <Input
                    type="email"
                    placeholder="Email address *"
                    value={newExternalEmail}
                    onChange={(e) => setNewExternalEmail(e.target.value)}
                    disabled={disabled}
                    className="h-9"
                  />
                  <Input
                    placeholder="Name (optional)"
                    value={newExternalName}
                    onChange={(e) => setNewExternalName(e.target.value)}
                    disabled={disabled}
                    className="h-9"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addExternalContact();
                      }
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addExternalContact}
                  disabled={disabled || !newExternalEmail.trim()}
                  className="h-[76px]"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>

              {value.externalContacts.length > 0 && (
                <div className="space-y-1 pt-2 border-t">
                  <Label className="text-xs text-muted-foreground">Added external contacts:</Label>
                  <div className="flex flex-wrap gap-1">
                    {value.externalContacts.map((contact, index) => (
                      <Badge
                        key={`${contact.email}-${index}`}
                        variant="secondary"
                        className="bg-green-50 text-green-800 border-green-200"
                      >
                        {contact.name || contact.email}
                        <button
                          type="button"
                          onClick={() =>
                            onChange({
                              ...value,
                              externalContacts: value.externalContacts.filter(
                                (_, i) => i !== index
                              ),
                            })
                          }
                          className="ml-1 hover:text-green-600"
                          disabled={disabled}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default DistributionListPicker;
