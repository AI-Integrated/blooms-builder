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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          meta: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          meta?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          meta?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      assembly_versions: {
        Row: {
          assembly_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          question_order: string[]
          shuffle_seed: string | null
          version_label: string
        }
        Insert: {
          assembly_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          question_order: string[]
          shuffle_seed?: string | null
          version_label: string
        }
        Update: {
          assembly_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          question_order?: string[]
          shuffle_seed?: string | null
          version_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "assembly_versions_assembly_id_fkey"
            columns: ["assembly_id"]
            isOneToOne: false
            referencedRelation: "test_assemblies"
            referencedColumns: ["id"]
          },
        ]
      }
      classification_validations: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          original_classification: Json
          question_id: string | null
          validated_classification: Json
          validation_confidence: number
          validation_type: string | null
          validator_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          original_classification: Json
          question_id?: string | null
          validated_classification: Json
          validation_confidence: number
          validation_type?: string | null
          validator_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          original_classification?: Json
          question_id?: string | null
          validated_classification?: Json
          validation_confidence?: number
          validation_type?: string | null
          validator_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classification_validations_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_messages: {
        Row: {
          document_id: string
          document_type: string
          id: string
          message: string
          timestamp: string | null
          user_email: string
          user_name: string
        }
        Insert: {
          document_id: string
          document_type: string
          id?: string
          message: string
          timestamp?: string | null
          user_email: string
          user_name: string
        }
        Update: {
          document_id?: string
          document_type?: string
          id?: string
          message?: string
          timestamp?: string | null
          user_email?: string
          user_name?: string
        }
        Relationships: []
      }
      document_activity: {
        Row: {
          action_details: Json | null
          action_type: string
          document_id: string
          document_type: string
          id: string
          timestamp: string | null
          user_email: string
          user_name: string
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          document_id: string
          document_type: string
          id?: string
          timestamp?: string | null
          user_email: string
          user_name: string
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          document_id?: string
          document_type?: string
          id?: string
          timestamp?: string | null
          user_email?: string
          user_name?: string
        }
        Relationships: []
      }
      document_collaborators: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          document_id: string
          document_type: string
          id: string
          invited_at: string | null
          invited_by: string | null
          last_active: string | null
          role: string
          user_email: string
          user_name: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          document_id: string
          document_type: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          last_active?: string | null
          role?: string
          user_email: string
          user_name: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          document_id?: string
          document_type?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          last_active?: string | null
          role?: string
          user_email?: string
          user_name?: string
        }
        Relationships: []
      }
      document_presence: {
        Row: {
          created_at: string | null
          cursor_position: Json | null
          document_id: string
          document_type: string
          id: string
          is_active: boolean | null
          last_seen: string | null
          user_color: string
          user_email: string
          user_name: string
        }
        Insert: {
          created_at?: string | null
          cursor_position?: Json | null
          document_id: string
          document_type: string
          id?: string
          is_active?: boolean | null
          last_seen?: string | null
          user_color: string
          user_email: string
          user_name: string
        }
        Update: {
          created_at?: string | null
          cursor_position?: Json | null
          document_id?: string
          document_type?: string
          id?: string
          is_active?: boolean | null
          last_seen?: string | null
          user_color?: string
          user_email?: string
          user_name?: string
        }
        Relationships: []
      }
      educational_standards: {
        Row: {
          category: string
          code: string
          created_at: string | null
          description: string | null
          framework: string | null
          grade_level: string | null
          id: string
          metadata: Json | null
          parent_standard_id: string | null
          subject_area: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category: string
          code: string
          created_at?: string | null
          description?: string | null
          framework?: string | null
          grade_level?: string | null
          id?: string
          metadata?: Json | null
          parent_standard_id?: string | null
          subject_area: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          description?: string | null
          framework?: string | null
          grade_level?: string | null
          id?: string
          metadata?: Json | null
          parent_standard_id?: string | null
          subject_area?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "educational_standards_parent_standard_id_fkey"
            columns: ["parent_standard_id"]
            isOneToOne: false
            referencedRelation: "educational_standards"
            referencedColumns: ["id"]
          },
        ]
      }
      essay_scores: {
        Row: {
          created_at: string | null
          graded_by: string | null
          id: string
          question_id: string | null
          scores: Json
          student_id: string
          student_name: string | null
          total: number | null
        }
        Insert: {
          created_at?: string | null
          graded_by?: string | null
          id?: string
          question_id?: string | null
          scores?: Json
          student_id: string
          student_name?: string | null
          total?: number | null
        }
        Update: {
          created_at?: string | null
          graded_by?: string | null
          id?: string
          question_id?: string | null
          scores?: Json
          student_id?: string
          student_name?: string | null
          total?: number | null
        }
        Relationships: []
      }
      generated_tests: {
        Row: {
          answer_key: Json
          course: string | null
          created_at: string | null
          created_by: string | null
          exam_period: string | null
          id: string
          instructions: string | null
          items: Json
          parent_test_id: string | null
          points_per_question: number | null
          question_order: Json | null
          school_year: string | null
          shuffle_choices: boolean | null
          shuffle_questions: boolean | null
          shuffle_seed: string | null
          subject: string | null
          time_limit: number | null
          title: string | null
          tos_id: string | null
          version_label: string | null
          version_number: number | null
          watermark_data: Json | null
          year_section: string | null
        }
        Insert: {
          answer_key: Json
          course?: string | null
          created_at?: string | null
          created_by?: string | null
          exam_period?: string | null
          id?: string
          instructions?: string | null
          items: Json
          parent_test_id?: string | null
          points_per_question?: number | null
          question_order?: Json | null
          school_year?: string | null
          shuffle_choices?: boolean | null
          shuffle_questions?: boolean | null
          shuffle_seed?: string | null
          subject?: string | null
          time_limit?: number | null
          title?: string | null
          tos_id?: string | null
          version_label?: string | null
          version_number?: number | null
          watermark_data?: Json | null
          year_section?: string | null
        }
        Update: {
          answer_key?: Json
          course?: string | null
          created_at?: string | null
          created_by?: string | null
          exam_period?: string | null
          id?: string
          instructions?: string | null
          items?: Json
          parent_test_id?: string | null
          points_per_question?: number | null
          question_order?: Json | null
          school_year?: string | null
          shuffle_choices?: boolean | null
          shuffle_questions?: boolean | null
          shuffle_seed?: string | null
          subject?: string | null
          time_limit?: number | null
          title?: string | null
          tos_id?: string | null
          version_label?: string | null
          version_number?: number | null
          watermark_data?: Json | null
          year_section?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_tests_parent_test_id_fkey"
            columns: ["parent_test_id"]
            isOneToOne: false
            referencedRelation: "generated_tests"
            referencedColumns: ["id"]
          },
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
      ml_model_performance: {
        Row: {
          accuracy_score: number | null
          actual_classification: Json | null
          confidence_score: number | null
          evaluation_date: string | null
          id: string
          model_name: string
          model_version: string
          predicted_classification: Json
          question_id: string | null
        }
        Insert: {
          accuracy_score?: number | null
          actual_classification?: Json | null
          confidence_score?: number | null
          evaluation_date?: string | null
          id?: string
          model_name: string
          model_version: string
          predicted_classification: Json
          question_id?: string | null
        }
        Update: {
          accuracy_score?: number | null
          actual_classification?: Json | null
          confidence_score?: number | null
          evaluation_date?: string | null
          id?: string
          model_name?: string
          model_version?: string
          predicted_classification?: Json
          question_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_model_performance_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_models: {
        Row: {
          accuracy_score: number | null
          created_at: string | null
          created_by: string | null
          deployed_at: string | null
          deprecated_at: string | null
          f1_score: number | null
          hyperparameters: Json | null
          id: string
          is_active: boolean | null
          model_name: string
          model_type: string
          model_version: string
          performance_metrics: Json | null
          precision_score: number | null
          recall_score: number | null
          training_data_size: number | null
          updated_at: string | null
        }
        Insert: {
          accuracy_score?: number | null
          created_at?: string | null
          created_by?: string | null
          deployed_at?: string | null
          deprecated_at?: string | null
          f1_score?: number | null
          hyperparameters?: Json | null
          id?: string
          is_active?: boolean | null
          model_name: string
          model_type: string
          model_version: string
          performance_metrics?: Json | null
          precision_score?: number | null
          recall_score?: number | null
          training_data_size?: number | null
          updated_at?: string | null
        }
        Update: {
          accuracy_score?: number | null
          created_at?: string | null
          created_by?: string | null
          deployed_at?: string | null
          deprecated_at?: string | null
          f1_score?: number | null
          hyperparameters?: Json | null
          id?: string
          is_active?: boolean | null
          model_name?: string
          model_type?: string
          model_version?: string
          performance_metrics?: Json | null
          precision_score?: number | null
          recall_score?: number | null
          training_data_size?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      performance_benchmarks: {
        Row: {
          average_response_time: number
          created_at: string
          error_rate: number
          id: string
          max_response_time: number
          measured_at: string
          measurement_period_minutes: number
          min_response_time: number
          operation_name: string
          throughput: number
        }
        Insert: {
          average_response_time: number
          created_at?: string
          error_rate?: number
          id?: string
          max_response_time: number
          measured_at?: string
          measurement_period_minutes?: number
          min_response_time: number
          operation_name: string
          throughput?: number
        }
        Update: {
          average_response_time?: number
          created_at?: string
          error_rate?: number
          id?: string
          max_response_time?: number
          measured_at?: string
          measurement_period_minutes?: number
          min_response_time?: number
          operation_name?: string
          throughput?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          role: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string
        }
        Relationships: []
      }
      psychometric_analyses: {
        Row: {
          analysis_date: string
          analysis_type: string
          analyzed_by: string | null
          created_at: string
          difficulty_index: number | null
          discrimination_index: number | null
          id: string
          point_biserial_correlation: number | null
          question_id: string | null
          reliability_coefficient: number | null
          sample_size: number | null
          test_id: string | null
          validity_score: number | null
        }
        Insert: {
          analysis_date?: string
          analysis_type: string
          analyzed_by?: string | null
          created_at?: string
          difficulty_index?: number | null
          discrimination_index?: number | null
          id?: string
          point_biserial_correlation?: number | null
          question_id?: string | null
          reliability_coefficient?: number | null
          sample_size?: number | null
          test_id?: string | null
          validity_score?: number | null
        }
        Update: {
          analysis_date?: string
          analysis_type?: string
          analyzed_by?: string | null
          created_at?: string
          difficulty_index?: number | null
          discrimination_index?: number | null
          id?: string
          point_biserial_correlation?: number | null
          question_id?: string | null
          reliability_coefficient?: number | null
          sample_size?: number | null
          test_id?: string | null
          validity_score?: number | null
        }
        Relationships: []
      }
      quality_assessments: {
        Row: {
          assessed_by: string | null
          assessment_date: string
          characteristics: Json
          compliance_level: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          next_review_date: string
          overall_score: number
          recommendations: string[] | null
          updated_at: string
        }
        Insert: {
          assessed_by?: string | null
          assessment_date?: string
          characteristics?: Json
          compliance_level?: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          next_review_date?: string
          overall_score?: number
          recommendations?: string[] | null
          updated_at?: string
        }
        Update: {
          assessed_by?: string | null
          assessment_date?: string
          characteristics?: Json
          compliance_level?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          next_review_date?: string
          overall_score?: number
          recommendations?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      quality_metrics: {
        Row: {
          automated: boolean | null
          characteristic: string
          entity_id: string | null
          entity_type: string
          id: string
          measured_at: string | null
          measured_by: string | null
          measurement_method: string | null
          metric_name: string
          unit: string | null
          value: number
        }
        Insert: {
          automated?: boolean | null
          characteristic: string
          entity_id?: string | null
          entity_type: string
          id?: string
          measured_at?: string | null
          measured_by?: string | null
          measurement_method?: string | null
          metric_name: string
          unit?: string | null
          value: number
        }
        Update: {
          automated?: boolean | null
          characteristic?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          measured_at?: string | null
          measured_by?: string | null
          measurement_method?: string | null
          metric_name?: string
          unit?: string | null
          value?: number
        }
        Relationships: []
      }
      question_similarities: {
        Row: {
          algorithm_used: string
          calculated_at: string | null
          id: string
          question1_id: string | null
          question2_id: string | null
          similarity_score: number
        }
        Insert: {
          algorithm_used: string
          calculated_at?: string | null
          id?: string
          question1_id?: string | null
          question2_id?: string | null
          similarity_score: number
        }
        Update: {
          algorithm_used?: string
          calculated_at?: string | null
          id?: string
          question1_id?: string | null
          question2_id?: string | null
          similarity_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "question_similarities_question1_id_fkey"
            columns: ["question1_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_similarities_question2_id_fkey"
            columns: ["question2_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      question_standards: {
        Row: {
          alignment_strength: number | null
          created_at: string | null
          id: string
          notes: string | null
          question_id: string | null
          standard_id: string | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          alignment_strength?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          question_id?: string | null
          standard_id?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          alignment_strength?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          question_id?: string | null
          standard_id?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_standards_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_standards_standard_id_fkey"
            columns: ["standard_id"]
            isOneToOne: false
            referencedRelation: "educational_standards"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          ai_confidence_score: number | null
          approval_confidence: number | null
          approval_notes: string | null
          approval_timestamp: string | null
          approved: boolean
          approved_by: string | null
          bloom_level: string
          choices: Json | null
          classification_confidence: number | null
          correct_answer: string | null
          created_at: string | null
          created_by: string
          deleted: boolean | null
          difficulty: string
          id: string
          knowledge_dimension: string | null
          metadata: Json | null
          needs_review: boolean | null
          owner: string | null
          quality_score: number | null
          question_text: string
          question_type: string
          readability_score: number | null
          semantic_vector: string | null
          topic: string
          tos_id: string | null
          updated_at: string | null
          used_count: number | null
          used_history: Json | null
          validated_by: string | null
          validation_status: string | null
          validation_timestamp: string | null
        }
        Insert: {
          ai_confidence_score?: number | null
          approval_confidence?: number | null
          approval_notes?: string | null
          approval_timestamp?: string | null
          approved?: boolean
          approved_by?: string | null
          bloom_level: string
          choices?: Json | null
          classification_confidence?: number | null
          correct_answer?: string | null
          created_at?: string | null
          created_by?: string
          deleted?: boolean | null
          difficulty: string
          id?: string
          knowledge_dimension?: string | null
          metadata?: Json | null
          needs_review?: boolean | null
          owner?: string | null
          quality_score?: number | null
          question_text: string
          question_type: string
          readability_score?: number | null
          semantic_vector?: string | null
          topic: string
          tos_id?: string | null
          updated_at?: string | null
          used_count?: number | null
          used_history?: Json | null
          validated_by?: string | null
          validation_status?: string | null
          validation_timestamp?: string | null
        }
        Update: {
          ai_confidence_score?: number | null
          approval_confidence?: number | null
          approval_notes?: string | null
          approval_timestamp?: string | null
          approved?: boolean
          approved_by?: string | null
          bloom_level?: string
          choices?: Json | null
          classification_confidence?: number | null
          correct_answer?: string | null
          created_at?: string | null
          created_by?: string
          deleted?: boolean | null
          difficulty?: string
          id?: string
          knowledge_dimension?: string | null
          metadata?: Json | null
          needs_review?: boolean | null
          owner?: string | null
          quality_score?: number | null
          question_text?: string
          question_type?: string
          readability_score?: number | null
          semantic_vector?: string | null
          topic?: string
          tos_id?: string | null
          updated_at?: string | null
          used_count?: number | null
          used_history?: Json | null
          validated_by?: string | null
          validation_status?: string | null
          validation_timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_tos_id_fkey"
            columns: ["tos_id"]
            isOneToOne: false
            referencedRelation: "tos"
            referencedColumns: ["id"]
          },
        ]
      }
      review_requests: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          question_id: string | null
          request_type: string
          requested_by: string | null
          review_result: Json | null
          status: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          question_id?: string | null
          request_type: string
          requested_by?: string | null
          review_result?: Json | null
          status?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          question_id?: string | null
          request_type?: string
          requested_by?: string | null
          review_result?: Json | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_requests_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      rubric_criteria: {
        Row: {
          created_at: string | null
          id: string
          max_score: number | null
          name: string
          order_index: number | null
          rubric_id: string | null
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_score?: number | null
          name: string
          order_index?: number | null
          rubric_id?: string | null
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          max_score?: number | null
          name?: string
          order_index?: number | null
          rubric_id?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rubric_criteria_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "rubrics"
            referencedColumns: ["id"]
          },
        ]
      }
      rubric_scores: {
        Row: {
          comments: string | null
          created_at: string | null
          id: string
          question_id: string | null
          scorer_id: string | null
          scores: Json
          student_id: string | null
          student_name: string | null
          test_id: string | null
          total_score: number
        }
        Insert: {
          comments?: string | null
          created_at?: string | null
          id?: string
          question_id?: string | null
          scorer_id?: string | null
          scores?: Json
          student_id?: string | null
          student_name?: string | null
          test_id?: string | null
          total_score?: number
        }
        Update: {
          comments?: string | null
          created_at?: string | null
          id?: string
          question_id?: string | null
          scorer_id?: string | null
          scores?: Json
          student_id?: string | null
          student_name?: string | null
          test_id?: string | null
          total_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "rubric_scores_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rubric_scores_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "generated_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      rubrics: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          title?: string
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
        Relationships: []
      }
      system_metrics: {
        Row: {
          aggregation_period: string | null
          created_at: string | null
          dimensions: Json | null
          id: string
          measured_at: string | null
          metric_category: string
          metric_name: string
          metric_unit: string | null
          metric_value: number
        }
        Insert: {
          aggregation_period?: string | null
          created_at?: string | null
          dimensions?: Json | null
          id?: string
          measured_at?: string | null
          metric_category: string
          metric_name: string
          metric_unit?: string | null
          metric_value: number
        }
        Update: {
          aggregation_period?: string | null
          created_at?: string | null
          dimensions?: Json | null
          id?: string
          measured_at?: string | null
          metric_category?: string
          metric_name?: string
          metric_unit?: string | null
          metric_value?: number
        }
        Relationships: []
      }
      test_assemblies: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          params: Json | null
          status: string | null
          title: string
          tos_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          params?: Json | null
          status?: string | null
          title: string
          tos_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          params?: Json | null
          status?: string | null
          title?: string
          tos_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_assemblies_tos_id_fkey"
            columns: ["tos_id"]
            isOneToOne: false
            referencedRelation: "tos_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      test_assembly_constraints: {
        Row: {
          constraint_config: Json
          constraint_type: string
          created_at: string | null
          created_by: string | null
          id: string
          is_required: boolean | null
          priority: number | null
          test_id: string | null
        }
        Insert: {
          constraint_config: Json
          constraint_type: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_required?: boolean | null
          priority?: number | null
          test_id?: string | null
        }
        Update: {
          constraint_config?: Json
          constraint_type?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_required?: boolean | null
          priority?: number | null
          test_id?: string | null
        }
        Relationships: []
      }
      test_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          seat_number: string | null
          started_at: string | null
          status: string | null
          student_id: string
          student_name: string
          submitted_at: string | null
          test_version_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          seat_number?: string | null
          started_at?: string | null
          status?: string | null
          student_id: string
          student_name: string
          submitted_at?: string | null
          test_version_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          seat_number?: string | null
          started_at?: string | null
          status?: string | null
          student_id?: string
          student_name?: string
          submitted_at?: string | null
          test_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_assignments_test_version_id_fkey"
            columns: ["test_version_id"]
            isOneToOne: false
            referencedRelation: "generated_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_distribution_logs: {
        Row: {
          created_at: string | null
          distributed_at: string | null
          distributed_by: string | null
          distribution_strategy: string
          id: string
          parent_test_id: string | null
          settings: Json | null
          total_students: number
          total_versions: number
        }
        Insert: {
          created_at?: string | null
          distributed_at?: string | null
          distributed_by?: string | null
          distribution_strategy: string
          id?: string
          parent_test_id?: string | null
          settings?: Json | null
          total_students: number
          total_versions: number
        }
        Update: {
          created_at?: string | null
          distributed_at?: string | null
          distributed_by?: string | null
          distribution_strategy?: string
          id?: string
          parent_test_id?: string | null
          settings?: Json | null
          total_students?: number
          total_versions?: number
        }
        Relationships: [
          {
            foreignKeyName: "test_distribution_logs_parent_test_id_fkey"
            columns: ["parent_test_id"]
            isOneToOne: false
            referencedRelation: "generated_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_equivalence_groups: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          group_name: string
          id: string
          statistical_metrics: Json | null
          target_difficulty: number | null
          target_reliability: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          group_name: string
          id?: string
          statistical_metrics?: Json | null
          target_difficulty?: number | null
          target_reliability?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          group_name?: string
          id?: string
          statistical_metrics?: Json | null
          target_difficulty?: number | null
          target_reliability?: number | null
        }
        Relationships: []
      }
      test_equivalence_members: {
        Row: {
          created_at: string | null
          equivalence_score: number | null
          group_id: string | null
          id: string
          test_id: string | null
        }
        Insert: {
          created_at?: string | null
          equivalence_score?: number | null
          group_id?: string | null
          id?: string
          test_id?: string | null
        }
        Update: {
          created_at?: string | null
          equivalence_score?: number | null
          group_id?: string | null
          id?: string
          test_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_equivalence_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "test_equivalence_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_equivalence_members_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "generated_tests"
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
      tos: {
        Row: {
          bloom_distribution: Json
          course: string
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          matrix: Json
          noted_by: string | null
          period: string
          prepared_by: string | null
          school_year: string
          subject_no: string
          topics: Json
          total_items: number
          year_section: string
        }
        Insert: {
          bloom_distribution: Json
          course: string
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          matrix: Json
          noted_by?: string | null
          period: string
          prepared_by?: string | null
          school_year: string
          subject_no: string
          topics: Json
          total_items: number
          year_section: string
        }
        Update: {
          bloom_distribution?: Json
          course?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          matrix?: Json
          noted_by?: string | null
          period?: string
          prepared_by?: string | null
          school_year?: string
          subject_no?: string
          topics?: Json
          total_items?: number
          year_section?: string
        }
        Relationships: []
      }
      tos_collaborators: {
        Row: {
          can_edit: boolean | null
          invited_at: string | null
          tos_id: string
          user_id: string
        }
        Insert: {
          can_edit?: boolean | null
          invited_at?: string | null
          tos_id: string
          user_id: string
        }
        Update: {
          can_edit?: boolean | null
          invited_at?: string | null
          tos_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tos_collaborators_tos_id_fkey"
            columns: ["tos_id"]
            isOneToOne: false
            referencedRelation: "tos_entries"
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
          distribution: Json | null
          exam_period: string
          id: string
          matrix: Json | null
          noted_by: string
          owner: string | null
          prepared_by: string
          school_year: string
          subject_no: string
          title: string
          topics: Json | null
          total_items: number
          updated_at: string
          year_section: string
        }
        Insert: {
          course: string
          created_at?: string
          created_by?: string
          description: string
          distribution?: Json | null
          exam_period: string
          id?: string
          matrix?: Json | null
          noted_by: string
          owner?: string | null
          prepared_by: string
          school_year: string
          subject_no: string
          title: string
          topics?: Json | null
          total_items: number
          updated_at?: string
          year_section: string
        }
        Update: {
          course?: string
          created_at?: string
          created_by?: string
          description?: string
          distribution?: Json | null
          exam_period?: string
          id?: string
          matrix?: Json | null
          noted_by?: string
          owner?: string | null
          prepared_by?: string
          school_year?: string
          subject_no?: string
          title?: string
          topics?: Json | null
          total_items?: number
          updated_at?: string
          year_section?: string
        }
        Relationships: []
      }
      user_analytics: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          occurred_at: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          occurred_at?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          occurred_at?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      validation_tests: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          error_message: string | null
          executed_at: string | null
          execution_time_ms: number | null
          id: string
          passed: boolean | null
          results: Json
          scheduled_at: string | null
          status: string
          test_name: string
          test_type: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          error_message?: string | null
          executed_at?: string | null
          execution_time_ms?: number | null
          id?: string
          passed?: boolean | null
          results?: Json
          scheduled_at?: string | null
          status?: string
          test_name: string
          test_type: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          error_message?: string | null
          executed_at?: string | null
          execution_time_ms?: number | null
          id?: string
          passed?: boolean | null
          results?: Json
          scheduled_at?: string | null
          status?: string
          test_name?: string
          test_type?: string
        }
        Relationships: []
      }
      version_security_logs: {
        Row: {
          detected_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          severity: string | null
          test_version_id: string | null
        }
        Insert: {
          detected_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          severity?: string | null
          test_version_id?: string | null
        }
        Update: {
          detected_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          severity?: string | null
          test_version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "version_security_logs_test_version_id_fkey"
            columns: ["test_version_id"]
            isOneToOne: false
            referencedRelation: "generated_tests"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      analytics_approval_stats: {
        Row: {
          name: string | null
          value: number | null
        }
        Relationships: []
      }
      analytics_bloom_distribution: {
        Row: {
          name: string | null
          percentage: number | null
          value: number | null
        }
        Relationships: []
      }
      analytics_creator_stats: {
        Row: {
          name: string | null
          value: number | null
        }
        Relationships: []
      }
      analytics_difficulty_spread: {
        Row: {
          name: string | null
          percentage: number | null
          value: number | null
        }
        Relationships: []
      }
      analytics_topic_analysis: {
        Row: {
          approved: number | null
          count: number | null
          topic: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_admin_role: {
        Args: { user_email: string }
        Returns: undefined
      }
      calculate_similarity_metrics: {
        Args: Record<PropertyKey, never>
        Returns: {
          avg_similarity: number
          high_similarity_pairs: number
          max_similarity: number
          total_pairs: number
        }[]
      }
      cleanup_old_presence: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_available_test_versions: {
        Args: { p_parent_test_id: string }
        Returns: {
          assignment_count: number
          version_id: string
          version_number: number
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_question_stats: {
        Args: { user_uuid: string }
        Returns: {
          approved_count: number
          bloom_level: string
          count: number
          difficulty: string
          knowledge_dimension: string
        }[]
      }
      get_validation_statistics: {
        Args: Record<PropertyKey, never>
        Returns: {
          accepted_count: number
          avg_confidence: number
          modified_count: number
          rejected_count: number
          total_validations: number
        }[]
      }
      increment_usage_count: {
        Args: { question_id: string }
        Returns: undefined
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      validate_version_balance: {
        Args: { p_parent_test_id: string }
        Returns: {
          is_balanced: boolean
          max_diff: number
          warning_message: string
        }[]
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
