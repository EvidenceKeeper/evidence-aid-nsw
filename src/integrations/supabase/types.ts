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
      assistant_requests: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          user_id?: string
        }
        Relationships: []
      }
      case_analysis_history: {
        Row: {
          analysis_type: string
          case_strength_change: number | null
          created_at: string
          id: string
          key_insights: string[] | null
          new_state: Json | null
          previous_state: Json | null
          trigger_file_id: string | null
          user_id: string
        }
        Insert: {
          analysis_type: string
          case_strength_change?: number | null
          created_at?: string
          id?: string
          key_insights?: string[] | null
          new_state?: Json | null
          previous_state?: Json | null
          trigger_file_id?: string | null
          user_id: string
        }
        Update: {
          analysis_type?: string
          case_strength_change?: number | null
          created_at?: string
          id?: string
          key_insights?: string[] | null
          new_state?: Json | null
          previous_state?: Json | null
          trigger_file_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      case_memory: {
        Row: {
          facts: string | null
          id: string
          issues: Json | null
          parties: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          facts?: string | null
          id?: string
          issues?: Json | null
          parties?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          facts?: string | null
          id?: string
          issues?: Json | null
          parties?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      case_patterns: {
        Row: {
          created_at: string
          description: string
          evidence_files: string[] | null
          id: string
          legal_significance: string | null
          pattern_strength: number
          pattern_type: string
          timeline_end: string | null
          timeline_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          evidence_files?: string[] | null
          id?: string
          legal_significance?: string | null
          pattern_strength?: number
          pattern_type: string
          timeline_end?: string | null
          timeline_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          evidence_files?: string[] | null
          id?: string
          legal_significance?: string | null
          pattern_strength?: number
          pattern_type?: string
          timeline_end?: string | null
          timeline_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chunks: {
        Row: {
          created_at: string
          file_id: string
          id: string
          meta: Json
          seq: number
          text: string
          tsv: unknown | null
        }
        Insert: {
          created_at?: string
          file_id: string
          id?: string
          meta?: Json
          seq: number
          text: string
          tsv?: unknown | null
        }
        Update: {
          created_at?: string
          file_id?: string
          id?: string
          meta?: Json
          seq?: number
          text?: string
          tsv?: unknown | null
        }
        Relationships: [
          {
            foreignKeyName: "chunks_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_messages: {
        Row: {
          citations: Json | null
          consultation_id: string
          content: string
          created_at: string
          id: string
          message_type: string
          metadata: Json | null
          sender_id: string
        }
        Insert: {
          citations?: Json | null
          consultation_id: string
          content: string
          created_at?: string
          id?: string
          message_type?: string
          metadata?: Json | null
          sender_id: string
        }
        Update: {
          citations?: Json | null
          consultation_id?: string
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          metadata?: Json | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_messages_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "lawyer_consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_analysis: {
        Row: {
          analysis_type: string
          confidence_score: number | null
          content: string
          created_at: string
          file_id: string
          id: string
          legal_concepts: Json | null
          relevant_citations: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_type: string
          confidence_score?: number | null
          content: string
          created_at?: string
          file_id: string
          id?: string
          legal_concepts?: Json | null
          relevant_citations?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_type?: string
          confidence_score?: number | null
          content?: string
          created_at?: string
          file_id?: string
          id?: string
          legal_concepts?: Json | null
          relevant_citations?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_analysis_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_legal_connections: {
        Row: {
          connection_type: string
          created_at: string
          evidence_file_id: string
          explanation: string | null
          id: string
          legal_section_id: string
          relevance_score: number | null
          user_id: string
        }
        Insert: {
          connection_type: string
          created_at?: string
          evidence_file_id: string
          explanation?: string | null
          id?: string
          legal_section_id: string
          relevance_score?: number | null
          user_id: string
        }
        Update: {
          connection_type?: string
          created_at?: string
          evidence_file_id?: string
          explanation?: string | null
          id?: string
          legal_section_id?: string
          relevance_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_legal_connections_evidence_file_id_fkey"
            columns: ["evidence_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_legal_connections_legal_section_id_fkey"
            columns: ["legal_section_id"]
            isOneToOne: false
            referencedRelation: "legal_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_processing_queue: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          file_id: string
          id: string
          priority: number
          processing_type: string
          started_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_id: string
          id?: string
          priority?: number
          processing_type?: string
          started_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_id?: string
          id?: string
          priority?: number
          processing_type?: string
          started_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      evidence_relationships: {
        Row: {
          confidence: number
          created_at: string
          description: string | null
          id: string
          relationship_type: string
          source_file_id: string
          target_file_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          description?: string | null
          id?: string
          relationship_type: string
          source_file_id: string
          target_file_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          description?: string | null
          id?: string
          relationship_type?: string
          source_file_id?: string
          target_file_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      files: {
        Row: {
          auto_category: string | null
          category: string | null
          created_at: string
          id: string
          meta: Json
          mime_type: string | null
          name: string
          size: number | null
          status: string
          storage_path: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_category?: string | null
          category?: string | null
          created_at?: string
          id?: string
          meta?: Json
          mime_type?: string | null
          name: string
          size?: number | null
          status?: string
          storage_path?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_category?: string | null
          category?: string | null
          created_at?: string
          id?: string
          meta?: Json
          mime_type?: string | null
          name?: string
          size?: number | null
          status?: string
          storage_path?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lawyer_consultations: {
        Row: {
          case_summary: string | null
          completed_at: string | null
          created_at: string
          id: string
          lawyer_id: string | null
          priority: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          case_summary?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          lawyer_id?: string | null
          priority?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          case_summary?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          lawyer_id?: string | null
          priority?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      legal_citations: {
        Row: {
          citation_type: string
          confidence_score: number | null
          court: string | null
          created_at: string
          full_citation: string
          id: string
          jurisdiction: string
          neutral_citation: string | null
          section_id: string
          short_citation: string
          updated_at: string
          url: string | null
          year: number | null
        }
        Insert: {
          citation_type: string
          confidence_score?: number | null
          court?: string | null
          created_at?: string
          full_citation: string
          id?: string
          jurisdiction?: string
          neutral_citation?: string | null
          section_id: string
          short_citation: string
          updated_at?: string
          url?: string | null
          year?: number | null
        }
        Update: {
          citation_type?: string
          confidence_score?: number | null
          court?: string | null
          created_at?: string
          full_citation?: string
          id?: string
          jurisdiction?: string
          neutral_citation?: string | null
          section_id?: string
          short_citation?: string
          updated_at?: string
          url?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_citations_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "legal_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_concepts: {
        Row: {
          concept_name: string
          created_at: string
          description: string | null
          id: string
          parent_concept_id: string | null
          related_concepts: string[] | null
          usage_count: number | null
        }
        Insert: {
          concept_name: string
          created_at?: string
          description?: string | null
          id?: string
          parent_concept_id?: string | null
          related_concepts?: string[] | null
          usage_count?: number | null
        }
        Update: {
          concept_name?: string
          created_at?: string
          description?: string | null
          id?: string
          parent_concept_id?: string | null
          related_concepts?: string[] | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_concepts_parent_concept_id_fkey"
            columns: ["parent_concept_id"]
            isOneToOne: false
            referencedRelation: "legal_concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_documents: {
        Row: {
          created_at: string
          document_type: string
          effective_date: string | null
          id: string
          jurisdiction: string
          scope: string
          source_url: string | null
          status: string
          title: string
          total_sections: number | null
          updated_at: string
          user_id: string | null
          version: string
        }
        Insert: {
          created_at?: string
          document_type: string
          effective_date?: string | null
          id?: string
          jurisdiction?: string
          scope?: string
          source_url?: string | null
          status?: string
          title: string
          total_sections?: number | null
          updated_at?: string
          user_id?: string | null
          version?: string
        }
        Update: {
          created_at?: string
          document_type?: string
          effective_date?: string | null
          id?: string
          jurisdiction?: string
          scope?: string
          source_url?: string | null
          status?: string
          title?: string
          total_sections?: number | null
          updated_at?: string
          user_id?: string | null
          version?: string
        }
        Relationships: []
      }
      legal_search_cache: {
        Row: {
          created_at: string
          hit_count: number | null
          id: string
          last_accessed: string
          query_hash: string
          query_text: string
          results: Json
          search_type: string
        }
        Insert: {
          created_at?: string
          hit_count?: number | null
          id?: string
          last_accessed?: string
          query_hash: string
          query_text: string
          results: Json
          search_type: string
        }
        Update: {
          created_at?: string
          hit_count?: number | null
          id?: string
          last_accessed?: string
          query_hash?: string
          query_text?: string
          results?: Json
          search_type?: string
        }
        Relationships: []
      }
      legal_sections: {
        Row: {
          citation_format: string | null
          citation_reference: string | null
          content: string
          created_at: string
          cross_references: string[] | null
          document_id: string
          embedding_data: Json | null
          id: string
          last_verified: string | null
          legal_concepts: string[] | null
          level: number
          order_index: number
          paragraph_anchor: string | null
          parent_section_id: string | null
          section_number: string | null
          section_type: string
          source_url: string | null
          title: string
          tsv: unknown | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          citation_format?: string | null
          citation_reference?: string | null
          content: string
          created_at?: string
          cross_references?: string[] | null
          document_id: string
          embedding_data?: Json | null
          id?: string
          last_verified?: string | null
          legal_concepts?: string[] | null
          level?: number
          order_index?: number
          paragraph_anchor?: string | null
          parent_section_id?: string | null
          section_number?: string | null
          section_type: string
          source_url?: string | null
          title: string
          tsv?: unknown | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          citation_format?: string | null
          citation_reference?: string | null
          content?: string
          created_at?: string
          cross_references?: string[] | null
          document_id?: string
          embedding_data?: Json | null
          id?: string
          last_verified?: string | null
          legal_concepts?: string[] | null
          level?: number
          order_index?: number
          paragraph_anchor?: string | null
          parent_section_id?: string | null
          section_number?: string | null
          section_type?: string
          source_url?: string | null
          title?: string
          tsv?: unknown | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_sections_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_sections_parent_section_id_fkey"
            columns: ["parent_section_id"]
            isOneToOne: false
            referencedRelation: "legal_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_strategy: {
        Row: {
          case_strength_overall: number
          evidence_gaps: Json
          id: string
          legal_elements_status: Json
          next_steps: Json
          opposing_arguments: Json
          strengths: Json
          updated_at: string
          user_id: string
          weaknesses: Json
        }
        Insert: {
          case_strength_overall?: number
          evidence_gaps?: Json
          id?: string
          legal_elements_status?: Json
          next_steps?: Json
          opposing_arguments?: Json
          strengths?: Json
          updated_at?: string
          user_id: string
          weaknesses?: Json
        }
        Update: {
          case_strength_overall?: number
          evidence_gaps?: Json
          id?: string
          legal_elements_status?: Json
          next_steps?: Json
          opposing_arguments?: Json
          strengths?: Json
          updated_at?: string
          user_id?: string
          weaknesses?: Json
        }
        Relationships: []
      }
      messages: {
        Row: {
          citations: Json
          content: string
          created_at: string
          id: string
          role: string
          thread_id: string | null
          user_id: string
        }
        Insert: {
          citations?: Json
          content: string
          created_at?: string
          id?: string
          role: string
          thread_id?: string | null
          user_id: string
        }
        Update: {
          citations?: Json
          content?: string
          created_at?: string
          id?: string
          role?: string
          thread_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      nsw_legal_resources: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          reference: string | null
          tags: string[] | null
          title: string
          tsv: unknown | null
          updated_at: string
          url: string | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          id?: string
          reference?: string | null
          tags?: string[] | null
          title: string
          tsv?: unknown | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          reference?: string | null
          tags?: string[] | null
          title?: string
          tsv?: unknown | null
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      timeline_events: {
        Row: {
          category: string | null
          chunk_id: string | null
          confidence: number | null
          context: string | null
          created_at: string
          description: string | null
          event_date: string
          event_time: string | null
          file_id: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
          verified: boolean | null
        }
        Insert: {
          category?: string | null
          chunk_id?: string | null
          confidence?: number | null
          context?: string | null
          created_at?: string
          description?: string | null
          event_date: string
          event_time?: string | null
          file_id?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id: string
          verified?: boolean | null
        }
        Update: {
          category?: string | null
          chunk_id?: string | null
          confidence?: number | null
          context?: string | null
          created_at?: string
          description?: string | null
          event_date?: string
          event_time?: string | null
          file_id?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "chunks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
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
          role?: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_evidence_informed_advice: {
        Args: { _include_evidence?: boolean; _query: string; _user_id: string }
        Returns: {
          connection_explanation: string
          evidence_relevance: number
          file_name: string
          legal_content: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "lawyer" | "user"
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
      app_role: ["admin", "lawyer", "user"],
    },
  },
} as const
