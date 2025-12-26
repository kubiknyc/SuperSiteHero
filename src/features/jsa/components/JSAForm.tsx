/**
 * JSAForm Component
 * Form for creating and editing Job Safety Analyses
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Shield,
  Calendar,
  MapPin,
  Clock,
  User,
  Users,
  Building,
  Thermometer,
  Cloud,
  Wrench,
  X,
  Plus,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { HazardEditor } from './HazardEditor';
import { useCreateJSA, useUpdateJSA, useJSATemplates } from '../hooks/useJSA';
import { useProjectUsers } from '@/features/messaging/hooks/useProjectUsers';
import type {
  JobSafetyAnalysis,
  JSAWithDetails,
  CreateJSADTO,
  UpdateJSADTO,
  CreateJSAHazardDTO,
  JSATemplateWithDetails,
} from '@/types/jsa';
import { JSA_CATEGORIES } from '@/types/jsa';
import { logger } from '../../../lib/utils/logger';


interface JSAFormProps {
  projectId: string;
  initialData?: JSAWithDetails;
  onSuccess?: (jsa: JobSafetyAnalysis) => void;
  onCancel?: () => void;
}

export function JSAForm({
  projectId,
  initialData,
  onSuccess,
  onCancel,
}: JSAFormProps) {
  const navigate = useNavigate();
  const isEditing = !!initialData;

  // Form state
  const [taskDescription, setTaskDescription] = useState(
    initialData?.task_description || ''
  );
  const [workLocation, setWorkLocation] = useState(
    initialData?.work_location || ''
  );
  const [scheduledDate, setScheduledDate] = useState(
    initialData?.scheduled_date || format(new Date(), 'yyyy-MM-dd')
  );
  const [startTime, setStartTime] = useState(initialData?.start_time || '');
  const [estimatedDuration, setEstimatedDuration] = useState(
    initialData?.estimated_duration || ''
  );
  const [supervisorId, setSupervisorId] = useState(
    initialData?.supervisor_id || ''
  );
  const [supervisorName, setSupervisorName] = useState(
    initialData?.supervisor_name || ''
  );
  const [foremanName, setForemanName] = useState(
    initialData?.foreman_name || ''
  );
  const [contractorCompany, setContractorCompany] = useState(
    initialData?.contractor_company || ''
  );
  const [weatherConditions, setWeatherConditions] = useState(
    initialData?.weather_conditions || ''
  );
  const [temperature, setTemperature] = useState(
    initialData?.temperature || ''
  );
  const [equipment, setEquipment] = useState<string[]>(
    initialData?.equipment_used || []
  );
  const [newEquipment, setNewEquipment] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [hazards, setHazards] = useState<CreateJSAHazardDTO[]>(
    initialData?.hazards?.map((h) => ({
      step_number: h.step_number,
      step_description: h.step_description,
      hazard_description: h.hazard_description,
      hazard_type: h.hazard_type || undefined,
      risk_level: h.risk_level,
      probability: h.probability || undefined,
      severity: h.severity || undefined,
      elimination_controls: h.elimination_controls || '',
      substitution_controls: h.substitution_controls || '',
      engineering_controls: h.engineering_controls || '',
      administrative_controls: h.administrative_controls || '',
      ppe_required: h.ppe_required || [],
      responsible_party: h.responsible_party || '',
      notes: h.notes || '',
    })) || []
  );

  // Queries
  const { data: templates } = useJSATemplates();
  const { data: projectUsers } = useProjectUsers(projectId);
  const createMutation = useCreateJSA();
  const updateMutation = useUpdateJSA();

  const isLoading = createMutation.isPending || updateMutation.isPending;

  // Apply template
  const handleApplyTemplate = (templateId: string) => {
    const template = templates?.find((t) => t.id === templateId);
    if (!template) {return;}

    setSelectedTemplateId(templateId);

    // Convert template hazards to form format
    if (template.default_hazards && template.default_hazards.length > 0) {
      const templateHazards: CreateJSAHazardDTO[] = template.default_hazards.map(
        (h, index) => ({
          step_number: index + 1,
          step_description: '',
          hazard_description: h.hazard,
          risk_level: h.risk_level,
          ppe_required: h.ppe || [],
          administrative_controls: h.controls?.join('\n') || '',
        })
      );
      setHazards(templateHazards);
    }
  };

  // Equipment management
  const addEquipment = () => {
    if (newEquipment.trim() && !equipment.includes(newEquipment.trim())) {
      setEquipment([...equipment, newEquipment.trim()]);
      setNewEquipment('');
    }
  };

  const removeEquipment = (item: string) => {
    setEquipment(equipment.filter((e) => e !== item));
  };

  // Form validation
  const isValid = taskDescription.trim() && scheduledDate;

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {return;}

    try {
      if (isEditing) {
        const updateData: UpdateJSADTO & { id: string } = {
          id: initialData.id,
          task_description: taskDescription,
          work_location: workLocation || undefined,
          equipment_used: equipment.length > 0 ? equipment : undefined,
          scheduled_date: scheduledDate,
          start_time: startTime || undefined,
          estimated_duration: estimatedDuration || undefined,
          supervisor_id: supervisorId || undefined,
          supervisor_name: supervisorName || undefined,
          foreman_name: foremanName || undefined,
          contractor_company: contractorCompany || undefined,
          weather_conditions: weatherConditions || undefined,
          temperature: temperature || undefined,
        };

        const updated = await updateMutation.mutateAsync(updateData);
        onSuccess?.(updated);
      } else {
        const createData: CreateJSADTO = {
          project_id: projectId,
          template_id: selectedTemplateId || undefined,
          task_description: taskDescription,
          work_location: workLocation || undefined,
          equipment_used: equipment.length > 0 ? equipment : undefined,
          scheduled_date: scheduledDate,
          start_time: startTime || undefined,
          estimated_duration: estimatedDuration || undefined,
          supervisor_id: supervisorId || undefined,
          supervisor_name: supervisorName || undefined,
          foreman_name: foremanName || undefined,
          contractor_company: contractorCompany || undefined,
          weather_conditions: weatherConditions || undefined,
          temperature: temperature || undefined,
          hazards: hazards.filter(
            (h) => h.step_description && h.hazard_description
          ),
        };

        const created = await createMutation.mutateAsync(createData);
        onSuccess?.(created);
        if (!onSuccess) {
          navigate(`/projects/${projectId}/jsa/${created.id}`);
        }
      }
    } catch (error) {
      logger.error('Failed to save JSA:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Template Selection (Create mode only) */}
      {!isEditing && templates && templates.length > 0 && (
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Start from Template (Optional)
            </CardTitle>
            <CardDescription>
              Apply a template to pre-fill hazards and controls
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Select
              value={selectedTemplateId}
              onValueChange={handleApplyTemplate}
            >
              <SelectTrigger className="w-full md:w-[400px]">
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div>
                      <span>{template.name}</span>
                      {template.category && (
                        <span className="text-muted-foreground ml-2">
                          ({template.category})
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Task Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task" className="flex items-center gap-1">
              Task Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="task"
              placeholder="Describe the task or work activity to be performed"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              rows={3}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Work Location
              </Label>
              <Input
                id="location"
                placeholder="Where will the work take place?"
                value={workLocation}
                onChange={(e) => setWorkLocation(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractor" className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                Contractor Company
              </Label>
              <Input
                id="contractor"
                placeholder="Company performing the work"
                value={contractorCompany}
                onChange={(e) => setContractorCompany(e.target.value)}
              />
            </div>
          </div>

          {/* Equipment */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              Equipment Used
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add equipment or tools"
                value={newEquipment}
                onChange={(e) => setNewEquipment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addEquipment();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addEquipment}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {equipment.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {equipment.map((item) => (
                  <Badge key={item} variant="secondary">
                    {item}
                    <button
                      type="button"
                      onClick={() => removeEquipment(item)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scheduling */}
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-1">
                Scheduled Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time" className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Start Time
              </Label>
              <Input
                id="time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Estimated Duration</Label>
              <Input
                id="duration"
                placeholder="e.g., 4 hours, 2 days"
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Responsible Parties */}
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Responsible Parties
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="supervisor" className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Supervisor
              </Label>
              {projectUsers && projectUsers.length > 0 ? (
                <Select
                  value={supervisorId}
                  onValueChange={(id) => {
                    setSupervisorId(id);
                    const projectUser = projectUsers.find((pu) => pu.user_id === id);
                    if (projectUser?.user) {
                      const fullName = [projectUser.user.first_name, projectUser.user.last_name]
                        .filter(Boolean)
                        .join(' ');
                      setSupervisorName(fullName || '');
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supervisor" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectUsers.map((projectUser) => {
                      const fullName = projectUser.user
                        ? [projectUser.user.first_name, projectUser.user.last_name]
                            .filter(Boolean)
                            .join(' ')
                        : '';
                      return (
                        <SelectItem key={projectUser.user_id} value={projectUser.user_id}>
                          {fullName || projectUser.user?.email || 'Unknown'}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="supervisor"
                  placeholder="Supervisor name"
                  value={supervisorName}
                  onChange={(e) => setSupervisorName(e.target.value)}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="foreman">Foreman / Lead</Label>
              <Input
                id="foreman"
                placeholder="Foreman or crew lead name"
                value={foremanName}
                onChange={(e) => setForemanName(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Site Conditions */}
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            Site Conditions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="weather">Weather Conditions</Label>
              <Input
                id="weather"
                placeholder="e.g., Clear, sunny, 75F"
                value={weatherConditions}
                onChange={(e) => setWeatherConditions(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="temp" className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-muted-foreground" />
                Temperature
              </Label>
              <Input
                id="temp"
                placeholder="e.g., 75F / 24C"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Hazards Editor */}
      <HazardEditor hazards={hazards} onChange={setHazards} />

      {/* Form Actions */}
      <div className="flex justify-end gap-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel || (() => navigate(-1))}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!isValid || isLoading}>
          {isLoading
            ? isEditing
              ? 'Saving...'
              : 'Creating...'
            : isEditing
            ? 'Save Changes'
            : 'Create JSA'}
        </Button>
      </div>
    </form>
  );
}

export default JSAForm;
