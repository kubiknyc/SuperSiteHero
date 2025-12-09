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
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      analytics_model_metadata: {
        Row: {
          accuracy: number | null
          config_json_url: string | null
          created_at: string | null
          created_by: string | null
          deployed_at: string | null
          deprecated_at: string | null
          f1_score: number | null
          feature_config: Json | null
          hyperparameters: Json | null
          id: string
          is_active: boolean | null
          is_production: boolean | null
          mae: number | null
          model_json_url: string | null
          model_type: Database["public"]["Enums"]["analytics_model_type"]
          model_version: string
          model_weights_url: string | null
          normalization_params: Json | null
          notes: string | null
          precision_score: number | null
          r_squared: number | null
          recall_score: number | null
          rmse: number | null
          training_completed_at: string | null
          training_duration_seconds: number | null
          training_samples: number | null
          training_started_at: string | null
          validation_samples: number | null
        }
        Insert: {
          accuracy?: number | null
          config_json_url?: string | null
          created_at?: string | null
          created_by?: string | null
          deployed_at?: string | null
          deprecated_at?: string | null
          f1_score?: number | null
          feature_config?: Json | null
          hyperparameters?: Json | null
          id?: string
          is_active?: boolean | null
          is_production?: boolean | null
          mae?: number | null
          model_json_url?: string | null
          model_type: Database["public"]["Enums"]["analytics_model_type"]
          model_version: string
          model_weights_url?: string | null
          normalization_params?: Json | null
          notes?: string | null
          precision_score?: number | null
          r_squared?: number | null
          recall_score?: number | null
          rmse?: number | null
          training_completed_at?: string | null
          training_duration_seconds?: number | null
          training_samples?: number | null
          training_started_at?: string | null
          validation_samples?: number | null
        }
        Update: {
          accuracy?: number | null
          config_json_url?: string | null
          created_at?: string | null
          created_by?: string | null
          deployed_at?: string | null
          deprecated_at?: string | null
          f1_score?: number | null
          feature_config?: Json | null
          hyperparameters?: Json | null
          id?: string
          is_active?: boolean | null
          is_production?: boolean | null
          mae?: number | null
          model_json_url?: string | null
          model_type?: Database["public"]["Enums"]["analytics_model_type"]
          model_version?: string
          model_weights_url?: string | null
          normalization_params?: Json | null
          notes?: string | null
          precision_score?: number | null
          r_squared?: number | null
          recall_score?: number | null
          rmse?: number | null
          training_completed_at?: string | null
          training_duration_seconds?: number | null
          training_samples?: number | null
          training_started_at?: string | null
          validation_samples?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_model_metadata_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_model_metadata_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_predictions: {
        Row: {
          budget_confidence_score: number | null
          budget_feature_importance: Json | null
          budget_overrun_amount_high: number | null
          budget_overrun_amount_low: number | null
          budget_overrun_amount_mid: number | null
          budget_overrun_probability: number | null
          cost_risk_score: number | null
          created_at: string | null
          expires_at: string | null
          id: string
          input_features: Json | null
          is_latest: boolean | null
          model_version: string
          operational_risk_score: number | null
          overall_risk_score: number | null
          prediction_date: string
          project_id: string
          projected_completion_date: string | null
          risk_feature_importance: Json | null
          schedule_confidence_score: number | null
          schedule_delay_days_high: number | null
          schedule_delay_days_low: number | null
          schedule_delay_days_mid: number | null
          schedule_delay_probability: number | null
          schedule_feature_importance: Json | null
          schedule_risk_score: number | null
        }
        Insert: {
          budget_confidence_score?: number | null
          budget_feature_importance?: Json | null
          budget_overrun_amount_high?: number | null
          budget_overrun_amount_low?: number | null
          budget_overrun_amount_mid?: number | null
          budget_overrun_probability?: number | null
          cost_risk_score?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          input_features?: Json | null
          is_latest?: boolean | null
          model_version: string
          operational_risk_score?: number | null
          overall_risk_score?: number | null
          prediction_date?: string
          project_id: string
          projected_completion_date?: string | null
          risk_feature_importance?: Json | null
          schedule_confidence_score?: number | null
          schedule_delay_days_high?: number | null
          schedule_delay_days_low?: number | null
          schedule_delay_days_mid?: number | null
          schedule_delay_probability?: number | null
          schedule_feature_importance?: Json | null
          schedule_risk_score?: number | null
        }
        Update: {
          budget_confidence_score?: number | null
          budget_feature_importance?: Json | null
          budget_overrun_amount_high?: number | null
          budget_overrun_amount_low?: number | null
          budget_overrun_amount_mid?: number | null
          budget_overrun_probability?: number | null
          cost_risk_score?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          input_features?: Json | null
          is_latest?: boolean | null
          model_version?: string
          operational_risk_score?: number | null
          overall_risk_score?: number | null
          prediction_date?: string
          project_id?: string
          projected_completion_date?: string | null
          risk_feature_importance?: Json | null
          schedule_confidence_score?: number | null
          schedule_delay_days_high?: number | null
          schedule_delay_days_low?: number | null
          schedule_delay_days_mid?: number | null
          schedule_delay_probability?: number | null
          schedule_feature_importance?: Json | null
          schedule_risk_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_predictions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_predictions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "analytics_predictions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_project_snapshots: {
        Row: {
          approved_change_orders_cost: number | null
          avg_co_approval_days: number | null
          avg_daily_workforce: number | null
          avg_rfi_response_days: number | null
          avg_submittal_response_days: number | null
          baseline_variance_days: number | null
          budget: number | null
          completed_punch_items: number | null
          contract_value: number | null
          cost_to_date: number | null
          created_at: string | null
          critical_path_length_days: number | null
          days_since_incident: number | null
          id: string
          milestones_completed: number | null
          milestones_total: number | null
          near_misses_mtd: number | null
          open_change_orders: number | null
          open_punch_items: number | null
          open_rfis: number | null
          open_submittals: number | null
          osha_recordable_mtd: number | null
          overall_percent_complete: number | null
          overdue_change_orders: number | null
          overdue_rfis: number | null
          overdue_submittals: number | null
          pending_approvals: number | null
          pending_change_orders_cost: number | null
          planned_completion_date: string | null
          planned_start_date: string | null
          project_id: string
          projected_completion_date: string | null
          safety_incidents_mtd: number | null
          schedule_items_completed: number | null
          schedule_items_total: number | null
          snapshot_date: string
          tasks_on_critical_path: number | null
          total_documents: number | null
          total_equipment_hours: number | null
          total_labor_hours: number | null
          total_punch_items: number | null
          weather_delay_days: number | null
          weather_delay_hours: number | null
        }
        Insert: {
          approved_change_orders_cost?: number | null
          avg_co_approval_days?: number | null
          avg_daily_workforce?: number | null
          avg_rfi_response_days?: number | null
          avg_submittal_response_days?: number | null
          baseline_variance_days?: number | null
          budget?: number | null
          completed_punch_items?: number | null
          contract_value?: number | null
          cost_to_date?: number | null
          created_at?: string | null
          critical_path_length_days?: number | null
          days_since_incident?: number | null
          id?: string
          milestones_completed?: number | null
          milestones_total?: number | null
          near_misses_mtd?: number | null
          open_change_orders?: number | null
          open_punch_items?: number | null
          open_rfis?: number | null
          open_submittals?: number | null
          osha_recordable_mtd?: number | null
          overall_percent_complete?: number | null
          overdue_change_orders?: number | null
          overdue_rfis?: number | null
          overdue_submittals?: number | null
          pending_approvals?: number | null
          pending_change_orders_cost?: number | null
          planned_completion_date?: string | null
          planned_start_date?: string | null
          project_id: string
          projected_completion_date?: string | null
          safety_incidents_mtd?: number | null
          schedule_items_completed?: number | null
          schedule_items_total?: number | null
          snapshot_date: string
          tasks_on_critical_path?: number | null
          total_documents?: number | null
          total_equipment_hours?: number | null
          total_labor_hours?: number | null
          total_punch_items?: number | null
          weather_delay_days?: number | null
          weather_delay_hours?: number | null
        }
        Update: {
          approved_change_orders_cost?: number | null
          avg_co_approval_days?: number | null
          avg_daily_workforce?: number | null
          avg_rfi_response_days?: number | null
          avg_submittal_response_days?: number | null
          baseline_variance_days?: number | null
          budget?: number | null
          completed_punch_items?: number | null
          contract_value?: number | null
          cost_to_date?: number | null
          created_at?: string | null
          critical_path_length_days?: number | null
          days_since_incident?: number | null
          id?: string
          milestones_completed?: number | null
          milestones_total?: number | null
          near_misses_mtd?: number | null
          open_change_orders?: number | null
          open_punch_items?: number | null
          open_rfis?: number | null
          open_submittals?: number | null
          osha_recordable_mtd?: number | null
          overall_percent_complete?: number | null
          overdue_change_orders?: number | null
          overdue_rfis?: number | null
          overdue_submittals?: number | null
          pending_approvals?: number | null
          pending_change_orders_cost?: number | null
          planned_completion_date?: string | null
          planned_start_date?: string | null
          project_id?: string
          projected_completion_date?: string | null
          safety_incidents_mtd?: number | null
          schedule_items_completed?: number | null
          schedule_items_total?: number | null
          snapshot_date?: string
          tasks_on_critical_path?: number | null
          total_documents?: number | null
          total_equipment_hours?: number | null
          total_labor_hours?: number | null
          total_punch_items?: number | null
          weather_delay_days?: number | null
          weather_delay_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_project_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_project_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "analytics_project_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_recommendations: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          category: Database["public"]["Enums"]["recommendation_category"]
          created_at: string | null
          description: string
          dismissal_reason: string | null
          dismissed_at: string | null
          dismissed_by: string | null
          due_date: string | null
          id: string
          implemented_at: string | null
          implemented_by: string | null
          notes: string | null
          potential_impact: string | null
          prediction_id: string | null
          priority: Database["public"]["Enums"]["recommendation_priority"]
          project_id: string
          related_entity_data: Json | null
          related_entity_id: string | null
          related_entity_type: string | null
          status: Database["public"]["Enums"]["recommendation_status"]
          suggested_action: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          category: Database["public"]["Enums"]["recommendation_category"]
          created_at?: string | null
          description: string
          dismissal_reason?: string | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          due_date?: string | null
          id?: string
          implemented_at?: string | null
          implemented_by?: string | null
          notes?: string | null
          potential_impact?: string | null
          prediction_id?: string | null
          priority: Database["public"]["Enums"]["recommendation_priority"]
          project_id: string
          related_entity_data?: Json | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          status?: Database["public"]["Enums"]["recommendation_status"]
          suggested_action?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          category?: Database["public"]["Enums"]["recommendation_category"]
          created_at?: string | null
          description?: string
          dismissal_reason?: string | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          due_date?: string | null
          id?: string
          implemented_at?: string | null
          implemented_by?: string | null
          notes?: string | null
          potential_impact?: string | null
          prediction_id?: string | null
          priority?: Database["public"]["Enums"]["recommendation_priority"]
          project_id?: string
          related_entity_data?: Json | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          status?: Database["public"]["Enums"]["recommendation_status"]
          suggested_action?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_recommendations_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_recommendations_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_recommendations_dismissed_by_fkey"
            columns: ["dismissed_by"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_recommendations_dismissed_by_fkey"
            columns: ["dismissed_by"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_recommendations_implemented_by_fkey"
            columns: ["implemented_by"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_recommendations_implemented_by_fkey"
            columns: ["implemented_by"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_recommendations_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "analytics_latest_predictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_recommendations_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "analytics_predictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_recommendations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_recommendations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "analytics_recommendations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_actions: {
        Row: {
          action: string
          comment: string | null
          conditions: string | null
          created_at: string | null
          delegated_to: string | null
          id: string
          request_id: string
          step_id: string
          user_id: string
        }
        Insert: {
          action: string
          comment?: string | null
          conditions?: string | null
          created_at?: string | null
          delegated_to?: string | null
          id?: string
          request_id: string
          step_id: string
          user_id: string
        }
        Update: {
          action?: string
          comment?: string | null
          conditions?: string | null
          created_at?: string | null
          delegated_to?: string | null
          id?: string
          request_id?: string
          step_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_actions_delegated_to_fkey"
            columns: ["delegated_to"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_actions_delegated_to_fkey"
            columns: ["delegated_to"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_actions_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "approval_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          completed_at: string | null
          conditions: string | null
          current_step: number | null
          entity_id: string
          entity_type: string
          id: string
          initiated_at: string | null
          initiated_by: string
          project_id: string
          status: string | null
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          conditions?: string | null
          current_step?: number | null
          entity_id: string
          entity_type: string
          id?: string
          initiated_at?: string | null
          initiated_by: string
          project_id: string
          status?: string | null
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          conditions?: string | null
          current_step?: number | null
          entity_id?: string
          entity_type?: string
          id?: string
          initiated_at?: string | null
          initiated_by?: string
          project_id?: string
          status?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "approval_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "approval_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_steps: {
        Row: {
          allow_delegation: boolean | null
          approver_ids: string[]
          approver_type: string
          auto_approve_after_days: number | null
          created_at: string | null
          id: string
          name: string
          required_approvals: number | null
          step_order: number
          workflow_id: string
        }
        Insert: {
          allow_delegation?: boolean | null
          approver_ids: string[]
          approver_type?: string
          auto_approve_after_days?: number | null
          created_at?: string | null
          id?: string
          name: string
          required_approvals?: number | null
          step_order: number
          workflow_id: string
        }
        Update: {
          allow_delegation?: boolean | null
          approver_ids?: string[]
          approver_type?: string
          auto_approve_after_days?: number | null
          created_at?: string | null
          id?: string
          name?: string
          required_approvals?: number | null
          step_order?: number
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "approval_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_workflows: {
        Row: {
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          workflow_type: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          workflow_type: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          workflow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_workflows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      assemblies: {
        Row: {
          assembly_level: string
          assembly_number: string | null
          category: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          items: Json
          name: string
          trade: string | null
          unit_of_measure: string
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          assembly_level: string
          assembly_number?: string | null
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          items?: Json
          name: string
          trade?: string | null
          unit_of_measure: string
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          assembly_level?: string
          assembly_number?: string | null
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          items?: Json
          name?: string
          trade?: string | null
          unit_of_measure?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "assemblies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assemblies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      change_order_attachments: {
        Row: {
          change_order_id: string
          created_at: string | null
          document_id: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          uploaded_by: string | null
        }
        Insert: {
          change_order_id: string
          created_at?: string | null
          document_id?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          change_order_id?: string
          created_at?: string | null
          document_id?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_order_attachments_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_order_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_attachments_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_attachments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_ai_status"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "change_order_attachments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      change_order_bids: {
        Row: {
          awarded_at: string | null
          awarded_by: string | null
          bid_status: string | null
          created_at: string | null
          deleted_at: string | null
          duration_days: number | null
          exclusions: string | null
          id: string
          is_awarded: boolean | null
          lump_sum_cost: number | null
          notes: string | null
          project_id: string
          subcontractor_id: string
          submitted_at: string | null
          submitted_by: string | null
          supporting_documents: Json | null
          updated_at: string | null
          workflow_item_id: string
        }
        Insert: {
          awarded_at?: string | null
          awarded_by?: string | null
          bid_status?: string | null
          created_at?: string | null
          deleted_at?: string | null
          duration_days?: number | null
          exclusions?: string | null
          id?: string
          is_awarded?: boolean | null
          lump_sum_cost?: number | null
          notes?: string | null
          project_id: string
          subcontractor_id: string
          submitted_at?: string | null
          submitted_by?: string | null
          supporting_documents?: Json | null
          updated_at?: string | null
          workflow_item_id: string
        }
        Update: {
          awarded_at?: string | null
          awarded_by?: string | null
          bid_status?: string | null
          created_at?: string | null
          deleted_at?: string | null
          duration_days?: number | null
          exclusions?: string | null
          id?: string
          is_awarded?: boolean | null
          lump_sum_cost?: number | null
          notes?: string | null
          project_id?: string
          subcontractor_id?: string
          submitted_at?: string | null
          submitted_by?: string | null
          supporting_documents?: Json | null
          updated_at?: string | null
          workflow_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_order_bids_awarded_by_fkey"
            columns: ["awarded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_bids_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_bids_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "change_order_bids_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_bids_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_bids_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_bids_workflow_item_id_fkey"
            columns: ["workflow_item_id"]
            isOneToOne: false
            referencedRelation: "workflow_items"
            referencedColumns: ["id"]
          },
        ]
      }
      change_order_history: {
        Row: {
          action: string
          change_order_id: string
          changed_at: string | null
          changed_by: string | null
          field_changed: string | null
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          action: string
          change_order_id: string
          changed_at?: string | null
          changed_by?: string | null
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          action?: string
          change_order_id?: string
          changed_at?: string | null
          changed_by?: string | null
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_order_history_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_order_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_history_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      change_order_items: {
        Row: {
          change_order_id: string
          cost_code: string | null
          cost_code_id: string | null
          created_at: string | null
          description: string
          equipment_amount: number | null
          id: string
          item_number: number
          labor_amount: number | null
          labor_hours: number | null
          labor_rate: number | null
          markup_amount: number | null
          markup_percent: number | null
          material_amount: number | null
          notes: string | null
          other_amount: number | null
          quantity: number | null
          subcontract_amount: number | null
          total_amount: number | null
          unit: string | null
          unit_cost: number | null
          updated_at: string | null
        }
        Insert: {
          change_order_id: string
          cost_code?: string | null
          cost_code_id?: string | null
          created_at?: string | null
          description: string
          equipment_amount?: number | null
          id?: string
          item_number: number
          labor_amount?: number | null
          labor_hours?: number | null
          labor_rate?: number | null
          markup_amount?: number | null
          markup_percent?: number | null
          material_amount?: number | null
          notes?: string | null
          other_amount?: number | null
          quantity?: number | null
          subcontract_amount?: number | null
          total_amount?: number | null
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          change_order_id?: string
          cost_code?: string | null
          cost_code_id?: string | null
          created_at?: string | null
          description?: string
          equipment_amount?: number | null
          id?: string
          item_number?: number
          labor_amount?: number | null
          labor_hours?: number | null
          labor_rate?: number | null
          markup_amount?: number | null
          markup_percent?: number | null
          material_amount?: number | null
          notes?: string | null
          other_amount?: number | null
          quantity?: number | null
          subcontract_amount?: number | null
          total_amount?: number | null
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_order_items_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_order_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_items_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_items_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      change_orders: {
        Row: {
          approved_amount: number | null
          approved_days: number | null
          assigned_to: string | null
          ball_in_court: string | null
          ball_in_court_role: string | null
          change_type: string
          co_number: number | null
          company_id: string
          created_at: string | null
          created_by: string | null
          date_created: string | null
          date_estimated: string | null
          date_executed: string | null
          date_internal_approved: string | null
          date_owner_approved: string | null
          date_owner_submitted: string | null
          date_submitted: string | null
          deleted_at: string | null
          description: string | null
          estimator_id: string | null
          id: string
          initiated_by: string | null
          internal_approval_status: string | null
          internal_approver_id: string | null
          internal_approver_name: string | null
          is_pco: boolean | null
          justification: string | null
          legacy_workflow_item_id: string | null
          original_contract_amount: number | null
          owner_approval_status: string | null
          owner_approver_name: string | null
          owner_comments: string | null
          owner_signature_url: string | null
          pco_number: number
          previous_changes_amount: number | null
          pricing_method: string | null
          project_id: string
          proposed_amount: number | null
          proposed_days: number | null
          related_rfi_id: string | null
          related_site_condition_id: string | null
          related_submittal_id: string | null
          revised_contract_amount: number | null
          status: string
          subcontractor_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          approved_amount?: number | null
          approved_days?: number | null
          assigned_to?: string | null
          ball_in_court?: string | null
          ball_in_court_role?: string | null
          change_type: string
          co_number?: number | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          date_created?: string | null
          date_estimated?: string | null
          date_executed?: string | null
          date_internal_approved?: string | null
          date_owner_approved?: string | null
          date_owner_submitted?: string | null
          date_submitted?: string | null
          deleted_at?: string | null
          description?: string | null
          estimator_id?: string | null
          id?: string
          initiated_by?: string | null
          internal_approval_status?: string | null
          internal_approver_id?: string | null
          internal_approver_name?: string | null
          is_pco?: boolean | null
          justification?: string | null
          legacy_workflow_item_id?: string | null
          original_contract_amount?: number | null
          owner_approval_status?: string | null
          owner_approver_name?: string | null
          owner_comments?: string | null
          owner_signature_url?: string | null
          pco_number: number
          previous_changes_amount?: number | null
          pricing_method?: string | null
          project_id: string
          proposed_amount?: number | null
          proposed_days?: number | null
          related_rfi_id?: string | null
          related_site_condition_id?: string | null
          related_submittal_id?: string | null
          revised_contract_amount?: number | null
          status?: string
          subcontractor_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          approved_amount?: number | null
          approved_days?: number | null
          assigned_to?: string | null
          ball_in_court?: string | null
          ball_in_court_role?: string | null
          change_type?: string
          co_number?: number | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          date_created?: string | null
          date_estimated?: string | null
          date_executed?: string | null
          date_internal_approved?: string | null
          date_owner_approved?: string | null
          date_owner_submitted?: string | null
          date_submitted?: string | null
          deleted_at?: string | null
          description?: string | null
          estimator_id?: string | null
          id?: string
          initiated_by?: string | null
          internal_approval_status?: string | null
          internal_approver_id?: string | null
          internal_approver_name?: string | null
          is_pco?: boolean | null
          justification?: string | null
          legacy_workflow_item_id?: string | null
          original_contract_amount?: number | null
          owner_approval_status?: string | null
          owner_approver_name?: string | null
          owner_comments?: string | null
          owner_signature_url?: string | null
          pco_number?: number
          previous_changes_amount?: number | null
          pricing_method?: string | null
          project_id?: string
          proposed_amount?: number | null
          proposed_days?: number | null
          related_rfi_id?: string | null
          related_site_condition_id?: string | null
          related_submittal_id?: string | null
          revised_contract_amount?: number | null
          status?: string
          subcontractor_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_orders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_ball_in_court_fkey"
            columns: ["ball_in_court"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_estimator_id_fkey"
            columns: ["estimator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_internal_approver_id_fkey"
            columns: ["internal_approver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_legacy_workflow_item_id_fkey"
            columns: ["legacy_workflow_item_id"]
            isOneToOne: false
            referencedRelation: "workflow_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_related_rfi_id_fkey"
            columns: ["related_rfi_id"]
            isOneToOne: false
            referencedRelation: "rfi_register"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_related_rfi_id_fkey"
            columns: ["related_rfi_id"]
            isOneToOne: false
            referencedRelation: "rfi_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_related_rfi_id_fkey"
            columns: ["related_rfi_id"]
            isOneToOne: false
            referencedRelation: "rfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_related_submittal_id_fkey"
            columns: ["related_submittal_id"]
            isOneToOne: false
            referencedRelation: "submittal_register"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_related_submittal_id_fkey"
            columns: ["related_submittal_id"]
            isOneToOne: false
            referencedRelation: "submittals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_responses: {
        Row: {
          checklist_id: string
          checklist_template_item_id: string | null
          created_at: string | null
          id: string
          item_label: string
          item_type: string
          notes: string | null
          photo_urls: string[] | null
          responded_by: string | null
          response_data: Json | null
          score_value: string | null
          signature_url: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          checklist_id: string
          checklist_template_item_id?: string | null
          created_at?: string | null
          id?: string
          item_label: string
          item_type: string
          notes?: string | null
          photo_urls?: string[] | null
          responded_by?: string | null
          response_data?: Json | null
          score_value?: string | null
          signature_url?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          checklist_id?: string
          checklist_template_item_id?: string | null
          created_at?: string | null
          id?: string
          item_label?: string
          item_type?: string
          notes?: string | null
          photo_urls?: string[] | null
          responded_by?: string | null
          response_data?: Json | null
          score_value?: string | null
          signature_url?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_responses_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_responses_checklist_template_item_id_fkey"
            columns: ["checklist_template_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_template_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_responses_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_template_items: {
        Row: {
          checklist_template_id: string
          config: Json | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_required: boolean | null
          item_type: string
          label: string
          max_photos: number | null
          min_photos: number | null
          pass_fail_na_scoring: boolean | null
          requires_photo: boolean | null
          scoring_enabled: boolean | null
          section: string | null
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          checklist_template_id: string
          config?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_required?: boolean | null
          item_type: string
          label: string
          max_photos?: number | null
          min_photos?: number | null
          pass_fail_na_scoring?: boolean | null
          requires_photo?: boolean | null
          scoring_enabled?: boolean | null
          section?: string | null
          sort_order?: number
          updated_at?: string | null
        }
        Update: {
          checklist_template_id?: string
          config?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_required?: boolean | null
          item_type?: string
          label?: string
          max_photos?: number | null
          min_photos?: number | null
          pass_fail_na_scoring?: boolean | null
          requires_photo?: boolean | null
          scoring_enabled?: boolean | null
          section?: string | null
          sort_order?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_template_items_checklist_template_id_fkey"
            columns: ["checklist_template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          category: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          estimated_duration_minutes: number | null
          id: string
          instructions: string | null
          is_active: boolean | null
          is_system_template: boolean | null
          items: Json
          name: string
          scoring_enabled: boolean | null
          tags: string[] | null
          template_level: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          is_system_template?: boolean | null
          items?: Json
          name: string
          scoring_enabled?: boolean | null
          tags?: string[] | null
          template_level?: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          is_system_template?: boolean | null
          items?: Json
          name?: string
          scoring_enabled?: boolean | null
          tags?: string[] | null
          template_level?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      checklists: {
        Row: {
          category: string | null
          checklist_template_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          created_by: string | null
          daily_report_id: string | null
          deleted_at: string | null
          description: string | null
          id: string
          inspector_name: string | null
          inspector_signature_url: string | null
          inspector_user_id: string | null
          is_completed: boolean | null
          items: Json
          location: string | null
          name: string
          pdf_url: string | null
          project_id: string
          score_fail: number | null
          score_na: number | null
          score_pass: number | null
          score_percentage: number | null
          score_total: number | null
          status: string | null
          submitted_at: string | null
          temperature: number | null
          updated_at: string | null
          weather_conditions: string | null
        }
        Insert: {
          category?: string | null
          checklist_template_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_report_id?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          inspector_name?: string | null
          inspector_signature_url?: string | null
          inspector_user_id?: string | null
          is_completed?: boolean | null
          items?: Json
          location?: string | null
          name: string
          pdf_url?: string | null
          project_id: string
          score_fail?: number | null
          score_na?: number | null
          score_pass?: number | null
          score_percentage?: number | null
          score_total?: number | null
          status?: string | null
          submitted_at?: string | null
          temperature?: number | null
          updated_at?: string | null
          weather_conditions?: string | null
        }
        Update: {
          category?: string | null
          checklist_template_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_report_id?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          inspector_name?: string | null
          inspector_signature_url?: string | null
          inspector_user_id?: string | null
          is_completed?: boolean | null
          items?: Json
          location?: string | null
          name?: string
          pdf_url?: string | null
          project_id?: string
          score_fail?: number | null
          score_na?: number | null
          score_pass?: number | null
          score_percentage?: number | null
          score_total?: number | null
          status?: string | null
          submitted_at?: string | null
          temperature?: number | null
          updated_at?: string | null
          weather_conditions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklists_checklist_template_id_fkey"
            columns: ["checklist_template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "material_received_with_details"
            referencedColumns: ["daily_report_id"]
          },
          {
            foreignKeyName: "checklists_inspector_user_id_fkey"
            columns: ["inspector_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "checklists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_settings: {
        Row: {
          created_at: string | null
          custom_logo_url: string | null
          id: string
          project_id: string
          show_budget: boolean | null
          show_change_orders: boolean | null
          show_contract_value: boolean | null
          show_daily_reports: boolean | null
          show_documents: boolean | null
          show_photos: boolean | null
          show_punch_lists: boolean | null
          show_rfis: boolean | null
          show_schedule: boolean | null
          updated_at: string | null
          welcome_message: string | null
        }
        Insert: {
          created_at?: string | null
          custom_logo_url?: string | null
          id?: string
          project_id: string
          show_budget?: boolean | null
          show_change_orders?: boolean | null
          show_contract_value?: boolean | null
          show_daily_reports?: boolean | null
          show_documents?: boolean | null
          show_photos?: boolean | null
          show_punch_lists?: boolean | null
          show_rfis?: boolean | null
          show_schedule?: boolean | null
          updated_at?: string | null
          welcome_message?: string | null
        }
        Update: {
          created_at?: string | null
          custom_logo_url?: string | null
          id?: string
          project_id?: string
          show_budget?: boolean | null
          show_change_orders?: boolean | null
          show_contract_value?: boolean | null
          show_daily_reports?: boolean | null
          show_documents?: boolean | null
          show_photos?: boolean | null
          show_punch_lists?: boolean | null
          show_rfis?: boolean | null
          show_schedule?: boolean | null
          updated_at?: string | null
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "client_portal_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      closeout_checklist: {
        Row: {
          assigned_to_name: string | null
          assigned_to_user_id: string | null
          category: string | null
          closeout_document_id: string | null
          company_id: string
          completed: boolean | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          deleted_at: string | null
          description: string
          due_date: string | null
          id: string
          item_number: number | null
          notes: string | null
          project_id: string
          sort_order: number | null
          subcontractor_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to_name?: string | null
          assigned_to_user_id?: string | null
          category?: string | null
          closeout_document_id?: string | null
          company_id: string
          completed?: boolean | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description: string
          due_date?: string | null
          id?: string
          item_number?: number | null
          notes?: string | null
          project_id: string
          sort_order?: number | null
          subcontractor_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to_name?: string | null
          assigned_to_user_id?: string | null
          category?: string | null
          closeout_document_id?: string | null
          company_id?: string
          completed?: boolean | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string
          due_date?: string | null
          id?: string
          item_number?: number | null
          notes?: string | null
          project_id?: string
          sort_order?: number | null
          subcontractor_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "closeout_checklist_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closeout_checklist_closeout_document_id_fkey"
            columns: ["closeout_document_id"]
            isOneToOne: false
            referencedRelation: "closeout_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closeout_checklist_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closeout_checklist_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closeout_checklist_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closeout_checklist_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "closeout_checklist_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closeout_checklist_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      closeout_documents: {
        Row: {
          approved_date: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          document_type: Database["public"]["Enums"]["closeout_document_type"]
          document_url: string | null
          document_urls: Json | null
          format_required: string | null
          id: string
          notes: string | null
          project_id: string
          rejection_reason: string | null
          required: boolean | null
          required_copies: number | null
          required_date: string | null
          responsible_party: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          spec_section: string | null
          spec_section_title: string | null
          status: Database["public"]["Enums"]["closeout_status"] | null
          subcontractor_id: string | null
          submitted_date: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          approved_date?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          document_type: Database["public"]["Enums"]["closeout_document_type"]
          document_url?: string | null
          document_urls?: Json | null
          format_required?: string | null
          id?: string
          notes?: string | null
          project_id: string
          rejection_reason?: string | null
          required?: boolean | null
          required_copies?: number | null
          required_date?: string | null
          responsible_party?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          spec_section?: string | null
          spec_section_title?: string | null
          status?: Database["public"]["Enums"]["closeout_status"] | null
          subcontractor_id?: string | null
          submitted_date?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          approved_date?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          document_type?: Database["public"]["Enums"]["closeout_document_type"]
          document_url?: string | null
          document_urls?: Json | null
          format_required?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          rejection_reason?: string | null
          required?: boolean | null
          required_copies?: number | null
          required_date?: string | null
          responsible_party?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          spec_section?: string | null
          spec_section_title?: string | null
          status?: Database["public"]["Enums"]["closeout_status"] | null
          subcontractor_id?: string | null
          submitted_date?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "closeout_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closeout_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closeout_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closeout_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "closeout_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closeout_documents_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closeout_documents_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      closeout_items: {
        Row: {
          collected_date: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          delivered_date: string | null
          description: string | null
          document_urls: Json | null
          equipment_name: string | null
          id: string
          is_collected: boolean | null
          is_delivered_to_owner: boolean | null
          item_name: string
          item_type: string
          manufacturer: string | null
          model_number: string | null
          project_id: string
          related_drawing_id: string | null
          related_submittal_id: string | null
          serial_number: string | null
          system_category: string | null
          updated_at: string | null
          warranty_contact_email: string | null
          warranty_contact_name: string | null
          warranty_contact_phone: string | null
          warranty_duration_years: number | null
          warranty_end_date: string | null
          warranty_start_date: string | null
        }
        Insert: {
          collected_date?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          delivered_date?: string | null
          description?: string | null
          document_urls?: Json | null
          equipment_name?: string | null
          id?: string
          is_collected?: boolean | null
          is_delivered_to_owner?: boolean | null
          item_name: string
          item_type: string
          manufacturer?: string | null
          model_number?: string | null
          project_id: string
          related_drawing_id?: string | null
          related_submittal_id?: string | null
          serial_number?: string | null
          system_category?: string | null
          updated_at?: string | null
          warranty_contact_email?: string | null
          warranty_contact_name?: string | null
          warranty_contact_phone?: string | null
          warranty_duration_years?: number | null
          warranty_end_date?: string | null
          warranty_start_date?: string | null
        }
        Update: {
          collected_date?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          delivered_date?: string | null
          description?: string | null
          document_urls?: Json | null
          equipment_name?: string | null
          id?: string
          is_collected?: boolean | null
          is_delivered_to_owner?: boolean | null
          item_name?: string
          item_type?: string
          manufacturer?: string | null
          model_number?: string | null
          project_id?: string
          related_drawing_id?: string | null
          related_submittal_id?: string | null
          serial_number?: string | null
          system_category?: string | null
          updated_at?: string | null
          warranty_contact_email?: string | null
          warranty_contact_name?: string | null
          warranty_contact_phone?: string | null
          warranty_duration_years?: number | null
          warranty_end_date?: string | null
          warranty_start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "closeout_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closeout_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closeout_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "closeout_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closeout_items_related_drawing_id_fkey"
            columns: ["related_drawing_id"]
            isOneToOne: false
            referencedRelation: "document_ai_status"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "closeout_items_related_drawing_id_fkey"
            columns: ["related_drawing_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closeout_items_related_submittal_id_fkey"
            columns: ["related_submittal_id"]
            isOneToOne: false
            referencedRelation: "workflow_items"
            referencedColumns: ["id"]
          },
        ]
      }
      closeout_requirements: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          days_before_completion: number | null
          default_responsible_trade: string | null
          deleted_at: string | null
          description: string | null
          document_type: Database["public"]["Enums"]["closeout_document_type"]
          format_required: string | null
          id: string
          is_template: boolean | null
          project_id: string | null
          required: boolean | null
          required_copies: number | null
          spec_section: string | null
          spec_section_title: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          days_before_completion?: number | null
          default_responsible_trade?: string | null
          deleted_at?: string | null
          description?: string | null
          document_type: Database["public"]["Enums"]["closeout_document_type"]
          format_required?: string | null
          id?: string
          is_template?: boolean | null
          project_id?: string | null
          required?: boolean | null
          required_copies?: number | null
          spec_section?: string | null
          spec_section_title?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          days_before_completion?: number | null
          default_responsible_trade?: string | null
          deleted_at?: string | null
          description?: string | null
          document_type?: Database["public"]["Enums"]["closeout_document_type"]
          format_required?: string | null
          id?: string
          is_template?: boolean | null
          project_id?: string | null
          required?: boolean | null
          required_copies?: number | null
          spec_section?: string | null
          spec_section_title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "closeout_requirements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closeout_requirements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closeout_requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closeout_requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "closeout_requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          id: string
          logo_url: string | null
          max_projects: number | null
          name: string
          phone: string | null
          primary_color: string | null
          settings: Json | null
          slug: string
          state: string | null
          subscription_status: string | null
          subscription_tier: string | null
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          max_projects?: number | null
          name: string
          phone?: string | null
          primary_color?: string | null
          settings?: Json | null
          slug: string
          state?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          max_projects?: number | null
          name?: string
          phone?: string | null
          primary_color?: string | null
          settings?: Json | null
          slug?: string
          state?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      company_feature_flags: {
        Row: {
          company_id: string
          enabled: boolean
          enabled_at: string | null
          enabled_by: string | null
          expires_at: string | null
          feature_flag_id: string
          id: string
          notes: string | null
        }
        Insert: {
          company_id: string
          enabled: boolean
          enabled_at?: string | null
          enabled_by?: string | null
          expires_at?: string | null
          feature_flag_id: string
          id?: string
          notes?: string | null
        }
        Update: {
          company_id?: string
          enabled?: boolean
          enabled_at?: string | null
          enabled_by?: string | null
          expires_at?: string | null
          feature_flag_id?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_feature_flags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_feature_flags_enabled_by_fkey"
            columns: ["enabled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_feature_flags_feature_flag_id_fkey"
            columns: ["feature_flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string | null
          city: string | null
          company_id: string | null
          company_name: string | null
          contact_type: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          email: string | null
          first_name: string | null
          id: string
          is_emergency_contact: boolean | null
          is_primary: boolean | null
          last_name: string | null
          notes: string | null
          phone: string | null
          phone_fax: string | null
          phone_mobile: string | null
          phone_office: string | null
          project_id: string | null
          role: string | null
          state: string | null
          title: string | null
          trade: string | null
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_id?: string | null
          company_name?: string | null
          contact_type: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_emergency_contact?: boolean | null
          is_primary?: boolean | null
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          phone_fax?: string | null
          phone_mobile?: string | null
          phone_office?: string | null
          project_id?: string | null
          role?: string | null
          state?: string | null
          title?: string | null
          trade?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_id?: string | null
          company_name?: string | null
          contact_type?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_emergency_contact?: boolean | null
          is_primary?: boolean | null
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          phone_fax?: string | null
          phone_mobile?: string | null
          phone_office?: string | null
          project_id?: string | null
          role?: string | null
          state?: string | null
          title?: string | null
          trade?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          is_muted: boolean
          joined_at: string
          last_read_at: string | null
          left_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_muted?: boolean
          joined_at?: string
          last_read_at?: string | null
          left_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_muted?: boolean
          joined_at?: string
          last_read_at?: string | null
          left_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          last_message_at: string | null
          metadata: Json | null
          name: string | null
          project_id: string | null
          type: Database["public"]["Enums"]["conversation_type"]
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          last_message_at?: string | null
          metadata?: Json | null
          name?: string | null
          project_id?: string | null
          type: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          last_message_at?: string | null
          metadata?: Json | null
          name?: string | null
          project_id?: string | null
          type?: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_codes: {
        Row: {
          code: string
          company_id: string
          cost_type: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          division: string | null
          id: string
          is_active: boolean | null
          level: number | null
          name: string
          parent_code_id: string | null
          section: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          company_id: string
          cost_type?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          division?: string | null
          id?: string
          is_active?: boolean | null
          level?: number | null
          name: string
          parent_code_id?: string | null
          section?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          company_id?: string
          cost_type?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          division?: string | null
          id?: string
          is_active?: boolean | null
          level?: number | null
          name?: string
          parent_code_id?: string | null
          section?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_codes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_codes_parent_code_id_fkey"
            columns: ["parent_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_transactions: {
        Row: {
          amount: number
          change_order_id: string | null
          cost_code_id: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string
          id: string
          invoice_number: string | null
          notes: string | null
          po_number: string | null
          project_id: string
          source_id: string | null
          source_type: string | null
          subcontractor_id: string | null
          transaction_date: string
          transaction_type: string
          vendor_name: string | null
        }
        Insert: {
          amount: number
          change_order_id?: string | null
          cost_code_id: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          po_number?: string | null
          project_id: string
          source_id?: string | null
          source_type?: string | null
          subcontractor_id?: string | null
          transaction_date: string
          transaction_type: string
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          change_order_id?: string | null
          cost_code_id?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          po_number?: string | null
          project_id?: string
          source_id?: string | null
          source_type?: string | null
          subcontractor_id?: string | null
          transaction_date?: string
          transaction_type?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_transactions_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_order_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_transactions_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_transactions_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "cost_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_transactions_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          can_be_deleted: boolean | null
          code: string
          color: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          inherits_from: string | null
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          can_be_deleted?: boolean | null
          code: string
          color?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          inherits_from?: string | null
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          can_be_deleted?: boolean | null
          code?: string
          color?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          inherits_from?: string | null
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_report_deliveries: {
        Row: {
          created_at: string | null
          daily_report_id: string
          delivery_ticket_number: string | null
          delivery_time: string | null
          id: string
          material_description: string
          notes: string | null
          quantity: string | null
          vendor: string | null
        }
        Insert: {
          created_at?: string | null
          daily_report_id: string
          delivery_ticket_number?: string | null
          delivery_time?: string | null
          id?: string
          material_description: string
          notes?: string | null
          quantity?: string | null
          vendor?: string | null
        }
        Update: {
          created_at?: string | null
          daily_report_id?: string
          delivery_ticket_number?: string | null
          delivery_time?: string | null
          id?: string
          material_description?: string
          notes?: string | null
          quantity?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_deliveries_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_deliveries_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "material_received_with_details"
            referencedColumns: ["daily_report_id"]
          },
        ]
      }
      daily_report_equipment: {
        Row: {
          created_at: string | null
          daily_report_id: string
          equipment_description: string | null
          equipment_type: string
          hours_used: number | null
          id: string
          notes: string | null
          owner: string | null
          quantity: number | null
        }
        Insert: {
          created_at?: string | null
          daily_report_id: string
          equipment_description?: string | null
          equipment_type: string
          hours_used?: number | null
          id?: string
          notes?: string | null
          owner?: string | null
          quantity?: number | null
        }
        Update: {
          created_at?: string | null
          daily_report_id?: string
          equipment_description?: string | null
          equipment_type?: string
          hours_used?: number | null
          id?: string
          notes?: string | null
          owner?: string | null
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_equipment_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_equipment_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "material_received_with_details"
            referencedColumns: ["daily_report_id"]
          },
        ]
      }
      daily_report_safety_incidents: {
        Row: {
          created_at: string | null
          daily_report_id: string
          id: string
          safety_incident_id: string
        }
        Insert: {
          created_at?: string | null
          daily_report_id: string
          id?: string
          safety_incident_id: string
        }
        Update: {
          created_at?: string | null
          daily_report_id?: string
          id?: string
          safety_incident_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_safety_incidents_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_safety_incidents_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "material_received_with_details"
            referencedColumns: ["daily_report_id"]
          },
          {
            foreignKeyName: "daily_report_safety_incidents_safety_incident_id_fkey"
            columns: ["safety_incident_id"]
            isOneToOne: false
            referencedRelation: "osha_300_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_safety_incidents_safety_incident_id_fkey"
            columns: ["safety_incident_id"]
            isOneToOne: false
            referencedRelation: "safety_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_report_visitors: {
        Row: {
          arrival_time: string | null
          company: string | null
          created_at: string | null
          daily_report_id: string
          departure_time: string | null
          id: string
          purpose: string | null
          visitor_name: string
        }
        Insert: {
          arrival_time?: string | null
          company?: string | null
          created_at?: string | null
          daily_report_id: string
          departure_time?: string | null
          id?: string
          purpose?: string | null
          visitor_name: string
        }
        Update: {
          arrival_time?: string | null
          company?: string | null
          created_at?: string | null
          daily_report_id?: string
          departure_time?: string | null
          id?: string
          purpose?: string | null
          visitor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_visitors_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_visitors_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "material_received_with_details"
            referencedColumns: ["daily_report_id"]
          },
        ]
      }
      daily_report_workforce: {
        Row: {
          activity: string | null
          created_at: string | null
          daily_report_id: string
          entry_type: string | null
          hours_worked: number | null
          id: string
          subcontractor_id: string | null
          team_name: string | null
          trade: string | null
          worker_count: number | null
          worker_name: string | null
        }
        Insert: {
          activity?: string | null
          created_at?: string | null
          daily_report_id: string
          entry_type?: string | null
          hours_worked?: number | null
          id?: string
          subcontractor_id?: string | null
          team_name?: string | null
          trade?: string | null
          worker_count?: number | null
          worker_name?: string | null
        }
        Update: {
          activity?: string | null
          created_at?: string | null
          daily_report_id?: string
          entry_type?: string | null
          hours_worked?: number | null
          id?: string
          subcontractor_id?: string | null
          team_name?: string | null
          trade?: string | null
          worker_count?: number | null
          worker_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_workforce_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_workforce_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "material_received_with_details"
            referencedColumns: ["daily_report_id"]
          },
          {
            foreignKeyName: "daily_report_workforce_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_reports: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          comments: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          id: string
          issues: string | null
          observations: string | null
          pdf_generated_at: string | null
          pdf_url: string | null
          precipitation: number | null
          production_data: Json | null
          project_id: string
          report_date: string
          report_number: string | null
          reporter_id: string
          reviewer_id: string | null
          status: string | null
          submitted_at: string | null
          temperature_high: number | null
          temperature_low: number | null
          total_workers: number | null
          updated_at: string | null
          weather_condition: string | null
          weather_delay_notes: string | null
          weather_delays: boolean | null
          weather_source: string | null
          wind_speed: number | null
          work_completed: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          comments?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          issues?: string | null
          observations?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          precipitation?: number | null
          production_data?: Json | null
          project_id: string
          report_date: string
          report_number?: string | null
          reporter_id: string
          reviewer_id?: string | null
          status?: string | null
          submitted_at?: string | null
          temperature_high?: number | null
          temperature_low?: number | null
          total_workers?: number | null
          updated_at?: string | null
          weather_condition?: string | null
          weather_delay_notes?: string | null
          weather_delays?: boolean | null
          weather_source?: string | null
          wind_speed?: number | null
          work_completed?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          comments?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          issues?: string | null
          observations?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          precipitation?: number | null
          production_data?: Json | null
          project_id?: string
          report_date?: string
          report_number?: string | null
          reporter_id?: string
          reviewer_id?: string | null
          status?: string | null
          submitted_at?: string | null
          temperature_high?: number | null
          temperature_low?: number | null
          total_workers?: number | null
          updated_at?: string | null
          weather_condition?: string | null
          weather_delay_notes?: string | null
          weather_delays?: boolean | null
          weather_source?: string | null
          wind_speed?: number | null
          work_completed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_list_members: {
        Row: {
          added_by: string | null
          created_at: string | null
          external_company: string | null
          external_email: string | null
          external_name: string | null
          id: string
          list_id: string
          member_role: string | null
          notify_email: boolean | null
          notify_in_app: boolean | null
          user_id: string | null
        }
        Insert: {
          added_by?: string | null
          created_at?: string | null
          external_company?: string | null
          external_email?: string | null
          external_name?: string | null
          id?: string
          list_id: string
          member_role?: string | null
          notify_email?: boolean | null
          notify_in_app?: boolean | null
          user_id?: string | null
        }
        Update: {
          added_by?: string | null
          created_at?: string | null
          external_company?: string | null
          external_email?: string | null
          external_name?: string | null
          id?: string
          list_id?: string
          member_role?: string | null
          notify_email?: boolean | null
          notify_in_app?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distribution_list_members_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_list_members_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "distribution_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_list_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_lists: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          list_type: string | null
          name: string
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          list_type?: string | null
          name: string
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          list_type?: string | null
          name?: string
          project_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distribution_lists_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_lists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_lists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_lists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "distribution_lists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      document_access_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          document_id: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          document_id: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          document_id?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_access_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_ai_status"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_access_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "document_access_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      document_categories: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          detected_keywords: string[] | null
          document_id: string
          id: string
          is_manually_set: boolean | null
          manually_set_at: string | null
          manually_set_by: string | null
          primary_category: Database["public"]["Enums"]["document_category_type"]
          project_id: string
          sub_category: string | null
          suggested_categories: Json | null
          updated_at: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          detected_keywords?: string[] | null
          document_id: string
          id?: string
          is_manually_set?: boolean | null
          manually_set_at?: string | null
          manually_set_by?: string | null
          primary_category: Database["public"]["Enums"]["document_category_type"]
          project_id: string
          sub_category?: string | null
          suggested_categories?: Json | null
          updated_at?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          detected_keywords?: string[] | null
          document_id?: string
          id?: string
          is_manually_set?: boolean | null
          manually_set_at?: string | null
          manually_set_by?: string | null
          primary_category?: Database["public"]["Enums"]["document_category_type"]
          project_id?: string
          sub_category?: string | null
          suggested_categories?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_categories_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "document_ai_status"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_categories_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_categories_manually_set_by_fkey"
            columns: ["manually_set_by"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_categories_manually_set_by_fkey"
            columns: ["manually_set_by"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_categories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_categories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "document_categories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      document_comments: {
        Row: {
          comment_text: string
          created_at: string | null
          created_by: string
          deleted_at: string | null
          document_id: string
          id: string
          parent_comment_id: string | null
          project_id: string
          updated_at: string | null
        }
        Insert: {
          comment_text: string
          created_at?: string | null
          created_by: string
          deleted_at?: string | null
          document_id: string
          id?: string
          parent_comment_id?: string | null
          project_id: string
          updated_at?: string | null
        }
        Update: {
          comment_text?: string
          created_at?: string | null
          created_by?: string
          deleted_at?: string | null
          document_id?: string
          id?: string
          parent_comment_id?: string | null
          project_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_comments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_ai_status"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "document_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "document_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      document_extracted_metadata: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          applied_fields: Json | null
          auto_tags: string[] | null
          created_at: string | null
          document_id: string
          extracted_contacts: Json | null
          extracted_dates: Json | null
          extracted_entities: Json | null
          extracted_numbers: Json | null
          id: string
          project_id: string
          updated_at: string | null
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          applied_fields?: Json | null
          auto_tags?: string[] | null
          created_at?: string | null
          document_id: string
          extracted_contacts?: Json | null
          extracted_dates?: Json | null
          extracted_entities?: Json | null
          extracted_numbers?: Json | null
          id?: string
          project_id: string
          updated_at?: string | null
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          applied_fields?: Json | null
          auto_tags?: string[] | null
          created_at?: string | null
          document_id?: string
          extracted_contacts?: Json | null
          extracted_dates?: Json | null
          extracted_entities?: Json | null
          extracted_numbers?: Json | null
          id?: string
          project_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_extracted_metadata_applied_by_fkey"
            columns: ["applied_by"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_extracted_metadata_applied_by_fkey"
            columns: ["applied_by"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_extracted_metadata_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "document_ai_status"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_extracted_metadata_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_extracted_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_extracted_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "document_extracted_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      document_markup_layers: {
        Row: {
          color: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          document_id: string
          id: string
          is_default: boolean | null
          locked: boolean
          name: string
          order_index: number
          updated_at: string | null
          visible: boolean
        }
        Insert: {
          color?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          document_id: string
          id?: string
          is_default?: boolean | null
          locked?: boolean
          name: string
          order_index?: number
          updated_at?: string | null
          visible?: boolean
        }
        Update: {
          color?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          document_id?: string
          id?: string
          is_default?: boolean | null
          locked?: boolean
          name?: string
          order_index?: number
          updated_at?: string | null
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "document_markup_layers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_markup_layers_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_ai_status"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_markup_layers_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_markup_measurements: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          display_label: string | null
          document_id: string
          font_size: number | null
          id: string
          label_position: Json | null
          layer_id: string | null
          measurement_type: string
          page_number: number
          points: Json
          show_label: boolean | null
          stroke_width: number | null
          unit: string
          updated_at: string | null
          value: number
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          display_label?: string | null
          document_id: string
          font_size?: number | null
          id?: string
          label_position?: Json | null
          layer_id?: string | null
          measurement_type: string
          page_number?: number
          points: Json
          show_label?: boolean | null
          stroke_width?: number | null
          unit?: string
          updated_at?: string | null
          value: number
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          display_label?: string | null
          document_id?: string
          font_size?: number | null
          id?: string
          label_position?: Json | null
          layer_id?: string | null
          measurement_type?: string
          page_number?: number
          points?: Json
          show_label?: boolean | null
          stroke_width?: number | null
          unit?: string
          updated_at?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_markup_measurements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_markup_measurements_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_ai_status"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_markup_measurements_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_markup_measurements_layer_id_fkey"
            columns: ["layer_id"]
            isOneToOne: false
            referencedRelation: "document_markup_layers"
            referencedColumns: ["id"]
          },
        ]
      }
      document_markup_share_history: {
        Row: {
          action: string
          id: string
          markup_id: string
          performed_at: string | null
          performed_by: string | null
          permission_level: string | null
          shared_with_id: string | null
          shared_with_type: string | null
        }
        Insert: {
          action: string
          id?: string
          markup_id: string
          performed_at?: string | null
          performed_by?: string | null
          permission_level?: string | null
          shared_with_id?: string | null
          shared_with_type?: string | null
        }
        Update: {
          action?: string
          id?: string
          markup_id?: string
          performed_at?: string | null
          performed_by?: string | null
          permission_level?: string | null
          shared_with_id?: string | null
          shared_with_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_markup_share_history_markup_id_fkey"
            columns: ["markup_id"]
            isOneToOne: false
            referencedRelation: "document_markups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_markup_share_history_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      document_markups: {
        Row: {
          author_name: string | null
          color: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          document_id: string
          id: string
          is_shared: boolean | null
          layer_id: string | null
          markup_data: Json
          markup_type: string
          page_number: number | null
          permission_level: string | null
          project_id: string
          related_to_id: string | null
          related_to_type: string | null
          shared_with_roles: string[] | null
          shared_with_users: string[] | null
          updated_at: string | null
          visible: boolean | null
        }
        Insert: {
          author_name?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          document_id: string
          id?: string
          is_shared?: boolean | null
          layer_id?: string | null
          markup_data: Json
          markup_type: string
          page_number?: number | null
          permission_level?: string | null
          project_id: string
          related_to_id?: string | null
          related_to_type?: string | null
          shared_with_roles?: string[] | null
          shared_with_users?: string[] | null
          updated_at?: string | null
          visible?: boolean | null
        }
        Update: {
          author_name?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          document_id?: string
          id?: string
          is_shared?: boolean | null
          layer_id?: string | null
          markup_data?: Json
          markup_type?: string
          page_number?: number | null
          permission_level?: string | null
          project_id?: string
          related_to_id?: string | null
          related_to_type?: string | null
          shared_with_roles?: string[] | null
          shared_with_users?: string[] | null
          updated_at?: string | null
          visible?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "document_markups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_markups_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_ai_status"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_markups_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_markups_layer_id_fkey"
            columns: ["layer_id"]
            isOneToOne: false
            referencedRelation: "document_markup_layers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_markups_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_markups_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "document_markups_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      document_ocr_results: {
        Row: {
          blocks_data: Json | null
          confidence_score: number | null
          created_at: string | null
          detected_language: string | null
          document_id: string
          error_message: string | null
          extracted_text: string | null
          full_text_search: unknown
          id: string
          last_retry_at: string | null
          page_count: number | null
          processing_completed_at: string | null
          processing_duration_ms: number | null
          processing_started_at: string | null
          processor_type:
            | Database["public"]["Enums"]["ai_processor_type"]
            | null
          project_id: string
          raw_response: Json | null
          retry_count: number | null
          status: Database["public"]["Enums"]["ocr_status"]
          updated_at: string | null
          word_count: number | null
          words_data: Json | null
        }
        Insert: {
          blocks_data?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          detected_language?: string | null
          document_id: string
          error_message?: string | null
          extracted_text?: string | null
          full_text_search?: unknown
          id?: string
          last_retry_at?: string | null
          page_count?: number | null
          processing_completed_at?: string | null
          processing_duration_ms?: number | null
          processing_started_at?: string | null
          processor_type?:
            | Database["public"]["Enums"]["ai_processor_type"]
            | null
          project_id: string
          raw_response?: Json | null
          retry_count?: number | null
          status?: Database["public"]["Enums"]["ocr_status"]
          updated_at?: string | null
          word_count?: number | null
          words_data?: Json | null
        }
        Update: {
          blocks_data?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          detected_language?: string | null
          document_id?: string
          error_message?: string | null
          extracted_text?: string | null
          full_text_search?: unknown
          id?: string
          last_retry_at?: string | null
          page_count?: number | null
          processing_completed_at?: string | null
          processing_duration_ms?: number | null
          processing_started_at?: string | null
          processor_type?:
            | Database["public"]["Enums"]["ai_processor_type"]
            | null
          project_id?: string
          raw_response?: Json | null
          retry_count?: number | null
          status?: Database["public"]["Enums"]["ocr_status"]
          updated_at?: string | null
          word_count?: number | null
          words_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "document_ocr_results_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "document_ai_status"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_ocr_results_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_ocr_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_ocr_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "document_ocr_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      document_processing_queue: {
        Row: {
          categorization_completed: boolean | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          document_id: string
          id: string
          last_error: string | null
          max_retries: number | null
          metadata_completed: boolean | null
          ocr_completed: boolean | null
          priority: number | null
          process_categorization: boolean | null
          process_metadata_extraction: boolean | null
          process_ocr: boolean | null
          process_similarity: boolean | null
          project_id: string
          retry_count: number | null
          scheduled_at: string | null
          similarity_completed: boolean | null
          started_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          categorization_completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          document_id: string
          id?: string
          last_error?: string | null
          max_retries?: number | null
          metadata_completed?: boolean | null
          ocr_completed?: boolean | null
          priority?: number | null
          process_categorization?: boolean | null
          process_metadata_extraction?: boolean | null
          process_ocr?: boolean | null
          process_similarity?: boolean | null
          project_id: string
          retry_count?: number | null
          scheduled_at?: string | null
          similarity_completed?: boolean | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          categorization_completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          document_id?: string
          id?: string
          last_error?: string | null
          max_retries?: number | null
          metadata_completed?: boolean | null
          ocr_completed?: boolean | null
          priority?: number | null
          process_categorization?: boolean | null
          process_metadata_extraction?: boolean | null
          process_ocr?: boolean | null
          process_similarity?: boolean | null
          project_id?: string
          retry_count?: number | null
          scheduled_at?: string | null
          similarity_completed?: boolean | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_processing_queue_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_processing_queue_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_processing_queue_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "document_ai_status"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_processing_queue_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_processing_queue_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_processing_queue_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "document_processing_queue_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      document_scale_calibrations: {
        Row: {
          calibrated_at: string | null
          calibrated_by: string | null
          created_at: string | null
          document_id: string
          id: string
          page_number: number
          pixel_distance: number
          real_world_distance: number
          unit: string
          updated_at: string | null
        }
        Insert: {
          calibrated_at?: string | null
          calibrated_by?: string | null
          created_at?: string | null
          document_id: string
          id?: string
          page_number?: number
          pixel_distance: number
          real_world_distance: number
          unit?: string
          updated_at?: string | null
        }
        Update: {
          calibrated_at?: string | null
          calibrated_by?: string | null
          created_at?: string | null
          document_id?: string
          id?: string
          page_number?: number
          pixel_distance?: number
          real_world_distance?: number
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_scale_calibrations_calibrated_by_fkey"
            columns: ["calibrated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_scale_calibrations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_ai_status"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_scale_calibrations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_shares: {
        Row: {
          created_at: string | null
          document_id: string
          id: string
          permission_level: string
          project_id: string
          recipient_role: string | null
          recipient_user_id: string | null
          shared_at: string | null
          shared_by: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          document_id: string
          id?: string
          permission_level: string
          project_id: string
          recipient_role?: string | null
          recipient_user_id?: string | null
          shared_at?: string | null
          shared_by: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: string
          id?: string
          permission_level?: string
          project_id?: string
          recipient_role?: string | null
          recipient_user_id?: string | null
          shared_at?: string | null
          shared_by?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_shares_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_ai_status"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_shares_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_shares_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_shares_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "document_shares_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_shares_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      document_similarity: {
        Row: {
          created_at: string | null
          document_id: string
          id: string
          matching_keywords: string[] | null
          overall_similarity_score: number | null
          project_id: string
          similar_document_id: string
          similarity_details: Json | null
          similarity_type: Database["public"]["Enums"]["similarity_type"] | null
          text_similarity_score: number | null
          updated_at: string | null
          visual_similarity_score: number | null
        }
        Insert: {
          created_at?: string | null
          document_id: string
          id?: string
          matching_keywords?: string[] | null
          overall_similarity_score?: number | null
          project_id: string
          similar_document_id: string
          similarity_details?: Json | null
          similarity_type?:
            | Database["public"]["Enums"]["similarity_type"]
            | null
          text_similarity_score?: number | null
          updated_at?: string | null
          visual_similarity_score?: number | null
        }
        Update: {
          created_at?: string | null
          document_id?: string
          id?: string
          matching_keywords?: string[] | null
          overall_similarity_score?: number | null
          project_id?: string
          similar_document_id?: string
          similarity_details?: Json | null
          similarity_type?:
            | Database["public"]["Enums"]["similarity_type"]
            | null
          text_similarity_score?: number | null
          updated_at?: string | null
          visual_similarity_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_similarity_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_ai_status"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_similarity_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_similarity_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_similarity_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "document_similarity_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_similarity_similar_document_id_fkey"
            columns: ["similar_document_id"]
            isOneToOne: false
            referencedRelation: "document_ai_status"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_similarity_similar_document_id_fkey"
            columns: ["similar_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_version_comparisons: {
        Row: {
          analyzed_at: string | null
          analyzed_by: string | null
          change_regions: Json | null
          id: string
          overall_change_percentage: number | null
          summary: string | null
          version1_id: string
          version2_id: string
        }
        Insert: {
          analyzed_at?: string | null
          analyzed_by?: string | null
          change_regions?: Json | null
          id?: string
          overall_change_percentage?: number | null
          summary?: string | null
          version1_id: string
          version2_id: string
        }
        Update: {
          analyzed_at?: string | null
          analyzed_by?: string | null
          change_regions?: Json | null
          id?: string
          overall_change_percentage?: number | null
          summary?: string | null
          version1_id?: string
          version2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_version_comparisons_analyzed_by_fkey"
            columns: ["analyzed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_version_comparisons_version1_id_fkey"
            columns: ["version1_id"]
            isOneToOne: false
            referencedRelation: "document_ai_status"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_version_comparisons_version1_id_fkey"
            columns: ["version1_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_version_comparisons_version2_id_fkey"
            columns: ["version2_id"]
            isOneToOne: false
            referencedRelation: "document_ai_status"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_version_comparisons_version2_id_fkey"
            columns: ["version2_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          ai_processed: boolean | null
          ai_processed_at: string | null
          content_search_vector: unknown
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          discipline: string | null
          document_number: string | null
          document_type: string
          drawing_number: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          folder_id: string | null
          id: string
          is_latest_version: boolean | null
          is_pinned: boolean | null
          issue_date: string | null
          name: string
          project_id: string
          received_date: string | null
          requires_approval: boolean | null
          revision: string | null
          search_vector: unknown
          specification_section: string | null
          status: string | null
          supersedes_document_id: string | null
          updated_at: string | null
          version: string | null
          visible_to_subcontractors: boolean | null
        }
        Insert: {
          ai_processed?: boolean | null
          ai_processed_at?: string | null
          content_search_vector?: unknown
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          discipline?: string | null
          document_number?: string | null
          document_type: string
          drawing_number?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          folder_id?: string | null
          id?: string
          is_latest_version?: boolean | null
          is_pinned?: boolean | null
          issue_date?: string | null
          name: string
          project_id: string
          received_date?: string | null
          requires_approval?: boolean | null
          revision?: string | null
          search_vector?: unknown
          specification_section?: string | null
          status?: string | null
          supersedes_document_id?: string | null
          updated_at?: string | null
          version?: string | null
          visible_to_subcontractors?: boolean | null
        }
        Update: {
          ai_processed?: boolean | null
          ai_processed_at?: string | null
          content_search_vector?: unknown
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          discipline?: string | null
          document_number?: string | null
          document_type?: string
          drawing_number?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          folder_id?: string | null
          id?: string
          is_latest_version?: boolean | null
          is_pinned?: boolean | null
          issue_date?: string | null
          name?: string
          project_id?: string
          received_date?: string | null
          requires_approval?: boolean | null
          revision?: string | null
          search_vector?: unknown
          specification_section?: string | null
          status?: string | null
          supersedes_document_id?: string | null
          updated_at?: string | null
          version?: string | null
          visible_to_subcontractors?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_supersedes_document_id_fkey"
            columns: ["supersedes_document_id"]
            isOneToOne: false
            referencedRelation: "document_ai_status"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "documents_supersedes_document_id_fkey"
            columns: ["supersedes_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string
          deleted_at: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          recipient_email: string
          recipient_user_id: string | null
          resend_id: string | null
          status: string
          subject: string
          template_name: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email: string
          recipient_user_id?: string | null
          resend_id?: string | null
          status?: string
          subject: string
          template_name?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email?: string
          recipient_user_id?: string | null
          resend_id?: string | null
          status?: string
          subject?: string
          template_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          capacity: string | null
          category: string | null
          certification_type: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          current_hours: number | null
          current_location: string | null
          current_miles: number | null
          current_project_id: string | null
          deleted_at: string | null
          description: string | null
          dimensions: string | null
          equipment_number: string
          equipment_type: string
          fuel_type: string | null
          hourly_cost: number | null
          id: string
          image_url: string | null
          insurance_expiry: string | null
          insurance_policy: string | null
          make: string | null
          model: string | null
          name: string
          notes: string | null
          operating_weight: string | null
          owner_company: string | null
          ownership_type: string | null
          purchase_date: string | null
          purchase_price: number | null
          registration_expiry: string | null
          registration_number: string | null
          rental_rate: number | null
          rental_rate_type: string | null
          requires_certified_operator: boolean | null
          serial_number: string | null
          status: string
          updated_at: string | null
          vin: string | null
          year: number | null
        }
        Insert: {
          capacity?: string | null
          category?: string | null
          certification_type?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          current_hours?: number | null
          current_location?: string | null
          current_miles?: number | null
          current_project_id?: string | null
          deleted_at?: string | null
          description?: string | null
          dimensions?: string | null
          equipment_number: string
          equipment_type: string
          fuel_type?: string | null
          hourly_cost?: number | null
          id?: string
          image_url?: string | null
          insurance_expiry?: string | null
          insurance_policy?: string | null
          make?: string | null
          model?: string | null
          name: string
          notes?: string | null
          operating_weight?: string | null
          owner_company?: string | null
          ownership_type?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          registration_expiry?: string | null
          registration_number?: string | null
          rental_rate?: number | null
          rental_rate_type?: string | null
          requires_certified_operator?: boolean | null
          serial_number?: string | null
          status?: string
          updated_at?: string | null
          vin?: string | null
          year?: number | null
        }
        Update: {
          capacity?: string | null
          category?: string | null
          certification_type?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          current_hours?: number | null
          current_location?: string | null
          current_miles?: number | null
          current_project_id?: string | null
          deleted_at?: string | null
          description?: string | null
          dimensions?: string | null
          equipment_number?: string
          equipment_type?: string
          fuel_type?: string | null
          hourly_cost?: number | null
          id?: string
          image_url?: string | null
          insurance_expiry?: string | null
          insurance_policy?: string | null
          make?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          operating_weight?: string | null
          owner_company?: string | null
          ownership_type?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          registration_expiry?: string | null
          registration_number?: string | null
          rental_rate?: number | null
          rental_rate_type?: string | null
          requires_certified_operator?: boolean | null
          serial_number?: string | null
          status?: string
          updated_at?: string | null
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_current_project_id_fkey"
            columns: ["current_project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_current_project_id_fkey"
            columns: ["current_project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "equipment_current_project_id_fkey"
            columns: ["current_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_assignments: {
        Row: {
          actual_return_date: string | null
          assigned_by: string | null
          assigned_date: string
          assignment_reason: string | null
          created_at: string | null
          daily_rate: number | null
          equipment_id: string
          expected_return_date: string | null
          hourly_rate: number | null
          id: string
          notes: string | null
          project_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          actual_return_date?: string | null
          assigned_by?: string | null
          assigned_date: string
          assignment_reason?: string | null
          created_at?: string | null
          daily_rate?: number | null
          equipment_id: string
          expected_return_date?: string | null
          hourly_rate?: number | null
          id?: string
          notes?: string | null
          project_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          actual_return_date?: string | null
          assigned_by?: string | null
          assigned_date?: string
          assignment_reason?: string | null
          created_at?: string | null
          daily_rate?: number | null
          equipment_id?: string
          expected_return_date?: string | null
          hourly_rate?: number | null
          id?: string
          notes?: string | null
          project_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assignments_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assignments_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "equipment_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_inspections: {
        Row: {
          checklist_items: Json | null
          corrective_actions: string | null
          created_at: string | null
          created_by: string | null
          equipment_id: string
          follow_up_date: string | null
          follow_up_required: boolean | null
          hours_reading: number | null
          id: string
          inspection_date: string
          inspection_type: string
          inspector_id: string | null
          inspector_name: string | null
          issues_found: string | null
          miles_reading: number | null
          overall_status: string
          project_id: string | null
          signature_url: string | null
        }
        Insert: {
          checklist_items?: Json | null
          corrective_actions?: string | null
          created_at?: string | null
          created_by?: string | null
          equipment_id: string
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          hours_reading?: number | null
          id?: string
          inspection_date: string
          inspection_type: string
          inspector_id?: string | null
          inspector_name?: string | null
          issues_found?: string | null
          miles_reading?: number | null
          overall_status: string
          project_id?: string | null
          signature_url?: string | null
        }
        Update: {
          checklist_items?: Json | null
          corrective_actions?: string | null
          created_at?: string | null
          created_by?: string | null
          equipment_id?: string
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          hours_reading?: number | null
          id?: string
          inspection_date?: string
          inspection_type?: string
          inspector_id?: string | null
          inspector_name?: string | null
          issues_found?: string | null
          miles_reading?: number | null
          overall_status?: string
          project_id?: string | null
          signature_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_inspections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_inspections_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_inspections_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_inspections_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "equipment_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_logs: {
        Row: {
          condition_notes: string | null
          created_at: string | null
          created_by: string | null
          daily_report_id: string | null
          end_hours: number | null
          end_miles: number | null
          equipment_id: string
          fuel_cost: number | null
          fuel_used: number | null
          hours_used: number | null
          id: string
          idle_hours: number | null
          location: string | null
          log_date: string
          miles_driven: number | null
          operator_id: string | null
          operator_name: string | null
          project_id: string | null
          reported_issues: string | null
          start_hours: number | null
          start_miles: number | null
          updated_at: string | null
          work_description: string | null
        }
        Insert: {
          condition_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_report_id?: string | null
          end_hours?: number | null
          end_miles?: number | null
          equipment_id: string
          fuel_cost?: number | null
          fuel_used?: number | null
          hours_used?: number | null
          id?: string
          idle_hours?: number | null
          location?: string | null
          log_date: string
          miles_driven?: number | null
          operator_id?: string | null
          operator_name?: string | null
          project_id?: string | null
          reported_issues?: string | null
          start_hours?: number | null
          start_miles?: number | null
          updated_at?: string | null
          work_description?: string | null
        }
        Update: {
          condition_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_report_id?: string | null
          end_hours?: number | null
          end_miles?: number | null
          equipment_id?: string
          fuel_cost?: number | null
          fuel_used?: number | null
          hours_used?: number | null
          id?: string
          idle_hours?: number | null
          location?: string | null
          log_date?: string
          miles_driven?: number | null
          operator_id?: string | null
          operator_name?: string | null
          project_id?: string | null
          reported_issues?: string | null
          start_hours?: number | null
          start_miles?: number | null
          updated_at?: string | null
          work_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_logs_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_logs_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "material_received_with_details"
            referencedColumns: ["daily_report_id"]
          },
          {
            foreignKeyName: "equipment_logs_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_logs_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_logs_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "equipment_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_maintenance: {
        Row: {
          attachments: Json | null
          completed_date: string | null
          completed_hours: number | null
          completed_miles: number | null
          created_at: string | null
          created_by: string | null
          description: string
          downtime_hours: number | null
          due_hours: number | null
          due_miles: number | null
          equipment_id: string
          id: string
          invoice_number: string | null
          labor_cost: number | null
          maintenance_type: string
          next_service_date: string | null
          next_service_hours: number | null
          notes: string | null
          parts_cost: number | null
          parts_used: Json | null
          scheduled_date: string | null
          service_provider: string | null
          status: string
          technician_name: string | null
          total_cost: number | null
          updated_at: string | null
          work_performed: string | null
        }
        Insert: {
          attachments?: Json | null
          completed_date?: string | null
          completed_hours?: number | null
          completed_miles?: number | null
          created_at?: string | null
          created_by?: string | null
          description: string
          downtime_hours?: number | null
          due_hours?: number | null
          due_miles?: number | null
          equipment_id: string
          id?: string
          invoice_number?: string | null
          labor_cost?: number | null
          maintenance_type: string
          next_service_date?: string | null
          next_service_hours?: number | null
          notes?: string | null
          parts_cost?: number | null
          parts_used?: Json | null
          scheduled_date?: string | null
          service_provider?: string | null
          status?: string
          technician_name?: string | null
          total_cost?: number | null
          updated_at?: string | null
          work_performed?: string | null
        }
        Update: {
          attachments?: Json | null
          completed_date?: string | null
          completed_hours?: number | null
          completed_miles?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          downtime_hours?: number | null
          due_hours?: number | null
          due_miles?: number | null
          equipment_id?: string
          id?: string
          invoice_number?: string | null
          labor_cost?: number | null
          maintenance_type?: string
          next_service_date?: string | null
          next_service_hours?: number | null
          notes?: string | null
          parts_cost?: number | null
          parts_used?: Json | null
          scheduled_date?: string | null
          service_provider?: string | null
          status?: string
          technician_name?: string | null
          total_cost?: number | null
          updated_at?: string | null
          work_performed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_maintenance_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_maintenance_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_maintenance_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          category: string | null
          code: string
          created_at: string | null
          default_enabled: boolean | null
          description: string | null
          id: string
          is_beta: boolean | null
          name: string
          requires_subscription: string | null
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string | null
          default_enabled?: boolean | null
          description?: string | null
          id?: string
          is_beta?: boolean | null
          name: string
          requires_subscription?: string | null
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string | null
          default_enabled?: boolean | null
          description?: string | null
          id?: string
          is_beta?: boolean | null
          name?: string
          requires_subscription?: string | null
        }
        Relationships: []
      }
      folders: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          parent_folder_id: string | null
          project_id: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          parent_folder_id?: string | null
          project_id: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          parent_folder_id?: string | null
          project_id?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "folders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_reports: {
        Row: {
          company_id: string
          created_at: string | null
          data_source: Database["public"]["Enums"]["report_data_source"]
          date_from: string | null
          date_to: string | null
          error_message: string | null
          execution_time_ms: number | null
          expires_at: string | null
          file_size_bytes: number | null
          file_url: string | null
          filters_applied: Json | null
          generated_by: string | null
          id: string
          is_scheduled: boolean | null
          output_format: Database["public"]["Enums"]["report_output_format"]
          project_id: string | null
          report_name: string
          row_count: number | null
          scheduled_report_id: string | null
          status: string | null
          template_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          data_source: Database["public"]["Enums"]["report_data_source"]
          date_from?: string | null
          date_to?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          expires_at?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          filters_applied?: Json | null
          generated_by?: string | null
          id?: string
          is_scheduled?: boolean | null
          output_format: Database["public"]["Enums"]["report_output_format"]
          project_id?: string | null
          report_name: string
          row_count?: number | null
          scheduled_report_id?: string | null
          status?: string | null
          template_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          data_source?: Database["public"]["Enums"]["report_data_source"]
          date_from?: string | null
          date_to?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          expires_at?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          filters_applied?: Json | null
          generated_by?: string | null
          id?: string
          is_scheduled?: boolean | null
          output_format?: Database["public"]["Enums"]["report_output_format"]
          project_id?: string | null
          report_name?: string
          row_count?: number | null
          scheduled_report_id?: string | null
          status?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "generated_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_scheduled_report_id_fkey"
            columns: ["scheduled_report_id"]
            isOneToOne: false
            referencedRelation: "scheduled_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_notifications: {
        Row: {
          created_at: string | null
          delivery_status: string | null
          error_message: string | null
          id: string
          incident_id: string
          message: string | null
          notification_type: string
          read_at: string | null
          sent_at: string | null
          subject: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          delivery_status?: string | null
          error_message?: string | null
          id?: string
          incident_id: string
          message?: string | null
          notification_type: string
          read_at?: string | null
          sent_at?: string | null
          subject?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          delivery_status?: string | null
          error_message?: string | null
          id?: string
          incident_id?: string
          message?: string | null
          notification_type?: string
          read_at?: string | null
          sent_at?: string | null
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_notifications_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "osha_300_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_notifications_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "safety_incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          corrective_actions_required: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          failure_reasons: string | null
          id: string
          inspection_name: string
          inspection_type: string
          inspector_company: string | null
          inspector_name: string | null
          inspector_notes: string | null
          inspector_phone: string | null
          notify_subcontractors: string[] | null
          project_id: string
          reinspection_scheduled_date: string | null
          related_checklist_id: string | null
          related_permit_id: string | null
          reminder_days_before: number | null
          reminder_sent: boolean | null
          result: string | null
          result_date: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          corrective_actions_required?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          failure_reasons?: string | null
          id?: string
          inspection_name: string
          inspection_type: string
          inspector_company?: string | null
          inspector_name?: string | null
          inspector_notes?: string | null
          inspector_phone?: string | null
          notify_subcontractors?: string[] | null
          project_id: string
          reinspection_scheduled_date?: string | null
          related_checklist_id?: string | null
          related_permit_id?: string | null
          reminder_days_before?: number | null
          reminder_sent?: boolean | null
          result?: string | null
          result_date?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          corrective_actions_required?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          failure_reasons?: string | null
          id?: string
          inspection_name?: string
          inspection_type?: string
          inspector_company?: string | null
          inspector_name?: string | null
          inspector_notes?: string | null
          inspector_phone?: string | null
          notify_subcontractors?: string[] | null
          project_id?: string
          reinspection_scheduled_date?: string | null
          related_checklist_id?: string | null
          related_permit_id?: string | null
          reminder_days_before?: number | null
          reminder_sent?: boolean | null
          result?: string | null
          result_date?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_related_checklist_id_fkey"
            columns: ["related_checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_related_permit_id_fkey"
            columns: ["related_permit_id"]
            isOneToOne: false
            referencedRelation: "permits"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_certificate_history: {
        Row: {
          action: string
          certificate_id: string
          changed_at: string | null
          changed_by: string | null
          field_changed: string | null
          id: string
          new_value: string | null
          notes: string | null
          old_value: string | null
        }
        Insert: {
          action: string
          certificate_id: string
          changed_at?: string | null
          changed_by?: string | null
          field_changed?: string | null
          id?: string
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
        }
        Update: {
          action?: string
          certificate_id?: string
          changed_at?: string | null
          changed_by?: string | null
          field_changed?: string | null
          id?: string
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_certificate_history_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "expiring_certificates_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_certificate_history_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "insurance_certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_certificate_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_certificates: {
        Row: {
          additional_insured_name: string | null
          additional_insured_required: boolean | null
          additional_insured_verified: boolean | null
          alert_days_before_expiry: number | null
          bodily_injury_per_accident: number | null
          bodily_injury_per_person: number | null
          carrier_naic_number: string | null
          carrier_name: string
          certificate_number: string
          certificate_storage_path: string | null
          certificate_url: string | null
          combined_single_limit: number | null
          company_id: string
          created_at: string | null
          created_by: string | null
          damage_to_rented_premises: number | null
          deleted_at: string | null
          description_of_operations: string | null
          each_occurrence_limit: number | null
          effective_date: string
          expiration_date: string
          general_aggregate_limit: number | null
          id: string
          insurance_type: Database["public"]["Enums"]["insurance_type"]
          issued_by_email: string | null
          issued_by_name: string | null
          issued_by_phone: string | null
          medical_expense_limit: number | null
          notes: string | null
          personal_adv_injury_limit: number | null
          policy_number: string
          primary_noncontributory_required: boolean | null
          primary_noncontributory_verified: boolean | null
          products_completed_ops_limit: number | null
          project_id: string | null
          property_damage_limit: number | null
          status: Database["public"]["Enums"]["certificate_status"] | null
          subcontractor_id: string | null
          suppress_alerts: boolean | null
          umbrella_aggregate: number | null
          umbrella_each_occurrence: number | null
          updated_at: string | null
          waiver_of_subrogation_required: boolean | null
          waiver_of_subrogation_verified: boolean | null
          workers_comp_el_disease_employee: number | null
          workers_comp_el_disease_policy: number | null
          workers_comp_el_each_accident: number | null
        }
        Insert: {
          additional_insured_name?: string | null
          additional_insured_required?: boolean | null
          additional_insured_verified?: boolean | null
          alert_days_before_expiry?: number | null
          bodily_injury_per_accident?: number | null
          bodily_injury_per_person?: number | null
          carrier_naic_number?: string | null
          carrier_name: string
          certificate_number: string
          certificate_storage_path?: string | null
          certificate_url?: string | null
          combined_single_limit?: number | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          damage_to_rented_premises?: number | null
          deleted_at?: string | null
          description_of_operations?: string | null
          each_occurrence_limit?: number | null
          effective_date: string
          expiration_date: string
          general_aggregate_limit?: number | null
          id?: string
          insurance_type: Database["public"]["Enums"]["insurance_type"]
          issued_by_email?: string | null
          issued_by_name?: string | null
          issued_by_phone?: string | null
          medical_expense_limit?: number | null
          notes?: string | null
          personal_adv_injury_limit?: number | null
          policy_number: string
          primary_noncontributory_required?: boolean | null
          primary_noncontributory_verified?: boolean | null
          products_completed_ops_limit?: number | null
          project_id?: string | null
          property_damage_limit?: number | null
          status?: Database["public"]["Enums"]["certificate_status"] | null
          subcontractor_id?: string | null
          suppress_alerts?: boolean | null
          umbrella_aggregate?: number | null
          umbrella_each_occurrence?: number | null
          updated_at?: string | null
          waiver_of_subrogation_required?: boolean | null
          waiver_of_subrogation_verified?: boolean | null
          workers_comp_el_disease_employee?: number | null
          workers_comp_el_disease_policy?: number | null
          workers_comp_el_each_accident?: number | null
        }
        Update: {
          additional_insured_name?: string | null
          additional_insured_required?: boolean | null
          additional_insured_verified?: boolean | null
          alert_days_before_expiry?: number | null
          bodily_injury_per_accident?: number | null
          bodily_injury_per_person?: number | null
          carrier_naic_number?: string | null
          carrier_name?: string
          certificate_number?: string
          certificate_storage_path?: string | null
          certificate_url?: string | null
          combined_single_limit?: number | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          damage_to_rented_premises?: number | null
          deleted_at?: string | null
          description_of_operations?: string | null
          each_occurrence_limit?: number | null
          effective_date?: string
          expiration_date?: string
          general_aggregate_limit?: number | null
          id?: string
          insurance_type?: Database["public"]["Enums"]["insurance_type"]
          issued_by_email?: string | null
          issued_by_name?: string | null
          issued_by_phone?: string | null
          medical_expense_limit?: number | null
          notes?: string | null
          personal_adv_injury_limit?: number | null
          policy_number?: string
          primary_noncontributory_required?: boolean | null
          primary_noncontributory_verified?: boolean | null
          products_completed_ops_limit?: number | null
          project_id?: string | null
          property_damage_limit?: number | null
          status?: Database["public"]["Enums"]["certificate_status"] | null
          subcontractor_id?: string | null
          suppress_alerts?: boolean | null
          umbrella_aggregate?: number | null
          umbrella_each_occurrence?: number | null
          updated_at?: string | null
          waiver_of_subrogation_required?: boolean | null
          waiver_of_subrogation_verified?: boolean | null
          workers_comp_el_disease_employee?: number | null
          workers_comp_el_disease_policy?: number | null
          workers_comp_el_each_accident?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_certificates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_certificates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_certificates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_certificates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "insurance_certificates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_expiration_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          certificate_id: string
          created_at: string | null
          days_until_expiry: number | null
          id: string
          renewal_received: boolean | null
          sent_at: string | null
          sent_to_emails: string[] | null
          sent_to_user_ids: string[] | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          certificate_id: string
          created_at?: string | null
          days_until_expiry?: number | null
          id?: string
          renewal_received?: boolean | null
          sent_at?: string | null
          sent_to_emails?: string[] | null
          sent_to_user_ids?: string[] | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          certificate_id?: string
          created_at?: string | null
          days_until_expiry?: number | null
          id?: string
          renewal_received?: boolean | null
          sent_at?: string | null
          sent_to_emails?: string[] | null
          sent_to_user_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_expiration_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_expiration_alerts_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "expiring_certificates_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_expiration_alerts_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "insurance_certificates"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_requirements: {
        Row: {
          additional_insured_required: boolean | null
          applies_to_all_subcontractors: boolean | null
          company_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          insurance_type: Database["public"]["Enums"]["insurance_type"]
          is_active: boolean | null
          min_combined_single_limit: number | null
          min_each_occurrence: number | null
          min_general_aggregate: number | null
          min_products_completed_ops: number | null
          min_umbrella_aggregate: number | null
          min_umbrella_each_occurrence: number | null
          min_workers_comp_el_each_accident: number | null
          name: string
          primary_noncontributory_required: boolean | null
          project_id: string | null
          specific_subcontractor_ids: string[] | null
          updated_at: string | null
          waiver_of_subrogation_required: boolean | null
        }
        Insert: {
          additional_insured_required?: boolean | null
          applies_to_all_subcontractors?: boolean | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          insurance_type: Database["public"]["Enums"]["insurance_type"]
          is_active?: boolean | null
          min_combined_single_limit?: number | null
          min_each_occurrence?: number | null
          min_general_aggregate?: number | null
          min_products_completed_ops?: number | null
          min_umbrella_aggregate?: number | null
          min_umbrella_each_occurrence?: number | null
          min_workers_comp_el_each_accident?: number | null
          name: string
          primary_noncontributory_required?: boolean | null
          project_id?: string | null
          specific_subcontractor_ids?: string[] | null
          updated_at?: string | null
          waiver_of_subrogation_required?: boolean | null
        }
        Update: {
          additional_insured_required?: boolean | null
          applies_to_all_subcontractors?: boolean | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          insurance_type?: Database["public"]["Enums"]["insurance_type"]
          is_active?: boolean | null
          min_combined_single_limit?: number | null
          min_each_occurrence?: number | null
          min_general_aggregate?: number | null
          min_products_completed_ops?: number | null
          min_umbrella_aggregate?: number | null
          min_umbrella_each_occurrence?: number | null
          min_workers_comp_el_each_accident?: number | null
          name?: string
          primary_noncontributory_required?: boolean | null
          project_id?: string | null
          specific_subcontractor_ids?: string[] | null
          updated_at?: string | null
          waiver_of_subrogation_required?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_requirements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_requirements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "insurance_requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      job_safety_analyses: {
        Row: {
          company_id: string
          completed_date: string | null
          completion_notes: string | null
          contractor_company: string | null
          created_at: string | null
          created_by: string | null
          equipment_used: string[] | null
          estimated_duration: string | null
          foreman_name: string | null
          id: string
          jsa_number: string
          project_id: string
          related_incident_id: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          revision_number: number | null
          scheduled_date: string
          start_time: string | null
          status: string | null
          supervisor_id: string | null
          supervisor_name: string | null
          task_description: string
          temperature: string | null
          template_id: string | null
          updated_at: string | null
          weather_conditions: string | null
          work_location: string | null
          work_permit_id: string | null
        }
        Insert: {
          company_id: string
          completed_date?: string | null
          completion_notes?: string | null
          contractor_company?: string | null
          created_at?: string | null
          created_by?: string | null
          equipment_used?: string[] | null
          estimated_duration?: string | null
          foreman_name?: string | null
          id?: string
          jsa_number: string
          project_id: string
          related_incident_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_number?: number | null
          scheduled_date: string
          start_time?: string | null
          status?: string | null
          supervisor_id?: string | null
          supervisor_name?: string | null
          task_description: string
          temperature?: string | null
          template_id?: string | null
          updated_at?: string | null
          weather_conditions?: string | null
          work_location?: string | null
          work_permit_id?: string | null
        }
        Update: {
          company_id?: string
          completed_date?: string | null
          completion_notes?: string | null
          contractor_company?: string | null
          created_at?: string | null
          created_by?: string | null
          equipment_used?: string[] | null
          estimated_duration?: string | null
          foreman_name?: string | null
          id?: string
          jsa_number?: string
          project_id?: string
          related_incident_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_number?: number | null
          scheduled_date?: string
          start_time?: string | null
          status?: string | null
          supervisor_id?: string | null
          supervisor_name?: string | null
          task_description?: string
          temperature?: string | null
          template_id?: string | null
          updated_at?: string | null
          weather_conditions?: string | null
          work_location?: string | null
          work_permit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_safety_analyses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_safety_analyses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_safety_analyses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_safety_analyses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "job_safety_analyses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_safety_analyses_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_safety_analyses_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_safety_analyses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "jsa_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      jsa_acknowledgments: {
        Row: {
          acknowledged_at: string
          created_at: string | null
          has_questions: boolean | null
          id: string
          jsa_id: string
          questions_notes: string | null
          signature_data: string | null
          understands_hazards: boolean | null
          user_id: string | null
          worker_badge_number: string | null
          worker_company: string | null
          worker_name: string
          worker_trade: string | null
        }
        Insert: {
          acknowledged_at?: string
          created_at?: string | null
          has_questions?: boolean | null
          id?: string
          jsa_id: string
          questions_notes?: string | null
          signature_data?: string | null
          understands_hazards?: boolean | null
          user_id?: string | null
          worker_badge_number?: string | null
          worker_company?: string | null
          worker_name: string
          worker_trade?: string | null
        }
        Update: {
          acknowledged_at?: string
          created_at?: string | null
          has_questions?: boolean | null
          id?: string
          jsa_id?: string
          questions_notes?: string | null
          signature_data?: string | null
          understands_hazards?: boolean | null
          user_id?: string | null
          worker_badge_number?: string | null
          worker_company?: string | null
          worker_name?: string
          worker_trade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jsa_acknowledgments_jsa_id_fkey"
            columns: ["jsa_id"]
            isOneToOne: false
            referencedRelation: "job_safety_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jsa_acknowledgments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      jsa_attachments: {
        Row: {
          attachment_type: string | null
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          jsa_id: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          attachment_type?: string | null
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          jsa_id: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          attachment_type?: string | null
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          jsa_id?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jsa_attachments_jsa_id_fkey"
            columns: ["jsa_id"]
            isOneToOne: false
            referencedRelation: "job_safety_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jsa_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      jsa_hazards: {
        Row: {
          administrative_controls: string | null
          controls_verified: boolean | null
          created_at: string | null
          elimination_controls: string | null
          engineering_controls: string | null
          hazard_description: string
          hazard_type: string | null
          id: string
          jsa_id: string
          notes: string | null
          ppe_required: string[] | null
          probability: string | null
          responsible_party: string | null
          responsible_party_id: string | null
          risk_level: string | null
          severity: string | null
          step_description: string
          step_number: number
          substitution_controls: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          administrative_controls?: string | null
          controls_verified?: boolean | null
          created_at?: string | null
          elimination_controls?: string | null
          engineering_controls?: string | null
          hazard_description: string
          hazard_type?: string | null
          id?: string
          jsa_id: string
          notes?: string | null
          ppe_required?: string[] | null
          probability?: string | null
          responsible_party?: string | null
          responsible_party_id?: string | null
          risk_level?: string | null
          severity?: string | null
          step_description: string
          step_number: number
          substitution_controls?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          administrative_controls?: string | null
          controls_verified?: boolean | null
          created_at?: string | null
          elimination_controls?: string | null
          engineering_controls?: string | null
          hazard_description?: string
          hazard_type?: string | null
          id?: string
          jsa_id?: string
          notes?: string | null
          ppe_required?: string[] | null
          probability?: string | null
          responsible_party?: string | null
          responsible_party_id?: string | null
          risk_level?: string | null
          severity?: string | null
          step_description?: string
          step_number?: number
          substitution_controls?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jsa_hazards_jsa_id_fkey"
            columns: ["jsa_id"]
            isOneToOne: false
            referencedRelation: "job_safety_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jsa_hazards_responsible_party_id_fkey"
            columns: ["responsible_party_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jsa_hazards_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      jsa_templates: {
        Row: {
          category: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          default_hazards: Json | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          osha_standards: string[] | null
          other_references: string | null
          required_training: string[] | null
          updated_at: string | null
          usage_count: number | null
          work_type: string | null
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          default_hazards?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          osha_standards?: string[] | null
          other_references?: string | null
          required_training?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
          work_type?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          default_hazards?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          osha_standards?: string[] | null
          other_references?: string | null
          required_training?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jsa_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jsa_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lien_waiver_history: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string | null
          field_changed: string | null
          id: string
          lien_waiver_id: string
          new_value: string | null
          notes: string | null
          old_value: string | null
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by?: string | null
          field_changed?: string | null
          id?: string
          lien_waiver_id: string
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string | null
          field_changed?: string | null
          id?: string
          lien_waiver_id?: string
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lien_waiver_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lien_waiver_history_lien_waiver_id_fkey"
            columns: ["lien_waiver_id"]
            isOneToOne: false
            referencedRelation: "lien_waivers"
            referencedColumns: ["id"]
          },
        ]
      }
      lien_waiver_requirements: {
        Row: {
          allow_conditional_for_progress: boolean | null
          block_payment_without_waiver: boolean | null
          company_id: string
          created_at: string | null
          created_by: string | null
          days_before_payment_due: number | null
          description: string | null
          id: string
          is_active: boolean | null
          min_payment_threshold: number | null
          name: string
          project_id: string | null
          require_unconditional_for_final: boolean | null
          required_for_final_payment: boolean | null
          required_for_progress_payments: boolean | null
          requires_contractor_waiver: boolean | null
          requires_sub_waivers: boolean | null
          requires_supplier_waivers: boolean | null
          updated_at: string | null
        }
        Insert: {
          allow_conditional_for_progress?: boolean | null
          block_payment_without_waiver?: boolean | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          days_before_payment_due?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          min_payment_threshold?: number | null
          name: string
          project_id?: string | null
          require_unconditional_for_final?: boolean | null
          required_for_final_payment?: boolean | null
          required_for_progress_payments?: boolean | null
          requires_contractor_waiver?: boolean | null
          requires_sub_waivers?: boolean | null
          requires_supplier_waivers?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allow_conditional_for_progress?: boolean | null
          block_payment_without_waiver?: boolean | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          days_before_payment_due?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          min_payment_threshold?: number | null
          name?: string
          project_id?: string | null
          require_unconditional_for_final?: boolean | null
          required_for_final_payment?: boolean | null
          required_for_progress_payments?: boolean | null
          requires_contractor_waiver?: boolean | null
          requires_sub_waivers?: boolean | null
          requires_supplier_waivers?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lien_waiver_requirements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lien_waiver_requirements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lien_waiver_requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lien_waiver_requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "lien_waiver_requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      lien_waiver_templates: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          effective_date: string | null
          expiration_date: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          legal_language: string | null
          name: string
          notarization_required: boolean | null
          notes: string | null
          placeholders: Json | null
          state_code: string
          statute_reference: string | null
          template_content: string
          updated_at: string | null
          version: number | null
          waiver_type: Database["public"]["Enums"]["lien_waiver_type"]
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          effective_date?: string | null
          expiration_date?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          legal_language?: string | null
          name: string
          notarization_required?: boolean | null
          notes?: string | null
          placeholders?: Json | null
          state_code: string
          statute_reference?: string | null
          template_content: string
          updated_at?: string | null
          version?: number | null
          waiver_type: Database["public"]["Enums"]["lien_waiver_type"]
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          effective_date?: string | null
          expiration_date?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          legal_language?: string | null
          name?: string
          notarization_required?: boolean | null
          notes?: string | null
          placeholders?: Json | null
          state_code?: string
          statute_reference?: string | null
          template_content?: string
          updated_at?: string | null
          version?: number | null
          waiver_type?: Database["public"]["Enums"]["lien_waiver_type"]
        }
        Relationships: [
          {
            foreignKeyName: "lien_waiver_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lien_waiver_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lien_waivers: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          check_date: string | null
          check_number: string | null
          claimant_company: string | null
          claimant_name: string | null
          claimant_title: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          document_url: string | null
          due_date: string | null
          exceptions: string | null
          id: string
          notarization_required: boolean | null
          notarized_at: string | null
          notarized_document_url: string | null
          notary_commission_expiration: string | null
          notary_commission_number: string | null
          notary_name: string | null
          notes: string | null
          payment_amount: number
          payment_application_id: string | null
          project_id: string
          received_at: string | null
          rejection_reason: string | null
          reminder_sent_at: string | null
          rendered_content: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sent_at: string | null
          sent_to_email: string | null
          signature_date: string | null
          signature_url: string | null
          signed_at: string | null
          status: Database["public"]["Enums"]["lien_waiver_status"] | null
          subcontractor_id: string | null
          template_id: string | null
          through_date: string
          updated_at: string | null
          vendor_name: string | null
          waiver_number: string
          waiver_type: Database["public"]["Enums"]["lien_waiver_type"]
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          check_date?: string | null
          check_number?: string | null
          claimant_company?: string | null
          claimant_name?: string | null
          claimant_title?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          document_url?: string | null
          due_date?: string | null
          exceptions?: string | null
          id?: string
          notarization_required?: boolean | null
          notarized_at?: string | null
          notarized_document_url?: string | null
          notary_commission_expiration?: string | null
          notary_commission_number?: string | null
          notary_name?: string | null
          notes?: string | null
          payment_amount?: number
          payment_application_id?: string | null
          project_id: string
          received_at?: string | null
          rejection_reason?: string | null
          reminder_sent_at?: string | null
          rendered_content?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sent_at?: string | null
          sent_to_email?: string | null
          signature_date?: string | null
          signature_url?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["lien_waiver_status"] | null
          subcontractor_id?: string | null
          template_id?: string | null
          through_date: string
          updated_at?: string | null
          vendor_name?: string | null
          waiver_number: string
          waiver_type: Database["public"]["Enums"]["lien_waiver_type"]
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          check_date?: string | null
          check_number?: string | null
          claimant_company?: string | null
          claimant_name?: string | null
          claimant_title?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          document_url?: string | null
          due_date?: string | null
          exceptions?: string | null
          id?: string
          notarization_required?: boolean | null
          notarized_at?: string | null
          notarized_document_url?: string | null
          notary_commission_expiration?: string | null
          notary_commission_number?: string | null
          notary_name?: string | null
          notes?: string | null
          payment_amount?: number
          payment_application_id?: string | null
          project_id?: string
          received_at?: string | null
          rejection_reason?: string | null
          reminder_sent_at?: string | null
          rendered_content?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sent_at?: string | null
          sent_to_email?: string | null
          signature_date?: string | null
          signature_url?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["lien_waiver_status"] | null
          subcontractor_id?: string | null
          template_id?: string | null
          through_date?: string
          updated_at?: string | null
          vendor_name?: string | null
          waiver_number?: string
          waiver_type?: Database["public"]["Enums"]["lien_waiver_type"]
        }
        Relationships: [
          {
            foreignKeyName: "lien_waivers_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lien_waivers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lien_waivers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lien_waivers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lien_waivers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "lien_waivers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lien_waivers_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lien_waivers_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lien_waivers_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "lien_waiver_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      look_ahead_activities: {
        Row: {
          activity_name: string
          actual_end_date: string | null
          actual_start_date: string | null
          commitment_date: string | null
          committed_by: string | null
          company_id: string
          constraint_removal_plan: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          duration_days: number | null
          estimated_crew_size: number | null
          estimated_labor_hours: number | null
          id: string
          location: string | null
          make_ready_status: string | null
          notes: string | null
          percent_complete: number | null
          planned_end_date: string
          planned_start_date: string
          priority: number | null
          project_id: string
          ready_to_execute: boolean | null
          schedule_item_id: string | null
          sort_order: number | null
          status:
            | Database["public"]["Enums"]["look_ahead_activity_status"]
            | null
          subcontractor_id: string | null
          trade: string | null
          updated_at: string | null
          updated_by: string | null
          variance_category:
            | Database["public"]["Enums"]["variance_category"]
            | null
          variance_notes: string | null
          week_number: number | null
          week_start_date: string | null
        }
        Insert: {
          activity_name: string
          actual_end_date?: string | null
          actual_start_date?: string | null
          commitment_date?: string | null
          committed_by?: string | null
          company_id: string
          constraint_removal_plan?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_days?: number | null
          estimated_crew_size?: number | null
          estimated_labor_hours?: number | null
          id?: string
          location?: string | null
          make_ready_status?: string | null
          notes?: string | null
          percent_complete?: number | null
          planned_end_date: string
          planned_start_date: string
          priority?: number | null
          project_id: string
          ready_to_execute?: boolean | null
          schedule_item_id?: string | null
          sort_order?: number | null
          status?:
            | Database["public"]["Enums"]["look_ahead_activity_status"]
            | null
          subcontractor_id?: string | null
          trade?: string | null
          updated_at?: string | null
          updated_by?: string | null
          variance_category?:
            | Database["public"]["Enums"]["variance_category"]
            | null
          variance_notes?: string | null
          week_number?: number | null
          week_start_date?: string | null
        }
        Update: {
          activity_name?: string
          actual_end_date?: string | null
          actual_start_date?: string | null
          commitment_date?: string | null
          committed_by?: string | null
          company_id?: string
          constraint_removal_plan?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_days?: number | null
          estimated_crew_size?: number | null
          estimated_labor_hours?: number | null
          id?: string
          location?: string | null
          make_ready_status?: string | null
          notes?: string | null
          percent_complete?: number | null
          planned_end_date?: string
          planned_start_date?: string
          priority?: number | null
          project_id?: string
          ready_to_execute?: boolean | null
          schedule_item_id?: string | null
          sort_order?: number | null
          status?:
            | Database["public"]["Enums"]["look_ahead_activity_status"]
            | null
          subcontractor_id?: string | null
          trade?: string | null
          updated_at?: string | null
          updated_by?: string | null
          variance_category?:
            | Database["public"]["Enums"]["variance_category"]
            | null
          variance_notes?: string | null
          week_number?: number | null
          week_start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "look_ahead_activities_committed_by_fkey"
            columns: ["committed_by"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "look_ahead_activities_committed_by_fkey"
            columns: ["committed_by"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "look_ahead_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "look_ahead_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "look_ahead_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "look_ahead_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "look_ahead_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "look_ahead_activities_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      look_ahead_constraints: {
        Row: {
          activity_id: string
          actual_resolution_date: string | null
          assigned_to: string | null
          company_id: string
          constraint_type: Database["public"]["Enums"]["constraint_type"]
          created_at: string | null
          created_by: string | null
          delay_days: number | null
          description: string
          expected_resolution_date: string | null
          id: string
          impact_description: string | null
          predecessor_activity_id: string | null
          project_id: string
          resolution_notes: string | null
          resolved_by: string | null
          responsible_party: string | null
          rfi_id: string | null
          status: Database["public"]["Enums"]["constraint_status"] | null
          submittal_id: string | null
          updated_at: string | null
        }
        Insert: {
          activity_id: string
          actual_resolution_date?: string | null
          assigned_to?: string | null
          company_id: string
          constraint_type: Database["public"]["Enums"]["constraint_type"]
          created_at?: string | null
          created_by?: string | null
          delay_days?: number | null
          description: string
          expected_resolution_date?: string | null
          id?: string
          impact_description?: string | null
          predecessor_activity_id?: string | null
          project_id: string
          resolution_notes?: string | null
          resolved_by?: string | null
          responsible_party?: string | null
          rfi_id?: string | null
          status?: Database["public"]["Enums"]["constraint_status"] | null
          submittal_id?: string | null
          updated_at?: string | null
        }
        Update: {
          activity_id?: string
          actual_resolution_date?: string | null
          assigned_to?: string | null
          company_id?: string
          constraint_type?: Database["public"]["Enums"]["constraint_type"]
          created_at?: string | null
          created_by?: string | null
          delay_days?: number | null
          description?: string
          expected_resolution_date?: string | null
          id?: string
          impact_description?: string | null
          predecessor_activity_id?: string | null
          project_id?: string
          resolution_notes?: string | null
          resolved_by?: string | null
          responsible_party?: string | null
          rfi_id?: string | null
          status?: Database["public"]["Enums"]["constraint_status"] | null
          submittal_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "look_ahead_constraints_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "look_ahead_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "look_ahead_constraints_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "look_ahead_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "look_ahead_constraints_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "look_ahead_constraints_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "look_ahead_constraints_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "look_ahead_constraints_predecessor_activity_id_fkey"
            columns: ["predecessor_activity_id"]
            isOneToOne: false
            referencedRelation: "look_ahead_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "look_ahead_constraints_predecessor_activity_id_fkey"
            columns: ["predecessor_activity_id"]
            isOneToOne: false
            referencedRelation: "look_ahead_activity_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "look_ahead_constraints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "look_ahead_constraints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "look_ahead_constraints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "look_ahead_constraints_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "look_ahead_constraints_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "rfi_register"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "look_ahead_constraints_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "rfi_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "look_ahead_constraints_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "rfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "look_ahead_constraints_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "submittal_register"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "look_ahead_constraints_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "submittals"
            referencedColumns: ["id"]
          },
        ]
      }
      look_ahead_snapshots: {
        Row: {
          blocked_activities: number | null
          cancelled_activities: number | null
          company_id: string
          completed_activities: number | null
          created_at: string | null
          created_by: string | null
          delayed_activities: number | null
          id: string
          meeting_attendees: string[] | null
          meeting_notes: string | null
          notes: string | null
          open_constraints: number | null
          planned_activities: number | null
          planning_meeting_date: string | null
          ppc_percentage: number | null
          project_id: string
          reliability_index: number | null
          resolved_constraints: number | null
          snapshot_date: string | null
          total_constraints: number | null
          variance_reasons: Json | null
          variance_summary: Json | null
          week_end_date: string
          week_start_date: string
        }
        Insert: {
          blocked_activities?: number | null
          cancelled_activities?: number | null
          company_id: string
          completed_activities?: number | null
          created_at?: string | null
          created_by?: string | null
          delayed_activities?: number | null
          id?: string
          meeting_attendees?: string[] | null
          meeting_notes?: string | null
          notes?: string | null
          open_constraints?: number | null
          planned_activities?: number | null
          planning_meeting_date?: string | null
          ppc_percentage?: number | null
          project_id: string
          reliability_index?: number | null
          resolved_constraints?: number | null
          snapshot_date?: string | null
          total_constraints?: number | null
          variance_reasons?: Json | null
          variance_summary?: Json | null
          week_end_date: string
          week_start_date: string
        }
        Update: {
          blocked_activities?: number | null
          cancelled_activities?: number | null
          company_id?: string
          completed_activities?: number | null
          created_at?: string | null
          created_by?: string | null
          delayed_activities?: number | null
          id?: string
          meeting_attendees?: string[] | null
          meeting_notes?: string | null
          notes?: string | null
          open_constraints?: number | null
          planned_activities?: number | null
          planning_meeting_date?: string | null
          ppc_percentage?: number | null
          project_id?: string
          reliability_index?: number | null
          resolved_constraints?: number | null
          snapshot_date?: string | null
          total_constraints?: number | null
          variance_reasons?: Json | null
          variance_summary?: Json | null
          week_end_date?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "look_ahead_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "look_ahead_snapshots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "look_ahead_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "look_ahead_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "look_ahead_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      look_ahead_templates: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          default_crew_size: number | null
          default_duration_days: number | null
          default_labor_hours: number | null
          description: string | null
          id: string
          is_active: boolean | null
          template_name: string
          trade: string | null
          typical_constraints: Json | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          default_crew_size?: number | null
          default_duration_days?: number | null
          default_labor_hours?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          template_name: string
          trade?: string | null
          typical_constraints?: Json | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          default_crew_size?: number | null
          default_duration_days?: number | null
          default_labor_hours?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          template_name?: string
          trade?: string | null
          typical_constraints?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "look_ahead_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "look_ahead_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      material_received: {
        Row: {
          condition: string | null
          condition_notes: string | null
          created_at: string | null
          created_by: string | null
          daily_report_delivery_id: string | null
          deleted_at: string | null
          delivery_date: string
          delivery_ticket_number: string | null
          delivery_time: string | null
          id: string
          inspected_at: string | null
          inspected_by: string | null
          material_description: string
          notes: string | null
          po_number: string | null
          project_id: string
          quantity: string | null
          received_by: string | null
          status: string | null
          storage_location: string | null
          submittal_procurement_id: string | null
          unit: string | null
          updated_at: string | null
          vendor: string | null
          vendor_contact: string | null
        }
        Insert: {
          condition?: string | null
          condition_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_report_delivery_id?: string | null
          deleted_at?: string | null
          delivery_date: string
          delivery_ticket_number?: string | null
          delivery_time?: string | null
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          material_description: string
          notes?: string | null
          po_number?: string | null
          project_id: string
          quantity?: string | null
          received_by?: string | null
          status?: string | null
          storage_location?: string | null
          submittal_procurement_id?: string | null
          unit?: string | null
          updated_at?: string | null
          vendor?: string | null
          vendor_contact?: string | null
        }
        Update: {
          condition?: string | null
          condition_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_report_delivery_id?: string | null
          deleted_at?: string | null
          delivery_date?: string
          delivery_ticket_number?: string | null
          delivery_time?: string | null
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          material_description?: string
          notes?: string | null
          po_number?: string | null
          project_id?: string
          quantity?: string | null
          received_by?: string | null
          status?: string | null
          storage_location?: string | null
          submittal_procurement_id?: string | null
          unit?: string | null
          updated_at?: string | null
          vendor?: string | null
          vendor_contact?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_received_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_received_daily_report_delivery_id_fkey"
            columns: ["daily_report_delivery_id"]
            isOneToOne: false
            referencedRelation: "daily_report_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_received_inspected_by_fkey"
            columns: ["inspected_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_received_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_received_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "material_received_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_received_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_received_submittal_procurement_id_fkey"
            columns: ["submittal_procurement_id"]
            isOneToOne: false
            referencedRelation: "material_received_with_details"
            referencedColumns: ["submittal_id"]
          },
          {
            foreignKeyName: "material_received_submittal_procurement_id_fkey"
            columns: ["submittal_procurement_id"]
            isOneToOne: false
            referencedRelation: "submittal_procurement"
            referencedColumns: ["id"]
          },
        ]
      }
      material_received_photos: {
        Row: {
          caption: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          material_received_id: string
          photo_type: string | null
          photo_url: string
          taken_at: string | null
          taken_by: string | null
          thumbnail_url: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          material_received_id: string
          photo_type?: string | null
          photo_url: string
          taken_at?: string | null
          taken_by?: string | null
          thumbnail_url?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          material_received_id?: string
          photo_type?: string | null
          photo_url?: string
          taken_at?: string | null
          taken_by?: string | null
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_received_photos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_received_photos_material_received_id_fkey"
            columns: ["material_received_id"]
            isOneToOne: false
            referencedRelation: "material_received"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_received_photos_material_received_id_fkey"
            columns: ["material_received_id"]
            isOneToOne: false
            referencedRelation: "material_received_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_received_photos_taken_by_fkey"
            columns: ["taken_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_action_items: {
        Row: {
          assigned_to_name: string | null
          assigned_to_user_id: string | null
          assignee_company: string | null
          assignee_id: string | null
          assignee_name: string | null
          company_id: string | null
          completed_date: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string
          due_date: string | null
          id: string
          item_number: number | null
          item_order: number | null
          meeting_id: string
          notes: string | null
          priority: string | null
          project_id: string | null
          status: string | null
          task_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to_name?: string | null
          assigned_to_user_id?: string | null
          assignee_company?: string | null
          assignee_id?: string | null
          assignee_name?: string | null
          company_id?: string | null
          completed_date?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description: string
          due_date?: string | null
          id?: string
          item_number?: number | null
          item_order?: number | null
          meeting_id: string
          notes?: string | null
          priority?: string | null
          project_id?: string | null
          status?: string | null
          task_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to_name?: string | null
          assigned_to_user_id?: string | null
          assignee_company?: string | null
          assignee_id?: string | null
          assignee_name?: string | null
          company_id?: string | null
          completed_date?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          due_date?: string | null
          id?: string
          item_number?: number | null
          item_order?: number | null
          meeting_id?: string
          notes?: string | null
          priority?: string | null
          project_id?: string | null
          status?: string | null
          task_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_action_items_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_items_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_items_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "upcoming_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "meeting_action_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_agenda_items: {
        Row: {
          created_at: string | null
          description: string | null
          discussion_notes: string | null
          duration_minutes: number | null
          id: string
          item_number: number
          meeting_id: string
          presenter_id: string | null
          presenter_name: string | null
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          discussion_notes?: string | null
          duration_minutes?: number | null
          id?: string
          item_number: number
          meeting_id: string
          presenter_id?: string | null
          presenter_name?: string | null
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          discussion_notes?: string | null
          duration_minutes?: number | null
          id?: string
          item_number?: number
          meeting_id?: string
          presenter_id?: string | null
          presenter_name?: string | null
          sort_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_agenda_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_agenda_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "upcoming_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_agenda_items_presenter_id_fkey"
            columns: ["presenter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_attachments: {
        Row: {
          attachment_type: string | null
          created_at: string | null
          description: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          meeting_id: string
          uploaded_by: string | null
        }
        Insert: {
          attachment_type?: string | null
          created_at?: string | null
          description?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          meeting_id: string
          uploaded_by?: string | null
        }
        Update: {
          attachment_type?: string | null
          created_at?: string | null
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          meeting_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attachments_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attachments_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "upcoming_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_attendees: {
        Row: {
          arrival_time: string | null
          attendance_status: string | null
          attended: boolean | null
          attendee_email: string | null
          company: string | null
          created_at: string | null
          departure_time: string | null
          email: string | null
          id: string
          is_required: boolean | null
          meeting_id: string
          name: string
          notes: string | null
          response_date: string | null
          role: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          arrival_time?: string | null
          attendance_status?: string | null
          attended?: boolean | null
          attendee_email?: string | null
          company?: string | null
          created_at?: string | null
          departure_time?: string | null
          email?: string | null
          id?: string
          is_required?: boolean | null
          meeting_id: string
          name: string
          notes?: string | null
          response_date?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          arrival_time?: string | null
          attendance_status?: string | null
          attended?: boolean | null
          attendee_email?: string | null
          company?: string | null
          created_at?: string | null
          departure_time?: string | null
          email?: string | null
          id?: string
          is_required?: boolean | null
          meeting_id?: string
          name?: string
          notes?: string | null
          response_date?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendees_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendees_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "upcoming_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_notes: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          meeting_id: string
          note_order: number | null
          note_type: string | null
          section_title: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          meeting_id: string
          note_order?: number | null
          note_type?: string | null
          section_title?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          meeting_id?: string
          note_order?: number | null
          note_type?: string | null
          section_title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_notes_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_notes_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "upcoming_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_templates: {
        Row: {
          agenda_template: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          default_action_items: Json | null
          default_duration: number | null
          default_location: string | null
          description: string | null
          id: string
          is_active: boolean | null
          meeting_type: string | null
          name: string
          notes_template: Json | null
          updated_at: string | null
        }
        Insert: {
          agenda_template?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          default_action_items?: Json | null
          default_duration?: number | null
          default_location?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          meeting_type?: string | null
          name: string
          notes_template?: Json | null
          updated_at?: string | null
        }
        Update: {
          agenda_template?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          default_action_items?: Json | null
          default_duration?: number | null
          default_location?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          meeting_type?: string | null
          name?: string
          notes_template?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          action_items: Json | null
          agenda: string | null
          attendees: Json | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          decisions: string | null
          deleted_at: string | null
          discussion_notes: string | null
          distributed_to: string[] | null
          duration_minutes: number | null
          id: string
          is_recurring: boolean | null
          location: string | null
          meeting_date: string
          meeting_name: string | null
          meeting_time: string | null
          meeting_type: string
          minutes_pdf_url: string | null
          minutes_published: boolean | null
          minutes_published_at: string | null
          minutes_published_by: string | null
          minutes_text: string | null
          organizer_id: string | null
          parent_meeting_id: string | null
          project_id: string
          recurrence_rule: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["meeting_status"] | null
          template_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          action_items?: Json | null
          agenda?: string | null
          attendees?: Json | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          decisions?: string | null
          deleted_at?: string | null
          discussion_notes?: string | null
          distributed_to?: string[] | null
          duration_minutes?: number | null
          id?: string
          is_recurring?: boolean | null
          location?: string | null
          meeting_date: string
          meeting_name?: string | null
          meeting_time?: string | null
          meeting_type: string
          minutes_pdf_url?: string | null
          minutes_published?: boolean | null
          minutes_published_at?: string | null
          minutes_published_by?: string | null
          minutes_text?: string | null
          organizer_id?: string | null
          parent_meeting_id?: string | null
          project_id: string
          recurrence_rule?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["meeting_status"] | null
          template_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          action_items?: Json | null
          agenda?: string | null
          attendees?: Json | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          decisions?: string | null
          deleted_at?: string | null
          discussion_notes?: string | null
          distributed_to?: string[] | null
          duration_minutes?: number | null
          id?: string
          is_recurring?: boolean | null
          location?: string | null
          meeting_date?: string
          meeting_name?: string | null
          meeting_time?: string | null
          meeting_type?: string
          minutes_pdf_url?: string | null
          minutes_published?: boolean | null
          minutes_published_at?: string | null
          minutes_published_by?: string | null
          minutes_text?: string | null
          organizer_id?: string | null
          parent_meeting_id?: string | null
          project_id?: string
          recurrence_rule?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["meeting_status"] | null
          template_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_minutes_published_by_fkey"
            columns: ["minutes_published_by"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_minutes_published_by_fkey"
            columns: ["minutes_published_by"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_parent_meeting_id_fkey"
            columns: ["parent_meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_parent_meeting_id_fkey"
            columns: ["parent_meeting_id"]
            isOneToOne: false
            referencedRelation: "upcoming_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "meeting_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      message_read_receipts: {
        Row: {
          id: string
          message_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_read_receipts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_read_receipts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string | null
          created_at: string | null
          deleted_at: string | null
          from_user_id: string
          id: string
          is_read: boolean | null
          priority: string | null
          read_at: string | null
          sender_id: string | null
          subject: string | null
          to_user_ids: string[] | null
          updated_at: string | null
        }
        Insert: {
          body: string
          conversation_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          from_user_id: string
          id?: string
          is_read?: boolean | null
          priority?: string | null
          read_at?: string | null
          sender_id?: string | null
          subject?: string | null
          to_user_ids?: string[] | null
          updated_at?: string | null
        }
        Update: {
          body?: string
          conversation_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          from_user_id?: string
          id?: string
          is_read?: boolean | null
          priority?: string | null
          read_at?: string | null
          sender_id?: string | null
          subject?: string | null
          to_user_ids?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_backup_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          salt: string
          used: boolean
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          salt: string
          used?: boolean
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          salt?: string
          used?: boolean
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mfa_backup_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mfa_backup_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          direction: string
          document_url: string | null
          from_party: string | null
          id: string
          is_critical: boolean | null
          notes: string | null
          notice_date: string
          notice_type: string
          project_id: string
          received_date: string | null
          reference_number: string | null
          response_date: string | null
          response_document_url: string | null
          response_due_date: string | null
          response_required: boolean | null
          response_status: string | null
          status: string | null
          subject: string
          to_party: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          direction: string
          document_url?: string | null
          from_party?: string | null
          id?: string
          is_critical?: boolean | null
          notes?: string | null
          notice_date: string
          notice_type: string
          project_id: string
          received_date?: string | null
          reference_number?: string | null
          response_date?: string | null
          response_document_url?: string | null
          response_due_date?: string | null
          response_required?: boolean | null
          response_status?: string | null
          status?: string | null
          subject: string
          to_party?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          direction?: string
          document_url?: string | null
          from_party?: string | null
          id?: string
          is_critical?: boolean | null
          notes?: string | null
          notice_date?: string
          notice_type?: string
          project_id?: string
          received_date?: string | null
          reference_number?: string | null
          response_date?: string | null
          response_document_url?: string | null
          response_due_date?: string | null
          response_required?: boolean | null
          response_status?: string | null
          status?: string | null
          subject?: string
          to_party?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "notices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          read_at: string | null
          related_to_id: string | null
          related_to_type: string | null
          title: string
          type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          read_at?: string | null
          related_to_id?: string | null
          related_to_type?: string | null
          title: string
          type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          read_at?: string | null
          related_to_id?: string | null
          related_to_type?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_application_history: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string | null
          field_changed: string | null
          id: string
          new_value: string | null
          notes: string | null
          old_value: string | null
          payment_application_id: string
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by?: string | null
          field_changed?: string | null
          id?: string
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
          payment_application_id: string
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string | null
          field_changed?: string | null
          id?: string
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
          payment_application_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_application_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_application_history_payment_application_id_fkey"
            columns: ["payment_application_id"]
            isOneToOne: false
            referencedRelation: "payment_application_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_application_history_payment_application_id_fkey"
            columns: ["payment_application_id"]
            isOneToOne: false
            referencedRelation: "payment_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_applications: {
        Row: {
          application_number: number
          approved_at: string | null
          approved_by: string | null
          architect_signature_date: string | null
          architect_signature_url: string | null
          balance_to_finish: number | null
          company_id: string
          contract_sum_to_date: number | null
          contractor_signature_date: string | null
          contractor_signature_url: string | null
          created_at: string | null
          created_by: string | null
          current_payment_due: number | null
          deleted_at: string | null
          id: string
          less_previous_certificates: number
          net_change_orders: number
          notes: string | null
          original_contract_sum: number
          owner_signature_date: string | null
          owner_signature_url: string | null
          paid_at: string | null
          payment_received_amount: number | null
          payment_reference: string | null
          percent_complete: number | null
          period_to: string
          project_id: string
          rejection_reason: string | null
          retainage_from_completed: number
          retainage_from_stored: number
          retainage_percent: number
          retainage_release: number
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          submitted_by: string | null
          total_completed_and_stored: number | null
          total_completed_previous: number
          total_completed_this_period: number
          total_earned_less_retainage: number | null
          total_materials_stored: number
          total_retainage: number | null
          updated_at: string | null
        }
        Insert: {
          application_number: number
          approved_at?: string | null
          approved_by?: string | null
          architect_signature_date?: string | null
          architect_signature_url?: string | null
          balance_to_finish?: number | null
          company_id: string
          contract_sum_to_date?: number | null
          contractor_signature_date?: string | null
          contractor_signature_url?: string | null
          created_at?: string | null
          created_by?: string | null
          current_payment_due?: number | null
          deleted_at?: string | null
          id?: string
          less_previous_certificates?: number
          net_change_orders?: number
          notes?: string | null
          original_contract_sum?: number
          owner_signature_date?: string | null
          owner_signature_url?: string | null
          paid_at?: string | null
          payment_received_amount?: number | null
          payment_reference?: string | null
          percent_complete?: number | null
          period_to: string
          project_id: string
          rejection_reason?: string | null
          retainage_from_completed?: number
          retainage_from_stored?: number
          retainage_percent?: number
          retainage_release?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          total_completed_and_stored?: number | null
          total_completed_previous?: number
          total_completed_this_period?: number
          total_earned_less_retainage?: number | null
          total_materials_stored?: number
          total_retainage?: number | null
          updated_at?: string | null
        }
        Update: {
          application_number?: number
          approved_at?: string | null
          approved_by?: string | null
          architect_signature_date?: string | null
          architect_signature_url?: string | null
          balance_to_finish?: number | null
          company_id?: string
          contract_sum_to_date?: number | null
          contractor_signature_date?: string | null
          contractor_signature_url?: string | null
          created_at?: string | null
          created_by?: string | null
          current_payment_due?: number | null
          deleted_at?: string | null
          id?: string
          less_previous_certificates?: number
          net_change_orders?: number
          notes?: string | null
          original_contract_sum?: number
          owner_signature_date?: string | null
          owner_signature_url?: string | null
          paid_at?: string | null
          payment_received_amount?: number | null
          payment_reference?: string | null
          percent_complete?: number | null
          period_to?: string
          project_id?: string
          rejection_reason?: string | null
          retainage_from_completed?: number
          retainage_from_stored?: number
          retainage_percent?: number
          retainage_release?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          total_completed_and_stored?: number | null
          total_completed_previous?: number
          total_completed_this_period?: number
          total_earned_less_retainage?: number | null
          total_materials_stored?: number
          total_retainage?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_applications_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_applications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_applications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_applications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_applications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "payment_applications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_applications_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string
          code: string
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_dangerous: boolean | null
          name: string
          requires_project_assignment: boolean | null
          subcategory: string | null
        }
        Insert: {
          category: string
          code: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_dangerous?: boolean | null
          name: string
          requires_project_assignment?: boolean | null
          subcategory?: string | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_dangerous?: boolean | null
          name?: string
          requires_project_assignment?: boolean | null
          subcategory?: string | null
        }
        Relationships: []
      }
      permits: {
        Row: {
          agency_contact: string | null
          agency_phone: string | null
          application_date: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          expiration_date: string | null
          id: string
          issue_date: string | null
          issuing_agency: string | null
          notes: string | null
          permit_document_url: string | null
          permit_name: string
          permit_number: string | null
          permit_type: string
          project_id: string
          renewal_date: string | null
          renewal_reminder_days_before: number | null
          renewal_reminder_sent: boolean | null
          requires_inspections: boolean | null
          status: string | null
          updated_at: string | null
          work_cannot_proceed_without: boolean | null
        }
        Insert: {
          agency_contact?: string | null
          agency_phone?: string | null
          application_date?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          expiration_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_agency?: string | null
          notes?: string | null
          permit_document_url?: string | null
          permit_name: string
          permit_number?: string | null
          permit_type: string
          project_id: string
          renewal_date?: string | null
          renewal_reminder_days_before?: number | null
          renewal_reminder_sent?: boolean | null
          requires_inspections?: boolean | null
          status?: string | null
          updated_at?: string | null
          work_cannot_proceed_without?: boolean | null
        }
        Update: {
          agency_contact?: string | null
          agency_phone?: string | null
          application_date?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          expiration_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_agency?: string | null
          notes?: string | null
          permit_document_url?: string | null
          permit_name?: string
          permit_number?: string | null
          permit_type?: string
          project_id?: string
          renewal_date?: string | null
          renewal_reminder_days_before?: number | null
          renewal_reminder_sent?: boolean | null
          requires_inspections?: boolean | null
          status?: string | null
          updated_at?: string | null
          work_cannot_proceed_without?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "permits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "permits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_access_log: {
        Row: {
          accessed_at: string | null
          action: string
          context: string | null
          device_type: string | null
          id: string
          ip_address: unknown
          photo_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accessed_at?: string | null
          action: string
          context?: string | null
          device_type?: string | null
          id?: string
          ip_address?: unknown
          photo_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accessed_at?: string | null
          action?: string
          context?: string | null
          device_type?: string | null
          id?: string
          ip_address?: unknown
          photo_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_access_log_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_access_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_annotations: {
        Row: {
          annotation_data: Json
          annotation_type: string
          color: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          fill_color: string | null
          id: string
          is_visible: boolean | null
          layer: string | null
          linked_entity_id: string | null
          linked_entity_type: string | null
          opacity: number | null
          photo_id: string
          stroke_width: number | null
          updated_at: string | null
        }
        Insert: {
          annotation_data: Json
          annotation_type: string
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          fill_color?: string | null
          id?: string
          is_visible?: boolean | null
          layer?: string | null
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          opacity?: number | null
          photo_id: string
          stroke_width?: number | null
          updated_at?: string | null
        }
        Update: {
          annotation_data?: Json
          annotation_type?: string
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          fill_color?: string | null
          id?: string
          is_visible?: boolean | null
          layer?: string | null
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          opacity?: number | null
          photo_id?: string
          stroke_width?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photo_annotations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_annotations_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_collection_items: {
        Row: {
          added_at: string | null
          added_by: string | null
          collection_id: string
          custom_caption: string | null
          id: string
          photo_id: string
          sort_order: number | null
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          collection_id: string
          custom_caption?: string | null
          id?: string
          photo_id: string
          sort_order?: number | null
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          collection_id?: string
          custom_caption?: string | null
          id?: string
          photo_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "photo_collection_items_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "photo_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_collection_items_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_collections: {
        Row: {
          collection_type: string
          cover_photo_id: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_pinned: boolean | null
          is_public: boolean | null
          location_area: string | null
          location_building: string | null
          location_floor: string | null
          location_grid: string | null
          location_name: string | null
          name: string
          photo_count: number | null
          project_id: string
          smart_criteria: Json | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          collection_type?: string
          cover_photo_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_pinned?: boolean | null
          is_public?: boolean | null
          location_area?: string | null
          location_building?: string | null
          location_floor?: string | null
          location_grid?: string | null
          location_name?: string | null
          name: string
          photo_count?: number | null
          project_id: string
          smart_criteria?: Json | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          collection_type?: string
          cover_photo_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_pinned?: boolean | null
          is_public?: boolean | null
          location_area?: string | null
          location_building?: string | null
          location_floor?: string | null
          location_grid?: string | null
          location_name?: string | null
          name?: string
          photo_count?: number | null
          project_id?: string
          smart_criteria?: Json | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photo_collections_cover_photo_id_fkey"
            columns: ["cover_photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_collections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_collections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_collections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "photo_collections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_comparisons: {
        Row: {
          after_photo_id: string
          area: string | null
          before_photo_id: string
          building: string | null
          comparison_type: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          daily_report_id: string | null
          deleted_at: string | null
          description: string | null
          floor: string | null
          grid: string | null
          id: string
          project_id: string
          punch_item_id: string | null
          status: string | null
          title: string
          updated_at: string | null
          workflow_item_id: string | null
        }
        Insert: {
          after_photo_id: string
          area?: string | null
          before_photo_id: string
          building?: string | null
          comparison_type?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_report_id?: string | null
          deleted_at?: string | null
          description?: string | null
          floor?: string | null
          grid?: string | null
          id?: string
          project_id: string
          punch_item_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          workflow_item_id?: string | null
        }
        Update: {
          after_photo_id?: string
          area?: string | null
          before_photo_id?: string
          building?: string | null
          comparison_type?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_report_id?: string | null
          deleted_at?: string | null
          description?: string | null
          floor?: string | null
          grid?: string | null
          id?: string
          project_id?: string
          punch_item_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          workflow_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photo_comparisons_after_photo_id_fkey"
            columns: ["after_photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_comparisons_before_photo_id_fkey"
            columns: ["before_photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_comparisons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_comparisons_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_comparisons_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "material_received_with_details"
            referencedColumns: ["daily_report_id"]
          },
          {
            foreignKeyName: "photo_comparisons_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_comparisons_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "photo_comparisons_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_comparisons_punch_item_id_fkey"
            columns: ["punch_item_id"]
            isOneToOne: false
            referencedRelation: "punch_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_comparisons_workflow_item_id_fkey"
            columns: ["workflow_item_id"]
            isOneToOne: false
            referencedRelation: "workflow_items"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_location_templates: {
        Row: {
          area: string | null
          building: string | null
          category: string | null
          color: string | null
          created_at: string | null
          created_by: string | null
          day_of_month: number | null
          day_of_week: number | null
          deleted_at: string | null
          description: string | null
          floor: string | null
          frequency: string
          gps_radius_meters: number | null
          grid_reference: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_required: boolean | null
          latitude: number | null
          longitude: number | null
          min_photos_required: number | null
          name: string
          photo_instructions: string | null
          project_id: string
          reference_photo_id: string | null
          reference_photo_url: string | null
          required_angle: string | null
          sort_order: number | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          area?: string | null
          building?: string | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          deleted_at?: string | null
          description?: string | null
          floor?: string | null
          frequency?: string
          gps_radius_meters?: number | null
          grid_reference?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          latitude?: number | null
          longitude?: number | null
          min_photos_required?: number | null
          name: string
          photo_instructions?: string | null
          project_id: string
          reference_photo_id?: string | null
          reference_photo_url?: string | null
          required_angle?: string | null
          sort_order?: number | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          area?: string | null
          building?: string | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          deleted_at?: string | null
          description?: string | null
          floor?: string | null
          frequency?: string
          gps_radius_meters?: number | null
          grid_reference?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          latitude?: number | null
          longitude?: number | null
          min_photos_required?: number | null
          name?: string
          photo_instructions?: string | null
          project_id?: string
          reference_photo_id?: string | null
          reference_photo_url?: string | null
          required_angle?: string | null
          sort_order?: number | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photo_location_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_location_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_location_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "photo_location_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_location_templates_reference_photo_id_fkey"
            columns: ["reference_photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_progress_series: {
        Row: {
          area: string | null
          building: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          floor: string | null
          id: string
          is_featured: boolean | null
          name: string
          photo_ids: string[] | null
          project_id: string
          template_id: string | null
          thumbnail_photo_id: string | null
          updated_at: string | null
        }
        Insert: {
          area?: string | null
          building?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          floor?: string | null
          id?: string
          is_featured?: boolean | null
          name: string
          photo_ids?: string[] | null
          project_id: string
          template_id?: string | null
          thumbnail_photo_id?: string | null
          updated_at?: string | null
        }
        Update: {
          area?: string | null
          building?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          floor?: string | null
          id?: string
          is_featured?: boolean | null
          name?: string
          photo_ids?: string[] | null
          project_id?: string
          template_id?: string | null
          thumbnail_photo_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photo_progress_series_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_progress_series_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_progress_series_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "photo_progress_series_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_progress_series_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "photo_location_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_progress_series_thumbnail_photo_id_fkey"
            columns: ["thumbnail_photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_requirements: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          completed_photo_ids: string[] | null
          created_at: string | null
          due_date: string
          due_time: string | null
          id: string
          overdue_notification_sent_at: string | null
          photos_count: number | null
          project_id: string
          reminder_sent_at: string | null
          review_notes: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          skip_reason: string | null
          skipped_by: string | null
          status: string
          template_id: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          completed_photo_ids?: string[] | null
          created_at?: string | null
          due_date: string
          due_time?: string | null
          id?: string
          overdue_notification_sent_at?: string | null
          photos_count?: number | null
          project_id: string
          reminder_sent_at?: string | null
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          skip_reason?: string | null
          skipped_by?: string | null
          status?: string
          template_id: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          completed_photo_ids?: string[] | null
          created_at?: string | null
          due_date?: string
          due_time?: string | null
          id?: string
          overdue_notification_sent_at?: string | null
          photos_count?: number | null
          project_id?: string
          reminder_sent_at?: string | null
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          skip_reason?: string | null
          skipped_by?: string | null
          status?: string
          template_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photo_requirements_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "photo_requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_requirements_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_requirements_skipped_by_fkey"
            columns: ["skipped_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_requirements_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "photo_location_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          ai_description: string | null
          ai_objects_detected: Json | null
          ai_tags: string[] | null
          altitude: number | null
          aperture: string | null
          area: string | null
          building: string | null
          camera_make: string | null
          camera_model: string | null
          caption: string | null
          captured_at: string | null
          checklist_response_id: string | null
          created_at: string | null
          created_by: string | null
          daily_report_id: string | null
          deleted_at: string | null
          description: string | null
          device_os: string | null
          device_type: string | null
          exposure_time: string | null
          file_name: string
          file_size: number | null
          file_url: string
          flash_used: boolean | null
          floor: string | null
          focal_length: number | null
          gps_accuracy: number | null
          grid: string | null
          heading: number | null
          height: number | null
          humidity: number | null
          id: string
          is_360: boolean | null
          is_after_photo: boolean | null
          is_before_photo: boolean | null
          is_pinned: boolean | null
          iso: number | null
          latitude: number | null
          linked_items: Json | null
          location_notes: string | null
          longitude: number | null
          ocr_confidence: number | null
          ocr_text: string | null
          orientation: number | null
          paired_photo_id: string | null
          photo_category: string | null
          project_id: string
          project_phase: string | null
          punch_item_id: string | null
          review_notes: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          safety_incident_id: string | null
          source: string | null
          tags: string[] | null
          temperature: number | null
          thumbnail_url: string | null
          updated_at: string | null
          weather_condition: string | null
          width: number | null
          workflow_item_id: string | null
        }
        Insert: {
          ai_description?: string | null
          ai_objects_detected?: Json | null
          ai_tags?: string[] | null
          altitude?: number | null
          aperture?: string | null
          area?: string | null
          building?: string | null
          camera_make?: string | null
          camera_model?: string | null
          caption?: string | null
          captured_at?: string | null
          checklist_response_id?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_report_id?: string | null
          deleted_at?: string | null
          description?: string | null
          device_os?: string | null
          device_type?: string | null
          exposure_time?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          flash_used?: boolean | null
          floor?: string | null
          focal_length?: number | null
          gps_accuracy?: number | null
          grid?: string | null
          heading?: number | null
          height?: number | null
          humidity?: number | null
          id?: string
          is_360?: boolean | null
          is_after_photo?: boolean | null
          is_before_photo?: boolean | null
          is_pinned?: boolean | null
          iso?: number | null
          latitude?: number | null
          linked_items?: Json | null
          location_notes?: string | null
          longitude?: number | null
          ocr_confidence?: number | null
          ocr_text?: string | null
          orientation?: number | null
          paired_photo_id?: string | null
          photo_category?: string | null
          project_id: string
          project_phase?: string | null
          punch_item_id?: string | null
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          safety_incident_id?: string | null
          source?: string | null
          tags?: string[] | null
          temperature?: number | null
          thumbnail_url?: string | null
          updated_at?: string | null
          weather_condition?: string | null
          width?: number | null
          workflow_item_id?: string | null
        }
        Update: {
          ai_description?: string | null
          ai_objects_detected?: Json | null
          ai_tags?: string[] | null
          altitude?: number | null
          aperture?: string | null
          area?: string | null
          building?: string | null
          camera_make?: string | null
          camera_model?: string | null
          caption?: string | null
          captured_at?: string | null
          checklist_response_id?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_report_id?: string | null
          deleted_at?: string | null
          description?: string | null
          device_os?: string | null
          device_type?: string | null
          exposure_time?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          flash_used?: boolean | null
          floor?: string | null
          focal_length?: number | null
          gps_accuracy?: number | null
          grid?: string | null
          heading?: number | null
          height?: number | null
          humidity?: number | null
          id?: string
          is_360?: boolean | null
          is_after_photo?: boolean | null
          is_before_photo?: boolean | null
          is_pinned?: boolean | null
          iso?: number | null
          latitude?: number | null
          linked_items?: Json | null
          location_notes?: string | null
          longitude?: number | null
          ocr_confidence?: number | null
          ocr_text?: string | null
          orientation?: number | null
          paired_photo_id?: string | null
          photo_category?: string | null
          project_id?: string
          project_phase?: string | null
          punch_item_id?: string | null
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          safety_incident_id?: string | null
          source?: string | null
          tags?: string[] | null
          temperature?: number | null
          thumbnail_url?: string | null
          updated_at?: string | null
          weather_condition?: string | null
          width?: number | null
          workflow_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "material_received_with_details"
            referencedColumns: ["daily_report_id"]
          },
          {
            foreignKeyName: "photos_paired_photo_id_fkey"
            columns: ["paired_photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_punch_item_id_fkey"
            columns: ["punch_item_id"]
            isOneToOne: false
            referencedRelation: "punch_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_safety_incident_id_fkey"
            columns: ["safety_incident_id"]
            isOneToOne: false
            referencedRelation: "osha_300_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_safety_incident_id_fkey"
            columns: ["safety_incident_id"]
            isOneToOne: false
            referencedRelation: "safety_incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_workflow_item_id_fkey"
            columns: ["workflow_item_id"]
            isOneToOne: false
            referencedRelation: "workflow_items"
            referencedColumns: ["id"]
          },
        ]
      }
      project_budgets: {
        Row: {
          actual_cost: number | null
          approved_changes: number | null
          committed_cost: number | null
          cost_code_id: string
          created_at: string | null
          created_by: string | null
          estimated_cost_at_completion: number | null
          id: string
          notes: string | null
          original_budget: number
          project_id: string
          updated_at: string | null
        }
        Insert: {
          actual_cost?: number | null
          approved_changes?: number | null
          committed_cost?: number | null
          cost_code_id: string
          created_at?: string | null
          created_by?: string | null
          estimated_cost_at_completion?: number | null
          id?: string
          notes?: string | null
          original_budget?: number
          project_id: string
          updated_at?: string | null
        }
        Update: {
          actual_cost?: number | null
          approved_changes?: number | null
          committed_cost?: number | null
          cost_code_id?: string
          created_at?: string | null
          created_by?: string | null
          estimated_cost_at_completion?: number | null
          id?: string
          notes?: string | null
          original_budget?: number
          project_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_budgets_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budgets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_template_checklists: {
        Row: {
          auto_create: boolean | null
          checklist_template_id: string
          created_at: string | null
          id: string
          is_required: boolean | null
          template_id: string
          trigger_phase: string | null
        }
        Insert: {
          auto_create?: boolean | null
          checklist_template_id: string
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          template_id: string
          trigger_phase?: string | null
        }
        Update: {
          auto_create?: boolean | null
          checklist_template_id?: string
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          template_id?: string
          trigger_phase?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_template_checklists_checklist_template_id_fkey"
            columns: ["checklist_template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_template_checklists_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_template_distribution_lists: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          list_name: string
          list_type: string
          members: Json
          template_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          list_name: string
          list_type: string
          members?: Json
          template_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          list_name?: string
          list_type?: string
          members?: Json
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_template_distribution_lists_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_template_phases: {
        Row: {
          created_at: string | null
          depends_on_phase_id: string | null
          description: string | null
          estimated_duration_days: number | null
          id: string
          name: string
          phase_order: number
          template_id: string
        }
        Insert: {
          created_at?: string | null
          depends_on_phase_id?: string | null
          description?: string | null
          estimated_duration_days?: number | null
          id?: string
          name: string
          phase_order: number
          template_id: string
        }
        Update: {
          created_at?: string | null
          depends_on_phase_id?: string | null
          description?: string | null
          estimated_duration_days?: number | null
          id?: string
          name?: string
          phase_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_template_phases_depends_on_phase_id_fkey"
            columns: ["depends_on_phase_id"]
            isOneToOne: false
            referencedRelation: "project_template_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_template_phases_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_template_workflows: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          template_id: string
          workflow_id: string
          workflow_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          template_id: string
          workflow_id: string
          workflow_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          template_id?: string
          workflow_id?: string
          workflow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_template_workflows_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_template_workflows_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "approval_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      project_templates: {
        Row: {
          category: string | null
          color: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          custom_fields: Json | null
          default_roles: Json | null
          default_settings: Json
          deleted_at: string | null
          description: string | null
          enabled_features: Json | null
          folder_structure: Json | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_system_template: boolean | null
          last_used_at: string | null
          name: string
          notification_rules: Json | null
          numbering_config: Json | null
          tags: string[] | null
          updated_at: string | null
          usage_count: number | null
          visibility: string | null
        }
        Insert: {
          category?: string | null
          color?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          custom_fields?: Json | null
          default_roles?: Json | null
          default_settings?: Json
          deleted_at?: string | null
          description?: string | null
          enabled_features?: Json | null
          folder_structure?: Json | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_system_template?: boolean | null
          last_used_at?: string | null
          name: string
          notification_rules?: Json | null
          numbering_config?: Json | null
          tags?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
          visibility?: string | null
        }
        Update: {
          category?: string | null
          color?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          custom_fields?: Json | null
          default_roles?: Json | null
          default_settings?: Json
          deleted_at?: string | null
          description?: string | null
          enabled_features?: Json | null
          folder_structure?: Json | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_system_template?: boolean | null
          last_used_at?: string | null
          name?: string
          notification_rules?: Json | null
          numbering_config?: Json | null
          tags?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      project_users: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          can_approve: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          id: string
          project_id: string
          project_role: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          can_approve?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          id?: string
          project_id: string
          project_role?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          can_approve?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          id?: string
          project_id?: string
          project_role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_users_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_users_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_users_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_users_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string | null
          budget: number | null
          city: string | null
          company_id: string
          contract_value: number | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          end_date: string | null
          features_enabled: Json | null
          final_completion_date: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          project_number: string | null
          start_date: string | null
          state: string | null
          status: string | null
          substantial_completion_date: string | null
          template_id: string | null
          updated_at: string | null
          weather_units: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          budget?: number | null
          city?: string | null
          company_id: string
          contract_value?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          features_enabled?: Json | null
          final_completion_date?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          project_number?: string | null
          start_date?: string | null
          state?: string | null
          status?: string | null
          substantial_completion_date?: string | null
          template_id?: string | null
          updated_at?: string | null
          weather_units?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          budget?: number | null
          city?: string | null
          company_id?: string
          contract_value?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          features_enabled?: Json | null
          final_completion_date?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          project_number?: string | null
          start_date?: string | null
          state?: string | null
          status?: string | null
          substantial_completion_date?: string | null
          template_id?: string | null
          updated_at?: string | null
          weather_units?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      punch_items: {
        Row: {
          area: string | null
          assigned_to: string | null
          building: string | null
          completed_date: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          due_date: string | null
          floor: string | null
          id: string
          location: string | null
          location_notes: string | null
          marked_complete_at: string | null
          marked_complete_by: string | null
          number: number | null
          priority: string | null
          project_id: string
          punch_list_id: string | null
          rejection_notes: string | null
          room: string | null
          status: string | null
          subcontractor_id: string | null
          title: string
          trade: string
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
          verified_date: string | null
        }
        Insert: {
          area?: string | null
          assigned_to?: string | null
          building?: string | null
          completed_date?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          floor?: string | null
          id?: string
          location?: string | null
          location_notes?: string | null
          marked_complete_at?: string | null
          marked_complete_by?: string | null
          number?: number | null
          priority?: string | null
          project_id: string
          punch_list_id?: string | null
          rejection_notes?: string | null
          room?: string | null
          status?: string | null
          subcontractor_id?: string | null
          title: string
          trade: string
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
          verified_date?: string | null
        }
        Update: {
          area?: string | null
          assigned_to?: string | null
          building?: string | null
          completed_date?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          floor?: string | null
          id?: string
          location?: string | null
          location_notes?: string | null
          marked_complete_at?: string | null
          marked_complete_by?: string | null
          number?: number | null
          priority?: string | null
          project_id?: string
          punch_list_id?: string | null
          rejection_notes?: string | null
          room?: string | null
          status?: string | null
          subcontractor_id?: string | null
          title?: string
          trade?: string
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
          verified_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "punch_items_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_items_marked_complete_by_fkey"
            columns: ["marked_complete_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "punch_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_items_punch_list_id_fkey"
            columns: ["punch_list_id"]
            isOneToOne: false
            referencedRelation: "punch_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_items_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_items_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      punch_lists: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          project_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          project_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          project_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "punch_lists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_lists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_lists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "punch_lists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      qb_account_mappings: {
        Row: {
          company_id: string
          connection_id: string
          cost_code: string | null
          cost_code_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_default: boolean | null
          qb_account_id: string
          qb_account_name: string | null
          qb_account_number: string | null
          qb_account_type: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          connection_id: string
          cost_code?: string | null
          cost_code_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_default?: boolean | null
          qb_account_id: string
          qb_account_name?: string | null
          qb_account_number?: string | null
          qb_account_type?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          connection_id?: string
          cost_code?: string | null
          cost_code_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_default?: boolean | null
          qb_account_id?: string
          qb_account_name?: string | null
          qb_account_number?: string | null
          qb_account_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qb_account_mappings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qb_account_mappings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "qb_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qb_account_mappings_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qb_account_mappings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      qb_connections: {
        Row: {
          access_token: string | null
          auto_sync_enabled: boolean | null
          company_id: string
          company_name: string | null
          connection_error: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          is_sandbox: boolean | null
          last_connected_at: string | null
          last_sync_at: string | null
          realm_id: string
          refresh_token: string | null
          refresh_token_expires_at: string | null
          sync_frequency_hours: number | null
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          auto_sync_enabled?: boolean | null
          company_id: string
          company_name?: string | null
          connection_error?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_sandbox?: boolean | null
          last_connected_at?: string | null
          last_sync_at?: string | null
          realm_id: string
          refresh_token?: string | null
          refresh_token_expires_at?: string | null
          sync_frequency_hours?: number | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          auto_sync_enabled?: boolean | null
          company_id?: string
          company_name?: string | null
          connection_error?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_sandbox?: boolean | null
          last_connected_at?: string | null
          last_sync_at?: string | null
          realm_id?: string
          refresh_token?: string | null
          refresh_token_expires_at?: string | null
          sync_frequency_hours?: number | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qb_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qb_connections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      qb_entity_mappings: {
        Row: {
          company_id: string
          connection_id: string
          created_at: string | null
          id: string
          last_sync_error: string | null
          last_synced_at: string | null
          local_entity_id: string
          local_entity_type: string
          qb_entity_id: string
          qb_entity_type: Database["public"]["Enums"]["qb_entity_type"]
          qb_sync_token: string | null
          sync_status: Database["public"]["Enums"]["qb_sync_status"] | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          connection_id: string
          created_at?: string | null
          id?: string
          last_sync_error?: string | null
          last_synced_at?: string | null
          local_entity_id: string
          local_entity_type: string
          qb_entity_id: string
          qb_entity_type: Database["public"]["Enums"]["qb_entity_type"]
          qb_sync_token?: string | null
          sync_status?: Database["public"]["Enums"]["qb_sync_status"] | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          connection_id?: string
          created_at?: string | null
          id?: string
          last_sync_error?: string | null
          last_synced_at?: string | null
          local_entity_id?: string
          local_entity_type?: string
          qb_entity_id?: string
          qb_entity_type?: Database["public"]["Enums"]["qb_entity_type"]
          qb_sync_token?: string | null
          sync_status?: Database["public"]["Enums"]["qb_sync_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qb_entity_mappings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qb_entity_mappings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "qb_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      qb_pending_syncs: {
        Row: {
          attempt_count: number | null
          company_id: string
          connection_id: string
          created_at: string | null
          created_by: string | null
          direction: Database["public"]["Enums"]["qb_sync_direction"]
          id: string
          last_attempt_at: string | null
          last_error: string | null
          local_entity_id: string
          local_entity_type: string
          max_attempts: number | null
          priority: number | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["qb_sync_status"] | null
        }
        Insert: {
          attempt_count?: number | null
          company_id: string
          connection_id: string
          created_at?: string | null
          created_by?: string | null
          direction: Database["public"]["Enums"]["qb_sync_direction"]
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          local_entity_id: string
          local_entity_type: string
          max_attempts?: number | null
          priority?: number | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["qb_sync_status"] | null
        }
        Update: {
          attempt_count?: number | null
          company_id?: string
          connection_id?: string
          created_at?: string | null
          created_by?: string | null
          direction?: Database["public"]["Enums"]["qb_sync_direction"]
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          local_entity_id?: string
          local_entity_type?: string
          max_attempts?: number | null
          priority?: number | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["qb_sync_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "qb_pending_syncs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qb_pending_syncs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "qb_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qb_pending_syncs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      qb_sync_logs: {
        Row: {
          company_id: string
          completed_at: string | null
          connection_id: string
          direction: Database["public"]["Enums"]["qb_sync_direction"]
          duration_ms: number | null
          entity_type: Database["public"]["Enums"]["qb_entity_type"] | null
          error_details: Json | null
          error_message: string | null
          id: string
          initiated_by: string | null
          records_created: number | null
          records_failed: number | null
          records_processed: number | null
          records_updated: number | null
          request_summary: Json | null
          response_summary: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["qb_sync_status"]
          sync_type: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          connection_id: string
          direction: Database["public"]["Enums"]["qb_sync_direction"]
          duration_ms?: number | null
          entity_type?: Database["public"]["Enums"]["qb_entity_type"] | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          initiated_by?: string | null
          records_created?: number | null
          records_failed?: number | null
          records_processed?: number | null
          records_updated?: number | null
          request_summary?: Json | null
          response_summary?: Json | null
          started_at?: string | null
          status: Database["public"]["Enums"]["qb_sync_status"]
          sync_type: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          connection_id?: string
          direction?: Database["public"]["Enums"]["qb_sync_direction"]
          duration_ms?: number | null
          entity_type?: Database["public"]["Enums"]["qb_entity_type"] | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          initiated_by?: string | null
          records_created?: number | null
          records_failed?: number | null
          records_processed?: number | null
          records_updated?: number | null
          request_summary?: Json | null
          response_summary?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["qb_sync_status"]
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "qb_sync_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qb_sync_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "qb_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qb_sync_logs_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      report_field_definitions: {
        Row: {
          category: string | null
          created_at: string | null
          data_source: Database["public"]["Enums"]["report_data_source"]
          description: string | null
          display_name: string
          display_order: number | null
          field_name: string
          field_type: Database["public"]["Enums"]["report_field_type"]
          id: string
          is_default: boolean | null
          is_filterable: boolean | null
          is_groupable: boolean | null
          is_sortable: boolean | null
          join_path: string | null
          source_column: string | null
          source_table: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          data_source: Database["public"]["Enums"]["report_data_source"]
          description?: string | null
          display_name: string
          display_order?: number | null
          field_name: string
          field_type: Database["public"]["Enums"]["report_field_type"]
          id?: string
          is_default?: boolean | null
          is_filterable?: boolean | null
          is_groupable?: boolean | null
          is_sortable?: boolean | null
          join_path?: string | null
          source_column?: string | null
          source_table?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          data_source?: Database["public"]["Enums"]["report_data_source"]
          description?: string | null
          display_name?: string
          display_order?: number | null
          field_name?: string
          field_type?: Database["public"]["Enums"]["report_field_type"]
          id?: string
          is_default?: boolean | null
          is_filterable?: boolean | null
          is_groupable?: boolean | null
          is_sortable?: boolean | null
          join_path?: string | null
          source_column?: string | null
          source_table?: string | null
        }
        Relationships: []
      }
      report_template_fields: {
        Row: {
          aggregation:
            | Database["public"]["Enums"]["report_aggregation_type"]
            | null
          column_width: number | null
          created_at: string | null
          display_name: string
          display_order: number
          field_name: string
          field_type: Database["public"]["Enums"]["report_field_type"]
          format_string: string | null
          id: string
          is_visible: boolean | null
          template_id: string
        }
        Insert: {
          aggregation?:
            | Database["public"]["Enums"]["report_aggregation_type"]
            | null
          column_width?: number | null
          created_at?: string | null
          display_name: string
          display_order?: number
          field_name: string
          field_type: Database["public"]["Enums"]["report_field_type"]
          format_string?: string | null
          id?: string
          is_visible?: boolean | null
          template_id: string
        }
        Update: {
          aggregation?:
            | Database["public"]["Enums"]["report_aggregation_type"]
            | null
          column_width?: number | null
          created_at?: string | null
          display_name?: string
          display_order?: number
          field_name?: string
          field_type?: Database["public"]["Enums"]["report_field_type"]
          format_string?: string | null
          id?: string
          is_visible?: boolean | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_template_fields_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      report_template_filters: {
        Row: {
          created_at: string | null
          display_order: number | null
          field_name: string
          filter_group: number | null
          filter_value: Json | null
          id: string
          is_relative_date: boolean | null
          operator: Database["public"]["Enums"]["report_filter_operator"]
          relative_date_unit: string | null
          relative_date_value: number | null
          template_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          field_name: string
          filter_group?: number | null
          filter_value?: Json | null
          id?: string
          is_relative_date?: boolean | null
          operator: Database["public"]["Enums"]["report_filter_operator"]
          relative_date_unit?: string | null
          relative_date_value?: number | null
          template_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          field_name?: string
          filter_group?: number | null
          filter_value?: Json | null
          id?: string
          is_relative_date?: boolean | null
          operator?: Database["public"]["Enums"]["report_filter_operator"]
          relative_date_unit?: string | null
          relative_date_value?: number | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_template_filters_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      report_template_grouping: {
        Row: {
          created_at: string | null
          field_name: string
          group_order: number
          id: string
          include_subtotals: boolean | null
          template_id: string
        }
        Insert: {
          created_at?: string | null
          field_name: string
          group_order?: number
          id?: string
          include_subtotals?: boolean | null
          template_id: string
        }
        Update: {
          created_at?: string | null
          field_name?: string
          group_order?: number
          id?: string
          include_subtotals?: boolean | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_template_grouping_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      report_template_sorting: {
        Row: {
          created_at: string | null
          direction: Database["public"]["Enums"]["report_sort_direction"] | null
          field_name: string
          id: string
          sort_order: number
          template_id: string
        }
        Insert: {
          created_at?: string | null
          direction?:
            | Database["public"]["Enums"]["report_sort_direction"]
            | null
          field_name: string
          id?: string
          sort_order?: number
          template_id: string
        }
        Update: {
          created_at?: string | null
          direction?:
            | Database["public"]["Enums"]["report_sort_direction"]
            | null
          field_name?: string
          id?: string
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_template_sorting_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      report_templates: {
        Row: {
          company_id: string
          configuration: Json
          created_at: string | null
          created_by: string | null
          data_source: Database["public"]["Enums"]["report_data_source"]
          default_format:
            | Database["public"]["Enums"]["report_output_format"]
            | null
          deleted_at: string | null
          description: string | null
          id: string
          include_charts: boolean | null
          include_summary: boolean | null
          is_shared: boolean | null
          is_system_template: boolean | null
          name: string
          page_orientation: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          configuration?: Json
          created_at?: string | null
          created_by?: string | null
          data_source: Database["public"]["Enums"]["report_data_source"]
          default_format?:
            | Database["public"]["Enums"]["report_output_format"]
            | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          include_charts?: boolean | null
          include_summary?: boolean | null
          is_shared?: boolean | null
          is_system_template?: boolean | null
          name: string
          page_orientation?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          configuration?: Json
          created_at?: string | null
          created_by?: string | null
          data_source?: Database["public"]["Enums"]["report_data_source"]
          default_format?:
            | Database["public"]["Enums"]["report_output_format"]
            | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          include_charts?: boolean | null
          include_summary?: boolean | null
          is_shared?: boolean | null
          is_system_template?: boolean | null
          name?: string
          page_orientation?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      rfi_attachments: {
        Row: {
          attachment_type: string | null
          created_at: string | null
          document_id: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          rfi_id: string
          uploaded_by: string | null
        }
        Insert: {
          attachment_type?: string | null
          created_at?: string | null
          document_id?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          rfi_id: string
          uploaded_by?: string | null
        }
        Update: {
          attachment_type?: string | null
          created_at?: string | null
          document_id?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          rfi_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfi_attachments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_ai_status"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "rfi_attachments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_attachments_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "rfi_register"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_attachments_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "rfi_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_attachments_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "rfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rfi_comments: {
        Row: {
          comment: string
          comment_type: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          id: string
          mentioned_users: string[] | null
          rfi_id: string
          updated_at: string | null
        }
        Insert: {
          comment: string
          comment_type?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          mentioned_users?: string[] | null
          rfi_id: string
          updated_at?: string | null
        }
        Update: {
          comment?: string
          comment_type?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          mentioned_users?: string[] | null
          rfi_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfi_comments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_comments_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "rfi_register"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_comments_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "rfi_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_comments_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "rfis"
            referencedColumns: ["id"]
          },
        ]
      }
      rfi_history: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string | null
          field_changed: string | null
          id: string
          new_value: string | null
          old_value: string | null
          rfi_id: string
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by?: string | null
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          rfi_id: string
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string | null
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          rfi_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfi_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_history_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "rfi_register"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_history_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "rfi_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_history_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "rfis"
            referencedColumns: ["id"]
          },
        ]
      }
      rfis: {
        Row: {
          assigned_to: string | null
          ball_in_court: string | null
          ball_in_court_role: string | null
          company_id: string
          cost_impact: number | null
          created_at: string | null
          created_by: string | null
          date_closed: string | null
          date_created: string | null
          date_required: string | null
          date_responded: string | null
          date_submitted: string | null
          deleted_at: string | null
          discipline: string | null
          distribution_list: string[] | null
          drawing_id: string | null
          drawing_reference: string | null
          id: string
          is_internal: boolean | null
          legacy_workflow_item_id: string | null
          location: string | null
          priority: string | null
          project_id: string
          question: string
          related_change_order_id: string | null
          related_submittal_id: string | null
          required_response_days: number | null
          responded_by: string | null
          response: string | null
          response_due_date: string | null
          response_on_time: boolean | null
          response_type: Database["public"]["Enums"]["rfi_response_type"] | null
          rfi_number: number
          schedule_impact_days: number | null
          spec_section: string | null
          status: string
          subject: string
          submitted_by: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          ball_in_court?: string | null
          ball_in_court_role?: string | null
          company_id: string
          cost_impact?: number | null
          created_at?: string | null
          created_by?: string | null
          date_closed?: string | null
          date_created?: string | null
          date_required?: string | null
          date_responded?: string | null
          date_submitted?: string | null
          deleted_at?: string | null
          discipline?: string | null
          distribution_list?: string[] | null
          drawing_id?: string | null
          drawing_reference?: string | null
          id?: string
          is_internal?: boolean | null
          legacy_workflow_item_id?: string | null
          location?: string | null
          priority?: string | null
          project_id: string
          question: string
          related_change_order_id?: string | null
          related_submittal_id?: string | null
          required_response_days?: number | null
          responded_by?: string | null
          response?: string | null
          response_due_date?: string | null
          response_on_time?: boolean | null
          response_type?:
            | Database["public"]["Enums"]["rfi_response_type"]
            | null
          rfi_number: number
          schedule_impact_days?: number | null
          spec_section?: string | null
          status?: string
          subject: string
          submitted_by?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          ball_in_court?: string | null
          ball_in_court_role?: string | null
          company_id?: string
          cost_impact?: number | null
          created_at?: string | null
          created_by?: string | null
          date_closed?: string | null
          date_created?: string | null
          date_required?: string | null
          date_responded?: string | null
          date_submitted?: string | null
          deleted_at?: string | null
          discipline?: string | null
          distribution_list?: string[] | null
          drawing_id?: string | null
          drawing_reference?: string | null
          id?: string
          is_internal?: boolean | null
          legacy_workflow_item_id?: string | null
          location?: string | null
          priority?: string | null
          project_id?: string
          question?: string
          related_change_order_id?: string | null
          related_submittal_id?: string | null
          required_response_days?: number | null
          responded_by?: string | null
          response?: string | null
          response_due_date?: string | null
          response_on_time?: boolean | null
          response_type?:
            | Database["public"]["Enums"]["rfi_response_type"]
            | null
          rfi_number?: number
          schedule_impact_days?: number | null
          spec_section?: string | null
          status?: string
          subject?: string
          submitted_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfis_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_ball_in_court_fkey"
            columns: ["ball_in_court"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_drawing_id_fkey"
            columns: ["drawing_id"]
            isOneToOne: false
            referencedRelation: "document_ai_status"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "rfis_drawing_id_fkey"
            columns: ["drawing_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_legacy_workflow_item_id_fkey"
            columns: ["legacy_workflow_item_id"]
            isOneToOne: false
            referencedRelation: "workflow_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_related_submittal_id_fkey"
            columns: ["related_submittal_id"]
            isOneToOne: false
            referencedRelation: "submittal_register"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_related_submittal_id_fkey"
            columns: ["related_submittal_id"]
            isOneToOne: false
            referencedRelation: "submittals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          custom_role_id: string | null
          default_role: string | null
          granted: boolean | null
          id: string
          permission_id: string
        }
        Insert: {
          custom_role_id?: string | null
          default_role?: string | null
          granted?: boolean | null
          id?: string
          permission_id: string
        }
        Update: {
          custom_role_id?: string | null
          default_role?: string | null
          granted?: boolean | null
          id?: string
          permission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_incident_corrective_actions: {
        Row: {
          assigned_to: string | null
          assigned_to_name: string | null
          completed_date: string | null
          created_at: string | null
          description: string
          due_date: string | null
          id: string
          incident_id: string
          linked_task_id: string | null
          notes: string | null
          status: Database["public"]["Enums"]["corrective_action_status"]
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          completed_date?: string | null
          created_at?: string | null
          description: string
          due_date?: string | null
          id?: string
          incident_id: string
          linked_task_id?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["corrective_action_status"]
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          completed_date?: string | null
          created_at?: string | null
          description?: string
          due_date?: string | null
          id?: string
          incident_id?: string
          linked_task_id?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["corrective_action_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_incident_corrective_actions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_incident_corrective_actions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_incident_corrective_actions_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "osha_300_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_incident_corrective_actions_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "safety_incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_incident_corrective_actions_linked_task_id_fkey"
            columns: ["linked_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_incident_people: {
        Row: {
          body_part_affected: string | null
          company_name: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          hospitalized: boolean | null
          id: string
          incident_id: string
          injury_description: string | null
          job_title: string | null
          name: string
          person_type: Database["public"]["Enums"]["incident_person_type"]
          statement: string | null
          treatment_provided: string | null
        }
        Insert: {
          body_part_affected?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          hospitalized?: boolean | null
          id?: string
          incident_id: string
          injury_description?: string | null
          job_title?: string | null
          name: string
          person_type: Database["public"]["Enums"]["incident_person_type"]
          statement?: string | null
          treatment_provided?: string | null
        }
        Update: {
          body_part_affected?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          hospitalized?: boolean | null
          id?: string
          incident_id?: string
          injury_description?: string | null
          job_title?: string | null
          name?: string
          person_type?: Database["public"]["Enums"]["incident_person_type"]
          statement?: string | null
          treatment_provided?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_incident_people_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "osha_300_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_incident_people_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "safety_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_incident_photos: {
        Row: {
          caption: string | null
          created_at: string | null
          id: string
          incident_id: string
          photo_url: string
          taken_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          id?: string
          incident_id: string
          photo_url: string
          taken_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          id?: string
          incident_id?: string
          photo_url?: string
          taken_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_incident_photos_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "osha_300_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_incident_photos_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "safety_incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_incident_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_incident_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_incidents: {
        Row: {
          body_part: string | null
          body_part_affected: string | null
          case_number: string | null
          company: string | null
          company_id: string | null
          contributing_factors: string | null
          corrective_actions: string | null
          created_at: string | null
          created_by: string | null
          days_away_count: number | null
          days_transfer_restriction: number | null
          death_date: string | null
          deleted_at: string | null
          description: string
          employee_job_title: string | null
          employee_name: string | null
          followup_notes: string | null
          id: string
          illness_classification: string | null
          immediate_actions: string | null
          incident_date: string
          incident_number: string | null
          incident_time: string | null
          incident_type: string
          injury_illness_type: string | null
          injury_type: string | null
          is_privacy_case: boolean | null
          location: string | null
          notified_users: string[] | null
          object_substance: string | null
          osha_recordable: boolean | null
          osha_report_number: string | null
          other_recordable_case: boolean | null
          person_involved: string | null
          project_id: string
          reported_at: string | null
          reported_by: string | null
          reported_to_osha: boolean | null
          reported_to_owner: boolean | null
          requires_followup: boolean | null
          resulted_in_days_away: boolean | null
          resulted_in_death: boolean | null
          resulted_in_restriction: boolean | null
          root_cause: string | null
          root_cause_category:
            | Database["public"]["Enums"]["root_cause_category"]
            | null
          serious_incident: boolean | null
          severity: string | null
          status: string | null
          subcontractor_id: string | null
          treatment: string | null
          updated_at: string | null
          witness_names: string | null
        }
        Insert: {
          body_part?: string | null
          body_part_affected?: string | null
          case_number?: string | null
          company?: string | null
          company_id?: string | null
          contributing_factors?: string | null
          corrective_actions?: string | null
          created_at?: string | null
          created_by?: string | null
          days_away_count?: number | null
          days_transfer_restriction?: number | null
          death_date?: string | null
          deleted_at?: string | null
          description: string
          employee_job_title?: string | null
          employee_name?: string | null
          followup_notes?: string | null
          id?: string
          illness_classification?: string | null
          immediate_actions?: string | null
          incident_date: string
          incident_number?: string | null
          incident_time?: string | null
          incident_type: string
          injury_illness_type?: string | null
          injury_type?: string | null
          is_privacy_case?: boolean | null
          location?: string | null
          notified_users?: string[] | null
          object_substance?: string | null
          osha_recordable?: boolean | null
          osha_report_number?: string | null
          other_recordable_case?: boolean | null
          person_involved?: string | null
          project_id: string
          reported_at?: string | null
          reported_by?: string | null
          reported_to_osha?: boolean | null
          reported_to_owner?: boolean | null
          requires_followup?: boolean | null
          resulted_in_days_away?: boolean | null
          resulted_in_death?: boolean | null
          resulted_in_restriction?: boolean | null
          root_cause?: string | null
          root_cause_category?:
            | Database["public"]["Enums"]["root_cause_category"]
            | null
          serious_incident?: boolean | null
          severity?: string | null
          status?: string | null
          subcontractor_id?: string | null
          treatment?: string | null
          updated_at?: string | null
          witness_names?: string | null
        }
        Update: {
          body_part?: string | null
          body_part_affected?: string | null
          case_number?: string | null
          company?: string | null
          company_id?: string | null
          contributing_factors?: string | null
          corrective_actions?: string | null
          created_at?: string | null
          created_by?: string | null
          days_away_count?: number | null
          days_transfer_restriction?: number | null
          death_date?: string | null
          deleted_at?: string | null
          description?: string
          employee_job_title?: string | null
          employee_name?: string | null
          followup_notes?: string | null
          id?: string
          illness_classification?: string | null
          immediate_actions?: string | null
          incident_date?: string
          incident_number?: string | null
          incident_time?: string | null
          incident_type?: string
          injury_illness_type?: string | null
          injury_type?: string | null
          is_privacy_case?: boolean | null
          location?: string | null
          notified_users?: string[] | null
          object_substance?: string | null
          osha_recordable?: boolean | null
          osha_report_number?: string | null
          other_recordable_case?: boolean | null
          person_involved?: string | null
          project_id?: string
          reported_at?: string | null
          reported_by?: string | null
          reported_to_osha?: boolean | null
          reported_to_owner?: boolean | null
          requires_followup?: boolean | null
          resulted_in_days_away?: boolean | null
          resulted_in_death?: boolean | null
          resulted_in_restriction?: boolean | null
          root_cause?: string | null
          root_cause_category?:
            | Database["public"]["Enums"]["root_cause_category"]
            | null
          serious_incident?: boolean | null
          severity?: string | null
          status?: string | null
          subcontractor_id?: string | null
          treatment?: string | null
          updated_at?: string | null
          witness_names?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_incidents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_incidents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "safety_incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_incidents_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_baseline_items: {
        Row: {
          baseline_id: string
          created_at: string
          duration_days: number
          finish_date: string
          id: string
          percent_complete: number | null
          schedule_item_id: string
          start_date: string
        }
        Insert: {
          baseline_id: string
          created_at?: string
          duration_days: number
          finish_date: string
          id?: string
          percent_complete?: number | null
          schedule_item_id: string
          start_date: string
        }
        Update: {
          baseline_id?: string
          created_at?: string
          duration_days?: number
          finish_date?: string
          id?: string
          percent_complete?: number | null
          schedule_item_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_baseline_items_baseline_id_fkey"
            columns: ["baseline_id"]
            isOneToOne: false
            referencedRelation: "schedule_baselines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_baseline_items_schedule_item_id_fkey"
            columns: ["schedule_item_id"]
            isOneToOne: false
            referencedRelation: "schedule_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_baseline_items_schedule_item_id_fkey"
            columns: ["schedule_item_id"]
            isOneToOne: false
            referencedRelation: "schedule_items_with_variance"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_baselines: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          project_id: string
          saved_at: string
          saved_by: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          project_id: string
          saved_at?: string
          saved_by: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          project_id?: string
          saved_at?: string
          saved_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_baselines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_baselines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "schedule_baselines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_baselines_saved_by_fkey"
            columns: ["saved_by"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_baselines_saved_by_fkey"
            columns: ["saved_by"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_items: {
        Row: {
          assigned_to: string | null
          baseline_duration_days: number | null
          baseline_finish_date: string | null
          baseline_saved_at: string | null
          baseline_saved_by: string | null
          baseline_start_date: string | null
          color: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          duration_days: number | null
          finish_date: string | null
          id: string
          imported_at: string | null
          is_critical: boolean | null
          is_milestone: boolean | null
          last_updated_at: string | null
          notes: string | null
          parent_id: string | null
          percent_complete: number | null
          predecessors: string | null
          project_id: string
          sort_order: number | null
          start_date: string | null
          successors: string | null
          task_id: string | null
          task_name: string
          wbs: string | null
        }
        Insert: {
          assigned_to?: string | null
          baseline_duration_days?: number | null
          baseline_finish_date?: string | null
          baseline_saved_at?: string | null
          baseline_saved_by?: string | null
          baseline_start_date?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          duration_days?: number | null
          finish_date?: string | null
          id?: string
          imported_at?: string | null
          is_critical?: boolean | null
          is_milestone?: boolean | null
          last_updated_at?: string | null
          notes?: string | null
          parent_id?: string | null
          percent_complete?: number | null
          predecessors?: string | null
          project_id: string
          sort_order?: number | null
          start_date?: string | null
          successors?: string | null
          task_id?: string | null
          task_name: string
          wbs?: string | null
        }
        Update: {
          assigned_to?: string | null
          baseline_duration_days?: number | null
          baseline_finish_date?: string | null
          baseline_saved_at?: string | null
          baseline_saved_by?: string | null
          baseline_start_date?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          duration_days?: number | null
          finish_date?: string | null
          id?: string
          imported_at?: string | null
          is_critical?: boolean | null
          is_milestone?: boolean | null
          last_updated_at?: string | null
          notes?: string | null
          parent_id?: string | null
          percent_complete?: number | null
          predecessors?: string | null
          project_id?: string
          sort_order?: number | null
          start_date?: string | null
          successors?: string | null
          task_id?: string | null
          task_name?: string
          wbs?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_items_baseline_saved_by_fkey"
            columns: ["baseline_saved_by"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_items_baseline_saved_by_fkey"
            columns: ["baseline_saved_by"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "schedule_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "schedule_items_with_variance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "schedule_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_of_values: {
        Row: {
          balance_to_finish: number | null
          change_order_adjustments: number
          cost_code: string | null
          cost_code_id: string | null
          created_at: string | null
          description: string
          id: string
          item_number: string
          materials_stored: number
          notes: string | null
          payment_application_id: string
          percent_complete: number | null
          retainage_amount: number | null
          retainage_percent: number | null
          scheduled_value: number
          sort_order: number
          total_completed_stored: number | null
          total_scheduled_value: number | null
          updated_at: string | null
          work_completed_previous: number
          work_completed_this_period: number
        }
        Insert: {
          balance_to_finish?: number | null
          change_order_adjustments?: number
          cost_code?: string | null
          cost_code_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          item_number: string
          materials_stored?: number
          notes?: string | null
          payment_application_id: string
          percent_complete?: number | null
          retainage_amount?: number | null
          retainage_percent?: number | null
          scheduled_value?: number
          sort_order?: number
          total_completed_stored?: number | null
          total_scheduled_value?: number | null
          updated_at?: string | null
          work_completed_previous?: number
          work_completed_this_period?: number
        }
        Update: {
          balance_to_finish?: number | null
          change_order_adjustments?: number
          cost_code?: string | null
          cost_code_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          item_number?: string
          materials_stored?: number
          notes?: string | null
          payment_application_id?: string
          percent_complete?: number | null
          retainage_amount?: number | null
          retainage_percent?: number | null
          scheduled_value?: number
          sort_order?: number
          total_completed_stored?: number | null
          total_scheduled_value?: number | null
          updated_at?: string | null
          work_completed_previous?: number
          work_completed_this_period?: number
        }
        Relationships: [
          {
            foreignKeyName: "schedule_of_values_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_of_values_payment_application_id_fkey"
            columns: ["payment_application_id"]
            isOneToOne: false
            referencedRelation: "payment_application_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_of_values_payment_application_id_fkey"
            columns: ["payment_application_id"]
            isOneToOne: false
            referencedRelation: "payment_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_reports: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          day_of_month: number | null
          day_of_week: number | null
          description: string | null
          email_body: string | null
          email_subject: string | null
          frequency: Database["public"]["Enums"]["report_schedule_frequency"]
          id: string
          is_active: boolean | null
          last_run_at: string | null
          name: string
          next_run_at: string | null
          output_format:
            | Database["public"]["Enums"]["report_output_format"]
            | null
          project_id: string | null
          recipients: Json
          template_id: string
          time_of_day: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          description?: string | null
          email_body?: string | null
          email_subject?: string | null
          frequency: Database["public"]["Enums"]["report_schedule_frequency"]
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          output_format?:
            | Database["public"]["Enums"]["report_output_format"]
            | null
          project_id?: string | null
          recipients?: Json
          template_id: string
          time_of_day?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          description?: string | null
          email_body?: string | null
          email_subject?: string | null
          frequency?: Database["public"]["Enums"]["report_schedule_frequency"]
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          output_format?:
            | Database["public"]["Enums"]["report_output_format"]
            | null
          project_id?: string | null
          recipients?: Json
          template_id?: string
          time_of_day?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "scheduled_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_reports_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      site_conditions: {
        Row: {
          after_photos: Json | null
          before_photos: Json | null
          category: string | null
          condition_type: string
          cost_impact: number | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string
          discovered_date: string
          id: string
          impact_description: string | null
          location: string | null
          project_id: string
          related_change_order_id: string | null
          related_rfi_id: string | null
          related_site_instruction_id: string | null
          resolution: string | null
          resolved_date: string | null
          schedule_impact: number | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          after_photos?: Json | null
          before_photos?: Json | null
          category?: string | null
          condition_type: string
          cost_impact?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description: string
          discovered_date: string
          id?: string
          impact_description?: string | null
          location?: string | null
          project_id: string
          related_change_order_id?: string | null
          related_rfi_id?: string | null
          related_site_instruction_id?: string | null
          resolution?: string | null
          resolved_date?: string | null
          schedule_impact?: number | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          after_photos?: Json | null
          before_photos?: Json | null
          category?: string | null
          condition_type?: string
          cost_impact?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          discovered_date?: string
          id?: string
          impact_description?: string | null
          location?: string | null
          project_id?: string
          related_change_order_id?: string | null
          related_rfi_id?: string | null
          related_site_instruction_id?: string | null
          resolution?: string | null
          resolved_date?: string | null
          schedule_impact?: number | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_conditions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_conditions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_conditions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "site_conditions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_conditions_related_change_order_id_fkey"
            columns: ["related_change_order_id"]
            isOneToOne: false
            referencedRelation: "workflow_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_conditions_related_rfi_id_fkey"
            columns: ["related_rfi_id"]
            isOneToOne: false
            referencedRelation: "workflow_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_conditions_related_site_instruction_id_fkey"
            columns: ["related_site_instruction_id"]
            isOneToOne: false
            referencedRelation: "site_instructions"
            referencedColumns: ["id"]
          },
        ]
      }
      site_instruction_attachments: {
        Row: {
          created_at: string | null
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          site_instruction_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          site_instruction_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          site_instruction_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_instruction_attachments_site_instruction_id_fkey"
            columns: ["site_instruction_id"]
            isOneToOne: false
            referencedRelation: "site_instructions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_instruction_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      site_instruction_comments: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          site_instruction_id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          site_instruction_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          site_instruction_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_instruction_comments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_instruction_comments_site_instruction_id_fkey"
            columns: ["site_instruction_id"]
            isOneToOne: false
            referencedRelation: "site_instructions"
            referencedColumns: ["id"]
          },
        ]
      }
      site_instruction_history: {
        Row: {
          action: string
          changes: Json | null
          id: string
          new_status: string | null
          notes: string | null
          old_status: string | null
          performed_at: string | null
          performed_by: string | null
          site_instruction_id: string
        }
        Insert: {
          action: string
          changes?: Json | null
          id?: string
          new_status?: string | null
          notes?: string | null
          old_status?: string | null
          performed_at?: string | null
          performed_by?: string | null
          site_instruction_id: string
        }
        Update: {
          action?: string
          changes?: Json | null
          id?: string
          new_status?: string | null
          notes?: string | null
          old_status?: string | null
          performed_at?: string | null
          performed_by?: string | null
          site_instruction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_instruction_history_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_instruction_history_site_instruction_id_fkey"
            columns: ["site_instruction_id"]
            isOneToOne: false
            referencedRelation: "site_instructions"
            referencedColumns: ["id"]
          },
        ]
      }
      site_instructions: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          acknowledgment_notes: string | null
          acknowledgment_signature: string | null
          completed_at: string | null
          completed_by: string | null
          completion_notes: string | null
          completion_status: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string
          due_date: string | null
          id: string
          instruction_number: string | null
          issued_at: string | null
          issued_by: string | null
          issued_to_user_id: string | null
          linked_daily_report_id: string | null
          linked_punch_list_id: string | null
          linked_task_id: string | null
          priority: string | null
          project_id: string
          reference_number: string | null
          related_to_id: string | null
          related_to_type: string | null
          requires_acknowledgment: boolean | null
          requires_completion_tracking: boolean | null
          status: string | null
          subcontractor_id: string
          title: string
          updated_at: string | null
          verification_notes: string | null
          verified_by: string | null
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          acknowledgment_notes?: string | null
          acknowledgment_signature?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          completion_status?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description: string
          due_date?: string | null
          id?: string
          instruction_number?: string | null
          issued_at?: string | null
          issued_by?: string | null
          issued_to_user_id?: string | null
          linked_daily_report_id?: string | null
          linked_punch_list_id?: string | null
          linked_task_id?: string | null
          priority?: string | null
          project_id: string
          reference_number?: string | null
          related_to_id?: string | null
          related_to_type?: string | null
          requires_acknowledgment?: boolean | null
          requires_completion_tracking?: boolean | null
          status?: string | null
          subcontractor_id: string
          title: string
          updated_at?: string | null
          verification_notes?: string | null
          verified_by?: string | null
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          acknowledgment_notes?: string | null
          acknowledgment_signature?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          completion_status?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          due_date?: string | null
          id?: string
          instruction_number?: string | null
          issued_at?: string | null
          issued_by?: string | null
          issued_to_user_id?: string | null
          linked_daily_report_id?: string | null
          linked_punch_list_id?: string | null
          linked_task_id?: string | null
          priority?: string | null
          project_id?: string
          reference_number?: string | null
          related_to_id?: string | null
          related_to_type?: string | null
          requires_acknowledgment?: boolean | null
          requires_completion_tracking?: boolean | null
          status?: string | null
          subcontractor_id?: string
          title?: string
          updated_at?: string | null
          verification_notes?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_instructions_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_instructions_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_instructions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_instructions_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_instructions_issued_to_user_id_fkey"
            columns: ["issued_to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_instructions_linked_daily_report_id_fkey"
            columns: ["linked_daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_instructions_linked_daily_report_id_fkey"
            columns: ["linked_daily_report_id"]
            isOneToOne: false
            referencedRelation: "material_received_with_details"
            referencedColumns: ["daily_report_id"]
          },
          {
            foreignKeyName: "site_instructions_linked_punch_list_id_fkey"
            columns: ["linked_punch_list_id"]
            isOneToOne: false
            referencedRelation: "punch_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_instructions_linked_task_id_fkey"
            columns: ["linked_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_instructions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_instructions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "site_instructions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_instructions_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_instructions_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractor_compliance_documents: {
        Row: {
          coverage_amount: number | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          document_name: string
          document_type: string
          expiration_date: string | null
          expiration_warning_sent: boolean | null
          file_size: number | null
          file_url: string
          id: string
          issue_date: string | null
          mime_type: string | null
          policy_number: string | null
          project_id: string | null
          provider_name: string | null
          rejection_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          subcontractor_id: string
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          coverage_amount?: number | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          document_name: string
          document_type: string
          expiration_date?: string | null
          expiration_warning_sent?: boolean | null
          file_size?: number | null
          file_url: string
          id?: string
          issue_date?: string | null
          mime_type?: string | null
          policy_number?: string | null
          project_id?: string | null
          provider_name?: string | null
          rejection_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          subcontractor_id: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          coverage_amount?: number | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          document_name?: string
          document_type?: string
          expiration_date?: string | null
          expiration_warning_sent?: boolean | null
          file_size?: number | null
          file_url?: string
          id?: string
          issue_date?: string | null
          mime_type?: string | null
          policy_number?: string | null
          project_id?: string | null
          provider_name?: string | null
          rejection_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          subcontractor_id?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_compliance_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_compliance_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "subcontractor_compliance_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_compliance_documents_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_compliance_documents_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_compliance_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractor_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_at: string | null
          invited_by: string
          project_id: string
          status: string | null
          subcontractor_id: string
          token: string | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by: string
          project_id: string
          status?: string | null
          subcontractor_id: string
          token?: string | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string
          project_id?: string
          status?: string | null
          subcontractor_id?: string
          token?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_invitations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_invitations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "subcontractor_invitations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_invitations_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractor_portal_access: {
        Row: {
          accepted_at: string | null
          can_submit_bids: boolean | null
          can_update_punch_items: boolean | null
          can_update_tasks: boolean | null
          can_upload_documents: boolean | null
          can_view_documents: boolean | null
          can_view_schedule: boolean | null
          can_view_scope: boolean | null
          created_at: string | null
          expires_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean | null
          project_id: string
          subcontractor_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          can_submit_bids?: boolean | null
          can_update_punch_items?: boolean | null
          can_update_tasks?: boolean | null
          can_upload_documents?: boolean | null
          can_view_documents?: boolean | null
          can_view_schedule?: boolean | null
          can_view_scope?: boolean | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          project_id: string
          subcontractor_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          can_submit_bids?: boolean | null
          can_update_punch_items?: boolean | null
          can_update_tasks?: boolean | null
          can_upload_documents?: boolean | null
          can_view_documents?: boolean | null
          can_view_schedule?: boolean | null
          can_view_scope?: boolean | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          project_id?: string
          subcontractor_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_portal_access_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_portal_access_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_portal_access_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "subcontractor_portal_access_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_portal_access_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_portal_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractors: {
        Row: {
          company_name: string
          contact_id: string | null
          contract_amount: number | null
          contract_end_date: string | null
          contract_start_date: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          id: string
          insurance_certificate_url: string | null
          insurance_expiration: string | null
          license_expiration: string | null
          license_number: string | null
          performance_notes: string | null
          project_id: string
          retainage_percentage: number | null
          scope_document_url: string | null
          scope_of_work: string | null
          status: string | null
          trade: string
          updated_at: string | null
        }
        Insert: {
          company_name: string
          contact_id?: string | null
          contract_amount?: number | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          insurance_certificate_url?: string | null
          insurance_expiration?: string | null
          license_expiration?: string | null
          license_number?: string | null
          performance_notes?: string | null
          project_id: string
          retainage_percentage?: number | null
          scope_document_url?: string | null
          scope_of_work?: string | null
          status?: string | null
          trade: string
          updated_at?: string | null
        }
        Update: {
          company_name?: string
          contact_id?: string | null
          contract_amount?: number | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          insurance_certificate_url?: string | null
          insurance_expiration?: string | null
          license_expiration?: string | null
          license_number?: string | null
          performance_notes?: string | null
          project_id?: string
          retainage_percentage?: number | null
          scope_document_url?: string | null
          scope_of_work?: string | null
          status?: string | null
          trade?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontractors_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "subcontractors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      submittal_attachments: {
        Row: {
          created_at: string | null
          document_id: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          submittal_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          document_id?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          submittal_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          submittal_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submittal_attachments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_ai_status"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "submittal_attachments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_attachments_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "submittal_register"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_attachments_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "submittals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      submittal_history: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string | null
          field_changed: string | null
          id: string
          new_value: string | null
          old_value: string | null
          submittal_id: string
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by?: string | null
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          submittal_id: string
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string | null
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          submittal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submittal_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_history_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "submittal_register"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_history_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "submittals"
            referencedColumns: ["id"]
          },
        ]
      }
      submittal_items: {
        Row: {
          created_at: string | null
          description: string
          id: string
          item_number: number
          manufacturer: string | null
          model_number: string | null
          notes: string | null
          quantity: number | null
          submittal_id: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          item_number: number
          manufacturer?: string | null
          model_number?: string | null
          notes?: string | null
          quantity?: number | null
          submittal_id: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          item_number?: number
          manufacturer?: string | null
          model_number?: string | null
          notes?: string | null
          quantity?: number | null
          submittal_id?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submittal_items_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "submittal_register"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_items_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "submittals"
            referencedColumns: ["id"]
          },
        ]
      }
      submittal_procurement: {
        Row: {
          actual_delivery_date: string | null
          approval_date: string | null
          created_at: string | null
          deleted_at: string | null
          expected_delivery_date: string | null
          id: string
          lead_time_days: number | null
          notes: string | null
          order_date: string | null
          order_number: string | null
          procurement_status: string | null
          project_id: string
          updated_at: string | null
          vendor: string | null
          workflow_item_id: string
        }
        Insert: {
          actual_delivery_date?: string | null
          approval_date?: string | null
          created_at?: string | null
          deleted_at?: string | null
          expected_delivery_date?: string | null
          id?: string
          lead_time_days?: number | null
          notes?: string | null
          order_date?: string | null
          order_number?: string | null
          procurement_status?: string | null
          project_id: string
          updated_at?: string | null
          vendor?: string | null
          workflow_item_id: string
        }
        Update: {
          actual_delivery_date?: string | null
          approval_date?: string | null
          created_at?: string | null
          deleted_at?: string | null
          expected_delivery_date?: string | null
          id?: string
          lead_time_days?: number | null
          notes?: string | null
          order_date?: string | null
          order_number?: string | null
          procurement_status?: string | null
          project_id?: string
          updated_at?: string | null
          vendor?: string | null
          workflow_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submittal_procurement_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_procurement_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "submittal_procurement_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_procurement_workflow_item_id_fkey"
            columns: ["workflow_item_id"]
            isOneToOne: false
            referencedRelation: "workflow_items"
            referencedColumns: ["id"]
          },
        ]
      }
      submittal_reviews: {
        Row: {
          approval_code: string | null
          comments: string | null
          created_at: string | null
          id: string
          review_attachments: Json | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_company: string | null
          reviewer_name: string | null
          submittal_id: string
        }
        Insert: {
          approval_code?: string | null
          comments?: string | null
          created_at?: string | null
          id?: string
          review_attachments?: Json | null
          review_status: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_company?: string | null
          reviewer_name?: string | null
          submittal_id: string
        }
        Update: {
          approval_code?: string | null
          comments?: string | null
          created_at?: string | null
          id?: string
          review_attachments?: Json | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_company?: string | null
          reviewer_name?: string | null
          submittal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submittal_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_reviews_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "submittal_register"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_reviews_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "submittals"
            referencedColumns: ["id"]
          },
        ]
      }
      submittals: {
        Row: {
          approval_code: string | null
          approval_code_date: string | null
          approval_code_set_by: string | null
          ball_in_court: string | null
          ball_in_court_entity: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          date_received: string | null
          date_required: string | null
          date_returned: string | null
          date_submitted: string | null
          days_for_review: number | null
          deleted_at: string | null
          description: string | null
          discipline: string | null
          id: string
          legacy_workflow_item_id: string | null
          project_id: string
          related_rfi_id: string | null
          review_comments: string | null
          review_due_date: string | null
          review_status: string
          reviewer_id: string | null
          revision_number: number | null
          spec_section: string
          spec_section_title: string | null
          subcontractor_id: string | null
          submittal_number: string
          submittal_type: string
          submitted_by_company: string | null
          submitted_by_user: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          approval_code?: string | null
          approval_code_date?: string | null
          approval_code_set_by?: string | null
          ball_in_court?: string | null
          ball_in_court_entity?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          date_received?: string | null
          date_required?: string | null
          date_returned?: string | null
          date_submitted?: string | null
          days_for_review?: number | null
          deleted_at?: string | null
          description?: string | null
          discipline?: string | null
          id?: string
          legacy_workflow_item_id?: string | null
          project_id: string
          related_rfi_id?: string | null
          review_comments?: string | null
          review_due_date?: string | null
          review_status?: string
          reviewer_id?: string | null
          revision_number?: number | null
          spec_section: string
          spec_section_title?: string | null
          subcontractor_id?: string | null
          submittal_number: string
          submittal_type: string
          submitted_by_company?: string | null
          submitted_by_user?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          approval_code?: string | null
          approval_code_date?: string | null
          approval_code_set_by?: string | null
          ball_in_court?: string | null
          ball_in_court_entity?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          date_received?: string | null
          date_required?: string | null
          date_returned?: string | null
          date_submitted?: string | null
          days_for_review?: number | null
          deleted_at?: string | null
          description?: string | null
          discipline?: string | null
          id?: string
          legacy_workflow_item_id?: string | null
          project_id?: string
          related_rfi_id?: string | null
          review_comments?: string | null
          review_due_date?: string | null
          review_status?: string
          reviewer_id?: string | null
          revision_number?: number | null
          spec_section?: string
          spec_section_title?: string | null
          subcontractor_id?: string | null
          submittal_number?: string
          submittal_type?: string
          submitted_by_company?: string | null
          submitted_by_user?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submittals_approval_code_set_by_fkey"
            columns: ["approval_code_set_by"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_approval_code_set_by_fkey"
            columns: ["approval_code_set_by"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_ball_in_court_fkey"
            columns: ["ball_in_court"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_legacy_workflow_item_id_fkey"
            columns: ["legacy_workflow_item_id"]
            isOneToOne: false
            referencedRelation: "workflow_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_related_rfi_id_fkey"
            columns: ["related_rfi_id"]
            isOneToOne: false
            referencedRelation: "rfi_register"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_related_rfi_id_fkey"
            columns: ["related_rfi_id"]
            isOneToOne: false
            referencedRelation: "rfi_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_related_rfi_id_fkey"
            columns: ["related_rfi_id"]
            isOneToOne: false
            referencedRelation: "rfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_submitted_by_company_fkey"
            columns: ["submitted_by_company"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_submitted_by_user_fkey"
            columns: ["submitted_by_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      takeoff_items: {
        Row: {
          assembly_id: string | null
          color: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          document_id: string
          final_quantity: number | null
          id: string
          is_visible: boolean | null
          layer: string | null
          line_width: number | null
          measurement_data: Json
          measurement_type: string
          multiplier: number | null
          name: string
          page_number: number | null
          project_id: string
          quantity: number | null
          takeoff_tags: Json | null
          unit: string | null
          updated_at: string | null
          waste_factor: number | null
        }
        Insert: {
          assembly_id?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          document_id: string
          final_quantity?: number | null
          id?: string
          is_visible?: boolean | null
          layer?: string | null
          line_width?: number | null
          measurement_data: Json
          measurement_type: string
          multiplier?: number | null
          name: string
          page_number?: number | null
          project_id: string
          quantity?: number | null
          takeoff_tags?: Json | null
          unit?: string | null
          updated_at?: string | null
          waste_factor?: number | null
        }
        Update: {
          assembly_id?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          document_id?: string
          final_quantity?: number | null
          id?: string
          is_visible?: boolean | null
          layer?: string | null
          line_width?: number | null
          measurement_data?: Json
          measurement_type?: string
          multiplier?: number | null
          name?: string
          page_number?: number | null
          project_id?: string
          quantity?: number | null
          takeoff_tags?: Json | null
          unit?: string | null
          updated_at?: string | null
          waste_factor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "takeoff_items_assembly_id_fkey"
            columns: ["assembly_id"]
            isOneToOne: false
            referencedRelation: "assemblies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "takeoff_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "takeoff_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_ai_status"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "takeoff_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "takeoff_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "takeoff_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "takeoff_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      task_dependencies: {
        Row: {
          created_at: string | null
          created_by: string | null
          dependency_type: string
          id: string
          lag_days: number | null
          predecessor_id: string
          project_id: string
          successor_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          dependency_type?: string
          id?: string
          lag_days?: number | null
          predecessor_id: string
          project_id: string
          successor_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          dependency_type?: string
          id?: string
          lag_days?: number | null
          predecessor_id?: string
          project_id?: string
          successor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_predecessor_id_fkey"
            columns: ["predecessor_id"]
            isOneToOne: false
            referencedRelation: "schedule_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_predecessor_id_fkey"
            columns: ["predecessor_id"]
            isOneToOne: false
            referencedRelation: "schedule_items_with_variance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "task_dependencies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_successor_id_fkey"
            columns: ["successor_id"]
            isOneToOne: false
            referencedRelation: "schedule_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_successor_id_fkey"
            columns: ["successor_id"]
            isOneToOne: false
            referencedRelation: "schedule_items_with_variance"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to_subcontractor_id: string | null
          assigned_to_type: string | null
          assigned_to_user_id: string | null
          completed_date: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          location: string | null
          parent_task_id: string | null
          priority: string | null
          project_id: string
          related_to_id: string | null
          related_to_type: string | null
          start_date: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to_subcontractor_id?: string | null
          assigned_to_type?: string | null
          assigned_to_user_id?: string | null
          completed_date?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          location?: string | null
          parent_task_id?: string | null
          priority?: string | null
          project_id: string
          related_to_id?: string | null
          related_to_type?: string | null
          start_date?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to_subcontractor_id?: string | null
          assigned_to_type?: string | null
          assigned_to_user_id?: string | null
          completed_date?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          location?: string | null
          parent_task_id?: string | null
          priority?: string | null
          project_id?: string
          related_to_id?: string | null
          related_to_type?: string | null
          start_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_subcontractor_id_fkey"
            columns: ["assigned_to_subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          acceptance_criteria: string | null
          actual_test_date: string | null
          certificate_url: string | null
          corrective_actions: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          failure_notes: string | null
          id: string
          project_id: string
          related_inspection_id: string | null
          related_submittal_id: string | null
          required_for_closeout: boolean | null
          required_frequency: string | null
          result: string | null
          result_value: string | null
          retest_id: string | null
          retest_required: boolean | null
          retest_scheduled_date: string | null
          scheduled_date: string | null
          specification_reference: string | null
          status: string | null
          technician_contact: string | null
          technician_name: string | null
          test_name: string
          test_number: number | null
          test_report_url: string | null
          test_type: string
          testing_agency: string | null
          updated_at: string | null
        }
        Insert: {
          acceptance_criteria?: string | null
          actual_test_date?: string | null
          certificate_url?: string | null
          corrective_actions?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          failure_notes?: string | null
          id?: string
          project_id: string
          related_inspection_id?: string | null
          related_submittal_id?: string | null
          required_for_closeout?: boolean | null
          required_frequency?: string | null
          result?: string | null
          result_value?: string | null
          retest_id?: string | null
          retest_required?: boolean | null
          retest_scheduled_date?: string | null
          scheduled_date?: string | null
          specification_reference?: string | null
          status?: string | null
          technician_contact?: string | null
          technician_name?: string | null
          test_name: string
          test_number?: number | null
          test_report_url?: string | null
          test_type: string
          testing_agency?: string | null
          updated_at?: string | null
        }
        Update: {
          acceptance_criteria?: string | null
          actual_test_date?: string | null
          certificate_url?: string | null
          corrective_actions?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          failure_notes?: string | null
          id?: string
          project_id?: string
          related_inspection_id?: string | null
          related_submittal_id?: string | null
          required_for_closeout?: boolean | null
          required_frequency?: string | null
          result?: string | null
          result_value?: string | null
          retest_id?: string | null
          retest_required?: boolean | null
          retest_scheduled_date?: string | null
          scheduled_date?: string | null
          specification_reference?: string | null
          status?: string | null
          technician_contact?: string | null
          technician_name?: string | null
          test_name?: string
          test_number?: number | null
          test_report_url?: string | null
          test_type?: string
          testing_agency?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "tests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_related_inspection_id_fkey"
            columns: ["related_inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_related_submittal_id_fkey"
            columns: ["related_submittal_id"]
            isOneToOne: false
            referencedRelation: "workflow_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_retest_id_fkey"
            columns: ["retest_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      toolbox_talk_attendees: {
        Row: {
          attendance_status: Database["public"]["Enums"]["toolbox_attendance_status"]
          created_at: string | null
          device_info: Json | null
          id: string
          ip_address: unknown
          notes: string | null
          signature_data: string | null
          signed_in_at: string | null
          signed_via: string | null
          toolbox_talk_id: string
          updated_at: string | null
          user_id: string | null
          worker_badge_number: string | null
          worker_company: string | null
          worker_name: string
          worker_trade: string | null
        }
        Insert: {
          attendance_status?: Database["public"]["Enums"]["toolbox_attendance_status"]
          created_at?: string | null
          device_info?: Json | null
          id?: string
          ip_address?: unknown
          notes?: string | null
          signature_data?: string | null
          signed_in_at?: string | null
          signed_via?: string | null
          toolbox_talk_id: string
          updated_at?: string | null
          user_id?: string | null
          worker_badge_number?: string | null
          worker_company?: string | null
          worker_name: string
          worker_trade?: string | null
        }
        Update: {
          attendance_status?: Database["public"]["Enums"]["toolbox_attendance_status"]
          created_at?: string | null
          device_info?: Json | null
          id?: string
          ip_address?: unknown
          notes?: string | null
          signature_data?: string | null
          signed_in_at?: string | null
          signed_via?: string | null
          toolbox_talk_id?: string
          updated_at?: string | null
          user_id?: string | null
          worker_badge_number?: string | null
          worker_company?: string | null
          worker_name?: string
          worker_trade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "toolbox_talk_attendees_toolbox_talk_id_fkey"
            columns: ["toolbox_talk_id"]
            isOneToOne: false
            referencedRelation: "toolbox_talks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toolbox_talk_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toolbox_talk_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      toolbox_talk_certifications: {
        Row: {
          certified_date: string
          company_id: string
          created_at: string | null
          expires_date: string | null
          id: string
          is_current: boolean | null
          toolbox_talk_id: string | null
          topic_id: string
          user_id: string | null
          worker_company: string | null
          worker_name: string
        }
        Insert: {
          certified_date: string
          company_id: string
          created_at?: string | null
          expires_date?: string | null
          id?: string
          is_current?: boolean | null
          toolbox_talk_id?: string | null
          topic_id: string
          user_id?: string | null
          worker_company?: string | null
          worker_name: string
        }
        Update: {
          certified_date?: string
          company_id?: string
          created_at?: string | null
          expires_date?: string | null
          id?: string
          is_current?: boolean | null
          toolbox_talk_id?: string | null
          topic_id?: string
          user_id?: string | null
          worker_company?: string | null
          worker_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "toolbox_talk_certifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toolbox_talk_certifications_toolbox_talk_id_fkey"
            columns: ["toolbox_talk_id"]
            isOneToOne: false
            referencedRelation: "toolbox_talks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toolbox_talk_certifications_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "toolbox_talk_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toolbox_talk_certifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toolbox_talk_certifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      toolbox_talk_topics: {
        Row: {
          category: Database["public"]["Enums"]["toolbox_topic_category"]
          certification_valid_days: number | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          discussion_questions: Json | null
          estimated_duration: number | null
          id: string
          is_active: boolean | null
          is_system_template: boolean | null
          osha_standard: string | null
          regulation_references: string | null
          requires_certification: boolean | null
          resources: Json | null
          talking_points: Json | null
          times_used: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["toolbox_topic_category"]
          certification_valid_days?: number | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          discussion_questions?: Json | null
          estimated_duration?: number | null
          id?: string
          is_active?: boolean | null
          is_system_template?: boolean | null
          osha_standard?: string | null
          regulation_references?: string | null
          requires_certification?: boolean | null
          resources?: Json | null
          talking_points?: Json | null
          times_used?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["toolbox_topic_category"]
          certification_valid_days?: number | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          discussion_questions?: Json | null
          estimated_duration?: number | null
          id?: string
          is_active?: boolean | null
          is_system_template?: boolean | null
          osha_standard?: string | null
          regulation_references?: string | null
          requires_certification?: boolean | null
          resources?: Json | null
          talking_points?: Json | null
          times_used?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "toolbox_talk_topics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toolbox_talk_topics_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toolbox_talk_topics_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      toolbox_talks: {
        Row: {
          attendance_count: number | null
          attendees: Json | null
          category: Database["public"]["Enums"]["toolbox_topic_category"]
          company_id: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          duration_minutes: number | null
          handout_url: string | null
          id: string
          osha_compliant: boolean | null
          presenter_id: string | null
          project_id: string
          related_incident_id: string | null
          scheduled_date: string
          status: Database["public"]["Enums"]["toolbox_talk_status"]
          talk_date: string
          talk_number: string
          topic: string
          topic_id: string | null
          trainer_id: string | null
          trainer_name: string | null
          updated_at: string | null
        }
        Insert: {
          attendance_count?: number | null
          attendees?: Json | null
          category?: Database["public"]["Enums"]["toolbox_topic_category"]
          company_id: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          handout_url?: string | null
          id?: string
          osha_compliant?: boolean | null
          presenter_id?: string | null
          project_id: string
          related_incident_id?: string | null
          scheduled_date?: string
          status?: Database["public"]["Enums"]["toolbox_talk_status"]
          talk_date: string
          talk_number?: string
          topic: string
          topic_id?: string | null
          trainer_id?: string | null
          trainer_name?: string | null
          updated_at?: string | null
        }
        Update: {
          attendance_count?: number | null
          attendees?: Json | null
          category?: Database["public"]["Enums"]["toolbox_topic_category"]
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          handout_url?: string | null
          id?: string
          osha_compliant?: boolean | null
          presenter_id?: string | null
          project_id?: string
          related_incident_id?: string | null
          scheduled_date?: string
          status?: Database["public"]["Enums"]["toolbox_talk_status"]
          talk_date?: string
          talk_number?: string
          topic?: string
          topic_id?: string | null
          trainer_id?: string | null
          trainer_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "toolbox_talks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toolbox_talks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toolbox_talks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toolbox_talks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "toolbox_talks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toolbox_talks_related_incident_id_fkey"
            columns: ["related_incident_id"]
            isOneToOne: false
            referencedRelation: "osha_300_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toolbox_talks_related_incident_id_fkey"
            columns: ["related_incident_id"]
            isOneToOne: false
            referencedRelation: "safety_incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toolbox_talks_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transmittal_attachments: {
        Row: {
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          item_id: string | null
          transmittal_id: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          item_id?: string | null
          transmittal_id: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          item_id?: string | null
          transmittal_id?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transmittal_attachments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "transmittal_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transmittal_attachments_transmittal_id_fkey"
            columns: ["transmittal_id"]
            isOneToOne: false
            referencedRelation: "transmittals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transmittal_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transmittal_items: {
        Row: {
          action_required: string | null
          copies: number | null
          created_at: string | null
          description: string
          drawing_number: string | null
          format: string | null
          id: string
          item_number: number
          item_type: string
          notes: string | null
          reference_id: string | null
          reference_number: string | null
          specification_section: string | null
          status: string | null
          transmittal_id: string
        }
        Insert: {
          action_required?: string | null
          copies?: number | null
          created_at?: string | null
          description: string
          drawing_number?: string | null
          format?: string | null
          id?: string
          item_number: number
          item_type: string
          notes?: string | null
          reference_id?: string | null
          reference_number?: string | null
          specification_section?: string | null
          status?: string | null
          transmittal_id: string
        }
        Update: {
          action_required?: string | null
          copies?: number | null
          created_at?: string | null
          description?: string
          drawing_number?: string | null
          format?: string | null
          id?: string
          item_number?: number
          item_type?: string
          notes?: string | null
          reference_id?: string | null
          reference_number?: string | null
          specification_section?: string | null
          status?: string | null
          transmittal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transmittal_items_transmittal_id_fkey"
            columns: ["transmittal_id"]
            isOneToOne: false
            referencedRelation: "transmittals"
            referencedColumns: ["id"]
          },
        ]
      }
      transmittals: {
        Row: {
          acknowledgment_notes: string | null
          acknowledgment_signature: string | null
          cc_external: Json | null
          cc_list: string[] | null
          company_id: string
          cover_letter: string | null
          created_at: string | null
          created_by: string | null
          date_due: string | null
          date_sent: string | null
          distribution_list_id: string | null
          from_company: string
          from_contact: string | null
          from_email: string | null
          from_phone: string | null
          id: string
          project_id: string
          received_by: string | null
          received_date: string | null
          remarks: string | null
          response_date: string | null
          response_due_date: string | null
          response_received: boolean | null
          response_required: boolean | null
          revision_number: number | null
          sent_at: string | null
          sent_by: string | null
          status: string | null
          subject: string
          to_company: string
          to_contact: string | null
          to_email: string | null
          to_phone: string | null
          tracking_number: string | null
          transmission_method: string | null
          transmittal_number: string
          updated_at: string | null
        }
        Insert: {
          acknowledgment_notes?: string | null
          acknowledgment_signature?: string | null
          cc_external?: Json | null
          cc_list?: string[] | null
          company_id: string
          cover_letter?: string | null
          created_at?: string | null
          created_by?: string | null
          date_due?: string | null
          date_sent?: string | null
          distribution_list_id?: string | null
          from_company: string
          from_contact?: string | null
          from_email?: string | null
          from_phone?: string | null
          id?: string
          project_id: string
          received_by?: string | null
          received_date?: string | null
          remarks?: string | null
          response_date?: string | null
          response_due_date?: string | null
          response_received?: boolean | null
          response_required?: boolean | null
          revision_number?: number | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
          subject: string
          to_company: string
          to_contact?: string | null
          to_email?: string | null
          to_phone?: string | null
          tracking_number?: string | null
          transmission_method?: string | null
          transmittal_number: string
          updated_at?: string | null
        }
        Update: {
          acknowledgment_notes?: string | null
          acknowledgment_signature?: string | null
          cc_external?: Json | null
          cc_list?: string[] | null
          company_id?: string
          cover_letter?: string | null
          created_at?: string | null
          created_by?: string | null
          date_due?: string | null
          date_sent?: string | null
          distribution_list_id?: string | null
          from_company?: string
          from_contact?: string | null
          from_email?: string | null
          from_phone?: string | null
          id?: string
          project_id?: string
          received_by?: string | null
          received_date?: string | null
          remarks?: string | null
          response_date?: string | null
          response_due_date?: string | null
          response_received?: boolean | null
          response_required?: boolean | null
          revision_number?: number | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
          subject?: string
          to_company?: string
          to_contact?: string | null
          to_email?: string | null
          to_phone?: string | null
          tracking_number?: string | null
          transmission_method?: string | null
          transmittal_number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transmittals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transmittals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transmittals_distribution_list_id_fkey"
            columns: ["distribution_list_id"]
            isOneToOne: false
            referencedRelation: "distribution_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transmittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transmittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "transmittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transmittals_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      typing_indicators: {
        Row: {
          conversation_id: string
          typing_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          typing_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          typing_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "typing_indicators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_custom_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          custom_role_id: string
          id: string
          project_id: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          custom_role_id: string
          id?: string
          project_id?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          custom_role_id?: string
          id?: string
          project_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_custom_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_custom_roles_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_custom_roles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_custom_roles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "user_custom_roles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_custom_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permission_overrides: {
        Row: {
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          override_type: string
          permission_id: string
          project_id: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          override_type: string
          permission_id: string
          project_id?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          override_type?: string
          permission_id?: string
          project_id?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permission_overrides_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permission_overrides_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permission_overrides_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permission_overrides_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "user_permission_overrides_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permission_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string | null
          deleted_at: string | null
          email: string
          first_name: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          last_seen_at: string | null
          notification_preferences: Json | null
          phone: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email: string
          first_name?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          last_name?: string | null
          last_seen_at?: string | null
          notification_preferences?: Json | null
          phone?: string | null
          role: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          last_seen_at?: string | null
          notification_preferences?: Json | null
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      warranties: {
        Row: {
          closeout_document_id: string | null
          company_id: string
          coverage_description: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          document_url: string | null
          duration_years: number | null
          end_date: string
          id: string
          last_notification_sent: string | null
          manufacturer_contact: string | null
          manufacturer_email: string | null
          manufacturer_name: string | null
          manufacturer_phone: string | null
          notes: string | null
          notification_days: number[] | null
          project_id: string
          spec_section: string | null
          start_date: string
          status: string | null
          subcontractor_id: string | null
          title: string
          updated_at: string | null
          warranty_number: string | null
          warranty_type: string | null
        }
        Insert: {
          closeout_document_id?: string | null
          company_id: string
          coverage_description?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          document_url?: string | null
          duration_years?: number | null
          end_date: string
          id?: string
          last_notification_sent?: string | null
          manufacturer_contact?: string | null
          manufacturer_email?: string | null
          manufacturer_name?: string | null
          manufacturer_phone?: string | null
          notes?: string | null
          notification_days?: number[] | null
          project_id: string
          spec_section?: string | null
          start_date: string
          status?: string | null
          subcontractor_id?: string | null
          title: string
          updated_at?: string | null
          warranty_number?: string | null
          warranty_type?: string | null
        }
        Update: {
          closeout_document_id?: string | null
          company_id?: string
          coverage_description?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          document_url?: string | null
          duration_years?: number | null
          end_date?: string
          id?: string
          last_notification_sent?: string | null
          manufacturer_contact?: string | null
          manufacturer_email?: string | null
          manufacturer_name?: string | null
          manufacturer_phone?: string | null
          notes?: string | null
          notification_days?: number[] | null
          project_id?: string
          spec_section?: string | null
          start_date?: string
          status?: string | null
          subcontractor_id?: string | null
          title?: string
          updated_at?: string | null
          warranty_number?: string | null
          warranty_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warranties_closeout_document_id_fkey"
            columns: ["closeout_document_id"]
            isOneToOne: false
            referencedRelation: "closeout_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "warranties_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_history: {
        Row: {
          company_id: string
          created_at: string | null
          daylight_hours: number | null
          fetched_at: string | null
          humidity_percent: number | null
          id: string
          latitude: number
          longitude: number
          precipitation: number | null
          precipitation_probability: number | null
          project_id: string
          raw_response: Json | null
          snow_depth: number | null
          source: string | null
          sunrise: string | null
          sunset: string | null
          temperature_avg: number | null
          temperature_high: number | null
          temperature_low: number | null
          uv_index_max: number | null
          visibility: number | null
          weather_code: number | null
          weather_condition: string | null
          weather_date: string
          wind_direction: number | null
          wind_speed_avg: number | null
          wind_speed_max: number | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          daylight_hours?: number | null
          fetched_at?: string | null
          humidity_percent?: number | null
          id?: string
          latitude: number
          longitude: number
          precipitation?: number | null
          precipitation_probability?: number | null
          project_id: string
          raw_response?: Json | null
          snow_depth?: number | null
          source?: string | null
          sunrise?: string | null
          sunset?: string | null
          temperature_avg?: number | null
          temperature_high?: number | null
          temperature_low?: number | null
          uv_index_max?: number | null
          visibility?: number | null
          weather_code?: number | null
          weather_condition?: string | null
          weather_date: string
          wind_direction?: number | null
          wind_speed_avg?: number | null
          wind_speed_max?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          daylight_hours?: number | null
          fetched_at?: string | null
          humidity_percent?: number | null
          id?: string
          latitude?: number
          longitude?: number
          precipitation?: number | null
          precipitation_probability?: number | null
          project_id?: string
          raw_response?: Json | null
          snow_depth?: number | null
          source?: string | null
          sunrise?: string | null
          sunset?: string | null
          temperature_avg?: number | null
          temperature_high?: number | null
          temperature_low?: number | null
          uv_index_max?: number | null
          visibility?: number | null
          weather_code?: number | null
          weather_condition?: string | null
          weather_date?: string
          wind_direction?: number | null
          wind_speed_avg?: number | null
          wind_speed_max?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weather_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "weather_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_item_comments: {
        Row: {
          comment: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          id: string
          mentioned_users: string[] | null
          updated_at: string | null
          workflow_item_id: string
        }
        Insert: {
          comment: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          mentioned_users?: string[] | null
          updated_at?: string | null
          workflow_item_id: string
        }
        Update: {
          comment?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          mentioned_users?: string[] | null
          updated_at?: string | null
          workflow_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_item_comments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_item_comments_workflow_item_id_fkey"
            columns: ["workflow_item_id"]
            isOneToOne: false
            referencedRelation: "workflow_items"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_item_history: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string | null
          field_changed: string | null
          id: string
          new_value: string | null
          old_value: string | null
          workflow_item_id: string
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by?: string | null
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          workflow_item_id: string
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string | null
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          workflow_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_item_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_item_history_workflow_item_id_fkey"
            columns: ["workflow_item_id"]
            isOneToOne: false
            referencedRelation: "workflow_items"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_items: {
        Row: {
          assignees: string[] | null
          closed_date: string | null
          cost_impact: number | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          discipline: string | null
          due_date: string | null
          id: string
          more_information: string | null
          number: number | null
          opened_date: string | null
          priority: string | null
          project_id: string
          raised_by: string | null
          reference_number: string | null
          resolution: string | null
          schedule_impact: number | null
          status: string
          title: string
          updated_at: string | null
          workflow_type_id: string
        }
        Insert: {
          assignees?: string[] | null
          closed_date?: string | null
          cost_impact?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          discipline?: string | null
          due_date?: string | null
          id?: string
          more_information?: string | null
          number?: number | null
          opened_date?: string | null
          priority?: string | null
          project_id: string
          raised_by?: string | null
          reference_number?: string | null
          resolution?: string | null
          schedule_impact?: number | null
          status?: string
          title: string
          updated_at?: string | null
          workflow_type_id: string
        }
        Update: {
          assignees?: string[] | null
          closed_date?: string | null
          cost_impact?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          discipline?: string | null
          due_date?: string | null
          id?: string
          more_information?: string | null
          number?: number | null
          opened_date?: string | null
          priority?: string | null
          project_id?: string
          raised_by?: string | null
          reference_number?: string | null
          resolution?: string | null
          schedule_impact?: number | null
          status?: string
          title?: string
          updated_at?: string | null
          workflow_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "workflow_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_items_raised_by_fkey"
            columns: ["raised_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_items_workflow_type_id_fkey"
            columns: ["workflow_type_id"]
            isOneToOne: false
            referencedRelation: "workflow_types"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_types: {
        Row: {
          company_id: string
          created_at: string | null
          deleted_at: string | null
          has_cost_impact: boolean | null
          has_schedule_impact: boolean | null
          id: string
          is_active: boolean | null
          is_custom: boolean | null
          is_default: boolean | null
          name_plural: string
          name_singular: string
          prefix: string | null
          priorities: Json | null
          requires_approval: boolean | null
          statuses: Json | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          deleted_at?: string | null
          has_cost_impact?: boolean | null
          has_schedule_impact?: boolean | null
          id?: string
          is_active?: boolean | null
          is_custom?: boolean | null
          is_default?: boolean | null
          name_plural: string
          name_singular: string
          prefix?: string | null
          priorities?: Json | null
          requires_approval?: boolean | null
          statuses?: Json | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          deleted_at?: string | null
          has_cost_impact?: boolean | null
          has_schedule_impact?: boolean | null
          id?: string
          is_active?: boolean | null
          is_custom?: boolean | null
          is_default?: boolean | null
          name_plural?: string
          name_singular?: string
          prefix?: string | null
          priorities?: Json | null
          requires_approval?: boolean | null
          statuses?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      analytics_latest_predictions: {
        Row: {
          budget_confidence_score: number | null
          budget_feature_importance: Json | null
          budget_overrun_amount_high: number | null
          budget_overrun_amount_low: number | null
          budget_overrun_amount_mid: number | null
          budget_overrun_probability: number | null
          cost_risk_score: number | null
          created_at: string | null
          expires_at: string | null
          id: string | null
          input_features: Json | null
          is_latest: boolean | null
          model_version: string | null
          operational_risk_score: number | null
          overall_risk_score: number | null
          prediction_date: string | null
          project_id: string | null
          project_name: string | null
          project_status: string | null
          projected_completion_date: string | null
          risk_feature_importance: Json | null
          schedule_confidence_score: number | null
          schedule_delay_days_high: number | null
          schedule_delay_days_low: number | null
          schedule_delay_days_mid: number | null
          schedule_delay_probability: number | null
          schedule_feature_importance: Json | null
          schedule_risk_score: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_predictions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_predictions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "analytics_predictions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_model_performance: {
        Row: {
          accuracy: number | null
          is_active: boolean | null
          is_production: boolean | null
          mae: number | null
          model_type: Database["public"]["Enums"]["analytics_model_type"] | null
          model_version: string | null
          r_squared: number | null
          rmse: number | null
          training_completed_at: string | null
          training_samples: number | null
        }
        Insert: {
          accuracy?: number | null
          is_active?: boolean | null
          is_production?: boolean | null
          mae?: number | null
          model_type?:
            | Database["public"]["Enums"]["analytics_model_type"]
            | null
          model_version?: string | null
          r_squared?: number | null
          rmse?: number | null
          training_completed_at?: string | null
          training_samples?: number | null
        }
        Update: {
          accuracy?: number | null
          is_active?: boolean | null
          is_production?: boolean | null
          mae?: number | null
          model_type?:
            | Database["public"]["Enums"]["analytics_model_type"]
            | null
          model_version?: string | null
          r_squared?: number | null
          rmse?: number | null
          training_completed_at?: string | null
          training_samples?: number | null
        }
        Relationships: []
      }
      analytics_pending_recommendations: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          category:
            | Database["public"]["Enums"]["recommendation_category"]
            | null
          created_at: string | null
          description: string | null
          dismissal_reason: string | null
          dismissed_at: string | null
          dismissed_by: string | null
          due_date: string | null
          id: string | null
          implemented_at: string | null
          implemented_by: string | null
          notes: string | null
          potential_impact: string | null
          prediction_id: string | null
          priority:
            | Database["public"]["Enums"]["recommendation_priority"]
            | null
          project_id: string | null
          project_name: string | null
          related_entity_data: Json | null
          related_entity_id: string | null
          related_entity_type: string | null
          status: Database["public"]["Enums"]["recommendation_status"] | null
          suggested_action: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_recommendations_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_recommendations_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_recommendations_dismissed_by_fkey"
            columns: ["dismissed_by"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_recommendations_dismissed_by_fkey"
            columns: ["dismissed_by"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_recommendations_implemented_by_fkey"
            columns: ["implemented_by"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_recommendations_implemented_by_fkey"
            columns: ["implemented_by"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_recommendations_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "analytics_latest_predictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_recommendations_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "analytics_predictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_recommendations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_recommendations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "analytics_recommendations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_training_data_view: {
        Row: {
          approved_change_orders_cost: number | null
          avg_co_approval_days: number | null
          avg_daily_workforce: number | null
          avg_rfi_response_days: number | null
          avg_submittal_response_days: number | null
          baseline_variance_days: number | null
          budget: number | null
          change_order_ratio: number | null
          completed_punch_items: number | null
          completion_percentage: number | null
          contract_value: number | null
          cost_to_date: number | null
          created_at: string | null
          critical_path_length_days: number | null
          days_since_incident: number | null
          days_since_start: number | null
          days_to_planned_completion: number | null
          id: string | null
          milestones_completed: number | null
          milestones_total: number | null
          near_misses_mtd: number | null
          open_change_orders: number | null
          open_punch_items: number | null
          open_rfis: number | null
          open_submittals: number | null
          osha_recordable_mtd: number | null
          overall_percent_complete: number | null
          overdue_change_orders: number | null
          overdue_rfis: number | null
          overdue_submittals: number | null
          pending_approvals: number | null
          pending_change_orders_cost: number | null
          planned_completion_date: string | null
          planned_start_date: string | null
          project_end_date: string | null
          project_id: string | null
          project_start_date: string | null
          project_status: string | null
          projected_completion_date: string | null
          safety_incidents_mtd: number | null
          schedule_items_completed: number | null
          schedule_items_total: number | null
          snapshot_date: string | null
          tasks_on_critical_path: number | null
          total_documents: number | null
          total_equipment_hours: number | null
          total_labor_hours: number | null
          total_punch_items: number | null
          weather_delay_days: number | null
          weather_delay_hours: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_project_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_project_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "analytics_project_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_users_readonly: {
        Row: {
          created_at: string | null
          email: string | null
          id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string | null
        }
        Relationships: []
      }
      auth_users_safe: {
        Row: {
          confirmed_at: string | null
          created_at: string | null
          email: string | null
          email_confirmed_at: string | null
          id: string | null
          is_super_admin: boolean | null
          last_sign_in_at: string | null
          phone: string | null
          raw_app_meta_data: Json | null
          raw_user_meta_data: Json | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string | null
          email?: string | null
          email_confirmed_at?: string | null
          id?: string | null
          is_super_admin?: boolean | null
          last_sign_in_at?: string | null
          phone?: string | null
          raw_app_meta_data?: Json | null
          raw_user_meta_data?: Json | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string | null
          email?: string | null
          email_confirmed_at?: string | null
          id?: string | null
          is_super_admin?: boolean | null
          last_sign_in_at?: string | null
          phone?: string | null
          raw_app_meta_data?: Json | null
          raw_user_meta_data?: Json | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      change_order_summary: {
        Row: {
          approved_amount: number | null
          approved_days: number | null
          assigned_to: string | null
          attachment_count: number | null
          ball_in_court: string | null
          ball_in_court_role: string | null
          change_type: string | null
          co_number: number | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          date_created: string | null
          date_estimated: string | null
          date_executed: string | null
          date_internal_approved: string | null
          date_owner_approved: string | null
          date_owner_submitted: string | null
          date_submitted: string | null
          days_in_status: number | null
          deleted_at: string | null
          description: string | null
          display_number: string | null
          estimator_id: string | null
          id: string | null
          initiated_by: string | null
          internal_approval_status: string | null
          internal_approver_id: string | null
          internal_approver_name: string | null
          is_awaiting_action: boolean | null
          is_pco: boolean | null
          item_count: number | null
          justification: string | null
          legacy_workflow_item_id: string | null
          original_contract_amount: number | null
          owner_approval_status: string | null
          owner_approver_name: string | null
          owner_comments: string | null
          owner_signature_url: string | null
          pco_number: number | null
          previous_changes_amount: number | null
          pricing_method: string | null
          project_id: string | null
          proposed_amount: number | null
          proposed_days: number | null
          related_rfi_id: string | null
          related_site_condition_id: string | null
          related_submittal_id: string | null
          revised_contract_amount: number | null
          status: string | null
          subcontractor_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          approved_amount?: number | null
          approved_days?: number | null
          assigned_to?: string | null
          attachment_count?: never
          ball_in_court?: string | null
          ball_in_court_role?: string | null
          change_type?: string | null
          co_number?: number | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date_created?: string | null
          date_estimated?: string | null
          date_executed?: string | null
          date_internal_approved?: string | null
          date_owner_approved?: string | null
          date_owner_submitted?: string | null
          date_submitted?: string | null
          days_in_status?: never
          deleted_at?: string | null
          description?: string | null
          display_number?: never
          estimator_id?: string | null
          id?: string | null
          initiated_by?: string | null
          internal_approval_status?: string | null
          internal_approver_id?: string | null
          internal_approver_name?: string | null
          is_awaiting_action?: never
          is_pco?: boolean | null
          item_count?: never
          justification?: string | null
          legacy_workflow_item_id?: string | null
          original_contract_amount?: number | null
          owner_approval_status?: string | null
          owner_approver_name?: string | null
          owner_comments?: string | null
          owner_signature_url?: string | null
          pco_number?: number | null
          previous_changes_amount?: number | null
          pricing_method?: string | null
          project_id?: string | null
          proposed_amount?: number | null
          proposed_days?: number | null
          related_rfi_id?: string | null
          related_site_condition_id?: string | null
          related_submittal_id?: string | null
          revised_contract_amount?: number | null
          status?: string | null
          subcontractor_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_amount?: number | null
          approved_days?: number | null
          assigned_to?: string | null
          attachment_count?: never
          ball_in_court?: string | null
          ball_in_court_role?: string | null
          change_type?: string | null
          co_number?: number | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date_created?: string | null
          date_estimated?: string | null
          date_executed?: string | null
          date_internal_approved?: string | null
          date_owner_approved?: string | null
          date_owner_submitted?: string | null
          date_submitted?: string | null
          days_in_status?: never
          deleted_at?: string | null
          description?: string | null
          display_number?: never
          estimator_id?: string | null
          id?: string | null
          initiated_by?: string | null
          internal_approval_status?: string | null
          internal_approver_id?: string | null
          internal_approver_name?: string | null
          is_awaiting_action?: never
          is_pco?: boolean | null
          item_count?: never
          justification?: string | null
          legacy_workflow_item_id?: string | null
          original_contract_amount?: number | null
          owner_approval_status?: string | null
          owner_approver_name?: string | null
          owner_comments?: string | null
          owner_signature_url?: string | null
          pco_number?: number | null
          previous_changes_amount?: number | null
          pricing_method?: string | null
          project_id?: string | null
          proposed_amount?: number | null
          proposed_days?: number | null
          related_rfi_id?: string | null
          related_site_condition_id?: string | null
          related_submittal_id?: string | null
          revised_contract_amount?: number | null
          status?: string | null
          subcontractor_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_orders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_ball_in_court_fkey"
            columns: ["ball_in_court"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_estimator_id_fkey"
            columns: ["estimator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_internal_approver_id_fkey"
            columns: ["internal_approver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_legacy_workflow_item_id_fkey"
            columns: ["legacy_workflow_item_id"]
            isOneToOne: false
            referencedRelation: "workflow_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_related_rfi_id_fkey"
            columns: ["related_rfi_id"]
            isOneToOne: false
            referencedRelation: "rfi_register"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_related_rfi_id_fkey"
            columns: ["related_rfi_id"]
            isOneToOne: false
            referencedRelation: "rfi_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_related_rfi_id_fkey"
            columns: ["related_rfi_id"]
            isOneToOne: false
            referencedRelation: "rfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_related_submittal_id_fkey"
            columns: ["related_submittal_id"]
            isOneToOne: false
            referencedRelation: "submittal_register"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_related_submittal_id_fkey"
            columns: ["related_submittal_id"]
            isOneToOne: false
            referencedRelation: "submittals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      client_project_summary: {
        Row: {
          address: string | null
          budget: number | null
          city: string | null
          contract_value: number | null
          custom_logo_url: string | null
          description: string | null
          end_date: string | null
          final_completion_date: string | null
          id: string | null
          latitude: number | null
          longitude: number | null
          name: string | null
          project_number: string | null
          show_change_orders: boolean | null
          show_daily_reports: boolean | null
          show_documents: boolean | null
          show_photos: boolean | null
          show_punch_lists: boolean | null
          show_rfis: boolean | null
          show_schedule: boolean | null
          start_date: string | null
          state: string | null
          status: string | null
          substantial_completion_date: string | null
          welcome_message: string | null
          zip: string | null
        }
        Relationships: []
      }
      closeout_status_by_spec: {
        Row: {
          approved_count: number | null
          completion_percentage: number | null
          pending_count: number | null
          project_id: string | null
          rejected_count: number | null
          spec_section: string | null
          spec_section_title: string | null
          total_documents: number | null
          traffic_light: string | null
          waived_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "closeout_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closeout_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "closeout_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      days_since_last_incident: {
        Row: {
          days_since_incident: number | null
          project_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "safety_incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      document_ai_status: {
        Row: {
          ai_processed: boolean | null
          ai_processed_at: string | null
          auto_tags: string[] | null
          category_confidence: number | null
          category_manual: boolean | null
          document_id: string | null
          document_name: string | null
          file_type: string | null
          ocr_confidence: number | null
          ocr_status: Database["public"]["Enums"]["ocr_status"] | null
          primary_category:
            | Database["public"]["Enums"]["document_category_type"]
            | null
          project_id: string | null
          queue_priority: number | null
          queue_status: string | null
          word_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      document_processing_stats: {
        Row: {
          avg_processing_time_ms: number | null
          completed_count: number | null
          failed_count: number | null
          pending_count: number | null
          processing_count: number | null
          project_id: string | null
          total_documents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_processing_queue_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_processing_queue_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "document_processing_queue_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_summary: {
        Row: {
          active_assignment_project_id: string | null
          capacity: string | null
          category: string | null
          certification_type: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          current_hours: number | null
          current_location: string | null
          current_miles: number | null
          current_project_id: string | null
          days_since_maintenance: number | null
          deleted_at: string | null
          description: string | null
          dimensions: string | null
          equipment_number: string | null
          equipment_type: string | null
          fuel_type: string | null
          hourly_cost: number | null
          hours_this_month: number | null
          hours_this_year: number | null
          id: string | null
          image_url: string | null
          insurance_expiry: string | null
          insurance_policy: string | null
          make: string | null
          model: string | null
          name: string | null
          next_maintenance_date: string | null
          notes: string | null
          operating_weight: string | null
          owner_company: string | null
          ownership_type: string | null
          purchase_date: string | null
          purchase_price: number | null
          registration_expiry: string | null
          registration_number: string | null
          rental_rate: number | null
          rental_rate_type: string | null
          requires_certified_operator: boolean | null
          serial_number: string | null
          status: string | null
          updated_at: string | null
          vin: string | null
          year: number | null
        }
        Insert: {
          active_assignment_project_id?: never
          capacity?: string | null
          category?: string | null
          certification_type?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_hours?: number | null
          current_location?: string | null
          current_miles?: number | null
          current_project_id?: string | null
          days_since_maintenance?: never
          deleted_at?: string | null
          description?: string | null
          dimensions?: string | null
          equipment_number?: string | null
          equipment_type?: string | null
          fuel_type?: string | null
          hourly_cost?: number | null
          hours_this_month?: never
          hours_this_year?: never
          id?: string | null
          image_url?: string | null
          insurance_expiry?: string | null
          insurance_policy?: string | null
          make?: string | null
          model?: string | null
          name?: string | null
          next_maintenance_date?: never
          notes?: string | null
          operating_weight?: string | null
          owner_company?: string | null
          ownership_type?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          registration_expiry?: string | null
          registration_number?: string | null
          rental_rate?: number | null
          rental_rate_type?: string | null
          requires_certified_operator?: boolean | null
          serial_number?: string | null
          status?: string | null
          updated_at?: string | null
          vin?: string | null
          year?: number | null
        }
        Update: {
          active_assignment_project_id?: never
          capacity?: string | null
          category?: string | null
          certification_type?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_hours?: number | null
          current_location?: string | null
          current_miles?: number | null
          current_project_id?: string | null
          days_since_maintenance?: never
          deleted_at?: string | null
          description?: string | null
          dimensions?: string | null
          equipment_number?: string | null
          equipment_type?: string | null
          fuel_type?: string | null
          hourly_cost?: number | null
          hours_this_month?: never
          hours_this_year?: never
          id?: string | null
          image_url?: string | null
          insurance_expiry?: string | null
          insurance_policy?: string | null
          make?: string | null
          model?: string | null
          name?: string | null
          next_maintenance_date?: never
          notes?: string | null
          operating_weight?: string | null
          owner_company?: string | null
          ownership_type?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          registration_expiry?: string | null
          registration_number?: string | null
          rental_rate?: number | null
          rental_rate_type?: string | null
          requires_certified_operator?: boolean | null
          serial_number?: string | null
          status?: string | null
          updated_at?: string | null
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_current_project_id_fkey"
            columns: ["current_project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_current_project_id_fkey"
            columns: ["current_project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "equipment_current_project_id_fkey"
            columns: ["current_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      expiring_certificates_view: {
        Row: {
          additional_insured_name: string | null
          additional_insured_required: boolean | null
          additional_insured_verified: boolean | null
          alert_days_before_expiry: number | null
          bodily_injury_per_accident: number | null
          bodily_injury_per_person: number | null
          carrier_naic_number: string | null
          carrier_name: string | null
          certificate_number: string | null
          certificate_storage_path: string | null
          certificate_url: string | null
          combined_single_limit: number | null
          company_id: string | null
          company_name: string | null
          created_at: string | null
          created_by: string | null
          damage_to_rented_premises: number | null
          days_until_expiry: number | null
          deleted_at: string | null
          description_of_operations: string | null
          each_occurrence_limit: number | null
          effective_date: string | null
          expiration_date: string | null
          general_aggregate_limit: number | null
          id: string | null
          insurance_type: Database["public"]["Enums"]["insurance_type"] | null
          issued_by_email: string | null
          issued_by_name: string | null
          issued_by_phone: string | null
          medical_expense_limit: number | null
          notes: string | null
          personal_adv_injury_limit: number | null
          policy_number: string | null
          primary_noncontributory_required: boolean | null
          primary_noncontributory_verified: boolean | null
          products_completed_ops_limit: number | null
          project_id: string | null
          project_name: string | null
          property_damage_limit: number | null
          status: Database["public"]["Enums"]["certificate_status"] | null
          subcontractor_id: string | null
          suppress_alerts: boolean | null
          umbrella_aggregate: number | null
          umbrella_each_occurrence: number | null
          updated_at: string | null
          waiver_of_subrogation_required: boolean | null
          waiver_of_subrogation_verified: boolean | null
          workers_comp_el_disease_employee: number | null
          workers_comp_el_disease_policy: number | null
          workers_comp_el_each_accident: number | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_certificates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_certificates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_certificates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_certificates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "insurance_certificates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      expiring_certifications: {
        Row: {
          certification_status: string | null
          certified_date: string | null
          company_id: string | null
          created_at: string | null
          expires_date: string | null
          id: string | null
          is_current: boolean | null
          toolbox_talk_id: string | null
          topic_category:
            | Database["public"]["Enums"]["toolbox_topic_category"]
            | null
          topic_id: string | null
          topic_title: string | null
          user_id: string | null
          worker_company: string | null
          worker_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "toolbox_talk_certifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toolbox_talk_certifications_toolbox_talk_id_fkey"
            columns: ["toolbox_talk_id"]
            isOneToOne: false
            referencedRelation: "toolbox_talks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toolbox_talk_certifications_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "toolbox_talk_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toolbox_talk_certifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toolbox_talk_certifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      expiring_warranties: {
        Row: {
          coverage_description: string | null
          days_until_expiration: number | null
          end_date: string | null
          id: string | null
          manufacturer_name: string | null
          project_id: string | null
          project_name: string | null
          spec_section: string | null
          start_date: string | null
          subcontractor_name: string | null
          title: string | null
          warranty_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warranties_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "warranties_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      look_ahead_activity_summary: {
        Row: {
          activity_name: string | null
          actual_end_date: string | null
          actual_start_date: string | null
          created_at: string | null
          description: string | null
          duration_days: number | null
          id: string | null
          location: string | null
          notes: string | null
          open_constraints: number | null
          percent_complete: number | null
          planned_end_date: string | null
          planned_start_date: string | null
          priority: number | null
          project_id: string | null
          project_name: string | null
          status:
            | Database["public"]["Enums"]["look_ahead_activity_status"]
            | null
          subcontractor_id: string | null
          total_constraints: number | null
          trade: string | null
          updated_at: string | null
          week_number: number | null
          week_start_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "look_ahead_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "look_ahead_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "look_ahead_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      look_ahead_variance_analysis: {
        Row: {
          affected_trades: string[] | null
          occurrence_count: number | null
          percentage: number | null
          project_id: string | null
          variance_category:
            | Database["public"]["Enums"]["variance_category"]
            | null
          week_start_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "look_ahead_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "look_ahead_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "look_ahead_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      look_ahead_weekly_ppc: {
        Row: {
          committed_count: number | null
          completed_count: number | null
          executable_count: number | null
          ppc_percentage: number | null
          project_id: string | null
          ready_count: number | null
          variance_count: number | null
          week_start_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "look_ahead_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "look_ahead_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "look_ahead_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      material_received_with_details: {
        Row: {
          condition: string | null
          condition_notes: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          daily_report_date: string | null
          daily_report_delivery_id: string | null
          daily_report_id: string | null
          deleted_at: string | null
          delivery_date: string | null
          delivery_ticket_number: string | null
          delivery_time: string | null
          id: string | null
          inspected_at: string | null
          inspected_by: string | null
          inspected_by_email: string | null
          inspected_by_name: string | null
          material_description: string | null
          notes: string | null
          photo_count: number | null
          po_number: string | null
          project_id: string | null
          project_name: string | null
          project_number: string | null
          quantity: string | null
          received_by: string | null
          received_by_email: string | null
          received_by_name: string | null
          status: string | null
          storage_location: string | null
          submittal_id: string | null
          submittal_number: number | null
          submittal_procurement_id: string | null
          submittal_title: string | null
          updated_at: string | null
          vendor: string | null
          vendor_contact: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_received_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_received_daily_report_delivery_id_fkey"
            columns: ["daily_report_delivery_id"]
            isOneToOne: false
            referencedRelation: "daily_report_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_received_inspected_by_fkey"
            columns: ["inspected_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_received_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_received_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "material_received_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_received_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_received_submittal_procurement_id_fkey"
            columns: ["submittal_procurement_id"]
            isOneToOne: false
            referencedRelation: "material_received_with_details"
            referencedColumns: ["submittal_id"]
          },
          {
            foreignKeyName: "material_received_submittal_procurement_id_fkey"
            columns: ["submittal_procurement_id"]
            isOneToOne: false
            referencedRelation: "submittal_procurement"
            referencedColumns: ["id"]
          },
        ]
      }
      open_action_items: {
        Row: {
          assigned_to_name: string | null
          description: string | null
          due_date: string | null
          id: string | null
          item_number: number | null
          meeting_date: string | null
          meeting_id: string | null
          meeting_title: string | null
          priority: string | null
          project_id: string | null
          project_name: string | null
          status: string | null
          urgency: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_action_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "upcoming_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "meeting_action_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      osha_300_log: {
        Row: {
          case_number: string | null
          col_g_death: boolean | null
          col_h_days_away: boolean | null
          col_i_restriction: boolean | null
          col_j_other: boolean | null
          col_k_days_away_count: number | null
          col_l_days_restriction_count: number | null
          col_m_injury_illness_type: string | null
          created_at: string | null
          date_of_injury: string | null
          employee_name: string | null
          establishment_name: string | null
          id: string | null
          injury_description: string | null
          job_title: string | null
          log_year: number | null
          osha_recordable: boolean | null
          osha_report_number: string | null
          project_id: string | null
          severity: string | null
          updated_at: string | null
          where_occurred: string | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "safety_incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      osha_300a_summary: {
        Row: {
          calendar_year: number | null
          establishment_name: string | null
          hearing_loss_cases: number | null
          other_illnesses: number | null
          poisoning_cases: number | null
          project_id: string | null
          respiratory_conditions: number | null
          skin_disorders: number | null
          total_days_away: number | null
          total_days_away_cases: number | null
          total_days_restriction: number | null
          total_deaths: number | null
          total_illnesses: number | null
          total_injuries: number | null
          total_other_cases: number | null
          total_recordable_cases: number | null
          total_restriction_cases: number | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "safety_incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      osha_incidence_rates: {
        Row: {
          calendar_year: number | null
          dart_rate: number | null
          establishment_name: string | null
          project_id: string | null
          total_days_away_cases: number | null
          total_recordable_cases: number | null
          total_recordable_incidence_rate: number | null
          total_restriction_cases: number | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "safety_incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_application_summary: {
        Row: {
          application_number: number | null
          approved_at: string | null
          approved_by: string | null
          architect_signature_date: string | null
          architect_signature_url: string | null
          balance_to_finish: number | null
          company_id: string | null
          contract_sum_to_date: number | null
          contractor_signature_date: string | null
          contractor_signature_url: string | null
          created_at: string | null
          created_by: string | null
          current_payment_due: number | null
          deleted_at: string | null
          display_number: string | null
          id: string | null
          less_previous_certificates: number | null
          net_change_orders: number | null
          notes: string | null
          original_contract_sum: number | null
          owner_signature_date: string | null
          owner_signature_url: string | null
          paid_at: string | null
          payment_received_amount: number | null
          payment_reference: string | null
          percent_complete: number | null
          period_to: string | null
          project_id: string | null
          project_name: string | null
          project_number: string | null
          rejection_reason: string | null
          retainage_from_completed: number | null
          retainage_from_stored: number | null
          retainage_percent: number | null
          retainage_release: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          sov_item_count: number | null
          status: string | null
          submitted_at: string | null
          submitted_by: string | null
          total_completed_and_stored: number | null
          total_completed_previous: number | null
          total_completed_this_period: number | null
          total_earned_less_retainage: number | null
          total_materials_stored: number | null
          total_retainage: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_applications_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_applications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_applications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_applications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_applications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "payment_applications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_applications_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      project_budget_summary: {
        Row: {
          actual_cost: number | null
          approved_changes: number | null
          committed_cost: number | null
          cost_code: string | null
          cost_code_id: string | null
          cost_code_name: string | null
          created_at: string | null
          division: string | null
          estimated_cost_at_completion: number | null
          id: string | null
          notes: string | null
          original_budget: number | null
          percent_spent: number | null
          project_id: string | null
          revised_budget: number | null
          updated_at: string | null
          variance: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_budgets_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_closeout_summary: {
        Row: {
          active_warranties: number | null
          approved: number | null
          completed_checklist_items: number | null
          expiring_warranties: number | null
          overall_completion_percentage: number | null
          pending: number | null
          project_id: string | null
          project_name: string | null
          rejected: number | null
          total_checklist_items: number | null
          total_documents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "closeout_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closeout_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "closeout_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_document_status: {
        Row: {
          approved_submittals: number | null
          closed_rfis: number | null
          overdue_rfis: number | null
          overdue_submittals: number | null
          project_id: string | null
          project_name: string | null
          resubmit_submittals: number | null
          total_rfi_cost_impact: number | null
          total_rfi_schedule_impact: number | null
          total_rfis: number | null
          total_submittals: number | null
        }
        Insert: {
          approved_submittals?: never
          closed_rfis?: never
          overdue_rfis?: never
          overdue_submittals?: never
          project_id?: string | null
          project_name?: string | null
          resubmit_submittals?: never
          total_rfi_cost_impact?: never
          total_rfi_schedule_impact?: never
          total_rfis?: never
          total_submittals?: never
        }
        Update: {
          approved_submittals?: never
          closed_rfis?: never
          overdue_rfis?: never
          overdue_submittals?: never
          project_id?: string | null
          project_name?: string | null
          resubmit_submittals?: never
          total_rfi_cost_impact?: never
          total_rfi_schedule_impact?: never
          total_rfis?: never
          total_submittals?: never
        }
        Relationships: []
      }
      project_ppc_trend: {
        Row: {
          blocked_activities: number | null
          completed_activities: number | null
          delayed_activities: number | null
          notes: string | null
          open_constraints: number | null
          planned_activities: number | null
          ppc_change: number | null
          ppc_percentage: number | null
          previous_week_ppc: number | null
          project_id: string | null
          project_name: string | null
          variance_reasons: Json | null
          week_end_date: string | null
          week_start_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "look_ahead_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "look_ahead_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "look_ahead_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      rfi_aging_summary: {
        Row: {
          aging_bucket: string | null
          count: number | null
          project_id: string | null
          total_cost_impact: number | null
          total_schedule_impact: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      rfi_ball_in_court_summary: {
        Row: {
          avg_days_open: number | null
          ball_in_court_name: string | null
          ball_in_court_role: string | null
          open_count: number | null
          overdue_count: number | null
          project_id: string | null
          total_cost_impact: number | null
          total_count: number | null
          total_schedule_impact: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      rfi_register: {
        Row: {
          aging_bucket: string | null
          ball_in_court: string | null
          ball_in_court_name: string | null
          ball_in_court_role: string | null
          cost_impact: number | null
          created_at: string | null
          date_closed: string | null
          date_required: string | null
          date_responded: string | null
          date_submitted: string | null
          days_open: number | null
          days_until_due: number | null
          drawing_reference: string | null
          id: string | null
          is_internal: boolean | null
          is_overdue: boolean | null
          priority: string | null
          project_id: string | null
          question: string | null
          response_due_date: string | null
          response_on_time: boolean | null
          response_time_days: number | null
          response_type: Database["public"]["Enums"]["rfi_response_type"] | null
          rfi_number: number | null
          schedule_impact_days: number | null
          spec_section: string | null
          status: string | null
          subject: string | null
          traffic_light_status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfis_ball_in_court_fkey"
            columns: ["ball_in_court"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      rfi_response_time_analysis: {
        Row: {
          avg_response_days: number | null
          late_count: number | null
          on_time_count: number | null
          on_time_percentage: number | null
          overdue_count: number | null
          project_id: string | null
          responded_count: number | null
          total_rfis: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      rfi_response_type_distribution: {
        Row: {
          count: number | null
          percentage: number | null
          project_id: string | null
          response_type: Database["public"]["Enums"]["rfi_response_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      rfi_summary: {
        Row: {
          assigned_to: string | null
          ball_in_court: string | null
          ball_in_court_role: string | null
          company_id: string | null
          cost_impact: number | null
          created_at: string | null
          created_by: string | null
          date_closed: string | null
          date_created: string | null
          date_required: string | null
          date_responded: string | null
          date_submitted: string | null
          days_open: number | null
          days_overdue: number | null
          days_until_due: number | null
          deleted_at: string | null
          discipline: string | null
          distribution_list: string[] | null
          drawing_id: string | null
          drawing_reference: string | null
          id: string | null
          is_overdue: boolean | null
          legacy_workflow_item_id: string | null
          location: string | null
          priority: string | null
          project_id: string | null
          question: string | null
          related_change_order_id: string | null
          related_submittal_id: string | null
          responded_by: string | null
          response: string | null
          rfi_number: number | null
          schedule_impact_days: number | null
          spec_section: string | null
          status: string | null
          subject: string | null
          submitted_by: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          ball_in_court?: string | null
          ball_in_court_role?: string | null
          company_id?: string | null
          cost_impact?: number | null
          created_at?: string | null
          created_by?: string | null
          date_closed?: string | null
          date_created?: string | null
          date_required?: string | null
          date_responded?: string | null
          date_submitted?: string | null
          days_open?: never
          days_overdue?: never
          days_until_due?: never
          deleted_at?: string | null
          discipline?: string | null
          distribution_list?: string[] | null
          drawing_id?: string | null
          drawing_reference?: string | null
          id?: string | null
          is_overdue?: never
          legacy_workflow_item_id?: string | null
          location?: string | null
          priority?: string | null
          project_id?: string | null
          question?: string | null
          related_change_order_id?: string | null
          related_submittal_id?: string | null
          responded_by?: string | null
          response?: string | null
          rfi_number?: number | null
          schedule_impact_days?: number | null
          spec_section?: string | null
          status?: string | null
          subject?: string | null
          submitted_by?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          ball_in_court?: string | null
          ball_in_court_role?: string | null
          company_id?: string | null
          cost_impact?: number | null
          created_at?: string | null
          created_by?: string | null
          date_closed?: string | null
          date_created?: string | null
          date_required?: string | null
          date_responded?: string | null
          date_submitted?: string | null
          days_open?: never
          days_overdue?: never
          days_until_due?: never
          deleted_at?: string | null
          discipline?: string | null
          distribution_list?: string[] | null
          drawing_id?: string | null
          drawing_reference?: string | null
          id?: string | null
          is_overdue?: never
          legacy_workflow_item_id?: string | null
          location?: string | null
          priority?: string | null
          project_id?: string | null
          question?: string | null
          related_change_order_id?: string | null
          related_submittal_id?: string | null
          responded_by?: string | null
          response?: string | null
          rfi_number?: number | null
          schedule_impact_days?: number | null
          spec_section?: string | null
          status?: string | null
          subject?: string | null
          submitted_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfis_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_ball_in_court_fkey"
            columns: ["ball_in_court"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_drawing_id_fkey"
            columns: ["drawing_id"]
            isOneToOne: false
            referencedRelation: "document_ai_status"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "rfis_drawing_id_fkey"
            columns: ["drawing_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_legacy_workflow_item_id_fkey"
            columns: ["legacy_workflow_item_id"]
            isOneToOne: false
            referencedRelation: "workflow_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_related_submittal_id_fkey"
            columns: ["related_submittal_id"]
            isOneToOne: false
            referencedRelation: "submittal_register"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_related_submittal_id_fkey"
            columns: ["related_submittal_id"]
            isOneToOne: false
            referencedRelation: "submittals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_incident_stats: {
        Row: {
          closed_incidents: number | null
          fatalities: number | null
          first_aid_incidents: number | null
          last_incident_date: string | null
          lost_time_incidents: number | null
          medical_treatment_incidents: number | null
          near_misses: number | null
          open_incidents: number | null
          project_id: string | null
          total_incidents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "safety_incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_items_with_variance: {
        Row: {
          assigned_to: string | null
          baseline_duration_days: number | null
          baseline_finish_date: string | null
          baseline_saved_at: string | null
          baseline_saved_by: string | null
          baseline_start_date: string | null
          color: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          duration_days: number | null
          duration_variance_days: number | null
          finish_date: string | null
          finish_variance_days: number | null
          id: string | null
          imported_at: string | null
          is_critical: boolean | null
          is_milestone: boolean | null
          last_updated_at: string | null
          notes: string | null
          parent_id: string | null
          percent_complete: number | null
          predecessors: string | null
          project_id: string | null
          schedule_status: string | null
          sort_order: number | null
          start_date: string | null
          start_variance_days: number | null
          successors: string | null
          task_id: string | null
          task_name: string | null
          wbs: string | null
        }
        Insert: {
          assigned_to?: string | null
          baseline_duration_days?: number | null
          baseline_finish_date?: string | null
          baseline_saved_at?: string | null
          baseline_saved_by?: string | null
          baseline_start_date?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          duration_days?: number | null
          duration_variance_days?: never
          finish_date?: string | null
          finish_variance_days?: never
          id?: string | null
          imported_at?: string | null
          is_critical?: boolean | null
          is_milestone?: boolean | null
          last_updated_at?: string | null
          notes?: string | null
          parent_id?: string | null
          percent_complete?: number | null
          predecessors?: string | null
          project_id?: string | null
          schedule_status?: never
          sort_order?: number | null
          start_date?: string | null
          start_variance_days?: never
          successors?: string | null
          task_id?: string | null
          task_name?: string | null
          wbs?: string | null
        }
        Update: {
          assigned_to?: string | null
          baseline_duration_days?: number | null
          baseline_finish_date?: string | null
          baseline_saved_at?: string | null
          baseline_saved_by?: string | null
          baseline_start_date?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          duration_days?: number | null
          duration_variance_days?: never
          finish_date?: string | null
          finish_variance_days?: never
          id?: string | null
          imported_at?: string | null
          is_critical?: boolean | null
          is_milestone?: boolean | null
          last_updated_at?: string | null
          notes?: string | null
          parent_id?: string | null
          percent_complete?: number | null
          predecessors?: string | null
          project_id?: string | null
          schedule_status?: never
          sort_order?: number | null
          start_date?: string | null
          start_variance_days?: never
          successors?: string | null
          task_id?: string | null
          task_name?: string | null
          wbs?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_items_baseline_saved_by_fkey"
            columns: ["baseline_saved_by"]
            isOneToOne: false
            referencedRelation: "auth_users_readonly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_items_baseline_saved_by_fkey"
            columns: ["baseline_saved_by"]
            isOneToOne: false
            referencedRelation: "auth_users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "schedule_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "schedule_items_with_variance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "schedule_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      submittal_approval_code_stats: {
        Row: {
          approval_code: string | null
          count: number | null
          percentage: number | null
          project_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      submittal_ball_in_court_summary: {
        Row: {
          avg_days_in_review: number | null
          ball_in_court_entity: string | null
          ball_in_court_name: string | null
          overdue_count: number | null
          pending_count: number | null
          project_id: string | null
          total_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      submittal_register: {
        Row: {
          approval_code: string | null
          ball_in_court: string | null
          ball_in_court_entity: string | null
          ball_in_court_name: string | null
          created_at: string | null
          date_received: string | null
          date_required: string | null
          date_returned: string | null
          date_submitted: string | null
          days_for_review: number | null
          days_in_review: number | null
          days_until_required: number | null
          description: string | null
          id: string | null
          is_overdue: boolean | null
          project_id: string | null
          review_due_date: string | null
          review_status: string | null
          revision_number: number | null
          spec_section: string | null
          spec_section_title: string | null
          subcontractor_id: string | null
          subcontractor_name: string | null
          submittal_number: string | null
          submittal_type: string | null
          title: string | null
          traffic_light_status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submittals_ball_in_court_fkey"
            columns: ["ball_in_court"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      submittal_register_by_spec: {
        Row: {
          approved: number | null
          approved_as_noted: number | null
          code_a_count: number | null
          code_b_count: number | null
          code_c_count: number | null
          code_d_count: number | null
          next_required_date: string | null
          not_submitted: number | null
          overall_status: string | null
          pending_review: number | null
          project_id: string | null
          rejected: number | null
          revise_resubmit: number | null
          spec_section: string | null
          spec_section_title: string | null
          total_submittals: number | null
        }
        Relationships: [
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      toolbox_talk_stats: {
        Row: {
          avg_duration: number | null
          cancelled_talks: number | null
          completed_talks: number | null
          last_completed_date: string | null
          project_id: string | null
          scheduled_talks: number | null
          total_attendees: number | null
          total_talks: number | null
        }
        Relationships: [
          {
            foreignKeyName: "toolbox_talks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toolbox_talks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "toolbox_talks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      upcoming_meetings: {
        Row: {
          confirmed_count: number | null
          id: string | null
          location: string | null
          meeting_date: string | null
          meeting_type: string | null
          open_action_items: number | null
          organizer_name: string | null
          project_id: string | null
          project_name: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["meeting_status"] | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_summary: {
        Row: {
          fetched_at: string | null
          humidity_percent: number | null
          id: string | null
          precipitation: number | null
          project_id: string | null
          project_name: string | null
          project_number: string | null
          temperature_high: number | null
          temperature_low: number | null
          weather_condition: string | null
          weather_date: string | null
          wind_speed_max: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weather_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_document_status"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "weather_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      assign_activity_to_week: {
        Args: {
          p_activity_id: string
          p_new_week_number: number
          p_new_week_start: string
        }
        Returns: boolean
      }
      calculate_checklist_score: {
        Args: { checklist_uuid: string }
        Returns: {
          fail_count: number
          na_count: number
          pass_count: number
          pass_percentage: number
          total_count: number
        }[]
      }
      calculate_duration_days: {
        Args: { p_finish_date: string; p_start_date: string }
        Returns: number
      }
      calculate_next_run_time: {
        Args: {
          p_day_of_month: number
          p_day_of_week: number
          p_frequency: Database["public"]["Enums"]["report_schedule_frequency"]
          p_time_of_day: string
          p_timezone: string
        }
        Returns: string
      }
      calculate_ppc_for_week: {
        Args: { p_project_id: string; p_week_start: string }
        Returns: number
      }
      calculate_reliability_index: {
        Args: { p_project_id: string; p_week_start: string }
        Returns: number
      }
      calculate_risk_score: {
        Args: { p_project_id: string }
        Returns: {
          cost_risk: number
          operational_risk: number
          overall_risk: number
          schedule_risk: number
        }[]
      }
      can_access_compliance_document: {
        Args: { bucket_id: string; file_path: string }
        Returns: boolean
      }
      can_user_approve_request: {
        Args: { p_request_id: string; p_user_id: string }
        Returns: boolean
      }
      check_circular_dependency: {
        Args: { p_predecessor_id: string; p_successor_id: string }
        Returns: boolean
      }
      check_expiring_compliance_documents: {
        Args: never
        Returns: {
          contact_email: string
          days_until_expiration: number
          document_name: string
          document_type: string
          expiration_date: string
          id: string
          subcontractor_id: string
        }[]
      }
      check_insurance_compliance: {
        Args: {
          p_company_id?: string
          p_project_id?: string
          p_subcontractor_id: string
        }
        Returns: {
          certificate_id: string
          gap_description: string
          insurance_type: Database["public"]["Enums"]["insurance_type"]
          is_compliant: boolean
          requirement_id: string
          requirement_name: string
        }[]
      }
      cleanup_expired_backup_codes: { Args: never; Returns: number }
      clear_schedule_baseline: {
        Args: { p_project_id: string }
        Returns: undefined
      }
      collect_project_snapshot: {
        Args: { p_project_id: string }
        Returns: string
      }
      company_has_feature: {
        Args: { p_company_id: string; p_feature_code: string }
        Returns: boolean
      }
      complete_photo_requirement: {
        Args: {
          p_photo_id: string
          p_requirement_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      copy_sov_from_previous_application: {
        Args: {
          p_new_application_id: string
          p_previous_application_id: string
        }
        Returns: undefined
      }
      create_weekly_snapshot: {
        Args: {
          p_company_id: string
          p_notes?: string
          p_project_id: string
          p_variance_reasons?: Json
          p_week_start: string
        }
        Returns: string
      }
      current_user_company_id: { Args: never; Returns: string }
      current_user_role: { Args: never; Returns: string }
      expand_distribution: {
        Args: { p_additional_user_ids: string[]; p_list_ids: string[] }
        Returns: {
          email: string
          name: string
          source: string
          user_id: string
        }[]
      }
      generate_photo_requirements: {
        Args: { p_date?: string; p_project_id: string }
        Returns: number
      }
      generate_submittal_number: {
        Args: { p_project_id: string; p_spec_section: string }
        Returns: string
      }
      generate_variance_summary: {
        Args: { p_project_id: string; p_week_start: string }
        Returns: Json
      }
      get_activities_for_week: {
        Args: { p_project_id: string; p_week_start: string }
        Returns: {
          activity_name: string
          constraint_count: number
          description: string
          duration_days: number
          id: string
          location: string
          open_constraint_count: number
          percent_complete: number
          planned_end_date: string
          planned_start_date: string
          priority: number
          status: Database["public"]["Enums"]["look_ahead_activity_status"]
          subcontractor_name: string
          trade: string
        }[]
      }
      get_client_portal_setting: {
        Args: { p_project_id: string; p_setting: string }
        Returns: boolean
      }
      get_distribution_list_recipients: {
        Args: { p_list_id: string }
        Returns: {
          company: string
          email: string
          is_internal: boolean
          member_id: string
          member_role: string
          name: string
          user_id: string
        }[]
      }
      get_expiring_certificates: {
        Args: { p_company_id: string; p_days?: number }
        Returns: {
          carrier_name: string
          certificate_id: string
          days_until_expiry: number
          expiration_date: string
          insurance_type: Database["public"]["Enums"]["insurance_type"]
          project_id: string
          project_name: string
          subcontractor_id: string
        }[]
      }
      get_jsa_statistics: {
        Args: { p_project_id: string }
        Returns: {
          approved: number
          avg_hazards_per_jsa: number
          completed: number
          high_risk_count: number
          pending_review: number
          total_acknowledgments: number
          total_jsas: number
        }[]
      }
      get_look_ahead_week_range: {
        Args: { p_start_date?: string }
        Returns: {
          week_end: string
          week_label: string
          week_number: number
          week_start: string
        }[]
      }
      get_material_receiving_stats: {
        Args: { p_project_id: string }
        Returns: Json
      }
      get_next_application_number: {
        Args: { p_project_id: string }
        Returns: number
      }
      get_next_co_number: { Args: { p_project_id: string }; Returns: number }
      get_next_jsa_number: {
        Args: { p_company_id: string; p_project_id: string }
        Returns: string
      }
      get_next_meeting_number: {
        Args: {
          p_meeting_type: Database["public"]["Enums"]["meeting_type"]
          p_project_id: string
        }
        Returns: number
      }
      get_next_osha_case_number: {
        Args: { p_project_id: string; p_year?: number }
        Returns: string
      }
      get_next_pco_number: { Args: { p_project_id: string }; Returns: number }
      get_next_rfi_number: { Args: { p_project_id: string }; Returns: number }
      get_next_transmittal_number: {
        Args: { p_company_id: string; p_project_id: string }
        Returns: string
      }
      get_next_waiver_number: {
        Args: { p_project_id: string }
        Returns: string
      }
      get_or_create_direct_conversation: {
        Args: { p_user_id_1: string; p_user_id_2: string }
        Returns: string
      }
      get_or_create_dm_conversation: {
        Args: { p_company_id: string; p_user1_id: string; p_user2_id: string }
        Returns: string
      }
      get_pending_approvals_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_photo_completion_stats: {
        Args: { p_end_date: string; p_project_id: string; p_start_date: string }
        Returns: {
          completed: number
          completion_rate: number
          missed: number
          pending: number
          total_required: number
        }[]
      }
      get_photos_by_location: {
        Args: {
          p_latitude: number
          p_longitude: number
          p_project_id: string
          p_radius_meters?: number
        }
        Returns: {
          caption: string
          captured_at: string
          distance_meters: number
          file_url: string
          id: string
          latitude: number
          longitude: number
          thumbnail_url: string
        }[]
      }
      get_project_budget_totals: {
        Args: { p_project_id: string }
        Returns: {
          budget_count: number
          total_actual_cost: number
          total_approved_changes: number
          total_committed_cost: number
          total_original_budget: number
          total_revised_budget: number
          total_variance: number
        }[]
      }
      get_project_photo_stats: {
        Args: { p_project_id: string }
        Returns: {
          photos_by_category: Json
          photos_pending_review: number
          photos_this_week: number
          photos_today: number
          photos_with_gps: number
          storage_used_bytes: number
          total_photos: number
          unique_locations: number
        }[]
      }
      get_project_users_for_notification: {
        Args: { p_project_id: string }
        Returns: {
          email: string
          full_name: string
          user_id: string
        }[]
      }
      get_recent_emails: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          created_at: string
          id: string
          status: string
          subject: string
          template_name: string
        }[]
      }
      get_subcontractors_for_user: {
        Args: { user_uuid: string }
        Returns: {
          company_name: string
          project_id: string
          subcontractor_id: string
          trade: string
        }[]
      }
      get_suggested_approval_code: {
        Args: { review_status: string }
        Returns: string
      }
      get_total_unread_count: { Args: { p_user_id: string }; Returns: number }
      get_transmittal_full: {
        Args: { p_transmittal_id: string }
        Returns: {
          attachments: Json
          items: Json
          transmittal: Json
        }[]
      }
      get_unread_message_count: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: number
      }
      get_user_company_id:
        | { Args: { user_uuid: string }; Returns: string }
        | { Args: never; Returns: string }
      get_user_email_stats: {
        Args: { p_user_id: string }
        Returns: {
          delivery_rate: number
          total_bounced: number
          total_delivered: number
          total_failed: number
          total_sent: number
        }[]
      }
      get_user_permissions: {
        Args: { p_project_id?: string; p_user_id: string }
        Returns: {
          category: string
          granted: boolean
          permission_code: string
          permission_name: string
          source: string
        }[]
      }
      get_user_project_ids: { Args: { user_uuid: string }; Returns: string[] }
      get_user_role: { Args: never; Returns: string }
      get_weather_conditions_label: {
        Args: { weather_code: number }
        Returns: string
      }
      get_weather_for_date_range: {
        Args: { p_end_date: string; p_project_id: string; p_start_date: string }
        Returns: {
          precipitation: number
          temperature_high: number
          temperature_low: number
          weather_condition: string
          weather_date: string
          wind_speed_max: number
        }[]
      }
      increment_template_usage: {
        Args: { p_template_id: string }
        Returns: undefined
      }
      is_client_user: { Args: { user_uuid?: string }; Returns: boolean }
      is_serious_incident: {
        Args: { p_severity: Database["public"]["Enums"]["incident_severity"] }
        Returns: boolean
      }
      mark_overdue_photo_requirements: { Args: never; Returns: number }
      save_schedule_baseline: {
        Args: { p_description?: string; p_name?: string; p_project_id: string }
        Returns: string
      }
      search_documents_full_text: {
        Args: {
          p_include_content?: boolean
          p_limit?: number
          p_project_id: string
          p_search_query: string
        }
        Returns: {
          document_id: string
          document_name: string
          match_type: string
          rank: number
          snippet: string
        }[]
      }
      search_messages: {
        Args: {
          p_conversation_id?: string
          p_user_id: string
          search_query: string
        }
        Returns: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          rank: number
          sender_id: string
        }[]
      }
      seed_csi_divisions_for_company: {
        Args: { p_company_id: string }
        Returns: number
      }
      seed_detailed_cost_codes_for_company: {
        Args: { p_company_id: string }
        Returns: number
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      upsert_weather_history: {
        Args: {
          p_company_id: string
          p_humidity_percent: number
          p_latitude: number
          p_longitude: number
          p_precipitation: number
          p_project_id: string
          p_raw_response?: Json
          p_temperature_high: number
          p_temperature_low: number
          p_weather_code: number
          p_weather_date: string
          p_wind_speed_max: number
        }
        Returns: string
      }
      user_can_delete_from_project: {
        Args: { project_uuid: string }
        Returns: boolean
      }
      user_can_edit_project: {
        Args: { project_uuid: string }
        Returns: boolean
      }
      user_conversation_ids: { Args: { p_user_id: string }; Returns: string[] }
      user_has_permission: {
        Args: {
          p_permission_code: string
          p_project_id?: string
          p_user_id: string
        }
        Returns: boolean
      }
      user_has_project_access:
        | { Args: { project_uuid: string }; Returns: boolean }
        | { Args: { proj_id: string; user_uuid: string }; Returns: boolean }
    }
    Enums: {
      action_item_status:
        | "open"
        | "in_progress"
        | "completed"
        | "deferred"
        | "cancelled"
      ai_processor_type: "cloud_vision" | "tesseract" | "textract" | "manual"
      analytics_model_type:
        | "budget_overrun"
        | "schedule_delay"
        | "risk_score"
        | "resource_forecast"
      certificate_status:
        | "active"
        | "expiring_soon"
        | "expired"
        | "pending_renewal"
        | "void"
      closeout_document_type:
        | "om_manual"
        | "warranty"
        | "warranty_letter"
        | "as_built"
        | "as_built_markup"
        | "training_cert"
        | "training_video"
        | "attic_stock"
        | "spare_parts"
        | "final_lien_waiver"
        | "consent_surety"
        | "certificate_occupancy"
        | "certificate_completion"
        | "final_inspection"
        | "punchlist_completion"
        | "test_report"
        | "commissioning_report"
        | "air_balance_report"
        | "keying_schedule"
        | "door_hardware_schedule"
        | "paint_schedule"
        | "equipment_list"
        | "maintenance_agreement"
        | "permit_closeout"
        | "utility_transfer"
        | "software_license"
        | "access_credentials"
        | "other"
      closeout_status:
        | "not_required"
        | "pending"
        | "submitted"
        | "under_review"
        | "approved"
        | "rejected"
        | "waived"
        | "na"
      constraint_status: "open" | "resolved" | "waived" | "escalated"
      constraint_type:
        | "rfi_pending"
        | "submittal_pending"
        | "material_delivery"
        | "predecessor_activity"
        | "inspection_required"
        | "permit_required"
        | "weather_dependent"
        | "resource_availability"
        | "owner_decision"
        | "design_clarification"
        | "other"
      conversation_type: "direct" | "group" | "project" | "general"
      corrective_action_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "overdue"
      document_category_type:
        | "drawing"
        | "specification"
        | "submittal"
        | "contract"
        | "rfi"
        | "change_order"
        | "meeting_minutes"
        | "schedule"
        | "safety_report"
        | "permit"
        | "inspection"
        | "correspondence"
        | "photo"
        | "report"
        | "invoice"
        | "insurance"
        | "other"
      incident_person_type:
        | "injured_party"
        | "witness"
        | "first_responder"
        | "supervisor"
      incident_severity:
        | "near_miss"
        | "first_aid"
        | "medical_treatment"
        | "lost_time"
        | "fatality"
      incident_status:
        | "reported"
        | "under_investigation"
        | "corrective_actions"
        | "closed"
      incident_type:
        | "injury"
        | "illness"
        | "property_damage"
        | "environmental"
        | "near_miss"
        | "other"
      insurance_type:
        | "general_liability"
        | "auto_liability"
        | "workers_compensation"
        | "umbrella"
        | "professional_liability"
        | "builders_risk"
        | "pollution"
        | "cyber"
        | "other"
      lien_waiver_status:
        | "pending"
        | "draft"
        | "sent"
        | "received"
        | "under_review"
        | "approved"
        | "rejected"
        | "expired"
        | "void"
      lien_waiver_type:
        | "conditional_progress"
        | "unconditional_progress"
        | "conditional_final"
        | "unconditional_final"
      look_ahead_activity_status:
        | "planned"
        | "in_progress"
        | "completed"
        | "delayed"
        | "blocked"
        | "cancelled"
      meeting_status:
        | "scheduled"
        | "in_progress"
        | "completed"
        | "minutes_draft"
        | "minutes_distributed"
        | "cancelled"
      meeting_type:
        | "oac"
        | "subcontractor"
        | "safety"
        | "progress"
        | "preconstruction"
        | "kickoff"
        | "closeout"
        | "weekly"
        | "schedule"
        | "budget"
        | "quality"
        | "design"
        | "other"
      message_type: "text" | "file" | "system"
      ocr_status: "pending" | "processing" | "completed" | "failed" | "skipped"
      qb_entity_type:
        | "vendor"
        | "customer"
        | "invoice"
        | "bill"
        | "payment"
        | "expense"
        | "account"
        | "journal_entry"
      qb_sync_direction: "to_quickbooks" | "from_quickbooks" | "bidirectional"
      qb_sync_status: "pending" | "syncing" | "synced" | "failed" | "skipped"
      recommendation_category:
        | "budget"
        | "schedule"
        | "risk"
        | "operational"
        | "resource"
      recommendation_priority: "critical" | "high" | "medium" | "low"
      recommendation_status:
        | "pending"
        | "acknowledged"
        | "implemented"
        | "dismissed"
      report_aggregation_type:
        | "none"
        | "sum"
        | "average"
        | "count"
        | "min"
        | "max"
      report_data_source:
        | "rfis"
        | "submittals"
        | "daily_reports"
        | "change_orders"
        | "payment_applications"
        | "safety_incidents"
        | "inspections"
        | "punch_list"
        | "tasks"
        | "meetings"
        | "documents"
        | "equipment"
        | "lien_waivers"
        | "insurance_certificates"
        | "toolbox_talks"
      report_field_type:
        | "text"
        | "number"
        | "currency"
        | "date"
        | "datetime"
        | "boolean"
        | "status"
        | "user"
        | "project"
        | "company"
      report_filter_operator:
        | "equals"
        | "not_equals"
        | "contains"
        | "not_contains"
        | "starts_with"
        | "ends_with"
        | "greater_than"
        | "less_than"
        | "greater_or_equal"
        | "less_or_equal"
        | "between"
        | "in"
        | "not_in"
        | "is_null"
        | "is_not_null"
      report_output_format: "pdf" | "excel" | "csv"
      report_schedule_frequency:
        | "daily"
        | "weekly"
        | "biweekly"
        | "monthly"
        | "quarterly"
      report_sort_direction: "asc" | "desc"
      rfi_response_type:
        | "answered"
        | "see_drawings"
        | "see_specs"
        | "deferred"
        | "partial_response"
        | "request_clarification"
        | "no_change_required"
        | "see_submittal"
        | "see_change_order"
        | "verbal_direction"
      root_cause_category:
        | "human_error"
        | "equipment_failure"
        | "process_failure"
        | "environmental"
        | "training"
        | "communication"
        | "ppe"
        | "supervision"
        | "other"
      similarity_type: "duplicate" | "revision" | "related" | "superseded"
      toolbox_attendance_status: "expected" | "present" | "absent" | "excused"
      toolbox_talk_status:
        | "draft"
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled"
      toolbox_topic_category:
        | "fall_protection"
        | "ppe"
        | "electrical_safety"
        | "excavation"
        | "scaffolding"
        | "ladder_safety"
        | "fire_prevention"
        | "hazmat"
        | "confined_space"
        | "lockout_tagout"
        | "hand_tools"
        | "power_tools"
        | "heavy_equipment"
        | "crane_rigging"
        | "housekeeping"
        | "heat_illness"
        | "cold_stress"
        | "silica_dust"
        | "noise_exposure"
        | "ergonomics"
        | "first_aid"
        | "emergency_response"
        | "site_specific"
        | "other"
      variance_category:
        | "prereq_incomplete"
        | "labor_shortage"
        | "material_delay"
        | "equipment_unavailable"
        | "weather"
        | "design_change"
        | "inspection_delay"
        | "rework_required"
        | "owner_decision"
        | "permit_delay"
        | "coordination_issue"
        | "safety_stop"
        | "other"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      action_item_status: [
        "open",
        "in_progress",
        "completed",
        "deferred",
        "cancelled",
      ],
      ai_processor_type: ["cloud_vision", "tesseract", "textract", "manual"],
      analytics_model_type: [
        "budget_overrun",
        "schedule_delay",
        "risk_score",
        "resource_forecast",
      ],
      certificate_status: [
        "active",
        "expiring_soon",
        "expired",
        "pending_renewal",
        "void",
      ],
      closeout_document_type: [
        "om_manual",
        "warranty",
        "warranty_letter",
        "as_built",
        "as_built_markup",
        "training_cert",
        "training_video",
        "attic_stock",
        "spare_parts",
        "final_lien_waiver",
        "consent_surety",
        "certificate_occupancy",
        "certificate_completion",
        "final_inspection",
        "punchlist_completion",
        "test_report",
        "commissioning_report",
        "air_balance_report",
        "keying_schedule",
        "door_hardware_schedule",
        "paint_schedule",
        "equipment_list",
        "maintenance_agreement",
        "permit_closeout",
        "utility_transfer",
        "software_license",
        "access_credentials",
        "other",
      ],
      closeout_status: [
        "not_required",
        "pending",
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "waived",
        "na",
      ],
      constraint_status: ["open", "resolved", "waived", "escalated"],
      constraint_type: [
        "rfi_pending",
        "submittal_pending",
        "material_delivery",
        "predecessor_activity",
        "inspection_required",
        "permit_required",
        "weather_dependent",
        "resource_availability",
        "owner_decision",
        "design_clarification",
        "other",
      ],
      conversation_type: ["direct", "group", "project", "general"],
      corrective_action_status: [
        "pending",
        "in_progress",
        "completed",
        "overdue",
      ],
      document_category_type: [
        "drawing",
        "specification",
        "submittal",
        "contract",
        "rfi",
        "change_order",
        "meeting_minutes",
        "schedule",
        "safety_report",
        "permit",
        "inspection",
        "correspondence",
        "photo",
        "report",
        "invoice",
        "insurance",
        "other",
      ],
      incident_person_type: [
        "injured_party",
        "witness",
        "first_responder",
        "supervisor",
      ],
      incident_severity: [
        "near_miss",
        "first_aid",
        "medical_treatment",
        "lost_time",
        "fatality",
      ],
      incident_status: [
        "reported",
        "under_investigation",
        "corrective_actions",
        "closed",
      ],
      incident_type: [
        "injury",
        "illness",
        "property_damage",
        "environmental",
        "near_miss",
        "other",
      ],
      insurance_type: [
        "general_liability",
        "auto_liability",
        "workers_compensation",
        "umbrella",
        "professional_liability",
        "builders_risk",
        "pollution",
        "cyber",
        "other",
      ],
      lien_waiver_status: [
        "pending",
        "draft",
        "sent",
        "received",
        "under_review",
        "approved",
        "rejected",
        "expired",
        "void",
      ],
      lien_waiver_type: [
        "conditional_progress",
        "unconditional_progress",
        "conditional_final",
        "unconditional_final",
      ],
      look_ahead_activity_status: [
        "planned",
        "in_progress",
        "completed",
        "delayed",
        "blocked",
        "cancelled",
      ],
      meeting_status: [
        "scheduled",
        "in_progress",
        "completed",
        "minutes_draft",
        "minutes_distributed",
        "cancelled",
      ],
      meeting_type: [
        "oac",
        "subcontractor",
        "safety",
        "progress",
        "preconstruction",
        "kickoff",
        "closeout",
        "weekly",
        "schedule",
        "budget",
        "quality",
        "design",
        "other",
      ],
      message_type: ["text", "file", "system"],
      ocr_status: ["pending", "processing", "completed", "failed", "skipped"],
      qb_entity_type: [
        "vendor",
        "customer",
        "invoice",
        "bill",
        "payment",
        "expense",
        "account",
        "journal_entry",
      ],
      qb_sync_direction: ["to_quickbooks", "from_quickbooks", "bidirectional"],
      qb_sync_status: ["pending", "syncing", "synced", "failed", "skipped"],
      recommendation_category: [
        "budget",
        "schedule",
        "risk",
        "operational",
        "resource",
      ],
      recommendation_priority: ["critical", "high", "medium", "low"],
      recommendation_status: [
        "pending",
        "acknowledged",
        "implemented",
        "dismissed",
      ],
      report_aggregation_type: [
        "none",
        "sum",
        "average",
        "count",
        "min",
        "max",
      ],
      report_data_source: [
        "rfis",
        "submittals",
        "daily_reports",
        "change_orders",
        "payment_applications",
        "safety_incidents",
        "inspections",
        "punch_list",
        "tasks",
        "meetings",
        "documents",
        "equipment",
        "lien_waivers",
        "insurance_certificates",
        "toolbox_talks",
      ],
      report_field_type: [
        "text",
        "number",
        "currency",
        "date",
        "datetime",
        "boolean",
        "status",
        "user",
        "project",
        "company",
      ],
      report_filter_operator: [
        "equals",
        "not_equals",
        "contains",
        "not_contains",
        "starts_with",
        "ends_with",
        "greater_than",
        "less_than",
        "greater_or_equal",
        "less_or_equal",
        "between",
        "in",
        "not_in",
        "is_null",
        "is_not_null",
      ],
      report_output_format: ["pdf", "excel", "csv"],
      report_schedule_frequency: [
        "daily",
        "weekly",
        "biweekly",
        "monthly",
        "quarterly",
      ],
      report_sort_direction: ["asc", "desc"],
      rfi_response_type: [
        "answered",
        "see_drawings",
        "see_specs",
        "deferred",
        "partial_response",
        "request_clarification",
        "no_change_required",
        "see_submittal",
        "see_change_order",
        "verbal_direction",
      ],
      root_cause_category: [
        "human_error",
        "equipment_failure",
        "process_failure",
        "environmental",
        "training",
        "communication",
        "ppe",
        "supervision",
        "other",
      ],
      similarity_type: ["duplicate", "revision", "related", "superseded"],
      toolbox_attendance_status: ["expected", "present", "absent", "excused"],
      toolbox_talk_status: [
        "draft",
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
      ],
      toolbox_topic_category: [
        "fall_protection",
        "ppe",
        "electrical_safety",
        "excavation",
        "scaffolding",
        "ladder_safety",
        "fire_prevention",
        "hazmat",
        "confined_space",
        "lockout_tagout",
        "hand_tools",
        "power_tools",
        "heavy_equipment",
        "crane_rigging",
        "housekeeping",
        "heat_illness",
        "cold_stress",
        "silica_dust",
        "noise_exposure",
        "ergonomics",
        "first_aid",
        "emergency_response",
        "site_specific",
        "other",
      ],
      variance_category: [
        "prereq_incomplete",
        "labor_shortage",
        "material_delay",
        "equipment_unavailable",
        "weather",
        "design_change",
        "inspection_delay",
        "rework_required",
        "owner_decision",
        "permit_delay",
        "coordination_issue",
        "safety_stop",
        "other",
      ],
    },
  },
} as const
