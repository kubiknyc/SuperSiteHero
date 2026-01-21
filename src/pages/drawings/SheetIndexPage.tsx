/**
 * Sheet Index Page
 * Manage and organize drawing sets (sheet indices) for the project
 */

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  FileStack,
  Plus,
  Search,
  Download,
  Layers,
  Calendar,
  CheckCircle2,
  Clock,
  MoreHorizontal,
  ExternalLink,
  Trash2,
  Edit,
  Copy,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useDrawingSets,
  useCreateDrawingSet,
  useSetCurrentDrawingSet,
} from '@/features/drawings/hooks/useDrawings';
import { useProjectContext } from '@/lib/contexts/ProjectContext';
import { ISSUE_PURPOSES, type DrawingSet, type DrawingSetStatus } from '@/types/drawing';
import { toast } from 'sonner';

const STATUS_COLORS: Record<DrawingSetStatus, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  issued: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  superseded: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
};

const STATUS_LABELS: Record<DrawingSetStatus, string> = {
  draft: 'Draft',
  issued: 'Issued',
  superseded: 'Superseded',
};

interface CreateSetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  companyId: string;
}

function CreateSetDialog({ open, onOpenChange, projectId, companyId }: CreateSetDialogProps) {
  const [name, setName] = useState('');
  const [setNumber, setSetNumber] = useState('');
  const [description, setDescription] = useState('');
  const [setDate, setSetDate] = useState(new Date().toISOString().split('T')[0]);
  const [issuePurpose, setIssuePurpose] = useState<string>('For Construction');

  const createSet = useCreateDrawingSet();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createSet.mutateAsync({
        companyId,
        projectId,
        name,
        setNumber: setNumber || undefined,
        description: description || undefined,
        setDate,
        issuePurpose,
        status: 'draft',
      });
      toast.success('Sheet index created successfully');
      onOpenChange(false);
      setName('');
      setSetNumber('');
      setDescription('');
      setIssuePurpose('For Construction');
    } catch (_error) {
      toast.error('Failed to create sheet index');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Sheet Index</DialogTitle>
            <DialogDescription>
              Create a new sheet index to organize your drawings
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., IFC Set - Phase 1"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="setNumber">Set Number</Label>
                <Input
                  id="setNumber"
                  value={setNumber}
                  onChange={(e) => setSetNumber(e.target.value)}
                  placeholder="e.g., SET-001"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="setDate">Issue Date *</Label>
                <Input
                  id="setDate"
                  type="date"
                  value={setDate}
                  onChange={(e) => setSetDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="issuePurpose">Issue Purpose</Label>
              <Select value={issuePurpose} onValueChange={setIssuePurpose}>
                <SelectTrigger>
                  <SelectValue placeholder="Select purpose" />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_PURPOSES.map((purpose) => (
                    <SelectItem key={purpose.value} value={purpose.value}>
                      {purpose.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name || createSet.isPending}>
              {createSet.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface SheetIndexCardProps {
  set: DrawingSet;
  projectId: string;
  onSetCurrent: (setId: string) => void;
  isSettingCurrent: boolean;
}

function SheetIndexCard({ set, projectId, onSetCurrent, isSettingCurrent }: SheetIndexCardProps) {
  return (
    <Card className={set.isCurrent ? 'border-primary ring-1 ring-primary' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{set.name}</CardTitle>
              {set.isCurrent && (
                <Badge variant="default" className="text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  Current
                </Badge>
              )}
            </div>
            {set.setNumber && (
              <p className="text-sm text-muted-foreground">{set.setNumber}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/projects/${projectId}/drawings/sheet-index/${set.id}`}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              {!set.isCurrent && (
                <DropdownMenuItem
                  onClick={() => onSetCurrent(set.id)}
                  disabled={isSettingCurrent}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Set as Current
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {set.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {set.description}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={STATUS_COLORS[set.status]}>
              {STATUS_LABELS[set.status]}
            </Badge>
            {set.issuePurpose && (
              <Badge variant="secondary">{set.issuePurpose}</Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Layers className="h-4 w-4" />
              <span>{set.itemCount ?? 0} drawings</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(set.setDate), 'MMM d, yyyy')}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SheetIndexPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject: project } = useProjectContext();
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: sets, isLoading } = useDrawingSets(projectId);
  const setCurrentMutation = useSetCurrentDrawingSet();

  const filteredSets = sets?.filter((set) => {
    if (!search) {return true;}
    const searchLower = search.toLowerCase();
    return (
      set.name.toLowerCase().includes(searchLower) ||
      set.setNumber?.toLowerCase().includes(searchLower) ||
      set.description?.toLowerCase().includes(searchLower)
    );
  });

  const currentSet = sets?.find((s) => s.isCurrent);
  const draftSets = filteredSets?.filter((s) => s.status === 'draft') || [];
  const issuedSets = filteredSets?.filter((s) => s.status === 'issued') || [];
  const supersededSets = filteredSets?.filter((s) => s.status === 'superseded') || [];

  const handleSetCurrent = async (setId: string) => {
    if (!projectId) {return;}
    try {
      await setCurrentMutation.mutateAsync({ setId, projectId });
      toast.success('Current sheet index updated');
    } catch (_error) {
      toast.error('Failed to update current sheet index');
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-page flex items-center gap-2">
            <FileStack className="h-6 w-6" />
            Sheet Index
          </h1>
          <p className="text-muted-foreground">
            Organize and manage drawing sets for distribution
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Sheet Index
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sets?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Issued
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{issuedSets.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="h-4 w-4 text-gray-500" />
              Draft
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftSets.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Set
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium truncate">
              {currentSet?.name || 'None selected'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search sheet indices..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && (!sets || sets.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileStack className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="heading-card">No sheet indices yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first sheet index to organize drawings
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Sheet Index
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sets Grid */}
      {!isLoading && filteredSets && filteredSets.length > 0 && (
        <div className="space-y-6">
          {/* Current Set (if exists) */}
          {currentSet && (
            <div>
              <h2 className="heading-section mb-3 flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Current Set
              </h2>
              <div className="max-w-md">
                <SheetIndexCard
                  set={currentSet}
                  projectId={projectId || ''}
                  onSetCurrent={handleSetCurrent}
                  isSettingCurrent={setCurrentMutation.isPending}
                />
              </div>
            </div>
          )}

          {/* Draft Sets */}
          {draftSets.length > 0 && (
            <div>
              <h2 className="heading-section mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-500" />
                Draft ({draftSets.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {draftSets.map((set) => (
                  <SheetIndexCard
                    key={set.id}
                    set={set}
                    projectId={projectId || ''}
                    onSetCurrent={handleSetCurrent}
                    isSettingCurrent={setCurrentMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Issued Sets */}
          {issuedSets.length > 0 && (
            <div>
              <h2 className="heading-section mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Issued ({issuedSets.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {issuedSets.filter(s => !s.isCurrent).map((set) => (
                  <SheetIndexCard
                    key={set.id}
                    set={set}
                    projectId={projectId || ''}
                    onSetCurrent={handleSetCurrent}
                    isSettingCurrent={setCurrentMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Superseded Sets */}
          {supersededSets.length > 0 && (
            <div>
              <h2 className="heading-section mb-3 text-muted-foreground">
                Superseded ({supersededSets.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-75">
                {supersededSets.map((set) => (
                  <SheetIndexCard
                    key={set.id}
                    set={set}
                    projectId={projectId || ''}
                    onSetCurrent={handleSetCurrent}
                    isSettingCurrent={setCurrentMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Dialog */}
      {projectId && project?.company_id && (
        <CreateSetDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          projectId={projectId}
          companyId={project.company_id}
        />
      )}
    </div>
  );
}
