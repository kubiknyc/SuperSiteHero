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
  public: {
    Tables: {
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
          is_system_template?: boolean | null
          items?: Json
          name: string
          scoring_enabled?: boolean | null
          tags?: string[] | null
          template_level: string
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
          sort_order: number | null
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
          sort_order?: number | null
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
          sort_order?: number | null
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
            referencedRelation: "projects"
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
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
      contacts: {
        Row: {
          address: string | null
          city: string | null
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
          phone_fax: string | null
          phone_mobile: string | null
          phone_office: string | null
          project_id: string
          state: string | null
          title: string | null
          trade: string | null
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
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
          phone_fax?: string | null
          phone_mobile?: string | null
          phone_office?: string | null
          project_id: string
          state?: string | null
          title?: string | null
          trade?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
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
          phone_fax?: string | null
          phone_mobile?: string | null
          phone_office?: string | null
          project_id?: string
          state?: string | null
          title?: string | null
          trade?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Relationships: [
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
            referencedRelation: "projects"
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
      document_markups: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          document_id: string
          id: string
          is_shared: boolean | null
          markup_data: Json
          markup_type: string
          page_number: number | null
          project_id: string
          related_to_id: string | null
          related_to_type: string | null
          shared_with_roles: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          document_id: string
          id?: string
          is_shared?: boolean | null
          markup_data: Json
          markup_type: string
          page_number?: number | null
          project_id: string
          related_to_id?: string | null
          related_to_type?: string | null
          shared_with_roles?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          document_id?: string
          id?: string
          is_shared?: boolean | null
          markup_data?: Json
          markup_type?: string
          page_number?: number | null
          project_id?: string
          related_to_id?: string | null
          related_to_type?: string | null
          shared_with_roles?: string[] | null
          updated_at?: string | null
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
            referencedRelation: "documents"
            referencedColumns: ["id"]
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
      documents: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          discipline: string | null
          document_number: string | null  // Document tracking number
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
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          discipline?: string | null
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
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          discipline?: string | null
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
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
            referencedRelation: "projects"
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
      material_deliveries: {
        Row: {
          id: string
          project_id: string
          company_id: string
          delivery_date: string
          delivery_time: string | null
          vendor_name: string
          vendor_contact_name: string | null
          vendor_contact_phone: string | null
          vendor_contact_email: string | null
          delivery_ticket_number: string | null
          material_name: string
          material_description: string | null
          material_category: string
          quantity_ordered: number | null
          quantity_delivered: number
          quantity_accepted: number | null
          quantity_rejected: number | null
          unit_of_measure: string
          unit_cost: number | null
          total_cost: number | null
          delivery_status: string
          condition_status: string
          condition_notes: string | null
          storage_location: string | null
          storage_bin_number: string | null
          storage_notes: string | null
          received_by_user_id: string | null
          received_by_name: string | null
          submittal_id: string | null
          submittal_number: string | null
          purchase_order_number: string | null
          manufacturer: string | null
          model_number: string | null
          serial_number: string | null
          warranty_info: string | null
          daily_report_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          company_id: string
          delivery_date: string
          delivery_time?: string | null
          vendor_name: string
          vendor_contact_name?: string | null
          vendor_contact_phone?: string | null
          vendor_contact_email?: string | null
          delivery_ticket_number?: string | null
          material_name: string
          material_description?: string | null
          material_category: string
          quantity_ordered?: number | null
          quantity_delivered: number
          quantity_accepted?: number | null
          quantity_rejected?: number | null
          unit_of_measure: string
          unit_cost?: number | null
          total_cost?: number | null
          delivery_status: string
          condition_status: string
          condition_notes?: string | null
          storage_location?: string | null
          storage_bin_number?: string | null
          storage_notes?: string | null
          received_by_user_id?: string | null
          received_by_name?: string | null
          submittal_id?: string | null
          submittal_number?: string | null
          purchase_order_number?: string | null
          manufacturer?: string | null
          model_number?: string | null
          serial_number?: string | null
          warranty_info?: string | null
          daily_report_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          company_id?: string
          delivery_date?: string
          delivery_time?: string | null
          vendor_name?: string
          vendor_contact_name?: string | null
          vendor_contact_phone?: string | null
          vendor_contact_email?: string | null
          delivery_ticket_number?: string | null
          material_name?: string
          material_description?: string | null
          material_category?: string
          quantity_ordered?: number | null
          quantity_delivered?: number
          quantity_accepted?: number | null
          quantity_rejected?: number | null
          unit_of_measure?: string
          unit_cost?: number | null
          total_cost?: number | null
          delivery_status?: string
          condition_status?: string
          condition_notes?: string | null
          storage_location?: string | null
          storage_bin_number?: string | null
          storage_notes?: string | null
          received_by_user_id?: string | null
          received_by_name?: string | null
          submittal_id?: string | null
          submittal_number?: string | null
          purchase_order_number?: string | null
          manufacturer?: string | null
          model_number?: string | null
          serial_number?: string | null
          warranty_info?: string | null
          daily_report_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_deliveries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_deliveries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_deliveries_received_by_user_id_fkey"
            columns: ["received_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_deliveries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      material_delivery_photos: {
        Row: {
          id: string
          delivery_id: string
          photo_url: string
          photo_type: string | null
          caption: string | null
          display_order: number
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          delivery_id: string
          photo_url: string
          photo_type?: string | null
          caption?: string | null
          display_order?: number
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          delivery_id?: string
          photo_url?: string
          photo_type?: string | null
          caption?: string | null
          display_order?: number
          created_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_delivery_photos_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "material_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_delivery_photos_created_by_fkey"
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
          material_description: string
          project_id: string
          quantity: string | null
          received_by: string | null
          status: string | null
          storage_location: string | null
          submittal_procurement_id: string | null
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
          material_description: string
          project_id: string
          quantity?: string | null
          received_by?: string | null
          status?: string | null
          storage_location?: string | null
          submittal_procurement_id?: string | null
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
          material_description?: string
          project_id?: string
          quantity?: string | null
          received_by?: string | null
          status?: string | null
          storage_location?: string | null
          submittal_procurement_id?: string | null
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
            referencedRelation: "submittal_procurement"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          action_items: Json | null
          agenda: string | null
          attendees: Json | null
          created_at: string | null
          created_by: string | null
          decisions: string | null
          deleted_at: string | null
          discussion_notes: string | null
          distributed_to: string[] | null
          duration_minutes: number | null
          id: string
          location: string | null
          meeting_date: string
          meeting_name: string | null
          meeting_time: string | null
          meeting_type: string
          minutes_pdf_url: string | null
          project_id: string
          updated_at: string | null
        }
        Insert: {
          action_items?: Json | null
          agenda?: string | null
          attendees?: Json | null
          created_at?: string | null
          created_by?: string | null
          decisions?: string | null
          deleted_at?: string | null
          discussion_notes?: string | null
          distributed_to?: string[] | null
          duration_minutes?: number | null
          id?: string
          location?: string | null
          meeting_date: string
          meeting_name?: string | null
          meeting_time?: string | null
          meeting_type: string
          minutes_pdf_url?: string | null
          project_id: string
          updated_at?: string | null
        }
        Update: {
          action_items?: Json | null
          agenda?: string | null
          attendees?: Json | null
          created_at?: string | null
          created_by?: string | null
          decisions?: string | null
          deleted_at?: string | null
          discussion_notes?: string | null
          distributed_to?: string[] | null
          duration_minutes?: number | null
          id?: string
          location?: string | null
          meeting_date?: string
          meeting_name?: string | null
          meeting_time?: string | null
          meeting_type?: string
          minutes_pdf_url?: string | null
          project_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
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
      messages: {
        Row: {
          body: string
          created_at: string | null
          deleted_at: string | null
          from_user_id: string
          id: string
          is_read: boolean | null
          read_at: string | null
          subject: string | null
          to_user_ids: string[] | null
          updated_at: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          deleted_at?: string | null
          from_user_id: string
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          subject?: string | null
          to_user_ids?: string[] | null
          updated_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          deleted_at?: string | null
          from_user_id?: string
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          subject?: string | null
          to_user_ids?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          area: string | null
          building: string | null
          caption: string | null
          captured_at: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          file_name: string
          file_size: number | null
          file_url: string
          floor: string | null
          grid: string | null
          height: number | null
          id: string
          is_360: boolean | null
          is_after_photo: boolean | null
          is_before_photo: boolean | null
          is_pinned: boolean | null
          latitude: number | null
          linked_items: Json | null
          location_notes: string | null
          longitude: number | null
          paired_photo_id: string | null
          photo_category: string | null
          project_id: string
          project_phase: string | null
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string | null
          width: number | null
        }
        Insert: {
          area?: string | null
          building?: string | null
          caption?: string | null
          captured_at?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          floor?: string | null
          grid?: string | null
          height?: number | null
          id?: string
          is_360?: boolean | null
          is_after_photo?: boolean | null
          is_before_photo?: boolean | null
          is_pinned?: boolean | null
          latitude?: number | null
          linked_items?: Json | null
          location_notes?: string | null
          longitude?: number | null
          paired_photo_id?: string | null
          photo_category?: string | null
          project_id: string
          project_phase?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
          width?: number | null
        }
        Update: {
          area?: string | null
          building?: string | null
          caption?: string | null
          captured_at?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          floor?: string | null
          grid?: string | null
          height?: number | null
          id?: string
          is_360?: boolean | null
          is_after_photo?: boolean | null
          is_before_photo?: boolean | null
          is_pinned?: boolean | null
          latitude?: number | null
          linked_items?: Json | null
          location_notes?: string | null
          longitude?: number | null
          paired_photo_id?: string | null
          photo_category?: string | null
          project_id?: string
          project_phase?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
          width?: number | null
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
            referencedRelation: "projects"
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
          location: string | null  // Generated column: building > floor > room > area
          location_notes: string | null
          marked_complete_at: string | null
          marked_complete_by: string | null
          number: number | null
          priority: string | null
          project_id: string
          punch_list_id: string | null  // Reference to punch_lists table
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
          location_notes?: string | null
          marked_complete_at?: string | null
          marked_complete_by?: string | null
          number?: number | null
          priority?: string | null
          project_id: string
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
          location_notes?: string | null
          marked_complete_at?: string | null
          marked_complete_by?: string | null
          number?: number | null
          priority?: string | null
          project_id?: string
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
            referencedRelation: "projects"
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
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_incidents: {
        Row: {
          body_part: string | null
          company: string | null
          contributing_factors: string | null
          corrective_actions: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string
          followup_notes: string | null
          id: string
          immediate_actions: string | null
          incident_date: string
          incident_number: string | null
          incident_time: string | null
          incident_type: string
          injury_type: string | null
          location: string | null
          notified_users: string[] | null
          osha_report_number: string | null
          person_involved: string | null
          project_id: string
          reported_to_osha: boolean | null
          reported_to_owner: boolean | null
          requires_followup: boolean | null
          root_cause: string | null
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
          company?: string | null
          contributing_factors?: string | null
          corrective_actions?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description: string
          followup_notes?: string | null
          id?: string
          immediate_actions?: string | null
          incident_date: string
          incident_number?: string | null
          incident_time?: string | null
          incident_type: string
          injury_type?: string | null
          location?: string | null
          notified_users?: string[] | null
          osha_report_number?: string | null
          person_involved?: string | null
          project_id: string
          reported_to_osha?: boolean | null
          reported_to_owner?: boolean | null
          requires_followup?: boolean | null
          root_cause?: string | null
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
          company?: string | null
          contributing_factors?: string | null
          corrective_actions?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          followup_notes?: string | null
          id?: string
          immediate_actions?: string | null
          incident_date?: string
          incident_number?: string | null
          incident_time?: string | null
          incident_type?: string
          injury_type?: string | null
          location?: string | null
          notified_users?: string[] | null
          osha_report_number?: string | null
          person_involved?: string | null
          project_id?: string
          reported_to_osha?: boolean | null
          reported_to_owner?: boolean | null
          requires_followup?: boolean | null
          root_cause?: string | null
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
            referencedRelation: "projects"
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
      schedule_items: {
        Row: {
          assigned_to: string | null
          baseline_finish_date: string | null
          baseline_start_date: string | null
          created_at: string | null
          duration_days: number | null
          finish_date: string | null
          id: string
          imported_at: string | null
          is_critical: boolean | null
          last_updated_at: string | null
          percent_complete: number | null
          predecessors: string | null
          project_id: string
          start_date: string | null
          successors: string | null
          task_id: string | null
          task_name: string
          wbs: string | null
        }
        Insert: {
          assigned_to?: string | null
          baseline_finish_date?: string | null
          baseline_start_date?: string | null
          created_at?: string | null
          duration_days?: number | null
          finish_date?: string | null
          id?: string
          imported_at?: string | null
          is_critical?: boolean | null
          last_updated_at?: string | null
          percent_complete?: number | null
          predecessors?: string | null
          project_id: string
          start_date?: string | null
          successors?: string | null
          task_id?: string | null
          task_name: string
          wbs?: string | null
        }
        Update: {
          assigned_to?: string | null
          baseline_finish_date?: string | null
          baseline_start_date?: string | null
          created_at?: string | null
          duration_days?: number | null
          finish_date?: string | null
          id?: string
          imported_at?: string | null
          is_critical?: boolean | null
          last_updated_at?: string | null
          percent_complete?: number | null
          predecessors?: string | null
          project_id?: string
          start_date?: string | null
          successors?: string | null
          task_id?: string | null
          task_name?: string
          wbs?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      site_instructions: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          acknowledgment_signature: string | null
          completed_at: string | null
          completed_by: string | null
          completion_status: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string
          id: string
          instruction_number: string | null
          issued_to_user_id: string | null
          project_id: string
          reference_number: string | null
          related_to_id: string | null
          related_to_type: string | null
          requires_acknowledgment: boolean | null
          requires_completion_tracking: boolean | null
          subcontractor_id: string
          title: string
          updated_at: string | null
          verified_by: string | null
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          acknowledgment_signature?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_status?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description: string
          id?: string
          instruction_number?: string | null
          issued_to_user_id?: string | null
          project_id: string
          reference_number?: string | null
          related_to_id?: string | null
          related_to_type?: string | null
          requires_acknowledgment?: boolean | null
          requires_completion_tracking?: boolean | null
          subcontractor_id: string
          title: string
          updated_at?: string | null
          verified_by?: string | null
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          acknowledgment_signature?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_status?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          id?: string
          instruction_number?: string | null
          issued_to_user_id?: string | null
          project_id?: string
          reference_number?: string | null
          related_to_id?: string | null
          related_to_type?: string | null
          requires_acknowledgment?: boolean | null
          requires_completion_tracking?: boolean | null
          subcontractor_id?: string
          title?: string
          updated_at?: string | null
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
            foreignKeyName: "site_instructions_issued_to_user_id_fkey"
            columns: ["issued_to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
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
            referencedRelation: "projects"
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
            referencedRelation: "documents"
            referencedColumns: ["id"]
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
      toolbox_talks: {
        Row: {
          attendance_count: number | null
          attendees: Json | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          duration_minutes: number | null
          handout_url: string | null
          id: string
          osha_compliant: boolean | null
          project_id: string
          talk_date: string
          topic: string
          trainer_id: string | null
          trainer_name: string | null
          updated_at: string | null
        }
        Insert: {
          attendance_count?: number | null
          attendees?: Json | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          handout_url?: string | null
          id?: string
          osha_compliant?: boolean | null
          project_id: string
          talk_date: string
          topic: string
          trainer_id?: string | null
          trainer_name?: string | null
          updated_at?: string | null
        }
        Update: {
          attendance_count?: number | null
          attendees?: Json | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          handout_url?: string | null
          id?: string
          osha_compliant?: boolean | null
          project_id?: string
          talk_date?: string
          topic?: string
          trainer_id?: string | null
          trainer_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
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
            referencedRelation: "projects"
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
      users: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string | null
          deleted_at: string | null
          email: string
          first_name: string | null
          full_name: string | null  // Generated column: first_name + last_name
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
          title: string  // NOT NULL - required field
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
          title?: string | null
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
          title?: string | null
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
      chat_channels: {
        Row: {
          id: string
          company_id: string
          project_id: string | null
          name: string
          description: string | null
          channel_type: string
          is_private: boolean
          created_by: string | null
          created_at: string
          updated_at: string
          archived_at: string | null
          metadata: Json
        }
        Insert: {
          id?: string
          company_id: string
          project_id?: string | null
          name: string
          description?: string | null
          channel_type: string
          is_private?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
          archived_at?: string | null
          metadata?: Json
        }
        Update: {
          id?: string
          company_id?: string
          project_id?: string | null
          name?: string
          description?: string | null
          channel_type?: string
          is_private?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
          archived_at?: string | null
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "chat_channels_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_channels_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_channels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channel_members: {
        Row: {
          id: string
          channel_id: string
          user_id: string
          role: string
          joined_at: string
          last_read_at: string | null
          notification_settings: Json
        }
        Insert: {
          id?: string
          channel_id: string
          user_id: string
          role?: string
          joined_at?: string
          last_read_at?: string | null
          notification_settings?: Json
        }
        Update: {
          id?: string
          channel_id?: string
          user_id?: string
          role?: string
          joined_at?: string
          last_read_at?: string | null
          notification_settings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "chat_channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_channel_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          id: string
          channel_id: string
          user_id: string
          parent_message_id: string | null
          content: string
          message_type: string
          attachments: Json
          mentions: Json
          metadata: Json
          edited_at: string | null
          deleted_at: string | null
          created_at: string
          linked_rfi_id: string | null
          linked_task_id: string | null
          linked_change_order_id: string | null
        }
        Insert: {
          id?: string
          channel_id: string
          user_id: string
          parent_message_id?: string | null
          content: string
          message_type?: string
          attachments?: Json
          mentions?: Json
          metadata?: Json
          edited_at?: string | null
          deleted_at?: string | null
          created_at?: string
          linked_rfi_id?: string | null
          linked_task_id?: string | null
          linked_change_order_id?: string | null
        }
        Update: {
          id?: string
          channel_id?: string
          user_id?: string
          parent_message_id?: string | null
          content?: string
          message_type?: string
          attachments?: Json
          mentions?: Json
          metadata?: Json
          edited_at?: string | null
          deleted_at?: string | null
          created_at?: string
          linked_rfi_id?: string | null
          linked_task_id?: string | null
          linked_change_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_reactions: {
        Row: {
          id: string
          message_id: string
          user_id: string
          emoji: string
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          user_id: string
          emoji: string
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          user_id?: string
          emoji?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_read_receipts: {
        Row: {
          id: string
          message_id: string
          user_id: string
          read_at: string
        }
        Insert: {
          id?: string
          message_id: string
          user_id: string
          read_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          user_id?: string
          read_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_read_receipts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_read_receipts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_typing_indicators: {
        Row: {
          channel_id: string
          user_id: string
          typing_at: string
        }
        Insert: {
          channel_id: string
          user_id: string
          typing_at?: string
        }
        Update: {
          channel_id?: string
          user_id?: string
          typing_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_typing_indicators_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_typing_indicators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_direct_message_channels: {
        Row: {
          id: string
          channel_id: string
          user1_id: string
          user2_id: string
          created_at: string
        }
        Insert: {
          id?: string
          channel_id: string
          user1_id: string
          user2_id: string
          created_at?: string
        }
        Update: {
          id?: string
          channel_id?: string
          user1_id?: string
          user2_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_direct_message_channels_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_direct_message_channels_user1_id_fkey"
            columns: ["user1_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_direct_message_channels_user2_id_fkey"
            columns: ["user2_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      typing_indicators: {
        Row: {
          conversation_id: string
          user_id: string
          typing_at: string
        }
        Insert: {
          conversation_id: string
          user_id: string
          typing_at?: string
        }
        Update: {
          conversation_id?: string
          user_id?: string
          typing_at?: string
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
      message_read_receipts: {
        Row: {
          id: string
          message_id: string
          user_id: string
          read_at: string
        }
        Insert: {
          id?: string
          message_id: string
          user_id: string
          read_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          user_id?: string
          read_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      get_delivery_stats_by_project: {
        Args: { p_project_id: string }
        Returns: {
          total_deliveries: number
          deliveries_this_week: number
          unique_vendors: number
          total_items_received: number
          damaged_deliveries: number
        }
      }
      search_material_deliveries: {
        Args: { p_project_id: string; p_search_term: string }
        Returns: string[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

// Re-export commonly used types from database-extensions for backwards compatibility
// This allows existing imports from '@/types/database' to work without changes
export type {
  Document,
  Folder,
  Project,
  PunchItem,
  WorkflowItem,
  WorkflowType,
  DailyReport,
  User,
  Company,
  DocumentType,
  DocumentStatus,
  PunchItemStatus,
  WorkflowItemStatus,
  // Additional exports for full compatibility
  Task,
  UserProfile,
  Priority,
  TaskStatus,
  ProjectStatus,
  WorkflowItemComment,
  WorkflowItemHistory,
  SubmittalProcurement,
  CreateInput,
  TakeoffItem,
} from './database-extensions'
