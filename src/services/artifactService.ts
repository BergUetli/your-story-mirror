import { supabase } from "@/integrations/supabase/client";

export type ArtifactType = 'image' | 'audio' | 'video' | 'document';

export interface Artifact {
  id: string;
  artifact_type: ArtifactType;
  storage_path: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateArtifactParams {
  artifact_type: ArtifactType;
  storage_path: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  metadata?: Record<string, any>;
}

export class ArtifactService {
  /**
   * Create a new artifact record
   */
  async createArtifact(params: CreateArtifactParams): Promise<Artifact> {
    const { data, error } = await supabase
      .from('artifacts')
      .insert([params])
      .select()
      .single();

    if (error) throw error;
    return data as Artifact;
  }

  /**
   * Link an artifact to a memory
   */
  async linkArtifactToMemory(memoryId: string, artifactId: string): Promise<void> {
    const { error } = await supabase
      .from('memory_artifacts')
      .insert([{ memory_id: memoryId, artifact_id: artifactId }]);

    if (error) throw error;
  }

  /**
   * Get all artifacts for a specific memory
   */
  async getArtifactsForMemory(memoryId: string): Promise<Artifact[]> {
    const { data, error } = await supabase
      .from('memory_artifacts')
      .select(`
        artifact_id,
        artifacts (
          id,
          artifact_type,
          storage_path,
          file_name,
          file_size,
          mime_type,
          metadata,
          created_at,
          updated_at
        )
      `)
      .eq('memory_id', memoryId);

    if (error) throw error;
    
    // Extract the artifacts from the joined data
    return (data || []).map((item: any) => item.artifacts as Artifact).filter(Boolean);
  }

  /**
   * Get all memories linked to an artifact
   */
  async getMemoriesForArtifact(artifactId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('memory_artifacts')
      .select('memory_id')
      .eq('artifact_id', artifactId);

    if (error) throw error;
    return (data || []).map((item: any) => item.memory_id);
  }

  /**
   * Upload a file to storage and create an artifact record
   */
  async uploadAndCreateArtifact(
    file: File,
    bucket: string,
    path: string,
    artifactType: ArtifactType,
    metadata?: Record<string, any>
  ): Promise<Artifact> {
    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file);

    if (uploadError) throw uploadError;

    // Create artifact record
    const artifact = await this.createArtifact({
      artifact_type: artifactType,
      storage_path: uploadData.path,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      metadata,
    });

    return artifact;
  }

  /**
   * Delete an artifact and its storage file
   */
  async deleteArtifact(artifactId: string, bucket: string): Promise<void> {
    // Get artifact details
    const { data: artifact, error: fetchError } = await supabase
      .from('artifacts')
      .select('storage_path')
      .eq('id', artifactId)
      .single();

    if (fetchError) throw fetchError;

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(bucket)
      .remove([artifact.storage_path]);

    if (storageError) throw storageError;

    // Delete artifact record (memory_artifacts will cascade delete)
    const { error: deleteError } = await supabase
      .from('artifacts')
      .delete()
      .eq('id', artifactId);

    if (deleteError) throw deleteError;
  }

  /**
   * Get public URL for an artifact
   */
  getPublicUrl(bucket: string, storagePath: string): string {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    return data.publicUrl;
  }
}

export const artifactService = new ArtifactService();
