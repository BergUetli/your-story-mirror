export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      artifacts: {
        Row: {
          artifact_type: string
          created_at: string
          file_name: string | null
          file_size: number | null
          id: string
          metadata: Json | null
          mime_type: string | null
          storage_path: string
          updated_at: string
        }
        Insert: {
          artifact_type: string
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          storage_path: string
          updated_at?: string
        }
        Update: {
          artifact_type?: string
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          storage_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      characters: {
        Row: {
          created_at: string
          description: string | null
          id: string
          important_dates: Json | null
          is_user: boolean | null
          linked_user_id: string | null
          name: string
          personality_traits: string[] | null
          relationship: string
          shared_memories: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          important_dates?: Json | null
          is_user?: boolean | null
          linked_user_id?: string | null
          name: string
          personality_traits?: string[] | null
          relationship: string
          shared_memories?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          important_dates?: Json | null
          is_user?: boolean | null
          linked_user_id?: string | null
          name?: string
          personality_traits?: string[] | null
          relationship?: string
          shared_memories?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      memories: {
        Row: {
          chunk_sequence: number | null
          created_at: string
          id: string
          image_urls: string[] | null
          is_primary_chunk: boolean | null
          memory_date: string | null
          memory_group_id: string | null
          memory_location: string | null
          recipient: string | null
          source_type: string | null
          tags: string[] | null
          text: string
          title: string
          total_chunks: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chunk_sequence?: number | null
          created_at?: string
          id?: string
          image_urls?: string[] | null
          is_primary_chunk?: boolean | null
          memory_date?: string | null
          memory_group_id?: string | null
          memory_location?: string | null
          recipient?: string | null
          source_type?: string | null
          tags?: string[] | null
          text: string
          title: string
          total_chunks?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chunk_sequence?: number | null
          created_at?: string
          id?: string
          image_urls?: string[] | null
          is_primary_chunk?: boolean | null
          memory_date?: string | null
          memory_group_id?: string | null
          memory_location?: string | null
          recipient?: string | null
          source_type?: string | null
          tags?: string[] | null
          text?: string
          title?: string
          total_chunks?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      memory_artifacts: {
        Row: {
          artifact_id: string
          created_at: string
          memory_id: string
        }
        Insert: {
          artifact_id: string
          created_at?: string
          memory_id: string
        }
        Update: {
          artifact_id?: string
          created_at?: string
          memory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_artifacts_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_artifacts_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
        ]
      }
      solin_conversations: {
        Row: {
          context_used: Json | null
          created_at: string
          id: string
          message: string
          role: string
          user_id: string
        }
        Insert: {
          context_used?: Json | null
          created_at?: string
          id?: string
          message: string
          role: string
          user_id: string
        }
        Update: {
          context_used?: Json | null
          created_at?: string
          id?: string
          message?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      system_configuration: {
        Row: {
          audio_agent_volume: number | null
          audio_buffer_delay_ms: number | null
          audio_ducking_amount: number | null
          audio_ducking_attack_ms: number | null
          audio_ducking_enabled: boolean | null
          audio_ducking_release_ms: number | null
          audio_mic_volume: number | null
          audio_timestamp_correlation: boolean | null
          created_at: string
          description: string | null
          elevenlabs_agent_id: string | null
          id: string
          key: string
          openai_model: string | null
          value: Json | null
          vapi_assistant_id: string | null
          voice_provider: string | null
        }
        Insert: {
          audio_agent_volume?: number | null
          audio_buffer_delay_ms?: number | null
          audio_ducking_amount?: number | null
          audio_ducking_attack_ms?: number | null
          audio_ducking_enabled?: boolean | null
          audio_ducking_release_ms?: number | null
          audio_mic_volume?: number | null
          audio_timestamp_correlation?: boolean | null
          created_at?: string
          description?: string | null
          elevenlabs_agent_id?: string | null
          id?: string
          key: string
          openai_model?: string | null
          value?: Json | null
          vapi_assistant_id?: string | null
          voice_provider?: string | null
        }
        Update: {
          audio_agent_volume?: number | null
          audio_buffer_delay_ms?: number | null
          audio_ducking_amount?: number | null
          audio_ducking_attack_ms?: number | null
          audio_ducking_enabled?: boolean | null
          audio_ducking_release_ms?: number | null
          audio_mic_volume?: number | null
          audio_timestamp_correlation?: boolean | null
          created_at?: string
          description?: string | null
          elevenlabs_agent_id?: string | null
          id?: string
          key?: string
          openai_model?: string | null
          value?: Json | null
          vapi_assistant_id?: string | null
          voice_provider?: string | null
        }
        Relationships: []
      }
      trained_identities: {
        Row: {
          created_at: string | null
          hf_model_id: string | null
          hf_repo_name: string | null
          id: string
          image_storage_paths: string[] | null
          model_type: string | null
          name: string
          num_training_images: number | null
          thumbnail_url: string | null
          training_completed_at: string | null
          training_error: string | null
          training_job_id: string | null
          training_started_at: string | null
          training_status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          hf_model_id?: string | null
          hf_repo_name?: string | null
          id?: string
          image_storage_paths?: string[] | null
          model_type?: string | null
          name: string
          num_training_images?: number | null
          thumbnail_url?: string | null
          training_completed_at?: string | null
          training_error?: string | null
          training_job_id?: string | null
          training_started_at?: string | null
          training_status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          hf_model_id?: string | null
          hf_repo_name?: string | null
          id?: string
          image_storage_paths?: string[] | null
          model_type?: string | null
          name?: string
          num_training_images?: number | null
          thumbnail_url?: string | null
          training_completed_at?: string | null
          training_error?: string | null
          training_job_id?: string | null
          training_started_at?: string | null
          training_status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          age: number | null
          career_history: Json | null
          close_friends: Json | null
          communication_style: string | null
          core_values: string[] | null
          created_at: string
          cultural_background: string[] | null
          cultural_influences: string[] | null
          education_background: string | null
          family_members: Json | null
          fears_concerns: string[] | null
          first_conversation_completed: boolean | null
          first_conversation_completed_at: string | null
          hobbies_interests: string[] | null
          hometown: string | null
          id: string
          languages_spoken: string[] | null
          life_goals: string[] | null
          location: string | null
          major_life_events: Json | null
          occupation: string | null
          onboarding_completed: boolean | null
          personality_traits: string[] | null
          political_views: string | null
          preferred_name: string | null
          profile_completeness_score: number
          relationship_status: string | null
          religious_spiritual_beliefs: string | null
          sensitive_topics: string[] | null
          significant_others: Json | null
          social_causes: string[] | null
          topics_of_interest: string[] | null
          travel_experiences: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          career_history?: Json | null
          close_friends?: Json | null
          communication_style?: string | null
          core_values?: string[] | null
          created_at?: string
          cultural_background?: string[] | null
          cultural_influences?: string[] | null
          education_background?: string | null
          family_members?: Json | null
          fears_concerns?: string[] | null
          first_conversation_completed?: boolean | null
          first_conversation_completed_at?: string | null
          hobbies_interests?: string[] | null
          hometown?: string | null
          id?: string
          languages_spoken?: string[] | null
          life_goals?: string[] | null
          location?: string | null
          major_life_events?: Json | null
          occupation?: string | null
          onboarding_completed?: boolean | null
          personality_traits?: string[] | null
          political_views?: string | null
          preferred_name?: string | null
          profile_completeness_score?: number
          relationship_status?: string | null
          religious_spiritual_beliefs?: string | null
          sensitive_topics?: string[] | null
          significant_others?: Json | null
          social_causes?: string[] | null
          topics_of_interest?: string[] | null
          travel_experiences?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          career_history?: Json | null
          close_friends?: Json | null
          communication_style?: string | null
          core_values?: string[] | null
          created_at?: string
          cultural_background?: string[] | null
          cultural_influences?: string[] | null
          education_background?: string | null
          family_members?: Json | null
          fears_concerns?: string[] | null
          first_conversation_completed?: boolean | null
          first_conversation_completed_at?: string | null
          hobbies_interests?: string[] | null
          hometown?: string | null
          id?: string
          languages_spoken?: string[] | null
          life_goals?: string[] | null
          location?: string | null
          major_life_events?: Json | null
          occupation?: string | null
          onboarding_completed?: boolean | null
          personality_traits?: string[] | null
          political_views?: string | null
          preferred_name?: string | null
          profile_completeness_score?: number
          relationship_status?: string | null
          religious_spiritual_beliefs?: string | null
          sensitive_topics?: string[] | null
          significant_others?: Json | null
          social_causes?: string[] | null
          topics_of_interest?: string[] | null
          travel_experiences?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          age: number | null
          birth_date: string | null
          birth_place: string | null
          created_at: string
          current_location: string | null
          email: string | null
          id: string
          name: string | null
          onboarding_completed: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          birth_date?: string | null
          birth_place?: string | null
          created_at?: string
          current_location?: string | null
          email?: string | null
          id?: string
          name?: string | null
          onboarding_completed?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          birth_date?: string | null
          birth_place?: string | null
          created_at?: string
          current_location?: string | null
          email?: string | null
          id?: string
          name?: string | null
          onboarding_completed?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      voice_recordings: {
        Row: {
          bit_rate: number | null
          compression_type: string | null
          conversation_phase: string | null
          conversation_summary: string | null
          created_at: string
          duration_seconds: number | null
          expires_at: string | null
          file_size_bytes: number | null
          id: string
          is_compressed: boolean | null
          memory_ids: string[] | null
          memory_titles: string[] | null
          metadata: Json | null
          mime_type: string | null
          original_filename: string | null
          recording_type: string
          retention_days: number | null
          sample_rate: number | null
          session_id: string
          session_mode: string | null
          storage_path: string
          topics: string[] | null
          transcript_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bit_rate?: number | null
          compression_type?: string | null
          conversation_phase?: string | null
          conversation_summary?: string | null
          created_at?: string
          duration_seconds?: number | null
          expires_at?: string | null
          file_size_bytes?: number | null
          id?: string
          is_compressed?: boolean | null
          memory_ids?: string[] | null
          memory_titles?: string[] | null
          metadata?: Json | null
          mime_type?: string | null
          original_filename?: string | null
          recording_type?: string
          retention_days?: number | null
          sample_rate?: number | null
          session_id: string
          session_mode?: string | null
          storage_path: string
          topics?: string[] | null
          transcript_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bit_rate?: number | null
          compression_type?: string | null
          conversation_phase?: string | null
          conversation_summary?: string | null
          created_at?: string
          duration_seconds?: number | null
          expires_at?: string | null
          file_size_bytes?: number | null
          id?: string
          is_compressed?: boolean | null
          memory_ids?: string[] | null
          memory_titles?: string[] | null
          metadata?: Json | null
          mime_type?: string | null
          original_filename?: string | null
          recording_type?: string
          retention_days?: number | null
          sample_rate?: number | null
          session_id?: string
          session_mode?: string | null
          storage_path?: string
          topics?: string[] | null
          transcript_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_owns_memory: { Args: { memory_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
