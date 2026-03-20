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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      journal_entries: {
        Row: {
          created_at: string
          emotional_state: string | null
          entry_date: string
          event_description: string | null
          free_text: string | null
          id: string
          impact_level: number | null
          reflection: string | null
          self_anchor: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emotional_state?: string | null
          entry_date?: string
          event_description?: string | null
          free_text?: string | null
          id?: string
          impact_level?: number | null
          reflection?: string | null
          self_anchor?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emotional_state?: string | null
          entry_date?: string
          event_description?: string | null
          free_text?: string | null
          id?: string
          impact_level?: number | null
          reflection?: string | null
          self_anchor?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      landing_sections: {
        Row: {
          config: Json | null
          created_at: string
          cta_text: string | null
          cta_text_localized: Json | null
          id: string
          is_active: boolean
          section_key: string
          subtitle: string | null
          subtitle_localized: Json | null
          title: string
          title_localized: Json | null
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          cta_text?: string | null
          cta_text_localized?: Json | null
          id?: string
          is_active?: boolean
          section_key: string
          subtitle?: string | null
          subtitle_localized?: Json | null
          title?: string
          title_localized?: Json | null
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          cta_text?: string | null
          cta_text_localized?: Json | null
          id?: string
          is_active?: boolean
          section_key?: string
          subtitle?: string | null
          subtitle_localized?: Json | null
          title?: string
          title_localized?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      library_articles: {
        Row: {
          author: string
          category: string
          created_at: string
          excerpt: string | null
          excerpt_localized: Json | null
          featured: boolean
          id: string
          image_url: string | null
          published: boolean
          source: string | null
          title: string
          title_localized: Json | null
          updated_at: string
          url: string | null
        }
        Insert: {
          author?: string
          category?: string
          created_at?: string
          excerpt?: string | null
          excerpt_localized?: Json | null
          featured?: boolean
          id?: string
          image_url?: string | null
          published?: boolean
          source?: string | null
          title: string
          title_localized?: Json | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          author?: string
          category?: string
          created_at?: string
          excerpt?: string | null
          excerpt_localized?: Json | null
          featured?: boolean
          id?: string
          image_url?: string | null
          published?: boolean
          source?: string | null
          title?: string
          title_localized?: Json | null
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      mood_pulses: {
        Row: {
          created_at: string | null
          entry_date: string
          id: string
          label: string
          level: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entry_date?: string
          id?: string
          label: string
          level: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          entry_date?: string
          id?: string
          label?: string
          level?: number
          user_id?: string
        }
        Relationships: []
      }
      observation_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name_en: string
          name_hu: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_en: string
          name_hu: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_en?: string
          name_hu?: string
          sort_order?: number
        }
        Relationships: []
      }
      observation_concepts: {
        Row: {
          bno_code: string | null
          category_id: string
          concept_code: string
          created_at: string
          description_en: string | null
          description_hu: string | null
          id: string
          is_active: boolean
          name_en: string
          name_hu: string
          sort_order: number
        }
        Insert: {
          bno_code?: string | null
          category_id: string
          concept_code: string
          created_at?: string
          description_en?: string | null
          description_hu?: string | null
          id?: string
          is_active?: boolean
          name_en: string
          name_hu: string
          sort_order?: number
        }
        Update: {
          bno_code?: string | null
          category_id?: string
          concept_code?: string
          created_at?: string
          description_en?: string | null
          description_hu?: string | null
          id?: string
          is_active?: boolean
          name_en?: string
          name_hu?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "observation_concepts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "observation_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      observation_logs: {
        Row: {
          concept_id: string
          context_modifier: string | null
          created_at: string
          frequency: string | null
          id: string
          intensity: number
          journal_entry_id: string | null
          logged_at: string
          status: string
          user_id: string
          user_narrative: string | null
        }
        Insert: {
          concept_id: string
          context_modifier?: string | null
          created_at?: string
          frequency?: string | null
          id?: string
          intensity?: number
          journal_entry_id?: string | null
          logged_at?: string
          status?: string
          user_id: string
          user_narrative?: string | null
        }
        Update: {
          concept_id?: string
          context_modifier?: string | null
          created_at?: string
          frequency?: string | null
          id?: string
          intensity?: number
          journal_entry_id?: string | null
          logged_at?: string
          status?: string
          user_id?: string
          user_narrative?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "observation_logs_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "observation_concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observation_logs_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      questionnaire_answers: {
        Row: {
          answer: Json
          id: string
          question_id: string
          response_id: string
        }
        Insert: {
          answer: Json
          id?: string
          question_id: string
          response_id: string
        }
        Update: {
          answer?: Json
          id?: string
          question_id?: string
          response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaire_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_questions: {
        Row: {
          answer_scores: Json | null
          created_at: string
          id: string
          options: Json | null
          options_localized: Json | null
          question_text: string
          question_text_localized: Json | null
          question_type: string
          questionnaire_id: string
          sort_order: number
        }
        Insert: {
          answer_scores?: Json | null
          created_at?: string
          id?: string
          options?: Json | null
          options_localized?: Json | null
          question_text: string
          question_text_localized?: Json | null
          question_type?: string
          questionnaire_id: string
          sort_order?: number
        }
        Update: {
          answer_scores?: Json | null
          created_at?: string
          id?: string
          options?: Json | null
          options_localized?: Json | null
          question_text?: string
          question_text_localized?: Json | null
          question_type?: string
          questionnaire_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_questions_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "questionnaires"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_responses: {
        Row: {
          completed_at: string
          id: string
          questionnaire_id: string
          total_score: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          questionnaire_id: string
          total_score?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          questionnaire_id?: string
          total_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_responses_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "questionnaires"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaires: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          description_localized: Json | null
          id: string
          is_published: boolean
          repeat_interval: string | null
          score_ranges: Json | null
          scoring_enabled: boolean
          scoring_mode: string
          snomed_code: string | null
          title: string
          title_localized: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_localized?: Json | null
          id?: string
          is_published?: boolean
          repeat_interval?: string | null
          score_ranges?: Json | null
          scoring_enabled?: boolean
          scoring_mode?: string
          snomed_code?: string | null
          title: string
          title_localized?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_localized?: Json | null
          id?: string
          is_published?: boolean
          repeat_interval?: string | null
          score_ranges?: Json | null
          scoring_enabled?: boolean
          scoring_mode?: string
          snomed_code?: string | null
          title?: string
          title_localized?: Json | null
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      analyst_journal_aggregates: {
        Args: never
        Returns: {
          avg_impact_level: number
          emotional_states: Json
          entry_count: number
          entry_date: string
        }[]
      }
      analyst_observation_aggregates: {
        Args: never
        Returns: {
          avg_intensity: number
          concept_code: string
          concept_name_en: string
          log_count: number
        }[]
      }
      analyst_questionnaire_aggregates: {
        Args: never
        Returns: {
          answer_distribution: Json
          question_text: string
          questionnaire_title: string
          response_count: number
        }[]
      }
      analyst_role_distribution: {
        Args: never
        Returns: {
          role: string
          user_count: number
        }[]
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
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
      app_role:
        | "affected_person"
        | "observer"
        | "admin"
        | "editor"
        | "analyst"
        | "guest_editor"
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
      app_role: [
        "affected_person",
        "observer",
        "admin",
        "editor",
        "analyst",
        "guest_editor",
      ],
    },
  },
} as const
