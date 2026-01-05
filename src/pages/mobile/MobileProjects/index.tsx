/**
 * Mobile Projects Pages
 *
 * Simplified project navigation for field workers.
 */

import { memo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronRight,
  Building2,
  MapPin,
  Users,
  Camera,
  ClipboardList,
  ListChecks,
  FileCheck,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { useSelectedProject } from '../../../hooks/useSelectedProject';
import { cn } from '../../../lib/utils';

// Project selection list
export const MobileProjectsList = memo(function MobileProjectsList() {
  const navigate = useNavigate();
  const { selectedProject, setSelectedProjectId } = useSelectedProject();

  // Mock data
  const projects = [
    {
      id: '1',
      name: 'Building A - Office Complex',
      address: '123 Main Street',
      status: 'active',
      progress: 65,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    },
    {
      id: '2',
      name: 'Building B - Retail Center',
      address: '456 Oak Avenue',
      status: 'active',
      progress: 40,
      startDate: '2024-02-15',
      endDate: '2025-03-01',
    },
    {
      id: '3',
      name: 'Building C - Warehouse',
      address: '789 Industrial Blvd',
      status: 'planning',
      progress: 10,
      startDate: '2024-06-01',
      endDate: '2025-06-01',
    },
  ];

  const handleSelectProject = (project: typeof projects[0]) => {
    setSelectedProjectId(project.id);
    navigate(`/projects/${project.id}`);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <h1 className="text-xl font-bold text-foreground">Projects</h1>

      {/* Search */}
      <Input placeholder="Search projects..." />

      {/* Projects list */}
      <div className="space-y-3">
        {projects.map((project) => (
          <Card
            key={project.id}
            className={cn(
              "cursor-pointer hover:border-primary/50 transition-colors",
              selectedProject?.id === project.id && "border-primary"
            )}
            onClick={() => handleSelectProject(project)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-foreground truncate">{project.name}</p>
                    {selectedProject?.id === project.id && (
                      <Badge variant="default" className="text-xs">Selected</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{project.address}</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{project.progress}% complete</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
});

// Project detail view
export const MobileProjectDetail = memo(function MobileProjectDetail() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { selectedProject } = useSelectedProject();

  // Mock data (would use projectId to fetch)
  const project = selectedProject || {
    id: projectId,
    name: 'Building A - Office Complex',
    address: '123 Main Street, City, State 12345',
    status: 'active',
    progress: 65,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    manager: 'John Doe',
    crewCount: 25,
  };

  const quickActions = [
    { icon: Camera, label: 'Photos', path: `/projects/${projectId}/photo-progress` },
    { icon: ClipboardList, label: 'Reports', path: '/daily-reports' },
    { icon: ListChecks, label: 'Punch List', path: '/punch-lists' },
    { icon: FileCheck, label: 'Inspections', path: '/inspections' },
  ];

  const stats = [
    { label: 'Open Punch Items', value: 12 },
    { label: 'Pending Inspections', value: 3 },
    { label: 'Tasks Due Today', value: 5 },
    { label: 'Photos This Week', value: 28 },
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Project header */}
      <div>
        <Badge variant="outline" className="mb-2">{project.status}</Badge>
        <h1 className="text-xl font-bold text-foreground">{project.name}</h1>
        <div className="flex items-center gap-1 text-muted-foreground mt-1">
          <MapPin className="h-4 w-4" />
          <span className="text-sm">{project.address}</span>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Project Progress</span>
            <span className="text-sm font-bold text-primary">{project.progress}%</span>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${project.progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Start: {project.startDate}</span>
            <span>End: {project.endDate}</span>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-3">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => navigate(action.path)}
            className="flex flex-col items-center gap-2 p-3 bg-card rounded-lg border border-border hover:border-primary/50 transition-colors"
          >
            <action.icon className="h-6 w-6 text-primary" />
            <span className="text-xs font-medium text-foreground">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Quick Stats</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Team */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Project Manager</p>
              <p className="font-medium">{project.manager || 'Not assigned'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Documents */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => navigate(`/documents`)}
      >
        <FileText className="h-4 w-4 mr-2" />
        View Documents
      </Button>
    </div>
  );
});

export default MobileProjectsList;
