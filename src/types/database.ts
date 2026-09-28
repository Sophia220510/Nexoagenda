export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string;
          actor_user_id: string;
          business_id: string | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: string;
          metadata: Json;
        };
        Insert: {
          action: string;
          actor_user_id: string;
          business_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          metadata?: Json;
        };
        Update: {
          action?: string;
          actor_user_id?: string;
          business_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          metadata?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      appointment_action_tokens: {
        Row: {
          allowed_action: string;
          appointment_id: string;
          business_id: string;
          created_at: string;
          expires_at: string;
          id: string;
          token_hash: string;
          used_at: string | null;
        };
        Insert: {
          allowed_action: string;
          appointment_id: string;
          business_id: string;
          created_at?: string;
          expires_at: string;
          id?: string;
          token_hash: string;
          used_at?: string | null;
        };
        Update: {
          allowed_action?: string;
          appointment_id?: string;
          business_id?: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          token_hash?: string;
          used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "appointment_action_tokens_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointment_action_tokens_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      appointment_items: {
        Row: {
          appointment_id: string;
          business_id: string;
          commission_type_snapshot:
            Database["public"]["Enums"]["commission_type"] | null;
          commission_value_snapshot: number | null;
          created_at: string;
          created_by_user_id: string;
          duration_minutes_snapshot: number;
          id: string;
          professional_id: string;
          quantity: number;
          service_id: string | null;
          service_name_snapshot: string;
          unit_price_cents: number;
        };
        Insert: {
          appointment_id: string;
          business_id: string;
          commission_type_snapshot?:
            Database["public"]["Enums"]["commission_type"] | null;
          commission_value_snapshot?: number | null;
          created_at?: string;
          created_by_user_id: string;
          duration_minutes_snapshot: number;
          id?: string;
          professional_id: string;
          quantity?: number;
          service_id?: string | null;
          service_name_snapshot: string;
          unit_price_cents: number;
        };
        Update: {
          appointment_id?: string;
          business_id?: string;
          commission_type_snapshot?:
            Database["public"]["Enums"]["commission_type"] | null;
          commission_value_snapshot?: number | null;
          created_at?: string;
          created_by_user_id?: string;
          duration_minutes_snapshot?: number;
          id?: string;
          professional_id?: string;
          quantity?: number;
          service_id?: string | null;
          service_name_snapshot?: string;
          unit_price_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "appointment_items_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointment_items_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointment_items_created_by_user_id_fkey";
            columns: ["created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointment_items_professional_id_fkey";
            columns: ["professional_id"];
            isOneToOne: false;
            referencedRelation: "professionals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointment_items_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      appointments: {
        Row: {
          appointment_source: string;
          business_id: string;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          completed_at: string | null;
          completed_by_user_id: string | null;
          created_at: string;
          created_by_user_id: string | null;
          customer_id: string;
          discount_cents: number;
          discount_reason: string | null;
          duration_minutes_snapshot: number | null;
          ends_at: string;
          id: string;
          notes: string | null;
          payment_status: Database["public"]["Enums"]["appointment_payment_status"];
          price_cents_snapshot: number | null;
          professional_id: string;
          public_idempotency_key: string | null;
          realized_total_cents: number | null;
          service_id: string;
          starts_at: string;
          status: Database["public"]["Enums"]["appointment_status"];
          status_changed_at: string;
          updated_at: string;
        };
        Insert: {
          appointment_source?: string;
          business_id: string;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          completed_at?: string | null;
          completed_by_user_id?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          customer_id: string;
          discount_cents?: number;
          discount_reason?: string | null;
          duration_minutes_snapshot?: number | null;
          ends_at: string;
          id?: string;
          notes?: string | null;
          payment_status?: Database["public"]["Enums"]["appointment_payment_status"];
          price_cents_snapshot?: number | null;
          professional_id: string;
          public_idempotency_key?: string | null;
          realized_total_cents?: number | null;
          service_id: string;
          starts_at: string;
          status?: Database["public"]["Enums"]["appointment_status"];
          status_changed_at?: string;
          updated_at?: string;
        };
        Update: {
          appointment_source?: string;
          business_id?: string;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          completed_at?: string | null;
          completed_by_user_id?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          customer_id?: string;
          discount_cents?: number;
          discount_reason?: string | null;
          duration_minutes_snapshot?: number | null;
          ends_at?: string;
          id?: string;
          notes?: string | null;
          payment_status?: Database["public"]["Enums"]["appointment_payment_status"];
          price_cents_snapshot?: number | null;
          professional_id?: string;
          public_idempotency_key?: string | null;
          realized_total_cents?: number | null;
          service_id?: string;
          starts_at?: string;
          status?: Database["public"]["Enums"]["appointment_status"];
          status_changed_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_completed_by_user_id_fkey";
            columns: ["completed_by_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_created_by_user_id_fkey";
            columns: ["created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_customer_id_business_id_fkey";
            columns: ["customer_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id", "business_id"];
          },
          {
            foreignKeyName: "appointments_professional_id_business_id_fkey";
            columns: ["professional_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "professionals";
            referencedColumns: ["id", "business_id"];
          },
          {
            foreignKeyName: "appointments_service_id_business_id_fkey";
            columns: ["service_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id", "business_id"];
          },
        ];
      };
      blocked_times: {
        Row: {
          business_id: string;
          created_at: string;
          created_by: string;
          ends_at: string;
          id: string;
          professional_id: string;
          reason: string | null;
          starts_at: string;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          created_by: string;
          ends_at: string;
          id?: string;
          professional_id: string;
          reason?: string | null;
          starts_at: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          created_by?: string;
          ends_at?: string;
          id?: string;
          professional_id?: string;
          reason?: string | null;
          starts_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blocked_times_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blocked_times_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blocked_times_professional_id_business_id_fkey";
            columns: ["professional_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "professionals";
            referencedColumns: ["id", "business_id"];
          },
        ];
      };
      business_members: {
        Row: {
          business_id: string;
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["member_role"];
          user_id: string;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["member_role"];
          user_id: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["member_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "business_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      businesses: {
        Row: {
          accepted_payment_methods: Database["public"]["Enums"]["payment_method"][];
          active: boolean;
          address: string | null;
          business_type: string;
          business_mode: Database["public"]["Enums"]["business_mode"];
          cash_closing_enabled: boolean;
          commission_basis: string;
          created_at: string;
          description: string | null;
          id: string;
          instagram_url: string | null;
          logo_url: string | null;
          name: string;
          notification_provider: string | null;
          phone: string;
          professionals_can_view_commission: boolean;
          payment_fee_bps: Json;
          reminder_24h_enabled: boolean;
          reminder_2h_enabled: boolean;
          reminder_template: string | null;
          reminders_enabled: boolean;
          slug: string;
          slot_interval_minutes: number;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          accepted_payment_methods?: Database["public"]["Enums"]["payment_method"][];
          active?: boolean;
          address?: string | null;
          business_type?: string;
          business_mode?: Database["public"]["Enums"]["business_mode"];
          cash_closing_enabled?: boolean;
          commission_basis?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          instagram_url?: string | null;
          logo_url?: string | null;
          name: string;
          notification_provider?: string | null;
          phone: string;
          professionals_can_view_commission?: boolean;
          payment_fee_bps?: Json;
          reminder_24h_enabled?: boolean;
          reminder_2h_enabled?: boolean;
          reminder_template?: string | null;
          reminders_enabled?: boolean;
          slug: string;
          slot_interval_minutes?: number;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          accepted_payment_methods?: Database["public"]["Enums"]["payment_method"][];
          active?: boolean;
          address?: string | null;
          business_type?: string;
          business_mode?: Database["public"]["Enums"]["business_mode"];
          cash_closing_enabled?: boolean;
          commission_basis?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          instagram_url?: string | null;
          logo_url?: string | null;
          name?: string;
          notification_provider?: string | null;
          phone?: string;
          professionals_can_view_commission?: boolean;
          payment_fee_bps?: Json;
          reminder_24h_enabled?: boolean;
          reminder_2h_enabled?: boolean;
          reminder_template?: string | null;
          reminders_enabled?: boolean;
          slug?: string;
          slot_interval_minutes?: number;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cash_closings: {
        Row: {
          business_id: string;
          closed_at: string;
          closed_by_user_id: string;
          closing_date: string;
          counted_cash_cents: number;
          difference_cents: number;
          expected_cash_cents: number;
          id: string;
          notes: string | null;
          totals_snapshot: Json;
        };
        Insert: {
          business_id: string;
          closed_at?: string;
          closed_by_user_id: string;
          closing_date: string;
          counted_cash_cents: number;
          difference_cents: number;
          expected_cash_cents: number;
          id?: string;
          notes?: string | null;
          totals_snapshot?: Json;
        };
        Update: {
          business_id?: string;
          closed_at?: string;
          closed_by_user_id?: string;
          closing_date?: string;
          counted_cash_cents?: number;
          difference_cents?: number;
          expected_cash_cents?: number;
          id?: string;
          notes?: string | null;
          totals_snapshot?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "cash_closings_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cash_closings_closed_by_user_id_fkey";
            columns: ["closed_by_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      commission_entries: {
        Row: {
          appointment_id: string;
          appointment_item_id: string;
          business_id: string;
          commission_cents: number;
          commission_type_snapshot: Database["public"]["Enums"]["commission_type"];
          commission_value_snapshot: number;
          created_at: string;
          id: string;
          paid_at: string | null;
          paid_by_user_id: string | null;
          period_end: string | null;
          period_start: string | null;
          production_cents: number;
          professional_id: string;
          status: Database["public"]["Enums"]["commission_status"];
        };
        Insert: {
          appointment_id: string;
          appointment_item_id: string;
          business_id: string;
          commission_cents: number;
          commission_type_snapshot: Database["public"]["Enums"]["commission_type"];
          commission_value_snapshot: number;
          created_at?: string;
          id?: string;
          paid_at?: string | null;
          paid_by_user_id?: string | null;
          period_end?: string | null;
          period_start?: string | null;
          production_cents: number;
          professional_id: string;
          status?: Database["public"]["Enums"]["commission_status"];
        };
        Update: {
          appointment_id?: string;
          appointment_item_id?: string;
          business_id?: string;
          commission_cents?: number;
          commission_type_snapshot?: Database["public"]["Enums"]["commission_type"];
          commission_value_snapshot?: number;
          created_at?: string;
          id?: string;
          paid_at?: string | null;
          paid_by_user_id?: string | null;
          period_end?: string | null;
          period_start?: string | null;
          production_cents?: number;
          professional_id?: string;
          status?: Database["public"]["Enums"]["commission_status"];
        };
        Relationships: [
          {
            foreignKeyName: "commission_entries_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "commission_entries_appointment_item_id_fkey";
            columns: ["appointment_item_id"];
            isOneToOne: true;
            referencedRelation: "appointment_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "commission_entries_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "commission_entries_paid_by_user_id_fkey";
            columns: ["paid_by_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "commission_entries_professional_id_fkey";
            columns: ["professional_id"];
            isOneToOne: false;
            referencedRelation: "professionals";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          business_id: string;
          created_at: string;
          id: string;
          name: string;
          notes: string | null;
          phone: string;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          id?: string;
          name: string;
          notes?: string | null;
          phone: string;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          id?: string;
          name?: string;
          notes?: string | null;
          phone?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      expenses: {
        Row: {
          amount_cents: number;
          business_id: string;
          category: string;
          created_at: string;
          description: string;
          expense_date: string;
          id: string;
          method: Database["public"]["Enums"]["payment_method"] | null;
          notes: string | null;
          recorded_by_user_id: string;
          status: string;
          updated_at: string;
          void_reason: string | null;
          voided_at: string | null;
          voided_by_user_id: string | null;
        };
        Insert: {
          amount_cents: number;
          business_id: string;
          category: string;
          created_at?: string;
          description: string;
          expense_date: string;
          id?: string;
          method?: Database["public"]["Enums"]["payment_method"] | null;
          notes?: string | null;
          recorded_by_user_id: string;
          status?: string;
          updated_at?: string;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by_user_id?: string | null;
        };
        Update: {
          amount_cents?: number;
          business_id?: string;
          category?: string;
          created_at?: string;
          description?: string;
          expense_date?: string;
          id?: string;
          method?: Database["public"]["Enums"]["payment_method"] | null;
          notes?: string | null;
          recorded_by_user_id?: string;
          status?: string;
          updated_at?: string;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by_user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_recorded_by_user_id_fkey";
            columns: ["recorded_by_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_voided_by_user_id_fkey";
            columns: ["voided_by_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      financial_audit_logs: {
        Row: {
          action: string;
          actor_user_id: string;
          after_data: Json | null;
          before_data: Json | null;
          business_id: string;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: string;
          reason: string | null;
        };
        Insert: {
          action: string;
          actor_user_id: string;
          after_data?: Json | null;
          before_data?: Json | null;
          business_id: string;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          reason?: string | null;
        };
        Update: {
          action?: string;
          actor_user_id?: string;
          after_data?: Json | null;
          before_data?: Json | null;
          business_id?: string;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "financial_audit_logs_actor_user_id_fkey";
            columns: ["actor_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "financial_audit_logs_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      login_identities: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          internal_auth_identifier: string;
          must_change_password: boolean;
          updated_at: string;
          user_id: string;
          username: string;
          username_normalized: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          internal_auth_identifier: string;
          must_change_password?: boolean;
          updated_at?: string;
          user_id: string;
          username: string;
          username_normalized: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          internal_auth_identifier?: string;
          must_change_password?: boolean;
          updated_at?: string;
          user_id?: string;
          username?: string;
          username_normalized?: string;
        };
        Relationships: [];
      };
      notification_events: {
        Row: {
          business_id: string;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: string;
          kind: string;
          message: string;
          metadata: Json;
          professional_id: string | null;
          title: string;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          kind: string;
          message: string;
          metadata?: Json;
          professional_id?: string | null;
          title: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          kind?: string;
          message?: string;
          metadata?: Json;
          professional_id?: string | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_events_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_events_professional_id_business_id_fkey";
            columns: ["professional_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "professionals";
            referencedColumns: ["id", "business_id"];
          },
        ];
      };
      notification_queue: {
        Row: {
          appointment_id: string | null;
          attempts: number;
          business_id: string;
          channel: string;
          created_at: string;
          customer_id: string | null;
          id: string;
          last_error: string | null;
          payload: Json;
          provider: string | null;
          provider_message_id: string | null;
          scheduled_for: string;
          sent_at: string | null;
          status: string;
          template_kind: string;
          updated_at: string;
        };
        Insert: {
          appointment_id?: string | null;
          attempts?: number;
          business_id: string;
          channel?: string;
          created_at?: string;
          customer_id?: string | null;
          id?: string;
          last_error?: string | null;
          payload?: Json;
          provider?: string | null;
          provider_message_id?: string | null;
          scheduled_for: string;
          sent_at?: string | null;
          status?: string;
          template_kind: string;
          updated_at?: string;
        };
        Update: {
          appointment_id?: string | null;
          attempts?: number;
          business_id?: string;
          channel?: string;
          created_at?: string;
          customer_id?: string | null;
          id?: string;
          last_error?: string | null;
          payload?: Json;
          provider?: string | null;
          provider_message_id?: string | null;
          scheduled_for?: string;
          sent_at?: string | null;
          status?: string;
          template_kind?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_queue_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_queue_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_queue_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_reads: {
        Row: {
          notification_id: string;
          read_at: string;
          user_id: string;
        };
        Insert: {
          notification_id: string;
          read_at?: string;
          user_id: string;
        };
        Update: {
          notification_id?: string;
          read_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey";
            columns: ["notification_id"];
            isOneToOne: false;
            referencedRelation: "notification_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_reads_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount_cents: number;
          appointment_id: string;
          business_id: string;
          created_at: string;
          id: string;
          fee_cents: number;
          gross_amount_cents: number;
          method: Database["public"]["Enums"]["payment_method"];
          net_amount_cents: number;
          notes: string | null;
          paid_at: string;
          recorded_by_user_id: string;
          receiver: Database["public"]["Enums"]["payment_receiver"];
          status: Database["public"]["Enums"]["payment_record_status"];
          updated_at: string;
          void_reason: string | null;
          voided_at: string | null;
          voided_by_user_id: string | null;
        };
        Insert: {
          amount_cents: number;
          appointment_id: string;
          business_id: string;
          created_at?: string;
          id?: string;
          fee_cents?: number;
          gross_amount_cents?: number;
          method: Database["public"]["Enums"]["payment_method"];
          net_amount_cents?: number;
          notes?: string | null;
          paid_at?: string;
          recorded_by_user_id: string;
          receiver?: Database["public"]["Enums"]["payment_receiver"];
          status?: Database["public"]["Enums"]["payment_record_status"];
          updated_at?: string;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by_user_id?: string | null;
        };
        Update: {
          amount_cents?: number;
          appointment_id?: string;
          business_id?: string;
          created_at?: string;
          id?: string;
          fee_cents?: number;
          gross_amount_cents?: number;
          method?: Database["public"]["Enums"]["payment_method"];
          net_amount_cents?: number;
          notes?: string | null;
          paid_at?: string;
          recorded_by_user_id?: string;
          receiver?: Database["public"]["Enums"]["payment_receiver"];
          status?: Database["public"]["Enums"]["payment_record_status"];
          updated_at?: string;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by_user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_recorded_by_user_id_fkey";
            columns: ["recorded_by_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_voided_by_user_id_fkey";
            columns: ["voided_by_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_admins: {
        Row: {
          active: boolean;
          created_at: string;
          created_by: string | null;
          user_id: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          created_by?: string | null;
          user_id: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          created_by?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      professional_commission_rules: {
        Row: {
          active: boolean;
          business_id: string;
          created_at: string;
          id: string;
          professional_id: string;
          service_id: string | null;
          type: Database["public"]["Enums"]["commission_type"];
          updated_at: string;
          value: number;
        };
        Insert: {
          active?: boolean;
          business_id: string;
          created_at?: string;
          id?: string;
          professional_id: string;
          service_id?: string | null;
          type: Database["public"]["Enums"]["commission_type"];
          updated_at?: string;
          value: number;
        };
        Update: {
          active?: boolean;
          business_id?: string;
          created_at?: string;
          id?: string;
          professional_id?: string;
          service_id?: string | null;
          type?: Database["public"]["Enums"]["commission_type"];
          updated_at?: string;
          value?: number;
        };
        Relationships: [
          {
            foreignKeyName: "professional_commission_rules_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "professional_commission_rules_professional_id_fkey";
            columns: ["professional_id"];
            isOneToOne: false;
            referencedRelation: "professionals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "professional_commission_rules_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      professional_services: {
        Row: {
          active: boolean;
          business_id: string;
          duration_override_minutes: number | null;
          price_override_cents: number | null;
          professional_id: string;
          service_id: string;
        };
        Insert: {
          active?: boolean;
          business_id: string;
          duration_override_minutes?: number | null;
          price_override_cents?: number | null;
          professional_id: string;
          service_id: string;
        };
        Update: {
          active?: boolean;
          business_id?: string;
          duration_override_minutes?: number | null;
          price_override_cents?: number | null;
          professional_id?: string;
          service_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "professional_services_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "professional_services_professional_id_business_id_fkey";
            columns: ["professional_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "professionals";
            referencedColumns: ["id", "business_id"];
          },
          {
            foreignKeyName: "professional_services_service_id_business_id_fkey";
            columns: ["service_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id", "business_id"];
          },
        ];
      };
      professionals: {
        Row: {
          active: boolean;
          bio: string | null;
          business_id: string;
          can_add_custom_charge: boolean;
          created_at: string;
          id: string;
          financial_model: Database["public"]["Enums"]["professional_financial_model"];
          financial_value: number;
          name: string;
          payment_receiver: Database["public"]["Enums"]["payment_receiver"];
          phone: string | null;
          pix_key: string | null;
          photo_url: string | null;
          setup_completed_at: string | null;
          receive_booking_whatsapp: boolean;
          updated_at: string;
          user_id: string | null;
          whatsapp_phone: string | null;
        };
        Insert: {
          active?: boolean;
          bio?: string | null;
          business_id: string;
          can_add_custom_charge?: boolean;
          created_at?: string;
          id?: string;
          financial_model?: Database["public"]["Enums"]["professional_financial_model"];
          financial_value?: number;
          name: string;
          payment_receiver?: Database["public"]["Enums"]["payment_receiver"];
          phone?: string | null;
          pix_key?: string | null;
          photo_url?: string | null;
          setup_completed_at?: string | null;
          receive_booking_whatsapp?: boolean;
          updated_at?: string;
          user_id?: string | null;
          whatsapp_phone?: string | null;
        };
        Update: {
          active?: boolean;
          bio?: string | null;
          business_id?: string;
          can_add_custom_charge?: boolean;
          created_at?: string;
          id?: string;
          financial_model?: Database["public"]["Enums"]["professional_financial_model"];
          financial_value?: number;
          name?: string;
          payment_receiver?: Database["public"]["Enums"]["payment_receiver"];
          phone?: string | null;
          pix_key?: string | null;
          photo_url?: string | null;
          setup_completed_at?: string | null;
          receive_booking_whatsapp?: boolean;
          updated_at?: string;
          user_id?: string | null;
          whatsapp_phone?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "professionals_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "professionals_business_id_user_id_fkey";
            columns: ["business_id", "user_id"];
            isOneToOne: true;
            referencedRelation: "business_members";
            referencedColumns: ["business_id", "user_id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      recurring_blocks: {
        Row: {
          active: boolean;
          business_id: string;
          created_at: string;
          end_time: string;
          id: string;
          professional_id: string;
          reason: string | null;
          start_time: string;
          weekday: number;
        };
        Insert: {
          active?: boolean;
          business_id: string;
          created_at?: string;
          end_time: string;
          id?: string;
          professional_id: string;
          reason?: string | null;
          start_time: string;
          weekday: number;
        };
        Update: {
          active?: boolean;
          business_id?: string;
          created_at?: string;
          end_time?: string;
          id?: string;
          professional_id?: string;
          reason?: string | null;
          start_time?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "recurring_blocks_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recurring_blocks_professional_id_business_id_fkey";
            columns: ["professional_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "professionals";
            referencedColumns: ["id", "business_id"];
          },
        ];
      };
      services: {
        Row: {
          active: boolean;
          business_id: string;
          category: string | null;
          created_at: string;
          default_duration_minutes: number;
          description: string | null;
          id: string;
          name: string;
          price_cents: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          business_id: string;
          category?: string | null;
          created_at?: string;
          default_duration_minutes: number;
          description?: string | null;
          id?: string;
          name: string;
          price_cents: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          business_id?: string;
          category?: string | null;
          created_at?: string;
          default_duration_minutes?: number;
          description?: string | null;
          id?: string;
          name?: string;
          price_cents?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      waitlist_entries: {
        Row: {
          booked_appointment_id: string | null;
          business_id: string;
          created_at: string;
          created_by_user_id: string;
          customer_id: string;
          id: string;
          notes: string | null;
          period: string;
          preferred_date: string;
          preferred_end_time: string | null;
          preferred_start_time: string | null;
          professional_id: string | null;
          service_id: string;
          status: Database["public"]["Enums"]["waitlist_status"];
          updated_at: string;
        };
        Insert: {
          booked_appointment_id?: string | null;
          business_id: string;
          created_at?: string;
          created_by_user_id: string;
          customer_id: string;
          id?: string;
          notes?: string | null;
          period?: string;
          preferred_date: string;
          preferred_end_time?: string | null;
          preferred_start_time?: string | null;
          professional_id?: string | null;
          service_id: string;
          status?: Database["public"]["Enums"]["waitlist_status"];
          updated_at?: string;
        };
        Update: {
          booked_appointment_id?: string | null;
          business_id?: string;
          created_at?: string;
          created_by_user_id?: string;
          customer_id?: string;
          id?: string;
          notes?: string | null;
          period?: string;
          preferred_date?: string;
          preferred_end_time?: string | null;
          preferred_start_time?: string | null;
          professional_id?: string | null;
          service_id?: string;
          status?: Database["public"]["Enums"]["waitlist_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "waitlist_entries_booked_appointment_id_fkey";
            columns: ["booked_appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "waitlist_entries_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "waitlist_entries_created_by_user_id_fkey";
            columns: ["created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "waitlist_entries_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "waitlist_entries_professional_id_fkey";
            columns: ["professional_id"];
            isOneToOne: false;
            referencedRelation: "professionals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "waitlist_entries_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      working_hours: {
        Row: {
          active: boolean;
          business_id: string;
          end_time: string;
          id: string;
          professional_id: string;
          start_time: string;
          weekday: number;
        };
        Insert: {
          active?: boolean;
          business_id: string;
          end_time: string;
          id?: string;
          professional_id: string;
          start_time: string;
          weekday: number;
        };
        Update: {
          active?: boolean;
          business_id?: string;
          end_time?: string;
          id?: string;
          professional_id?: string;
          start_time?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "working_hours_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "working_hours_professional_id_business_id_fkey";
            columns: ["professional_id", "business_id"];
            isOneToOne: false;
            referencedRelation: "professionals";
            referencedColumns: ["id", "business_id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_create_business_bundle: {
        Args: { p_bundle: Json };
        Returns: string;
      };
      admin_update_business: {
        Args: {
          p_active: boolean;
          p_business_id: string;
          p_logo_url: string;
          p_name: string;
          p_phone: string;
          p_timezone: string;
        };
        Returns: undefined;
      };
      admin_update_business_v2: {
        Args: {
          p_active: boolean;
          p_business_id: string;
          p_business_type: string;
          p_logo_url: string;
          p_name: string;
          p_phone: string;
          p_timezone: string;
        };
        Returns: undefined;
      };
      admin_update_professional: {
        Args: {
          p_active: boolean;
          p_bio: string;
          p_name: string;
          p_photo_url: string;
          p_professional_id: string;
        };
        Returns: undefined;
      };
      admin_update_service: {
        Args: {
          p_active: boolean;
          p_description: string;
          p_duration_minutes: number;
          p_name: string;
          p_price_cents: number;
          p_service_id: string;
        };
        Returns: undefined;
      };
      book_internal_appointment: {
        Args: {
          p_customer_id?: string;
          p_customer_name?: string;
          p_customer_phone?: string;
          p_notes?: string;
          p_professional_id: string;
          p_service_id: string;
          p_starts_at: string;
        };
        Returns: string;
      };
      book_public_appointment: {
        Args: {
          p_customer_name: string;
          p_customer_phone: string;
          p_idempotency_key: string;
          p_professional_id: string;
          p_service_id: string;
          p_slug: string;
          p_starts_at: string;
        };
        Returns: string;
      };
      complete_appointment: {
        Args: {
          p_appointment_id: string;
          p_discount_cents?: number;
          p_discount_reason?: string;
          p_payments?: Json;
          p_service_ids: string[];
        };
        Returns: Json;
      };
      complete_password_change: { Args: never; Returns: undefined };
      create_waitlist_entry: {
        Args: {
          p_customer_name: string;
          p_customer_phone: string;
          p_notes?: string;
          p_preferred_date: string;
          p_preferred_period?: string;
          p_professional_id: string | null;
          p_service_id: string;
        };
        Returns: string;
      };
      configure_professional: {
        Args: {
          p_mark_complete?: boolean;
          p_professional_id: string;
          p_recurring_blocks: Json;
          p_services: Json;
          p_working_hours: Json;
        };
        Returns: undefined;
      };
      configure_business_mode: {
        Args: { p_mode: Database["public"]["Enums"]["business_mode"] };
        Returns: string;
      };
      create_business_with_owner: {
        Args: {
          p_name: string;
          p_phone: string;
          p_slug: string;
          p_timezone?: string;
        };
        Returns: string;
      };
      get_financial_summary: {
        Args: { p_end: string; p_start: string };
        Returns: Json;
      };
      get_public_availability: {
        Args: {
          p_date: string;
          p_professional_id: string;
          p_service_id: string;
          p_slug: string;
        };
        Returns: {
          starts_at: string;
        }[];
      };
      get_public_business: { Args: { p_slug: string }; Returns: Json };
      mark_commission_paid: {
        Args: { p_commission_id: string };
        Returns: undefined;
      };
      record_expense: {
        Args: {
          p_amount_cents: number;
          p_category: string;
          p_description: string;
          p_expense_date: string;
          p_method?: Database["public"]["Enums"]["payment_method"];
          p_notes?: string;
        };
        Returns: string;
      };
      reschedule_appointment: {
        Args: {
          p_appointment_id: string;
          p_professional_id: string;
          p_starts_at: string;
        };
        Returns: undefined;
      };
      resolve_unattended_appointment: {
        Args: {
          p_appointment_id: string;
          p_outcome: string;
          p_reason?: string;
        };
        Returns: undefined;
      };
      set_appointment_status: {
        Args: {
          p_appointment_id: string;
          p_cancellation_reason?: string;
          p_status: Database["public"]["Enums"]["appointment_status"];
        };
        Returns: undefined;
      };
      slot_granularity_minutes: { Args: never; Returns: number };
      update_appointment_note: {
        Args: { p_appointment_id: string; p_notes: string };
        Returns: undefined;
      };
      update_professional_financial_model: {
        Args: {
          p_professional_id: string;
          p_financial_model: Database["public"]["Enums"]["professional_financial_model"];
          p_financial_value: number;
          p_payment_receiver: Database["public"]["Enums"]["payment_receiver"];
          p_pix_key?: string;
        };
        Returns: undefined;
      };
      update_waitlist_status: {
        Args: {
          p_entry_id: string;
          p_status: Database["public"]["Enums"]["waitlist_status"];
        };
        Returns: undefined;
      };
      update_customer_notes: {
        Args: { p_customer_id: string; p_notes: string };
        Returns: undefined;
      };
    };
    Enums: {
      business_mode: "SOLO" | "TEAM";
      appointment_payment_status: "UNPAID" | "PARTIAL" | "PAID";
      appointment_status: "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
      commission_status: "PENDING" | "PAID" | "VOIDED";
      commission_type: "PERCENTAGE" | "FIXED";
      member_role: "OWNER" | "PROFESSIONAL" | "RECEPTIONIST";
      payment_method: "PIX" | "CASH" | "DEBIT_CARD" | "CREDIT_CARD" | "OTHER";
      payment_receiver: "BUSINESS" | "PROFESSIONAL";
      professional_financial_model: "PROFESSIONAL_KEEPS_ALL" | "BUSINESS_KEEPS_ALL" | "PERCENTAGE_COMMISSION" | "FIXED_COMMISSION";
      payment_record_status: "PAID" | "VOIDED" | "REFUNDED";
      waitlist_status:
        "WAITING" | "CONTACTED" | "BOOKED" | "CANCELLED" | "EXPIRED";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      business_mode: ["SOLO", "TEAM"],
      appointment_payment_status: ["UNPAID", "PARTIAL", "PAID"],
      appointment_status: ["CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"],
      commission_status: ["PENDING", "PAID", "VOIDED"],
      commission_type: ["PERCENTAGE", "FIXED"],
      member_role: ["OWNER", "PROFESSIONAL", "RECEPTIONIST"],
      payment_method: ["PIX", "CASH", "DEBIT_CARD", "CREDIT_CARD", "OTHER"],
      payment_receiver: ["BUSINESS", "PROFESSIONAL"],
      professional_financial_model: ["PROFESSIONAL_KEEPS_ALL", "BUSINESS_KEEPS_ALL", "PERCENTAGE_COMMISSION", "FIXED_COMMISSION"],
      payment_record_status: ["PAID", "VOIDED", "REFUNDED"],
      waitlist_status: [
        "WAITING",
        "CONTACTED",
        "BOOKED",
        "CANCELLED",
        "EXPIRED",
      ],
    },
  },
} as const;
