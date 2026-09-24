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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          actor_user_id: string
          business_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_user_id: string
          business_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_user_id?: string
          business_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          business_id: string
          created_at: string
          customer_id: string
          ends_at: string
          id: string
          notes: string | null
          professional_id: string
          public_idempotency_key: string | null
          service_id: string
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          customer_id: string
          ends_at: string
          id?: string
          notes?: string | null
          professional_id: string
          public_idempotency_key?: string | null
          service_id: string
          starts_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          customer_id?: string
          ends_at?: string
          id?: string
          notes?: string | null
          professional_id?: string
          public_idempotency_key?: string | null
          service_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_customer_id_business_id_fkey"
            columns: ["customer_id", "business_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id", "business_id"]
          },
          {
            foreignKeyName: "appointments_professional_id_business_id_fkey"
            columns: ["professional_id", "business_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id", "business_id"]
          },
          {
            foreignKeyName: "appointments_service_id_business_id_fkey"
            columns: ["service_id", "business_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      blocked_times: {
        Row: {
          business_id: string
          created_at: string
          created_by: string
          ends_at: string
          id: string
          professional_id: string
          reason: string | null
          starts_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by: string
          ends_at: string
          id?: string
          professional_id: string
          reason?: string | null
          starts_at: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string
          ends_at?: string
          id?: string
          professional_id?: string
          reason?: string | null
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_times_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_times_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_times_professional_id_business_id_fkey"
            columns: ["professional_id", "business_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      business_members: {
        Row: {
          business_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          active: boolean
          business_type: string
          created_at: string
          id: string
          logo_url: string | null
          name: string
          phone: string
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          business_type?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          phone: string
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          business_type?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          business_id: string
          created_at: string
          id: string
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          name: string
          phone: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      login_identities: {
        Row: {
          active: boolean
          created_at: string
          id: string
          internal_auth_identifier: string
          must_change_password: boolean
          updated_at: string
          user_id: string
          username: string
          username_normalized: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          internal_auth_identifier: string
          must_change_password?: boolean
          updated_at?: string
          user_id: string
          username: string
          username_normalized: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          internal_auth_identifier?: string
          must_change_password?: boolean
          updated_at?: string
          user_id?: string
          username?: string
          username_normalized?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      professional_services: {
        Row: {
          active: boolean
          business_id: string
          duration_override_minutes: number | null
          price_override_cents: number | null
          professional_id: string
          service_id: string
        }
        Insert: {
          active?: boolean
          business_id: string
          duration_override_minutes?: number | null
          price_override_cents?: number | null
          professional_id: string
          service_id: string
        }
        Update: {
          active?: boolean
          business_id?: string
          duration_override_minutes?: number | null
          price_override_cents?: number | null
          professional_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_services_professional_id_business_id_fkey"
            columns: ["professional_id", "business_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id", "business_id"]
          },
          {
            foreignKeyName: "professional_services_service_id_business_id_fkey"
            columns: ["service_id", "business_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      professionals: {
        Row: {
          active: boolean
          bio: string | null
          business_id: string
          created_at: string
          id: string
          name: string
          photo_url: string | null
          setup_completed_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          bio?: string | null
          business_id: string
          created_at?: string
          id?: string
          name: string
          photo_url?: string | null
          setup_completed_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          bio?: string | null
          business_id?: string
          created_at?: string
          id?: string
          name?: string
          photo_url?: string | null
          setup_completed_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professionals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professionals_business_id_user_id_fkey"
            columns: ["business_id", "user_id"]
            isOneToOne: true
            referencedRelation: "business_members"
            referencedColumns: ["business_id", "user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      recurring_blocks: {
        Row: {
          active: boolean
          business_id: string
          created_at: string
          end_time: string
          id: string
          professional_id: string
          reason: string | null
          start_time: string
          weekday: number
        }
        Insert: {
          active?: boolean
          business_id: string
          created_at?: string
          end_time: string
          id?: string
          professional_id: string
          reason?: string | null
          start_time: string
          weekday: number
        }
        Update: {
          active?: boolean
          business_id?: string
          created_at?: string
          end_time?: string
          id?: string
          professional_id?: string
          reason?: string | null
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "recurring_blocks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_blocks_professional_id_business_id_fkey"
            columns: ["professional_id", "business_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          business_id: string
          created_at: string
          default_duration_minutes: number
          description: string | null
          id: string
          name: string
          price_cents: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          business_id: string
          created_at?: string
          default_duration_minutes: number
          description?: string | null
          id?: string
          name: string
          price_cents: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          business_id?: string
          created_at?: string
          default_duration_minutes?: number
          description?: string | null
          id?: string
          name?: string
          price_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      working_hours: {
        Row: {
          active: boolean
          business_id: string
          end_time: string
          id: string
          professional_id: string
          start_time: string
          weekday: number
        }
        Insert: {
          active?: boolean
          business_id: string
          end_time: string
          id?: string
          professional_id: string
          start_time: string
          weekday: number
        }
        Update: {
          active?: boolean
          business_id?: string
          end_time?: string
          id?: string
          professional_id?: string
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "working_hours_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "working_hours_professional_id_business_id_fkey"
            columns: ["professional_id", "business_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_business_bundle: { Args: { p_bundle: Json }; Returns: string }
      complete_password_change: { Args: never; Returns: undefined }
      admin_update_business: {
        Args: {
          p_active: boolean
          p_business_id: string
          p_logo_url: string
          p_name: string
          p_phone: string
          p_timezone: string
        }
        Returns: undefined
      }
      admin_update_business_v2: {
        Args: { p_active: boolean; p_business_id: string; p_business_type: string; p_logo_url: string; p_name: string; p_phone: string; p_timezone: string }
        Returns: undefined
      }
      admin_update_professional: {
        Args: {
          p_active: boolean
          p_bio: string
          p_name: string
          p_photo_url: string
          p_professional_id: string
        }
        Returns: undefined
      }
      admin_update_service: {
        Args: {
          p_active: boolean
          p_description: string
          p_duration_minutes: number
          p_name: string
          p_price_cents: number
          p_service_id: string
        }
        Returns: undefined
      }
      book_public_appointment: {
        Args: {
          p_customer_name: string
          p_customer_phone: string
          p_idempotency_key: string
          p_professional_id: string
          p_service_id: string
          p_slug: string
          p_starts_at: string
        }
        Returns: string
      }
      configure_professional: {
        Args: {
          p_mark_complete?: boolean
          p_professional_id: string
          p_recurring_blocks: Json
          p_services: Json
          p_working_hours: Json
        }
        Returns: undefined
      }
      create_business_with_owner: {
        Args: {
          p_name: string
          p_phone: string
          p_slug: string
          p_timezone?: string
        }
        Returns: string
      }
      get_public_availability: {
        Args: {
          p_date: string
          p_professional_id: string
          p_service_id: string
          p_slug: string
        }
        Returns: {
          starts_at: string
        }[]
      }
      get_public_business: { Args: { p_slug: string }; Returns: Json }
      slot_granularity_minutes: { Args: never; Returns: number }
    }
    Enums: {
      appointment_status: "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW"
      member_role: "OWNER" | "PROFESSIONAL"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      appointment_status: ["CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"],
      member_role: ["OWNER", "PROFESSIONAL"],
    },
  },
} as const
