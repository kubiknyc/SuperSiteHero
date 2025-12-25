/**
 * Visualization Service
 *
 * Service for managing 3D models, BIM data, VR tours, and AR sessions.
 * Integrates with Supabase for storage and database operations.
 */

import { supabase } from '@/lib/supabase';
import type {
  Model3DMetadata,
  IFCModel,
  IFCElement,
  VRTour,
  VRTourNode,
  VRAnnotation,
  Photo360Data,
  ModelLoadProgress,
} from '@/types/visualization';

// ============================================================================
// Types
// ============================================================================

export interface Model3DRecord {
  id: string;
  project_id: string;
  organization_id: string;
  name: string;
  description?: string;
  file_name: string;
  file_size: number;
  file_path: string;
  format: string;
  status: 'pending' | 'processing' | 'ready' | 'failed' | 'archived';
  processing_error?: string;
  processed_at?: string;
  triangle_count?: number;
  vertex_count?: number;
  material_count?: number;
  texture_count?: number;
  has_animations?: boolean;
  animation_names?: string[];
  bounding_box_min?: { x: number; y: number; z: number };
  bounding_box_max?: { x: number; y: number; z: number };
  center_point?: { x: number; y: number; z: number };
  default_camera_position?: { x: number; y: number; z: number };
  default_camera_target?: { x: number; y: number; z: number };
  default_scale?: number;
  optimized_file_path?: string;
  thumbnail_url?: string;
  preview_url?: string;
  lod_versions?: Array<{ level: number; path: string; triangles: number }>;
  tags?: string[];
  category?: string;
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
}

export interface VRTourRecord {
  id: string;
  project_id: string;
  organization_id: string;
  name: string;
  description?: string;
  start_node_id?: string;
  auto_rotate?: boolean;
  show_compass?: boolean;
  allow_zoom?: boolean;
  transition_duration?: number;
  transition_type?: string;
  is_public?: boolean;
  share_token?: string;
  view_count?: number;
  last_viewed_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface VRTourNodeRecord {
  id: string;
  tour_id: string;
  photo_id?: string;
  photo_url: string;
  thumbnail_url?: string;
  name: string;
  description?: string;
  position?: { x: number; y: number; z: number };
  initial_heading?: number;
  initial_pitch?: number;
  initial_zoom?: number;
  sequence_order?: number;
  floor_level?: string;
  captured_at?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateModelOptions {
  projectId: string;
  organizationId: string;
  name: string;
  description?: string;
  tags?: string[];
  category?: string;
}

export interface CreateVRTourOptions {
  projectId: string;
  organizationId: string;
  name: string;
  description?: string;
  isPublic?: boolean;
}

// ============================================================================
// 3D Models Service
// ============================================================================

export const modelsService = {
  /**
   * Get all models for a project
   */
  async getModels(projectId: string): Promise<Model3DMetadata[]> {
    const { data, error } = await supabase
      .from('models_3d')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching models:', error);
      throw error;
    }

    return (data || []).map(recordToMetadata);
  },

  /**
   * Get a single model by ID
   */
  async getModel(modelId: string): Promise<Model3DMetadata | null> {
    const { data, error } = await supabase
      .from('models_3d')
      .select('*')
      .eq('id', modelId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {return null;}
      console.error('Error fetching model:', error);
      throw error;
    }

    return data ? recordToMetadata(data) : null;
  },

  /**
   * Upload a new 3D model
   */
  async uploadModel(
    file: File,
    options: CreateModelOptions,
    onProgress?: (progress: ModelLoadProgress) => void
  ): Promise<Model3DMetadata> {
    onProgress?.({
      loaded: 0,
      total: file.size,
      percentage: 0,
      stage: 'downloading',
    });

    // Determine file format from extension
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const format = ['gltf', 'glb', 'obj', 'fbx', 'ifc', 'step', 'stl'].includes(ext)
      ? ext
      : 'glb';

    // Upload file to storage
    const filePath = `${options.organizationId}/${options.projectId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('models-3d')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      throw uploadError;
    }

    onProgress?.({
      loaded: file.size,
      total: file.size,
      percentage: 50,
      stage: 'processing',
    });

    // Create database record
    const { data, error } = await supabase
      .from('models_3d')
      .insert({
        project_id: options.projectId,
        organization_id: options.organizationId,
        name: options.name,
        description: options.description,
        file_name: file.name,
        file_size: file.size,
        file_path: filePath,
        format,
        status: 'pending',
        tags: options.tags,
        category: options.category,
        uploaded_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();

    if (error) {
      // Clean up uploaded file
      await supabase.storage.from('models-3d').remove([filePath]);
      console.error('Error creating model record:', error);
      throw error;
    }

    onProgress?.({
      loaded: file.size,
      total: file.size,
      percentage: 100,
      stage: 'complete',
    });

    return recordToMetadata(data);
  },

  /**
   * Update model metadata
   */
  async updateModel(
    modelId: string,
    updates: Partial<Pick<Model3DMetadata, 'name' | 'description' | 'tags'>>
  ): Promise<Model3DMetadata> {
    const { data, error } = await supabase
      .from('models_3d')
      .update({
        name: updates.name,
        description: updates.description,
        tags: updates.tags,
      })
      .eq('id', modelId)
      .select()
      .single();

    if (error) {
      console.error('Error updating model:', error);
      throw error;
    }

    return recordToMetadata(data);
  },

  /**
   * Delete a model
   */
  async deleteModel(modelId: string): Promise<void> {
    // Get the model first to find the file path
    const { data: model } = await supabase
      .from('models_3d')
      .select('file_path')
      .eq('id', modelId)
      .single();

    // Delete from database
    const { error } = await supabase
      .from('models_3d')
      .delete()
      .eq('id', modelId);

    if (error) {
      console.error('Error deleting model:', error);
      throw error;
    }

    // Delete file from storage
    if (model?.file_path) {
      await supabase.storage.from('models-3d').remove([model.file_path]);
    }
  },

  /**
   * Get signed URL for model file
   */
  async getModelUrl(filePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('models-3d')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) {
      console.error('Error getting signed URL:', error);
      throw error;
    }

    return data.signedUrl;
  },
};

// ============================================================================
// VR Tours Service
// ============================================================================

export const vrToursService = {
  /**
   * Get all VR tours for a project
   */
  async getTours(projectId: string): Promise<VRTour[]> {
    const { data, error } = await supabase
      .from('vr_tours')
      .select(`
        *,
        nodes:vr_tour_nodes(*)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching VR tours:', error);
      throw error;
    }

    return (data || []).map(tourRecordToTour);
  },

  /**
   * Get a single tour with all nodes
   */
  async getTour(tourId: string): Promise<VRTour | null> {
    const { data, error } = await supabase
      .from('vr_tours')
      .select(`
        *,
        nodes:vr_tour_nodes(
          *,
          annotations:vr_tour_annotations(*)
        )
      `)
      .eq('id', tourId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {return null;}
      console.error('Error fetching tour:', error);
      throw error;
    }

    return data ? tourRecordToTour(data) : null;
  },

  /**
   * Create a new VR tour
   */
  async createTour(options: CreateVRTourOptions): Promise<VRTour> {
    const { data, error } = await supabase
      .from('vr_tours')
      .insert({
        project_id: options.projectId,
        organization_id: options.organizationId,
        name: options.name,
        description: options.description,
        is_public: options.isPublic || false,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating tour:', error);
      throw error;
    }

    return tourRecordToTour({ ...data, nodes: [] });
  },

  /**
   * Add a node to a tour
   */
  async addNode(
    tourId: string,
    photo: Photo360Data,
    sequenceOrder?: number
  ): Promise<VRTourNode> {
    const { data, error } = await supabase
      .from('vr_tour_nodes')
      .insert({
        tour_id: tourId,
        photo_id: photo.id,
        photo_url: photo.url,
        thumbnail_url: photo.thumbnailUrl,
        name: photo.name,
        position: photo.location,
        initial_heading: photo.heading || 0,
        initial_pitch: photo.pitch || 0,
        sequence_order: sequenceOrder,
        captured_at: photo.capturedAt,
        tags: photo.tags,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding tour node:', error);
      throw error;
    }

    return nodeRecordToNode(data);
  },

  /**
   * Create connection between nodes
   */
  async createConnection(
    sourceNodeId: string,
    targetNodeId: string,
    yaw: number,
    pitch: number,
    options?: { label?: string; isBidirectional?: boolean }
  ): Promise<void> {
    const { error } = await supabase
      .from('vr_tour_connections')
      .insert({
        source_node_id: sourceNodeId,
        target_node_id: targetNodeId,
        yaw,
        pitch,
        label: options?.label,
        is_bidirectional: options?.isBidirectional ?? true,
      });

    if (error) {
      console.error('Error creating connection:', error);
      throw error;
    }
  },

  /**
   * Add annotation to a node
   */
  async addAnnotation(
    nodeId: string,
    annotation: Omit<VRAnnotation, 'id'>
  ): Promise<VRAnnotation> {
    const { data, error } = await supabase
      .from('vr_tour_annotations')
      .insert({
        node_id: nodeId,
        type: annotation.type,
        title: annotation.title,
        content: annotation.content,
        yaw: annotation.position.yaw,
        pitch: annotation.position.pitch,
        scale: annotation.scale,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding annotation:', error);
      throw error;
    }

    return {
      id: data.id,
      type: data.type,
      position: { yaw: data.yaw, pitch: data.pitch },
      content: data.content,
      title: data.title,
      scale: data.scale,
    };
  },

  /**
   * Delete a tour
   */
  async deleteTour(tourId: string): Promise<void> {
    const { error } = await supabase
      .from('vr_tours')
      .delete()
      .eq('id', tourId);

    if (error) {
      console.error('Error deleting tour:', error);
      throw error;
    }
  },

  /**
   * Track tour view
   */
  async trackView(tourId: string): Promise<void> {
    await supabase.rpc('increment_tour_views', { tour_id: tourId });
  },

  /**
   * Generate share link
   */
  async generateShareLink(tourId: string): Promise<string> {
    const token = crypto.randomUUID();

    const { error } = await supabase
      .from('vr_tours')
      .update({
        share_token: token,
        is_public: true,
      })
      .eq('id', tourId);

    if (error) {
      console.error('Error generating share link:', error);
      throw error;
    }

    return `${window.location.origin}/vr-tour/${token}`;
  },
};

// ============================================================================
// AR Sessions Service
// ============================================================================

export const arSessionsService = {
  /**
   * Start a new AR session
   */
  async startSession(
    projectId: string,
    deviceInfo?: { type?: string; model?: string; framework?: string }
  ): Promise<string> {
    const { data, error } = await supabase
      .from('ar_sessions')
      .insert({
        project_id: projectId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        device_type: deviceInfo?.type,
        device_model: deviceInfo?.model,
        ar_framework: deviceInfo?.framework,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error starting AR session:', error);
      throw error;
    }

    return data.id;
  },

  /**
   * End an AR session
   */
  async endSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('ar_sessions')
      .update({
        ended_at: new Date().toISOString(),
        duration_seconds: await calculateSessionDuration(sessionId),
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Error ending AR session:', error);
      throw error;
    }
  },

  /**
   * Record a placed model
   */
  async recordPlacedModel(
    sessionId: string,
    modelId: string,
    transform: {
      position: { x: number; y: number; z: number };
      rotation: { x: number; y: number; z: number; w: number };
      scale: number;
    },
    anchorInfo?: { id?: string; type?: string }
  ): Promise<void> {
    const { error } = await supabase
      .from('ar_placed_models')
      .insert({
        session_id: sessionId,
        model_3d_id: modelId,
        position: transform.position,
        rotation: transform.rotation,
        scale: transform.scale,
        anchor_id: anchorInfo?.id,
        anchor_type: anchorInfo?.type,
      });

    if (error) {
      console.error('Error recording placed model:', error);
      throw error;
    }

    // Increment counter
    await supabase.rpc('increment_ar_models_placed', { session_id: sessionId });
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

function recordToMetadata(record: Model3DRecord): Model3DMetadata {
  return {
    id: record.id,
    name: record.name,
    fileName: record.file_name,
    fileSize: record.file_size,
    format: record.format as Model3DMetadata['format'],
    uploadedAt: record.created_at,
    uploadedBy: record.uploaded_by || '',
    projectId: record.project_id,
    description: record.description,
    tags: record.tags,
    boundingBox: record.bounding_box_min && record.bounding_box_max
      ? { min: record.bounding_box_min, max: record.bounding_box_max }
      : undefined,
    centerPoint: record.center_point,
    triangleCount: record.triangle_count,
    materialCount: record.material_count,
    textureCount: record.texture_count,
    animations: record.animation_names,
  };
}

function tourRecordToTour(record: VRTourRecord & { nodes?: VRTourNodeRecord[] }): VRTour {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    projectId: record.project_id,
    nodes: (record.nodes || []).map(nodeRecordToNode),
    startNodeId: record.start_node_id || record.nodes?.[0]?.id || '',
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    createdBy: record.created_by || '',
  };
}

function nodeRecordToNode(record: VRTourNodeRecord): VRTourNode {
  return {
    id: record.id,
    photo: {
      id: record.photo_id || record.id,
      url: record.photo_url,
      thumbnailUrl: record.thumbnail_url,
      name: record.name,
      location: record.position,
      heading: record.initial_heading,
      pitch: record.initial_pitch,
      capturedAt: record.captured_at || record.created_at,
      projectId: '',
      tags: record.tags,
    },
    connections: [], // Loaded separately
    annotations: [], // Loaded separately
    position: record.position,
  };
}

async function calculateSessionDuration(sessionId: string): Promise<number> {
  const { data } = await supabase
    .from('ar_sessions')
    .select('started_at')
    .eq('id', sessionId)
    .single();

  if (!data?.started_at) {return 0;}

  const startTime = new Date(data.started_at).getTime();
  const endTime = Date.now();
  return Math.floor((endTime - startTime) / 1000);
}

export default {
  models: modelsService,
  vrTours: vrToursService,
  arSessions: arSessionsService,
};
