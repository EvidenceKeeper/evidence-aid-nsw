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
      act_sections: {
        Row: {
          act_id: string
          amendment_history: Json | null
          created_at: string
          effective_date: string | null
          id: string
          notes: string | null
          order_index: number
          parent_section_id: string | null
          section_content: string
          section_level: number
          section_number: string
          section_title: string | null
          updated_at: string
        }
        Insert: {
          act_id: string
          amendment_history?: Json | null
          created_at?: string
          effective_date?: string | null
          id?: string
          notes?: string | null
          order_index?: number
          parent_section_id?: string | null
          section_content: string
          section_level?: number
          section_number: string
          section_title?: string | null
          updated_at?: string
        }
        Update: {
          act_id?: string
          amendment_history?: Json | null
          created_at?: string
          effective_date?: string | null
          id?: string
          notes?: string | null
          order_index?: number
          parent_section_id?: string | null
          section_content?: string
          section_level?: number
          section_number?: string
          section_title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "act_sections_act_id_fkey"
            columns: ["act_id"]
            isOneToOne: false
            referencedRelation: "legal_acts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "act_sections_parent_section_id_fkey"
            columns: ["parent_section_id"]
            isOneToOne: false
            referencedRelation: "act_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_requests: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          object_id: string | null
          object_type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          object_id?: string | null
          object_type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          object_id?: string | null
          object_type?: string | null
          user_id?: string | null
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
      case_collaboration_log: {
        Row: {
          action_details: Json | null
          action_type: string
          case_owner_id: string
          collaborator_id: string
          created_at: string
          id: string
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          case_owner_id: string
          collaborator_id: string
          created_at?: string
          id?: string
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          case_owner_id?: string
          collaborator_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      case_intelligence_synthesis: {
        Row: {
          created_at: string
          critical_weaknesses: Json | null
          evidence_completeness: number | null
          evidence_gaps: Json | null
          id: string
          key_strengths: Json | null
          last_analysis: string | null
          legal_foundation_strength: number | null
          next_steps: Json | null
          overall_case_strength: number | null
          pattern_coherence: number | null
          risk_factors: Json | null
          strategic_priorities: Json | null
          timeline_clarity: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          critical_weaknesses?: Json | null
          evidence_completeness?: number | null
          evidence_gaps?: Json | null
          id?: string
          key_strengths?: Json | null
          last_analysis?: string | null
          legal_foundation_strength?: number | null
          next_steps?: Json | null
          overall_case_strength?: number | null
          pattern_coherence?: number | null
          risk_factors?: Json | null
          strategic_priorities?: Json | null
          timeline_clarity?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          critical_weaknesses?: Json | null
          evidence_completeness?: number | null
          evidence_gaps?: Json | null
          id?: string
          key_strengths?: Json | null
          last_analysis?: string | null
          legal_foundation_strength?: number | null
          next_steps?: Json | null
          overall_case_strength?: number | null
          pattern_coherence?: number | null
          risk_factors?: Json | null
          strategic_priorities?: Json | null
          timeline_clarity?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      case_memory: {
        Row: {
          case_readiness_status: string | null
          case_strength_reasons: Json | null
          case_strength_score: number | null
          current_stage: number | null
          evidence_index: Json | null
          facts: string | null
          feedback_scores: Json | null
          goal_established_at: string | null
          goal_status: string | null
          id: string
          issues: Json | null
          key_facts: Json | null
          last_activity_type: string | null
          last_updated_at: string | null
          parties: Json | null
          personalization_profile: Json | null
          primary_goal: string | null
          session_count: number | null
          stage_history: Json | null
          thread_summary: string | null
          timeline_summary: Json | null
          updated_at: string
          user_id: string
          user_journey_data: Json | null
        }
        Insert: {
          case_readiness_status?: string | null
          case_strength_reasons?: Json | null
          case_strength_score?: number | null
          current_stage?: number | null
          evidence_index?: Json | null
          facts?: string | null
          feedback_scores?: Json | null
          goal_established_at?: string | null
          goal_status?: string | null
          id?: string
          issues?: Json | null
          key_facts?: Json | null
          last_activity_type?: string | null
          last_updated_at?: string | null
          parties?: Json | null
          personalization_profile?: Json | null
          primary_goal?: string | null
          session_count?: number | null
          stage_history?: Json | null
          thread_summary?: string | null
          timeline_summary?: Json | null
          updated_at?: string
          user_id: string
          user_journey_data?: Json | null
        }
        Update: {
          case_readiness_status?: string | null
          case_strength_reasons?: Json | null
          case_strength_score?: number | null
          current_stage?: number | null
          evidence_index?: Json | null
          facts?: string | null
          feedback_scores?: Json | null
          goal_established_at?: string | null
          goal_status?: string | null
          id?: string
          issues?: Json | null
          key_facts?: Json | null
          last_activity_type?: string | null
          last_updated_at?: string | null
          parties?: Json | null
          personalization_profile?: Json | null
          primary_goal?: string | null
          session_count?: number | null
          stage_history?: Json | null
          thread_summary?: string | null
          timeline_summary?: Json | null
          updated_at?: string
          user_id?: string
          user_journey_data?: Json | null
        }
        Relationships: []
      }
      case_patterns: {
        Row: {
          corroboration_status: string | null
          created_at: string
          description: string
          escalation_indicator: boolean | null
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
          corroboration_status?: string | null
          created_at?: string
          description: string
          escalation_indicator?: boolean | null
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
          corroboration_status?: string | null
          created_at?: string
          description?: string
          escalation_indicator?: boolean | null
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
          tsv: unknown
        }
        Insert: {
          created_at?: string
          file_id: string
          id?: string
          meta?: Json
          seq: number
          text: string
          tsv?: unknown
        }
        Update: {
          created_at?: string
          file_id?: string
          id?: string
          meta?: Json
          seq?: number
          text?: string
          tsv?: unknown
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
      conversation_analysis: {
        Row: {
          analysis_data: Json
          analysis_timestamp: string
          conversation_length: number
          created_at: string
          id: string
          thread_id: string
          user_id: string
        }
        Insert: {
          analysis_data?: Json
          analysis_timestamp?: string
          conversation_length?: number
          created_at?: string
          id?: string
          thread_id: string
          user_id: string
        }
        Update: {
          analysis_data?: Json
          analysis_timestamp?: string
          conversation_length?: number
          created_at?: string
          id?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: []
      }
      conversation_threads: {
        Row: {
          conversation_summary: string | null
          created_at: string
          id: string
          last_message_at: string
          message_count: number
          primary_goal: string | null
          progress_indicators: Json
          status: string
          thread_title: string
          topics: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_summary?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          message_count?: number
          primary_goal?: string | null
          progress_indicators?: Json
          status?: string
          thread_title?: string
          topics?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_summary?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          message_count?: number
          primary_goal?: string | null
          progress_indicators?: Json
          status?: string
          thread_title?: string
          topics?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      enhanced_timeline_events: {
        Row: {
          category: string
          chunk_id: string
          confidence: number
          context: string | null
          corroboration_needed: string | null
          created_at: string
          description: string
          event_date: string
          event_time: string | null
          evidence_type: string | null
          file_id: string
          id: string
          legal_significance: string | null
          potential_witnesses: string[] | null
          title: string
          user_id: string
          verified: boolean | null
        }
        Insert: {
          category: string
          chunk_id: string
          confidence?: number
          context?: string | null
          corroboration_needed?: string | null
          created_at?: string
          description: string
          event_date: string
          event_time?: string | null
          evidence_type?: string | null
          file_id: string
          id?: string
          legal_significance?: string | null
          potential_witnesses?: string[] | null
          title: string
          user_id: string
          verified?: boolean | null
        }
        Update: {
          category?: string
          chunk_id?: string
          confidence?: number
          context?: string | null
          corroboration_needed?: string | null
          created_at?: string
          description?: string
          event_date?: string
          event_time?: string | null
          evidence_type?: string | null
          file_id?: string
          id?: string
          legal_significance?: string | null
          potential_witnesses?: string[] | null
          title?: string
          user_id?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      entity_topics: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          relevance_score: number
          topic_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          relevance_score?: number
          topic_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          relevance_score?: number
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "legal_topics"
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
      evidence_comprehensive_analysis: {
        Row: {
          analysis_passes: Json
          case_impact: string | null
          confidence_score: number | null
          created_at: string
          evidence_gaps_identified: string[] | null
          file_id: string
          id: string
          key_insights: string[] | null
          legal_strength: number | null
          pattern_connections: Json | null
          strategic_recommendations: string[] | null
          synthesis: Json
          timeline_significance: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_passes?: Json
          case_impact?: string | null
          confidence_score?: number | null
          created_at?: string
          evidence_gaps_identified?: string[] | null
          file_id: string
          id?: string
          key_insights?: string[] | null
          legal_strength?: number | null
          pattern_connections?: Json | null
          strategic_recommendations?: string[] | null
          synthesis?: Json
          timeline_significance?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_passes?: Json
          case_impact?: string | null
          confidence_score?: number | null
          created_at?: string
          evidence_gaps_identified?: string[] | null
          file_id?: string
          id?: string
          key_insights?: string[] | null
          legal_strength?: number | null
          pattern_connections?: Json | null
          strategic_recommendations?: string[] | null
          synthesis?: Json
          timeline_significance?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          exhibit_code: string | null
          file_checksum: string | null
          file_summary: string | null
          id: string
          meta: Json
          mime_type: string | null
          name: string
          provenance: Json | null
          section_summaries: Json | null
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
          exhibit_code?: string | null
          file_checksum?: string | null
          file_summary?: string | null
          id?: string
          meta?: Json
          mime_type?: string | null
          name: string
          provenance?: Json | null
          section_summaries?: Json | null
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
          exhibit_code?: string | null
          file_checksum?: string | null
          file_summary?: string | null
          id?: string
          meta?: Json
          mime_type?: string | null
          name?: string
          provenance?: Json | null
          section_summaries?: Json | null
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
      legal_acts: {
        Row: {
          act_name: string
          act_number: string | null
          act_type: string
          commencement_date: string | null
          created_at: string
          id: string
          jurisdiction: string
          long_title: string | null
          parent_act_id: string | null
          preamble: string | null
          repeal_date: string | null
          short_title: string | null
          source_url: string | null
          status: string
          updated_at: string
          year: number
        }
        Insert: {
          act_name: string
          act_number?: string | null
          act_type: string
          commencement_date?: string | null
          created_at?: string
          id?: string
          jurisdiction?: string
          long_title?: string | null
          parent_act_id?: string | null
          preamble?: string | null
          repeal_date?: string | null
          short_title?: string | null
          source_url?: string | null
          status?: string
          updated_at?: string
          year: number
        }
        Update: {
          act_name?: string
          act_number?: string | null
          act_type?: string
          commencement_date?: string | null
          created_at?: string
          id?: string
          jurisdiction?: string
          long_title?: string | null
          parent_act_id?: string | null
          preamble?: string | null
          repeal_date?: string | null
          short_title?: string | null
          source_url?: string | null
          status?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "legal_acts_parent_act_id_fkey"
            columns: ["parent_act_id"]
            isOneToOne: false
            referencedRelation: "legal_acts"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_cases: {
        Row: {
          case_name: string
          case_summary: string | null
          catchwords: string[] | null
          court_id: string | null
          created_at: string
          division: string | null
          full_text_available: boolean | null
          id: string
          judges: string[] | null
          judgment_date: string | null
          legal_principles: string[] | null
          neutral_citation: string | null
          outcome: string | null
          parties: Json | null
          precedent_value: string | null
          source_url: string | null
          subject_matter: string[] | null
          traditional_citation: string | null
          updated_at: string
          year: number
        }
        Insert: {
          case_name: string
          case_summary?: string | null
          catchwords?: string[] | null
          court_id?: string | null
          created_at?: string
          division?: string | null
          full_text_available?: boolean | null
          id?: string
          judges?: string[] | null
          judgment_date?: string | null
          legal_principles?: string[] | null
          neutral_citation?: string | null
          outcome?: string | null
          parties?: Json | null
          precedent_value?: string | null
          source_url?: string | null
          subject_matter?: string[] | null
          traditional_citation?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          case_name?: string
          case_summary?: string | null
          catchwords?: string[] | null
          court_id?: string | null
          created_at?: string
          division?: string | null
          full_text_available?: boolean | null
          id?: string
          judges?: string[] | null
          judgment_date?: string | null
          legal_principles?: string[] | null
          neutral_citation?: string | null
          outcome?: string | null
          parties?: Json | null
          precedent_value?: string | null
          source_url?: string | null
          subject_matter?: string[] | null
          traditional_citation?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "legal_cases_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "nsw_courts"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_chunks: {
        Row: {
          chunk_order: number
          chunk_text: string
          citation_references: string[] | null
          confidence_score: number | null
          created_at: string
          document_id: string
          id: string
          legal_concepts: string[] | null
          metadata: Json | null
          paragraph_anchor: string | null
          provenance: Json
          section_id: string | null
          updated_at: string
        }
        Insert: {
          chunk_order?: number
          chunk_text: string
          citation_references?: string[] | null
          confidence_score?: number | null
          created_at?: string
          document_id: string
          id?: string
          legal_concepts?: string[] | null
          metadata?: Json | null
          paragraph_anchor?: string | null
          provenance?: Json
          section_id?: string | null
          updated_at?: string
        }
        Update: {
          chunk_order?: number
          chunk_text?: string
          citation_references?: string[] | null
          confidence_score?: number | null
          created_at?: string
          document_id?: string
          id?: string
          legal_concepts?: string[] | null
          metadata?: Json | null
          paragraph_anchor?: string | null
          provenance?: Json
          section_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_chunks_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "legal_sections"
            referencedColumns: ["id"]
          },
        ]
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
      legal_document_processing_queue: {
        Row: {
          bucket_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          file_name: string
          file_path: string
          id: string
          priority: number
          processing_metadata: Json | null
          started_at: string | null
          status: string
        }
        Insert: {
          bucket_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_name: string
          file_path: string
          id?: string
          priority?: number
          processing_metadata?: Json | null
          started_at?: string | null
          status?: string
        }
        Update: {
          bucket_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_name?: string
          file_path?: string
          id?: string
          priority?: number
          processing_metadata?: Json | null
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          checksum: string | null
          created_at: string
          document_type: string
          effective_date: string | null
          id: string
          ingestion_method: string | null
          jurisdiction: string
          last_verified: string | null
          scope: string
          source_authority: string | null
          source_url: string | null
          status: string
          tags: string[] | null
          title: string
          total_sections: number | null
          updated_at: string
          user_id: string | null
          version: string
        }
        Insert: {
          checksum?: string | null
          created_at?: string
          document_type: string
          effective_date?: string | null
          id?: string
          ingestion_method?: string | null
          jurisdiction?: string
          last_verified?: string | null
          scope?: string
          source_authority?: string | null
          source_url?: string | null
          status?: string
          tags?: string[] | null
          title: string
          total_sections?: number | null
          updated_at?: string
          user_id?: string | null
          version?: string
        }
        Update: {
          checksum?: string | null
          created_at?: string
          document_type?: string
          effective_date?: string | null
          id?: string
          ingestion_method?: string | null
          jurisdiction?: string
          last_verified?: string | null
          scope?: string
          source_authority?: string | null
          source_url?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          total_sections?: number | null
          updated_at?: string
          user_id?: string | null
          version?: string
        }
        Relationships: []
      }
      legal_evaluation_questions: {
        Row: {
          created_at: string
          created_by: string | null
          difficulty_level: string
          expected_answer: string
          id: string
          jurisdiction: string
          question_text: string
          required_citations: string[] | null
          reviewer_notes: string | null
          topic: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          difficulty_level?: string
          expected_answer: string
          id?: string
          jurisdiction?: string
          question_text: string
          required_citations?: string[] | null
          reviewer_notes?: string | null
          topic: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          difficulty_level?: string
          expected_answer?: string
          id?: string
          jurisdiction?: string
          question_text?: string
          required_citations?: string[] | null
          reviewer_notes?: string | null
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      legal_forms: {
        Row: {
          court_id: string | null
          created_at: string
          effective_date: string | null
          form_fields: Json | null
          form_number: string
          form_title: string
          form_type: string
          id: string
          instructions: string | null
          jurisdiction: string
          pdf_url: string | null
          purpose: string
          related_legislation: string[] | null
          status: string
          updated_at: string
        }
        Insert: {
          court_id?: string | null
          created_at?: string
          effective_date?: string | null
          form_fields?: Json | null
          form_number: string
          form_title: string
          form_type: string
          id?: string
          instructions?: string | null
          jurisdiction?: string
          pdf_url?: string | null
          purpose: string
          related_legislation?: string[] | null
          status?: string
          updated_at?: string
        }
        Update: {
          court_id?: string | null
          created_at?: string
          effective_date?: string | null
          form_fields?: Json | null
          form_number?: string
          form_title?: string
          form_type?: string
          id?: string
          instructions?: string | null
          jurisdiction?: string
          pdf_url?: string | null
          purpose?: string
          related_legislation?: string[] | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_forms_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "nsw_courts"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_relationships: {
        Row: {
          context: string | null
          created_at: string
          created_by: string | null
          id: string
          relationship_description: string | null
          relationship_strength: number | null
          relationship_type: string
          source_entity_id: string
          source_entity_type: string
          target_entity_id: string
          target_entity_type: string
          verified: boolean | null
        }
        Insert: {
          context?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          relationship_description?: string | null
          relationship_strength?: number | null
          relationship_type: string
          source_entity_id: string
          source_entity_type: string
          target_entity_id: string
          target_entity_type: string
          verified?: boolean | null
        }
        Update: {
          context?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          relationship_description?: string | null
          relationship_strength?: number | null
          relationship_type?: string
          source_entity_id?: string
          source_entity_type?: string
          target_entity_id?: string
          target_entity_type?: string
          verified?: boolean | null
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
          context_after: string | null
          context_before: string | null
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
          source_checksum: string | null
          source_url: string | null
          title: string
          tsv: unknown
          updated_at: string
          user_id: string | null
        }
        Insert: {
          citation_format?: string | null
          citation_reference?: string | null
          content: string
          context_after?: string | null
          context_before?: string | null
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
          source_checksum?: string | null
          source_url?: string | null
          title: string
          tsv?: unknown
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          citation_format?: string | null
          citation_reference?: string | null
          content?: string
          context_after?: string | null
          context_before?: string | null
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
          source_checksum?: string | null
          source_url?: string | null
          title?: string
          tsv?: unknown
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
      legal_topics: {
        Row: {
          created_at: string
          description: string | null
          id: string
          keywords: string[] | null
          parent_topic_id: string | null
          related_legislation: string[] | null
          topic_category: string
          topic_name: string
          typical_courts: string[] | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          keywords?: string[] | null
          parent_topic_id?: string | null
          related_legislation?: string[] | null
          topic_category: string
          topic_name: string
          typical_courts?: string[] | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          keywords?: string[] | null
          parent_topic_id?: string | null
          related_legislation?: string[] | null
          topic_category?: string
          topic_name?: string
          typical_courts?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_topics_parent_topic_id_fkey"
            columns: ["parent_topic_id"]
            isOneToOne: false
            referencedRelation: "legal_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          citations: Json
          confidence_score: number | null
          content: string
          created_at: string
          id: string
          is_legal_advice: boolean | null
          reasoning: string | null
          role: string
          source_references: Json | null
          thread_id: string | null
          user_id: string
          verification_status: string | null
        }
        Insert: {
          citations?: Json
          confidence_score?: number | null
          content: string
          created_at?: string
          id?: string
          is_legal_advice?: boolean | null
          reasoning?: string | null
          role: string
          source_references?: Json | null
          thread_id?: string | null
          user_id: string
          verification_status?: string | null
        }
        Update: {
          citations?: Json
          confidence_score?: number | null
          content?: string
          created_at?: string
          id?: string
          is_legal_advice?: boolean | null
          reasoning?: string | null
          role?: string
          source_references?: Json | null
          thread_id?: string | null
          user_id?: string
          verification_status?: string | null
        }
        Relationships: []
      }
      nsw_case_law: {
        Row: {
          case_name: string
          case_summary: string | null
          catchwords: string[] | null
          court_id: string | null
          created_at: string
          division: string | null
          full_text_available: boolean | null
          id: string
          judges: string[] | null
          judgment_date: string | null
          legal_principles: string[] | null
          legislation_cited: string[] | null
          neutral_citation: string | null
          outcome: string | null
          parties: Json | null
          precedent_value: string | null
          source_url: string | null
          subject_matter: string[] | null
          traditional_citation: string | null
          updated_at: string
          year: number
        }
        Insert: {
          case_name: string
          case_summary?: string | null
          catchwords?: string[] | null
          court_id?: string | null
          created_at?: string
          division?: string | null
          full_text_available?: boolean | null
          id?: string
          judges?: string[] | null
          judgment_date?: string | null
          legal_principles?: string[] | null
          legislation_cited?: string[] | null
          neutral_citation?: string | null
          outcome?: string | null
          parties?: Json | null
          precedent_value?: string | null
          source_url?: string | null
          subject_matter?: string[] | null
          traditional_citation?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          case_name?: string
          case_summary?: string | null
          catchwords?: string[] | null
          court_id?: string | null
          created_at?: string
          division?: string | null
          full_text_available?: boolean | null
          id?: string
          judges?: string[] | null
          judgment_date?: string | null
          legal_principles?: string[] | null
          legislation_cited?: string[] | null
          neutral_citation?: string | null
          outcome?: string | null
          parties?: Json | null
          precedent_value?: string | null
          source_url?: string | null
          subject_matter?: string[] | null
          traditional_citation?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "nsw_case_law_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "nsw_courts"
            referencedColumns: ["id"]
          },
        ]
      }
      nsw_courts: {
        Row: {
          contact_info: Json | null
          court_level: string
          court_name: string
          created_at: string
          id: string
          jurisdiction: string
          location: string | null
          website_url: string | null
        }
        Insert: {
          contact_info?: Json | null
          court_level: string
          court_name: string
          created_at?: string
          id?: string
          jurisdiction?: string
          location?: string | null
          website_url?: string | null
        }
        Update: {
          contact_info?: Json | null
          court_level?: string
          court_name?: string
          created_at?: string
          id?: string
          jurisdiction?: string
          location?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      nsw_entity_topics: {
        Row: {
          assigned_by: string | null
          confidence_score: number | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          relevance_score: number
          topic_id: string
        }
        Insert: {
          assigned_by?: string | null
          confidence_score?: number | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          relevance_score?: number
          topic_id: string
        }
        Update: {
          assigned_by?: string | null
          confidence_score?: number | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          relevance_score?: number
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nsw_entity_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "nsw_legal_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      nsw_legal_forms: {
        Row: {
          court_id: string | null
          created_at: string
          effective_date: string | null
          filing_fee: number | null
          form_fields: Json | null
          form_number: string
          form_title: string
          form_type: string
          id: string
          instructions: string | null
          jurisdiction: string
          pdf_url: string | null
          processing_time_days: number | null
          purpose: string
          related_legislation: string[] | null
          required_documents: string[] | null
          status: string
          updated_at: string
        }
        Insert: {
          court_id?: string | null
          created_at?: string
          effective_date?: string | null
          filing_fee?: number | null
          form_fields?: Json | null
          form_number: string
          form_title: string
          form_type: string
          id?: string
          instructions?: string | null
          jurisdiction?: string
          pdf_url?: string | null
          processing_time_days?: number | null
          purpose: string
          related_legislation?: string[] | null
          required_documents?: string[] | null
          status?: string
          updated_at?: string
        }
        Update: {
          court_id?: string | null
          created_at?: string
          effective_date?: string | null
          filing_fee?: number | null
          form_fields?: Json | null
          form_number?: string
          form_title?: string
          form_type?: string
          id?: string
          instructions?: string | null
          jurisdiction?: string
          pdf_url?: string | null
          processing_time_days?: number | null
          purpose?: string
          related_legislation?: string[] | null
          required_documents?: string[] | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nsw_legal_forms_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "nsw_courts"
            referencedColumns: ["id"]
          },
        ]
      }
      nsw_legal_outcomes: {
        Row: {
          binding_courts: string[] | null
          case_id: string | null
          costs_order: string | null
          created_at: string
          distinguished_cases: string[] | null
          followed_cases: string[] | null
          id: string
          legal_principle: string | null
          orders_made: string[] | null
          outcome_description: string | null
          outcome_type: string
          precedent_established: string | null
        }
        Insert: {
          binding_courts?: string[] | null
          case_id?: string | null
          costs_order?: string | null
          created_at?: string
          distinguished_cases?: string[] | null
          followed_cases?: string[] | null
          id?: string
          legal_principle?: string | null
          orders_made?: string[] | null
          outcome_description?: string | null
          outcome_type: string
          precedent_established?: string | null
        }
        Update: {
          binding_courts?: string[] | null
          case_id?: string | null
          costs_order?: string | null
          created_at?: string
          distinguished_cases?: string[] | null
          followed_cases?: string[] | null
          id?: string
          legal_principle?: string | null
          orders_made?: string[] | null
          outcome_description?: string | null
          outcome_type?: string
          precedent_established?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nsw_legal_outcomes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "nsw_case_law"
            referencedColumns: ["id"]
          },
        ]
      }
      nsw_legal_relationships: {
        Row: {
          context: string | null
          created_at: string
          extracted_by: string | null
          id: string
          relationship_description: string | null
          relationship_strength: number | null
          relationship_type: string
          source_entity_id: string
          source_entity_type: string
          target_entity_id: string
          target_entity_type: string
          verification_status: string | null
        }
        Insert: {
          context?: string | null
          created_at?: string
          extracted_by?: string | null
          id?: string
          relationship_description?: string | null
          relationship_strength?: number | null
          relationship_type: string
          source_entity_id: string
          source_entity_type: string
          target_entity_id: string
          target_entity_type: string
          verification_status?: string | null
        }
        Update: {
          context?: string | null
          created_at?: string
          extracted_by?: string | null
          id?: string
          relationship_description?: string | null
          relationship_strength?: number | null
          relationship_type?: string
          source_entity_id?: string
          source_entity_type?: string
          target_entity_id?: string
          target_entity_type?: string
          verification_status?: string | null
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
          tsv: unknown
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
          tsv?: unknown
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
          tsv?: unknown
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      nsw_legal_topics: {
        Row: {
          complexity_level: string | null
          created_at: string
          description: string | null
          id: string
          keywords: string[] | null
          parent_topic_id: string | null
          practitioner_notes: string | null
          related_legislation: string[] | null
          synonyms: string[] | null
          topic_category: string
          topic_level: number
          topic_name: string
          typical_courts: string[] | null
        }
        Insert: {
          complexity_level?: string | null
          created_at?: string
          description?: string | null
          id?: string
          keywords?: string[] | null
          parent_topic_id?: string | null
          practitioner_notes?: string | null
          related_legislation?: string[] | null
          synonyms?: string[] | null
          topic_category: string
          topic_level?: number
          topic_name: string
          typical_courts?: string[] | null
        }
        Update: {
          complexity_level?: string | null
          created_at?: string
          description?: string | null
          id?: string
          keywords?: string[] | null
          parent_topic_id?: string | null
          practitioner_notes?: string | null
          related_legislation?: string[] | null
          synonyms?: string[] | null
          topic_category?: string
          topic_level?: number
          topic_name?: string
          typical_courts?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "nsw_legal_topics_parent_topic_id_fkey"
            columns: ["parent_topic_id"]
            isOneToOne: false
            referencedRelation: "nsw_legal_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      nsw_legislation: {
        Row: {
          act_name: string
          act_number: string | null
          act_type: string
          commencement_date: string | null
          created_at: string
          id: string
          jurisdiction: string
          long_title: string | null
          parent_act_id: string | null
          preamble: string | null
          repeal_date: string | null
          short_title: string | null
          source_url: string | null
          status: string
          updated_at: string
          year: number
        }
        Insert: {
          act_name: string
          act_number?: string | null
          act_type: string
          commencement_date?: string | null
          created_at?: string
          id?: string
          jurisdiction?: string
          long_title?: string | null
          parent_act_id?: string | null
          preamble?: string | null
          repeal_date?: string | null
          short_title?: string | null
          source_url?: string | null
          status?: string
          updated_at?: string
          year: number
        }
        Update: {
          act_name?: string
          act_number?: string | null
          act_type?: string
          commencement_date?: string | null
          created_at?: string
          id?: string
          jurisdiction?: string
          long_title?: string | null
          parent_act_id?: string | null
          preamble?: string | null
          repeal_date?: string | null
          short_title?: string | null
          source_url?: string | null
          status?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "nsw_legislation_parent_act_id_fkey"
            columns: ["parent_act_id"]
            isOneToOne: false
            referencedRelation: "nsw_legislation"
            referencedColumns: ["id"]
          },
        ]
      }
      nsw_legislation_sections: {
        Row: {
          amendment_history: Json | null
          created_at: string
          effective_date: string | null
          id: string
          legislation_id: string
          notes: string | null
          order_index: number
          parent_section_id: string | null
          section_content: string
          section_level: number
          section_number: string
          section_title: string | null
          updated_at: string
        }
        Insert: {
          amendment_history?: Json | null
          created_at?: string
          effective_date?: string | null
          id?: string
          legislation_id: string
          notes?: string | null
          order_index?: number
          parent_section_id?: string | null
          section_content: string
          section_level?: number
          section_number: string
          section_title?: string | null
          updated_at?: string
        }
        Update: {
          amendment_history?: Json | null
          created_at?: string
          effective_date?: string | null
          id?: string
          legislation_id?: string
          notes?: string | null
          order_index?: number
          parent_section_id?: string | null
          section_content?: string
          section_level?: number
          section_number?: string
          section_title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nsw_legislation_sections_legislation_id_fkey"
            columns: ["legislation_id"]
            isOneToOne: false
            referencedRelation: "nsw_legislation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nsw_legislation_sections_parent_section_id_fkey"
            columns: ["parent_section_id"]
            isOneToOne: false
            referencedRelation: "nsw_legislation_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      nsw_police_policies: {
        Row: {
          authority: string | null
          compliance_requirements: string[] | null
          content: string
          created_at: string
          effective_date: string
          id: string
          policy_number: string
          policy_title: string
          policy_type: string
          related_legislation: string[] | null
          review_date: string | null
          status: string
          subject_area: string
          updated_at: string
        }
        Insert: {
          authority?: string | null
          compliance_requirements?: string[] | null
          content: string
          created_at?: string
          effective_date: string
          id?: string
          policy_number: string
          policy_title: string
          policy_type: string
          related_legislation?: string[] | null
          review_date?: string | null
          status?: string
          subject_area: string
          updated_at?: string
        }
        Update: {
          authority?: string | null
          compliance_requirements?: string[] | null
          content?: string
          created_at?: string
          effective_date?: string
          id?: string
          policy_number?: string
          policy_title?: string
          policy_type?: string
          related_legislation?: string[] | null
          review_date?: string | null
          status?: string
          subject_area?: string
          updated_at?: string
        }
        Relationships: []
      }
      nsw_practice_directions: {
        Row: {
          content: string
          court_id: string | null
          created_at: string
          division: string | null
          effective_date: string
          id: string
          pd_number: string
          related_legislation: string[] | null
          source_url: string | null
          status: string
          subject_areas: string[] | null
          supersedes_pd_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          court_id?: string | null
          created_at?: string
          division?: string | null
          effective_date: string
          id?: string
          pd_number: string
          related_legislation?: string[] | null
          source_url?: string | null
          status?: string
          subject_areas?: string[] | null
          supersedes_pd_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          court_id?: string | null
          created_at?: string
          division?: string | null
          effective_date?: string
          id?: string
          pd_number?: string
          related_legislation?: string[] | null
          source_url?: string | null
          status?: string
          subject_areas?: string[] | null
          supersedes_pd_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nsw_practice_directions_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "nsw_courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nsw_practice_directions_supersedes_pd_id_fkey"
            columns: ["supersedes_pd_id"]
            isOneToOne: false
            referencedRelation: "nsw_practice_directions"
            referencedColumns: ["id"]
          },
        ]
      }
      police_policies: {
        Row: {
          authority: string | null
          content: string
          created_at: string
          effective_date: string
          id: string
          policy_number: string
          policy_title: string
          policy_type: string
          related_legislation: string[] | null
          review_date: string | null
          status: string
          subject_area: string
          updated_at: string
        }
        Insert: {
          authority?: string | null
          content: string
          created_at?: string
          effective_date: string
          id?: string
          policy_number: string
          policy_title: string
          policy_type: string
          related_legislation?: string[] | null
          review_date?: string | null
          status?: string
          subject_area: string
          updated_at?: string
        }
        Update: {
          authority?: string | null
          content?: string
          created_at?: string
          effective_date?: string
          id?: string
          policy_number?: string
          policy_title?: string
          policy_type?: string
          related_legislation?: string[] | null
          review_date?: string | null
          status?: string
          subject_area?: string
          updated_at?: string
        }
        Relationships: []
      }
      practice_directions: {
        Row: {
          content: string
          court_id: string | null
          created_at: string
          division: string | null
          effective_date: string
          id: string
          pd_number: string
          source_url: string | null
          status: string
          subject_areas: string[] | null
          supersedes_pd_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          court_id?: string | null
          created_at?: string
          division?: string | null
          effective_date: string
          id?: string
          pd_number: string
          source_url?: string | null
          status?: string
          subject_areas?: string[] | null
          supersedes_pd_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          court_id?: string | null
          created_at?: string
          division?: string | null
          effective_date?: string
          id?: string
          pd_number?: string
          source_url?: string | null
          status?: string
          subject_areas?: string[] | null
          supersedes_pd_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_directions_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "nsw_courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_directions_supersedes_pd_id_fkey"
            columns: ["supersedes_pd_id"]
            isOneToOne: false
            referencedRelation: "practice_directions"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_response_quality: {
        Row: {
          citation_hit_rate: number | null
          citations_provided: Json | null
          confidence_score: number | null
          created_at: string
          evaluation_question_id: string | null
          id: string
          metadata: Json | null
          query_text: string
          response_content: string
          source_freshness: number | null
          user_feedback: number | null
          user_id: string
        }
        Insert: {
          citation_hit_rate?: number | null
          citations_provided?: Json | null
          confidence_score?: number | null
          created_at?: string
          evaluation_question_id?: string | null
          id?: string
          metadata?: Json | null
          query_text: string
          response_content: string
          source_freshness?: number | null
          user_feedback?: number | null
          user_id: string
        }
        Update: {
          citation_hit_rate?: number | null
          citations_provided?: Json | null
          confidence_score?: number | null
          created_at?: string
          evaluation_question_id?: string | null
          id?: string
          metadata?: Json | null
          query_text?: string
          response_content?: string
          source_freshness?: number | null
          user_feedback?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rag_response_quality_evaluation_question_id_fkey"
            columns: ["evaluation_question_id"]
            isOneToOne: false
            referencedRelation: "legal_evaluation_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      shared_cases: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          owner_id: string
          permission_level: string
          share_token: string | null
          shared_at: string
          shared_with_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          owner_id: string
          permission_level?: string
          share_token?: string | null
          shared_at?: string
          shared_with_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          owner_id?: string
          permission_level?: string
          share_token?: string | null
          shared_at?: string
          shared_with_id?: string
          updated_at?: string
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
      user_sessions: {
        Row: {
          completion_status: string | null
          created_at: string
          feedback_given: Json | null
          id: string
          interaction_quality: number | null
          session_end: string | null
          session_start: string
          stage_progression: Json | null
          user_id: string
        }
        Insert: {
          completion_status?: string | null
          created_at?: string
          feedback_given?: Json | null
          id?: string
          interaction_quality?: number | null
          session_end?: string | null
          session_start?: string
          stage_progression?: Json | null
          user_id: string
        }
        Update: {
          completion_status?: string | null
          created_at?: string
          feedback_given?: Json | null
          id?: string
          interaction_quality?: number | null
          session_end?: string | null
          session_start?: string
          stage_progression?: Json | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_share_token: { Args: never; Returns: string }
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
      match_evidence_chunks: {
        Args: {
          filter_user_id?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          file_id: string
          file_name: string
          id: string
          meta: Json
          seq: number
          similarity: number
          text: string
        }[]
      }
      match_legal_chunks: {
        Args: {
          court_filter?: string
          jurisdiction_filter?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
          year_from?: number
          year_to?: number
        }
        Returns: {
          chunk_text: string
          citation_references: string[]
          document_id: string
          id: string
          legal_concepts: string[]
          metadata: Json
          provenance: Json
          section_id: string
          similarity: number
        }[]
      }
      match_user_chunks: {
        Args: {
          filter_user_id?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          file_id: string
          file_name: string
          id: string
          meta: Json
          seq: number
          similarity: number
          text: string
        }[]
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
