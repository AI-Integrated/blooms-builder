export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      generated_tests: {
        Row: {
          answer_key: Json
          created_at: string
          created_by: string
          id: string
          questions: Json
          test_title: string
          tos_id: string | null
          total_points: number
          total_questions: number
        }
        Insert: {
          answer_key: Json
          created_at?: string
          created_by?: string
          id?: string
          questions: Json
          test_title: string
          tos_id?: string | null
          total_points: number
          total_questions: number
        }
        Update: {
          answer_key?: Json
          created_at?: string
          created_by?: string
          id?: string
          questions?: Json
          test_title?: string
          tos_id?: string | null
          total_points?: number
          total_questions?: number
        }
        Relationships: [
          {
            foreignKeyName: "generated_tests_tos_id_fkey"
            columns: ["tos_id"]
            isOneToOne: false
            referencedRelation: "tos_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_competencies: {
        Row: {
          analyzing_items: number
          applying_items: number
          created_at: string
          creating_items: number
          evaluating_items: number
          hours: number
          id: string
          item_numbers: Json
          percentage: number
          remembering_items: number
          topic_name: string
          tos_id: string | null
          total_items: number
          understanding_items: number
        }
        Insert: {
          analyzing_items?: number
          applying_items?: number
          created_at?: string
          creating_items?: number
          evaluating_items?: number
          hours: number
          id?: string
          item_numbers?: Json
          percentage: number
          remembering_items?: number
          topic_name: string
          tos_id?: string | null
          total_items: number
          understanding_items?: number
        }
        Update: {
          analyzing_items?: number
          applying_items?: number
          created_at?: string
          creating_items?: number
          evaluating_items?: number
          hours?: number
          id?: string
          item_numbers?: Json
          percentage?: number
          remembering_items?: number
          topic_name?: string
          tos_id?: string | null
          total_items?: number
          understanding_items?: number
        }
        Relationships: [
          {
            foreignKeyName: "learning_competencies_tos_id_fkey"
            columns: ["tos_id"]
            isOneToOne: false
            referencedRelation: "tos_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      question_rubrics: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          question_id: string | null
          title: string
          total_points: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          question_id?: string | null
          title: string
          total_points?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          question_id?: string | null
          title?: string
          total_points?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_rubrics_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          ai_confidence_score: number | null
          approval_confidence: number | null
          approval_notes: string | null
          approved: boolean | null
          approved_by: string | null
          bloom_level: string
          choices: Json | null
          correct_answer: string | null
          created_at: string
          created_by: string
          difficulty: string
          id: string
          knowledge_dimension: string
          needs_review: boolean | null
          question_text: string
          question_type: string
          topic: string
          updated_at: string
        }
        Insert: {
          ai_confidence_score?: number | null
          approval_confidence?: number | null
          approval_notes?: string | null
          approved?: boolean | null
          approved_by?: string | null
          bloom_level: string
          choices?: Json | null
          correct_answer?: string | null
          created_at?: string
          created_by?: string
          difficulty: string
          id?: string
          knowledge_dimension: string
          needs_review?: boolean | null
          question_text: string
          question_type: string
          topic: string
          updated_at?: string
        }
        Update: {
          ai_confidence_score?: number | null
          approval_confidence?: number | null
          approval_notes?: string | null
          approved?: boolean | null
          approved_by?: string | null
          bloom_level?: string
          choices?: Json | null
          correct_answer?: string | null
          created_at?: string
          created_by?: string
          difficulty?: string
          id?: string
          knowledge_dimension?: string
          needs_review?: boolean | null
          question_text?: string
          question_type?: string
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      rubric_criteria: {
        Row: {
          created_at: string | null
          criterion_name: string
          description: string | null
          id: string
          max_points: number
          order_index: number
          rubric_id: string | null
        }
        Insert: {
          created_at?: string | null
          criterion_name: string
          description?: string | null
          id?: string
          max_points: number
          order_index?: number
          rubric_id?: string | null
        }
        Update: {
          created_at?: string | null
          criterion_name?: string
          description?: string | null
          id?: string
          max_points?: number
          order_index?: number
          rubric_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rubric_criteria_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "question_rubrics"
            referencedColumns: ["id"]
          },
        ]
      }
      rubric_scores: {
        Row: {
          comments: string | null
          created_at: string | null
          criterion_id: string | null
          graded_by: string
          id: string
          response_id: string | null
          score: number
        }
        Insert: {
          comments?: string | null
          created_at?: string | null
          criterion_id?: string | null
          graded_by: string
          id?: string
          response_id?: string | null
          score?: number
        }
        Update: {
          comments?: string | null
          created_at?: string | null
          criterion_id?: string | null
          graded_by?: string
          id?: string
          response_id?: string | null
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "rubric_scores_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "rubric_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rubric_scores_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "student_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      rubrics: {
        Row: {
          created_at: string
          created_by: string
          criteria: Json
          description: string | null
          grade_level: string | null
          id: string
          performance_levels: Json
          subject: string
          title: string
          total_points: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          criteria: Json
          description?: string | null
          grade_level?: string | null
          id?: string
          performance_levels: Json
          subject: string
          title: string
          total_points?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          criteria?: Json
          description?: string | null
          grade_level?: string | null
          id?: string
          performance_levels?: Json
          subject?: string
          title?: string
          total_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      student_responses: {
        Row: {
          graded: boolean | null
          graded_at: string | null
          graded_by: string | null
          id: string
          question_id: string | null
          response_text: string
          student_id: string | null
          student_name: string
          submitted_at: string | null
          total_score: number | null
        }
        Insert: {
          graded?: boolean | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          question_id?: string | null
          response_text: string
          student_id?: string | null
          student_name: string
          submitted_at?: string | null
          total_score?: number | null
        }
        Update: {
          graded?: boolean | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          question_id?: string | null
          response_text?: string
          student_id?: string | null
          student_name?: string
          submitted_at?: string | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      test_exports: {
        Row: {
          export_type: string
          exported_at: string | null
          exported_by: string
          file_name: string
          id: string
          test_version_id: string | null
        }
        Insert: {
          export_type: string
          exported_at?: string | null
          exported_by: string
          file_name: string
          id?: string
          test_version_id?: string | null
        }
        Update: {
          export_type?: string
          exported_at?: string | null
          exported_by?: string
          file_name?: string
          id?: string
          test_version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_exports_test_version_id_fkey"
            columns: ["test_version_id"]
            isOneToOne: false
            referencedRelation: "test_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      test_metadata: {
        Row: {
          course: string | null
          created_at: string | null
          created_by: string
          exam_period: string | null
          id: string
          instructions: string
          number_of_versions: number | null
          points_per_question: number | null
          school_year: string | null
          shuffle_choices: boolean | null
          shuffle_questions: boolean | null
          subject: string
          time_limit: number | null
          title: string
          total_questions: number
          updated_at: string | null
          year_section: string | null
        }
        Insert: {
          course?: string | null
          created_at?: string | null
          created_by?: string
          exam_period?: string | null
          id?: string
          instructions?: string
          number_of_versions?: number | null
          points_per_question?: number | null
          school_year?: string | null
          shuffle_choices?: boolean | null
          shuffle_questions?: boolean | null
          subject: string
          time_limit?: number | null
          title: string
          total_questions: number
          updated_at?: string | null
          year_section?: string | null
        }
        Update: {
          course?: string | null
          created_at?: string | null
          created_by?: string
          exam_period?: string | null
          id?: string
          instructions?: string
          number_of_versions?: number | null
          points_per_question?: number | null
          school_year?: string | null
          shuffle_choices?: boolean | null
          shuffle_questions?: boolean | null
          subject?: string
          time_limit?: number | null
          title?: string
          total_questions?: number
          updated_at?: string | null
          year_section?: string | null
        }
        Relationships: []
      }
      test_versions: {
        Row: {
          answer_key: Json
          created_at: string | null
          id: string
          question_order: number[]
          questions: Json
          test_metadata_id: string | null
          total_points: number
          version_label: string
        }
        Insert: {
          answer_key: Json
          created_at?: string | null
          id?: string
          question_order: number[]
          questions: Json
          test_metadata_id?: string | null
          total_points: number
          version_label: string
        }
        Update: {
          answer_key?: Json
          created_at?: string | null
          id?: string
          question_order?: number[]
          questions?: Json
          test_metadata_id?: string | null
          total_points?: number
          version_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_versions_test_metadata_id_fkey"
            columns: ["test_metadata_id"]
            isOneToOne: false
            referencedRelation: "test_metadata"
            referencedColumns: ["id"]
          },
        ]
      }
      tos_entries: {
        Row: {
          course: string
          created_at: string
          created_by: string
          description: string
          exam_period: string
          id: string
          noted_by: string
          prepared_by: string
          school_year: string
          subject_no: string
          title: string
          total_items: number
          updated_at: string
          year_section: string
        }
        Insert: {
          course: string
          created_at?: string
          created_by?: string
          description: string
          exam_period: string
          id?: string
          noted_by: string
          prepared_by: string
          school_year: string
          subject_no: string
          title: string
          total_items: number
          updated_at?: string
          year_section: string
        }
        Update: {
          course?: string
          created_at?: string
          created_by?: string
          description?: string
          exam_period?: string
          id?: string
          noted_by?: string
          prepared_by?: string
          school_year?: string
          subject_no?: string
          title?: string
          total_items?: number
          updated_at?: string
          year_section?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_admin_role: {
        Args: { user_email: string }
        Returns: undefined
      }
    }
    Enums: {
      bloom_taxonomy:
        | "remember"
        | "understand"
        | "apply"
        | "analyze"
        | "evaluate"
        | "create"
      difficulty_level: "easy" | "medium" | "hard"
      question_type: "multiple_choice" | "true_false" | "essay" | "fill_blank"
      user_role: "admin" | "teacher"
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
      bloom_taxonomy: [
        "remember",
        "understand",
        "apply",
        "analyze",
        "evaluate",
        "create",
      ],
      difficulty_level: ["easy", "medium", "hard"],
      question_type: ["multiple_choice", "true_false", "essay", "fill_blank"],
      user_role: ["admin", "teacher"],
    },
  },
} as const
