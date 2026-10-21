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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ai_access_state: {
        Row: {
          blocked: boolean
          id: string
          message: string | null
          status: number | null
          updated_at: string
        }
        Insert: {
          blocked?: boolean
          id: string
          message?: string | null
          status?: number | null
          updated_at?: string
        }
        Update: {
          blocked?: boolean
          id?: string
          message?: string | null
          status?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      bills: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          lease_id: string
          period: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          lease_id: string
          period: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          lease_id?: string
          period?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
        ]
      }
      leases: {
        Row: {
          active: boolean
          agreement: string
          created_at: string
          end_date: string | null
          id: string
          monthly_rent: number
          room_id: string
          start_date: string
          tenant_id: string
        }
        Insert: {
          active?: boolean
          agreement?: string
          created_at?: string
          end_date?: string | null
          id?: string
          monthly_rent: number
          room_id: string
          start_date?: string
          tenant_id: string
        }
        Update: {
          active?: boolean
          agreement?: string
          created_at?: string
          end_date?: string | null
          id?: string
          monthly_rent?: number
          room_id?: string
          start_date?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leases_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          ai_generated: boolean
          category: string | null
          closed_at: string | null
          created_at: string
          description: string
          id: string
          lease_id: string
          priority: string | null
          priority_reason: string | null
          recommended_actions: Json | null
          reported_by: string | null
          response_draft: string | null
          status: string
          tenant_id: string
          title: string
        }
        Insert: {
          ai_generated?: boolean
          category?: string | null
          closed_at?: string | null
          created_at?: string
          description?: string
          id?: string
          lease_id: string
          priority?: string | null
          priority_reason?: string | null
          recommended_actions?: Json | null
          reported_by?: string | null
          response_draft?: string | null
          status?: string
          tenant_id?: string
          title: string
        }
        Update: {
          ai_generated?: boolean
          category?: string | null
          closed_at?: string | null
          created_at?: string
          description?: string
          id?: string
          lease_id?: string
          priority?: string | null
          priority_reason?: string | null
          recommended_actions?: Json | null
          reported_by?: string | null
          response_draft?: string | null
          status?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          payment_id: string | null
          read: boolean
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          payment_id?: string | null
          read?: boolean
          recipient_id: string
          sender_id?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          payment_id?: string | null
          read?: boolean
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          kind: string
          property_id: string
          title: string
        }
        Insert: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          kind?: string
          property_id: string
          title: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          kind?: string
          property_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          bill_id: string | null
          created_at: string
          id: string
          lease_id: string
          mpesa_code: string
          reviewed_at: string | null
          reviewed_by: string | null
          sent_to_caretaker: boolean
          sent_to_landlord: boolean
          status: string
          tenant_id: string
        }
        Insert: {
          amount: number
          bill_id?: string | null
          created_at?: string
          id?: string
          lease_id: string
          mpesa_code: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sent_to_caretaker?: boolean
          sent_to_landlord?: boolean
          status?: string
          tenant_id?: string
        }
        Update: {
          amount?: number
          bill_id?: string | null
          created_at?: string
          id?: string
          lease_id?: string
          mpesa_code?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sent_to_caretaker?: boolean
          sent_to_landlord?: boolean
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          caretaker_id: string | null
          created_at: string
          id: string
          landlord_id: string
          location: string
          name: string
        }
        Insert: {
          caretaker_id?: string | null
          created_at?: string
          id?: string
          landlord_id?: string
          location?: string
          name: string
        }
        Update: {
          caretaker_id?: string | null
          created_at?: string
          id?: string
          landlord_id?: string
          location?: string
          name?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          created_at: string
          id: string
          name: string
          other_fees: Json
          property_id: string
          rent: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          other_fees?: Json
          property_id: string
          rent?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          other_fees?: Json
          property_id?: string
          rent?: number
        }
        Relationships: [
          {
            foreignKeyName: "rooms_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_codes: {
        Row: {
          code: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          code: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          code?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      find_user_by_email: { Args: { _email: string }; Returns: string }
      generate_monthly_bills: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_property_landlord: { Args: { _pid: string }; Returns: boolean }
      is_property_staff: { Args: { _pid: string }; Returns: boolean }
      is_property_tenant: { Args: { _pid: string }; Returns: boolean }
      lease_property: { Args: { _lid: string }; Returns: string }
      review_payment: {
        Args: { _approve: boolean; _code: string; _payment_id: string }
        Returns: string
      }
      room_property: { Args: { _rid: string }; Returns: string }
      send_payment: {
        Args: {
          _payment_id: string
          _to_caretaker: boolean
          _to_landlord: boolean
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "landlord" | "caretaker" | "tenant"
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
      app_role: ["landlord", "caretaker", "tenant"],
    },
  },
} as const
